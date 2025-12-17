import Joi from 'joi';

export const updateTierSchema = Joi.object({
  tier: Joi.string()
    .valid('free', 'basic', 'plus', 'premium', 'premium_plus', 'elite')
    .required()
    .messages({
      'any.only': 'Tier must be one of: free, basic, plus, premium, premium_plus, elite',
      'any.required': 'Tier is required',
    }),
});

export const cancelSubscriptionSchema = Joi.object({
  immediately: Joi.boolean().optional().default(false),
});

export const checkFeatureAccessSchema = Joi.object({
  featureKey: Joi.string()
    .valid(
      'daily_swipes_limit',
      'daily_likes_limit',
      'daily_super_likes_limit',
      'rewind_cooldown_hours',
      'see_who_liked_you',
      'advanced_filters',
      'read_receipts',
      'incognito_mode',
      'priority_likes',
      'message_before_match',
      'travel_mode',
      'monthly_boosts',
      'priority_support',
      'ad_free',
      'profile_verification_priority',
      'exclusive_badges'
    )
    .required()
    .messages({
      'any.only': 'Invalid feature key',
      'any.required': 'Feature key is required',
    }),
});
