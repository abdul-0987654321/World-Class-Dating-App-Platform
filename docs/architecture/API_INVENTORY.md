# Flamoral Platform - Complete API Inventory

**Generated:** 2025-12-22
**Version:** 2.0.0
**Total Endpoints:** 150+ across 13 services

---

## Service Summary

| Service | Port | Base Path | Endpoints | Auth Required |
|---------|------|-----------|-----------|---------------|
| API Gateway | 4000 | /api | 50+ | Mixed |
| Auth Service | 3001 | /api/auth | 12 | No (mostly) |
| User Service | 3002 | /api | 80+ | Yes |
| Matching Service | 3003 | /api | 18 | Yes |
| Messaging Service | 5000 | /api | 20 | Yes |
| Payment Service | 3005 | /api/payments | 7 | Yes |
| Notification Service | 3008 | /api/notifications | 10 | Yes |
| Media Service | 3009 | /api/media | 15 | Yes |
| Admin Service | 3010 | /api/admin | 25+ | Admin role |
| Analytics Service | 3007 | /api/analytics | 12 | Mixed |
| Moderation Service | 3012 | /api/moderation | 8 | Internal |
| Advertising Service | 3011 | /api/ads | 10 | Admin |
| Automation Service | 3013 | /api/automation | 8 | Yes |

---

## 1. Authentication Service (Port 3001)

### Public Endpoints (No Auth)

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | /api/auth/register | Register new user | 5/15min |
| POST | /api/auth/login | User login | 5/15min |
| POST | /api/auth/refresh-token | Refresh access token | 10/15min |
| POST | /api/auth/verify-email | Verify email with token | 10/hour |
| POST | /api/auth/resend-verification | Resend verification email | 3/hour |
| POST | /api/auth/forgot-password | Request password reset | 3/hour |
| POST | /api/auth/reset-password | Reset password with token | 5/hour |

### Social Login (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/social/google | Google OAuth login |
| POST | /api/auth/social/facebook | Facebook OAuth login |
| POST | /api/auth/social/apple | Apple Sign In |

### Authenticated Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/logout | Logout and invalidate token |
| GET | /api/auth/me | Get current user info |

### Internal Endpoints (Service Key)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/validate-token | Validate JWT (internal) |

---

## 2. User Service (Port 3002)

### Profile Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/profile | Get own profile |
| PUT | /api/profile | Update profile |
| GET | /api/profile/:userId | Get user's public profile |

### Photo Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/photos | Get user's photos |
| POST | /api/photos | Upload photo |
| DELETE | /api/photos/:id | Delete photo |
| PUT | /api/photos/:id/primary | Set as primary |
| PUT | /api/photos/reorder | Reorder photos |
| POST | /api/photos/:id/verify | Request verification |

### Subscriptions & Coins

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/subscription | Get subscription status |
| POST | /api/subscription/upgrade | Upgrade subscription |
| POST | /api/subscription/cancel | Cancel subscription |
| GET | /api/coins | Get coin balance |
| POST | /api/coins/purchase | Purchase coins |
| GET | /api/coins/transactions | Get transaction history |

### Boosts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/boosts | Get boost status |
| POST | /api/boosts/activate | Activate profile boost |
| GET | /api/boosts/history | Get boost history |

### Privacy & Blocking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/privacy | Get privacy settings |
| PUT | /api/privacy | Update privacy settings |
| GET | /api/blocks | Get blocked users |
| POST | /api/blocks | Block a user |
| DELETE | /api/blocks/:userId | Unblock user |
| POST | /api/report | Report a user |

### Discovery Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/discovery/settings | Get discovery preferences |
| PUT | /api/discovery/settings | Update preferences |

### Swipes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/swipes | Process swipe action |
| GET | /api/swipes/likes | Get who liked me |
| GET | /api/swipes/stats | Get swipe statistics |
| POST | /api/swipes/undo | Undo last swipe |

### Matches

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/matches | Get all matches |
| GET | /api/matches/:matchId | Get match details |
| DELETE | /api/matches/:matchId | Unmatch |

### Travel Mode

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/travel-mode | Get travel mode status |
| POST | /api/travel-mode | Enable travel mode |
| DELETE | /api/travel-mode | Disable travel mode |

### Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/verification/status | Get verification status |
| POST | /api/verification/phone/send | Send phone verification |
| POST | /api/verification/phone/verify | Verify phone code |
| POST | /api/verification/identity | Submit identity verification |

### Gamification & Rewards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/achievements | Get achievements |
| GET | /api/daily-rewards | Get daily reward status |
| POST | /api/daily-rewards/claim | Claim daily reward |
| GET | /api/gamification/stats | Get gamification stats |

### GDPR & Privacy Compliance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/gdpr/export | Request data export |
| DELETE | /api/gdpr/delete | Request account deletion |
| GET | /api/privacy/consent | Get consent status |
| PUT | /api/privacy/consent | Update consent |

---

## 3. Matching Service (Port 3003)

### Discovery

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/discovery | Get recommended profiles |
| GET | /api/discovery/queue | Get discovery queue |
| POST | /api/discovery/refresh | Refresh recommendations |

### Swipes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/swipes | Process swipe |
| GET | /api/swipes/likes | Who liked me |
| GET | /api/swipes/stats | Swipe statistics |
| POST | /api/swipes/undo | Undo last swipe |

### Super Likes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/super-likes | Send super like |
| GET | /api/super-likes/remaining | Get remaining count |

### Boosts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/boosts | Activate boost |
| GET | /api/boosts/status | Get boost status |

### Matches

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/matches | Get all matches |
| GET | /api/matches/:id | Get match details |
| DELETE | /api/matches/:id | Unmatch |

### Insights (Premium)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/insights/profile-views | Profile view analytics |
| GET | /api/insights/popularity | Popularity score |

---

## 4. Messaging Service (Port 5000)

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/conversations | Get all conversations |
| GET | /api/conversations/:id | Get conversation |
| POST | /api/conversations | Create conversation |
| DELETE | /api/conversations/:id | Delete conversation |
| PUT | /api/conversations/:id/mute | Mute conversation |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/conversations/:id/messages | Get messages |
| POST | /api/messages | Send message |
| GET | /api/messages/:id | Get message |
| PUT | /api/messages/:id | Edit message |
| DELETE | /api/messages/:id | Delete message |
| PUT | /api/messages/:id/status | Update read status |
| GET | /api/messages/unread-count | Get unread count |

### Enhanced Messaging

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/messages/:id/react | Add reaction |
| DELETE | /api/messages/:id/react | Remove reaction |
| POST | /api/conversations/:id/typing | Send typing indicator |

### Video Calls (Agora)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/calls/token | Get Agora token |
| POST | /api/calls/initiate | Initiate call |
| POST | /api/calls/end | End call |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| message:new | server→client | New message received |
| message:send | client→server | Send message |
| message:read | bidirectional | Message read receipt |
| message:typing | bidirectional | Typing indicator |
| user:online | server→client | User online status |
| call:incoming | server→client | Incoming call |

---

## 5. Payment Service (Port 3005)

### Payment Intents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payments/create-intent | Create payment intent |
| GET | /api/payments/methods/:customerId | Get payment methods |
| POST | /api/payments/methods/add | Add payment method |

### Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payments/subscription/create | Purchase subscription |
| POST | /api/payments/subscription/cancel | Cancel subscription |

### Refunds

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payments/refund | Process refund |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payments/webhook | Stripe webhook handler |

### In-App Purchases

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/iap/verify | Verify IAP receipt |
| POST | /api/iap/restore | Restore purchases |

---

## 6. Notification Service (Port 3008)

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notifications | Get notifications |
| POST | /api/notifications/send | Send notification |
| GET | /api/notifications/unread-count | Get unread count |
| PUT | /api/notifications/:id/read | Mark as read |
| PUT | /api/notifications/read-all | Mark all read |
| DELETE | /api/notifications/:id | Delete notification |

### Preferences

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notifications/preferences | Get preferences |
| PUT | /api/notifications/preferences | Update preferences |

### Device Registration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/devices | Register device |
| DELETE | /api/devices/:id | Unregister device |

---

## 7. Media Service (Port 3009)

### Photo Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/media/upload | Upload photo |
| GET | /api/media/photos | Get user photos |
| GET | /api/media/photos/:id | Get photo |
| DELETE | /api/media/photos/:id | Delete photo |
| PUT | /api/media/photos/:id/profile | Set as profile |

### Video Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/media/videos/upload | Upload video |
| GET | /api/media/videos | Get user videos |
| DELETE | /api/media/videos/:id | Delete video |

### Voice Notes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/media/voice-notes/upload | Upload voice note |
| GET | /api/media/voice-notes/:id | Get voice note |
| DELETE | /api/media/voice-notes/:id | Delete voice note |

### Photo Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/media/verification/submit | Submit verification photo |
| GET | /api/media/verification/status | Get verification status |

---

## 8. Analytics Service (Port 3007)

### Event Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/analytics/events | Track event |
| POST | /api/analytics/events/batch | Track batch events |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/dashboard | Get dashboard data |
| GET | /api/analytics/metrics | Get metrics |
| GET | /api/analytics/reports | Get reports |

### User Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/users/:id | Get user analytics |
| GET | /api/analytics/engagement | Get engagement metrics |

---

## 9. Moderation Service (Port 3012)

### Content Moderation (Internal)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/moderation/scan | Scan content |
| POST | /api/moderation/review | Submit for review |
| GET | /api/moderation/queue | Get moderation queue |
| PUT | /api/moderation/:id | Update moderation status |

### CSAM Detection

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/moderation/csam/scan | CSAM detection scan |
| POST | /api/moderation/csam/report | Report to NCMEC |

---

## 10. Admin Service (Port 3010)

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/users | List users |
| GET | /api/admin/users/:id | Get user details |
| PUT | /api/admin/users/:id | Update user |
| POST | /api/admin/users/:id/ban | Ban user |
| POST | /api/admin/users/:id/unban | Unban user |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/reports | Get reports |
| PUT | /api/admin/reports/:id | Resolve report |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/analytics | Get admin analytics |
| GET | /api/admin/revenue | Get revenue stats |

---

## Health Check Endpoints (All Services)

| Service | Endpoint | Purpose |
|---------|----------|---------|
| All | /health | Basic health check |
| All | /health/ready | Readiness probe |
| All | /health/live | Liveness probe |
| All | /metrics | Prometheus metrics |

---

## Rate Limiting Summary

| Category | Limit | Window |
|----------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| Password Reset | 3 requests | 1 hour |
| Email Verification | 3 requests | 1 hour |
| General API | 100 requests | 15 minutes |
| Media Upload | 20 requests | 15 minutes |
| Messaging | 60 requests | 1 minute |
| Notifications | 30 requests | 1 minute |

---

## Error Response Format

```json
{
  "error": "ValidationError",
  "message": "Invalid input data",
  "statusCode": 400,
  "code": "AUTH_001",
  "details": {
    "field": "email",
    "constraint": "isEmail"
  },
  "correlationId": "req_abc123"
}
```

---

## Pagination Format

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

---

*Last Updated: 2025-12-22*
