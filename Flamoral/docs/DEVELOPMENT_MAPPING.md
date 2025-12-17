# Flamoral Dating Platform - Development Mapping Structure

**Version:** 1.0.0
**Last Updated:** 2025-12-16
**Purpose:** Complete feature-to-code mapping for engineering teams

---

## Table of Contents

1. [Feature-to-Module Mapping](#1-feature-to-module-mapping)
2. [Frontend Components ↔ Backend Services Alignment](#2-frontend-components--backend-services-alignment)
3. [API Ownership per Feature](#3-api-ownership-per-feature)
4. [Infrastructure and Environment Dependencies](#4-infrastructure-and-environment-dependencies)
5. [Build Order and Implementation Sequence](#5-build-order-and-implementation-sequence)
6. [Testing Strategy Mapped to Each Feature](#6-testing-strategy-mapped-to-each-feature)

---

## 1. Feature-to-Module Mapping

### 1.1 Authentication & Authorization

**Frontend Components:**
- Location: `apps/web-app/src/pages/Auth/`
  - `LoginPage.tsx`
  - `SignupPage.tsx`
  - `VerifyEmailPage.tsx`
  - `ResendVerificationPage.tsx`
- Service: `apps/web-app/src/services/auth.service.ts`
- Context: `apps/web-app/src/contexts/AuthContext.tsx`

**Backend Service:**
- Service: `backend/services/auth-service/`
- Controllers:
  - `src/controllers/auth.controller.ts`
  - `src/controllers/oauth.controller.ts`
- Routes:
  - `src/routes/auth.routes.ts`
  - `src/routes/oauth.routes.ts`

**Database Tables:**
- PostgreSQL:
  - `users` (id, email, password_hash, role, status)
  - `sessions` (refresh_token, user_id, expires_at)
  - `device_tokens` (user_id, token, platform)

**API Endpoints:**
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh-token
POST   /api/auth/verify-email
POST   /api/auth/resend-verification
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me

# OAuth
GET    /api/oauth/google
GET    /api/oauth/google/callback
GET    /api/oauth/facebook
GET    /api/oauth/facebook/callback
GET    /api/oauth/apple
POST   /api/oauth/apple/callback
```

---

### 1.2 User Profile Management

**Frontend Components:**
- Location: `apps/web-app/src/pages/Profile/`
  - `ProfilePage.tsx`
  - `EditProfilePage.tsx`
  - `PhotoManagementPage.tsx`
- Service: `apps/web-app/src/services/profile.service.ts`
- Components: `apps/web-app/src/components/Profile/`

**Backend Service:**
- Service: `backend/services/user-service/`
- Controllers:
  - `src/controllers/user.controller.ts`
  - `src/controllers/profile.controller.ts`
  - `src/controllers/photo.controller.ts`
- Routes:
  - `src/routes/user.routes.ts`
  - `src/routes/profile.routes.ts`

**Database Tables:**
- PostgreSQL:
  - `profiles` (user_id, first_name, bio, location_point, preferences)
  - `photos` (user_id, url, position, is_primary, moderation_status)
  - `interests` (name, category)
  - `user_interests` (user_id, interest_id)
  - `preferences` (user_id, interested_in_genders, min_age, max_age, max_distance_km)

**API Endpoints:**
```
GET    /users/me
PUT    /users/me
GET    /users/:userId
PUT    /users/:userId
DELETE /users/:userId

# Photos
POST   /users/me/photos
GET    /users/me/photos
DELETE /users/me/photos/:photoId
PUT    /users/me/photos/:photoId/primary

# Preferences
GET    /users/me/preferences
PUT    /users/me/preferences
GET    /users/me/settings
PUT    /users/me/settings
PUT    /users/me/location
```

---

### 1.3 Discovery & Matching

**Frontend Components:**
- Location: `apps/web-app/src/pages/Discovery/`
  - `DiscoveryPage.tsx`
  - `EnhancedDiscoveryPage.tsx`
- Location: `apps/web-app/src/pages/Matches/`
  - `MatchesPage.tsx`
- Services:
  - `apps/web-app/src/services/discovery.service.ts`
  - `apps/web-app/src/services/matching.service.ts`

**Backend Service:**
- Service: `backend/services/matching-service/`
- Controllers:
  - `src/controllers/discovery.controller.ts`
  - `src/controllers/matching.controller.ts`
  - `src/controllers/swipe.controller.ts`
  - `src/controllers/recommendation.controller.ts`
- Routes:
  - `src/routes/discovery.routes.ts`
  - `src/routes/matching.routes.ts`

**Database Tables:**
- PostgreSQL:
  - `swipes` (user_id, target_user_id, action)
  - `matches` (user1_id, user2_id, matched_at, last_message_at)
  - `daily_limits` (user_id, date, likes_count, super_likes_count)
- Redis:
  - `discovery:{user_id}` (List - discovery queue)
  - `online_users` (Sorted Set)
- Elasticsearch:
  - `users_index` (user search and discovery)

**API Endpoints:**
```
# Discovery
GET    /discovery/recommendations
POST   /discovery/search
GET    /discovery/nearby

# Likes & Swipes
POST   /likes
GET    /likes/received
GET    /likes/sent
POST   /passes
POST   /actions/undo

# Matches
GET    /matches
GET    /matches/count
GET    /matches/:matchId
DELETE /matches/:matchId
GET    /matches/:matchId/compatibility

# Super Likes
POST   /super-likes
GET    /super-likes/remaining

# Boost
POST   /boost
GET    /boost/status
```

---

### 1.4 Messaging & Real-time Communication

**Frontend Components:**
- Location: `apps/web-app/src/pages/Messages/`
  - `MessagesPage.tsx`
  - `EnhancedMessagesPage.tsx`
- Service: `apps/web-app/src/services/messaging.service.ts`
- Socket: `apps/web-app/src/services/socket.service.ts`
- Components: `apps/web-app/src/components/Messages/`

**Backend Services:**
- Service: `backend/services/messaging-service/`
  - Controllers: `src/controllers/message.controller.ts`, `src/controllers/conversation.controller.ts`
  - Routes: `src/routes/message.routes.ts`
- Service: `backend/services/realtime-service/`
  - WebSocket handlers: `src/websocket/`
  - HTTP API: `src/api/`

**Database Tables:**
- MongoDB:
  - `messages` (match_id, sender_id, content, type, read, read_at)
  - `conversations` (match_id, last_message, unread_counts)
- PostgreSQL:
  - `matches` (updated with last_message_at, message_count)
- Redis:
  - `notifications:{user_id}` (List - message notifications)

**API Endpoints:**
```
# Messaging Service
GET    /conversations
POST   /conversations
GET    /conversations/with/:otherUserId
GET    /conversations/:conversationId
DELETE /conversations/:conversationId
PUT    /conversations/:conversationId/read
GET    /conversations/:conversationId/messages
POST   /messages
GET    /messages/unread-count
GET    /messages/:messageId
PUT    /messages/:messageId
DELETE /messages/:messageId
PUT    /messages/:messageId/status
GET    /users/:userId/status

# Realtime Service
WS     /ws
GET    /api/presence/:userId
POST   /api/presence/batch
GET    /api/online/users
GET    /api/online/count
GET    /api/typing/:conversationId
POST   /api/publish/message
POST   /api/publish/read-receipt
POST   /api/publish/typing
```

**WebSocket Message Types:**
```
Client → Server:
- typing.start
- typing.stop
- message.read
- presence.update
- ping

Server → Client:
- message.new
- message.read
- message.deleted
- typing.start
- typing.stop
- presence.update
- match.new
- notification.new
- pong
```

---

### 1.5 Media Management

**Frontend Components:**
- Location: `apps/web-app/src/pages/Profile/`
  - Photo upload components
- Service: `apps/web-app/src/services/media.service.ts`
- Components: `apps/web-app/src/components/Media/`

**Backend Service:**
- Service: `backend/services/media-service/`
- Controllers:
  - `src/controllers/upload.controller.ts`
  - `src/controllers/media.controller.ts`
  - `src/controllers/moderation.controller.ts`
- Routes:
  - `src/routes/upload.routes.ts`
  - `src/routes/media.routes.ts`

**Database Tables:**
- PostgreSQL:
  - `photos` (url, thumbnail_url, moderation_status, width, height)
- Azure Blob Storage:
  - Container: `photos`
  - Container: `videos`
  - CDN: `https://cdn.flamoral.com`

**API Endpoints:**
```
# Upload
POST   /media/upload/image
POST   /media/upload/video
POST   /media/upload/batch

# Media Management
GET    /media/user/:userId
GET    /media/:mediaId
DELETE /media/:mediaId
GET    /media/:mediaId/status

# Processing
POST   /media/:mediaId/resize
POST   /media/:mediaId/thumbnail
GET    /media/:mediaId/url

# Moderation
GET    /media/:mediaId/moderation
POST   /media/:mediaId/moderation/review

# Analytics
GET    /media/:mediaId/analytics
POST   /media/:mediaId/views
```

---

### 1.6 Payment & Subscriptions

**Frontend Components:**
- Location: `apps/web-app/src/pages/Payment/`
  - `PaymentPage.tsx`
  - `SubscriptionPage.tsx`
- Location: `apps/web-app/src/pages/Subscription/`
  - `SubscriptionManagementPage.tsx`
- Services:
  - `apps/web-app/src/services/payment.service.ts`
  - `apps/web-app/src/services/subscription.service.ts`

**Backend Service:**
- Service: `backend/services/payment-service/`
- Controllers:
  - `src/controllers/subscription.controller.ts`
  - `src/controllers/payment.controller.ts`
  - `src/controllers/webhook.controller.ts`
- Routes:
  - `src/routes/subscription.routes.ts`
  - `src/routes/payment.routes.ts`
  - `src/routes/webhook.routes.ts`

**Database Tables:**
- PostgreSQL:
  - `users` (subscription_tier, subscription_expires_at, stripe_customer_id)
  - `transactions` (user_id, transaction_type, amount_cents, stripe_payment_intent_id, payment_status)
  - `coin_balances` (user_id, balance, lifetime_earned, lifetime_spent)
  - `coin_transactions` (user_id, amount, transaction_type, balance_after)

**API Endpoints:**
```
# Subscription Plans
GET    /subscriptions/plans
GET    /subscriptions/plans/:planId

# User Subscriptions
GET    /subscriptions/me
POST   /subscriptions
PUT    /subscriptions/me/upgrade
DELETE /subscriptions/me
POST   /subscriptions/me/reactivate

# Payment Methods
GET    /payment-methods
POST   /payment-methods
DELETE /payment-methods/:paymentMethodId
PUT    /payment-methods/:paymentMethodId/default

# Transactions
GET    /transactions
GET    /transactions/:transactionId

# In-App Purchases
GET    /purchases/products
POST   /purchases
GET    /purchases/history

# Invoices
GET    /invoices
GET    /invoices/:invoiceId/download

# Webhooks
POST   /webhooks/stripe
POST   /webhooks/paystack
POST   /webhooks/flutterwave

# Promo Codes
POST   /promo-codes/apply
POST   /promo-codes/validate
```

---

### 1.7 Notifications

**Frontend Components:**
- Location: `apps/web-app/src/pages/Notifications/`
  - `NotificationsPage.tsx`
- Components: `apps/web-app/src/components/Notifications/`
- Context: `apps/web-app/src/contexts/NotificationContext.tsx`

**Backend Service:**
- Service: `backend/services/notification-service/`
- Controllers:
  - `src/controllers/notification.controller.ts`
  - `src/controllers/push.controller.ts`
  - `src/controllers/email.controller.ts`
- Routes:
  - `src/routes/notification.routes.ts`

**Database Tables:**
- PostgreSQL:
  - `notifications` (user_id, type, title, body, data, read, sent)
  - `device_tokens` (user_id, token, platform, active)
- RabbitMQ:
  - Queue: `notification_queue`

**API Endpoints:**
```
# Notifications
GET    /notifications
GET    /notifications/unread/count
PUT    /notifications/read-all
GET    /notifications/settings
GET    /notifications/:notificationId
PUT    /notifications/:notificationId/read
DELETE /notifications/:notificationId
DELETE /notifications
PUT    /notifications/settings

# Push Notifications
POST   /notifications/push/register
DELETE /notifications/push/register
POST   /notifications/push/test

# Email Notifications
GET    /notifications/email/preferences
PUT    /notifications/email/preferences
```

---

### 1.8 Analytics & Tracking

**Frontend Components:**
- Location: `apps/web-app/src/pages/Admin/`
  - `AdminAnalyticsPage.tsx`
  - `AdminDashboardPage.tsx`
- Service: `apps/web-app/src/services/dashboard.service.ts`

**Backend Service:**
- Service: `backend/services/analytics-service/`
- Controllers:
  - `src/controllers/analytics.controller.ts`
  - `src/controllers/events.controller.ts`
  - `src/controllers/dashboard.controller.ts`
  - `src/controllers/tracking.controller.ts`
- Routes:
  - `src/routes/analytics.routes.ts`
  - `src/routes/dashboard.routes.ts`

**Database Tables:**
- PostgreSQL:
  - `analytics_events` (user_id, event_name, event_properties, session_id)
- MongoDB:
  - `analytics` (detailed event logs)
- Elasticsearch:
  - `analytics_index` (aggregations and reporting)
- RabbitMQ:
  - Queue: `analytics_queue`

**API Endpoints:**
```
# User Analytics
GET    /analytics/dashboard
GET    /analytics/profile/views
GET    /analytics/matches/stats
GET    /analytics/messages/stats
GET    /analytics/likes/stats

# Event Tracking
POST   /analytics/events
POST   /analytics/pageviews
POST   /analytics/actions

# Engagement Metrics
GET    /analytics/engagement
GET    /analytics/engagement/response-rate
GET    /analytics/activity/timeline

# Admin Analytics
GET    /analytics/platform/stats
GET    /analytics/platform/demographics
GET    /analytics/platform/revenue
GET    /analytics/platform/retention

# Funnel & Testing
GET    /analytics/funnel
GET    /analytics/ab-tests/:testId
POST   /analytics/export
```

---

### 1.9 Moderation & Safety

**Frontend Components:**
- Location: `apps/web-app/src/pages/Admin/`
  - `AdminModerationPage.tsx`
  - `ModerationQueue.tsx`
  - `ModerationStats.tsx`
- Location: `apps/web-app/src/pages/Safety/`
  - Safety reporting components
- Services:
  - `apps/web-app/src/services/moderation.service.ts`
  - `apps/web-app/src/services/safety.service.ts`
  - `apps/web-app/src/services/report.service.ts`

**Backend Service:**
- Service: `backend/services/moderation-service/`
- Controllers:
  - `src/controllers/moderation.controller.ts`
  - `src/controllers/report.controller.ts`
  - `src/controllers/action.controller.ts`
- Routes:
  - `src/routes/moderation.routes.ts`

**Database Tables:**
- PostgreSQL:
  - `reports` (reporter_user_id, reported_user_id, reason, status, reviewed_by)
  - `blocks` (blocker_user_id, blocked_user_id, reason)
  - `photos` (moderation_status, moderation_flags, moderated_by)
- MongoDB:
  - `audit_logs` (action, entity_type, changes, reason)
- RabbitMQ:
  - Queue: `moderation_queue`

**API Endpoints:**
```
# Content Moderation
POST   /moderation/submit
GET    /moderation/status/:contentId
GET    /moderation/queue
PUT    /moderation/approve/:contentId
PUT    /moderation/reject/:contentId

# Reports
POST   /moderation/reports
GET    /moderation/reports/me
GET    /moderation/reports
GET    /moderation/reports/:reportId
PUT    /moderation/reports/:reportId

# User Actions
POST   /moderation/actions/ban
POST   /moderation/actions/unban
POST   /moderation/actions/warn
GET    /moderation/users/:userId/history

# AI Moderation
POST   /moderation/scan/text
POST   /moderation/scan/image

# Statistics
GET    /moderation/statistics
```

---

### 1.10 Admin Panel

**Frontend Components:**
- Location: `apps/web-app/src/pages/Admin/`
  - `AdminDashboardPage.tsx`
  - `AdminUsersPage.tsx`
  - `UserManagementPage.tsx`
  - `AdminReportsPage.tsx`
  - `AdminAnalyticsPage.tsx`
  - `AdminSettingsPage.tsx`
  - `AdminSystemHealthPage.tsx`
- Service: `apps/web-app/src/services/admin-user.service.ts`

**Backend Service:**
- Service: `backend/services/admin-service/`
- Controllers:
  - `src/controllers/admin.controller.ts`
  - `src/controllers/user-management.controller.ts`
  - `src/controllers/stats.controller.ts`
- Routes:
  - `src/routes/admin.routes.ts`

**Database Tables:**
- PostgreSQL:
  - `users` (role = 'admin' or 'moderator')
  - All tables (admin has read access)
- MongoDB:
  - `audit_logs` (admin actions)

**API Endpoints:**
```
# User Management
GET    /admin/users
GET    /admin/users/:userId
PUT    /admin/users/:userId
POST   /admin/users/:userId/suspend
POST   /admin/users/:userId/ban
DELETE /admin/users/:userId

# Statistics
GET    /admin/stats
GET    /admin/analytics/users

# Moderation Queue
GET    /admin/moderation/queue
POST   /admin/moderation/:itemId/review
```

---

### 1.11 Video Calling

**Frontend Components:**
- Location: `apps/web-app/src/pages/VideoCall/`
  - Video call components
- Service: `apps/web-app/src/services/video-chat.service.ts`
- External: `apps/web-app/src/services/agora.service.ts`

**Backend Service:**
- Service: Handled through `backend/services/realtime-service/`
- Integration with Agora SDK

**Database Tables:**
- MongoDB:
  - Call history logs
- PostgreSQL:
  - Call metadata (minimal)

**External Services:**
- Agora (Video/Voice calling)
- Token generation for secure calls

---

### 1.12 Gamification

**Frontend Components:**
- Location: `apps/web-app/src/pages/Gamification/`
  - `GamificationPage.tsx`
- Location: `apps/web-app/src/pages/Coins/`
  - `CoinShopPage.tsx`
- Services:
  - `apps/web-app/src/services/gamification.service.ts`
  - `apps/web-app/src/services/coin.service.ts`
  - `apps/web-app/src/services/boost.service.ts`

**Backend Service:**
- Handled through multiple services (User, Payment, Matching)

**Database Tables:**
- PostgreSQL:
  - `coin_balances`
  - `coin_transactions`
  - `boosts`
  - `daily_limits`

---

## 2. Frontend Components ↔ Backend Services Alignment

### 2.1 Complete Mapping Table

| Frontend Page/Component | Frontend Service | Backend Service | API Endpoints Used |
|------------------------|------------------|-----------------|-------------------|
| **Auth** | | | |
| `LoginPage.tsx` | `auth.service.ts` | `auth-service` | `POST /api/auth/login` |
| `SignupPage.tsx` | `auth.service.ts` | `auth-service` | `POST /api/auth/register` |
| `VerifyEmailPage.tsx` | `auth.service.ts` | `auth-service` | `POST /api/auth/verify-email` |
| **Profile** | | | |
| `ProfilePage.tsx` | `profile.service.ts` | `user-service` | `GET /users/me`, `GET /users/:userId` |
| `EditProfilePage.tsx` | `profile.service.ts` | `user-service` | `PUT /users/me`, `PUT /users/me/preferences` |
| Photo components | `media.service.ts` | `media-service`, `user-service` | `POST /media/upload/image`, `POST /users/me/photos` |
| **Discovery** | | | |
| `DiscoveryPage.tsx` | `discovery.service.ts` | `matching-service` | `GET /discovery/recommendations`, `POST /likes` |
| `AdvancedFiltersPage.tsx` | `discovery.service.ts` | `matching-service` | `POST /discovery/search` |
| **Matches** | | | |
| `MatchesPage.tsx` | `matching.service.ts` | `matching-service` | `GET /matches`, `GET /matches/count` |
| **Messaging** | | | |
| `MessagesPage.tsx` | `messaging.service.ts` | `messaging-service`, `realtime-service` | `GET /conversations`, `WS /ws` |
| Message components | `messaging.service.ts`, `socket.service.ts` | `messaging-service`, `realtime-service` | `POST /messages`, WebSocket events |
| **Payment** | | | |
| `PaymentPage.tsx` | `payment.service.ts` | `payment-service` | `POST /subscriptions`, `POST /payment-methods` |
| `SubscriptionPage.tsx` | `subscription.service.ts` | `payment-service` | `GET /subscriptions/plans`, `GET /subscriptions/me` |
| `CoinShopPage.tsx` | `coin.service.ts` | `payment-service` | `GET /purchases/products`, `POST /purchases` |
| **Notifications** | | | |
| `NotificationsPage.tsx` | Socket context | `notification-service` | `GET /notifications`, `GET /notifications/unread/count` |
| **Admin** | | | |
| `AdminDashboardPage.tsx` | `dashboard.service.ts` | `admin-service`, `analytics-service` | `GET /admin/stats`, `GET /analytics/dashboard` |
| `AdminUsersPage.tsx` | `admin-user.service.ts` | `admin-service` | `GET /admin/users`, `PUT /admin/users/:userId` |
| `AdminModerationPage.tsx` | `moderation.service.ts` | `moderation-service` | `GET /moderation/queue`, `PUT /moderation/approve/:contentId` |
| `AdminAnalyticsPage.tsx` | `dashboard.service.ts` | `analytics-service` | `GET /analytics/platform/stats` |
| **Safety** | | | |
| Report components | `report.service.ts`, `safety.service.ts` | `moderation-service` | `POST /moderation/reports` |
| Block components | `block.service.ts` | `user-service` | `POST /users/me/blocks`, `GET /users/me/blocks` |
| **Video Calls** | | | |
| Video call components | `video-chat.service.ts`, `agora.service.ts` | `realtime-service` | Agora SDK integration |
| **Gamification** | | | |
| `GamificationPage.tsx` | `gamification.service.ts` | Various services | Gamification endpoints |
| **Communities** | | | |
| `CommunitiesPage.tsx` | `communities.service.ts` | Feature in development | Community endpoints |
| **Speed Dating** | | | |
| Speed dating components | `speed-dating.service.ts` | Feature in development | Speed dating endpoints |
| **Referral** | | | |
| Referral components | `referral.service.ts` | Feature in development | Referral endpoints |

---

### 2.2 Service Dependencies Graph

```
Frontend Services Call Chain:

auth.service.ts
  └── POST /api/auth/login
  └── POST /api/auth/register
      └── Triggers: profile.service.ts initial setup

profile.service.ts
  └── GET /users/me
  └── PUT /users/me
      └── Can trigger: media.service.ts (photo upload)

discovery.service.ts
  └── GET /discovery/recommendations
      └── Uses: matching-service (recommendation engine)
      └── Calls: POST /likes (when user swipes)
          └── Can trigger: matching.service.ts (if mutual match)
              └── Triggers: socket.service.ts (match notification)
              └── Triggers: messaging.service.ts (conversation creation)

matching.service.ts
  └── GET /matches
  └── GET /matches/:matchId
      └── Displays: conversation link
          └── Routes to: MessagesPage

messaging.service.ts
  └── GET /conversations
  └── POST /messages
      └── Uses: socket.service.ts (real-time delivery)
          └── Backend: realtime-service WebSocket

socket.service.ts
  └── WS /ws
      └── Listens: message.new, match.new, notification.new
      └── Updates: React state via contexts

payment.service.ts
  └── POST /subscriptions
      └── Backend: payment-service → Stripe API
      └── Success: Updates user.subscription_tier
          └── Affects: discovery.service.ts (unlock premium filters)

subscription.service.ts
  └── GET /subscriptions/me
      └── Checks entitlements
          └── Controls UI features visibility
```

---

## 3. API Ownership per Feature

### 3.1 Authentication & Authorization

**Service Owner:** `auth-service`
**Port:** 3001

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/auth/register` | POST | User registration | ✅ |
| `/api/auth/login` | POST | User login | ✅ |
| `/api/auth/logout` | POST | User logout | ✅ |
| `/api/auth/refresh-token` | POST | Refresh access token | ✅ |
| `/api/auth/verify-email` | POST | Verify email address | ✅ |
| `/api/auth/resend-verification` | POST | Resend verification email | ✅ |
| `/api/auth/forgot-password` | POST | Request password reset | ✅ |
| `/api/auth/reset-password` | POST | Reset password | ✅ |
| `/api/auth/me` | GET | Get current user | ✅ |
| `/api/auth/validate-token` | POST | Internal token validation | ✅ |
| `/api/oauth/google` | GET | Google OAuth initiate | ✅ |
| `/api/oauth/google/callback` | GET | Google OAuth callback | ✅ |
| `/api/oauth/facebook` | GET | Facebook OAuth initiate | ✅ |
| `/api/oauth/facebook/callback` | GET | Facebook OAuth callback | ✅ |
| `/api/oauth/apple` | GET | Apple Sign In initiate | ✅ |
| `/api/oauth/apple/callback` | POST | Apple Sign In callback | ✅ |

**Gaps/Inconsistencies:**
- None identified

---

### 3.2 User & Profile Management

**Service Owner:** `user-service`
**Port:** 3002

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/users/me` | GET | Get own profile | ✅ |
| `/users/me` | PUT | Update own profile | ✅ |
| `/users/:userId` | GET | Get user profile | ✅ |
| `/users/:userId` | PUT | Update user profile (admin) | ✅ |
| `/users/:userId` | DELETE | Delete user account | ✅ |
| `/users/me/photos` | POST | Upload photo | ✅ |
| `/users/me/photos` | GET | List photos | ✅ |
| `/users/me/photos/:photoId` | DELETE | Delete photo | ✅ |
| `/users/me/photos/:photoId/primary` | PUT | Set primary photo | ✅ |
| `/users/me/preferences` | GET | Get preferences | ✅ |
| `/users/me/preferences` | PUT | Update preferences | ✅ |
| `/users/me/settings` | GET | Get settings | ✅ |
| `/users/me/settings` | PUT | Update settings | ✅ |
| `/users/me/location` | PUT | Update location | ✅ |
| `/users/me/blocks` | POST | Block user | ✅ |
| `/users/me/blocks` | GET | List blocked users | ✅ |
| `/users/me/blocks/:blockedUserId` | DELETE | Unblock user | ✅ |
| `/users/me/reports` | POST | Report user | ✅ |
| `/users/me/verification` | POST | Submit verification | ✅ |
| `/users/me/verification` | GET | Get verification status | ✅ |

**Gaps/Inconsistencies:**
- None identified

---

### 3.3 Matching & Discovery

**Service Owner:** `matching-service`
**Port:** 3004

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/discovery/recommendations` | GET | Get discovery profiles | ✅ |
| `/discovery/search` | POST | Advanced search | ✅ |
| `/discovery/nearby` | GET | Nearby users | ✅ |
| `/likes` | POST | Like/swipe right | ✅ |
| `/likes/received` | GET | Likes received | ✅ |
| `/likes/sent` | GET | Likes sent | ✅ |
| `/passes` | POST | Pass/swipe left | ✅ |
| `/actions/undo` | POST | Undo last swipe | ✅ |
| `/matches` | GET | List matches | ✅ |
| `/matches/count` | GET | Match count | ✅ |
| `/matches/:matchId` | GET | Get match details | ✅ |
| `/matches/:matchId` | DELETE | Unmatch | ✅ |
| `/matches/:matchId/compatibility` | GET | Compatibility score | ✅ |
| `/super-likes` | POST | Send super like | ✅ |
| `/super-likes/remaining` | GET | Remaining super likes | ✅ |
| `/boost` | POST | Activate boost | ✅ |
| `/boost/status` | GET | Current boost status | ✅ |

**Gaps/Inconsistencies:**
- None identified

---

### 3.4 Messaging

**Service Owner:** `messaging-service`
**Port:** 3003

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/conversations` | GET | List conversations | ✅ |
| `/conversations` | POST | Create conversation | ✅ |
| `/conversations/with/:otherUserId` | GET | Get conversation with user | ✅ |
| `/conversations/:conversationId` | GET | Get conversation | ✅ |
| `/conversations/:conversationId` | DELETE | Delete conversation | ✅ |
| `/conversations/:conversationId/read` | PUT | Mark as read | ✅ |
| `/conversations/:conversationId/messages` | GET | Get messages | ✅ |
| `/messages` | POST | Send message | ✅ |
| `/messages/unread-count` | GET | Unread count | ✅ |
| `/messages/:messageId` | GET | Get message | ✅ |
| `/messages/:messageId` | PUT | Update message | ✅ |
| `/messages/:messageId` | DELETE | Delete message | ✅ |
| `/messages/:messageId/status` | PUT | Update message status | ✅ |
| `/users/:userId/status` | GET | User online status | ✅ |

**Gaps/Inconsistencies:**
- None identified

---

### 3.5 Real-time Communication

**Service Owner:** `realtime-service`
**Port:** 3010

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/ws` | WS | WebSocket connection | ✅ |
| `/health` | GET | Health check | ✅ |
| `/ready` | GET | Readiness check | ✅ |
| `/api/presence/:userId` | GET | Get user presence | ✅ |
| `/api/presence/batch` | POST | Batch presence check | ✅ |
| `/api/online/users` | GET | Online users list | ✅ |
| `/api/online/count` | GET | Online users count | ✅ |
| `/api/typing/:conversationId` | GET | Typing indicators | ✅ |
| `/api/publish/message` | POST | Publish message (internal) | ✅ |
| `/api/publish/read-receipt` | POST | Publish read receipt | ✅ |
| `/api/publish/typing` | POST | Publish typing indicator | ✅ |
| `/api/conversation/:conversationId/participants` | GET | Conversation participants | ✅ |
| `/api/conversation/join` | POST | Join conversation | ✅ |
| `/api/conversation/leave` | POST | Leave conversation | ✅ |

**Gaps/Inconsistencies:**
- None identified

---

### 3.6 Media Management

**Service Owner:** `media-service`
**Port:** 3005

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/media/upload/image` | POST | Upload image | ✅ |
| `/media/upload/video` | POST | Upload video | ✅ |
| `/media/upload/batch` | POST | Batch upload | ✅ |
| `/media/user/:userId` | GET | User media | ✅ |
| `/media/:mediaId` | GET | Get media | ✅ |
| `/media/:mediaId` | DELETE | Delete media | ✅ |
| `/media/:mediaId/status` | GET | Media status | ✅ |
| `/media/:mediaId/resize` | POST | Resize media | ✅ |
| `/media/:mediaId/thumbnail` | POST | Generate thumbnail | ✅ |
| `/media/:mediaId/url` | GET | Get media URL | ✅ |
| `/media/:mediaId/moderation` | GET | Moderation status | ✅ |
| `/media/:mediaId/moderation/review` | POST | Review media | ✅ |
| `/media/:mediaId/analytics` | GET | Media analytics | ✅ |
| `/media/:mediaId/views` | POST | Record view | ✅ |

**Gaps/Inconsistencies:**
- None identified

---

### 3.7 Payment & Subscriptions

**Service Owner:** `payment-service`
**Port:** 3006

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/subscriptions/plans` | GET | List plans | ✅ |
| `/subscriptions/plans/:planId` | GET | Get plan details | ✅ |
| `/subscriptions/me` | GET | My subscription | ✅ |
| `/subscriptions` | POST | Subscribe | ✅ |
| `/subscriptions/me/upgrade` | PUT | Upgrade subscription | ✅ |
| `/subscriptions/me` | DELETE | Cancel subscription | ✅ |
| `/subscriptions/me/reactivate` | POST | Reactivate subscription | ✅ |
| `/payment-methods` | GET | List payment methods | ✅ |
| `/payment-methods` | POST | Add payment method | ✅ |
| `/payment-methods/:paymentMethodId` | DELETE | Remove payment method | ✅ |
| `/payment-methods/:paymentMethodId/default` | PUT | Set default | ✅ |
| `/transactions` | GET | List transactions | ✅ |
| `/transactions/:transactionId` | GET | Get transaction | ✅ |
| `/purchases/products` | GET | IAP products | ✅ |
| `/purchases` | POST | Purchase | ✅ |
| `/purchases/history` | GET | Purchase history | ✅ |
| `/invoices` | GET | List invoices | ✅ |
| `/invoices/:invoiceId/download` | GET | Download invoice | ✅ |
| `/webhooks/stripe` | POST | Stripe webhook | ✅ |
| `/webhooks/paystack` | POST | Paystack webhook | ✅ |
| `/webhooks/flutterwave` | POST | Flutterwave webhook | ✅ |
| `/promo-codes/apply` | POST | Apply promo code | ✅ |
| `/promo-codes/validate` | POST | Validate promo code | ✅ |

**Gaps/Inconsistencies:**
- None identified

---

### 3.8 Notifications

**Service Owner:** `notification-service`
**Port:** 3007

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/notifications` | GET | List notifications | ✅ |
| `/notifications/unread/count` | GET | Unread count | ✅ |
| `/notifications/read-all` | PUT | Mark all as read | ✅ |
| `/notifications/settings` | GET | Get settings | ✅ |
| `/notifications/:notificationId` | GET | Get notification | ✅ |
| `/notifications/:notificationId/read` | PUT | Mark as read | ✅ |
| `/notifications/:notificationId` | DELETE | Delete notification | ✅ |
| `/notifications` | DELETE | Delete all | ✅ |
| `/notifications/settings` | PUT | Update settings | ✅ |
| `/notifications/push/register` | POST | Register device | ✅ |
| `/notifications/push/register` | DELETE | Unregister device | ✅ |
| `/notifications/push/test` | POST | Test notification | ✅ |
| `/notifications/email/preferences` | GET | Email preferences | ✅ |
| `/notifications/email/preferences` | PUT | Update email prefs | ✅ |

**Gaps/Inconsistencies:**
- None identified

---

### 3.9 Analytics

**Service Owner:** `analytics-service`
**Port:** 3008

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/analytics/dashboard` | GET | Dashboard data | ✅ |
| `/analytics/profile/views` | GET | Profile views | ✅ |
| `/analytics/matches/stats` | GET | Match statistics | ✅ |
| `/analytics/messages/stats` | GET | Message statistics | ✅ |
| `/analytics/likes/stats` | GET | Like statistics | ✅ |
| `/analytics/events` | POST | Track event | ✅ |
| `/analytics/pageviews` | POST | Track pageview | ✅ |
| `/analytics/actions` | POST | Track action | ✅ |
| `/analytics/engagement` | GET | Engagement metrics | ✅ |
| `/analytics/engagement/response-rate` | GET | Response rate | ✅ |
| `/analytics/activity/timeline` | GET | Activity timeline | ✅ |
| `/analytics/platform/stats` | GET | Platform stats (admin) | ✅ |
| `/analytics/platform/demographics` | GET | Demographics (admin) | ✅ |
| `/analytics/platform/revenue` | GET | Revenue (admin) | ✅ |
| `/analytics/platform/retention` | GET | Retention (admin) | ✅ |
| `/analytics/funnel` | GET | Funnel analysis | ✅ |
| `/analytics/ab-tests/:testId` | GET | A/B test results | ✅ |
| `/analytics/export` | POST | Export data | ✅ |

**Gaps/Inconsistencies:**
- None identified

---

### 3.10 Moderation

**Service Owner:** `moderation-service`
**Port:** 3009

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/moderation/submit` | POST | Submit content | ✅ |
| `/moderation/status/:contentId` | GET | Content status | ✅ |
| `/moderation/queue` | GET | Moderation queue | ✅ |
| `/moderation/approve/:contentId` | PUT | Approve content | ✅ |
| `/moderation/reject/:contentId` | PUT | Reject content | ✅ |
| `/moderation/reports` | POST | Create report | ✅ |
| `/moderation/reports/me` | GET | My reports | ✅ |
| `/moderation/reports` | GET | All reports (admin) | ✅ |
| `/moderation/reports/:reportId` | GET | Get report | ✅ |
| `/moderation/reports/:reportId` | PUT | Update report | ✅ |
| `/moderation/actions/ban` | POST | Ban user | ✅ |
| `/moderation/actions/unban` | POST | Unban user | ✅ |
| `/moderation/actions/warn` | POST | Warn user | ✅ |
| `/moderation/users/:userId/history` | GET | User history | ✅ |
| `/moderation/scan/text` | POST | Scan text | ✅ |
| `/moderation/scan/image` | POST | Scan image | ✅ |
| `/moderation/statistics` | GET | Moderation stats | ✅ |

**Gaps/Inconsistencies:**
- None identified

---

### 3.11 Admin

**Service Owner:** `admin-service`
**Port:** 3011

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/admin/users` | GET | List users | ✅ |
| `/admin/users/:userId` | GET | Get user | ✅ |
| `/admin/users/:userId` | PUT | Update user | ✅ |
| `/admin/users/:userId/suspend` | POST | Suspend user | ✅ |
| `/admin/users/:userId/ban` | POST | Ban user | ✅ |
| `/admin/users/:userId` | DELETE | Delete user | ✅ |
| `/admin/stats` | GET | Platform stats | ✅ |
| `/admin/analytics/users` | GET | User analytics | ✅ |
| `/admin/moderation/queue` | GET | Moderation queue | ✅ |
| `/admin/moderation/:itemId/review` | POST | Review item | ✅ |

**Gaps/Inconsistencies:**
- None identified

---

### 3.12 API Gateway

**Service Owner:** `api-gateway`
**Port:** 3000

**Purpose:** Central routing layer for all API requests

**Responsibilities:**
- Route requests to appropriate microservices
- JWT authentication middleware
- Rate limiting
- CORS handling
- Request/response logging
- Health check aggregation

**Routing Configuration:**
```
/api/auth/*        → auth-service (3001)
/users/*           → user-service (3002)
/conversations/*   → messaging-service (3003)
/messages/*        → messaging-service (3003)
/discovery/*       → matching-service (3004)
/likes/*           → matching-service (3004)
/matches/*         → matching-service (3004)
/media/*           → media-service (3005)
/subscriptions/*   → payment-service (3006)
/payment-methods/* → payment-service (3006)
/transactions/*    → payment-service (3006)
/purchases/*       → payment-service (3006)
/invoices/*        → payment-service (3006)
/webhooks/*        → payment-service (3006)
/promo-codes/*     → payment-service (3006)
/notifications/*   → notification-service (3007)
/analytics/*       → analytics-service (3008)
/moderation/*      → moderation-service (3009)
/admin/*           → admin-service (3011)
/ws                → realtime-service (3010)
```

---

## 4. Infrastructure and Environment Dependencies

### 4.1 Service-to-Infrastructure Mapping

#### 4.1.1 Auth Service
**Azure Resources:**
- Azure Database for PostgreSQL (users, sessions tables)
- Azure Cache for Redis (session cache, rate limiting)
- Azure Key Vault (JWT secrets, OAuth credentials)
- SendGrid (email verification)

**Environment Variables:**
```
DATABASE_URL
REDIS_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
FACEBOOK_APP_ID
FACEBOOK_APP_SECRET
APPLE_CLIENT_ID
APPLE_PRIVATE_KEY
SENDGRID_API_KEY
```

---

#### 4.1.2 User Service
**Azure Resources:**
- Azure Database for PostgreSQL (profiles, photos, preferences tables)
- Azure Blob Storage (profile photos)
- Azure Face API (photo verification)
- Azure Cache for Redis (profile cache)

**Environment Variables:**
```
DATABASE_URL
REDIS_URL
AZURE_STORAGE_ACCOUNT
AZURE_STORAGE_KEY
AZURE_STORAGE_CONNECTION_STRING
AZURE_FACE_API_KEY
AZURE_FACE_API_ENDPOINT
```

---

#### 4.1.3 Matching Service
**Azure Resources:**
- Azure Database for PostgreSQL (swipes, matches, daily_limits tables)
- Azure Cache for Redis (discovery queue, online users)
- Elasticsearch (user search index)
- Azure Service Bus (matching_queue)

**Environment Variables:**
```
DATABASE_URL
REDIS_URL
ELASTICSEARCH_URL
AZURE_SERVICE_BUS_CONNECTION_STRING
QUEUE_MATCHING
```

---

#### 4.1.4 Messaging Service
**Azure Resources:**
- Azure Cosmos DB with MongoDB API (messages, conversations)
- Azure Database for PostgreSQL (matches table for reference)
- Azure Service Bus (notification_queue)

**Environment Variables:**
```
MONGODB_URI
DATABASE_URL
AZURE_SERVICE_BUS_CONNECTION_STRING
QUEUE_NOTIFICATIONS
```

---

#### 4.1.5 Realtime Service
**Azure Resources:**
- Azure Cache for Redis (WebSocket connection state, presence)
- Azure Service Bus (message publishing)

**Environment Variables:**
```
REDIS_URL
REDIS_TLS
WS_PORT
WS_HEARTBEAT_INTERVAL
WS_HEARTBEAT_TIMEOUT
AZURE_SERVICE_BUS_CONNECTION_STRING
```

---

#### 4.1.6 Media Service
**Azure Resources:**
- Azure Blob Storage (photos, videos)
- Azure Content Moderator (image moderation)
- Azure Face API (face detection)
- Azure CDN (media delivery)
- Azure Database for PostgreSQL (media metadata)

**Environment Variables:**
```
DATABASE_URL
AZURE_STORAGE_ACCOUNT
AZURE_STORAGE_KEY
AZURE_STORAGE_CONNECTION_STRING
AZURE_STORAGE_CONTAINER_PHOTOS
AZURE_STORAGE_CONTAINER_VIDEOS
AZURE_STORAGE_CDN_ENDPOINT
AZURE_FACE_API_KEY
AZURE_CONTENT_MODERATOR_KEY
MAX_FILE_SIZE
MAX_VIDEO_SIZE
```

---

#### 4.1.7 Payment Service
**Azure Resources:**
- Azure Database for PostgreSQL (transactions, coin_balances tables)
- Azure Key Vault (Stripe secrets)
- Stripe API

**Environment Variables:**
```
DATABASE_URL
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
```

---

#### 4.1.8 Notification Service
**Azure Resources:**
- Azure Database for PostgreSQL (notifications, device_tokens tables)
- Azure Service Bus (notification_queue)
- SendGrid (email notifications)
- Twilio (SMS notifications)
- Firebase (push notifications)

**Environment Variables:**
```
DATABASE_URL
AZURE_SERVICE_BUS_CONNECTION_STRING
QUEUE_NOTIFICATIONS
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
FIREBASE_PROJECT_ID
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL
```

---

#### 4.1.9 Analytics Service
**Azure Resources:**
- Azure Database for PostgreSQL (analytics_events table)
- Azure Cosmos DB with MongoDB API (detailed event logs)
- Elasticsearch (analytics index)
- Azure Service Bus (analytics_queue)

**Environment Variables:**
```
DATABASE_URL
MONGODB_URI
ELASTICSEARCH_URL
AZURE_SERVICE_BUS_CONNECTION_STRING
QUEUE_ANALYTICS
```

---

#### 4.1.10 Moderation Service
**Azure Resources:**
- Azure Database for PostgreSQL (reports, blocks tables)
- Azure Cosmos DB (audit_logs)
- Azure Content Moderator (AI moderation)
- Azure Service Bus (moderation_queue)

**Environment Variables:**
```
DATABASE_URL
MONGODB_URI
AZURE_CONTENT_MODERATOR_KEY
AZURE_SERVICE_BUS_CONNECTION_STRING
QUEUE_MODERATION
```

---

#### 4.1.11 Admin Service
**Azure Resources:**
- Azure Database for PostgreSQL (all tables - read access)
- Azure Cosmos DB (audit_logs)

**Environment Variables:**
```
DATABASE_URL
MONGODB_URI
```

---

#### 4.1.12 API Gateway
**Azure Resources:**
- Azure Cache for Redis (rate limiting)
- Azure Application Insights (monitoring)

**Environment Variables:**
```
REDIS_URL
PORT
RATE_LIMIT_ENABLED
RATE_LIMIT_WINDOW_MS
RATE_LIMIT_MAX_REQUESTS
APPLICATION_INSIGHTS_CONNECTION_STRING
```

---

### 4.2 Shared Infrastructure Components

#### 4.2.1 Azure Database for PostgreSQL
**Tier:** Flexible Server
**SKU:** Standard_D4s_v3 (4 vCores, 16 GB RAM)
**Storage:** 128 GB SSD
**Backup:** 30-day retention, geo-redundant

**Services Using:**
- auth-service
- user-service
- matching-service
- messaging-service (minimal)
- media-service
- payment-service
- notification-service
- analytics-service
- moderation-service
- admin-service

---

#### 4.2.2 Azure Cosmos DB (MongoDB API)
**Tier:** Provisioned Throughput
**RU/s:** 1000-10000 (autoscale)

**Services Using:**
- messaging-service (primary)
- analytics-service
- moderation-service (audit logs)

---

#### 4.2.3 Azure Cache for Redis
**Tier:** Premium P1 (6 GB)
**Clustering:** Enabled
**TLS:** Enabled

**Services Using:**
- All services (session cache, rate limiting, general cache)

---

#### 4.2.4 Azure Service Bus
**Tier:** Standard
**Queues:**
- `matching_queue`
- `notification_queue`
- `analytics_queue`
- `moderation_queue`

**Services Using:**
- All backend services (async processing)

---

#### 4.2.5 Azure Blob Storage
**Tier:** StorageV2 (General Purpose v2)
**Replication:** GRS (Geo-Redundant Storage)
**Containers:**
- `photos`
- `videos`

**Services Using:**
- media-service (primary)
- user-service (profile photos)

---

#### 4.2.6 Azure Key Vault
**Purpose:** Secret management

**Secrets Stored:**
- `JWT-ACCESS-SECRET`
- `JWT-REFRESH-SECRET`
- `DB-PASSWORD`
- `REDIS-PASSWORD`
- `STRIPE-SECRET-KEY`
- `SENDGRID-API-KEY`
- `TWILIO-AUTH-TOKEN`
- `GOOGLE-CLIENT-SECRET`
- `FACEBOOK-APP-SECRET`
- `APPLE-PRIVATE-KEY`
- All other sensitive credentials

**Services Using:**
- All services (via managed identity)

---

### 4.3 Environment Configuration Files

#### Development
**File:** `.env.dev.example`
- Local development environment
- Local databases (Docker Compose)
- Mock external services where possible
- Debug logging enabled

#### Staging
**File:** `.env.staging.example`
- Staging environment (Azure)
- Staging databases
- Real external services (test mode)
- Verbose logging

#### Production
**File:** `.env.prod.example`
- Production environment (Azure)
- Production databases
- Real external services (live mode)
- Minimal logging (warn level)
- All secrets in Azure Key Vault

---

### 4.4 Deployment Environments

#### Local Development
```yaml
Environment: development
Database: Docker PostgreSQL
Cache: Docker Redis
Queue: Docker RabbitMQ (optional)
Storage: Local filesystem (mock)
```

#### Staging
```yaml
Environment: staging
Database: Azure PostgreSQL (Flexible Server - Basic)
Cache: Azure Redis (Basic C1)
Queue: Azure Service Bus (Standard)
Storage: Azure Blob Storage (Standard)
Kubernetes: AKS (2 nodes)
```

#### Production
```yaml
Environment: production
Database: Azure PostgreSQL (Flexible Server - Standard)
Cache: Azure Redis (Premium P1)
Queue: Azure Service Bus (Standard)
Storage: Azure Blob Storage (Premium)
Kubernetes: AKS (5-50 nodes, autoscale)
CDN: Azure Front Door
Monitoring: Application Insights, Prometheus, Grafana
```

---

## 5. Build Order and Implementation Sequence

### 5.1 Service Dependency Graph

```
Level 1 (Foundation - No Dependencies):
├── backend/services/shared (utility package)
└── Infrastructure setup (databases, Redis, Azure resources)

Level 2 (Core Services):
├── auth-service (requires: PostgreSQL, Redis, Key Vault)
└── user-service (requires: PostgreSQL, Redis, Azure Blob, Face API)

Level 3 (Feature Services):
├── media-service (requires: Azure Blob, Content Moderator, user-service)
├── matching-service (requires: PostgreSQL, Redis, Elasticsearch, user-service)
└── notification-service (requires: PostgreSQL, Service Bus, SendGrid, Twilio)

Level 4 (Communication Services):
├── messaging-service (requires: MongoDB, matching-service, notification-service)
└── realtime-service (requires: Redis, messaging-service)

Level 5 (Business Services):
├── payment-service (requires: PostgreSQL, Stripe, notification-service)
├── analytics-service (requires: PostgreSQL, MongoDB, Elasticsearch)
└── moderation-service (requires: PostgreSQL, MongoDB, Content Moderator)

Level 6 (Admin & Gateway):
├── admin-service (requires: all data sources)
└── api-gateway (requires: all services)

Level 7 (Frontend):
└── apps/web-app (requires: api-gateway)
```

---

### 5.2 Recommended Build Sequence

#### Phase 1: Foundation (Week 1-2)
```
1. Setup infrastructure (Terraform)
   - Azure resource group
   - Azure PostgreSQL database
   - Azure Redis cache
   - Azure Blob Storage
   - Azure Key Vault

2. Build shared package
   - backend/services/shared/
   - Common utilities, types, middleware
   - Logging, error handling

3. Database schema
   - Run migrations
   - Seed initial data (interests, plans)
```

---

#### Phase 2: Core Services (Week 3-4)
```
4. Build auth-service
   - User registration
   - Login/logout
   - JWT authentication
   - OAuth integration
   - Email verification
   Tests: Unit, integration

5. Build user-service
   - Profile CRUD
   - Photo management
   - Preferences
   - Settings
   Tests: Unit, integration
```

---

#### Phase 3: Feature Services (Week 5-7)
```
6. Build media-service
   - Photo upload to Azure Blob
   - Image processing
   - Face verification
   - Content moderation
   Tests: Unit, integration

7. Build matching-service
   - Discovery algorithm
   - Swipe logic
   - Match creation
   - Compatibility scoring
   Tests: Unit, integration

8. Build notification-service
   - Push notifications (Firebase)
   - Email notifications (SendGrid)
   - SMS notifications (Twilio)
   - Notification preferences
   Tests: Unit, integration
```

---

#### Phase 4: Communication (Week 8-9)
```
9. Build messaging-service
   - Conversation management
   - Message CRUD
   - Message storage (MongoDB)
   - Unread counts
   Tests: Unit, integration

10. Build realtime-service
    - WebSocket server
    - Presence tracking
    - Typing indicators
    - Real-time message delivery
    Tests: Integration, load testing
```

---

#### Phase 5: Business Services (Week 10-11)
```
11. Build payment-service
    - Stripe integration
    - Subscription management
    - Payment methods
    - Webhooks
    - Coin system
    Tests: Unit, integration

12. Build analytics-service
    - Event tracking
    - Dashboard data
    - User analytics
    - Platform metrics
    Tests: Unit, integration

13. Build moderation-service
    - Content moderation queue
    - Report handling
    - User actions (ban, warn)
    - AI moderation
    Tests: Unit, integration
```

---

#### Phase 6: Gateway & Admin (Week 12)
```
14. Build admin-service
    - User management
    - Moderation queue
    - Platform statistics
    Tests: Integration

15. Build api-gateway
    - Service routing
    - Authentication middleware
    - Rate limiting
    - CORS handling
    Tests: Integration, E2E
```

---

#### Phase 7: Frontend (Week 13-16)
```
16. Build frontend core
    - Authentication pages
    - Profile pages
    - Discovery page
    Tests: Unit, component

17. Build frontend features
    - Messaging interface
    - Match management
    - Payment flows
    Tests: Unit, component, E2E

18. Build admin dashboard
    - User management
    - Moderation tools
    - Analytics dashboard
    Tests: Unit, E2E
```

---

#### Phase 8: Integration & Testing (Week 17-18)
```
19. End-to-end testing
    - User registration flow
    - Discovery and matching flow
    - Messaging flow
    - Payment flow

20. Performance testing
    - Load testing (matching algorithm)
    - Stress testing (WebSocket connections)
    - Database optimization

21. Security testing
    - Penetration testing
    - OAuth flow testing
    - Payment security audit
```

---

### 5.3 Critical Path for MVP

**Minimum Viable Product (MVP) Sequence:**

```
MVP Week 1-2: Infrastructure + Auth
├── Setup Azure resources
├── auth-service (register, login, OAuth)
└── Basic user-service (profile creation)

MVP Week 3-4: Core Features
├── matching-service (basic discovery, swipes, matches)
├── messaging-service (basic messaging)
└── media-service (photo upload)

MVP Week 5-6: Frontend + Integration
├── Frontend (auth, profile, discovery, messaging pages)
├── api-gateway (routing, auth middleware)
└── Integration testing

MVP Week 7-8: Polish + Launch
├── Payment integration (basic subscriptions)
├── Notification service (push notifications)
├── Bug fixes and optimization
└── Production deployment
```

**MVP Features Excluded (Post-Launch):**
- Admin dashboard (manual admin operations initially)
- Advanced analytics
- Video calling
- Gamification
- Communities
- Speed dating
- AI-powered features

---

### 5.4 Service Build Commands

#### Build All Services
```bash
# From root directory
npm run build:all

# Or using lerna
npx lerna run build
```

#### Build Individual Service
```bash
# Navigate to service directory
cd backend/services/auth-service
npm run build

# Or from root with lerna
npx lerna run build --scope=@flamoral/auth-service
```

#### Build Order Script
```bash
# Recommended build script
./scripts/build-services.sh

# Order:
# 1. shared
# 2. auth-service
# 3. user-service
# 4. media-service
# 5. matching-service
# 6. notification-service
# 7. messaging-service
# 8. realtime-service
# 9. payment-service
# 10. analytics-service
# 11. moderation-service
# 12. admin-service
# 13. api-gateway
# 14. web-app
```

---

### 5.5 Docker Build Sequence

#### ACR Build Commands
```bash
# Build all services to Azure Container Registry
./scripts/build-all-acr.sh

# Individual service build
az acr build --registry flamoralacr8eq5eg \
  --image auth-service:latest \
  --file backend/services/auth-service/Dockerfile .
```

#### Docker Compose Local Development
```bash
# Build and start all services
docker-compose up --build

# Services start in order based on depends_on
```

---

## 6. Testing Strategy Mapped to Each Feature

### 6.1 Authentication & Authorization

#### Unit Tests
**Location:** `backend/services/auth-service/tests/unit/`
```
auth.service.test.ts
├── User registration validation
├── Password hashing
├── JWT token generation
├── Token validation
└── OAuth flow logic

jwt.test.ts
├── Access token generation
├── Refresh token generation
├── Token verification
└── Token expiration

encryption.test.ts
├── Password hashing
├── Password comparison
└── Salt generation

validation.test.ts
├── Email validation
├── Password strength validation
└── Input sanitization
```

**Coverage Target:** 90%+

#### Integration Tests
**Location:** `backend/services/auth-service/tests/integration/`
```
auth.integration.test.ts
├── POST /api/auth/register
├── POST /api/auth/login
├── POST /api/auth/refresh-token
├── POST /api/auth/verify-email
└── Database integration

oauth.integration.test.ts
├── GET /api/oauth/google
├── GET /api/oauth/google/callback
├── GET /api/oauth/facebook/callback
└── OAuth provider integration (mocked)
```

**Coverage Target:** 80%+

#### E2E Tests
**Location:** `backend/services/auth-service/tests/e2e/`
```
auth.e2e.test.ts
├── Complete registration flow
├── Complete login flow
├── Email verification flow
├── Password reset flow
└── OAuth login flow (Google, Facebook, Apple)
```

**Tools:** Jest, Supertest

---

### 6.2 User Profile Management

#### Unit Tests
**Location:** `backend/services/user-service/tests/unit/`
```
user.service.test.ts
├── Profile creation
├── Profile updates
├── Photo management
├── Preferences updates
└── Location updates

profile.repository.test.ts
├── Database queries
├── Data transformations
└── Error handling
```

**Coverage Target:** 90%+

#### Integration Tests
**Location:** `backend/services/user-service/tests/integration/`
```
user.integration.test.ts
├── GET /users/me
├── PUT /users/me
├── POST /users/me/photos
├── PUT /users/me/preferences
└── Database + Azure Blob integration
```

**Coverage Target:** 80%+

#### E2E Tests
**Location:** `apps/web-app/tests/e2e/specs/`
```
profile.spec.ts
├── Create profile
├── Edit profile
├── Upload photos
├── Set preferences
└── View other profiles
```

**Tools:** Playwright

---

### 6.3 Discovery & Matching

#### Unit Tests
**Location:** `backend/services/matching-service/tests/unit/`
```
match.service.test.ts
├── Match creation logic
├── Mutual like detection
├── Match validation
└── Unmatch logic

swipe.service.test.ts
├── Swipe recording
├── Daily limit checking
├── Undo functionality
└── Super like logic

recommendation.controller.test.ts
├── Recommendation algorithm
├── Filtering logic
├── Distance calculation
└── Preference matching
```

**Coverage Target:** 90%+

#### Integration Tests
**Location:** `backend/services/matching-service/__tests__/integration/`
```
matching.integration.test.ts
├── POST /likes (swipe right)
├── POST /passes (swipe left)
├── GET /discovery/recommendations
├── GET /matches
└── Match creation flow
```

**Coverage Target:** 80%+

#### E2E Tests
**Location:** `apps/web-app/tests/e2e/specs/`
```
discovery.spec.ts
├── View discovery profiles
├── Swipe right (like)
├── Swipe left (pass)
├── Super like
├── Match creation
└── View matches
```

**Tools:** Playwright

---

### 6.4 Messaging & Real-time

#### Unit Tests
**Location:** `backend/services/messaging-service/tests/unit/`
```
message.service.test.ts
├── Message creation
├── Message validation
├── Conversation management
└── Unread count calculation
```

**Coverage Target:** 85%+

#### Integration Tests
**Location:** `backend/services/messaging-service/tests/integration/`
```
messaging.integration.test.ts
├── POST /messages
├── GET /conversations
├── GET /conversations/:id/messages
├── PUT /conversations/:id/read
└── MongoDB integration
```

**Coverage Target:** 80%+

#### WebSocket Tests
**Location:** `backend/services/realtime-service/tests/`
```
websocket.integration.test.ts
├── WebSocket connection
├── Authentication
├── Message delivery
├── Typing indicators
├── Presence updates
└── Disconnect handling
```

**Tools:** Jest, Socket.io-client

#### E2E Tests
**Location:** `apps/web-app/tests/e2e/specs/`
```
messaging.spec.ts
├── Send message
├── Receive message (real-time)
├── Mark as read
├── View conversation
├── Typing indicator
└── Online status
```

**Tools:** Playwright

---

### 6.5 Media Management

#### Unit Tests
**Location:** `backend/services/media-service/tests/unit/`
```
image-processing.service.test.ts
├── Image resizing
├── Thumbnail generation
├── Format conversion
└── Image optimization

photo-verification.service.test.ts
├── Face detection
├── Face verification
└── Age estimation
```

**Coverage Target:** 85%+

#### Integration Tests
**Location:** `backend/services/media-service/tests/integration/`
```
media.repository.test.ts
├── Azure Blob upload
├── Azure Blob delete
├── URL generation
└── CDN integration
```

**Coverage Target:** 75%+

#### E2E Tests
**Location:** `backend/services/media-service/tests/e2e/`
```
media.routes.test.ts
├── POST /media/upload/image
├── Image upload to Azure
├── Face verification
├── Moderation check
└── Photo URL return
```

**Tools:** Jest, Supertest, Multer

---

### 6.6 Payment & Subscriptions

#### Unit Tests
**Location:** `backend/services/payment-service/tests/unit/`
```
subscription.service.test.ts
├── Subscription creation
├── Subscription upgrade
├── Subscription cancellation
├── Proration calculation
└── Trial period logic

payment.service.test.ts
├── Payment intent creation
├── Payment method validation
├── Refund logic
└── Webhook signature verification
```

**Coverage Target:** 90%+ (critical financial logic)

#### Integration Tests
**Location:** `backend/services/payment-service/tests/integration/`
```
stripe.integration.test.ts
├── Stripe customer creation
├── Payment method attachment
├── Subscription creation
├── Webhook handling
└── Invoice generation
```

**Tools:** Jest, Stripe test mode

#### E2E Tests
**Location:** `apps/web-app/tests/e2e/specs/`
```
payment.spec.ts
├── View subscription plans
├── Select plan
├── Add payment method (test card)
├── Complete subscription
├── Upgrade subscription
└── Cancel subscription
```

**Tools:** Playwright, Stripe test cards

---

### 6.7 Notifications

#### Unit Tests
**Location:** `backend/services/notification-service/tests/unit/`
```
notification.service.test.ts
├── Notification creation
├── Template rendering
├── User preferences check
└── Notification batching

push.service.test.ts
├── FCM message formatting
├── APNS message formatting
└── Device token validation
```

**Coverage Target:** 85%+

#### Integration Tests
**Location:** `backend/services/notification-service/tests/integration/`
```
notification.integration.test.ts
├── POST /notifications (create)
├── GET /notifications (list)
├── PUT /notifications/:id/read
├── Push notification sending (mocked)
└── Email sending (mocked)
```

**Coverage Target:** 80%+

---

### 6.8 Analytics

#### Unit Tests
**Location:** `backend/services/analytics-service/tests/unit/`
```
events.controller.test.ts
├── Event validation
├── Event transformation
├── Event batching
└── Event queuing
```

**Coverage Target:** 85%+

#### Integration Tests
**Location:** `backend/services/analytics-service/tests/integration/`
```
analytics.integration.test.ts
├── POST /analytics/events
├── GET /analytics/dashboard
├── GET /analytics/profile/views
└── Elasticsearch queries
```

**Coverage Target:** 75%+

---

### 6.9 Moderation

#### Unit Tests
**Location:** `backend/services/moderation-service/tests/unit/`
```
moderation.service.test.ts
├── Content analysis
├── Report validation
├── Action enforcement
└── Ban logic
```

**Coverage Target:** 85%+

#### Integration Tests
**Location:** `backend/services/moderation-service/tests/integration/`
```
moderation.integration.test.ts
├── POST /moderation/reports
├── GET /moderation/queue
├── PUT /moderation/approve/:id
├── POST /moderation/actions/ban
└── Azure Content Moderator integration
```

**Coverage Target:** 80%+

---

### 6.10 Admin Panel

#### E2E Tests
**Location:** `apps/web-app/tests/e2e/specs/`
```
admin.spec.ts
├── Admin login
├── View user list
├── Edit user
├── Ban user
├── View moderation queue
├── Approve/reject content
└── View analytics dashboard
```

**Tools:** Playwright

---

### 6.11 Frontend Component Tests

#### Unit Tests
**Location:** `apps/web-app/src/components/**/__tests__/`
```
Component tests for:
├── Auth components (LoginForm, SignupForm)
├── Profile components (ProfileCard, PhotoUpload)
├── Discovery components (SwipeCard, MatchCard)
├── Messaging components (MessageList, MessageInput)
├── Payment components (SubscriptionCard, PaymentForm)
└── Admin components (UserTable, ModerationQueue)
```

**Tools:** Jest, React Testing Library
**Coverage Target:** 80%+

#### E2E Tests
**Location:** `apps/web-app/tests/e2e/specs/`
```
User flow tests:
├── user-flow.spec.ts (registration → discovery → match → message)
├── auth.spec.ts (login, signup, OAuth)
├── api-integration.spec.ts (API calls)
└── visual-regression.spec.ts (visual testing)
```

**Tools:** Playwright
**Coverage Target:** Critical user flows

---

### 6.12 Performance Testing

#### Load Tests
**Location:** `tests/performance/`
```
load-tests/
├── discovery-load.test.js (100 concurrent users)
├── messaging-load.test.js (500 concurrent WebSocket connections)
├── api-load.test.js (1000 requests/sec)
└── database-load.test.js (query performance)
```

**Tools:** k6, Artillery
**Target:** < 200ms response time at 1000 req/sec

#### Stress Tests
```
stress-tests/
├── websocket-stress.test.js (max connections)
├── database-stress.test.js (max queries/sec)
└── redis-stress.test.js (cache performance)
```

---

### 6.13 Security Testing

#### Security Tests
**Location:** `tests/security/`
```
security-tests/
├── authentication.test.js (JWT security)
├── authorization.test.js (RBAC)
├── injection.test.js (SQL injection, XSS)
├── rate-limiting.test.js
└── csrf.test.js (CSRF protection)
```

**Tools:** OWASP ZAP, Custom scripts

#### Penetration Testing
```
Manual testing:
├── OAuth flow security
├── Payment flow security
├── File upload security
├── WebSocket security
└── API endpoint security
```

---

### 6.14 Testing Commands

#### Run All Tests
```bash
# Backend - all services
npm run test

# Frontend
cd apps/web-app
npm run test

# E2E tests
npm run test:e2e
```

#### Run Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Specific service
cd backend/services/auth-service
npm run test
```

#### Coverage Reports
```bash
# Generate coverage
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

---

## 7. Quick Reference Diagrams

### 7.1 Authentication Flow
```
User → Frontend → API Gateway → Auth Service → PostgreSQL
                                        ↓
                                   JWT Token
                                        ↓
                              Redis (Session Cache)
```

### 7.2 Matching Flow
```
User Swipe → Frontend → API Gateway → Matching Service
                                             ↓
                                        PostgreSQL
                                        (check mutual)
                                             ↓
                                        Match Created
                                             ↓
                                    ┌────────┴────────┐
                                    ↓                 ↓
                            Messaging Service   Notification Service
                            (create convo)      (send push)
```

### 7.3 Real-time Messaging Flow
```
User Types → Frontend → WebSocket → Realtime Service
                                          ↓
                                    ┌─────┴──────┐
                                    ↓            ↓
                            Messaging Service  Redis
                            (save to MongoDB)  (presence)
                                    ↓
                            Recipient WebSocket
                                    ↓
                            Recipient Frontend
```

### 7.4 Payment Flow
```
User Subscribe → Frontend → API Gateway → Payment Service
                                               ↓
                                          Stripe API
                                               ↓
                                          PostgreSQL
                                          (transaction)
                                               ↓
                                      Notification Service
                                      (receipt email)
```

---

## 8. Development Tools & Setup

### 8.1 Required Tools
- Node.js 20+
- Docker & Docker Compose
- Azure CLI
- kubectl (Kubernetes CLI)
- Terraform
- Git

### 8.2 IDE Recommendations
- VS Code with extensions:
  - ESLint
  - Prettier
  - TypeScript
  - Docker
  - Kubernetes
  - Thunder Client (API testing)

### 8.3 Local Development Setup
```bash
# 1. Clone repository
git clone <repo-url>
cd Flamoral

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.dev.example .env

# 4. Start infrastructure (Docker Compose)
docker-compose up -d postgres redis mongodb rabbitmq

# 5. Run migrations
npm run migrate

# 6. Start all services
npm run dev

# 7. Start frontend
cd apps/web-app
npm run dev
```

---

## 9. Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Environment variables configured in Azure Key Vault
- [ ] Database migrations ready
- [ ] Azure resources provisioned
- [ ] Docker images built and pushed to ACR
- [ ] Kubernetes manifests updated

### Deployment
- [ ] Apply database migrations
- [ ] Deploy backend services (rolling update)
- [ ] Deploy frontend
- [ ] Run smoke tests
- [ ] Monitor logs and metrics

### Post-Deployment
- [ ] Verify all health checks
- [ ] Run E2E tests against production
- [ ] Monitor error rates
- [ ] Check CDN cache
- [ ] Verify external integrations (Stripe, SendGrid, etc.)

---

## 10. Contacts & Support

### Development Team
- **Backend Lead:** [Contact]
- **Frontend Lead:** [Contact]
- **DevOps Lead:** [Contact]
- **QA Lead:** [Contact]

### External Services Support
- **Azure Support:** [Portal Link]
- **Stripe Support:** [Dashboard Link]
- **SendGrid Support:** [Dashboard Link]
- **Agora Support:** [Console Link]

---

## Appendix A: Port Allocations

| Service | Port | Protocol |
|---------|------|----------|
| API Gateway | 3000 | HTTP |
| Auth Service | 3001 | HTTP |
| User Service | 3002 | HTTP |
| Messaging Service | 3003 | HTTP |
| Matching Service | 3004 | HTTP |
| Media Service | 3005 | HTTP |
| Payment Service | 3006 | HTTP |
| Notification Service | 3007 | HTTP |
| Analytics Service | 3008 | HTTP |
| Moderation Service | 3009 | HTTP |
| Realtime Service | 3010 | WS/HTTP |
| Admin Service | 3011 | HTTP |
| GraphQL Server | 4000 | HTTP |
| Frontend Dev Server | 8080 | HTTP |

---

## Appendix B: Database Migrations

### Migration Files Location
```
database/migrations/
├── 001_create_users.sql
├── 002_create_profiles.sql
├── 003_create_photos.sql
├── 004_create_swipes_matches.sql
├── 005_create_transactions.sql
├── 006_create_notifications.sql
└── ...
```

### Run Migrations
```bash
npm run migrate
```

---

## Appendix C: CI/CD Pipeline

### GitHub Actions Workflows
```
.github/workflows/
├── ci-backend.yml (backend tests)
├── ci-frontend.yml (frontend tests)
├── cd-staging.yml (deploy to staging)
├── cd-production.yml (deploy to production)
└── security-scan.yml (security checks)
```

---

## Document Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2025-12-16 | Initial creation | Agent |

---

**END OF DOCUMENT**
