/**
 * Wellness Service Types
 * Types for dating wellness tracking, readiness assessment, and mental health monitoring
 */

// ============================================================================
// Wellness Metrics Types
// ============================================================================

export interface WellnessMetrics {
  userId: string;
  date: string;

  // Usage patterns
  sessionCount: number;
  totalMinutesUsed: number;
  swipeCount: number;
  messagesSent: number;
  messagesReceived: number;
  matchesReceived: number;
  rejectionsReceived: number;

  // Engagement quality
  averageConversationDepth: number; // 0-100
  meaningfulConversations: number;
  ghostedConversations: number;

  // Emotional indicators
  moodBeforeSession: MoodLevel | null;
  moodAfterSession: MoodLevel | null;
  reportedAnxiety: number | null; // 0-10
  reportedFrustration: number | null; // 0-10

  // Computed scores
  overallWellnessScore: number; // 0-100
  usageHealthScore: number; // 0-100
  emotionalImpactScore: number; // 0-100
  engagementQualityScore: number; // 0-100
}

export type MoodLevel = 'very_low' | 'low' | 'neutral' | 'good' | 'excellent';

export interface WellnessTrend {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;

  averageWellnessScore: number;
  wellnessScoreTrend: 'improving' | 'stable' | 'declining';
  trendPercentage: number;

  usagePatternInsights: UsageInsight[];
  emotionalPatternInsights: EmotionalInsight[];
  recommendations: WellnessRecommendation[];
}

export interface UsageInsight {
  type: 'healthy' | 'warning' | 'concern';
  category: 'time' | 'frequency' | 'pattern';
  message: string;
  metric: string;
  value: number;
  threshold: number;
}

export interface EmotionalInsight {
  type: 'positive' | 'neutral' | 'negative';
  category: 'mood' | 'anxiety' | 'frustration' | 'confidence';
  message: string;
  correlatedWith: string[];
}

export interface WellnessRecommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: RecommendationType;
  title: string;
  description: string;
  actionItems: string[];
  expectedBenefit: string;
}

export type RecommendationType =
  | 'take_break'
  | 'reduce_usage'
  | 'change_approach'
  | 'seek_support'
  | 'celebrate_progress'
  | 'adjust_expectations'
  | 'try_new_strategy'
  | 'focus_on_quality';

// ============================================================================
// Relationship Readiness Types
// ============================================================================

export interface ReadinessAssessment {
  id: string;
  userId: string;
  completedAt: string;
  expiresAt: string;

  // Individual dimension scores (0-100)
  emotionalAvailability: number;
  timeAvailability: number;
  previousRelationshipRecovery: number;
  communicationReadiness: number;
  intentionalityScore: number;
  selfAwarenessScore: number;

  // Computed overall score
  overallReadinessScore: number; // 0-100
  readinessLevel: ReadinessLevel;

  // Analysis
  strengths: string[];
  growthAreas: string[];
  blockers: ReadinessBlocker[];
  recommendations: ReadinessRecommendation[];

  // Suggested approach
  suggestedDatingMode: SuggestedDatingMode;
  suggestedPace: 'slow' | 'moderate' | 'ready';
}

export type ReadinessLevel =
  | 'not_ready' // 0-30
  | 'developing' // 31-50
  | 'approaching' // 51-70
  | 'ready' // 71-85
  | 'highly_ready'; // 86-100

export interface ReadinessBlocker {
  dimension: string;
  severity: 'minor' | 'moderate' | 'significant';
  description: string;
  suggestedAction: string;
}

export interface ReadinessRecommendation {
  category: string;
  title: string;
  description: string;
  resources: string[];
  timeframe: string;
}

export type SuggestedDatingMode =
  | 'pause_and_reflect' // Not ready - take a break
  | 'casual_exploration' // Low readiness - explore without pressure
  | 'intentional_dating' // Moderate readiness - date with purpose
  | 'relationship_focused'; // High readiness - actively seeking relationship

export interface ReadinessQuestion {
  id: string;
  dimension: string;
  questionText: string;
  questionType: 'scale' | 'multiple_choice' | 'boolean';
  options?: ReadinessOption[];
  weight: number;
}

export interface ReadinessOption {
  value: number;
  label: string;
  description?: string;
}

export interface ReadinessAnswers {
  [questionId: string]: number | boolean | string;
}

// ============================================================================
// Break & Sabbatical Types
// ============================================================================

export interface DatingSabbatical {
  id: string;
  userId: string;
  startedAt: string;
  plannedEndDate: string;
  actualEndDate: string | null;

  status: SabbaticalStatus;
  reason: SabbaticalReason;
  customReason: string | null;

  // Pre-break state preservation
  matchConversations: number;
  activeMatches: string[];

  // Break activities
  reflectionExercises: ReflectionExercise[];
  completedExercises: string[];

  // Return planning
  returnCommitment: string | null;
  returnGoals: string[];

  // Effectiveness tracking
  preBreakWellnessScore: number;
  postBreakWellnessScore: number | null;
}

export type SabbaticalStatus = 'active' | 'completed' | 'extended' | 'ended_early';

export type SabbaticalReason =
  | 'burnout'
  | 'mental_health'
  | 'life_circumstances'
  | 'relationship_found'
  | 'reassessment'
  | 'other';

export interface ReflectionExercise {
  id: string;
  title: string;
  description: string;
  prompts: string[];
  estimatedMinutes: number;
  category: 'self_discovery' | 'values' | 'goals' | 'patterns' | 'healing';
}

// ============================================================================
// Rejection Recovery Types
// ============================================================================

export interface RejectionEvent {
  id: string;
  userId: string;
  occurredAt: string;
  type: RejectionType;

  // Context
  conversationLength: number; // messages
  conversationDuration: number; // hours
  emotionalInvestment: 'low' | 'medium' | 'high';

  // Recovery tracking
  recoveryStatus: RecoveryStatus;
  recoveryStartedAt: string | null;
  recoveryCompletedAt: string | null;

  // Support provided
  supportMessageShown: boolean;
  supportMessageId: string | null;
  userFeedback: 'helpful' | 'not_helpful' | null;
}

export type RejectionType =
  | 'unmatch'
  | 'ghosted'
  | 'explicit_rejection'
  | 'date_cancelled'
  | 'no_response';

export type RecoveryStatus = 'processing' | 'recovering' | 'recovered' | 'needs_support';

export interface RejectionRecoverySupport {
  id: string;
  type: RejectionType;
  severity: 'mild' | 'moderate' | 'significant';

  // Support content
  primaryMessage: string;
  perspective: string;
  normalizations: string[];
  actionSuggestions: string[];

  // Optional resources
  resources: SupportResource[];
}

export interface SupportResource {
  type: 'article' | 'exercise' | 'hotline' | 'professional';
  title: string;
  description: string;
  url?: string;
  phone?: string;
}

// ============================================================================
// Heart Health Monitor Types (Dashboard)
// ============================================================================

export interface HeartHealthDashboard {
  userId: string;
  generatedAt: string;

  // Overall status
  overallStatus: HealthStatus;
  statusMessage: string;

  // Key metrics
  currentWellnessScore: number;
  wellnessTrend: 'improving' | 'stable' | 'declining';
  streakDays: number; // healthy usage days

  // Detailed breakdown
  usageHealth: HealthMetric;
  emotionalHealth: HealthMetric;
  conversationHealth: HealthMetric;
  matchQualityHealth: HealthMetric;

  // Alerts and recommendations
  activeAlerts: HealthAlert[];
  topRecommendations: WellnessRecommendation[];

  // Historical context
  weeklyScores: number[];
  monthlyAverage: number;
}

export type HealthStatus =
  | 'thriving' // 85-100
  | 'healthy' // 70-84
  | 'attention_needed' // 50-69
  | 'struggling' // 30-49
  | 'critical'; // 0-29

export interface HealthMetric {
  name: string;
  score: number; // 0-100
  status: HealthStatus;
  description: string;
  trend: 'improving' | 'stable' | 'declining';
  factors: HealthFactor[];
}

export interface HealthFactor {
  name: string;
  impact: 'positive' | 'neutral' | 'negative';
  value: string;
  weight: number;
}

export interface HealthAlert {
  id: string;
  severity: 'info' | 'warning' | 'urgent';
  type: AlertType;
  title: string;
  message: string;
  actionRequired: boolean;
  suggestedAction: string | null;
  createdAt: string;
  dismissedAt: string | null;
}

export type AlertType =
  | 'excessive_usage'
  | 'mood_decline'
  | 'rejection_pattern'
  | 'conversation_quality'
  | 'break_recommended'
  | 'positive_milestone';

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface GetWellnessMetricsRequest {
  userId: string;
  startDate?: string;
  endDate?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
}

export interface RecordMoodRequest {
  userId: string;
  sessionType: 'start' | 'end';
  mood: MoodLevel;
  anxiety?: number;
  frustration?: number;
  notes?: string;
}

export interface StartReadinessAssessmentRequest {
  userId: string;
  context?: 'initial' | 'periodic' | 'post_break';
}

export interface SubmitReadinessAnswersRequest {
  assessmentId: string;
  answers: ReadinessAnswers;
}

export interface StartSabbaticalRequest {
  userId: string;
  plannedDays: number;
  reason: SabbaticalReason;
  customReason?: string;
  returnGoals?: string[];
}

export interface EndSabbaticalRequest {
  sabbaticalId: string;
  returnCommitment: string;
}

export interface RecordRejectionRequest {
  userId: string;
  type: RejectionType;
  conversationId?: string;
  emotionalInvestment?: 'low' | 'medium' | 'high';
}

export interface DismissAlertRequest {
  alertId: string;
  userId: string;
}
