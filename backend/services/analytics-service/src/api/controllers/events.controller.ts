/**
 * Events Controller
 * Handles event tracking for swipes, matches, messages, and sessions
 */

import { createLogger } from '@flamoral/backend-shared';
import { Request, Response } from 'express';

import eventsRepository from '../../domain/repositories/events.repository';
import matchSuccessRepository from '../../domain/repositories/match-success.repository';
import revenueRepository from '../../domain/repositories/revenue.repository';

const logger = createLogger('events-controller');

/**
 * Track a swipe event
 * POST /api/events/swipe
 */
export async function trackSwipe(req: Request, res: Response) {
  try {
    const { userId, targetUserId, direction, sessionId, location, metadata } = req.body;

    if (!userId || !targetUserId || !direction) {
      return res.status(400).json({
        success: false,
        error: 'userId, targetUserId, and direction are required',
      });
    }

    const event = await eventsRepository.trackSwipe({
      userId,
      targetUserId,
      direction,
      sessionId,
      location,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: event,
      message: 'Swipe tracked successfully',
    });
  } catch (error: any) {
    logger.error('Track swipe error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to track swipe',
    });
  }
}

/**
 * Track a match event
 * POST /api/events/match
 */
export async function trackMatch(req: Request, res: Response) {
  try {
    const { matchId, userId1, userId2, mutualSwipeTime, sessionId } = req.body;

    if (!matchId || !userId1 || !userId2) {
      return res.status(400).json({
        success: false,
        error: 'matchId, userId1, and userId2 are required',
      });
    }

    const event = await eventsRepository.trackMatch({
      matchId,
      userId1,
      userId2,
      mutualSwipeTime: mutualSwipeTime || 0,
      sessionId,
    });

    res.status(201).json({
      success: true,
      data: event,
      message: 'Match tracked successfully',
    });
  } catch (error: any) {
    logger.error('Track match error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to track match',
    });
  }
}

/**
 * Track a message event
 * POST /api/events/message
 */
export async function trackMessage(req: Request, res: Response) {
  try {
    const {
      conversationId,
      senderId,
      receiverId,
      messageLength,
      hasMedia,
      responseTime,
      sessionId,
    } = req.body;

    if (!conversationId || !senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        error: 'conversationId, senderId, and receiverId are required',
      });
    }

    const event = await eventsRepository.trackMessage({
      conversationId,
      senderId,
      receiverId,
      messageLength: messageLength || 0,
      hasMedia: hasMedia || false,
      responseTime,
      sessionId,
    });

    res.status(201).json({
      success: true,
      data: event,
      message: 'Message tracked successfully',
    });
  } catch (error: any) {
    logger.error('Track message error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to track message',
    });
  }
}

/**
 * Track a session
 * POST /api/events/session
 */
export async function trackSession(req: Request, res: Response) {
  try {
    const {
      sessionId,
      userId,
      startTime,
      endTime,
      duration,
      screenViews,
      swipeCount,
      messageCount,
      profileViews,
      deviceType,
      appVersion,
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required',
      });
    }

    const event = await eventsRepository.trackSession({
      sessionId,
      userId,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      duration,
      screenViews,
      swipeCount,
      messageCount,
      profileViews,
      deviceType,
      appVersion,
    });

    res.status(201).json({
      success: true,
      data: event,
      message: 'Session tracked successfully',
    });
  } catch (error: any) {
    logger.error('Track session error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to track session',
    });
  }
}

/**
 * Track a date arrangement
 * POST /api/events/date-arrangement
 */
export async function trackDateArrangement(req: Request, res: Response) {
  try {
    const { conversationId, userId1, userId2, status } = req.body;

    if (!conversationId || !userId1 || !userId2) {
      return res.status(400).json({
        success: false,
        error: 'conversationId, userId1, and userId2 are required',
      });
    }

    const arrangement = await matchSuccessRepository.trackDateArrangement({
      conversationId,
      userId1,
      userId2,
      status,
    });

    res.status(201).json({
      success: true,
      data: arrangement,
      message: 'Date arrangement tracked successfully',
    });
  } catch (error: any) {
    logger.error('Track date arrangement error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to track date arrangement',
    });
  }
}

/**
 * Update date arrangement status
 * PUT /api/events/date-arrangement/:id
 */
export async function updateDateArrangementStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required',
      });
    }

    const arrangement = await matchSuccessRepository.updateDateArrangementStatus(id, status);

    res.status(200).json({
      success: true,
      data: arrangement,
      message: 'Date arrangement status updated successfully',
    });
  } catch (error: any) {
    logger.error('Update date arrangement status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update date arrangement status',
    });
  }
}

/**
 * Track a revenue transaction
 * POST /api/events/revenue
 */
export async function trackRevenue(req: Request, res: Response) {
  try {
    const {
      userId,
      transactionType,
      amount,
      currency,
      paymentMethod,
      status,
      subscriptionPlan,
      coinPackageSize,
      metadata,
    } = req.body;

    if (!userId || !transactionType || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'userId, transactionType, and amount are required',
      });
    }

    const transaction = await revenueRepository.trackTransaction({
      userId,
      transactionType,
      amount,
      currency,
      paymentMethod,
      status,
      subscriptionPlan,
      coinPackageSize,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: transaction,
      message: 'Revenue transaction tracked successfully',
    });
  } catch (error: any) {
    logger.error('Track revenue error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to track revenue',
    });
  }
}

/**
 * Update transaction status
 * PUT /api/events/revenue/:id
 */
export async function updateTransactionStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required',
      });
    }

    const transaction = await revenueRepository.updateTransactionStatus(id, status);

    res.status(200).json({
      success: true,
      data: transaction,
      message: 'Transaction status updated successfully',
    });
  } catch (error: any) {
    logger.error('Update transaction status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update transaction status',
    });
  }
}

/**
 * Get user swipe statistics
 * GET /api/events/user/:userId/swipe-stats
 */
export async function getUserSwipeStats(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const stats = await eventsRepository.getUserSwipeStats(
      userId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Get user swipe stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user swipe stats',
    });
  }
}

/**
 * Get user match success rate
 * GET /api/events/user/:userId/match-success
 */
export async function getUserMatchSuccess(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const stats = await eventsRepository.getUserMatchSuccessRate(userId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Get user match success error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user match success',
    });
  }
}
