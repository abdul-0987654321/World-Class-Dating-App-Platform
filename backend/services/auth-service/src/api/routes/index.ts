import { Router } from 'express';

import authRoutes from './auth.routes';
import assistantRoutes from '../assistant/assistant.routes';

const router = Router();

// Mount auth routes
router.use('/auth', authRoutes);

// Mount AI assistant routes
router.use('/assistant', assistantRoutes);

export default router;
