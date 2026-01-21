/**
 * Animation Components Index
 *
 * High-performance animation system for Flamoral web app
 *
 * @package @flamoral/web
 */

// Card swipe animations
export {
  SwipeCardAnimated,
  SwipeDeck,
  type Profile as SwipeProfile,
  type SwipeCardAnimatedProps,
  type SwipeDeckProps,
} from './SwipeCardAnimated';

// Match celebration
export { MatchCelebration, type MatchCelebrationProps } from './MatchCelebration';

// Message animations
export {
  MessageBubbleAnimated,
  MessageListAnimated,
  TypingIndicator,
  SendButtonAnimated,
  type Message,
  type MessageStatus,
  type MessageBubbleProps,
  type MessageListProps,
  type TypingIndicatorProps,
  type SendButtonProps,
} from './MessageBubbleAnimated';

// Micro-interactions
export {
  LikeButton,
  SuperLikeButton,
  BoostButton,
  NotificationBadge,
  Skeleton,
  ProfileCardSkeleton,
  ConversationSkeleton,
  LoadingSpinner,
  type LikeButtonProps,
  type SuperLikeButtonProps,
  type BoostButtonProps,
  type NotificationBadgeProps,
  type SkeletonProps,
  type LoadingSpinnerProps,
} from './MicroInteractions';
