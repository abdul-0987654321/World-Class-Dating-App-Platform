import { Router } from 'express';

import * as scheduledMessageController from '../controllers/scheduled-message.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// POST /api/scheduled-messages - Create scheduled message
router.post('/', scheduledMessageController.createScheduledMessage);

// PUT /api/scheduled-messages/:id - Update scheduled message
router.put('/:id', scheduledMessageController.updateScheduledMessage);

// DELETE /api/scheduled-messages/:id - Delete scheduled message
router.delete('/:id', scheduledMessageController.deleteScheduledMessage);

// POST /api/scheduled-messages/warmup-sequence - Create match warmup sequence
router.post('/warmup-sequence', scheduledMessageController.createMatchWarmupSequence);

export default router;
