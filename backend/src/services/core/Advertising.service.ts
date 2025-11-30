/**
 * Advertising Service
 * AdMob integration, affiliate revenue, and sponsored content
 */

import { logger } from '../../utils/logger';
import { db } from '../../config/database.config';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface AdPlacement {
  id: string;
  placementType: AdPlacementType;
  adUnitId: string;
  platform: 'ios' | 'android' | 'web';
  isActive: boolean;
  priority: number;
  targetingRules?: AdTargetingRules;
}

export type AdPlacementType =
  | 'discovery_feed'
  | 'match_reveal'
  | 'profile_view'
  | 'message_list'
  | 'settings'
  | 'coin_store'
  | 'boost_screen'
  | 'reward_video';

export interface AdTargetingRules {
  minAge?: number;
  maxAge?: number;
  genders?: string[];
  locations?: string[];
  subscriptionTiers?: string[];
  interests?: string[];
}

export interface AdImpression {
  id: string;
  userId: string;
  placementId: string;
  adType: string;
  impressionTime: Date;
  clicked: boolean;
  revenue?: number;
  metadata?: Record<string, any>;
}

export interface AffiliatePartner {
  id: string;
  name: string;
  category: string;
  commissionRate: number;
  trackingUrl: string;
  logoUrl?: string;
  description?: string;
  isActive: boolean;
}

export interface AffiliatePurchase {
  id: string;
  userId: string;
  partnerId: string;
  purchaseAmount: number;
  commissionAmount: number;
  userReward: number;
  status: 'pending' | 'confirmed' | 'paid';
  createdAt: Date;
}

export interface SponsoredProfile {
  id: string;
  advertiserId: string;
  profileData: {
    name: string;
    bio: string;
    photoUrl: string;
    ctaText: string;
    ctaUrl: string;
  };
  targeting: AdTargetingRules;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'paused' | 'completed' | 'pending';
}

// AdMob configuration - Use environment variables in production
const ADMOB_CONFIG = {
  ios: {
    discovery_feed: process.env.ADMOB_IOS_DISCOVERY_FEED || 'ca-app-pub-XXXXX/YYYYYYY',
    match_reveal: process.env.ADMOB_IOS_MATCH_REVEAL || 'ca-app-pub-XXXXX/YYYYYYY',
    profile_view: process.env.ADMOB_IOS_PROFILE_VIEW || 'ca-app-pub-XXXXX/YYYYYYY',
    message_list: process.env.ADMOB_IOS_MESSAGE_LIST || 'ca-app-pub-XXXXX/YYYYYYY',
    reward_video: process.env.ADMOB_IOS_REWARD_VIDEO || 'ca-app-pub-XXXXX/YYYYYYY',
    settings: process.env.ADMOB_IOS_SETTINGS || 'ca-app-pub-XXXXX/YYYYYYY',
    coin_store: process.env.ADMOB_IOS_COIN_STORE || 'ca-app-pub-XXXXX/YYYYYYY',
    boost_screen: process.env.ADMOB_IOS_BOOST_SCREEN || 'ca-app-pub-XXXXX/YYYYYYY',
  },
  android: {
    discovery_feed: process.env.ADMOB_ANDROID_DISCOVERY_FEED || 'ca-app-pub-XXXXX/YYYYYYY',
    match_reveal: process.env.ADMOB_ANDROID_MATCH_REVEAL || 'ca-app-pub-XXXXX/YYYYYYY',
    profile_view: process.env.ADMOB_ANDROID_PROFILE_VIEW || 'ca-app-pub-XXXXX/YYYYYYY',
    message_list: process.env.ADMOB_ANDROID_MESSAGE_LIST || 'ca-app-pub-XXXXX/YYYYYYY',
    reward_video: process.env.ADMOB_ANDROID_REWARD_VIDEO || 'ca-app-pub-XXXXX/YYYYYYY',
    settings: process.env.ADMOB_ANDROID_SETTINGS || 'ca-app-pub-XXXXX/YYYYYYY',
    coin_store: process.env.ADMOB_ANDROID_COIN_STORE || 'ca-app-pub-XXXXX/YYYYYYY',
    boost_screen: process.env.ADMOB_ANDROID_BOOST_SCREEN || 'ca-app-pub-XXXXX/YYYYYYY',
  },
  web: {
    discovery_feed: process.env.ADMOB_WEB_DISCOVERY_FEED || '/6355419/Travel/Europe/France/Paris',
    profile_view: process.env.ADMOB_WEB_PROFILE_VIEW || '/6355419/Travel/Europe/France/Paris',
    message_list: process.env.ADMOB_WEB_MESSAGE_LIST || '/6355419/Travel/Europe/France/Paris',
    settings: process.env.ADMOB_WEB_SETTINGS || '/6355419/Travel/Europe/France/Paris',
  },
};

// Ad frequency caps
const AD_FREQUENCY_CAPS = {
  discovery_feed: { maxPerSession: 10, minIntervalMinutes: 3 },
  match_reveal: { maxPerSession: 3, minIntervalMinutes: 5 },
  profile_view: { maxPerSession: 5, minIntervalMinutes: 2 },
  reward_video: { maxPerDay: 10, minIntervalMinutes: 1 },
};

class AdvertisingService {
  /**
   * Get ad placements for user
   */
  async getAdPlacements(
    userId: string,
    platform: 'ios' | 'android' | 'web'
  ): Promise<AdPlacement[]> {
    try {
      // Get user profile for targeting
      const user = await db('users')
        .leftJoin('profiles', 'users.id', 'profiles.user_id')
        .where('users.id', userId)
        .select(
          'users.date_of_birth',
          'users.gender',
          'users.subscription_tier',
          'profiles.interests',
          'profiles.current_city'
        )
        .first();

      // Premium users don't see ads (except reward videos)
      const isPremium = user?.subscription_tier && user.subscription_tier !== 'free';

      const placements = await db('ad_placements')
        .where('platform', platform)
        .where('is_active', true)
        .orderBy('priority', 'desc');

      // Filter based on targeting and premium status
      return placements
        .filter((p: any) => {
          // Premium users only see reward videos
          if (isPremium && p.placement_type !== 'reward_video') {
            return false;
          }

          // Apply targeting rules
          if (p.targeting_rules) {
            const rules = JSON.parse(p.targeting_rules);
            return this.matchesTargeting(user, rules);
          }

          return true;
        })
        .map(this.mapDbToPlacement);
    } catch (error) {
      logger.error('Error getting ad placements:', error);
      return [];
    }
  }

  /**
   * Get ad unit ID for placement
   */
  getAdUnitId(
    placementType: AdPlacementType,
    platform: 'ios' | 'android' | 'web'
  ): string | null {
    const config = ADMOB_CONFIG[platform];
    return config?.[placementType] || null;
  }

  /**
   * Check if ad can be shown (frequency capping)
   */
  async canShowAd(
    userId: string,
    placementType: AdPlacementType
  ): Promise<{ allowed: boolean; reason?: string; nextAvailableIn?: number }> {
    const caps = AD_FREQUENCY_CAPS[placementType];
    if (!caps) {
      return { allowed: true };
    }

    const now = new Date();

    // Check session limit
    const sessionStart = new Date();
    sessionStart.setHours(sessionStart.getHours() - 1); // 1 hour session

    const sessionImpressions = await db('ad_impressions')
      .where('user_id', userId)
      .where('placement_type', placementType)
      .where('impression_time', '>', sessionStart)
      .count('id as count')
      .first();

    const sessionCount = Number(sessionImpressions?.count || 0);
    const maxPerSession = (caps as any).maxPerSession || Infinity;

    if (sessionCount >= maxPerSession) {
      return {
        allowed: false,
        reason: 'Session limit reached',
        nextAvailableIn: 60, // Try again in a minute
      };
    }

    // Check daily limit for reward videos
    if ((caps as any).maxPerDay) {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);

      const dailyImpressions = await db('ad_impressions')
        .where('user_id', userId)
        .where('placement_type', placementType)
        .where('impression_time', '>', dayStart)
        .count('id as count')
        .first();

      if (Number(dailyImpressions?.count || 0) >= (caps as any).maxPerDay) {
        return {
          allowed: false,
          reason: 'Daily limit reached',
          nextAvailableIn: this.getSecondsUntilMidnight(),
        };
      }
    }

    // Check minimum interval
    const lastImpression = await db('ad_impressions')
      .where('user_id', userId)
      .where('placement_type', placementType)
      .orderBy('impression_time', 'desc')
      .first();

    if (lastImpression) {
      const lastTime = new Date(lastImpression.impression_time);
      const minInterval = caps.minIntervalMinutes * 60 * 1000;
      const elapsed = now.getTime() - lastTime.getTime();

      if (elapsed < minInterval) {
        const nextAvailable = Math.ceil((minInterval - elapsed) / 1000);
        return {
          allowed: false,
          reason: 'Too soon since last ad',
          nextAvailableIn: nextAvailable,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Record ad impression
   */
  async recordImpression(
    userId: string,
    placementId: string,
    placementType: AdPlacementType,
    adType: string
  ): Promise<string> {
    const impressionId = uuidv4();

    await db('ad_impressions').insert({
      id: impressionId,
      user_id: userId,
      placement_id: placementId,
      placement_type: placementType,
      ad_type: adType,
      impression_time: new Date(),
      clicked: false,
      created_at: new Date(),
    });

    logger.debug(`Ad impression recorded: ${impressionId}`);

    return impressionId;
  }

  /**
   * Record ad click
   */
  async recordClick(impressionId: string): Promise<void> {
    await db('ad_impressions')
      .where('id', impressionId)
      .update({
        clicked: true,
        click_time: new Date(),
      });

    logger.debug(`Ad click recorded: ${impressionId}`);
  }

  /**
   * Handle reward video completion
   */
  async handleRewardVideoComplete(
    userId: string,
    impressionId: string,
    rewardType: string,
    rewardAmount: number
  ): Promise<{ success: boolean; reward: { type: string; amount: number } }> {
    try {
      // Verify the impression exists and is valid
      const impression = await db('ad_impressions')
        .where('id', impressionId)
        .where('user_id', userId)
        .first();

      if (!impression) {
        throw new Error('Invalid impression');
      }

      // Award the reward based on type
      switch (rewardType) {
        case 'coins':
          await db('user_wallets')
            .where('user_id', userId)
            .increment('coins', rewardAmount);
          break;
        case 'superlike':
          await db('user_inventory')
            .where('user_id', userId)
            .increment('super_likes', rewardAmount);
          break;
        case 'boost_minutes':
          // Add boost time
          break;
      }

      // Record reward granted
      await db('ad_rewards').insert({
        id: uuidv4(),
        impression_id: impressionId,
        user_id: userId,
        reward_type: rewardType,
        reward_amount: rewardAmount,
        created_at: new Date(),
      });

      logger.info(`Reward video reward: ${rewardType} x${rewardAmount} to user ${userId}`);

      return {
        success: true,
        reward: { type: rewardType, amount: rewardAmount },
      };
    } catch (error) {
      logger.error('Error handling reward video:', error);
      return { success: false, reward: { type: rewardType, amount: 0 } };
    }
  }

  /**
   * Get affiliate partners
   */
  async getAffiliatePartners(
    category?: string
  ): Promise<AffiliatePartner[]> {
    let query = db('affiliate_partners').where('is_active', true);

    if (category) {
      query = query.where('category', category);
    }

    const partners = await query.orderBy('name', 'asc');

    return partners.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      commissionRate: p.commission_rate,
      trackingUrl: p.tracking_url,
      logoUrl: p.logo_url,
      description: p.description,
      isActive: p.is_active,
    }));
  }

  /**
   * Generate affiliate tracking link
   */
  async generateAffiliateLink(
    userId: string,
    partnerId: string
  ): Promise<string> {
    const partner = await db('affiliate_partners')
      .where('id', partnerId)
      .where('is_active', true)
      .first();

    if (!partner) {
      throw new Error('Partner not found');
    }

    // Generate unique tracking code
    const trackingCode = Buffer.from(`${userId}:${partnerId}:${Date.now()}`).toString('base64');

    // Store click for tracking
    await db('affiliate_clicks').insert({
      id: uuidv4(),
      user_id: userId,
      partner_id: partnerId,
      tracking_code: trackingCode,
      created_at: new Date(),
    });

    // Return tracking URL with code
    return `${partner.tracking_url}?ref=${trackingCode}`;
  }

  /**
   * Record affiliate purchase
   */
  async recordAffiliatePurchase(
    trackingCode: string,
    purchaseAmount: number
  ): Promise<void> {
    try {
      // Decode tracking code
      const decoded = Buffer.from(trackingCode, 'base64').toString();
      const [userId, partnerId] = decoded.split(':');

      // Get commission rate
      const partner = await db('affiliate_partners')
        .where('id', partnerId)
        .first();

      if (!partner) return;

      const commissionAmount = purchaseAmount * (partner.commission_rate / 100);
      const userReward = commissionAmount * 0.5; // 50% to user as coins

      await db('affiliate_purchases').insert({
        id: uuidv4(),
        user_id: userId,
        partner_id: partnerId,
        purchase_amount: purchaseAmount,
        commission_amount: commissionAmount,
        user_reward: userReward,
        status: 'pending',
        created_at: new Date(),
      });

      logger.info(`Affiliate purchase recorded: $${purchaseAmount} from partner ${partnerId}`);
    } catch (error) {
      logger.error('Error recording affiliate purchase:', error);
    }
  }

  /**
   * Get sponsored profiles for discovery
   */
  async getSponsoredProfiles(
    viewerId: string,
    limit: number = 2
  ): Promise<SponsoredProfile[]> {
    try {
      // Get viewer for targeting
      const viewer = await db('users')
        .leftJoin('profiles', 'users.id', 'profiles.user_id')
        .where('users.id', viewerId)
        .first();

      const now = new Date();

      // Get active sponsored profiles
      const sponsored = await db('sponsored_profiles')
        .where('status', 'active')
        .where('start_date', '<=', now)
        .where('end_date', '>', now)
        .where(db.raw('spent < budget'))
        .orderBy(db.raw('RANDOM()'))
        .limit(limit * 2); // Get extra for filtering

      // Filter by targeting and return top matches
      const matching = sponsored
        .filter((s: any) => {
          const targeting = s.targeting ? JSON.parse(s.targeting) : {};
          return this.matchesTargeting(viewer, targeting);
        })
        .slice(0, limit)
        .map(this.mapDbToSponsoredProfile);

      return matching;
    } catch (error) {
      logger.error('Error getting sponsored profiles:', error);
      return [];
    }
  }

  /**
   * Record sponsored profile impression
   */
  async recordSponsoredImpression(
    sponsoredId: string,
    viewerId: string
  ): Promise<void> {
    await db('sponsored_profiles')
      .where('id', sponsoredId)
      .increment('impressions', 1);

    await db('sponsored_impressions').insert({
      id: uuidv4(),
      sponsored_id: sponsoredId,
      viewer_id: viewerId,
      created_at: new Date(),
    });
  }

  /**
   * Record sponsored profile click
   */
  async recordSponsoredClick(
    sponsoredId: string,
    viewerId: string
  ): Promise<void> {
    const sponsored = await db('sponsored_profiles')
      .where('id', sponsoredId)
      .first();

    if (!sponsored) return;

    // Calculate click cost (simple CPC model)
    const cpc = sponsored.budget / 1000; // $1 per 1000 impressions base

    await db('sponsored_profiles')
      .where('id', sponsoredId)
      .increment('clicks', 1)
      .increment('spent', cpc);

    await db('sponsored_clicks').insert({
      id: uuidv4(),
      sponsored_id: sponsoredId,
      viewer_id: viewerId,
      cost: cpc,
      created_at: new Date(),
    });
  }

  /**
   * Get advertising analytics
   */
  async getAdAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalImpressions: number;
    totalClicks: number;
    ctr: number;
    rewardVideosWatched: number;
    estimatedRevenue: number;
    byPlacement: Record<string, { impressions: number; clicks: number; ctr: number }>;
  }> {
    const impressions = await db('ad_impressions')
      .where('impression_time', '>=', startDate)
      .where('impression_time', '<=', endDate)
      .select(
        db.raw('COUNT(*) as total'),
        db.raw('SUM(CASE WHEN clicked THEN 1 ELSE 0 END) as clicks'),
        'placement_type'
      )
      .groupBy('placement_type');

    const rewardVideos = await db('ad_rewards')
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .count('id as count')
      .first();

    // Aggregate stats
    let totalImpressions = 0;
    let totalClicks = 0;
    const byPlacement: Record<string, any> = {};

    for (const row of impressions) {
      const imp = Number(row.total);
      const clicks = Number(row.clicks);

      totalImpressions += imp;
      totalClicks += clicks;

      byPlacement[row.placement_type] = {
        impressions: imp,
        clicks,
        ctr: imp > 0 ? (clicks / imp) * 100 : 0,
      };
    }

    // Estimate revenue (simplified)
    const estimatedRevenue = totalImpressions * 0.001 + totalClicks * 0.05; // $1 CPM + $0.05 CPC

    return {
      totalImpressions,
      totalClicks,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      rewardVideosWatched: Number(rewardVideos?.count || 0),
      estimatedRevenue,
      byPlacement,
    };
  }

  // Private helper methods

  private matchesTargeting(user: any, rules: AdTargetingRules): boolean {
    if (!user) return true;

    if (rules.minAge || rules.maxAge) {
      const age = this.calculateAge(user.date_of_birth);
      if (rules.minAge && age < rules.minAge) return false;
      if (rules.maxAge && age > rules.maxAge) return false;
    }

    if (rules.genders && rules.genders.length > 0) {
      if (!rules.genders.includes(user.gender)) return false;
    }

    if (rules.subscriptionTiers && rules.subscriptionTiers.length > 0) {
      if (!rules.subscriptionTiers.includes(user.subscription_tier || 'free')) return false;
    }

    return true;
  }

  private calculateAge(dateOfBirth: Date): number {
    if (!dateOfBirth) return 25;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private getSecondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight.getTime() - now.getTime()) / 1000);
  }

  private mapDbToPlacement(db: any): AdPlacement {
    return {
      id: db.id,
      placementType: db.placement_type,
      adUnitId: db.ad_unit_id,
      platform: db.platform,
      isActive: db.is_active,
      priority: db.priority,
      targetingRules: db.targeting_rules ? JSON.parse(db.targeting_rules) : undefined,
    };
  }

  private mapDbToSponsoredProfile(db: any): SponsoredProfile {
    return {
      id: db.id,
      advertiserId: db.advertiser_id,
      profileData: JSON.parse(db.profile_data),
      targeting: db.targeting ? JSON.parse(db.targeting) : {},
      budget: db.budget,
      spent: db.spent,
      impressions: db.impressions,
      clicks: db.clicks,
      startDate: db.start_date,
      endDate: db.end_date,
      status: db.status,
    };
  }
}

export const advertisingService = new AdvertisingService();
