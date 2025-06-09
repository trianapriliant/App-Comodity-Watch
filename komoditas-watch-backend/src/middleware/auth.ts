import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import config from '../config';
import { createApiResponse } from '../utils';
import { AuthenticatedRequest, UserPayload } from '../types';

/**
 * Middleware to verify JWT token
 */
export const verifyToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json(
        createApiResponse(false, 'Token akses diperlukan')
      );
      return;
    }

    const token = authHeader.substring(7);

    // Check if token is blacklisted
    const isBlacklisted = await redis.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      res.status(401).json(
        createApiResponse(false, 'Token tidak valid')
      );
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as UserPayload;
    
    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.id,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      res.status(401).json(
        createApiResponse(false, 'User tidak ditemukan atau tidak aktif')
      );
      return;
    }

    // Add user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    logger.error('Token verification error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json(
        createApiResponse(false, 'Token tidak valid')
      );
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json(
        createApiResponse(false, 'Token telah kedaluwarsa')
      );
    } else {
      res.status(500).json(
        createApiResponse(false, 'Gagal memverifikasi token')
      );
    }
  }
};

/**
 * Middleware to check user roles
 */
export const requireRoles = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(
        createApiResponse(false, 'Authentication diperlukan')
      );
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json(
        createApiResponse(false, 'Akses ditolak. Role tidak mencukupi')
      );
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = requireRoles('ADMIN');

/**
 * Middleware to check if user is regulator
 */
export const requireRegulator = requireRoles('ADMIN', 'REGULATOR');

/**
 * Middleware to check if user can input data
 */
export const canInputData = requireRoles('ADMIN', 'REGULATOR', 'DISTRIBUTOR', 'PETANI');

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);

    // Check if token is blacklisted
    const isBlacklisted = await redis.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      next();
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as UserPayload;
    
    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.id,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    }

    next();
  } catch (error) {
    // Don't fail, just continue without user
    next();
  }
};

/**
 * Generate JWT token
 */
export const generateTokens = (user: { id: string; email: string; role: string }) => {
  const payload: UserPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

  return { accessToken, refreshToken };
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): UserPayload | null => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as UserPayload;
  } catch (error) {
    logger.error('Refresh token verification error:', error);
    return null;
  }
};

/**
 * Blacklist token
 */
export const blacklistToken = async (token: string): Promise<void> => {
  try {
    // Decode token to get expiration time
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      const expirationTime = decoded.exp - Math.floor(Date.now() / 1000);
      if (expirationTime > 0) {
        await redis.set(`blacklist:${token}`, '1', { EX: expirationTime });
      }
    }
  } catch (error) {
    logger.error('Error blacklisting token:', error);
  }
};

/**
 * Middleware for API key authentication (for external services)
 */
export const verifyApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    res.status(401).json(
      createApiResponse(false, 'API key diperlukan')
    );
    return;
  }

  // Here you would verify the API key against your database
  // For now, we'll use a simple check
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    res.status(401).json(
      createApiResponse(false, 'API key tidak valid')
    );
    return;
  }

  next();
};

/**
 * Rate limiting for authentication endpoints
 */
export const authRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const ip = req.ip;
  const key = `auth_rate_limit:${ip}`;
  
  try {
    const current = await redis.get(key);
    const attempts = current ? parseInt(current) : 0;
    
    if (attempts >= 5) {
      res.status(429).json(
        createApiResponse(false, 'Terlalu banyak percobaan login. Coba lagi nanti')
      );
      return;
    }
    
    await redis.set(key, (attempts + 1).toString(), { EX: 900 }); // 15 minutes
    next();
  } catch (error) {
    logger.error('Rate limiting error:', error);
    next(); // Continue if Redis fails
  }
};

/**
 * Clear rate limit for successful authentication
 */
export const clearAuthRateLimit = async (ip: string): Promise<void> => {
  const key = `auth_rate_limit:${ip}`;
  await redis.del(key);
};

export default {
  verifyToken,
  requireRoles,
  requireAdmin,
  requireRegulator,
  canInputData,
  optionalAuth,
  generateTokens,
  verifyRefreshToken,
  blacklistToken,
  verifyApiKey,
  authRateLimit,
  clearAuthRateLimit,
};
