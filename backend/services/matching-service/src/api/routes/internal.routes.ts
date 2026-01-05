import { createLogger } from '@flamoral/backend-shared';
const logger = createLogger('InternalRoutes');

import { Router, Request, Response } from 'express';

import { MatchRepository } from '../../domain/repositories/match.repository';
import { SwipeRepository } from '../../domain/repositories/swipe.repository';
import { MatchStatus } from '../../types';
import { authenticateService } from '../middleware/service-auth.middleware';

const router = Router();

// All internal routes require service authentication
router.use(authenticateService);

/**
 * Internal endpoint: Create a match
 * POST /api/internal/matches/create
 *
 * Request body:
 * {
 *   userId1: string;
 *   userId2: string;
 *   matchScore?: number;
 * }
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { userId1, userId2, matchScore = 0.75 } = req.body;

    // Validate required fields
    if (!userId1 || !userId2) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'userId1 and userId2 are required',
      });
    }

    // Validate users are different
    if (userId1 === userId2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        code: 'INVALID_REQUEST',
        message: 'Cannot create a match with the same user',
      });
    }

    const matchRepository = new MatchRepository();

    // Check if match already exists
    const existingMatch = await matchRepository.findByUsers(userId1, userId2);
    if (existingMatch) {
      return res.status(409).json({
        success: false,
        error: 'Match already exists',
        code: 'MATCH_ALREADY_EXISTS',
        data: existingMatch,
      });
    }

    // Create the match
    const match = await matchRepository.create({
      user1Id: userId1,
      user2Id: userId2,
      compatibilityScore: matchScore,
      matchedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Match created successfully',
      data: match,
    });
  } catch (error: any) {
    logger.error('[InternalAPI] Create match error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create match',
      code: 'MATCH_CREATE_FAILED',
      message: error.message || 'An error occurred while creating match',
    });
  }
});

/**
 * Internal endpoint: Get user's matches
 * GET /api/internal/users/:userId/matches
 *
 * Query params:
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 * - status: 'active' | 'unmatched' | 'all' (default: 'active')
 */
router.get('/users/:userId/matches', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = (req.query.status as string) || 'active';

    const matchRepository = new MatchRepository();

    // Get user's matches
    const matches = await matchRepository.findByUserId(
      userId,
      status === 'active'
        ? MatchStatus.MATCHED
        : status === 'unmatched'
          ? MatchStatus.UNMATCHED
          : undefined
    );

    // Get total count for pagination
    const total = await matchRepository.countByUserId(
      userId,
      status === 'active'
        ? MatchStatus.MATCHED
        : status === 'unmatched'
          ? MatchStatus.UNMATCHED
          : undefined
    );

    return res.status(200).json({
      success: true,
      data: {
        matches,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error: any) {
    logger.error('[InternalAPI] Get user matches error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user matches',
      code: 'GET_MATCHES_FAILED',
      message: error.message || 'An error occurred while getting user matches',
    });
  }
});

/**
 * Internal endpoint: Get match by ID
 * GET /api/internal/matches/:matchId
 */
router.get('/:matchId', async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;

    const matchRepository = new MatchRepository();
    const match = await matchRepository.findById(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found',
        code: 'MATCH_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      data: match,
    });
  } catch (error: any) {
    logger.error('[InternalAPI] Get match error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get match',
      code: 'GET_MATCH_FAILED',
      message: error.message || 'An error occurred while getting match',
    });
  }
});

/**
 * Internal endpoint: Find match between two users
 * GET /api/internal/matches/find
 *
 * Query params:
 * - user1Id: string
 * - user2Id: string
 */
router.get('/find', async (req: Request, res: Response) => {
  try {
    const { user1Id, user2Id } = req.query;

    if (!user1Id || !user2Id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        code: 'MISSING_REQUIRED_PARAMS',
        message: 'user1Id and user2Id are required',
      });
    }

    const matchRepository = new MatchRepository();
    const match = await matchRepository.findByUsers(user1Id as string, user2Id as string);

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found',
        code: 'MATCH_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      data: match,
    });
  } catch (error: any) {
    logger.error('[InternalAPI] Find match error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to find match',
      code: 'FIND_MATCH_FAILED',
      message: error.message || 'An error occurred while finding match',
    });
  }
});

/**
 * Internal endpoint: Update match conversation status
 * PATCH /api/internal/matches/:matchId/conversation
 *
 * Request body:
 * {
 *   conversationInitiated: boolean;
 *   firstMessageSentBy?: string;
 * }
 */
router.patch('/:matchId/conversation', async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    const { conversationInitiated, firstMessageSentBy } = req.body;

    if (conversationInitiated === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'conversationInitiated is required',
      });
    }

    const matchRepository = new MatchRepository();
    const match = await matchRepository.findById(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found',
        code: 'MATCH_NOT_FOUND',
      });
    }

    // Update the match with conversation status
    const updatedMatch = await matchRepository.update(matchId, {
      conversationInitiated,
      firstMessageSentBy,
      firstMessageSent: conversationInitiated,
    });

    return res.status(200).json({
      success: true,
      message: 'Match conversation status updated',
      data: updatedMatch,
    });
  } catch (error: any) {
    logger.error('[InternalAPI] Update match conversation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update match conversation status',
      code: 'UPDATE_MATCH_CONVERSATION_FAILED',
      message: error.message || 'An error occurred while updating match conversation status',
    });
  }
});

/**
 * Internal endpoint: Unmatch users
 * POST /api/internal/matches/unmatch
 *
 * Request body:
 * {
 *   matchId: string;
 *   reason?: string;
 * }
 */
router.post('/unmatch', async (req: Request, res: Response) => {
  try {
    const { matchId, reason } = req.body;

    if (!matchId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'matchId is required',
      });
    }

    const matchRepository = new MatchRepository();

    // Update match status
    const match = await matchRepository.unmatch(matchId, reason);

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found',
        code: 'MATCH_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Users unmatched successfully',
      data: match,
    });
  } catch (error: any) {
    logger.error('[InternalAPI] Unmatch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to unmatch users',
      code: 'UNMATCH_FAILED',
      message: error.message || 'An error occurred while unmatching users',
    });
  }
});

/**
 * Internal endpoint: Record a swipe
 * POST /api/internal/swipes/record
 *
 * Request body:
 * {
 *   swiperId: string;
 *   swipedId: string;
 *   direction: 'like' | 'dislike' | 'superlike';
 * }
 */
router.post('/swipes/record', async (req: Request, res: Response) => {
  try {
    const { swiperId, swipedId, direction } = req.body;

    // Validate required fields
    if (!swiperId || !swipedId || !direction) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'swiperId, swipedId, and direction are required',
      });
    }

    // Validate direction
    if (!['like', 'dislike', 'superlike'].includes(direction)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid direction',
        code: 'INVALID_DIRECTION',
        message: 'direction must be one of: like, dislike, superlike',
      });
    }

    const swipeRepository = new SwipeRepository();

    // Record the swipe
    const swipe = await swipeRepository.create({
      userId: swiperId,
      targetUserId: swipedId,
      action: direction,
    });

    return res.status(201).json({
      success: true,
      message: 'Swipe recorded successfully',
      data: swipe,
    });
  } catch (error: any) {
    logger.error('[InternalAPI] Record swipe error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to record swipe',
      code: 'SWIPE_RECORD_FAILED',
      message: error.message || 'An error occurred while recording swipe',
    });
  }
});

/**
 * Internal endpoint: Get user's swipe history
 * GET /api/internal/users/:userId/swipes
 *
 * Query params:
 * - limit: number (default: 100)
 * - offset: number (default: 0)
 * - direction: 'like' | 'dislike' | 'superlike' | 'all' (default: 'all')
 */
router.get('/users/:userId/swipes', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const direction = (req.query.direction as string) || 'all';

    const swipeRepository = new SwipeRepository();

    // Get user's swipes
    const swipes = await swipeRepository.findBySwiperId(userId, {
      limit,
      offset,
      direction: direction !== 'all' ? direction : undefined,
    });

    // Get total count for pagination
    const total = await swipeRepository.countBySwiperId(
      userId,
      direction !== 'all' ? direction : undefined
    );

    return res.status(200).json({
      success: true,
      data: {
        swipes,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error: any) {
    logger.error('[InternalAPI] Get user swipes error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user swipes',
      code: 'GET_SWIPES_FAILED',
      message: error.message || 'An error occurred while getting user swipes',
    });
  }
});

export default router;
