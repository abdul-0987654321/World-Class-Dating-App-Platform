/**
 * Google Places API Client
 * Provides venue search and details functionality using Google Places API
 */

import axios, { AxiosInstance } from 'axios';
import logger from '../../utils/logger';
import {
  Venue,
  VenueType,
  PriceRange,
  VenueMetadata,
  VENUE_TYPES,
  PRICE_RANGES,
  EXTERNAL_SOURCES,
} from '../../domain/entities/Venue.entity';
import { v4 as uuidv4 } from 'uuid';

export interface GooglePlacesConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface PlaceSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  price_level?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  types?: string[];
  opening_hours?: {
    open_now?: boolean;
  };
  user_ratings_total?: number;
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  url?: string;
  rating?: number;
  price_level?: number;
  user_ratings_total?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    weekday_text?: string[];
    open_now?: boolean;
  };
  types?: string[];
  reviews?: Array<{
    rating: number;
    text: string;
    author_name: string;
    time: number;
  }>;
}

export interface SearchVenuesParams {
  location: string;
  type?: VenueType;
  priceRange?: PriceRange;
  radius?: number;
  keyword?: string;
}

export class GooglePlacesClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config?: GooglePlacesConfig) {
    this.apiKey = config?.apiKey || process.env.GOOGLE_PLACES_API_KEY || '';
    const baseUrl = config?.baseUrl || 'https://maps.googleapis.com/maps/api/place';

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
    });
  }

  /**
   * Check if the client is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Search for venues based on location and preferences
   */
  async searchVenues(params: SearchVenuesParams): Promise<Venue[]> {
    if (!this.isConfigured()) {
      logger.warn('Google Places API key not configured, returning mock data');
      return this.getMockVenues(params);
    }

    try {
      const placeType = this.mapVenueTypeToGoogleType(params.type);
      const searchParams: Record<string, string | number> = {
        key: this.apiKey,
        query: params.keyword || this.getDefaultQuery(params.type),
        location: params.location,
        radius: params.radius || 5000,
      };

      if (placeType) {
        searchParams.type = placeType;
      }

      if (params.priceRange) {
        const priceLevel = this.mapPriceRangeToPriceLevel(params.priceRange);
        if (priceLevel !== undefined) {
          searchParams.minprice = Math.max(0, priceLevel - 1);
          searchParams.maxprice = Math.min(4, priceLevel + 1);
        }
      }

      const response = await this.client.get('/textsearch/json', { params: searchParams });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        logger.error('Google Places API error:', response.data);
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      const results: PlaceSearchResult[] = response.data.results || [];
      return results.slice(0, 20).map((place) => this.mapPlaceToVenue(place, params.type));
    } catch (error: any) {
      logger.error('Error searching venues:', error.message);
      // Return mock data on error for development
      return this.getMockVenues(params);
    }
  }

  /**
   * Get detailed information about a specific venue
   */
  async getVenueDetails(placeId: string): Promise<Venue | null> {
    if (!this.isConfigured()) {
      logger.warn('Google Places API key not configured');
      return null;
    }

    try {
      const response = await this.client.get('/details/json', {
        params: {
          key: this.apiKey,
          place_id: placeId,
          fields: 'place_id,name,formatted_address,formatted_phone_number,website,url,rating,price_level,user_ratings_total,photos,geometry,opening_hours,types,reviews',
        },
      });

      if (response.data.status !== 'OK') {
        logger.error('Google Places API error:', response.data);
        return null;
      }

      const place: PlaceDetails = response.data.result;
      return this.mapPlaceDetailsToVenue(place);
    } catch (error: any) {
      logger.error('Error getting venue details:', error.message);
      return null;
    }
  }

  /**
   * Get photos for a venue
   */
  async getVenuePhotos(placeId: string, maxPhotos: number = 5): Promise<string[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      // First get place details to get photo references
      const response = await this.client.get('/details/json', {
        params: {
          key: this.apiKey,
          place_id: placeId,
          fields: 'photos',
        },
      });

      if (response.data.status !== 'OK' || !response.data.result?.photos) {
        return [];
      }

      const photos = response.data.result.photos.slice(0, maxPhotos);
      return photos.map((photo: { photo_reference: string }) =>
        this.getPhotoUrl(photo.photo_reference)
      );
    } catch (error: any) {
      logger.error('Error getting venue photos:', error.message);
      return [];
    }
  }

  /**
   * Get a photo URL from a photo reference
   */
  getPhotoUrl(photoReference: string, maxWidth: number = 800): string {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${this.apiKey}`;
  }

  /**
   * Map Google Place to Venue entity
   */
  private mapPlaceToVenue(place: PlaceSearchResult, type?: VenueType): Venue {
    const venueType = type || this.inferVenueType(place.types || []);
    const city = this.extractCityFromAddress(place.formatted_address);

    return {
      id: uuidv4(),
      name: place.name,
      type: venueType,
      address: place.formatted_address,
      city,
      priceRange: this.mapPriceLevelToPriceRange(place.price_level),
      rating: place.rating,
      imageUrl: place.photos?.[0] ? this.getPhotoUrl(place.photos[0].photo_reference) : undefined,
      externalId: place.place_id,
      externalSource: EXTERNAL_SOURCES.GOOGLE,
      metadata: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        reviews: place.user_ratings_total,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Map Google Place Details to Venue entity
   */
  private mapPlaceDetailsToVenue(place: PlaceDetails): Venue {
    const venueType = this.inferVenueType(place.types || []);
    const city = this.extractCityFromAddress(place.formatted_address);

    const metadata: VenueMetadata = {
      phone: place.formatted_phone_number,
      website: place.website,
      googleMapsUrl: place.url,
      hours: place.opening_hours?.weekday_text,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      reviews: place.user_ratings_total,
      photos: place.photos?.slice(0, 10).map((p) => this.getPhotoUrl(p.photo_reference)),
    };

    return {
      id: uuidv4(),
      name: place.name,
      type: venueType,
      address: place.formatted_address,
      city,
      priceRange: this.mapPriceLevelToPriceRange(place.price_level),
      rating: place.rating,
      imageUrl: place.photos?.[0] ? this.getPhotoUrl(place.photos[0].photo_reference) : undefined,
      externalId: place.place_id,
      externalSource: EXTERNAL_SOURCES.GOOGLE,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Map venue type to Google Places type
   */
  private mapVenueTypeToGoogleType(type?: VenueType): string | undefined {
    const mapping: Record<VenueType, string> = {
      restaurant: 'restaurant',
      bar: 'bar',
      activity: 'tourist_attraction',
      entertainment: 'night_club',
    };
    return type ? mapping[type] : undefined;
  }

  /**
   * Get default search query based on venue type
   */
  private getDefaultQuery(type?: VenueType): string {
    const queries: Record<VenueType, string> = {
      restaurant: 'romantic restaurant',
      bar: 'cocktail bar',
      activity: 'fun activities for couples',
      entertainment: 'entertainment venue',
    };
    return type ? queries[type] : 'date night';
  }

  /**
   * Infer venue type from Google place types
   */
  private inferVenueType(types: string[]): VenueType {
    if (types.includes('restaurant') || types.includes('cafe') || types.includes('bakery')) {
      return VENUE_TYPES.RESTAURANT;
    }
    if (types.includes('bar') || types.includes('night_club')) {
      return VENUE_TYPES.BAR;
    }
    if (types.includes('tourist_attraction') || types.includes('park') || types.includes('museum')) {
      return VENUE_TYPES.ACTIVITY;
    }
    if (types.includes('movie_theater') || types.includes('bowling_alley') || types.includes('amusement_park')) {
      return VENUE_TYPES.ENTERTAINMENT;
    }
    return VENUE_TYPES.RESTAURANT;
  }

  /**
   * Map Google price level (0-4) to our price range
   */
  private mapPriceLevelToPriceRange(priceLevel?: number): PriceRange {
    if (priceLevel === undefined) return PRICE_RANGES.MODERATE;
    if (priceLevel <= 1) return PRICE_RANGES.BUDGET;
    if (priceLevel === 2) return PRICE_RANGES.MODERATE;
    if (priceLevel === 3) return PRICE_RANGES.UPSCALE;
    return PRICE_RANGES.LUXURY;
  }

  /**
   * Map our price range to Google price level
   */
  private mapPriceRangeToPriceLevel(priceRange: PriceRange): number {
    const mapping: Record<PriceRange, number> = {
      budget: 1,
      moderate: 2,
      upscale: 3,
      luxury: 4,
    };
    return mapping[priceRange];
  }

  /**
   * Extract city from formatted address
   */
  private extractCityFromAddress(address: string): string {
    const parts = address.split(',');
    if (parts.length >= 2) {
      return parts[parts.length - 2].trim();
    }
    return parts[0];
  }

  /**
   * Get mock venues for development/testing
   */
  private getMockVenues(params: SearchVenuesParams): Venue[] {
    const mockVenues: Venue[] = [
      {
        id: uuidv4(),
        name: 'The Romantic Garden Restaurant',
        type: VENUE_TYPES.RESTAURANT,
        address: '123 Love Lane, Downtown',
        city: 'New York',
        priceRange: PRICE_RANGES.UPSCALE,
        rating: 4.7,
        imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
        externalId: 'mock-1',
        externalSource: EXTERNAL_SOURCES.MANUAL,
        metadata: {
          phone: '+1 (555) 123-4567',
          cuisine: ['Italian', 'Mediterranean'],
          hours: ['Mon-Sun: 5:00 PM - 11:00 PM'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Moonlight Cocktail Lounge',
        type: VENUE_TYPES.BAR,
        address: '456 Starry Avenue, Midtown',
        city: 'New York',
        priceRange: PRICE_RANGES.UPSCALE,
        rating: 4.5,
        imageUrl: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800',
        externalId: 'mock-2',
        externalSource: EXTERNAL_SOURCES.MANUAL,
        metadata: {
          phone: '+1 (555) 234-5678',
          amenities: ['Live Music', 'Rooftop'],
          hours: ['Mon-Thu: 6:00 PM - 1:00 AM', 'Fri-Sat: 6:00 PM - 2:00 AM'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Sunset Kayak Adventures',
        type: VENUE_TYPES.ACTIVITY,
        address: '789 Harbor Drive, Waterfront',
        city: 'New York',
        priceRange: PRICE_RANGES.MODERATE,
        rating: 4.8,
        imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
        externalId: 'mock-3',
        externalSource: EXTERNAL_SOURCES.MANUAL,
        metadata: {
          phone: '+1 (555) 345-6789',
          amenities: ['Equipment Provided', 'Sunset Tours'],
          hours: ['Daily: 4:00 PM - 8:00 PM'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'The Comedy Underground',
        type: VENUE_TYPES.ENTERTAINMENT,
        address: '321 Laugh Street, Theater District',
        city: 'New York',
        priceRange: PRICE_RANGES.MODERATE,
        rating: 4.6,
        imageUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800',
        externalId: 'mock-4',
        externalSource: EXTERNAL_SOURCES.MANUAL,
        metadata: {
          phone: '+1 (555) 456-7890',
          amenities: ['Full Bar', 'VIP Seating'],
          hours: ['Wed-Sun: 7:00 PM - 11:00 PM'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Château Excellence',
        type: VENUE_TYPES.RESTAURANT,
        address: '555 Fifth Avenue, Upper East Side',
        city: 'New York',
        priceRange: PRICE_RANGES.LUXURY,
        rating: 4.9,
        imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
        externalId: 'mock-5',
        externalSource: EXTERNAL_SOURCES.MANUAL,
        metadata: {
          phone: '+1 (555) 567-8901',
          cuisine: ['French', 'Fine Dining'],
          hours: ['Tue-Sat: 6:00 PM - 10:00 PM'],
          amenities: ['Michelin Star', 'Tasting Menu', 'Wine Pairing'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Filter by type if specified
    let filtered = mockVenues;
    if (params.type) {
      filtered = filtered.filter((v) => v.type === params.type);
    }

    // Filter by price range if specified
    if (params.priceRange) {
      filtered = filtered.filter((v) => v.priceRange === params.priceRange);
    }

    return filtered;
  }
}

// Singleton instance
let googlePlacesClient: GooglePlacesClient | null = null;

export function getGooglePlacesClient(): GooglePlacesClient {
  if (!googlePlacesClient) {
    googlePlacesClient = new GooglePlacesClient();
  }
  return googlePlacesClient;
}
