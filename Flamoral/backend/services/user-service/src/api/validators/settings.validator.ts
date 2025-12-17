import Joi from 'joi';

/**
 * Validation schemas for user settings
 */

// Account settings validation
export const updateAccountSettingsSchema = Joi.object({
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().allow(''),
  currentPassword: Joi.string().when('newPassword', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  newPassword: Joi.string().min(8).optional(),
});

// Privacy settings validation
export const updatePrivacySettingsSchema = Joi.object({
  showOnlineStatus: Joi.boolean().optional(),
  showDistance: Joi.boolean().optional(),
  showAge: Joi.boolean().optional(),
  readReceipts: Joi.boolean().optional(),
  incognitoMode: Joi.boolean().optional(),
  onlyMatchedUsersCanMessage: Joi.boolean().optional(),
});

// Notification settings validation
export const updateNotificationSettingsSchema = Joi.object({
  pushNotifications: Joi.boolean().optional(),
  emailNotifications: Joi.boolean().optional(),
  smsNotifications: Joi.boolean().optional(),
  newMatches: Joi.boolean().optional(),
  newMessages: Joi.boolean().optional(),
  likes: Joi.boolean().optional(),
  superLikes: Joi.boolean().optional(),
  promotions: Joi.boolean().optional(),
});

// Match preferences validation
export const updateMatchPreferencesSchema = Joi.object({
  interestedIn: Joi.array().items(Joi.string().valid('men', 'women', 'everyone')).optional(),
  minAge: Joi.number().min(18).max(100).optional(),
  maxAge: Joi.number().min(18).max(100).optional(),
  maxDistance: Joi.number().min(1).max(500).optional(),
}).custom((value, helpers) => {
  // Ensure minAge <= maxAge if both are provided
  if (value.minAge !== undefined && value.maxAge !== undefined) {
    if (value.minAge > value.maxAge) {
      return helpers.error('any.invalid', { message: 'minAge must be less than or equal to maxAge' });
    }
  }
  return value;
});

// Account deletion validation
export const deleteAccountSchema = Joi.object({
  password: Joi.string().required(),
  reason: Joi.string().required().min(1).max(500),
  feedback: Joi.string().optional().max(1000).allow(''),
});
