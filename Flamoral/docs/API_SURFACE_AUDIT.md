# Flamoral Dating Platform - API Surface Area Audit

**Date**: 2025-12-12
**Platform Version**: 1.0.0
**Auditor**: API Surface Auditor and Platform Validator

---

## Executive Summary

This document provides a comprehensive inventory of all API endpoints exposed by the Flamoral Dating Platform backend services. The platform follows a microservices architecture with an API Gateway serving as the single entry point for all client requests.

**Architecture Overview**:
- **API Gateway**: Port 3000 (NestJS) - Routes requests to backend microservices
- **10+ Microservices**: Auth, User, Matching, Messaging, Media, Payment, Notification, Moderation, Analytics, and additional services
- **Frontend Clients**: Web App (React), Mobile App (React Native)

---

## 1. API Gateway - Core Routing Layer

**Service**: `api-gateway`
**Port**: 3000
**Framework**: NestJS
**Base Path**: `/api`

### 1.1 Health & System Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Gateway health check (memory, heap) |
| `/health/ready` | GET | No | Readiness probe |
| `/health/live` | GET | No | Liveness probe |
| `/health/services` | GET | No | Health status of all backend services |
| `/health/circuits` | GET | No | Circuit breaker status for services |

**Features**:
- Memory health indicators (heap < 500MB, RSS < 1GB)
- Service-level health aggregation
- Circuit breaker metrics (failures, successes, uptime)

---

## 2. Authentication Service

**Service**: `auth-service`
**Proxied Through**: API Gateway `/api/auth`
**Technology**: Express.js

### 2.1 Authentication Endpoints

| Endpoint | Method | Auth Required | Rate Limit | Description |
|----------|--------|---------------|------------|-------------|
| `/api/auth/register` | POST | No | Standard | Register new user account |
| `/api/auth/login` | POST | No | Strict | User login with credentials |
| `/api/auth/logout` | POST | Yes | Standard | Logout current user |
| `/api/auth/refresh-token` | POST | No | Standard | Refresh access token |
| `/api/auth/verify-email` | POST | No | Standard | Verify email with token |
| `/api/auth/resend-verification` | POST | No | Standard | Resend verification email |
| `/api/auth/forgot-password` | POST | No | Standard | Request password reset |
| `/api/auth/reset-password` | POST | No | Standard | Reset password with token |
| `/api/auth/me` | GET | Yes | Standard | Get current user info |
| `/api/auth/validate-token` | POST | No | Internal | Validate access token (service-to-service) |

**Request Schemas**:

**Register** (`POST /api/auth/register`):
```json
{
  "email": "string (required)",
  "password": "string (required, min 8 chars)",
  "firstName": "string (required)",
  "lastName": "string (required)",
  "dateOfBirth": "ISO 8601 date (required)",
  "gender": "string (required)",
  "deviceData": {
    "deviceId": "string",
    "deviceType": "ios | android | web",
    "pushToken": "string"
  }
}
```

**Login** (`POST /api/auth/login`):
```json
{
  "email": "string (required)",
  "password": "string (required)",
  "deviceData": {
    "deviceId": "string",
    "deviceType": "ios | android | web",
    "pushToken": "string"
  }
}
```

**Response Schema** (Login/Register):
```json
{
  "success": true,
  "data": {
    "accessToken": "string (JWT)",
    "refreshToken": "string",
    "user": {
      "id": "string (UUID)",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "isVerified": "boolean"
    },
    "expiresIn": "number (seconds)"
  }
}
```

**Security Features**:
- JWT token-based authentication
- Refresh token rotation
- IP tracking and user agent logging
- Account lockout after failed login attempts
- Email verification flow
- Secure password reset flow

---

## 3. User Service

**Service**: `user-service`
**Proxied Through**: API Gateway `/api/users`

### 3.1 Profile Management

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/users/me` | GET | Yes | Get current user profile |
| `/api/users/me` | PUT | Yes | Update current user profile |
| `/api/users/:userId` | GET | Yes | Get user by ID |
| `/api/users/:userId` | PUT | Yes | Update user by ID (admin) |
| `/api/users/:userId` | DELETE | Yes | Delete user account |

### 3.2 Profile Photos

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/users/me/photos` | GET | Yes | Get current user photos |
| `/api/users/me/photos` | POST | Yes | Upload profile photo |
| `/api/users/me/photos/:photoId` | DELETE | Yes | Delete profile photo |
| `/api/users/me/photos/:photoId/primary` | PUT | Yes | Set photo as primary |

### 3.3 Preferences & Settings

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/users/me/preferences` | GET | Yes | Get user preferences |
| `/api/users/me/preferences` | PUT | Yes | Update user preferences |
| `/api/users/me/settings` | GET | Yes | Get user settings |
| `/api/users/me/settings` | PUT | Yes | Update user settings |
| `/api/users/me/location` | PUT | Yes | Update user location |

### 3.4 Blocking & Reporting

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/users/me/blocks` | GET | Yes | Get blocked users |
| `/api/users/me/blocks` | POST | Yes | Block a user |
| `/api/users/me/blocks/:blockedUserId` | DELETE | Yes | Unblock a user |
| `/api/users/me/reports` | POST | Yes | Report a user |

### 3.5 Verification

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/users/me/verification` | GET | Yes | Get verification status |
| `/api/users/me/verification` | POST | Yes | Request profile verification |

**Profile Schema**:
```json
{
  "id": "string (UUID)",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "dateOfBirth": "ISO 8601 date",
  "gender": "string",
  "bio": "string (optional, max 500 chars)",
  "location": {
    "latitude": "number",
    "longitude": "number",
    "city": "string",
    "country": "string"
  },
  "photos": [
    {
      "id": "string",
      "url": "string",
      "isPrimary": "boolean",
      "order": "number"
    }
  ],
  "preferences": {
    "ageMin": "number",
    "ageMax": "number",
    "distance": "number (km)",
    "genderPreference": "string[]"
  },
  "isVerified": "boolean",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp"
}
```

---

## 4. Matching Service

**Service**: `matching-service`
**Proxied Through**: API Gateway `/api`

### 4.1 Discovery Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/discovery/recommendations` | GET | Yes | Get recommended profiles |
| `/api/discovery/search` | POST | Yes | Search profiles with filters |
| `/api/discovery/nearby` | GET | Yes | Get nearby users |

**Query Parameters** (Recommendations):
- `limit`: number (default: 20)
- `offset`: number (default: 0)

**Query Parameters** (Nearby):
- `latitude`: number (required)
- `longitude`: number (required)
- `radius`: number (km, default: 25)
- `limit`: number (default: 20)

### 4.2 Like/Pass Actions

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/likes` | POST | Yes | Like a profile |
| `/api/likes/received` | GET | Yes | Get users who liked me |
| `/api/likes/sent` | GET | Yes | Get users I liked |
| `/api/passes` | POST | Yes | Pass on a profile |
| `/api/actions/undo` | POST | Yes | Undo last swipe action |

**Like Request**:
```json
{
  "targetUserId": "string (UUID, required)",
  "timestamp": "ISO 8601 timestamp"
}
```

### 4.3 Match Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/matches` | GET | Yes | Get all matches |
| `/api/matches/:matchId` | GET | Yes | Get specific match |
| `/api/matches/:matchId` | DELETE | Yes | Unmatch a user |
| `/api/matches/count` | GET | Yes | Get total match count |
| `/api/matches/:matchId/compatibility` | GET | Yes | Get compatibility score |

**Match Schema**:
```json
{
  "id": "string (UUID)",
  "matchedUser": {
    "id": "string",
    "firstName": "string",
    "age": "number",
    "photos": ["string"],
    "bio": "string"
  },
  "matchedAt": "ISO 8601 timestamp",
  "lastActivityAt": "ISO 8601 timestamp",
  "compatibilityScore": "number (0-100)",
  "unreadMessages": "number"
}
```

### 4.4 Premium Features

| Endpoint | Method | Auth Required | Subscription Required | Description |
|----------|--------|---------------|----------------------|-------------|
| `/api/super-likes` | POST | Yes | Premium | Super like a profile |
| `/api/super-likes/remaining` | GET | Yes | No | Get remaining super likes |
| `/api/boost` | POST | Yes | Premium | Activate profile boost |
| `/api/boost/status` | GET | Yes | No | Get boost status |

---

## 5. Messaging Service

**Service**: `messaging-service`
**Proxied Through**: API Gateway `/api`

### 5.1 Conversation Management

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/conversations` | GET | Yes | Get all conversations |
| `/api/conversations` | POST | Yes | Create new conversation |
| `/api/conversations/with/:otherUserId` | GET | Yes | Get/create conversation with user |
| `/api/conversations/:conversationId` | GET | Yes | Get specific conversation |
| `/api/conversations/:conversationId` | DELETE | Yes | Delete conversation |
| `/api/conversations/:conversationId/read` | PUT | Yes | Mark conversation as read |
| `/api/conversations/:conversationId/messages` | GET | Yes | Get messages in conversation |

**Query Parameters** (Get Conversations):
- `limit`: number (default: 20)
- `offset`: number (default: 0)

### 5.2 Message Operations

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/messages` | POST | Yes | Send a new message |
| `/api/messages/unread-count` | GET | Yes | Get unread message count |
| `/api/messages/:messageId` | GET | Yes | Get specific message |
| `/api/messages/:messageId` | PUT | Yes | Update message |
| `/api/messages/:messageId` | DELETE | Yes | Delete message |
| `/api/messages/:messageId/status` | PUT | Yes | Update message status |

**Send Message Request**:
```json
{
  "conversationId": "string (UUID, required)",
  "content": "string (required, max 2000 chars)",
  "type": "text | image | gif | voice",
  "metadata": {
    "imageUrl": "string (if type=image)",
    "gifUrl": "string (if type=gif)",
    "duration": "number (if type=voice)"
  }
}
```

**Message Schema**:
```json
{
  "id": "string (UUID)",
  "conversationId": "string (UUID)",
  "senderId": "string (UUID)",
  "content": "string",
  "type": "text | image | gif | voice",
  "status": "sent | delivered | read",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp"
}
```

### 5.3 User Status

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/users/:userId/status` | GET | Yes | Get user online status |

---

## 6. Media Service

**Service**: `media-service`
**Proxied Through**: API Gateway `/api/media`

### 6.1 Upload Endpoints

| Endpoint | Method | Auth Required | Content Type | Description |
|----------|--------|---------------|--------------|-------------|
| `/api/media/upload/image` | POST | Yes | multipart/form-data | Upload image |
| `/api/media/upload/video` | POST | Yes | multipart/form-data | Upload video |
| `/api/media/upload/batch` | POST | Yes | multipart/form-data | Upload multiple files |

**Upload Limits**:
- Image: Max 10MB, formats: JPG, PNG, WEBP
- Video: Max 50MB, formats: MP4, MOV
- Batch: Max 10 files per request

### 6.2 Media Management

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/media/:mediaId` | GET | Yes | Get media by ID |
| `/api/media/:mediaId` | DELETE | Yes | Delete media |
| `/api/media/user/:userId` | GET | Yes | Get all media for user |
| `/api/media/:mediaId/status` | GET | Yes | Get processing status |
| `/api/media/:mediaId/url` | GET | Yes | Get signed URL |

**Query Parameters** (Get User Media):
- `type`: image | video (optional)
- `limit`: number (default: 20)
- `offset`: number (default: 0)

### 6.3 Processing Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/media/:mediaId/resize` | POST | Yes | Request image resize |
| `/api/media/:mediaId/thumbnail` | POST | Yes | Generate thumbnail |

### 6.4 Moderation & Analytics

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/media/:mediaId/moderation` | GET | Yes | Get moderation status |
| `/api/media/:mediaId/moderation/review` | POST | Yes | Request moderation review |
| `/api/media/:mediaId/analytics` | GET | Yes | Get media analytics |
| `/api/media/:mediaId/views` | POST | Yes | Track media view |

---

## 7. Payment Service

**Service**: `payment-service`
**Proxied Through**: API Gateway `/api`

### 7.1 Subscription Plans

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/subscriptions/plans` | GET | Yes | Get all subscription plans |
| `/api/subscriptions/plans/:planId` | GET | Yes | Get specific plan |

### 7.2 User Subscriptions

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/subscriptions/me` | GET | Yes | Get current user subscription |
| `/api/subscriptions` | POST | Yes | Create new subscription |
| `/api/subscriptions/me/upgrade` | PUT | Yes | Upgrade subscription |
| `/api/subscriptions/me` | DELETE | Yes | Cancel subscription |
| `/api/subscriptions/me/reactivate` | POST | Yes | Reactivate cancelled subscription |

**Subscription Tiers**:
- Free: Basic features
- Premium: Unlimited likes, 5 super likes/day, see who liked you
- Premium Plus: All Premium + Boost once/month, unlimited rewinds

### 7.3 Payment Methods

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/payment-methods` | GET | Yes | Get saved payment methods |
| `/api/payment-methods` | POST | Yes | Add payment method |
| `/api/payment-methods/:paymentMethodId` | DELETE | Yes | Remove payment method |
| `/api/payment-methods/:paymentMethodId/default` | PUT | Yes | Set default payment method |

### 7.4 Transactions & Invoices

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/transactions` | GET | Yes | Get transaction history |
| `/api/transactions/:transactionId` | GET | Yes | Get specific transaction |
| `/api/invoices` | GET | Yes | Get invoices |
| `/api/invoices/:invoiceId/download` | GET | Yes | Download invoice PDF |

### 7.5 In-App Purchases

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/purchases/products` | GET | Yes | Get available products |
| `/api/purchases` | POST | Yes | Purchase a product |
| `/api/purchases/history` | GET | Yes | Get purchase history |

**Products**:
- Super Likes Pack (5, 10, 25)
- Boosts Pack (1, 3, 5)
- Coins (100, 500, 1000)

### 7.6 Webhooks (Public Endpoints)

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/webhooks/stripe` | POST | No (Webhook signature) | Stripe webhook events |
| `/api/webhooks/paystack` | POST | No (Webhook signature) | Paystack webhook events |
| `/api/webhooks/flutterwave` | POST | No (Webhook signature) | Flutterwave webhook events |

### 7.7 Promo Codes

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/promo-codes/apply` | POST | Yes | Apply promo code |
| `/api/promo-codes/validate` | POST | Yes | Validate promo code |

---

## 8. Notification Service

**Service**: `notification-service`
**Proxied Through**: API Gateway `/api/notifications`

### 8.1 Notification Management

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/notifications` | GET | Yes | Get all notifications |
| `/api/notifications/:notificationId` | GET | Yes | Get specific notification |
| `/api/notifications/:notificationId/read` | PUT | Yes | Mark notification as read |
| `/api/notifications/read-all` | PUT | Yes | Mark all as read |
| `/api/notifications/:notificationId` | DELETE | Yes | Delete notification |
| `/api/notifications` | DELETE | Yes | Clear all notifications |
| `/api/notifications/unread/count` | GET | Yes | Get unread count |

**Query Parameters** (Get Notifications):
- `limit`: number (default: 20)
- `offset`: number (default: 0)
- `unread`: boolean (filter unread only)

### 8.2 Notification Settings

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/notifications/settings` | GET | Yes | Get notification settings |
| `/api/notifications/settings` | PUT | Yes | Update notification settings |

### 8.3 Push Notifications

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/notifications/push/register` | POST | Yes | Register push token |
| `/api/notifications/push/register` | DELETE | Yes | Unregister push token |
| `/api/notifications/push/test` | POST | Yes | Send test notification |

### 8.4 Email Preferences

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/notifications/email/preferences` | GET | Yes | Get email preferences |
| `/api/notifications/email/preferences` | PUT | Yes | Update email preferences |

**Notification Types**:
- New match
- New message
- Profile liked you
- Super like received
- Match expiring soon
- Subscription renewal

---

## 9. Moderation Service

**Service**: `moderation-service`
**Proxied Through**: API Gateway `/api/moderation`

### 9.1 Content Moderation

| Endpoint | Method | Auth Required | Role Required | Description |
|----------|--------|---------------|---------------|-------------|
| `/api/moderation/submit` | POST | Yes | User | Submit content for moderation |
| `/api/moderation/status/:contentId` | GET | Yes | User | Get moderation status |
| `/api/moderation/queue` | GET | Yes | Admin | Get moderation queue |
| `/api/moderation/approve/:contentId` | PUT | Yes | Admin | Approve content |
| `/api/moderation/reject/:contentId` | PUT | Yes | Admin | Reject content |

### 9.2 Reports

| Endpoint | Method | Auth Required | Role Required | Description |
|----------|--------|---------------|---------------|-------------|
| `/api/moderation/reports` | POST | Yes | User | Submit a report |
| `/api/moderation/reports/me` | GET | Yes | User | Get my reports |
| `/api/moderation/reports` | GET | Yes | Admin | Get all reports |
| `/api/moderation/reports/:reportId` | GET | Yes | Admin | Get report details |
| `/api/moderation/reports/:reportId` | PUT | Yes | Admin | Update report status |

**Report Types**:
- Inappropriate content
- Fake profile
- Harassment
- Spam
- Underage user
- Other

### 9.3 User Moderation Actions

| Endpoint | Method | Auth Required | Role Required | Description |
|----------|--------|---------------|---------------|-------------|
| `/api/moderation/actions/ban` | POST | Yes | Admin | Ban user |
| `/api/moderation/actions/unban` | POST | Yes | Admin | Unban user |
| `/api/moderation/actions/warn` | POST | Yes | Admin | Warn user |
| `/api/moderation/users/:userId/history` | GET | Yes | Admin | Get user moderation history |

### 9.4 AI Moderation

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/moderation/scan/text` | POST | Yes | Scan text content |
| `/api/moderation/scan/image` | POST | Yes | Scan image content |

### 9.5 Statistics

| Endpoint | Method | Auth Required | Role Required | Description |
|----------|--------|---------------|---------------|-------------|
| `/api/moderation/statistics` | GET | Yes | Admin | Get moderation statistics |

**Query Parameters** (Statistics):
- `from`: ISO 8601 date
- `to`: ISO 8601 date

---

## 10. Analytics Service

**Service**: `analytics-service`
**Proxied Through**: API Gateway `/api/analytics`

### 10.1 User Analytics

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/analytics/dashboard` | GET | Yes | Get user analytics dashboard |
| `/api/analytics/profile/views` | GET | Yes | Get profile view statistics |
| `/api/analytics/matches/stats` | GET | Yes | Get match statistics |
| `/api/analytics/messages/stats` | GET | Yes | Get messaging statistics |
| `/api/analytics/likes/stats` | GET | Yes | Get like statistics |

**Common Query Parameters**:
- `from`: ISO 8601 date (default: 30 days ago)
- `to`: ISO 8601 date (default: now)

### 10.2 Event Tracking

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/analytics/events` | POST | Yes | Track analytics event |
| `/api/analytics/pageviews` | POST | Yes | Track page view |
| `/api/analytics/actions` | POST | Yes | Track user action |

**Event Types**:
- profile_view
- swipe_left
- swipe_right
- super_like
- match_created
- message_sent
- subscription_purchased

### 10.3 Engagement Metrics

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/analytics/engagement` | GET | Yes | Get engagement metrics |
| `/api/analytics/engagement/response-rate` | GET | Yes | Get message response rate |
| `/api/analytics/activity/timeline` | GET | Yes | Get activity timeline |

**Query Parameters** (Activity Timeline):
- `from`: ISO 8601 date
- `to`: ISO 8601 date
- `granularity`: hour | day | week | month

### 10.4 Admin Analytics

| Endpoint | Method | Auth Required | Role Required | Description |
|----------|--------|---------------|---------------|-------------|
| `/api/analytics/platform/stats` | GET | Yes | Admin | Get platform statistics |
| `/api/analytics/platform/demographics` | GET | Yes | Admin | Get user demographics |
| `/api/analytics/platform/revenue` | GET | Yes | Admin | Get revenue analytics |
| `/api/analytics/platform/retention` | GET | Yes | Admin | Get retention metrics |

### 10.5 Conversion & Testing

| Endpoint | Method | Auth Required | Role Required | Description |
|----------|--------|---------------|---------------|-------------|
| `/api/analytics/funnel` | GET | Yes | Admin | Get conversion funnel |
| `/api/analytics/ab-tests/:testId` | GET | Yes | Admin | Get A/B test results |

### 10.6 Export

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/analytics/export` | POST | Yes | Export analytics data |

---

## 11. Additional Services

### 11.1 Admin Service

**Service**: `admin-service`
**Expected Endpoints** (not proxied through main gateway):
- User management (CRUD)
- Role management
- System configuration
- Platform metrics dashboard

### 11.2 AI Services

**Service**: `ai-services`
**Expected Endpoints**:
- AI-powered matching algorithm
- Photo analysis and verification
- Fraud detection
- NLP for bio analysis
- Recommendation engine

### 11.3 Automation Service

**Service**: `automation-service`
**Expected Endpoints**:
- Workflow automation
- Scheduled tasks
- Batch operations
- Data cleanup jobs

### 11.4 Advertising Service

**Service**: `advertising-service`
**Expected Endpoints**:
- Ad campaign management
- Ad placement
- Analytics and tracking
- Revenue reporting

### 11.5 Workflow Engine

**Service**: `workflow-engine`
**Expected Endpoints**:
- Workflow definition
- Task execution
- Status tracking
- Event-driven triggers

### 11.6 Realtime Service

**Service**: `realtime-service`
**Technology**: WebSocket
**Features**:
- Real-time messaging
- Online status updates
- Match notifications
- Typing indicators

**WebSocket Endpoint**: `ws://localhost:3000/ws` (via API Gateway)

---

## 12. API Design Patterns

### 12.1 Authentication Pattern
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Token Type**: JWT (JSON Web Token)
- **Expiration**: 24 hours (access), 30 days (refresh)
- **Refresh Flow**: POST `/api/auth/refresh-token`

### 12.2 Response Format (Standard)
```json
{
  "success": true|false,
  "data": {}, // Response payload
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  },
  "meta": {
    "page": "number",
    "limit": "number",
    "total": "number"
  }
}
```

### 12.3 Pagination Pattern
- **Query Parameters**: `limit` (default: 20, max: 100), `offset` (default: 0)
- **Alternative**: Cursor-based for large datasets

### 12.4 Error Codes
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Internal Server Error

### 12.5 Rate Limiting
- **Standard**: 100 requests/minute
- **Strict** (Auth): 5 requests/minute
- **Premium Users**: 200 requests/minute
- **Header Response**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### 12.6 API Versioning
- **Current Version**: v1
- **URL Pattern**: `/api/v1/{resource}` or `/api/{resource}` (defaults to v1)
- **Header Alternative**: `X-API-Version: 1`

---

## 13. Security Features

### 13.1 Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Subscription-based feature gating
- Service-to-service authentication

### 13.2 Security Headers
- CORS configured for specific origins
- CSRF protection enabled
- Helmet.js security headers
- Content Security Policy

### 13.3 Input Validation
- Request body validation (Joi/class-validator)
- SQL injection prevention (parameterized queries)
- XSS protection
- File upload validation

### 13.4 Data Protection
- Passwords hashed with bcrypt
- Sensitive data encrypted at rest
- PII redacted in logs
- GDPR compliance measures

---

## 14. Monitoring & Observability

### 14.1 Logging
- Structured logging (Winston/Pino)
- Request/response logging
- Error tracking
- Performance metrics

### 14.2 Health Checks
- Kubernetes liveness/readiness probes
- Service health aggregation
- Database connection monitoring
- Redis connection monitoring

### 14.3 Metrics
- Circuit breaker metrics
- Request latency tracking
- Error rate monitoring
- Service uptime

---

## 15. Summary Statistics

**Total Endpoints Audited**: 150+

**By Service**:
- API Gateway: 5 (health/system)
- Auth Service: 10
- User Service: 18
- Matching Service: 17
- Messaging Service: 13
- Media Service: 14
- Payment Service: 21
- Notification Service: 14
- Moderation Service: 15
- Analytics Service: 19
- Additional Services: 10+ (estimated)

**Authentication Distribution**:
- Public Endpoints: 8 (register, login, webhooks, health checks)
- User-Authenticated: 130+
- Admin-Only: 12+

**HTTP Methods**:
- GET: 70+
- POST: 45+
- PUT: 25+
- DELETE: 10+

---

## 16. Recommendations

### 16.1 API Documentation
- ✅ OpenAPI/Swagger specification exists (`openapi.yaml`)
- ⚠️ Consider generating interactive API docs with Swagger UI
- ⚠️ Add request/response examples for all endpoints
- ⚠️ Document webhook payloads

### 16.2 Versioning Strategy
- ✅ Current implementation uses implicit v1
- ⚠️ Plan for v2 migration path
- ⚠️ Document deprecation policy

### 16.3 Performance Optimization
- ✅ Rate limiting implemented
- ✅ Circuit breaker pattern in place
- ⚠️ Consider implementing response caching for read-heavy endpoints
- ⚠️ Add GraphQL gateway for complex nested queries

### 16.4 Security Enhancements
- ✅ JWT authentication
- ✅ CSRF protection
- ⚠️ Implement API key authentication for mobile apps
- ⚠️ Add request signing for sensitive operations

### 16.5 Developer Experience
- ⚠️ Create SDK for web/mobile clients
- ⚠️ Provide Postman collection (exists but needs update)
- ⚠️ Add code examples in multiple languages
- ⚠️ Create developer portal

---

**End of API Surface Audit**
