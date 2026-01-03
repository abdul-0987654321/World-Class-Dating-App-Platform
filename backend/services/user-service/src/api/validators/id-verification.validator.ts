/**
 * ID Verification Validators
 * Flamoral Dating Platform
 *
 * Validation schemas for ID verification API endpoints.
 */

import { z } from 'zod';

/**
 * Schema for initiating ID verification
 */
export const initiateVerificationSchema = z.object({
  document_type: z.enum(['passport', 'drivers_license', 'national_id'], {
    errorMap: () => ({ message: 'document_type must be one of: passport, drivers_license, national_id' }),
  }),
  country_code: z
    .string()
    .length(3, 'country_code must be exactly 3 characters (ISO 3166-1 alpha-3)')
    .regex(/^[A-Z]{3}$/, 'country_code must be 3 uppercase letters (ISO 3166-1 alpha-3)'),
  redirect_url: z
    .string()
    .url('redirect_url must be a valid URL')
    .optional(),
  locale: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'locale must be in format: en, en-US, fr, etc.')
    .optional(),
  biometric_consent: z.boolean().optional(),
  region_policy_key: z
    .string()
    .regex(/^[A-Z]{2}-[A-Z]{2,3}$/, 'region_policy_key must be in format: US-IL, US-TX, etc.')
    .optional(),
});

export type InitiateVerificationInput = z.infer<typeof initiateVerificationSchema>;

/**
 * Schema for webhook provider parameter
 */
export const webhookProviderSchema = z.object({
  provider: z.enum(['jumio', 'onfido', 'mock'], {
    errorMap: () => ({ message: 'provider must be one of: jumio, onfido, mock' }),
  }),
});

export type WebhookProviderInput = z.infer<typeof webhookProviderSchema>;

/**
 * Schema for verification status query
 */
export const verificationStatusQuerySchema = z.object({
  verification_id: z.string().uuid('verification_id must be a valid UUID').optional(),
});

export type VerificationStatusQueryInput = z.infer<typeof verificationStatusQuerySchema>;

/**
 * Validate initiate verification request
 */
export function validateInitiateVerification(data: unknown): {
  success: boolean;
  data?: InitiateVerificationInput;
  error?: string;
} {
  const result = initiateVerificationSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
  };
}

/**
 * Validate webhook provider
 */
export function validateWebhookProvider(data: unknown): {
  success: boolean;
  data?: WebhookProviderInput;
  error?: string;
} {
  const result = webhookProviderSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
  };
}

/**
 * Validate verification status query
 */
export function validateVerificationStatusQuery(data: unknown): {
  success: boolean;
  data?: VerificationStatusQueryInput;
  error?: string;
} {
  const result = verificationStatusQuerySchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
  };
}

/**
 * Common ISO 3166-1 alpha-3 country codes for reference
 */
export const COMMON_COUNTRY_CODES = [
  'USA', // United States
  'GBR', // United Kingdom
  'CAN', // Canada
  'AUS', // Australia
  'DEU', // Germany
  'FRA', // France
  'ITA', // Italy
  'ESP', // Spain
  'NLD', // Netherlands
  'BEL', // Belgium
  'AUT', // Austria
  'CHE', // Switzerland
  'JPN', // Japan
  'SGP', // Singapore
  'HKG', // Hong Kong
  'MEX', // Mexico
  'BRA', // Brazil
  'ARG', // Argentina
  'IND', // India
  'NZL', // New Zealand
];
