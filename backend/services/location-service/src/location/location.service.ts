import { Injectable } from '@nestjs/common';
import * as geolib from 'geolib';
import * as turf from '@turf/turf';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface UserLocation {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
  isApproximate: boolean;
}

export interface NearbyUser {
  userId: string;
  distance: number;
  distanceUnit: 'km' | 'miles';
}

export interface LocationPrivacySettings {
  userId: string;
  showExactLocation: boolean;
  hideDistance: boolean;
  locationBlurRadius: number;
  allowLocationTracking: boolean;
  shareLocationWithMatches: boolean;
}

// In-memory storage (in production, use Redis or database)
const userLocations = new Map<string, UserLocation>();
const privacySettings = new Map<string, LocationPrivacySettings>();

@Injectable()
export class LocationService {
  /**
   * Update a user's current location
   */
  async updateUserLocation(
    userId: string,
    latitude: number,
    longitude: number,
    accuracy?: number
  ): Promise<UserLocation> {
    // Validate coordinates
    if (!this.isValidCoordinate(latitude, longitude)) {
      throw new Error('Invalid coordinates provided');
    }

    const settings = await this.getLocationPrivacySettings(userId);

    // Apply location blur if not showing exact location
    let finalLatitude = latitude;
    let finalLongitude = longitude;
    let isApproximate = false;

    if (!settings.showExactLocation && settings.locationBlurRadius > 0) {
      const blurred = this.blurLocation(latitude, longitude, settings.locationBlurRadius);
      finalLatitude = blurred.latitude;
      finalLongitude = blurred.longitude;
      isApproximate = true;
    }

    const userLocation: UserLocation = {
      userId,
      latitude: finalLatitude,
      longitude: finalLongitude,
      accuracy,
      timestamp: new Date(),
      isApproximate,
    };

    userLocations.set(userId, userLocation);

    return userLocation;
  }

  /**
   * Get users within a specified radius of given coordinates
   */
  async getNearbyUsers(
    latitude: number,
    longitude: number,
    radiusKm: number,
    excludeUserId?: string
  ): Promise<NearbyUser[]> {
    if (!this.isValidCoordinate(latitude, longitude)) {
      throw new Error('Invalid coordinates provided');
    }

    if (radiusKm <= 0 || radiusKm > 500) {
      throw new Error('Radius must be between 0 and 500 km');
    }

    const nearbyUsers: NearbyUser[] = [];
    const centerPoint = { latitude, longitude };

    for (const [userId, location] of userLocations.entries()) {
      // Skip the requesting user
      if (excludeUserId && userId === excludeUserId) {
        continue;
      }

      // Check privacy settings
      const settings = await this.getLocationPrivacySettings(userId);
      if (settings.hideDistance) {
        continue;
      }

      const userPoint = { latitude: location.latitude, longitude: location.longitude };
      const distanceMeters = geolib.getDistance(centerPoint, userPoint);
      const distanceKm = distanceMeters / 1000;

      if (distanceKm <= radiusKm) {
        nearbyUsers.push({
          userId,
          distance: Math.round(distanceKm * 10) / 10,
          distanceUnit: 'km',
        });
      }
    }

    // Sort by distance (closest first)
    nearbyUsers.sort((a, b) => a.distance - b.distance);

    return nearbyUsers;
  }

  /**
   * Calculate distance between two users
   */
  async calculateDistance(
    user1Id: string,
    user2Id: string
  ): Promise<{ distance: number; unit: 'km' | 'miles' } | null> {
    const user1Location = userLocations.get(user1Id);
    const user2Location = userLocations.get(user2Id);

    if (!user1Location || !user2Location) {
      return null;
    }

    // Check privacy settings for both users
    const user1Settings = await this.getLocationPrivacySettings(user1Id);
    const user2Settings = await this.getLocationPrivacySettings(user2Id);

    if (user1Settings.hideDistance || user2Settings.hideDistance) {
      return null;
    }

    const point1 = { latitude: user1Location.latitude, longitude: user1Location.longitude };
    const point2 = { latitude: user2Location.latitude, longitude: user2Location.longitude };

    const distanceMeters = geolib.getDistance(point1, point2);
    const distanceKm = distanceMeters / 1000;

    return {
      distance: Math.round(distanceKm * 10) / 10,
      unit: 'km',
    };
  }

  /**
   * Get location privacy settings for a user
   */
  async getLocationPrivacySettings(userId: string): Promise<LocationPrivacySettings> {
    const existing = privacySettings.get(userId);

    if (existing) {
      return existing;
    }

    // Return default settings if none exist
    const defaultSettings: LocationPrivacySettings = {
      userId,
      showExactLocation: false,
      hideDistance: false,
      locationBlurRadius: 1, // 1 km blur by default
      allowLocationTracking: true,
      shareLocationWithMatches: true,
    };

    privacySettings.set(userId, defaultSettings);
    return defaultSettings;
  }

  /**
   * Update location privacy settings for a user
   */
  async updateLocationPrivacySettings(
    userId: string,
    settings: Partial<LocationPrivacySettings>
  ): Promise<LocationPrivacySettings> {
    const current = await this.getLocationPrivacySettings(userId);

    const updated: LocationPrivacySettings = {
      ...current,
      ...settings,
      userId, // Ensure userId is not overwritten
    };

    privacySettings.set(userId, updated);
    return updated;
  }

  /**
   * Get a user's current location
   */
  async getUserLocation(userId: string): Promise<UserLocation | null> {
    return userLocations.get(userId) || null;
  }

  /**
   * Delete a user's location data
   */
  async deleteUserLocation(userId: string): Promise<boolean> {
    return userLocations.delete(userId);
  }

  /**
   * Check if user is within a geofenced area
   */
  async isWithinGeofence(
    userId: string,
    geofenceCenter: Coordinates,
    radiusKm: number
  ): Promise<boolean> {
    const userLocation = userLocations.get(userId);

    if (!userLocation) {
      return false;
    }

    const distanceMeters = geolib.getDistance(
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
      { latitude: geofenceCenter.latitude, longitude: geofenceCenter.longitude }
    );

    return distanceMeters <= radiusKm * 1000;
  }

  /**
   * Calculate bounding box for a given center point and radius
   */
  getBoundingBox(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
    const bounds = geolib.getBounds([
      geolib.computeDestinationPoint({ latitude, longitude }, radiusKm * 1000, 0),
      geolib.computeDestinationPoint({ latitude, longitude }, radiusKm * 1000, 90),
      geolib.computeDestinationPoint({ latitude, longitude }, radiusKm * 1000, 180),
      geolib.computeDestinationPoint({ latitude, longitude }, radiusKm * 1000, 270),
    ]);

    return {
      minLat: bounds.minLat,
      maxLat: bounds.maxLat,
      minLng: bounds.minLng,
      maxLng: bounds.maxLng,
    };
  }

  /**
   * Use Turf.js to calculate area of intersection between two circles
   */
  calculateOverlapArea(
    center1: Coordinates,
    radius1Km: number,
    center2: Coordinates,
    radius2Km: number
  ): number {
    const circle1 = turf.circle([center1.longitude, center1.latitude], radius1Km, { units: 'kilometers' });
    const circle2 = turf.circle([center2.longitude, center2.latitude], radius2Km, { units: 'kilometers' });

    try {
      const intersection = turf.intersect(turf.featureCollection([circle1, circle2]));
      if (intersection) {
        return turf.area(intersection) / 1000000; // Convert to square km
      }
    } catch (error) {
      // No intersection
    }

    return 0;
  }

  /**
   * Validate coordinates
   */
  private isValidCoordinate(latitude: number, longitude: number): boolean {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    );
  }

  /**
   * Blur location by adding random offset within radius
   */
  private blurLocation(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): Coordinates {
    // Generate random bearing (0-360 degrees)
    const bearing = Math.random() * 360;
    // Generate random distance within radius
    const distance = Math.random() * radiusKm * 1000; // Convert to meters

    const blurred = geolib.computeDestinationPoint(
      { latitude, longitude },
      distance,
      bearing
    );

    return {
      latitude: blurred.latitude,
      longitude: blurred.longitude,
    };
  }
}
