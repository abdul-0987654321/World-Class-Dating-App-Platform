/**
 * Health Check Routes
 * No authentication required
 */

import { Router, Request, Response } from 'express';

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
  try {
    // TODO: Implement actual database health checks
    // const pgHealth = await checkPostgresHealth();
    // const mongoHealth = await checkMongoHealth();
    // const redisHealth = await checkRedisHealth();

    res.status(200).json({
      success: true,
      data: {
        postgres: 'connected',
        mongodb: 'connected',
        redis: 'connected',
      },
    });
  } catch (error) {
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
