import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../config/logger';
import { createApiResponse } from '../utils';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle Prisma errors
 */
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const target = error.meta?.target as string[];
      const field = target ? target.join(', ') : 'field';
      return new AppError(`Data ${field} sudah ada`, 409);

    case 'P2014':
      // Invalid ID
      return new AppError('ID tidak valid', 400);

    case 'P2003':
      // Foreign key constraint violation
      return new AppError('Data terkait tidak ditemukan', 400);

    case 'P2025':
      // Record not found
      return new AppError('Data tidak ditemukan', 404);

    case 'P2016':
      // Query interpretation error
      return new AppError('Format query tidak valid', 400);

    case 'P2021':
      // Table does not exist
      return new AppError('Resource tidak ditemukan', 404);

    case 'P2022':
      // Column does not exist
      return new AppError('Field tidak valid', 400);

    default:
      return new AppError('Database error', 500);
  }
};

/**
 * Handle validation errors
 */
const handleValidationError = (error: Error): AppError => {
  return new AppError('Data tidak valid', 400);
};

/**
 * Handle JWT errors
 */
const handleJWTError = (): AppError => {
  return new AppError('Token tidak valid', 401);
};

/**
 * Handle JWT expired error
 */
const handleJWTExpiredError = (): AppError => {
  return new AppError('Token telah kedaluwarsa', 401);
};

/**
 * Send error response for development
 */
const sendErrorDev = (err: AppError, res: Response) => {
  res.status(err.statusCode).json(
    createApiResponse(
      false,
      err.message,
      undefined,
      undefined,
      undefined
    )
  );
};

/**
 * Send error response for production
 */
const sendErrorProd = (err: AppError, res: Response) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json(
      createApiResponse(false, err.message)
    );
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('Unexpected error:', err);

    res.status(500).json(
      createApiResponse(false, 'Terjadi kesalahan sistem')
    );
  }
};

/**
 * Not found middleware
 */
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Endpoint ${req.originalUrl} tidak ditemukan`, 404);
  next(error);
};

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = new AppError(err.message, 500);

  // Log error
  logger.error('Error caught by global handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Handle specific error types
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    error = handlePrismaError(err);
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    error = handleValidationError(err);
  } else if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  } else if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  } else if (err instanceof AppError) {
    error = err;
  }

  // Send response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

/**
 * Async error wrapper
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Promise Rejection:', reason);
  // Close server gracefully
  process.exit(1);
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  // Close server gracefully
  process.exit(1);
});

export default {
  AppError,
  notFound,
  errorHandler,
  asyncHandler,
};
