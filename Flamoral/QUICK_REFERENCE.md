# 24-Hour Match Expiration - Quick Reference Guide

## Installation & Setup

### 1. Install Dependencies
```bash
cd backend/services/matching-service
npm install
```

### 2. Run Migration
```bash
npm run migrate:latest
```

### 3. Start Service
```bash
npm run dev
```

## Key Files Reference

### Backend Core Files
| File | Purpose |
|------|---------|
| `src/domain/entities/Match.entity.ts` | Match entity with expiration logic |
| `src/domain/repositories/match.repository.ts` | Database operations for matches |
| `src/domain/services/match.service.ts` | Business logic for expiration |
| `src/jobs/match-expiration.job.ts` | Background cron jobs |
| `src/api/controllers/match.controller.ts` | API endpoints |
| `src/infrastructure/database/migrations/20250202_add_match_expiration_fields.ts` | Database schema |

### Frontend Components
| File | Purpose |
|------|---------|
| `apps/mobile-app/src/components/matches/MatchExpirationTimer.tsx` | Countdown timer UI |
| `apps/mobile-app/src/components/matches/MatchCard.tsx` | Enhanced match card |
| `apps/mobile-app/src/services/api/match.service.ts` | API client |

## API Endpoints Quick Reference

### Get All Matches
```http
GET /api/matches
Authorization: Bearer <token>
```

### Extend Match (Premium)
```http
POST /api/matches/:matchId/extend
Authorization: Bearer <token>
```

### Rematch (Premium)
```http
POST /api/matches/:targetUserId/rematch
Authorization: Bearer <token>
```

## Database Schema

### New Fields
```sql
expires_at       TIMESTAMP     -- When match expires
extended         BOOLEAN       -- Has been extended
extended_at      TIMESTAMP     -- When extended
expired          BOOLEAN       -- Is expired
first_message_sent BOOLEAN     -- Message sent (stops expiration)
```

## Background Jobs Schedule

| Job | Frequency | Purpose |
|-----|-----------|---------|
| Expiration Processor | Every 5 minutes | Mark expired matches |
| 6-Hour Warning | Every hour | Send 6h warnings |
| 1-Hour Warning | Every 15 minutes | Send 1h warnings |

## Common Commands

### Check Migration Status
```bash
npm run migrate:status
```

### Rollback Migration
```bash
npm run migrate:rollback
```

### View Expired Matches
```sql
SELECT * FROM matches WHERE expired = true;
```

### View Expiring Soon
```sql
SELECT * FROM matches
WHERE expires_at < NOW() + INTERVAL '6 hours'
  AND expired = false
  AND first_message_sent = false;
```

### Manually Expire a Match (Testing)
```sql
UPDATE matches
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE id = '<match-id>';
```

## Business Rules Cheat Sheet

### Match Expiration
- Matches expire 24 hours after creation
- Stopped when first message is sent
- Marked as `expired = true`, not deleted

### Extend (Premium)
- Only if `extended = false`
- Only if `expired = false`
- Only if `first_message_sent = false`
- Adds 24 hours to expiration
- One-time only

### Rematch (Premium)
- Only if `expired = true`
- Creates fresh 24-hour window
- Resets all expiration fields

## Troubleshooting

### Background Jobs Not Running
1. Check if service started correctly
2. Look for error: "SIGTERM signal received"
3. Verify `node-cron` is installed
4. Check logs for job scheduling messages

### Matches Not Expiring
1. Verify cron job is running
2. Check `expires_at` is in the past
3. Verify `first_message_sent = false`
4. Check logs for expiration job execution

### Extend/Rematch Returns 403
1. Verify user is Premium (`isPremium = true`)
2. Check authentication middleware
3. Verify Premium status in user object

### Timer Not Showing on Frontend
1. Check if `expiresAt` field exists in API response
2. Verify component is imported correctly
3. Check if `firstMessageSent = true` (timer hides)
4. Verify date parsing in component

## Monitoring Queries

### Expiration Rate
```sql
SELECT
  COUNT(*) FILTER (WHERE expired = true) as expired_matches,
  COUNT(*) as total_matches,
  ROUND(100.0 * COUNT(*) FILTER (WHERE expired = true) / COUNT(*), 2) as expiration_rate
FROM matches
WHERE matched_at > NOW() - INTERVAL '7 days';
```

### Average Time to First Message
```sql
SELECT
  AVG(EXTRACT(EPOCH FROM (updated_at - matched_at))/3600) as avg_hours_to_message
FROM matches
WHERE first_message_sent = true;
```

### Extend Usage
```sql
SELECT COUNT(*) FROM matches WHERE extended = true;
```

### Rematch Count (Count of rematched matches)
```sql
SELECT COUNT(*) FROM matches
WHERE matched_at > unmatched_at
  AND unmatched_at IS NOT NULL;
```

## Important Notes

1. **First Message Integration**: Messaging service MUST call `markFirstMessageSent(matchId)` when first message is sent
2. **Premium Checks**: All premium feature checks are server-side for security
3. **Existing Matches**: Matches created before migration won't have expiration (backfill optional)
4. **Timezone**: All timestamps are UTC

## Support Resources

- Full Documentation: `MATCH_EXPIRATION_FEATURE.md`
- Implementation Details: `IMPLEMENTATION_SUMMARY.md`
- Deployment Guide: `DEPLOYMENT_CHECKLIST.md`

## Quick Test Script

```bash
# Create test match
curl -X POST http://localhost:3000/api/swipes \
  -H "Authorization: Bearer <token>" \
  -d '{"userId":"user1","targetUserId":"user2","action":"like"}'

# Get match to verify expiration fields
curl http://localhost:3000/api/matches/<matchId> \
  -H "Authorization: Bearer <token>"

# Extend match (Premium)
curl -X POST http://localhost:3000/api/matches/<matchId>/extend \
  -H "Authorization: Bearer <premium-token>"

# Rematch (Premium, after expiry)
curl -X POST http://localhost:3000/api/matches/<targetUserId>/rematch \
  -H "Authorization: Bearer <premium-token>"
```

## Feature Flags / Configuration

Currently hardcoded values (can be made configurable):
- Expiration time: 24 hours
- Extension time: 24 hours
- Expiration job frequency: 5 minutes
- 6-hour warning frequency: 1 hour
- 1-hour warning frequency: 15 minutes

## Version Info

- Feature Version: 1.0.0
- Implementation Date: 2025-02-02
- Compatible With: All existing match features
- Breaking Changes: None (backward compatible)
