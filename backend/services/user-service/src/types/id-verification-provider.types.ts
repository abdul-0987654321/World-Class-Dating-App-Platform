/**
 * Type definitions for ID Verification Providers (Jumio/Onfido)
 * Flamoral Dating Platform - Professional ID Verification Integration
 */

// Supported ID document types
export type IDDocumentType = 'passport' | 'drivers_license' | 'national_id';

// Supported verification providers
export type VerificationProvider = 'jumio' | 'onfido' | 'mock';

// Provider-agnostic verification status
export type IDVerificationStatus =
  | 'initiated'
  | 'pending'
  | 'processing'
  | 'approved'
  | 'declined'
  | 'expired'
  | 'error';

// Document check results
export type DocumentCheckResult =
  | 'clear'
  | 'consider'
  | 'rejected'
  | 'caution'
  | 'not_performed';

// Face match results
export type FaceMatchResult =
  | 'match'
  | 'no_match'
  | 'not_performed'
  | 'error';

/**
 * Request to initiate ID verification
 */
export interface InitiateIDVerificationRequest {
  user_id: string;
  document_type: IDDocumentType;
  country_code: string; // ISO 3166-1 alpha-3 country code
  redirect_url?: string;
  locale?: string;
  biometric_consent?: boolean;
  region_policy_key?: string;
}

/**
 * Response from initiating ID verification
 */
export interface InitiateIDVerificationResponse {
  success: boolean;
  verification_id?: string;
  provider?: VerificationProvider;
  web_url?: string; // URL for web-based verification flow
  sdk_token?: string; // Token for mobile SDK integration
  expires_at?: Date;
  error?: string;
  error_code?: string;
}

/**
 * Webhook payload from verification provider
 */
export interface ProviderWebhookPayload {
  provider: VerificationProvider;
  event_type: string;
  verification_id: string;
  external_reference_id: string;
  timestamp: Date;
  raw_payload: Record<string, any>;
}

/**
 * Unified verification result from any provider
 */
export interface IDVerificationResult {
  verification_id: string;
  external_reference_id: string;
  provider: VerificationProvider;
  status: IDVerificationStatus;
  document_check: DocumentCheckResult;
  face_match: FaceMatchResult;
  document_type: IDDocumentType;
  document_details?: DocumentDetails;
  extracted_data?: ExtractedIDData;
  confidence_score?: number;
  decline_reasons?: string[];
  warnings?: string[];
  completed_at?: Date;
  raw_response?: Record<string, any>;
}

/**
 * Document details extracted from ID
 */
export interface DocumentDetails {
  document_number?: string;
  issuing_country?: string;
  issuing_state?: string;
  issue_date?: string;
  expiry_date?: string;
  mrz_line1?: string;
  mrz_line2?: string;
  mrz_line3?: string;
}

/**
 * Personal data extracted from ID
 */
export interface ExtractedIDData {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  date_of_birth?: string;
  gender?: string;
  nationality?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

/**
 * Verification status response
 */
export interface IDVerificationStatusResponse {
  verification_id: string;
  user_id: string;
  provider: VerificationProvider;
  status: IDVerificationStatus;
  document_type?: IDDocumentType;
  initiated_at: Date;
  completed_at?: Date;
  expires_at?: Date;
  result?: IDVerificationResult;
}

/**
 * Provider-specific configuration
 */
export interface JumioConfig {
  api_key: string;
  api_secret: string;
  base_url: string;
  workflow_id?: string;
  callback_url: string;
}

export interface OnfidoConfig {
  api_token: string;
  base_url: string;
  webhook_token: string;
  workflow_id?: string;
}

export interface MockProviderConfig {
  default_result: IDVerificationStatus;
  processing_delay_ms: number;
  simulate_errors: boolean;
}

/**
 * ID Verification Provider interface
 * All providers must implement this interface
 */
export interface IIDVerificationProvider {
  readonly name: VerificationProvider;

  /**
   * Initiate an ID verification session
   */
  initiateVerification(request: InitiateIDVerificationRequest): Promise<InitiateIDVerificationResponse>;

  /**
   * Process webhook callback from the provider
   */
  processWebhook(payload: Record<string, any>, headers: Record<string, string>): Promise<IDVerificationResult>;

  /**
   * Get current status of a verification
   */
  getVerificationStatus(verificationId: string): Promise<IDVerificationResult>;

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): boolean;
}

/**
 * Database entity for storing ID verifications
 */
export interface IDVerificationRecord {
  id: string;
  user_id: string;
  request_id: string; // Link to verification_requests table
  provider: VerificationProvider;
  external_reference_id: string;
  document_type: IDDocumentType;
  country_code: string;
  status: IDVerificationStatus;
  document_check_result?: DocumentCheckResult;
  face_match_result?: FaceMatchResult;
  confidence_score?: number;
  document_details?: DocumentDetails;
  extracted_data?: ExtractedIDData;
  decline_reasons?: string[];
  warnings?: string[];
  web_url?: string;
  sdk_token?: string;
  expires_at?: Date;
  initiated_at: Date;
  completed_at?: Date;
  webhook_received_at?: Date;
  raw_response?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * User verification level
 */
export type VerificationLevel = 0 | 1 | 2 | 3;

export interface UserVerificationUpdate {
  verification_level: VerificationLevel;
  is_id_verified: boolean;
  id_verified_at?: Date;
  id_verification_provider?: VerificationProvider;
  id_document_type?: IDDocumentType;
}

/**
 * Verification Level Definitions:
 * Level 0: Unverified (email not confirmed)
 * Level 1: Email Verified
 * Level 2: ID Verified (via Jumio/Onfido)
 * Level 3: Premium Verified (ID + Video Call + Manual Review)
 */
export const VERIFICATION_LEVEL_NAMES: Record<VerificationLevel, string> = {
  0: 'Unverified',
  1: 'Email Verified',
  2: 'ID Verified',
  3: 'Premium Verified',
};
