import express, { Router } from 'express';

import {
  validateBody,
  validateParams,
  CreatePaymentIntentDto,
  PurchaseSubscriptionDto,
  CancelSubscriptionDto,
  AddPaymentMethodDto,
  ProcessRefundDto,
  CustomerIdParamDto,
} from '../../dto';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const paymentController = new PaymentController();

// Payment intent routes - REQUIRES AUTHENTICATION
router.post(
  '/create-intent',
  authenticate,
  validateBody(CreatePaymentIntentDto),
  paymentController.createPaymentIntent.bind(paymentController)
);

// Subscription routes - REQUIRES AUTHENTICATION
router.post(
  '/subscription/create',
  authenticate,
  validateBody(PurchaseSubscriptionDto),
  paymentController.purchaseSubscription.bind(paymentController)
);

router.post(
  '/subscription/cancel',
  authenticate,
  validateBody(CancelSubscriptionDto),
  paymentController.cancelSubscription.bind(paymentController)
);

// Payment methods routes - REQUIRES AUTHENTICATION
router.get(
  '/methods/:customerId',
  authenticate,
  validateParams(CustomerIdParamDto),
  paymentController.getPaymentMethods.bind(paymentController)
);

router.post(
  '/methods/add',
  authenticate,
  validateBody(AddPaymentMethodDto),
  paymentController.addPaymentMethod.bind(paymentController)
);

// Refund routes - REQUIRES AUTHENTICATION
router.post(
  '/refund',
  authenticate,
  validateBody(ProcessRefundDto),
  paymentController.processRefund.bind(paymentController)
);

// Webhook endpoint - NO AUTHENTICATION (Stripe validates via signature)
// Uses raw body parser for Stripe signature verification
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook.bind(paymentController)
);

export default router;
