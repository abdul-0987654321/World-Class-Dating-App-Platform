import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import * as replyAssistantController from '../controllers/reply-assistant.controller';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// POST /api/reply-assistant/generate - Generate reply suggestions
router.post('/generate', replyAssistantController.generateReplies);

export default router;
