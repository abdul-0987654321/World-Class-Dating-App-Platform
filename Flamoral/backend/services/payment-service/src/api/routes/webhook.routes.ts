import { Router } from 'express';
import express from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import logger from '../../utils/logger';

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
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      await webhookController.handleStripeWebhook(req, res);
    } catch (error: any) {
      logger.error('Webhook route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

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
 * Use Stripe CLI to test webhooks locally:
 * stripe listen --forward-to localhost:3003/api/webhooks/stripe
 * stripe trigger payment_intent.succeeded
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/test', express.json(), async (req, res) => {
    logger.info('Test webhook received:', req.body);
    res.status(200).json({ received: true, message: 'Test webhook received' });
  });
}

export default router;
