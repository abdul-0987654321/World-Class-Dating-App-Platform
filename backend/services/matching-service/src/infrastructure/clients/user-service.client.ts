/**
 * User Service Client
 * Handles communication with the user service
 */

import { ServiceClient, createLogger } from '@flamoral/backend-shared';

import config from '../../config';

const logger = createLogger('user-service-client');

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  gender: 'male' | 'female' | 'non-binary' | 'other' | 'prefer_not_to_say';
  date_of_birth: Date;
  subscriptionTier?: string;
  age?: number;
  photos?: string[];
  interests?: string[];
  bio?: string;
}

interface UserSubscription {
  userId: string;
  tier: string;
  status: 'active' | 'expired' | 'cancelled';
  expiresAt?: Date;
}

interface UserPreferences {
  id: string;
  user_id: string;
  show_me: 'men' | 'women' | 'everyone';
  genders: string[];
}

export class UserServiceClient {
  private client: ServiceClient;
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.services.userServiceUrl;
    this.client = new ServiceClient({
      baseUrl: this.baseUrl,
      serviceName: 'matching-service',
      timeout: 5000,
    });
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const response = await this.client.get(`/api/internal/users/${userId}`);
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to get user profile for ${userId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get user preferences by user ID
   */
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const response = await this.client.get(`/api/internal/users/${userId}/preferences`);
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to get user preferences for ${userId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get multiple user profiles in batch
   */
  async getUserProfiles(userIds: string[]): Promise<Map<string, UserProfile>> {
    try {
      const response = await this.client.post('/api/internal/users/batch', { userIds });
      const profiles = response.data as UserProfile[];

      const profileMap = new Map<string, UserProfile>();
      profiles.forEach((profile) => {
        profileMap.set(profile.id, profile);
      });

      return profileMap;
    } catch (error: any) {
      logger.error(`Failed to get user profiles in batch: ${error.message}`);
      return new Map();
    }
  }

  /**
   * Get user subscription info by user ID
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const response = await this.client.get(`/api/internal/users/${userId}/subscription`);
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to get user subscription for ${userId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get user subscription tier by user ID
   * Returns 'free' if subscription cannot be fetched
   */
  async getUserSubscriptionTier(userId: string): Promise<string> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (subscription && subscription.status === 'active') {
        return subscription.tier;
      }
      return 'free';
    } catch (error: any) {
      logger.warn(
        `Failed to get subscription tier for ${userId}, defaulting to free: ${error.message}`
      );
      return 'free';
    }
  }
}

export default new UserServiceClient();
