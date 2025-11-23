import Joi from 'joi';
import { PASSWORD_MIN_LENGTH, MIN_AGE } from '@connectsphere/constants';

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(PASSWORD_MIN_LENGTH).required().messages({
    'string.min': `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    'any.required': 'Password is required'
  })
});

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(PASSWORD_MIN_LENGTH).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  dateOfBirth: Joi.date().max('now').required(),
  gender: Joi.string().valid('male', 'female', 'non-binary', 'other').required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional()
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(PASSWORD_MIN_LENGTH).required()
});

export const verifyEmailSchema = Joi.object({
  token: Joi.string().required()
});

export const verifyPhoneSchema = Joi.object({
  code: Joi.string().length(6).required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required()
});
