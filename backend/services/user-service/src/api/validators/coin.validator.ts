import Joi from 'joi';

export const purchaseCoinsSchema = Joi.object({
  productSku: Joi.string().required().messages({
    'any.required': 'Product SKU is required',
  }),
  stripePaymentId: Joi.string().required().messages({
    'any.required': 'Stripe payment ID is required',
  }),
});

export const spendCoinsSchema = Joi.object({
  amount: Joi.number().integer().min(1).required().messages({
    'number.base': 'Amount must be a number',
    'number.min': 'Amount must be at least 1',
    'any.required': 'Amount is required',
  }),
  reason: Joi.string().min(1).max(255).required().messages({
    'string.min': 'Reason cannot be empty',
    'string.max': 'Reason must not exceed 255 characters',
    'any.required': 'Reason is required',
  }),
  referenceId: Joi.string().optional(),
  referenceType: Joi.string()
    .valid('boost', 'super_like', 'rewind', 'stripe_payment', 'daily_reward', 'achievement', 'refund', 'referral')
    .optional()
    .messages({
      'any.only': 'Invalid reference type',
    }),
});

export const transactionHistoryQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional().default(20).messages({
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 100',
  }),
  offset: Joi.number().integer().min(0).optional().default(0).messages({
    'number.min': 'Offset must be at least 0',
  }),
  type: Joi.string()
    .valid('purchase', 'reward', 'spent', 'refund', 'admin_adjustment')
    .optional()
    .messages({
      'any.only': 'Invalid transaction type',
    }),
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional().messages({
    'date.min': 'End date must be after start date',
  }),
});
