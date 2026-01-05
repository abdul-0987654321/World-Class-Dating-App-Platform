/**
 * Type definitions for Analytics Service
 */

// =============================================
// TRACKING EVENTS
// =============================================

export interface TrackingEvent {
  id: string;
  userId?: string;
  sessionId?: string;
  eventType: string;
  eventName: string;

  // UTM Parameters
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;

  // Click IDs
  clickIds?: {
    fbclid?: string;
    gclid?: string;
    ttclid?: string;
    snapchat_click_id?: string;
    reddit_click_id?: string;
    [key: string]: string | undefined;
  };

  // Event Data
  eventData?: Record<string, any>;
  pageUrl?: string;
  referrerUrl?: string;

  // Device & Browser
  userAgent?: string;
  ipAddress?: string;
  deviceType?: string;
  browser?: string;
  os?: string;

  // Location
  country?: string;
  region?: string;
  city?: string;

  // Timestamps
  createdAt: Date;
  eventTimestamp: Date;
}

export interface CreateTrackingEventRequest {
  userId?: string;
  sessionId?: string;
  eventType: string;
  eventName: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  clickIds?: TrackingEvent['clickIds'];
  eventData?: Record<string, any>;
  pageUrl?: string;
  referrerUrl?: string;
  userAgent?: string;
  ipAddress?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  country?: string;
  region?: string;
  city?: string;
}

// =============================================
// USER ATTRIBUTION
// =============================================

export interface UserAttribution {
  userId: string;

  // First Touch
  firstTouchSource?: string;
  firstTouchMedium?: string;
  firstTouchCampaign?: string;
  firstTouchContent?: string;
  firstTouchClickId?: Record<string, any>;
  firstTouchTimestamp?: Date;
  firstTouchLandingPage?: string;
  firstTouchReferrer?: string;

  // Last Touch
  lastTouchSource?: string;
  lastTouchMedium?: string;
  lastTouchCampaign?: string;
  lastTouchContent?: string;
  lastTouchClickId?: Record<string, any>;
  lastTouchTimestamp?: Date;

  // Registration
  registrationTimestamp?: Date;
  registrationSource?: string;
  registrationCampaign?: string;

  // Attribution Model
  attributionModel: 'first_touch' | 'last_touch' | 'linear' | 'time_decay';
  totalTouchpoints: number;
  touchpointData?: Array<{
    source: string;
    campaign?: string;
    timestamp: Date;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAttributionRequest {
  userId: string;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  clickId?: Record<string, any>;
  landingPage?: string;
  referrer?: string;
}

// =============================================
// CONVERSION FUNNEL
// =============================================

export interface ConversionFunnel {
  id: string;
  userId?: string;
  sessionId?: string;

  // Funnel Steps
  landingPageViewAt?: Date;
  registrationStartedAt?: Date;
  emailEnteredAt?: Date;
  passwordCreatedAt?: Date;
  registrationCompletedAt?: Date;
  emailVerifiedAt?: Date;
  profileStartedAt?: Date;
  photoUploadedAt?: Date;
  profileCompletedAt?: Date;
  firstMatchAt?: Date;
  firstMessageAt?: Date;
  subscriptionPurchasedAt?: Date;

  // Time to Complete
  timeToRegister?: number;
  timeToVerify?: number;
  timeToProfile?: number;
  timeToMatch?: number;
  timeToSubscribe?: number;

  // Drop-off Analysis
  droppedAtStep?: string;
  completed: boolean;

  // Attribution
  utmSource?: string;
  utmCampaign?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateFunnelStepRequest {
  userId?: string;
  sessionId: string;
  step: keyof Omit<
    ConversionFunnel,
    | 'id'
    | 'userId'
    | 'sessionId'
    | 'timeToRegister'
    | 'timeToVerify'
    | 'timeToProfile'
    | 'timeToMatch'
    | 'timeToSubscribe'
    | 'droppedAtStep'
    | 'completed'
    | 'utmSource'
    | 'utmCampaign'
    | 'createdAt'
    | 'updatedAt'
  >;
  timestamp?: Date;
}

// =============================================
// AD CAMPAIGN PERFORMANCE
// =============================================

export interface AdCampaignPerformance {
  id: string;

  // Campaign Identifiers
  platform: 'facebook' | 'tiktok' | 'google' | 'snapchat' | 'reddit' | 'twitter';
  campaignId: string;
  campaignName?: string;
  adSetId?: string;
  adSetName?: string;
  adId?: string;
  adName?: string;

  // UTM Parameters
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;

  // Metrics
  impressions: number;
  clicks: number;
  spend: number;

  // Conversions
  registrations: number;
  emailVerifications: number;
  profileCompletions: number;
  subscriptions: number;

  // Calculated Metrics
  ctr?: number;
  cpc?: number;
  cpm?: number;
  cpa?: number;
  roas?: number;

  // Revenue
  revenue: number;

  // Date
  date: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateCampaignMetricsRequest {
  platform: AdCampaignPerformance['platform'];
  campaignId: string;
  adId?: string;
  date: Date;
  impressions?: number;
  clicks?: number;
  spend?: number;
  registrations?: number;
  emailVerifications?: number;
  profileCompletions?: number;
  subscriptions?: number;
  revenue?: number;
}

// =============================================
// USER SESSIONS
// =============================================

export interface UserSession {
  id: string;
  sessionId: string;
  userId?: string;

  // Session Start
  startedAt: Date;
  landingPage?: string;
  referrerUrl?: string;

  // UTM Parameters
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;

  // Click IDs
  clickIds?: Record<string, any>;

  // Device Info
  userAgent?: string;
  ipAddress?: string;
  deviceType?: string;
  browser?: string;
  os?: string;

  // Location
  country?: string;
  region?: string;
  city?: string;

  // Session Activity
  pageViews: number;
  eventsCount: number;
  durationSeconds?: number;

  // Session End
  endedAt?: Date;
  exitPage?: string;

  // Conversion
  converted: boolean;
  conversionTimestamp?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionRequest {
  sessionId: string;
  userId?: string;
  landingPage?: string;
  referrerUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  clickIds?: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  country?: string;
  region?: string;
  city?: string;
}

export interface UpdateSessionRequest {
  sessionId: string;
  userId?: string;
  pageViews?: number;
  eventsCount?: number;
  durationSeconds?: number;
  endedAt?: Date;
  exitPage?: string;
  converted?: boolean;
  conversionTimestamp?: Date;
}

// =============================================
// PIXEL EVENTS
// =============================================

export interface PixelEvent {
  id: string;
  platform: 'meta' | 'tiktok' | 'snapchat' | 'google';
  eventType: string;
  userId?: string;
  eventId: string; // Deduplication ID
  eventData: Record<string, any>;

  // Status
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
  retryCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePixelEventRequest {
  platform: PixelEvent['platform'];
  eventType: string;
  userId?: string;
  eventId: string;
  eventData: Record<string, any>;
}

// =============================================
// ANALYTICS QUERIES
// =============================================

export interface AnalyticsQuery {
  startDate?: Date;
  endDate?: Date;
  utmSource?: string;
  utmCampaign?: string;
  platform?: string;
  groupBy?: 'day' | 'week' | 'month' | 'source' | 'campaign' | 'platform';
  limit?: number;
  offset?: number;
}

export interface CampaignSummary {
  date: Date;
  platform: string;
  utmCampaign: string;
  totalImpressions: number;
  totalClicks: number;
  totalSpend: number;
  totalRegistrations: number;
  totalSubscriptions: number;
  totalRevenue: number;
  avgCtr: number;
  avgCpc: number;
  avgCpa: number;
  avgRoas: number;
}

export interface FunnelConversionRates {
  utmSource: string;
  totalSessions: number;
  landingViews: number;
  registrationsStarted: number;
  registrationsCompleted: number;
  emailsVerified: number;
  profilesCompleted: number;
  firstMatches: number;
  subscriptions: number;
  registrationRate: number;
  profileCompletionRate: number;
  subscriptionRate: number;
}

export interface AttributionSummary {
  firstTouchSource: string;
  lastTouchSource: string;
  totalUsers: number;
  registeredUsers: number;
  avgTouchpoints: number;
  conversionRate: number;
}

// =============================================
// USER SEGMENTATION
// =============================================

export enum UserSegmentType {
  // Engagement Segments
  POWER_USER = 'POWER_USER', // Daily active, high engagement
  ACTIVE_USER = 'ACTIVE_USER', // Weekly active
  CASUAL_USER = 'CASUAL_USER', // Monthly active
  DORMANT_USER = 'DORMANT_USER', // 30+ days inactive
  CHURNED_USER = 'CHURNED_USER', // 90+ days inactive

  // Subscription Segments
  FREE_USER = 'FREE_USER',
  TRIAL_USER = 'TRIAL_USER',
  PAID_USER = 'PAID_USER',
  PREMIUM_USER = 'PREMIUM_USER', // High-tier subscription
  LAPSED_SUBSCRIBER = 'LAPSED_SUBSCRIBER',

  // Behavior Segments
  SWIPER = 'SWIPER', // High swipe activity
  MATCHER = 'MATCHER', // High match rate
  CONVERSATIONALIST = 'CONVERSATIONALIST', // High message engagement
  PROFILE_BUILDER = 'PROFILE_BUILDER', // Complete profile, regular updates
  GHOST = 'GHOST', // Matches but doesn't message

  // Lifecycle Segments
  NEW_USER = 'NEW_USER', // < 7 days
  ONBOARDING = 'ONBOARDING', // Incomplete profile
  ESTABLISHED = 'ESTABLISHED', // 30+ days, complete profile
  VETERAN = 'VETERAN', // 180+ days active

  // Value Segments
  HIGH_LTV = 'HIGH_LTV', // High lifetime value
  MEDIUM_LTV = 'MEDIUM_LTV',
  LOW_LTV = 'LOW_LTV',
  AT_RISK = 'AT_RISK', // Declining engagement

  // Intent Segments
  SERIOUS_DATER = 'SERIOUS_DATER', // Looking for relationship
  CASUAL_BROWSER = 'CASUAL_BROWSER', // Low intent signals
  READY_TO_MEET = 'READY_TO_MEET', // High meeting readiness
}

export interface UserSegment {
  id: string;
  userId: string;
  segments: UserSegmentType[];
  primarySegment: UserSegmentType;

  // Engagement Metrics
  engagementScore: number; // 0-100
  activityLevel: 'high' | 'medium' | 'low' | 'none';
  lastActiveAt?: Date;
  daysActive: number;
  daysSinceLastActive: number;

  // Behavior Metrics
  totalSwipes: number;
  totalMatches: number;
  matchRate: number; // matches / swipes
  totalMessages: number;
  avgMessagesPerMatch: number;
  responseRate: number; // 0-1

  // Subscription Metrics
  subscriptionTier?: string;
  subscriptionStartDate?: Date;
  totalSpend: number;
  ltv: number; // Lifetime value
  ltvPredicted: number; // Predicted LTV

  // Profile Metrics
  profileCompletion: number; // 0-100
  photoCount: number;
  hasVerification: boolean;

  // Risk Indicators
  churnRisk: number; // 0-1
  upsellPotential: number; // 0-1

  // Timestamps
  segmentedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentationCriteria {
  // Engagement thresholds
  powerUserDaysActive: number; // Days active in last 30
  activeUserDaysActive: number;
  dormantDaysInactive: number;
  churnedDaysInactive: number;

  // Behavior thresholds
  swiperMinSwipes: number; // Min swipes/week
  matcherMinMatchRate: number; // Min match rate
  conversationalistMinMessages: number;
  ghostMaxResponseRate: number;

  // Value thresholds
  highLtvThreshold: number;
  mediumLtvThreshold: number;
  atRiskEngagementDrop: number; // % drop threshold
}

export interface SegmentAnalytics {
  segment: UserSegmentType;
  userCount: number;
  percentOfTotal: number;
  avgEngagementScore: number;
  avgLtv: number;
  avgMatchRate: number;
  conversionRate: number; // To paid
  churnRate: number;
}

export interface SegmentTransition {
  userId: string;
  fromSegment: UserSegmentType;
  toSegment: UserSegmentType;
  transitionedAt: Date;
  trigger?: string;
}

// =============================================
// CHURN PREDICTION ML
// =============================================

/**
 * Risk tier levels for churn prediction
 */
export enum ChurnRiskTier {
  LOW = 'LOW', // 0-25% churn probability
  MEDIUM = 'MEDIUM', // 25-50% churn probability
  HIGH = 'HIGH', // 50-75% churn probability
  CRITICAL = 'CRITICAL', // 75-100% churn probability
}

/**
 * Types of churn indicators
 */
export enum ChurnIndicatorType {
  LOGIN_FREQUENCY = 'LOGIN_FREQUENCY',
  DECLINING_ENGAGEMENT = 'DECLINING_ENGAGEMENT',
  PAYMENT_FAILURE = 'PAYMENT_FAILURE',
  MESSAGE_RESPONSE_RATE = 'MESSAGE_RESPONSE_RATE',
  SWIPE_ACTIVITY = 'SWIPE_ACTIVITY',
  PROFILE_COMPLETION = 'PROFILE_COMPLETION',
  SUBSCRIPTION_RENEWAL = 'SUBSCRIPTION_RENEWAL',
  SESSION_DURATION = 'SESSION_DURATION',
  MATCH_SUCCESS_RATE = 'MATCH_SUCCESS_RATE',
  APP_OPEN_FREQUENCY = 'APP_OPEN_FREQUENCY',
  FEATURE_USAGE = 'FEATURE_USAGE',
  SUPPORT_TICKETS = 'SUPPORT_TICKETS',
  NEGATIVE_FEEDBACK = 'NEGATIVE_FEEDBACK',
}

/**
 * Retention campaign types
 */
export enum RetentionCampaignType {
  REENGAGEMENT_EMAIL = 'REENGAGEMENT_EMAIL',
  PUSH_NOTIFICATION = 'PUSH_NOTIFICATION',
  IN_APP_MESSAGE = 'IN_APP_MESSAGE',
  DISCOUNT_OFFER = 'DISCOUNT_OFFER',
  PROFILE_BOOST = 'PROFILE_BOOST',
  FREE_SUPER_LIKES = 'FREE_SUPER_LIKES',
  PERSONALIZED_MATCHES = 'PERSONALIZED_MATCHES',
  WIN_BACK_CAMPAIGN = 'WIN_BACK_CAMPAIGN',
  FEEDBACK_REQUEST = 'FEEDBACK_REQUEST',
  FEATURE_EDUCATION = 'FEATURE_EDUCATION',
  VIP_SUPPORT = 'VIP_SUPPORT',
  SUBSCRIPTION_PAUSE = 'SUBSCRIPTION_PAUSE',
}

/**
 * Individual churn indicator with score and details
 */
export interface ChurnIndicator {
  type: ChurnIndicatorType;
  name: string;
  description: string;
  score: number; // 0-1, higher = worse (more likely to churn)
  weight: number; // Model weight for this indicator
  weightedScore: number; // score * weight
  trend: 'improving' | 'stable' | 'declining';
  severity: 'low' | 'medium' | 'high' | 'critical';
  dataPoints: {
    current: number;
    previous: number;
    average: number;
    percentile: number; // Where user stands vs all users
  };
  lastUpdated: Date;
}

/**
 * Feature weights for the churn prediction model
 */
export interface ChurnModelWeights {
  id: string;
  version: string;
  createdAt: Date;
  validFrom: Date;
  validUntil?: Date;
  isActive: boolean;

  weights: {
    [key in ChurnIndicatorType]: number;
  };

  // Model performance metrics
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;

  // Training metadata
  trainingDataSize: number;
  trainingPeriodStart: Date;
  trainingPeriodEnd: Date;
  modelType: 'logistic_regression' | 'gradient_boosting' | 'weighted_features';
}

/**
 * Complete churn risk result for a user
 */
export interface ChurnRiskResult {
  userId: string;
  riskScore: number; // 0-1 probability of churn
  riskTier: ChurnRiskTier;
  confidence: number; // 0-1 confidence in prediction

  // Breakdown
  indicators: ChurnIndicator[];
  topRiskFactors: ChurnIndicator[]; // Top 3-5 contributing factors
  positiveSignals: ChurnIndicator[]; // Factors reducing churn risk

  // Historical
  previousRiskScore?: number;
  riskTrend: 'increasing' | 'stable' | 'decreasing';
  daysSinceLastPrediction?: number;

  // Recommendations
  recommendedCampaigns: RetentionCampaignType[];
  interventionUrgency: 'immediate' | 'this_week' | 'this_month' | 'monitoring';

  // Metadata
  modelVersion: string;
  predictedAt: Date;
  nextPredictionAt: Date;
}

/**
 * At-risk user summary for admin dashboard
 */
export interface AtRiskUser {
  userId: string;
  email?: string;
  displayName?: string;

  riskScore: number;
  riskTier: ChurnRiskTier;
  riskTrend: 'increasing' | 'stable' | 'decreasing';

  // User value
  subscriptionTier?: string;
  ltv: number;
  monthsActive: number;

  // Key metrics
  daysSinceLastLogin: number;
  engagementScore: number;
  topRiskFactor: ChurnIndicatorType;

  // Intervention status
  lastCampaignType?: RetentionCampaignType;
  lastCampaignDate?: Date;
  campaignResponseStatus?: 'pending' | 'engaged' | 'no_response';

  predictedAt: Date;
}

/**
 * Churn analytics summary for dashboard
 */
export interface ChurnAnalyticsSummary {
  period: {
    startDate: Date;
    endDate: Date;
  };

  // Overall metrics
  totalUsersAnalyzed: number;
  atRiskUserCount: number;
  atRiskPercentage: number;

  // By tier
  tierDistribution: {
    [key in ChurnRiskTier]: {
      count: number;
      percentage: number;
      avgLtv: number;
    };
  };

  // Trends
  riskTrends: {
    date: Date;
    avgRiskScore: number;
    atRiskCount: number;
    churnedCount: number;
  }[];

  // Indicator analysis
  topRiskIndicators: {
    indicator: ChurnIndicatorType;
    avgScore: number;
    affectedUsers: number;
    contribution: number; // % contribution to overall churn risk
  }[];

  // Campaign effectiveness
  campaignMetrics: {
    campaignType: RetentionCampaignType;
    sent: number;
    engaged: number;
    retained: number;
    retentionRate: number;
  }[];

  // Predictions accuracy
  predictionAccuracy: {
    predicted: number;
    actualChurned: number;
    accuracy: number;
  };
}

/**
 * Historical churn prediction for a user
 */
export interface ChurnPredictionHistory {
  id: string;
  userId: string;
  riskScore: number;
  riskTier: ChurnRiskTier;
  indicators: ChurnIndicator[];
  modelVersion: string;
  predictedAt: Date;
  actualOutcome?: 'retained' | 'churned' | 'pending';
  outcomeDate?: Date;
}

/**
 * Retention campaign record
 */
export interface RetentionCampaignRecord {
  id: string;
  userId: string;
  campaignType: RetentionCampaignType;
  riskScoreAtTrigger: number;
  riskTierAtTrigger: ChurnRiskTier;

  // Campaign details
  triggeredAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  engagedAt?: Date;

  // Outcome
  status: 'pending' | 'sent' | 'delivered' | 'engaged' | 'failed' | 'expired';
  outcome?: 'retained' | 'churned' | 'pending';
  riskScoreAfter?: number;

  // Metadata
  metadata?: Record<string, any>;
  expiresAt: Date;
}

/**
 * User behavior features for ML model
 */
export interface UserBehaviorFeatures {
  userId: string;
  extractedAt: Date;

  // Login/Activity features
  daysSinceLastLogin: number;
  loginsLast7Days: number;
  loginsLast30Days: number;
  loginFrequencyTrend: number; // -1 to 1 (declining to improving)
  avgDaysBetweenLogins: number;

  // Session features
  avgSessionDurationMinutes: number;
  totalSessionsLast30Days: number;
  sessionDurationTrend: number;
  avgScreensPerSession: number;

  // Engagement features
  swipesLast7Days: number;
  swipesLast30Days: number;
  swipeActivityTrend: number;
  rightSwipeRatio: number;

  // Match features
  matchesLast30Days: number;
  matchRate: number;
  matchRateTrend: number;
  avgTimeToFirstMessage: number; // hours

  // Message features
  messagesSentLast30Days: number;
  messagesReceivedLast30Days: number;
  responseRate: number;
  responseRateTrend: number;
  avgResponseTimeHours: number;
  conversationsInitiated: number;

  // Profile features
  profileCompletionPercent: number;
  photoCount: number;
  lastProfileUpdateDays: number;
  hasVerification: boolean;
  bioLength: number;

  // Subscription features
  subscriptionTier: string;
  subscriptionAge: number; // days
  daysUntilRenewal: number;
  paymentFailuresLast90Days: number;
  hasActiveSubscription: boolean;
  previouslyPaidUser: boolean;

  // Feature usage
  usedBoostLast30Days: boolean;
  usedSuperLikeLast30Days: boolean;
  usedRewindLast30Days: boolean;
  premiumFeaturesUsed: number;

  // Support/Feedback
  supportTicketsLast90Days: number;
  appRating?: number;
  hasReportedIssue: boolean;

  // Derived features
  engagementScore: number; // 0-100
  valueScore: number; // 0-100
  satisfactionIndicator: number; // 0-100
}

/**
 * Model training data point
 */
export interface ChurnTrainingDataPoint {
  userId: string;
  features: UserBehaviorFeatures;
  label: 0 | 1; // 0 = retained, 1 = churned
  churnedWithinDays: number;
  extractedAt: Date;
}

/**
 * Scheduled churn prediction job
 */
export interface ChurnPredictionJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  usersProcessed: number;
  usersTotal: number;
  errorMessage?: string;
  modelVersion: string;
  createdAt: Date;
}

// =============================================
// API RESPONSES
// =============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
