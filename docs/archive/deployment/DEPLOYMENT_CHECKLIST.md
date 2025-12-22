# 24-Hour Match Expiration - Deployment Checklist

## Pre-Deployment

### 1. Code Review
- [ ] Review all modified files
- [ ] Verify database migration syntax
- [ ] Check TypeScript compilation
- [ ] Review error handling in controllers
- [ ] Verify Premium feature checks are server-side

### 2. Dependencies
- [ ] Run `npm install` in matching-service
- [ ] Verify `node-cron` is installed
- [ ] Verify `@types/node-cron` is installed
- [ ] Check for any conflicting dependencies

### 3. Environment Variables
- [ ] Verify database connection details are correct
- [ ] Verify notification service URL is configured
- [ ] Check authentication middleware settings

## Deployment Steps

### 4. Database Migration
```bash
cd backend/services/matching-service
npm run migrate:latest
```
- [ ] Migration runs without errors
- [ ] Verify new columns exist in `matches` table
- [ ] Verify indexes were created

### 5. Check Migration Status
```bash
npm run migrate:status
```
- [ ] All migrations show as "completed"

### 6. (Optional) Backfill Existing Matches
**WARNING: Only run if you want existing matches to expire**
```sql
UPDATE matches
SET expires_at = matched_at + INTERVAL '24 hours',
    expired = false,
    extended = false,
    first_message_sent = false
WHERE expires_at IS NULL
  AND status = 'matched'
  AND matched_at > NOW() - INTERVAL '24 hours';
```
- [ ] Decide if backfill is needed
- [ ] If yes, test on staging first
- [ ] If yes, run on production

### 7. Start/Restart Service
```bash
# Development
npm run dev

# Production
npm run build
npm start
```
- [ ] Service starts without errors
- [ ] No TypeScript compilation errors

### 8. Verify Background Jobs Started
Check logs for these messages:
- [ ] "Match expiration job scheduled - runs every 5 minutes"
- [ ] "6-hour expiration warning job scheduled - runs every hour"
- [ ] "1-hour expiration warning job scheduled - runs every 15 minutes"
- [ ] "All match expiration jobs started"

## Post-Deployment Testing

### 9. API Endpoint Testing

#### Test Match Creation
```bash
# Create a new match via swipe
curl -X POST http://localhost:PORT/api/swipes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user1",
    "targetUserId": "user2",
    "action": "like"
  }'
```
- [ ] Match is created
- [ ] `expires_at` is set to 24 hours from now
- [ ] All expiration fields are set correctly

#### Test Get Match
```bash
curl -X GET http://localhost:PORT/api/matches/<matchId> \
  -H "Authorization: Bearer <token>"
```
- [ ] Match data includes expiration fields
- [ ] `expiresAt`, `expired`, `extended`, `firstMessageSent` are present

#### Test Extend Match (Premium)
```bash
curl -X POST http://localhost:PORT/api/matches/<matchId>/extend \
  -H "Authorization: Bearer <premium-token>"
```
- [ ] Returns success for Premium users
- [ ] Returns 403 for non-Premium users
- [ ] `extended` is set to true
- [ ] `expires_at` is extended by 24 hours
- [ ] Cannot extend twice

#### Test Rematch (Premium)
```bash
# First, expire a match (manually in DB or wait)
# Then test rematch
curl -X POST http://localhost:PORT/api/matches/<targetUserId>/rematch \
  -H "Authorization: Bearer <premium-token>"
```
- [ ] Returns success for Premium users with expired match
- [ ] Returns 403 for non-Premium users
- [ ] Returns 404 if no expired match exists
- [ ] New match is created with fresh 24-hour expiration

### 10. Background Job Testing

#### Test Expiration Job
```sql
-- Manually create an expired match for testing
UPDATE matches
SET expires_at = NOW() - INTERVAL '1 hour',
    first_message_sent = false,
    expired = false
WHERE id = '<test-match-id>';
```
- [ ] Wait 5 minutes for cron job
- [ ] Match is marked as `expired = true`
- [ ] Both users receive expiration notifications
- [ ] Check logs for "Match <id> marked as expired"

#### Test 6-Hour Warning
```sql
-- Manually create a match expiring in 5 hours
UPDATE matches
SET expires_at = NOW() + INTERVAL '5 hours',
    first_message_sent = false,
    expired = false
WHERE id = '<test-match-id>';
```
- [ ] Wait up to 1 hour for cron job
- [ ] Both users receive 6-hour warning notification
- [ ] Check logs for "6-hour expiration warning job completed"

#### Test 1-Hour Warning
```sql
-- Manually create a match expiring in 45 minutes
UPDATE matches
SET expires_at = NOW() + INTERVAL '45 minutes',
    first_message_sent = false,
    expired = false
WHERE id = '<test-match-id>';
```
- [ ] Wait up to 15 minutes for cron job
- [ ] Both users receive 1-hour warning notification
- [ ] Check logs for "1-hour expiration warning job completed"

### 11. First Message Protection
```bash
# Send first message in a match
curl -X POST http://localhost:PORT/api/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "<matchId>",
    "message": "Hello!"
  }'
```
**Note: Messaging service must call `matchService.markFirstMessageSent(matchId)`**
- [ ] Match's `first_message_sent` is set to true
- [ ] Match no longer appears in expiration queries
- [ ] Match will not expire even after 24 hours

## Frontend Testing

### 12. Mobile App - Match Card
- [ ] Countdown timer displays on match cards
- [ ] Timer updates every minute
- [ ] Timer shows correct time remaining
- [ ] Timer shows urgent state (red) when < 6 hours
- [ ] Timer disappears when message is sent
- [ ] "Expired" badge shows for expired matches

### 13. Mobile App - Premium Features
#### Premium User
- [ ] "Extend" button shows on eligible matches
- [ ] "Extend" button works and extends match
- [ ] "Extend" button disabled after use
- [ ] "Rematch" option shows on expired matches
- [ ] "Rematch" option works and creates new match

#### Non-Premium User
- [ ] "Extend" button does NOT show
- [ ] "Rematch" option does NOT show
- [ ] Tapping expired match shows "Upgrade to Premium" prompt

## Monitoring Setup

### 14. Set Up Alerts
- [ ] Alert: Expiration job failure
- [ ] Alert: Notification service failure
- [ ] Alert: High match expiration rate (>70%)
- [ ] Alert: Background jobs stopped running

### 15. Set Up Metrics
- [ ] Track: Total matches expired per day
- [ ] Track: Average time to first message
- [ ] Track: Extend feature usage count
- [ ] Track: Rematch feature usage count
- [ ] Track: Conversion from expired → Premium subscription

### 16. Log Monitoring
- [ ] Background job execution logs
- [ ] Match expiration logs
- [ ] Notification sending logs
- [ ] Extend/Rematch endpoint usage logs

## Performance Checks

### 17. Database Performance
- [ ] Verify indexes are being used (check EXPLAIN query)
- [ ] Monitor query execution times
- [ ] Check for table locks during migrations
- [ ] Monitor database connection pool

### 18. Service Performance
- [ ] Service response times < 200ms
- [ ] Background jobs complete in < 30 seconds
- [ ] No memory leaks in cron jobs
- [ ] CPU usage remains stable

## Rollback Plan

### 19. Prepare Rollback
- [ ] Document current migration number
- [ ] Test rollback on staging
- [ ] Have rollback script ready

#### Rollback Command
```bash
npm run migrate:rollback
```

#### Manual Rollback (if needed)
```sql
ALTER TABLE matches DROP COLUMN IF EXISTS expires_at;
ALTER TABLE matches DROP COLUMN IF EXISTS extended;
ALTER TABLE matches DROP COLUMN IF EXISTS extended_at;
ALTER TABLE matches DROP COLUMN IF EXISTS expired;
ALTER TABLE matches DROP COLUMN IF EXISTS first_message_sent;
```

## User Communication

### 20. Prepare User Notifications
- [ ] In-app announcement about new feature
- [ ] Email to existing users about change
- [ ] Update FAQ/Help docs
- [ ] Prepare Premium upgrade prompts

### 21. Customer Support Briefing
- [ ] Brief support team on new feature
- [ ] Provide FAQ for common questions
- [ ] Explain Premium extend/rematch features
- [ ] Provide troubleshooting guide

## Final Checks

### 22. Production Verification
- [ ] All tests passing
- [ ] No errors in production logs
- [ ] Background jobs running on schedule
- [ ] Users receiving notifications
- [ ] Premium features working correctly

### 23. Documentation
- [ ] Code comments are clear
- [ ] API documentation updated
- [ ] README files updated
- [ ] Deployment guide accessible

## Success Criteria

The deployment is successful when:
- [✓] Database migration completed without errors
- [✓] Background jobs running on schedule
- [✓] New matches created with 24-hour expiration
- [✓] Expiration notifications being sent
- [✓] Premium extend/rematch features working
- [✓] Frontend timer displaying correctly
- [✓] No increase in error rates
- [✓] Performance metrics within acceptable range

## Post-Deployment Monitoring (First 48 Hours)

### Day 1
- [ ] Hour 1: Check error logs every 15 minutes
- [ ] Hour 2-4: Check error logs every 30 minutes
- [ ] Hour 4-24: Check error logs every hour
- [ ] Monitor background job execution
- [ ] Monitor notification delivery rate
- [ ] Check user feedback/complaints

### Day 2
- [ ] Check error logs every 2 hours
- [ ] Verify first batch of matches are expiring correctly
- [ ] Review extend/rematch usage metrics
- [ ] Analyze user engagement changes
- [ ] Review performance metrics

## Sign-Off

- [ ] Backend Developer: _______________________
- [ ] Frontend Developer: _______________________
- [ ] QA Engineer: _______________________
- [ ] DevOps Engineer: _______________________
- [ ] Product Manager: _______________________

**Deployment Date**: _______________________
**Deployment Time**: _______________________
**Deployed By**: _______________________

---

## Emergency Contacts

- Backend Team: ______________
- DevOps Team: ______________
- On-Call Engineer: ______________

## Notes

_Add any deployment-specific notes here_
