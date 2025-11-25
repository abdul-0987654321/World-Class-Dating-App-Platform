/**
 * Service Exports
 * Central export point for all services
 */

export { apiClient, ApiError } from './api.client';
export { authService } from './auth.service';
export { discoveryService } from './discovery.service';
export { matchingService } from './matching.service';
export { messagingService } from './messaging.service';
export { profileService } from './profile.service';
export { subscriptionService } from './subscription.service';

// Re-export types
export type { User, LoginResponse, RegisterData } from './auth.service';
export {
  type DiscoveryProfile,
  type ProfilePhoto as DiscoveryProfilePhoto,
  type ProfilePrompt as DiscoveryProfilePrompt,
  type RecommendationsResponse,
  type SwipeResult,
} from './discovery.service';
export type {
  Match,
  MatchedUser,
  Like,
  MatchesResponse,
  LikesResponse,
} from './matching.service';
export type {
  Message,
  Conversation,
  Participant,
  ConversationsResponse,
  MessagesResponse,
} from './messaging.service';
export type {
  UserProfile,
  ProfilePhoto,
  ProfilePrompt,
  ProfileSettings,
  UpdateProfileData,
  UpdateSettingsData,
} from './profile.service';

// AI Services
export * from './ai';
