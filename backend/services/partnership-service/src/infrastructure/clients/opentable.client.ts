import { createLogger } from '@flamoral/backend-shared';
import axios, { AxiosInstance, AxiosError } from 'axios';

import {
  RestaurantSearchParams,
  RestaurantAvailability,
  Address,
  OperatingHours,
} from '../../types';

const logger = createLogger('opentable-client');

// OpenTable API types
interface OpenTableRestaurant {
  rid: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
  phone: string;
  cuisine_types: string[];
  price_range: number;
  dining_style: string;
  dress_code: string;
  parking_details: string;
  payment_options: string[];
  description: string;
  images: { url: string }[];
  rating: number;
  review_count: number;
}

interface OpenTableAvailability {
  rid: string;
  date: string;
  time_slots: {
    time: string;
    type: string;
  }[];
}

interface OpenTableReservation {
  confirmation_number: string;
  rid: string;
  date: string;
  time: string;
  party_size: number;
  status: string;
}

export class OpenTableClient {
  private client: AxiosInstance;
  private apiKey: string;
  private affiliateId: string;

  constructor(apiKey?: string, affiliateId?: string) {
    this.apiKey = apiKey || process.env.OPENTABLE_API_KEY || '';
    this.affiliateId = affiliateId || process.env.OPENTABLE_AFFILIATE_ID || '';

    this.client = axios.create({
      baseURL: process.env.OPENTABLE_API_URL || 'https://platform.opentable.com/v2',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Affiliate-ID': this.affiliateId,
      },
      timeout: 30000,
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('OpenTable API Request', {
          method: config.method,
          url: config.url,
          params: config.params,
        });
        return config;
      },
      (error) => {
        logger.error('OpenTable Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('OpenTable API Response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error: AxiosError) => {
        logger.error('OpenTable Response Error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Search for restaurants based on criteria
   */
  async searchRestaurants(params: RestaurantSearchParams): Promise<any[]> {
    try {
      const response = await this.client.get('/restaurants', {
        params: {
          latitude: params.latitude,
          longitude: params.longitude,
          radius: params.radiusMiles || 10,
          datetime: `${params.date}T${params.time}:00`,
          covers: params.partySize,
          cuisine: params.cuisine?.join(','),
          price: params.priceRange?.join(','),
        },
      });

      return response.data.restaurants.map((r: OpenTableRestaurant) => this.transformRestaurant(r));
    } catch (error: any) {
      logger.error('Failed to search restaurants', { error: error.message });
      throw new Error(`OpenTable search failed: ${error.message}`);
    }
  }

  /**
   * Get restaurant details by ID
   */
  async getRestaurant(restaurantId: string): Promise<any> {
    try {
      const response = await this.client.get(`/restaurants/${restaurantId}`);
      return this.transformRestaurant(response.data);
    } catch (error: any) {
      logger.error('Failed to get restaurant', { restaurantId, error: error.message });
      throw new Error(`Failed to get restaurant: ${error.message}`);
    }
  }

  /**
   * Get availability for a restaurant
   */
  async getAvailability(
    restaurantId: string,
    date: string,
    partySize: number
  ): Promise<RestaurantAvailability> {
    try {
      const response = await this.client.get(`/restaurants/${restaurantId}/availability`, {
        params: {
          date,
          covers: partySize,
        },
      });

      const availability: OpenTableAvailability = response.data;
      return {
        restaurantId,
        date,
        times: availability.time_slots.map((slot) => ({
          time: slot.time,
          type: slot.type as 'standard' | 'outdoor' | 'bar' | 'private',
          partySize,
        })),
      };
    } catch (error: any) {
      logger.error('Failed to get availability', { restaurantId, error: error.message });
      throw new Error(`Failed to get availability: ${error.message}`);
    }
  }

  /**
   * Create a reservation
   */
  async createReservation(params: {
    restaurantId: string;
    date: string;
    time: string;
    partySize: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    specialRequests?: string;
    affiliateTrackingId: string;
  }): Promise<{ confirmationNumber: string; externalId: string }> {
    try {
      const response = await this.client.post('/reservations', {
        rid: params.restaurantId,
        datetime: `${params.date}T${params.time}:00`,
        covers: params.partySize,
        first_name: params.firstName,
        last_name: params.lastName,
        email: params.email,
        phone: params.phone,
        notes: params.specialRequests,
        affiliate_reference: params.affiliateTrackingId,
      });

      const reservation: OpenTableReservation = response.data;
      return {
        confirmationNumber: reservation.confirmation_number,
        externalId: reservation.confirmation_number,
      };
    } catch (error: any) {
      logger.error('Failed to create reservation', { error: error.message });
      throw new Error(`Failed to create reservation: ${error.message}`);
    }
  }

  /**
   * Cancel a reservation
   */
  async cancelReservation(confirmationNumber: string): Promise<void> {
    try {
      await this.client.delete(`/reservations/${confirmationNumber}`);
      logger.info('Reservation cancelled', { confirmationNumber });
    } catch (error: any) {
      logger.error('Failed to cancel reservation', { confirmationNumber, error: error.message });
      throw new Error(`Failed to cancel reservation: ${error.message}`);
    }
  }

  /**
   * Get reservation status
   */
  async getReservationStatus(confirmationNumber: string): Promise<string> {
    try {
      const response = await this.client.get(`/reservations/${confirmationNumber}`);
      return response.data.status;
    } catch (error: any) {
      logger.error('Failed to get reservation status', {
        confirmationNumber,
        error: error.message,
      });
      throw new Error(`Failed to get reservation status: ${error.message}`);
    }
  }

  /**
   * Transform OpenTable restaurant to our format
   */
  private transformRestaurant(otRestaurant: OpenTableRestaurant): any {
    const address: Address = {
      street1: otRestaurant.address,
      city: otRestaurant.city,
      state: otRestaurant.state,
      postalCode: otRestaurant.postal_code,
      country: otRestaurant.country,
      latitude: otRestaurant.latitude,
      longitude: otRestaurant.longitude,
    };

    return {
      externalId: otRestaurant.rid,
      name: otRestaurant.name,
      description: otRestaurant.description,
      cuisine: otRestaurant.cuisine_types,
      priceRange: otRestaurant.price_range,
      rating: otRestaurant.rating,
      reviewCount: otRestaurant.review_count,
      address,
      phone: otRestaurant.phone,
      imageUrls: otRestaurant.images?.map((i) => i.url) || [],
      amenities: this.extractAmenities(otRestaurant),
      dressCode: otRestaurant.dress_code,
      isDateNight: this.isDateNightRestaurant(otRestaurant),
      romanticScore: this.calculateRomanticScore(otRestaurant),
    };
  }

  /**
   * Extract amenities from restaurant data
   */
  private extractAmenities(restaurant: OpenTableRestaurant): string[] {
    const amenities: string[] = [];

    if (restaurant.parking_details) amenities.push('Parking Available');
    if (restaurant.payment_options?.includes('credit_card'))
      amenities.push('Credit Cards Accepted');
    if (restaurant.dining_style?.toLowerCase().includes('romantic'))
      amenities.push('Romantic Ambiance');
    if (restaurant.dining_style?.toLowerCase().includes('fine')) amenities.push('Fine Dining');

    return amenities;
  }

  /**
   * Determine if restaurant is good for dates
   */
  private isDateNightRestaurant(restaurant: OpenTableRestaurant): boolean {
    const romanticKeywords = ['romantic', 'intimate', 'cozy', 'wine', 'fine dining', 'upscale'];
    const description = (restaurant.description || '').toLowerCase();
    const diningStyle = (restaurant.dining_style || '').toLowerCase();

    return romanticKeywords.some(
      (keyword) => description.includes(keyword) || diningStyle.includes(keyword)
    );
  }

  /**
   * Calculate romantic score (1-10)
   */
  private calculateRomanticScore(restaurant: OpenTableRestaurant): number {
    let score = 5; // Base score

    // Price range contributes (higher price = more romantic assumption)
    score += (restaurant.price_range - 2) * 0.5;

    // Rating contributes
    if (restaurant.rating >= 4.5) score += 1;
    if (restaurant.rating >= 4.0) score += 0.5;

    // Dining style contributes
    const diningStyle = (restaurant.dining_style || '').toLowerCase();
    if (diningStyle.includes('romantic')) score += 2;
    if (diningStyle.includes('fine')) score += 1;
    if (diningStyle.includes('intimate')) score += 1.5;

    return Math.min(10, Math.max(1, Math.round(score)));
  }

  /**
   * Generate affiliate link for a restaurant
   */
  generateAffiliateLink(restaurantId: string, trackingId: string): string {
    const baseUrl = 'https://www.opentable.com/r/';
    return `${baseUrl}${restaurantId}?ref=${this.affiliateId}&aid=${trackingId}`;
  }
}

export default new OpenTableClient();
