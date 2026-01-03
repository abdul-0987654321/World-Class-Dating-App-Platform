/**
 * Document Verification Types
 * Flamoral Dating Platform
 *
 * Type definitions for OCR-based document verification using AWS Textract.
 * Supports passport, driver's license, and national ID verification.
 */

// Supported document types for OCR verification
export type DocumentType = 'passport' | 'drivers_license' | 'national_id';

// Document verification status
export type DocumentVerificationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired';

// OCR extraction confidence levels
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'very_low';

// Document authenticity check results
export type AuthenticityResult = 'authentic' | 'suspicious' | 'fraudulent' | 'inconclusive';

// Profile match result
export type ProfileMatchResult = 'match' | 'partial_match' | 'mismatch' | 'unable_to_verify';

/**
 * Extracted document data from OCR
 */
export interface ExtractedDocumentData {
  // Personal information
  firstName?: string;
  lastName?: string;
  middleName?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;

  // Document information
  documentNumber?: string;
  documentType?: DocumentType;
  issuingCountry?: string;
  issuingAuthority?: string;
  issueDate?: string;
  expiryDate?: string;

  // Address (primarily for driver's licenses)
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  // Machine Readable Zone (for passports)
  mrz?: {
    line1?: string;
    line2?: string;
    line3?: string;
    checkDigits?: {
      documentNumber?: boolean;
      dateOfBirth?: boolean;
      expiryDate?: boolean;
      overall?: boolean;
    };
  };

  // Additional fields based on document type
  licenseClass?: string; // For driver's license
  restrictions?: string; // For driver's license
  endorsements?: string; // For driver's license
  personalNumber?: string; // National ID specific

  // Raw OCR text blocks for audit
  rawTextBlocks?: TextBlock[];
}

/**
 * Individual text block from OCR
 */
export interface TextBlock {
  text: string;
  confidence: number;
  boundingBox?: BoundingBox;
  blockType: 'LINE' | 'WORD' | 'KEY_VALUE_SET' | 'TABLE' | 'CELL';
}

/**
 * Bounding box coordinates for OCR elements
 */
export interface BoundingBox {
  width: number;
  height: number;
  left: number;
  top: number;
}

/**
 * Field extraction result with confidence
 */
export interface ExtractedField {
  fieldName: string;
  value: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  boundingBox?: BoundingBox;
  rawText?: string;
}

/**
 * Document data extraction result
 */
export interface DocumentDataResult {
  success: boolean;
  data?: ExtractedDocumentData;
  fields: ExtractedField[];
  overallConfidence: number;
  processingTime: number;
  textractJobId?: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * Document authenticity validation checks
 */
export interface AuthenticityCheck {
  checkType: string;
  passed: boolean;
  confidence: number;
  details?: string;
}

/**
 * Document validation result
 */
export interface DocumentValidationResult {
  isValid: boolean;
  authenticityResult: AuthenticityResult;
  overallConfidence: number;
  checks: AuthenticityCheck[];
  issues: string[];
  warnings: string[];
}

/**
 * Security feature validation
 */
export interface SecurityFeatureCheck {
  feature: string;
  detected: boolean;
  confidence: number;
  expectedLocation?: string;
  details?: string;
}

/**
 * Format consistency check
 */
export interface FormatConsistencyCheck {
  checkName: string;
  passed: boolean;
  expectedFormat?: string;
  actualFormat?: string;
  details?: string;
}

/**
 * User profile for matching
 */
export interface UserProfile {
  userId: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  email?: string;
  phoneNumber?: string;
}

/**
 * Profile match result details
 */
export interface ProfileMatchDetails {
  field: string;
  profileValue?: string;
  documentValue?: string;
  matchScore: number;
  matchResult: ProfileMatchResult;
  details?: string;
}

/**
 * Complete profile matching result
 */
export interface ProfileMatchResultComplete {
  overallResult: ProfileMatchResult;
  overallConfidence: number;
  matchDetails: ProfileMatchDetails[];
  issues: string[];
  warnings: string[];
  verificationScore: number;
}

/**
 * Complete document verification result
 */
export interface DocumentVerificationResult {
  verificationId: string;
  userId: string;
  documentType: DocumentType;
  status: DocumentVerificationStatus;

  // Extraction results
  extractedData?: ExtractedDocumentData;
  extractionConfidence: number;

  // Validation results
  validationResult?: DocumentValidationResult;

  // Profile match results
  profileMatchResult?: ProfileMatchResultComplete;

  // Overall verification
  overallVerificationScore: number;
  isVerified: boolean;
  verificationDecision: 'approved' | 'rejected' | 'manual_review';
  decisionReasons: string[];

  // Audit trail
  processedAt: Date;
  processingDuration: number;
  auditLog: AuditLogEntry[];
}

/**
 * Audit log entry for GDPR compliance
 */
export interface AuditLogEntry {
  timestamp: Date;
  action: string;
  actor: 'system' | 'user' | 'admin';
  details: string;
  dataAccessed?: string[];
  ipAddress?: string;
}

/**
 * Document verification request
 */
export interface DocumentVerificationRequest {
  userId: string;
  documentType: DocumentType;
  documentFront: Buffer;
  documentBack?: Buffer; // Required for driver's license and national ID
  selfieImage?: Buffer; // Optional for face matching
  countryCode: string;
  consentGiven: boolean;
  consentTimestamp: Date;
  clientIpAddress?: string;
}

/**
 * Document verification response
 */
export interface DocumentVerificationResponse {
  success: boolean;
  verificationId?: string;
  status?: DocumentVerificationStatus;
  message?: string;
  error?: string;
  errorCode?: string;
}

/**
 * AWS Textract configuration
 */
export interface TextractConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  maxRetries: number;
  requestTimeout: number;
  s3Bucket?: string; // For async processing of large documents
}

/**
 * Document patterns for different countries
 */
export interface DocumentPattern {
  country: string;
  documentType: DocumentType;
  fieldPatterns: FieldPattern[];
  securityFeatures: string[];
  formatRules: FormatRule[];
}

/**
 * Field pattern for document parsing
 */
export interface FieldPattern {
  fieldName: string;
  patterns: RegExp[];
  required: boolean;
  validator?: (value: string) => boolean;
  transformer?: (value: string) => string;
}

/**
 * Format validation rule
 */
export interface FormatRule {
  ruleName: string;
  fieldName: string;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  customValidator?: (value: string) => boolean;
  errorMessage: string;
}

/**
 * MRZ (Machine Readable Zone) check digit calculation
 */
export interface MRZValidation {
  documentNumberValid: boolean;
  dateOfBirthValid: boolean;
  expiryDateValid: boolean;
  personalNumberValid?: boolean;
  compositeValid: boolean;
  overallValid: boolean;
}

/**
 * Document verification database record
 */
export interface DocumentVerificationRecord {
  id: string;
  userId: string;
  documentType: DocumentType;
  countryCode: string;
  status: DocumentVerificationStatus;

  // Extraction data (encrypted at rest)
  extractedDataEncrypted?: string;
  extractionConfidence?: number;

  // Validation results
  validationResult?: string; // JSON stringified
  authenticityResult?: AuthenticityResult;

  // Match results
  profileMatchResult?: string; // JSON stringified
  profileMatchScore?: number;

  // Verification outcome
  overallScore?: number;
  isVerified: boolean;
  verificationDecision: string;
  decisionReasons?: string; // JSON stringified

  // Processing metadata
  textractJobId?: string;
  processingDurationMs?: number;

  // GDPR compliance
  consentGiven: boolean;
  consentTimestamp: Date;
  dataRetentionExpiresAt: Date;
  gdprExportRequested: boolean;
  gdprDeletionRequested: boolean;

  // Audit
  auditLog?: string; // JSON stringified

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
}

/**
 * GDPR data export format for document verification
 */
export interface DocumentVerificationGDPRExport {
  exportedAt: Date;
  userId: string;
  verifications: Array<{
    verificationId: string;
    documentType: DocumentType;
    status: DocumentVerificationStatus;
    isVerified: boolean;
    createdAt: Date;
    completedAt?: Date;
    // Sensitive data is excluded from export
  }>;
  consentRecords: Array<{
    timestamp: Date;
    consentGiven: boolean;
    purpose: string;
  }>;
}

/**
 * Verification thresholds configuration
 */
export interface VerificationThresholds {
  minimumExtractionConfidence: number;
  minimumFieldConfidence: number;
  minimumProfileMatchScore: number;
  minimumAuthenticityScore: number;
  autoApproveThreshold: number;
  autoRejectThreshold: number;
  manualReviewThreshold: number;
}

/**
 * Default verification thresholds
 */
export const DEFAULT_VERIFICATION_THRESHOLDS: VerificationThresholds = {
  minimumExtractionConfidence: 0.7,
  minimumFieldConfidence: 0.6,
  minimumProfileMatchScore: 0.8,
  minimumAuthenticityScore: 0.85,
  autoApproveThreshold: 0.95,
  autoRejectThreshold: 0.4,
  manualReviewThreshold: 0.7,
};

/**
 * Confidence level thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  high: 0.9,
  medium: 0.7,
  low: 0.5,
  veryLow: 0.3,
};

/**
 * Get confidence level from numeric score
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= CONFIDENCE_THRESHOLDS.high) return 'high';
  if (confidence >= CONFIDENCE_THRESHOLDS.medium) return 'medium';
  if (confidence >= CONFIDENCE_THRESHOLDS.low) return 'low';
  return 'very_low';
}

/**
 * GDPR data retention periods (in days)
 */
export const DATA_RETENTION_PERIODS = {
  verificationData: 365, // 1 year for verification records
  auditLogs: 730, // 2 years for audit logs
  sensitiveData: 30, // 30 days for extracted PII after verification
  failedVerifications: 90, // 90 days for failed attempts
};
