import Joi from 'joi';

const VALID_GENDERS = ['male', 'female', 'non-binary', 'other'];
const VALID_SHOW_ME = ['men', 'women', 'everyone'];

export const updatePreferencesSchema = Joi.object({
  age_min: Joi.number().min(18).max(100).optional(),
  age_max: Joi.number().min(18).max(100).optional(),
  distance_max: Joi.number().min(1).max(500).optional(),
  genders: Joi.array().items(Joi.string().valid(...VALID_GENDERS)).optional(),
  show_me: Joi.string().valid(...VALID_SHOW_ME).optional(),
}).custom((value, helpers) => {
  // Ensure age_min <= age_max if both are provided
  if (value.age_min !== undefined && value.age_max !== undefined) {
    if (value.age_min > value.age_max) {
      return helpers.error('any.invalid', { message: 'age_min must be less than or equal to age_max' });
    }
  }
  return value;
});
