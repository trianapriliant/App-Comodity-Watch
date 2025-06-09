import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { createApiResponse } from '../utils';
import { AuthenticatedRequest } from '../types';
import { 
  generateTokens, 
  verifyRefreshToken, 
  blacklistToken,
  clearAuthRateLimit 
} from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';

class AuthController {
  /**
   * Register new user
   */
  register = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {
      email,
      username,
      password,
      fullName,
      role,
      phone,
      address,
      regionId,
      organization,
      position,
    } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    });

    if (existingUser) {
      throw new AppError('Email atau username sudah terdaftar', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        fullName,
        role,
        profile: {
          create: {
            phone,
            address,
            regionId,
            organization,
            position,
          },
        },
      },
      include: {
        profile: {
          include: {
            region: true,
          },
        },
      },
    });

    // Generate tokens
    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token in Redis
    await redis.set(
      `refresh_token:${user.id}`,
      tokens.refreshToken,
      { EX: 7 * 24 * 60 * 60 } // 7 days
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    logger.info(`User registered successfully: ${user.email}`);

    res.status(201).json(
      createApiResponse(true, 'Registrasi berhasil', {
        ...tokens,
        user: userWithoutPassword,
      })
    );
  });

  /**
   * User login
   */
  login = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, password } = req.body;

    // Find user with profile
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: {
          include: {
            region: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Email atau password salah', 401);
    }

    if (!user.isActive) {
      throw new AppError('Akun tidak aktif', 401);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Email atau password salah', 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate tokens
    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token in Redis
    await redis.set(
      `refresh_token:${user.id}`,
      tokens.refreshToken,
      { EX: 7 * 24 * 60 * 60 } // 7 days
    );

    // Clear rate limiting for successful login
    await clearAuthRateLimit(req.ip);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    logger.info(`User logged in successfully: ${user.email}`);

    res.json(
      createApiResponse(true, 'Login berhasil', {
        ...tokens,
        user: userWithoutPassword,
      })
    );
  });

  /**
   * Refresh access token
   */
  refreshToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token diperlukan', 401);
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new AppError('Refresh token tidak valid', 401);
    }

    // Check if refresh token exists in Redis
    const storedToken = await redis.get(`refresh_token:${decoded.id}`);
    if (storedToken !== refreshToken) {
      throw new AppError('Refresh token tidak valid', 401);
    }

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.id,
        isActive: true,
      },
    });

    if (!user) {
      throw new AppError('User tidak ditemukan', 401);
    }

    // Generate new tokens
    const newTokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Update refresh token in Redis
    await redis.set(
      `refresh_token:${user.id}`,
      newTokens.refreshToken,
      { EX: 7 * 24 * 60 * 60 } // 7 days
    );

    logger.info(`Token refreshed for user: ${user.email}`);

    res.json(
      createApiResponse(true, 'Token berhasil di-refresh', newTokens)
    );
  });

  /**
   * User logout
   */
  logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Blacklist current access token
      await blacklistToken(token);
    }

    if (userId) {
      // Remove refresh token from Redis
      await redis.del(`refresh_token:${userId}`);
      
      logger.info(`User logged out: ${req.user?.email}`);
    }

    res.json(
      createApiResponse(true, 'Logout berhasil')
    );
  });

  /**
   * Get current user profile
   */
  getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            region: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User tidak ditemukan', 404);
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json(
      createApiResponse(true, 'Profil user', userWithoutPassword)
    );
  });

  /**
   * Update user profile
   */
  updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const {
      fullName,
      phone,
      address,
      regionId,
      organization,
      position,
    } = req.body;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName,
        profile: {
          upsert: {
            create: {
              phone,
              address,
              regionId,
              organization,
              position,
            },
            update: {
              phone,
              address,
              regionId,
              organization,
              position,
            },
          },
        },
      },
      include: {
        profile: {
          include: {
            region: true,
          },
        },
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;

    logger.info(`Profile updated for user: ${updatedUser.email}`);

    res.json(
      createApiResponse(true, 'Profil berhasil diupdate', userWithoutPassword)
    );
  });

  /**
   * Change password
   */
  changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User tidak ditemukan', 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new AppError('Password lama salah', 400);
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    // Blacklist all existing tokens for this user
    await redis.del(`refresh_token:${userId}`);

    logger.info(`Password changed for user: ${user.email}`);

    res.json(
      createApiResponse(true, 'Password berhasil diubah')
    );
  });

  /**
   * Forgot password
   */
  forgotPassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      res.json(
        createApiResponse(true, 'Jika email terdaftar, link reset password akan dikirim')
      );
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomUUID();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token in Redis
    await redis.set(
      `reset_token:${resetToken}`,
      user.id,
      { EX: 3600 } // 1 hour
    );

    // TODO: Send email with reset link
    // await emailService.sendPasswordResetEmail(user.email, resetToken);

    logger.info(`Password reset requested for user: ${user.email}`);

    res.json(
      createApiResponse(true, 'Link reset password telah dikirim ke email Anda')
    );
  });

  /**
   * Reset password
   */
  resetPassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { token, newPassword } = req.body;

    // Get user ID from reset token
    const userId = await redis.get(`reset_token:${token}`);
    if (!userId) {
      throw new AppError('Token reset tidak valid atau sudah kedaluwarsa', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Remove reset token
    await redis.del(`reset_token:${token}`);

    // Remove all refresh tokens for this user
    await redis.del(`refresh_token:${userId}`);

    logger.info(`Password reset completed for user ID: ${userId}`);

    res.json(
      createApiResponse(true, 'Password berhasil direset')
    );
  });

  /**
   * Verify email
   */
  verifyEmail = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { token } = req.params;

    // Get user ID from verification token
    const userId = await redis.get(`verify_email:${token}`);
    if (!userId) {
      throw new AppError('Token verifikasi tidak valid atau sudah kedaluwarsa', 400);
    }

    // Update user email verification status
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    // Remove verification token
    await redis.del(`verify_email:${token}`);

    logger.info(`Email verified for user ID: ${userId}`);

    res.json(
      createApiResponse(true, 'Email berhasil diverifikasi')
    );
  });

  /**
   * Resend email verification
   */
  resendEmailVerification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User tidak ditemukan', 404);
    }

    if (user.emailVerified) {
      throw new AppError('Email sudah terverifikasi', 400);
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();

    // Store verification token in Redis
    await redis.set(
      `verify_email:${verificationToken}`,
      user.id,
      { EX: 24 * 60 * 60 } // 24 hours
    );

    // TODO: Send verification email
    // await emailService.sendEmailVerification(user.email, verificationToken);

    logger.info(`Email verification resent for user: ${user.email}`);

    res.json(
      createApiResponse(true, 'Email verifikasi telah dikirim ulang')
    );
  });
}

export const authController = new AuthController();
export default authController;
