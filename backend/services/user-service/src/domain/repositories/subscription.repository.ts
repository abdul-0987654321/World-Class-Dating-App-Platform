import db from '../../infrastructure/database/connection';
import {
  Subscription,
  SubscriptionCreateInput,
  SubscriptionUpdateInput,
  SUBSCRIPTION_STATUS,
} from '../entities/Subscription.entity';

export class SubscriptionRepository {
  private tableName = 'subscriptions';

  async create(input: SubscriptionCreateInput): Promise<Subscription> {
    const now = new Date();
    const subscriptionData: any = {
      user_id: input.userId,
      tier: input.tier,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      stripe_price_id: input.stripePriceId,
      cancel_at_period_end: false,
      created_at: now,
      updated_at: now,
    };

    // Handle trial period if specified
    if (input.trialDays && input.trialDays > 0) {
      subscriptionData.status = SUBSCRIPTION_STATUS.TRIALING;
      subscriptionData.trial_start = now;
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + input.trialDays);
      subscriptionData.trial_end = trialEnd;
    }

    const [subscription] = await db(this.tableName).insert(subscriptionData).returning('*');

    return this.mapToEntity(subscription);
  }

  async findById(id: string): Promise<Subscription | null> {
    const subscription = await db(this.tableName).where({ id }).first();

    return subscription ? this.mapToEntity(subscription) : null;
  }

  async findByUserId(userId: string): Promise<Subscription | null> {
    const subscription = await db(this.tableName).where({ user_id: userId }).first();

    return subscription ? this.mapToEntity(subscription) : null;
  }

  async findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | null> {
    const subscription = await db(this.tableName)
      .where({ stripe_subscription_id: stripeSubscriptionId })
      .first();

    return subscription ? this.mapToEntity(subscription) : null;
  }

  async update(id: string, input: SubscriptionUpdateInput): Promise<Subscription> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (input.tier !== undefined) updateData.tier = input.tier;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.billingCycle !== undefined) updateData.billing_cycle = input.billingCycle;
    if (input.cancelAtPeriodEnd !== undefined)
      updateData.cancel_at_period_end = input.cancelAtPeriodEnd;
    if (input.currentPeriodStart !== undefined)
      updateData.current_period_start = input.currentPeriodStart;
    if (input.currentPeriodEnd !== undefined)
      updateData.current_period_end = input.currentPeriodEnd;
    if (input.gracePeriodEnd !== undefined) updateData.grace_period_end = input.gracePeriodEnd;

    const [subscription] = await db(this.tableName).where({ id }).update(updateData).returning('*');

    return this.mapToEntity(subscription);
  }

  async updateStripeDetails(
    id: string,
    stripeSubscriptionId: string,
    stripeCustomerId: string,
    stripePriceId: string
  ): Promise<Subscription> {
    const [subscription] = await db(this.tableName)
      .where({ id })
      .update({
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: stripeCustomerId,
        stripe_price_id: stripePriceId,
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapToEntity(subscription);
  }

  async cancelSubscription(id: string, immediately: boolean = false): Promise<Subscription> {
    const updateData: any = {
      canceled_at: new Date(),
      updated_at: new Date(),
    };

    if (immediately) {
      updateData.status = SUBSCRIPTION_STATUS.CANCELED;
      updateData.cancel_at_period_end = false;
    } else {
      updateData.cancel_at_period_end = true;
    }

    const [subscription] = await db(this.tableName).where({ id }).update(updateData).returning('*');

    return this.mapToEntity(subscription);
  }

  async setPeriod(id: string, periodStart: Date, periodEnd: Date): Promise<Subscription> {
    const [subscription] = await db(this.tableName)
      .where({ id })
      .update({
        current_period_start: periodStart,
        current_period_end: periodEnd,
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapToEntity(subscription);
  }

  async findExpiredSubscriptions(): Promise<Subscription[]> {
    const subscriptions = await db(this.tableName)
      .where('status', SUBSCRIPTION_STATUS.ACTIVE)
      .where('current_period_end', '<', new Date())
      .select('*');

    return subscriptions.map(this.mapToEntity);
  }

  async findExpiredTrials(): Promise<Subscription[]> {
    const subscriptions = await db(this.tableName)
      .where('status', SUBSCRIPTION_STATUS.TRIALING)
      .where('trial_end', '<', new Date())
      .select('*');

    return subscriptions.map(this.mapToEntity);
  }

  async findExpiredGracePeriods(): Promise<Subscription[]> {
    const subscriptions = await db(this.tableName)
      .where('status', SUBSCRIPTION_STATUS.GRACE_PERIOD)
      .where('grace_period_end', '<', new Date())
      .select('*');

    return subscriptions.map(this.mapToEntity);
  }

  async delete(id: string): Promise<void> {
    await db(this.tableName).where({ id }).del();
  }

  // Map database row to entity (snake_case to camelCase)
  private mapToEntity(row: any): Subscription {
    return {
      id: row.id,
      userId: row.user_id,
      tier: row.tier,
      status: row.status,
      billingCycle: row.billing_cycle || 'monthly',
      stripeSubscriptionId: row.stripe_subscription_id,
      stripeCustomerId: row.stripe_customer_id,
      stripePriceId: row.stripe_price_id,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      gracePeriodEnd: row.grace_period_end,
      cancelAtPeriodEnd: row.cancel_at_period_end,
      canceledAt: row.canceled_at,
      trialStart: row.trial_start,
      trialEnd: row.trial_end,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new SubscriptionRepository();
