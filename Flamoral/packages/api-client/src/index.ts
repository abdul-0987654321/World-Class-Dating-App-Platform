/**
 * API Client Package
 */

// Core client
export { ApiClient, initApiClient, getApiClient } from './client';
export type { ApiClientConfig, ApiError } from './client';

// User hooks
export {
  useCurrentUser,
  useUser,
  useUserPreferences,
  useUpdateProfile,
  useUpdatePreferences,
  useUploadPhoto,
  useDeletePhoto,
  useReorderPhotos,
  useBlockUser,
  useUnblockUser,
  useReportUser,
  userKeys,
} from './hooks/useUser';
export type {
  User,
  Photo,
  Location,
  Prompt,
  Lifestyle,
  Verification,
  UserPreferences,
} from './hooks/useUser';

// Matching hooks
export {
  useRecommendations,
  useSwipe,
  useMatches,
  useLikes,
  useUnmatch,
  useUndoSwipe,
  useBoostProfile,
  useMatchingStats,
  matchingKeys,
} from './hooks/useMatching';
export type {
  ProfileCard,
  Match,
  MatchedUser,
  Like,
  SwipeAction,
  SwipeResponse,
} from './hooks/useMatching';

// Message hooks
export {
  useConversations,
  useConversation,
  useMessages,
  useSendMessage,
  useMarkAsRead,
  useDeleteMessage,
  useReactToMessage,
  useUnreadCount,
  useMuteConversation,
  messageKeys,
} from './hooks/useMessages';
export type {
  Conversation,
  Participant,
  Message,
  MessageMetadata,
  Reaction,
} from './hooks/useMessages';

// Re-export React Query
export {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
