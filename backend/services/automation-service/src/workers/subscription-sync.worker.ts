/**
 * Subscription Sync Worker
 * Syncs subscriptions with Stripe
 * Handles webhook reconciliation
 * Updates entitlements snapshots
 */

import { createLogger } from '@flamoral/backend-shared';
import axios from 'axios';
import { Job } from 'bull';
import Stripe from 'stripe';

import { BaseWorker, WorkerQueueName, BaseJobData, JobResult, JobPriority } from './base-worker';

const logger = createLogger('subscription-sync-worker');

// Service URLs
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
});

// Subscription status
export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  UNPAID = 'unpaid',
  PAUSED = 'paused',
}

// Subscription tier
export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

// Entitlement types
export interface Entitlements {
  unlimitedLikes: boolean;
  seeWhoLikesYou: boolean;
  unlimitedRewinds: boolean;
  passportMode: boolean;
  boostPerMonth: number;
  superLikesPerDay: number;
  advancedFilters: boolean;
  readReceipts: boolean;
  priorityMatching: boolean;
  hideAds: boolean;
  verifiedBadge: boolean;
  videoChat: boolean;
  virtualGifts: boolean;
}

// Job data interfaces
export interface SubscriptionSyncJobData extends BaseJobData {
  type:
    | 'sync_subscription'
    | 'reconcile_webhooks'
    | 'update_entitlements'
    | 'check_expiring'
    | 'handle_failed_payment'
    | 'batch_sync';
  userId?: string;
  subscriptionId?: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  eventType?: string;
  eventData?: any;
}

export interface SubscriptionSyncResult {
  userId?: string;
  subscriptionId?: string;
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  synced: boolean;
  entitlementsUpdated: boolean;
  action?: string;
  usersProcessed?: number;
}

/**
 * Subscription Sync Worker
 */
export class SubscriptionSyncWorker extends BaseWorker<
  SubscriptionSyncJobData,
  SubscriptionSyncResult
> {
  private readonly gracePeriodDays = 3;
  private readonly expirationWarningDays = [7, 3, 1];

  constructor() {
    super(WorkerQueueName.SUBSCRIPTION_SYNC, 5);
  }

  /**
   * Process subscription sync job
   */
  protected async processJob(
    job: Job<SubscriptionSyncJobData>
  ): Promise<JobResult<SubscriptionSyncResult>> {
    const { type, userId, subscriptionId } = job.data;
    const startTime = Date.now();

    try {
      let result: SubscriptionSyncResult;

      switch (type) {
        case 'sync_subscription':
          result = await this.syncSubscription(job.data);
          break;

        case 'reconcile_webhooks':
          result = await this.reconcileWebhooks(job.data);
          break;

        case 'update_entitlements':
          result = await this.updateEntitlements(job.data);
          break;

        case 'check_expiring':
          result = await this.checkExpiringSubscriptions();
          break;

        case 'handle_failed_payment':
          result = await this.handleFailedPayment(job.data);
          break;

        case 'batch_sync':
          result = await this.batchSync();
          break;

        default:
          throw new Error(`Unknown sync type: ${type}`);
      }

      await job.progress(100);

      logger.info(`Subscription sync completed`, {
        type,
        correlationId: job.data.correlationId,
        userId,
        subscriptionId,
        status: result.status,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      logger.error(`Subscription sync failed`, {
        type,
        correlationId: job.data.correlationId,
        userId,
        subscriptionId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Sync a single subscription with Stripe
   */
  private async syncSubscription(
    jobData: SubscriptionSyncJobData
  ): Promise<SubscriptionSyncResult> {
    const { userId, stripeSubscriptionId, stripeCustomerId } = jobData;

    try {
      // Get subscription from Stripe
      let stripeSubscription: Stripe.Subscription | null = null;

      if (stripeSubscriptionId) {
        stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      } else if (stripeCustomerId) {
        // Get latest subscription for customer
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          limit: 1,
        });
        stripeSubscription = subscriptions.data[0] || null;
      }

      if (!stripeSubscription) {
        // No subscription found - ensure user is on free tier
        await this.updateUserTier(userId, SubscriptionTier.FREE, null);

        return {
          userId,
          status: SubscriptionStatus.CANCELED,
          tier: SubscriptionTier.FREE,
          synced: true,
          entitlementsUpdated: true,
          action: 'downgraded_to_free',
        };
      }

      // Map Stripe status to our status
      const status = this.mapStripeStatus(stripeSubscription.status);
      const tier = await this.getTierFromPriceId(stripeSubscription.items.data[0]?.price.id);

      // Update local database
      await this.updateLocalSubscription(userId, stripeSubscription, status, tier);

      // Update user tier and entitlements
      await this.updateUserTier(userId, tier, stripeSubscription);

      // Update entitlements snapshot
      await this.updateEntitlements({
        ...jobData,
        type: 'update_entitlements',
        userId,
      });

      return {
        userId,
        subscriptionId: stripeSubscription.id,
        status,
        tier,
        synced: true,
        entitlementsUpdated: true,
      };
    } catch (error: any) {
      logger.error(`Failed to sync subscription for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Reconcile webhooks - check for missed or out-of-order webhook events
   */
  private async reconcileWebhooks(
    jobData: SubscriptionSyncJobData
  ): Promise<SubscriptionSyncResult> {
    const { eventType, eventData } = jobData;

    try {
      // Get recent events from Stripe for comparison
      const recentEvents = await stripe.events.list({
        types: [
          'customer.subscription.created',
          'customer.subscription.updated',
          'customer.subscription.deleted',
          'invoice.payment_succeeded',
          'invoice.payment_failed',
        ],
        limit: 100,
        created: {
          gte: Math.floor(Date.now() / 1000) - 24 * 60 * 60, // Last 24 hours
        },
      });

      // Get processed events from our database
      const processedEvents = await this.getProcessedWebhookEvents();

      // Find unprocessed events
      const unprocessedEvents = recentEvents.data.filter(
        (event) => !processedEvents.includes(event.id)
      );

      logger.info(`Found ${unprocessedEvents.length} unprocessed webhook events`);

      // Process each unprocessed event
      for (const event of unprocessedEvents) {
        try {
          await this.processWebhookEvent(event);
        } catch (error: any) {
          logger.error(`Failed to process webhook event ${event.id}:`, error);
        }
      }

      return {
        status: SubscriptionStatus.ACTIVE,
        tier: SubscriptionTier.FREE,
        synced: true,
        entitlementsUpdated: false,
        usersProcessed: unprocessedEvents.length,
      };
    } catch (error: any) {
      logger.error('Failed to reconcile webhooks:', error);
      throw error;
    }
  }

  /**
   * Update user entitlements based on subscription tier
   */
  private async updateEntitlements(
    jobData: SubscriptionSyncJobData
  ): Promise<SubscriptionSyncResult> {
    const { userId } = jobData;

    try {
      // Get user's current subscription
      const subscription = await this.getUserSubscription(userId);
      const tier = subscription?.tier || SubscriptionTier.FREE;

      // Calculate entitlements based on tier
      const entitlements = this.calculateEntitlements(tier as SubscriptionTier);

      // Update entitlements in user service
      await axios.put(
        `${USER_SERVICE_URL}/api/v1/internal/users/${userId}/entitlements`,
        {
          tier,
          entitlements,
          updatedAt: new Date().toISOString(),
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      // Cache entitlements for quick access
      await this.cacheEntitlements(userId, entitlements);

      return {
        userId,
        status: subscription?.status || SubscriptionStatus.CANCELED,
        tier: tier as SubscriptionTier,
        synced: true,
        entitlementsUpdated: true,
      };
    } catch (error: any) {
      logger.error(`Failed to update entitlements for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check for expiring subscriptions and send warnings
   */
  private async checkExpiringSubscriptions(): Promise<SubscriptionSyncResult> {
    try {
      let usersNotified = 0;

      for (const daysUntilExpiry of this.expirationWarningDays) {
        const expiringSubscriptions = await this.getSubscriptionsExpiringIn(daysUntilExpiry);

        for (const sub of expiringSubscriptions) {
          try {
            await this.sendExpirationWarning(sub.userId, sub.tier, daysUntilExpiry);
            usersNotified++;
          } catch (error: any) {
            logger.error(`Failed to send expiration warning to ${sub.userId}:`, error);
          }
        }
      }

      logger.info(`Sent expiration warnings to ${usersNotified} users`);

      return {
        status: SubscriptionStatus.ACTIVE,
        tier: SubscriptionTier.FREE,
        synced: true,
        entitlementsUpdated: false,
        usersProcessed: usersNotified,
      };
    } catch (error: any) {
      logger.error('Failed to check expiring subscriptions:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment - implement grace period
   */
  private async handleFailedPayment(
    jobData: SubscriptionSyncJobData
  ): Promise<SubscriptionSyncResult> {
    const { userId, subscriptionId, stripeSubscriptionId } = jobData;

    try {
      // Get subscription details
      const subscription = await this.getUserSubscription(userId);

      if (!subscription) {
        throw new Error(`Subscription not found for user ${userId}`);
      }

      // Check if within grace period
      const failedAt = subscription.lastPaymentFailedAt;
      const gracePeriodEnd = failedAt
        ? new Date(new Date(failedAt).getTime() + this.gracePeriodDays * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + this.gracePeriodDays * 24 * 60 * 60 * 1000);

      if (new Date() <= gracePeriodEnd) {
        // Still within grace period - send reminder
        const daysRemaining = Math.ceil(
          (gracePeriodEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        );

        await this.sendGracePeriodReminder(userId, daysRemaining);

        // Update status to past_due but keep entitlements
        await this.updateSubscriptionStatus(subscriptionId, SubscriptionStatus.PAST_DUE);

        return {
          userId,
          subscriptionId,
          status: SubscriptionStatus.PAST_DUE,
          tier: subscription.tier as SubscriptionTier,
          synced: true,
          entitlementsUpdated: false,
          action: 'grace_period_active',
        };
      } else {
        // Grace period expired - downgrade to free
        await this.downgradeToFree(userId, subscription);

        return {
          userId,
          subscriptionId,
          status: SubscriptionStatus.CANCELED,
          tier: SubscriptionTier.FREE,
          synced: true,
          entitlementsUpdated: true,
          action: 'downgraded_after_grace_period',
        };
      }
    } catch (error: any) {
      logger.error(`Failed to handle failed payment for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Batch sync all subscriptions
   */
  private async batchSync(): Promise<SubscriptionSyncResult> {
    try {
      // Get all active subscriptions from our database
      const localSubscriptions = await this.getAllActiveSubscriptions();

      logger.info(`Starting batch sync for ${localSubscriptions.length} subscriptions`);

      let syncedCount = 0;
      let errorCount = 0;

      for (const sub of localSubscriptions) {
        try {
          await this.syncSubscription({
            correlationId: sub.userId,
            createdAt: new Date().toISOString(),
            type: 'sync_subscription',
            userId: sub.userId,
            stripeSubscriptionId: sub.stripeSubscriptionId,
          });
          syncedCount++;
        } catch (error: any) {
          logger.error(`Failed to sync subscription for user ${sub.userId}:`, error);
          errorCount++;
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      logger.info(`Batch sync completed: ${syncedCount} synced, ${errorCount} errors`);

      return {
        status: SubscriptionStatus.ACTIVE,
        tier: SubscriptionTier.FREE,
        synced: true,
        entitlementsUpdated: false,
        usersProcessed: syncedCount,
      };
    } catch (error: any) {
      logger.error('Failed to batch sync subscriptions:', error);
      throw error;
    }
  }

  // Helper methods

  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
    const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
      trialing: SubscriptionStatus.TRIALING,
      unpaid: SubscriptionStatus.UNPAID,
      paused: SubscriptionStatus.PAUSED,
    };

    return statusMap[stripeStatus] || SubscriptionStatus.CANCELED;
  }

  private async getTierFromPriceId(priceId: string): Promise<SubscriptionTier> {
    try {
      const response = await axios.get(
        `${PAYMENT_SERVICE_URL}/api/v1/internal/plans/by-price/${priceId}`,
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      const tierName = response.data.name?.toLowerCase();

      if (tierName?.includes('platinum')) return SubscriptionTier.PLATINUM;
      if (tierName?.includes('gold')) return SubscriptionTier.GOLD;
      if (tierName?.includes('premium')) return SubscriptionTier.PREMIUM;

      return SubscriptionTier.FREE;
    } catch (error) {
      logger.warn('Subscription lookup failed - defaulting to premium tier. This should be investigated.', {
        userId: undefined,
        priceId,
        error: error instanceof Error ? error.message : String(error),
      });
      return SubscriptionTier.PREMIUM; // Default to premium if lookup fails
    }
  }

  private calculateEntitlements(tier: SubscriptionTier): Entitlements {
    const entitlementsByTier: Record<SubscriptionTier, Entitlements> = {
      [SubscriptionTier.FREE]: {
        unlimitedLikes: false,
        seeWhoLikesYou: false,
        unlimitedRewinds: false,
        passportMode: false,
        boostPerMonth: 0,
        superLikesPerDay: 1,
        advancedFilters: false,
        readReceipts: false,
        priorityMatching: false,
        hideAds: false,
        verifiedBadge: false,
        videoChat: false,
        virtualGifts: false,
      },
      [SubscriptionTier.PREMIUM]: {
        unlimitedLikes: true,
        seeWhoLikesYou: true,
        unlimitedRewinds: true,
        passportMode: false,
        boostPerMonth: 1,
        superLikesPerDay: 5,
        advancedFilters: true,
        readReceipts: true,
        priorityMatching: false,
        hideAds: true,
        verifiedBadge: false,
        videoChat: true,
        virtualGifts: true,
      },
      [SubscriptionTier.GOLD]: {
        unlimitedLikes: true,
        seeWhoLikesYou: true,
        unlimitedRewinds: true,
        passportMode: true,
        boostPerMonth: 3,
        superLikesPerDay: 10,
        advancedFilters: true,
        readReceipts: true,
        priorityMatching: true,
        hideAds: true,
        verifiedBadge: true,
        videoChat: true,
        virtualGifts: true,
      },
      [SubscriptionTier.PLATINUM]: {
        unlimitedLikes: true,
        seeWhoLikesYou: true,
        unlimitedRewinds: true,
        passportMode: true,
        boostPerMonth: 5,
        superLikesPerDay: 999,
        advancedFilters: true,
        readReceipts: true,
        priorityMatching: true,
        hideAds: true,
        verifiedBadge: true,
        videoChat: true,
        virtualGifts: true,
      },
    };

    return entitlementsByTier[tier];
  }

  private async updateLocalSubscription(
    userId: string,
    stripeSubscription: Stripe.Subscription,
    status: SubscriptionStatus,
    tier: SubscriptionTier
  ): Promise<void> {
    try {
      await axios.put(
        `${PAYMENT_SERVICE_URL}/api/v1/internal/subscriptions/sync`,
        {
          userId,
          stripeSubscriptionId: stripeSubscription.id,
          stripeCustomerId: stripeSubscription.customer,
          status,
          tier,
          currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end,
          updatedAt: new Date().toISOString(),
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error('Failed to update local subscription:', error);
      throw error;
    }
  }

  private async updateUserTier(
    userId: string,
    tier: SubscriptionTier,
    subscription: Stripe.Subscription | null
  ): Promise<void> {
    try {
      await axios.patch(
        `${USER_SERVICE_URL}/api/v1/internal/users/${userId}`,
        {
          subscriptionTier: tier,
          subscriptionStatus: subscription?.status || 'canceled',
          subscriptionExpiresAt: subscription
            ? new Date((subscription as any).current_period_end * 1000)
            : null,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error('Failed to update user tier:', error);
    }
  }

  private async getUserSubscription(userId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${PAYMENT_SERVICE_URL}/api/v1/internal/subscriptions/user/${userId}`,
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      return response.data;
    } catch (error) {
      return null;
    }
  }

  private async cacheEntitlements(userId: string, entitlements: Entitlements): Promise<void> {
    try {
      const Redis = require('ioredis');
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      });

      const key = `entitlements:${userId}`;
      await redis.setex(key, 3600, JSON.stringify(entitlements)); // 1 hour cache
      await redis.quit();
    } catch (error: any) {
      logger.error('Failed to cache entitlements:', error);
    }
  }

  private async getProcessedWebhookEvents(): Promise<string[]> {
    try {
      const response = await axios.get(
        `${PAYMENT_SERVICE_URL}/api/v1/internal/webhooks/processed`,
        {
          params: { hours: 24 },
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 10000,
        }
      );

      return response.data.eventIds || [];
    } catch (error) {
      return [];
    }
  }

  private async processWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      await axios.post(
        `${PAYMENT_SERVICE_URL}/api/v1/internal/webhooks/process`,
        {
          eventId: event.id,
          eventType: event.type,
          eventData: event.data,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 10000,
        }
      );
    } catch (error: any) {
      logger.error(`Failed to process webhook event ${event.id}:`, error);
      throw error;
    }
  }

  private async getSubscriptionsExpiringIn(days: number): Promise<any[]> {
    try {
      const response = await axios.get(
        `${PAYMENT_SERVICE_URL}/api/v1/internal/subscriptions/expiring`,
        {
          params: { days },
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 10000,
        }
      );

      return response.data.subscriptions || [];
    } catch (error) {
      return [];
    }
  }

  private async sendExpirationWarning(
    userId: string,
    tier: string,
    daysUntilExpiry: number
  ): Promise<void> {
    await axios.post(
      `${NOTIFICATION_SERVICE_URL}/api/v1/notifications`,
      {
        userId,
        type: 'subscription_expiring',
        title: 'Subscription Expiring Soon',
        body: `Your ${tier} subscription will expire in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}. Renew now to keep your benefits!`,
        data: {
          daysUntilExpiry,
          tier,
          action: 'renew_subscription',
        },
        channels: ['push', 'in_app', 'email'],
        priority: 'high',
      },
      {
        headers: {
          'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
        },
        timeout: 5000,
      }
    );
  }

  private async sendGracePeriodReminder(userId: string, daysRemaining: number): Promise<void> {
    await axios.post(
      `${NOTIFICATION_SERVICE_URL}/api/v1/notifications`,
      {
        userId,
        type: 'payment_failed',
        title: 'Payment Failed - Action Required',
        body: `Your payment failed. You have ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} to update your payment method before losing access to premium features.`,
        data: {
          daysRemaining,
          action: 'update_payment',
        },
        channels: ['push', 'in_app', 'email'],
        priority: 'urgent',
      },
      {
        headers: {
          'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
        },
        timeout: 5000,
      }
    );
  }

  private async updateSubscriptionStatus(
    subscriptionId: string,
    status: SubscriptionStatus
  ): Promise<void> {
    try {
      await axios.patch(
        `${PAYMENT_SERVICE_URL}/api/v1/internal/subscriptions/${subscriptionId}`,
        {
          status,
          updatedAt: new Date().toISOString(),
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error('Failed to update subscription status:', error);
    }
  }

  private async downgradeToFree(userId: string, subscription: any): Promise<void> {
    // Update subscription to canceled
    await this.updateSubscriptionStatus(subscription.id, SubscriptionStatus.CANCELED);

    // Update user tier to free
    await this.updateUserTier(userId, SubscriptionTier.FREE, null);

    // Update entitlements
    await this.updateEntitlements({
      correlationId: userId,
      createdAt: new Date().toISOString(),
      type: 'update_entitlements',
      userId,
    });

    // Send notification
    await axios.post(
      `${NOTIFICATION_SERVICE_URL}/api/v1/notifications`,
      {
        userId,
        type: 'subscription_canceled',
        title: 'Subscription Canceled',
        body: 'Your subscription has been canceled due to payment failure. You have been downgraded to the free plan.',
        data: {
          action: 'subscribe',
        },
        channels: ['push', 'in_app', 'email'],
        priority: 'high',
      },
      {
        headers: {
          'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
        },
        timeout: 5000,
      }
    );
  }

  private async getAllActiveSubscriptions(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${PAYMENT_SERVICE_URL}/api/v1/internal/subscriptions/active`,
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 30000,
        }
      );

      return response.data.subscriptions || [];
    } catch (error) {
      return [];
    }
  }

  // Public scheduling methods

  async scheduleSyncSubscription(
    userId: string,
    stripeSubscriptionId?: string,
    stripeCustomerId?: string
  ): Promise<void> {
    await this.addJob(
      {
        type: 'sync_subscription',
        userId,
        stripeSubscriptionId,
        stripeCustomerId,
      },
      {
        priority: JobPriority.HIGH,
      }
    );
  }

  async scheduleWebhookReconciliation(): Promise<void> {
    await this.addJob(
      {
        type: 'reconcile_webhooks',
      },
      {
        priority: JobPriority.LOW,
      }
    );
  }

  async scheduleEntitlementsUpdate(userId: string): Promise<void> {
    await this.addJob(
      {
        type: 'update_entitlements',
        userId,
      },
      {
        priority: JobPriority.HIGH,
      }
    );
  }

  async scheduleExpirationCheck(): Promise<void> {
    await this.addJob(
      {
        type: 'check_expiring',
      },
      {
        priority: JobPriority.NORMAL,
      }
    );
  }

  async scheduleFailedPaymentHandling(userId: string, subscriptionId: string): Promise<void> {
    await this.addJob(
      {
        type: 'handle_failed_payment',
        userId,
        subscriptionId,
      },
      {
        priority: JobPriority.HIGH,
      }
    );
  }

  async scheduleBatchSync(): Promise<void> {
    await this.addJob(
      {
        type: 'batch_sync',
      },
      {
        priority: JobPriority.LOW,
      }
    );
  }
}

// Export singleton instance
export const subscriptionSyncWorker = new SubscriptionSyncWorker();
export default subscriptionSyncWorker;
