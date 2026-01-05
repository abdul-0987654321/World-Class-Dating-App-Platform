import logger from '../utils/logger';

export interface LocationBoostConfig {
  radius: number; // km
  multiplier: number;
  priority: 'low' | 'medium' | 'high';
}

export interface LocationScore {
  distance: number;
  score: number;
  boosted: boolean;
  boostMultiplier?: number;
}

class LocationBoostService {
  private readonly DEFAULT_BOOST_ZONES = [
    { radius: 5, multiplier: 2.0, priority: 'high' as const },
    { radius: 10, multiplier: 1.5, priority: 'medium' as const },
    { radius: 25, multiplier: 1.2, priority: 'low' as const },
  ];

  /**
   * Calculate location-based boost
   */
  calculateLocationBoost(
    userLocation: { latitude: number; longitude: number },
    targetLocation: { latitude: number; longitude: number }
  ): LocationScore {
    const distance = this.calculateDistance(userLocation, targetLocation);

    // Find applicable boost zone
    const boostZone = this.findBoostZone(distance);

    if (boostZone) {
      const baseScore = this.getBaseLocationScore(distance);
      return {
        distance,
        score: Math.min(baseScore * boostZone.multiplier, 100),
        boosted: true,
        boostMultiplier: boostZone.multiplier,
      };
    }

    return {
      distance,
      score: this.getBaseLocationScore(distance),
      boosted: false,
    };
  }

  /**
   * Get boosted users in area
   */
  async getBoostedUsersInArea(
    centerLocation: { latitude: number; longitude: number },
    radius: number,
    limit: number = 50
  ): Promise<string[]> {
    // In production, query from geospatial index
    logger.debug('Fetching boosted users in area', { radius, limit });
    return [];
  }

  /**
   * Apply hot spot boost
   */
  applyHotSpotBoost(location: { latitude: number; longitude: number }): number {
    // Check if location is in a "hot spot" (areas with high activity)
    // In production, maintain real-time hot spot data
    return 1.0; // No boost by default
  }

  private findBoostZone(distance: number): LocationBoostConfig | null {
    return this.DEFAULT_BOOST_ZONES.find((zone) => distance <= zone.radius) || null;
  }

  private getBaseLocationScore(distance: number): number {
    if (distance <= 5) return 100;
    if (distance <= 10) return 90;
    if (distance <= 25) return 75;
    if (distance <= 50) return 60;
    if (distance <= 100) return 40;
    if (distance <= 200) return 20;
    return 10;
  }

  private calculateDistance(
    loc1: { latitude: number; longitude: number },
    loc2: { latitude: number; longitude: number }
  ): number {
    const R = 6371;
    const lat1 = (loc1.latitude * Math.PI) / 180;
    const lat2 = (loc2.latitude * Math.PI) / 180;
    const deltaLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const deltaLon = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

export const locationBoostService = new LocationBoostService();
export default locationBoostService;
