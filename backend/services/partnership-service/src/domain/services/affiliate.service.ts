import { createLogger } from '@flamoral/backend-shared';

import { db } from '../../infrastructure/database/connection';
import {
  AffiliateClick,
  AffiliateCommission,
  AffiliateCommissionCreateInput,
  AFFILIATE_CONFIG,
  calculateCommission,
  generateAffiliateTrackingId,
} from '../entities/Affiliate.entity';
import { Partner } from '../entities/Partner.entity';

const logger = createLogger('affiliate-service');

export class AffiliateService {
  /**
   * Track a click/view on a partner resource
   */
  async trackClick(params: {
    userId: string;
    partnerId: string;
    resourceType: 'restaurant' | 'event' | 'gift';
    resourceId: string;
    referrerUrl?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{ trackingId: string }> {
    const trackingId = generateAffiliateTrackingId(
      params.userId,
      params.partnerId,
      params.resourceType
    );

    try {
      await db('affiliate_clicks').insert({
        user_id: params.userId,
        partner_id: params.partnerId,
        tracking_id: trackingId,
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        referrer_url: params.referrerUrl,
        user_agent: params.userAgent,
        ip_address: params.ipAddress,
      });

      logger.debug('Affiliate click tracked', {
        trackingId,
        userId: params.userId,
        resourceType: params.resourceType,
      });

      return { trackingId };
    } catch (error: any) {
      // Handle duplicate tracking IDs gracefully
      if (error.code === '23505') {
        logger.debug('Duplicate click tracking ignored', { trackingId });
        return { trackingId };
      }
      throw error;
    }
  }

  /**
   * Record a conversion (when a tracked click leads to a purchase)
   */
  async recordConversion(params: {
    trackingId: string;
    orderId: string;
    orderType: 'reservation' | 'ticket' | 'gift';
    orderAmount: number;
    currency?: string;
  }): Promise<AffiliateCommission> {
    // Find the click
    const click = await db('affiliate_clicks').where('tracking_id', params.trackingId).first();

    if (!click) {
      throw new Error('Tracking ID not found');
    }

    // Check if already converted
    if (click.converted_at) {
      throw new Error('Click already converted');
    }

    // Check attribution window
    const clickTime = new Date(click.created_at).getTime();
    const now = Date.now();
    const hoursSinceClick = (now - clickTime) / (1000 * 60 * 60);

    if (hoursSinceClick > AFFILIATE_CONFIG.ATTRIBUTION_WINDOW_HOURS) {
      logger.warn('Conversion outside attribution window', {
        trackingId: params.trackingId,
        hoursSinceClick,
      });
    }

    // Get partner commission rate
    const partner = await db('partners').where('id', click.partner_id).first();

    if (!partner) {
      throw new Error('Partner not found');
    }

    // Calculate commission
    const commissionAmount =
      calculateCommission(
        params.orderAmount * 100, // Convert to cents
        partner.commissionRate
      ) / 100; // Convert back to dollars

    // Update click with conversion info
    await db('affiliate_clicks').where('tracking_id', params.trackingId).update({
      converted_at: db.fn.now(),
      conversion_order_id: params.orderId,
    });

    // Create commission record
    const [commission] = await db('affiliate_commissions')
      .insert({
        partner_id: click.partner_id,
        order_id: params.orderId,
        order_type: params.orderType,
        order_amount: params.orderAmount,
        commission_rate: partner.commissionRate,
        commission_amount: commissionAmount,
        currency: params.currency || 'USD',
        status: 'pending',
      })
      .returning('*');

    logger.info('Conversion recorded', {
      trackingId: params.trackingId,
      orderId: params.orderId,
      commissionAmount,
    });

    return this.mapCommission(commission);
  }

  /**
   * Approve pending commissions (after refund window)
   */
  async approveEligibleCommissions(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - AFFILIATE_CONFIG.APPROVAL_WAIT_DAYS);

    const result = await db('affiliate_commissions')
      .where('status', 'pending')
      .where('created_at', '<', cutoffDate)
      .update({
        status: 'approved',
        updated_at: db.fn.now(),
      });

    const count = typeof result === 'number' ? result : 0;
    logger.info('Approved commissions', { count });

    return count;
  }

  /**
   * Get commission statistics for a partner
   */
  async getPartnerCommissionStats(partnerId: string): Promise<{
    pending: { count: number; amount: number };
    approved: { count: number; amount: number };
    paid: { count: number; amount: number };
    rejected: { count: number; amount: number };
    total: { count: number; amount: number };
  }> {
    const stats = await db('affiliate_commissions')
      .where('partner_id', partnerId)
      .select('status')
      .count('* as count')
      .sum('commission_amount as amount')
      .groupBy('status');

    const result = {
      pending: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 },
      total: { count: 0, amount: 0 },
    };

    for (const row of stats) {
      const count = parseInt(row.count as string) || 0;
      const amount = parseFloat(row.amount as string) || 0;

      result[row.status as keyof typeof result] = { count, amount };
      result.total.count += count;
      if (row.status !== 'rejected') {
        result.total.amount += amount;
      }
    }

    return result;
  }

  /**
   * Get all commissions for a partner with pagination
   */
  async getPartnerCommissions(
    partnerId: string,
    params: {
      status?: string;
      orderType?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    commissions: AffiliateCommission[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    let query = db('affiliate_commissions').where('partner_id', partnerId);

    if (params.status) {
      query = query.where('status', params.status);
    }
    if (params.orderType) {
      query = query.where('order_type', params.orderType);
    }
    if (params.startDate) {
      query = query.where('created_at', '>=', params.startDate);
    }
    if (params.endDate) {
      query = query.where('created_at', '<=', params.endDate);
    }

    // Get total count
    const [{ count }] = await query.clone().count('* as count');
    const total = parseInt(count as string) || 0;

    // Get paginated results
    const commissions = await query.orderBy('created_at', 'desc').limit(limit).offset(offset);

    return {
      commissions: commissions.map((c) => this.mapCommission(c)),
      total,
      page,
      limit,
    };
  }

  /**
   * Mark commissions as paid
   */
  async markCommissionsAsPaid(commissionIds: string[], paymentReference?: string): Promise<number> {
    const result = await db('affiliate_commissions')
      .whereIn('id', commissionIds)
      .where('status', 'approved')
      .update({
        status: 'paid',
        paid_at: db.fn.now(),
        updated_at: db.fn.now(),
        metadata: db.raw(`metadata || '{"payment_reference": "${paymentReference}"}'::jsonb`),
      });

    const count = typeof result === 'number' ? result : 0;
    logger.info('Marked commissions as paid', {
      count,
      commissionIds,
      paymentReference,
    });

    return count;
  }

  /**
   * Reject a commission (e.g., due to refund)
   */
  async rejectCommission(orderId: string, orderType: string, reason: string): Promise<void> {
    await db('affiliate_commissions')
      .where('order_id', orderId)
      .where('order_type', orderType)
      .update({
        status: 'rejected',
        updated_at: db.fn.now(),
        metadata: db.raw(`metadata || '{"rejection_reason": "${reason}"}'::jsonb`),
      });

    logger.info('Commission rejected', { orderId, orderType, reason });
  }

  /**
   * Get click analytics for a partner
   */
  async getClickAnalytics(
    partnerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalClicks: number;
    conversions: number;
    conversionRate: number;
    byResourceType: Record<string, { clicks: number; conversions: number }>;
    byDay: { date: string; clicks: number; conversions: number }[];
  }> {
    // Total clicks and conversions
    const [totals] = (await db('affiliate_clicks')
      .where('partner_id', partnerId)
      .whereBetween('created_at', [startDate, endDate])
      .select(
        db.raw('COUNT(*) as total_clicks'),
        db.raw('COUNT(converted_at) as conversions')
      )) as { total_clicks: string; conversions: string }[];

    const totalClicks = parseInt(totals.total_clicks) || 0;
    const conversions = parseInt(totals.conversions) || 0;
    const conversionRate = totalClicks > 0 ? (conversions / totalClicks) * 100 : 0;

    // By resource type
    const byResourceType = await db('affiliate_clicks')
      .where('partner_id', partnerId)
      .whereBetween('created_at', [startDate, endDate])
      .select('resource_type')
      .count('* as clicks')
      .count('converted_at as conversions')
      .groupBy('resource_type');

    const resourceTypeMap: Record<string, { clicks: number; conversions: number }> = {};
    for (const row of byResourceType) {
      resourceTypeMap[row.resource_type] = {
        clicks: parseInt(row.clicks as string) || 0,
        conversions: parseInt(row.conversions as string) || 0,
      };
    }

    // By day
    const byDay = await db('affiliate_clicks')
      .where('partner_id', partnerId)
      .whereBetween('created_at', [startDate, endDate])
      .select(db.raw('DATE(created_at) as date'))
      .count('* as clicks')
      .count('converted_at as conversions')
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date');

    return {
      totalClicks,
      conversions,
      conversionRate: Math.round(conversionRate * 100) / 100,
      byResourceType: resourceTypeMap,
      byDay: byDay.map((row: any) => ({
        date: row.date,
        clicks: parseInt(row.clicks as string) || 0,
        conversions: parseInt(row.conversions as string) || 0,
      })),
    };
  }

  /**
   * Generate payout report for a partner
   */
  async generatePayoutReport(partnerId: string): Promise<{
    partner: Partner;
    pendingPayout: number;
    approvedCommissions: AffiliateCommission[];
    readyForPayout: boolean;
  }> {
    const partner = await db('partners').where('id', partnerId).first();
    if (!partner) {
      throw new Error('Partner not found');
    }

    const approvedCommissions = await db('affiliate_commissions')
      .where('partner_id', partnerId)
      .where('status', 'approved')
      .orderBy('created_at', 'asc');

    const pendingPayout = approvedCommissions.reduce(
      (sum, c) => sum + parseFloat(c.commission_amount),
      0
    );

    const readyForPayout = pendingPayout >= AFFILIATE_CONFIG.PAYOUT_THRESHOLD / 100;

    return {
      partner: this.mapPartner(partner),
      pendingPayout: Math.round(pendingPayout * 100) / 100,
      approvedCommissions: approvedCommissions.map((c) => this.mapCommission(c)),
      readyForPayout,
    };
  }

  /**
   * Map database row to AffiliateCommission entity
   */
  private mapCommission(row: any): AffiliateCommission {
    return {
      id: row.id,
      partnerId: row.partner_id,
      orderId: row.order_id,
      orderType: row.order_type,
      orderAmount: parseFloat(row.order_amount),
      commissionRate: parseFloat(row.commission_rate),
      commissionAmount: parseFloat(row.commission_amount),
      currency: row.currency,
      status: row.status,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to Partner entity
   */
  private mapPartner(row: any): Partner {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      integrationType: row.integration_type,
      status: row.status,
      apiKey: row.api_key,
      apiSecret: row.api_secret,
      webhookSecret: row.webhook_secret,
      baseUrl: row.base_url,
      affiliateId: row.affiliate_id,
      commissionRate: parseFloat(row.commission_rate),
      metadata: row.metadata,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      logoUrl: row.logo_url,
      description: row.description,
      termsUrl: row.terms_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new AffiliateService();
