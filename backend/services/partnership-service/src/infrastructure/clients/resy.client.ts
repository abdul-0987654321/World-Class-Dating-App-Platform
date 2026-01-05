import { createLogger } from '@flamoral/backend-shared';
import axios, { AxiosInstance, AxiosError } from 'axios';

import { RestaurantSearchParams, RestaurantAvailability, Address } from '../../types';

const logger = createLogger('resy-client');

// Resy API types
interface ResyVenue {
  id: {
    resy: string;
  };
  name: string;
  location: {
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  contact: {
    phone_number: string;
    url: string;
  };
  type: string;
  cuisine: string[];
  price_range: number;
  rating: number;
  images: string[];
  tagline: string;
  about: string;
}

interface ResySlot {
  date: {
    start: string;
    end: string;
  };
  config: {
    type: string;
    token: string;
  };
  payment: {
    amount: number;
  };
}

interface ResyReservation {
  resy_token: string;
  reservation_id: string;
  venue: ResyVenue;
  date: {
    start: string;
  };
  num_seats: number;
  confirmation_number: string;
}

export class ResyClient {
  private client: AxiosInstance;
  private apiKey: string;
  private affiliateId: string;

  constructor(apiKey?: string, affiliateId?: string) {
    this.apiKey = apiKey || process.env.RESY_API_KEY || '';
    this.affiliateId = affiliateId || process.env.RESY_AFFILIATE_ID || '';

    this.client = axios.create({
      baseURL: process.env.RESY_API_URL || 'https://api.resy.com',
      headers: {
        Authorization: `ResyAPI api_key="${this.apiKey}"`,
        'Content-Type': 'application/json',
        'X-Resy-Universal-Auth': this.apiKey,
      },
      timeout: 30000,
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Resy API Request', {
          method: config.method,
          url: config.url,
        });
        return config;
      },
      (error) => {
        logger.error('Resy Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        logger.error('Resy Response Error', {
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Search for venues
   */
  async searchVenues(params: RestaurantSearchParams): Promise<any[]> {
    try {
      const response = await this.client.get('/3/venuesearch/search', {
        params: {
          lat: params.latitude,
          long: params.longitude,
          day: params.date,
          party_size: params.partySize,
          offset: 0,
          limit: 50,
        },
      });

      return response.data.search.hits.map((venue: ResyVenue) => this.transformVenue(venue));
    } catch (error: any) {
      logger.error('Failed to search Resy venues', { error: error.message });
      throw new Error(`Resy search failed: ${error.message}`);
    }
  }

  /**
   * Get venue details
   */
  async getVenue(venueId: string, date: string, partySize: number): Promise<any> {
    try {
      const response = await this.client.get('/3/venue', {
        params: {
          id: venueId,
          day: date,
          party_size: partySize,
        },
      });

      return this.transformVenue(response.data.venue);
    } catch (error: any) {
      logger.error('Failed to get Resy venue', { venueId, error: error.message });
      throw new Error(`Failed to get venue: ${error.message}`);
    }
  }

  /**
   * Get availability for a venue
   */
  async getAvailability(
    venueId: string,
    date: string,
    partySize: number
  ): Promise<RestaurantAvailability> {
    try {
      const response = await this.client.get('/4/find', {
        params: {
          venue_id: venueId,
          day: date,
          party_size: partySize,
          lat: 0,
          long: 0,
        },
      });

      const slots = response.data.results.venues[0]?.slots || [];
      return {
        restaurantId: venueId,
        date,
        times: slots.map((slot: ResySlot) => ({
          time: new Date(slot.date.start).toTimeString().substring(0, 5),
          type: slot.config.type as 'standard' | 'outdoor' | 'bar' | 'private',
          partySize,
          token: slot.config.token,
        })),
      };
    } catch (error: any) {
      logger.error('Failed to get Resy availability', { venueId, error: error.message });
      throw new Error(`Failed to get availability: ${error.message}`);
    }
  }

  /**
   * Book a reservation
   */
  async createReservation(params: {
    configToken: string;
    partySize: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    specialRequests?: string;
    affiliateTrackingId: string;
  }): Promise<{ confirmationNumber: string; externalId: string }> {
    try {
      // First, get the booking token
      const bookingDetailsResponse = await this.client.post('/3/details', {
        config_id: params.configToken,
        party_size: params.partySize,
      });

      const bookToken = bookingDetailsResponse.data.book_token.value;

      // Then create the reservation
      const response = await this.client.post('/3/book', {
        book_token: bookToken,
        struct_payment_method: null,
        source_id: this.affiliateId,
      });

      const reservation: ResyReservation = response.data;
      return {
        confirmationNumber: reservation.confirmation_number,
        externalId: reservation.resy_token,
      };
    } catch (error: any) {
      logger.error('Failed to create Resy reservation', { error: error.message });
      throw new Error(`Failed to create reservation: ${error.message}`);
    }
  }

  /**
   * Cancel a reservation
   */
  async cancelReservation(resyToken: string): Promise<void> {
    try {
      await this.client.post('/3/cancel', {
        resy_token: resyToken,
      });
      logger.info('Resy reservation cancelled', { resyToken });
    } catch (error: any) {
      logger.error('Failed to cancel Resy reservation', { resyToken, error: error.message });
      throw new Error(`Failed to cancel reservation: ${error.message}`);
    }
  }

  /**
   * Transform Resy venue to our format
   */
  private transformVenue(venue: ResyVenue): any {
    const address: Address = {
      street1: venue.location.address_1,
      street2: venue.location.address_2,
      city: venue.location.city,
      state: venue.location.state,
      postalCode: venue.location.postal_code,
      country: venue.location.country,
      latitude: venue.location.latitude,
      longitude: venue.location.longitude,
    };

    return {
      externalId: venue.id.resy,
      name: venue.name,
      description: venue.about || venue.tagline,
      cuisine: venue.cuisine || [],
      priceRange: venue.price_range,
      rating: venue.rating,
      address,
      phone: venue.contact?.phone_number,
      website: venue.contact?.url,
      imageUrls: venue.images || [],
      isDateNight: this.isDateNightVenue(venue),
      romanticScore: this.calculateRomanticScore(venue),
    };
  }

  /**
   * Check if venue is good for dates
   */
  private isDateNightVenue(venue: ResyVenue): boolean {
    const romanticKeywords = ['romantic', 'intimate', 'date', 'wine', 'cocktail', 'fine dining'];
    const text = `${venue.tagline} ${venue.about} ${venue.type}`.toLowerCase();
    return romanticKeywords.some((keyword) => text.includes(keyword));
  }

  /**
   * Calculate romantic score
   */
  private calculateRomanticScore(venue: ResyVenue): number {
    let score = 5;

    if (venue.price_range >= 3) score += 1;
    if (venue.price_range === 4) score += 1;
    if (venue.rating >= 4.5) score += 1;

    const text = `${venue.tagline} ${venue.about}`.toLowerCase();
    if (text.includes('romantic')) score += 2;
    if (text.includes('intimate')) score += 1.5;
    if (text.includes('wine')) score += 0.5;

    return Math.min(10, Math.max(1, Math.round(score)));
  }

  /**
   * Generate affiliate link
   */
  generateAffiliateLink(venueId: string, trackingId: string): string {
    return `https://resy.com/cities/ny/${venueId}?ref=${this.affiliateId}&aid=${trackingId}`;
  }
}

export default new ResyClient();
