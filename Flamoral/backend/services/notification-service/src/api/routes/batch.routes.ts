/**
 * Batch Notification Routes
 * Endpoints for batch and segmented notifications
 */

import { Router } from 'express';
import { batchController } from '../controllers/batch.controller';
import { requireAuth } from '../../middleware/auth';
import { authenticateService } from '../../middleware/service-auth.middleware';

const router = Router();

// All routes require service authentication (internal service-to-service calls)
router.use(authenticateService);

// Batch notification endpoints
router.post('/send', batchController.sendBatch.bind(batchController));
router.post('/segment', batchController.sendToSegment.bind(batchController));

// Job management
router.get('/job/:jobId', batchController.getJobStatus.bind(batchController));
router.delete('/job/:jobId', batchController.cancelJob.bind(batchController));
router.get('/jobs', batchController.getJobHistory.bind(batchController));

// Statistics and maintenance
router.get('/stats', batchController.getBatchStats.bind(batchController));
router.post('/cleanup', batchController.cleanupOldJobs.bind(batchController));

export default router;
