/**
 * Trust Controller
 * HTTP handlers for trust service endpoints
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { trustScoreService } from '../../domain/services/trust-score.service';
import { ratingService } from '../../domain/services/rating.service';
import {
  RecordSignalRequest,
  SubmitRatingRequest,
  GiveEndorsementRequest,
} from '../../domain/types/trust.types';

// ============================================================================
// Trust Score Endpoints
// ============================================================================

/**
 * Get current user's trust score
 */
export async function getMyTrustScore(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const trustScore = await trustScoreService.getTrustScore(userId);

    res.json({
      success: true,
      data: trustScore,
    });
  } catch (error) {
    console.error('Failed to get trust score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trust score',
    });
  }
}

/**
 * Get trust profile for a user (public-facing)
 */
export async function getTrustProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const profile = await trustScoreService.getTrustProfile(userId);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('Failed to get trust profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trust profile',
    });
  }
}

/**
 * Record a trust signal (internal/service-to-service)
 */
export async function recordSignal(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const request: RecordSignalRequest = req.body;

    if (!request.userId || !request.type || !request.source) {
      res.status(400).json({
        success: false,
        error: 'userId, type, and source are required',
      });
      return;
    }

    const signal = await trustScoreService.recordSignal(request);

    res.status(201).json({
      success: true,
      data: signal,
    });
  } catch (error) {
    console.error('Failed to record signal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record signal',
    });
  }
}

/**
 * Recalculate trust score
 */
export async function recalculateScore(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const trustScore = await trustScoreService.recalculateScore(userId);

    res.json({
      success: true,
      data: trustScore,
    });
  } catch (error) {
    console.error('Failed to recalculate score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate score',
    });
  }
}

// ============================================================================
// Rating Endpoints
// ============================================================================

/**
 * Submit a rating for another user
 */
export async function submitRating(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const fromUserId = req.userId!;
    const request: SubmitRatingRequest = req.body;

    if (!request.toUserId || !request.rating || !request.categories) {
      res.status(400).json({
        success: false,
        error: 'toUserId, rating, and categories are required',
      });
      return;
    }

    if (request.rating < 1 || request.rating > 5) {
      res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5',
      });
      return;
    }

    const canRate = await ratingService.canRate(
      fromUserId,
      request.toUserId,
      request.conversationId
    );
    if (!canRate) {
      res.status(403).json({
        success: false,
        error: 'Cannot rate this user',
      });
      return;
    }

    const rating = await ratingService.submitRating(fromUserId, request);

    res.status(201).json({
      success: true,
      data: rating,
    });
  } catch (error) {
    console.error('Failed to submit rating:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit rating',
    });
  }
}

/**
 * Get ratings received by user
 */
export async function getMyRatings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const ratings = await ratingService.getRatingsReceived(userId);

    res.json({
      success: true,
      data: ratings,
    });
  } catch (error) {
    console.error('Failed to get ratings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ratings',
    });
  }
}

/**
 * Get rating stats for user
 */
export async function getRatingStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const stats = await ratingService.getRatingStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Failed to get rating stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rating stats',
    });
  }
}

// ============================================================================
// Endorsement Endpoints
// ============================================================================

/**
 * Give an endorsement to another user
 */
export async function giveEndorsement(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const fromUserId = req.userId!;
    const request: GiveEndorsementRequest = req.body;

    if (!request.toUserId || !request.type) {
      res.status(400).json({
        success: false,
        error: 'toUserId and type are required',
      });
      return;
    }

    if (fromUserId === request.toUserId) {
      res.status(400).json({
        success: false,
        error: 'Cannot endorse yourself',
      });
      return;
    }

    const endorsement = await ratingService.giveEndorsement(fromUserId, request);

    res.status(201).json({
      success: true,
      data: endorsement,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to give endorsement';
    console.error('Failed to give endorsement:', error);
    res.status(400).json({
      success: false,
      error: message,
    });
  }
}

/**
 * Get endorsements received
 */
export async function getMyEndorsements(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const endorsements = await ratingService.getEndorsementsReceived(userId);

    res.json({
      success: true,
      data: endorsements,
    });
  } catch (error) {
    console.error('Failed to get endorsements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get endorsements',
    });
  }
}

/**
 * Get endorsement counts for a user
 */
export async function getEndorsementCounts(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { userId } = req.params;
    const counts = await ratingService.getEndorsementCounts(userId);

    res.json({
      success: true,
      data: counts,
    });
  } catch (error) {
    console.error('Failed to get endorsement counts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get endorsement counts',
    });
  }
}
