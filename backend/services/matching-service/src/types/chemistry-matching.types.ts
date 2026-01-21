/**
 * Chemistry Matching Types
 * Pheromone-Inspired Matching Algorithm
 *
 * A novel matching system based on behavioral "chemistry" signals,
 * inspired by biological attraction mechanisms.
 *
 * Key Concepts:
 * - Rhythm Sync: Activity patterns and response timing compatibility
 * - Engagement Style: How users show interest and converse
 * - Personality Complement: Opposites attract vs similarity theory
 * - Mystery Factor: Unpredictability that keeps interest alive
 * - Energy Match: Communication enthusiasm and expressiveness
 */

// ============================================================================
// BEHAVIORAL SIGNALS
// ============================================================================

/**
 * Types of behavioral signals extracted from user activity
 */
export enum BehavioralSignalType {
  // Activity patterns
  ACTIVITY_TIMING = 'activity_timing',
  RESPONSE_LATENCY = 'response_latency',
  SESSION_DURATION = 'session_duration',
  PEAK_HOURS = 'peak_hours',

  // Communication style
  MESSAGE_LENGTH = 'message_length',
  QUESTION_FREQUENCY = 'question_frequency',
  EMOJI_USAGE = 'emoji_usage',
  CONVERSATION_INITIATION = 'conversation_initiation',
  RESPONSE_ENTHUSIASM = 'response_enthusiasm',

  // Engagement patterns
  PROFILE_VIEW_DEPTH = 'profile_view_depth',
  SWIPE_VELOCITY = 'swipe_velocity',
  MATCH_ENGAGEMENT_RATE = 'match_engagement_rate',
  CONVERSATION_DEPTH = 'conversation_depth',

  // Interest signals
  INTEREST_BREADTH = 'interest_breadth',
  INTEREST_PASSION = 'interest_passion',
  SHARED_NICHE_INTERESTS = 'shared_niche_interests',

  // Personality indicators
  OPENNESS_INDICATOR = 'openness_indicator',
  ASSERTIVENESS_INDICATOR = 'assertiveness_indicator',
  WARMTH_INDICATOR = 'warmth_indicator',
  SPONTANEITY_INDICATOR = 'spontaneity_indicator',
}

/**
 * A single behavioral signal measurement
 */
export interface BehavioralSignal {
  type: BehavioralSignalType;
  value: number; // Normalized 0-1 scale
  confidence: number; // How confident we are in this measurement (0-1)
  sampleSize: number; // Number of data points used
  lastUpdated: Date;
  trend?: 'increasing' | 'stable' | 'decreasing'; // Recent trend
}

/**
 * Activity rhythm pattern for a user
 */
export interface RhythmPattern {
  // Daily activity distribution (24 hours)
  hourlyDistribution: number[];

  // Weekly activity distribution (7 days)
  weeklyDistribution: number[];

  // Average response time (in minutes)
  averageResponseTime: number;
  responseTimeVariance: number;

  // Session patterns
  averageSessionDuration: number; // in minutes
  sessionsPerDay: number;

  // Chronotype classification
  chronotype: 'early_bird' | 'night_owl' | 'balanced';
  chronotypeStrength: number; // 0-1
}

/**
 * Engagement style characteristics
 */
export interface EngagementStyle {
  // Communication approach
  initiationTendency: number; // 0 = rarely initiates, 1 = often initiates
  questionAsking: number; // 0 = never asks questions, 1 = very inquisitive
  emotionalExpressiveness: number; // 0 = reserved, 1 = very expressive

  // Conversation patterns
  averageMessageLength: number;
  messageFrequencyInConvo: number; // messages per hour when active
  useOfMedia: number; // GIFs, photos, voice notes
  humorIndex: number; // Detected humor in messages

  // Interest demonstration
  complimentFrequency: number;
  topicExpansion: number; // How often they expand on topics
  activeListeningIndicators: number;
}

/**
 * Personality profile for complement matching
 */
export interface PersonalityComplement {
  // Big Five inspired dimensions (simplified)
  openness: number; // 0-1
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  emotionalStability: number;

  // Dating-specific traits
  adventurousness: number;
  romanticIntensity: number;
  independenceNeed: number;
  socialBatterySize: number; // How much social interaction they need

  // Complementary type preferences
  attractedToOpposites: boolean;
  compatibleTypes: PersonalityType[];
}

/**
 * Personality type classification
 */
export type PersonalityType =
  | 'explorer'      // High openness, adventurous
  | 'nurturer'      // High agreeableness, caring
  | 'achiever'      // High conscientiousness, goal-oriented
  | 'connector'     // High extraversion, social
  | 'thinker'       // Analytical, independent
  | 'romantic'      // High romantic intensity
  | 'balanced';     // No dominant trait

// ============================================================================
// CHEMISTRY PROFILE
// ============================================================================

/**
 * Complete chemistry profile for a user
 */
export interface ChemistryProfile {
  userId: string;

  // Raw behavioral signals
  behavioralSignals: BehavioralSignal[];

  // Processed patterns
  rhythmPatterns: RhythmPattern;
  engagementStyle: EngagementStyle;

  // Personality classification
  personalityProfile: PersonalityComplement;
  primaryPersonalityType: PersonalityType;

  // Chemistry factors
  energyLevel: number; // 0-1, overall energy in interactions
  mysteryFactor: number; // 0-1, unpredictability score
  warmthFactor: number; // 0-1, emotional warmth

  // Metadata
  dataQuality: 'insufficient' | 'low' | 'medium' | 'high';
  totalInteractions: number;
  profileAge: number; // Days since profile creation
  lastCalculated: Date;
  version: number; // Algorithm version
}

// ============================================================================
// CHEMISTRY SCORE
// ============================================================================

/**
 * Individual dimension scores for chemistry
 */
export interface ChemistryDimensions {
  // Core dimensions
  rhythmSync: number; // 0-100, how well activity patterns align
  engagementMatch: number; // 0-100, communication style compatibility
  personalityComplement: number; // 0-100, personality compatibility
  mysteryBalance: number; // 0-100, right amount of unpredictability
  energyMatch: number; // 0-100, energy level compatibility

  // Sub-dimensions
  timingCompatibility: number; // Part of rhythmSync
  conversationFlow: number; // Part of engagementMatch
  emotionalResonance: number; // Part of personalityComplement
}

/**
 * Comprehensive chemistry score between two users
 */
export interface ChemistryScore {
  // Overall chemistry prediction
  overall: number; // 0-100

  // Confidence in prediction
  confidence: number; // 0-1

  // Breakdown by dimension
  dimensions: ChemistryDimensions;

  // Weights used (can vary by user preferences)
  weights: {
    rhythmSync: number;
    engagementMatch: number;
    personalityComplement: number;
    mysteryBalance: number;
    energyMatch: number;
  };

  // Spark indicators
  sparkPotential: 'low' | 'medium' | 'high' | 'exceptional';

  // Red flags detected
  antiPatterns: ChemistryAntiPattern[];
}

/**
 * Red flags that indicate low chemistry
 */
export interface ChemistryAntiPattern {
  type: ChemistryAntiPatternType;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  recommendation?: string;
}

export enum ChemistryAntiPatternType {
  // Timing issues
  COMPLETELY_OPPOSITE_SCHEDULES = 'completely_opposite_schedules',
  RESPONSE_TIME_MISMATCH = 'response_time_mismatch',

  // Communication issues
  ENERGY_LEVEL_MISMATCH = 'energy_level_mismatch',
  COMMUNICATION_STYLE_CLASH = 'communication_style_clash',
  ONE_SIDED_EFFORT = 'one_sided_effort',

  // Personality issues
  INDEPENDENCE_CONFLICT = 'independence_conflict',
  EMOTIONAL_NEEDS_MISMATCH = 'emotional_needs_mismatch',

  // Engagement issues
  LOW_ENGAGEMENT_RECIPROCITY = 'low_engagement_reciprocity',
  CONVERSATION_DEAD_ENDS = 'conversation_dead_ends',
}

// ============================================================================
// CHEMISTRY MATCH
// ============================================================================

/**
 * Chemistry factor with explanation
 */
export interface ChemistryFactor {
  factor: string;
  score: number; // 0-100
  weight: number; // How much this contributed
  positive: boolean;
  explanation: string;
  examples?: string[]; // Specific examples of why
}

/**
 * Complete chemistry match result
 */
export interface ChemistryMatch {
  userId: string;
  matchId: string;

  // Scores
  score: ChemistryScore;

  // Detailed factors
  chemistryFactors: ChemistryFactor[];

  // Human-readable explanations
  explanation: ChemistryExplanation;

  // Prediction
  predictedOutcome: ChemistryPrediction;

  // Metadata
  calculatedAt: Date;
  algorithmVersion: string;
}

/**
 * Human-readable chemistry explanation
 */
export interface ChemistryExplanation {
  summary: string;
  highlights: string[];
  concerns: string[];
  tips: string[];
  iceBreakers: string[]; // Suggested conversation starters
}

/**
 * Chemistry-based outcome prediction
 */
export interface ChemistryPrediction {
  // Probability of specific outcomes
  likelyToMatch: number; // 0-1
  likelyToMessage: number; // 0-1
  likelyToHaveLongConversation: number; // 0-1
  likelyToMeetUp: number; // 0-1

  // Time predictions
  estimatedConversationDepth: 'surface' | 'moderate' | 'deep';
  estimatedResponseRate: 'low' | 'medium' | 'high';
}

// ============================================================================
// INTERACTION LEARNING
// ============================================================================

/**
 * Conversation data for chemistry learning
 */
export interface ConversationData {
  matchId: string;
  userId: string;
  partnerId: string;

  // Conversation metrics
  totalMessages: number;
  messagesByUser: number;
  messagesByPartner: number;

  // Timing metrics
  averageResponseTimeUser: number;
  averageResponseTimePartner: number;
  conversationSpanHours: number;

  // Content metrics
  averageMessageLengthUser: number;
  averageMessageLengthPartner: number;
  questionRatio: number;
  emojiUsageUser: number;
  emojiUsagePartner: number;

  // Engagement signals
  conversationInitiator: 'user' | 'partner';
  topicCount: number;
  laughIndicators: number; // "haha", "lol", etc.

  // Outcome
  outcome: ConversationOutcome;
  outcomeTimestamp?: Date;
}

export type ConversationOutcome =
  | 'ongoing'
  | 'exchanged_contact'
  | 'scheduled_date'
  | 'met_in_person'
  | 'faded'
  | 'unmatched_user'
  | 'unmatched_partner'
  | 'blocked';

/**
 * Chemistry feedback from actual interactions
 */
export interface ChemistryFeedback {
  matchId: string;
  userId: string;

  // Predicted vs actual
  predictedScore: number;
  actualEngagement: number; // Calculated from conversation data

  // User feedback (if provided)
  userRating?: number; // 1-5
  userFeedbackType?: 'great_chemistry' | 'okay' | 'no_spark' | 'mismatch';

  // Learning signals
  predictionError: number;
  adjustmentFactors: Record<string, number>;

  createdAt: Date;
}

// ============================================================================
// SERVICE CONFIGURATION
// ============================================================================

/**
 * Chemistry matching configuration
 */
export interface ChemistryConfig {
  // Feature flag
  enabled: boolean;
  rolloutPercentage: number;

  // Algorithm parameters
  defaultWeights: ChemistryScore['weights'];
  minimumDataQuality: ChemistryProfile['dataQuality'];
  minimumInteractionsRequired: number;

  // Thresholds
  highChemistryThreshold: number;
  sparkThreshold: number;
  antiPatternThreshold: number;

  // Learning rate
  feedbackLearningRate: number;
  profileUpdateInterval: number; // hours
}

/**
 * Default chemistry configuration
 */
export const DEFAULT_CHEMISTRY_CONFIG: ChemistryConfig = {
  enabled: false, // Feature flag at 0% for research
  rolloutPercentage: 0,

  defaultWeights: {
    rhythmSync: 0.20,
    engagementMatch: 0.25,
    personalityComplement: 0.25,
    mysteryBalance: 0.10,
    energyMatch: 0.20,
  },

  minimumDataQuality: 'low',
  minimumInteractionsRequired: 10,

  highChemistryThreshold: 75,
  sparkThreshold: 85,
  antiPatternThreshold: 30,

  feedbackLearningRate: 0.1,
  profileUpdateInterval: 24,
};

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request to build chemistry profile
 */
export interface BuildChemistryProfileRequest {
  userId: string;
  behaviorData: {
    activityLogs: ActivityLogEntry[];
    messageHistory: MessageHistoryEntry[];
    swipeHistory: SwipeHistoryEntry[];
    profileInteractions: ProfileInteractionEntry[];
  };
  forceRebuild?: boolean;
}

export interface ActivityLogEntry {
  timestamp: Date;
  sessionDuration: number;
  actionsCount: number;
}

export interface MessageHistoryEntry {
  matchId: string;
  sentAt: Date;
  messageLength: number;
  hasEmoji: boolean;
  hasQuestion: boolean;
  responseToPartner: boolean;
  responseLatency?: number;
}

export interface SwipeHistoryEntry {
  timestamp: Date;
  direction: 'left' | 'right' | 'super';
  viewDuration: number;
  profileCompleteness: number;
}

export interface ProfileInteractionEntry {
  targetUserId: string;
  viewedAt: Date;
  viewDuration: number;
  sectionsViewed: string[];
  action: 'none' | 'like' | 'pass' | 'super_like';
}

/**
 * Request to find high chemistry matches
 */
export interface FindHighChemistryMatchesRequest {
  userId: string;
  candidateIds: string[];
  limit?: number;
  minimumScore?: number;
  includeExplanations?: boolean;
}

/**
 * Response for high chemistry matches
 */
export interface FindHighChemistryMatchesResponse {
  matches: ChemistryMatch[];
  totalCandidates: number;
  profilesWithInsufficientData: string[];
  calculationTime: number;
}
