import Stripe from 'stripe';

import { db } from '../../infrastructure/database/connection';
import logger from '../../utils/logger';

import { WebhookService } from './webhook.service';

/**
 * Webhook Retry Service
 *
 * Handles retry logic for failed webhook event processing
 */
export class WebhookRetryService {
  private webhookService: WebhookService;
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAYS = [60, 300, 900, 3600, 7200]; // seconds: 1min, 5min, 15min, 1hr, 2hr

  constructor() {
    this.webhookService = new WebhookService();
  }

  /**
   * Process failed webhook events with retry logic
   */
  async processFailedEvents(): Promise<void> {
    const failedEvents = await db('stripe_webhook_events')
      .where({ status: 'failed' })
      .where('retry_count', '<', this.MAX_RETRIES)
      .whereRaw("created_at > NOW() - INTERVAL '24 HOURS'") // Only retry events from last 24 hours
      .orderBy('created_at', 'asc')
      .limit(100);

    logger.info(`Found ${failedEvents.length} failed webhook events to retry`);

    for (const event of failedEvents) {
      await this.retryEvent(event);
    }
  }

  /**
   * Retry a specific webhook event
   */
  private async retryEvent(eventRecord: any): Promise<void> {
    const retryCount = eventRecord.retry_count;
    const delaySeconds = this.RETRY_DELAYS[Math.min(retryCount, this.RETRY_DELAYS.length - 1)];
    const lastAttempt = new Date(eventRecord.updated_at);
    const nextRetryTime = new Date(lastAttempt.getTime() + delaySeconds * 1000);

    // Check if enough time has passed for retry
    if (new Date() < nextRetryTime) {
      return; // Not time to retry yet
    }

    try {
      logger.info(
        `Retrying webhook event ${eventRecord.stripe_event_id} (attempt ${retryCount + 1}/${this.MAX_RETRIES})`
      );

      const stripeEvent = JSON.parse(eventRecord.payload) as Stripe.Event;

      // Update retry count before processing
      await db('stripe_webhook_events')
        .where({ id: eventRecord.id })
        .update({
          retry_count: retryCount + 1,
          updated_at: new Date(),
        });

      // Process the event
      await this.processEventByType(stripeEvent);

      // Mark as processed if successful
      await this.webhookService.markEventProcessed(eventRecord.stripe_event_id);

      logger.info(`Successfully retried webhook event ${eventRecord.stripe_event_id}`);
    } catch (error) {
      logger.error(`Retry failed for event ${eventRecord.stripe_event_id}:`, error);

      // Update error message
      await db('stripe_webhook_events').where({ id: eventRecord.id }).update({
        error_message: error.message,
        updated_at: new Date(),
      });

      // If max retries reached, mark as permanently failed
      if (retryCount + 1 >= this.MAX_RETRIES) {
        await this.handlePermanentFailure(eventRecord, error);
      }
    }
  }

  /**
   * Process event based on its type
   */
  private async processEventByType(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      // Subscription events
      case 'customer.subscription.created':
        await this.webhookService.handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.webhookService.handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.webhookService.handleSubscriptionDeleted(event.data.object);
        break;
      case 'customer.subscription.trial_will_end':
        await this.webhookService.handleTrialWillEnd(event.data.object);
        break;
      case 'customer.subscription.pending_update_applied':
        await this.webhookService.handleSubscriptionPendingUpdateApplied(event.data.object);
        break;
      case 'customer.subscription.pending_update_expired':
        await this.webhookService.handleSubscriptionPendingUpdateExpired(event.data.object);
        break;

      // Invoice events
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await this.webhookService.handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.webhookService.handleInvoicePaymentFailed(event.data.object);
        break;
      case 'invoice.payment_action_required':
        await this.webhookService.handleInvoicePaymentActionRequired(event.data.object);
        break;
      case 'invoice.upcoming':
        await this.webhookService.handleInvoiceUpcoming(event.data.object);
        break;
      case 'invoice.finalized':
        await this.webhookService.handleInvoiceFinalized(event.data.object);
        break;

      // Payment intent events
      case 'payment_intent.succeeded':
        await this.webhookService.handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.webhookService.handlePaymentIntentFailed(event.data.object);
        break;
      case 'payment_intent.canceled':
        await this.webhookService.handlePaymentIntentCanceled(event.data.object);
        break;
      case 'payment_intent.requires_action':
        await this.webhookService.handlePaymentIntentRequiresAction(event.data.object);
        break;

      // Checkout events
      case 'checkout.session.completed':
        await this.webhookService.handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'checkout.session.expired':
        await this.webhookService.handleCheckoutSessionExpired(event.data.object);
        break;

      // Charge events
      case 'charge.succeeded':
        await this.webhookService.handleChargeSucceeded(event.data.object);
        break;
      case 'charge.failed':
        await this.webhookService.handleChargeFailed(event.data.object);
        break;
      case 'charge.refunded':
        await this.webhookService.handleChargeRefunded(event.data.object);
        break;
      case 'charge.dispute.created':
        await this.webhookService.handleDisputeCreated(event.data.object);
        break;

      // Customer events
      case 'customer.created':
        await this.webhookService.handleCustomerCreated(event.data.object);
        break;
      case 'customer.updated':
        await this.webhookService.handleCustomerUpdated(event.data.object);
        break;
      case 'customer.deleted':
        await this.webhookService.handleCustomerDeleted(event.data.object);
        break;

      // Payment method events
      case 'payment_method.attached':
        await this.webhookService.handlePaymentMethodAttached(event.data.object);
        break;
      case 'payment_method.detached':
        await this.webhookService.handlePaymentMethodDetached(event.data.object);
        break;

      default:
        logger.warn(`Unhandled webhook event type in retry: ${event.type}`);
    }
  }

  /**
   * Handle permanently failed events
   */
  private async handlePermanentFailure(eventRecord: any, error: Error): Promise<void> {
    logger.error(
      `Webhook event ${eventRecord.stripe_event_id} permanently failed after ${this.MAX_RETRIES} retries`
    );

    // Update status to permanently failed
    await db('stripe_webhook_events')
      .where({ id: eventRecord.id })
      .update({
        status: 'permanently_failed',
        error_message: `Max retries (${this.MAX_RETRIES}) exceeded: ${error.message}`,
        updated_at: new Date(),
      });

    // In production, send alert to admin/ops team
    // await notificationService.alertOpsTeam({
    //   type: 'webhook_permanent_failure',
    //   eventId: eventRecord.stripe_event_id,
    //   eventType: eventRecord.event_type,
    //   error: error.message,
    // });
  }

  /**
   * Clean up old webhook events
   * Remove successfully processed events older than 30 days
   */
  async cleanupOldEvents(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleted = await db('stripe_webhook_events')
      .where({ status: 'processed' })
      .where('created_at', '<', thirtyDaysAgo)
      .delete();

    logger.info(`Cleaned up ${deleted} old webhook events`);
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(): Promise<{
    total: number;
    processed: number;
    failed: number;
    pending: number;
    permanently_failed: number;
  }> {
    const stats = await db('stripe_webhook_events')
      .select('status')
      .count('* as count')
      .groupBy('status');

    const result = {
      total: 0,
      processed: 0,
      failed: 0,
      pending: 0,
      permanently_failed: 0,
    };

    stats.forEach((stat: any) => {
      const count = parseInt(stat.count);
      result.total += count;

      if (stat.status === 'processed') result.processed = count;
      else if (stat.status === 'failed') result.failed = count;
      else if (stat.status === 'pending') result.pending = count;
      else if (stat.status === 'permanently_failed') result.permanently_failed = count;
    });

    return result;
  }
}

export default new WebhookRetryService();
