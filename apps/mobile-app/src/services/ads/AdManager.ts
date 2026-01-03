/**
 * Ad Manager
 * Centralized ad state management and business logic for frequency capping,
 * premium user detection, and ad analytics tracking
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  AdState,
  AdEvent,
  UserAdPreferences,
  FrequencyCapConfig,
  IAdManager,
  DEFAULT_FREQUENCY_CAP,
  AD_FREE_TIERS,
  REDUCED_ADS_TIERS,
} from './types';

const AD_STATE_STORAGE_KEY = '@flamoral/ad_state';
const AD_EVENTS_STORAGE_KEY = '@flamoral/ad_events';

class AdManagerClass implements IAdManager {
  private state: AdState = {
    lastInterstitialTime: null,
    interstitialsShownToday: 0,
    interstitialsShownSession: 0,
    actionsThisSession: 0,
    lastRewardedTime: null,
    rewardedViewsToday: 0,
    lastAdDate: '',
    lastPurchaseTime: null,
  };

  private userPreferences: UserAdPreferences | null = null;
  private config: FrequencyCapConfig = DEFAULT_FREQUENCY_CAP;
  private initialized = false;
  private eventQueue: AdEvent[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  /**
   * Initialize the ad manager, loading persisted state
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load persisted state
      const storedState = await AsyncStorage.getItem(AD_STATE_STORAGE_KEY);
      if (storedState) {
        const parsed = JSON.parse(storedState) as AdState;
        this.state = {
          ...this.state,
          ...parsed,
          // Reset session-specific counters
          interstitialsShownSession: 0,
          actionsThisSession: 0,
        };
      }

      // Check if we need to reset daily counters
      const today = this.getTodayDateString();
      if (this.state.lastAdDate !== today) {
        this.resetDailyCounters();
      }

      this.initialized = true;
      console.log('[AdManager] Initialized with state:', this.state);
    } catch (error) {
      console.error('[AdManager] Initialization error:', error);
      this.initialized = true;
    }
  }

  /**
   * Set user preferences for ad targeting and premium status
   */
  setUserPreferences(preferences: UserAdPreferences): void {
    this.userPreferences = preferences;
    console.log('[AdManager] User preferences updated:', preferences);
  }

  /**
   * Update frequency cap configuration
   */
  setFrequencyCapConfig(config: Partial<FrequencyCapConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      interstitial: {
        ...this.config.interstitial,
        ...(config.interstitial || {}),
      },
      rewarded: {
        ...this.config.rewarded,
        ...(config.rewarded || {}),
      },
      banner: {
        ...this.config.banner,
        ...(config.banner || {}),
      },
    };
  }

  /**
   * Check if ads should be shown based on user subscription
   */
  shouldShowAds(): boolean {
    if (!this.userPreferences) {
      return true; // Default to showing ads if preferences not set
    }

    // Premium users are ad-free
    if (this.userPreferences.isPremium) {
      const tier = this.userPreferences.premiumTier;
      if (tier && AD_FREE_TIERS.includes(tier)) {
        return false;
      }
    }

    // Check if user has ad-free period
    if (this.userPreferences.adFreeUntil) {
      if (Date.now() < this.userPreferences.adFreeUntil) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if user should see reduced ads (banners only)
   */
  hasReducedAds(): boolean {
    if (!this.userPreferences) return false;

    const tier = this.userPreferences.premiumTier;
    return tier !== null && REDUCED_ADS_TIERS.includes(tier);
  }

  /**
   * Check if an interstitial ad can be shown
   */
  canShowInterstitial(): boolean {
    if (!this.shouldShowAds()) {
      return false;
    }

    if (this.hasReducedAds()) {
      return false;
    }

    const now = Date.now();
    const { interstitial } = this.config;

    // Check minimum actions before first ad
    if (this.state.actionsThisSession < interstitial.minActionsBeforeFirstAd) {
      console.log('[AdManager] Not enough actions for interstitial');
      return false;
    }

    // Check session cap
    if (this.state.interstitialsShownSession >= interstitial.maxAdsPerSession) {
      console.log('[AdManager] Session cap reached');
      return false;
    }

    // Check daily cap
    if (this.state.interstitialsShownToday >= interstitial.maxAdsPerDay) {
      console.log('[AdManager] Daily cap reached');
      return false;
    }

    // Check time since last interstitial
    if (this.state.lastInterstitialTime) {
      const timeSinceLast = (now - this.state.lastInterstitialTime) / 1000;
      if (timeSinceLast < interstitial.minSecondsBetweenAds) {
        console.log('[AdManager] Time cap not met');
        return false;
      }
    }

    // Check cooldown after purchase
    if (this.state.lastPurchaseTime) {
      const hoursSincePurchase = (now - this.state.lastPurchaseTime) / (1000 * 60 * 60);
      if (hoursSincePurchase < interstitial.cooldownAfterPurchase) {
        console.log('[AdManager] Post-purchase cooldown active');
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a rewarded ad can be shown for a specific reward
   */
  canShowRewarded(rewardId: string): boolean {
    // Rewarded ads are always available even for premium users
    // They can choose to watch for bonus rewards

    const now = Date.now();
    const { rewarded } = this.config;

    // Check daily cap
    if (this.state.rewardedViewsToday >= rewarded.maxViewsPerDay) {
      console.log('[AdManager] Rewarded daily cap reached');
      return false;
    }

    // Check time since last rewarded
    if (this.state.lastRewardedTime) {
      const timeSinceLast = (now - this.state.lastRewardedTime) / 1000;
      if (timeSinceLast < rewarded.cooldownBetweenViews) {
        console.log('[AdManager] Rewarded cooldown active');
        return false;
      }
    }

    return true;
  }

  /**
   * Get seconds until next interstitial can be shown
   */
  getTimeUntilNextInterstitial(): number {
    if (!this.state.lastInterstitialTime) {
      return 0;
    }

    const now = Date.now();
    const timeSinceLast = (now - this.state.lastInterstitialTime) / 1000;
    const remaining = this.config.interstitial.minSecondsBetweenAds - timeSinceLast;

    return Math.max(0, Math.ceil(remaining));
  }

  /**
   * Get seconds until next rewarded ad can be shown
   */
  getTimeUntilNextRewarded(): number {
    if (!this.state.lastRewardedTime) {
      return 0;
    }

    const now = Date.now();
    const timeSinceLast = (now - this.state.lastRewardedTime) / 1000;
    const remaining = this.config.rewarded.cooldownBetweenViews - timeSinceLast;

    return Math.max(0, Math.ceil(remaining));
  }

  /**
   * Record a user action (swipe, message, etc.)
   */
  recordAction(): void {
    this.state.actionsThisSession++;
  }

  /**
   * Record an interstitial ad being shown
   */
  recordInterstitialShown(): void {
    const now = Date.now();
    this.state.lastInterstitialTime = now;
    this.state.interstitialsShownToday++;
    this.state.interstitialsShownSession++;
    this.state.lastAdDate = this.getTodayDateString();
    this.persistState();
  }

  /**
   * Record a rewarded video being viewed
   */
  recordRewardedViewed(): void {
    const now = Date.now();
    this.state.lastRewardedTime = now;
    this.state.rewardedViewsToday++;
    this.state.lastAdDate = this.getTodayDateString();
    this.persistState();
  }

  /**
   * Record a purchase (triggers post-purchase cooldown)
   */
  recordPurchase(): void {
    this.state.lastPurchaseTime = Date.now();
    this.persistState();
  }

  /**
   * Reset daily counters
   */
  resetDailyCounters(): void {
    this.state.interstitialsShownToday = 0;
    this.state.rewardedViewsToday = 0;
    this.state.lastAdDate = this.getTodayDateString();
    this.persistState();
    console.log('[AdManager] Daily counters reset');
  }

  /**
   * Get current ad state
   */
  getAdState(): AdState {
    return { ...this.state };
  }

  /**
   * Track an ad event for analytics
   */
  trackEvent(event: AdEvent): void {
    const enrichedEvent: AdEvent = {
      ...event,
      timestamp: Date.now(),
      userId: this.userPreferences?.userId,
      sessionId: this.sessionId,
    };

    this.eventQueue.push(enrichedEvent);
    console.log('[AdManager] Event tracked:', enrichedEvent);

    // Batch send events when queue reaches threshold
    if (this.eventQueue.length >= 10) {
      this.flushEvents();
    }
  }

  /**
   * Flush queued events to analytics
   */
  async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Store events locally for later sync
      const storedEvents = await AsyncStorage.getItem(AD_EVENTS_STORAGE_KEY);
      const existingEvents = storedEvents ? JSON.parse(storedEvents) : [];
      const allEvents = [...existingEvents, ...eventsToSend];

      // Keep only last 1000 events
      const trimmedEvents = allEvents.slice(-1000);
      await AsyncStorage.setItem(AD_EVENTS_STORAGE_KEY, JSON.stringify(trimmedEvents));

      // TODO: Send to analytics backend
      // await api.post('/analytics/ad-events', { events: eventsToSend });
    } catch (error) {
      console.error('[AdManager] Failed to flush events:', error);
      // Put events back in queue
      this.eventQueue = [...eventsToSend, ...this.eventQueue];
    }
  }

  /**
   * Get analytics summary for ad performance
   */
  async getAnalyticsSummary(): Promise<{
    impressions: number;
    clicks: number;
    ctr: number;
    rewardsEarned: number;
    revenue: number;
  }> {
    try {
      const storedEvents = await AsyncStorage.getItem(AD_EVENTS_STORAGE_KEY);
      const events: AdEvent[] = storedEvents ? JSON.parse(storedEvents) : [];

      const impressions = events.filter(e => e.eventType === 'impression').length;
      const clicks = events.filter(e => e.eventType === 'click').length;
      const rewardsEarned = events.filter(e => e.eventType === 'reward_earned').length;

      return {
        impressions,
        clicks,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        rewardsEarned,
        revenue: 0, // Revenue calculated server-side
      };
    } catch (error) {
      console.error('[AdManager] Failed to get analytics:', error);
      return { impressions: 0, clicks: 0, ctr: 0, rewardsEarned: 0, revenue: 0 };
    }
  }

  /**
   * Persist state to storage
   */
  private async persistState(): Promise<void> {
    try {
      await AsyncStorage.setItem(AD_STATE_STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('[AdManager] Failed to persist state:', error);
    }
  }

  /**
   * Get today's date string for comparison
   */
  private getTodayDateString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Grant temporary ad-free period (e.g., after watching reward video)
   */
  grantAdFreePeriod(durationMinutes: number): void {
    if (this.userPreferences) {
      this.userPreferences.adFreeUntil = Date.now() + durationMinutes * 60 * 1000;
    }
  }

  /**
   * Check if user has consented to personalized ads
   */
  hasTrackingConsent(): boolean {
    return this.userPreferences?.trackingConsent ?? false;
  }

  /**
   * Check if personalized ads are enabled
   */
  hasPersonalizedAds(): boolean {
    return this.userPreferences?.personalizedAds ?? false;
  }

  /**
   * Get remaining rewarded video views for today
   */
  getRemainingRewardedViews(): number {
    return Math.max(0, this.config.rewarded.maxViewsPerDay - this.state.rewardedViewsToday);
  }

  /**
   * Get remaining interstitial ad slots for today
   */
  getRemainingInterstitialsToday(): number {
    return Math.max(0, this.config.interstitial.maxAdsPerDay - this.state.interstitialsShownToday);
  }
}

// Export singleton instance
export const AdManager = new AdManagerClass();
export default AdManager;
