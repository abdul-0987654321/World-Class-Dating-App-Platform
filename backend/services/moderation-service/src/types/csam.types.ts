/**
 * Type definitions for CSAM Detection System
 */

// ============================================================================
// CSAM Detection Types
// ============================================================================

export enum CSAMDetectionStatus {
  CLEAN = 'clean',
  DETECTED = 'detected',
  PENDING = 'pending',
  ERROR = 'error',
}

export enum CSAMSeverityLevel {
  UNKNOWN = 'unknown',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface CSAMDetectionResult {
  detectionId: string;
  contentId: string;
  userId: string;
  status: CSAMDetectionStatus;
  isCSAM: boolean;
  confidenceScore: number; // 0.0 - 1.0
  severity: CSAMSeverityLevel;
  photoDNAHash: string | null;
  perceptualHash: string | null;
  ncmecMatch: boolean;
  ncmecHashId?: string;
  internalMatch: boolean;
  cloudMatch: boolean;
  matchSource: string; // 'ncmec', 'internal', 'photodna_cloud', or comma-separated
  detectionMethod: string;
  detectedAt: Date;
  processingTimeMs: number;
  error?: string;
}

export interface CSAMDetectionLog {
  id: string;
  content_id: string;
  user_id: string;
  status: CSAMDetectionStatus;
  is_csam: boolean;
  confidence_score: number;
  severity: CSAMSeverityLevel;
  photodna_hash: string | null;
  perceptual_hash: string | null;
  ncmec_match: boolean;
  ncmec_hash_id?: string;
  internal_match: boolean;
  cloud_match: boolean;
  match_source: string;
  detection_method: string;
  content_url: string;
  content_type: string;
  processing_time_ms: number;
  detected_at: Date;
  error_message?: string;
  created_at: Date;
}

// ============================================================================
// PhotoDNA Types
// ============================================================================

export interface PhotoDNAResponse {
  hash: string;
  confidence: number;
  method: string;
  details?: any;
  error?: string;
}

// ============================================================================
// Quarantine Types
// ============================================================================

export enum QuarantineStatus {
  QUARANTINED = 'quarantined',
  PENDING_REVIEW = 'pending_review',
  RELEASED = 'released',
  TRANSFERRED = 'transferred', // To law enforcement
}

export enum LegalHoldStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  RELEASED = 'released',
  EXPIRED = 'expired',
}

export interface ContentQuarantineRecord {
  id: string;
  detection_id: string | null;
  content_id: string;
  user_id: string;
  content_type: string;
  original_url: string;
  storage_location: string | null;
  evidence_hash: string | null;
  photodna_hash: string | null;
  perceptual_hash: string | null;
  status: QuarantineStatus;
  legal_hold_status: LegalHoldStatus;
  legal_hold_applied_at: Date | null;
  legal_hold_expires_at: Date | null;
  confidence_score: number;
  detection_method: string;
  match_source: string;
  access_restricted: boolean;
  access_log: any[];
  chain_of_custody: ChainOfCustodyEntry[];
  quarantined_at: Date;
  released_at?: Date;
  released_by?: string;
  release_justification?: string;
  approval_documentation?: string;
  review_required?: boolean;
  review_reason?: string;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ChainOfCustodyEntry {
  action: string;
  timestamp: Date;
  actor: string;
  details: string | any;
}

// ============================================================================
// NCMEC Reporting Types
// ============================================================================

export enum NCMECReportStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  ACKNOWLEDGED = 'acknowledged',
  FAILED = 'failed',
  RETRY_SCHEDULED = 'retry_scheduled',
}

export interface NCMECReport {
  id: string;
  detection_id: string;
  content_id: string;
  user_id: string;
  quarantine_id: string;
  status: NCMECReportStatus;
  confidence_score: number;
  photodna_hash: string | null;
  perceptual_hash: string | null;
  match_source: string;
  user_info: any;
  incident_details: any;
  esp_id: string;
  esp_name: string;
  ncmec_report_id?: string;
  ncmec_reference_number?: string;
  ncmec_response?: any;
  report_created_at: Date;
  submitted_at?: Date;
  acknowledged_at?: Date;
  retry_count?: number;
  next_retry_at?: Date;
  last_error_at?: Date;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface NCMECReportRequest {
  reportingESP: {
    espId: string;
    espName: string;
    contactEmail: string;
    contactPhone: string;
  };
  incidentSummary: {
    incidentType: string;
    incidentDateTime: Date;
    reportedContent: {
      contentType: string;
      contentId: string;
      photoDNAHash: string | null;
      contentUrl: string;
      confidenceScore: number;
    };
  };
  reporter: {
    userId: string;
    username: string;
    email: string;
    ipAddress: string;
    registrationDate: Date;
    lastActiveDate: Date;
    accountStatus: string;
  };
  additionalInformation: {
    detectionMethod: string;
    matchSource: string;
    quarantineId: string;
    internalReportId: string;
  };
}

export interface NCMECReportResponse {
  success: boolean;
  ncmecReportId: string;
  referenceNumber: string;
  submittedAt: Date;
  status: string;
  message?: string;
}

// ============================================================================
// Audit Types
// ============================================================================

export enum AuditEventType {
  CSAM_DETECTED = 'csam_detected',
  CSAM_SCAN_CLEAN = 'csam_scan_clean',
  CSAM_INCIDENT = 'csam_incident',
  CONTENT_QUARANTINED = 'content_quarantined',
  LEGAL_HOLD_APPLIED = 'legal_hold_applied',
  LEGAL_HOLD_RELEASED = 'legal_hold_released',
  NCMEC_REPORT_SUBMITTED = 'ncmec_report_submitted',
  NCMEC_REPORT_FAILED = 'ncmec_report_failed',
  LAW_ENFORCEMENT_ACCESS = 'law_enforcement_access',
  USER_ACCOUNT_ACTION = 'user_account_action',
  ADMIN_ACTION = 'admin_action',
  SYSTEM_ERROR = 'system_error',
  DETECTION_FAILURE = 'detection_failure',
}

export enum AuditSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  ERROR = 'error',
}

export interface CSAMAuditLog {
  id: string;
  event_type: AuditEventType;
  severity: AuditSeverity;
  detection_id: string | null;
  content_id: string | null;
  user_id: string | null;
  actor: string; // User, system, admin, or officer ID
  event_data: any;
  sensitive_data: boolean;
  signature: string; // Cryptographic signature for tamper detection
  timestamp: Date;
  created_at: Date;
}

// ============================================================================
// Notification Types
// ============================================================================

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  SLACK = 'slack',
  TEAMS = 'teams',
  PAGERDUTY = 'pagerduty',
  IN_APP = 'in_app',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface StaffNotification {
  id: string;
  detection_id: string;
  content_id: string;
  user_id: string;
  quarantine_id: string;
  notification_type: string;
  severity: CSAMSeverityLevel;
  priority: NotificationPriority;
  message: any;
  channels_sent: string[];
  channel_results: any;
  sent_at: Date;
  acknowledged_at?: Date;
  acknowledged_by?: string;
  created_at: Date;
}

// ============================================================================
// Hash Database Types
// ============================================================================

export interface CSAMKnownHash {
  id: string;
  hash: string; // PhotoDNA or SHA-256 hash
  perceptual_hash?: string;
  source: 'ncmec' | 'internal' | 'iwf' | 'interpol' | 'other';
  confidence: number;
  detection_count: number;
  first_detected_at: Date;
  last_detected_at: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Law Enforcement Access Types
// ============================================================================

export interface LawEnforcementAccess {
  id: string;
  quarantine_id: string;
  access_token: string;
  officer_id: string;
  agency: string;
  case_number: string;
  warrant_number?: string;
  granted_at: Date;
  expires_at: Date;
  last_accessed_at?: Date;
  access_count: number;
  revoked: boolean;
  revoked_at?: Date;
  revoked_reason?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface CSAMStatistics {
  timeRange: 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  totalScans: number;
  totalDetections: number;
  detectionRate: number;
  averageConfidence: number;
  averageProcessingTime: number;
  ncmecReportsSubmitted: number;
  contentQuarantined: number;
  usersAffected: number;
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  matchSourceBreakdown: {
    ncmec: number;
    internal: number;
    cloud: number;
  };
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface CSAMConfig {
  detectionEnabled: boolean;
  photoDNA: {
    endpoint: string;
    apiKey: string;
  };
  ncmec: {
    endpoint: string;
    apiKey: string;
    espId: string;
    espName: string;
    contactEmail: string;
    contactPhone: string;
    reportingEnabled: boolean;
  };
  quarantine: {
    storagePath: string;
    encryptionKey: string;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    slackEnabled: boolean;
    pagerDutyEnabled: boolean;
    slackWebhook: string;
    pagerDutyKey: string;
    emergencyEmails: string[];
    emergencyPhones: string[];
  };
  thresholds: {
    autoQuarantineThreshold: number;
    ncmecReportingThreshold: number;
    perceptualHashSimilarityThreshold: number;
  };
  lawEnforcementPortalUrl: string;
}
