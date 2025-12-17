/**
 * Geolocation Service
 * Handles location tracking for distance-based matching
 */

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { check, request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
}

export interface LocationError {
  code: number;
  message: string;
}

class GeolocationServiceClass {
  private watchId: number | null = null;

  /**
   * Request location permission
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Flamoral needs access to your location to show you nearby matches',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const permission: Permission = PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
        const result = await request(permission);
        return result === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Check if location permission is granted
   */
  async hasLocationPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return result;
      } else {
        const permission: Permission = PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
        const result = await check(permission);
        return result === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }

  /**
   * Get current position
   */
  async getCurrentPosition(): Promise<Location | null> {
    try {
      const hasPermission = await this.hasLocationPermission();

      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          Alert.alert(
            'Location Permission Required',
            'Please enable location services to find matches near you.',
            [{ text: 'OK' }]
          );
          return null;
        }
      }

      return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (position) => {
            const location: Location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude || undefined,
              heading: position.coords.heading || undefined,
              speed: position.coords.speed || undefined,
              timestamp: position.timestamp,
            };
            resolve(location);
          },
          (error) => {
            console.error('Error getting current position:', error);

            if (error.code === 1) {
              Alert.alert(
                'Location Access Denied',
                'Please enable location services in your device settings.'
              );
            } else if (error.code === 2) {
              Alert.alert(
                'Location Unavailable',
                'Unable to determine your location. Please check your device settings.'
              );
            } else if (error.code === 3) {
              Alert.alert(
                'Location Timeout',
                'Location request timed out. Please try again.'
              );
            }

            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
            forceRequestLocation: true,
            showLocationDialog: true,
          }
        );
      });
    } catch (error) {
      console.error('Error in getCurrentPosition:', error);
      return null;
    }
  }

  /**
   * Watch position changes
   */
  async watchPosition(
    onLocationChange: (location: Location) => void,
    onError?: (error: LocationError) => void
  ): Promise<boolean> {
    try {
      const hasPermission = await this.hasLocationPermission();

      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          return false;
        }
      }

      this.watchId = Geolocation.watchPosition(
        (position) => {
          const location: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp,
          };
          onLocationChange(location);
        },
        (error) => {
          console.error('Error watching position:', error);
          if (onError) {
            onError({
              code: error.code,
              message: error.message,
            });
          }
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 100, // Update every 100 meters
          interval: 30000, // Update every 30 seconds
          fastestInterval: 10000,
        }
      );

      return true;
    } catch (error) {
      console.error('Error in watchPosition:', error);
      return false;
    }
  }

  /**
   * Stop watching position
   */
  clearWatch(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Calculate distance in miles
   */
  calculateDistanceInMiles(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const distanceInKm = this.calculateDistance(lat1, lon1, lat2, lon2);
    return Math.round(distanceInKm * 0.621371 * 10) / 10; // Convert to miles
  }

  /**
   * Format distance for display
   */
  formatDistance(distanceInKm: number, useMetric: boolean = true): string {
    if (useMetric) {
      if (distanceInKm < 1) {
        return `${Math.round(distanceInKm * 1000)}m away`;
      }
      return `${Math.round(distanceInKm)}km away`;
    } else {
      const distanceInMiles = distanceInKm * 0.621371;
      if (distanceInMiles < 1) {
        return 'Less than a mile away';
      }
      return `${Math.round(distanceInMiles)} ${distanceInMiles === 1 ? 'mile' : 'miles'} away`;
    }
  }

  /**
   * Check if user is within a certain radius
   */
  isWithinRadius(
    userLat: number,
    userLon: number,
    targetLat: number,
    targetLon: number,
    radiusInKm: number
  ): boolean {
    const distance = this.calculateDistance(userLat, userLon, targetLat, targetLon);
    return distance <= radiusInKm;
  }

  /**
   * Get location from address using geocoding
   * Note: You'll need to integrate with a geocoding service like Google Maps API
   */
  async geocodeAddress(address: string): Promise<Location | null> {
    // This is a placeholder - implement with actual geocoding service
    console.warn('Geocoding not implemented. Please integrate with a geocoding service.');
    return null;
  }

  /**
   * Get address from coordinates using reverse geocoding
   * Note: You'll need to integrate with a geocoding service like Google Maps API
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    // This is a placeholder - implement with actual reverse geocoding service
    console.warn('Reverse geocoding not implemented. Please integrate with a geocoding service.');
    return null;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get bearing between two points
   */
  getBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = this.toRadians(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(this.toRadians(lat2));
    const x =
      Math.cos(this.toRadians(lat1)) * Math.sin(this.toRadians(lat2)) -
      Math.sin(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.cos(dLon);

    let bearing = Math.atan2(y, x);
    bearing = (bearing * 180) / Math.PI;
    bearing = (bearing + 360) % 360;

    return bearing;
  }

  /**
   * Get cardinal direction from bearing
   */
  getCardinalDirection(bearing: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }
}

export const GeolocationService = new GeolocationServiceClass();
