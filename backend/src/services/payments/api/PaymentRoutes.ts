/**
 * Payment Routes
 *
 * Express routes for all payment operations
 * All routes require authentication except webhooks
 */

import { Router } from 'express';
import { PaymentController } from './PaymentController';

export function createPaymentRoutes(controller: PaymentController): Router {
  const router = Router();

  // Payment Intents
  router.post('/intents', controller.createPaymentIntent.bind(controller));
  router.post('/intents/:intentId/confirm', controller.confirmPaymentIntent.bind(controller));
  router.post('/intents/:intentId/cancel', controller.cancelPaymentIntent.bind(controller));

  // Checkout Sessions
  router.post('/checkout', controller.createCheckoutSession.bind(controller));

  // Subscriptions
  router.get('/subscriptions', controller.getSubscriptions.bind(controller));
  router.post('/subscriptions', controller.createSubscription.bind(controller));
  router.post('/subscriptions/:subscriptionId/cancel', controller.cancelSubscription.bind(controller));

  // Refunds
  router.post('/refunds', controller.createRefund.bind(controller));

  // Transactions
  router.get('/transactions', controller.getTransactions.bind(controller));
  router.get('/transactions/:transactionId', controller.getTransaction.bind(controller));

  // Payment Methods
  router.get('/methods', controller.getPaymentMethods.bind(controller));
  router.post('/methods', controller.attachPaymentMethod.bind(controller));
  router.delete('/methods/:methodId', controller.deletePaymentMethod.bind(controller));

  // Payouts (Wise)
  router.post('/payouts/quote', controller.createPayoutQuote.bind(controller));
  router.post('/payouts/recipients', controller.createPayoutRecipient.bind(controller));
  router.post('/payouts/transfers', controller.createPayoutTransfer.bind(controller));
  router.post('/payouts/transfers/:transferId/fund', controller.fundPayoutTransfer.bind(controller));

  return router;
}

export default createPaymentRoutes;
