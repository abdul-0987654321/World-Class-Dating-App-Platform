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
  step: keyof Omit<ConversionFunnel, 'id' | 'userId' | 'sessionId' | 'timeToRegister' | 'timeToVerify' | 'timeToProfile' | 'timeToMatch' | 'timeToSubscribe' | 'droppedAtStep' | 'completed' | 'utmSource' | 'utmCampaign' | 'createdAt' | 'updatedAt'>;
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
  POWER_USER = 'POWER_USER',           // Daily active, high engagement
  ACTIVE_USER = 'ACTIVE_USER',          // Weekly active
  CASUAL_USER = 'CASUAL_USER',          // Monthly active
  DORMANT_USER = 'DORMANT_USER',        // 30+ days inactive
  CHURNED_USER = 'CHURNED_USER',        // 90+ days inactive

  // Subscription Segments
  FREE_USER = 'FREE_USER',
  TRIAL_USER = 'TRIAL_USER',
  PAID_USER = 'PAID_USER',
  PREMIUM_USER = 'PREMIUM_USER',        // High-tier subscription
  LAPSED_SUBSCRIBER = 'LAPSED_SUBSCRIBER',

  // Behavior Segments
  SWIPER = 'SWIPER',                    // High swipe activity
  MATCHER = 'MATCHER',                   // High match rate
  CONVERSATIONALIST = 'CONVERSATIONALIST', // High message engagement
  PROFILE_BUILDER = 'PROFILE_BUILDER',   // Complete profile, regular updates
  GHOST = 'GHOST',                       // Matches but doesn't message

  // Lifecycle Segments
  NEW_USER = 'NEW_USER',                 // < 7 days
  ONBOARDING = 'ONBOARDING',             // Incomplete profile
  ESTABLISHED = 'ESTABLISHED',           // 30+ days, complete profile
  VETERAN = 'VETERAN',                   // 180+ days active

  // Value Segments
  HIGH_LTV = 'HIGH_LTV',                 // High lifetime value
  MEDIUM_LTV = 'MEDIUM_LTV',
  LOW_LTV = 'LOW_LTV',
  AT_RISK = 'AT_RISK',                   // Declining engagement

  // Intent Segments
  SERIOUS_DATER = 'SERIOUS_DATER',       // Looking for relationship
  CASUAL_BROWSER = 'CASUAL_BROWSER',     // Low intent signals
  READY_TO_MEET = 'READY_TO_MEET',       // High meeting readiness
}

export interface UserSegment {
  id: string;
  userId: string;
  segments: UserSegmentType[];
  primarySegment: UserSegmentType;

  // Engagement Metrics
  engagementScore: number;          // 0-100
  activityLevel: 'high' | 'medium' | 'low' | 'none';
  lastActiveAt?: Date;
  daysActive: number;
  daysSinceLastActive: number;

  // Behavior Metrics
  totalSwipes: number;
  totalMatches: number;
  matchRate: number;                // matches / swipes
  totalMessages: number;
  avgMessagesPerMatch: number;
  responseRate: number;             // 0-1

  // Subscription Metrics
  subscriptionTier?: string;
  subscriptionStartDate?: Date;
  totalSpend: number;
  ltv: number;                      // Lifetime value
  ltvPredicted: number;             // Predicted LTV

  // Profile Metrics
  profileCompletion: number;        // 0-100
  photoCount: number;
  hasVerification: boolean;

  // Risk Indicators
  churnRisk: number;                // 0-1
  upsellPotential: number;          // 0-1

  // Timestamps
  segmentedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentationCriteria {
  // Engagement thresholds
  powerUserDaysActive: number;      // Days active in last 30
  activeUserDaysActive: number;
  dormantDaysInactive: number;
  churnedDaysInactive: number;

  // Behavior thresholds
  swiperMinSwipes: number;          // Min swipes/week
  matcherMinMatchRate: number;      // Min match rate
  conversationalistMinMessages: number;
  ghostMaxResponseRate: number;

  // Value thresholds
  highLtvThreshold: number;
  mediumLtvThreshold: number;
  atRiskEngagementDrop: number;     // % drop threshold
}

export interface SegmentAnalytics {
  segment: UserSegmentType;
  userCount: number;
  percentOfTotal: number;
  avgEngagementScore: number;
  avgLtv: number;
  avgMatchRate: number;
  conversionRate: number;           // To paid
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
