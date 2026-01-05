import Joi from 'joi';

// Update user interest badges
export const updateUserInterestBadgesSchema = Joi.object({
  badge_ids: Joi.array().items(Joi.string().uuid()).min(0).max(20).required().messages({
    'array.base': 'badge_ids must be an array',
    'array.min': 'You must select at least 0 badges',
    'array.max': 'You can select a maximum of 20 interest badges',
    'any.required': 'badge_ids is required',
  }),
});

// Update user intention badges
export const updateUserIntentionBadgesSchema = Joi.object({
  badges: Joi.array()
    .items(
      Joi.object({
        badge_id: Joi.string().uuid().required(),
        priority: Joi.number().integer().valid(1, 2).required(),
      })
    )
    .min(0)
    .max(2)
    .required()
    .messages({
      'array.base': 'badges must be an array',
      'array.min': 'You can select 0-2 intention badges',
      'array.max': 'You can select a maximum of 2 intention badges',
      'any.required': 'badges is required',
    }),
});

// Add individual interest badge
export const addInterestBadgeSchema = Joi.object({
  badge_id: Joi.string().uuid().required().messages({
    'string.base': 'badge_id must be a string',
    'string.uuid': 'badge_id must be a valid UUID',
    'any.required': 'badge_id is required',
  }),
});

// Add individual intention badge
export const addIntentionBadgeSchema = Joi.object({
  badge_id: Joi.string().uuid().required().messages({
    'string.base': 'badge_id must be a string',
    'string.uuid': 'badge_id must be a valid UUID',
    'any.required': 'badge_id is required',
  }),
  priority: Joi.number().integer().valid(1, 2).required().messages({
    'number.base': 'priority must be a number',
    'any.only': 'priority must be either 1 or 2',
    'any.required': 'priority is required',
  }),
});

// UUID param validation
export const uuidParamSchema = Joi.object({
  badgeId: Joi.string().uuid().required(),
  userId: Joi.string().uuid().optional(),
});

// Category param validation
export const categoryParamSchema = Joi.object({
  category: Joi.string()
    .valid(
      'lifestyle',
      'sports_fitness',
      'arts_culture',
      'food_drink',
      'entertainment',
      'outdoor',
      'social',
      'tech',
      'other'
    )
    .required(),
});
