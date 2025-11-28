/**
 * Matching Routes
 * Endpoints for matches and likes management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { AuthMiddleware } from '../../middleware/auth.middleware.enhanced';
import { logger } from '../../utils/logger';
import { db } from '../../config/database.config';

const router = Router();

// Helper to get user ID from request
const getUserId = (req: Request): string => {
  return (req as any).user?.userId || req.headers['x-user-id'] as string || 'demo_user';
};

/**
 * @swagger
 * /api/matches:
 *   get:
 *     summary: Get user's matches
 *     tags: [Matching]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', AuthMiddleware.verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Get matches where user is either user_id_1 or user_id_2 (correct column names)
    const matches = await db('matches')
      .where('user_id_1', userId)
      .orWhere('user_id_2', userId)
      .where('is_active', true)
      .orderBy('matched_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Get matched user details and last messages
    const matchesWithDetails = await Promise.all(
      matches.map(async (match: any) => {
        const matchedUserId = match.user_id_1 === userId ? match.user_id_2 : match.user_id_1;

        // Get matched user info from users table (first_name is there)
        const matchedUser = await db('users')
          .where('id', matchedUserId)
          .select('id', 'first_name', 'last_active_at')
          .first();

        // Get primary photo from profile_photos table
        const photo = await db('profile_photos')
          .where('user_id', matchedUserId)
          .orderBy('order_index', 'asc')
          .first();

        // Get last message in conversation
        const lastMessage = await db('messages')
          .where(function() {
            this.where('sender_id', userId).andWhere('receiver_id', matchedUserId);
          })
          .orWhere(function() {
            this.where('sender_id', matchedUserId).andWhere('receiver_id', userId);
          })
          .orderBy('created_at', 'desc')
          .first();

        // Check for unread messages
        const unreadCount = await db('messages')
          .where('sender_id', matchedUserId)
          .where('receiver_id', userId)
          .where('is_read', false)
          .count('id as count')
          .first();

        // Determine if user is online (active within last 5 minutes)
        const isOnline = matchedUser?.last_active_at &&
          new Date(matchedUser.last_active_at) > new Date(Date.now() - 5 * 60 * 1000);

        return {
          id: match.id,
          matchedUser: {
            id: matchedUser?.id,
            name: matchedUser?.first_name || 'User',
            photoUrl: photo?.url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
            isOnline: !!isOnline,
          },
          matchedAt: match.matched_at,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            sentAt: lastMessage.created_at,
            senderId: lastMessage.sender_id,
          } : null,
          lastMessageAt: lastMessage?.created_at || null,
          hasUnread: Number(unreadCount?.count || 0) > 0,
        };
      })
    );

    res.json({
      success: true,
      data: {
        matches: matchesWithDetails,
        page,
        limit,
        hasMore: matchesWithDetails.length === limit,
      },
    });
  } catch (error) {
    logger.error('Get matches error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/matches/likes:
 *   get:
 *     summary: Get users who liked the current user
 *     tags: [Matching]
 */
router.get('/likes', AuthMiddleware.verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Check user subscription for reveal feature
    const user = await db('users')
      .where('id', userId)
      .select('subscription_tier')
      .first();

    const isPremium = ['GOLD', 'PLATINUM', 'DIAMOND'].includes(user?.subscription_tier);

    // Get likes not yet matched (where user hasn't swiped on them)
    // swipes table uses: user_id, target_user_id
    const likes = await db('swipes')
      .where('target_user_id', userId)
      .whereIn('action', ['like', 'super_like'])
      .whereNotIn('user_id', function() {
        this.select('target_user_id')
          .from('swipes')
          .where('user_id', userId);
      })
      .orderBy('swiped_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Get user details for each like
    const likesWithDetails = await Promise.all(
      likes.map(async (like: any) => {
        const likerUser = await db('users')
          .where('id', like.user_id)
          .select('id', 'first_name', 'date_of_birth')
          .first();

        const photo = await db('profile_photos')
          .where('user_id', like.user_id)
          .orderBy('order_index', 'asc')
          .first();

        // Calculate age
        let age = null;
        if (likerUser?.date_of_birth) {
          const birthDate = new Date(likerUser.date_of_birth);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
        }

        // For non-premium users, blur the photos and hide info
        const isBlurred = !isPremium;

        return {
          id: like.id,
          user: {
            id: isBlurred ? null : likerUser?.id,
            name: isBlurred ? null : likerUser?.first_name,
            age: isBlurred ? null : age,
            photoUrl: photo?.url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
          },
          isSuperLike: like.action === 'super_like',
          isBlurred,
          likedAt: like.swiped_at,
        };
      })
    );

    res.json({
      success: true,
      data: {
        likes: likesWithDetails,
        totalCount: likes.length,
        isPremium,
        page,
        limit,
        hasMore: likesWithDetails.length === limit,
      },
    });
  } catch (error) {
    logger.error('Get likes error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/matches/{matchId}:
 *   delete:
 *     summary: Unmatch a user
 *     tags: [Matching]
 */
router.delete('/:matchId', AuthMiddleware.verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { matchId } = req.params;

    // Verify user is part of this match
    const match = await db('matches')
      .where('id', matchId)
      .where(function() {
        this.where('user_id_1', userId).orWhere('user_id_2', userId);
      })
      .first();

    if (!match) {
      return res.status(404).json({
        success: false,
        error: { message: 'Match not found', code: 'MATCH_NOT_FOUND' },
      });
    }

    // Set match as inactive instead of deleting
    await db('matches').where('id', matchId).update({ is_active: false, updated_at: new Date() });

    // Optionally delete related swipes
    const matchedUserId = match.user_id_1 === userId ? match.user_id_2 : match.user_id_1;
    await db('swipes')
      .where(function() {
        this.where('user_id', userId).andWhere('target_user_id', matchedUserId);
      })
      .orWhere(function() {
        this.where('user_id', matchedUserId).andWhere('target_user_id', userId);
      })
      .delete();

    res.json({
      success: true,
      data: { message: 'Unmatched successfully' },
    });
  } catch (error) {
    logger.error('Unmatch error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/matches/{matchId}/report:
 *   post:
 *     summary: Report a matched user
 *     tags: [Matching]
 */
router.post('/:matchId/report', AuthMiddleware.verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { matchId } = req.params;
    const { reason, description } = req.body;

    // Verify user is part of this match
    const match = await db('matches')
      .where('id', matchId)
      .where(function() {
        this.where('user_id_1', userId).orWhere('user_id_2', userId);
      })
      .first();

    if (!match) {
      return res.status(404).json({
        success: false,
        error: { message: 'Match not found', code: 'MATCH_NOT_FOUND' },
      });
    }

    const reportedUserId = match.user_id_1 === userId ? match.user_id_2 : match.user_id_1;

    // Create report using the reports table schema
    const report = await db('reports').insert({
      id: require('crypto').randomUUID(),
      reporter_user_id: userId,
      reported_user_id: reportedUserId,
      reason: reason,
      details: description,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    }).returning('*');

    res.json({
      success: true,
      data: {
        message: 'Report submitted successfully',
        reportId: report[0]?.id,
      },
    });
  } catch (error) {
    logger.error('Report match error:', error);
    next(error);
  }
});

export default router;
