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
