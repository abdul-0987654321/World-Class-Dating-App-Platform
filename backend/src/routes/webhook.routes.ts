/**
 * Webhook Routes
 * Handles incoming webhooks from all payment providers
 */

import { Router, Request, Response, raw } from 'express';
import { Pool } from 'pg';
import { WebhookService } from '../services/payments/webhooks/WebhookService';

const router = Router();

// Get database pool from app context
let webhookService: WebhookService;

export function initializeWebhookRoutes(pool: Pool): Router {
  webhookService = new WebhookService(pool);
  return router;
}

/**
 * Stripe Webhook
 * POST /api/webhooks/stripe
 *
 * Note: Requires raw body for signature verification
 */
router.post('/stripe', raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const result = await webhookService.processStripeWebhook(req.body, signature);

    if (result.success) {
      console.log(`Stripe webhook processed: ${result.eventType} (${result.eventId})`);
      return res.status(200).json({ received: true, action: result.action });
    } else {
      console.error(`Stripe webhook failed: ${result.error}`);
      return res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Stripe webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * PayPal Webhook
 * POST /api/webhooks/paypal
 */
router.post('/paypal', async (req: Request, res: Response) => {
  try {
    // PayPal sends various headers for verification
    const headers = {
      'paypal-auth-algo': req.headers['paypal-auth-algo'] as string,
      'paypal-cert-url': req.headers['paypal-cert-url'] as string,
      'paypal-transmission-id': req.headers['paypal-transmission-id'] as string,
      'paypal-transmission-sig': req.headers['paypal-transmission-sig'] as string,
      'paypal-transmission-time': req.headers['paypal-transmission-time'] as string,
    };

    const result = await webhookService.processPayPalWebhook(req.body, headers);

    if (result.success) {
      console.log(`PayPal webhook processed: ${result.eventType} (${result.eventId})`);
      return res.status(200).json({ received: true, action: result.action });
    } else {
      console.error(`PayPal webhook failed: ${result.error}`);
      return res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('PayPal webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Flutterwave Webhook
 * POST /api/webhooks/flutterwave
 */
router.post('/flutterwave', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['verif-hash'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Missing verif-hash header' });
    }

    const result = await webhookService.processFlutterwaveWebhook(req.body, signature);

    if (result.success) {
      console.log(`Flutterwave webhook processed: ${result.eventType} (${result.eventId})`);
      return res.status(200).json({ received: true, action: result.action });
    } else {
      console.error(`Flutterwave webhook failed: ${result.error}`);
      return res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Flutterwave webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Paystack Webhook
 * POST /api/webhooks/paystack
 */
router.post('/paystack', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Missing x-paystack-signature header' });
    }

    const result = await webhookService.processPaystackWebhook(req.body, signature);

    if (result.success) {
      console.log(`Paystack webhook processed: ${result.eventType} (${result.eventId})`);
      return res.status(200).json({ received: true, action: result.action });
    } else {
      console.error(`Paystack webhook failed: ${result.error}`);
      return res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Paystack webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Apple App Store Server Notification
 * POST /api/webhooks/apple
 *
 * Apple sends notifications for:
 * - Subscription renewals
 * - Subscription cancellations
 * - Refunds
 * - Grace period events
 */
router.post('/apple', async (req: Request, res: Response) => {
  try {
    // Apple sends either V1 or V2 notifications
    // V2 uses signedPayload field
    const payload = req.body.signedPayload || req.body;

    const result = await webhookService.processAppleWebhook(payload);

    if (result.success) {
      console.log(`Apple webhook processed: ${result.eventType} (${result.eventId})`);
      return res.status(200).json({ received: true, action: result.action });
    } else {
      console.error(`Apple webhook failed: ${result.error}`);
      return res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Apple webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Google Play Real-Time Developer Notification (RTDN)
 * POST /api/webhooks/google
 *
 * Google sends Pub/Sub messages for:
 * - One-time product purchases
 * - Subscription state changes
 */
router.post('/google', async (req: Request, res: Response) => {
  try {
    // Google RTDN comes through Pub/Sub
    // The message is base64 encoded in the 'message.data' field
    const pubsubMessage = req.body.message;

    if (!pubsubMessage) {
      return res.status(400).json({ error: 'Missing Pub/Sub message' });
    }

    // Decode the base64 message
    let decodedData: any;
    try {
      const dataBuffer = Buffer.from(pubsubMessage.data, 'base64');
      decodedData = JSON.parse(dataBuffer.toString('utf-8'));
    } catch {
      // If it's not base64 encoded, use as-is
      decodedData = pubsubMessage.data;
    }

    const result = await webhookService.processGoogleWebhook({
      ...decodedData,
      message: pubsubMessage,
    });

    if (result.success) {
      console.log(`Google webhook processed: ${result.eventType} (${result.eventId})`);
      // Google requires 200 OK to acknowledge receipt
      return res.status(200).json({ received: true, action: result.action });
    } else {
      console.error(`Google webhook failed: ${result.error}`);
      // Return 200 anyway to prevent retries for validation errors
      return res.status(200).json({ received: true, error: result.error });
    }
  } catch (error: any) {
    console.error('Google webhook error:', error);
    // Return 200 to acknowledge receipt even on error (prevent infinite retries)
    return res.status(200).json({ received: true, error: 'Webhook processing failed' });
  }
});

/**
 * Health check for webhooks
 * GET /api/webhooks/health
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    providers: ['stripe', 'paypal', 'flutterwave', 'paystack', 'apple', 'google'],
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get webhook event status (for debugging)
 * GET /api/webhooks/events/:eventId
 */
router.get('/events/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const pool = (req as any).pool as Pool;

    const result = await pool.query(
      `SELECT * FROM webhook_events WHERE event_id = $1`,
      [eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching webhook event:', error);
    return res.status(500).json({ error: 'Failed to fetch event' });
  }
});

export default router;
