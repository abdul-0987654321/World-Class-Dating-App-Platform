import Joi from 'joi';

export const updatePrivacySettingsSchema = Joi.object({
  incognitoMode: Joi.boolean().optional(),
  incognitoUntil: Joi.date().greater('now').optional().messages({
    'date.greater': 'Incognito expiry time must be in the future',
  }),
  showDistance: Joi.boolean().optional(),
  showLastActive: Joi.boolean().optional(),
  showOnlineStatus: Joi.boolean().optional(),
  showAge: Joi.boolean().optional(),
  profileVisibility: Joi.string().valid('everyone', 'matches_only', 'private').optional().messages({
    'any.only': 'Invalid profile visibility option',
  }),
  hideFromContacts: Joi.boolean().optional(),
  hiddenContactNumbers: Joi.array()
    .items(Joi.string().pattern(/^\+?[1-9]\d{1,14}$/))
    .optional()
    .messages({
      'string.pattern.base': 'Invalid phone number format',
    }),
  readReceiptsEnabled: Joi.boolean().optional(),
  typingIndicatorsEnabled: Joi.boolean().optional(),
  preciseLocation: Joi.boolean().optional(),
  locationRadiusKm: Joi.number().min(0).max(100).optional().messages({
    'number.min': 'Location radius must be at least 0 km',
    'number.max': 'Location radius must not exceed 100 km',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

export const toggleIncognitoSchema = Joi.object({
  enabled: Joi.boolean().required().messages({
    'any.required': 'Enabled status is required',
  }),
  durationHours: Joi.number().integer().min(1).max(168).optional().messages({
    'number.min': 'Duration must be at least 1 hour',
    'number.max': 'Duration must not exceed 168 hours (7 days)',
  }),
});

export const applyPresetSchema = Joi.object({
  preset: Joi.string().valid('public', 'balanced', 'private').required().messages({
    'any.only': 'Preset must be one of: public, balanced, private',
    'any.required': 'Preset is required',
  }),
});
