import { SetMetadata } from '@nestjs/common';

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PLUS = 'plus',
  PREMIUM = 'premium',
  PREMIUM_PLUS = 'premium_plus',
  ELITE = 'elite',
}

export const SUBSCRIPTION_KEY = 'subscription';
export const RequireSubscription = (tier: SubscriptionTier) =>
  SetMetadata(SUBSCRIPTION_KEY, tier);
