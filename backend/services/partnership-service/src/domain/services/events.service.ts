import { createLogger } from '@flamoral/backend-shared';

import { EventbriteClient } from '../../infrastructure/clients/eventbrite.client';
import { TicketmasterClient } from '../../infrastructure/clients/ticketmaster.client';
import { db } from '../../infrastructure/database/connection';
import { EventSearchParams, Ticket } from '../../types';
import { generateAffiliateTrackingId, calculateCommission } from '../entities/Affiliate.entity';
import {
  Event,
  TicketPurchase,
  TicketPurchaseCreateInput,
  TICKET_STATUS,
} from '../entities/Event.entity';
import { Partner } from '../entities/Partner.entity';

const logger = createLogger('events-service');

export class EventsService {
  private ticketmasterClient: TicketmasterClient;
  private eventbriteClient: EventbriteClient;

  constructor(ticketmasterClient?: TicketmasterClient, eventbriteClient?: EventbriteClient) {
    this.ticketmasterClient = ticketmasterClient || new TicketmasterClient();
    this.eventbriteClient = eventbriteClient || new EventbriteClient();
  }

  /**
   * Search events across all partners
   */
  async searchEvents(
    userId: string,
    params: EventSearchParams
  ): Promise<{ events: any[]; source: string }[]> {
    const results: { events: any[]; source: string }[] = [];

    // Get active event partners
    const partners = await db('partners').where('type', 'events').where('status', 'active');

    for (const partner of partners) {
      try {
        let events: any[] = [];

        if (partner.integrationType === 'ticketmaster') {
          const client = new TicketmasterClient(partner.apiKey, partner.affiliateId);
          events = await client.searchEvents(params);
        } else if (partner.integrationType === 'eventbrite') {
          const client = new EventbriteClient(partner.apiKey, partner.affiliateId);
          events = await client.searchEvents(params);
        }

        // Cache events in database
        await this.cacheEvents(partner.id, events);

        results.push({
          source: partner.integrationType,
          events: events.map((e) => ({
            ...e,
            partnerId: partner.id,
            partnerName: partner.name,
          })),
        });
      } catch (error: any) {
        logger.error(`Failed to search ${partner.integrationType} events`, {
          partnerId: partner.id,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get event details
   */
  async getEvent(partnerId: string, eventExternalId: string): Promise<any | null> {
    const partner = await this.getPartner(partnerId);
    if (!partner) {
      throw new Error('Partner not found');
    }

    try {
      if (partner.integrationType === 'ticketmaster') {
        const client = new TicketmasterClient(partner.apiKey, partner.affiliateId);
        return await client.getEvent(eventExternalId);
      } else if (partner.integrationType === 'eventbrite') {
        const client = new EventbriteClient(partner.apiKey, partner.affiliateId);
        return await client.getEvent(eventExternalId);
      }
    } catch (error: any) {
      logger.error('Failed to get event details', {
        partnerId,
        eventExternalId,
        error: error.message,
      });
      throw error;
    }

    return null;
  }

  /**
   * Get event ticket inventory
   */
  async getEventInventory(
    partnerId: string,
    eventExternalId: string
  ): Promise<{ available: boolean; ticketTypes: any[] }> {
    const partner = await this.getPartner(partnerId);
    if (!partner) {
      throw new Error('Partner not found');
    }

    try {
      if (partner.integrationType === 'ticketmaster') {
        const client = new TicketmasterClient(partner.apiKey, partner.affiliateId);
        return await client.getEventInventory(eventExternalId);
      } else if (partner.integrationType === 'eventbrite') {
        const client = new EventbriteClient(partner.apiKey, partner.affiliateId);
        const ticketClasses = await client.getTicketClasses(eventExternalId);
        const available = ticketClasses.some((tc) => tc.available > 0);
        return { available, ticketTypes: ticketClasses };
      }
    } catch (error: any) {
      logger.error('Failed to get event inventory', {
        partnerId,
        eventExternalId,
        error: error.message,
      });
      throw error;
    }

    return { available: false, ticketTypes: [] };
  }

  /**
   * Create a ticket purchase
   * Note: Actual ticket purchase typically happens through partner's checkout flow
   * This tracks the purchase after redirect back to our app
   */
  async createTicketPurchase(input: TicketPurchaseCreateInput): Promise<TicketPurchase> {
    const partner = await this.getPartner(input.partnerId);
    if (!partner) {
      throw new Error('Partner not found');
    }

    // Get event from cache
    const event = await db('events')
      .where('partner_id', input.partnerId)
      .where('id', input.eventId)
      .first();

    if (!event) {
      throw new Error('Event not found');
    }

    // Generate affiliate tracking ID
    const affiliateTrackingId = generateAffiliateTrackingId(input.userId, input.partnerId, 'event');

    // Calculate commission
    const commissionAmount =
      calculateCommission(
        input.totalAmount * 100, // Convert to cents
        partner.commissionRate
      ) / 100; // Convert back to dollars

    // Store purchase in database
    const [purchase] = await db('ticket_purchases')
      .insert({
        user_id: input.userId,
        match_id: input.matchId,
        partner_id: input.partnerId,
        event_id: input.eventId,
        status: TICKET_STATUS.PENDING,
        tickets: JSON.stringify(input.tickets),
        total_amount: input.totalAmount,
        currency: input.currency,
        affiliate_tracking_id: affiliateTrackingId,
        commission: commissionAmount,
      })
      .returning('*');

    // Track affiliate conversion
    await this.trackAffiliateConversion(
      input.userId,
      input.partnerId,
      'event',
      input.eventId,
      purchase.id,
      affiliateTrackingId,
      input.totalAmount,
      partner.commissionRate
    );

    logger.info('Ticket purchase created', {
      purchaseId: purchase.id,
      userId: input.userId,
      eventId: input.eventId,
    });

    return this.mapTicketPurchase(purchase);
  }

  /**
   * Confirm a ticket purchase (called after payment)
   */
  async confirmTicketPurchase(
    purchaseId: string,
    externalOrderId: string,
    paymentIntentId: string
  ): Promise<TicketPurchase> {
    const [updated] = await db('ticket_purchases')
      .where('id', purchaseId)
      .update({
        status: TICKET_STATUS.CONFIRMED,
        external_order_id: externalOrderId,
        payment_intent_id: paymentIntentId,
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (!updated) {
      throw new Error('Purchase not found');
    }

    // Update commission status to approved
    await db('affiliate_commissions')
      .where('order_id', purchaseId)
      .where('order_type', 'ticket')
      .update({
        status: 'approved',
        updated_at: db.fn.now(),
      });

    logger.info('Ticket purchase confirmed', { purchaseId, externalOrderId });

    return this.mapTicketPurchase(updated);
  }

  /**
   * Cancel a ticket purchase
   */
  async cancelTicketPurchase(purchaseId: string, userId: string): Promise<TicketPurchase> {
    const purchase = await db('ticket_purchases')
      .where('id', purchaseId)
      .where('user_id', userId)
      .first();

    if (!purchase) {
      throw new Error('Purchase not found');
    }

    if (purchase.status === TICKET_STATUS.CANCELLED) {
      throw new Error('Purchase is already cancelled');
    }

    const [updated] = await db('ticket_purchases')
      .where('id', purchaseId)
      .update({
        status: TICKET_STATUS.CANCELLED,
        updated_at: db.fn.now(),
      })
      .returning('*');

    // Update commission status to rejected
    await db('affiliate_commissions')
      .where('order_id', purchaseId)
      .where('order_type', 'ticket')
      .update({
        status: 'rejected',
        updated_at: db.fn.now(),
      });

    logger.info('Ticket purchase cancelled', { purchaseId });

    return this.mapTicketPurchase(updated);
  }

  /**
   * Get user's ticket purchases
   */
  async getUserTicketPurchases(userId: string, status?: string): Promise<TicketPurchase[]> {
    let query = db('ticket_purchases').where('user_id', userId).orderBy('created_at', 'desc');

    if (status) {
      query = query.where('status', status);
    }

    const purchases = await query;

    // Join with event data
    const eventIds = purchases.map((p) => p.event_id);
    const events = await db('events').whereIn('id', eventIds);
    const eventMap = new Map(events.map((e) => [e.id, e]));

    return purchases.map((p) => ({
      ...this.mapTicketPurchase(p),
      event: eventMap.get(p.event_id),
    }));
  }

  /**
   * Get date-friendly event suggestions
   */
  async getDateFriendlyEvents(
    latitude: number,
    longitude: number,
    startDate?: string,
    budget?: number
  ): Promise<any[]> {
    const params: EventSearchParams = {
      latitude,
      longitude,
      startDate: startDate || new Date().toISOString().split('T')[0],
      radiusMiles: 25,
      dateFriendlyOnly: true,
    };

    if (budget) {
      params.priceMax = budget;
    }

    const results = await this.searchEvents('system', params);

    // Flatten and sort by start date
    const allEvents = results.flatMap((r) => r.events);
    return allEvents
      .filter((e) => !e.isSoldOut)
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
      .slice(0, 20);
  }

  /**
   * Get upcoming events for a category
   */
  async getUpcomingEvents(
    latitude: number,
    longitude: number,
    category: string,
    limit: number = 10
  ): Promise<any[]> {
    const params: EventSearchParams = {
      latitude,
      longitude,
      startDate: new Date().toISOString().split('T')[0],
      category: [category as any],
      radiusMiles: 50,
    };

    const results = await this.searchEvents('system', params);
    const allEvents = results.flatMap((r) => r.events);

    return allEvents.filter((e) => !e.isSoldOut).slice(0, limit);
  }

  /**
   * Generate purchase redirect URL
   */
  generatePurchaseUrl(partnerId: string, eventExternalId: string, userId: string): string {
    const trackingId = generateAffiliateTrackingId(userId, partnerId, 'event');

    // This would be determined by the partner type
    // For now, return a placeholder that would redirect to partner checkout
    return `${process.env.APP_URL}/api/v1/partnerships/events/${eventExternalId}/checkout?tracking=${trackingId}&partner=${partnerId}`;
  }

  /**
   * Cache events in database
   */
  private async cacheEvents(partnerId: string, events: any[]): Promise<void> {
    for (const event of events) {
      try {
        await db('events')
          .insert({
            partner_id: partnerId,
            external_id: event.externalId,
            name: event.name,
            description: event.description,
            category: event.category,
            subcategory: event.subcategory,
            venue_name: event.venue?.name,
            venue_street1: event.venue?.address?.street1,
            venue_city: event.venue?.address?.city,
            venue_state: event.venue?.address?.state,
            venue_postal_code: event.venue?.address?.postalCode,
            venue_country: event.venue?.address?.country,
            venue_latitude: event.venue?.address?.latitude,
            venue_longitude: event.venue?.address?.longitude,
            venue_capacity: event.venue?.capacity,
            start_date_time: event.startDateTime,
            end_date_time: event.endDateTime,
            image_urls: event.imageUrls,
            price_min: event.priceRange?.min,
            price_max: event.priceRange?.max,
            currency: event.priceRange?.currency,
            is_date_friendly: event.isDateFriendly,
            age_restriction: event.ageRestriction,
            is_sold_out: event.isSoldOut,
            url: event.url,
          })
          .onConflict(['partner_id', 'external_id'])
          .merge({
            name: event.name,
            price_min: event.priceRange?.min,
            price_max: event.priceRange?.max,
            is_sold_out: event.isSoldOut,
            is_date_friendly: event.isDateFriendly,
            updated_at: db.fn.now(),
          });
      } catch (error: any) {
        logger.error('Failed to cache event', {
          externalId: event.externalId,
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
    trackingId: string,
    orderAmount: number,
    commissionRate: number
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

    // Create pending commission
    const commissionAmount = calculateCommission(orderAmount * 100, commissionRate) / 100;
    await db('affiliate_commissions').insert({
      partner_id: partnerId,
      order_id: orderId,
      order_type: 'ticket',
      order_amount: orderAmount,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      currency: 'USD',
      status: 'pending',
    });
  }

  /**
   * Get partner by ID
   */
  private async getPartner(partnerId: string): Promise<Partner | null> {
    return db('partners').where('id', partnerId).first();
  }

  /**
   * Map database row to TicketPurchase entity
   */
  private mapTicketPurchase(row: any): TicketPurchase {
    return {
      id: row.id,
      userId: row.user_id,
      matchId: row.match_id,
      partnerId: row.partner_id,
      eventId: row.event_id,
      externalOrderId: row.external_order_id,
      status: row.status,
      tickets: typeof row.tickets === 'string' ? JSON.parse(row.tickets) : row.tickets,
      totalAmount: parseFloat(row.total_amount),
      currency: row.currency,
      paymentIntentId: row.payment_intent_id,
      affiliateTrackingId: row.affiliate_tracking_id,
      commission: row.commission ? parseFloat(row.commission) : undefined,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new EventsService();
