/**
 * Speed Dating Routes
 * API routes for speed dating events
 */

import { Router } from 'express';
import speedDatingController from '../controllers/speed-dating.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import {
  GetEventsQueryDto,
  JoinEventDto,
  LeaveEventDto,
  CheckInDto,
  RecordInterestDto,
  GetMatchesQueryDto,
} from '../../dto/speed-dating.dto';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/speed-dating/events
 * Get upcoming speed dating events
 */
router.get(
  '/events',
  validateQuery(GetEventsQueryDto),
  speedDatingController.getEvents.bind(speedDatingController)
);

/**
 * GET /api/v1/speed-dating/my-events
 * Get user's registered events
 */
router.get('/my-events', speedDatingController.getMyEvents.bind(speedDatingController));

/**
 * GET /api/v1/speed-dating/events/:eventId
 * Get specific event details
 */
router.get('/events/:eventId', speedDatingController.getEvent.bind(speedDatingController));

/**
 * GET /api/v1/speed-dating/events/:eventId/current-round
 * Get current round info for an event
 */
router.get(
  '/events/:eventId/current-round',
  speedDatingController.getCurrentRound.bind(speedDatingController)
);

/**
 * GET /api/v1/speed-dating/events/:eventId/stats
 * Get event statistics
 */
router.get('/events/:eventId/stats', speedDatingController.getEventStats.bind(speedDatingController));

/**
 * POST /api/v1/speed-dating/join
 * Join a speed dating event
 */
router.post(
  '/join',
  validateBody(JoinEventDto),
  speedDatingController.joinEvent.bind(speedDatingController)
);

/**
 * DELETE /api/v1/speed-dating/leave
 * Leave a speed dating event
 */
router.delete(
  '/leave',
  validateBody(LeaveEventDto),
  speedDatingController.leaveEvent.bind(speedDatingController)
);

/**
 * POST /api/v1/speed-dating/check-in
 * Check in to an event
 */
router.post(
  '/check-in',
  validateBody(CheckInDto),
  speedDatingController.checkIn.bind(speedDatingController)
);

/**
 * POST /api/v1/speed-dating/interest
 * Record interest in a participant
 */
router.post(
  '/interest',
  validateBody(RecordInterestDto),
  speedDatingController.recordInterest.bind(speedDatingController)
);

/**
 * GET /api/v1/speed-dating/matches
 * Get matches from speed dating events
 */
router.get(
  '/matches',
  validateQuery(GetMatchesQueryDto),
  speedDatingController.getMatches.bind(speedDatingController)
);

/**
 * GET /api/v1/speed-dating/icebreakers
 * Get icebreaker questions
 */
router.get('/icebreakers', speedDatingController.getIcebreakers.bind(speedDatingController));

export default router;
