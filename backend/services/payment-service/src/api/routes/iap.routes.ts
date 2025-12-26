/**
 * In-App Purchase Routes
 * Handles Apple and Google Play purchase validation endpoints
 * 
 * SECURITY: All IAP routes require JWT authentication.
 * User identity is extracted from the verified JWT token,
 * not from request body, to prevent impersonation attacks.
 */

import { Router } from 'express';
import { IAPController } from '../controllers/iap.controller';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import {
  validateReceiptSchema,
  restorePurchasesSchema,
} from '../validators/iap.validator';

const router = Router();
const iapController = new IAPController();

// SECURITY: Apply authentication to all IAP routes
router.use(authenticate);

// Validate IAP receipt (Apple or Google Play)
router.post(
  '/validate',
  validate(validateReceiptSchema),
  iapController.validateReceipt.bind(iapController)
);

// Restore purchases
router.post(
  '/restore',
  validate(restorePurchasesSchema),
  iapController.restorePurchases.bind(iapController)
);

// Get subscription status
router.get(
  '/subscription',
  iapController.getSubscriptionStatus.bind(iapController)
);

// Get transaction history
router.get(
  '/transactions',
  iapController.getTransactionHistory.bind(iapController)
);

// Get wallet balance
router.get(
  '/wallet',
  iapController.getWallet.bind(iapController)
);

export default router;
