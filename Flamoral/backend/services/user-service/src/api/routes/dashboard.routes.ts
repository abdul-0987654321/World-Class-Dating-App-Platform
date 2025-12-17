import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import db from '../../database';
import logger from '../../utils/logger';

const router = express.Router();

/**
 * Video call entitlement configuration by tier
 */
const VIDEO_ENTITLEMENTS: Record<string, {
  canMakeVideoCalls: boolean;
  canMakeAudioCalls: boolean;
  maxMinutesPerCall: number;
  callsPerDay: number;
}> = {
  free: { canMakeVideoCalls: false, canMakeAudioCalls: false, maxMinutesPerCall: 0, callsPerDay: 0 },
  basic: { canMakeVideoCalls: true, canMakeAudioCalls: true, maxMinutesPerCall: 10, callsPerDay: 2 },
  plus: { canMakeVideoCalls: true, canMakeAudioCalls: true, maxMinutesPerCall: 30, callsPerDay: 10 },
  premium: { canMakeVideoCalls: true, canMakeAudioCalls: true, maxMinutesPerCall: 0, callsPerDay: 30 },
  premium_plus: { canMakeVideoCalls: true, canMakeAudioCalls: true, maxMinutesPerCall: 0, callsPerDay: 0 },
  elite: { canMakeVideoCalls: true, canMakeAudioCalls: true, maxMinutesPerCall: 0, callsPerDay: 0 },
  mid: { canMakeVideoCalls: true, canMakeAudioCalls: true, maxMinutesPerCall: 0, callsPerDay: 0 },
  ultra: { canMakeVideoCalls: true, canMakeAudioCalls: true, maxMinutesPerCall: 0, callsPerDay: 0 },
};

/**
 * Feature entitlements by tier
 */
const TIER_FEATURES: Record<string, string[]> = {
  free: ['basic_swipes', 'basic_messaging'],
  basic: ['unlimited_swipes', 'see_who_likes_you', 'rewind', 'no_ads'],
  plus: ['incognito_mode', 'priority_likes', 'read_receipts', 'monthly_boost'],
  premium: ['passport', 'profile_controls', 'advanced_filters', 'two_monthly_boosts'],
  premium_plus: ['message_before_match', 'weekly_boost', 'unlimited_rewinds', 'profile_views'],
  elite: ['vip_badge', 'three_weekly_boosts', 'elite_matches', 'dedicated_support'],
};

/**
 * @swagger
 * /api/me/dashboard:
 *   get:
 *     summary: Get unified user dashboard data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Single authoritative endpoint returning all user data:
 *       - Profile basics
 *       - Verification status
 *       - Subscription tier and entitlements
 *       - Coins balance
 *       - Matches count
 *       - Video call availability
 *       - Usage limits
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.get('/dashboard', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user data with all relevant fields
    const user = await db('users')
      .where({ id: userId })
      .select(
        'id',
        'email',
        'first_name',
        'last_name',
        'profile_image_url',
        'subscription_tier',
        'is_email_verified',
        'is_phone_verified',
        'created_at'
      )
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tier = (user.subscription_tier || 'free').toLowerCase();

    // Get coin balance from coins table
    const coinBalance = await db('coins')
      .where({ user_id: userId })
      .select('balance')
      .first();

    const coinsBalance = coinBalance?.balance || 0;

    // Get profile data
    const profile = await db('profiles')
      .where({ user_id: userId })
      .select('bio', 'occupation', 'city', 'country')
      .first();

    // Get primary photo
    const primaryPhoto = await db('photos')
      .where({ user_id: userId, is_primary: true })
      .select('url')
      .first();

    // Get verification status from user_verifications
    const verifications = await db('user_verifications')
      .where({ user_id: userId })
      .select('type', 'status');

    const verificationStatus: Record<string, string> = {};
    for (const v of verifications) {
      verificationStatus[v.type] = v.status;
    }

    // Count matches
    const matchCount = await db('matches')
      .where(function () {
        this.where({ user1_id: userId }).orWhere({ user2_id: userId });
      })
      .andWhere({ matched: true })
      .count('* as count')
      .first();

    // Count likes received (for "who likes you")
    const likesReceivedCount = await db('swipes')
      .where({ target_user_id: userId, action: 'like' })
      .count('* as count')
      .first();

    // Get subscription details if exists
    const subscription = await db('subscriptions')
      .where({ user_id: userId, status: 'active' })
      .select('tier', 'status', 'current_period_end')
      .first();

    // Get video call entitlements
    const videoEntitlements = VIDEO_ENTITLEMENTS[tier] || VIDEO_ENTITLEMENTS.free;

    // Calculate remaining video calls today if limited
    let remainingCallsToday = videoEntitlements.callsPerDay;
    if (videoEntitlements.callsPerDay > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const callsToday = await db('video_calls')
        .where('caller_id', userId)
        .andWhere('initiated_at', '>=', today)
        .count('* as count')
        .first();

      remainingCallsToday = Math.max(0, videoEntitlements.callsPerDay - Number(callsToday?.count || 0));
    }

    // Get daily usage limits
    const usageLimits = await db('usage_limits')
      .where({ user_id: userId })
      .select('swipes_today', 'super_likes_today', 'boosts_today', 'reset_at')
      .first();

    // Build response
    const dashboard = {
      profile: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        profileImageUrl: primaryPhoto?.url || user.profile_image_url,
        bio: profile?.bio,
        occupation: profile?.occupation,
        location: profile?.city ? `${profile.city}, ${profile.country || ''}`.trim() : null,
      },
      verification: {
        email: user.is_email_verified ? 'verified' : 'not_verified',
        phone: user.is_phone_verified ? 'verified' : 'not_verified',
        identity: verificationStatus.gov_id || 'not_started',
        selfie: verificationStatus.selfie || 'not_started',
        liveness: verificationStatus.liveness || 'not_started',
        video: verificationStatus.video || 'not_started',
        biometric: verificationStatus.biometric || 'not_started',
        isFullyVerified: user.is_email_verified &&
                          user.is_phone_verified &&
                          verificationStatus.selfie === 'verified',
      },
      subscription: {
        tier: tier.toUpperCase(),
        status: subscription?.status || 'none',
        expiresAt: subscription?.current_period_end,
        features: TIER_FEATURES[tier] || TIER_FEATURES.free,
      },
      stats: {
        coinsBalance: coinsBalance,
        matchesCount: Number(matchCount?.count || 0),
        likesReceivedCount: Number(likesReceivedCount?.count || 0),
      },
      entitlements: {
        videoCalls: {
          canMakeVideoCalls: videoEntitlements.canMakeVideoCalls,
          canMakeAudioCalls: videoEntitlements.canMakeAudioCalls,
          maxMinutesPerCall: videoEntitlements.maxMinutesPerCall,
          callsPerDay: videoEntitlements.callsPerDay,
          remainingCallsToday,
        },
        limits: {
          swipesToday: usageLimits?.swipes_today || 0,
          superLikesToday: usageLimits?.super_likes_today || 0,
          boostsToday: usageLimits?.boosts_today || 0,
          resetsAt: usageLimits?.reset_at,
        },
      },
      memberSince: user.created_at,
    };

    logger.info('Dashboard data retrieved', { userId });

    res.status(200).json(dashboard);
  } catch (error: any) {
    logger.error('Failed to get dashboard data', {
      userId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      error: 'Failed to retrieve dashboard data',
    });
  }
});

export default router;
