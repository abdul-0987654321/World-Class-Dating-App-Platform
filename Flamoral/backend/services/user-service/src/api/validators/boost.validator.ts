import Joi from 'joi';

export const purchaseBoostSchema = Joi.object({
  productSku: Joi.string().required().messages({
    'any.required': 'Product SKU is required',
  }),
});

export const boostHistoryQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional().default(20).messages({
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 100',
  }),
});
