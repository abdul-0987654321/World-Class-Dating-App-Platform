/**
 * Ad Revenue Service
 * Handles ad impressions, clicks, rewards, and analytics
 * Uses database storage for persistence
 */

import { v4 as uuidv4 } from 'uuid';

import db from '../../infrastructure/database/connection';
import logger from '../../utils/logger';
import {
  AdType,
  AdNetwork,
  RewardType,
  AdImpression,
  AdClick,
  RewardFulfillment,
  RewardConfig,
  UserAdState,
  AdPerformanceMetrics,
  RewardAnalytics,
  FrequencyCapConfig,
  RecordImpressionRequest,
  RecordClickRequest,
  ClaimRewardRequest,
  ClaimRewardResponse,
  GetUserAdStateResponse,
} from '../types/ad-revenue.types';

// Default frequency cap configuration
const DEFAULT_FREQUENCY_CAP: FrequencyCapConfig = {
  interstitial: {
    minSecondsBetweenAds: 60,
    maxAdsPerSession: 5,
    maxAdsPerDay: 15,
    minActionsBeforeFirstAd: 3,
    cooldownAfterPurchase: 24,
  },
  rewarded: {
    maxViewsPerDay: 10,
    cooldownBetweenViews: 300,
    resetTime: '00:00',
  },
  banner: {
    refreshIntervalSeconds: 60,
  },
};

// Default reward configurations
const DEFAULT_REWARDS: RewardConfig[] = [
  {
    id: 'coins',
    type: 'coins',
    amount: 10,
    displayName: '10 Coins',
    description: 'Watch a video to earn 10 free coins',
    icon: 'coin',
    maxPerDay: 5,
    cooldownHours: 0,
    enabled: true,
  },
  {
    id: 'super_likes',
    type: 'super_likes',
    amount: 1,
    displayName: 'Free Super Like',
    description: 'Watch a video to get a free Super Like',
    icon: 'star',
    maxPerDay: 3,
    cooldownHours: 4,
    enabled: true,
  },
  {
    id: 'boosts',
    type: 'boosts',
    amount: 1,
    displayName: '30-Minute Boost',
    description: 'Watch a video to boost your profile for 30 minutes',
    icon: 'rocket',
    maxPerDay: 2,
    cooldownHours: 6,
    enabled: true,
  },
  {
    id: 'rewinds',
    type: 'rewinds',
    amount: 1,
    displayName: 'Free Rewind',
    description: 'Watch a video to get a free Rewind',
    icon: 'undo',
    maxPerDay: 3,
    cooldownHours: 0,
    enabled: true,
  },
  {
    id: 'premium_trial',
    type: 'premium_trial',
    amount: 60, // 60 minutes
    displayName: '1-Hour Premium',
    description: 'Watch a video to try Premium features for 1 hour',
    icon: 'crown',
    maxPerDay: 1,
    cooldownHours: 24,
    enabled: true,
  },
];

// Premium tiers that are ad-free
const AD_FREE_TIERS = ['BASIC', 'PLUS', 'PREMIUM', 'PREMIUM_PLUS', 'ELITE'];

class AdRevenueService {
  private frequencyCap: FrequencyCapConfig = DEFAULT_FREQUENCY_CAP;
  private rewardConfigs: RewardConfig[] = DEFAULT_REWARDS;
  private dbInitialized = false;

  constructor() {
    this.initializeFromDb();
  }

  /**
   * Initialize reward configurations from database
   */
  private async initializeFromDb(): Promise<void> {
    try {
      const configs = await db('reward_configurations').where('enabled', true).select('*');

      if (configs.length > 0) {
        this.rewardConfigs = configs.map((c) => ({
          id: c.id,
          type: c.type as RewardType,
          amount: c.amount,
          displayName: c.display_name,
          description: c.description,
          icon: c.icon,
          maxPerDay: c.max_per_day,
          cooldownHours: c.cooldown_hours,
          enabled: c.enabled,
          premiumMultiplier: c.premium_multiplier,
          expiresAt: c.expires_at,
        }));
        logger.info('Loaded reward configurations from database');
      }
      this.dbInitialized = true;
    } catch (error) {
      logger.warn('Could not load reward configs from DB, using defaults', error);
      this.dbInitialized = false;
    }
  }

  /**
   * Check if user should see ads based on subscription
   */
  async shouldShowAds(userId: string, premiumTier?: string): Promise<boolean> {
    if (premiumTier && AD_FREE_TIERS.includes(premiumTier)) {
      return false;
    }

    // Check for temporary ad-free period
    try {
      const userState = await db('user_ad_states').where('user_id', userId).first();

      if (userState?.ad_free_until && new Date(userState.ad_free_until) > new Date()) {
        return false;
      }
    } catch (error) {
      // DB not available, allow ads
    }

    return true;
  }

  /**
   * Get user's current ad state
   */
  async getUserState(userId: string): Promise<UserAdState> {
    const today = this.getTodayDateString();

    try {
      let state = await db('user_ad_states').where('user_id', userId).first();

      if (!state) {
        // Create new state
        state = {
          user_id: userId,
          interstitials_shown_today: 0,
          interstitials_shown_session: 0,
          rewarded_views_today: 0,
          actions_this_session: 0,
          last_reset_date: today,
          created_at: new Date(),
          updated_at: new Date(),
        };

        await db('user_ad_states').insert(state);
      } else if (state.last_reset_date !== today) {
        // Reset daily counters
        await db('user_ad_states').where('user_id', userId).update({
          interstitials_shown_today: 0,
          rewarded_views_today: 0,
          last_reset_date: today,
          updated_at: new Date(),
        });

        state.interstitials_shown_today = 0;
        state.rewarded_views_today = 0;
        state.last_reset_date = today;
      }

      return {
        userId: state.user_id,
        lastInterstitialTime: state.last_interstitial_time
          ? new Date(state.last_interstitial_time)
          : undefined,
        interstitialsShownToday: state.interstitials_shown_today,
        interstitialsShownSession: state.interstitials_shown_session,
        lastRewardedTime: state.last_rewarded_time ? new Date(state.last_rewarded_time) : undefined,
        rewardedViewsToday: state.rewarded_views_today,
        lastPurchaseTime: state.last_purchase_time ? new Date(state.last_purchase_time) : undefined,
        actionsThisSession: state.actions_this_session,
        lastResetDate: state.last_reset_date,
        createdAt: new Date(state.created_at),
        updatedAt: new Date(state.updated_at),
      };
    } catch (error) {
      logger.warn('Error getting user ad state from DB, using defaults', error);
      return {
        userId,
        interstitialsShownToday: 0,
        interstitialsShownSession: 0,
        rewardedViewsToday: 0,
        actionsThisSession: 0,
        lastResetDate: today,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Get full ad state response for client
   */
  async getAdStateResponse(userId: string): Promise<GetUserAdStateResponse> {
    const state = await this.getUserState(userId);
    const { interstitial, rewarded } = this.frequencyCap;

    const now = Date.now();

    // Calculate time until next interstitial
    let timeUntilNextInterstitial = 0;
    if (state.lastInterstitialTime) {
      const timeSinceLast = (now - state.lastInterstitialTime.getTime()) / 1000;
      timeUntilNextInterstitial = Math.max(0, interstitial.minSecondsBetweenAds - timeSinceLast);
    }

    // Calculate time until next rewarded
    let timeUntilNextRewarded = 0;
    if (state.lastRewardedTime) {
      const timeSinceLast = (now - state.lastRewardedTime.getTime()) / 1000;
      timeUntilNextRewarded = Math.max(0, rewarded.cooldownBetweenViews - timeSinceLast);
    }

    // Check if can show interstitial
    const canShowInterstitial =
      state.interstitialsShownToday < interstitial.maxAdsPerDay &&
      state.interstitialsShownSession < interstitial.maxAdsPerSession &&
      state.actionsThisSession >= interstitial.minActionsBeforeFirstAd &&
      timeUntilNextInterstitial === 0 &&
      !this.isInPurchaseCooldown(state);

    // Check if can show rewarded
    const canShowRewarded =
      state.rewardedViewsToday < rewarded.maxViewsPerDay && timeUntilNextRewarded === 0;

    return {
      canShowInterstitial,
      canShowRewarded,
      timeUntilNextInterstitial: Math.ceil(timeUntilNextInterstitial),
      timeUntilNextRewarded: Math.ceil(timeUntilNextRewarded),
      remainingRewardedToday: Math.max(0, rewarded.maxViewsPerDay - state.rewardedViewsToday),
      remainingInterstitialsToday: Math.max(
        0,
        interstitial.maxAdsPerDay - state.interstitialsShownToday
      ),
      state,
    };
  }

  /**
   * Check if user is in post-purchase cooldown
   */
  private isInPurchaseCooldown(state: UserAdState): boolean {
    if (!state.lastPurchaseTime) return false;

    const hoursSincePurchase = (Date.now() - state.lastPurchaseTime.getTime()) / (1000 * 60 * 60);
    return hoursSincePurchase < this.frequencyCap.interstitial.cooldownAfterPurchase;
  }

  /**
   * Record a user action (for frequency capping)
   */
  async recordAction(userId: string): Promise<void> {
    try {
      await this.getUserState(userId); // Ensure state exists
      await db('user_ad_states')
        .where('user_id', userId)
        .increment('actions_this_session', 1)
        .update({ updated_at: new Date() });
    } catch (error) {
      logger.warn('Error recording action', error);
    }
  }

  /**
   * Record a purchase (triggers cooldown)
   */
  async recordPurchase(userId: string): Promise<void> {
    try {
      await this.getUserState(userId); // Ensure state exists
      await db('user_ad_states').where('user_id', userId).update({
        last_purchase_time: new Date(),
        updated_at: new Date(),
      });
    } catch (error) {
      logger.warn('Error recording purchase', error);
    }
  }

  /**
   * Record an ad impression
   */
  async recordImpression(request: RecordImpressionRequest): Promise<AdImpression> {
    const impressionId = uuidv4();
    const impressionTime = new Date();

    try {
      const impression = {
        id: impressionId,
        user_id: request.userId,
        ad_unit_id: `${request.network}_${request.adType}`,
        ad_type: request.adType,
        network: request.network,
        placement: request.placement,
        platform: request.platform,
        impression_time: impressionTime,
        clicked: false,
        device_info: JSON.stringify(request.deviceInfo || {}),
        session_id: request.sessionId,
      };

      await db('ad_impressions').insert(impression);

      // Update user state
      await this.getUserState(request.userId); // Ensure state exists

      if (request.adType === 'interstitial') {
        await db('user_ad_states')
          .where('user_id', request.userId)
          .update({
            last_interstitial_time: new Date(),
            updated_at: new Date(),
          })
          .increment('interstitials_shown_today', 1)
          .increment('interstitials_shown_session', 1);
      } else if (request.adType === 'rewarded') {
        await db('user_ad_states')
          .where('user_id', request.userId)
          .update({
            last_rewarded_time: new Date(),
            updated_at: new Date(),
          })
          .increment('rewarded_views_today', 1);
      }
    } catch (error) {
      logger.warn('Error saving impression to DB', error);
    }

    logger.info('Ad impression recorded', {
      impressionId,
      userId: request.userId,
      adType: request.adType,
      network: request.network,
    });

    return {
      id: impressionId,
      userId: request.userId,
      adUnitId: `${request.network}_${request.adType}`,
      adType: request.adType as AdType,
      network: request.network as AdNetwork,
      placement: request.placement,
      platform: request.platform,
      impressionTime,
      clicked: false,
      deviceInfo: request.deviceInfo,
      sessionId: request.sessionId,
    };
  }

  /**
   * Record an ad click
   */
  async recordClick(request: RecordClickRequest): Promise<AdClick | null> {
    try {
      const impression = await db('ad_impressions').where('id', request.impressionId).first();

      if (!impression) {
        logger.warn('Click recorded for unknown impression', {
          impressionId: request.impressionId,
        });
        return null;
      }

      const clickId = uuidv4();
      const clickTime = new Date();

      const click = {
        id: clickId,
        impression_id: request.impressionId,
        user_id: request.userId,
        ad_type: request.adType,
        click_time: clickTime,
      };

      await db('ad_clicks').insert(click);

      // Update impression
      await db('ad_impressions').where('id', request.impressionId).update({
        clicked: true,
        click_time: clickTime,
      });

      logger.info('Ad click recorded', {
        clickId,
        impressionId: request.impressionId,
        userId: request.userId,
      });

      return {
        id: clickId,
        impressionId: request.impressionId,
        userId: request.userId,
        adType: request.adType as AdType,
        clickTime,
      };
    } catch (error) {
      logger.error('Error recording click', error);
      return null;
    }
  }

  /**
   * Get available rewards for a user
   */
  async getAvailableRewards(userId: string): Promise<{
    rewards: RewardConfig[];
    availability: Map<
      string,
      { available: boolean; remainingToday: number; nextAvailableAt?: Date }
    >;
  }> {
    const state = await this.getUserState(userId);
    const today = this.getTodayDateString();
    const availability = new Map();

    // Get user's reward counts for today from DB
    const countMap = new Map<string, number>();
    try {
      const dailyCounts = await db('user_daily_reward_counts')
        .where('user_id', userId)
        .where('date', today)
        .select('reward_id', 'count');

      dailyCounts.forEach((r) => countMap.set(r.reward_id, r.count));
    } catch (error) {
      logger.warn('Error getting reward counts from DB', error);
    }

    for (const reward of this.rewardConfigs) {
      if (!reward.enabled) continue;

      const claimedToday = countMap.get(reward.id) || 0;
      const remainingToday = Math.max(0, reward.maxPerDay - claimedToday);

      // Check cooldown
      let available =
        remainingToday > 0 && state.rewardedViewsToday < this.frequencyCap.rewarded.maxViewsPerDay;
      let nextAvailableAt: Date | undefined;

      if (state.lastRewardedTime && reward.cooldownHours > 0) {
        const cooldownEnd = new Date(
          state.lastRewardedTime.getTime() + reward.cooldownHours * 60 * 60 * 1000
        );
        if (cooldownEnd > new Date()) {
          available = false;
          nextAvailableAt = cooldownEnd;
        }
      }

      availability.set(reward.id, {
        available,
        remainingToday,
        nextAvailableAt,
      });
    }

    return {
      rewards: this.rewardConfigs.filter((r) => r.enabled),
      availability,
    };
  }

  /**
   * Claim a reward after watching a video ad
   */
  async claimReward(request: ClaimRewardRequest): Promise<ClaimRewardResponse> {
    const rewardConfig = this.rewardConfigs.find((r) => r.id === request.rewardId);
    if (!rewardConfig) {
      return { success: false, error: 'Invalid reward ID' };
    }

    if (!rewardConfig.enabled) {
      return { success: false, error: 'Reward not available' };
    }

    // Verify video was watched (at least 95% completion)
    if (request.videoCompletionPercent < 95) {
      return { success: false, error: 'Video not fully watched' };
    }

    const today = this.getTodayDateString();
    const now = new Date();

    try {
      // Check daily limit
      const dailyCount = await db('user_daily_reward_counts')
        .where('user_id', request.userId)
        .where('reward_id', request.rewardId)
        .where('date', today)
        .first();

      const claimedToday = dailyCount?.count || 0;

      if (claimedToday >= rewardConfig.maxPerDay) {
        return { success: false, error: 'Daily limit reached for this reward' };
      }

      // Create reward fulfillment
      const fulfillmentId = uuidv4();

      const fulfillment = {
        id: fulfillmentId,
        user_id: request.userId,
        reward_id: request.rewardId,
        reward_type: rewardConfig.type,
        amount: rewardConfig.amount,
        transaction_id: request.transactionId,
        impression_id: request.impressionId,
        video_watched: true,
        video_completion_percent: request.videoCompletionPercent,
        earned_at: now,
        claimed_at: now,
        status: 'claimed',
      };

      await db('reward_fulfillments').insert(fulfillment);

      // Update or insert daily reward count
      if (dailyCount) {
        await db('user_daily_reward_counts')
          .where('id', dailyCount.id)
          .update({
            count: dailyCount.count + 1,
            updated_at: now,
          });
      } else {
        await db('user_daily_reward_counts').insert({
          id: uuidv4(),
          user_id: request.userId,
          reward_id: request.rewardId,
          date: today,
          count: 1,
          created_at: now,
          updated_at: now,
        });
      }

      logger.info('Reward claimed', {
        fulfillmentId,
        userId: request.userId,
        rewardType: rewardConfig.type,
        amount: rewardConfig.amount,
      });

      return {
        success: true,
        reward: {
          id: fulfillmentId,
          userId: request.userId,
          rewardId: request.rewardId,
          rewardType: rewardConfig.type as RewardType,
          amount: rewardConfig.amount,
          transactionId: request.transactionId,
          impressionId: request.impressionId,
          videoWatched: true,
          videoCompletionPercent: request.videoCompletionPercent,
          earnedAt: now,
          claimedAt: now,
          status: 'claimed',
        },
        newBalance: {
          coins: 0, // Would come from user service
          superLikes: 0,
          boosts: 0,
          rewinds: 0,
        },
      };
    } catch (error) {
      logger.error('Error claiming reward', error);
      return { success: false, error: 'Failed to claim reward' };
    }
  }

  /**
   * Get ad performance metrics
   */
  async getPerformanceMetrics(
    startDate: Date,
    endDate: Date,
    period: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<AdPerformanceMetrics> {
    try {
      // Get impressions and clicks from database
      const results = await db('ad_impressions')
        .whereBetween('impression_time', [startDate, endDate])
        .select(
          'ad_type',
          'network',
          'placement',
          db.raw('COUNT(*) as impression_count'),
          db.raw('COUNT(CASE WHEN clicked THEN 1 END) as click_count'),
          db.raw('COALESCE(SUM(revenue), 0) as total_revenue')
        )
        .groupBy('ad_type', 'network', 'placement');

      let totalImpressions = 0;
      let totalClicks = 0;
      let totalRevenue = 0;

      const byAdType: AdPerformanceMetrics['byAdType'] = {};
      const byNetwork: AdPerformanceMetrics['byNetwork'] = {};
      const byPlacement: AdPerformanceMetrics['byPlacement'] = {};

      for (const row of results) {
        const impressions = parseInt(row.impression_count, 10);
        const clicks = parseInt(row.click_count, 10);
        const revenue = parseFloat(row.total_revenue) || 0;

        totalImpressions += impressions;
        totalClicks += clicks;
        totalRevenue += revenue;

        // By ad type
        const adType = row.ad_type as AdType;
        if (!byAdType[adType]) {
          byAdType[adType] = { impressions: 0, clicks: 0, ctr: 0, revenue: 0, ecpm: 0 };
        }
        byAdType[adType].impressions += impressions;
        byAdType[adType].clicks += clicks;
        byAdType[adType].revenue += revenue;

        // By network
        const network = row.network as AdNetwork;
        if (!byNetwork[network]) {
          byNetwork[network] = { impressions: 0, clicks: 0, ctr: 0, revenue: 0, ecpm: 0 };
        }
        byNetwork[network].impressions += impressions;
        byNetwork[network].clicks += clicks;
        byNetwork[network].revenue += revenue;

        // By placement
        const placement = row.placement;
        if (!byPlacement[placement]) {
          byPlacement[placement] = { impressions: 0, clicks: 0, ctr: 0, revenue: 0 };
        }
        byPlacement[placement].impressions += impressions;
        byPlacement[placement].clicks += clicks;
        byPlacement[placement].revenue += revenue;
      }

      // Calculate CTR and eCPM for aggregates
      for (const adType of Object.keys(byAdType) as AdType[]) {
        const data = byAdType[adType];
        data.ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
        data.ecpm = data.impressions > 0 ? (data.revenue / data.impressions) * 1000 : 0;
      }

      for (const network of Object.keys(byNetwork) as AdNetwork[]) {
        const data = byNetwork[network];
        data.ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
        data.ecpm = data.impressions > 0 ? (data.revenue / data.impressions) * 1000 : 0;
      }

      for (const placement of Object.keys(byPlacement)) {
        const data = byPlacement[placement];
        data.ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
      }

      const overallCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const overallEcpm = totalImpressions > 0 ? (totalRevenue / totalImpressions) * 1000 : 0;

      return {
        period,
        startDate,
        endDate,
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr: overallCtr,
        revenue: totalRevenue,
        ecpm: overallEcpm,
        fillRate: 100,
        byAdType,
        byNetwork,
        byPlacement,
      };
    } catch (error) {
      logger.error('Error getting performance metrics', error);
      return {
        period,
        startDate,
        endDate,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        revenue: 0,
        ecpm: 0,
        fillRate: 100,
        byAdType: {},
        byNetwork: {},
        byPlacement: {},
      };
    }
  }

  /**
   * Get reward analytics
   */
  async getRewardAnalytics(
    startDate: Date,
    endDate: Date,
    period: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<RewardAnalytics> {
    try {
      const results = await db('reward_fulfillments')
        .whereBetween('earned_at', [startDate, endDate])
        .select(
          'reward_type',
          db.raw('COUNT(*) as total_earned'),
          db.raw("COUNT(CASE WHEN status = 'claimed' THEN 1 END) as total_claimed"),
          db.raw("SUM(CASE WHEN status = 'claimed' THEN amount ELSE 0 END) as total_value"),
          db.raw('AVG(video_completion_percent) as avg_completion')
        )
        .groupBy('reward_type');

      let totalEarned = 0;
      let totalClaimed = 0;
      let totalValue = 0;
      let totalCompletion = 0;

      const byRewardType: RewardAnalytics['byRewardType'] = {};

      for (const row of results) {
        const earned = parseInt(row.total_earned, 10);
        const claimed = parseInt(row.total_claimed, 10);
        const value = parseFloat(row.total_value) || 0;

        totalEarned += earned;
        totalClaimed += claimed;
        totalValue += value;
        totalCompletion += parseFloat(row.avg_completion) || 0;

        byRewardType[row.reward_type as RewardType] = {
          earned,
          claimed,
          value,
        };
      }

      const completionRate = results.length > 0 ? totalCompletion / results.length : 0;

      // Get unique users across all reward types
      const uniqueUsersResult = await db('reward_fulfillments')
        .whereBetween('earned_at', [startDate, endDate])
        .countDistinct('user_id as count')
        .first();

      const uniqueUsers = parseInt(uniqueUsersResult?.count as string, 10) || 0;

      return {
        period,
        startDate,
        endDate,
        totalRewardsEarned: totalEarned,
        totalRewardsClaimed: totalClaimed,
        rewardValue: totalValue,
        uniqueUsers,
        videoCompletionRate: completionRate,
        byRewardType,
      };
    } catch (error) {
      logger.error('Error getting reward analytics', error);
      return {
        period,
        startDate,
        endDate,
        totalRewardsEarned: 0,
        totalRewardsClaimed: 0,
        rewardValue: 0,
        uniqueUsers: 0,
        videoCompletionRate: 0,
        byRewardType: {},
      };
    }
  }

  /**
   * Get today's date string
   */
  private getTodayDateString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * Get reward configurations
   */
  getRewardConfigs(): RewardConfig[] {
    return this.rewardConfigs;
  }

  /**
   * Get frequency cap configuration
   */
  getFrequencyCapConfig(): FrequencyCapConfig {
    return this.frequencyCap;
  }

  /**
   * Update frequency cap configuration
   */
  updateFrequencyCapConfig(config: Partial<FrequencyCapConfig>): void {
    this.frequencyCap = {
      ...this.frequencyCap,
      ...config,
      interstitial: {
        ...this.frequencyCap.interstitial,
        ...(config.interstitial || {}),
      },
      rewarded: {
        ...this.frequencyCap.rewarded,
        ...(config.rewarded || {}),
      },
      banner: {
        ...this.frequencyCap.banner,
        ...(config.banner || {}),
      },
    };
  }

  /**
   * Grant temporary ad-free period to user
   */
  async grantAdFreePeriod(userId: string, hours: number): Promise<void> {
    try {
      await this.getUserState(userId); // Ensure state exists
      const adFreeUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

      await db('user_ad_states').where('user_id', userId).update({
        ad_free_until: adFreeUntil,
        updated_at: new Date(),
      });

      logger.info(`Granted ${hours} hours ad-free to user ${userId}`);
    } catch (error) {
      logger.error('Error granting ad-free period', error);
    }
  }

  /**
   * Reset session counters for user (call on new session)
   */
  async resetSessionCounters(userId: string): Promise<void> {
    try {
      await db('user_ad_states').where('user_id', userId).update({
        interstitials_shown_session: 0,
        actions_this_session: 0,
        updated_at: new Date(),
      });
    } catch (error) {
      logger.warn('Error resetting session counters', error);
    }
  }
}

export const adRevenueService = new AdRevenueService();
export default adRevenueService;
