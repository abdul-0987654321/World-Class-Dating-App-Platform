/**
 * Advertising Types and Interfaces
 * Defines types for banner ads, interstitial ads, and reward video ads
 */

// Ad Networks
export type AdNetwork = 'admob' | 'facebook' | 'custom';

// Ad Types
export type AdType = 'banner' | 'interstitial' | 'rewarded';

// Ad Sizes for banners
export type BannerAdSize =
  | 'banner' // 320x50
  | 'largeBanner' // 320x100
  | 'mediumRectangle' // 300x250
  | 'fullBanner' // 468x60
  | 'leaderboard' // 728x90
  | 'smartBanner'; // Adaptive

// Banner placement positions
export type BannerPlacement =
  | 'discovery_bottom'
  | 'messages_bottom'
  | 'profile_view'
  | 'matches_list'
  | 'settings';

// Interstitial trigger events
export type InterstitialTrigger =
  | 'after_swipes'
  | 'after_match'
  | 'before_chat'
  | 'after_session'
  | 'app_resume';

// Reward types for video ads
export type RewardType = 'coins' | 'super_likes' | 'boosts' | 'rewinds' | 'premium_trial';

// Ad Unit IDs - Platform specific
export interface AdUnitIds {
  ios: {
    banner: string;
    interstitial: string;
    rewarded: string;
  };
  android: {
    banner: string;
    interstitial: string;
    rewarded: string;
  };
}

// Ad configuration for the app
export interface AdConfig {
  enabled: boolean;
  testMode: boolean;
  networks: AdNetwork[];
  primaryNetwork: AdNetwork;
  fallbackNetwork?: AdNetwork;
  unitIds: AdUnitIds;
  facebookAppId?: string;
  facebookPlacementIds?: {
    banner: string;
    interstitial: string;
    rewarded: string;
  };
}

// Frequency capping configuration
export interface FrequencyCapConfig {
  // Interstitial ads
  interstitial: {
    minSecondsBetweenAds: number;
    maxAdsPerSession: number;
    maxAdsPerDay: number;
    minActionsBeforeFirstAd: number;
    cooldownAfterPurchase: number; // Hours
  };
  // Reward video ads
  rewarded: {
    maxViewsPerDay: number;
    cooldownBetweenViews: number; // Seconds
    resetTime: string; // HH:MM format (e.g., "00:00")
  };
  // Banner refresh rate
  banner: {
    refreshIntervalSeconds: number;
    hideAfterSeconds?: number;
  };
}

// Ad state tracking
export interface AdState {
  lastInterstitialTime: number | null;
  interstitialsShownToday: number;
  interstitialsShownSession: number;
  actionsThisSession: number;
  lastRewardedTime: number | null;
  rewardedViewsToday: number;
  lastAdDate: string; // YYYY-MM-DD format
  lastPurchaseTime: number | null;
}

// Ad event types for analytics
export type AdEventType =
  | 'request'
  | 'loaded'
  | 'impression'
  | 'click'
  | 'closed'
  | 'failed'
  | 'reward_earned'
  | 'skipped';

// Ad event for analytics
export interface AdEvent {
  eventType: AdEventType;
  adType: AdType;
  network: AdNetwork;
  placement?: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

// Reward configuration
export interface RewardConfig {
  type: RewardType;
  amount: number;
  displayName: string;
  description: string;
  icon: string;
  cooldownHours?: number;
  maxPerDay?: number;
}

// Available rewards for video ads
export interface AvailableReward {
  id: string;
  config: RewardConfig;
  available: boolean;
  nextAvailableAt?: number;
  viewsRemainingToday: number;
}

// Reward earned from video ad
export interface RewardEarned {
  rewardId: string;
  type: RewardType;
  amount: number;
  transactionId: string;
  earnedAt: number;
}

// User ad preferences
export interface UserAdPreferences {
  userId: string;
  isPremium: boolean;
  premiumTier: string | null;
  adFreeUntil?: number;
  reducedAds?: boolean;
  personalizedAds: boolean;
  trackingConsent: boolean;
}

// Ad targeting data
export interface AdTargeting {
  age?: number;
  gender?: string;
  interests?: string[];
  location?: {
    country?: string;
    city?: string;
  };
  customSegments?: string[];
}

// Banner ad component props
export interface BannerAdProps {
  placement: BannerPlacement;
  size?: BannerAdSize;
  onAdLoaded?: () => void;
  onAdFailed?: (error: Error) => void;
  onAdClicked?: () => void;
  testID?: string;
}

// Interstitial ad hook return type
export interface UseInterstitialAdReturn {
  isLoaded: boolean;
  isLoading: boolean;
  show: () => Promise<boolean>;
  preload: () => Promise<void>;
  canShow: boolean;
  timeUntilNextAd: number;
  error: Error | null;
}

// Rewarded ad hook return type
export interface UseRewardedAdReturn {
  isLoaded: boolean;
  isLoading: boolean;
  show: (rewardId: string) => Promise<RewardEarned | null>;
  preload: () => Promise<void>;
  availableRewards: AvailableReward[];
  error: Error | null;
}

// Ad manager interface
export interface IAdManager {
  initialize(): Promise<void>;
  setUserPreferences(preferences: UserAdPreferences): void;
  shouldShowAds(): boolean;
  trackEvent(event: AdEvent): void;
  getAdState(): AdState;
  resetDailyCounters(): void;
  recordAction(): void;
  recordInterstitialShown(): void;
  recordRewardedViewed(): void;
  canShowInterstitial(): boolean;
  canShowRewarded(rewardId: string): boolean;
  getTimeUntilNextInterstitial(): number;
}

// Ad service interface
export interface IAdService {
  loadBannerAd(placement: BannerPlacement): Promise<void>;
  loadInterstitialAd(): Promise<boolean>;
  showInterstitialAd(): Promise<boolean>;
  loadRewardedAd(): Promise<boolean>;
  showRewardedAd(rewardId: string): Promise<RewardEarned | null>;
  claimReward(rewardId: string, transactionId: string): Promise<boolean>;
  getAvailableRewards(): Promise<AvailableReward[]>;
  setTargeting(targeting: AdTargeting): void;
  setTestMode(enabled: boolean): void;
}

// Default ad configuration
export const DEFAULT_AD_CONFIG: AdConfig = {
  enabled: true,
  testMode: __DEV__ || false,
  networks: ['admob', 'facebook'],
  primaryNetwork: 'admob',
  fallbackNetwork: 'facebook',
  unitIds: {
    ios: {
      banner: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
      interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
      rewarded: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    },
    android: {
      banner: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
      interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
      rewarded: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    },
  },
};

// Default frequency cap configuration
export const DEFAULT_FREQUENCY_CAP: FrequencyCapConfig = {
  interstitial: {
    minSecondsBetweenAds: 60, // 1 minute minimum between interstitials
    maxAdsPerSession: 5, // Max 5 interstitials per session
    maxAdsPerDay: 15, // Max 15 interstitials per day
    minActionsBeforeFirstAd: 3, // User must take 3 actions before first ad
    cooldownAfterPurchase: 24, // 24 hour cooldown after purchase
  },
  rewarded: {
    maxViewsPerDay: 10, // Max 10 reward videos per day
    cooldownBetweenViews: 300, // 5 minutes between views
    resetTime: '00:00', // Reset at midnight
  },
  banner: {
    refreshIntervalSeconds: 60, // Refresh banner every 60 seconds
  },
};

// Default rewards configuration
export const DEFAULT_REWARDS: RewardConfig[] = [
  {
    type: 'coins',
    amount: 10,
    displayName: '10 Coins',
    description: 'Watch a video to earn 10 free coins',
    icon: 'coin',
    maxPerDay: 5,
  },
  {
    type: 'super_likes',
    amount: 1,
    displayName: 'Free Super Like',
    description: 'Watch a video to get a free Super Like',
    icon: 'star',
    maxPerDay: 3,
    cooldownHours: 4,
  },
  {
    type: 'boosts',
    amount: 1,
    displayName: '30-Minute Boost',
    description: 'Watch a video to boost your profile for 30 minutes',
    icon: 'rocket',
    maxPerDay: 2,
    cooldownHours: 6,
  },
  {
    type: 'rewinds',
    amount: 1,
    displayName: 'Free Rewind',
    description: 'Watch a video to get a free Rewind',
    icon: 'undo',
    maxPerDay: 3,
  },
  {
    type: 'premium_trial',
    amount: 60, // 60 minutes
    displayName: '1-Hour Premium',
    description: 'Watch a video to try Premium features for 1 hour',
    icon: 'crown',
    maxPerDay: 1,
    cooldownHours: 24,
  },
];

// Premium tiers that are ad-free
export const AD_FREE_TIERS = ['BASIC', 'PLUS', 'PREMIUM', 'PREMIUM_PLUS', 'ELITE'];

// Tiers with reduced ads (e.g., no interstitials but still banners)
export const REDUCED_ADS_TIERS: string[] = [];
