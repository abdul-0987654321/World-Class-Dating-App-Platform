/**
 * Mobile App Components Index
 * Centralized exports for all components
 *
 * Note: Some components export the same type names (UserProfile, MatchScore, Message).
 * Use explicit imports when importing these types to avoid conflicts.
 */

// Common UI Components
export * from './common/Button';
export * from './common/Input';

// Auth Components
export * from './auth/AgeGate';
export * from './auth/PhoneVerification';

// Verification Components
export * from './verification/PhotoVerification';
export * from './verification/VerificationBadges';

// Discovery Components
export * from './discovery/AdvancedFilters';
export * from './discovery/DiscoveryStack';
export { ProfileDetails } from './discovery/ProfileDetails';
export type { UserProfile as ProfileDetailsUserProfile } from './discovery/ProfileDetails';
export * from './discovery/SwipeCard';

// Matching Components - export component and types with explicit names to avoid conflicts
export { default as SmartMatchingAlgorithm } from './matching/SmartMatchingAlgorithm';
export type { MatchScore as SmartMatchScore } from './matching/SmartMatchingAlgorithm';

// Media Components
export * from './media/PhotoGallery';
export * from './media/PhotoUpload';
export * from './media/VideoProfile';

// Messaging Components - export components with explicit names to avoid type conflicts
export { default as ConversationFlowAnalyzer } from './messaging/ConversationFlowAnalyzer';
export * from './messaging/ConversationList';
export { Icebreakers } from './messaging/Icebreakers';
export type { UserProfile as IcebreakersUserProfile } from './messaging/Icebreakers';
export { MessageThread } from './messaging/MessageThread';
export type { Message as ThreadMessage, MessageStatus, MessageType } from './messaging/MessageThread';

// Monetization Components
export * from './monetization/BoostCard';
export * from './monetization/CoinShop';
export * from './monetization/Gifts';
export * from './monetization/PromotedProfile';
export * from './monetization/SubscriptionTiers';

// Profile Components
export * from './profile/PhotoSelectionAssistant';
export * from './profile/ProfileWritingAssistant';

// Safety Components
export * from './safety/EnhancedScamDetection';
export * from './safety/SafetyToolkit';
export * from './safety/ReportUser';
export * from './safety/BlockUser';

// Settings Components
export * from './settings/Limits';
export * from './settings/NotificationSettings';
export * from './settings/PrivacySettings';

// Video Call Components
export * from './VideoCall';

// AI Components - export components and types with explicit names to avoid conflicts
// Components with default exports
export { default as AIDatePlanner } from './ai/AIDatePlanner';
export { default as ChemistryPrediction } from './ai/ChemistryPrediction';
export { default as DatingCoachChatbot } from './ai/DatingCoachChatbot';
export { default as GhostingPrediction } from './ai/GhostingPrediction';
export { default as MeetingReadinessDetector } from './ai/MeetingReadinessDetector';
// Components with named exports
export { ConversationStarterGenerator } from './ai/ConversationStarterGenerator';
export type { UserProfile as ConversationStarterUserProfile } from './ai/ConversationStarterGenerator';
export { PersonalityInsights } from './ai/PersonalityInsights';
export type { UserProfile as PersonalityInsightsUserProfile } from './ai/PersonalityInsights';
export { SemanticMatchScoring } from './ai/SemanticMatchScoring';
export type {
  UserProfile as SemanticUserProfile,
  MatchScore as SemanticMatchScore
} from './ai/SemanticMatchScoring';
export { SmartReplySuggestions } from './ai/SmartReplySuggestions';
export { ToxicityDetection } from './ai/ToxicityDetection';
