import { SwipeAction } from '../../types';

/**
 * SwipeHistory Entity
 *
 * Represents a historical record of a user's swipe action.
 * Used for the rewind feature to undo previous swipes.
 */
export class SwipeHistory {
  id: string;
  userId: string;
  targetUserId: string;
  action: SwipeAction;
  originalSwipeId: string | null;
  rewound: boolean;
  rewoundAt: Date | null;
  resultedInMatch: boolean;
  matchId: string | null;
  createdAt: Date;

  constructor(data: {
    id: string;
    userId: string;
    targetUserId: string;
    action: SwipeAction;
    originalSwipeId?: string | null;
    rewound?: boolean;
    rewoundAt?: Date | null;
    resultedInMatch?: boolean;
    matchId?: string | null;
    createdAt: Date;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.targetUserId = data.targetUserId;
    this.action = data.action;
    this.originalSwipeId = data.originalSwipeId || null;
    this.rewound = data.rewound || false;
    this.rewoundAt = data.rewoundAt || null;
    this.resultedInMatch = data.resultedInMatch || false;
    this.matchId = data.matchId || null;
    this.createdAt = data.createdAt;
  }

  /**
   * Check if this swipe was a like (like or super_like)
   */
  isLike(): boolean {
    return this.action === SwipeAction.LIKE || this.action === SwipeAction.SUPER_LIKE;
  }

  /**
   * Check if this was a super like
   */
  isSuperLike(): boolean {
    return this.action === SwipeAction.SUPER_LIKE;
  }

  /**
   * Check if this swipe is still rewindable (not already rewound)
   */
  isRewindable(): boolean {
    return !this.rewound;
  }

  /**
   * Get time since swipe in milliseconds
   */
  getAgeMs(): number {
    return Date.now() - this.createdAt.getTime();
  }

  /**
   * Check if swipe is within rewind window (e.g., 3 hours)
   */
  isWithinRewindWindow(windowMs: number = 3 * 60 * 60 * 1000): boolean {
    return this.getAgeMs() <= windowMs;
  }
}

/**
 * RewindUsage Entity
 *
 * Tracks when a user uses the rewind feature for tier-based limits.
 */
export class RewindUsage {
  id: string;
  userId: string;
  swipeHistoryId: string;
  usageDate: Date;
  subscriptionTier: string;
  createdAt: Date;

  constructor(data: {
    id: string;
    userId: string;
    swipeHistoryId: string;
    usageDate: Date;
    subscriptionTier: string;
    createdAt: Date;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.swipeHistoryId = data.swipeHistoryId;
    this.usageDate = data.usageDate;
    this.subscriptionTier = data.subscriptionTier;
    this.createdAt = data.createdAt;
  }
}
