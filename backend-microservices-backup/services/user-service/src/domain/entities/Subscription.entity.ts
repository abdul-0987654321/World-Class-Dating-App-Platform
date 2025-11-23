export interface Subscription {
  id: string;
  userId: string;
  tier: 'free' | 'basic' | 'mid' | 'ultra';
  status: 'active' | 'canceled' | 'expired' | 'past_due' | 'trialing';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  stripePriceId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
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
  stripePriceId?: string;
  trialDays?: number;
}

export interface SubscriptionUpdateInput {
  tier?: Subscription['tier'];
  status?: Subscription['status'];
  cancelAtPeriodEnd?: boolean;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  MID: 'mid',
  ULTRA: 'ultra',
} as const;

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  CANCELED: 'canceled',
  EXPIRED: 'expired',
  PAST_DUE: 'past_due',
  TRIALING: 'trialing',
} as const;
