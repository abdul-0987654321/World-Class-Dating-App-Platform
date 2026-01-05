import Joi from 'joi';

/**
 * Validation schema for searching venues
 */
export const searchVenuesSchema = Joi.object({
  location: Joi.string().required().min(2).max(200).messages({
    'string.empty': 'Location is required',
    'string.min': 'Location must be at least 2 characters',
    'any.required': 'Location is required',
  }),
  type: Joi.string().valid('restaurant', 'bar', 'activity', 'entertainment').optional().messages({
    'any.only': 'Type must be one of: restaurant, bar, activity, entertainment',
  }),
  budget: Joi.string().valid('budget', 'moderate', 'upscale', 'luxury').optional().messages({
    'any.only': 'Budget must be one of: budget, moderate, upscale, luxury',
  }),
  keyword: Joi.string().max(100).optional(),
});

/**
 * Validation schema for date preferences (AI suggestions)
 */
export const datePreferencesSchema = Joi.object({
  budget: Joi.string().valid('budget', 'moderate', 'upscale', 'luxury', 'any').optional(),
  mood: Joi.string()
    .valid('romantic', 'adventurous', 'casual', 'luxurious', 'cultural', 'fun')
    .optional(),
  venueTypes: Joi.array()
    .items(Joi.string().valid('restaurant', 'bar', 'activity', 'entertainment'))
    .optional(),
  cuisinePreferences: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  activityPreferences: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  timeOfDay: Joi.string().valid('morning', 'afternoon', 'evening', 'night').optional(),
  duration: Joi.string().valid('short', 'medium', 'long').optional(),
  location: Joi.string().max(200).optional(),
  specialOccasion: Joi.string().max(100).optional(),
});

/**
 * Validation schema for creating a date plan
 */
export const createDatePlanSchema = Joi.object({
  matchId: Joi.string().uuid().required().messages({
    'string.guid': 'Match ID must be a valid UUID',
    'any.required': 'Match ID is required',
  }),
  title: Joi.string().required().min(3).max(100).messages({
    'string.empty': 'Title is required',
    'string.min': 'Title must be at least 3 characters',
    'string.max': 'Title must be at most 100 characters',
    'any.required': 'Title is required',
  }),
  description: Joi.string().max(500).optional().allow(''),
  date: Joi.string().isoDate().required().messages({
    'string.isoDate': 'Date must be a valid ISO date string',
    'any.required': 'Date is required',
  }),
  venues: Joi.array()
    .items(
      Joi.object({
        venueId: Joi.string().required(),
        order: Joi.number().integer().min(0).required(),
        timeSlot: Joi.string().max(20).optional(),
        notes: Joi.string().max(200).optional(),
      })
    )
    .min(0)
    .max(10)
    .optional()
    .default([]),
  estimatedBudget: Joi.number().positive().max(10000).optional(),
});

/**
 * Validation schema for updating a date plan
 */
export const updateDatePlanSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(500).optional().allow(''),
  date: Joi.string().isoDate().optional(),
  venues: Joi.array()
    .items(
      Joi.object({
        venueId: Joi.string().required(),
        order: Joi.number().integer().min(0).required(),
        timeSlot: Joi.string().max(20).optional(),
        notes: Joi.string().max(200).optional(),
      })
    )
    .min(0)
    .max(10)
    .optional(),
  estimatedBudget: Joi.number().positive().max(10000).optional(),
  status: Joi.string().valid('draft', 'confirmed', 'cancelled').optional(),
});

/**
 * Validation schema for completing a date plan
 */
export const completeDatePlanSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number',
    'number.integer': 'Rating must be a whole number',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating must be at most 5',
    'any.required': 'Rating is required',
  }),
  notes: Joi.string().max(500).optional().allow(''),
  wouldRecommend: Joi.boolean().optional(),
});

/**
 * Validation schema for path parameter ID
 */
export const datePlanIdSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Date plan ID must be a valid UUID',
    'any.required': 'Date plan ID is required',
  }),
});

/**
 * Validation schema for query params when listing date plans
 */
export const listDatePlansSchema = Joi.object({
  status: Joi.string().valid('draft', 'confirmed', 'completed', 'cancelled').optional(),
});

/**
 * Validation schema for AI suggestions query
 */
export const suggestionsQuerySchema = Joi.object({
  matchId: Joi.string().uuid().required().messages({
    'string.guid': 'Match ID must be a valid UUID',
    'any.required': 'Match ID is required',
  }),
});
