import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import express from 'express';
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

const router = Router();
const paymentController = new PaymentController();

// Payment intent routes
router.post(
  '/create-intent',
  validateBody(CreatePaymentIntentDto),
  paymentController.createPaymentIntent.bind(paymentController)
);

// Subscription routes
router.post(
  '/subscription/create',
  validateBody(PurchaseSubscriptionDto),
  paymentController.purchaseSubscription.bind(paymentController)
);

router.post(
  '/subscription/cancel',
  validateBody(CancelSubscriptionDto),
  paymentController.cancelSubscription.bind(paymentController)
);

// Payment methods routes
router.get(
  '/methods/:customerId',
  validateParams(CustomerIdParamDto),
  paymentController.getPaymentMethods.bind(paymentController)
);

router.post(
  '/methods/add',
  validateBody(AddPaymentMethodDto),
  paymentController.addPaymentMethod.bind(paymentController)
);

// Refund routes
router.post(
  '/refund',
  validateBody(ProcessRefundDto),
  paymentController.processRefund.bind(paymentController)
);

// Webhook endpoint - use raw body parser (no DTO validation - Stripe handles this)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook.bind(paymentController)
);

export default router;
