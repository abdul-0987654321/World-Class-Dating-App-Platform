export { useAuth } from "./useAuth";
export { useNetworkStatus } from "./useNetworkStatus";
export { useKeyboard } from "./useKeyboard";

// Communities hooks
export { useCommunities } from "./useCommunities";
export { useCommunityDetail } from "./useCommunityDetail";
export { useCommunityEvents } from "./useCommunityEvents";

// Gamification hooks
export { useGamification } from "./useGamification";
export { useAchievements } from "./useAchievements";
export { useQuests } from "./useQuests";
export { useStreaks } from "./useStreaks";

// Re-export types
export type { Community, CommunityCategory } from "./useCommunities";
export type { CommunityPost, CommunityMember, CommunityRule } from "./useCommunityDetail";
export type { CommunityEvent, EventAttendee, CreateEventInput } from "./useCommunityEvents";

// Gamification types
export type {
  GamificationDashboard,
  Streak,
  Achievement,
  Quest,
  WalletBalance,
  LevelInfo,
  DailyRewards,
  SpinResult,
} from "./useGamification";
export type { Achievement as AchievementDetail, AchievementCategory, AchievementStats } from "./useAchievements";
export type { Quest as QuestDetail, QuestStats } from "./useQuests";
export type { Streak as StreakDetail, StreakCalendarDay, StreakMilestone, StreakStats } from "./useStreaks";
