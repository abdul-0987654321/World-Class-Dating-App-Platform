/**
 * Mental Health Check-ins Type Definitions
 *
 * Privacy-focused types for mental health features
 */

// ==================== Enums ====================

export enum CheckInType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  PROMPTED = 'prompted',
  MANUAL = 'manual',
}

export enum DetectionType {
  LOW_MOOD_TREND = 'low_mood_trend',
  HIGH_ANXIETY = 'high_anxiety',
  RAPID_DECLINE = 'rapid_decline',
  USAGE_PATTERN_CHANGE = 'usage_pattern_change',
  REJECTION_ACCUMULATION = 'rejection_accumulation',
  SOCIAL_WITHDRAWAL = 'social_withdrawal',
  CRISIS_KEYWORDS = 'crisis_keywords',
  USER_REPORTED = 'user_reported',
}

export enum DistressActionTaken {
  NONE = 'none',
  RESOURCES_SHOWN = 'resources_shown',
  BREAK_SUGGESTED = 'break_suggested',
  NOTIFICATION_SENT = 'notification_sent',
  CRISIS_RESOURCES_SHOWN = 'crisis_resources_shown',
  USER_ACKNOWLEDGED = 'user_acknowledged',
}

export enum ResourceCategory {
  CRISIS_SUPPORT = 'crisis_support',
  ANXIETY_MANAGEMENT = 'anxiety_management',
  DATING_STRESS = 'dating_stress',
  SELF_ESTEEM = 'self_esteem',
  REJECTION_COPING = 'rejection_coping',
  LONELINESS = 'loneliness',
  RELATIONSHIP_ANXIETY = 'relationship_anxiety',
  GENERAL_WELLNESS = 'general_wellness',
  PROFESSIONAL_HELP = 'professional_help',
  PEER_SUPPORT = 'peer_support',
}

export enum ResourceType {
  HOTLINE = 'hotline',
  ARTICLE = 'article',
  VIDEO = 'video',
  APP = 'app',
  PROFESSIONAL_SERVICE = 'professional_service',
  COMMUNITY = 'community',
  EXERCISE = 'exercise',
  MEDITATION = 'meditation',
}

export enum AffirmationCategory {
  GENERAL = 'general',
  DATING = 'dating',
  SELF_WORTH = 'self_worth',
  REJECTION = 'rejection',
  CONFIDENCE = 'confidence',
  PATIENCE = 'patience',
  SELF_LOVE = 'self_love',
  NEW_BEGINNINGS = 'new_beginnings',
  VULNERABILITY = 'vulnerability',
  GROWTH = 'growth',
}

export enum ReflectionCategory {
  RECENT_EXPERIENCES = 'recent_experiences',
  SELF_DISCOVERY = 'self_discovery',
  RELATIONSHIP_GOALS = 'relationship_goals',
  PAST_PATTERNS = 'past_patterns',
  GROWTH_AREAS = 'growth_areas',
  GRATITUDE = 'gratitude',
  BOUNDARIES = 'boundaries',
  EXPECTATIONS = 'expectations',
  COMMUNICATION = 'communication',
  SELF_CARE = 'self_care',
}

export enum ReflectionPromptType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MILESTONE = 'milestone',
  POST_REJECTION = 'post_rejection',
  POST_MATCH = 'post_match',
  POST_DATE = 'post_date',
}

export enum BreakType {
  MENTAL_HEALTH = 'mental_health',
  BUSY = 'busy',
  TRAVELING = 'traveling',
  RELATIONSHIP = 'relationship',
  OTHER = 'other',
}

export enum BreakTrigger {
  USER_INITIATED = 'user_initiated',
  SUGGESTED = 'suggested',
  AUTO_ENABLED = 'auto_enabled',
}

export enum MoodTrendDirection {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DECLINING = 'declining',
}

// ==================== Core Interfaces ====================

export interface CheckInResponses {
  moodScore: number; // 1-10
  energyLevel?: number; // 1-10
  anxietyLevel?: number; // 1-10
  stressLevel?: number; // 1-10
  datingConfidence?: number; // 1-10
  socialSatisfaction?: number; // 1-10
  feelings?: string[]; // Selected feelings
  datingExperiences?: string[]; // Recent dating experiences
  reflectionNotes?: string; // Optional text notes (will be encrypted)
}

export interface CheckIn {
  id: string;
  userId: string;
  moodScore: number;
  energyLevel?: number;
  anxietyLevel?: number;
  stressLevel?: number;
  datingConfidence?: number;
  socialSatisfaction?: number;
  feelings?: string[];
  datingExperiences?: string[];
  checkInType: CheckInType;
  triggerContext?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckInWithReflection extends CheckIn {
  reflectionNotes?: string; // Decrypted notes
}

export interface MoodTrend {
  userId: string;
  period: {
    start: Date;
    end: Date;
  };
  direction: MoodTrendDirection;
  averageMood: number;
  averageAnxiety: number;
  averageEnergy: number;
  averageDatingConfidence: number;
  moodHistory: {
    date: Date;
    moodScore: number;
    anxietyLevel?: number;
  }[];
  insights: string[];
}

export interface WellnessScore {
  userId: string;
  overallScore: number; // 0-100
  components: {
    moodStability: number;
    anxietyManagement: number;
    datingConfidence: number;
    socialEngagement: number;
    selfCareConsistency: number;
  };
  streakDays: number; // Days of consistent check-ins
  lastCheckIn?: Date;
  trend: MoodTrendDirection;
  recommendations: string[];
}

export interface BreakSuggestion {
  suggested: boolean;
  urgency: 'low' | 'medium' | 'high';
  reasons: string[];
  recommendedDuration: number; // Days
  resources: Resource[];
}

export interface DistressIndicators {
  userId: string;
  timestamp: Date;
  hasIndicators: boolean;
  indicators: {
    type: DetectionType;
    confidence: number;
    severity: number;
    description: string;
  }[];
  recommendedAction: DistressActionTaken;
  crisisResourcesNeeded: boolean;
}

// ==================== Resources ====================

export interface Resource {
  id: string;
  title: string;
  description: string;
  url?: string;
  phoneNumber?: string;
  category: ResourceCategory;
  resourceType: ResourceType;
  priority: number;
  availableCountries?: string[];
  languages: string[];
  isCrisisResource: boolean;
  isActive: boolean;
}

export interface Affirmation {
  id: string;
  message: string;
  author?: string;
  category: AffirmationCategory;
  moodTags?: string[];
}

export interface ReflectionPrompt {
  id: string;
  promptText: string;
  followUpText?: string;
  category: ReflectionCategory;
  promptType: ReflectionPromptType;
}

export interface ReflectionResponse {
  id: string;
  userId: string;
  promptId: string;
  checkInId?: string;
  response: string; // Decrypted
  createdAt: Date;
}

// ==================== Settings ====================

export interface WellnessSettings {
  userId: string;
  dailyCheckinEnabled: boolean;
  weeklyCheckinEnabled: boolean;
  preferredCheckinTime: string; // HH:MM
  timezone: string;
  checkinDays: number[]; // Days of week (1-7)
  reminderNotifications: boolean;
  affirmationNotifications: boolean;
  resourceSuggestions: boolean;
  crisisDetectionEnabled: boolean;
  suggestBreaks: boolean;
  breakSuggestionThreshold: number;
  dataRetentionDays: number;
  shareAnonymousStats: boolean;
  isOnBreak: boolean;
  breakStartedAt?: Date;
  breakEndsAt?: Date;
  breakReason?: string;
}

export interface WellnessBreak {
  id: string;
  userId: string;
  startedAt: Date;
  intendedEndAt: Date;
  actualEndAt?: Date;
  breakType: BreakType;
  reason?: string;
  trigger: BreakTrigger;
  preBreakMoodScore?: number;
  postBreakMoodScore?: number;
  wasExtended: boolean;
  endedEarly: boolean;
}

// ==================== Usage Metrics ====================

export interface UsageWellnessMetrics {
  userId: string;
  metricDate: Date;
  swipesSent: number;
  matchesReceived: number;
  rejectionsReceived: number;
  messagesSent: number;
  messagesReceived: number;
  sessionCount: number;
  totalSessionMinutes: number;
  rejectionRatio?: number;
  responseRate?: number;
  engagementChange?: number;
}

// ==================== API Request/Response ====================

export interface CreateCheckInRequest {
  moodScore: number;
  energyLevel?: number;
  anxietyLevel?: number;
  stressLevel?: number;
  datingConfidence?: number;
  socialSatisfaction?: number;
  feelings?: string[];
  datingExperiences?: string[];
  reflectionNotes?: string;
  checkInType?: CheckInType;
  triggerContext?: string;
}

export interface UpdateWellnessSettingsRequest {
  dailyCheckinEnabled?: boolean;
  weeklyCheckinEnabled?: boolean;
  preferredCheckinTime?: string;
  timezone?: string;
  checkinDays?: number[];
  reminderNotifications?: boolean;
  affirmationNotifications?: boolean;
  resourceSuggestions?: boolean;
  crisisDetectionEnabled?: boolean;
  suggestBreaks?: boolean;
  breakSuggestionThreshold?: number;
  dataRetentionDays?: number;
  shareAnonymousStats?: boolean;
}

export interface EnableBreakRequest {
  duration: number; // Days
  breakType?: BreakType;
  reason?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface GetCheckInHistoryOptions {
  dateRange?: DateRange;
  checkInType?: CheckInType;
  limit?: number;
  offset?: number;
  includeReflections?: boolean;
}

// ==================== Internal Types ====================

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
  keyId: string;
}

export interface DistressDetectionConfig {
  lowMoodThreshold: number;
  highAnxietyThreshold: number;
  rapidDeclineDays: number;
  rapidDeclineThreshold: number;
  rejectionAccumulationDays: number;
  rejectionAccumulationThreshold: number;
  withdrawalDays: number;
  crisisKeywords: string[];
}

export const DEFAULT_DISTRESS_CONFIG: DistressDetectionConfig = {
  lowMoodThreshold: 3,
  highAnxietyThreshold: 8,
  rapidDeclineDays: 7,
  rapidDeclineThreshold: 3,
  rejectionAccumulationDays: 7,
  rejectionAccumulationThreshold: 10,
  withdrawalDays: 5,
  crisisKeywords: [
    'suicide',
    'suicidal',
    'kill myself',
    'end my life',
    'want to die',
    'self-harm',
    'hurt myself',
    'hopeless',
    'give up',
    'no reason to live',
  ],
};

// ==================== Helper Functions ====================

export function calculateWellnessScore(
  recentCheckIns: CheckIn[],
  moodTrend: MoodTrend,
  streakDays: number
): number {
  if (recentCheckIns.length === 0) return 50; // Neutral default

  // Weight factors
  const weights = {
    mood: 0.35,
    anxiety: 0.20,
    datingConfidence: 0.20,
    trend: 0.15,
    consistency: 0.10,
  };

  // Calculate average mood (scaled to 0-100)
  const avgMood = recentCheckIns.reduce((sum, c) => sum + c.moodScore, 0) / recentCheckIns.length;
  const moodScore = (avgMood / 10) * 100;

  // Calculate anxiety score (inverse - lower anxiety = higher score)
  const anxietyCheckIns = recentCheckIns.filter(c => c.anxietyLevel !== undefined);
  let anxietyScore = 50;
  if (anxietyCheckIns.length > 0) {
    const avgAnxiety = anxietyCheckIns.reduce((sum, c) => sum + (c.anxietyLevel || 5), 0) / anxietyCheckIns.length;
    anxietyScore = ((10 - avgAnxiety) / 10) * 100;
  }

  // Calculate dating confidence score
  const confidenceCheckIns = recentCheckIns.filter(c => c.datingConfidence !== undefined);
  let confidenceScore = 50;
  if (confidenceCheckIns.length > 0) {
    const avgConfidence = confidenceCheckIns.reduce((sum, c) => sum + (c.datingConfidence || 5), 0) / confidenceCheckIns.length;
    confidenceScore = (avgConfidence / 10) * 100;
  }

  // Trend score
  let trendScore = 50;
  if (moodTrend.direction === MoodTrendDirection.IMPROVING) trendScore = 80;
  else if (moodTrend.direction === MoodTrendDirection.DECLINING) trendScore = 20;

  // Consistency score (based on streak)
  const consistencyScore = Math.min(streakDays * 10, 100);

  // Calculate weighted total
  const total =
    moodScore * weights.mood +
    anxietyScore * weights.anxiety +
    confidenceScore * weights.datingConfidence +
    trendScore * weights.trend +
    consistencyScore * weights.consistency;

  return Math.round(total);
}

export function generateWellnessRecommendations(score: WellnessScore): string[] {
  const recommendations: string[] = [];

  if (score.overallScore < 40) {
    recommendations.push('Consider taking a short break from dating to recharge.');
    recommendations.push('Focus on self-care activities that bring you joy.');
  }

  if (score.components.anxietyManagement < 40) {
    recommendations.push('Try breathing exercises or meditation before opening the app.');
    recommendations.push('Limit your daily swiping time to reduce overwhelm.');
  }

  if (score.components.datingConfidence < 40) {
    recommendations.push('Celebrate small wins in your dating journey.');
    recommendations.push('Remember that rejection is not a reflection of your worth.');
  }

  if (score.streakDays === 0) {
    recommendations.push('Regular check-ins help track your wellbeing. Try setting a daily reminder.');
  }

  if (score.trend === MoodTrendDirection.DECLINING) {
    recommendations.push('Your mood has been trending down. Consider reaching out to a friend or counselor.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Keep up the great work on maintaining your mental wellness!');
    recommendations.push('Consider journaling about your positive dating experiences.');
  }

  return recommendations;
}

export function generateMoodInsights(moodHistory: { date: Date; moodScore: number }[]): string[] {
  const insights: string[] = [];

  if (moodHistory.length < 3) {
    insights.push('Continue logging check-ins to see mood patterns.');
    return insights;
  }

  // Analyze day of week patterns
  const dayAverages: Record<number, number[]> = {};
  moodHistory.forEach(m => {
    const day = new Date(m.date).getDay();
    if (!dayAverages[day]) dayAverages[day] = [];
    dayAverages[day].push(m.moodScore);
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let bestDay = 0;
  let worstDay = 0;
  let bestAvg = 0;
  let worstAvg = 10;

  Object.entries(dayAverages).forEach(([day, scores]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestDay = parseInt(day);
    }
    if (avg < worstAvg) {
      worstAvg = avg;
      worstDay = parseInt(day);
    }
  });

  if (bestAvg - worstAvg > 1) {
    insights.push(`You tend to feel best on ${dayNames[bestDay]}s.`);
    if (worstAvg < 5) {
      insights.push(`${dayNames[worstDay]}s might be challenging - plan some self-care.`);
    }
  }

  // Analyze recent trend
  const recent = moodHistory.slice(-5);
  const older = moodHistory.slice(-10, -5);

  if (recent.length >= 3 && older.length >= 3) {
    const recentAvg = recent.reduce((sum, m) => sum + m.moodScore, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.moodScore, 0) / older.length;

    if (recentAvg > olderAvg + 1) {
      insights.push('Your mood has been improving recently. Great progress!');
    } else if (recentAvg < olderAvg - 1) {
      insights.push('Your mood has been lower lately. Remember to be gentle with yourself.');
    }
  }

  return insights;
}
