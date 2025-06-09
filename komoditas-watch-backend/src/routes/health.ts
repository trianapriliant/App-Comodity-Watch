import { Router } from 'express';
import { prisma, checkDatabaseHealth } from '../config/database';
import { redis } from '../config/redis';
import { createApiResponse } from '../utils';
import { HealthCheckResult } from '../types';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, unhealthy]
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     services:
 *                       type: object
 *                       properties:
 *                         database:
 *                           type: boolean
 *                         redis:
 *                           type: boolean
 *                         external_apis:
 *                           type: boolean
 *                     version:
 *                       type: string
 *                     uptime:
 *                       type: number
 */
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();

    // Check database health
    const databaseHealthy = await checkDatabaseHealth();

    // Check Redis health
    const redisHealthy = await redis.healthCheck();

    // For now, assume external APIs are healthy
    const externalApisHealthy = true;

    const allHealthy = databaseHealthy && redisHealthy && externalApisHealthy;

    const healthResult: HealthCheckResult = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      services: {
        database: databaseHealthy,
        redis: redisHealthy,
        external_apis: externalApisHealthy,
      },
      version: '1.0.0',
      uptime: process.uptime(),
    };

    const responseTime = Date.now() - startTime;

    res.status(allHealthy ? 200 : 503).json(
      createApiResponse(
        allHealthy,
        allHealthy ? 'System healthy' : 'System unhealthy',
        {
          ...healthResult,
          responseTime,
        }
      )
    );
  } catch (error) {
    res.status(503).json(
      createApiResponse(false, 'Health check failed', {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );
  }
});

/**
 * @swagger
 * /health/database:
 *   get:
 *     summary: Database health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Database health status
 */
router.get('/database', async (req, res) => {
  try {
    const startTime = Date.now();
    const isHealthy = await checkDatabaseHealth();
    const responseTime = Date.now() - startTime;

    res.status(isHealthy ? 200 : 503).json(
      createApiResponse(
        isHealthy,
        isHealthy ? 'Database healthy' : 'Database unhealthy',
        {
          healthy: isHealthy,
          responseTime,
          timestamp: new Date(),
        }
      )
    );
  } catch (error) {
    res.status(503).json(
      createApiResponse(false, 'Database health check failed', {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      })
    );
  }
});

/**
 * @swagger
 * /health/redis:
 *   get:
 *     summary: Redis health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Redis health status
 */
router.get('/redis', async (req, res) => {
  try {
    const startTime = Date.now();
    const isHealthy = await redis.healthCheck();
    const responseTime = Date.now() - startTime;

    res.status(isHealthy ? 200 : 503).json(
      createApiResponse(
        isHealthy,
        isHealthy ? 'Redis healthy' : 'Redis unhealthy',
        {
          healthy: isHealthy,
          responseTime,
          timestamp: new Date(),
        }
      )
    );
  } catch (error) {
    res.status(503).json(
      createApiResponse(false, 'Redis health check failed', {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      })
    );
  }
});

export default router;
