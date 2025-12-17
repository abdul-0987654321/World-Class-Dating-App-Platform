# Flamoral API Documentation - Master Guide

**Version:** 1.0.0
**Last Updated:** 2025-11-21
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication](#authentication)
4. [Base URLs](#base-URLs)
5. [API Services](#api-services)
6. [Rate Limiting](#rate-limiting)
7. [Error Handling](#error-handling)
8. [Webhooks](#webhooks)
9. [Postman Collection](#postman-collection)
10. [Interactive API Documentation](#interactive-api-documentation)

---

## Overview

Connect Sphere is a microservices-based dating platform with the following services:

| Service | Port | Purpose |
|---------|------|---------|
| **User Service** | 3001 | Authentication, profiles, subscriptions |
| **Matching Service** | 3002 | Swipes, matches, discovery algorithm |
| **Messaging Service** | 3003 | Real-time chat, message history |
| **Media Service** | 3004 | Photo uploads, Azure Blob storage |
| **Payment Service** | 3005 | Stripe integration, subscriptions, coins |
| **API Gateway** | 3006 | Request routing, rate limiting |
| **Analytics Service** | 3007 | Event tracking, advertising pixels |
| **Moderation Service** | 3008 | Content moderation, NSFW detection |
| **Notification Service** | 3009 | Push notifications, emails |

---

## Architecture

```
┌─────────────┐
│   Frontend  │
│   (React)   │
└─────┬───────┘
      │
      ▼
┌─────────────────┐
│  API Gateway    │  ← Rate Limiting, Auth Check
│   Port: 3006    │
└────────┬────────┘
         │
    ┌────┴──────┬──────────┬──────────┬─────────┐
    │           │          │          │         │
    ▼           ▼          ▼          ▼         ▼
┌────────┐ ┌──────────┐ ┌──────┐ ┌──────┐ ┌───────┐
│  User  │ │ Matching │ │ Media│ │ Pay  │ │ Mod   │
│Service │ │ Service  │ │ Svc  │ │ Svc  │ │ Svc   │
└────────┘ └──────────┘ └──────┘ └──────┘ └───────┘
```

---

## Authentication

### JWT Token-Based Authentication

All protected endpoints require a JWT access token in the `Authorization` header.

### 1. Register a New User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1995-05-15",
  "gender": "male"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "first_name": "John",
      "is_verified": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR..."
  }
}
```

### 2. Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR..."
  }
}
```

### 3. Using the Access Token

Include in all authenticated requests:

```http
GET /api/profile/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

### 4. Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR..."
}
```

---

## Base URLs

### Development
```
http://localhost:3006/api  (API Gateway)
```

### Staging
```
https://api-staging.flamoral.com/api
```

### Production
```
https://api.flamoral.com/api
```

---

## API Services

### 1. User Service API

**Base Path:** `/api/users`
**Swagger Docs:** `http://localhost:3001/api-docs`

#### Key Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| GET | `/api/profile/me` | Get current user profile | Yes |
| PUT | `/api/profile/me` | Update profile | Yes |
| POST | `/api/profile/photos/upload` | Upload profile photo | Yes |
| GET | `/api/subscriptions/current` | Get subscription tier | Yes |
| GET | `/api/coins/balance` | Get coin balance | Yes |
| POST | `/api/boosts/activate` | Activate profile boost | Yes |
| GET | `/api/privacy/settings` | Get privacy settings | Yes |
| POST | `/api/blocks` | Block a user | Yes |
| POST | `/api/reports` | Report a user | Yes |

**📖 Detailed Docs:** See `backend/services/user-service/API_DOCUMENTATION.md`

---

### 2. Matching Service API

**Base Path:** `/api/matching`

#### Key Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/matching/discovery` | Get discovery feed | Yes |
| POST | `/api/matching/swipe` | Swipe left/right | Yes |
| GET | `/api/matching/matches` | Get match list | Yes |
| DELETE | `/api/matching/matches/:id` | Unmatch user | Yes |
| GET | `/api/matching/likes` | Who liked you | Yes |
| POST | `/api/matching/super-like` | Super like user | Yes |
| POST | `/api/matching/rewind` | Undo last swipe | Yes |

**Discovery Algorithm:**
- Location-based filtering
- Age and gender preferences
- Interest matching
- Boost prioritization
- Subscription tier benefits

---

### 3. Messaging Service API

**Base Path:** `/api/messages`

#### Key Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/messages/conversations` | List conversations | Yes |
| GET | `/api/messages/:matchId` | Get messages | Yes |
| POST | `/api/messages/:matchId` | Send message | Yes |
| PUT | `/api/messages/:id/read` | Mark as read | Yes |
| DELETE | `/api/messages/:id` | Delete message | Yes |

#### WebSocket Events

**Connect:**
```javascript
const socket = io('http://localhost:3003', {
  auth: { token: accessToken }
});
```

**Events:**
- `message:new` - New message received
- `message:read` - Message read by recipient
- `typing:start` - User is typing
- `typing:stop` - User stopped typing
- `user:online` - User came online
- `user:offline` - User went offline

---

### 4. Media Service API

**Base Path:** `/api/media`

#### Key Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/media/upload/photo` | Upload photo | Yes |
| POST | `/api/media/upload/video` | Upload video | Yes |
| DELETE | `/api/media/:id` | Delete media | Yes |
| GET | `/api/media/:id` | Get media URL | Yes |
| POST | `/api/media/photos/reorder` | Reorder photos | Yes |

**Upload Limits:**
- Max file size: 10MB (photos), 50MB (videos)
- Allowed formats: JPG, PNG, WEBP, MP4, MOV
- Max photos per profile: 6
- NSFW detection: Automatic via Azure CV

---

### 5. Payment Service API

**Base Path:** `/api/payments`

#### Key Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/payments/subscribe` | Create subscription | Yes |
| POST | `/api/payments/cancel-subscription` | Cancel subscription | Yes |
| GET | `/api/payments/subscription` | Get subscription details | Yes |
| POST | `/api/payments/buy-coins` | Purchase coins | Yes |
| POST | `/api/payments/buy-boost` | Purchase boost | Yes |
| GET | `/api/payments/history` | Payment history | Yes |
| POST | `/api/payments/webhook` | Stripe webhook | No |
| POST | `/api/payments/create-customer-portal-session` | Stripe portal | Yes |

**Subscription Tiers:**

| Tier | Price | Daily Likes | Features |
|------|-------|-------------|----------|
| Free | $0 | 10 | Basic features |
| Basic (Mid) | $19.99/mo | 100 | See who liked you, rewind |
| Premium (Ultra) | $39.99/mo | Unlimited | All features + boosts |

**Coin Packages:**
- 100 coins: $4.99
- 500 coins: $19.99
- 1200 coins: $39.99
- 2500 coins: $74.99

**Boost Packages:**
- 30 minutes: 40 coins or $3.99
- 1 hour: 70 coins or $6.99
- 3 hours: 150 coins or $14.99

---

### 6. Analytics Service API

**Base Path:** `/api/analytics`

#### Key Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/analytics/track` | Track custom event | Yes |
| POST | `/api/analytics/pageview` | Track page view | Yes |
| POST | `/api/analytics/conversion` | Track conversion | Yes |
| GET | `/api/analytics/events` | Get user events | Yes |

**Integrated Platforms:**
- Google Analytics 4
- Meta Pixel (Facebook)
- TikTok Pixel
- Snapchat Pixel
- Google Ads Conversion Tracking

**Example Event:**
```json
{
  "event": "profile_view",
  "properties": {
    "viewed_user_id": "uuid",
    "source": "discovery_feed"
  }
}
```

---

### 7. Moderation Service API

**Base Path:** `/api/moderation`

#### Key Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/moderation/scan-photo` | Scan photo for NSFW | Internal |
| GET | `/api/moderation/queue` | Get moderation queue | Admin |
| PUT | `/api/moderation/review/:id` | Review content | Admin |
| POST | `/api/moderation/suspend/:userId` | Suspend user | Admin |
| POST | `/api/moderation/ban/:userId` | Ban user | Admin |
| GET | `/api/moderation/stats` | Get mod stats | Admin |

**Auto-Moderation:**
- NSFW content detection (Azure Computer Vision)
- Automatic rejection of prohibited content
- Progressive suspension system (1, 3, 7, 14, 30 days)
- Violation tracking

---

### 8. Notification Service API

**Base Path:** `/api/notifications`

#### Key Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/notifications` | Get notifications | Yes |
| PUT | `/api/notifications/:id/read` | Mark as read | Yes |
| PUT | `/api/notifications/read-all` | Mark all as read | Yes |
| GET | `/api/notifications/settings` | Get notification preferences | Yes |
| PUT | `/api/notifications/settings` | Update preferences | Yes |

**Notification Types:**
- New match
- New message
- Like received
- Profile view
- Subscription expiring
- Boost activated

---

## Rate Limiting

Rate limits are enforced at the API Gateway level:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| General API | 100 requests | 15 minutes |
| File Upload | 10 requests | 1 hour |
| Webhooks | No limit | - |

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1635724800
```

**Rate Limit Exceeded (429):**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retryAfter": 900
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE",
  "details": {
    "field": "email",
    "message": "Email is already registered"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (duplicate) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service down |

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_TOKEN` | JWT token invalid or expired |
| `USER_NOT_FOUND` | User account doesn't exist |
| `INVALID_CREDENTIALS` | Wrong email/password |
| `EMAIL_ALREADY_EXISTS` | Email already registered |
| `SUBSCRIPTION_REQUIRED` | Feature requires subscription |
| `INSUFFICIENT_COINS` | Not enough coins |
| `UPLOAD_FAILED` | File upload error |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

---

## Webhooks

### Stripe Webhooks

**Endpoint:** `POST /api/payments/webhook`

**Events Handled:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Webhook Signature Verification:**
```typescript
const signature = request.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  request.body,
  signature,
  webhookSecret
);
```

**Security:** All webhooks require signature verification.

---

## Postman Collection

### Import Collection

1. Download: [Flamoral.postman_collection.json](#)
2. Open Postman
3. Click **Import** → Select file
4. Collection will be imported with all endpoints

### Environment Variables

Set these variables in Postman:

```json
{
  "base_url": "http://localhost:3006/api",
  "access_token": "{{accessToken}}",
  "user_id": "{{userId}}"
}
```

### Pre-request Script (Auto-Authentication)

```javascript
// Auto-login and set access token
pm.sendRequest({
  url: pm.environment.get("base_url") + "/auth/login",
  method: 'POST',
  header: { 'Content-Type': 'application/json' },
  body: {
    mode: 'raw',
    raw: JSON.stringify({
      email: "test@example.com",
      password: "TestPass123!"
    })
  }
}, (err, response) => {
  if (!err) {
    const token = response.json().data.accessToken;
    pm.environment.set("access_token", token);
  }
});
```

---

## Interactive API Documentation

### Swagger UI

Access interactive API documentation for each service:

| Service | Swagger URL |
|---------|-------------|
| User Service | http://localhost:3001/api-docs |
| Matching Service | http://localhost:3002/api-docs |
| Messaging Service | http://localhost:3003/api-docs |
| Media Service | http://localhost:3004/api-docs |
| Payment Service | http://localhost:3005/api-docs |
| API Gateway | http://localhost:3006/api-docs |

### Using Swagger UI

1. Open Swagger URL in browser
2. Click **"Authorize"** button
3. Enter JWT token: `Bearer <your-access-token>`
4. Try out endpoints directly in the browser

---

## SDK and Client Libraries

### JavaScript/TypeScript

```bash
npm install @flamoral/api-client
```

**Usage:**
```typescript
import { FlamoralClient } from '@flamoral/api-client';

const client = new FlamoralClient({
  baseURL: 'https://api.flamoral.com',
  accessToken: 'your-access-token'
});

// Get current user
const user = await client.users.me();

// Get matches
const matches = await client.matching.getMatches();

// Send message
await client.messages.send(matchId, { text: 'Hello!' });
```

### React Hooks

```typescript
import { useUser, useMatches, useMessages } from '@flamoral/react-hooks';

function App() {
  const { user, loading } = useUser();
  const { matches } = useMatches();
  const { sendMessage } = useMessages(matchId);

  return <div>...</div>;
}
```

---

## Testing

### Test Users

Pre-seeded test users for development:

| Email | Password | Tier |
|-------|----------|------|
| test.user@example.com | Test123! | Free |
| premium.user@example.com | Test123! | Premium |
| admin@flamoral.com | Admin123! | Admin |

### Test Cards (Stripe)

| Card Number | Type | Outcome |
|-------------|------|---------|
| 4242 4242 4242 4242 | Visa | Success |
| 4000 0000 0000 9995 | Visa | Declined |
| 4000 0000 0000 9987 | Visa | Insufficient funds |

---

## Support

### Documentation
- User Service: `backend/services/user-service/API_DOCUMENTATION.md`
- Payment Service: `backend/services/payment-service/WEBHOOK_INTEGRATION.md`
- Stripe Setup: `STRIPE_PRODUCTION_SETUP.md`

### Contact
- **Engineering:** engineering@flamoral.com
- **Support:** support@flamoral.com
- **API Issues:** api-support@flamoral.com

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-21 | Initial master API documentation |

---

**Complete API Documentation Ready for Production Use**
