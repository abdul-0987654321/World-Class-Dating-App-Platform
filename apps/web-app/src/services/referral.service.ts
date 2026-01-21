/**
 * Referral Service
 * Handles all referral-related API calls including codes, rewards, and tracking
 */

import { apiClient } from './api.client';

// Types
export interface ReferralCode {
  code: string;
  isCustom: boolean;
  createdAt: string;
  expiresAt?: string;
  usageCount: number;
  maxUses?: number;
  reward: {
    referrer: {
      coins?: number;
      gems?: number;
      premiumDays?: number;
    };
    referee: {
      coins?: number;
      gems?: number;
      premiumDays?: number;
    };
  };
}

export interface Referral {
  id: string;
  refereeId: string;
  refereeName: string;
  refereePhotoUrl?: string;
  status: 'pending' | 'registered' | 'verified' | 'rewarded' | 'expired';
  createdAt: string;
  completedAt?: string;
  rewardClaimed: boolean;
  reward?: {
    coins?: number;
    gems?: number;
    premiumDays?: number;
  };
}

export interface ReferralTier {
  tier: number;
  name: string;
  requiredReferrals: number;
  reward: {
    coins?: number;
    gems?: number;
    premiumDays?: number;
    badge?: string;
    specialPerks?: string[];
  };
  unlocked: boolean;
  progress: number;
}

export interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalCoinsEarned: number;
  totalGemsEarned: number;
  currentTier: number;
  currentTierName: string;
  nextTierProgress: number;
  leaderboardRank?: number;
}

export interface ReferralLeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  photoUrl?: string;
  referralCount: number;
  tier: string;
}

// Service
class ReferralService {
  private baseUrl = '/api/referrals';

  // Referral Code
  async getMyCode(): Promise<ReferralCode> {
    const response = await apiClient.get<{ data: ReferralCode }>(`${this.baseUrl}/my-code`);
    return response.data;
  }

  async generateNewCode(): Promise<ReferralCode> {
    const response = await apiClient.post<{ data: ReferralCode }>(`${this.baseUrl}/generate-code`);
    return response.data;
  }

  async setCustomCode(code: string): Promise<{ success: boolean; code: ReferralCode }> {
    const response = await apiClient.post<{ data: { success: boolean; code: ReferralCode } }>(
      `${this.baseUrl}/custom-code`,
      { code }
    );
    return response.data;
  }

  async validateCode(
    code: string
  ): Promise<{ valid: boolean; referrer?: { name: string; photoUrl?: string } }> {
    const response = await apiClient.get<{
      data: { valid: boolean; referrer?: { name: string; photoUrl?: string } };
    }>(`${this.baseUrl}/validate/${code}`);
    return response.data;
  }

  async applyCode(code: string): Promise<{
    success: boolean;
    reward?: { coins?: number; gems?: number; premiumDays?: number };
  }> {
    const response = await apiClient.post<{
      data: { success: boolean; reward?: { coins?: number; gems?: number; premiumDays?: number } };
    }>(`${this.baseUrl}/apply`, { code });
    return response.data;
  }

  // Referrals List
  async getMyReferrals(status?: string): Promise<Referral[]> {
    const url = status
      ? `${this.baseUrl}/my-referrals?status=${status}`
      : `${this.baseUrl}/my-referrals`;
    const response = await apiClient.get<{ data: { referrals: Referral[] } }>(url);
    return response.data.referrals;
  }

  async getReferralDetails(referralId: string): Promise<Referral> {
    const response = await apiClient.get<{ data: Referral }>(`${this.baseUrl}/${referralId}`);
    return response.data;
  }

  // Rewards
  async claimReferralReward(referralId: string): Promise<{
    success: boolean;
    reward: { coins?: number; gems?: number; premiumDays?: number };
  }> {
    const response = await apiClient.post<{
      data: { success: boolean; reward: { coins?: number; gems?: number; premiumDays?: number } };
    }>(`${this.baseUrl}/${referralId}/claim`);
    return response.data;
  }

  async claimAllPendingRewards(): Promise<{
    success: boolean;
    totalClaimed: number;
    rewards: { coins: number; gems: number; premiumDays: number };
  }> {
    const response = await apiClient.post<{
      data: {
        success: boolean;
        totalClaimed: number;
        rewards: { coins: number; gems: number; premiumDays: number };
      };
    }>(`${this.baseUrl}/claim-all`);
    return response.data;
  }

  // Tiers
  async getTiers(): Promise<ReferralTier[]> {
    const response = await apiClient.get<{ data: { tiers: ReferralTier[] } }>(
      `${this.baseUrl}/tiers`
    );
    return response.data.tiers;
  }

  async claimTierReward(tier: number): Promise<{
    success: boolean;
    reward: { coins?: number; gems?: number; premiumDays?: number; badge?: string };
  }> {
    const response = await apiClient.post<{
      data: {
        success: boolean;
        reward: { coins?: number; gems?: number; premiumDays?: number; badge?: string };
      };
    }>(`${this.baseUrl}/tiers/${tier}/claim`);
    return response.data;
  }

  // Stats
  async getStats(): Promise<ReferralStats> {
    const response = await apiClient.get<{ data: ReferralStats }>(`${this.baseUrl}/stats`);
    return response.data;
  }

  // Leaderboard
  async getLeaderboard(
    period: 'weekly' | 'monthly' | 'all_time' = 'monthly'
  ): Promise<ReferralLeaderboardEntry[]> {
    const response = await apiClient.get<{ data: { leaderboard: ReferralLeaderboardEntry[] } }>(
      `${this.baseUrl}/leaderboard?period=${period}`
    );
    return response.data.leaderboard;
  }

  // Share
  async getShareContent(): Promise<{ message: string; url: string; code: string }> {
    const response = await apiClient.get<{ data: { message: string; url: string; code: string } }>(
      `${this.baseUrl}/share`
    );
    return response.data;
  }

  async trackShareAction(
    platform: 'copy' | 'whatsapp' | 'facebook' | 'twitter' | 'email' | 'sms' | 'other'
  ): Promise<void> {
    await apiClient.post(`${this.baseUrl}/share/track`, { platform });
  }

  // Notification preferences
  async getReferralNotificationSettings(): Promise<{
    emailOnReferral: boolean;
    pushOnReferral: boolean;
    emailOnReward: boolean;
    pushOnReward: boolean;
  }> {
    const response = await apiClient.get<{
      data: {
        emailOnReferral: boolean;
        pushOnReferral: boolean;
        emailOnReward: boolean;
        pushOnReward: boolean;
      };
    }>(`${this.baseUrl}/notifications`);
    return response.data;
  }

  async updateReferralNotificationSettings(settings: {
    emailOnReferral?: boolean;
    pushOnReferral?: boolean;
    emailOnReward?: boolean;
    pushOnReward?: boolean;
  }): Promise<void> {
    await apiClient.put(`${this.baseUrl}/notifications`, settings);
  }
}

export const referralService = new ReferralService();
