export interface Match {
  id: string;
  userId1: string;
  userId2: string;
  score: number;
  status: MatchStatus;
  matchedAt: Date;
  expiresAt?: Date;
}

export enum MatchStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  UNMATCHED = 'unmatched',
}

export interface Swipe {
  id: string;
  swiperId: string;
  swipedId: string;
  action: SwipeAction;
  createdAt: Date;
}

export enum SwipeAction {
  LIKE = 'like',
  PASS = 'pass',
  SUPER_LIKE = 'super_like',
}

export interface MatchRecommendation {
  userId: string;
  recommendedUserId: string;
  score: number;
  reasons: string[];
  priority: number;
}

export interface CompatibilityScore {
  overall: number;
  personality: number;
  interests: number;
  values: number;
  lifestyle: number;
  location: number;
}
