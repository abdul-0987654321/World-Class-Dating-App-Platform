export interface Boost {
  id: string;
  userId: string;
  type: 'standard' | 'prime_time' | 'spotlight';
  status: 'pending' | 'active' | 'completed' | 'expired' | 'canceled';
  durationMinutes: number;
  visibilityMultiplier: number;
  startedAt?: Date;
  expiresAt?: Date;
  impressionsGained: number;
  likesGained: number;
  matchesGained: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoostCreateInput {
  userId: string;
  type: Boost['type'];
  durationMinutes: number;
  visibilityMultiplier: number;
}

export interface BoostUpdateInput {
  status?: Boost['status'];
  startedAt?: Date;
  expiresAt?: Date;
  impressionsGained?: number;
  likesGained?: number;
  matchesGained?: number;
}

export const BOOST_TYPES = {
  STANDARD: 'standard',
  PRIME_TIME: 'prime_time',
  SPOTLIGHT: 'spotlight',
} as const;

export const BOOST_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  CANCELED: 'canceled',
} as const;

// Check if boost is currently active
export function isBoostActive(boost: Boost): boolean {
  if (boost.status !== 'active') {
    return false;
  }

  if (!boost.expiresAt) {
    return false;
  }

  return new Date() < new Date(boost.expiresAt);
}

// Calculate boost expiry time
export function calculateBoostExpiry(startTime: Date, durationMinutes: number): Date {
  const expiry = new Date(startTime);
  expiry.setMinutes(expiry.getMinutes() + durationMinutes);
  return expiry;
}

// Calculate boost effectiveness (ROI metric)
export function calculateBoostEffectiveness(boost: Boost): number {
  if (boost.status !== 'completed') {
    return 0;
  }

  // Simple effectiveness score: (likes + matches * 2) / expected impressions
  const expectedImpressions = boost.durationMinutes * 10; // Assume 10 impressions per minute baseline
  const actualValue = boost.likesGained + boost.matchesGained * 2;

  return actualValue / expectedImpressions;
}

// Get boost time remaining in minutes
export function getTimeRemaining(boost: Boost): number {
  if (!boost.expiresAt || boost.status !== 'active') {
    return 0;
  }

  const now = new Date();
  const expiry = new Date(boost.expiresAt);
  const diff = expiry.getTime() - now.getTime();

  return Math.max(0, Math.ceil(diff / (1000 * 60)));
}
