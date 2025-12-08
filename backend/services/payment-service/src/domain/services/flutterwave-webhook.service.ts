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
    logger.info('[FLUTTERWAVE STUB] Charge completed event received', {
      tx_ref: event.data.tx_ref,
      flw_ref: event.data.flw_ref,
      amount: event.data.amount,
      currency: event.data.currency,
      status: event.data.status,
      userId: event.data.meta?.userId,
    });

    // TODO: Implement payment confirmation logic
    // 1. Verify transaction with Flutterwave API
    //    GET https://api.flutterwave.com/v3/transactions/:id/verify
    // 2. Credit user account (coins, subscription, etc.)
    // 3. Record transaction in database
    // 4. Send confirmation notification
  }

  private async handleSubscriptionCreated(event: FlutterwaveWebhookEvent): Promise<void> {
    logger.info('[FLUTTERWAVE STUB] Subscription created event received', {
      plan: event.data.plan?.name,
      amount: event.data.plan?.amount,
      interval: event.data.plan?.interval,
      userId: event.data.meta?.userId,
    });

    // TODO: Implement subscription creation logic
    // - Create user_subscription record
    // - Map Flutterwave plan to internal tier
    // - Update user tier and features
    // - Send welcome notification
  }

  private async handleSubscriptionCancelled(event: FlutterwaveWebhookEvent): Promise<void> {
    logger.info('[FLUTTERWAVE STUB] Subscription cancelled event received', {
      tx_ref: event.data.tx_ref,
      userId: event.data.meta?.userId,
    });

    // TODO: Implement subscription cancellation logic
    // - Update subscription status to cancelled
    // - Start 3-day grace period
    // - Schedule downgrade to free tier
    // - Send cancellation notification
  }

  private async handleTransferCompleted(event: FlutterwaveWebhookEvent): Promise<void> {
    logger.info('[FLUTTERWAVE STUB] Transfer completed event received', {
      tx_ref: event.data.tx_ref,
      amount: event.data.amount,
    });

    // TODO: Implement transfer completion logic (for payouts)
    // - Update payout status
    // - Send confirmation to creator/partner
  }

  private async handleTransferFailed(event: FlutterwaveWebhookEvent): Promise<void> {
    logger.info('[FLUTTERWAVE STUB] Transfer failed event received', {
      tx_ref: event.data.tx_ref,
      processor_response: event.data.processor_response,
    });

    // TODO: Implement transfer failure logic
    // - Update payout status
    // - Queue for retry or notify admin
  }

  private async handleRefundCompleted(event: FlutterwaveWebhookEvent): Promise<void> {
    logger.info('[FLUTTERWAVE STUB] Refund completed event received', {
      tx_ref: event.data.tx_ref,
      amount: event.data.amount,
      userId: event.data.meta?.userId,
    });

    // TODO: Implement refund logic
    // - Update transaction status to refunded
    // - Reverse credits if applicable (coins, boosts)
    // - Update subscription if subscription refund
    // - Send refund notification
  }
}

export default new FlutterwaveWebhookService();
