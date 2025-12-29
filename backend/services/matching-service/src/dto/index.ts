/**
 * Matching Service DTOs
 *
 * This module exports all DTOs (Data Transfer Objects) used for request validation
 * in the matching service. All DTOs use class-validator decorators for validation.
 *
 * Security Notes:
 * - User identity (userId) is NEVER accepted from request bodies; it is always
 *   derived from the authenticated user's JWT token in the auth middleware.
 * - Server-owned fields (id, createdAt, role, subscriptionTier, credits, etc.)
 *   are not included in any DTO to prevent mass assignment attacks.
 */

// Swipe DTOs
export { SwipeDto } from './swipe.dto';

// Super Like DTOs
export {
  SendSuperLikeDto,
  GetReceivedSuperLikesQueryDto,
  GetSentSuperLikesQueryDto,
} from './super-like.dto';

// Discovery DTOs
export {
  DiscoveryFeedQueryDto,
  DiscoveryLikeDto,
  DiscoveryPassDto,
  DiscoverySuperLikeDto,
} from './discovery.dto';

// Boost DTOs
export {
  ActivateBoostDto,
  CancelBoostDto,
  BoostHistoryQueryDto,
} from './boost.dto';

// Insights DTOs
export {
  InsightPeriod,
  ViewSource,
  ProfileInsightsQueryDto,
  WhoViewedMeQueryDto,
  WhoLikedYouQueryDto,
  TrackProfileViewDto,
} from './insights.dto';

// Match DTOs
export { GetMatchesQueryDto, RecentMatchesQueryDto } from './match.dto';

// Recommendation DTOs
export { GetRecommendationsQueryDto, GetTopMatchesQueryDto } from './recommendation.dto';
