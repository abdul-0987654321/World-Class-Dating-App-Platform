# Phase 1 API Reference

Complete API documentation for Phase 1 monetization and safety features.

## Authentication

All endpoints (except internal APIs) require JWT authentication via Bearer token:

```http
Authorization: Bearer <access_token>
```

Internal API endpoints require service authentication:

```http
X-Service-Key: <service_api_key>
```

## Base URLs

- **User Service**: `http://localhost:3001/api`
- **Payment Service**: `http://localhost:3002/api/payments`

---

## Subscription API

### Get Current Subscription

```http
GET /subscriptions/current
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "tier": "mid",
    "status": "active",
    "stripeSubscriptionId": "sub_123",
    "currentPeriodStart": "2024-01-01T00:00:00Z",
    "currentPeriodEnd": "2024-02-01T00:00:00Z",
    "cancelAtPeriodEnd": false,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Get Subscription Features

```http
GET /subscriptions/features
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "key": "daily_swipes_limit",
      "value": -1
    },
    {
      "key": "see_who_liked_you",
      "value": true
    }
  ]
}
```

### Check Feature Access

```http
GET /subscriptions/features/:featureKey/access
```

**Parameters:**
- `featureKey` (path) - Feature to check (e.g., "incognito_mode")

**Response:**
```json
{
  "success": true,
  "data": {
    "hasAccess": true
  }
}
```

### Update Subscription Tier

```http
PUT /subscriptions/tier
```

**Request Body:**
```json
{
  "tier": "ultra"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tier": "ultra",
    "status": "active"
  }
}
```

### Cancel Subscription

```http
POST /subscriptions/cancel
```

**Request Body:**
```json
{
  "immediately": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tier": "mid",
    "cancelAtPeriodEnd": true,
    "currentPeriodEnd": "2024-02-01T00:00:00Z"
  }
}
```

### Reactivate Subscription

```http
POST /subscriptions/reactivate
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tier": "mid",
    "cancelAtPeriodEnd": false
  }
}
```

---

## Coin API

### Get Coin Balance

```http
GET /coins/balance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 500,
    "userId": "uuid"
  }
}
```

### Get Transaction History

```http
GET /coins/transactions?limit=20&offset=0&type=purchase
```

**Query Parameters:**
- `limit` (optional) - Number of transactions (1-100, default: 20)
- `offset` (optional) - Pagination offset (default: 0)
- `type` (optional) - Filter by type: purchase, reward, spent, refund, admin_adjustment
- `startDate` (optional) - ISO date string
- `endDate` (optional) - ISO date string

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "userId": "uuid",
        "amount": 100,
        "type": "purchase",
        "balance": 600,
        "reason": "Purchased COIN_PACK_SMALL",
        "referenceId": "pi_123",
        "referenceType": "stripe_payment",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 42
  }
}
```

### Get Transaction Summary

```http
GET /coins/transactions/summary
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

### Get Coin Products

```http
GET /coins/products
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "sku": "COIN_PACK_SMALL",
      "name": "Small Pack",
      "amount": 100,
      "price": 4.99,
      "bonus": 0,
      "popular": false
    },
    {
      "sku": "COIN_PACK_LARGE",
      "name": "Large Pack",
      "amount": 1200,
      "price": 39.99,
      "bonus": 300,
      "popular": true
    }
  ]
}
```

### Purchase Coins

```http
POST /coins/purchase
```

**Request Body:**
```json
{
  "productSku": "COIN_PACK_MEDIUM",
  "stripePaymentId": "pi_123abc"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 1000,
    "userId": "uuid"
  }
}
```

### Spend Coins

```http
POST /coins/spend
```

**Request Body:**
```json
{
  "amount": 50,
  "reason": "Profile boost purchase",
  "referenceId": "boost_uuid",
  "referenceType": "boost"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 450,
    "userId": "uuid"
  }
}
```

### Claim Daily Reward

```http
POST /coins/daily-reward
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reward": 10,
    "nextClaimTime": "2024-01-02T00:00:00Z",
    "balance": {
      "balance": 510,
      "userId": "uuid"
    }
  }
}
```

---

## Boost API

### Get Boost Products

```http
GET /boosts/products
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "sku": "BOOST_30MIN",
      "name": "30 Minute Boost",
      "durationMinutes": 30,
      "price": 4.99,
      "coinCost": 50,
      "popular": false
    },
    {
      "sku": "BOOST_1HR",
      "name": "1 Hour Boost",
      "durationMinutes": 60,
      "price": 7.99,
      "coinCost": 80,
      "popular": true
    }
  ]
}
```

### Purchase Boost with Coins

```http
POST /boosts/purchase
```

**Request Body:**
```json
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
    "userId": "uuid",
    "productSku": "BOOST_1HR",
    "startTime": "2024-01-01T12:00:00Z",
    "endTime": "2024-01-01T13:00:00Z",
    "purchaseMethod": "coins",
    "status": "active"
  }
}
```

### Get Active Boost

```http
GET /boosts/active
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "productSku": "BOOST_1HR",
    "startTime": "2024-01-01T12:00:00Z",
    "endTime": "2024-01-01T13:00:00Z",
    "remainingMinutes": 45,
    "status": "active"
  }
}
```

### Get Boost History

```http
GET /boosts/history?limit=20
```

**Query Parameters:**
- `limit` (optional) - Number of boosts (1-100, default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "productSku": "BOOST_1HR",
      "startTime": "2024-01-01T12:00:00Z",
      "endTime": "2024-01-01T13:00:00Z",
      "purchaseMethod": "coins",
      "status": "completed",
      "views": 45,
      "likes": 12
    }
  ]
}
```

### Get Boost Statistics

```http
GET /boosts/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBoosts": 5,
    "totalViews": 250,
    "totalLikes": 65,
    "averageViewsPerBoost": 50,
    "averageLikesPerBoost": 13
  }
}
```

### Cancel Active Boost

```http
POST /boosts/cancel
```

**Response:**
```json
{
  "success": true,
  "message": "Boost canceled successfully"
}
```

---

## Block API

### Block User

```http
POST /blocks/:blockedId
```

**Parameters:**
- `blockedId` (path) - UUID of user to block

**Request Body:**
```json
{
  "reason": "Inappropriate behavior"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User blocked successfully"
}
```

### Unblock User

```http
DELETE /blocks/:blockedId
```

**Parameters:**
- `blockedId` (path) - UUID of user to unblock

**Response:**
```json
{
  "success": true,
  "message": "User unblocked successfully"
}
```

### Get Blocked Users

```http
GET /blocks/list
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "blockerId": "uuid",
      "blockedId": "uuid",
      "reason": "Inappropriate behavior",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Check if Blocked

```http
GET /blocks/check/:targetUserId
```

**Parameters:**
- `targetUserId` (path) - UUID of user to check

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

## Report API

### Create Report

```http
POST /reports
```

**Request Body:**
```json
{
  "reportedId": "uuid",
  "reportType": "harassment",
  "description": "User sent threatening messages",
  "evidenceUrls": [
    "https://example.com/screenshot1.jpg"
  ],
  "severity": "high"
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
- `low`, `medium`, `high`, `critical`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "reporterId": "uuid",
    "reportedId": "uuid",
    "reportType": "harassment",
    "status": "pending",
    "severity": "high",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Get Report Categories

```http
GET /reports/categories
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "harassment",
      "label": "Harassment",
      "description": "User is harassing or bullying others"
    }
  ]
}
```

### Get My Reports

```http
GET /reports/my-reports?limit=20&offset=0
```

**Query Parameters:**
- `limit` (optional) - Number of reports (1-100, default: 20)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "reportedId": "uuid",
      "reportType": "harassment",
      "status": "resolved",
      "createdAt": "2024-01-01T00:00:00Z",
      "resolvedAt": "2024-01-02T00:00:00Z"
    }
  ]
}
```

### Resolve Report (Admin Only)

```http
PUT /reports/:reportId/resolve
```

**Parameters:**
- `reportId` (path) - UUID of report

**Request Body:**
```json
{
  "resolution": "User has been warned and content removed",
  "actionTaken": "content_removed"
}
```

**Action Types:**
- `none`
- `warning_sent`
- `content_removed`
- `account_suspended`
- `account_banned`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "resolved",
    "resolution": "User has been warned and content removed",
    "actionTaken": "content_removed",
    "resolvedAt": "2024-01-02T00:00:00Z"
  }
}
```

### Get Moderation Queue (Admin Only)

```http
GET /reports/moderation-queue?limit=50
```

**Query Parameters:**
- `limit` (optional) - Number of reports (1-100, default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "reporterId": "uuid",
      "reportedId": "uuid",
      "reportType": "harassment",
      "severity": "high",
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Report Stats (Admin Only)

```http
GET /reports/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 100,
    "pending": 15,
    "inReview": 5,
    "resolved": 80,
    "byType": {
      "harassment": 25,
      "spam": 30,
      "fake_profile": 20
    },
    "bySeverity": {
      "low": 40,
      "medium": 35,
      "high": 20,
      "critical": 5
    }
  }
}
```

---

## Privacy API

### Get Privacy Settings

```http
GET /privacy/settings
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "incognitoMode": false,
    "incognitoUntil": null,
    "showDistance": true,
    "showLastActive": true,
    "showOnlineStatus": true,
    "showAge": true,
    "profileVisibility": "everyone",
    "hideFromContacts": false,
    "hiddenContactNumbers": [],
    "readReceiptsEnabled": true,
    "typingIndicatorsEnabled": true,
    "preciseLocation": false,
    "locationRadiusKm": 50
  }
}
```

### Update Privacy Settings

```http
PUT /privacy/settings
```

**Request Body:**
```json
{
  "showDistance": false,
  "profileVisibility": "matches_only",
  "readReceiptsEnabled": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "showDistance": false,
    "profileVisibility": "matches_only",
    "readReceiptsEnabled": false
  }
}
```

### Toggle Incognito Mode

```http
POST /privacy/incognito/toggle
```

**Request Body:**
```json
{
  "enabled": true,
  "durationHours": 24
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "incognitoMode": true,
    "incognitoUntil": "2024-01-02T00:00:00Z"
  }
}
```

### Apply Privacy Preset

```http
POST /privacy/preset
```

**Request Body:**
```json
{
  "preset": "private"
}
```

**Presets:**
- `public` - Maximum visibility
- `balanced` - Moderate privacy
- `private` - Maximum privacy

**Response:**
```json
{
  "success": true,
  "data": {
    "preset": "private",
    "settings": {
      "showDistance": false,
      "showLastActive": false,
      "profileVisibility": "matches_only"
    }
  }
}
```

---

## Usage Limits API

### Get User Limits

```http
GET /usage-limits/limits
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "resourceType": "swipes",
      "limitValue": -1,
      "currentUsage": 0,
      "resetPeriod": "daily",
      "lastReset": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Check Resource Limit

```http
GET /usage-limits/check/:resourceType
```

**Parameters:**
- `resourceType` (path) - swipes, likes, super_likes, rewinds, boosts

**Response:**
```json
{
  "success": true,
  "data": {
    "hasAccess": true,
    "limitValue": 100,
    "currentUsage": 45,
    "remaining": 55,
    "resetTime": "2024-01-02T00:00:00Z"
  }
}
```

### Get Resource Usage

```http
GET /usage-limits/usage/:resourceType
```

**Parameters:**
- `resourceType` (path) - swipes, likes, super_likes, rewinds, boosts

**Response:**
```json
{
  "success": true,
  "data": {
    "resourceType": "swipes",
    "currentUsage": 45,
    "limitValue": 100,
    "resetTime": "2024-01-02T00:00:00Z"
  }
}
```

---

## Payment API

### Create Payment Intent

```http
POST /create-intent
```

**Base URL:** `http://localhost:3002/api/payments`

**Request Body:**
```json
{
  "amount": 19.99,
  "currency": "usd",
  "customerId": "cus_123",
  "metadata": {
    "userId": "uuid",
    "type": "coin_purchase",
    "productSku": "COIN_PACK_MEDIUM"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_123_secret_456",
    "paymentIntentId": "pi_123"
  }
}
```

### Purchase Subscription

```http
POST /subscription/create
```

**Request Body:**
```json
{
  "userId": "uuid",
  "tier": "mid",
  "priceId": "price_mid_monthly",
  "email": "user@example.com",
  "paymentMethodId": "pm_123",
  "trialDays": 7
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {},
    "customer": {}
  }
}
```

### Cancel Subscription

```http
POST /subscription/cancel
```

**Request Body:**
```json
{
  "subscriptionId": "sub_123",
  "immediately": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sub_123",
    "status": "active",
    "cancel_at_period_end": true
  }
}
```

### Get Payment Methods

```http
GET /methods/:customerId
```

**Parameters:**
- `customerId` (path) - Stripe customer ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pm_123",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "expMonth": 12,
        "expYear": 2025
      }
    }
  ]
}
```

### Add Payment Method

```http
POST /methods/add
```

**Request Body:**
```json
{
  "customerId": "cus_123",
  "paymentMethodId": "pm_456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "pm_456",
    "type": "card"
  }
}
```

### Process Refund

```http
POST /refund
```

**Request Body:**
```json
{
  "paymentIntentId": "pi_123",
  "amount": 19.99,
  "reason": "requested_by_customer"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "re_123",
    "amount": 1999,
    "status": "succeeded"
  }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

All endpoints are rate limited:
- **General**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **Payment**: 10 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```
