/**
 * Discovery Routes
 * User discovery, recommendations, and swiping functionality
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
 * /api/discovery/recommendations:
 *   get:
 *     summary: Get profile recommendations for swiping
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of recommended profiles
 */
router.get('/recommendations', AuthMiddleware.verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit as string) || 10;

    // Get user preferences from user_settings table
    const preferences = await db('user_settings')
      .where('user_id', userId)
      .first();

    // Get profiles excluding already swiped and blocked users
    // swipes table uses: user_id, target_user_id
    const swipedUserIds = await db('swipes')
      .where('user_id', userId)
      .select('target_user_id');

    // blocks table uses: user_id, blocked_user_id
    const blockedUserIds = await db('blocks')
      .where('user_id', userId)
      .orWhere('blocked_user_id', userId)
      .select('user_id', 'blocked_user_id');

    const excludedIds = [
      userId,
      ...swipedUserIds.map(s => s.target_user_id),
      ...blockedUserIds.map(b => b.user_id === userId ? b.blocked_user_id : b.user_id),
    ];

    // Build query with filters - use users table for basic info, profiles for extended
    let query = db('users')
      .leftJoin('profiles', 'users.id', 'profiles.user_id')
      .whereNotIn('users.id', excludedIds)
      .where('users.is_active', true)
      .where('users.is_banned', false)
      .select(
        'users.id as user_id',
        'users.first_name',
        'users.date_of_birth',
        'users.gender',
        'users.is_verified',
        'users.subscription_tier',
        'profiles.bio',
        'profiles.current_city as city',
        'profiles.interests'
      )
      .limit(limit);

    // Apply preferences if available
    if (preferences) {
      if (preferences.preferred_gender && preferences.preferred_gender !== 'all') {
        query = query.where('users.gender', preferences.preferred_gender);
      }
      if (preferences.min_age) {
        const maxBirthDate = new Date();
        maxBirthDate.setFullYear(maxBirthDate.getFullYear() - preferences.min_age);
        query = query.where('users.date_of_birth', '<=', maxBirthDate);
      }
      if (preferences.max_age) {
        const minBirthDate = new Date();
        minBirthDate.setFullYear(minBirthDate.getFullYear() - preferences.max_age);
        query = query.where('users.date_of_birth', '>=', minBirthDate);
      }
    }

    const profiles = await query;

    // Get photos for each profile from profile_photos table
    const profilesWithPhotos = await Promise.all(
      profiles.map(async (profile: any) => {
        const photos = await db('profile_photos')
          .where('user_id', profile.user_id)
          .where('moderation_status', 'approved')
          .orderBy('order_index', 'asc')
          .select('id', 'url', 'thumbnail_url');

        // Calculate age from date_of_birth
        const birthDate = new Date(profile.date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        // Generate compatibility score (in production, use AI model)
        const compatibilityScore = Math.floor(70 + Math.random() * 30);

        return {
          user_id: profile.user_id,
          first_name: profile.first_name,
          age,
          bio: profile.bio,
          city: profile.city,
          distance: Math.floor(Math.random() * 50), // In production, calculate from location
          interests: profile.interests || [],
          photos: photos.map((p: any) => ({ id: p.id, url: p.url || p.thumbnail_url })),
          is_verified: profile.is_verified,
          compatibility_score: compatibilityScore,
        };
      })
    );

    res.json({
      success: true,
      data: {
        profiles: profilesWithPhotos,
        hasMore: profilesWithPhotos.length === limit,
      },
    });
  } catch (error) {
    logger.error('Get recommendations error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/discovery/stats:
 *   get:
 *     summary: Get discovery statistics (likes remaining, etc.)
 *     tags: [Discovery]
 */
router.get('/stats', AuthMiddleware.verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);

    // Get user subscription to determine limits
    const user = await db('users')
      .where('id', userId)
      .select('subscription_tier')
      .first();

    // Get today's swipe count using daily_limits table
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Check daily_limits table first
    const dailyLimits = await db('daily_limits')
      .where('user_id', userId)
      .where('date', todayStr)
      .first();

    const todaySwipesCount = dailyLimits?.likes_count || 0;
    const todaySuperLikesCount = dailyLimits?.super_likes_count || 0;

    // Define limits based on subscription tier
    const limits: Record<string, { likes: number; superLikes: number; boosts: number }> = {
      FREE: { likes: 50, superLikes: 1, boosts: 0 },
      GOLD: { likes: 200, superLikes: 5, boosts: 1 },
      PLATINUM: { likes: 500, superLikes: 10, boosts: 3 },
      DIAMOND: { likes: -1, superLikes: 15, boosts: 5 }, // -1 = unlimited
    };

    const tier = (user?.subscription_tier || 'free').toUpperCase();
    const tierLimits = limits[tier] || limits.FREE;

    const remainingLikes = tierLimits.likes === -1
      ? -1
      : Math.max(0, tierLimits.likes - todaySwipesCount);

    const remainingSuperLikes = Math.max(0, tierLimits.superLikes - todaySuperLikesCount);

    // Get active boosts
    const activeBoosts = await db('boosts')
      .where('user_id', userId)
      .where('expires_at', '>', new Date())
      .count('id as count')
      .first();

    res.json({
      success: true,
      data: {
        remainingLikes,
        remainingSuperLikes,
        remainingBoosts: tierLimits.boosts,
        activeBoosts: Number(activeBoosts?.count || 0),
        tier,
        unlimited: tierLimits.likes === -1,
        resetsAt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get discovery stats error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/discovery/swipe:
 *   post:
 *     summary: Record a swipe action (like, pass, super_like)
 *     tags: [Discovery]
 */
router.post('/swipe', AuthMiddleware.verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { targetUserId, action } = req.body;

    if (!targetUserId || !['like', 'pass', 'super_like'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid swipe action', code: 'INVALID_ACTION' },
      });
    }

    // Record the swipe - use correct column names: user_id, target_user_id
    const swipeId = require('crypto').randomUUID();
    const swipeData = {
      id: swipeId,
      user_id: userId,
      target_user_id: targetUserId,
      action,
      swiped_at: new Date(),
      created_at: new Date(),
    };

    await db('swipes').insert(swipeData);

    // Update daily_limits
    const todayStr = new Date().toISOString().split('T')[0];
    const existingLimit = await db('daily_limits')
      .where('user_id', userId)
      .where('date', todayStr)
      .first();

    if (existingLimit) {
      const updateData: any = {};
      if (action === 'super_like') {
        updateData.super_likes_count = existingLimit.super_likes_count + 1;
      } else if (action === 'like') {
        updateData.likes_count = existingLimit.likes_count + 1;
      }
      if (Object.keys(updateData).length > 0) {
        await db('daily_limits').where('id', existingLimit.id).update(updateData);
      }
    } else {
      await db('daily_limits').insert({
        id: require('crypto').randomUUID(),
        user_id: userId,
        date: todayStr,
        likes_count: action === 'like' ? 1 : 0,
        super_likes_count: action === 'super_like' ? 1 : 0,
        rewinds_count: 0,
        boosts_count: 0,
      });
    }

    // Check for match if this was a like or super_like
    let isMatch = false;
    let match = null;

    if (action === 'like' || action === 'super_like') {
      // Check if the other user already liked this user
      const existingLike = await db('swipes')
        .where('user_id', targetUserId)
        .where('target_user_id', userId)
        .whereIn('action', ['like', 'super_like'])
        .first();

      if (existingLike) {
        isMatch = true;

        // Create the match - use correct column names: user_id_1, user_id_2
        const matchData = {
          id: require('crypto').randomUUID(),
          user_id_1: userId < targetUserId ? userId : targetUserId,
          user_id_2: userId < targetUserId ? targetUserId : userId,
          matched_at: new Date(),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        };

        await db('matches').insert(matchData);

        // Get matched user info
        const matchedUser = await db('users')
          .where('id', targetUserId)
          .select('id', 'first_name')
          .first();

        const photo = await db('profile_photos')
          .where('user_id', targetUserId)
          .orderBy('order_index', 'asc')
          .first();

        match = {
          id: matchData.id,
          matchedUser: {
            id: matchedUser?.id,
            name: matchedUser?.first_name,
            photoUrl: photo?.url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
          },
          matchedAt: matchData.matched_at,
        };
      }
    }

    res.json({
      success: true,
      data: {
        isMatch,
        match,
      },
    });
  } catch (error) {
    logger.error('Swipe error:', error);
    next(error);
  }
});

export default router;
