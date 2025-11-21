import Joi from 'joi';

export const createPaymentIntentSchema = Joi.object({
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Amount must be a positive number',
    'any.required': 'Amount is required',
  }),
  currency: Joi.string().length(3).optional().default('usd').messages({
    'string.length': 'Currency must be a 3-letter code',
  }),
  customerId: Joi.string().required().messages({
    'any.required': 'Customer ID is required',
  }),
  metadata: Joi.object().optional(),
});

export const purchaseSubscriptionSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid user ID format',
    'any.required': 'User ID is required',
  }),
  tier: Joi.string()
    .valid('basic', 'mid', 'ultra')
    .required()
    .messages({
      'any.only': 'Tier must be one of: basic, mid, ultra',
      'any.required': 'Tier is required',
    }),
  priceId: Joi.string().required().messages({
    'any.required': 'Price ID is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  }),
  paymentMethodId: Joi.string().required().messages({
    'any.required': 'Payment method ID is required',
  }),
  trialDays: Joi.number().integer().min(0).max(90).optional().messages({
    'number.min': 'Trial days must be at least 0',
    'number.max': 'Trial days must not exceed 90',
  }),
});

export const cancelSubscriptionSchema = Joi.object({
  subscriptionId: Joi.string().required().messages({
    'any.required': 'Subscription ID is required',
  }),
  immediately: Joi.boolean().optional().default(false),
});

export const addPaymentMethodSchema = Joi.object({
  customerId: Joi.string().required().messages({
    'any.required': 'Customer ID is required',
  }),
  paymentMethodId: Joi.string().required().messages({
    'any.required': 'Payment method ID is required',
  }),
});

export const processRefundSchema = Joi.object({
  paymentIntentId: Joi.string().required().messages({
    'any.required': 'Payment intent ID is required',
  }),
  amount: Joi.number().positive().optional().messages({
    'number.positive': 'Amount must be a positive number',
  }),
  reason: Joi.string()
    .valid('duplicate', 'fraudulent', 'requested_by_customer')
    .optional()
    .messages({
      'any.only': 'Invalid refund reason',
    }),
});

export const customerIdParamsSchema = Joi.object({
  customerId: Joi.string().required().messages({
    'any.required': 'Customer ID is required',
  }),
});
