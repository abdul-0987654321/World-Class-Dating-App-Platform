import { Router } from 'express';
import boostController from '../controllers/boost.controller';
import { authenticate as authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All boost routes require authentication
router.use(authMiddleware);

// Activate boost
router.post('/activate', boostController.activateBoost.bind(boostController));

// Get active boost
router.get('/active', boostController.getActiveBoost.bind(boostController));

// Get boost stats
router.get('/stats', boostController.getBoostStats.bind(boostController));

// Get boost history
router.get('/history', boostController.getBoostHistory.bind(boostController));

// Cancel active boost
router.post('/cancel', boostController.cancelBoost.bind(boostController));

export default router;
