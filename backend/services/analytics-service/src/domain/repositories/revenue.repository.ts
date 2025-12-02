/**
 * Revenue Analytics Repository
 * Handles subscription conversions, coin purchases, and revenue metrics
 */

import { dbClient } from '../../infrastructure/database/db-client';

export interface RevenueMetrics {
  totalRevenue: number;
  subscriptionRevenue: number;
  coinPurchaseRevenue: number;
  boostRevenue: number;
  otherRevenue: number;
  transactionCount: number;
  averageTransactionValue: number;
  newSubscribers: number;
  activeSubscribers: number;
  churnedSubscribers: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
}

export interface SubscriptionMetrics {
  plan: string;
  newSubscriptions: number;
  renewals: number;
  cancellations: number;
  revenue: number;
  averageLifetimeValue: number;
  churnRate: number;
}

export interface CoinPurchaseMetrics {
  packageSize: number;
  purchaseCount: number;
  revenue: number;
  uniquePurchasers: number;
  averagePurchaseValue: number;
}

export interface ConversionFunnelMetrics {
  totalUsers: number;
  viewedPricing: number;
  startedCheckout: number;
  completedPurchase: number;
  viewToPurchaseRate: number;
  checkoutConversionRate: number;
}

export interface RevenueTransaction {
  id: string;
  userId: string;
  transactionType: 'subscription' | 'coins' | 'boost' | 'super_like' | 'other';
  amount: number;
  currency: string;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  subscriptionPlan?: string;
  coinPackageSize?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class RevenueRepository {
  /**
   * Get overall revenue metrics
   */
  async getRevenueMetrics(startDate?: Date, endDate?: Date): Promise<RevenueMetrics> {
    let query = `
      SELECT
        SUM(amount) as total_revenue,
        SUM(CASE WHEN transaction_type = 'subscription' THEN amount ELSE 0 END) as subscription_revenue,
        SUM(CASE WHEN transaction_type = 'coins' THEN amount ELSE 0 END) as coin_purchase_revenue,
        SUM(CASE WHEN transaction_type = 'boost' THEN amount ELSE 0 END) as boost_revenue,
        SUM(CASE WHEN transaction_type NOT IN ('subscription', 'coins', 'boost') THEN amount ELSE 0 END) as other_revenue,
        COUNT(*) as transaction_count,
        AVG(amount) as average_transaction_value
      FROM revenue_transactions
      WHERE status = 'completed'
    `;

    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      query += ` AND timestamp >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND timestamp <= $${params.length}`;
    }

    const result = await dbClient.query(query, params);
    const row = result.rows[0];

    // Get subscriber counts
    const subMetrics = await this.getSubscriberCounts(startDate, endDate);

    // Calculate MRR (Monthly Recurring Revenue)
    const mrrQuery = `
      SELECT SUM(amount) as mrr
      FROM revenue_transactions
      WHERE status = 'completed'
      AND transaction_type = 'subscription'
      AND timestamp >= NOW() - INTERVAL '30 days'
    `;
    const mrrResult = await dbClient.query(mrrQuery);
    const mrr = parseFloat(mrrResult.rows[0].mrr || '0');

    return {
      totalRevenue: parseFloat(row.total_revenue || '0'),
      subscriptionRevenue: parseFloat(row.subscription_revenue || '0'),
      coinPurchaseRevenue: parseFloat(row.coin_purchase_revenue || '0'),
      boostRevenue: parseFloat(row.boost_revenue || '0'),
      otherRevenue: parseFloat(row.other_revenue || '0'),
      transactionCount: parseInt(row.transaction_count, 10),
      averageTransactionValue: parseFloat(row.average_transaction_value || '0'),
      newSubscribers: subMetrics.newSubscribers,
      activeSubscribers: subMetrics.activeSubscribers,
      churnedSubscribers: subMetrics.churnedSubscribers,
      mrr,
      arr: mrr * 12,
    };
  }

  /**
   * Get subscription metrics by plan
   */
  async getSubscriptionMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<SubscriptionMetrics[]> {
    let query = `
      SELECT
        subscription_plan as plan,
        COUNT(CASE WHEN metadata->>'is_renewal' = 'false' THEN 1 END) as new_subscriptions,
        COUNT(CASE WHEN metadata->>'is_renewal' = 'true' THEN 1 END) as renewals,
        0 as cancellations,
        SUM(amount) as revenue,
        AVG(amount) as average_lifetime_value
      FROM revenue_transactions
      WHERE status = 'completed'
      AND transaction_type = 'subscription'
      AND subscription_plan IS NOT NULL
    `;

    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      query += ` AND timestamp >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND timestamp <= $${params.length}`;
    }

    query += `
      GROUP BY subscription_plan
      ORDER BY revenue DESC
    `;

    const result = await dbClient.query(query, params);

    return result.rows.map(row => ({
      plan: row.plan,
      newSubscriptions: parseInt(row.new_subscriptions, 10),
      renewals: parseInt(row.renewals, 10),
      cancellations: parseInt(row.cancellations, 10),
      revenue: parseFloat(row.revenue || '0'),
      averageLifetimeValue: parseFloat(row.average_lifetime_value || '0'),
      churnRate: 0, // Would need subscription cancellations table
    }));
  }

  /**
   * Get coin purchase metrics
   */
  async getCoinPurchaseMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<CoinPurchaseMetrics[]> {
    let query = `
      SELECT
        coin_package_size as package_size,
        COUNT(*) as purchase_count,
        SUM(amount) as revenue,
        COUNT(DISTINCT user_id) as unique_purchasers,
        AVG(amount) as average_purchase_value
      FROM revenue_transactions
      WHERE status = 'completed'
      AND transaction_type = 'coins'
      AND coin_package_size IS NOT NULL
    `;

    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      query += ` AND timestamp >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND timestamp <= $${params.length}`;
    }

    query += `
      GROUP BY coin_package_size
      ORDER BY package_size
    `;

    const result = await dbClient.query(query, params);

    return result.rows.map(row => ({
      packageSize: parseInt(row.package_size, 10),
      purchaseCount: parseInt(row.purchase_count, 10),
      revenue: parseFloat(row.revenue || '0'),
      uniquePurchasers: parseInt(row.unique_purchasers, 10),
      averagePurchaseValue: parseFloat(row.average_purchase_value || '0'),
    }));
  }

  /**
   * Get conversion funnel metrics
   */
  async getConversionFunnelMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<ConversionFunnelMetrics> {
    // Get total users in period
    let userQuery = `
      SELECT COUNT(DISTINCT user_id) as count
      FROM session_events
      WHERE user_id IS NOT NULL
    `;

    const userParams: any[] = [];

    if (startDate) {
      userParams.push(startDate);
      userQuery += ` AND start_time >= $${userParams.length}`;
    }
    if (endDate) {
      userParams.push(endDate);
      userQuery += ` AND start_time <= $${userParams.length}`;
    }

    const userResult = await dbClient.query(userQuery, userParams);
    const totalUsers = parseInt(userResult.rows[0].count, 10);

    // Get users who viewed pricing
    let pricingQuery = `
      SELECT COUNT(DISTINCT user_id) as count
      FROM tracking_events
      WHERE event_name = 'pricing_viewed'
      AND user_id IS NOT NULL
    `;

    const pricingParams: any[] = [];

    if (startDate) {
      pricingParams.push(startDate);
      pricingQuery += ` AND created_at >= $${pricingParams.length}`;
    }
    if (endDate) {
      pricingParams.push(endDate);
      pricingQuery += ` AND created_at <= $${pricingParams.length}`;
    }

    const pricingResult = await dbClient.query(pricingQuery, pricingParams);
    const viewedPricing = parseInt(pricingResult.rows[0].count, 10);

    // Get users who started checkout
    let checkoutQuery = `
      SELECT COUNT(DISTINCT user_id) as count
      FROM tracking_events
      WHERE event_name = 'checkout_started'
      AND user_id IS NOT NULL
    `;

    const checkoutParams: any[] = [];

    if (startDate) {
      checkoutParams.push(startDate);
      checkoutQuery += ` AND created_at >= $${checkoutParams.length}`;
    }
    if (endDate) {
      checkoutParams.push(endDate);
      checkoutQuery += ` AND created_at <= $${checkoutParams.length}`;
    }

    const checkoutResult = await dbClient.query(checkoutQuery, checkoutParams);
    const startedCheckout = parseInt(checkoutResult.rows[0].count, 10);

    // Get users who completed purchase
    let purchaseQuery = `
      SELECT COUNT(DISTINCT user_id) as count
      FROM revenue_transactions
      WHERE status = 'completed'
    `;

    const purchaseParams: any[] = [];

    if (startDate) {
      purchaseParams.push(startDate);
      purchaseQuery += ` AND timestamp >= $${purchaseParams.length}`;
    }
    if (endDate) {
      purchaseParams.push(endDate);
      purchaseQuery += ` AND timestamp <= $${purchaseParams.length}`;
    }

    const purchaseResult = await dbClient.query(purchaseQuery, purchaseParams);
    const completedPurchase = parseInt(purchaseResult.rows[0].count, 10);

    return {
      totalUsers,
      viewedPricing,
      startedCheckout,
      completedPurchase,
      viewToPurchaseRate: viewedPricing > 0 ? (completedPurchase / viewedPricing) * 100 : 0,
      checkoutConversionRate:
        startedCheckout > 0 ? (completedPurchase / startedCheckout) * 100 : 0,
    };
  }

  /**
   * Track a revenue transaction
   */
  async trackTransaction(data: {
    userId: string;
    transactionType: 'subscription' | 'coins' | 'boost' | 'super_like' | 'other';
    amount: number;
    currency?: string;
    paymentMethod?: string;
    status?: 'pending' | 'completed' | 'failed' | 'refunded';
    subscriptionPlan?: string;
    coinPackageSize?: number;
    metadata?: Record<string, any>;
  }): Promise<RevenueTransaction> {
    const query = `
      INSERT INTO revenue_transactions (
        user_id, transaction_type, amount, currency, payment_method,
        status, subscription_plan, coin_package_size, metadata, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `;

    const values = [
      data.userId,
      data.transactionType,
      data.amount,
      data.currency || 'USD',
      data.paymentMethod || 'unknown',
      data.status || 'pending',
      data.subscriptionPlan || null,
      data.coinPackageSize || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ];

    const result = await dbClient.query(query, values);
    return this.mapRowToTransaction(result.rows[0]);
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    id: string,
    status: 'pending' | 'completed' | 'failed' | 'refunded'
  ): Promise<RevenueTransaction> {
    const query = `
      UPDATE revenue_transactions
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await dbClient.query(query, [status, id]);

    if (result.rows.length === 0) {
      throw new Error('Transaction not found');
    }

    return this.mapRowToTransaction(result.rows[0]);
  }

  /**
   * Get revenue by time period
   */
  async getRevenueByTimePeriod(
    startDate: Date,
    endDate: Date,
    groupBy: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<Array<{ period: string; revenue: number; transactionCount: number }>> {
    const truncFunc = groupBy === 'hour' ? 'hour' : groupBy === 'week' ? 'week' : 'day';

    const query = `
      SELECT
        DATE_TRUNC('${truncFunc}', timestamp) as period,
        SUM(amount) as revenue,
        COUNT(*) as transaction_count
      FROM revenue_transactions
      WHERE status = 'completed'
      AND timestamp >= $1 AND timestamp <= $2
      GROUP BY period
      ORDER BY period DESC
    `;

    const result = await dbClient.query(query, [startDate, endDate]);

    return result.rows.map(row => ({
      period: row.period.toISOString(),
      revenue: parseFloat(row.revenue || '0'),
      transactionCount: parseInt(row.transaction_count, 10),
    }));
  }

  /**
   * Get ARPU (Average Revenue Per User)
   */
  async getARPU(startDate?: Date, endDate?: Date): Promise<number> {
    let query = `
      SELECT
        SUM(amount) / NULLIF(COUNT(DISTINCT user_id), 0) as arpu
      FROM revenue_transactions
      WHERE status = 'completed'
    `;

    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      query += ` AND timestamp >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND timestamp <= $${params.length}`;
    }

    const result = await dbClient.query(query, params);
    return parseFloat(result.rows[0].arpu || '0');
  }

  /**
   * Get ARPPU (Average Revenue Per Paying User)
   */
  async getARPPU(startDate?: Date, endDate?: Date): Promise<number> {
    let query = `
      WITH paying_users AS (
        SELECT DISTINCT user_id
        FROM revenue_transactions
        WHERE status = 'completed'
    `;

    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      query += ` AND timestamp >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND timestamp <= $${params.length}`;
    }

    query += `
      )
      SELECT
        SUM(rt.amount) / NULLIF(COUNT(DISTINCT pu.user_id), 0) as arppu
      FROM revenue_transactions rt
      JOIN paying_users pu ON rt.user_id = pu.user_id
      WHERE rt.status = 'completed'
    `;

    const result = await dbClient.query(query, params);
    return parseFloat(result.rows[0].arppu || '0');
  }

  /**
   * Get top revenue-generating users
   */
  async getTopRevenueUsers(
    limit: number = 100,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ userId: string; totalRevenue: number; transactionCount: number }>> {
    let query = `
      SELECT
        user_id,
        SUM(amount) as total_revenue,
        COUNT(*) as transaction_count
      FROM revenue_transactions
      WHERE status = 'completed'
    `;

    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      query += ` AND timestamp >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND timestamp <= $${params.length}`;
    }

    params.push(limit);
    query += `
      GROUP BY user_id
      ORDER BY total_revenue DESC
      LIMIT $${params.length}
    `;

    const result = await dbClient.query(query, params);

    return result.rows.map(row => ({
      userId: row.user_id,
      totalRevenue: parseFloat(row.total_revenue || '0'),
      transactionCount: parseInt(row.transaction_count, 10),
    }));
  }

  /**
   * Get subscriber counts
   */
  private async getSubscriberCounts(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    newSubscribers: number;
    activeSubscribers: number;
    churnedSubscribers: number;
  }> {
    // New subscribers in period
    let newQuery = `
      SELECT COUNT(DISTINCT user_id) as count
      FROM revenue_transactions
      WHERE status = 'completed'
      AND transaction_type = 'subscription'
      AND (metadata->>'is_renewal')::boolean = false
    `;

    const newParams: any[] = [];

    if (startDate) {
      newParams.push(startDate);
      newQuery += ` AND timestamp >= $${newParams.length}`;
    }
    if (endDate) {
      newParams.push(endDate);
      newQuery += ` AND timestamp <= $${newParams.length}`;
    }

    const newResult = await dbClient.query(newQuery, newParams);
    const newSubscribers = parseInt(newResult.rows[0].count, 10);

    // Active subscribers (had transaction in last 30 days)
    const activeQuery = `
      SELECT COUNT(DISTINCT user_id) as count
      FROM revenue_transactions
      WHERE status = 'completed'
      AND transaction_type = 'subscription'
      AND timestamp >= NOW() - INTERVAL '30 days'
    `;

    const activeResult = await dbClient.query(activeQuery);
    const activeSubscribers = parseInt(activeResult.rows[0].count, 10);

    return {
      newSubscribers,
      activeSubscribers,
      churnedSubscribers: 0, // Would need cancellation tracking
    };
  }

  /**
   * Map database row to RevenueTransaction
   */
  private mapRowToTransaction(row: any): RevenueTransaction {
    return {
      id: row.id,
      userId: row.user_id,
      transactionType: row.transaction_type,
      amount: parseFloat(row.amount),
      currency: row.currency,
      paymentMethod: row.payment_method,
      status: row.status,
      subscriptionPlan: row.subscription_plan,
      coinPackageSize: row.coin_package_size,
      timestamp: row.timestamp,
      metadata: row.metadata,
    };
  }
}

export const revenueRepository = new RevenueRepository();
export default revenueRepository;
