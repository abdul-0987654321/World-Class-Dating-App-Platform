/**
 * Type definitions for Verification Service
 */

// Verification types supported by the system
export type VerificationType =
  | 'email'
  | 'phone'
  | 'id'
  | 'selfie'
  | 'liveness'
  | 'video'
  | 'biometric';

// Verification status state machine
export type VerificationStatus =
  | 'not_started'
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'denied'
  | 'expired';

// Artifact processing status
export type ArtifactProcessingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

// Verification result decision
export type VerificationDecision =
  | 'approved'
  | 'denied'
  | 'needs_review'
  | 'inconclusive';

// DLQ status
export type DlqStatus =
  | 'pending'
  | 'retrying'
  | 'resolved'
  | 'abandoned';

// Region policy keys for biometric consent states
export type BiometricConsentRegion = 'US-IL' | 'US-TX' | 'US-WA';

// Full list of US states that require biometric consent
export const BIOMETRIC_CONSENT_REQUIRED_STATES: BiometricConsentRegion[] = [
  'US-IL', // Illinois - BIPA
  'US-TX', // Texas - CUBI
  'US-WA', // Washington - HB 1493
];

/**
 * Verification Request entity
 */
export interface VerificationRequest {
  request_id: string;
  user_id: string;
  type: VerificationType;
  status: VerificationStatus;
  region_policy_key: string | null;
  biometric_consent_given: boolean;
  biometric_consent_at: Date | null;
  biometric_consent_ip: string | null;
  retry_count: number;
  max_retries: number;
  expires_at: Date | null;
  metadata: Record<string, any> | null;
  external_reference_id: string | null;
  submitted_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Verification Artifact entity
 */
export interface VerificationArtifact {
  artifact_id: string;
  request_id: string;
  media_id: string | null;
  type: string;
  file_url: string | null;
  file_hash: string | null;
  file_size: number | null;
  mime_type: string | null;
  processing_status: ArtifactProcessingStatus;
  processing_error: string | null;
  processed_at: Date | null;
  analysis_result: Record<string, any> | null;
  confidence_score: number | null;
  created_at: Date;
}

/**
 * Verification Result entity
 */
export interface VerificationResult {
  result_id: string;
  request_id: string;
  decision: VerificationDecision;
  reason_code: string | null;
  details: Record<string, any> | null;
  confidence_score: number | null;
  decided_at: Date;
}

/**
 * Verification DLQ entry
 */
export interface VerificationDlqEntry {
  dlq_id: string;
  request_id: string;
  error_message: string;
  error_stack: string | null;
  error_code: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: Date | null;
  last_retry_at: Date | null;
  status: DlqStatus;
  original_payload: Record<string, any> | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Request DTOs
 */
export interface StartVerificationRequest {
  type: VerificationType;
  region_policy_key?: string;
  biometric_consent?: boolean;
  metadata?: Record<string, any>;
}

export interface UploadArtifactRequest {
  request_id: string;
  type: string; // document_front, document_back, selfie, video, etc.
  file: Express.Multer.File;
}

/**
 * Response DTOs
 */
export interface VerificationStatusResponse {
  request_id: string;
  type: VerificationType;
  status: VerificationStatus;
  biometric_consent_required: boolean;
  biometric_consent_given: boolean;
  retry_count: number;
  max_retries: number;
  expires_at: Date | null;
  created_at: Date;
  submitted_at: Date | null;
  completed_at: Date | null;
  artifacts: ArtifactSummary[];
  result: VerificationResultSummary | null;
}

export interface ArtifactSummary {
  artifact_id: string;
  type: string;
  processing_status: ArtifactProcessingStatus;
  created_at: Date;
}

export interface VerificationResultSummary {
  decision: VerificationDecision;
  reason_code: string | null;
  decided_at: Date;
}

export interface StartVerificationResponse {
  success: boolean;
  request_id?: string;
  status?: VerificationStatus;
  biometric_consent_required?: boolean;
  message?: string;
  error?: string;
}

export interface UploadArtifactResponse {
  success: boolean;
  artifact_id?: string;
  message?: string;
  error?: string;
}

/**
 * State machine transitions
 */
export const VALID_STATUS_TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
  'not_started': ['pending'],
  'pending': ['in_review', 'expired'],
  'in_review': ['approved', 'denied', 'pending'], // Can go back to pending for retry
  'approved': [], // Terminal state
  'denied': ['not_started'], // Can restart verification
  'expired': ['not_started'], // Can restart verification
};

/**
 * Reason codes for verification decisions
 */
export enum VerificationReasonCode {
  // Approval reasons
  DOCUMENT_VERIFIED = 'document_verified',
  IDENTITY_CONFIRMED = 'identity_confirmed',
  LIVENESS_PASSED = 'liveness_passed',

  // Denial reasons
  DOCUMENT_EXPIRED = 'document_expired',
  DOCUMENT_INVALID = 'document_invalid',
  DOCUMENT_UNREADABLE = 'document_unreadable',
  FACE_MISMATCH = 'face_mismatch',
  LIVENESS_FAILED = 'liveness_failed',
  SUSPECTED_FRAUD = 'suspected_fraud',
  UNDERAGE = 'underage',
  DUPLICATE_IDENTITY = 'duplicate_identity',

  // Needs review reasons
  LOW_CONFIDENCE = 'low_confidence',
  MANUAL_REVIEW_REQUIRED = 'manual_review_required',
  QUALITY_ISSUE = 'quality_issue',

  // Inconclusive reasons
  PROCESSING_ERROR = 'processing_error',
  TIMEOUT = 'timeout',
  EXTERNAL_SERVICE_ERROR = 'external_service_error',
}

/**
 * Artifact types for different verification flows
 */
export enum ArtifactType {
  // ID verification
  DOCUMENT_FRONT = 'document_front',
  DOCUMENT_BACK = 'document_back',

  // Selfie verification
  SELFIE = 'selfie',
  SELFIE_WITH_ID = 'selfie_with_id',

  // Liveness verification
  LIVENESS_VIDEO = 'liveness_video',
  LIVENESS_FRAME = 'liveness_frame',

  // Video verification
  VIDEO_CALL_RECORDING = 'video_call_recording',
  VIDEO_SNAPSHOT = 'video_snapshot',

  // Biometric
  BIOMETRIC_TEMPLATE = 'biometric_template',
}

/**
 * Configuration for verification types
 */
export interface VerificationTypeConfig {
  type: VerificationType;
  required_artifacts: ArtifactType[];
  expires_after_hours: number;
  max_retries: number;
  requires_biometric_consent: boolean;
  auto_approve_threshold?: number; // Confidence score threshold for auto-approval
}

export const VERIFICATION_TYPE_CONFIGS: Record<VerificationType, VerificationTypeConfig> = {
  email: {
    type: 'email',
    required_artifacts: [],
    expires_after_hours: 24,
    max_retries: 5,
    requires_biometric_consent: false,
  },
  phone: {
    type: 'phone',
    required_artifacts: [],
    expires_after_hours: 1,
    max_retries: 5,
    requires_biometric_consent: false,
  },
  id: {
    type: 'id',
    required_artifacts: [ArtifactType.DOCUMENT_FRONT, ArtifactType.DOCUMENT_BACK],
    expires_after_hours: 72,
    max_retries: 3,
    requires_biometric_consent: false,
    auto_approve_threshold: 0.95,
  },
  selfie: {
    type: 'selfie',
    required_artifacts: [ArtifactType.SELFIE],
    expires_after_hours: 72,
    max_retries: 3,
    requires_biometric_consent: true,
    auto_approve_threshold: 0.90,
  },
  liveness: {
    type: 'liveness',
    required_artifacts: [ArtifactType.LIVENESS_VIDEO],
    expires_after_hours: 24,
    max_retries: 3,
    requires_biometric_consent: true,
    auto_approve_threshold: 0.85,
  },
  video: {
    type: 'video',
    required_artifacts: [ArtifactType.VIDEO_CALL_RECORDING],
    expires_after_hours: 168, // 1 week
    max_retries: 2,
    requires_biometric_consent: true,
  },
  biometric: {
    type: 'biometric',
    required_artifacts: [ArtifactType.BIOMETRIC_TEMPLATE],
    expires_after_hours: 720, // 30 days
    max_retries: 3,
    requires_biometric_consent: true,
    auto_approve_threshold: 0.99,
  },
};
