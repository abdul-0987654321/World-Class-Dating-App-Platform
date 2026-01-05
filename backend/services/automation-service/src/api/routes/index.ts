import { Router } from 'express';

import icebreakerRoutes from './icebreaker.routes';
import replyAssistantRoutes from './reply-assistant.routes';
import scheduledMessagesRoutes from './scheduled-messages.routes';

const router = Router();

// Mount routes
router.use('/icebreakers', icebreakerRoutes);
router.use('/reply-assistant', replyAssistantRoutes);
router.use('/scheduled-messages', scheduledMessagesRoutes);

export default router;
