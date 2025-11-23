# ConnectSphere User Service API Documentation

Comprehensive API documentation for the ConnectSphere User Service, including authentication, profile management, subscriptions, virtual currency, profile boosting, privacy controls, and safety features.

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [API Documentation UI](#api-documentation-ui)
- [Rate Limiting](#rate-limiting)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
  - [Subscriptions](#subscriptions-api)
  - [Coins](#coins-api)
  - [Boosts](#boosts-api)
  - [Privacy](#privacy-api)
  - [Blocks](#blocks-api)
  - [Reports](#reports-api)
- [Subscription Tiers](#subscription-tiers)
- [Coin Economy](#coin-economy)
- [Privacy Presets](#privacy-presets)
- [Report Types](#report-types)

---

## Overview

The User Service provides RESTful APIs for managing user accounts, profiles, subscriptions, virtual currency, profile visibility boosting, privacy settings, and safety features including blocking and reporting.

**Key Features:**
- 🔐 **Authentication** - JWT-based auth with access & refresh tokens
- 👤 **Profile Management** - User profiles with photos, interests, and location
- 💎 **Subscription Tiers** - Free, Basic, Mid, Ultra tiers with feature gating
- 🪙 **Virtual Currency** - Coin system for in-app purchases
- 🚀 **Profile Boosting** - Temporary visibility boosts
- 🔒 **Privacy Controls** - Granular privacy settings and incognito mode
- 🚫 **User Blocking** - Block unwanted users
- 🚨 **Reporting System** - Report inappropriate users and content

---

## Base URL

```
Development:  http://localhost:3001
Staging:      https://api-staging.connectsphere.com
Production:   https://api.connectsphere.com
```

All API endpoints are prefixed with `/api`:
```
http://localhost:3001/api/subscriptions/current
```

---

## Authentication

Most endpoints require authentication using JWT (JSON Web Tokens).

### Get Access Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Use Access Token

Include the access token in the Authorization header:

```http
Authorization: Bearer <accessToken>
```

**Example:**
```bash
curl -H "Authorization: Bearer eyJhbGciOi..." \
  http://localhost:3001/api/subscriptions/current
```

### Token Expiry

- **Access Token**: Expires in 1 hour
- **Refresh Token**: Expires in 7 days

Use the refresh token to get a new access token:

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

---

## API Documentation UI

Interactive API documentation is available via Swagger UI:

```
http://localhost:3001/api-docs
```

**Features:**
- 📖 Complete endpoint documentation
- 🧪 Try out APIs directly from the browser
- 📋 Request/response schemas
- 🔑 Built-in authentication support

**To use:**
1. Navigate to http://localhost:3001/api-docs
2. Click "Authorize" and enter your JWT token
3. Explore and test endpoints interactively

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General Limit**: 100 requests per 15 minutes per IP
- **Auth Endpoints**: 5 requests per 15 minutes per IP
- **Headers**: Rate limit info included in response headers

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

When rate limit is exceeded:
```json
{
  "success": false,
  "message": "Too many requests, please try again later."
}
```

---

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Success with Message

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 150,
    "limit": 20,
    "offset": 0
  }
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required or failed |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., duplicate) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## API Endpoints

### Subscriptions API

Manage subscription tiers and feature access.

#### Get Current Subscription
```http
GET /api/subscriptions/current
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "tier": "free",
    "status": "active",
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": null,
    "cancel_at_period_end": false
  }
}
```

#### Update Subscription Tier
```http
PUT /api/subscriptions/tier
Authorization: Bearer <token>
Content-Type: application/json

{
  "tier": "mid"
}
```

**Tier Options**: `free`, `basic`, `mid`, `ultra`

#### Get Subscription Features
```http
GET /api/subscriptions/features
Authorization: Bearer <token>
```

#### Check Feature Access
```http
GET /api/subscriptions/features/incognito_mode/access
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasAccess": true,
    "feature": {
      "key": "incognito_mode",
      "value": "true",
      "value_type": "boolean"
    }
  }
}
```

#### Cancel Subscription
```http
POST /api/subscriptions/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "immediately": false
}
```

#### Reactivate Subscription
```http
POST /api/subscriptions/reactivate
Authorization: Bearer <token>
```

---

### Coins API

Virtual currency system for in-app purchases.

#### Get Coin Balance
```http
GET /api/coins/balance
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "balance": 500
  }
}
```

#### Get Coin Products
```http
GET /api/coins/products
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "sku": "COIN_PACK_SMALL",
      "name": "Small Coin Pack",
      "amount": 100,
      "bonus_coins": 0,
      "price": 4.99,
      "currency": "USD"
    },
    {
      "sku": "COIN_PACK_MEDIUM",
      "name": "Medium Coin Pack",
      "amount": 500,
      "bonus_coins": 50,
      "price": 19.99,
      "currency": "USD"
    }
  ]
}
```

#### Purchase Coins
```http
POST /api/coins/purchase
Authorization: Bearer <token>
Content-Type: application/json

{
  "productSku": "COIN_PACK_MEDIUM",
  "stripePaymentId": "pi_1234567890"
}
```

#### Spend Coins
```http
POST /api/coins/spend
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 50,
  "reason": "Profile boost",
  "referenceId": "boost-123",
  "referenceType": "boost"
}
```

#### Get Transaction History
```http
GET /api/coins/transactions?limit=20&offset=0&type=purchase
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (1-100, default: 20)
- `offset` (default: 0)
- `type` (optional): `purchase`, `spent`, `reward`, `refund`, `admin_adjustment`

#### Get Transaction Summary
```http
GET /api/coins/transactions/summary
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPurchases": 1000,
    "totalSpent": 300,
    "totalRewards": 50,
    "currentBalance": 750
  }
}
```

#### Claim Daily Reward
```http
POST /api/coins/daily-reward
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reward": 10,
    "balance": 510,
    "nextClaimTime": "2025-01-02T00:00:00Z"
  }
}
```

---

### Boosts API

Profile visibility boosting system.

#### Get Boost Products
```http
GET /api/boosts/products
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "sku": "BOOST_30MIN",
      "name": "30 Minute Boost",
      "duration_minutes": 30,
      "price": 4.99,
      "coin_cost": 50,
      "is_popular": false
    },
    {
      "sku": "BOOST_1HR",
      "name": "1 Hour Boost",
      "duration_minutes": 60,
      "price": 7.99,
      "coin_cost": 80,
      "is_popular": true
    }
  ]
}
```

#### Purchase Boost
```http
POST /api/boosts/purchase
Authorization: Bearer <token>
Content-Type: application/json

{
  "productSku": "BOOST_1HR"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "product_sku": "BOOST_1HR",
    "start_time": "2025-01-01T12:00:00Z",
    "end_time": "2025-01-01T13:00:00Z",
    "status": "active",
    "views_received": 0,
    "likes_received": 0,
    "coin_cost": 80
  }
}
```

#### Get Active Boost
```http
GET /api/boosts/active
Authorization: Bearer <token>
```

#### Get Boost History
```http
GET /api/boosts/history?limit=20
Authorization: Bearer <token>
```

#### Get Boost Statistics
```http
GET /api/boosts/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBoosts": 15,
    "totalViews": 2250,
    "totalLikes": 375,
    "averageViewsPerBoost": 150,
    "averageLikesPerBoost": 25
  }
}
```

#### Cancel Active Boost
```http
POST /api/boosts/cancel
Authorization: Bearer <token>
```

---

### Privacy API

Privacy settings and profile visibility controls.

#### Get Privacy Settings
```http
GET /api/privacy/settings
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "profile_visibility": "everyone",
    "show_distance": true,
    "show_age": true,
    "show_online_status": true,
    "incognito_mode": false,
    "show_activity_status": true,
    "read_receipts": true,
    "allow_search_by_phone": false,
    "allow_search_by_email": false
  }
}
```

#### Update Privacy Settings
```http
PUT /api/privacy/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "profileVisibility": "matches_only",
  "showDistance": false,
  "incognitoMode": true
}
```

**Profile Visibility Options:**
- `everyone` - Public profile
- `matches_only` - Only matches can see profile
- `private` - Hidden profile

#### Toggle Incognito Mode
```http
POST /api/privacy/incognito/toggle
Authorization: Bearer <token>
Content-Type: application/json

{
  "enabled": true
}
```

#### Apply Privacy Preset
```http
POST /api/privacy/preset
Authorization: Bearer <token>
Content-Type: application/json

{
  "preset": "private"
}
```

**Preset Options:**
- `public` - Maximum visibility
- `private` - Minimal visibility, matches only
- `discreet` - Balanced privacy settings

---

### Blocks API

User blocking functionality.

#### Block User
```http
POST /api/blocks/{blockedId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Not interested"
}
```

#### Unblock User
```http
DELETE /api/blocks/{blockedId}
Authorization: Bearer <token>
```

#### Get Blocked Users List
```http
GET /api/blocks/list
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "blocked_user_id": "uuid",
      "reason": "Not interested",
      "created_at": "2025-01-01T12:00:00Z"
    }
  ]
}
```

#### Check Block Status
```http
GET /api/blocks/check/{targetUserId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isBlocked": true,
    "blockedByMe": true,
    "blockedByThem": false
  }
}
```

---

### Reports API

User reporting and content moderation.

#### Create Report
```http
POST /api/reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "reportedId": "uuid",
  "reportType": "inappropriate_messages",
  "severity": "medium",
  "description": "User sent threatening messages"
}
```

**Report Types:**
- `inappropriate_photos`
- `inappropriate_messages`
- `fake_profile`
- `spam`
- `harassment`
- `underage`
- `scam`
- `violence`
- `hate_speech`
- `other`

**Severity Levels:**
- `low`
- `medium`
- `high`
- `critical`

#### Get Report Categories
```http
GET /api/reports/categories
Authorization: Bearer <token>
```

#### Get My Reports
```http
GET /api/reports/my-reports?status=pending&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `status`: `pending`, `under_review`, `resolved`, `dismissed`
- `limit`: 1-100 (default: 20)
- `offset`: default 0

#### Resolve Report (Admin)
```http
PUT /api/reports/{reportId}/resolve
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "resolved",
  "actionTaken": "User warned and content removed"
}
```

#### Get Moderation Queue (Admin)
```http
GET /api/reports/moderation-queue?severity=high&limit=50
Authorization: Bearer <token>
```

#### Get Report Statistics (Admin)
```http
GET /api/reports/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalReports": 500,
    "pendingReports": 25,
    "resolvedReports": 450,
    "dismissedReports": 25,
    "reportsBySeverity": {
      "low": 200,
      "medium": 200,
      "high": 75,
      "critical": 25
    },
    "reportsByType": { ... }
  }
}
```

---

## Subscription Tiers

| Feature | Free | Basic ($9.99) | Mid ($19.99) | Ultra ($29.99) |
|---------|------|---------------|--------------|----------------|
| Daily Swipes | 10 | 50 | 100 | Unlimited |
| Super Likes/Day | 1 | 3 | 5 | Unlimited |
| Rewind Limit | 0 | 3 | 10 | Unlimited |
| See Who Likes You | ❌ | ✅ | ✅ | ✅ |
| Incognito Mode | ❌ | ❌ | ✅ | ✅ |
| Passport (Location) | ❌ | ❌ | ✅ | ✅ |
| Advanced Filters | ❌ | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ❌ | ✅ |

---

## Coin Economy

### Coin Packages

| Package | Amount | Bonus | Price | SKU |
|---------|--------|-------|-------|-----|
| Small | 100 | 0 | $4.99 | COIN_PACK_SMALL |
| Medium | 500 | 50 | $19.99 | COIN_PACK_MEDIUM |
| Large | 1200 | 300 | $39.99 | COIN_PACK_LARGE |
| XL | 2500 | 625 | $74.99 | COIN_PACK_XL |

### Coin Uses

| Feature | Cost (Coins) |
|---------|--------------|
| 30 Minute Boost | 50 |
| 1 Hour Boost | 80 |
| 3 Hour Boost | 150 |
| Super Like | 5 |
| Rewind | 10 |

### Daily Rewards

- Claim **10 free coins** every 24 hours
- Streak bonuses coming soon

---

## Privacy Presets

### Public Preset
- Profile Visibility: Everyone
- Show Distance: Yes
- Show Age: Yes
- Show Online Status: Yes
- Incognito Mode: No
- Read Receipts: Yes

### Private Preset
- Profile Visibility: Matches Only
- Show Distance: No
- Show Age: No
- Show Online Status: No
- Incognito Mode: Yes (if available)
- Read Receipts: No

### Discreet Preset
- Profile Visibility: Everyone
- Show Distance: No
- Show Age: Yes
- Show Online Status: No
- Incognito Mode: No
- Read Receipts: No

---

## Report Types

| Type | Icon | Default Severity | Description |
|------|------|------------------|-------------|
| Inappropriate Photos | 📸 | Medium | User has inappropriate or offensive photos |
| Inappropriate Messages | 💬 | Medium | User sent inappropriate or offensive messages |
| Fake Profile | 🎭 | Medium | Profile appears to be fake or impersonating someone |
| Spam | 📧 | Low | User is sending spam messages |
| Harassment | ⚠️ | High | User is harassing, bullying, or threatening others |
| Underage | 🔞 | Critical | User appears to be underage |
| Scam | 💰 | High | User is attempting to scam others |
| Violence | ⚡ | Critical | Content contains violence or threats |
| Hate Speech | 🚫 | Critical | Content contains hate speech or discrimination |
| Other | ❓ | Low | Other reason not listed above |

---

## Support & Resources

- **Swagger UI**: http://localhost:3001/api-docs
- **Health Check**: http://localhost:3001/health
- **Service Info**: http://localhost:3001/

For support or questions, contact engineering@connectsphere.com

---

**Last Updated**: 2025-01-18
**API Version**: 1.0.0
**Service**: ConnectSphere User Service
