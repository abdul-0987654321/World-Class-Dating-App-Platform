/**
 * Webhook Routes
 *
 * Express routes for handling payment provider webhooks
 * Each provider has its own endpoint for proper signature verification
 */

import { Router, Request, Response, NextFunction } from 'express';
import { WebhookProcessor, WebhookStatus } from './WebhookProcessor';
import { PaymentProvider } from '../types';
import { Logger } from '../../../utils/logger';

export function createWebhookRoutes(
  webhookProcessor: WebhookProcessor,
  logger: Logger
): Router {
  const router = Router();

  // Raw body parser middleware for signature verification
  const rawBodyParser = (req: Request, res: Response, next: NextFunction) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      (req as any).rawBody = data;
      try {
        req.body = JSON.parse(data);
      } catch {
        req.body = {};
      }
      next();
    });
  };

  /**
   * Stripe webhook endpoint
   * POST /webhooks/stripe
   */
  router.post('/stripe', rawBodyParser, async (req: Request, res: Response) => {
    try {
      const result = await webhookProcessor.receiveWebhook(
        PaymentProvider.STRIPE,
        (req as any).rawBody,
        req.headers as Record<string, string>
      );

      if (result.status === WebhookStatus.DUPLICATE) {
        logger.info('Duplicate Stripe webhook received', { eventId: result.eventId });
      }

      // Always return 200 to acknowledge receipt
      res.status(200).json({ received: true, eventId: result.eventId });
    } catch (error: any) {
      logger.error('Stripe webhook error', { error: error.message });

      if (error.message === 'Invalid webhook signature') {
        return res.status(400).json({ error: 'Invalid signature' });
      }

      // Return 500 for Stripe to retry
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Square webhook endpoint
   * POST /webhooks/square
   */
  router.post('/square', rawBodyParser, async (req: Request, res: Response) => {
    try {
      const result = await webhookProcessor.receiveWebhook(
        PaymentProvider.SQUARE,
        (req as any).rawBody,
        req.headers as Record<string, string>
      );

      res.status(200).json({ received: true, eventId: result.eventId });
    } catch (error: any) {
      logger.error('Square webhook error', { error: error.message });

      if (error.message === 'Invalid webhook signature') {
        return res.status(400).json({ error: 'Invalid signature' });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Adyen webhook endpoint
   * POST /webhooks/adyen
   */
  router.post('/adyen', rawBodyParser, async (req: Request, res: Response) => {
    try {
      const result = await webhookProcessor.receiveWebhook(
        PaymentProvider.ADYEN,
        (req as any).rawBody,
        req.headers as Record<string, string>
      );

      // Adyen expects [accepted] response
      res.status(200).send('[accepted]');
    } catch (error: any) {
      logger.error('Adyen webhook error', { error: error.message });

      if (error.message === 'Invalid webhook signature') {
        return res.status(401).send('[rejected]');
      }

      res.status(500).send('[error]');
    }
  });

  /**
   * Wise webhook endpoint
   * POST /webhooks/wise
   */
  router.post('/wise', rawBodyParser, async (req: Request, res: Response) => {
    try {
      const result = await webhookProcessor.receiveWebhook(
        PaymentProvider.WISE,
        (req as any).rawBody,
        req.headers as Record<string, string>
      );

      res.status(200).json({ received: true, eventId: result.eventId });
    } catch (error: any) {
      logger.error('Wise webhook error', { error: error.message });

      if (error.message === 'Invalid webhook signature') {
        return res.status(400).json({ error: 'Invalid signature' });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Amazon Pay IPN endpoint
   * POST /webhooks/amazon-pay
   */
  router.post('/amazon-pay', rawBodyParser, async (req: Request, res: Response) => {
    try {
      // Handle SNS subscription confirmation
      const messageType = req.headers['x-amz-sns-message-type'];
      if (messageType === 'SubscriptionConfirmation') {
        const subscribeUrl = req.body.SubscribeURL;
        logger.info('Amazon Pay SNS subscription confirmation', { subscribeUrl });
        // In production, fetch the subscribeUrl to confirm
        return res.status(200).json({ received: true });
      }

      const result = await webhookProcessor.receiveWebhook(
        PaymentProvider.AMAZON_PAY,
        (req as any).rawBody,
        req.headers as Record<string, string>
      );

      res.status(200).json({ received: true, eventId: result.eventId });
    } catch (error: any) {
      logger.error('Amazon Pay webhook error', { error: error.message });

      if (error.message === 'Invalid webhook signature') {
        return res.status(400).json({ error: 'Invalid signature' });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Apple App Store Server Notifications
   * POST /webhooks/apple
   */
  router.post('/apple', rawBodyParser, async (req: Request, res: Response) => {
    try {
      // Apple sends a signed JWS payload
      const signedPayload = req.body.signedPayload;

      if (!signedPayload) {
        return res.status(400).json({ error: 'Missing signedPayload' });
      }

      // For now, log and acknowledge - full implementation would verify JWS
      logger.info('Apple App Store notification received', {
        notificationType: req.body.notificationType
      });

      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error('Apple webhook error', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Google Play Real-time Developer Notifications
   * POST /webhooks/google
   */
  router.post('/google', rawBodyParser, async (req: Request, res: Response) => {
    try {
      // Google sends Pub/Sub messages
      const message = req.body.message;

      if (!message || !message.data) {
        return res.status(400).json({ error: 'Invalid message format' });
      }

      // Decode base64 message data
      const decodedData = Buffer.from(message.data, 'base64').toString();
      const notification = JSON.parse(decodedData);

      logger.info('Google Play notification received', {
        subscriptionNotification: notification.subscriptionNotification,
        oneTimeProductNotification: notification.oneTimeProductNotification
      });

      // Acknowledge the message
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error('Google webhook error', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Get webhook processing statistics (admin endpoint)
   * GET /webhooks/stats
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const stats = await webhookProcessor.getStats();
      res.json(stats);
    } catch (error: any) {
      logger.error('Error getting webhook stats', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Get dead letter queue (admin endpoint)
   * GET /webhooks/dead-letter
   */
  router.get('/dead-letter', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const events = await webhookProcessor.getDeadLetterQueue(limit, offset);
      res.json({ events, limit, offset });
    } catch (error: any) {
      logger.error('Error getting dead letter queue', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Retry a dead-lettered event (admin endpoint)
   * POST /webhooks/dead-letter/:eventId/retry
   */
  router.post('/dead-letter/:eventId/retry', async (req: Request, res: Response) => {
    try {
      await webhookProcessor.retryDeadLetter(req.params.eventId);
      res.json({ success: true, message: 'Event queued for retry' });
    } catch (error: any) {
      logger.error('Error retrying dead letter', { error: error.message, eventId: req.params.eventId });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

export default createWebhookRoutes;
