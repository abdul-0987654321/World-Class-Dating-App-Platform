# 24-Hour Match Expiration Feature

## Overview
This feature implements a 24-hour expiration mechanism for matches to create urgency and reduce match hoarding. Matches expire after 24 hours if no message is sent, with premium users having the ability to extend or rematch.

## Key Features

### 1. Automatic Match Expiration
- Matches automatically expire **24 hours** after creation if no message is sent
- Once a message is sent, the match no longer expires
- Expired matches are marked as `expired = true` but not deleted from the database

### 2. Premium Features
- **Extend Match**: Premium users can extend a match by 24 hours (one-time only)
- **Rematch**: Premium users can rematch with expired connections

### 3. Notifications
- **6-hour warning**: "Your match expires in 6 hours!"
- **1-hour warning**: "Last chance! Match expires in 1 hour"
- **Expiration notification**: "Match expired. Upgrade to Premium to rematch"

### 4. Background Jobs
Three cron jobs run automatically:
- **Expiration processor**: Runs every 5 minutes to mark expired matches
- **6-hour warnings**: Runs every hour to send warnings
- **1-hour warnings**: Runs every 15 minutes to send warnings

## Database Schema

### Migration File
`backend/services/matching-service/src/infrastructure/database/migrations/20250202_add_match_expiration_fields.ts`

### New Fields Added to `matches` Table
```sql
- expires_at: TIMESTAMP (indexed) - When the match expires
- extended: BOOLEAN DEFAULT false - Whether the match was extended
- extended_at: TIMESTAMP - When the match was extended
- expired: BOOLEAN DEFAULT false (indexed) - Whether the match has expired
- first_message_sent: BOOLEAN DEFAULT false - Whether first message was sent
```

### Indexes
```sql
- Index on: expires_at
- Index on: expired
- Composite index on: (expires_at, expired, first_message_sent)
```

## Backend Implementation

### 1. Match Entity
**File**: `backend/services/matching-service/src/domain/entities/Match.entity.ts`

New methods:
- `isExpired()`: Check if match has expired
- `canExtend()`: Check if match can be extended
- `getTimeUntilExpiration()`: Get milliseconds until expiration

### 2. Match Repository
**File**: `backend/services/matching-service/src/domain/repositories/match.repository.ts`

New methods:
- `findMatchesToExpire()`: Find all matches that need to be expired
- `markAsExpired(matchId)`: Mark a match as expired
- `extendMatch(matchId)`: Extend a match by 24 hours
- `markFirstMessageSent(matchId)`: Stop expiration when message sent
- `rematch(user1Id, user2Id)`: Rematch with expired connection
- `findMatchesExpiringSoon(hours)`: Find matches expiring within X hours

### 3. Match Service
**File**: `backend/services/matching-service/src/domain/services/match.service.ts`

Key methods:
- `extendMatch(matchId, userId, isPremium)`: Extend match (Premium only)
- `rematch(userId, targetUserId, isPremium)`: Rematch (Premium only)
- `markFirstMessageSent(matchId)`: Mark message sent
- `processExpiredMatches()`: Process all expired matches (cron job)
- `sendExpirationWarnings(hours)`: Send warnings (cron job)

### 4. Match Controller
**File**: `backend/services/matching-service/src/api/controllers/match.controller.ts`

New endpoints:
- `POST /api/matches/:matchId/extend`: Extend match
- `POST /api/matches/:targetUserId/rematch`: Rematch with expired match

### 5. Background Jobs
**File**: `backend/services/matching-service/src/jobs/match-expiration.job.ts`

Three cron jobs:
- **Expiration Job**: `*/5 * * * *` (every 5 minutes)
- **6-Hour Warning**: `0 * * * *` (every hour)
- **1-Hour Warning**: `*/15 * * * *` (every 15 minutes)

### 6. Integration with Swipe Service
**File**: `backend/services/matching-service/src/domain/services/swipe.service.ts`

When a match is created via `Match.createNew()`, the `expires_at` field is automatically set to 24 hours from creation.

## Frontend Implementation

### 1. Match Expiration Timer Component
**File**: `apps/mobile-app/src/components/matches/MatchExpirationTimer.tsx`

Features:
- Real-time countdown display
- Updates every minute
- Shows urgent state when < 6 hours remaining
- Shows "Expired" badge for expired matches
- Hides when message is sent

### 2. Match Card Component
**File**: `apps/mobile-app/src/components/matches/MatchCard.tsx`

Features:
- Displays expiration timer
- Shows "Extend" button for Premium users (if eligible)
- Shows "Tap to Rematch" for expired matches (Premium only)
- Visual indicators for expired matches

### 3. Match Service
**File**: `apps/mobile-app/src/services/api/match.service.ts`

API methods:
- `extendMatch(matchId)`: Extend a match
- `rematch(targetUserId)`: Rematch with expired match

## API Endpoints

### Extend Match
```http
POST /api/matches/:matchId/extend
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Match extended successfully",
  "data": { Match object }
}

Error (Non-Premium):
{
  "success": false,
  "error": "Match extension is a Premium feature",
  "premiumRequired": true
}
```

### Rematch
```http
POST /api/matches/:targetUserId/rematch
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Rematch successful",
  "data": { Match object }
}

Error (Non-Premium):
{
  "success": false,
  "error": "Rematch is a Premium feature",
  "premiumRequired": true
}
```

## Business Rules

### Match Expiration
1. Matches expire 24 hours after `matched_at` timestamp
2. Expiration is stopped when `first_message_sent = true`
3. Expired matches have `expired = true` and status remains `MATCHED`

### Extend Match
1. Can only extend once (`extended = false`)
2. Cannot extend if already expired
3. Cannot extend if message already sent
4. Premium feature only
5. Adds 24 hours to `expires_at`

### Rematch
1. Can only rematch with expired matches (`expired = true`)
2. Premium feature only
3. Resets all expiration fields:
   - Sets new `expires_at` (24 hours from now)
   - Sets `extended = false`
   - Sets `expired = false`
   - Sets `first_message_sent = false`
   - Updates `matched_at` to current time

## Migration Instructions

### 1. Run Database Migration
```bash
cd backend/services/matching-service
npm run migrate:latest
```

### 2. Install Dependencies (if needed)
```bash
npm install node-cron
npm install @types/node-cron --save-dev
```

### 3. Restart Service
The match expiration jobs will start automatically when the service starts.

### 4. Verify Jobs
Check logs for:
```
Match expiration job scheduled - runs every 5 minutes
6-hour expiration warning job scheduled - runs every hour
1-hour expiration warning job scheduled - runs every 15 minutes
```

## Testing

### Test Expiration Logic
1. Create a match
2. Verify `expires_at` is set to 24 hours from now
3. Wait for expiration (or manually update `expires_at` in DB)
4. Verify cron job marks it as expired
5. Verify notifications are sent

### Test Extend Feature
1. Create a match
2. Call extend endpoint as Premium user
3. Verify `expires_at` extended by 24 hours
4. Verify `extended = true` and `extended_at` is set
5. Attempt to extend again - should fail

### Test Rematch Feature
1. Create and expire a match
2. Call rematch endpoint as Premium user
3. Verify match is renewed with new 24-hour expiration
4. Verify all expiration fields are reset

## Monitoring

### Key Metrics to Track
- Number of matches expiring per day
- Conversion rate: matches → messages before expiration
- Premium extend usage rate
- Premium rematch usage rate
- Time to first message per match

### Recommended Alerts
- Alert if expiration job fails
- Alert if notification service fails
- Alert if > 50% of matches expire without messages

## Future Enhancements

1. **Configurable expiration times**: Allow different times for different user tiers
2. **Multiple extensions**: Allow Premium+ users to extend multiple times
3. **Auto-extend for Ultra Premium**: Automatically extend for highest tier
4. **Expiration analytics dashboard**: Track match lifecycle metrics
5. **A/B testing**: Test different expiration times (12h, 24h, 48h)

## Notes

- Existing matches created before migration will have `expires_at = NULL` and won't expire
- To backfill existing matches, run:
  ```sql
  UPDATE matches
  SET expires_at = matched_at + INTERVAL '24 hours',
      expired = false,
      extended = false,
      first_message_sent = false
  WHERE expires_at IS NULL AND status = 'matched';
  ```
- The messaging service should call `markFirstMessageSent()` when the first message in a match is sent
