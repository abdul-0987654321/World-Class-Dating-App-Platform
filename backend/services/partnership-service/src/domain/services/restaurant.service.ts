import { createLogger } from '@flamoral/backend-shared';
import { db } from '../../infrastructure/database/connection';
import { OpenTableClient } from '../../infrastructure/clients/opentable.client';
import { ResyClient } from '../../infrastructure/clients/resy.client';
import {
  Restaurant,
  Reservation,
  ReservationCreateInput,
  ReservationUpdateInput,
  RESERVATION_STATUS,
} from '../entities/Reservation.entity';
import { Partner } from '../entities/Partner.entity';
import {
  RestaurantSearchParams,
  RestaurantAvailability,
} from '../../types';
import {
  generateAffiliateTrackingId,
  calculateCommission,
} from '../entities/Affiliate.entity';

const logger = createLogger('restaurant-service');

export class RestaurantService {
  private openTableClient: OpenTableClient;
  private resyClient: ResyClient;

  constructor(openTableClient?: OpenTableClient, resyClient?: ResyClient) {
    this.openTableClient = openTableClient || new OpenTableClient();
    this.resyClient = resyClient || new ResyClient();
  }

  /**
   * Search restaurants across all partners
   */
  async searchRestaurants(
    userId: string,
    params: RestaurantSearchParams
  ): Promise<{ restaurants: any[]; source: string }[]> {
    const results: { restaurants: any[]; source: string }[] = [];

    // Get active restaurant partners
    const partners = await db('partners')
      .where('type', 'restaurant')
      .where('status', 'active');

    for (const partner of partners) {
      try {
        let restaurants: any[] = [];

        if (partner.integrationType === 'opentable') {
          const client = new OpenTableClient(partner.apiKey, partner.affiliateId);
          restaurants = await client.searchRestaurants(params);
        } else if (partner.integrationType === 'resy') {
          const client = new ResyClient(partner.apiKey, partner.affiliateId);
          restaurants = await client.searchVenues(params);
        }

        // Filter for date-night restaurants if requested
        if (params.dateNightOnly) {
          restaurants = restaurants.filter(r => r.isDateNight);
        }

        // Filter by minimum rating
        if (params.minRating) {
          restaurants = restaurants.filter(r => (r.rating || 0) >= params.minRating!);
        }

        // Cache restaurants in database
        await this.cacheRestaurants(partner.id, restaurants);

        results.push({
          source: partner.integrationType,
          restaurants: restaurants.map(r => ({
            ...r,
            partnerId: partner.id,
            partnerName: partner.name,
          })),
        });
      } catch (error: any) {
        logger.error(`Failed to search ${partner.integrationType}`, {
          partnerId: partner.id,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get restaurant availability
   */
  async getAvailability(
    partnerId: string,
    restaurantExternalId: string,
    date: string,
    partySize: number
  ): Promise<RestaurantAvailability | null> {
    const partner = await this.getPartner(partnerId);
    if (!partner) {
      throw new Error('Partner not found');
    }

    try {
      if (partner.integrationType === 'opentable') {
        const client = new OpenTableClient(partner.apiKey, partner.affiliateId);
        return await client.getAvailability(restaurantExternalId, date, partySize);
      } else if (partner.integrationType === 'resy') {
        const client = new ResyClient(partner.apiKey, partner.affiliateId);
        return await client.getAvailability(restaurantExternalId, date, partySize);
      }
    } catch (error: any) {
      logger.error('Failed to get availability', {
        partnerId,
        restaurantExternalId,
        error: error.message,
      });
      throw error;
    }

    return null;
  }

  /**
   * Create a reservation
   */
  async createReservation(
    input: ReservationCreateInput,
    userDetails: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    }
  ): Promise<Reservation> {
    const partner = await this.getPartner(input.partnerId);
    if (!partner) {
      throw new Error('Partner not found');
    }

    // Get restaurant from cache
    const restaurant = await db('restaurants')
      .where('partner_id', input.partnerId)
      .where('id', input.restaurantId)
      .first();

    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Generate affiliate tracking ID
    const affiliateTrackingId = generateAffiliateTrackingId(
      input.userId,
      input.partnerId,
      'restaurant'
    );

    // Create reservation with partner
    let externalResult: { confirmationNumber: string; externalId: string } | undefined;

    try {
      if (partner.integrationType === 'opentable') {
        const client = new OpenTableClient(partner.apiKey, partner.affiliateId);
        externalResult = await client.createReservation({
          restaurantId: restaurant.external_id,
          date: input.date,
          time: input.time,
          partySize: input.partySize,
          firstName: userDetails.firstName,
          lastName: userDetails.lastName,
          email: userDetails.email,
          phone: userDetails.phone,
          specialRequests: input.specialRequests,
          affiliateTrackingId,
        });
      } else if (partner.integrationType === 'resy') {
        const client = new ResyClient(partner.apiKey, partner.affiliateId);
        // For Resy, we'd need to get the config token first from availability
        // This is simplified for the example
        externalResult = await client.createReservation({
          configToken: '', // Would come from availability slot
          partySize: input.partySize,
          firstName: userDetails.firstName,
          lastName: userDetails.lastName,
          email: userDetails.email,
          phone: userDetails.phone,
          specialRequests: input.specialRequests,
          affiliateTrackingId,
        });
      }
    } catch (error: any) {
      logger.error('Failed to create reservation with partner', {
        partnerId: input.partnerId,
        error: error.message,
      });
      throw new Error(`Failed to create reservation: ${error.message}`);
    }

    // Store reservation in database
    const [reservation] = await db('reservations')
      .insert({
        user_id: input.userId,
        match_id: input.matchId,
        partner_id: input.partnerId,
        restaurant_id: input.restaurantId,
        external_reservation_id: externalResult?.externalId,
        status: RESERVATION_STATUS.CONFIRMED,
        date: input.date,
        time: input.time,
        party_size: input.partySize,
        special_requests: input.specialRequests,
        confirmation_code: externalResult?.confirmationNumber,
        affiliate_tracking_id: affiliateTrackingId,
      })
      .returning('*');

    // Track affiliate click conversion
    await this.trackAffiliateConversion(
      input.userId,
      input.partnerId,
      'restaurant',
      input.restaurantId,
      reservation.id,
      affiliateTrackingId
    );

    logger.info('Reservation created', {
      reservationId: reservation.id,
      userId: input.userId,
      restaurantId: input.restaurantId,
    });

    return this.mapReservation(reservation);
  }

  /**
   * Cancel a reservation
   */
  async cancelReservation(
    reservationId: string,
    userId: string
  ): Promise<Reservation> {
    const reservation = await db('reservations')
      .where('id', reservationId)
      .where('user_id', userId)
      .first();

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.status === RESERVATION_STATUS.CANCELLED) {
      throw new Error('Reservation is already cancelled');
    }

    const partner = await this.getPartner(reservation.partner_id);
    if (!partner) {
      throw new Error('Partner not found');
    }

    // Cancel with partner
    try {
      if (partner.integrationType === 'opentable' && reservation.confirmation_code) {
        const client = new OpenTableClient(partner.apiKey, partner.affiliateId);
        await client.cancelReservation(reservation.confirmation_code);
      } else if (partner.integrationType === 'resy' && reservation.external_reservation_id) {
        const client = new ResyClient(partner.apiKey, partner.affiliateId);
        await client.cancelReservation(reservation.external_reservation_id);
      }
    } catch (error: any) {
      logger.error('Failed to cancel reservation with partner', {
        reservationId,
        error: error.message,
      });
      // Continue to update our database even if partner cancel fails
    }

    // Update database
    const [updated] = await db('reservations')
      .where('id', reservationId)
      .update({
        status: RESERVATION_STATUS.CANCELLED,
        updated_at: db.fn.now(),
      })
      .returning('*');

    // Update commission status to rejected
    await db('affiliate_commissions')
      .where('order_id', reservationId)
      .where('order_type', 'reservation')
      .update({
        status: 'rejected',
        updated_at: db.fn.now(),
      });

    logger.info('Reservation cancelled', { reservationId });

    return this.mapReservation(updated);
  }

  /**
   * Get user's reservations
   */
  async getUserReservations(
    userId: string,
    status?: string
  ): Promise<Reservation[]> {
    let query = db('reservations')
      .where('user_id', userId)
      .orderBy('date', 'desc')
      .orderBy('time', 'desc');

    if (status) {
      query = query.where('status', status);
    }

    const reservations = await query;

    // Join with restaurant data
    const restaurantIds = reservations.map(r => r.restaurant_id);
    const restaurants = await db('restaurants')
      .whereIn('id', restaurantIds);

    const restaurantMap = new Map(restaurants.map(r => [r.id, r]));

    return reservations.map(r => ({
      ...this.mapReservation(r),
      restaurant: restaurantMap.get(r.restaurant_id),
    }));
  }

  /**
   * Get reservation by ID
   */
  async getReservation(reservationId: string): Promise<Reservation | null> {
    const reservation = await db('reservations')
      .where('id', reservationId)
      .first();

    if (!reservation) {
      return null;
    }

    const restaurant = await db('restaurants')
      .where('id', reservation.restaurant_id)
      .first();

    return {
      ...this.mapReservation(reservation),
      restaurant,
    } as any;
  }

  /**
   * Get date-night restaurant suggestions
   */
  async getDateNightSuggestions(
    latitude: number,
    longitude: number,
    budget?: number
  ): Promise<any[]> {
    const priceRange = budget
      ? budget <= 50 ? [1, 2] : budget <= 100 ? [2, 3] : [3, 4]
      : undefined;

    const results = await this.searchRestaurants('system', {
      latitude,
      longitude,
      date: new Date().toISOString().split('T')[0],
      time: '19:00',
      partySize: 2,
      priceRange,
      dateNightOnly: true,
      minRating: 4.0,
    });

    // Flatten and sort by romantic score
    const allRestaurants = results.flatMap(r => r.restaurants);
    return allRestaurants
      .sort((a, b) => (b.romanticScore || 0) - (a.romanticScore || 0))
      .slice(0, 10);
  }

  /**
   * Cache restaurants in database
   */
  private async cacheRestaurants(partnerId: string, restaurants: any[]): Promise<void> {
    for (const restaurant of restaurants) {
      try {
        await db('restaurants')
          .insert({
            partner_id: partnerId,
            external_id: restaurant.externalId,
            name: restaurant.name,
            description: restaurant.description,
            cuisine: restaurant.cuisine,
            price_range: restaurant.priceRange,
            rating: restaurant.rating,
            review_count: restaurant.reviewCount,
            street1: restaurant.address?.street1,
            street2: restaurant.address?.street2,
            city: restaurant.address?.city,
            state: restaurant.address?.state,
            postal_code: restaurant.address?.postalCode,
            country: restaurant.address?.country,
            latitude: restaurant.address?.latitude,
            longitude: restaurant.address?.longitude,
            phone: restaurant.phone,
            website: restaurant.website,
            image_urls: restaurant.imageUrls,
            amenities: restaurant.amenities,
            dress_code: restaurant.dressCode,
            is_date_night: restaurant.isDateNight,
            romantic_score: restaurant.romanticScore,
          })
          .onConflict(['partner_id', 'external_id'])
          .merge({
            name: restaurant.name,
            rating: restaurant.rating,
            review_count: restaurant.reviewCount,
            is_date_night: restaurant.isDateNight,
            romantic_score: restaurant.romanticScore,
            updated_at: db.fn.now(),
          });
      } catch (error: any) {
        logger.error('Failed to cache restaurant', {
          externalId: restaurant.externalId,
          error: error.message,
        });
      }
    }
  }

  /**
   * Track affiliate conversion
   */
  private async trackAffiliateConversion(
    userId: string,
    partnerId: string,
    resourceType: 'restaurant' | 'event' | 'gift',
    resourceId: string,
    orderId: string,
    trackingId: string
  ): Promise<void> {
    // Record the click/conversion
    await db('affiliate_clicks')
      .insert({
        user_id: userId,
        partner_id: partnerId,
        tracking_id: trackingId,
        resource_type: resourceType,
        resource_id: resourceId,
        converted_at: db.fn.now(),
        conversion_order_id: orderId,
      })
      .onConflict('tracking_id')
      .merge({
        converted_at: db.fn.now(),
        conversion_order_id: orderId,
      });

    // Create pending commission (will be calculated when order completes)
    const partner = await this.getPartner(partnerId);
    if (partner) {
      await db('affiliate_commissions').insert({
        partner_id: partnerId,
        order_id: orderId,
        order_type: 'reservation',
        order_amount: 0, // Will be updated when we know the check amount
        commission_rate: partner.commissionRate,
        commission_amount: 0,
        status: 'pending',
      });
    }
  }

  /**
   * Get partner by ID
   */
  private async getPartner(partnerId: string): Promise<Partner | null> {
    return db('partners').where('id', partnerId).first();
  }

  /**
   * Map database row to Reservation entity
   */
  private mapReservation(row: any): Reservation {
    return {
      id: row.id,
      userId: row.user_id,
      matchId: row.match_id,
      partnerId: row.partner_id,
      restaurantId: row.restaurant_id,
      externalReservationId: row.external_reservation_id,
      status: row.status,
      date: row.date,
      time: row.time,
      partySize: row.party_size,
      specialRequests: row.special_requests,
      confirmationCode: row.confirmation_code,
      reminderSent: row.reminder_sent,
      affiliateTrackingId: row.affiliate_tracking_id,
      commission: row.commission,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new RestaurantService();
