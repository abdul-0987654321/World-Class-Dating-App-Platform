/**
 * Ad Service for Web App
 * Handles ad configuration, impressions, and rewards for the web platform
 */

// Ad Types
export type AdType = 'banner' | 'interstitial' | 'rewarded';
export type AdNetwork = 'admob' | 'facebook' | 'adsense' | 'custom';
export type RewardType = 'coins' | 'super_likes' | 'boosts' | 'rewinds' | 'premium_trial';

// Interfaces
export interface AdConfig {
  enabled: boolean;
  testMode: boolean;
  frequencyCap: FrequencyCapConfig;
  rewards: RewardConfig[];
  premiumTiersAdFree: string[];
}

export interface FrequencyCapConfig {
  interstitial: {
    minSecondsBetweenAds: number;
    maxAdsPerSession: number;
    maxAdsPerDay: number;
    minActionsBeforeFirstAd: number;
    cooldownAfterPurchase: number;
  };
  rewarded: {
    maxViewsPerDay: number;
    cooldownBetweenViews: number;
    resetTime: string;
  };
  banner: {
    refreshIntervalSeconds: number;
  };
}

export interface RewardConfig {
  id: string;
  type: RewardType;
  amount: number;
  displayName: string;
  description: string;
  icon: string;
  maxPerDay: number;
  cooldownHours: number;
  enabled: boolean;
}

export interface UserAdState {
  canShowInterstitial: boolean;
  canShowRewarded: boolean;
  timeUntilNextInterstitial: number;
  timeUntilNextRewarded: number;
  remainingRewardedToday: number;
  remainingInterstitialsToday: number;
}

export interface RewardAvailability {
  available: boolean;
  remainingToday: number;
  nextAvailableAt?: string;
}

export interface RewardFulfillment {
  id: string;
  rewardType: RewardType;
  amount: number;
  transactionId: string;
  earnedAt: string;
  status: string;
}

export interface ClaimRewardResponse {
  success: boolean;
  reward?: RewardFulfillment;
  newBalance?: {
    coins: number;
    superLikes: number;
    boosts: number;
    rewinds: number;
  };
  error?: string;
}

// Default rewards for mock mode
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
];

class AdService {
  private isMock = !import.meta.env.VITE_API_URL;
  private baseUrl = '/api/ads';

  // Local state for mock mode
  private mockState = {
    interstitialsShownToday: 0,
    rewardedViewsToday: 0,
    actionsThisSession: 0,
    lastInterstitialTime: null as number | null,
    lastRewardedTime: null as number | null,
    rewardCounts: new Map<string, number>(),
  };

  /**
   * Get ad configuration
   */
  async getConfig(): Promise<AdConfig> {
    if (this.isMock) {
      return {
        enabled: true,
        testMode: true,
        frequencyCap: {
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
        },
        rewards: DEFAULT_REWARDS,
        premiumTiersAdFree: ['BASIC', 'PLUS', 'PREMIUM', 'PREMIUM_PLUS', 'ELITE'],
      };
    }

    const response = await fetch(`${this.baseUrl}/config`, {
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch ad config');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get user's ad state
   */
  async getUserAdState(): Promise<UserAdState> {
    if (this.isMock) {
      const now = Date.now();
      const { interstitial, rewarded } = (await this.getConfig()).frequencyCap;

      let timeUntilNextInterstitial = 0;
      if (this.mockState.lastInterstitialTime) {
        const timeSinceLast = (now - this.mockState.lastInterstitialTime) / 1000;
        timeUntilNextInterstitial = Math.max(0, interstitial.minSecondsBetweenAds - timeSinceLast);
      }

      let timeUntilNextRewarded = 0;
      if (this.mockState.lastRewardedTime) {
        const timeSinceLast = (now - this.mockState.lastRewardedTime) / 1000;
        timeUntilNextRewarded = Math.max(0, rewarded.cooldownBetweenViews - timeSinceLast);
      }

      const canShowInterstitial =
        this.mockState.interstitialsShownToday < interstitial.maxAdsPerDay &&
        this.mockState.actionsThisSession >= interstitial.minActionsBeforeFirstAd &&
        timeUntilNextInterstitial === 0;

      const canShowRewarded =
        this.mockState.rewardedViewsToday < rewarded.maxViewsPerDay &&
        timeUntilNextRewarded === 0;

      return {
        canShowInterstitial,
        canShowRewarded,
        timeUntilNextInterstitial: Math.ceil(timeUntilNextInterstitial),
        timeUntilNextRewarded: Math.ceil(timeUntilNextRewarded),
        remainingRewardedToday: Math.max(0, rewarded.maxViewsPerDay - this.mockState.rewardedViewsToday),
        remainingInterstitialsToday: Math.max(0, interstitial.maxAdsPerDay - this.mockState.interstitialsShownToday),
      };
    }

    const response = await fetch(`${this.baseUrl}/state`, {
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch ad state');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Check if user should see ads based on subscription
   */
  async shouldShowAds(): Promise<boolean> {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const tier = user.premium_tier?.toUpperCase();
        const config = await this.getConfig();

        if (tier && config.premiumTiersAdFree.includes(tier)) {
          return false;
        }
      }
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Record a user action
   */
  async recordAction(): Promise<void> {
    if (this.isMock) {
      this.mockState.actionsThisSession++;
      return;
    }

    await fetch(`${this.baseUrl}/action`, {
      method: 'POST',
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Record an ad impression
   */
  async recordImpression(adType: AdType, network: AdNetwork, placement: string): Promise<string | null> {
    if (this.isMock) {
      const impressionId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      if (adType === 'interstitial') {
        this.mockState.lastInterstitialTime = Date.now();
        this.mockState.interstitialsShownToday++;
      } else if (adType === 'rewarded') {
        this.mockState.lastRewardedTime = Date.now();
        this.mockState.rewardedViewsToday++;
      }

      return impressionId;
    }

    const response = await fetch(`${this.baseUrl}/impression`, {
      method: 'POST',
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        adType,
        network,
        placement,
        platform: 'web',
        sessionId: this.getSessionId(),
        deviceInfo: this.getDeviceInfo(),
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data.impressionId;
  }

  /**
   * Record an ad click
   */
  async recordClick(impressionId: string, adType: AdType): Promise<void> {
    if (this.isMock) {
      console.log('[AdService] Click recorded:', impressionId);
      return;
    }

    await fetch(`${this.baseUrl}/click`, {
      method: 'POST',
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ impressionId, adType }),
    });
  }

  /**
   * Get available rewards for video ads
   */
  async getAvailableRewards(): Promise<{
    rewards: RewardConfig[];
    availability: Record<string, RewardAvailability>;
  }> {
    if (this.isMock) {
      const state = await this.getUserAdState();
      const availability: Record<string, RewardAvailability> = {};

      for (const reward of DEFAULT_REWARDS) {
        const claimedToday = this.mockState.rewardCounts.get(reward.id) || 0;
        const remainingToday = Math.max(0, reward.maxPerDay - claimedToday);

        availability[reward.id] = {
          available: remainingToday > 0 && state.canShowRewarded,
          remainingToday,
        };
      }

      return { rewards: DEFAULT_REWARDS, availability };
    }

    const response = await fetch(`${this.baseUrl}/rewards`, {
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch rewards');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Claim a reward after watching video ad
   */
  async claimReward(
    rewardId: string,
    impressionId: string,
    videoCompletionPercent: number = 100
  ): Promise<ClaimRewardResponse> {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (this.isMock) {
      const reward = DEFAULT_REWARDS.find(r => r.id === rewardId);
      if (!reward) {
        return { success: false, error: 'Invalid reward ID' };
      }

      // Update reward count
      const count = this.mockState.rewardCounts.get(rewardId) || 0;
      this.mockState.rewardCounts.set(rewardId, count + 1);

      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

      return {
        success: true,
        reward: {
          id: `reward_${Date.now()}`,
          rewardType: reward.type,
          amount: reward.amount,
          transactionId,
          earnedAt: new Date().toISOString(),
          status: 'claimed',
        },
        newBalance: {
          coins: 160, // Mock balance
          superLikes: 3,
          boosts: 1,
          rewinds: 2,
        },
      };
    }

    const response = await fetch(`${this.baseUrl}/rewards/claim`, {
      method: 'POST',
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rewardId,
        transactionId,
        impressionId,
        videoCompletionPercent,
      }),
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to claim reward' };
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Record a purchase (triggers ad cooldown)
   */
  async recordPurchase(): Promise<void> {
    if (this.isMock) {
      // Reset ad state after purchase
      this.mockState.interstitialsShownToday = 0;
      return;
    }

    await fetch(`${this.baseUrl}/purchase`, {
      method: 'POST',
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('adSessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('adSessionId', sessionId);
    }
    return sessionId;
  }

  /**
   * Get device info for targeting
   */
  private getDeviceInfo() {
    return {
      deviceId: this.getDeviceId(),
      platform: 'web',
      osVersion: navigator.platform,
      appVersion: '1.0.0',
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  /**
   * Get or create device ID
   */
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  /**
   * Reset session state
   */
  resetSession(): void {
    this.mockState.actionsThisSession = 0;
    sessionStorage.removeItem('adSessionId');
  }
}

export const adService = new AdService();
export default adService;
