export interface UsageLimit {
  id: string;
  userId: string;
  resourceType: 'swipes' | 'likes' | 'super_likes' | 'rewinds' | 'boosts';
  dailyLimit: number;
  currentUsage: number;
  resetAt: Date;
  lastResetAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageLimitCreateInput {
  userId: string;
  resourceType: UsageLimit['resourceType'];
  dailyLimit: number;
}

export interface UsageLimitUpdateInput {
  dailyLimit?: number;
  currentUsage?: number;
  resetAt?: Date;
}

export const RESOURCE_TYPES = {
  SWIPES: 'swipes',
  LIKES: 'likes',
  SUPER_LIKES: 'super_likes',
  REWINDS: 'rewinds',
  BOOSTS: 'boosts',
} as const;

// Default limits for free tier
export const FREE_TIER_LIMITS = {
  [RESOURCE_TYPES.SWIPES]: 50,
  [RESOURCE_TYPES.LIKES]: 50,
  [RESOURCE_TYPES.SUPER_LIKES]: 1,
  [RESOURCE_TYPES.REWINDS]: 1,
  [RESOURCE_TYPES.BOOSTS]: 0,
} as const;

// Check if limit is reached
export function isLimitReached(usageLimit: UsageLimit): boolean {
  // -1 or Infinity means unlimited
  if (usageLimit.dailyLimit === -1 || usageLimit.dailyLimit === Infinity) {
    return false;
  }

  return usageLimit.currentUsage >= usageLimit.dailyLimit;
}

// Check if limit needs reset
export function needsReset(usageLimit: UsageLimit): boolean {
  return new Date() >= new Date(usageLimit.resetAt);
}

// Calculate next reset time (midnight next day)
export function getNextResetTime(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}
