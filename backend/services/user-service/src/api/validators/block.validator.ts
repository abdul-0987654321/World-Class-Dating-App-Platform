import Joi from 'joi';

export const blockUserSchema = Joi.object({
  reason: Joi.string().max(500).optional().messages({
    'string.max': 'Reason must not exceed 500 characters',
  }),
});

export const blockUserParamsSchema = Joi.object({
  blockedId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid user ID format',
    'any.required': 'Blocked user ID is required',
  }),
});

export const checkBlockedParamsSchema = Joi.object({
  targetUserId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid user ID format',
    'any.required': 'Target user ID is required',
  }),
});
