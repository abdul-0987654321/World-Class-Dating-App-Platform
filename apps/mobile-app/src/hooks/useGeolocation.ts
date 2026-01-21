/**
 * useGeolocation Hook
 * Custom hook for location services
 */

import { useState, useEffect, useCallback } from 'react';
import { GeolocationService, Location, LocationError } from '@services/location/GeolocationService';

interface UseGeolocationOptions {
  autoStart?: boolean;
  watch?: boolean;
}

interface UseGeolocationReturn {
  location: Location | null;
  loading: boolean;
  error: LocationError | null;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<void>;
  startWatching: () => Promise<void>;
  stopWatching: () => void;
  calculateDistance: (lat: number, lon: number) => number | null;
  formatDistance: (distanceInKm: number, useMetric?: boolean) => string;
}

export const useGeolocation = (options: UseGeolocationOptions = {}): UseGeolocationReturn => {
  const { autoStart = false, watch = false } = options;

  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LocationError | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  useEffect(() => {
    if (autoStart && hasPermission) {
      if (watch) {
        startWatching();
      } else {
        getCurrentLocation();
      }
    }

    return () => {
      if (watch) {
        stopWatching();
      }
    };
  }, [autoStart, hasPermission, watch]);

  const checkPermission = async () => {
    const granted = await GeolocationService.hasLocationPermission();
    setHasPermission(granted);
  };

  const requestPermission = useCallback(async () => {
    try {
      const granted = await GeolocationService.requestLocationPermission();
      setHasPermission(granted);
      return granted;
    } catch (err: any) {
      console.error('Error requesting location permission:', err);
      return false;
    }
  }, []);

  const getCurrentLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await GeolocationService.getCurrentPosition();

      if (result) {
        setLocation(result);
      }
    } catch (err: any) {
      const locationError: LocationError = {
        code: err.code || 0,
        message: err.message || 'Failed to get location',
      };
      setError(locationError);
      console.error('Error getting current location:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const startWatching = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const success = await GeolocationService.watchPosition(
        (newLocation) => {
          setLocation(newLocation);
          setLoading(false);
        },
        (watchError) => {
          setError(watchError);
          setLoading(false);
        }
      );

      if (!success) {
        setError({
          code: 0,
          message: 'Failed to start watching location',
        });
        setLoading(false);
      }
    } catch (err: any) {
      const locationError: LocationError = {
        code: err.code || 0,
        message: err.message || 'Failed to start watching location',
      };
      setError(locationError);
      setLoading(false);
    }
  }, []);

  const stopWatching = useCallback(() => {
    GeolocationService.clearWatch();
  }, []);

  const calculateDistance = useCallback(
    (lat: number, lon: number): number | null => {
      if (!location) return null;
      return GeolocationService.calculateDistance(location.latitude, location.longitude, lat, lon);
    },
    [location]
  );

  const formatDistance = useCallback((distanceInKm: number, useMetric: boolean = true): string => {
    return GeolocationService.formatDistance(distanceInKm, useMetric);
  }, []);

  return {
    location,
    loading,
    error,
    hasPermission,
    requestPermission,
    getCurrentLocation,
    startWatching,
    stopWatching,
    calculateDistance,
    formatDistance,
  };
};
