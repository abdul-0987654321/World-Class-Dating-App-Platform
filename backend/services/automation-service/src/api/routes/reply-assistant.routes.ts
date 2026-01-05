import { Router } from 'express';

import * as replyAssistantController from '../controllers/reply-assistant.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// POST /api/reply-assistant/generate - Generate reply suggestions
router.post('/generate', replyAssistantController.generateReplies);

export default router;
