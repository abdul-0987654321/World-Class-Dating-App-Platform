/**
 * Safety, Privacy, and Integrity Models
 * Type definitions for all safety-related database entities
 */

// ============================================
// Identity Verification Models
// ============================================

export type VerificationType =
  | 'government_id'
  | 'selfie'
  | 'liveness'
  | 'video'
  | 'social_media'
  | 'phone'
  | 'email'
  | 'biometric';

export type VerificationStatus = 'pending' | 'in_review' | 'verified' | 'rejected' | 'expired';

export interface IdentityVerification {
  id: string;
  user_id: string;
  type: VerificationType;
  status: VerificationStatus;
  provider?: string;
  provider_reference_id?: string;
  verification_data?: Record<string, any>;
  metadata?: Record<string, any>;
  rejection_reason?: string;
  verified_at?: Date;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export type DocumentType =
  | 'passport'
  | 'drivers_license'
  | 'national_id'
  | 'selfie_photo'
  | 'selfie_video'
  | 'liveness_video'
  | 'proof_of_address';

export interface VerificationDocument {
  id: string;
  verification_id: string;
  document_type: DocumentType;
  storage_path: string;
  file_hash?: string;
  is_processed: boolean;
  ai_analysis?: {
    isAuthentic: boolean;
    confidence: number;
    detectedIssues?: string[];
    faceMatchScore?: number;
    documentQuality?: number;
    extractedData?: Record<string, any>;
  };
  created_at: Date;
  updated_at: Date;
}

export type SocialProvider = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'google' | 'apple';

export interface SocialVerification {
  id: string;
  user_id: string;
  provider: SocialProvider;
  provider_user_id: string;
  provider_username?: string;
  profile_data?: {
    name?: string;
    profileUrl?: string;
    followersCount?: number;
    accountAge?: number; // days
    isVerified?: boolean;
  };
  is_verified: boolean;
  verified_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// Account Security Models
// ============================================

export type TwoFactorMethod = 'sms' | 'authenticator' | 'email' | 'biometric';

export interface UserSecuritySettings {
  id: string;
  user_id: string;
  two_factor_enabled: boolean;
  two_factor_method?: TwoFactorMethod;
  two_factor_secret?: string; // Encrypted
  backup_codes?: string; // Encrypted JSON array
  login_alerts_enabled: boolean;
  new_device_alerts_enabled: boolean;
  suspicious_activity_alerts_enabled: boolean;
  allowed_login_locations?: {
    lat: number;
    lng: number;
    radius: number; // km
    name: string;
  }[];
  trusted_devices?: {
    fingerprint: string;
    name: string;
    addedAt: Date;
    lastUsed: Date;
  }[];
  max_sessions: number;
  created_at: Date;
  updated_at: Date;
}

export type LoginFailureReason =
  | 'invalid_password'
  | 'account_locked'
  | 'account_banned'
  | '2fa_failed'
  | 'suspicious_activity'
  | 'geofence_violation';

export interface LoginAttempt {
  id: string;
  user_id?: string;
  email?: string;
  ip_address: string;
  user_agent?: string;
  device_fingerprint?: string;
  geolocation?: {
    city?: string;
    region?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  was_successful: boolean;
  failure_reason?: LoginFailureReason;
  is_suspicious: boolean;
  created_at: Date;
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export interface ActiveSession {
  id: string;
  user_id: string;
  session_token: string;
  device_fingerprint?: string;
  device_name?: string;
  device_type: DeviceType;
  browser?: string;
  os?: string;
  ip_address?: string;
  geolocation?: {
    city?: string;
    country?: string;
  };
  is_current: boolean;
  last_active_at?: Date;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export type RecoveryMethodType = 'email' | 'phone' | 'security_questions' | 'trusted_contact';

export interface AccountRecoveryMethod {
  id: string;
  user_id: string;
  type: RecoveryMethodType;
  value?: string; // Encrypted
  security_questions?: {
    question: string;
    answerHash: string;
  }[];
  is_verified: boolean;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token_hash: string;
  is_used: boolean;
  expires_at: Date;
  ip_address?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// Data Privacy Models
// ============================================

export type ProfileVisibility = 'public' | 'matches_only' | 'hidden';

export interface UserPrivacySettings {
  id: string;
  user_id: string;
  profile_visibility: ProfileVisibility;
  show_online_status: boolean;
  show_last_active: boolean;
  show_distance: boolean;
  show_age: boolean;
  allow_screenshot: boolean;
  blur_photos_for_non_matches: boolean;
  incognito_mode: boolean;
  hidden_from_users?: string[]; // User IDs
  blocked_contacts?: string[]; // Phone hashes
  data_collection_consent: boolean;
  personalization_consent: boolean;
  marketing_consent: boolean;
  third_party_sharing_consent: boolean;
  created_at: Date;
  updated_at: Date;
}

export type DataExportStatus = 'pending' | 'processing' | 'ready' | 'downloaded' | 'expired' | 'failed';
export type DataExportFormat = 'json' | 'csv' | 'pdf';

export interface DataExportRequest {
  id: string;
  user_id: string;
  status: DataExportStatus;
  format: DataExportFormat;
  download_url?: string;
  download_token_hash?: string;
  ready_at?: Date;
  expires_at?: Date;
  downloaded_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export type DeletionType = 'full_deletion' | 'anonymization' | 'selective';
export type DeletionStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface DataDeletionRequest {
  id: string;
  user_id: string;
  type: DeletionType;
  selective_data?: {
    messages?: boolean;
    photos?: boolean;
    matches?: boolean;
    profile?: boolean;
    activityLogs?: boolean;
  };
  status: DeletionStatus;
  reason?: string;
  scheduled_at?: Date; // 30-day waiting period
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ConsentRecord {
  id: string;
  user_id: string;
  consent_type: string;
  version: string;
  consented: boolean;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// Harassment Prevention Models
// ============================================

export type BlockType = 'full' | 'messages_only' | 'profile_only';

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason?: string;
  block_type: BlockType;
  created_at: Date;
  updated_at: Date;
}

export type ReportCategory =
  | 'harassment'
  | 'spam'
  | 'fake_profile'
  | 'inappropriate_content'
  | 'scam'
  | 'underage'
  | 'threatening_behavior'
  | 'hate_speech'
  | 'sexual_harassment'
  | 'stalking'
  | 'other';

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed' | 'escalated';
export type ReportResolution = 'warning' | 'content_removed' | 'account_suspended' | 'account_banned' | 'no_action';
export type ReportedContentType = 'profile' | 'photo' | 'message' | 'comment';

export interface UserReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  category: ReportCategory;
  description?: string;
  evidence?: {
    screenshots?: string[];
    messageIds?: string[];
    timestamps?: Date[];
  };
  reported_content_id?: string;
  reported_content_type?: ReportedContentType;
  status: ReportStatus;
  resolution?: ReportResolution;
  reviewed_by?: string;
  review_notes?: string;
  reviewed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export type ContentType = 'photo' | 'bio' | 'message' | 'profile' | 'comment';
export type ModerationType = 'auto' | 'manual' | 'appeal';
export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'escalated';

export interface ContentModerationQueueItem {
  id: string;
  user_id: string;
  content_type: ContentType;
  content_id: string;
  moderation_type: ModerationType;
  status: ModerationStatus;
  ai_analysis?: {
    isAppropriate: boolean;
    confidence: number;
    detectedIssues?: string[];
    categories?: {
      nudity?: number;
      violence?: number;
      hate?: number;
      spam?: number;
      scam?: number;
    };
  };
  ai_confidence_score?: number;
  flags?: string[];
  moderator_id?: string;
  moderator_notes?: string;
  reviewed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface MessageFilter {
  id: string;
  user_id: string;
  filter_explicit_content: boolean;
  filter_spam: boolean;
  filter_solicitation: boolean;
  allow_message_requests: boolean;
  require_match_to_message: boolean;
  keyword_filters?: string[];
  created_at: Date;
  updated_at: Date;
}

// ============================================
// Physical Safety Models
// ============================================

export type EmergencyRelationship = 'parent' | 'sibling' | 'friend' | 'spouse' | 'other';

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: EmergencyRelationship;
  is_primary: boolean;
  can_receive_alerts: boolean;
  can_see_location: boolean;
  created_at: Date;
  updated_at: Date;
}

export type SafetyCheckInStatus = 'scheduled' | 'active' | 'completed' | 'missed' | 'emergency';

export interface SafetyCheckIn {
  id: string;
  user_id: string;
  match_id?: string;
  location_name?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  scheduled_time: Date;
  expected_end_time?: Date;
  status: SafetyCheckInStatus;
  notes?: string;
  alert_sent: boolean;
  last_check_in_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export type LocationShareType = 'live' | 'one_time' | 'date_share';

export interface LocationShare {
  id: string;
  user_id: string;
  shared_with_user_id?: string;
  emergency_contact_id?: string;
  current_location?: {
    lat: number;
    lng: number;
    accuracy?: number;
    timestamp?: Date;
  };
  share_type: LocationShareType;
  expires_at?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// Financial Protection Models
// ============================================

export type ScamIndicatorType =
  | 'money_request'
  | 'external_link'
  | 'crypto_mention'
  | 'gift_card_mention'
  | 'wire_transfer_mention'
  | 'rapid_relationship_escalation'
  | 'inconsistent_profile'
  | 'refusal_to_meet'
  | 'sob_story'
  | 'investment_opportunity';

export type ScamIndicatorStatus = 'detected' | 'reviewed' | 'confirmed' | 'false_positive';

export interface ScamIndicator {
  id: string;
  user_id: string;
  indicator_type: ScamIndicatorType;
  content_excerpt?: string;
  message_id?: string;
  confidence_score?: number;
  status: ScamIndicatorStatus;
  created_at: Date;
  updated_at: Date;
}

export type FraudAlertType =
  | 'potential_scam'
  | 'suspicious_profile'
  | 'payment_fraud'
  | 'identity_theft'
  | 'romance_scam';

export interface FraudAlert {
  id: string;
  user_id: string;
  alert_type: FraudAlertType;
  description?: string;
  evidence?: Record<string, any>;
  was_shown_to_user: boolean;
  user_acknowledged: boolean;
  acknowledged_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// Platform Integrity Models
// ============================================

export interface BotDetectionScore {
  id: string;
  user_id: string;
  overall_score: number; // 0-100, higher = more likely bot
  behavioral_signals?: {
    typingSpeed?: number; // chars per minute
    navigationPattern?: string;
    sessionDuration?: number;
    interactionTiming?: number[];
    mouseMovements?: boolean;
  };
  profile_signals?: {
    photoOriginality?: number;
    bioPatternMatch?: number;
    profileCompleteness?: number;
    photoQualityConsistency?: number;
  };
  interaction_signals?: {
    messageResponseTime?: number;
    messageTemplateScore?: number;
    swipePatternEntropy?: number;
    matchConversationRate?: number;
  };
  last_calculated_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export type BehaviorActionType =
  | 'swipe_left'
  | 'swipe_right'
  | 'super_like'
  | 'message_sent'
  | 'photo_viewed'
  | 'profile_viewed'
  | 'profile_edited'
  | 'report_submitted'
  | 'block_added'
  | 'match_unmatched';

export interface UserBehaviorLog {
  id: string;
  user_id: string;
  action_type: BehaviorActionType;
  target_id?: string;
  metadata?: Record<string, any>;
  device_fingerprint?: string;
  ip_address?: string;
  created_at: Date;
}

export type AccountFlagType =
  | 'suspicious_activity'
  | 'multiple_reports'
  | 'bot_behavior'
  | 'spam_behavior'
  | 'scam_behavior'
  | 'ban_evasion'
  | 'fake_profile'
  | 'underage_suspected'
  | 'identity_mismatch';

export type AccountFlagStatus = 'active' | 'resolved' | 'escalated';

export interface AccountFlag {
  id: string;
  user_id: string;
  flag_type: AccountFlagType;
  reason?: string;
  evidence?: Record<string, any>;
  status: AccountFlagStatus;
  created_by?: string;
  resolved_by?: string;
  resolution_notes?: string;
  resolved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export type ModerationActionType =
  | 'warning'
  | 'content_removal'
  | 'temporary_suspension'
  | 'permanent_ban'
  | 'shadow_ban'
  | 'feature_restriction'
  | 'verification_required'
  | 'appeal_approved'
  | 'appeal_denied';

export interface ModerationAction {
  id: string;
  user_id: string;
  moderator_id?: string;
  action_type: ModerationActionType;
  reason?: string;
  related_reports?: string[];
  expires_at?: Date;
  is_active: boolean;
  was_appealed: boolean;
  created_at: Date;
  updated_at: Date;
}

export type AppealStatus = 'pending' | 'under_review' | 'approved' | 'denied';

export interface BanAppeal {
  id: string;
  user_id: string;
  moderation_action_id: string;
  appeal_reason: string;
  supporting_evidence?: Record<string, any>;
  status: AppealStatus;
  reviewed_by?: string;
  review_notes?: string;
  reviewed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// Vulnerable Population Protection Models
// ============================================

export type AgeVerificationMethod = 'id_verification' | 'credit_card' | 'phone' | 'social_media' | 'ai_estimate';

export interface AgeVerificationCheck {
  id: string;
  user_id: string;
  method: AgeVerificationMethod;
  verified_date_of_birth?: Date;
  estimated_age_min?: number;
  estimated_age_max?: number;
  confidence_score?: number;
  passed: boolean;
  verification_details?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export type WellbeingSignalType =
  | 'distress_language'
  | 'self_harm_mention'
  | 'crisis_keywords'
  | 'harassment_victim'
  | 'exploitation_concern'
  | 'isolation_pattern';

export type WellbeingSignalStatus = 'detected' | 'resources_shown' | 'dismissed' | 'reported';

export interface WellbeingSignal {
  id: string;
  user_id: string;
  signal_type: WellbeingSignalType;
  content_excerpt?: string;
  confidence_score?: number;
  status: WellbeingSignalStatus;
  resources_provided: boolean;
  created_at: Date;
  updated_at: Date;
}

export type CrisisResourceType =
  | 'suicide_hotline'
  | 'crisis_text_line'
  | 'domestic_violence'
  | 'sexual_assault'
  | 'mental_health'
  | 'human_trafficking'
  | 'general_helpline';

export interface CrisisResourceShown {
  id: string;
  user_id: string;
  wellbeing_signal_id?: string;
  resource_type: CrisisResourceType;
  resource_country?: string;
  resource_name?: string;
  resource_contact?: string;
  was_clicked: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// Input/Output Types for Services
// ============================================

export interface VerificationSubmission {
  userId: string;
  type: VerificationType;
  documents?: {
    type: DocumentType;
    data: Buffer | string; // Base64 or buffer
    filename: string;
    mimeType: string;
  }[];
  socialProvider?: SocialProvider;
  socialToken?: string;
}

export interface ReportSubmission {
  reporterId: string;
  reportedUserId: string;
  category: ReportCategory;
  description?: string;
  evidence?: {
    screenshots?: string[];
    messageIds?: string[];
  };
  contentId?: string;
  contentType?: ReportedContentType;
}

export interface SafetyCheckInRequest {
  userId: string;
  matchId?: string;
  locationName?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  scheduledTime: Date;
  expectedEndTime?: Date;
  notes?: string;
}

export interface UserVerificationStatus {
  userId: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  governmentIdVerified: boolean;
  selfieVerified: boolean;
  livenessVerified: boolean;
  videoVerified: boolean;
  socialMediaVerified: SocialProvider[];
  overallVerificationLevel: 'none' | 'basic' | 'standard' | 'premium' | 'verified';
  verificationBadges: string[];
}
