import { Router } from 'express';

import { ActivateBoostDto, CancelBoostDto, BoostHistoryQueryDto } from '../../dto';
import boostController from '../controllers/boost.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';

const router = Router();

// All boost routes require authentication
router.use(authMiddleware);

// Activate boost
router.post(
  '/activate',
  validateBody(ActivateBoostDto),
  boostController.activateBoost.bind(boostController)
);

// Get active boost
router.get('/active', boostController.getActiveBoost.bind(boostController));

// Get boost stats
router.get('/stats', boostController.getBoostStats.bind(boostController));

// Get boost history
router.get(
  '/history',
  validateQuery(BoostHistoryQueryDto),
  boostController.getBoostHistory.bind(boostController)
);

// Cancel active boost
router.post(
  '/cancel',
  validateBody(CancelBoostDto),
  boostController.cancelBoost.bind(boostController)
);

export default router;
