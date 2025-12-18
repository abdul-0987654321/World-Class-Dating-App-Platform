# Subscription Tier Alignment - Data Model Fix

## Overview

This document describes the subscription tier alignment performed to fix the mismatch between database schema and application code.

## Problem Statement

The application had inconsistent subscription tier definitions across different parts of the codebase:

### Before Fix

| Component | Tiers | Count |
|-----------|-------|-------|
| Database (main migration) | `free`, `basic`, `mid`, `ultra` | 4 |
| Code (backend/shared/utils) | `free`, `basic`, `plus`, `premium`, `premium_plus`, `elite` | 6 |
| User-service migration | `free`, `basic`, `mid`, `ultra` | 4 |
| Web app | `FREE`, `GOLD`, `PLATINUM`, `DIAMOND` | 4 |
| Mobile app | `free`, `premium`, `premium_plus` | 3 |
| API Gateway decorator | `FREE`, `PLUS`, `PREMIUM`, `VIP` | 4 |
| Rate limit config | `FREE`, `PLUS`, `GOLD`, `PLATINUM`, `DIAMOND` | 5 |
| Shared types | `free`, `premium`, `premium_plus` | 3 |

This mismatch caused:
- Payment processing errors (tier not found in database)
- Feature access issues (code checking for tiers that don't exist in DB)
- Inconsistent subscription upgrades/downgrades
- Failed subscription tier validations

## Solution

All components have been aligned to use a standardized **6-tier subscription model**:

### After Fix - Standardized 6-Tier Model

```typescript
// Tier hierarchy (from lowest to highest)
const TIERS = [
  'free',         // 0 - Free tier
  'basic',        // 1 - Entry-level paid ($9.99/month)
  'plus',         // 2 - Enhanced features ($14.99/month)
  'premium',      // 3 - Full features ($19.99/month)
  'premium_plus', // 4 - Power user ($29.99/month)
  'elite'         // 5 - VIP tier ($49.99/month)
];
```

## Tier Feature Matrix

| Feature | Free | Basic | Plus | Premium | Premium+ | Elite |
|---------|------|-------|------|---------|----------|-------|
| **Daily Swipes** | 50 | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |
| **Daily Super Likes** | 1 | 5 | 10 | Unlimited | Unlimited | Unlimited |
| **See Who Likes You** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Rewind** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Monthly Boosts** | 0 | 1 | 1 | 2 | 4 | 12 |
| **Incognito Mode** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Priority Likes** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Read Receipts** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Passport (Location)** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Advanced Filters** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Unlimited Rewinds** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Message Before Match** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Profile Visitors** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Priority Support** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **VIP Badge** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Dedicated Account Manager** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Early Access Features** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## Pricing Structure

| Tier | Monthly | Yearly | 3-Month | 6-Month |
|------|---------|--------|---------|---------|
| **Free** | $0 | $0 | $0 | $0 |
| **Basic** | $9.99 | $95.88 | $26.97 | - |
| **Plus** | $14.99 | $143.88 | $40.47 | $71.94 |
| **Premium** | $19.99 | $191.88 | $53.97 | $95.94 |
| **Premium+** | $29.99 | $287.88 | $80.97 | $143.94 |
| **Elite** | $49.99 | $479.88 | $134.97 | $239.94 |

## Files Updated

### Database Migrations
1. ✅ `infrastructure/database/migrations/20250101000005_create_subscription_tables.ts`
   - Updated tier enum from 4 to 6 tiers
   - Updated seed data with all 6 tier plans

2. ✅ `backend/services/user-service/src/infrastructure/database/migrations/20251118000001_create_subscriptions_table.ts`
   - Updated tier enum to match 6-tier model

3. ✅ `infrastructure/database/migrations/20250118000001_migrate_subscription_tiers_4_to_6.ts` (NEW)
   - Migration script to transition existing data from 4-tier to 6-tier system
   - Maps old tiers to new tiers: `mid` → `premium`, `ultra` → `elite`

### Backend Code
4. ✅ `backend/shared/utils/subscription-tiers.ts`
   - Already had correct 6-tier model (source of truth)
   - No changes needed

5. ✅ `backend/shared/constants/app.constants.ts`
   - Updated SUBSCRIPTION_TIERS constant to include all 6 tiers
   - Aligned feature flags with 6-tier model

6. ✅ `packages/shared/types/src/payment.ts`
   - Updated SubscriptionTier type to include all 6 tiers

7. ✅ `backend/services/api-gateway/src/decorators/subscription.decorator.ts`
   - Updated SubscriptionTier enum to lowercase 6-tier model
   - Changed from uppercase 4-tier to lowercase 6-tier

8. ✅ `backend/services/api-gateway/src/config/rate-limit.config.ts`
   - Updated SubscriptionTier enum to 6-tier model
   - Updated rate limit rules for all 6 tiers
   - Aligned swipe, like, super-like, and boost limits with tier features

### Frontend Code
9. ✅ `apps/web-app/src/types/index.ts`
   - Updated SubscriptionTier type from custom names to 6-tier model
   - Changed from `FREE | GOLD | PLATINUM | DIAMOND` to standardized tiers

10. ✅ `apps/mobile-app/src/components/monetization/SubscriptionTiers.tsx`
    - Updated SubscriptionTier type to include all 6 tiers
    - Added missing tier plans (basic, plus, elite)
    - Updated tier hierarchy logic for upgrade/downgrade detection

### Entity Definitions
11. ✅ `backend/services/user-service/src/domain/entities/Subscription.entity.ts`
    - Already had correct 6-tier model
    - No changes needed

## Migration Strategy

### For Existing Databases

Run the migration script to update existing data:

```bash
# Apply migration
npm run db:migrate

# Or using knex directly
npx knex migrate:latest --knexfile infrastructure/database/knexfile.ts
```

The migration will:
1. Update all enum constraints to allow 6 tiers
2. Map existing user subscriptions:
   - `mid` → `premium` (users get upgraded)
   - `ultra` → `elite` (users get upgraded)
3. Insert new tier plans (`plus` and `premium_plus`)
4. Update subscription features table

### Rollback Plan

If needed, the migration can be rolled back:

```bash
npm run db:rollback
```

This will:
1. Revert tier enum constraints to 4 tiers
2. Map user subscriptions back:
   - `plus` → `basic` (downgrade)
   - `premium` → `mid`
   - `premium_plus` → `ultra` (downgrade)
   - `elite` → `ultra`
3. Remove `plus` and `premium_plus` tier plans

## Feature Gating Logic

All feature checks now use the centralized tier hierarchy:

```typescript
import { hasEqualOrHigherTier, SUBSCRIPTION_TIERS } from '@/backend/shared/utils/subscription-tiers';

// Check if user has access to a feature
if (hasEqualOrHigherTier(user.tier, SUBSCRIPTION_TIERS.PREMIUM)) {
  // User has Premium or higher (Premium, Premium+, Elite)
  enablePassportFeature();
}
```

## Rate Limiting by Tier

Rate limits are now consistent across all tiers:

| Endpoint | Free | Basic | Plus | Premium | Premium+ | Elite |
|----------|------|-------|------|---------|----------|-------|
| POST /swipes | 50/day | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |
| POST /likes | 50/day | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |
| POST /super-likes | 1/day | 5/day | 10/day | Unlimited | Unlimited | Unlimited |
| POST /boost | 0/month | 1/month | 1/month | 2/month | 4/month | 12/month |

## Validation

To verify the alignment is correct:

1. **Database Check**
   ```sql
   -- Verify tier enum values
   SELECT DISTINCT tier FROM subscription_plans ORDER BY tier;
   -- Should return: basic, elite, free, plus, premium, premium_plus
   ```

2. **Code Check**
   ```typescript
   import { SUBSCRIPTION_TIERS, isValidTier } from '@/backend/shared/utils/subscription-tiers';

   // All these should return true
   console.log(isValidTier('free'));         // true
   console.log(isValidTier('basic'));        // true
   console.log(isValidTier('plus'));         // true
   console.log(isValidTier('premium'));      // true
   console.log(isValidTier('premium_plus')); // true
   console.log(isValidTier('elite'));        // true

   // Old tiers should return false or be mapped
   console.log(isValidTier('mid'));          // false
   console.log(isValidTier('ultra'));        // false
   ```

3. **API Check**
   ```bash
   # Get subscription plans
   curl -X GET http://localhost:3000/api/subscriptions/plans

   # Should return all 6 tier plans
   ```

## Testing Checklist

- [x] Database migration runs successfully
- [x] All subscription tier enums updated to 6 tiers
- [x] Feature gating logic uses correct tier hierarchy
- [x] Rate limiting works for all 6 tiers
- [x] Frontend displays all 6 subscription options
- [x] Payment processing accepts all 6 tiers
- [x] Subscription upgrades/downgrades work correctly
- [x] Legacy tier mapping works (mid→premium, ultra→elite)

## Breaking Changes

### API Responses
Subscription tier values in API responses have changed:

**Before:**
```json
{
  "tier": "mid"
}
```

**After:**
```json
{
  "tier": "premium"
}
```

### Frontend Updates Required
Web and mobile apps need to handle all 6 tiers. Old tier names will be rejected by the backend.

## Backward Compatibility

The `mapLegacyTier()` function in `backend/shared/utils/subscription-tiers.ts` provides backward compatibility:

```typescript
mapLegacyTier('mid')   → 'premium'
mapLegacyTier('ultra') → 'elite'
mapLegacyTier('gold')  → 'plus'
mapLegacyTier('platinum') → 'premium_plus'
mapLegacyTier('vip')   → 'elite'
```

## Summary

The subscription tier alignment:
- ✅ Fixes payment/feature access issues
- ✅ Standardizes all code to use 6 tiers
- ✅ Provides smooth migration path from 4-tier to 6-tier
- ✅ Maintains backward compatibility with legacy tier names
- ✅ Updates all rate limiting and feature gating logic
- ✅ Aligns frontend and backend tier definitions

All subscription-related code now uses the single source of truth: `backend/shared/utils/subscription-tiers.ts`
