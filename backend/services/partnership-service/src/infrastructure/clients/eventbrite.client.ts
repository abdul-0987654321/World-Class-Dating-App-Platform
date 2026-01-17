import { createLogger } from '@flamoral/backend-shared';
import axios, { AxiosInstance, AxiosError } from 'axios';

import { DATE_FRIENDLY_KEYWORDS } from '../../domain/entities/Event.entity';
import { EventSearchParams, EventCategory, Venue, Address } from '../../types';

const logger = createLogger('eventbrite-client');

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;
const MAX_DELAY = 10000;

// HTTP status codes that should trigger a retry
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Circuit Breaker State
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Simple Circuit Breaker for external API resilience
 */
class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private readonly threshold = 5;
  private readonly resetTimeout = 30000;
  private readonly successThreshold = 2;

  getState(): CircuitState {
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        logger.info('[Eventbrite] Circuit breaker transitioning to HALF_OPEN');
      }
    }
    return this.state;
  }

  allowRequest(): boolean {
    return this.getState() !== 'OPEN';
  }

  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        logger.info('[Eventbrite] Circuit breaker CLOSED');
      }
    } else {
      this.failureCount = 0;
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.state === 'HALF_OPEN' || this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      logger.warn(`[Eventbrite] Circuit breaker OPEN: ${this.failureCount} failures`);
    }
  }
}

/**
 * Calculate exponential backoff with jitter
 */
function calculateBackoff(attempt: number): number {
  const delay = Math.min(BASE_DELAY * Math.pow(2, attempt - 1), MAX_DELAY);
  // Add jitter: 50-100% of delay
  return Math.floor(delay * (0.5 + Math.random() * 0.5));
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Eventbrite API types
interface EbEvent {
  id: string;
  name: { text: string; html: string };
  description: { text: string; html: string };
  url: string;
  start: { timezone: string; local: string; utc: string };
  end: { timezone: string; local: string; utc: string };
  organization_id: string;
  created: string;
  changed: string;
  published: string;
  capacity: number;
  capacity_is_custom: boolean;
  status: string;
  currency: string;
  listed: boolean;
  shareable: boolean;
  online_event: boolean;
  tx_time_limit: number;
  hide_start_date: boolean;
  hide_end_date: boolean;
  locale: string;
  is_locked: boolean;
  privacy_setting: string;
  is_series: boolean;
  is_series_parent: boolean;
  inventory_type: string;
  is_reserved_seating: boolean;
  show_pick_a_seat: boolean;
  show_seatmap_thumbnail: boolean;
  show_colors_in_seatmap_thumbnail: boolean;
  source: string;
  is_free: boolean;
  version: string;
  logo_id: string;
  organizer_id: string;
  venue_id: string;
  category_id: string;
  subcategory_id: string;
  format_id: string;
  resource_uri: string;
  is_externally_ticketed: boolean;
  logo?: { url: string };
  venue?: EbVenue;
  ticket_classes?: EbTicketClass[];
  category?: { id: string; name: string };
  subcategory?: { id: string; name: string };
}

interface EbVenue {
  id: string;
  name: string;
  address: {
    address_1: string;
    address_2: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
    latitude: string;
    longitude: string;
  };
  resource_uri: string;
  age_restriction: string;
  capacity: number;
}

interface EbTicketClass {
  id: string;
  name: string;
  description: string;
  donation: boolean;
  free: boolean;
  minimum_quantity: number;
  maximum_quantity: number;
  quantity_total: number;
  quantity_sold: number;
  sales_start: string;
  sales_end: string;
  hidden: boolean;
  include_fee: boolean;
  split_fee: boolean;
  hide_description: boolean;
  secondary_assignment_enabled: boolean;
  cost?: { currency: string; major_value: string };
  fee?: { currency: string; major_value: string };
  tax?: { currency: string; major_value: string };
  resource_uri: string;
  has_pdf_ticket: boolean;
  on_sale_status: string;
}

// Category mapping
const EB_CATEGORY_MAP: Record<string, EventCategory> = {
  '103': 'concerts', // Music
  '101': 'experiences', // Business & Professional
  '110': 'food_drink', // Food & Drink
  '105': 'theater', // Performing & Visual Arts
  '104': 'festivals', // Film, Media & Entertainment
  '108': 'sports', // Sports & Fitness
  '102': 'experiences', // Science & Technology
  '107': 'experiences', // Health & Wellness
  '113': 'classes', // Community & Culture
  '119': 'experiences', // Travel & Outdoor
  '109': 'experiences', // Hobbies & Special Interest
  '199': 'experiences', // Other
};

export class EventbriteClient {
  private client: AxiosInstance;
  private apiToken: string;
  private affiliateId: string;
  private circuitBreaker: CircuitBreaker;

  constructor(apiToken?: string, affiliateId?: string) {
    this.apiToken = apiToken || process.env.EVENTBRITE_API_TOKEN || '';
    this.affiliateId = affiliateId || process.env.EVENTBRITE_AFFILIATE_ID || '';
    this.circuitBreaker = new CircuitBreaker();

    this.client = axios.create({
      baseURL: process.env.EVENTBRITE_API_URL || 'https://www.eventbriteapi.com/v3',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Eventbrite API Request', {
          method: config.method,
          url: config.url,
        });
        return config;
      },
      (error) => {
        logger.error('Eventbrite Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        this.circuitBreaker.recordSuccess();
        return response;
      },
      (error: AxiosError) => {
        this.circuitBreaker.recordFailure();
        logger.error('Eventbrite Response Error', {
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Execute request with retry logic and circuit breaker
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    if (!this.circuitBreaker.allowRequest()) {
      throw new Error(`Eventbrite circuit breaker is OPEN - ${operationName} blocked`);
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        const status = error.response?.status;

        // Don't retry 4xx errors (except 408 and 429)
        if (status && status >= 400 && status < 500 && !RETRYABLE_STATUS_CODES.includes(status)) {
          throw error;
        }

        if (attempt < MAX_RETRIES) {
          const delay = calculateBackoff(attempt);
          logger.warn(`[Eventbrite] ${operationName} failed (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${delay}ms...`);
          await sleep(delay);
        }
      }
    }

    throw lastError || new Error(`${operationName} failed after ${MAX_RETRIES} retries`);
  }

  /**
   * Search for events
   */
  async searchEvents(params: EventSearchParams): Promise<any[]> {
    return this.executeWithRetry(async () => {
      const queryParams: Record<string, any> = {
        'location.latitude': params.latitude,
        'location.longitude': params.longitude,
        'location.within': `${params.radiusMiles || 25}mi`,
        'start_date.range_start': `${params.startDate}T00:00:00`,
        expand: 'venue,ticket_classes,category,subcategory',
      };

      if (params.endDate) {
        queryParams['start_date.range_end'] = `${params.endDate}T23:59:59`;
      }

      if (params.keyword) {
        queryParams.q = params.keyword;
      }

      if (params.category && params.category.length > 0) {
        const categoryIds = params.category.map((c) => this.getCategoryId(c)).filter(Boolean);
        if (categoryIds.length > 0) {
          queryParams.categories = categoryIds.join(',');
        }
      }

      const response = await this.client.get('/events/search/', {
        params: queryParams,
      });

      const events = response.data.events || [];
      return events
        .map((event: EbEvent) => this.transformEvent(event))
        .filter((event: any) => {
          // Apply price filter
          if (params.priceMin && event.priceRange.min < params.priceMin) return false;
          if (params.priceMax && event.priceRange.max > params.priceMax) return false;
          // Apply date-friendly filter
          if (params.dateFriendlyOnly && !event.isDateFriendly) return false;
          return true;
        });
    }, 'searchEvents');
  }

  /**
   * Get event details
   */
  async getEvent(eventId: string): Promise<any> {
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`/events/${eventId}/`, {
        params: {
          expand: 'venue,ticket_classes,category,subcategory',
        },
      });
      return this.transformEvent(response.data);
    }, `getEvent(${eventId})`);
  }

  /**
   * Get ticket classes for an event
   */
  async getTicketClasses(eventId: string): Promise<any[]> {
    return this.executeWithRetry(async () => {
      const response = await this.client.get(`/events/${eventId}/ticket_classes/`);
      return response.data.ticket_classes.map((tc: EbTicketClass) => ({
        id: tc.id,
        name: tc.name,
        description: tc.description,
        price: tc.cost ? parseFloat(tc.cost.major_value) : 0,
        fee: tc.fee ? parseFloat(tc.fee.major_value) : 0,
        currency: tc.cost?.currency || 'USD',
        available: tc.quantity_total - tc.quantity_sold,
        isFree: tc.free,
        onSaleStatus: tc.on_sale_status,
      }));
    }, `getTicketClasses(${eventId})`);
  }

  /**
   * Transform Eventbrite event to our format
   */
  private transformEvent(event: EbEvent): any {
    const category = this.mapCategory(event.category_id);

    // Calculate price range from ticket classes
    let minPrice = 0;
    let maxPrice = 0;
    if (event.ticket_classes && event.ticket_classes.length > 0) {
      const prices = event.ticket_classes
        .filter((tc) => tc.cost)
        .map((tc) => parseFloat(tc.cost!.major_value));

      if (prices.length > 0) {
        minPrice = Math.min(...prices);
        maxPrice = Math.max(...prices);
      }
    }

    return {
      externalId: event.id,
      name: event.name.text,
      description: event.description?.text,
      category,
      subcategory: event.subcategory?.name,
      venue: event.venue ? this.transformVenue(event.venue) : null,
      startDateTime: new Date(event.start.utc),
      endDateTime: event.end ? new Date(event.end.utc) : null,
      imageUrls: event.logo ? [event.logo.url] : [],
      priceRange: {
        min: minPrice,
        max: maxPrice,
        currency: event.currency || 'USD',
      },
      isDateFriendly: this.isDateFriendlyEvent(event, category),
      isSoldOut: event.status === 'completed' || event.status === 'cancelled',
      isFree: event.is_free,
      url: event.url,
    };
  }

  /**
   * Transform Eventbrite venue
   */
  private transformVenue(venue: EbVenue): Venue {
    const address: Address = {
      street1: venue.address.address_1 || '',
      street2: venue.address.address_2,
      city: venue.address.city || '',
      state: venue.address.region || '',
      postalCode: venue.address.postal_code || '',
      country: venue.address.country || 'US',
      latitude: parseFloat(venue.address.latitude) || 0,
      longitude: parseFloat(venue.address.longitude) || 0,
    };

    return {
      id: venue.id,
      name: venue.name,
      address,
      capacity: venue.capacity,
    };
  }

  /**
   * Map Eventbrite category ID to our category
   */
  private mapCategory(categoryId: string): EventCategory {
    return EB_CATEGORY_MAP[categoryId] || 'experiences';
  }

  /**
   * Get Eventbrite category ID from our category
   */
  private getCategoryId(category: EventCategory): string | null {
    const reverseMap: Record<EventCategory, string> = {
      concerts: '103',
      sports: '108',
      theater: '105',
      comedy: '105',
      festivals: '104',
      experiences: '102',
      classes: '113',
      food_drink: '110',
    };
    return reverseMap[category] || null;
  }

  /**
   * Check if event is date-friendly
   */
  private isDateFriendlyEvent(event: EbEvent, category: EventCategory): boolean {
    // Most Eventbrite events are more casual/intimate than large venue events
    const casualCategories: EventCategory[] = ['food_drink', 'classes', 'experiences'];
    if (casualCategories.includes(category)) return true;

    // Keyword-based check
    const searchText = `${event.name.text} ${event.description?.text || ''}`.toLowerCase();
    return DATE_FRIENDLY_KEYWORDS.some((keyword) => searchText.includes(keyword.toLowerCase()));
  }

  /**
   * Generate affiliate link
   */
  generateAffiliateLink(eventId: string, trackingId: string): string {
    return `https://www.eventbrite.com/e/${eventId}?aff=${this.affiliateId}&aid=${trackingId}`;
  }
}

export default new EventbriteClient();
