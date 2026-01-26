/**
 * Conversation Intelligence Service Types
 * Types for connection scoring, ghost prevention, and intent signaling
 */

// ============================================================================
// Connection Score Types
// ============================================================================

export interface ConnectionScore {
  conversationId: string;
  user1Id: string;
  user2Id: string;

  // Overall score (0-100)
  overallScore: number;
  scoreLevel: ScoreLevel;

  // Dimension breakdown
  depthScore: number; // Quality of topics discussed
  reciprocityScore: number; // Balance of conversation
  engagementScore: number; // Response quality and timing
  progressionScore: number; // How conversation is evolving

  // Metrics
  totalMessages: number;
  averageMessageLength: number;
  questionRatio: number; // Questions asked per message
  responseTimeAverage: number; // In minutes
  topicsDiscussed: string[];

  // Progression indicators
  hasExchangedPersonalInfo: boolean;
  hasDiscussedMeetup: boolean;
  hasSharedVulnerability: boolean;

  // Trends
  scoreTrend: 'improving' | 'stable' | 'declining';
  lastUpdated: string;
}

export type ScoreLevel =
  | 'sparking' // 0-25: Just started, early potential
  | 'warming' // 26-50: Building rapport
  | 'connecting' // 51-75: Good conversation quality
  | 'bonding'; // 76-100: Deep, meaningful exchange

export interface ConnectionScoreUpdate {
  conversationId: string;
  messageId: string;
  senderId: string;
  messageContent: string;
  messageTimestamp: string;
  isQuestion: boolean;
  wordCount: number;
  responseTimeMinutes: number | null;
}

export interface ConversationAnalysis {
  conversationId: string;
  analyzedAt: string;

  // Quality metrics
  depthAnalysis: DepthAnalysis;
  reciprocityAnalysis: ReciprocityAnalysis;
  engagementAnalysis: EngagementAnalysis;

  // Suggestions for improvement
  suggestions: ConversationSuggestion[];

  // Milestones
  milestonesReached: ConversationMilestone[];
  nextMilestone: ConversationMilestone | null;
}

export interface DepthAnalysis {
  score: number;
  topicCategories: TopicCategory[];
  surfaceLevelRatio: number;
  meaningfulExchanges: number;
  vulnerabilityMoments: number;
}

export interface TopicCategory {
  name: string;
  count: number;
  depth: 'surface' | 'moderate' | 'deep';
}

export interface ReciprocityAnalysis {
  score: number;
  messageRatio: number; // user1 messages / user2 messages
  questionAskedRatio: number;
  initiationBalance: number;
  isBalanced: boolean;
}

export interface EngagementAnalysis {
  score: number;
  averageResponseTime: number;
  responseTimeConsistency: number;
  messageQualityScore: number;
  ghostingRisk: number; // 0-100
}

export interface ConversationSuggestion {
  id: string;
  type: SuggestionType;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  exampleActions: string[];
}

export type SuggestionType =
  | 'ask_deeper_question'
  | 'share_more'
  | 'balance_conversation'
  | 'respond_faster'
  | 'suggest_meetup'
  | 'show_interest'
  | 'be_vulnerable';

export interface ConversationMilestone {
  id: string;
  name: string;
  description: string;
  requiredScore: number;
  achieved: boolean;
  achievedAt: string | null;
}

// ============================================================================
// Intent Signaling (Ready Mode) Types
// ============================================================================

export interface UserIntent {
  userId: string;
  conversationId: string | null; // null = global intent

  intent: IntentLevel;
  updatedAt: string;

  // Optional context
  availableTimeframe: string | null; // "This week", "Next weekend", etc.
  preferredDateTypes: string[];
  notes: string | null;
}

export type IntentLevel =
  | 'exploring' // Just chatting, no rush
  | 'getting_to_know' // Want more conversation first
  | 'open_to_meeting' // Could meet if it feels right
  | 'ready_to_meet'; // Actively want to meet soon

export interface IntentMatch {
  user1Intent: IntentLevel;
  user2Intent: IntentLevel;
  compatibility: IntentCompatibility;
  suggestion: string;
}

export type IntentCompatibility =
  | 'aligned' // Both want same thing
  | 'compatible' // Close enough
  | 'misaligned'; // Different expectations

// ============================================================================
// Ghost Prevention Types
// ============================================================================

export interface GhostRiskAssessment {
  conversationId: string;
  assessedAt: string;

  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  // Risk factors
  factors: GhostRiskFactor[];

  // Intervention suggestions
  interventions: GhostIntervention[];
}

export interface GhostRiskFactor {
  factor: string;
  weight: number;
  currentValue: number;
  riskContribution: number;
}

export interface GhostIntervention {
  type: InterventionType;
  priority: 'optional' | 'recommended' | 'urgent';
  message: string;
  actionUrl?: string;
}

export type InterventionType =
  | 'send_reminder'
  | 'suggest_question'
  | 'prompt_checkin'
  | 'offer_graceful_exit';

// ============================================================================
// Graceful Exit Types
// ============================================================================

export interface GracefulExitRequest {
  conversationId: string;
  userId: string;
  reason: ExitReason;
  customMessage?: string;
  provideFeedback: boolean;
  feedbackCategories?: FeedbackCategory[];
}

export type ExitReason =
  | 'not_feeling_connection'
  | 'too_busy_right_now'
  | 'found_someone_else'
  | 'looking_for_different'
  | 'other';

export type FeedbackCategory =
  | 'conversation_quality'
  | 'response_time'
  | 'compatibility'
  | 'communication_style'
  | 'other';

export interface GracefulExitMessage {
  id: string;
  reason: ExitReason;
  severity: 'gentle' | 'standard' | 'direct';
  messageTemplate: string;
  customizable: boolean;
}

export interface ExitFeedback {
  conversationId: string;
  fromUserId: string;
  toUserId: string;

  categories: FeedbackCategory[];
  isPrivate: boolean; // If true, aggregated only, not shown directly

  createdAt: string;
}

export interface AggregatedFeedback {
  userId: string;
  totalExits: number;

  // Aggregated patterns (shown after 3+ similar feedbacks)
  patterns: FeedbackPattern[];

  lastUpdated: string;
}

export interface FeedbackPattern {
  category: FeedbackCategory;
  count: number;
  percentage: number;
  isSignificant: boolean; // More than 30%
  suggestion: string;
}

// ============================================================================
// Communication Style Types
// ============================================================================

export interface CommunicationStyle {
  userId: string;
  analyzedAt: string;
  sampleSize: number; // Messages analyzed

  // Style dimensions
  formality: number; // 0 (casual) to 100 (formal)
  expressiveness: number; // 0 (reserved) to 100 (expressive)
  verbosity: number; // 0 (concise) to 100 (detailed)
  questionFrequency: number; // 0 (statements) to 100 (questions)
  responseSpeed: number; // 0 (slow) to 100 (fast)

  // Patterns
  emojiUsage: 'none' | 'minimal' | 'moderate' | 'frequent';
  averageMessageLength: number;
  typicalResponseTime: number; // minutes

  // Preferences inferred
  preferredConversationPace: 'slow' | 'moderate' | 'fast';
  preferredDepth: 'light' | 'moderate' | 'deep';
}

export interface StyleCompatibility {
  user1Style: CommunicationStyle;
  user2Style: CommunicationStyle;

  overallCompatibility: number; // 0-100

  // Dimension compatibility
  formalityMatch: number;
  expressivenessMatch: number;
  verbosityMatch: number;
  paceMatch: number;

  // Friction points
  potentialFrictions: StyleFriction[];

  // Tips for each user
  user1Tips: string[];
  user2Tips: string[];
}

export interface StyleFriction {
  dimension: string;
  severity: 'minor' | 'moderate' | 'significant';
  description: string;
  mitigation: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface AnalyzeMessageRequest {
  conversationId: string;
  messageId: string;
  senderId: string;
  content: string;
  timestamp: string;
}

export interface GetConnectionScoreRequest {
  conversationId: string;
}

export interface UpdateIntentRequest {
  userId: string;
  conversationId?: string;
  intent: IntentLevel;
  availableTimeframe?: string;
  preferredDateTypes?: string[];
  notes?: string;
}

export interface RequestGracefulExitRequest {
  conversationId: string;
  reason: ExitReason;
  customMessage?: string;
  provideFeedback?: boolean;
  feedbackCategories?: FeedbackCategory[];
}

export interface CheckGhostRiskRequest {
  conversationId: string;
}
