/**
 * Events API Routes
 * Event tracking endpoints for swipes, matches, messages, and sessions
 */

import { Router } from 'express';
import {
  trackSwipe,
  trackMatch,
  trackMessage,
  trackSession,
  trackDateArrangement,
  updateDateArrangementStatus,
  trackRevenue,
  updateTransactionStatus,
  getUserSwipeStats,
  getUserMatchSuccess,
} from '../controllers/events.controller';

const router = Router();

// Event tracking
router.post('/swipe', trackSwipe);
router.post('/match', trackMatch);
router.post('/message', trackMessage);
router.post('/session', trackSession);

// Date arrangements
router.post('/date-arrangement', trackDateArrangement);
router.put('/date-arrangement/:id', updateDateArrangementStatus);

// Revenue tracking
router.post('/revenue', trackRevenue);
router.put('/revenue/:id', updateTransactionStatus);

// User statistics
router.get('/user/:userId/swipe-stats', getUserSwipeStats);
router.get('/user/:userId/match-success', getUserMatchSuccess);

export default router;
