/**
 * Flutterwave Webhook Service (STUB)
 *
 * This is a stub implementation for Flutterwave payment webhooks.
 * Flutterwave operates across Africa (Nigeria, Ghana, Kenya, South Africa, etc.).
 *
 * To fully implement:
 * 1. Add FLUTTERWAVE_SECRET_KEY and FLUTTERWAVE_WEBHOOK_SECRET to environment
 * 2. Implement signature verification using the secret hash
 * 3. Handle payment and subscription events
 *
 * Flutterwave webhook events documentation:
 * https://developer.flutterwave.com/docs/integration-guides/webhooks
 */

import { db } from '../../infrastructure/database/connection';
import logger from '../../utils/logger';
import crypto from 'crypto';
import userServiceClient from '../../infrastructure/clients/user-service.client';
import notificationClient from '../../infrastructure/clients/notification-service.client';
import axios from 'axios';

// Flutterwave event types
export type FlutterwaveEventType =
  | 'charge.completed'
  | 'subscription.created'
  | 'subscription.cancelled'
  | 'transfer.completed'
  | 'transfer.failed'
  | 'payment.refund.completed'
  | 'payment_plan.created';

export interface FlutterwaveWebhookEvent {
  event: FlutterwaveEventType;
  'event.type': string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    device_fingerprint: string;
    amount: number;
    currency: string;
    charged_amount: number;
    app_fee: number;
    merchant_fee: number;
    processor_response: string;
    auth_model: string;
    ip: string;
    narration: string;
    status: string;
    payment_type: string;
    created_at: string;
    account_id: number;
    meta?: {
      userId?: string;
      tier?: string;
      billingCycle?: string;
      [key: string]: any;
    };
    customer?: {
      id: number;
      name: string;
      phone_number: string;
      email: string;
      created_at: string;
    };
    card?: {
      first_6digits: string;
      last_4digits: string;
      issuer: string;
      country: string;
      type: string;
      token: string;
      expiry: string;
    };
    plan?: {
      id: number;
      name: string;
      amount: number;
      currency: string;
      interval: string;
      plan_token: string;
      status: string;
    };
    [key: string]: any;
  };
}

export class FlutterwaveWebhookService {
  private webhookSecret: string;

  constructor() {
    this.webhookSecret = process.env.FLUTTERWAVE_WEBHOOK_SECRET || '';
  }

  /**
   * Verify webhook signature from Flutterwave
   * Flutterwave sends a verif-hash header that should match your secret hash
   */
  verifySignature(signature: string): boolean {
    if (!this.webhookSecret) {
      logger.warn('FLUTTERWAVE_WEBHOOK_SECRET not configured - skipping signature verification');
      return true; // Allow in development, but log warning
    }

    return signature === this.webhookSecret;
  }

  /**
   * Check if an event has already been processed (idempotency)
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    const event = await db('flutterwave_webhook_events')
      .where({ flutterwave_event_id: eventId, status: 'processed' })
      .first();
    return !!event;
  }

  /**
   * Store webhook event for processing
   */
  async storeEvent(event: FlutterwaveWebhookEvent, eventId: string): Promise<void> {
    await db('flutterwave_webhook_events').insert({
      flutterwave_event_id: eventId,
      event_type: event.event,
      payload: JSON.stringify(event),
      status: 'pending',
    });
  }

  /**
   * Mark event as processed
   */
  async markEventProcessed(eventId: string): Promise<void> {
    await db('flutterwave_webhook_events')
      .where({ flutterwave_event_id: eventId })
      .update({ status: 'processed', processed_at: new Date() });
  }

  /**
   * Mark event as failed
   */
  async markEventFailed(eventId: string, errorMessage: string): Promise<void> {
    await db('flutterwave_webhook_events')
      .where({ flutterwave_event_id: eventId })
      .update({
        status: 'failed',
        error_message: errorMessage,
        retry_count: db.raw('retry_count + 1'),
      });
  }

  /**
   * Process Flutterwave webhook event
   *
   * STUB: This method logs the event but does not implement full processing.
   * Full implementation would handle subscription lifecycle, payments, etc.
   */
  async processWebhook(event: FlutterwaveWebhookEvent, eventId: string): Promise<void> {
    logger.info(`[FLUTTERWAVE STUB] Processing webhook event: ${event.event}`, {
      eventId,
      tx_ref: event.data?.tx_ref,
    });

    // Check idempotency
    if (await this.isEventProcessed(eventId)) {
      logger.info(`[FLUTTERWAVE STUB] Event already processed: ${eventId}`);
      return;
    }

    // Store event
    await this.storeEvent(event, eventId);

    try {
      switch (event.event) {
        case 'charge.completed':
          await this.handleChargeCompleted(event);
          break;

        case 'subscription.created':
          await this.handleSubscriptionCreated(event);
          break;

        case 'subscription.cancelled':
          await this.handleSubscriptionCancelled(event);
          break;

        case 'transfer.completed':
          await this.handleTransferCompleted(event);
          break;

        case 'transfer.failed':
          await this.handleTransferFailed(event);
          break;

        case 'payment.refund.completed':
          await this.handleRefundCompleted(event);
          break;

        default:
          logger.info(`[FLUTTERWAVE STUB] Unhandled event type: ${event.event}`);
      }

      await this.markEventProcessed(eventId);
    } catch (error: any) {
      logger.error(`[FLUTTERWAVE STUB] Error processing webhook: ${error.message}`);
      await this.markEventFailed(eventId, error.message);
      throw error;
    }
  }

  // ==================== STUB HANDLERS ====================
  // These methods log the event but don't implement full logic

  private async handleChargeCompleted(event: FlutterwaveWebhookEvent): Promise<void> {
    const { tx_ref, flw_ref, amount, currency, status, meta } = event.data;
    const userId = meta?.userId;

    logger.info('[FLUTTERWAVE] Processing charge completed', {
      tx_ref,
      flw_ref,
      amount,
      currency,
      status,
      userId,
    });

    if (!userId) {
      logger.warn('[FLUTTERWAVE] No userId in metadata, skipping');
      return;
    }

    // 1. Verify transaction with Flutterwave API
    const flutterwaveSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (flutterwaveSecretKey) {
      try {
        const verifyResponse = await axios.get(
          `https://api.flutterwave.com/v3/transactions/${event.data.id}/verify`,
          {
            headers: { Authorization: `Bearer ${flutterwaveSecretKey}` },
          }
        );
        if (verifyResponse.data.data.status !== 'successful') {
          logger.warn('[FLUTTERWAVE] Transaction verification failed', { tx_ref });
          return;
        }
      } catch (error: any) {
        logger.error('[FLUTTERWAVE] Verification API error:', error.message);
        // Continue anyway for non-critical failures
      }
    }

    // 2. Record transaction in database
    const transactionId = require('uuid').v4();
    await db('transactions').insert({
      id: transactionId,
      user_id: userId,
      type: meta?.tier ? 'subscription' : 'coin_purchase',
      status: 'succeeded',
      amount: amount,
      currency: currency,
      description: `Flutterwave payment: ${tx_ref}`,
      metadata: JSON.stringify({
        flw_ref,
        tx_ref,
        provider: 'flutterwave',
        tier: meta?.tier,
        billingCycle: meta?.billingCycle,
      }),
      processed_at: new Date(),
    });

    // 3. Credit user account based on purchase type
    if (meta?.tier) {
      // Subscription purchase
      await userServiceClient.updateSubscription({
        userId,
        tier: userServiceClient.mapTierName(meta.tier),
        status: 'active',
      });
      await notificationClient.notifyPaymentSuccess(userId, amount, `${meta.tier} Subscription`);
    } else if (meta?.coinAmount) {
      // Coin purchase
      await userServiceClient.addCoins({
        userId,
        amount: parseInt(meta.coinAmount),
        transactionType: 'purchase',
        stripePaymentId: tx_ref,
        productSku: `coins_${meta.coinAmount}`,
      });
      await notificationClient.notifyPaymentSuccess(userId, amount, `${meta.coinAmount} Coins`);
    }

    logger.info('[FLUTTERWAVE] Charge completed processed successfully', { tx_ref, userId });
  }

  private async handleSubscriptionCreated(event: FlutterwaveWebhookEvent): Promise<void> {
    const { plan, meta, tx_ref } = event.data;
    const userId = meta?.userId;

    logger.info('[FLUTTERWAVE] Processing subscription created', {
      plan: plan?.name,
      amount: plan?.amount,
      interval: plan?.interval,
      userId,
    });

    if (!userId || !plan) {
      logger.warn('[FLUTTERWAVE] Missing userId or plan in subscription event');
      return;
    }

    // Map Flutterwave plan to internal tier
    const tier = userServiceClient.mapTierName(plan.name || meta?.tier || 'premium');

    // Create user_subscription record
    const subscriptionId = require('uuid').v4();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + (plan.interval === 'yearly' ? 12 : 1));

    await db('user_subscriptions').insert({
      id: subscriptionId,
      user_id: userId,
      plan_id: await this.getPlanIdByName(tier),
      status: 'active',
      billing_cycle: plan.interval === 'yearly' ? 'yearly' : 'monthly',
      current_period_start: new Date(),
      current_period_end: periodEnd,
      metadata: JSON.stringify({
        provider: 'flutterwave',
        plan_token: plan.plan_token,
        tx_ref,
      }),
    });

    // Update user tier
    await userServiceClient.updateSubscription({
      userId,
      tier,
      status: 'active',
      currentPeriodEnd: periodEnd,
    });

    // Send welcome notification
    await notificationClient.notifySubscriptionUpdated(userId, tier, 'active');

    logger.info('[FLUTTERWAVE] Subscription created successfully', { userId, tier });
  }

  private async getPlanIdByName(tierName: string): Promise<string> {
    const plan = await db('subscription_plans').where('name', tierName).first();
    return plan?.id || (await db('subscription_plans').where('name', 'free').first())?.id;
  }

  private async handleSubscriptionCancelled(event: FlutterwaveWebhookEvent): Promise<void> {
    const { tx_ref, meta } = event.data;
    const userId = meta?.userId;

    logger.info('[FLUTTERWAVE] Processing subscription cancellation', { tx_ref, userId });

    if (!userId) {
      logger.warn('[FLUTTERWAVE] No userId in cancellation event');
      return;
    }

    // Update subscription status with 3-day grace period
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

    // Update user service with grace period
    await userServiceClient.updateSubscription({
      userId,
      tier: 'free', // Will be downgraded after grace period
      status: 'grace_period' as any,
      gracePeriodEnd,
    });

    // Send cancellation notification
    await notificationClient.notifySubscriptionCanceled(userId, 'Subscription', gracePeriodEnd);

    logger.info('[FLUTTERWAVE] Subscription cancelled with grace period', { userId, gracePeriodEnd });
  }

  private async handleTransferCompleted(event: FlutterwaveWebhookEvent): Promise<void> {
    const { tx_ref, amount, meta } = event.data;

    logger.info('[FLUTTERWAVE] Processing transfer completed', { tx_ref, amount });

    // Record payout completion
    await db('transactions')
      .where('metadata', 'like', `%${tx_ref}%`)
      .update({
        status: 'succeeded',
        processed_at: new Date(),
        updated_at: new Date(),
      });

    logger.info('[FLUTTERWAVE] Transfer completed processed', { tx_ref });
  }

  private async handleTransferFailed(event: FlutterwaveWebhookEvent): Promise<void> {
    const { tx_ref, processor_response } = event.data;

    logger.info('[FLUTTERWAVE] Processing transfer failure', { tx_ref, processor_response });

    // Update payout status to failed
    await db('transactions')
      .where('metadata', 'like', `%${tx_ref}%`)
      .update({
        status: 'failed',
        failure_message: processor_response,
        updated_at: new Date(),
      });

    logger.error('[FLUTTERWAVE] Transfer failed', { tx_ref, processor_response });
  }

  private async handleRefundCompleted(event: FlutterwaveWebhookEvent): Promise<void> {
    const { tx_ref, amount, meta } = event.data;
    const userId = meta?.userId;

    logger.info('[FLUTTERWAVE] Processing refund', { tx_ref, amount, userId });

    if (!userId) {
      logger.warn('[FLUTTERWAVE] No userId in refund event');
      return;
    }

    // Record refund transaction
    const refundId = require('uuid').v4();
    await db('transactions').insert({
      id: refundId,
      user_id: userId,
      type: 'refund',
      status: 'succeeded',
      amount: -amount, // Negative for refund
      currency: event.data.currency || 'NGN',
      description: `Refund for: ${tx_ref}`,
      metadata: JSON.stringify({ provider: 'flutterwave', original_tx_ref: tx_ref }),
      processed_at: new Date(),
    });

    // Update original transaction
    await db('transactions')
      .where('metadata', 'like', `%${tx_ref}%`)
      .whereNot('type', 'refund')
      .update({
        status: 'refunded',
        updated_at: new Date(),
      });

    // Reverse credits if coins were purchased
    if (meta?.coinAmount) {
      await userServiceClient.subtractCoins(userId, parseInt(meta.coinAmount), `Refund: ${tx_ref}`);
    }

    // If subscription refund, cancel subscription
    if (meta?.tier) {
      await userServiceClient.updateSubscription({
        userId,
        tier: 'free',
        status: 'canceled',
      });
    }

    logger.info('[FLUTTERWAVE] Refund processed successfully', { tx_ref, userId });
  }
}

export default new FlutterwaveWebhookService();
