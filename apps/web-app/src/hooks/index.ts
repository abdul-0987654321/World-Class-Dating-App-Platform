/**
 * Custom Hooks
 * Export all custom hooks
 */

export {
  useFraudCheck,
  useLocationAnomalyCheck,
  useSentimentAnalysis,
  useToxicityDetection,
  usePhotoAnalysis,
  useRecommendations,
  useCompatibility,
} from './useAIServices';
export { useAdminUsers } from './useAdminUsers';
export { useAdminAuth, useAdminPermission } from './useAdminAuth';
export { usePushNotifications } from './usePushNotifications';
export { useCsrfToken } from './useCsrfToken';
export { useSocialAuth } from './useSocialAuth';
export { useUpgradeModal } from './useUpgradeModal';
export { useSession } from './useSession';
export { useVoiceControl } from './useVoiceControl';

// Media Messaging Hooks
export {
  useMediaMessaging,
  type PhotoUploadResult,
  type VoiceMessageResult,
  type GifResult,
  type TypingUser,
  type MediaFormats,
  type CompressionOptions,
} from './useMediaMessaging';

// Typing Indicator Hook
export {
  useTypingIndicator,
  type TypingIndicatorOptions,
  type UseTypingIndicatorReturn,
} from './useTypingIndicator';

// AI Coach Hook
export { useCoach } from './useCoach';

// Wellness Hooks
export { useWellness, useReadiness } from './useWellness';

// Conversation Intelligence Hooks
export {
  useConnectionScore,
  useGhostPrevention,
  useIntent,
  useFeedback,
} from './useConversationIntelligence';
