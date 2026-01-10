export { useAuth } from "./useAuth";
export { useNetworkStatus } from "./useNetworkStatus";
export { useKeyboard } from "./useKeyboard";

// Communities hooks
export { useCommunities } from "./useCommunities";
export { useCommunityDetail } from "./useCommunityDetail";
export { useCommunityEvents } from "./useCommunityEvents";

// Re-export types
export type { Community, CommunityCategory } from "./useCommunities";
export type { CommunityPost, CommunityMember, CommunityRule } from "./useCommunityDetail";
export type { CommunityEvent, EventAttendee, CreateEventInput } from "./useCommunityEvents";
