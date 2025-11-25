import { SetMetadata } from '@nestjs/common';

export enum SubscriptionTier {
  FREE = 'FREE',
  PLUS = 'PLUS',
  PREMIUM = 'PREMIUM',
  VIP = 'VIP',
}

export const SUBSCRIPTION_KEY = 'subscription';
export const RequireSubscription = (tier: SubscriptionTier) =>
  SetMetadata(SUBSCRIPTION_KEY, tier);
