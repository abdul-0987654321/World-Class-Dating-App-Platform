# API Endpoint Testing Checklist

After applying the route registration fixes, test all endpoints systematically.

## Setup
```bash
export TOKEN="your_jwt_token_here"
export BASE_URL="http://localhost:3001"
```

---

## ✅ Currently Working Endpoints (Pre-Fix)

### Authentication
- [ ] POST $BASE_URL/api/auth/register
- [ ] POST $BASE_URL/api/auth/login
- [ ] POST $BASE_URL/api/auth/logout
- [ ] POST $BASE_URL/api/auth/refresh-token
- [ ] POST $BASE_URL/api/auth/verify-email
- [ ] POST $BASE_URL/api/auth/forgot-password
- [ ] POST $BASE_URL/api/auth/reset-password
- [ ] POST $BASE_URL/api/auth/google
- [ ] POST $BASE_URL/api/auth/apple
- [ ] POST $BASE_URL/api/auth/facebook

### Profile
- [ ] GET $BASE_URL/api/profile
- [ ] PUT $BASE_URL/api/profile

### Photos
- [ ] GET $BASE_URL/api/photos
- [ ] POST $BASE_URL/api/photos/upload
- [ ] POST $BASE_URL/api/photos
- [ ] DELETE $BASE_URL/api/photos/:photoId
- [ ] PUT $BASE_URL/api/photos/:photoId/primary
- [ ] PUT $BASE_URL/api/photos/reorder

### Swipes
- [ ] POST $BASE_URL/api/swipes/like
- [ ] POST $BASE_URL/api/swipes/pass
- [ ] POST $BASE_URL/api/swipes/super-like
- [ ] GET $BASE_URL/api/swipes/likes-received
- [ ] GET $BASE_URL/api/swipes/super-likes-received
- [ ] GET $BASE_URL/api/swipes/stats

### Matches
- [ ] GET $BASE_URL/api/matches
- [ ] GET $BASE_URL/api/matches/:matchId
- [ ] POST $BASE_URL/api/matches/:matchId/unmatch
- [ ] GET $BASE_URL/api/matches/stats

### Discovery
- [ ] GET $BASE_URL/api/discovery
- [ ] GET $BASE_URL/api/discovery/:profileId

### Messages
- [ ] GET $BASE_URL/api/messages/conversations
- [ ] GET $BASE_URL/api/messages/conversations/:otherUserId
- [ ] GET $BASE_URL/api/messages/conversations/:conversationId/messages
- [ ] POST $BASE_URL/api/messages/send
- [ ] PUT $BASE_URL/api/messages/conversations/:conversationId/read
- [ ] GET $BASE_URL/api/messages/unread-count
- [ ] DELETE $BASE_URL/api/messages/conversations/:conversationId

### Subscriptions
- [ ] GET $BASE_URL/api/subscriptions/current
- [ ] GET $BASE_URL/api/subscriptions/features
- [ ] GET $BASE_URL/api/subscriptions/features/:featureKey/access
- [ ] PUT $BASE_URL/api/subscriptions/tier
- [ ] POST $BASE_URL/api/subscriptions/cancel
- [ ] POST $BASE_URL/api/subscriptions/reactivate

### Coins
- [ ] GET $BASE_URL/api/coins/balance
- [ ] GET $BASE_URL/api/coins/transactions
- [ ] GET $BASE_URL/api/coins/transactions/summary
- [ ] GET $BASE_URL/api/coins/products
- [ ] POST $BASE_URL/api/coins/purchase
- [ ] POST $BASE_URL/api/coins/spend
- [ ] POST $BASE_URL/api/coins/daily-reward

---

## ⚠️ Newly Registered Endpoints (Post-Fix)

### Video Chat
- [ ] POST $BASE_URL/api/video-chat/initiate
  ```bash
  curl -X POST "$BASE_URL/api/video-chat/initiate" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"receiverId":"user-uuid","callType":"video"}'
  ```

- [ ] POST $BASE_URL/api/video-chat/accept/:callId
  ```bash
  curl -X POST "$BASE_URL/api/video-chat/accept/call-uuid" \
    -H "Authorization: Bearer $TOKEN"
  ```

- [ ] POST $BASE_URL/api/video-chat/end/:callId
  ```bash
  curl -X POST "$BASE_URL/api/video-chat/end/call-uuid" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"reason":"completed"}'
  ```

- [ ] GET $BASE_URL/api/video-chat/history
  ```bash
  curl "$BASE_URL/api/video-chat/history?limit=20&offset=0" \
    -H "Authorization: Bearer $TOKEN"
  ```

- [ ] GET $BASE_URL/api/video-chat/active
  ```bash
  curl "$BASE_URL/api/video-chat/active" \
    -H "Authorization: Bearer $TOKEN"
  ```

- [ ] PATCH $BASE_URL/api/video-chat/status/:callId
  ```bash
  curl -X PATCH "$BASE_URL/api/video-chat/status/call-uuid" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"status":"ringing"}'
  ```

### Gamification
- [ ] GET $BASE_URL/api/gamification/dashboard
  ```bash
  curl "$BASE_URL/api/gamification/dashboard" \
    -H "Authorization: Bearer $TOKEN"
  ```

- [ ] GET $BASE_URL/api/gamification/levels
- [ ] GET $BASE_URL/api/gamification/badges
- [ ] GET $BASE_URL/api/gamification/experience
- [ ] GET $BASE_URL/api/gamification/experience/transactions
- [ ] GET $BASE_URL/api/gamification/experience/leaderboard
- [ ] GET $BASE_URL/api/gamification/streaks
- [ ] POST $BASE_URL/api/gamification/streaks/protect
- [ ] GET $BASE_URL/api/gamification/streaks/leaderboard
- [ ] GET $BASE_URL/api/gamification/challenges/active
- [ ] GET $BASE_URL/api/gamification/challenges/available
- [ ] POST $BASE_URL/api/gamification/challenges/start
- [ ] GET $BASE_URL/api/gamification/badges/user
- [ ] PUT $BASE_URL/api/gamification/badges/:badgeId/equip
- [ ] POST $BASE_URL/api/gamification/track

### Settings
- [ ] GET $BASE_URL/api/settings
  ```bash
  curl "$BASE_URL/api/settings" \
    -H "Authorization: Bearer $TOKEN"
  ```

- [ ] PATCH $BASE_URL/api/settings/account
  ```bash
  curl -X PATCH "$BASE_URL/api/settings/account" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"email":"new@email.com","currentPassword":"oldpass"}'
  ```

- [ ] PATCH $BASE_URL/api/settings/privacy
  ```bash
  curl -X PATCH "$BASE_URL/api/settings/privacy" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"showOnlineStatus":true,"readReceipts":true}'
  ```

- [ ] PATCH $BASE_URL/api/settings/notifications
  ```bash
  curl -X PATCH "$BASE_URL/api/settings/notifications" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"pushNotifications":true,"newMatches":true}'
  ```

- [ ] PATCH $BASE_URL/api/settings/preferences
  ```bash
  curl -X PATCH "$BASE_URL/api/settings/preferences" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"interestedIn":["male"],"minAge":25,"maxAge":35}'
  ```

- [ ] GET $BASE_URL/api/settings/blocked-users
- [ ] DELETE $BASE_URL/api/settings/blocked-users/:userId
- [ ] POST $BASE_URL/api/settings/data-export
- [ ] DELETE $BASE_URL/api/settings/account

### Security
- [ ] GET $BASE_URL/api/security/sessions
  ```bash
  curl "$BASE_URL/api/security/sessions" \
    -H "Authorization: Bearer $TOKEN"
  ```

- [ ] POST $BASE_URL/api/security/sessions/revoke/:sessionId
  ```bash
  curl -X POST "$BASE_URL/api/security/sessions/revoke/session-uuid" \
    -H "Authorization: Bearer $TOKEN"
  ```

- [ ] POST $BASE_URL/api/security/sessions/revoke-all
  ```bash
  curl -X POST "$BASE_URL/api/security/sessions/revoke-all" \
    -H "Authorization: Bearer $TOKEN"
  ```

- [ ] GET $BASE_URL/api/security/login-attempts
- [ ] GET $BASE_URL/api/security/lockout-history
- [ ] GET $BASE_URL/api/security/account-status
- [ ] POST $BASE_URL/api/security/unlock-account
- [ ] GET $BASE_URL/api/security/session-statistics

### Modes
- [ ] GET $BASE_URL/api/modes
  ```bash
  curl "$BASE_URL/api/modes" \
    -H "Authorization: Bearer $TOKEN"
  ```

- [ ] GET $BASE_URL/api/modes/:mode
- [ ] PUT $BASE_URL/api/modes/:mode
- [ ] POST $BASE_URL/api/modes/:mode/enable
- [ ] POST $BASE_URL/api/modes/:mode/disable
- [ ] POST $BASE_URL/api/modes/switch
- [ ] PUT $BASE_URL/api/modes/:mode/preferences

### Opening Moves
- [ ] GET $BASE_URL/api/opening-moves/users/me/opening-moves
  ```bash
  curl "$BASE_URL/api/opening-moves/users/me/opening-moves" \
    -H "Authorization: Bearer $TOKEN"
  ```

- [ ] POST $BASE_URL/api/opening-moves/users/me/opening-moves
  ```bash
  curl -X POST "$BASE_URL/api/opening-moves/users/me/opening-moves" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"type":"text","content":"Hey! Coffee lover here too ☕"}'
  ```

- [ ] PUT $BASE_URL/api/opening-moves/users/me/opening-moves/:id
- [ ] DELETE $BASE_URL/api/opening-moves/users/me/opening-moves/:id
- [ ] PUT $BASE_URL/api/opening-moves/users/me/opening-moves/reorder
- [ ] GET $BASE_URL/api/opening-move-templates
- [ ] GET $BASE_URL/api/opening-move-templates/:category
- [ ] POST $BASE_URL/api/matches/:matchId/respond
- [ ] GET $BASE_URL/api/matches/:matchId/response

### Travel Mode
- [ ] GET $BASE_URL/api/travel/mode
- [ ] POST $BASE_URL/api/travel/mode/enable
- [ ] POST $BASE_URL/api/travel/mode/disable
- [ ] PUT $BASE_URL/api/travel/mode/location

### Photo Verification
- [ ] POST $BASE_URL/api/photo-verification/start
- [ ] POST $BASE_URL/api/photo-verification/submit
- [ ] GET $BASE_URL/api/photo-verification/status
- [ ] DELETE $BASE_URL/api/photo-verification/cancel

---

## Response Validation

For each endpoint, verify:

### Success Response Format
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional success message"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "message": "Descriptive error message"
}
```

### HTTP Status Codes
- [ ] 200 - Successful GET/PUT/PATCH/DELETE
- [ ] 201 - Successful POST (resource created)
- [ ] 400 - Bad request / validation error
- [ ] 401 - Unauthorized (missing/invalid token)
- [ ] 403 - Forbidden (insufficient permissions)
- [ ] 404 - Resource not found
- [ ] 409 - Conflict (duplicate resource)
- [ ] 429 - Too many requests (rate limited)
- [ ] 500 - Internal server error

---

## Authentication Testing

### Valid Token
```bash
# Should return 200 with user data
curl "$BASE_URL/api/profile" \
  -H "Authorization: Bearer $VALID_TOKEN"
```

### Missing Token
```bash
# Should return 401
curl "$BASE_URL/api/profile"
```

### Invalid Token
```bash
# Should return 401
curl "$BASE_URL/api/profile" \
  -H "Authorization: Bearer invalid_token_here"
```

### Expired Token
```bash
# Should return 401
curl "$BASE_URL/api/profile" \
  -H "Authorization: Bearer $EXPIRED_TOKEN"
```

---

## Rate Limiting Testing

### Auth Endpoints
```bash
# Make 10+ rapid login requests
for i in {1..15}; do
  curl -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo "Request $i"
done
# Should return 429 after threshold
```

---

## Validation Testing

### Invalid Data
```bash
# Missing required fields - should return 400
curl -X POST "$BASE_URL/api/swipes/like" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Invalid Data Types
```bash
# Wrong data type - should return 400
curl -X PATCH "$BASE_URL/api/settings/preferences" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"minAge":"not-a-number"}'
```

---

## Performance Testing

### Response Time
- [ ] All GET requests < 200ms
- [ ] All POST requests < 500ms
- [ ] All PUT/PATCH requests < 500ms
- [ ] All DELETE requests < 300ms

### Load Testing
```bash
# Use Apache Bench
ab -n 1000 -c 10 -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/discovery"
```

---

## Summary

Total Endpoints to Test:
- Working (Pre-Fix): 65 endpoints
- New (Post-Fix): 60 endpoints
- **Total: 125 endpoints**

Completion:
- [ ] All working endpoints verified
- [ ] All new endpoints verified
- [ ] Authentication tested
- [ ] Rate limiting tested
- [ ] Validation tested
- [ ] Performance acceptable

---

**Testing Status:** Not Started
**Last Updated:** 2025-12-16
**Next Review:** After fix application
