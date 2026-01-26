/**
 * Service Exports
 * Central export point for all services
 */

// Core Services
export { apiClient, ApiError } from './api.client';
export { authService } from './auth.service';
export { authTokenService } from './auth-token.service';
export { discoveryService } from './discovery.service';
export { matchingService } from './matching.service';
export { messagingService } from './messaging.service';
export { profileService } from './profile.service';
export { subscriptionService } from './subscription.service';

// Feature Services
export { gamificationService } from './gamification.service';
export { communitiesService } from './communities.service';
export { speedDatingService } from './speed-dating.service';
export { referralService } from './referral.service';
export { coachService } from './coach.service';

// Discovery Feature Services
export { curatedPicksService } from './curated-picks.service';
export { passportService } from './passport.service';

// Safety & Moderation Services
export { safetyService } from './safety.service';
export { moderationService } from './moderation.service';
export { reportService } from './report.service';
export { blockService } from './block.service';
export { privacyService } from './privacy.service';

// Premium Services
export { boostService } from './boost.service';
export { coinService, type CoinBalance } from './coin.service';
export { usageLimitService } from './usage-limit.service';

// Socket Service
export { socketService } from './socket.service';

// Re-export types from auth service
export type {
  User,
  LoginResponse,
  RegisterData,
  Entitlements,
  SessionResponse,
} from './auth.service';

// Re-export types from discovery service
export {
  type DiscoveryProfile,
  type ProfilePhoto as DiscoveryProfilePhoto,
  type ProfilePrompt as DiscoveryProfilePrompt,
  type RecommendationsResponse,
  type DiscoveryFeedResponse,
  type SwipeResult,
} from './discovery.service';

// Re-export types from matching service
export type { Match, MatchedUser, Like, MatchesResponse, LikesResponse } from './matching.service';

// Re-export types from messaging service
export type {
  Message,
  Conversation,
  Participant,
  ConversationsResponse,
  MessagesResponse,
} from './messaging.service';

// Re-export types from profile service
export type {
  UserProfile,
  ProfilePhoto,
  ProfilePrompt,
  ProfileSettings,
  UpdateProfileData,
  UpdateSettingsData,
} from './profile.service';

// Re-export types from gamification service
export type {
  Streak,
  Achievement,
  Quest,
  WalletBalance,
  SpinWheelResult,
  DailyReward,
  LeaderboardEntry,
} from './gamification.service';

// Re-export types from communities service
export type {
  Community,
  CommunityMember,
  Post,
  Comment,
  CommunityEvent,
} from './communities.service';

// Re-export types from speed dating service
export type {
  SpeedDatingEvent,
  SpeedDatingRound,
  SpeedDatingMatch,
  SpeedDatingInterest,
  SpeedDatingStats,
} from './speed-dating.service';

// Re-export types from referral service
export type {
  ReferralCode,
  Referral,
  ReferralTier,
  ReferralStats,
  ReferralLeaderboardEntry,
} from './referral.service';

// Re-export types from curated picks service
export type {
  CuratedPick,
  CuratedPickProfile,
  CuratedPicksResponse,
} from './curated-picks.service';

// Re-export types from passport service
export type { PassportLocation, PopularDestination, PassportStatus } from './passport.service';

// Policy Service
export { policyService } from './policy.service';
export type { Policy, PolicySection, PolicyMetadata, PolicyVersion } from './policy.service';

// AI Coach Service Types
export type {
  IcebreakerRequest,
  IcebreakerResponse,
  ResponseSuggestionRequest,
  ResponseSuggestionResponse,
  ProfileTipRequest,
  ProfileTipResponse,
  DateIdeaRequest,
  DateIdeaResponse,
  UsageResponse,
} from './coach.service';

// AI Services
export * from './ai';

// Novel Feature Services
export { wellnessService } from './wellness.service';
export { conversationIntelligenceService } from './conversation-intelligence.service';

// Re-export types from wellness service
export type {
  WellnessMetrics,
  WellnessDashboardData,
  MoodCheckin,
  DatingSabbatical,
  HealthAlert,
  WellnessRecommendation,
  ReadinessAssessment,
  ReadinessQuestion,
  RejectionEvent,
  RejectionRecovery,
} from './wellness.service';

// Re-export types from conversation intelligence service
export type {
  ConnectionScore,
  ConnectionHighlight,
  ConversationAnalysis,
  TopicAnalysis,
  ConversationSuggestion,
  GhostRiskAssessment,
  GhostRiskFactor,
  GhostIntervention,
  GracefulExitRequest,
  GracefulExitResponse,
  ExitTemplate,
  UserIntent,
  IntentMatch,
  IntentOption,
  AggregatedFeedback,
} from './conversation-intelligence.service';
