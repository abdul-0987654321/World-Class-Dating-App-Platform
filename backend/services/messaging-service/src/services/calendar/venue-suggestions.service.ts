/**
 * Venue Suggestions Service
 * Provides venue recommendations for dates using Google Places API
 */

import { Container } from '@azure/cosmos';
import axios, { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';

import { calendarConfig } from '../../config/calendar.config';
import cosmosClient from '../../infrastructure/database/cosmos-client';
import {
  VenueSuggestion,
  VenueCategory,
  VenueBookmark,
  VenueSearchParams,
} from '../../types/calendar.types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('venue-suggestions-service');

/**
 * Google Places API types mapping
 */
const CATEGORY_TO_PLACE_TYPES: Record<VenueCategory, string[]> = {
  [VenueCategory.RESTAURANT]: ['restaurant'],
  [VenueCategory.CAFE]: ['cafe'],
  [VenueCategory.BAR]: ['bar', 'night_club'],
  [VenueCategory.PARK]: ['park'],
  [VenueCategory.MUSEUM]: ['museum', 'art_gallery'],
  [VenueCategory.MOVIE_THEATER]: ['movie_theater'],
  [VenueCategory.CONCERT_VENUE]: ['stadium', 'performing_arts_theater'],
  [VenueCategory.SPORTS_VENUE]: ['stadium', 'gym', 'bowling_alley'],
  [VenueCategory.ACTIVITY_CENTER]: ['amusement_park', 'zoo', 'aquarium', 'escape_room'],
  [VenueCategory.OTHER]: ['point_of_interest'],
};

/**
 * Default date-friendly place types
 */
const DATE_FRIENDLY_TYPES = [
  'restaurant',
  'cafe',
  'bar',
  'park',
  'museum',
  'movie_theater',
  'art_gallery',
  'bowling_alley',
  'amusement_park',
  'zoo',
  'aquarium',
];

/**
 * Venue Suggestions Service
 */
export class VenueSuggestionsService {
  private bookmarksContainer: Container | null = null;
  private initialized = false;

  /**
   * Initialize containers
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      const database = cosmosClient['database'];
      if (!database) {
        throw new Error('Cosmos DB not initialized');
      }

      const { container } = await database.containers.createIfNotExists({
        id: 'VenueBookmarks',
        partitionKey: '/userId',
      });
      this.bookmarksContainer = container;

      this.initialized = true;
      logger.info('VenueSuggestionsService initialized');
    } catch (error) {
      logger.error('Failed to initialize VenueSuggestionsService:', error);
      throw error;
    }
  }

  /**
   * Search for venues using Google Places API
   */
  async searchVenues(params: VenueSearchParams): Promise<VenueSuggestion[]> {
    const apiKey = calendarConfig.googlePlaces.apiKey;
    if (!apiKey) {
      logger.warn('Google Places API key not configured, returning mock data');
      return this.getMockVenues(params);
    }

    try {
      logger.info('Searching venues with params:', params);

      // Determine place types based on category
      let types: string[] = DATE_FRIENDLY_TYPES;
      if (params.category) {
        types = CATEGORY_TO_PLACE_TYPES[params.category] || DATE_FRIENDLY_TYPES;
      }

      const radius = Math.min(
        params.radius || calendarConfig.venues.defaultSearchRadius,
        calendarConfig.venues.maxSearchRadius
      );

      // Build nearby search request
      const searchParams: Record<string, string> = {
        location: `${params.latitude},${params.longitude}`,
        radius: radius.toString(),
        type: types[0], // Primary type
        key: apiKey,
      };

      if (params.query) {
        searchParams.keyword = params.query;
      }

      if (params.openNow) {
        searchParams.opennow = 'true';
      }

      if (params.minRating) {
        searchParams.minprice = '0';
      }

      // Execute nearby search
      const response = await axios.get(`${calendarConfig.googlePlaces.baseUrl}/nearbysearch/json`, {
        params: searchParams,
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        logger.error('Google Places API error:', response.data.status);
        throw new Error(`Places API error: ${response.data.status}`);
      }

      const places = response.data.results || [];
      const limit = params.limit || calendarConfig.venues.resultsLimit;

      // Filter and transform results
      let venues: VenueSuggestion[] = places
        .filter((place: any) => {
          if (params.minRating && place.rating < params.minRating) return false;
          if (params.maxPriceLevel && place.price_level > params.maxPriceLevel) return false;
          return true;
        })
        .slice(0, limit)
        .map((place: any) => this.transformPlaceToVenue(place));

      // Fetch additional details for top results
      const detailedVenues = await Promise.all(
        venues.slice(0, 5).map(async (venue) => {
          if (venue.placeId) {
            const details = await this.getPlaceDetails(venue.placeId);
            return { ...venue, ...details };
          }
          return venue;
        })
      );

      // Combine detailed and basic venues
      venues = [...detailedVenues, ...venues.slice(5)];

      logger.info(`Found ${venues.length} venues`);
      return venues;
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error('Failed to search venues:', axiosError.message);
      throw new Error(`Failed to search venues: ${axiosError.message}`);
    }
  }

  /**
   * Get detailed information about a specific place
   */
  async getPlaceDetails(placeId: string): Promise<Partial<VenueSuggestion>> {
    const apiKey = calendarConfig.googlePlaces.apiKey;
    if (!apiKey) {
      return {};
    }

    try {
      const response = await axios.get(`${calendarConfig.googlePlaces.baseUrl}/details/json`, {
        params: {
          place_id: placeId,
          fields: 'formatted_phone_number,website,opening_hours,reviews,photos',
          key: apiKey,
        },
      });

      if (response.data.status !== 'OK') {
        return {};
      }

      const result = response.data.result;
      const details: Partial<VenueSuggestion> = {};

      if (result.formatted_phone_number) {
        details.phoneNumber = result.formatted_phone_number;
      }

      if (result.website) {
        details.website = result.website;
      }

      if (result.opening_hours?.weekday_text) {
        details.openingHours = {};
        result.opening_hours.weekday_text.forEach((text: string) => {
          const [day, hours] = text.split(': ');
          if (day && hours) {
            details.openingHours[day] = hours;
          }
        });
      }

      if (result.photos?.[0]?.photo_reference) {
        details.imageUrl = `${calendarConfig.googlePlaces.baseUrl}/photo?maxwidth=400&photoreference=${result.photos[0].photo_reference}&key=${apiKey}`;
      }

      return details;
    } catch (error) {
      logger.warn('Failed to get place details:', error);
      return {};
    }
  }

  /**
   * Get recommended venues based on user preferences and date type
   */
  async getRecommendedVenues(
    latitude: number,
    longitude: number,
    options?: {
      dateType?: 'first_date' | 'casual' | 'romantic' | 'activity';
      timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
      budget?: 'low' | 'medium' | 'high';
    }
  ): Promise<VenueSuggestion[]> {
    // Determine categories based on date type
    let categories: VenueCategory[] = [];
    let maxPriceLevel: number | undefined;

    switch (options?.dateType) {
      case 'first_date':
        categories = [VenueCategory.CAFE, VenueCategory.RESTAURANT, VenueCategory.BAR];
        break;
      case 'casual':
        categories = [VenueCategory.CAFE, VenueCategory.PARK, VenueCategory.ACTIVITY_CENTER];
        break;
      case 'romantic':
        categories = [VenueCategory.RESTAURANT, VenueCategory.BAR, VenueCategory.CONCERT_VENUE];
        break;
      case 'activity':
        categories = [
          VenueCategory.ACTIVITY_CENTER,
          VenueCategory.SPORTS_VENUE,
          VenueCategory.PARK,
        ];
        break;
      default:
        categories = [VenueCategory.RESTAURANT, VenueCategory.CAFE, VenueCategory.BAR];
    }

    // Adjust for time of day
    if (options?.timeOfDay === 'morning') {
      categories = [VenueCategory.CAFE, VenueCategory.PARK, VenueCategory.MUSEUM];
    } else if (options?.timeOfDay === 'night') {
      categories = [VenueCategory.BAR, VenueCategory.RESTAURANT, VenueCategory.CONCERT_VENUE];
    }

    // Set budget filter
    switch (options?.budget) {
      case 'low':
        maxPriceLevel = 1;
        break;
      case 'medium':
        maxPriceLevel = 2;
        break;
      case 'high':
        maxPriceLevel = 4;
        break;
    }

    // Search for each category and combine results
    const venuesByCategory = await Promise.all(
      categories.map((category) =>
        this.searchVenues({
          latitude,
          longitude,
          category,
          maxPriceLevel,
          minRating: 4.0,
          limit: 5,
        })
      )
    );

    // Combine and deduplicate
    const allVenues: VenueSuggestion[] = [];
    const seenIds = new Set<string>();

    for (const venues of venuesByCategory) {
      for (const venue of venues) {
        if (!seenIds.has(venue.id)) {
          seenIds.add(venue.id);
          allVenues.push(venue);
        }
      }
    }

    // Sort by rating
    allVenues.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    return allVenues.slice(0, 10);
  }

  /**
   * Transform Google Places result to VenueSuggestion
   */
  private transformPlaceToVenue(place: any): VenueSuggestion {
    return {
      id: uuidv4(),
      name: place.name,
      category: this.inferCategory(place.types),
      address: place.vicinity || place.formatted_address || '',
      city: this.extractCity(place),
      country: 'USA', // Default, would need geocoding for accuracy
      coordinates: place.geometry?.location
        ? {
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
          }
        : undefined,
      placeId: place.place_id,
      rating: place.rating,
      priceLevel: place.price_level,
      imageUrl: place.photos?.[0]?.photo_reference
        ? `${calendarConfig.googlePlaces.baseUrl}/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${calendarConfig.googlePlaces.apiKey}`
        : undefined,
    };
  }

  /**
   * Infer venue category from Google Places types
   */
  private inferCategory(types: string[]): VenueCategory {
    if (!types || types.length === 0) return VenueCategory.OTHER;

    for (const [category, placeTypes] of Object.entries(CATEGORY_TO_PLACE_TYPES)) {
      if (types.some((t) => placeTypes.includes(t))) {
        return category as VenueCategory;
      }
    }

    return VenueCategory.OTHER;
  }

  /**
   * Extract city from place data
   */
  private extractCity(place: any): string {
    if (!place.address_components) {
      // Try to extract from vicinity
      const parts = (place.vicinity || '').split(',');
      return parts[parts.length - 1]?.trim() || 'Unknown';
    }

    const cityComponent = place.address_components.find(
      (c: any) => c.types.includes('locality') || c.types.includes('sublocality')
    );

    return cityComponent?.long_name || 'Unknown';
  }

  /**
   * Get mock venues when API is not available
   */
  private getMockVenues(params: VenueSearchParams): VenueSuggestion[] {
    const mockVenues: VenueSuggestion[] = [
      {
        id: uuidv4(),
        name: 'The Cozy Corner Cafe',
        category: VenueCategory.CAFE,
        address: '123 Main Street',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        postalCode: '94102',
        coordinates: {
          latitude: params.latitude + 0.001,
          longitude: params.longitude + 0.001,
        },
        rating: 4.5,
        priceLevel: 2,
        phoneNumber: '(415) 555-0123',
        website: 'https://example.com/cafe',
      },
      {
        id: uuidv4(),
        name: 'Sunset Italian Restaurant',
        category: VenueCategory.RESTAURANT,
        address: '456 Oak Avenue',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        postalCode: '94103',
        coordinates: {
          latitude: params.latitude + 0.002,
          longitude: params.longitude - 0.001,
        },
        rating: 4.7,
        priceLevel: 3,
        phoneNumber: '(415) 555-0456',
        website: 'https://example.com/restaurant',
      },
      {
        id: uuidv4(),
        name: 'Golden Gate Park',
        category: VenueCategory.PARK,
        address: '501 Stanyan Street',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        postalCode: '94117',
        coordinates: {
          latitude: params.latitude - 0.003,
          longitude: params.longitude + 0.002,
        },
        rating: 4.8,
        priceLevel: 0,
      },
      {
        id: uuidv4(),
        name: 'The Velvet Lounge',
        category: VenueCategory.BAR,
        address: '789 Market Street',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        postalCode: '94104',
        coordinates: {
          latitude: params.latitude + 0.001,
          longitude: params.longitude - 0.002,
        },
        rating: 4.3,
        priceLevel: 2,
        phoneNumber: '(415) 555-0789',
      },
      {
        id: uuidv4(),
        name: 'Modern Art Museum',
        category: VenueCategory.MUSEUM,
        address: '151 Third Street',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        postalCode: '94103',
        coordinates: {
          latitude: params.latitude - 0.001,
          longitude: params.longitude - 0.001,
        },
        rating: 4.6,
        priceLevel: 2,
        website: 'https://example.com/museum',
      },
    ];

    // Filter by category if specified
    let filtered = mockVenues;
    if (params.category) {
      filtered = mockVenues.filter((v) => v.category === params.category);
    }

    // Filter by rating
    if (params.minRating) {
      filtered = filtered.filter((v) => (v.rating || 0) >= params.minRating);
    }

    // Filter by price
    if (params.maxPriceLevel) {
      filtered = filtered.filter((v) => (v.priceLevel || 0) <= params.maxPriceLevel);
    }

    // Apply limit
    const limit = params.limit || calendarConfig.venues.resultsLimit;
    return filtered.slice(0, limit);
  }

  // ============================================================================
  // BOOKMARK METHODS
  // ============================================================================

  /**
   * Bookmark a venue for a user
   */
  async bookmarkVenue(
    userId: string,
    venue: VenueSuggestion,
    notes?: string
  ): Promise<VenueBookmark> {
    await this.ensureInitialized();

    const now = new Date();
    const bookmark: VenueBookmark = {
      id: uuidv4(),
      userId,
      venue,
      category: venue.category,
      notes,
      createdAt: now,
    };

    await this.bookmarksContainer.items.create(bookmark);
    logger.info(`Created bookmark ${bookmark.id} for user ${userId}`);

    return bookmark;
  }

  /**
   * Remove a venue bookmark
   */
  async removeBookmark(userId: string, bookmarkId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.bookmarksContainer.item(bookmarkId, userId).delete();
      logger.info(`Deleted bookmark ${bookmarkId}`);
    } catch (error) {
      logger.warn('Failed to delete bookmark:', error);
      throw new Error('Bookmark not found');
    }
  }

  /**
   * Get user's bookmarked venues
   */
  async getBookmarks(
    userId: string,
    options?: { category?: VenueCategory; limit?: number; offset?: number }
  ): Promise<VenueBookmark[]> {
    await this.ensureInitialized();

    let query = 'SELECT * FROM c WHERE c.userId = @userId';
    const parameters: { name: string; value: any }[] = [{ name: '@userId', value: userId }];

    if (options?.category) {
      query += ' AND c.category = @category';
      parameters.push({ name: '@category', value: options.category });
    }

    query += ' ORDER BY c.createdAt DESC';

    if (options?.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    if (options?.limit) {
      query += ` LIMIT ${options.limit}`;
    }

    const { resources } = await this.bookmarksContainer.items
      .query({
        query,
        parameters,
      })
      .fetchAll();

    return resources;
  }

  /**
   * Check if a venue is bookmarked by user
   */
  async isBookmarked(userId: string, venueId: string): Promise<boolean> {
    await this.ensureInitialized();

    const query = {
      query: 'SELECT VALUE COUNT(1) FROM c WHERE c.userId = @userId AND c.venue.id = @venueId',
      parameters: [
        { name: '@userId', value: userId },
        { name: '@venueId', value: venueId },
      ],
    };

    const { resources } = await this.bookmarksContainer.items.query(query).fetchAll();
    return (resources[0] || 0) > 0;
  }
}

// Export singleton instance
export const venueSuggestionsService = new VenueSuggestionsService();
export default venueSuggestionsService;
