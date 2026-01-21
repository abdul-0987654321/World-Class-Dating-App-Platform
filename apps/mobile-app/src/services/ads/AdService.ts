/**
 * Ad Service
 * Handles ad network integration with Google AdMob and Facebook Audience Network
 * Manages loading, showing, and error handling for all ad types
 */

import { Platform } from 'react-native';
import {
  AdConfig,
  AdType,
  AdNetwork,
  BannerPlacement,
  AdTargeting,
  IAdService,
  RewardEarned,
  AvailableReward,
  RewardType,
  DEFAULT_AD_CONFIG,
  DEFAULT_REWARDS,
} from './types';
import AdManager from './AdManager';

// AdMob imports (react-native-google-mobile-ads)
import mobileAds, {
  InterstitialAd,
  RewardedAd,
  TestIds,
  AdEventType,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';

// Facebook Audience Network imports (react-native-fbads)
// import { InterstitialAdManager, RewardedVideoAdManager } from 'react-native-fbads';

class AdServiceClass implements IAdService {
  private config: AdConfig = DEFAULT_AD_CONFIG;
  private targeting: AdTargeting = {};
  private initialized = false;

  // Cached ad instances
  private interstitialAd: InterstitialAd | null = null;
  private rewardedAd: RewardedAd | null = null;

  // Loading states
  private isLoadingInterstitial = false;
  private isLoadingRewarded = false;

  // Error tracking
  private lastError: Error | null = null;

  /**
   * Initialize the ad SDK
   */
  async initialize(customConfig?: Partial<AdConfig>): Promise<void> {
    if (this.initialized) return;

    try {
      // Merge custom config
      if (customConfig) {
        this.config = { ...this.config, ...customConfig };
      }

      // Initialize AdMob
      await mobileAds().initialize();
      console.log('[AdService] AdMob initialized');

      // Configure request configuration
      await mobileAds().setRequestConfiguration({
        // Request non-personalized ads if user hasn't consented
        maxAdContentRating: 'T', // Teen rating for dating app
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        testDeviceIdentifiers: this.config.testMode ? ['EMULATOR'] : [],
      });

      // Initialize Facebook Audience Network if configured
      if (this.config.networks.includes('facebook') && this.config.facebookAppId) {
        // await AdSettings.setLogLevel('none');
        // await AdSettings.addTestDevice('EMULATOR');
        console.log('[AdService] Facebook Ads initialized');
      }

      // Initialize AdManager
      await AdManager.initialize();

      this.initialized = true;
      console.log('[AdService] Fully initialized');

      // Pre-load ads
      this.preloadAds();
    } catch (error) {
      console.error('[AdService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Pre-load interstitial and rewarded ads
   */
  private async preloadAds(): Promise<void> {
    if (AdManager.shouldShowAds()) {
      this.loadInterstitialAd();
    }
    // Always preload rewarded ads (available even for premium users)
    this.loadRewardedAd();
  }

  /**
   * Get the appropriate ad unit ID based on platform and test mode
   */
  private getAdUnitId(adType: AdType): string {
    const platform = Platform.OS as 'ios' | 'android';

    if (this.config.testMode) {
      switch (adType) {
        case 'banner':
          return TestIds.BANNER;
        case 'interstitial':
          return TestIds.INTERSTITIAL;
        case 'rewarded':
          return TestIds.REWARDED;
      }
    }

    return this.config.unitIds[platform][adType];
  }

  /**
   * Set targeting parameters for personalized ads
   */
  setTargeting(targeting: AdTargeting): void {
    this.targeting = targeting;
  }

  /**
   * Enable or disable test mode
   */
  setTestMode(enabled: boolean): void {
    this.config.testMode = enabled;
    console.log(`[AdService] Test mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Load a banner ad (banners load automatically in component)
   */
  async loadBannerAd(placement: BannerPlacement): Promise<void> {
    // Banner ads are loaded in the BannerAd component
    // This method is for manual control if needed
    console.log(`[AdService] Banner ad requested for placement: ${placement}`);
  }

  /**
   * Load an interstitial ad
   */
  async loadInterstitialAd(): Promise<boolean> {
    if (this.isLoadingInterstitial) {
      console.log('[AdService] Interstitial already loading');
      return false;
    }

    if (this.interstitialAd?.loaded) {
      console.log('[AdService] Interstitial already loaded');
      return true;
    }

    this.isLoadingInterstitial = true;

    try {
      const adUnitId = this.getAdUnitId('interstitial');
      const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: !AdManager.hasPersonalizedAds(),
        keywords: this.targeting.interests,
      });

      // Set up event listeners
      const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
        console.log('[AdService] Interstitial loaded');
        this.isLoadingInterstitial = false;
        AdManager.trackEvent({
          eventType: 'loaded',
          adType: 'interstitial',
          network: 'admob',
          timestamp: Date.now(),
        });
      });

      const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
        console.error('[AdService] Interstitial error:', error);
        this.isLoadingInterstitial = false;
        this.lastError = new Error(error.message);
        AdManager.trackEvent({
          eventType: 'failed',
          adType: 'interstitial',
          network: 'admob',
          timestamp: Date.now(),
          metadata: { error: error.message },
        });
      });

      const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[AdService] Interstitial closed');
        // Clean up and preload next ad
        unsubscribeLoaded();
        unsubscribeError();
        unsubscribeClosed();
        this.interstitialAd = null;
        this.loadInterstitialAd(); // Preload next
      });

      interstitial.load();
      this.interstitialAd = interstitial;

      return true;
    } catch (error) {
      console.error('[AdService] Failed to load interstitial:', error);
      this.isLoadingInterstitial = false;
      this.lastError = error as Error;
      return false;
    }
  }

  /**
   * Show an interstitial ad
   */
  async showInterstitialAd(): Promise<boolean> {
    if (!AdManager.canShowInterstitial()) {
      console.log('[AdService] Cannot show interstitial (frequency cap)');
      return false;
    }

    if (!this.interstitialAd?.loaded) {
      console.log('[AdService] Interstitial not loaded');
      return false;
    }

    try {
      await this.interstitialAd.show();
      AdManager.recordInterstitialShown();
      AdManager.trackEvent({
        eventType: 'impression',
        adType: 'interstitial',
        network: 'admob',
        timestamp: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('[AdService] Failed to show interstitial:', error);
      this.lastError = error as Error;
      return false;
    }
  }

  /**
   * Load a rewarded ad
   */
  async loadRewardedAd(): Promise<boolean> {
    if (this.isLoadingRewarded) {
      console.log('[AdService] Rewarded already loading');
      return false;
    }

    if (this.rewardedAd?.loaded) {
      console.log('[AdService] Rewarded already loaded');
      return true;
    }

    this.isLoadingRewarded = true;

    try {
      const adUnitId = this.getAdUnitId('rewarded');
      const rewarded = RewardedAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: !AdManager.hasPersonalizedAds(),
        keywords: this.targeting.interests,
      });

      // Set up event listeners
      const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('[AdService] Rewarded loaded');
        this.isLoadingRewarded = false;
        AdManager.trackEvent({
          eventType: 'loaded',
          adType: 'rewarded',
          network: 'admob',
          timestamp: Date.now(),
        });
      });

      const unsubscribeError = rewarded.addAdEventListener(AdEventType.ERROR, (error) => {
        console.error('[AdService] Rewarded error:', error);
        this.isLoadingRewarded = false;
        this.lastError = new Error(error.message);
        AdManager.trackEvent({
          eventType: 'failed',
          adType: 'rewarded',
          network: 'admob',
          timestamp: Date.now(),
          metadata: { error: error.message },
        });
      });

      rewarded.load();
      this.rewardedAd = rewarded;

      return true;
    } catch (error) {
      console.error('[AdService] Failed to load rewarded:', error);
      this.isLoadingRewarded = false;
      this.lastError = error as Error;
      return false;
    }
  }

  /**
   * Show a rewarded ad and return the earned reward
   */
  async showRewardedAd(rewardId: string): Promise<RewardEarned | null> {
    if (!AdManager.canShowRewarded(rewardId)) {
      console.log('[AdService] Cannot show rewarded (frequency cap)');
      return null;
    }

    if (!this.rewardedAd?.loaded) {
      console.log('[AdService] Rewarded not loaded');
      // Try to load
      await this.loadRewardedAd();
      // Wait a bit for ad to load
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (!this.rewardedAd?.loaded) {
        return null;
      }
    }

    return new Promise((resolve) => {
      let earnedReward: RewardEarned | null = null;

      const unsubscribeEarned = this.rewardedAd!.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          console.log('[AdService] Reward earned:', reward);

          // Find the reward configuration
          const rewardConfig = DEFAULT_REWARDS.find((r) => r.type === (rewardId as RewardType));

          earnedReward = {
            rewardId,
            type: rewardId as RewardType,
            amount: rewardConfig?.amount || reward.amount,
            transactionId: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            earnedAt: Date.now(),
          };

          AdManager.recordRewardedViewed();
          AdManager.trackEvent({
            eventType: 'reward_earned',
            adType: 'rewarded',
            network: 'admob',
            timestamp: Date.now(),
            metadata: { reward: earnedReward },
          });
        }
      );

      const unsubscribeClosed = this.rewardedAd!.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[AdService] Rewarded closed');
        unsubscribeEarned();
        unsubscribeClosed();
        this.rewardedAd = null;
        this.loadRewardedAd(); // Preload next
        resolve(earnedReward);
      });

      // Show the ad
      this.rewardedAd!.show().catch((error) => {
        console.error('[AdService] Failed to show rewarded:', error);
        unsubscribeEarned();
        unsubscribeClosed();
        resolve(null);
      });

      AdManager.trackEvent({
        eventType: 'impression',
        adType: 'rewarded',
        network: 'admob',
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Claim a reward (call backend to credit user account)
   */
  async claimReward(rewardId: string, transactionId: string): Promise<boolean> {
    try {
      // Call backend API to credit reward
      const response = await fetch('/api/v1/rewards/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // In production, add auth token from auth context
          // 'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          rewardId,
          transactionId,
          platform: Platform.OS,
          claimedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to claim reward');
      }

      const result = await response.json();
      console.log(`[AdService] Reward credited: ${rewardId}, amount: ${result.amount}`);
      return true;
    } catch (error) {
      console.error('[AdService] Failed to claim reward:', error);
      return false;
    }
  }

  /**
   * Get available rewards for reward video ads
   */
  async getAvailableRewards(): Promise<AvailableReward[]> {
    const remainingViews = AdManager.getRemainingRewardedViews();
    const timeUntilNext = AdManager.getTimeUntilNextRewarded();

    return DEFAULT_REWARDS.map((config) => ({
      id: config.type,
      config,
      available: remainingViews > 0 && timeUntilNext === 0,
      nextAvailableAt: timeUntilNext > 0 ? Date.now() + timeUntilNext * 1000 : undefined,
      viewsRemainingToday: remainingViews,
    }));
  }

  /**
   * Check if interstitial is loaded
   */
  isInterstitialLoaded(): boolean {
    return this.interstitialAd?.loaded ?? false;
  }

  /**
   * Check if rewarded is loaded
   */
  isRewardedLoaded(): boolean {
    return this.rewardedAd?.loaded ?? false;
  }

  /**
   * Get the last error
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Clear the last error
   */
  clearLastError(): void {
    this.lastError = null;
  }
}

// Export singleton instance
export const AdService = new AdServiceClass();
export default AdService;
