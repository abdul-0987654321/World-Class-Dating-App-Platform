/**
 * Challenge Validators
 * Joi schemas for challenge-related request validation
 */

import Joi from 'joi';

/**
 * Schema for getting challenges with optional type filter
 */
export const getChallengesQuerySchema = Joi.object({
  type: Joi.string()
    .valid('daily', 'weekly', 'monthly', 'special_event', 'limited_time')
    .optional()
    .messages({
      'any.only': 'Type must be one of: daily, weekly, monthly, special_event, limited_time',
    }),
});

/**
 * Schema for challenge ID in params
 */
export const challengeIdParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid challenge ID format',
    'any.required': 'Challenge ID is required',
  }),
});

/**
 * Schema for updating challenge progress (internal API)
 */
export const updateProgressSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid user ID format',
    'any.required': 'User ID is required',
  }),
  actionType: Joi.string()
    .valid('swipe', 'message', 'match', 'login', 'profile_update', 'photo_upload', 'refer_friend', 'verify_photo')
    .required()
    .messages({
      'any.only': 'Invalid action type',
      'any.required': 'Action type is required',
    }),
  challengeId: Joi.string().uuid().optional().messages({
    'string.guid': 'Invalid challenge ID format',
  }),
  progressIncrement: Joi.number().integer().min(1).optional().default(1).messages({
    'number.min': 'Progress increment must be at least 1',
  }),
  metadata: Joi.object().optional(),
});

/**
 * Schema for starting a challenge
 */
export const startChallengeSchema = Joi.object({
  // No body required, challenge ID comes from params
});

/**
 * Schema for claiming a reward
 */
export const claimRewardSchema = Joi.object({
  // No body required, challenge ID comes from params
});
