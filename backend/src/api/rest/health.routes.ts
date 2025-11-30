/**
 * Health Check Routes
 * No authentication required
 */

import { Router, Request, Response } from 'express';
import { db } from '../../config/database.config';
import { redisClient } from '../../config/redis.config';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * GET /health
 * Check if server is running
 */
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    },
  });
});

/**
 * GET /health/db
 * Check database connections
 */
router.get('/db', async (req: Request, res: Response) => {
  const health: Record<string, { status: string; latency?: number; error?: string }> = {};

  try {
    // Check PostgreSQL
    const pgStart = Date.now();
    try {
      await db.raw('SELECT 1');
      health.postgres = {
        status: 'connected',
        latency: Date.now() - pgStart,
      };
    } catch (pgError: any) {
      health.postgres = {
        status: 'disconnected',
        error: pgError.message,
      };
    }

    // Check Redis
    const redisStart = Date.now();
    try {
      if (redisClient) {
        await redisClient.ping();
        health.redis = {
          status: 'connected',
          latency: Date.now() - redisStart,
        };
      } else {
        health.redis = {
          status: 'not_configured',
        };
      }
    } catch (redisError: any) {
      health.redis = {
        status: 'disconnected',
        error: redisError.message,
      };
    }

    // Determine overall health
    const allHealthy = Object.values(health).every(
      (h) => h.status === 'connected' || h.status === 'not_configured'
    );

    if (allHealthy) {
      res.status(200).json({
        success: true,
        data: health,
      });
    } else {
      res.status(503).json({
        success: false,
        data: health,
        error: {
          message: 'Some services are unhealthy',
          code: 'DB_HEALTH_DEGRADED',
        },
      });
    }
  } catch (error: any) {
    logger.error('Health check error:', error);
    res.status(503).json({
      success: false,
      error: {
        message: 'Database health check failed',
        code: 'DB_HEALTH_FAILED',
      },
    });
  }
});

export default router;
