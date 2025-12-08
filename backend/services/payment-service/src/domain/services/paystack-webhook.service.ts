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
    logger.info('[PAYSTACK STUB] Charge success event received', {
      reference: event.data.reference,
      amount: event.data.amount,
      currency: event.data.currency,
      userId: event.data.metadata?.userId,
    });

    // TODO: Implement payment confirmation logic
    // - Verify transaction with Paystack API
    // - Credit user account (coins, subscription, etc.)
    // - Send confirmation notification
  }

  private async handleSubscriptionCreate(event: PaystackWebhookEvent): Promise<void> {
    logger.info('[PAYSTACK STUB] Subscription created event received', {
      subscriptionCode: event.data.subscription_code,
      plan: event.data.plan?.name,
      userId: event.data.metadata?.userId,
    });

    // TODO: Implement subscription creation logic
    // - Create user_subscription record
    // - Update user tier
    // - Send welcome notification
  }

  private async handleSubscriptionCancel(event: PaystackWebhookEvent): Promise<void> {
    logger.info('[PAYSTACK STUB] Subscription cancelled event received', {
      subscriptionCode: event.data.subscription_code,
      userId: event.data.metadata?.userId,
    });

    // TODO: Implement subscription cancellation logic
    // - Update subscription status
    // - Start grace period if applicable
    // - Send cancellation notification
  }

  private async handlePaymentFailed(event: PaystackWebhookEvent): Promise<void> {
    logger.info('[PAYSTACK STUB] Payment failed event received', {
      reference: event.data.reference,
      userId: event.data.metadata?.userId,
    });

    // TODO: Implement payment failure logic
    // - Enter grace period
    // - Send retry payment notification
    // - Schedule retry
  }

  private async handleRefund(event: PaystackWebhookEvent): Promise<void> {
    logger.info('[PAYSTACK STUB] Refund processed event received', {
      reference: event.data.reference,
      amount: event.data.amount,
      userId: event.data.metadata?.userId,
    });

    // TODO: Implement refund logic
    // - Update transaction status
    // - Reverse credits if applicable
    // - Send refund notification
  }
}

export default new PaystackWebhookService();
