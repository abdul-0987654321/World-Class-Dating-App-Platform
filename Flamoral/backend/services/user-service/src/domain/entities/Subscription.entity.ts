export interface Subscription {
  id: string;
  userId: string;
  tier: 'free' | 'basic' | 'plus' | 'premium' | 'premium_plus' | 'elite';
  status: 'active' | 'canceled' | 'expired' | 'past_due' | 'trialing' | 'grace_period';
  billingCycle: 'monthly' | '3_months' | '6_months' | 'yearly';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  stripePriceId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  gracePeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionCreateInput {
  userId: string;
  tier: Subscription['tier'];
  billingCycle?: Subscription['billingCycle'];
  stripePriceId?: string;
  trialDays?: number;
}

export interface SubscriptionUpdateInput {
  tier?: Subscription['tier'];
  status?: Subscription['status'];
  billingCycle?: Subscription['billingCycle'];
  cancelAtPeriodEnd?: boolean;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  gracePeriodEnd?: Date;
}

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PLUS: 'plus',
  PREMIUM: 'premium',
  PREMIUM_PLUS: 'premium_plus',
  ELITE: 'elite',
} as const;

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  CANCELED: 'canceled',
  EXPIRED: 'expired',
  PAST_DUE: 'past_due',
  TRIALING: 'trialing',
  GRACE_PERIOD: 'grace_period',
} as const;

export const BILLING_CYCLES = {
  MONTHLY: 'monthly',
  THREE_MONTHS: '3_months',
  SIX_MONTHS: '6_months',
  YEARLY: 'yearly',
} as const;

// Tier hierarchy for upgrade/downgrade logic
export const TIER_HIERARCHY: Record<string, number> = {
  free: 0,
  basic: 1,
  plus: 2,
  premium: 3,
  premium_plus: 4,
  elite: 5,
};

// Grace period in days (applies to all paid tiers)
export const GRACE_PERIOD_DAYS = 3;

// Trial days by tier
export const TRIAL_DAYS_BY_TIER: Record<string, number> = {
  free: 0,
  basic: 7,
  plus: 7,
  premium: 14,
  premium_plus: 14,
  elite: 14,
};
