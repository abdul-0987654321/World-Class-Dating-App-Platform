import Joi from 'joi';
import { MIN_BIO_LENGTH, MAX_BIO_LENGTH, MAX_INTERESTS } from '@flamoral/constants';

export const updateProfileSchema = Joi.object({
  bio: Joi.string().min(MIN_BIO_LENGTH).max(MAX_BIO_LENGTH).optional(),
  orientation: Joi.string().valid('straight', 'gay', 'lesbian', 'bisexual', 'pansexual', 'asexual', 'other').optional(),
  relationshipGoal: Joi.string().valid('casual', 'serious', 'friendship', 'unsure').optional(),
  height: Joi.number().min(120).max(250).optional(),
  education: Joi.string().valid('high-school', 'some-college', 'bachelors', 'masters', 'phd', 'other').optional(),
  occupation: Joi.string().max(100).optional(),
  company: Joi.string().max(100).optional(),
  school: Joi.string().max(100).optional(),
  interests: Joi.array().items(Joi.string().max(50)).max(MAX_INTERESTS).optional(),
  drinking: Joi.string().valid('never', 'rarely', 'socially', 'regularly', 'prefer-not-to-say').optional(),
  smoking: Joi.string().valid('never', 'occasionally', 'regularly', 'prefer-not-to-say').optional(),
  exercise: Joi.string().valid('never', 'rarely', 'sometimes', 'regularly', 'daily').optional(),
  diet: Joi.string().valid('omnivore', 'vegetarian', 'vegan', 'pescatarian', 'other').optional(),
  pets: Joi.string().valid('dog', 'cat', 'both', 'other', 'none').optional(),
  prompts: Joi.array().items(
    Joi.object({
      question: Joi.string().required(),
      answer: Joi.string().max(300).required()
    })
  ).max(3).optional()
});
