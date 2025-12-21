import Joi from 'joi';

/**
 * Custom validation for age >= 18
 */
const ageValidation = (value: Date, helpers: Joi.CustomHelpers) => {
  const today = new Date();
  const birthDate = new Date(value);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 18) {
    return helpers.error('date.minAge');
  }

  return value;
};

/**
 * Consent schema - REQUIRED for registration
 * Both terms and privacy must be explicitly accepted
 */
const consentSchema = Joi.object({
  terms: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must accept the Terms of Service to register',
      'any.required': 'Terms of Service acceptance is required',
    }),
  privacy: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must accept the Privacy Policy to register',
      'any.required': 'Privacy Policy acceptance is required',
    }),
  marketing: Joi.boolean()
    .optional()
    .default(false),
  data_sharing: Joi.boolean()
    .optional()
    .default(false),
}).required().messages({
  'any.required': 'Consent information is required for registration',
});

/**
 * Registration request validation schema
 * SECURITY: Enforces age >= 18 and required consents at validation layer
 */
export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
      'any.required': 'Password is required',
    }),
  first_name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name must not exceed 50 characters',
      'any.required': 'First name is required',
    }),
  last_name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name must not exceed 50 characters',
      'any.required': 'Last name is required',
    }),
  date_of_birth: Joi.date()
    .max('now')
    .required()
    .custom(ageValidation)
    .messages({
      'date.max': 'Date of birth cannot be in the future',
      'any.required': 'Date of birth is required',
      'date.minAge': 'You must be at least 18 years old to register',
    }),
  gender: Joi.string()
    .valid('male', 'female', 'non-binary', 'other')
    .required()
    .messages({
      'any.only': 'Gender must be one of: male, female, non-binary, other',
      'any.required': 'Gender is required',
    }),
  phone_number: Joi.string()
    .pattern(/^\+?[1-9]\d{6,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
    }),
  // SECURITY: Required consents for legal compliance
  consents: consentSchema,
});

/**
 * Login request validation schema
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
});

/**
 * Refresh token request validation schema
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required',
    }),
});

/**
 * Email verification request validation schema
 */
export const verifyEmailSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Verification token is required',
    }),
});

/**
 * Password reset request validation schema
 */
export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
});

/**
 * Reset password validation schema
 */
export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required',
    }),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
      'any.required': 'New password is required',
    }),
});

/**
 * Resend verification email validation schema
 */
export const resendVerificationSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
});
