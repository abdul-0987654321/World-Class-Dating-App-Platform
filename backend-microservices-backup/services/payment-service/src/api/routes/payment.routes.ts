import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import express from 'express';
import { validate } from '../middleware/validation.middleware';
import {
  createPaymentIntentSchema,
  purchaseSubscriptionSchema,
  cancelSubscriptionSchema,
  customerIdParamsSchema,
  addPaymentMethodSchema,
  processRefundSchema,
} from '../validators/payment.validator';

const router = Router();
const paymentController = new PaymentController();

router.post('/create-intent', validate(createPaymentIntentSchema), paymentController.createPaymentIntent.bind(paymentController));
router.post('/subscription/create', validate(purchaseSubscriptionSchema), paymentController.purchaseSubscription.bind(paymentController));
router.post('/subscription/cancel', validate(cancelSubscriptionSchema), paymentController.cancelSubscription.bind(paymentController));
router.get('/methods/:customerId', validate(customerIdParamsSchema, 'params'), paymentController.getPaymentMethods.bind(paymentController));
router.post('/methods/add', validate(addPaymentMethodSchema), paymentController.addPaymentMethod.bind(paymentController));
router.post('/refund', validate(processRefundSchema), paymentController.processRefund.bind(paymentController));

// Webhook endpoint - use raw body parser
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook.bind(paymentController)
);

export default router;
