/**
 * User Service Client
 * Handles communication with the user service
 */

import { ServiceClient } from '@flamoral/shared';
import { createLogger } from '@flamoral/shared';
import config from '../../config';

const logger = createLogger('user-service-client');

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  gender: 'male' | 'female' | 'non-binary' | 'other' | 'prefer_not_to_say';
  date_of_birth: Date;
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
      baseURL: this.baseUrl,
      serviceName: 'matching-service',
      timeout: 5000,
      maxRetries: 2,
      retryDelay: 500,
      enableLogging: true,
      logger: {
        info: (msg, meta) => logger.info(msg, meta),
        warn: (msg, meta) => logger.warn(msg, meta),
        error: (msg, meta) => logger.error(msg, meta),
        debug: (msg, meta) => logger.debug(msg, meta),
      },
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
      profiles.forEach(profile => {
        profileMap.set(profile.id, profile);
      });

      return profileMap;
    } catch (error: any) {
      logger.error(`Failed to get user profiles in batch: ${error.message}`);
      return new Map();
    }
  }
}

export default new UserServiceClient();
