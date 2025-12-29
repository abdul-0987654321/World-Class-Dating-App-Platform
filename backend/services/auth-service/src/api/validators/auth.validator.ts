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
 * Accepts both snake_case and camelCase field names
 */
const consentSchema = Joi.object({
  terms: Joi.boolean()
    .valid(true)
    .messages({
      'any.only': 'You must accept the Terms of Service to register',
    }),
  terms_accepted: Joi.boolean()
    .valid(true)
    .messages({
      'any.only': 'You must accept the Terms of Service to register',
    }),
  privacy: Joi.boolean()
    .valid(true)
    .messages({
      'any.only': 'You must accept the Privacy Policy to register',
    }),
  privacy_accepted: Joi.boolean()
    .valid(true)
    .messages({
      'any.only': 'You must accept the Privacy Policy to register',
    }),
  marketing: Joi.boolean()
    .optional()
    .default(false),
  marketing_emails: Joi.boolean()
    .optional()
    .default(false),
  data_sharing: Joi.boolean()
    .optional()
    .default(false),
}).or('terms', 'terms_accepted').or('privacy', 'privacy_accepted').required().messages({
  'any.required': 'Consent information is required for registration',
  'object.missing': 'Terms and Privacy acceptance are required',
});

/**
 * Registration request validation schema
 * SECURITY: Enforces age >= 18 and required consents at validation layer
 * Accepts both snake_case and camelCase field names for flexibility
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
  // Accept both first_name and firstName
  first_name: Joi.string()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name must not exceed 50 characters',
    }),
  firstName: Joi.string()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name must not exceed 50 characters',
    }),
  // Accept both last_name and lastName
  last_name: Joi.string()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name must not exceed 50 characters',
    }),
  lastName: Joi.string()
    .max(50)
    .optional()
    .messages({
      'string.max': 'Last name must not exceed 50 characters',
    }),
  // Accept both date_of_birth and dateOfBirth
  date_of_birth: Joi.date()
    .max('now')
    .custom(ageValidation)
    .messages({
      'date.max': 'Date of birth cannot be in the future',
      'date.minAge': 'You must be at least 18 years old to register',
    }),
  dateOfBirth: Joi.date()
    .max('now')
    .custom(ageValidation)
    .messages({
      'date.max': 'Date of birth cannot be in the future',
      'date.minAge': 'You must be at least 18 years old to register',
    }),
  gender: Joi.string()
    .valid('male', 'female', 'non-binary', 'non_binary', 'other', 'prefer_not_to_say')
    .required()
    .messages({
      'any.only': 'Gender must be one of: male, female, non-binary, other, prefer_not_to_say',
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
}).or('first_name', 'firstName').or('date_of_birth', 'dateOfBirth');

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

// ==================== Two-Factor Authentication (2FA) Validation Schemas ====================

/**
 * 2FA setup request validation schema
 * SECURITY: Password is required to initiate 2FA setup
 */
export const setup2FASchema = Joi.object({
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required to setup 2FA',
    }),
});

/**
 * 2FA verification request validation schema
 */
export const verify2FASchema = Joi.object({
  token: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.length': 'Verification code must be 6 digits',
      'string.pattern.base': 'Verification code must contain only digits',
      'any.required': 'Verification code is required',
    }),
  tempSecret: Joi.string()
    .optional(),
});

/**
 * 2FA disable request validation schema
 * SECURITY: Both password and 2FA token/backup code are required
 */
export const disable2FASchema = Joi.object({
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required to disable 2FA',
    }),
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Verification code or backup code is required to disable 2FA',
    }),
});

/**
 * 2FA login validation request schema
 */
export const validate2FASchema = Joi.object({
  userId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid user ID format',
      'any.required': 'User ID is required',
    }),
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Verification code is required',
    }),
});

/**
 * Backup codes regeneration request validation schema
 * SECURITY: Password is required to regenerate backup codes
 */
export const regenerateBackupCodesSchema = Joi.object({
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required to regenerate backup codes',
    }),
});
