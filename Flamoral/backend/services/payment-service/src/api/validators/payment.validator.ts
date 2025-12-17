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
    .valid('free', 'basic', 'plus', 'premium', 'premium_plus', 'elite')
    .required()
    .messages({
      'any.only': 'Tier must be one of: free, basic, plus, premium, premium_plus, elite',
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
  billingCycle: Joi.string()
    .valid('monthly', '3_months', '6_months', 'yearly')
    .optional()
    .default('monthly')
    .messages({
      'any.only': 'Billing cycle must be one of: monthly, 3_months, 6_months, yearly',
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

export const createCheckoutSessionSchema = Joi.object({
  customerId: Joi.string().optional(),
  customerEmail: Joi.string().email().optional().messages({
    'string.email': 'Invalid email format',
  }),
  successUrl: Joi.string().uri().required().messages({
    'string.uri': 'Success URL must be a valid URL',
    'any.required': 'Success URL is required',
  }),
  cancelUrl: Joi.string().uri().required().messages({
    'string.uri': 'Cancel URL must be a valid URL',
    'any.required': 'Cancel URL is required',
  }),
  mode: Joi.string()
    .valid('payment', 'subscription', 'setup')
    .required()
    .messages({
      'any.only': 'Mode must be one of: payment, subscription, setup',
      'any.required': 'Mode is required',
    }),
  lineItems: Joi.array().items(Joi.object()).optional(),
  priceId: Joi.string().optional(),
  quantity: Joi.number().integer().min(1).optional().default(1).messages({
    'number.min': 'Quantity must be at least 1',
  }),
  metadata: Joi.object().optional(),
  trialPeriodDays: Joi.number().integer().min(0).max(90).optional().messages({
    'number.min': 'Trial period days must be at least 0',
    'number.max': 'Trial period days must not exceed 90',
  }),
  allowPromotionCodes: Joi.boolean().optional().default(true),
});

export const sessionIdParamsSchema = Joi.object({
  sessionId: Joi.string().required().messages({
    'any.required': 'Session ID is required',
  }),
});

export const createCustomerSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid user ID format',
    'any.required': 'User ID is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  }),
  name: Joi.string().optional().allow(''),
});

export const updateSubscriptionTierSchema = Joi.object({
  subscriptionId: Joi.string().required().messages({
    'any.required': 'Subscription ID is required',
  }),
  newPriceId: Joi.string().required().messages({
    'any.required': 'New price ID is required',
  }),
});
