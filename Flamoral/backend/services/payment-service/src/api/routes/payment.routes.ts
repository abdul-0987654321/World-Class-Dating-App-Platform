import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import express from 'express';
import { validate } from '../middleware/validation.middleware';
import { paymentRateLimit, standardRateLimit } from '../middleware/rate-limit.middleware';
import { asyncHandler } from '../middleware/error-handler.middleware';
import {
  createPaymentIntentSchema,
  purchaseSubscriptionSchema,
  cancelSubscriptionSchema,
  customerIdParamsSchema,
  addPaymentMethodSchema,
  processRefundSchema,
  createCheckoutSessionSchema,
  sessionIdParamsSchema,
  createCustomerSchema,
  updateSubscriptionTierSchema,
} from '../validators/payment.validator';

const router = Router();
const paymentController = new PaymentController();

// Payment intents - with rate limiting
router.post(
  '/create-intent',
  paymentRateLimit,
  validate(createPaymentIntentSchema),
  asyncHandler(paymentController.createPaymentIntent.bind(paymentController))
);

// Subscriptions - with rate limiting
router.post(
  '/subscription/create',
  paymentRateLimit,
  validate(purchaseSubscriptionSchema),
  asyncHandler(paymentController.purchaseSubscription.bind(paymentController))
);

router.post(
  '/subscription/cancel',
  paymentRateLimit,
  validate(cancelSubscriptionSchema),
  asyncHandler(paymentController.cancelSubscription.bind(paymentController))
);

router.post(
  '/subscription/update-tier',
  paymentRateLimit,
  validate(updateSubscriptionTierSchema),
  asyncHandler(paymentController.updateSubscriptionTier.bind(paymentController))
);

// Customers - standard rate limiting
router.post(
  '/customers',
  standardRateLimit,
  validate(createCustomerSchema),
  asyncHandler(paymentController.createCustomer.bind(paymentController))
);

router.get(
  '/customers/:customerId',
  standardRateLimit,
  validate(customerIdParamsSchema, 'params'),
  asyncHandler(paymentController.getCustomer.bind(paymentController))
);

// Payment methods - standard rate limiting
router.get(
  '/methods/:customerId',
  standardRateLimit,
  validate(customerIdParamsSchema, 'params'),
  asyncHandler(paymentController.getPaymentMethods.bind(paymentController))
);

router.post(
  '/methods/add',
  standardRateLimit,
  validate(addPaymentMethodSchema),
  asyncHandler(paymentController.addPaymentMethod.bind(paymentController))
);

// Checkout sessions - with rate limiting
router.post(
  '/checkout/create',
  paymentRateLimit,
  validate(createCheckoutSessionSchema),
  asyncHandler(paymentController.createCheckoutSession.bind(paymentController))
);

router.get(
  '/checkout/:sessionId',
  standardRateLimit,
  validate(sessionIdParamsSchema, 'params'),
  asyncHandler(paymentController.getCheckoutSession.bind(paymentController))
);

// Refunds - with rate limiting
router.post(
  '/refund',
  paymentRateLimit,
  validate(processRefundSchema),
  asyncHandler(paymentController.processRefund.bind(paymentController))
);

// Configuration - no rate limiting
router.get(
  '/config/status',
  asyncHandler(paymentController.getConfigurationStatus.bind(paymentController))
);

// Webhook endpoint - use raw body parser
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook.bind(paymentController)
);

export default router;
