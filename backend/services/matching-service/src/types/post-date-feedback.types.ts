/**
 * Post-Date Feedback System Types
 *
 * Types for the post-date feedback feature that collects user feedback
 * after scheduled dates to improve matching algorithm accuracy.
 */

// Enums

export enum ScheduledDateStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled',
}

export enum FeedbackRequestStatus {
  PENDING = 'pending',
  SENT = 'sent',
  OPENED = 'opened',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  EXPIRED = 'expired',
}

export enum WouldDateAgain {
  YES = 'yes',
  MAYBE = 'maybe',
  NO = 'no',
}

export enum NoShowUser {
  ME = 'me',
  PARTNER = 'partner',
  BOTH = 'both',
}

export enum MatchQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

export enum SafetyIssueCategory {
  HARASSMENT = 'harassment',
  INAPPROPRIATE_BEHAVIOR = 'inappropriate_behavior',
  FELT_UNSAFE = 'felt_unsafe',
  MISREPRESENTATION = 'misrepresentation',
  SUBSTANCE_ABUSE = 'substance_abuse',
  VERBAL_ABUSE = 'verbal_abuse',
  PHYSICAL_THREAT = 'physical_threat',
  UNWANTED_CONTACT = 'unwanted_contact',
  BOUNDARY_VIOLATION = 'boundary_violation',
  CATFISHING = 'catfishing',
  OTHER = 'other',
}

export enum SafetyIssueSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum SafetyIssueStatus {
  NEW = 'new',
  UNDER_REVIEW = 'under_review',
  ACTION_TAKEN = 'action_taken',
  DISMISSED = 'dismissed',
  ESCALATED = 'escalated',
}

export enum CompatibilityAccuracy {
  ACCURATE = 'accurate',
  SOMEWHAT_ACCURATE = 'somewhat_accurate',
  INACCURATE = 'inaccurate',
}

// Interfaces

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface ScheduledDate {
  id: string;
  user1Id: string;
  user2Id: string;
  matchId: string;
  scheduledTime: Date;
  locationName?: string;
  locationType?: string;
  locationCoordinates?: LocationCoordinates;
  notes?: string;
  status: ScheduledDateStatus;
  createdBy: string;
  confirmedBy?: string;
  confirmedAt?: Date;
  cancelledBy?: string;
  cancelledAt?: Date;
  cancellationReason?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackRequest {
  id: string;
  scheduledDateId: string;
  userId: string;
  partnerId: string;
  status: FeedbackRequestStatus;
  sendAt: Date;
  sentAt?: Date;
  openedAt?: Date;
  completedAt?: Date;
  expiresAt: Date;
  reminderCount: number;
  lastReminderAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompatibilityFeedback {
  interests?: CompatibilityAccuracy;
  values?: CompatibilityAccuracy;
  lifestyle?: CompatibilityAccuracy;
  communication?: CompatibilityAccuracy;
  goals?: CompatibilityAccuracy;
}

export interface PostDateFeedback {
  id: string;
  feedbackRequestId: string;
  scheduledDateId: string;
  userId: string;
  partnerId: string;
  overallRating: number; // 1-5
  conversationRating: number; // 1-5
  chemistryRating: number; // 1-5
  punctualityRating: number; // 1-5
  appearanceAccuracyRating: number; // 1-5
  respectfulnessRating: number; // 1-5
  wouldDateAgain: WouldDateAgain;
  positiveNotes?: string;
  improvementNotes?: string;
  dateHappened: boolean;
  noShowUser?: NoShowUser;
  hasSafetyConcerns: boolean;
  matchQuality?: MatchQuality;
  compatibilityFeedback?: CompatibilityFeedback;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafetyIssue {
  id: string;
  feedbackId: string;
  reporterId: string;
  reportedUserId: string;
  category: SafetyIssueCategory;
  severity: SafetyIssueSeverity;
  description: string;
  additionalDetails?: Record<string, any>;
  status: SafetyIssueStatus;
  actionNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMatchingWeights {
  id: string;
  userId: string;
  distanceWeight: number;
  interestsWeight: number;
  activityWeight: number;
  preferencesWeight: number;
  conversationImportance: number;
  chemistryImportance: number;
  punctualityImportance: number;
  appearanceAccuracyImportance: number;
  respectfulnessImportance: number;
  totalDates: number;
  successfulDates: number;
  avgRatingReceived?: number;
  dateSuccessRate?: number;
  lastCalculatedAt?: Date;
  feedbackCountAtCalculation: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DateFeedbackSummary {
  id: string;
  userId: string;
  avgOverallRating?: number;
  avgConversationRating?: number;
  avgChemistryRating?: number;
  avgPunctualityRating?: number;
  avgAppearanceAccuracyRating?: number;
  avgRespectfulnessRating?: number;
  wouldDateAgainYesCount: number;
  wouldDateAgainMaybeCount: number;
  wouldDateAgainNoCount: number;
  totalDatesCompleted: number;
  totalFeedbackReceived: number;
  noShowCount: number;
  safetyConcernsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response types

export interface ScheduleDateRequest {
  matchId: string;
  partnerId: string;
  scheduledTime: Date;
  locationName?: string;
  locationType?: string;
  locationCoordinates?: LocationCoordinates;
  notes?: string;
}

export interface SubmitFeedbackRequest {
  overallRating: number;
  conversationRating: number;
  chemistryRating: number;
  punctualityRating: number;
  appearanceAccuracyRating: number;
  respectfulnessRating: number;
  wouldDateAgain: WouldDateAgain;
  positiveNotes?: string;
  improvementNotes?: string;
  dateHappened: boolean;
  noShowUser?: NoShowUser;
  matchQuality?: MatchQuality;
  compatibilityFeedback?: CompatibilityFeedback;
  safetyIssue?: {
    category: SafetyIssueCategory;
    severity: SafetyIssueSeverity;
    description: string;
    additionalDetails?: Record<string, any>;
  };
}

export interface FeedbackStats {
  totalDates: number;
  completedDates: number;
  feedbackProvided: number;
  feedbackPending: number;
  avgRatingGiven: number | null;
  avgRatingReceived: number | null;
  dateSuccessRate: number | null;
  categoryAverages: {
    conversation: number | null;
    chemistry: number | null;
    punctuality: number | null;
    appearanceAccuracy: number | null;
    respectfulness: number | null;
  };
}

export interface DateSuccessRateResponse {
  successRate: number | null;
  totalDates: number;
  successfulDates: number;
  message: string;
}

export interface FeedbackRequestWithDate extends FeedbackRequest {
  scheduledDate: ScheduledDate;
  partnerName?: string;
  partnerPhoto?: string;
}

export interface WeightUpdateResult {
  userId: string;
  previousWeights: Partial<UserMatchingWeights>;
  newWeights: Partial<UserMatchingWeights>;
  feedbackAnalyzed: number;
  significantChanges: string[];
}
