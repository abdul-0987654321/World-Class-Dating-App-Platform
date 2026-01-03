/**
 * Yelp Fusion API Client (Optional)
 * Provides business search and details functionality using Yelp Fusion API
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

export interface YelpConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface YelpBusiness {
  id: string;
  alias: string;
  name: string;
  image_url: string;
  url: string;
  review_count: number;
  categories: Array<{
    alias: string;
    title: string;
  }>;
  rating: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  price?: string;
  location: {
    address1: string;
    address2?: string;
    address3?: string;
    city: string;
    zip_code: string;
    country: string;
    state: string;
    display_address: string[];
  };
  phone: string;
  display_phone: string;
  distance?: number;
  is_closed: boolean;
}

export interface YelpBusinessDetails extends YelpBusiness {
  photos: string[];
  hours?: Array<{
    open: Array<{
      is_overnight: boolean;
      start: string;
      end: string;
      day: number;
    }>;
    hours_type: string;
    is_open_now: boolean;
  }>;
  special_hours?: Array<{
    date: string;
    is_closed: boolean;
    start?: string;
    end?: string;
    is_overnight?: boolean;
  }>;
  transactions?: string[];
}

export interface SearchBusinessesParams {
  location: string;
  categories?: string;
  term?: string;
  price?: string;
  radius?: number;
  limit?: number;
  sort_by?: 'best_match' | 'rating' | 'review_count' | 'distance';
}

export class YelpClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config?: YelpConfig) {
    this.apiKey = config?.apiKey || process.env.YELP_API_KEY || '';
    const baseUrl = config?.baseUrl || 'https://api.yelp.com/v3';

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Check if the client is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Search for businesses based on location and categories
   */
  async searchBusinesses(params: SearchBusinessesParams): Promise<Venue[]> {
    if (!this.isConfigured()) {
      logger.warn('Yelp API key not configured');
      return [];
    }

    try {
      const searchParams: Record<string, string | number> = {
        location: params.location,
        limit: params.limit || 20,
        sort_by: params.sort_by || 'rating',
      };

      if (params.term) {
        searchParams.term = params.term;
      }

      if (params.categories) {
        searchParams.categories = params.categories;
      }

      if (params.price) {
        searchParams.price = params.price;
      }

      if (params.radius) {
        searchParams.radius = Math.min(params.radius, 40000); // Yelp max is 40km
      }

      const response = await this.client.get('/businesses/search', { params: searchParams });

      if (!response.data.businesses) {
        return [];
      }

      const businesses: YelpBusiness[] = response.data.businesses;
      return businesses.map((business) => this.mapBusinessToVenue(business));
    } catch (error: any) {
      logger.error('Error searching Yelp businesses:', error.message);
      return [];
    }
  }

  /**
   * Get detailed information about a specific business
   */
  async getBusinessDetails(businessId: string): Promise<Venue | null> {
    if (!this.isConfigured()) {
      logger.warn('Yelp API key not configured');
      return null;
    }

    try {
      const response = await this.client.get(`/businesses/${businessId}`);
      const business: YelpBusinessDetails = response.data;
      return this.mapBusinessDetailsToVenue(business);
    } catch (error: any) {
      logger.error('Error getting Yelp business details:', error.message);
      return null;
    }
  }

  /**
   * Search for venues for dating
   */
  async searchDateVenues(
    location: string,
    type?: VenueType,
    priceRange?: PriceRange
  ): Promise<Venue[]> {
    const categories = this.mapVenueTypeToYelpCategories(type);
    const price = priceRange ? this.mapPriceRangeToYelpPrice(priceRange) : undefined;

    return this.searchBusinesses({
      location,
      categories,
      term: type ? undefined : 'date night',
      price,
      limit: 20,
      sort_by: 'rating',
    });
  }

  /**
   * Map Yelp Business to Venue entity
   */
  private mapBusinessToVenue(business: YelpBusiness): Venue {
    const venueType = this.inferVenueType(business.categories);

    const metadata: VenueMetadata = {
      phone: business.display_phone,
      latitude: business.coordinates.latitude,
      longitude: business.coordinates.longitude,
      reviews: business.review_count,
    };

    return {
      id: uuidv4(),
      name: business.name,
      type: venueType,
      address: business.location.display_address.join(', '),
      city: business.location.city,
      priceRange: this.mapYelpPriceToPriceRange(business.price),
      rating: business.rating,
      imageUrl: business.image_url || undefined,
      externalId: business.id,
      externalSource: EXTERNAL_SOURCES.YELP,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Map Yelp Business Details to Venue entity
   */
  private mapBusinessDetailsToVenue(business: YelpBusinessDetails): Venue {
    const venueType = this.inferVenueType(business.categories);

    const hours = business.hours?.[0]?.open.map((h) => {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const formatTime = (time: string) => {
        const hour = parseInt(time.substring(0, 2));
        const min = time.substring(2);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${min} ${ampm}`;
      };
      return `${days[h.day]}: ${formatTime(h.start)} - ${formatTime(h.end)}`;
    });

    const metadata: VenueMetadata = {
      phone: business.display_phone,
      website: business.url,
      hours,
      latitude: business.coordinates.latitude,
      longitude: business.coordinates.longitude,
      reviews: business.review_count,
      photos: business.photos,
    };

    return {
      id: uuidv4(),
      name: business.name,
      type: venueType,
      address: business.location.display_address.join(', '),
      city: business.location.city,
      priceRange: this.mapYelpPriceToPriceRange(business.price),
      rating: business.rating,
      imageUrl: business.photos?.[0] || business.image_url || undefined,
      externalId: business.id,
      externalSource: EXTERNAL_SOURCES.YELP,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Map venue type to Yelp categories
   */
  private mapVenueTypeToYelpCategories(type?: VenueType): string {
    const mapping: Record<VenueType, string> = {
      restaurant: 'restaurants',
      bar: 'bars,cocktailbars,wine_bars',
      activity: 'active,tours,arts',
      entertainment: 'nightlife,karaoke,comedyclubs',
    };
    return type ? mapping[type] : 'restaurants,bars,nightlife';
  }

  /**
   * Infer venue type from Yelp categories
   */
  private inferVenueType(categories: Array<{ alias: string; title: string }>): VenueType {
    const aliases = categories.map((c) => c.alias.toLowerCase());

    const restaurantCategories = ['restaurants', 'food', 'cafes', 'breakfast_brunch'];
    const barCategories = ['bars', 'cocktailbars', 'wine_bars', 'pubs'];
    const activityCategories = ['active', 'tours', 'museums', 'parks'];
    const entertainmentCategories = ['nightlife', 'karaoke', 'comedyclubs', 'jazzandblues'];

    if (aliases.some((a) => restaurantCategories.some((c) => a.includes(c)))) {
      return VENUE_TYPES.RESTAURANT;
    }
    if (aliases.some((a) => barCategories.some((c) => a.includes(c)))) {
      return VENUE_TYPES.BAR;
    }
    if (aliases.some((a) => activityCategories.some((c) => a.includes(c)))) {
      return VENUE_TYPES.ACTIVITY;
    }
    if (aliases.some((a) => entertainmentCategories.some((c) => a.includes(c)))) {
      return VENUE_TYPES.ENTERTAINMENT;
    }

    return VENUE_TYPES.RESTAURANT;
  }

  /**
   * Map Yelp price string to our price range
   */
  private mapYelpPriceToPriceRange(price?: string): PriceRange {
    if (!price) return PRICE_RANGES.MODERATE;
    const length = price.length;
    if (length === 1) return PRICE_RANGES.BUDGET;
    if (length === 2) return PRICE_RANGES.MODERATE;
    if (length === 3) return PRICE_RANGES.UPSCALE;
    return PRICE_RANGES.LUXURY;
  }

  /**
   * Map our price range to Yelp price filter
   */
  private mapPriceRangeToYelpPrice(priceRange: PriceRange): string {
    const mapping: Record<PriceRange, string> = {
      budget: '1',
      moderate: '1,2',
      upscale: '2,3',
      luxury: '3,4',
    };
    return mapping[priceRange];
  }
}

// Singleton instance
let yelpClient: YelpClient | null = null;

export function getYelpClient(): YelpClient {
  if (!yelpClient) {
    yelpClient = new YelpClient();
  }
  return yelpClient;
}
