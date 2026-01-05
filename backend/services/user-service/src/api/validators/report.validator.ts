import Joi from 'joi';

export const createReportSchema = Joi.object({
  reportedId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid user ID format',
    'any.required': 'Reported user ID is required',
  }),
  reportType: Joi.string()
    .valid(
      'inappropriate_photos',
      'inappropriate_messages',
      'fake_profile',
      'spam',
      'harassment',
      'underage',
      'scam',
      'violence',
      'hate_speech',
      'other'
    )
    .required()
    .messages({
      'any.only': 'Invalid report type',
      'any.required': 'Report type is required',
    }),
  description: Joi.string().max(1000).optional().messages({
    'string.max': 'Description must not exceed 1000 characters',
  }),
  evidenceUrls: Joi.array().items(Joi.string().uri()).max(5).optional().messages({
    'array.max': 'Maximum 5 evidence URLs allowed',
    'string.uri': 'Invalid URL format',
  }),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').optional().messages({
    'any.only': 'Invalid severity level',
  }),
});

export const resolveReportSchema = Joi.object({
  resolution: Joi.string().min(10).max(1000).required().messages({
    'string.min': 'Resolution must be at least 10 characters',
    'string.max': 'Resolution must not exceed 1000 characters',
    'any.required': 'Resolution is required',
  }),
  actionTaken: Joi.string()
    .valid('none', 'warning_sent', 'content_removed', 'account_suspended', 'account_banned')
    .required()
    .messages({
      'any.only': 'Invalid action type',
      'any.required': 'Action taken is required',
    }),
});

export const reportQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional().default(20).messages({
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 100',
  }),
  offset: Joi.number().integer().min(0).optional().default(0).messages({
    'number.min': 'Offset must be at least 0',
  }),
});

export const moderationQueueQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional().default(50).messages({
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 100',
  }),
});
