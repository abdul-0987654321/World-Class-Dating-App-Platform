/**
 * Type definitions for Content Moderation Service
 */

export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged', // Needs manual review
  REVIEWING = 'reviewing', // Under manual review
}

export enum ContentType {
  IMAGE = 'image',
  TEXT = 'text',
  VIDEO = 'video',
  PROFILE = 'profile',
  MESSAGE = 'message',
  BIO = 'bio',
}

export enum ViolationType {
  EXPLICIT_NUDITY = 'explicit_nudity',
  SUGGESTIVE_NUDITY = 'suggestive_nudity',
  VIOLENCE = 'violence',
  HATE_SPEECH = 'hate_speech',
  HARASSMENT = 'harassment',
  DRUGS = 'drugs',
  ALCOHOL = 'alcohol',
  TOBACCO = 'tobacco',
  GAMBLING = 'gambling',
  PROFANITY = 'profanity',
  SPAM = 'spam',
  SEXUAL_CONTENT = 'sexual_content',
  DISTURBING_CONTENT = 'disturbing_content',
  ILLEGAL_ACTIVITY = 'illegal_activity',
  FAKE_PROFILE = 'fake_profile',
  UNDERAGE = 'underage',
  OTHER = 'other',
}

export enum ModerationAction {
  AUTO_APPROVED = 'auto_approved',
  AUTO_REJECTED = 'auto_rejected',
  AUTO_FLAGGED = 'auto_flagged',
  MANUAL_APPROVED = 'manual_approved',
  MANUAL_REJECTED = 'manual_rejected',
  USER_WARNED = 'user_warned',
  USER_SUSPENDED = 'user_suspended',
  USER_BANNED = 'user_banned',
  CONTENT_REMOVED = 'content_removed',
}

export enum UserModerationStatus {
  ACTIVE = 'active',
  WARNED = 'warned',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

// Image Moderation Result from AWS Rekognition
export interface ImageModerationResult {
  moderationLabels: {
    name: string;
    confidence: number;
    parentName?: string;
  }[];
  categories: {
    [category: string]: number; // category -> confidence score
  };
  overallRiskScore: number; // 0.0 - 1.0
  detectedViolations: ViolationType[];
  recommendations: string[];
}

// Text Moderation Result from Azure Content Moderator
export interface TextModerationResult {
  profanityScore: number;
  sexuallyScore: number;
  offensiveScore: number;
  detectedProfanity: string[];
  detectedLanguage: string;
  overallRiskScore: number; // 0.0 - 1.0
  detectedViolations: ViolationType[];
  recommendations: string[];
}

// Combined Moderation Result
export interface ModerationResult {
  contentId: string;
  contentType: ContentType;
  userId: string;
  status: ModerationStatus;
  action: ModerationAction;
  overallRiskScore: number;
  imageModerationResult?: ImageModerationResult;
  textModerationResult?: TextModerationResult;
  detectedViolations: ViolationType[];
  recommendations: string[];
  moderatedAt: Date;
  moderatedBy?: string; // moderator userId for manual reviews
  notes?: string;
}

// Moderation Log Entry (Database Record)
export interface ModerationLog {
  id: string;
  contentId: string;
  contentType: ContentType;
  contentUrl?: string;
  contentText?: string;
  userId: string;
  status: ModerationStatus;
  action: ModerationAction;
  riskScore: number;
  violations: ViolationType[];
  imageModerationData?: any; // JSON
  textModerationData?: any; // JSON
  recommendations: string[];
  moderatedAt: Date;
  moderatedBy?: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// User Violation Record
export interface UserViolation {
  id: string;
  userId: string;
  moderationLogId: string;
  violationType: ViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  contentId: string;
  contentType: ContentType;
  action: ModerationAction;
  notes?: string;
  createdAt: Date;
}

// User Moderation Record (Aggregated)
export interface UserModerationRecord {
  userId: string;
  status: UserModerationStatus;
  totalViolations: number;
  severeViolations: number;
  lastViolationAt?: Date;
  warningsIssued: number;
  suspensionCount: number;
  currentSuspensionEndsAt?: Date;
  permanentlyBanned: boolean;
  bannedAt?: Date;
  bannedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Moderation Queue Item
export interface ModerationQueueItem {
  id: string;
  contentId: string;
  contentType: ContentType;
  contentUrl?: string;
  contentText?: string;
  userId: string;
  userName?: string;
  userPhoto?: string;
  riskScore: number;
  violations: ViolationType[];
  status: ModerationStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  flaggedAt: Date;
  assignedTo?: string;
  assignedAt?: Date;
}

// API Request/Response Types
export interface ModerateImageRequest {
  contentId: string;
  imageUrl: string;
  userId: string;
  contentType?: ContentType;
}

export interface ModerateTextRequest {
  contentId: string;
  text: string;
  userId: string;
  contentType?: ContentType;
}

export interface ModerationResponse {
  success: boolean;
  result?: ModerationResult;
  error?: string;
}

export interface GetQueueRequest {
  status?: ModerationStatus;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  limit?: number;
  offset?: number;
}

export interface ReviewContentRequest {
  moderationLogId: string;
  action: 'approve' | 'reject';
  notes?: string;
  moderatorId: string;
}

export interface ReviewContentResponse {
  success: boolean;
  moderationLog?: ModerationLog;
  error?: string;
}

export interface UserModerationStatsRequest {
  userId: string;
}

export interface UserModerationStatsResponse {
  userId: string;
  status: UserModerationStatus;
  totalViolations: number;
  violationsByType: { [key in ViolationType]?: number };
  recentViolations: UserViolation[];
  activeSuspension?: {
    endsAt: Date;
    reason: string;
  };
  permanentlyBanned: boolean;
}

// AWS Rekognition Types
export interface RekognitionModerationLabel {
  Name: string;
  Confidence: number;
  ParentName?: string;
}

// Azure Content Moderator Types
export interface AzureTextModerationResponse {
  Classification: {
    Category1: { Score: number };
    Category2: { Score: number };
    Category3: { Score: number };
    ReviewRecommended: boolean;
  };
  Language: string;
  Terms: Array<{
    Index: number;
    OriginalIndex: number;
    ListId: number;
    Term: string;
  }> | null;
  Status: {
    Code: number;
    Description: string;
    Exception: string | null;
  };
  TrackingId: string;
}
