import { Router } from 'express';
import matchController from '../controllers/match.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/matches - Get all matches
router.get('/', matchController.getMatches.bind(matchController));

// GET /api/matches/recent - Get recent matches
router.get('/recent', matchController.getRecentMatches.bind(matchController));

// GET /api/matches/count - Get match count
router.get('/count', matchController.getMatchCount.bind(matchController));

// GET /api/matches/:matchId - Get specific match
router.get('/:matchId', matchController.getMatch.bind(matchController));

// DELETE /api/matches/:matchId - Unmatch
router.delete('/:matchId', matchController.unmatch.bind(matchController));

export default router;
