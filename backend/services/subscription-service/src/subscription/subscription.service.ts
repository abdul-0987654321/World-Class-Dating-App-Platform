import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export type SubscriptionPlan = 'free' | 'premium' | 'elite' | 'platinum';

export interface SubscriptionFeatures {
  plan: SubscriptionPlan;
  dailySwipes: number;
  superLikes: number;
  boosts: number;
  rewinds: boolean;
  seeWhoLikesYou: boolean;
  advancedFilters: boolean;
  priorityLikes: boolean;
  readReceipts: boolean;
  profileBoost: boolean;
  incognitoMode: boolean;
  travelMode: boolean;
  topPicks: boolean;
  conciergeService: boolean;
  vipEvents: boolean;
  datingCoach: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SubscriptionService {
  private stripe: Stripe | null = null;

  // In-memory store for demo purposes - replace with database in production
  private subscriptions: Map<string, Subscription> = new Map();

  constructor(private configService: ConfigService) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-12-18.acacia',
      });
    }
  }

  /**
   * Get subscription for a user
   */
  async getSubscription(userId: string): Promise<Subscription> {
    const subscription = this.subscriptions.get(userId);

    if (!subscription) {
      // Return free tier subscription for users without a subscription
      return this.createDefaultSubscription(userId);
    }

    return subscription;
  }

  /**
   * Create a new subscription for a user
   */
  async createSubscription(
    userId: string,
    plan: SubscriptionPlan,
    paymentMethodId?: string
  ): Promise<Subscription> {
    // Check if user already has an active subscription
    const existing = this.subscriptions.get(userId);
    if (existing && existing.status === 'active' && existing.plan !== 'free') {
      throw new BadRequestException('User already has an active subscription. Use upgrade instead.');
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    let stripeSubscriptionId: string | undefined;
    let stripeCustomerId: string | undefined;

    // Create Stripe subscription if payment method provided and Stripe is configured
    if (this.stripe && paymentMethodId && plan !== 'free') {
      try {
        // Create or get customer
        const customer = await this.stripe.customers.create({
          metadata: { userId },
        });
        stripeCustomerId = customer.id;

        // Attach payment method
        await this.stripe.paymentMethods.attach(paymentMethodId, {
          customer: customer.id,
        });

        // Set as default payment method
        await this.stripe.customers.update(customer.id, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });

        // Create subscription
        const priceId = this.getPriceIdForPlan(plan);
        const stripeSubscription = await this.stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
        });

        stripeSubscriptionId = stripeSubscription.id;
      } catch (error) {
        console.error('Stripe subscription creation failed:', error);
        throw new BadRequestException('Failed to create payment subscription');
      }
    }

    const subscription: Subscription = {
      id: `sub_${Date.now()}_${userId}`,
      userId,
      plan,
      status: 'active',
      stripeSubscriptionId,
      stripeCustomerId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    };

    this.subscriptions.set(userId, subscription);
    return subscription;
  }

  /**
   * Cancel a user's subscription
   */
  async cancelSubscription(userId: string): Promise<Subscription> {
    const subscription = this.subscriptions.get(userId);

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.plan === 'free') {
      throw new BadRequestException('Cannot cancel a free subscription');
    }

    if (subscription.status === 'cancelled') {
      throw new BadRequestException('Subscription is already cancelled');
    }

    // Cancel in Stripe if applicable
    if (this.stripe && subscription.stripeSubscriptionId) {
      try {
        await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      } catch (error) {
        console.error('Stripe subscription cancellation failed:', error);
      }
    }

    subscription.cancelAtPeriodEnd = true;
    subscription.status = 'cancelled';
    subscription.updatedAt = new Date();

    this.subscriptions.set(userId, subscription);
    return subscription;
  }

  /**
   * Upgrade a user's subscription to a new plan
   */
  async upgradeSubscription(userId: string, newPlan: SubscriptionPlan): Promise<Subscription> {
    const subscription = this.subscriptions.get(userId);

    if (!subscription) {
      // Create new subscription if none exists
      return this.createSubscription(userId, newPlan);
    }

    const planHierarchy: Record<SubscriptionPlan, number> = {
      free: 0,
      premium: 1,
      elite: 2,
      platinum: 3,
    };

    if (planHierarchy[newPlan] <= planHierarchy[subscription.plan]) {
      throw new BadRequestException(
        `Cannot upgrade from ${subscription.plan} to ${newPlan}. Use downgrade instead.`
      );
    }

    // Update in Stripe if applicable
    if (this.stripe && subscription.stripeSubscriptionId) {
      try {
        const stripeSubscription = await this.stripe.subscriptions.retrieve(
          subscription.stripeSubscriptionId
        );
        const newPriceId = this.getPriceIdForPlan(newPlan);

        await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          items: [
            {
              id: stripeSubscription.items.data[0].id,
              price: newPriceId,
            },
          ],
          proration_behavior: 'create_prorations',
        });
      } catch (error) {
        console.error('Stripe subscription upgrade failed:', error);
        throw new BadRequestException('Failed to upgrade subscription in payment system');
      }
    }

    subscription.plan = newPlan;
    subscription.cancelAtPeriodEnd = false;
    subscription.status = 'active';
    subscription.updatedAt = new Date();

    this.subscriptions.set(userId, subscription);
    return subscription;
  }

  /**
   * Get features for a subscription plan
   */
  getSubscriptionFeatures(plan: SubscriptionPlan): SubscriptionFeatures {
    const planFeatures: Record<SubscriptionPlan, SubscriptionFeatures> = {
      free: {
        plan: 'free',
        dailySwipes: 25,
        superLikes: 1,
        boosts: 0,
        rewinds: false,
        seeWhoLikesYou: false,
        advancedFilters: false,
        priorityLikes: false,
        readReceipts: false,
        profileBoost: false,
        incognitoMode: false,
        travelMode: false,
        topPicks: false,
        conciergeService: false,
        vipEvents: false,
        datingCoach: false,
      },
      premium: {
        plan: 'premium',
        dailySwipes: -1, // Unlimited
        superLikes: 5,
        boosts: 1,
        rewinds: true,
        seeWhoLikesYou: true,
        advancedFilters: true,
        priorityLikes: true,
        readReceipts: true,
        profileBoost: false,
        incognitoMode: false,
        travelMode: false,
        topPicks: true,
        conciergeService: false,
        vipEvents: false,
        datingCoach: false,
      },
      elite: {
        plan: 'elite',
        dailySwipes: -1, // Unlimited
        superLikes: 10,
        boosts: 3,
        rewinds: true,
        seeWhoLikesYou: true,
        advancedFilters: true,
        priorityLikes: true,
        readReceipts: true,
        profileBoost: true,
        incognitoMode: true,
        travelMode: true,
        topPicks: true,
        conciergeService: false,
        vipEvents: true,
        datingCoach: false,
      },
      platinum: {
        plan: 'platinum',
        dailySwipes: -1, // Unlimited
        superLikes: -1, // Unlimited
        boosts: 5,
        rewinds: true,
        seeWhoLikesYou: true,
        advancedFilters: true,
        priorityLikes: true,
        readReceipts: true,
        profileBoost: true,
        incognitoMode: true,
        travelMode: true,
        topPicks: true,
        conciergeService: true,
        vipEvents: true,
        datingCoach: true,
      },
    };

    return planFeatures[plan];
  }

  /**
   * Create a default free subscription for a user
   */
  private createDefaultSubscription(userId: string): Subscription {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setFullYear(periodEnd.getFullYear() + 100); // Free tier never expires

    const subscription: Subscription = {
      id: `sub_free_${userId}`,
      userId,
      plan: 'free',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    };

    this.subscriptions.set(userId, subscription);
    return subscription;
  }

  /**
   * Get Stripe price ID for a subscription plan
   */
  private getPriceIdForPlan(plan: SubscriptionPlan): string {
    const priceIds: Record<SubscriptionPlan, string> = {
      free: '',
      premium: this.configService.get<string>('STRIPE_PRICE_PREMIUM') || 'price_premium',
      elite: this.configService.get<string>('STRIPE_PRICE_ELITE') || 'price_elite',
      platinum: this.configService.get<string>('STRIPE_PRICE_PLATINUM') || 'price_platinum',
    };

    return priceIds[plan];
  }
}
