/**
 * Passport Mode Service
 * Handles passport/travel mode API interactions
 */

import { authTokenService } from './auth-token.service';
export interface PassportLocation {
  id?: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}

export interface PopularDestination {
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  activeUsers: number;
  timezone: string;
}

export interface PassportStatus {
  enabled: boolean;
  tier: string;
  activeLocation: PassportLocation | null;
  savedLocations: PassportLocation[];
  maxLocations: number;
  remainingDays: number;
}

class PassportService {
  private baseUrl = '/api/v1/discovery/passport';

  /**
   * Get passport mode status
   */
  async getStatus(): Promise<PassportStatus> {
    if (import.meta.env.VITE_MOCK_API === 'true' || import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
      return this.getMockStatus();
    }

    const response = await fetch(`${this.baseUrl}/status`, {
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get passport status');
    }

    const json = await response.json();
    const data = json.data || json;

    return {
      enabled: data.enabled,
      tier: data.tier,
      activeLocation: data.active_location
        ? {
            id: data.active_location.id,
            city: data.active_location.city,
            country: data.active_location.country,
            latitude: data.active_location.latitude,
            longitude: data.active_location.longitude,
            startDate: new Date(data.active_location.start_date),
            endDate: new Date(data.active_location.end_date),
            isActive: true,
          }
        : null,
      savedLocations: (data.saved_locations || []).map((loc: any) => ({
        id: loc.id,
        city: loc.city,
        country: loc.country,
        latitude: loc.latitude,
        longitude: loc.longitude,
        startDate: new Date(loc.start_date),
        endDate: new Date(loc.end_date),
        isActive: loc.is_active,
      })),
      maxLocations: data.max_locations,
      remainingDays: data.remaining_days,
    };
  }

  /**
   * Set passport location (teleport)
   */
  async setLocation(location: PassportLocation): Promise<PassportLocation> {
    if (import.meta.env.VITE_MOCK_API === 'true' || import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
      return {
        ...location,
        id: 'mock-location-id',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
      };
    }

    const response = await fetch(`${this.baseUrl}/location`, {
      method: 'POST',
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        city: location.city,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 402) {
        throw new Error('Passport mode requires Plus subscription or higher');
      }
      throw new Error(errorData.error || 'Failed to set location');
    }

    const json = await response.json();
    const data = json.data.location;

    return {
      id: data.id,
      city: data.city,
      country: data.country,
      latitude: data.latitude,
      longitude: data.longitude,
      startDate: new Date(data.start_date),
      endDate: new Date(data.end_date),
      isActive: true,
    };
  }

  /**
   * Deactivate passport mode
   */
  async deactivate(): Promise<void> {
    if (import.meta.env.VITE_MOCK_API === 'true' || import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
      return;
    }

    const response = await fetch(`${this.baseUrl}/location`, {
      method: 'DELETE',
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok && response.status !== 204) {
      throw new Error('Failed to deactivate passport mode');
    }
  }

  /**
   * Get popular destinations
   */
  async getPopularDestinations(): Promise<PopularDestination[]> {
    if (import.meta.env.VITE_MOCK_API === 'true' || import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
      return this.getMockDestinations();
    }

    const response = await fetch(`${this.baseUrl}/destinations`, {
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get popular destinations');
    }

    const json = await response.json();
    const data = json.data || json;

    return (data.destinations || []).map((dest: any) => ({
      city: dest.city,
      country: dest.country,
      countryCode: dest.country_code,
      latitude: dest.latitude,
      longitude: dest.longitude,
      activeUsers: dest.active_users,
      timezone: dest.timezone,
    }));
  }

  /**
   * Search locations
   */
  async searchLocations(query: string): Promise<PassportLocation[]> {
    if (import.meta.env.VITE_MOCK_API === 'true' || import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
      const destinations = this.getMockDestinations();
      const normalizedQuery = query.toLowerCase();
      return destinations
        .filter(
          (d) =>
            d.city.toLowerCase().includes(normalizedQuery) ||
            d.country.toLowerCase().includes(normalizedQuery)
        )
        .map((d) => ({
          city: d.city,
          country: d.country,
          latitude: d.latitude,
          longitude: d.longitude,
        }));
    }

    const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`, {
      headers: {
        ...authTokenService.getAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to search locations');
    }

    const json = await response.json();
    const data = json.data || json;

    return data.locations || [];
  }

  /**
   * Mock status for development
   */
  private getMockStatus(): PassportStatus {
    return {
      enabled: true,
      tier: 'plus',
      activeLocation: null,
      savedLocations: [],
      maxLocations: 1,
      remainingDays: 0,
    };
  }

  /**
   * Mock destinations for development
   */
  private getMockDestinations(): PopularDestination[] {
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
    ];
  }
}

export const passportService = new PassportService();
