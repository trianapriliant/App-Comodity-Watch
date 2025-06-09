import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { createApiResponse } from '../utils';
import config from '../config';

// Create rate limiters
const createRateLimiter = (options: any) => {
  try {
    return new RateLimiterRedis({
      storeClient: redis.client,
      ...options,
    });
  } catch (error) {
    logger.warn('Redis rate limiter failed, falling back to memory:', error);
    return new RateLimiterMemory(options);
  }
};

// General API rate limiter
const generalRateLimiter = createRateLimiter({
  keyFamily: 'general',
  points: config.rateLimit.maxRequests, // Number of requests
  duration: config.rateLimit.windowMinutes * 60, // Per window in seconds
  blockDuration: 60, // Block for 1 minute if limit exceeded
});

// Authentication rate limiter (stricter)
const authRateLimiter = createRateLimiter({
  keyFamily: 'auth',
  points: 5, // 5 attempts
  duration: 900, // Per 15 minutes
  blockDuration: 900, // Block for 15 minutes
});

// Data input rate limiter
const dataInputRateLimiter = createRateLimiter({
  keyFamily: 'data_input',
  points: 100, // 100 requests
  duration: 3600, // Per hour
  blockDuration: 300, // Block for 5 minutes
});

// Search rate limiter
const searchRateLimiter = createRateLimiter({
  keyFamily: 'search',
  points: 50, // 50 searches
  duration: 300, // Per 5 minutes
  blockDuration: 60, // Block for 1 minute
});

// Report generation rate limiter
const reportRateLimiter = createRateLimiter({
  keyFamily: 'report',
  points: 10, // 10 reports
  duration: 3600, // Per hour
  blockDuration: 600, // Block for 10 minutes
});

/**
 * Generic rate limiting middleware
 */
const createRateLimitMiddleware = (rateLimiter: any, keyGenerator?: (req: Request) => string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = keyGenerator ? keyGenerator(req) : req.ip;
      
      await rateLimiter.consume(key);
      next();
    } catch (rejRes: any) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      
      res.set('Retry-After', String(secs));
      res.status(429).json(
        createApiResponse(
          false,
          `Terlalu banyak permintaan. Coba lagi dalam ${secs} detik.`,
          undefined,
          {
            retryAfter: secs,
            limit: rateLimiter.points,
            remaining: rejRes.remainingHits || 0,
          }
        )
      );
    }
  };
};

/**
 * General rate limiting
 */
export const generalRateLimit = createRateLimitMiddleware(generalRateLimiter);

/**
 * Authentication rate limiting
 */
export const authRateLimit = createRateLimitMiddleware(
  authRateLimiter,
  (req: Request) => `${req.ip}_${req.body?.email || 'unknown'}`
);

/**
 * Data input rate limiting
 */
export const dataInputRateLimit = createRateLimitMiddleware(
  dataInputRateLimiter,
  (req: Request) => req.ip
);

/**
 * Search rate limiting
 */
export const searchRateLimit = createRateLimitMiddleware(
  searchRateLimiter,
  (req: Request) => req.ip
);

/**
 * Report generation rate limiting
 */
export const reportRateLimit = createRateLimitMiddleware(
  reportRateLimiter,
  (req: Request) => req.ip
);

/**
 * User-specific rate limiting
 */
export const userRateLimit = (points: number, duration: number) => {
  const rateLimiter = createRateLimiter({
    keyFamily: 'user_specific',
    points,
    duration,
    blockDuration: 300,
  });

  return createRateLimitMiddleware(
    rateLimiter,
    (req: any) => req.user?.id || req.ip
  );
};

/**
 * Dynamic rate limiting based on user role
 */
export const roleBasedRateLimit = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    let points = 100; // Default for unauthenticated users
    let duration = 3600; // 1 hour

    if (user) {
      switch (user.role) {
        case 'ADMIN':
          points = 1000;
          break;
        case 'REGULATOR':
          points = 500;
          break;
        case 'DISTRIBUTOR':
        case 'PETANI':
          points = 200;
          break;
        case 'CONSUMER':
          points = 100;
          break;
        default:
          points = 50;
      }
    }

    const rateLimiter = createRateLimiter({
      keyFamily: 'role_based',
      points,
      duration,
      blockDuration: 300,
    });

    const key = user ? `${user.id}_${user.role}` : req.ip;
    
    await rateLimiter.consume(key);
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    
    res.set('Retry-After', String(secs));
    res.status(429).json(
      createApiResponse(
        false,
        `Batas permintaan terlampaui. Coba lagi dalam ${secs} detik.`,
        undefined,
        {
          retryAfter: secs,
          remaining: rejRes.remainingHits || 0,
        }
      )
    );
  }
};

/**
 * IP-based blocking for suspicious activity
 */
export const suspiciousActivityBlock = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ip = req.ip;
    const blockedKey = `blocked_ip:${ip}`;
    
    const isBlocked = await redis.exists(blockedKey);
    if (isBlocked) {
      res.status(403).json(
        createApiResponse(false, 'IP address diblokir karena aktivitas mencurigakan')
      );
      return;
    }

    next();
  } catch (error) {
    logger.error('Error checking blocked IPs:', error);
    next(); // Continue if Redis fails
  }
};

/**
 * Block IP address
 */
export const blockIP = async (ip: string, duration: number = 3600): Promise<void> => {
  try {
    const blockedKey = `blocked_ip:${ip}`;
    await redis.set(blockedKey, '1', { EX: duration });
    logger.warn(`IP ${ip} blocked for ${duration} seconds`);
  } catch (error) {
    logger.error('Error blocking IP:', error);
  }
};

/**
 * Unblock IP address
 */
export const unblockIP = async (ip: string): Promise<void> => {
  try {
    const blockedKey = `blocked_ip:${ip}`;
    await redis.del(blockedKey);
    logger.info(`IP ${ip} unblocked`);
  } catch (error) {
    logger.error('Error unblocking IP:', error);
  }
};

/**
 * Get rate limit info for a key
 */
export const getRateLimitInfo = async (rateLimiter: any, key: string) => {
  try {
    const resRateLimiter = await rateLimiter.get(key);
    
    if (resRateLimiter) {
      return {
        limit: rateLimiter.points,
        remaining: resRateLimiter.remainingHits,
        reset: new Date(Date.now() + resRateLimiter.msBeforeNext),
        retryAfter: resRateLimiter.msBeforeNext,
      };
    }
    
    return {
      limit: rateLimiter.points,
      remaining: rateLimiter.points,
      reset: null,
      retryAfter: 0,
    };
  } catch (error) {
    logger.error('Error getting rate limit info:', error);
    return null;
  }
};

/**
 * Add rate limit headers to response
 */
export const addRateLimitHeaders = (rateLimiter: any) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = req.ip;
      const info = await getRateLimitInfo(rateLimiter, key);
      
      if (info) {
        res.set({
          'X-RateLimit-Limit': String(info.limit),
          'X-RateLimit-Remaining': String(info.remaining),
          'X-RateLimit-Reset': info.reset ? String(Math.floor(info.reset.getTime() / 1000)) : '',
        });
      }
      
      next();
    } catch (error) {
      logger.error('Error adding rate limit headers:', error);
      next();
    }
  };
};

export default {
  generalRateLimit,
  authRateLimit,
  dataInputRateLimit,
  searchRateLimit,
  reportRateLimit,
  userRateLimit,
  roleBasedRateLimit,
  suspiciousActivityBlock,
  blockIP,
  unblockIP,
  getRateLimitInfo,
  addRateLimitHeaders,
};
