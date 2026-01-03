import axios, { AxiosInstance, AxiosError } from 'axios';
import { createLogger } from '@flamoral/backend-shared';
import { EventSearchParams, EventCategory, Venue, Address } from '../../types';
import { DATE_FRIENDLY_CATEGORIES, DATE_FRIENDLY_KEYWORDS } from '../../domain/entities/Event.entity';

const logger = createLogger('ticketmaster-client');

// Ticketmaster Discovery API types
interface TmEvent {
  id: string;
  name: string;
  type: string;
  url: string;
  locale: string;
  images: { url: string; width: number; height: number }[];
  sales: {
    public: {
      startDateTime: string;
      endDateTime: string;
    };
  };
  dates: {
    start: {
      localDate: string;
      localTime: string;
      dateTime: string;
    };
    end?: {
      localDate: string;
      localTime: string;
      dateTime: string;
    };
    timezone: string;
    status: {
      code: string;
    };
  };
  classifications: {
    primary: boolean;
    segment: { id: string; name: string };
    genre: { id: string; name: string };
    subGenre: { id: string; name: string };
  }[];
  priceRanges?: {
    type: string;
    currency: string;
    min: number;
    max: number;
  }[];
  _embedded?: {
    venues: TmVenue[];
  };
  ageRestrictions?: {
    legalAgeEnforced: boolean;
  };
  ticketLimit?: {
    info: string;
  };
  info?: string;
  pleaseNote?: string;
}

interface TmVenue {
  id: string;
  name: string;
  type: string;
  url: string;
  locale: string;
  postalCode: string;
  timezone: string;
  city: {
    name: string;
  };
  state: {
    name: string;
    stateCode: string;
  };
  country: {
    name: string;
    countryCode: string;
  };
  address: {
    line1: string;
    line2?: string;
  };
  location: {
    longitude: string;
    latitude: string;
  };
  upcomingEvents?: {
    _total: number;
  };
  images?: { url: string }[];
}

// Category mapping from Ticketmaster to our categories
const CATEGORY_MAP: Record<string, EventCategory> = {
  'Music': 'concerts',
  'Sports': 'sports',
  'Arts & Theatre': 'theater',
  'Film': 'experiences',
  'Miscellaneous': 'experiences',
  'Comedy': 'comedy',
  'Family': 'experiences',
};

export class TicketmasterClient {
  private client: AxiosInstance;
  private apiKey: string;
  private affiliateId: string;

  constructor(apiKey?: string, affiliateId?: string) {
    this.apiKey = apiKey || process.env.TICKETMASTER_API_KEY || '';
    this.affiliateId = affiliateId || process.env.TICKETMASTER_AFFILIATE_ID || '';

    this.client = axios.create({
      baseURL: process.env.TICKETMASTER_API_URL || 'https://app.ticketmaster.com/discovery/v2',
      timeout: 30000,
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add API key to all requests
        config.params = {
          ...config.params,
          apikey: this.apiKey,
        };
        logger.debug('Ticketmaster API Request', {
          method: config.method,
          url: config.url,
        });
        return config;
      },
      (error) => {
        logger.error('Ticketmaster Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        logger.error('Ticketmaster Response Error', {
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Search for events
   */
  async searchEvents(params: EventSearchParams): Promise<any[]> {
    try {
      const queryParams: Record<string, any> = {
        latlong: `${params.latitude},${params.longitude}`,
        radius: params.radiusMiles || 25,
        unit: 'miles',
        startDateTime: `${params.startDate}T00:00:00Z`,
        sort: 'date,asc',
        size: 50,
      };

      if (params.endDate) {
        queryParams.endDateTime = `${params.endDate}T23:59:59Z`;
      }

      if (params.category && params.category.length > 0) {
        queryParams.classificationName = params.category.map(c =>
          this.getCategoryName(c)
        ).join(',');
      }

      if (params.keyword) {
        queryParams.keyword = params.keyword;
      }

      const response = await this.client.get('/events.json', {
        params: queryParams,
      });

      const events = response.data._embedded?.events || [];
      return events
        .map((event: TmEvent) => this.transformEvent(event))
        .filter((event: any) => {
          // Apply price filter if specified
          if (params.priceMin && event.priceRange.min < params.priceMin) return false;
          if (params.priceMax && event.priceRange.max > params.priceMax) return false;
          // Apply date-friendly filter
          if (params.dateFriendlyOnly && !event.isDateFriendly) return false;
          return true;
        });
    } catch (error: any) {
      logger.error('Failed to search Ticketmaster events', { error: error.message });
      throw new Error(`Ticketmaster search failed: ${error.message}`);
    }
  }

  /**
   * Get event details
   */
  async getEvent(eventId: string): Promise<any> {
    try {
      const response = await this.client.get(`/events/${eventId}.json`);
      return this.transformEvent(response.data);
    } catch (error: any) {
      logger.error('Failed to get Ticketmaster event', { eventId, error: error.message });
      throw new Error(`Failed to get event: ${error.message}`);
    }
  }

  /**
   * Get event ticket inventory (availability)
   */
  async getEventInventory(eventId: string): Promise<{
    available: boolean;
    ticketTypes: any[]
  }> {
    try {
      // Note: Ticketmaster's inventory API requires special access
      // This is a simplified implementation
      const event = await this.getEvent(eventId);

      return {
        available: !event.isSoldOut,
        ticketTypes: event.priceRange ? [
          {
            type: 'General Admission',
            minPrice: event.priceRange.min,
            maxPrice: event.priceRange.max,
            currency: event.priceRange.currency,
          }
        ] : [],
      };
    } catch (error: any) {
      logger.error('Failed to get event inventory', { eventId, error: error.message });
      throw new Error(`Failed to get inventory: ${error.message}`);
    }
  }

  /**
   * Get venue details
   */
  async getVenue(venueId: string): Promise<Venue> {
    try {
      const response = await this.client.get(`/venues/${venueId}.json`);
      return this.transformVenue(response.data);
    } catch (error: any) {
      logger.error('Failed to get Ticketmaster venue', { venueId, error: error.message });
      throw new Error(`Failed to get venue: ${error.message}`);
    }
  }

  /**
   * Transform Ticketmaster event to our format
   */
  private transformEvent(event: TmEvent): any {
    const venue = event._embedded?.venues?.[0];
    const classification = event.classifications?.find(c => c.primary);
    const category = this.mapCategory(classification?.segment?.name || 'Miscellaneous');

    const priceRange = event.priceRanges?.[0] || { min: 0, max: 0, currency: 'USD' };

    return {
      externalId: event.id,
      name: event.name,
      description: event.info || event.pleaseNote,
      category,
      subcategory: classification?.genre?.name,
      venue: venue ? this.transformVenue(venue) : null,
      startDateTime: new Date(event.dates.start.dateTime),
      endDateTime: event.dates.end?.dateTime ? new Date(event.dates.end.dateTime) : null,
      imageUrls: event.images?.map(img => img.url) || [],
      priceRange: {
        min: priceRange.min,
        max: priceRange.max,
        currency: priceRange.currency,
      },
      isDateFriendly: this.isDateFriendlyEvent(event, category),
      ageRestriction: event.ageRestrictions?.legalAgeEnforced ? 21 : null,
      isSoldOut: event.dates.status.code === 'offsale',
      url: event.url,
    };
  }

  /**
   * Transform Ticketmaster venue
   */
  private transformVenue(venue: TmVenue): Venue {
    const address: Address = {
      street1: venue.address?.line1 || '',
      street2: venue.address?.line2,
      city: venue.city?.name || '',
      state: venue.state?.stateCode || '',
      postalCode: venue.postalCode || '',
      country: venue.country?.countryCode || 'US',
      latitude: parseFloat(venue.location?.latitude) || 0,
      longitude: parseFloat(venue.location?.longitude) || 0,
    };

    return {
      id: venue.id,
      name: venue.name,
      address,
      imageUrl: venue.images?.[0]?.url,
    };
  }

  /**
   * Map Ticketmaster category to our category
   */
  private mapCategory(tmCategory: string): EventCategory {
    return CATEGORY_MAP[tmCategory] || 'experiences';
  }

  /**
   * Get Ticketmaster category name from our category
   */
  private getCategoryName(category: EventCategory): string {
    const reverseMap: Record<EventCategory, string> = {
      concerts: 'Music',
      sports: 'Sports',
      theater: 'Arts & Theatre',
      comedy: 'Comedy',
      festivals: 'Music',
      experiences: 'Miscellaneous',
      classes: 'Family',
      food_drink: 'Miscellaneous',
    };
    return reverseMap[category] || 'Miscellaneous';
  }

  /**
   * Check if event is date-friendly
   */
  private isDateFriendlyEvent(event: TmEvent, category: EventCategory): boolean {
    // Category-based check
    if (DATE_FRIENDLY_CATEGORIES.includes(category)) {
      // For sports, only certain types are date-friendly
      if (category === 'sports') return false;
      return true;
    }

    // Keyword-based check
    const searchText = `${event.name} ${event.info || ''}`.toLowerCase();
    return DATE_FRIENDLY_KEYWORDS.some(keyword =>
      searchText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Generate affiliate purchase link
   */
  generateAffiliateLink(eventId: string, trackingId: string): string {
    return `https://www.ticketmaster.com/event/${eventId}?camefrom=${this.affiliateId}&aid=${trackingId}`;
  }
}

export default new TicketmasterClient();
