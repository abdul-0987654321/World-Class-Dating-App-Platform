/**
 * Paystack Webhook Service (STUB)
 *
 * This is a stub implementation for Paystack payment webhooks.
 * Paystack is popular in African markets (especially Nigeria and Ghana).
 *
 * To fully implement:
 * 1. Add PAYSTACK_SECRET_KEY and PAYSTACK_WEBHOOK_SECRET to environment
 * 2. Implement signature verification using the webhook secret
 * 3. Handle subscription and one-time payment events
 *
 * Paystack webhook events documentation:
 * https://paystack.com/docs/payments/webhooks/
 */

import { db } from '../../infrastructure/database/connection';
import logger from '../../utils/logger';
import crypto from 'crypto';
import userServiceClient from '../../infrastructure/clients/user-service.client';
import notificationClient from '../../infrastructure/clients/notification-service.client';
import axios from 'axios';

// Paystack event types
export type PaystackEventType =
  | 'charge.success'
  | 'subscription.create'
  | 'subscription.disable'
  | 'subscription.not_renew'
  | 'invoice.create'
  | 'invoice.payment_failed'
  | 'invoice.update'
  | 'transfer.success'
  | 'transfer.failed'
  | 'refund.processed';

export interface PaystackWebhookEvent {
  event: PaystackEventType;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    channel: string;
    metadata?: {
      userId?: string;
      tier?: string;
      billingCycle?: string;
      [key: string]: any;
    };
    customer?: {
      id: number;
      email: string;
      customer_code: string;
      metadata?: Record<string, any>;
    };
    plan?: {
      id: number;
      name: string;
      plan_code: string;
      amount: number;
      interval: string;
    };
    subscription_code?: string;
    authorization?: {
      authorization_code: string;
      card_type: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      bin: string;
      bank: string;
    };
    [key: string]: any;
  };
}

export class PaystackWebhookService {
  private webhookSecret: string;

  constructor() {
    this.webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET || '';
  }

  /**
   * Verify webhook signature from Paystack
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      logger.warn('PAYSTACK_WEBHOOK_SECRET not configured - skipping signature verification');
      return true; // Allow in development, but log warning
    }

    const hash = crypto
      .createHmac('sha512', this.webhookSecret)
      .update(payload)
      .digest('hex');

    return hash === signature;
  }

  /**
   * Check if an event has already been processed (idempotency)
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    const event = await db('paystack_webhook_events')
      .where({ paystack_event_id: eventId, status: 'processed' })
      .first();
    return !!event;
  }

  /**
   * Store webhook event for processing
   */
  async storeEvent(event: PaystackWebhookEvent, eventId: string): Promise<void> {
    await db('paystack_webhook_events').insert({
      paystack_event_id: eventId,
      event_type: event.event,
      payload: JSON.stringify(event),
      status: 'pending',
    });
  }

  /**
   * Mark event as processed
   */
  async markEventProcessed(eventId: string): Promise<void> {
    await db('paystack_webhook_events')
      .where({ paystack_event_id: eventId })
      .update({ status: 'processed', processed_at: new Date() });
  }

  /**
   * Mark event as failed
   */
  async markEventFailed(eventId: string, errorMessage: string): Promise<void> {
    await db('paystack_webhook_events')
      .where({ paystack_event_id: eventId })
      .update({
        status: 'failed',
        error_message: errorMessage,
        retry_count: db.raw('retry_count + 1'),
      });
  }

  /**
   * Process Paystack webhook event
   *
   * STUB: This method logs the event but does not implement full processing.
   * Full implementation would handle subscription lifecycle, payments, etc.
   */
  async processWebhook(event: PaystackWebhookEvent, eventId: string): Promise<void> {
    logger.info(`[PAYSTACK STUB] Processing webhook event: ${event.event}`, {
      eventId,
      reference: event.data?.reference,
    });

    // Check idempotency
    if (await this.isEventProcessed(eventId)) {
      logger.info(`[PAYSTACK STUB] Event already processed: ${eventId}`);
      return;
    }

    // Store event
    await this.storeEvent(event, eventId);

    try {
      switch (event.event) {
        case 'charge.success':
          await this.handleChargeSuccess(event);
          break;

        case 'subscription.create':
          await this.handleSubscriptionCreate(event);
          break;

        case 'subscription.disable':
        case 'subscription.not_renew':
          await this.handleSubscriptionCancel(event);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event);
          break;

        case 'refund.processed':
          await this.handleRefund(event);
          break;

        default:
          logger.info(`[PAYSTACK STUB] Unhandled event type: ${event.event}`);
      }

      await this.markEventProcessed(eventId);
    } catch (error: any) {
      logger.error(`[PAYSTACK STUB] Error processing webhook: ${error.message}`);
      await this.markEventFailed(eventId, error.message);
      throw error;
    }
  }

  // ==================== STUB HANDLERS ====================
  // These methods log the event but don't implement full logic

  private async handleChargeSuccess(event: PaystackWebhookEvent): Promise<void> {
    const { reference, amount, currency, metadata, customer } = event.data;
    const userId = metadata?.userId;

    logger.info('[PAYSTACK] Processing charge success', {
      reference,
      amount: amount / 100, // Paystack amounts are in kobo
      currency,
      userId,
    });

    if (!userId) {
      logger.warn('[PAYSTACK] No userId in metadata, skipping');
      return;
    }

    // Verify transaction with Paystack API
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (paystackSecretKey) {
      try {
        const verifyResponse = await axios.get(
          `https://api.paystack.co/transaction/verify/${reference}`,
          {
            headers: { Authorization: `Bearer ${paystackSecretKey}` },
          }
        );
        if (verifyResponse.data.data.status !== 'success') {
          logger.warn('[PAYSTACK] Transaction verification failed', { reference });
          return;
        }
      } catch (error: any) {
        logger.error('[PAYSTACK] Verification API error:', error.message);
      }
    }

    // Record transaction
    const amountInCurrency = amount / 100; // Convert from kobo
    const transactionId = require('uuid').v4();
    await db('transactions').insert({
      id: transactionId,
      user_id: userId,
      type: metadata?.tier ? 'subscription' : 'coin_purchase',
      status: 'succeeded',
      amount: amountInCurrency,
      currency: currency || 'NGN',
      description: `Paystack payment: ${reference}`,
      metadata: JSON.stringify({
        reference,
        provider: 'paystack',
        tier: metadata?.tier,
        billingCycle: metadata?.billingCycle,
      }),
      processed_at: new Date(),
    });

    // Credit user account
    if (metadata?.tier) {
      await userServiceClient.updateSubscription({
        userId,
        tier: userServiceClient.mapTierName(metadata.tier),
        status: 'active',
      });
      await notificationClient.notifyPaymentSuccess(userId, amountInCurrency, `${metadata.tier} Subscription`);
    } else if (metadata?.coinAmount) {
      await userServiceClient.addCoins({
        userId,
        amount: parseInt(metadata.coinAmount),
        transactionType: 'purchase',
        stripePaymentId: reference,
        productSku: `coins_${metadata.coinAmount}`,
      });
      await notificationClient.notifyPaymentSuccess(userId, amountInCurrency, `${metadata.coinAmount} Coins`);
    }

    logger.info('[PAYSTACK] Charge success processed', { reference, userId });
  }

  private async handleSubscriptionCreate(event: PaystackWebhookEvent): Promise<void> {
    const { subscription_code, plan, metadata, customer } = event.data;
    const userId = metadata?.userId;

    logger.info('[PAYSTACK] Processing subscription created', {
      subscriptionCode: subscription_code,
      plan: plan?.name,
      userId,
    });

    if (!userId || !plan) {
      logger.warn('[PAYSTACK] Missing userId or plan in subscription event');
      return;
    }

    const tier = userServiceClient.mapTierName(plan.name || metadata?.tier || 'premium');
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + (plan.interval === 'annually' ? 12 : 1));

    // Create user_subscription record
    const subscriptionId = require('uuid').v4();
    await db('user_subscriptions').insert({
      id: subscriptionId,
      user_id: userId,
      plan_id: await this.getPlanIdByName(tier),
      status: 'active',
      billing_cycle: plan.interval === 'annually' ? 'yearly' : 'monthly',
      current_period_start: new Date(),
      current_period_end: periodEnd,
      metadata: JSON.stringify({
        provider: 'paystack',
        subscription_code,
        plan_code: plan.plan_code,
      }),
    });

    // Update user tier
    await userServiceClient.updateSubscription({
      userId,
      tier,
      status: 'active',
      currentPeriodEnd: periodEnd,
    });

    await notificationClient.notifySubscriptionUpdated(userId, tier, 'active');
    logger.info('[PAYSTACK] Subscription created successfully', { userId, tier });
  }

  private async getPlanIdByName(tierName: string): Promise<string> {
    const plan = await db('subscription_plans').where('name', tierName).first();
    return plan?.id || (await db('subscription_plans').where('name', 'free').first())?.id;
  }

  private async handleSubscriptionCancel(event: PaystackWebhookEvent): Promise<void> {
    const { subscription_code, metadata } = event.data;
    const userId = metadata?.userId;

    logger.info('[PAYSTACK] Processing subscription cancellation', { subscription_code, userId });

    if (!userId) {
      logger.warn('[PAYSTACK] No userId in cancellation event');
      return;
    }

    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

    await db('user_subscriptions')
      .where('user_id', userId)
      .whereIn('status', ['active', 'past_due'])
      .update({
        status: 'canceled',
        canceled_at: new Date(),
        cancel_at: gracePeriodEnd,
        cancel_at_period_end: true,
        updated_at: new Date(),
      });

    await userServiceClient.updateSubscription({
      userId,
      tier: 'free',
      status: 'grace_period' as any,
      gracePeriodEnd,
    });

    await notificationClient.notifySubscriptionCanceled(userId, 'Subscription', gracePeriodEnd);
    logger.info('[PAYSTACK] Subscription cancelled with grace period', { userId, gracePeriodEnd });
  }

  private async handlePaymentFailed(event: PaystackWebhookEvent): Promise<void> {
    const { reference, metadata } = event.data;
    const userId = metadata?.userId;

    logger.info('[PAYSTACK] Processing payment failure', { reference, userId });

    if (!userId) {
      logger.warn('[PAYSTACK] No userId in payment failure event');
      return;
    }

    // Record failed transaction
    await db('transactions').insert({
      id: require('uuid').v4(),
      user_id: userId,
      type: metadata?.tier ? 'subscription' : 'coin_purchase',
      status: 'failed',
      amount: (event.data.amount || 0) / 100,
      currency: event.data.currency || 'NGN',
      description: `Failed Paystack payment: ${reference}`,
      metadata: JSON.stringify({ reference, provider: 'paystack' }),
      failure_message: 'Payment failed',
    });

    // Enter grace period for subscriptions
    if (metadata?.tier) {
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

      await db('user_subscriptions')
        .where('user_id', userId)
        .where('status', 'active')
        .update({
          status: 'past_due',
          updated_at: new Date(),
        });
    }

    await notificationClient.notifyPaymentFailed(userId, 'Your payment could not be processed. Please update your payment method.');
    logger.info('[PAYSTACK] Payment failure processed', { reference, userId });
  }

  private async handleRefund(event: PaystackWebhookEvent): Promise<void> {
    const { reference, amount, metadata } = event.data;
    const userId = metadata?.userId;

    logger.info('[PAYSTACK] Processing refund', { reference, amount: amount / 100, userId });

    if (!userId) {
      logger.warn('[PAYSTACK] No userId in refund event');
      return;
    }

    const amountInCurrency = amount / 100;

    // Record refund
    await db('transactions').insert({
      id: require('uuid').v4(),
      user_id: userId,
      type: 'refund',
      status: 'succeeded',
      amount: -amountInCurrency,
      currency: event.data.currency || 'NGN',
      description: `Refund for: ${reference}`,
      metadata: JSON.stringify({ provider: 'paystack', original_reference: reference }),
      processed_at: new Date(),
    });

    // Update original transaction
    await db('transactions')
      .where('metadata', 'like', `%${reference}%`)
      .whereNot('type', 'refund')
      .update({ status: 'refunded', updated_at: new Date() });

    // Reverse credits
    if (metadata?.coinAmount) {
      await userServiceClient.subtractCoins(userId, parseInt(metadata.coinAmount), `Refund: ${reference}`);
    }

    if (metadata?.tier) {
      await userServiceClient.updateSubscription({
        userId,
        tier: 'free',
        status: 'canceled',
      });
    }

    logger.info('[PAYSTACK] Refund processed successfully', { reference, userId });
  }
}

export default new PaystackWebhookService();
