import { Router } from 'express';

import { GetMatchesQueryDto, RecentMatchesQueryDto } from '../../dto';
import matchController from '../controllers/match.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateQuery } from '../middleware/validation.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/matches - Get all matches
router.get(
  '/',
  validateQuery(GetMatchesQueryDto),
  matchController.getMatches.bind(matchController)
);

// GET /api/matches/recent - Get recent matches
router.get(
  '/recent',
  validateQuery(RecentMatchesQueryDto),
  matchController.getRecentMatches.bind(matchController)
);

// GET /api/matches/count - Get match count
router.get('/count', matchController.getMatchCount.bind(matchController));

// GET /api/matches/:matchId - Get specific match
router.get('/:matchId', matchController.getMatch.bind(matchController));

// DELETE /api/matches/:matchId - Unmatch
router.delete('/:matchId', matchController.unmatch.bind(matchController));

// POST /api/matches/:matchId/extend - Extend match expiration (Premium)
router.post('/:matchId/extend', matchController.extendMatch.bind(matchController));

// POST /api/matches/:targetUserId/rematch - Rematch with expired match (Premium)
router.post('/:targetUserId/rematch', matchController.rematch.bind(matchController));

export default router;
