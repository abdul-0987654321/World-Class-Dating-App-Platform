/**
 * Multi-Gateway Payment System
 *
 * Enterprise-grade payment integration with:
 * - Multiple payment providers (Stripe, Square, Adyen, Wise, Amazon Pay)
 * - Intelligent routing with failover
 * - Transaction state machine
 * - Webhook processing with retry logic
 * - PCI-DSS compliant design
 */

// Core Types
export * from './types';

// Payment Providers
export { StripeProvider } from './providers/StripeProvider';
export { SquareProvider } from './providers/SquareProvider';
export { AdyenProvider } from './providers/AdyenProvider';
export { WiseProvider } from './providers/WiseProvider';
export { AmazonPayProvider } from './providers/AmazonPayProvider';

// Payment Router
export { PaymentRouter, PaymentContext, HealthStatus, FailoverResult } from './PaymentRouter';

// Transaction State Machine
export {
  TransactionStateMachine,
  TransactionState,
  TransactionEvent,
  StateTransitionOptions
} from './TransactionStateMachine';

// Webhook Processing
export {
  WebhookProcessor,
  WebhookStatus,
  WebhookEventRecord,
  IWebhookHandler,
  PaymentSuccessHandler,
  SubscriptionUpdateHandler,
  DisputeHandler,
  RefundHandler,
  createWebhookRoutes
} from './webhooks';

// API
export { PaymentController, createPaymentRoutes } from './api';

// Factory function to create the entire payment system
import { Knex } from 'knex';
import { Logger } from '../../utils/logger';
import { Express } from 'express';

import { StripeProvider } from './providers/StripeProvider';
import { SquareProvider } from './providers/SquareProvider';
import { AdyenProvider } from './providers/AdyenProvider';
import { WiseProvider } from './providers/WiseProvider';
import { AmazonPayProvider } from './providers/AmazonPayProvider';
import { PaymentRouter } from './PaymentRouter';
import { TransactionStateMachine } from './TransactionStateMachine';
import {
  WebhookProcessor,
  PaymentSuccessHandler,
  SubscriptionUpdateHandler,
  DisputeHandler,
  RefundHandler,
  createWebhookRoutes
} from './webhooks';
import { PaymentController, createPaymentRoutes } from './api';

export interface PaymentSystemConfig {
  stripe?: {
    secretKey: string;
    webhookSecret: string;
  };
  square?: {
    accessToken: string;
    applicationId: string;
    locationId: string;
    environment: 'sandbox' | 'production';
    webhookSignatureKey: string;
  };
  adyen?: {
    apiKey: string;
    merchantAccount: string;
    environment: 'test' | 'live';
    hmacKey: string;
  };
  wise?: {
    apiKey: string;
    profileId: string;
    environment: 'sandbox' | 'production';
    webhookSecret: string;
  };
  amazonPay?: {
    merchantId: string;
    publicKeyId: string;
    privateKey: string;
    region: string;
    environment: 'sandbox' | 'production';
  };
}

export interface PaymentSystem {
  router: PaymentRouter;
  stateMachine: TransactionStateMachine;
  webhookProcessor: WebhookProcessor;
  controller: PaymentController;
  mountRoutes: (app: Express, basePath?: string) => void;
  start: () => void;
  stop: () => void;
}

export function createPaymentSystem(
  db: Knex,
  logger: Logger,
  config: PaymentSystemConfig
): PaymentSystem {
  // Initialize providers
  const providers: any[] = [];

  if (config.stripe) {
    providers.push(new StripeProvider({
      secretKey: config.stripe.secretKey,
      webhookSecret: config.stripe.webhookSecret
    }, logger));
  }

  if (config.square) {
    providers.push(new SquareProvider(config.square, logger));
  }

  if (config.adyen) {
    providers.push(new AdyenProvider(config.adyen, logger));
  }

  let wiseProvider: WiseProvider | undefined;
  if (config.wise) {
    wiseProvider = new WiseProvider(config.wise, logger);
    providers.push(wiseProvider);
  }

  if (config.amazonPay) {
    providers.push(new AmazonPayProvider(config.amazonPay, logger));
  }

  // Initialize all providers
  for (const provider of providers) {
    provider.initialize().catch((err: Error) => {
      logger.error(`Failed to initialize ${provider.provider}`, { error: err.message });
    });
  }

  // Create payment router
  const paymentRouter = new PaymentRouter(db, logger, providers);

  // Create state machine
  const stateMachine = new TransactionStateMachine(db, logger);

  // Create webhook processor
  const webhookProcessor = new WebhookProcessor(db, logger, stateMachine);

  // Register default handlers
  webhookProcessor.registerHandler(new PaymentSuccessHandler(db, logger));
  webhookProcessor.registerHandler(new SubscriptionUpdateHandler(db, logger));
  webhookProcessor.registerHandler(new DisputeHandler(db, logger));
  webhookProcessor.registerHandler(new RefundHandler(db, logger));

  // Create controller
  const controller = new PaymentController(
    db,
    logger,
    paymentRouter,
    stateMachine,
    wiseProvider
  );

  return {
    router: paymentRouter,
    stateMachine,
    webhookProcessor,
    controller,

    mountRoutes(app: Express, basePath: string = '/api/payments') {
      // Mount payment API routes (require auth middleware)
      app.use(basePath, createPaymentRoutes(controller));

      // Mount webhook routes (no auth, signature verification instead)
      app.use(`${basePath}/webhooks`, createWebhookRoutes(webhookProcessor, logger));

      logger.info('Payment routes mounted', { basePath });
    },

    start() {
      // Start webhook processor
      webhookProcessor.start(1000);
      logger.info('Payment system started');
    },

    stop() {
      webhookProcessor.stop();
      logger.info('Payment system stopped');
    }
  };
}

export default createPaymentSystem;
