import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SUBSCRIPTION_KEY, SubscriptionTier } from '../decorators/subscription.decorator';

// Tier hierarchy for comparison
const TIER_HIERARCHY: Record<string, number> = {
  free: 0,
  basic: 1,
  plus: 2,
  premium: 3,
  premium_plus: 4,
  elite: 5,
};

// Human-readable tier names
const TIER_NAMES: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  plus: 'Plus',
  premium: 'Premium',
  premium_plus: 'Premium Plus',
  elite: 'Elite',
};

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTier = this.reflector.getAllAndOverride<SubscriptionTier>(SUBSCRIPTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredTier) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    const userTier = user.subscription?.toLowerCase() || 'free';
    const userTierLevel = TIER_HIERARCHY[userTier] ?? 0;
    const requiredTierLevel = TIER_HIERARCHY[requiredTier.toLowerCase()] ?? 0;

    if (userTierLevel < requiredTierLevel) {
      // Return 402 Payment Required with upgrade info
      throw new HttpException(
        {
          code: 'UPGRADE_REQUIRED',
          message: `This feature requires a ${TIER_NAMES[requiredTier] || requiredTier} subscription or higher. Please upgrade to access this feature.`,
          required_plan: requiredTier,
          current_plan: userTier,
        },
        HttpStatus.PAYMENT_REQUIRED
      );
    }

    return true;
  }
}
