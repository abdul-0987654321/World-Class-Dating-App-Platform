/**
 * Ad Analytics Service
 * Comprehensive analytics and tracking for ad performance
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  AdEvent,
  AdEventType,
  AdType,
  AdNetwork,
  RewardEarned,
} from './types';

const AD_ANALYTICS_STORAGE_KEY = '@flamoral/ad_analytics';
const AD_REVENUE_STORAGE_KEY = '@flamoral/ad_revenue';
const SYNC_BATCH_SIZE = 50;
const SYNC_INTERVAL_MS = 60000; // 1 minute

interface AdAnalyticsSummary {
  date: string;
  impressions: {
    banner: number;
    interstitial: number;
    rewarded: number;
    total: number;
  };
  clicks: {
    banner: number;
    interstitial: number;
    rewarded: number;
    total: number;
  };
  ctr: {
    banner: number;
    interstitial: number;
    rewarded: number;
    overall: number;
  };
  rewards: {
    total: number;
    byType: Record<string, number>;
    totalValue: number;
  };
  errors: {
    loadFailures: number;
    showFailures: number;
    networkErrors: number;
  };
  sessions: {
    adsPerSession: number;
    avgTimeToFirstAd: number;
    completionRate: number;
  };
}

interface AdRevenueEvent {
  timestamp: number;
  adType: AdType;
  network: AdNetwork;
  estimatedRevenue: number;
  currency: string;
  impressionId: string;
}

class AdAnalyticsService {
  private eventBuffer: AdEvent[] = [];
  private revenueBuffer: AdRevenueEvent[] = [];
  private sessionStartTime: number = Date.now();
  private firstAdTime: number | null = null;
  private syncIntervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.startAutoSync();
  }

  /**
   * Start automatic sync interval
   */
  private startAutoSync(): void {
    this.syncIntervalId = setInterval(() => {
      this.syncToBackend();
    }, SYNC_INTERVAL_MS);
  }

  /**
   * Stop auto sync
   */
  stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  /**
   * Track an ad event
   */
  trackEvent(event: Omit<AdEvent, 'timestamp'>): void {
    const fullEvent: AdEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.eventBuffer.push(fullEvent);

    // Track first ad time for session metrics
    if (event.eventType === 'impression' && !this.firstAdTime) {
      this.firstAdTime = Date.now();
    }

    // Auto-flush if buffer is large
    if (this.eventBuffer.length >= SYNC_BATCH_SIZE) {
      this.flushEvents();
    }
  }

  /**
   * Track ad impression
   */
  trackImpression(adType: AdType, network: AdNetwork, placement?: string): void {
    this.trackEvent({
      eventType: 'impression',
      adType,
      network,
      placement,
    });
  }

  /**
   * Track ad click
   */
  trackClick(adType: AdType, network: AdNetwork, placement?: string): void {
    this.trackEvent({
      eventType: 'click',
      adType,
      network,
      placement,
    });
  }

  /**
   * Track ad load failure
   */
  trackLoadFailure(adType: AdType, network: AdNetwork, error: string): void {
    this.trackEvent({
      eventType: 'failed',
      adType,
      network,
      metadata: { error, stage: 'load' },
    });
  }

  /**
   * Track ad show failure
   */
  trackShowFailure(adType: AdType, network: AdNetwork, error: string): void {
    this.trackEvent({
      eventType: 'failed',
      adType,
      network,
      metadata: { error, stage: 'show' },
    });
  }

  /**
   * Track reward earned
   */
  trackRewardEarned(reward: RewardEarned, network: AdNetwork): void {
    this.trackEvent({
      eventType: 'reward_earned',
      adType: 'rewarded',
      network,
      metadata: {
        rewardType: reward.type,
        rewardAmount: reward.amount,
        transactionId: reward.transactionId,
      },
    });
  }

  /**
   * Track ad skipped (for interstitials)
   */
  trackSkipped(adType: AdType, network: AdNetwork, watchTime: number): void {
    this.trackEvent({
      eventType: 'skipped',
      adType,
      network,
      metadata: { watchTime },
    });
  }

  /**
   * Track estimated revenue (from ad network callbacks)
   */
  trackRevenue(
    adType: AdType,
    network: AdNetwork,
    estimatedRevenue: number,
    currency: string = 'USD'
  ): void {
    const revenueEvent: AdRevenueEvent = {
      timestamp: Date.now(),
      adType,
      network,
      estimatedRevenue,
      currency,
      impressionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    this.revenueBuffer.push(revenueEvent);
  }

  /**
   * Flush events to local storage
   */
  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const eventsToStore = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      const stored = await AsyncStorage.getItem(AD_ANALYTICS_STORAGE_KEY);
      const existingEvents: AdEvent[] = stored ? JSON.parse(stored) : [];

      const allEvents = [...existingEvents, ...eventsToStore];
      // Keep only last 1000 events
      const trimmedEvents = allEvents.slice(-1000);

      await AsyncStorage.setItem(AD_ANALYTICS_STORAGE_KEY, JSON.stringify(trimmedEvents));
    } catch (error) {
      console.error('[AdAnalytics] Failed to flush events:', error);
      // Put events back in buffer
      this.eventBuffer = [...eventsToStore, ...this.eventBuffer];
    }
  }

  /**
   * Sync events to backend
   */
  async syncToBackend(): Promise<void> {
    await this.flushEvents();

    try {
      const stored = await AsyncStorage.getItem(AD_ANALYTICS_STORAGE_KEY);
      const events: AdEvent[] = stored ? JSON.parse(stored) : [];

      if (events.length === 0) return;

      // Send to backend API
      const response = await fetch('/api/v1/analytics/ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // In production, add auth token from auth context
          // 'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          events,
          platform: Platform.OS,
          syncedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        // Clear synced events from local storage
        await AsyncStorage.removeItem(AD_ANALYTICS_STORAGE_KEY);
        console.log('[AdAnalytics] Successfully synced', events.length, 'events to backend');
      } else {
        console.warn('[AdAnalytics] Backend returned error, keeping events locally');
      }
    } catch (error) {
      console.error('[AdAnalytics] Backend sync failed:', error);
    }
  }

  /**
   * Get analytics summary for a date range
   */
  async getSummary(startDate?: Date, endDate?: Date): Promise<AdAnalyticsSummary> {
    try {
      const stored = await AsyncStorage.getItem(AD_ANALYTICS_STORAGE_KEY);
      const allEvents: AdEvent[] = stored ? JSON.parse(stored) : [];

      // Filter by date range
      let events = allEvents;
      if (startDate) {
        events = events.filter(e => e.timestamp >= startDate.getTime());
      }
      if (endDate) {
        events = events.filter(e => e.timestamp <= endDate.getTime());
      }

      // Calculate impressions
      const impressions = {
        banner: events.filter(e => e.eventType === 'impression' && e.adType === 'banner').length,
        interstitial: events.filter(e => e.eventType === 'impression' && e.adType === 'interstitial').length,
        rewarded: events.filter(e => e.eventType === 'impression' && e.adType === 'rewarded').length,
        total: 0,
      };
      impressions.total = impressions.banner + impressions.interstitial + impressions.rewarded;

      // Calculate clicks
      const clicks = {
        banner: events.filter(e => e.eventType === 'click' && e.adType === 'banner').length,
        interstitial: events.filter(e => e.eventType === 'click' && e.adType === 'interstitial').length,
        rewarded: events.filter(e => e.eventType === 'click' && e.adType === 'rewarded').length,
        total: 0,
      };
      clicks.total = clicks.banner + clicks.interstitial + clicks.rewarded;

      // Calculate CTR
      const ctr = {
        banner: impressions.banner > 0 ? (clicks.banner / impressions.banner) * 100 : 0,
        interstitial: impressions.interstitial > 0 ? (clicks.interstitial / impressions.interstitial) * 100 : 0,
        rewarded: impressions.rewarded > 0 ? (clicks.rewarded / impressions.rewarded) * 100 : 0,
        overall: impressions.total > 0 ? (clicks.total / impressions.total) * 100 : 0,
      };

      // Calculate rewards
      const rewardEvents = events.filter(e => e.eventType === 'reward_earned');
      const rewardsByType: Record<string, number> = {};
      let totalRewardValue = 0;

      rewardEvents.forEach(e => {
        const type = e.metadata?.rewardType || 'unknown';
        const amount = e.metadata?.rewardAmount || 0;
        rewardsByType[type] = (rewardsByType[type] || 0) + amount;
        totalRewardValue += amount;
      });

      // Calculate errors
      const errorEvents = events.filter(e => e.eventType === 'failed');
      const errors = {
        loadFailures: errorEvents.filter(e => e.metadata?.stage === 'load').length,
        showFailures: errorEvents.filter(e => e.metadata?.stage === 'show').length,
        networkErrors: errorEvents.filter(e => e.metadata?.error?.includes('network')).length,
      };

      // Session metrics
      const timeToFirstAd = this.firstAdTime
        ? (this.firstAdTime - this.sessionStartTime) / 1000
        : 0;

      const rewardedImpressions = impressions.rewarded;
      const rewardsEarned = rewardEvents.length;
      const completionRate = rewardedImpressions > 0
        ? (rewardsEarned / rewardedImpressions) * 100
        : 0;

      return {
        date: new Date().toISOString().split('T')[0],
        impressions,
        clicks,
        ctr,
        rewards: {
          total: rewardEvents.length,
          byType: rewardsByType,
          totalValue: totalRewardValue,
        },
        errors,
        sessions: {
          adsPerSession: impressions.total,
          avgTimeToFirstAd: timeToFirstAd,
          completionRate,
        },
      };
    } catch (error) {
      console.error('[AdAnalytics] Failed to get summary:', error);
      throw error;
    }
  }

  /**
   * Get today's analytics summary
   */
  async getTodaySummary(): Promise<AdAnalyticsSummary> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return this.getSummary(startOfDay);
  }

  /**
   * Get revenue summary
   */
  async getRevenueSummary(): Promise<{
    total: number;
    byNetwork: Record<string, number>;
    byAdType: Record<string, number>;
    currency: string;
  }> {
    try {
      const stored = await AsyncStorage.getItem(AD_REVENUE_STORAGE_KEY);
      const revenueEvents: AdRevenueEvent[] = stored ? JSON.parse(stored) : [];

      let total = 0;
      const byNetwork: Record<string, number> = {};
      const byAdType: Record<string, number> = {};

      revenueEvents.forEach(e => {
        total += e.estimatedRevenue;
        byNetwork[e.network] = (byNetwork[e.network] || 0) + e.estimatedRevenue;
        byAdType[e.adType] = (byAdType[e.adType] || 0) + e.estimatedRevenue;
      });

      return {
        total,
        byNetwork,
        byAdType,
        currency: 'USD',
      };
    } catch (error) {
      console.error('[AdAnalytics] Failed to get revenue summary:', error);
      return { total: 0, byNetwork: {}, byAdType: {}, currency: 'USD' };
    }
  }

  /**
   * Clear all analytics data
   */
  async clearAnalytics(): Promise<void> {
    this.eventBuffer = [];
    this.revenueBuffer = [];
    await AsyncStorage.multiRemove([
      AD_ANALYTICS_STORAGE_KEY,
      AD_REVENUE_STORAGE_KEY,
    ]);
  }

  /**
   * Reset session metrics
   */
  resetSession(): void {
    this.sessionStartTime = Date.now();
    this.firstAdTime = null;
  }

  /**
   * Export analytics data for debugging
   */
  async exportData(): Promise<{
    events: AdEvent[];
    revenue: AdRevenueEvent[];
    summary: AdAnalyticsSummary;
  }> {
    const eventsStored = await AsyncStorage.getItem(AD_ANALYTICS_STORAGE_KEY);
    const revenueStored = await AsyncStorage.getItem(AD_REVENUE_STORAGE_KEY);

    return {
      events: eventsStored ? JSON.parse(eventsStored) : [],
      revenue: revenueStored ? JSON.parse(revenueStored) : [],
      summary: await this.getTodaySummary(),
    };
  }
}

// Export singleton instance
export const AdAnalytics = new AdAnalyticsService();
export default AdAnalytics;
