/**
 * Trust Service Types
 * Types for trust scoring, reputation, and behavioral signals
 */

// ============================================================================
// Trust Score
// ============================================================================

export interface TrustScore {
  userId: string;
  overallScore: number;
  level: TrustLevel;
  badge: TrustBadge | null;
  components: TrustComponents;
  signals: TrustSignal[];
  history: TrustHistoryEntry[];
  lastUpdated: string;
  createdAt: string;
}

export type TrustLevel = 'new' | 'building' | 'established' | 'trusted' | 'highly_trusted';

export type TrustBadge =
  | 'verified_identity'
  | 'verified_photos'
  | 'trusted_member'
  | 'community_champion'
  | 'long_standing_member';

export interface TrustComponents {
  verification: VerificationComponent;
  behavioral: BehavioralComponent;
  community: CommunityComponent;
  accountAge: AccountAgeComponent;
  activity: ActivityComponent;
}

// ============================================================================
// Trust Components
// ============================================================================

export interface VerificationComponent {
  score: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  photoVerified: boolean;
  idVerified: boolean;
  socialLinked: string[];
}

export interface BehavioralComponent {
  score: number;
  responseRate: number;
  averageResponseTimeMinutes: number;
  conversationCompletionRate: number;
  ghostingIncidents: number;
  reportedCount: number;
  positiveInteractions: number;
}

export interface CommunityComponent {
  score: number;
  ratingsReceived: number;
  averageRating: number;
  endorsementsReceived: number;
  feedbackGiven: number;
  communityContributions: number;
}

export interface AccountAgeComponent {
  score: number;
  accountAgeDays: number;
  consistentActivityDays: number;
  profileCompleteness: number;
}

export interface ActivityComponent {
  score: number;
  lastActiveAt: string;
  avgSessionsPerWeek: number;
  authenticInteractionCount: number;
  reportsMade: number;
  helpfulReports: number;
}

// ============================================================================
// Trust Signals
// ============================================================================

export type SignalType =
  | 'verification_completed'
  | 'positive_rating'
  | 'negative_rating'
  | 'report_received'
  | 'ghosting_detected'
  | 'respectful_exit'
  | 'helpful_report'
  | 'community_contribution'
  | 'endorsement_received'
  | 'long_conversation'
  | 'successful_date'
  | 'account_milestone';

export interface TrustSignal {
  id: string;
  userId: string;
  type: SignalType;
  impact: number; // -100 to +100
  source: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  expiresAt?: string;
}

export interface TrustHistoryEntry {
  score: number;
  level: TrustLevel;
  timestamp: string;
  changeReason?: string;
}

// ============================================================================
// Ratings & Endorsements
// ============================================================================

export interface UserRating {
  id: string;
  fromUserId: string;
  toUserId: string;
  conversationId?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  categories: RatingCategory[];
  comment?: string;
  isAnonymous: boolean;
  createdAt: string;
}

export type RatingCategory =
  | 'respectful'
  | 'authentic'
  | 'good_communicator'
  | 'honest'
  | 'punctual'
  | 'kind'
  | 'interesting'
  | 'made_uncomfortable'
  | 'misleading_profile'
  | 'inappropriate_behavior';

export interface Endorsement {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: EndorsementType;
  message?: string;
  createdAt: string;
}

export type EndorsementType =
  | 'great_conversation'
  | 'genuine_person'
  | 'respectful'
  | 'fun_date'
  | 'recommended';

// ============================================================================
// Trust Profile (Public-facing)
// ============================================================================

export interface TrustProfile {
  userId: string;
  level: TrustLevel;
  badges: TrustBadge[];
  verificationStatus: {
    email: boolean;
    phone: boolean;
    photo: boolean;
    identity: boolean;
  };
  memberSince: string;
  communityStats: {
    positiveRatings: number;
    endorsements: number;
  };
  highlights: TrustHighlight[];
}

export interface TrustHighlight {
  type: string;
  label: string;
  iconEmoji: string;
}

// ============================================================================
// Trust Warnings & Actions
// ============================================================================

export interface TrustWarning {
  id: string;
  userId: string;
  type: WarningType;
  severity: 'low' | 'medium' | 'high';
  message: string;
  actionRequired?: string;
  resolvedAt?: string;
  createdAt: string;
}

export type WarningType =
  | 'low_response_rate'
  | 'ghosting_pattern'
  | 'multiple_reports'
  | 'suspicious_activity'
  | 'incomplete_profile'
  | 'inactive_account';

export interface TrustAction {
  type: 'restrict' | 'warn' | 'boost' | 'badge_award' | 'badge_revoke';
  reason: string;
  duration?: number; // in hours
  metadata?: Record<string, unknown>;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface RecordSignalRequest {
  userId: string;
  type: SignalType;
  impact?: number;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface SubmitRatingRequest {
  toUserId: string;
  conversationId?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  categories: RatingCategory[];
  comment?: string;
  isAnonymous?: boolean;
}

export interface GiveEndorsementRequest {
  toUserId: string;
  type: EndorsementType;
  message?: string;
}

export interface CheckTrustRequest {
  targetUserId: string;
}

export interface TrustCheckResult {
  canInteract: boolean;
  trustLevel: TrustLevel;
  warnings: string[];
  recommendations: string[];
}
