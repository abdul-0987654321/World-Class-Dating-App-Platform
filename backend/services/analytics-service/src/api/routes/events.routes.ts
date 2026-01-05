/**
 * Events API Routes
 * Event tracking endpoints for swipes, matches, messages, and sessions
 *
 * Authentication:
 * - Event tracking endpoints: Internal service auth (called by other services)
 * - User statistics endpoints: JWT auth (users viewing their own stats) or internal auth
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
import { authenticateInternal, authenticateAny } from '../middleware/auth.middleware';

const router = Router();

// Event tracking - Internal service authentication
// These are called by other Flamoral services when events occur
router.post('/swipe', authenticateInternal, trackSwipe);
router.post('/match', authenticateInternal, trackMatch);
router.post('/message', authenticateInternal, trackMessage);
router.post('/session', authenticateInternal, trackSession);

// Date arrangements - Internal service authentication
router.post('/date-arrangement', authenticateInternal, trackDateArrangement);
router.put('/date-arrangement/:id', authenticateInternal, updateDateArrangementStatus);

// Revenue tracking - Internal service authentication
router.post('/revenue', authenticateInternal, trackRevenue);
router.put('/revenue/:id', authenticateInternal, updateTransactionStatus);

// User statistics - Allow both JWT (user viewing own stats) and internal service auth
router.get('/user/:userId/swipe-stats', authenticateAny, getUserSwipeStats);
router.get('/user/:userId/match-success', authenticateAny, getUserMatchSuccess);

export default router;
