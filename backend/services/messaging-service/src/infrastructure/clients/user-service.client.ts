/**
 * User Service Client
 * Handles communication with the user service for subscription and user data
 */

import axios, { AxiosInstance } from 'axios';

import config from '../../config';
import { createLogger } from '../../utils/logger';

const logger = createLogger('user-service-client');

/**
 * Subscription tiers that allow "Message Before Match" feature
 * Premium+, Elite tiers can send messages before matching
 */
export const BEFORE_MATCH_ALLOWED_TIERS = ['premium_plus', 'elite'] as const;

/**
 * All subscription tiers
 */
export type SubscriptionTier = 'free' | 'basic' | 'plus' | 'premium' | 'premium_plus' | 'elite';

export interface UserSubscriptionInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionTier: SubscriptionTier;
  isActive: boolean;
  isVerified: boolean;
}

export class UserServiceClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.services.userServiceUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': 'messaging-service',
        'X-Service-Token': config.serviceToken,
      },
    });
  }

  /**
   * Get user information including subscription tier
   */
  async getUserInfo(userId: string): Promise<UserSubscriptionInfo | null> {
    try {
      const response = await this.client.get(`/api/internal/users/${userId}`);
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error(`Failed to get user info for ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's subscription tier
   */
  async getUserSubscriptionTier(userId: string): Promise<SubscriptionTier> {
    try {
      const userInfo = await this.getUserInfo(userId);
      return userInfo?.subscriptionTier || 'free';
    } catch (error: any) {
      logger.error(`Failed to get subscription tier for ${userId}: ${error.message}`);
      // Default to free tier on error to prevent feature access
      return 'free';
    }
  }

  /**
   * Check if user can send messages before matching
   * Only Premium+ and Elite tiers have this feature
   */
  async canSendBeforeMatch(userId: string): Promise<boolean> {
    try {
      const tier = await this.getUserSubscriptionTier(userId);
      const canSend = BEFORE_MATCH_ALLOWED_TIERS.includes(
        tier as (typeof BEFORE_MATCH_ALLOWED_TIERS)[number]
      );
      logger.debug(`User ${userId} with tier ${tier} canSendBeforeMatch: ${canSend}`);
      return canSend;
    } catch (error: any) {
      logger.error(`Failed to check before-match permission for ${userId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if user has a specific feature based on subscription tier
   * This is a general feature access check
   */
  async hasFeatureAccess(userId: string, featureKey: string): Promise<boolean> {
    try {
      const response = await this.client.get(
        `/api/internal/users/${userId}/features/${featureKey}`
      );
      return response.data.data?.hasAccess || false;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false;
      }
      logger.error(`Failed to check feature access for ${userId}/${featureKey}: ${error.message}`);
      return false;
    }
  }
}

export const userServiceClient = new UserServiceClient();
export default userServiceClient;
