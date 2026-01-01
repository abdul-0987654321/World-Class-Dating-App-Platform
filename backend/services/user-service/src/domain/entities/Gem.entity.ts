/**
 * Gem Entity
 * Premium currency earned through achievements and challenges
 * More valuable than coins - used for exclusive features
 */

export interface Gem {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GemCreateInput {
  userId: string;
  initialBalance?: number;
}

export interface GemUpdateInput {
  balance?: number;
  totalEarned?: number;
  totalSpent?: number;
}

// Gem prices for premium features
export const GEM_PRICES = {
  // Discovery & Visibility
  PRIORITY_QUEUE_24H: 10,        // Priority in discovery queue for 24 hours
  PROFILE_SPOTLIGHT_24H: 15,     // Featured placement for 24 hours
  SUPER_SPOTLIGHT_48H: 25,       // Extended featured placement

  // Profile Enhancements
  EXCLUSIVE_FRAME_7D: 20,        // Exclusive profile frame for 7 days
  EXCLUSIVE_FRAME_30D: 50,       // Exclusive profile frame for 30 days
  PROFILE_BADGE_PERMANENT: 100,  // Permanent exclusive badge

  // Communication
  PREMIUM_ICEBREAKER_PACK: 5,    // Pack of 5 premium icebreaker messages
  UNLIMITED_MESSAGES_24H: 15,    // Unlimited messages for 24 hours (non-premium)

  // Insights
  SEE_WHO_LIKED_YOU: 25,         // See who liked you (if not premium)
  WEEKLY_INSIGHTS_REPORT: 10,    // Detailed weekly dating insights

  // Matching
  MATCH_EXTENSION_24H: 10,       // Extend match expiration by 24 hours
  REMATCH_PREMIUM: 20,           // Re-match with someone who unmatched

  // Virtual Gifts (send to matches)
  GIFT_ROSE: 5,
  GIFT_HEART: 10,
  GIFT_DIAMOND: 25,
  GIFT_CROWN: 50,
} as const;

// Gem spending categories
export type GemSpendingCategory =
  | 'visibility'
  | 'profile'
  | 'communication'
  | 'insights'
  | 'matching'
  | 'gifts';

export interface GemTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'earned' | 'spent' | 'purchased' | 'bonus' | 'refund';
  category?: GemSpendingCategory;
  itemType?: keyof typeof GEM_PRICES;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Helper functions
export function hasEnoughGems(gem: Gem, amount: number): boolean {
  return gem.balance >= amount;
}

export function calculateGemBalance(
  currentBalance: number,
  amount: number,
  isDebit: boolean
): number {
  if (isDebit) {
    const newBalance = currentBalance - amount;
    if (newBalance < 0) {
      throw new Error('Insufficient gem balance');
    }
    return newBalance;
  }
  return currentBalance + amount;
}

export function getGemItemPrice(itemType: keyof typeof GEM_PRICES): number {
  return GEM_PRICES[itemType];
}

export function getGemSpendingCategory(itemType: keyof typeof GEM_PRICES): GemSpendingCategory {
  const categoryMap: Record<keyof typeof GEM_PRICES, GemSpendingCategory> = {
    PRIORITY_QUEUE_24H: 'visibility',
    PROFILE_SPOTLIGHT_24H: 'visibility',
    SUPER_SPOTLIGHT_48H: 'visibility',
    EXCLUSIVE_FRAME_7D: 'profile',
    EXCLUSIVE_FRAME_30D: 'profile',
    PROFILE_BADGE_PERMANENT: 'profile',
    PREMIUM_ICEBREAKER_PACK: 'communication',
    UNLIMITED_MESSAGES_24H: 'communication',
    SEE_WHO_LIKED_YOU: 'insights',
    WEEKLY_INSIGHTS_REPORT: 'insights',
    MATCH_EXTENSION_24H: 'matching',
    REMATCH_PREMIUM: 'matching',
    GIFT_ROSE: 'gifts',
    GIFT_HEART: 'gifts',
    GIFT_DIAMOND: 'gifts',
    GIFT_CROWN: 'gifts',
  };
  return categoryMap[itemType];
}
