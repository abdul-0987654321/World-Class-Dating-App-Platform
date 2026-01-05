import { Router } from 'express';

import * as icebreakerController from '../controllers/icebreaker.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// POST /api/icebreakers/generate - Generate icebreaker suggestions
router.post('/generate', icebreakerController.generateIcebreakers);

// POST /api/icebreakers/:suggestionId/use - Mark icebreaker as used
router.post('/:suggestionId/use', icebreakerController.markIcebreakerUsed);

export default router;
