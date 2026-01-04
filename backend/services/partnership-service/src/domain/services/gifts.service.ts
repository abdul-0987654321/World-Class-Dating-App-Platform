import { createLogger } from '@flamoral/backend-shared';
import { db } from '../../infrastructure/database/connection';
import { FlowersClient } from '../../infrastructure/clients/flowers.client';
import {
  GiftProduct,
  GiftOrder,
  GiftOrderCreateInput,
  GIFT_ORDER_STATUS,
} from '../entities/Gift.entity';
import { Partner } from '../entities/Partner.entity';
import { GiftCategory, Address, DeliveryOption, GiftOrderItem } from '../../types';
import {
  generateAffiliateTrackingId,
  calculateCommission,
} from '../entities/Affiliate.entity';

const logger = createLogger('gifts-service');

export class GiftsService {
  private flowersClient: FlowersClient;

  constructor(flowersClient?: FlowersClient) {
    this.flowersClient = flowersClient || new FlowersClient();
  }

  /**
   * Search gift products
   */
  async searchProducts(
    userId: string,
    params: {
      category?: GiftCategory;
      occasion?: string;
      priceMin?: number;
      priceMax?: number;
      romantic?: boolean;
      sortBy?: 'price' | 'rating' | 'popular';
      limit?: number;
      offset?: number;
    }
  ): Promise<{ products: any[]; source: string }[]> {
    const results: { products: any[]; source: string }[] = [];

    // Get active gift partners
    const partners = await db('partners')
      .where('type', 'gifts')
      .where('status', 'active');

    for (const partner of partners) {
      try {
        let products: any[] = [];

        if (partner.integrationType === 'flowers') {
          const client = new FlowersClient(partner.apiKey, partner.affiliateId);
          products = await client.searchProducts(params);
        }

        // Filter for romantic products if requested
        if (params.romantic) {
          products = products.filter(p => p.isRomantic);
        }

        // Cache products in database
        await this.cacheProducts(partner.id, products);

        results.push({
          source: partner.integrationType,
          products: products.map(p => ({
            ...p,
            partnerId: partner.id,
            partnerName: partner.name,
          })),
        });
      } catch (error: any) {
        logger.error(`Failed to search ${partner.integrationType} products`, {
          partnerId: partner.id,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get product details
   */
  async getProduct(partnerId: string, productExternalId: string): Promise<any | null> {
    const partner = await this.getPartner(partnerId);
    if (!partner) {
      throw new Error('Partner not found');
    }

    try {
      if (partner.integrationType === 'flowers') {
        const client = new FlowersClient(partner.apiKey, partner.affiliateId);
        return await client.getProduct(productExternalId);
      }
    } catch (error: any) {
      logger.error('Failed to get product details', {
        partnerId,
        productExternalId,
        error: error.message,
      });
      throw error;
    }

    return null;
  }

  /**
   * Get delivery options for a product and zip code
   */
  async getDeliveryOptions(
    partnerId: string,
    productExternalId: string,
    zipCode: string,
    date?: string
  ): Promise<DeliveryOption[]> {
    const partner = await this.getPartner(partnerId);
    if (!partner) {
      throw new Error('Partner not found');
    }

    try {
      if (partner.integrationType === 'flowers') {
        const client = new FlowersClient(partner.apiKey, partner.affiliateId);
        return await client.getDeliveryOptions(productExternalId, zipCode, date);
      }
    } catch (error: any) {
      logger.error('Failed to get delivery options', {
        partnerId,
        productExternalId,
        error: error.message,
      });
      throw error;
    }

    return [];
  }

  /**
   * Create a gift order
   */
  async createGiftOrder(input: GiftOrderCreateInput): Promise<GiftOrder> {
    const partner = await this.getPartner(input.partnerId);
    if (!partner) {
      throw new Error('Partner not found');
    }

    // Calculate totals
    const subtotal = input.items.reduce((sum, item) => sum + item.totalPrice, 0);

    // Get delivery option details
    const deliveryOption = await this.getDeliveryOptionById(
      input.partnerId,
      input.items[0].productId, // Assuming single product for simplicity
      input.deliveryOptionId,
      input.shippingAddress.postalCode
    );

    if (!deliveryOption) {
      throw new Error('Delivery option not found');
    }

    // Calculate tax (simplified - would use tax service in production)
    const taxRate = 0.08; // 8% default
    const tax = Math.round(subtotal * taxRate * 100) / 100;

    const totalAmount = subtotal + deliveryOption.price + tax;

    // Generate affiliate tracking ID
    const affiliateTrackingId = generateAffiliateTrackingId(
      input.userId,
      input.partnerId,
      'gift'
    );

    // Calculate commission
    const commissionAmount = calculateCommission(
      totalAmount * 100,
      partner.commissionRate
    ) / 100;

    // Store order in database
    const [order] = await db('gift_orders')
      .insert({
        user_id: input.userId,
        recipient_match_id: input.recipientMatchId,
        partner_id: input.partnerId,
        status: GIFT_ORDER_STATUS.PENDING,
        items: JSON.stringify(input.items),
        shipping_address: JSON.stringify(input.shippingAddress),
        billing_address: input.billingAddress ? JSON.stringify(input.billingAddress) : null,
        delivery_option: JSON.stringify(deliveryOption),
        gift_message: input.giftMessage,
        is_anonymous: input.isAnonymous || false,
        subtotal,
        shipping_cost: deliveryOption.price,
        tax,
        total_amount: totalAmount,
        currency: 'USD',
        affiliate_tracking_id: affiliateTrackingId,
        commission: commissionAmount,
      })
      .returning('*');

    // Track affiliate conversion
    await this.trackAffiliateConversion(
      input.userId,
      input.partnerId,
      'gift',
      input.items[0].productId,
      order.id,
      affiliateTrackingId,
      totalAmount,
      partner.commissionRate
    );

    logger.info('Gift order created', {
      orderId: order.id,
      userId: input.userId,
      totalAmount,
    });

    return this.mapGiftOrder(order);
  }

  /**
   * Confirm a gift order (after payment)
   */
  async confirmGiftOrder(
    orderId: string,
    paymentIntentId: string
  ): Promise<GiftOrder> {
    const order = await db('gift_orders').where('id', orderId).first();
    if (!order) {
      throw new Error('Order not found');
    }

    const partner = await this.getPartner(order.partner_id);
    if (!partner) {
      throw new Error('Partner not found');
    }

    // Submit order to partner
    try {
      if (partner.integrationType === 'flowers') {
        const client = new FlowersClient(partner.apiKey, partner.affiliateId);
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        const shippingAddress = typeof order.shipping_address === 'string'
          ? JSON.parse(order.shipping_address)
          : order.shipping_address;
        const deliveryOption = typeof order.delivery_option === 'string'
          ? JSON.parse(order.delivery_option)
          : order.delivery_option;

        const result = await client.createOrder({
          items: items.map((item: GiftOrderItem) => ({
            productId: item.productId,
            quantity: item.quantity,
            selectedOptions: item.selectedOptions?.map(o => o.id),
          })),
          shippingAddress,
          deliveryOptionId: deliveryOption.id,
          giftMessage: order.gift_message,
          affiliateTrackingId: order.affiliate_tracking_id,
          paymentToken: paymentIntentId,
        });

        // Update order with external order info
        const [updated] = await db('gift_orders')
          .where('id', orderId)
          .update({
            status: GIFT_ORDER_STATUS.CONFIRMED,
            external_order_id: result.orderId,
            payment_intent_id: paymentIntentId,
            estimated_delivery_date: result.estimatedDelivery,
            updated_at: db.fn.now(),
          })
          .returning('*');

        // Update commission status to approved
        await db('affiliate_commissions')
          .where('order_id', orderId)
          .where('order_type', 'gift')
          .update({
            status: 'approved',
            updated_at: db.fn.now(),
          });

        logger.info('Gift order confirmed', {
          orderId,
          externalOrderId: result.orderId,
        });

        return this.mapGiftOrder(updated);
      }
    } catch (error: any) {
      logger.error('Failed to submit order to partner', {
        orderId,
        error: error.message,
      });
      throw new Error(`Failed to confirm order: ${error.message}`);
    }

    throw new Error('Unsupported partner type');
  }

  /**
   * Cancel a gift order
   */
  async cancelGiftOrder(orderId: string, userId: string): Promise<GiftOrder> {
    const order = await db('gift_orders')
      .where('id', orderId)
      .where('user_id', userId)
      .first();

    if (!order) {
      throw new Error('Order not found');
    }

    // Check if order can be cancelled
    const cancellableStatuses = [GIFT_ORDER_STATUS.PENDING, GIFT_ORDER_STATUS.CONFIRMED];
    if (!cancellableStatuses.includes(order.status)) {
      throw new Error('Order cannot be cancelled');
    }

    const partner = await this.getPartner(order.partner_id);

    // Try to cancel with partner if order was confirmed
    if (order.status === GIFT_ORDER_STATUS.CONFIRMED && order.external_order_id && partner) {
      try {
        if (partner.integrationType === 'flowers') {
          const client = new FlowersClient(partner.apiKey, partner.affiliateId);
          await client.cancelOrder(order.external_order_id);
        }
      } catch (error: any) {
        logger.error('Failed to cancel order with partner', {
          orderId,
          error: error.message,
        });
      }
    }

    // Update database
    const [updated] = await db('gift_orders')
      .where('id', orderId)
      .update({
        status: GIFT_ORDER_STATUS.CANCELLED,
        updated_at: db.fn.now(),
      })
      .returning('*');

    // Update commission status to rejected
    await db('affiliate_commissions')
      .where('order_id', orderId)
      .where('order_type', 'gift')
      .update({
        status: 'rejected',
        updated_at: db.fn.now(),
      });

    logger.info('Gift order cancelled', { orderId });

    return this.mapGiftOrder(updated);
  }

  /**
   * Get order status from partner
   */
  async getOrderStatus(orderId: string): Promise<{
    status: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
  }> {
    const order = await db('gift_orders').where('id', orderId).first();
    if (!order || !order.external_order_id) {
      throw new Error('Order not found');
    }

    const partner = await this.getPartner(order.partner_id);
    if (!partner) {
      throw new Error('Partner not found');
    }

    try {
      if (partner.integrationType === 'flowers') {
        const client = new FlowersClient(partner.apiKey, partner.affiliateId);
        const status = await client.getOrderStatus(order.external_order_id);

        // Update local status if different
        if (status.trackingNumber && status.trackingNumber !== order.tracking_number) {
          await db('gift_orders')
            .where('id', orderId)
            .update({
              tracking_number: status.trackingNumber,
              updated_at: db.fn.now(),
            });
        }

        return status;
      }
    } catch (error: any) {
      logger.error('Failed to get order status', {
        orderId,
        error: error.message,
      });
      throw error;
    }

    return { status: order.status };
  }

  /**
   * Get user's gift orders
   */
  async getUserGiftOrders(userId: string, status?: string): Promise<GiftOrder[]> {
    let query = db('gift_orders')
      .where('user_id', userId)
      .orderBy('created_at', 'desc');

    if (status) {
      query = query.where('status', status);
    }

    const orders = await query;
    return orders.map(o => this.mapGiftOrder(o));
  }

  /**
   * Get romantic gift suggestions
   */
  async getRomanticSuggestions(budget?: number): Promise<any[]> {
    const results = await this.searchProducts('system', {
      romantic: true,
      priceMax: budget,
      sortBy: 'popular',
      limit: 10,
    });

    return results.flatMap(r => r.products);
  }

  /**
   * Get gift ideas for an occasion
   */
  async getGiftIdeasForOccasion(
    occasion: string,
    budget?: number
  ): Promise<any[]> {
    const results = await this.searchProducts('system', {
      occasion,
      priceMax: budget,
      sortBy: 'popular',
      limit: 15,
    });

    return results.flatMap(r => r.products);
  }

  /**
   * Get delivery option by ID
   */
  private async getDeliveryOptionById(
    partnerId: string,
    productId: string,
    deliveryOptionId: string,
    zipCode: string
  ): Promise<DeliveryOption | null> {
    const options = await this.getDeliveryOptions(
      partnerId,
      productId,
      zipCode
    );
    return options.find(o => o.id === deliveryOptionId) || null;
  }

  /**
   * Cache products in database
   */
  private async cacheProducts(partnerId: string, products: any[]): Promise<void> {
    for (const product of products) {
      try {
        await db('gift_products')
          .insert({
            partner_id: partnerId,
            external_id: product.externalId,
            name: product.name,
            description: product.description,
            category: product.category,
            price: product.price,
            currency: product.currency,
            image_urls: product.imageUrls,
            options: JSON.stringify(product.options || []),
            is_available: product.isAvailable,
            delivery_options: JSON.stringify(product.deliveryOptions || []),
            is_romantic: product.isRomantic,
            occasion_tags: product.occasionTags || [],
          })
          .onConflict(['partner_id', 'external_id'])
          .merge({
            name: product.name,
            price: product.price,
            is_available: product.isAvailable,
            is_romantic: product.isRomantic,
            updated_at: db.fn.now(),
          });
      } catch (error: any) {
        logger.error('Failed to cache product', {
          externalId: product.externalId,
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

    const commissionAmount = calculateCommission(orderAmount * 100, commissionRate) / 100;
    await db('affiliate_commissions').insert({
      partner_id: partnerId,
      order_id: orderId,
      order_type: 'gift',
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
   * Map database row to GiftOrder entity
   */
  private mapGiftOrder(row: any): GiftOrder {
    return {
      id: row.id,
      userId: row.user_id,
      recipientMatchId: row.recipient_match_id,
      partnerId: row.partner_id,
      externalOrderId: row.external_order_id,
      status: row.status,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      shippingAddress: typeof row.shipping_address === 'string'
        ? JSON.parse(row.shipping_address)
        : row.shipping_address,
      billingAddress: row.billing_address
        ? (typeof row.billing_address === 'string'
          ? JSON.parse(row.billing_address)
          : row.billing_address)
        : undefined,
      deliveryOption: typeof row.delivery_option === 'string'
        ? JSON.parse(row.delivery_option)
        : row.delivery_option,
      giftMessage: row.gift_message,
      isAnonymous: row.is_anonymous,
      subtotal: parseFloat(row.subtotal),
      shippingCost: parseFloat(row.shipping_cost),
      tax: parseFloat(row.tax),
      totalAmount: parseFloat(row.total_amount),
      currency: row.currency,
      paymentIntentId: row.payment_intent_id,
      affiliateTrackingId: row.affiliate_tracking_id,
      commission: row.commission ? parseFloat(row.commission) : undefined,
      trackingNumber: row.tracking_number,
      estimatedDeliveryDate: row.estimated_delivery_date,
      actualDeliveryDate: row.actual_delivery_date,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new GiftsService();
