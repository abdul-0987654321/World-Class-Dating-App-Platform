/**
 * Document Verification Validators
 * Flamoral Dating Platform
 *
 * Request validation for document verification endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Valid document types
 */
const VALID_DOCUMENT_TYPES = ['passport', 'drivers_license', 'national_id'];

/**
 * Valid ISO 3166-1 alpha-3 country codes (subset of commonly supported)
 */
const VALID_COUNTRY_CODES = [
  'USA',
  'GBR',
  'CAN',
  'AUS',
  'DEU',
  'FRA',
  'ITA',
  'ESP',
  'NLD',
  'BEL',
  'CHE',
  'AUT',
  'JPN',
  'SGP',
  'HKG',
  'MEX',
  'BRA',
  'ARG',
  'IND',
  'CHN',
  'KOR',
  'NZL',
  'IRL',
  'PRT',
  'POL',
  'CZE',
  'DNK',
  'NOR',
  'SWE',
  'FIN',
  'GRC',
  'TUR',
  'RUS',
  'UKR',
  'ZAF',
  'EGY',
  'ARE',
  'SAU',
  'ISR',
  'THA',
  'MYS',
  'IDN',
  'PHL',
  'VNM',
  'TWN',
  'PAK',
  'BGD',
  'LKA',
  'NPL',
  'MMR',
  'KHM',
  'LAO',
  'MNG',
  'KAZ',
  'UZB',
  'AZE',
];

/**
 * Schema for document verification request body
 */
export const documentVerificationSchema = Joi.object({
  document_type: Joi.string()
    .valid(...VALID_DOCUMENT_TYPES)
    .required()
    .messages({
      'any.only': 'document_type must be one of: passport, drivers_license, national_id',
      'any.required': 'document_type is required',
    }),

  country_code: Joi.string()
    .length(3)
    .uppercase()
    .pattern(/^[A-Z]{3}$/)
    .required()
    .messages({
      'string.length': 'country_code must be exactly 3 characters',
      'string.pattern.base':
        'country_code must be a valid ISO 3166-1 alpha-3 code (3 uppercase letters)',
      'any.required': 'country_code is required',
    }),

  consent_given: Joi.alternatives()
    .try(Joi.boolean().valid(true), Joi.string().valid('true'))
    .required()
    .messages({
      'any.only': 'consent_given must be true',
      'any.required': 'User consent is required for document verification',
    }),
});

/**
 * Schema for verification status query
 */
export const verificationStatusQuerySchema = Joi.object({
  verification_id: Joi.string().uuid().optional().messages({
    'string.guid': 'verification_id must be a valid UUID',
  }),
});

/**
 * Schema for verification score params
 */
export const verificationScoreParamsSchema = Joi.object({
  verification_id: Joi.string().uuid().required().messages({
    'string.guid': 'verification_id must be a valid UUID',
    'any.required': 'verification_id is required',
  }),
});

/**
 * Schema for GDPR deletion request
 */
export const gdprDeletionSchema = Joi.object({
  confirm_deletion: Joi.boolean().valid(true).required().messages({
    'any.only': 'confirm_deletion must be true to proceed with deletion',
    'any.required': 'Please confirm deletion by setting confirm_deletion to true',
  }),
});

/**
 * Middleware to validate document verification request
 */
export const validateDocumentVerification = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = documentVerificationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: messages,
    });
  }

  // Validate that country code is in supported list (warning, not error)
  if (!VALID_COUNTRY_CODES.includes(value.country_code)) {
    // Log warning but allow request - Textract supports many countries
    console.warn(`Country code ${value.country_code} not in recommended list`);
  }

  req.body = value;
  next();
};

/**
 * Middleware to validate status query
 */
export const validateStatusQuery = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = verificationStatusQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: messages,
    });
  }

  req.query = value;
  next();
};

/**
 * Middleware to validate score params
 */
export const validateScoreParams = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = verificationScoreParamsSchema.validate(req.params, {
    abortEarly: false,
  });

  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: messages,
    });
  }

  req.params = value;
  next();
};

/**
 * Middleware to validate GDPR deletion request
 */
export const validateGDPRDeletion = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = gdprDeletionSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: messages,
    });
  }

  req.body = value;
  next();
};

/**
 * Validate file uploads
 */
export const validateFileUploads = (
  documentType: string,
  files: { [fieldname: string]: Express.Multer.File[] } | undefined
): { valid: boolean; error?: string } => {
  if (!files) {
    return { valid: false, error: 'No files uploaded' };
  }

  if (!files.document_front || files.document_front.length === 0) {
    return { valid: false, error: 'document_front is required' };
  }

  // Back is required for driver's license and national ID
  if (['drivers_license', 'national_id'].includes(documentType)) {
    if (!files.document_back || files.document_back.length === 0) {
      return {
        valid: false,
        error: "document_back is required for driver's license and national ID",
      };
    }
  }

  // Validate file types
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  for (const [fieldName, fieldFiles] of Object.entries(files)) {
    for (const file of fieldFiles) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return {
          valid: false,
          error: `${fieldName} must be a JPEG, PNG, or WebP image`,
        };
      }
      if (file.size > maxFileSize) {
        return {
          valid: false,
          error: `${fieldName} file size must not exceed 10MB`,
        };
      }
    }
  }

  return { valid: true };
};
