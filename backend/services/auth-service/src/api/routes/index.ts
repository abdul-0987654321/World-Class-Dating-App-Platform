import { Router } from 'express';

import authRoutes from './auth.routes';
import clerkWebhookRoutes from './clerk-webhook.routes';
import assistantRoutes from '../assistant/assistant.routes';

const router = Router();

// Mount auth routes
router.use('/auth', authRoutes);

// Mount Clerk webhook routes
router.use('/webhooks/clerk', clerkWebhookRoutes);

// Mount AI assistant routes
router.use('/assistant', assistantRoutes);

export default router;
