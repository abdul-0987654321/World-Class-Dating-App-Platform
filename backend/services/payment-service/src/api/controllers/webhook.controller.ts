import { Request, Response } from 'express';
import Stripe from 'stripe';
import { WebhookService } from '../../domain/services/webhook.service';
import logger from '../../utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const webhookService = new WebhookService();

export class WebhookController {
  /**
   * Handle Stripe webhook events
   * POST /api/webhooks/stripe
   */
  async handleStripeWebhook(req: Request, res: Response): Promise<Response> {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error('Stripe webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      logger.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Check for duplicate event (idempotency)
    const isDuplicate = await webhookService.isEventProcessed(event.id);
    if (isDuplicate) {
      logger.info(`Duplicate webhook event: ${event.id}`);
      return res.status(200).json({ received: true, duplicate: true });
    }

    // Store event for processing
    await webhookService.storeEvent(event);

    try {
      // Process the event based on type
      switch (event.type) {
        // Subscription events
        case 'customer.subscription.created':
          await webhookService.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await webhookService.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await webhookService.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.trial_will_end':
          await webhookService.handleTrialWillEnd(event.data.object as Stripe.Subscription);
          break;

        // Invoice events
        case 'invoice.payment_succeeded':
          await webhookService.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await webhookService.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.upcoming':
          await webhookService.handleInvoiceUpcoming(event.data.object as Stripe.Invoice);
          break;

        // Payment intent events
        case 'payment_intent.succeeded':
          await webhookService.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await webhookService.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        // Charge events
        case 'charge.refunded':
          await webhookService.handleChargeRefunded(event.data.object as Stripe.Charge);
          break;

        case 'charge.dispute.created':
          await webhookService.handleDisputeCreated(event.data.object as Stripe.Dispute);
          break;

        // Customer events
        case 'customer.created':
          await webhookService.handleCustomerCreated(event.data.object as Stripe.Customer);
          break;

        case 'customer.updated':
          await webhookService.handleCustomerUpdated(event.data.object as Stripe.Customer);
          break;

        // Payment method events
        case 'payment_method.attached':
          await webhookService.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
          break;

        case 'payment_method.detached':
          await webhookService.handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
          break;

        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }

      // Mark event as processed
      await webhookService.markEventProcessed(event.id);

      return res.status(200).json({ received: true });
    } catch (err: any) {
      logger.error(`Error processing webhook event ${event.type}:`, err);
      await webhookService.markEventFailed(event.id, err.message);

      // Return 200 to prevent Stripe from retrying (we'll handle retry ourselves)
      return res.status(200).json({ received: true, error: err.message });
    }
  }
}
