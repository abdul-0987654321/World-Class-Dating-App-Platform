import Joi from 'joi';

/**
 * Validation schema for applying a referral code
 */
export const applyReferralCodeSchema = Joi.object({
  code: Joi.string()
    .alphanum()
    .length(8)
    .uppercase()
    .required()
    .messages({
      'string.alphanum': 'Referral code must contain only letters and numbers',
      'string.length': 'Referral code must be exactly 8 characters',
      'any.required': 'Referral code is required',
    }),
});

/**
 * Validation schema for validating a referral code
 */
export const validateReferralCodeSchema = Joi.object({
  code: Joi.string()
    .alphanum()
    .length(8)
    .uppercase()
    .required()
    .messages({
      'string.alphanum': 'Referral code must contain only letters and numbers',
      'string.length': 'Referral code must be exactly 8 characters',
      'any.required': 'Referral code is required',
    }),
});
