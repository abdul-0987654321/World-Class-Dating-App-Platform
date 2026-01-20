import express, { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

import flutterwaveWebhookService from '../../domain/services/flutterwave-webhook.service';
import paystackWebhookService from '../../domain/services/paystack-webhook.service';
import logger from '../../utils/logger';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();
const webhookController = new WebhookController();

/**
 * Stripe Webhook Endpoint
 *
 * This endpoint receives webhook events from Stripe and processes them.
 *
 * IMPORTANT:
 * - This endpoint must use raw body parser (express.raw)
 * - Do NOT use express.json() middleware on this route
 * - Stripe signature verification requires the raw request body
 *
 * Security:
 * - Webhook signature is verified using STRIPE_WEBHOOK_SECRET
 * - Events are checked for idempotency to prevent duplicate processing
 * - All events are logged to stripe_webhook_events table
 *
 * Stripe Webhook Configuration:
 * 1. Go to Stripe Dashboard > Developers > Webhooks
 * 2. Add endpoint: https://yourdomain.com/api/payments/webhooks/stripe
 * 3. Select events to listen to (see list below)
 * 4. Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET env var
 *
 * Events handled by this endpoint:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - customer.subscription.trial_will_end
 * - customer.subscription.pending_update_applied
 * - customer.subscription.pending_update_expired
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 * - payment_intent.canceled
 * - payment_intent.requires_action
 * - invoice.paid
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 * - invoice.payment_action_required
 * - invoice.upcoming
 * - invoice.finalized
 * - checkout.session.completed
 * - checkout.session.expired
 * - customer.created
 * - customer.updated
 * - customer.deleted
 * - charge.succeeded
 * - charge.failed
 * - charge.refunded
 * - charge.dispute.created
 * - refund.created
 * - refund.updated
 * - payment_method.attached
 * - payment_method.detached
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    await webhookController.handleStripeWebhook(req, res);
  } catch (error: any) {
    logger.error('Webhook route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Health check endpoint for webhook service
 * GET /api/webhooks/health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'payment-service-webhooks',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Webhook test endpoint (for development only)
 * POST /api/webhooks/test
 *
 * SECURITY: This endpoint is disabled in production.
 *
 * Use Stripe CLI to test webhooks locally:
 * stripe listen --forward-to localhost:3003/api/webhooks/stripe
 * stripe trigger payment_intent.succeeded
 */
router.post('/test', express.json(), async (req, res) => {
  // Security: Only allow test endpoint in development/test environments
  if (process.env.NODE_ENV === 'production') {
    logger.warn('Attempted access to test webhook in production');
    return res.status(404).json({ error: 'Not found' });
  }

  logger.info('Test webhook received:', req.body);
  res.status(200).json({ received: true, message: 'Test webhook received' });
});

/**
 * Paystack Webhook Endpoint
 *
 * Receives webhook events from Paystack for African payments.
 * Used primarily in Nigeria and Ghana.
 *
 * Paystack Webhook Configuration:
 * 1. Go to Paystack Dashboard > Settings > API Keys & Webhooks
 * 2. Add webhook URL: https://yourdomain.com/api/payments/webhooks/paystack
 * 3. Copy the webhook secret to PAYSTACK_WEBHOOK_SECRET env var
 *
 * Events handled:
 * - charge.success
 * - subscription.create
 * - subscription.disable
 * - subscription.not_renew
 * - invoice.payment_failed
 * - refund.processed
 */
router.post('/paystack', express.json(), async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    if (!paystackWebhookService.verifySignature(payload, signature)) {
      logger.warn('[PAYSTACK] Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Generate event ID for idempotency
    const eventId = req.body.data?.reference || req.body.data?.id?.toString() || uuidv4();

    // Process the webhook asynchronously
    paystackWebhookService.processWebhook(req.body, eventId).catch((error) => {
      logger.error('[PAYSTACK] Async webhook processing error:', error.message);
    });

    // Respond immediately to Paystack
    res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error('[PAYSTACK] Webhook route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Flutterwave Webhook Endpoint
 *
 * Receives webhook events from Flutterwave for African payments.
 * Operates across Nigeria, Ghana, Kenya, South Africa, and more.
 *
 * Flutterwave Webhook Configuration:
 * 1. Go to Flutterwave Dashboard > Settings > Webhooks
 * 2. Add webhook URL: https://yourdomain.com/api/payments/webhooks/flutterwave
 * 3. Set a secret hash and add it to FLUTTERWAVE_WEBHOOK_SECRET env var
 *
 * Events handled:
 * - charge.completed
 * - subscription.created
 * - subscription.cancelled
 * - transfer.completed
 * - transfer.failed
 * - payment.refund.completed
 */
router.post('/flutterwave', express.json(), async (req, res) => {
  try {
    const signature = req.headers['verif-hash'] as string;

    // Verify webhook signature
    if (!flutterwaveWebhookService.verifySignature(signature)) {
      logger.warn('[FLUTTERWAVE] Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Generate event ID for idempotency
    const eventId = req.body.data?.tx_ref || req.body.data?.id?.toString() || uuidv4();

    // Process the webhook asynchronously
    flutterwaveWebhookService.processWebhook(req.body, eventId).catch((error) => {
      logger.error('[FLUTTERWAVE] Async webhook processing error:', error.message);
    });

    // Respond immediately to Flutterwave
    res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error('[FLUTTERWAVE] Webhook route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
