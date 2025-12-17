/**
 * System API Routes
 * Admin and monitoring endpoints
 */

import { Router } from 'express';
import {
  getSystemHealth,
  getQueueStats,
  getStreamInfo,
  triggerHourlyAggregation,
  triggerDailyAggregation,
  backfillData,
  cleanQueueJobs,
  getDatabasePoolStats,
} from '../controllers/system.controller';

const router = Router();

// Health and monitoring
router.get('/health', getSystemHealth);
router.get('/queue-stats', getQueueStats);
router.get('/stream-info', getStreamInfo);
router.get('/database/pool', getDatabasePoolStats);

// Aggregation triggers
router.post('/aggregate/hourly', triggerHourlyAggregation);
router.post('/aggregate/daily', triggerDailyAggregation);
router.post('/backfill', backfillData);

// Maintenance
router.post('/queue/clean', cleanQueueJobs);

export default router;
