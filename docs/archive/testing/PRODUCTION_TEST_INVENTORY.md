# Flamoral Production Test Inventory

Complete checklist to verify all systems are functional in production environment for flamoral.com.

**Last Updated:** 2025-12-18
**Environment:** Production
**Purpose:** Pre-launch and continuous production health verification

---

## Table of Contents

1. [Health Checks - All Services](#1-health-checks---all-services)
2. [Authentication Flows](#2-authentication-flows)
3. [Core User Features](#3-core-user-features)
4. [Monetization Features](#4-monetization-features)
5. [Safety & Moderation](#5-safety--moderation)
6. [Platform Endpoints](#6-platform-endpoints)
7. [External Integrations](#7-external-integrations)
8. [WebSocket/Real-time Features](#8-websocketreal-time-features)
9. [Database Connectivity](#9-database-connectivity)
10. [Performance & Load](#10-performance--load)

---

## Testing Instructions

### Prerequisites
- Production API URL: `https://api.flamoral.com`
- Test user accounts (see [TEST-ACCOUNTS.md](../TEST-ACCOUNTS.md))
- API client (Postman, curl, or custom)
- Admin access for service health checks

### Test Status Legend
- [ ] Not Tested
- [x] Passed
- [!] Failed (document failure)
- [-] Not Applicable

---

## 1. Health Checks - All Services

Verify all microservices are running and healthy.

### Core Services

| Service | Endpoint | Expected Response | Status | Notes |
|---------|----------|-------------------|--------|-------|
| **API Gateway** | `GET /health` | `{"status": "healthy", "service": "api-gateway"}` | [ ] | Port: 3000 |
| **Auth Service** | `GET /health` | `{"status": "healthy", "service": "auth-service"}` | [ ] | Port: 3001 |
| **User Service** | `GET /health` | `{"status": "healthy", "service": "user-service"}` | [ ] | Port: 3002 |
| **Matching Service** | `GET /health` | `{"status": "healthy", "service": "matching-service"}` | [ ] | Port: 3003 |
| **Messaging Service** | `GET /health` | `{"status": "healthy", "service": "messaging-service"}` | [ ] | Port: 3004 |
| **Payment Service** | `GET /health` | `{"status": "healthy", "service": "payment-service"}` | [ ] | Port: 3005 |
| **Media Service** | `GET /health` | `{"status": "healthy", "service": "media-service"}` | [ ] | Port: 3006 |
| **Analytics Service** | `GET /health` | `{"status": "healthy", "service": "analytics-service"}` | [ ] | Port: 3007 |
| **Notification Service** | `GET /health` | `{"status": "healthy", "service": "notification-service"}` | [ ] | Port: 3008 |
| **Moderation Service** | `GET /health` | `{"status": "healthy", "service": "moderation-service"}` | [ ] | Port: 3009 |

### Supporting Services

| Service | Endpoint | Expected Response | Status | Notes |
|---------|----------|-------------------|--------|-------|
| **Automation Service** | `GET /health` | `{"status": "healthy"}` | [ ] | Port: 3013 |
| **Admin Service** | `GET /health` | `{"status": "healthy"}` | [ ] | Admin only |
| **Advertising Service** | `GET /health` | `{"status": "healthy"}` | [ ] | Optional |

### Database Health (via services)

| Component | Check Method | Expected | Status | Notes |
|-----------|--------------|----------|--------|-------|
| **PostgreSQL** | Analytics Service `/health` | `{"database": {"connected": true}}` | [ ] | Primary DB |
| **MongoDB** | Check service logs | No connection errors | [ ] | If used |
| **Redis** | Check service logs | No connection errors | [ ] | Cache/Queue |

---

## 2. Authentication Flows

Test all authentication and authorization mechanisms.

### Registration

- [ ] **Email Registration**
  - Endpoint: `POST /api/v1/auth/register`
  - Payload: `{"email": "test@example.com", "password": "SecurePass123!", "firstName": "Test", "dateOfBirth": "1995-01-01", "gender": "male"}`
  - Expected: 201 Created with `accessToken` and `refreshToken`
  - Dependencies: User Service, Email Service (SendGrid)

- [ ] **Email Validation Rules**
  - Test invalid email format
  - Expected: 400 Bad Request with validation error

- [ ] **Password Strength Validation**
  - Test weak password (less than 8 chars)
  - Expected: 400 Bad Request with password requirements

- [ ] **Duplicate Email Prevention**
  - Register same email twice
  - Expected: 409 Conflict

### Email Verification

- [ ] **Send Verification Email**
  - Endpoint: `POST /api/v1/auth/resend-verification`
  - Expected: 200 OK, email received (check inbox)
  - Dependencies: SendGrid integration

- [ ] **Verify Email Token**
  - Endpoint: `POST /api/v1/auth/verify-email`
  - Payload: `{"token": "verification-token-from-email"}`
  - Expected: 200 OK

### Login

- [ ] **Email/Password Login**
  - Endpoint: `POST /api/v1/auth/login`
  - Payload: `{"email": "test@example.com", "password": "SecurePass123!"}`
  - Expected: 200 OK with tokens

- [ ] **Invalid Credentials**
  - Test wrong password
  - Expected: 401 Unauthorized

- [ ] **Unverified Email Login**
  - Try login before email verification
  - Expected: Check if allowed or blocked per business rules

### OAuth Flows

- [ ] **Google OAuth Login**
  - Endpoint: `POST /api/v1/auth/oauth/google`
  - Expected: Redirect to Google consent screen
  - Dependencies: Google OAuth credentials

- [ ] **Facebook OAuth Login**
  - Endpoint: `POST /api/v1/auth/oauth/facebook`
  - Expected: Redirect to Facebook consent screen
  - Dependencies: Facebook App credentials

- [ ] **Apple OAuth Login**
  - Endpoint: `POST /api/v1/auth/oauth/apple`
  - Expected: Redirect to Apple Sign In
  - Dependencies: Apple Developer credentials

### Token Management

- [ ] **Refresh Access Token**
  - Endpoint: `POST /api/v1/auth/refresh-token`
  - Payload: `{"refreshToken": "your-refresh-token"}`
  - Expected: 200 OK with new access token

- [ ] **Token Validation**
  - Endpoint: `POST /api/v1/auth/validate-token`
  - Headers: `Authorization: Bearer <token>`
  - Expected: 200 OK if valid, 401 if expired

- [ ] **Expired Token Handling**
  - Use expired token
  - Expected: 401 Unauthorized

### Password Management

- [ ] **Forgot Password**
  - Endpoint: `POST /api/v1/auth/forgot-password`
  - Payload: `{"email": "test@example.com"}`
  - Expected: 200 OK, reset email received
  - Dependencies: SendGrid

- [ ] **Reset Password**
  - Endpoint: `POST /api/v1/auth/reset-password`
  - Payload: `{"token": "reset-token", "password": "NewSecurePass123!"}`
  - Expected: 200 OK

- [ ] **Change Password (Authenticated)**
  - Endpoint: `POST /api/v1/auth/change-password`
  - Requires: Valid JWT
  - Expected: 200 OK

### Two-Factor Authentication (2FA)

- [ ] **Enable 2FA**
  - Endpoint: `POST /api/v1/auth/2fa/enable`
  - Expected: QR code or setup key

- [ ] **Verify 2FA Code**
  - Endpoint: `POST /api/v1/auth/2fa/verify`
  - Payload: `{"code": "123456"}`
  - Expected: 200 OK

- [ ] **Login with 2FA**
  - Test login flow with 2FA enabled
  - Expected: Additional verification step

- [ ] **Disable 2FA**
  - Endpoint: `POST /api/v1/auth/2fa/disable`
  - Expected: 200 OK

### Logout

- [ ] **User Logout**
  - Endpoint: `POST /api/v1/auth/logout`
  - Expected: 200 OK, token invalidated

---

## 3. Core User Features

### Profile Management

#### Profile CRUD Operations

- [ ] **Get Own Profile**
  - Endpoint: `GET /api/v1/profile`
  - Headers: `Authorization: Bearer <token>`
  - Expected: 200 OK with profile data

- [ ] **Update Profile**
  - Endpoint: `PUT /api/v1/profile`
  - Payload: `{"firstName": "Updated", "bio": "New bio", "interests": ["music", "travel"]}`
  - Expected: 200 OK with updated profile

- [ ] **Get User by ID**
  - Endpoint: `GET /api/v1/users/:userId`
  - Expected: 200 OK with public profile

- [ ] **Delete Account**
  - Endpoint: `DELETE /api/v1/users/:userId`
  - Expected: 200 OK, user marked as deleted

#### Photos

- [ ] **Upload Profile Photo**
  - Endpoint: `POST /api/v1/photos`
  - Content-Type: `multipart/form-data`
  - Body: Photo file
  - Expected: 201 Created with photo URL
  - Dependencies: Azure Blob Storage

- [ ] **Get User Photos**
  - Endpoint: `GET /api/v1/photos`
  - Expected: 200 OK with array of photos

- [ ] **Set Primary Photo**
  - Endpoint: `PUT /api/v1/photos/:photoId/primary`
  - Expected: 200 OK

- [ ] **Reorder Photos**
  - Endpoint: `PUT /api/v1/photos/reorder`
  - Payload: `{"photoIds": ["id1", "id2", "id3"]}`
  - Expected: 200 OK

- [ ] **Delete Photo**
  - Endpoint: `DELETE /api/v1/photos/:photoId`
  - Expected: 200 OK

- [ ] **Photo Upload Limit**
  - Try uploading 7th photo (max is 6)
  - Expected: 400 Bad Request

- [ ] **Photo Size Validation**
  - Upload file > 10MB
  - Expected: 413 Payload Too Large

- [ ] **Photo Content Moderation**
  - Upload should trigger moderation
  - Expected: Photo flagged if inappropriate
  - Dependencies: Azure Content Moderator

#### Prompts (Profile Questions)

- [ ] **Create/Update Prompts**
  - Expected: Max 3 prompts per user

### Preferences

- [ ] **Get Discovery Preferences**
  - Endpoint: `GET /api/v1/discovery/preferences`
  - Expected: 200 OK with preferences

- [ ] **Update Discovery Preferences**
  - Endpoint: `PUT /api/v1/discovery/preferences`
  - Payload: `{"minAge": 25, "maxAge": 35, "maxDistance": 50, "genderPreference": ["female"]}`
  - Expected: 200 OK

### Discovery & Swiping

#### Discovery Feed

- [ ] **Get Discovery Feed**
  - Endpoint: `GET /api/v1/discovery?limit=10`
  - Expected: 200 OK with array of potential matches
  - Dependencies: Matching algorithm

- [ ] **Empty Discovery Feed**
  - Verify handling when no matches available
  - Expected: 200 OK with empty array

#### Swipe Actions

- [ ] **Swipe Right (Like)**
  - Endpoint: `POST /api/v1/swipes`
  - Payload: `{"targetUserId": "user-id", "direction": "like"}`
  - Expected: 200 OK with `{"matched": false}`

- [ ] **Swipe Left (Pass)**
  - Endpoint: `POST /api/v1/swipes`
  - Payload: `{"targetUserId": "user-id", "direction": "pass"}`
  - Expected: 200 OK

- [ ] **Super Like**
  - Endpoint: `POST /api/v1/swipes`
  - Payload: `{"targetUserId": "user-id", "direction": "superlike"}`
  - Expected: 200 OK
  - Note: Check daily limit enforcement

- [ ] **Mutual Match Creation**
  - User A likes User B (who already liked User A)
  - Expected: `{"matched": true, "matchId": "..."}`
  - Dependencies: Real-time notification

- [ ] **Daily Swipe Limit (Free Tier)**
  - Make 11+ swipes as free user
  - Expected: 429 Too Many Requests or upgrade prompt

- [ ] **Get Swipe Statistics**
  - Endpoint: `GET /api/v1/swipes/stats`
  - Expected: 200 OK with likes/passes count

### Matching

- [ ] **Get All Matches**
  - Endpoint: `GET /api/v1/matches?page=1&limit=20`
  - Expected: 200 OK with paginated matches

- [ ] **Get Recent Matches**
  - Endpoint: `GET /api/v1/matches/recent`
  - Expected: 200 OK with recent matches

- [ ] **Get Match Count**
  - Endpoint: `GET /api/v1/matches/count`
  - Expected: 200 OK with `{"count": 5}`

- [ ] **Get Match Details**
  - Endpoint: `GET /api/v1/matches/:matchId`
  - Expected: 200 OK with match data and conversation ID

- [ ] **Unmatch User**
  - Endpoint: `DELETE /api/v1/matches/:matchId`
  - Expected: 200 OK, match removed

- [ ] **Extend Match Expiry**
  - Endpoint: `POST /api/v1/matches/:matchId/extend`
  - Expected: 200 OK (premium feature)

- [ ] **Request Rematch**
  - Endpoint: `POST /api/v1/matches/:targetUserId/rematch`
  - Expected: 200 OK (uses coins/premium feature)

### Messaging

#### Conversations

- [ ] **Get Conversations List**
  - Endpoint: `GET /api/v1/conversations?page=1&limit=20`
  - Expected: 200 OK with conversations

- [ ] **Get Conversation Details**
  - Endpoint: `GET /api/v1/conversations/:conversationId`
  - Expected: 200 OK

- [ ] **Get Conversation Messages**
  - Endpoint: `GET /api/v1/conversations/:conversationId/messages?page=1&limit=50`
  - Expected: 200 OK with paginated messages

- [ ] **Mark Conversation as Read**
  - Endpoint: `PUT /api/v1/conversations/:conversationId/read`
  - Expected: 200 OK

- [ ] **Archive Conversation**
  - Endpoint: `PUT /api/v1/conversations/:conversationId/archive`
  - Expected: 200 OK

#### Messages

- [ ] **Send Text Message**
  - Endpoint: `POST /api/v1/messages`
  - Payload: `{"conversationId": "...", "content": "Hello!", "type": "text"}`
  - Expected: 201 Created

- [ ] **Send Image Message**
  - Endpoint: `POST /api/v1/messages`
  - Payload: `{"conversationId": "...", "content": "image-url", "type": "image"}`
  - Expected: 201 Created
  - Dependencies: Media upload first

- [ ] **Send GIF Message**
  - Endpoint: `POST /api/v1/messages`
  - Payload: `{"conversationId": "...", "content": "gif-url", "type": "gif"}`
  - Expected: 201 Created

- [ ] **Send Voice Note**
  - Endpoint: `POST /api/v1/media/voice-note`
  - Then send message with voice note URL
  - Expected: 201 Created
  - Dependencies: Azure Blob Storage

- [ ] **Get Unread Message Count**
  - Endpoint: `GET /api/v1/messages/unread-count`
  - Expected: 200 OK with `{"count": 3}`

- [ ] **Update Message**
  - Endpoint: `PUT /api/v1/messages/:messageId`
  - Payload: `{"content": "Edited message"}`
  - Expected: 200 OK

- [ ] **Delete Message**
  - Endpoint: `DELETE /api/v1/messages/:messageId`
  - Expected: 200 OK

- [ ] **Update Message Status (Delivered/Read)**
  - Endpoint: `PUT /api/v1/messages/:messageId/status`
  - Payload: `{"status": "read"}`
  - Expected: 200 OK

- [ ] **Message Content Moderation**
  - Send message with profanity
  - Expected: Message flagged or rejected
  - Dependencies: Azure Content Moderator

### Notifications

#### Push Notifications

- [ ] **Register Device for Push**
  - Endpoint: `POST /api/v1/notifications/devices`
  - Payload: `{"token": "fcm-token", "platform": "android"}`
  - Expected: 201 Created
  - Dependencies: Firebase Cloud Messaging (Android/Web)

- [ ] **iOS Push Notification Registration**
  - Payload: `{"token": "apns-token", "platform": "ios"}`
  - Dependencies: Apple Push Notification Service

#### Notification Management

- [ ] **Get Notifications**
  - Endpoint: `GET /api/v1/notifications?page=1&limit=20`
  - Expected: 200 OK with notifications

- [ ] **Get Unread Notification Count**
  - Endpoint: `GET /api/v1/notifications/unread-count`
  - Expected: 200 OK with `{"count": 5}`

- [ ] **Mark Notification as Read**
  - Endpoint: `PUT /api/v1/notifications/:notificationId/read`
  - Expected: 200 OK

- [ ] **Mark All Notifications as Read**
  - Endpoint: `PUT /api/v1/notifications/read-all`
  - Expected: 200 OK

#### Notification Preferences

- [ ] **Get Notification Preferences**
  - Endpoint: `GET /api/v1/notifications/preferences`
  - Expected: 200 OK

- [ ] **Update Notification Preferences**
  - Endpoint: `PUT /api/v1/notifications/preferences`
  - Payload: `{"newMatches": true, "newMessages": true, "likes": false, "promotions": false}`
  - Expected: 200 OK

#### Notification Triggers (End-to-End)

- [ ] **New Match Notification**
  - Create mutual match
  - Expected: Both users receive push notification

- [ ] **New Message Notification**
  - Send message
  - Expected: Recipient receives push notification

- [ ] **New Like Notification (Premium)**
  - Premium user receives like
  - Expected: Notification sent

---

## 4. Monetization Features

### Subscription Tiers

Platform offers 4 subscription tiers:
1. **Free** - Limited features
2. **Basic** - $9.99/month
3. **Mid** - $19.99/month
4. **Ultra** - $29.99/month

#### Subscription Management

- [ ] **Get Current Subscription**
  - Endpoint: `GET /api/v1/subscriptions/current`
  - Expected: 200 OK with subscription details

- [ ] **Get Available Features**
  - Endpoint: `GET /api/v1/subscriptions/features`
  - Expected: 200 OK with features list (16 features per tier)

- [ ] **Check Feature Access**
  - Endpoint: `GET /api/v1/subscriptions/features/see_who_liked_you/access`
  - Expected: `{"hasAccess": true/false}`

- [ ] **Update Subscription Tier**
  - Endpoint: `PUT /api/v1/subscriptions/tier`
  - Payload: `{"tier": "basic"}`
  - Expected: 200 OK
  - Dependencies: Stripe payment

- [ ] **Cancel Subscription**
  - Endpoint: `POST /api/v1/subscriptions/cancel`
  - Expected: 200 OK, subscription canceled at period end

- [ ] **Reactivate Subscription**
  - Endpoint: `POST /api/v1/subscriptions/reactivate`
  - Expected: 200 OK

#### Subscription Features Validation

Test that features are properly gated by subscription tier:

**Free Tier Limits:**
- [ ] Daily swipes limited to 10
- [ ] Daily likes limited to 5
- [ ] No super likes (0 per day)
- [ ] Cannot see who liked them
- [ ] No advanced filters

**Basic Tier Features ($9.99/month):**
- [ ] Unlimited swipes (-1)
- [ ] Unlimited likes (-1)
- [ ] See who liked you
- [ ] Advanced filters enabled
- [ ] 5 super likes per day
- [ ] Read receipts enabled
- [ ] Priority likes enabled

**Mid Tier Features ($19.99/month):**
- [ ] All Basic features
- [ ] Incognito mode enabled
- [ ] 10 super likes per day
- [ ] 3 rewinds per day
- [ ] 1 boost per month
- [ ] No ads

**Ultra Tier Features ($29.99/month):**
- [ ] All Mid features
- [ ] Unlimited super likes (-1)
- [ ] Unlimited rewinds (-1)
- [ ] 2 boosts per month
- [ ] Profile boost enabled
- [ ] VIP badge on profile
- [ ] Early access to features

### Coins System

- [ ] **Get Coin Balance**
  - Endpoint: `GET /api/v1/coins/balance`
  - Expected: 200 OK with `{"balance": 100}`

- [ ] **Get Coin Products**
  - Endpoint: `GET /api/v1/coins/products`
  - Expected: 200 OK with available coin packages

- [ ] **Purchase Coins**
  - Endpoint: `POST /api/v1/coins/purchase`
  - Payload: `{"productId": "coins-100", "paymentMethodId": "pm_..."}`
  - Expected: 200 OK, balance updated
  - Dependencies: Stripe payment

- [ ] **Get Coin Transactions**
  - Endpoint: `GET /api/v1/coins/transactions?page=1&limit=20`
  - Expected: 200 OK with transaction history

- [ ] **Get Transaction Summary**
  - Endpoint: `GET /api/v1/coins/transactions/summary`
  - Expected: 200 OK with summary stats

- [ ] **Spend Coins**
  - Endpoint: `POST /api/v1/coins/spend`
  - Payload: `{"amount": 10, "reason": "boost"}`
  - Expected: 200 OK, balance decreased

- [ ] **Insufficient Coins**
  - Try to spend more coins than balance
  - Expected: 400 Bad Request

- [ ] **Claim Daily Reward**
  - Endpoint: `POST /api/v1/coins/daily-reward`
  - Expected: 200 OK with bonus coins

- [ ] **Daily Reward Already Claimed**
  - Try claiming again
  - Expected: 429 Too Many Requests

### Boosts

- [ ] **Get Boost Products**
  - Endpoint: `GET /api/v1/boosts/products`
  - Expected: 200 OK with boost options

- [ ] **Get Active Boosts**
  - Endpoint: `GET /api/v1/boosts/active`
  - Expected: 200 OK with active boosts

- [ ] **Get Boost History**
  - Endpoint: `GET /api/v1/boosts/history`
  - Expected: 200 OK with past boosts

- [ ] **Activate Boost with Coins**
  - Endpoint: `POST /api/v1/boosts/activate-with-coins`
  - Payload: `{"boostProductId": "boost-30min"}`
  - Expected: 200 OK, coins deducted, boost active
  - Verify: Profile appears higher in discovery feed

- [ ] **Boost Expiry**
  - Wait for boost duration
  - Expected: Boost automatically expires, profile returns to normal visibility

### Payments

- [ ] **Create Payment Intent**
  - Endpoint: `POST /api/v1/payments/create-intent`
  - Payload: `{"productId": "subscription-basic", "productType": "subscription"}`
  - Expected: 200 OK with `clientSecret` for Stripe
  - Dependencies: Stripe

- [ ] **Get Payment History**
  - Endpoint: `GET /api/v1/payments/history?page=1&limit=20`
  - Expected: 200 OK with payment records

- [ ] **Get Payment Methods**
  - Endpoint: `GET /api/v1/payments/methods`
  - Expected: 200 OK with saved payment methods

- [ ] **Stripe Webhook Processing**
  - Endpoint: `POST /api/v1/payments/webhook`
  - Simulate Stripe events: payment_intent.succeeded
  - Expected: 200 OK, subscription activated
  - Dependencies: Stripe webhook secret

---

## 5. Safety & Moderation

### User Blocking

- [ ] **Block User**
  - Endpoint: `POST /api/v1/blocks`
  - Payload: `{"userId": "user-to-block"}`
  - Expected: 201 Created

- [ ] **Get Blocked Users**
  - Endpoint: `GET /api/v1/blocks`
  - Expected: 200 OK with list of blocked users

- [ ] **Unblock User**
  - Endpoint: `DELETE /api/v1/blocks/:userId`
  - Expected: 200 OK

- [ ] **Blocked User Interaction Prevention**
  - Verify blocked user doesn't appear in discovery
  - Verify cannot message blocked user
  - Expected: 403 Forbidden or filtered out

### User Reporting

- [ ] **Get Report Categories**
  - Endpoint: `GET /api/v1/reports/categories`
  - Expected: 200 OK with categories (harassment, spam, inappropriate content, etc.)

- [ ] **Submit User Report**
  - Endpoint: `POST /api/v1/reports`
  - Payload: `{"userId": "reported-user", "categoryId": "harassment", "description": "Details..."}`
  - Expected: 201 Created

- [ ] **Report Escalation**
  - Multiple reports on same user
  - Expected: User flagged for review (admin check)

### Content Moderation

- [ ] **Photo Moderation**
  - Upload inappropriate photo
  - Expected: Photo rejected or flagged
  - Dependencies: Azure Content Moderator

- [ ] **Text Moderation (Messages)**
  - Send message with profanity/hate speech
  - Expected: Message flagged or blocked
  - Dependencies: Azure Content Moderator

- [ ] **Profile Bio Moderation**
  - Update bio with inappropriate content
  - Expected: Bio rejected or flagged

### Privacy Controls

- [ ] **Get Privacy Settings**
  - Endpoint: `GET /api/v1/privacy/settings`
  - Expected: 200 OK

- [ ] **Update Privacy Settings**
  - Endpoint: `PUT /api/v1/privacy/settings`
  - Payload: `{"showOnlineStatus": false, "showLastActive": false, "showDistance": true, "showAge": true}`
  - Expected: 200 OK

- [ ] **Incognito Mode (Premium)**
  - Enable incognito
  - Expected: User not visible in discovery unless liked first

- [ ] **Hide Online Status**
  - Disable showOnlineStatus
  - Expected: Other users cannot see online indicator

---

## 6. Platform Endpoints

### Version Information

- [ ] **Get Platform Version**
  - Endpoint: `GET /api/v1/platform/version`
  - Expected: 200 OK
  ```json
  {
    "version": "1.0.0",
    "buildNumber": "123",
    "commitSha": "a1b2c3d",
    "environment": "production"
  }
  ```

### Public Configuration

- [ ] **Get Public Config**
  - Endpoint: `GET /api/v1/platform/config/public`
  - Expected: 200 OK
  ```json
  {
    "features": {
      "subscriptions": true,
      "coins": true,
      "boosts": true,
      "superLikes": true,
      "messaging": true,
      "videoChat": false
    },
    "limits": {
      "freeSwipesPerDay": 50,
      "freeMessagesPerDay": 10,
      "maxPhotos": 6,
      "maxPrompts": 3
    },
    "support": {
      "email": "support@flamoral.com",
      "helpCenter": "https://help.flamoral.com"
    }
  }
  ```

---

## 7. External Integrations

### Stripe Payments

- [ ] **Stripe API Connection**
  - Verify API key is valid
  - Method: Create test payment intent
  - Expected: No errors
  - Environment Variable: `STRIPE_SECRET_KEY`

- [ ] **Stripe Webhook Endpoint**
  - URL: `https://api.flamoral.com/api/v1/payments/webhook`
  - Verify webhook is registered in Stripe dashboard
  - Test events: payment_intent.succeeded, customer.subscription.created
  - Expected: 200 OK responses

- [ ] **Subscription Creation**
  - Create Basic subscription via Stripe
  - Expected: User tier updated in database

- [ ] **Subscription Cancellation**
  - Cancel subscription via Stripe webhook
  - Expected: User tier downgraded at period end

- [ ] **Refund Processing**
  - Process refund for coin purchase
  - Expected: Webhook handled, balance adjusted if needed

### SendGrid Email Service

- [ ] **SendGrid API Connection**
  - Verify API key is valid
  - Method: Send test email
  - Environment Variable: `SENDGRID_API_KEY`

- [ ] **Registration Email**
  - Register new user
  - Expected: Verification email received within 1 minute
  - From: `noreply@flamoral.com`

- [ ] **Password Reset Email**
  - Request password reset
  - Expected: Reset email received with valid token

- [ ] **Match Notification Email**
  - New match created
  - Expected: Email sent (if user has email notifications enabled)

- [ ] **Email Deliverability**
  - Check SendGrid dashboard for delivery rates
  - Expected: >95% delivery rate

### Azure Services

#### Azure Blob Storage

- [ ] **Storage Connection**
  - Verify connection string is valid
  - Method: Upload test file
  - Environment Variable: `AZURE_STORAGE_CONNECTION_STRING`

- [ ] **Photo Upload to Blob**
  - Upload profile photo
  - Expected: File stored in blob container, CDN URL returned

- [ ] **Photo Retrieval via CDN**
  - Access photo URL
  - Expected: Image loads from Azure CDN
  - Environment Variable: `AZURE_CDN_URL`

- [ ] **Storage Quota**
  - Verify not approaching storage limits
  - Check: Azure portal

#### Azure Face API (Photo Verification)

- [ ] **Face API Connection**
  - Verify API key and endpoint
  - Environment Variables: `AZURE_FACE_API_KEY`, `AZURE_FACE_ENDPOINT`

- [ ] **Photo Verification Flow**
  - Upload selfie for verification
  - Expected: Face detected, liveness check performed

- [ ] **Face Matching**
  - Compare profile photos with verification photo
  - Expected: Match confidence score returned
  - Threshold: `FACE_MATCH_THRESHOLD=0.7`

#### Azure Content Moderator

- [ ] **Content Moderator Connection**
  - Environment Variables: `AZURE_CONTENT_MODERATOR_ENDPOINT`, `AZURE_CONTENT_MODERATOR_KEY`

- [ ] **Image Moderation**
  - Submit test image
  - Expected: Adult content score returned

- [ ] **Text Moderation**
  - Submit test text with profanity
  - Expected: Profanity detected, PII detected

### Firebase Cloud Messaging (Android/Web Push)

- [ ] **FCM Connection**
  - Verify service account credentials
  - Environment Variable: `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_PATH`

- [ ] **Android Push Notification**
  - Send test push to Android device
  - Expected: Notification received on device

- [ ] **Web Push Notification**
  - Send test push to web browser
  - Expected: Browser notification displayed

### Apple Push Notification Service (iOS)

- [ ] **APNs Connection**
  - Verify APNs key is valid
  - Environment Variables: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY_PATH`

- [ ] **iOS Push Notification**
  - Send test push to iOS device
  - Expected: Notification received on device

- [ ] **Production vs Sandbox**
  - Verify `APNS_PRODUCTION=true` for production
  - Expected: Using production APNs server

### OpenAI API (Automation Features)

- [ ] **OpenAI Connection**
  - Verify API key is valid
  - Environment Variable: `OPENAI_API_KEY`

- [ ] **Icebreaker Suggestions**
  - Request AI-generated icebreaker
  - Expected: Contextual opening message generated

- [ ] **Smart Reply Suggestions**
  - Request reply suggestions for conversation
  - Expected: 3-5 reply options returned

- [ ] **API Rate Limiting**
  - Verify rate limits configured
  - Environment Variable: `AI_REQUEST_RATE_LIMIT_PER_USER_HOURLY=20`

---

## 8. WebSocket/Real-time Features

### WebSocket Connection

- [ ] **Establish WebSocket Connection**
  - URL: `wss://api.flamoral.com/ws` or configured socket endpoint
  - Expected: Connection established with auth token

- [ ] **Connection Authentication**
  - Connect with invalid token
  - Expected: Connection rejected

- [ ] **Connection Persistence**
  - Maintain connection for 5+ minutes
  - Expected: No disconnections, heartbeat working

### Real-time Messaging

- [ ] **Typing Indicators**
  - User A starts typing
  - Expected: User B sees typing indicator in real-time

- [ ] **Stop Typing Indicator**
  - User A stops typing
  - Expected: Indicator removed for User B

- [ ] **Message Delivery (Real-time)**
  - User A sends message
  - Expected: User B receives message via WebSocket immediately

- [ ] **Message Read Receipts**
  - User B reads message
  - Expected: User A sees "Read" status update in real-time

### Real-time Match Notifications

- [ ] **New Match Notification**
  - Create mutual match
  - Expected: Both users receive real-time match notification

### Online Status

- [ ] **User Online Indicator**
  - User connects to WebSocket
  - Expected: Other users see them as online (if privacy allows)

- [ ] **User Offline Indicator**
  - User disconnects
  - Expected: Status changes to offline or last seen timestamp

### Reconnection Handling

- [ ] **Automatic Reconnection**
  - Simulate network disconnect
  - Expected: Client automatically reconnects

- [ ] **Message Sync After Reconnect**
  - Disconnect, receive messages offline, reconnect
  - Expected: All missed messages delivered

---

## 9. Database Connectivity

### PostgreSQL

- [ ] **Primary Database Connection**
  - Verify all services can connect
  - Method: Check health endpoints
  - Expected: All report "connected": true

- [ ] **Connection Pool Status**
  - Check pool is not exhausted
  - Expected: Active connections < max pool size

- [ ] **Query Performance**
  - Sample query execution time
  - Expected: <100ms for simple queries

### MongoDB (if used)

- [ ] **MongoDB Connection**
  - Verify connection string
  - Expected: No connection errors in logs

### Redis

- [ ] **Redis Connection**
  - Verify all services can connect
  - Environment Variable: `REDIS_HOST`, `REDIS_PORT`

- [ ] **Cache Operations**
  - Test SET and GET
  - Expected: Data cached and retrieved

- [ ] **Session Storage**
  - Verify user sessions stored in Redis
  - Expected: Sessions persist across requests

- [ ] **Queue Operations (Bull)**
  - Verify job queues working
  - Expected: Jobs processed (check notification queue, media processing queue)

---

## 10. Performance & Load

### Response Times

- [ ] **Health Endpoint Response**
  - Expected: <50ms

- [ ] **Authentication Login**
  - Expected: <500ms

- [ ] **Get Discovery Feed**
  - Expected: <1000ms

- [ ] **Send Message**
  - Expected: <300ms

- [ ] **Upload Photo**
  - Expected: <3000ms (depends on file size)

### Rate Limiting

- [ ] **API Rate Limits Enforced**
  - Make 100+ requests in 1 minute
  - Expected: 429 Too Many Requests after limit

- [ ] **Per-User Rate Limits**
  - Test limits are per-user, not global
  - Expected: Different users have separate limits

### Concurrent Users

- [ ] **10 Concurrent Logins**
  - Simulate 10 users logging in simultaneously
  - Expected: All succeed

- [ ] **50 Concurrent API Requests**
  - Expected: All processed, no timeouts

### Database Load

- [ ] **Connection Pool Under Load**
  - Simulate high traffic
  - Expected: No connection exhaustion errors

### CDN Performance

- [ ] **Photo Load Time**
  - Load 10 profile photos
  - Expected: <1s via CDN cache

---

## Critical Path Testing

These tests represent the minimum viable user journey. All must pass before production launch.

### New User Journey

1. [ ] Register account
2. [ ] Verify email
3. [ ] Complete profile (name, bio, photos)
4. [ ] Set discovery preferences
5. [ ] View discovery feed
6. [ ] Swipe on 5 profiles
7. [ ] Create mutual match
8. [ ] Send first message
9. [ ] Receive message
10. [ ] View notifications

### Subscription Upgrade Journey

1. [ ] Login as free user
2. [ ] View subscription options
3. [ ] Purchase Basic subscription
4. [ ] Verify payment processed (Stripe)
5. [ ] Confirm tier updated
6. [ ] Test premium feature (see who liked you)

### Coin Purchase Journey

1. [ ] View coin packages
2. [ ] Purchase 100 coins
3. [ ] Verify payment processed
4. [ ] Confirm balance updated
5. [ ] Spend coins on boost
6. [ ] Verify boost activated

---

## Monitoring & Logging

### Application Logs

- [ ] **Verify Logs are Collected**
  - Check centralized logging (if configured)
  - Expected: Logs from all services

- [ ] **Log Level Appropriate**
  - Production should be INFO or WARN
  - Expected: Not DEBUG (too verbose)

### Error Tracking

- [ ] **Error Reporting Configured**
  - Verify Sentry/error tracking service
  - Expected: Errors captured and reported

### Metrics & Analytics

- [ ] **Analytics Events Tracked**
  - User registration
  - Login
  - Swipes
  - Matches
  - Messages sent
  - Payments

---

## Security Checklist

### HTTPS/TLS

- [ ] **All Endpoints Use HTTPS**
  - Verify SSL certificate valid
  - Expected: No mixed content warnings

- [ ] **SSL Certificate Expiry**
  - Check expiration date
  - Expected: Valid for >30 days

### CORS Configuration

- [ ] **CORS Headers Present**
  - Check `Access-Control-Allow-Origin`
  - Expected: Only approved origins allowed

### Authentication Security

- [ ] **JWT Secret Strength**
  - Verify JWT_SECRET is strong (>32 chars)
  - Expected: Environment variable set

- [ ] **Password Hashing**
  - Verify bcrypt or similar used
  - Expected: Passwords never stored plainly

### API Security

- [ ] **Rate Limiting Active**
  - Test rate limit enforcement
  - Expected: 429 responses

- [ ] **CSRF Protection**
  - For state-changing requests
  - Expected: CSRF token required

- [ ] **Input Validation**
  - Test SQL injection, XSS
  - Expected: Malicious input rejected

---

## Disaster Recovery

### Backup Verification

- [ ] **Database Backups**
  - Verify automated backups configured
  - Expected: Daily backups available

- [ ] **Backup Restoration Test**
  - Test restore from backup (non-production)
  - Expected: Data restored successfully

### Failover Testing

- [ ] **Service Restart Recovery**
  - Restart API Gateway
  - Expected: Service recovers, health check passes

- [ ] **Database Failover**
  - Test failover to replica (if configured)
  - Expected: Application continues functioning

---

## Compliance & Legal

### GDPR Compliance

- [ ] **User Data Export**
  - Request data export
  - Expected: All user data provided in portable format

- [ ] **User Data Deletion**
  - Request account deletion
  - Expected: User data anonymized/deleted within 30 days

### Terms of Service

- [ ] **Terms Accessible**
  - URL: `https://flamoral.com/legal/terms`
  - Expected: Document loads

- [ ] **Privacy Policy Accessible**
  - URL: `https://flamoral.com/legal/privacy`
  - Expected: Document loads

---

## Post-Launch Monitoring

After production launch, continuously monitor:

### Daily Checks

- [ ] All service health endpoints return 200
- [ ] No critical errors in logs
- [ ] Payment processing functional (check Stripe dashboard)
- [ ] Email delivery rate >95% (check SendGrid)
- [ ] Push notification delivery rate >90%

### Weekly Checks

- [ ] Database backup successful
- [ ] SSL certificate validity
- [ ] API response times within SLA
- [ ] User growth metrics
- [ ] Revenue metrics (subscriptions, coins)

### Monthly Checks

- [ ] Security audit
- [ ] Dependency updates
- [ ] Performance optimization review
- [ ] Cost optimization (Azure, Stripe fees)

---

## Test Results Summary

### Test Execution Date: __________

### Overall Status

- Total Tests: _______
- Passed: _______
- Failed: _______
- Not Applicable: _______

### Critical Issues Found

| Issue | Severity | Component | Status | Assignee |
|-------|----------|-----------|--------|----------|
|       |          |           |        |          |

### Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | | | |
| Backend Lead | | | |
| DevOps Lead | | | |
| Product Manager | | | |

---

## Appendix

### Test User Accounts

See [TEST-ACCOUNTS.md](../TEST-ACCOUNTS.md) for test user credentials.

### API Documentation

- OpenAPI Spec: [openapi.yaml](../api/openapi.yaml)
- API Inventory: [api-inventory.md](../api/api-inventory.md)

### Environment Variables Reference

See individual service `.env.example` files:
- `backend/services/*/\.env.example`

### Support Contacts

- **Backend Issues:** backend-team@flamoral.com
- **DevOps Issues:** devops@flamoral.com
- **QA Issues:** qa@flamoral.com
- **Emergency Hotline:** [Phone Number]

---

**Document Owner:** QA Team
**Review Frequency:** Before each production deployment
**Last Reviewed:** 2025-12-18
