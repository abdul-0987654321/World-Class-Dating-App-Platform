# TypeScript Compilation Fixes for User Service

## Summary
The user-service has TypeScript compilation errors due to property naming mismatches between service files (using camelCase) and entity definitions (using snake_case).

## Files Already Fixed
1. **auth.service.ts** - Added `id` property to JwtPayload (line 232)

## Files Requiring Fixes

### 1. Badge.service.ts
The Badge service references properties that don't exist in BadgeEntity and BadgeCollection types.

**Issues:**
- BadgeCollection and UserBadgeCollection are minimal type aliases without proper structure
- Service assumes properties like `coinReward`, `xpReward`, `name`, `id` exist on collections

**Recommended Fix:**
Since BadgeCollection is just a type alias (`{ user_id, badges[], total_count }`), the service logic at lines 184-243 needs refactoring to not reference collection properties that don't exist. Either:
- Update Badge.entity.ts to add a proper BadgeCollectionEntity with required fields
- Or simplify the service to remove collection reward logic

### 2. Challenge.service.ts
Multiple property naming and type issues.

**Property Name Fixes Needed:**
```typescript
Line 20: 'in_progress' → 'active' (ChallengeStatus enum)
Line 29: challengeId → challenge_id
Line 33: isRepeatable → (doesn't exist, remove or add to entity)
Line 38/41: startDate → start_date, endDate → end_date
Line 66: isActive → is_active
Line 79/80: durationDays → (doesn't exist, remove or add to entity)
Line 91: targetValue → target_value
Line 110: 'in_progress' → 'active'
Line 115: challengeId → challenge_id
Line 120: actionType → (doesn't exist in UpdateChallengeProgressDto)
Line 123: progress → current_progress, incrementBy → progress_increment
Line 124: target → target_progress
Line 161-164: coinReward → coin_reward, xpReward → xp_reward, boostReward → boost_reward, superLikeReward → super_like_reward
Line 178/182: title → name
Line 228-256: actionType → (doesn't exist, remove or adjust DTO)
```

### 3. Achievement.service.ts
Similar naming issues plus repository interface mismatches.

**Property Name Fixes Needed:**
```typescript
Line 96-97: achievementKey → achievement_slug, isActive → is_active
Line 105: targetValue → target_value
Line 109: isUnlocked → is_completed, isRepeatable → (add to entity)
Line 114: progress → current_progress
Line 115/118: incrementBy → progress_increment, targetValue → target_value
Line 123-147: Multiple property updates to snake_case
Line 151-152: coinReward → coin_reward
Line 170-172: coinReward → coin_reward, timesCompleted → times_completed
All tracking methods (lines 177-421): achievementKey → achievement_slug, actionType → (adjust DTO)
```

### 4. Repository Files
Several repository files have similar issues with object literal property names not matching entity definitions.

**Files with errors:**
- Achievement.repository.ts (lines 402, 429, 455, 474, 488)
- Badge.repository.ts (lines 144, 167, 181, 199)
- Challenge.repository.ts (lines 107, 137)
- Streak.repository.ts (lines 99, 117, 136)
- boost.repository.ts (lines 192-195)
- DailyReward.repository.ts (lines 175-178)

## Quick Fix Script

Due to the extent of changes, a systematic approach is recommended:

1. Update all ent entity definitions to include missing properties OR
2. Update all service/repository files to only use existing snake_case properties
3. Ensure DTOs match entity property names

## Current Status
- auth.service.ts: ✅ Fixed
- Badge.service.ts: ❌ Needs entity updates
- Challenge.service.ts: ❌ Needs property renames  
- Achievement.service.ts: ❌ Needs property renames
- Repository files: ❌ Need property renames

Total Errors: ~95 TypeScript compilation errors
