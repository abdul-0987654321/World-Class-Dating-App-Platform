# Flamoral Platform - API Inventory Document

**Generated:** 2026-01-05
**Version:** 1.0.0
**Total Services:** 20
**Total Endpoints:** 350+

---

## Executive Summary

| Category | Count |
|----------|-------|
| Microservices | 20 |
| Route Files | 128 |
| Controllers | 98 |
| Webhook Endpoints | 5 |
| Message Queue Consumers | 2 |
| Background Workers | 16 |
| WebSocket Handlers | 3 |

---

## 1. SYSTEM ENDPOINTS

### Health & Monitoring
| Method | Endpoint | Service | Auth | Description |
|--------|----------|---------|------|-------------|
| GET | `/health` | api-gateway | None | Health check |
| GET | `/health/ready` | api-gateway | None | Readiness probe |
| GET | `/health/live` | api-gateway | None | Liveness probe |
| GET | `/version` | api-gateway | None | API version info |
| GET | `/api/v1/config/public` | api-gateway | None | Public configuration |

### CSRF Protection
| Method | Endpoint | Service | Auth | Description |
|--------|----------|---------|------|-------------|
| GET | `/api/v1/csrf/token` | api-gateway | None | Get CSRF token |

---

## 2. AUTHENTICATION ENDPOINTS

### Auth Service (`auth-service`)
| Method | Endpoint | Auth | Middleware | Description |
|--------|----------|------|------------|-------------|
| POST | `/api/v1/auth/register` | None | authLimiter, validate | Register new user |
| POST | `/api/v1/auth/login` | None | authLimiter, validate | Login user |
| POST | `/api/v1/auth/logout` | Bearer | authenticate | Logout user |
| POST | `/api/v1/auth/refresh-token` | None | validate | Refresh access token |
| GET | `/api/v1/auth/me` | Bearer | authenticate | Get current user |
| POST | `/api/v1/auth/verify-email` | None | validate | Verify email |
| POST | `/api/v1/auth/resend-verification` | None | verificationLimiter | Resend verification |
| POST | `/api/v1/auth/forgot-password` | None | passwordResetLimiter | Request password reset |
| POST | `/api/v1/auth/reset-password` | None | validate | Reset password |
| POST | `/api/v1/auth/validate-token` | Service | internalAuth | Validate token (internal) |

### Two-Factor Authentication
| Method | Endpoint | Auth | Middleware | Description |
|--------|----------|------|------------|-------------|
| GET | `/api/v1/auth/2fa/status` | Bearer | authenticate | Get 2FA status |
| POST | `/api/v1/auth/2fa/setup` | Bearer | authenticate, authLimiter | Start 2FA setup |
| POST | `/api/v1/auth/2fa/verify` | Bearer | authenticate, authLimiter | Verify and enable 2FA |
| POST | `/api/v1/auth/2fa/disable` | Bearer | authenticate, authLimiter | Disable 2FA |
| POST | `/api/v1/auth/2fa/validate` | None | authLimiter | Validate 2FA during login |
| POST | `/api/v1/auth/2fa/backup-codes/regenerate` | Bearer | authenticate | Regenerate backup codes |

---

## 3. USER MANAGEMENT ENDPOINTS

### User Service (`user-service`) - 40+ Route Files
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/users/me` | Bearer | Get current user profile |
| PUT | `/api/v1/users/me` | Bearer | Update current user |
| DELETE | `/api/v1/users/me` | Bearer | Delete account |
| GET | `/api/v1/profile` | Bearer | Get profile details |
| PUT | `/api/v1/profile` | Bearer | Update profile |
| POST | `/api/v1/profile/photos` | Bearer | Upload photo |
| PUT | `/api/v1/profile/photos/reorder` | Bearer | Reorder photos |
| DELETE | `/api/v1/profile/photos/:id` | Bearer | Delete photo |
| POST | `/api/v1/profile/prompts` | Bearer | Add profile prompt |
| GET | `/api/v1/profile/settings` | Bearer | Get settings |
| PUT | `/api/v1/profile/settings` | Bearer | Update settings |

### Verification
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/verification/phone/send` | Bearer | Send phone verification |
| POST | `/api/v1/verification/phone/verify` | Bearer | Verify phone code |
| POST | `/api/v1/verification/photo/submit` | Bearer | Submit photo verification |
| GET | `/api/v1/verification/photo/status` | Bearer | Get verification status |
| POST | `/api/v1/verification/identity/submit` | Bearer | Submit identity docs |
| POST | `/api/v1/verification/document/submit` | Bearer | Submit document |
| POST | `/api/v1/verification/background-check` | Bearer | Request background check |

### Safety Features
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/safety/tips` | Bearer | Get safety tips |
| POST | `/api/v1/safety/report` | Bearer | Report user |
| POST | `/api/v1/safety/block` | Bearer | Block user |
| DELETE | `/api/v1/safety/block/:userId` | Bearer | Unblock user |
| GET | `/api/v1/safety/blocked` | Bearer | Get blocked users |
| POST | `/api/v1/safety/sos` | Bearer | Trigger SOS |
| GET | `/api/v1/safety/emergency-contacts` | Bearer | Get emergency contacts |
| POST | `/api/v1/safety/check-in` | Bearer | Start check-in |
| GET | `/api/v1/safety/check-in/active` | Bearer | Get active check-in |

### Privacy & Compliance
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/privacy/settings` | Bearer | Get privacy settings |
| PUT | `/api/v1/privacy/settings` | Bearer | Update privacy settings |
| POST | `/api/v1/privacy/data-export` | Bearer | Request data export (GDPR) |
| POST | `/api/v1/privacy/data-delete` | Bearer | Request data deletion |
| GET | `/api/v1/privacy/consents` | Bearer | Get consent history |

---

## 4. TENANT/MULTI-USER ENDPOINTS

### Dating Modes (Tenant-like Segmentation)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/modes` | Bearer | Get available modes |
| PUT | `/api/v1/modes/active` | Bearer | Set active mode |
| GET | `/api/v1/modes/preferences` | Bearer | Get mode preferences |
| PUT | `/api/v1/modes/preferences` | Bearer | Update mode preferences |

### Community Features
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/communities` | Bearer | List communities |
| POST | `/api/v1/communities` | Bearer | Create community |
| GET | `/api/v1/communities/:id` | Bearer | Get community |
| PUT | `/api/v1/communities/:id` | Bearer | Update community |
| POST | `/api/v1/communities/:id/join` | Bearer | Join community |
| POST | `/api/v1/communities/:id/leave` | Bearer | Leave community |
| GET | `/api/v1/communities/:id/members` | Bearer | Get members |

---

## 5. BILLING & PAYMENTS ENDPOINTS

### Payment Service (`payment-service`)
| Method | Endpoint | Auth | Idempotent | Description |
|--------|----------|------|------------|-------------|
| GET | `/api/v1/payments/products` | Bearer | N/A | Get products |
| POST | `/api/v1/payments/create-intent` | Bearer | Yes | Create payment intent |
| POST | `/api/v1/payments/checkout` | Bearer | Yes | Create checkout session |
| GET | `/api/v1/payments/methods/:customerId` | Bearer | N/A | Get payment methods |
| POST | `/api/v1/payments/methods/add` | Bearer | Yes | Add payment method |
| DELETE | `/api/v1/payments/methods/:id` | Bearer | N/A | Remove payment method |
| POST | `/api/v1/payments/refund` | Bearer | Yes | Process refund |
| GET | `/api/v1/payments/history` | Bearer | N/A | Get payment history |

### Subscriptions
| Method | Endpoint | Auth | Idempotent | Description |
|--------|----------|------|------------|-------------|
| GET | `/api/v1/subscriptions/plans` | None | N/A | Get subscription plans |
| POST | `/api/v1/subscriptions/create` | Bearer | Yes | Create subscription |
| POST | `/api/v1/subscriptions/cancel` | Bearer | Yes | Cancel subscription |
| POST | `/api/v1/subscriptions/reactivate` | Bearer | Yes | Reactivate subscription |
| GET | `/api/v1/subscriptions/status` | Bearer | N/A | Get subscription status |
| POST | `/api/v1/subscriptions/upgrade` | Bearer | Yes | Upgrade subscription |
| POST | `/api/v1/subscriptions/downgrade` | Bearer | Yes | Downgrade subscription |
| GET | `/api/v1/subscriptions/invoices` | Bearer | N/A | Get invoices |

### In-App Purchases
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/iap/apple/verify` | Bearer | Verify Apple receipt |
| POST | `/api/v1/iap/google/verify` | Bearer | Verify Google receipt |
| POST | `/api/v1/iap/restore` | Bearer | Restore purchases |

### Virtual Currency (Coins/Gems)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/coins/balance` | Bearer | Get coin balance |
| GET | `/api/v1/coins/packages` | Bearer | Get coin packages |
| POST | `/api/v1/coins/purchase` | Bearer | Purchase coins |
| POST | `/api/v1/coins/spend` | Bearer | Spend coins |
| GET | `/api/v1/coins/transactions` | Bearer | Get transactions |
| GET | `/api/v1/gems/balance` | Bearer | Get gem balance |
| POST | `/api/v1/gems/purchase` | Bearer | Purchase gems |

### Dynamic Pricing
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/pricing/calculate` | Bearer | Calculate dynamic price |
| GET | `/api/v1/pricing/promotions` | Bearer | Get active promotions |

---

## 6. FILE MANAGEMENT ENDPOINTS

### Media Service (`media-service`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/media/upload` | Bearer | Upload media (max 10MB) |
| GET | `/api/v1/media/photos` | Bearer | Get user photos |
| GET | `/api/v1/media/photos/:id` | None | Get specific photo |
| DELETE | `/api/v1/media/photos/:id` | Bearer | Delete photo |
| PUT | `/api/v1/media/photos/:id/profile` | Bearer | Set as profile photo |
| POST | `/api/v1/media/presign` | Bearer | Get presigned upload URL |
| POST | `/api/v1/media/video/upload` | Bearer | Upload video |
| GET | `/api/v1/media/video/:id` | Bearer | Get video |
| POST | `/api/v1/media/voice-note` | Bearer | Upload voice note |
| GET | `/api/v1/media/voice-note/:id` | Bearer | Get voice note |

### Photo Verification
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/verification/photo/submit` | Bearer | Submit verification photo |
| GET | `/api/v1/verification/photo/status` | Bearer | Check verification status |
| POST | `/api/v1/verification/photo/challenge` | Bearer | Get verification challenge |

---

## 7. NOTIFICATION ENDPOINTS

### Notification Service (`notification-service`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/notifications` | Bearer | Get notifications |
| PUT | `/api/v1/notifications/:id/read` | Bearer | Mark as read |
| PUT | `/api/v1/notifications/read-all` | Bearer | Mark all as read |
| DELETE | `/api/v1/notifications/:id` | Bearer | Delete notification |
| GET | `/api/v1/notifications/preferences` | Bearer | Get preferences |
| PUT | `/api/v1/notifications/preferences` | Bearer | Update preferences |
| POST | `/api/v1/devices/register` | Bearer | Register device |
| DELETE | `/api/v1/devices/:token` | Bearer | Unregister device |

### Internal Notification API
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/internal/notifications/send` | Service | Send notification |
| POST | `/api/internal/notifications/batch` | Service | Batch send |

---

## 8. ANALYTICS ENDPOINTS

### Analytics Service (`analytics-service`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/events` | Bearer | Track event |
| POST | `/api/v1/events/batch` | Bearer | Batch track events |
| GET | `/api/v1/analytics/dashboard` | Bearer | Get dashboard |
| GET | `/api/v1/analytics/engagement` | Bearer | Get engagement metrics |
| GET | `/api/v1/analytics/conversion` | Bearer | Get conversion metrics |

### Churn Prediction
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/churn-prediction` | Admin | Get churn predictions |
| GET | `/api/v1/churn-prediction/:userId` | Admin | Get user churn risk |

### Segmentation
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/segmentation/segments` | Admin | Get segments |
| POST | `/api/v1/segmentation/segments` | Admin | Create segment |
| GET | `/api/v1/segmentation/users/:segmentId` | Admin | Get segment users |

---

## 9. ADMIN ENDPOINTS

### Admin Service (`admin-service`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/dashboard` | Admin | Get admin dashboard |
| GET | `/api/admin/users` | Admin | List users |
| GET | `/api/admin/users/:id` | Admin | Get user details |
| POST | `/api/admin/users/:id/ban` | Admin | Ban user |
| POST | `/api/admin/users/:id/unban` | Admin | Unban user |
| POST | `/api/admin/users/:id/verify` | Admin | Verify user |
| DELETE | `/api/admin/users/:id` | Admin | Delete user |
| POST | `/api/admin/users/:id/reset-password` | Admin | Reset password |

### A/B Testing
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/ab-tests` | Admin | List A/B tests |
| POST | `/api/admin/ab-tests` | Admin | Create A/B test |
| GET | `/api/admin/ab-tests/:id` | Admin | Get A/B test |
| PUT | `/api/admin/ab-tests/:id` | Admin | Update A/B test |
| POST | `/api/admin/ab-tests/:id/start` | Admin | Start test |
| POST | `/api/admin/ab-tests/:id/pause` | Admin | Pause test |
| POST | `/api/admin/ab-tests/:id/complete` | Admin | Complete test |
| DELETE | `/api/admin/ab-tests/:id` | Admin | Delete test |
| GET | `/api/admin/ab-tests/:id/metrics` | Admin | Get test metrics |

### Support Tickets
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/tickets` | Admin | List tickets |
| GET | `/api/admin/tickets/stats` | Admin | Get ticket stats |
| GET | `/api/admin/tickets/:id` | Admin | Get ticket |
| POST | `/api/admin/tickets/:id/assign` | Admin | Assign ticket |
| POST | `/api/admin/tickets/:id/messages` | Admin | Add message |
| PUT | `/api/admin/tickets/:id/status` | Admin | Update status |
| PUT | `/api/admin/tickets/:id/priority` | Admin | Update priority |

### Audit Logs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/audit-logs` | Admin | Query audit logs |

### System Health
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/health` | Admin | Get system health |
| GET | `/api/admin/health/services/:name/logs` | Admin | Get service logs |
| POST | `/api/admin/health/services/:name/restart` | Admin | Restart service |

---

## 10. WEBHOOK ENDPOINTS

### Payment Webhooks (`payment-service`)
| Method | Endpoint | Signature Header | Description |
|--------|----------|------------------|-------------|
| POST | `/api/v1/webhooks/stripe` | Stripe-Signature | Stripe events |
| POST | `/api/v1/webhooks/paystack` | x-paystack-signature | Paystack events |
| POST | `/api/v1/webhooks/flutterwave` | verif-hash | Flutterwave events |
| GET | `/api/v1/webhooks/health` | None | Webhook health check |
| POST | `/api/v1/webhooks/test` | None | Test webhook |

### Stripe Webhook Events Handled:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `invoice.paid`
- `invoice.payment_failed`
- `checkout.session.completed`

---

## 11. MATCHING & DISCOVERY ENDPOINTS

### Matching Service (`matching-service`) - 15 Route Files
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/discovery` | Bearer | Get discovery feed |
| POST | `/api/v1/discovery/refresh` | Bearer | Refresh discovery |
| GET | `/api/v1/discovery/curated-picks` | Bearer | Get curated picks |
| GET | `/api/v1/discovery/preferences` | Bearer | Get discovery prefs |
| PUT | `/api/v1/discovery/preferences` | Bearer | Update prefs |

### Swipes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/swipes` | Bearer | Process swipe |
| GET | `/api/v1/swipes/likes` | Bearer | Get who liked me |
| GET | `/api/v1/swipes/stats` | Bearer | Get swipe stats |
| POST | `/api/v1/swipes/undo` | Bearer | Undo last swipe |

### Matches
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/matches` | Bearer | Get matches |
| GET | `/api/v1/matches/recent` | Bearer | Get recent matches |
| GET | `/api/v1/matches/count` | Bearer | Get match count |
| GET | `/api/v1/matches/:id` | Bearer | Get match |
| DELETE | `/api/v1/matches/:id` | Bearer | Unmatch |
| POST | `/api/v1/matches/:id/extend` | Bearer | Extend match |

### Super Likes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/super-likes` | Bearer | Send super like |
| GET | `/api/v1/super-likes/remaining` | Bearer | Get remaining |
| GET | `/api/v1/super-likes/received` | Bearer | Get received |

### Boosts
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/boosts/activate` | Bearer | Activate boost |
| GET | `/api/v1/boosts/active` | Bearer | Get active boost |
| GET | `/api/v1/boosts/history` | Bearer | Get boost history |
| GET | `/api/v1/boosts/packages` | Bearer | Get packages |
| GET | `/api/v1/boosts/stats` | Bearer | Get boost stats |

### Speed Dating
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/speed-dating/events` | Bearer | Get events |
| POST | `/api/v1/speed-dating/events/:id/join` | Bearer | Join event |
| POST | `/api/v1/speed-dating/events/:id/leave` | Bearer | Leave event |
| GET | `/api/v1/speed-dating/active` | Bearer | Get active session |

### Group Matching
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/group-matching/groups` | Bearer | Get groups |
| POST | `/api/v1/group-matching/groups` | Bearer | Create group |
| POST | `/api/v1/group-matching/groups/:id/invite` | Bearer | Invite to group |

### Passport Mode
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/passport/location` | Bearer | Get passport location |
| PUT | `/api/v1/passport/location` | Bearer | Set location |
| DELETE | `/api/v1/passport/location` | Bearer | Clear location |

---

## 12. MESSAGING ENDPOINTS

### Messaging Service (`messaging-service`) - 9 Route Files
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/conversations` | Bearer | Get conversations |
| POST | `/api/v1/conversations` | Bearer | Create conversation |
| GET | `/api/v1/conversations/with/:userId` | Bearer | Get/create with user |
| GET | `/api/v1/conversations/:id` | Bearer | Get conversation |
| DELETE | `/api/v1/conversations/:id` | Bearer | Delete conversation |
| PUT | `/api/v1/conversations/:id/read` | Bearer | Mark as read |
| POST | `/api/v1/conversations/:id/typing` | Bearer | Send typing indicator |
| GET | `/api/v1/conversations/:id/typing` | Bearer | Get typing users |

### Messages
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/conversations/:id/messages` | Bearer | Get messages |
| POST | `/api/v1/conversations/:id/messages` | Bearer | Send message |
| PUT | `/api/v1/messages/:id` | Bearer | Edit message |
| DELETE | `/api/v1/messages/:id` | Bearer | Delete message |
| POST | `/api/v1/messages/:id/react` | Bearer | React to message |

### Calls
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/calls/initiate` | Bearer | Initiate call |
| POST | `/api/v1/calls/:id/answer` | Bearer | Answer call |
| POST | `/api/v1/calls/:id/end` | Bearer | End call |
| GET | `/api/v1/calls/history` | Bearer | Get call history |

### Encryption Keys
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/encryption-keys` | Bearer | Register keys |
| GET | `/api/v1/encryption-keys/:userId` | Bearer | Get user keys |
| DELETE | `/api/v1/encryption-keys` | Bearer | Delete keys |

### Virtual Gifts
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/gifts` | Bearer | Get available gifts |
| POST | `/api/v1/gifts/:id/send` | Bearer | Send gift |
| GET | `/api/v1/gifts/received` | Bearer | Get received gifts |
| GET | `/api/v1/gifts/sent` | Bearer | Get sent gifts |

---

## 13. GAMIFICATION ENDPOINTS

### User Service - Gamification
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/gamification` | Bearer | Get gamification status |
| GET | `/api/v1/gamification/achievements` | Bearer | Get achievements |
| POST | `/api/v1/gamification/achievements/:id/claim` | Bearer | Claim achievement |
| GET | `/api/v1/gamification/quests` | Bearer | Get active quests |
| POST | `/api/v1/gamification/quests/:id/claim` | Bearer | Claim quest reward |
| GET | `/api/v1/gamification/streak` | Bearer | Get streak info |
| POST | `/api/v1/gamification/daily-reward` | Bearer | Claim daily reward |
| GET | `/api/v1/gamification/daily-rewards/status` | Bearer | Get daily reward status |
| POST | `/api/v1/gamification/spin` | Bearer | Spin wheel |
| GET | `/api/v1/gamification/leaderboard` | Bearer | Get leaderboard |

### Referrals
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/referrals/code` | Bearer | Get referral code |
| POST | `/api/v1/referrals/code/custom` | Bearer | Create custom code |
| POST | `/api/v1/referrals/apply` | Bearer | Apply referral code |
| GET | `/api/v1/referrals/stats` | Bearer | Get referral stats |
| GET | `/api/v1/referrals/leaderboard` | Bearer | Get leaderboard |

---

## 14. MODERATION ENDPOINTS

### Moderation Service (`moderation-service`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/moderation/report` | Bearer | Report content |
| GET | `/api/v1/moderation/violations` | Bearer | Get my violations |
| POST | `/api/v1/moderation/appeals` | Bearer | Submit appeal |
| GET | `/api/v1/moderation/appeals/:id` | Bearer | Get appeal status |

### Internal Moderation
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/internal/moderation/check` | Service | Check content |
| POST | `/api/internal/moderation/queue` | Service | Queue for review |

### CSAM Detection (Internal)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/internal/csam/detect` | Service | Detect CSAM |
| POST | `/api/internal/csam/report` | Service | Report to NCMEC |

---

## 15. PARTNERSHIP ENDPOINTS

### Partnership Service (`partnership-service`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/partnerships/restaurants/search` | Bearer | Search restaurants |
| GET | `/api/v1/partnerships/restaurants/date-night` | Bearer | Date night suggestions |
| GET | `/api/v1/partnerships/restaurants/:id/availability` | Bearer | Check availability |
| POST | `/api/v1/partnerships/restaurants/reservations` | Bearer | Make reservation |
| DELETE | `/api/v1/partnerships/restaurants/reservations/:id` | Bearer | Cancel reservation |
| GET | `/api/v1/partnerships/events/search` | Bearer | Search events |
| GET | `/api/v1/partnerships/events/date-friendly` | Bearer | Date-friendly events |
| POST | `/api/v1/partnerships/events/purchases` | Bearer | Purchase tickets |
| GET | `/api/v1/partnerships/gifts/search` | Bearer | Search gifts |
| POST | `/api/v1/partnerships/gifts/orders` | Bearer | Place gift order |
| POST | `/api/v1/partnerships/date-plans/generate` | Bearer | Generate date plans |

---

## Message Queue Inventory

### RabbitMQ Queues
| Queue | Service | Purpose |
|-------|---------|---------|
| `match_events` | automation-service | Match lifecycle events |
| `message_events` | automation-service | Message events |
| `notifications` | notification-service | Notification delivery |

### AWS SQS Queues
| Queue | Purpose | DLQ |
|-------|---------|-----|
| `matching` | Match processing | Yes |
| `notification` | Push notifications | Yes |
| `analytics` | Event tracking | Yes |
| `moderation` | Content moderation | Yes |
| `media-processing` | Media processing | Yes |
| `email` | Email delivery | Yes |
| `sms` | SMS delivery | Yes |

### AWS SNS Topics
| Topic | Purpose |
|-------|---------|
| `user-events` | User lifecycle |
| `match-events` | Matches and likes |
| `message-events` | Chat messages |
| `payment-events` | Payments |

---

## WebSocket Events

### Real-time Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `new_message` | Server→Client | New message received |
| `message_delivered` | Server→Client | Message delivered |
| `message:read` | Server→Client | Read receipt |
| `typing` | Both | Typing indicator |
| `stop_typing` | Both | Stop typing |
| `user_online` | Server→Client | User online |
| `user_offline` | Server→Client | User offline |
| `match:new` | Server→Client | New match |
| `super_like_received` | Server→Client | Super like |
| `coin_update` | Server→Client | Coin balance change |
| `streak_update` | Server→Client | Streak update |
| `reward_claimed` | Server→Client | Reward earned |

---

## Authentication Summary

| Type | Usage |
|------|-------|
| Bearer Token (JWT) | User authentication |
| Service Key | Internal service-to-service |
| Webhook Signature | Payment provider webhooks |
| API Key | Third-party integrations |

---

## Rate Limiting

| Endpoint Group | Limit |
|----------------|-------|
| Auth endpoints | 100 req/5min/IP |
| General API | 1000 req/5min/IP |
| Password reset | 5 req/hour/IP |
| Verification | 10 req/hour/IP |
| File uploads | 20 req/min/user |

---

*Document generated as part of Phase 0 SaaS Platform Audit*
