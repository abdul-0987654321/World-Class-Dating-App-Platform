import { Knex } from 'knex';
import { SubscriptionModel, TransactionModel, CoinTransactionModel } from '../models/Payment.model';
import { v4 as uuidv4 } from 'uuid';

export class PaymentRepository {
  private db: Knex;

  constructor(db: Knex) {
    this.db = db;
  }

  // Subscription operations
  async createSubscription(
    userId: string,
    stripeCustomerId: string,
    tier: 'premium' | 'premium_plus',
    stripeSubscriptionId?: string
  ): Promise<SubscriptionModel> {
    const subscriptionId = uuidv4();

    const [subscription] = await this.db('subscriptions')
      .insert({
        id: subscriptionId,
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        tier,
        status: stripeSubscriptionId ? 'active' : 'trialing',
        cancel_at_period_end: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return subscription;
  }

  async getSubscription(userId: string): Promise<SubscriptionModel | null> {
    const subscription = await this.db('subscriptions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .first();

    return subscription || null;
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<SubscriptionModel | null> {
    const subscription = await this.db('subscriptions')
      .where({ stripe_subscription_id: stripeSubscriptionId })
      .first();

    return subscription || null;
  }

  async updateSubscription(
    userId: string,
    updates: {
      status?: string;
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
      cancelAtPeriodEnd?: boolean;
      canceledAt?: Date;
    }
  ): Promise<SubscriptionModel> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.currentPeriodStart !== undefined) updateData.current_period_start = updates.currentPeriodStart;
    if (updates.currentPeriodEnd !== undefined) updateData.current_period_end = updates.currentPeriodEnd;
    if (updates.cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = updates.cancelAtPeriodEnd;
    if (updates.canceledAt !== undefined) updateData.canceled_at = updates.canceledAt;

    const [subscription] = await this.db('subscriptions')
      .where({ user_id: userId })
      .update(updateData)
      .returning('*');

    return subscription;
  }

  async cancelSubscription(userId: string): Promise<void> {
    await this.db('subscriptions')
      .where({ user_id: userId })
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date(),
        updated_at: new Date(),
      });
  }

  // Transaction operations
  async createTransaction(
    userId: string,
    type: 'subscription' | 'coin_purchase' | 'refund' | 'boost' | 'super_like',
    amount: number,
    currency: string = 'usd',
    stripePaymentIntentId?: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<TransactionModel> {
    const transactionId = uuidv4();

    const [transaction] = await this.db('transactions')
      .insert({
        id: transactionId,
        user_id: userId,
        type,
        amount,
        currency,
        stripe_payment_intent_id: stripePaymentIntentId,
        status: 'pending',
        description,
        metadata: metadata ? JSON.stringify(metadata) : null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    if (transaction.metadata) {
      transaction.metadata = JSON.parse(transaction.metadata);
    }

    return transaction;
  }

  async getTransaction(transactionId: string): Promise<TransactionModel | null> {
    const transaction = await this.db('transactions')
      .where({ id: transactionId })
      .first();

    if (transaction && transaction.metadata) {
      transaction.metadata = JSON.parse(transaction.metadata);
    }

    return transaction || null;
  }

  async getTransactionByStripeIntentId(stripePaymentIntentId: string): Promise<TransactionModel | null> {
    const transaction = await this.db('transactions')
      .where({ stripe_payment_intent_id: stripePaymentIntentId })
      .first();

    if (transaction && transaction.metadata) {
      transaction.metadata = JSON.parse(transaction.metadata);
    }

    return transaction || null;
  }

  async updateTransactionStatus(
    transactionId: string,
    status: 'succeeded' | 'failed' | 'refunded',
    stripeChargeId?: string
  ): Promise<TransactionModel> {
    const [transaction] = await this.db('transactions')
      .where({ id: transactionId })
      .update({
        status,
        stripe_charge_id: stripeChargeId,
        updated_at: new Date(),
      })
      .returning('*');

    if (transaction.metadata) {
      transaction.metadata = JSON.parse(transaction.metadata);
    }

    return transaction;
  }

  async getUserTransactions(userId: string, limit: number = 50, offset: number = 0): Promise<TransactionModel[]> {
    const transactions = await this.db('transactions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return transactions.map(t => {
      if (t.metadata) {
        t.metadata = JSON.parse(t.metadata);
      }
      return t;
    });
  }

  // Coin transaction operations
  async createCoinTransaction(
    userId: string,
    amount: number,
    type: 'purchase' | 'spend' | 'refund' | 'bonus',
    reason?: string
  ): Promise<CoinTransactionModel> {
    const transactionId = uuidv4();

    // Get current balance
    const user = await this.db('users')
      .where({ id: userId })
      .select('coin_balance')
      .first();

    const newBalance = (user?.coin_balance || 0) + amount;

    const [coinTransaction] = await this.db('coin_transactions')
      .insert({
        id: transactionId,
        user_id: userId,
        amount,
        type,
        reason,
        balance_after: newBalance,
        created_at: new Date(),
      })
      .returning('*');

    // Update user's coin balance
    await this.db('users')
      .where({ id: userId })
      .update({ coin_balance: newBalance });

    return coinTransaction;
  }

  async getCoinTransactions(userId: string, limit: number = 50, offset: number = 0): Promise<CoinTransactionModel[]> {
    const transactions = await this.db('coin_transactions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return transactions;
  }

  async getCoinBalance(userId: string): Promise<number> {
    const user = await this.db('users')
      .where({ id: userId })
      .select('coin_balance')
      .first();

    return user?.coin_balance || 0;
  }

  // Revenue analytics
  async getRevenueStats(startDate: Date, endDate: Date): Promise<{
    totalRevenue: number;
    subscriptionRevenue: number;
    coinRevenue: number;
    transactionCount: number;
  }> {
    const result = await this.db('transactions')
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .where({ status: 'succeeded' })
      .select(
        this.db.raw('SUM(amount) as total_revenue'),
        this.db.raw('SUM(CASE WHEN type = \'subscription\' THEN amount ELSE 0 END) as subscription_revenue'),
        this.db.raw('SUM(CASE WHEN type = \'coin_purchase\' THEN amount ELSE 0 END) as coin_revenue'),
        this.db.raw('COUNT(*) as transaction_count')
      )
      .first();

    return {
      totalRevenue: Number(result?.total_revenue || 0) / 100, // Convert from cents to dollars
      subscriptionRevenue: Number(result?.subscription_revenue || 0) / 100,
      coinRevenue: Number(result?.coin_revenue || 0) / 100,
      transactionCount: Number(result?.transaction_count || 0),
    };
  }
}
