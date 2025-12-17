/**
 * IAP Validation Schemas
 */

import Joi from 'joi';

export const validateReceiptSchema = Joi.object({
  provider: Joi.string().valid('apple_iap', 'google_play').required(),
  receipt: Joi.string().required(),
  productId: Joi.string().optional(),
  transactionId: Joi.string().optional(),
  purchaseToken: Joi.string().optional(),
  packageName: Joi.string().optional(),
});

export const restorePurchasesSchema = Joi.object({
  provider: Joi.string().valid('apple_iap', 'google_play').required(),
  receipt: Joi.string().required(),
  packageName: Joi.string().optional(),
});
