/**
 * Ad Revenue Types
 * Types for banner ads, interstitial ads, and reward video ads
 */

// Ad Types
export type AdType = 'banner' | 'interstitial' | 'rewarded';
export type AdNetwork = 'admob' | 'facebook' | 'unity' | 'applovin' | 'custom';
export type AdStatus = 'active' | 'paused' | 'disabled';

// Reward Types
export type RewardType = 'coins' | 'super_likes' | 'boosts' | 'rewinds' | 'premium_trial';

// Ad Unit Configuration
export interface AdUnitConfig {
  id: string;
  name: string;
  type: AdType;
  network: AdNetwork;
  status: AdStatus;
  platformIds: {
    ios?: string;
    android?: string;
  };
  testIds: {
    ios?: string;
    android?: string;
  };
  floorPrice?: number; // Minimum eCPM
  targeting?: AdTargetingConfig;
  frequencyCap?: FrequencyCapConfig;
  createdAt: Date;
  updatedAt: Date;
}

// Targeting Configuration
export interface AdTargetingConfig {
  countries?: string[];
  languages?: string[];
  minAge?: number;
  maxAge?: number;
  genders?: string[];
  interests?: string[];
  deviceTypes?: string[];
  osVersions?: {
    ios?: { min?: string; max?: string };
    android?: { min?: number; max?: number };
  };
  customSegments?: string[];
}

// Frequency Cap Configuration
export interface FrequencyCapConfig {
  interstitial: {
    minSecondsBetweenAds: number;
    maxAdsPerSession: number;
    maxAdsPerDay: number;
    minActionsBeforeFirstAd: number;
    cooldownAfterPurchase: number; // Hours
  };
  rewarded: {
    maxViewsPerDay: number;
    cooldownBetweenViews: number; // Seconds
    resetTime: string; // HH:MM format
  };
  banner: {
    refreshIntervalSeconds: number;
    hideAfterSeconds?: number;
  };
}

// Ad Request
export interface AdRequest {
  userId: string;
  adType: AdType;
  placement: string;
  platform: 'ios' | 'android' | 'web';
  deviceInfo: DeviceInfo;
  userInfo?: UserAdInfo;
}

export interface DeviceInfo {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  osVersion: string;
  appVersion: string;
  deviceModel?: string;
  screenSize?: string;
  connectionType?: string;
  language?: string;
  timezone?: string;
}

export interface UserAdInfo {
  isPremium: boolean;
  premiumTier?: string;
  age?: number;
  gender?: string;
  interests?: string[];
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  segments?: string[];
}

// Ad Impression
export interface AdImpression {
  id: string;
  userId: string;
  adUnitId: string;
  adType: AdType;
  network: AdNetwork;
  placement: string;
  platform: 'ios' | 'android' | 'web';
  impressionTime: Date;
  clicked: boolean;
  clickTime?: Date;
  revenue?: number;
  currency?: string;
  deviceInfo: DeviceInfo;
  sessionId: string;
}

// Ad Click
export interface AdClick {
  id: string;
  impressionId: string;
  userId: string;
  adType: AdType;
  clickTime: Date;
  destinationUrl?: string;
}

// Reward Configuration
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
  premiumMultiplier?: number; // Bonus for premium users
  expiresAt?: Date;
}

// Reward Fulfillment
export interface RewardFulfillment {
  id: string;
  userId: string;
  rewardId: string;
  rewardType: RewardType;
  amount: number;
  transactionId: string;
  impressionId: string;
  videoWatched: boolean;
  videoCompletionPercent: number;
  earnedAt: Date;
  claimedAt?: Date;
  expiresAt?: Date;
  status: 'pending' | 'claimed' | 'expired' | 'failed';
}

// Ad Performance Metrics
export interface AdPerformanceMetrics {
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  impressions: number;
  clicks: number;
  ctr: number;
  revenue: number;
  ecpm: number;
  fillRate: number;
  byAdType: {
    [key in AdType]?: {
      impressions: number;
      clicks: number;
      ctr: number;
      revenue: number;
      ecpm: number;
    };
  };
  byNetwork: {
    [key in AdNetwork]?: {
      impressions: number;
      clicks: number;
      ctr: number;
      revenue: number;
      ecpm: number;
    };
  };
  byPlacement: {
    [placement: string]: {
      impressions: number;
      clicks: number;
      ctr: number;
      revenue: number;
    };
  };
}

// Reward Analytics
export interface RewardAnalytics {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totalRewardsEarned: number;
  totalRewardsClaimed: number;
  rewardValue: number;
  uniqueUsers: number;
  videoCompletionRate: number;
  byRewardType: {
    [key in RewardType]?: {
      earned: number;
      claimed: number;
      value: number;
    };
  };
}

// User Ad State (for frequency capping)
export interface UserAdState {
  userId: string;
  lastInterstitialTime?: Date;
  interstitialsShownToday: number;
  interstitialsShownSession: number;
  lastRewardedTime?: Date;
  rewardedViewsToday: number;
  lastPurchaseTime?: Date;
  actionsThisSession: number;
  lastResetDate: string; // YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}

// Ad Configuration Response
export interface AdConfigResponse {
  enabled: boolean;
  testMode: boolean;
  frequencyCap: FrequencyCapConfig;
  rewards: RewardConfig[];
  adUnits: {
    banner: AdUnitConfig;
    interstitial: AdUnitConfig;
    rewarded: AdUnitConfig;
  };
  premiumTiersAdFree: string[];
}

// API Request/Response Types
export interface RecordImpressionRequest {
  userId: string;
  adType: AdType;
  network: AdNetwork;
  placement: string;
  platform: 'ios' | 'android' | 'web';
  sessionId: string;
  deviceInfo: DeviceInfo;
}

export interface RecordClickRequest {
  impressionId: string;
  userId: string;
  adType: AdType;
}

export interface ClaimRewardRequest {
  userId: string;
  rewardId: string;
  transactionId: string;
  impressionId: string;
  videoCompletionPercent: number;
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

export interface GetUserAdStateRequest {
  userId: string;
}

export interface GetUserAdStateResponse {
  canShowInterstitial: boolean;
  canShowRewarded: boolean;
  timeUntilNextInterstitial: number; // Seconds
  timeUntilNextRewarded: number; // Seconds
  remainingRewardedToday: number;
  remainingInterstitialsToday: number;
  state: UserAdState;
}
