/**
 * Passport Mode Service
 * Allows premium users to search and match with users in different locations
 */

import { db } from '../../database';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@flamoral/backend-shared';
import axios from 'axios';

const logger = createLogger('passport-mode-service');

// Passport mode limits by tier
const PASSPORT_LIMITS = {
  free: { enabled: false, maxLocations: 0, durationDays: 0 },
  plus: { enabled: true, maxLocations: 1, durationDays: 7 },
  premium: { enabled: true, maxLocations: 3, durationDays: 30 },
  elite: { enabled: true, maxLocations: 5, durationDays: 90 },
};

interface PassportLocation {
  id: string;
  userId: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

interface PopularDestination {
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  activeUsers: number;
  timezone: string;
}

interface PassportStatus {
  enabled: boolean;
  tier: string;
  activeLocation: PassportLocation | null;
  savedLocations: PassportLocation[];
  maxLocations: number;
  remainingDays: number;
}

export class PassportModeService {
  private userServiceUrl: string;
  private paymentServiceUrl: string;

  constructor() {
    this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
    this.paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005';
  }

  /**
   * Get passport mode status for a user
   */
  async getPassportStatus(userId: string): Promise<PassportStatus> {
    try {
      const tier = await this.getUserTier(userId);
      const limits = PASSPORT_LIMITS[tier as keyof typeof PASSPORT_LIMITS] || PASSPORT_LIMITS.free;

      if (!limits.enabled) {
        return {
          enabled: false,
          tier,
          activeLocation: null,
          savedLocations: [],
          maxLocations: 0,
          remainingDays: 0,
        };
      }

      // Get user's passport locations
      const locations = await db('passport_locations')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc');

      const activeLocation = locations.find((loc) => loc.is_active && new Date(loc.end_date) > new Date());

      // Calculate remaining days for active location
      let remainingDays = 0;
      if (activeLocation) {
        const endDate = new Date(activeLocation.end_date);
        remainingDays = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      }

      return {
        enabled: true,
        tier,
        activeLocation: activeLocation ? this.mapLocationFromDb(activeLocation) : null,
        savedLocations: locations.map(this.mapLocationFromDb),
        maxLocations: limits.maxLocations,
        remainingDays,
      };
    } catch (error) {
      logger.error('Failed to get passport status', error);
      throw error;
    }
  }

  /**
   * Set passport location (teleport to a new location)
   */
  async setPassportLocation(
    userId: string,
    city: string,
    country: string,
    latitude: number,
    longitude: number
  ): Promise<{ success: boolean; location?: PassportLocation; error?: string }> {
    try {
      const tier = await this.getUserTier(userId);
      const limits = PASSPORT_LIMITS[tier as keyof typeof PASSPORT_LIMITS] || PASSPORT_LIMITS.free;

      // Check if passport is enabled for this tier
      if (!limits.enabled) {
        return {
          success: false,
          error: 'Passport mode requires Plus subscription or higher',
        };
      }

      // Check location limits
      const existingLocations = await db('passport_locations')
        .where({ user_id: userId })
        .where('end_date', '>', new Date())
        .count('* as count')
        .first();

      const locationCount = Number(existingLocations?.count || 0);
      if (locationCount >= limits.maxLocations) {
        return {
          success: false,
          error: `You can only have ${limits.maxLocations} active passport location(s). Deactivate one first.`,
        };
      }

      // Deactivate any current active location
      await db('passport_locations')
        .where({ user_id: userId, is_active: true })
        .update({ is_active: false });

      // Create new passport location
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + limits.durationDays);

      const locationId = uuidv4();
      const newLocation = {
        id: locationId,
        user_id: userId,
        city,
        country,
        latitude,
        longitude,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
        created_at: new Date(),
      };

      await db('passport_locations').insert(newLocation);

      // Update user's effective location in user service
      await this.updateUserEffectiveLocation(userId, latitude, longitude, city, country);

      logger.info(`User ${userId} teleported to ${city}, ${country}`);

      return {
        success: true,
        location: this.mapLocationFromDb(newLocation),
      };
    } catch (error) {
      logger.error('Failed to set passport location', error);
      throw error;
    }
  }

  /**
   * Deactivate passport mode and return to home location
   */
  async deactivatePassport(userId: string): Promise<{ success: boolean }> {
    try {
      // Deactivate all active passport locations
      await db('passport_locations')
        .where({ user_id: userId, is_active: true })
        .update({ is_active: false, deactivated_at: new Date() });

      // Reset user's effective location to their actual location
      await this.resetUserEffectiveLocation(userId);

      logger.info(`User ${userId} deactivated passport mode`);

      return { success: true };
    } catch (error) {
      logger.error('Failed to deactivate passport', error);
      throw error;
    }
  }

  /**
   * Get popular destinations for passport mode
   */
  async getPopularDestinations(): Promise<PopularDestination[]> {
    // Pre-defined popular destinations with approximate user counts
    return [
      {
        city: 'New York',
        country: 'United States',
        countryCode: 'US',
        latitude: 40.7128,
        longitude: -74.006,
        activeUsers: 15420,
        timezone: 'America/New_York',
      },
      {
        city: 'Los Angeles',
        country: 'United States',
        countryCode: 'US',
        latitude: 34.0522,
        longitude: -118.2437,
        activeUsers: 12830,
        timezone: 'America/Los_Angeles',
      },
      {
        city: 'London',
        country: 'United Kingdom',
        countryCode: 'GB',
        latitude: 51.5074,
        longitude: -0.1278,
        activeUsers: 18320,
        timezone: 'Europe/London',
      },
      {
        city: 'Paris',
        country: 'France',
        countryCode: 'FR',
        latitude: 48.8566,
        longitude: 2.3522,
        activeUsers: 14560,
        timezone: 'Europe/Paris',
      },
      {
        city: 'Tokyo',
        country: 'Japan',
        countryCode: 'JP',
        latitude: 35.6762,
        longitude: 139.6503,
        activeUsers: 21450,
        timezone: 'Asia/Tokyo',
      },
      {
        city: 'Sydney',
        country: 'Australia',
        countryCode: 'AU',
        latitude: -33.8688,
        longitude: 151.2093,
        activeUsers: 8920,
        timezone: 'Australia/Sydney',
      },
      {
        city: 'Barcelona',
        country: 'Spain',
        countryCode: 'ES',
        latitude: 41.3851,
        longitude: 2.1734,
        activeUsers: 9780,
        timezone: 'Europe/Madrid',
      },
      {
        city: 'Miami',
        country: 'United States',
        countryCode: 'US',
        latitude: 25.7617,
        longitude: -80.1918,
        activeUsers: 7650,
        timezone: 'America/New_York',
      },
      {
        city: 'Berlin',
        country: 'Germany',
        countryCode: 'DE',
        latitude: 52.52,
        longitude: 13.405,
        activeUsers: 11230,
        timezone: 'Europe/Berlin',
      },
      {
        city: 'Amsterdam',
        country: 'Netherlands',
        countryCode: 'NL',
        latitude: 52.3676,
        longitude: 4.9041,
        activeUsers: 6890,
        timezone: 'Europe/Amsterdam',
      },
      {
        city: 'Singapore',
        country: 'Singapore',
        countryCode: 'SG',
        latitude: 1.3521,
        longitude: 103.8198,
        activeUsers: 8450,
        timezone: 'Asia/Singapore',
      },
      {
        city: 'Dubai',
        country: 'United Arab Emirates',
        countryCode: 'AE',
        latitude: 25.2048,
        longitude: 55.2708,
        activeUsers: 7120,
        timezone: 'Asia/Dubai',
      },
    ];
  }

  /**
   * Search locations by query
   */
  async searchLocations(query: string): Promise<Array<{
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  }>> {
    // In a real implementation, this would call a geocoding API
    // For now, we'll filter from a predefined list
    const allLocations = await this.getPopularDestinations();
    const normalizedQuery = query.toLowerCase();

    return allLocations
      .filter((loc) =>
        loc.city.toLowerCase().includes(normalizedQuery) ||
        loc.country.toLowerCase().includes(normalizedQuery)
      )
      .map((loc) => ({
        city: loc.city,
        country: loc.country,
        latitude: loc.latitude,
        longitude: loc.longitude,
      }));
  }

  /**
   * Get user's effective location for matching
   * Returns passport location if active, otherwise home location
   */
  async getEffectiveLocation(userId: string): Promise<{
    latitude: number;
    longitude: number;
    city: string;
    country?: string;
    isPassportLocation: boolean;
  }> {
    try {
      // Check for active passport location
      const activePassport = await db('passport_locations')
        .where({ user_id: userId, is_active: true })
        .where('end_date', '>', new Date())
        .first();

      if (activePassport) {
        return {
          latitude: activePassport.latitude,
          longitude: activePassport.longitude,
          city: activePassport.city,
          country: activePassport.country,
          isPassportLocation: true,
        };
      }

      // Fall back to user's actual location
      const userLocation = await this.getUserHomeLocation(userId);
      return {
        ...userLocation,
        isPassportLocation: false,
      };
    } catch (error) {
      logger.error('Failed to get effective location', error);
      throw error;
    }
  }

  /**
   * Get discovery feed for passport location
   */
  async getPassportDiscoveryFeed(
    userId: string,
    limit: number = 20,
    cursor?: string
  ): Promise<{
    items: any[];
    nextCursor: string | null;
    passportLocation: { city: string; country: string } | null;
  }> {
    try {
      const effectiveLocation = await this.getEffectiveLocation(userId);

      if (!effectiveLocation.isPassportLocation) {
        return {
          items: [],
          nextCursor: null,
          passportLocation: null,
        };
      }

      // Get user preferences
      const userPrefs = await this.fetchUserPreferences(userId);

      // Get excluded users
      const excludedUserIds = await this.getExcludedUserIds(userId);

      // Calculate offset from cursor
      const offset = cursor ? parseInt(Buffer.from(cursor, 'base64').toString(), 10) : 0;

      // Fetch candidates near passport location
      const candidates = await this.fetchCandidatesNearLocation(
        userId,
        effectiveLocation.latitude,
        effectiveLocation.longitude,
        userPrefs,
        excludedUserIds,
        limit + 1,
        offset
      );

      const hasMore = candidates.length > limit;
      const items = candidates.slice(0, limit);

      const nextOffset = offset + items.length;
      const nextCursor = hasMore ? Buffer.from(nextOffset.toString()).toString('base64') : null;

      return {
        items: items.map((candidate) => ({
          user_id: candidate.userId,
          profile_preview: {
            display_name: candidate.displayName || candidate.name || 'User',
            age: candidate.age || 0,
            city: candidate.city,
            photos: candidate.photos || [],
            distance: candidate.distance,
          },
          reasons: ['Passport mode match'],
        })),
        nextCursor,
        passportLocation: {
          city: effectiveLocation.city,
          country: effectiveLocation.country || '',
        },
      };
    } catch (error) {
      logger.error('Failed to get passport discovery feed', error);
      throw error;
    }
  }

  // ==================== Private Helper Methods ====================

  private mapLocationFromDb(dbLocation: any): PassportLocation {
    return {
      id: dbLocation.id,
      userId: dbLocation.user_id,
      city: dbLocation.city,
      country: dbLocation.country,
      latitude: dbLocation.latitude,
      longitude: dbLocation.longitude,
      startDate: new Date(dbLocation.start_date),
      endDate: new Date(dbLocation.end_date),
      isActive: dbLocation.is_active,
    };
  }

  private async getUserTier(userId: string): Promise<string> {
    try {
      const response = await axios.get(`${this.paymentServiceUrl}/api/subscriptions/user/${userId}/tier`, {
        timeout: 5000,
      });
      return response.data?.tier || 'free';
    } catch (error) {
      return 'free';
    }
  }

  private async fetchUserPreferences(userId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.userServiceUrl}/api/users/${userId}/preferences`, {
        timeout: 5000,
      });
      return response.data || {};
    } catch (error) {
      return { ageMin: 18, ageMax: 99, maxDistance: 100 };
    }
  }

  private async getUserHomeLocation(userId: string): Promise<{
    latitude: number;
    longitude: number;
    city: string;
  }> {
    try {
      const response = await axios.get(`${this.userServiceUrl}/api/users/${userId}/location`, {
        timeout: 5000,
      });
      return response.data || { latitude: 0, longitude: 0, city: 'Unknown' };
    } catch (error) {
      return { latitude: 0, longitude: 0, city: 'Unknown' };
    }
  }

  private async updateUserEffectiveLocation(
    userId: string,
    latitude: number,
    longitude: number,
    city: string,
    country: string
  ): Promise<void> {
    try {
      await axios.put(`${this.userServiceUrl}/api/users/${userId}/effective-location`, {
        latitude,
        longitude,
        city,
        country,
        isPassportLocation: true,
      }, {
        timeout: 5000,
      });
    } catch (error) {
      logger.warn(`Failed to update effective location for ${userId}`);
    }
  }

  private async resetUserEffectiveLocation(userId: string): Promise<void> {
    try {
      await axios.delete(`${this.userServiceUrl}/api/users/${userId}/effective-location`, {
        timeout: 5000,
      });
    } catch (error) {
      logger.warn(`Failed to reset effective location for ${userId}`);
    }
  }

  private async getExcludedUserIds(userId: string): Promise<string[]> {
    const [swipes, matches, blocks] = await Promise.all([
      db('swipes').where({ swiper_id: userId }).select('swiped_id'),
      db('matches')
        .where((builder) => {
          builder.where({ user1_id: userId }).orWhere({ user2_id: userId });
        })
        .select('user1_id', 'user2_id'),
      db('user_blocks')
        .where((builder) => {
          builder.where({ blocker_id: userId }).orWhere({ blocked_id: userId });
        })
        .select('blocker_id', 'blocked_id'),
    ]);

    const excludedIds = new Set<string>();
    swipes.forEach((s) => excludedIds.add(s.swiped_id));
    matches.forEach((m) => {
      if (m.user1_id !== userId) excludedIds.add(m.user1_id);
      if (m.user2_id !== userId) excludedIds.add(m.user2_id);
    });
    blocks.forEach((b) => {
      if (b.blocker_id !== userId) excludedIds.add(b.blocker_id);
      if (b.blocked_id !== userId) excludedIds.add(b.blocked_id);
    });

    return Array.from(excludedIds);
  }

  private async fetchCandidatesNearLocation(
    userId: string,
    latitude: number,
    longitude: number,
    preferences: any,
    excludedUserIds: string[],
    limit: number,
    offset: number
  ): Promise<any[]> {
    try {
      const response = await axios.post(`${this.userServiceUrl}/api/users/search/by-location`, {
        latitude,
        longitude,
        radiusKm: preferences.maxDistance || 100,
        ageMin: preferences.ageMin || 18,
        ageMax: preferences.ageMax || 99,
        genderPreference: preferences.genderPreference,
        excludedUserIds: [...excludedUserIds, userId],
        limit,
        offset,
      }, {
        timeout: 10000,
      });
      return response.data || [];
    } catch (error) {
      logger.error('Failed to fetch candidates near location', error);
      return [];
    }
  }
}

export default new PassportModeService();
