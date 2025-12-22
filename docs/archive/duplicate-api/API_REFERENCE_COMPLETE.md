# Flamoral Dating Platform - Complete API Reference

## Table of Contents

- [Introduction](#introduction)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Pagination](#pagination)
- [API Endpoints](#api-endpoints)
  - [Authentication Service](#authentication-service)
  - [User Profile Service](#user-profile-service)
  - [Discovery & Matching Service](#discovery--matching-service)
  - [Messaging Service](#messaging-service)
  - [Payment Service](#payment-service)
  - [Media Service](#media-service)
  - [Notification Service](#notification-service)
  - [Admin Service](#admin-service)
  - [Moderation Service](#moderation-service)

---

## Introduction

Welcome to the Flamoral Dating Platform API documentation. This guide provides comprehensive information about all available API endpoints, request/response formats, authentication requirements, and integration examples.

### Base URLs

| Environment | URL | Description |
|------------|-----|-------------|
| Production | `https://api.flamoral.com` | Live production environment |
| Staging | `https://api-staging.flamoral.com` | Testing environment |
| Development | `http://localhost:3000` | Local development |

### API Version

Current API Version: **v2.0.0**

The API version is included in the response headers:
```
X-API-Version: 2.0.0
```

---

## Authentication

The Flamoral API uses JWT (JSON Web Tokens) for authentication. Most endpoints require an access token to be included in the request header.

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Auth Service

    Client->>API: POST /api/auth/login
    API->>Auth Service: Validate credentials
    Auth Service-->>API: Generate tokens
    API-->>Client: Return access + refresh tokens

    Client->>API: GET /api/profile (with access token)
    API->>Auth Service: Validate token
    Auth Service-->>API: Token valid
    API-->>Client: Return profile data

    Note over Client,API: Access token expires (15 min)

    Client->>API: POST /api/auth/refresh-token
    API->>Auth Service: Validate refresh token
    Auth Service-->>API: Generate new access token
    API-->>Client: Return new access token
```

### Including Authentication

Include the access token in the `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Example: Login Request

**Request:**
```bash
curl -X POST https://api.flamoral.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "user": {
    "id": "usr_123abc456def",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "emailVerified": true,
    "subscriptionTier": "premium",
    "coinBalance": 150,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfMTIzYWJjNDU2ZGVmIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE2NDA5OTYxMDB9.abc123",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfMTIzYWJjNDU2ZGVmIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE2NDM1ODcyMDB9.def456",
  "expiresIn": 900
}
```

### Token Expiration

| Token Type | Expiration | Refresh Strategy |
|-----------|-----------|------------------|
| Access Token | 15 minutes | Use refresh token to obtain new access token |
| Refresh Token | 30 days | Login again after expiration |

### Example: Refresh Token

**Request:**
```bash
curl -X POST https://api.flamoral.com/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

---

## Rate Limiting

The API implements rate limiting to ensure fair usage and prevent abuse.

### Rate Limit Tiers

| Endpoint Category | Limit | Window | Scope |
|------------------|-------|--------|-------|
| Authentication | 5 requests | 15 minutes | Per IP |
| Password Reset | 3 requests | 1 hour | Per email |
| Email Verification | 3 requests | 1 hour | Per email |
| General API | 100 requests | 15 minutes | Per user |
| Media Upload | 20 requests | 1 hour | Per user |
| Messaging | 60 requests | 1 minute | Per user |
| Discovery Feed | 30 requests | 1 minute | Per user |
| Admin API | 500 requests | 15 minutes | Per admin |

### Rate Limit Headers

Every response includes rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Exceeding Rate Limits

When rate limit is exceeded, the API returns:

**Response: 429 Too Many Requests**
```json
{
  "error": "TooManyRequests",
  "message": "Rate limit exceeded. Please try again later.",
  "statusCode": 429,
  "details": {
    "retryAfter": 900,
    "limit": 100,
    "window": 900
  }
}
```

**Headers:**
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
Retry-After: 900
```

### Best Practices

1. **Implement exponential backoff** when receiving 429 responses
2. **Cache responses** when appropriate to reduce API calls
3. **Use WebSocket** for real-time features instead of polling
4. **Batch requests** when possible
5. **Monitor rate limit headers** to adjust request frequency

**Example: Implementing Exponential Backoff**
```javascript
async function apiRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status !== 429) {
      return response;
    }

    const retryAfter = response.headers.get('Retry-After');
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, i) * 1000;

    console.log(`Rate limited. Retrying after ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error('Max retries exceeded');
}
```

---

## Error Handling

All errors follow a consistent format for easy handling.

### Error Response Format

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "statusCode": 400,
  "details": {
    "field": "email",
    "constraint": "isEmail"
  }
}
```

### HTTP Status Codes

| Code | Status | Description | Example |
|------|--------|-------------|---------|
| 200 | OK | Successful request | Profile retrieved |
| 201 | Created | Resource created successfully | User registered |
| 204 | No Content | Successful with no response body | Photo deleted |
| 400 | Bad Request | Invalid input or validation error | Invalid email format |
| 401 | Unauthorized | Missing or invalid authentication | Invalid token |
| 403 | Forbidden | Insufficient permissions | Cannot view blocked user |
| 404 | Not Found | Resource does not exist | User not found |
| 409 | Conflict | Resource already exists | Email already registered |
| 413 | Payload Too Large | Request body too large | File exceeds 10MB |
| 422 | Unprocessable Entity | Valid syntax but semantic errors | Invalid date range |
| 429 | Too Many Requests | Rate limit exceeded | Too many login attempts |
| 500 | Internal Server Error | Server error | Database connection failed |
| 503 | Service Unavailable | Service temporarily down | Maintenance mode |

### Common Error Types

#### Validation Errors

**Status: 400 Bad Request**
```json
{
  "error": "ValidationError",
  "message": "Invalid input data",
  "statusCode": 400,
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "value": "invalid-email"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters",
      "value": "***"
    }
  ]
}
```

#### Authentication Errors

**Status: 401 Unauthorized**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "statusCode": 401
}
```

#### Permission Errors

**Status: 403 Forbidden**
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to perform this action",
  "statusCode": 403,
  "details": {
    "requiredPermission": "admin:users:write",
    "currentPermissions": ["user:profile:read", "user:profile:write"]
  }
}
```

#### Not Found Errors

**Status: 404 Not Found**
```json
{
  "error": "NotFound",
  "message": "User not found",
  "statusCode": 404,
  "details": {
    "resourceType": "User",
    "resourceId": "usr_123"
  }
}
```

#### Business Logic Errors

**Status: 422 Unprocessable Entity**
```json
{
  "error": "InsufficientCoins",
  "message": "You do not have enough coins for this action",
  "statusCode": 422,
  "details": {
    "required": 50,
    "available": 25,
    "shortfall": 25
  }
}
```

### Error Handling Best Practices

**Client-side Error Handling:**

```javascript
async function makeApiRequest(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      // Handle different error types
      switch (response.status) {
        case 400:
          // Show validation errors to user
          displayValidationErrors(data.details);
          break;
        case 401:
          // Redirect to login
          redirectToLogin();
          break;
        case 403:
          // Show permission error
          showPermissionError(data.message);
          break;
        case 404:
          // Show not found error
          showNotFoundError();
          break;
        case 422:
          // Handle business logic error
          handleBusinessLogicError(data);
          break;
        case 429:
          // Implement retry logic
          await retryAfterDelay(data.details.retryAfter);
          break;
        case 500:
        case 503:
          // Show generic error and report to monitoring
          showGenericError();
          reportError(data);
          break;
        default:
          showGenericError();
      }

      throw new Error(data.message);
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}
```

---

## Pagination

List endpoints support pagination to manage large result sets efficiently.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 20 | Items per page (max 100) |
| `sort` | string | - | Sort field and order (e.g., `createdAt:desc`) |

### Example Request

```bash
curl -X GET "https://api.flamoral.com/api/matches?page=2&limit=20&sort=matchedAt:desc" \
  -H "Authorization: Bearer eyJhbGc..."
```

### Response Format

All paginated endpoints return responses in this format:

```json
{
  "data": [
    {
      "id": "match_123",
      "user": {
        "id": "usr_456",
        "firstName": "Jane",
        "age": 27,
        "photos": [...]
      },
      "matchedAt": "2024-01-20T15:30:00Z"
    }
    // ... more items
  ],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": true
  }
}
```

### Pagination Metadata

| Field | Type | Description |
|-------|------|-------------|
| `page` | integer | Current page number |
| `limit` | integer | Items per page |
| `total` | integer | Total number of items across all pages |
| `totalPages` | integer | Total number of pages |
| `hasNext` | boolean | Whether there is a next page |
| `hasPrevious` | boolean | Whether there is a previous page |

### Cursor-based Pagination

For real-time feeds (discovery, messages), cursor-based pagination is used:

```bash
curl -X GET "https://api.flamoral.com/api/discovery?limit=10&cursor=eyJpZCI6InVzci..."" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Response:**
```json
{
  "data": [...],
  "cursor": {
    "next": "eyJpZCI6InVzci0xMjMiLCJ0aW1lc3RhbXAiOjE2NDA5OTUyMDB9",
    "hasMore": true
  }
}
```

### Pagination Best Practices

1. **Use appropriate page sizes** - Balance between performance and UX
2. **Implement infinite scroll** for mobile apps using cursor pagination
3. **Cache results** to avoid redundant requests
4. **Handle edge cases** - Empty results, last page, etc.

**Example: React Implementation**

```javascript
import { useState, useEffect } from 'react';

function useInfiniteScroll(endpoint) {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${endpoint}?page=${page}&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      const result = await response.json();

      setData(prev => [...prev, ...result.data]);
      setHasMore(result.pagination.hasNext);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      setLoading(false);
    }
  };

  return { data, loadMore, hasMore, loading };
}
```

---

## API Endpoints

### Authentication Service

The Authentication Service handles user registration, login, and session management.

**Base Path:** `/api/auth`

#### POST /api/auth/register

Register a new user account.

**Authentication:** None required

**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address (unique) |
| password | string | Yes | Min 8 chars, must include letters and numbers |
| firstName | string | Yes | User's first name |
| lastName | string | No | User's last name |
| dateOfBirth | string | Yes | Date in YYYY-MM-DD format (must be 18+) |
| gender | string | Yes | One of: male, female, non-binary, other |
| phoneNumber | string | No | Phone in E.164 format (+14155552671) |
| referralCode | string | No | Referral code from existing user |

**Example Request:**

```bash
curl -X POST https://api.flamoral.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane.smith@example.com",
    "password": "SecurePass123!",
    "firstName": "Jane",
    "lastName": "Smith",
    "dateOfBirth": "1995-08-20",
    "gender": "female",
    "phoneNumber": "+14155552671"
  }'
```

**Example Response: 201 Created**

```json
{
  "user": {
    "id": "usr_abc123def456",
    "email": "jane.smith@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "emailVerified": false,
    "phoneVerified": false,
    "photoVerified": false,
    "subscriptionTier": "free",
    "coinBalance": 100,
    "profileComplete": false,
    "createdAt": "2024-01-20T10:30:00Z",
    "lastActiveAt": "2024-01-20T10:30:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfYWJjMTIzZGVmNDU2IiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE2NDA5OTYxMDB9.signature",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfYWJjMTIzZGVmNDU2IiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE2NDM1ODcyMDB9.signature",
  "expiresIn": 900
}
```

**Error Responses:**

```json
// 400 Bad Request - Validation Error
{
  "error": "ValidationError",
  "message": "Invalid input data",
  "statusCode": 400,
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters and include letters and numbers"
    },
    {
      "field": "dateOfBirth",
      "message": "You must be at least 18 years old"
    }
  ]
}

// 409 Conflict - Email Already Exists
{
  "error": "ConflictError",
  "message": "An account with this email already exists",
  "statusCode": 409,
  "details": {
    "field": "email",
    "value": "jane.smith@example.com"
  }
}

// 429 Too Many Requests
{
  "error": "TooManyRequests",
  "message": "Too many registration attempts. Please try again later.",
  "statusCode": 429,
  "details": {
    "retryAfter": 900
  }
}
```

**Post-Registration Flow:**

1. User account is created with `emailVerified: false`
2. Verification email is sent to the user's email address
3. User receives 100 welcome coins
4. Access and refresh tokens are returned
5. User should complete profile setup next

---

#### POST /api/auth/login

Authenticate user with email and password.

**Authentication:** None required

**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User's email address |
| password | string | Yes | User's password |
| deviceInfo | object | No | Device information for tracking |

**Example Request:**

```bash
curl -X POST https://api.flamoral.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane.smith@example.com",
    "password": "SecurePass123!",
    "deviceInfo": {
      "deviceType": "ios",
      "deviceName": "iPhone 13 Pro",
      "appVersion": "1.2.0",
      "osVersion": "iOS 17.2",
      "pushToken": "fcm_token_abc123..."
    }
  }'
```

**Example Response: 200 OK**

```json
{
  "user": {
    "id": "usr_abc123def456",
    "email": "jane.smith@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "emailVerified": true,
    "photoVerified": true,
    "subscriptionTier": "premium",
    "coinBalance": 250,
    "profileComplete": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "lastActiveAt": "2024-01-20T15:45:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**Error Responses:**

```json
// 401 Unauthorized - Invalid Credentials
{
  "error": "Unauthorized",
  "message": "Invalid email or password",
  "statusCode": 401
}

// 423 Locked - Account Locked
{
  "error": "AccountLocked",
  "message": "Account temporarily locked due to too many failed login attempts",
  "statusCode": 423,
  "details": {
    "lockedUntil": "2024-01-20T16:45:00Z",
    "remainingTime": 3600
  }
}
```

**Security Features:**

- Password is hashed with bcrypt
- Failed login attempts are tracked
- Account is locked after 10 failed attempts (1 hour lockout)
- Login history is maintained for security auditing
- Device information is stored for suspicious activity detection

---

#### POST /api/auth/logout

Logout user and invalidate refresh token.

**Authentication:** Required (Bearer token)

**Rate Limit:** 100 requests per 15 minutes

**Example Request:**

```bash
curl -X POST https://api.flamoral.com/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Example Response: 200 OK**

```json
{
  "message": "Logout successful"
}
```

**What happens on logout:**

1. Refresh token is removed from whitelist
2. Session is terminated
3. Device push token is disassociated (optional)
4. Access token remains valid until expiration (15 min)

---

#### POST /api/auth/refresh-token

Obtain a new access token using refresh token.

**Authentication:** None required (uses refresh token)

**Rate Limit:** 100 requests per 15 minutes

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| refreshToken | string | Yes | Valid refresh token from login |

**Example Request:**

```bash
curl -X POST https://api.flamoral.com/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Example Response: 200 OK**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_token...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_refresh...",
  "expiresIn": 900
}
```

**Token Rotation:**

- New access token is always generated
- Refresh token may be rotated (new refresh token returned)
- Old refresh token is invalidated when rotated

**Error Responses:**

```json
// 401 Unauthorized - Invalid Refresh Token
{
  "error": "Unauthorized",
  "message": "Invalid or expired refresh token",
  "statusCode": 401
}
```

---

#### POST /api/auth/verify-email

Verify user email address using verification token.

**Authentication:** None required

**Rate Limit:** 10 requests per hour per email

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Email verification token from email |

**Example Request:**

```bash
curl -X POST https://api.flamoral.com/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "verify_abc123def456ghi789"
  }'
```

**Example Response: 200 OK**

```json
{
  "message": "Email verified successfully",
  "emailVerified": true,
  "rewards": {
    "coins": 50,
    "message": "You earned 50 bonus coins for verifying your email!"
  }
}
```

**Error Responses:**

```json
// 400 Bad Request - Invalid or Expired Token
{
  "error": "BadRequest",
  "message": "Invalid or expired verification token",
  "statusCode": 400,
  "details": {
    "reason": "Token expired",
    "expiredAt": "2024-01-19T10:30:00Z"
  }
}

// 400 Bad Request - Already Verified
{
  "error": "BadRequest",
  "message": "Email is already verified",
  "statusCode": 400
}
```

---

#### POST /api/auth/social/google

Login or register using Google OAuth.

**Authentication:** None required

**Rate Limit:** 10 requests per 15 minutes per IP

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Google OAuth ID token |
| deviceInfo | object | No | Device information |

**Example Request:**

```bash
curl -X POST https://api.flamoral.com/api/auth/social/google \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ya29.a0AfH6SMBx...",
    "deviceInfo": {
      "deviceType": "android",
      "deviceName": "Pixel 6",
      "appVersion": "1.2.0",
      "osVersion": "Android 13"
    }
  }'
```

**Example Response: 200 OK**

```json
{
  "user": {
    "id": "usr_google_123456",
    "email": "john.google@gmail.com",
    "firstName": "John",
    "lastName": "Google",
    "emailVerified": true,
    "photoVerified": false,
    "subscriptionTier": "free",
    "coinBalance": 100,
    "profileComplete": false,
    "provider": "google",
    "createdAt": "2024-01-20T15:45:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "isNewUser": true
}
```

**Social Login Flow:**

1. Client obtains Google OAuth token from Google Sign-In
2. Client sends token to Flamoral API
3. API validates token with Google
4. API extracts user info (email, name, picture)
5. If user exists, login and return tokens
6. If new user, create account and return tokens
7. Email is automatically verified (trusted by Google)

**Auto-populated Fields:**

- Email (from Google, verified)
- First name (from Google)
- Last name (from Google)
- Profile picture (downloaded from Google)

---

### User Profile Service

The User Profile Service manages user profiles, photos, subscriptions, coins, and privacy settings.

**Base Path:** `/api`

#### GET /api/profile

Get authenticated user's complete profile.

**Authentication:** Required

**Rate Limit:** 100 requests per 15 minutes

**Example Request:**

```bash
curl -X GET https://api.flamoral.com/api/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Example Response: 200 OK**

```json
{
  "id": "usr_abc123def456",
  "firstName": "Jane",
  "lastName": "Smith",
  "age": 28,
  "bio": "Adventure seeker and coffee enthusiast ☕ Love hiking and photography!",
  "gender": "female",
  "dateOfBirth": "1995-08-20",
  "location": {
    "city": "San Francisco",
    "state": "CA",
    "country": "United States",
    "coordinates": {
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  },
  "photos": [
    {
      "id": "photo_123",
      "url": "https://cdn.flamoral.com/photos/usr_abc123/photo_123.jpg",
      "thumbnailUrl": "https://cdn.flamoral.com/photos/usr_abc123/photo_123_thumb.jpg",
      "isPrimary": true,
      "isVerified": true,
      "order": 1,
      "uploadedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "photo_456",
      "url": "https://cdn.flamoral.com/photos/usr_abc123/photo_456.jpg",
      "thumbnailUrl": "https://cdn.flamoral.com/photos/usr_abc123/photo_456_thumb.jpg",
      "isPrimary": false,
      "isVerified": false,
      "order": 2,
      "uploadedAt": "2024-01-16T14:20:00Z"
    }
  ],
  "interests": [
    "Travel",
    "Photography",
    "Hiking",
    "Coffee",
    "Cooking"
  ],
  "height": 165,
  "education": "Bachelor's Degree",
  "occupation": "Marketing Manager",
  "company": "Tech Startup",
  "school": "UC Berkeley",
  "relationshipGoal": "long-term",
  "lookingFor": ["dating", "relationship"],
  "verified": true,
  "verificationBadges": ["photo", "email", "phone"],
  "profileScore": 92,
  "subscriptionTier": "premium",
  "coinBalance": 250,
  "activeBoosts": [
    {
      "id": "boost_789",
      "type": "profile",
      "expiresAt": "2024-01-20T17:00:00Z"
    }
  ],
  "stats": {
    "profileViews": 342,
    "likes": 89,
    "matches": 24,
    "messages": 156
  },
  "preferences": {
    "showOnlineStatus": true,
    "showLastActive": true,
    "showDistance": true,
    "showAge": true
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T15:45:00Z",
  "lastActiveAt": "2024-01-20T15:45:00Z"
}
```

---

#### PUT /api/profile

Update user profile information.

**Authentication:** Required

**Rate Limit:** 100 requests per 15 minutes

**Request Body:**

All fields are optional. Only include fields you want to update.

| Field | Type | Description |
|-------|------|-------------|
| bio | string | Profile bio (max 500 chars) |
| interests | string[] | Array of interests (max 10) |
| height | integer | Height in centimeters |
| education | string | Education level |
| occupation | string | Job title/occupation |
| company | string | Company name |
| school | string | School/university name |
| relationshipGoal | string | One of: casual, dating, relationship, long-term, friendship |
| lookingFor | string[] | What user is looking for |
| location | object | Location information |

**Example Request:**

```bash
curl -X PUT https://api.flamoral.com/api/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Updated bio: Love outdoor adventures and trying new restaurants!",
    "interests": ["Travel", "Food", "Yoga", "Music", "Art"],
    "height": 165,
    "occupation": "Senior Marketing Manager",
    "relationshipGoal": "long-term",
    "location": {
      "city": "San Francisco",
      "state": "CA",
      "country": "United States",
      "coordinates": {
        "latitude": 37.7749,
        "longitude": -122.4194
      }
    }
  }'
```

**Example Response: 200 OK**

Returns complete updated profile (same format as GET /api/profile).

**Error Responses:**

```json
// 400 Bad Request - Validation Error
{
  "error": "ValidationError",
  "message": "Invalid input data",
  "statusCode": 400,
  "details": [
    {
      "field": "bio",
      "message": "Bio must be less than 500 characters",
      "value": "Very long bio..."
    },
    {
      "field": "interests",
      "message": "Maximum 10 interests allowed",
      "value": ["Interest1", "Interest2", ...]
    }
  ]
}
```

---

#### GET /api/profile/{userId}

Get public profile of another user.

**Authentication:** Required

**Rate Limit:** 100 requests per 15 minutes

**Privacy:** Respects target user's privacy settings. Some fields may be hidden.

**Example Request:**

```bash
curl -X GET https://api.flamoral.com/api/profile/usr_def456ghi789 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Example Response: 200 OK**

```json
{
  "id": "usr_def456ghi789",
  "firstName": "Alex",
  "age": 30,
  "bio": "Passionate about technology and travel",
  "photos": [
    {
      "url": "https://cdn.flamoral.com/photos/usr_def456/photo_1.jpg",
      "thumbnailUrl": "https://cdn.flamoral.com/photos/usr_def456/photo_1_thumb.jpg",
      "order": 1
    }
  ],
  "interests": ["Technology", "Travel", "Gaming"],
  "height": 180,
  "occupation": "Software Engineer",
  "relationshipGoal": "dating",
  "distance": 5.2,
  "verified": true,
  "lastActive": "Active today",
  "mutualFriends": 3,
  "mutualInterests": ["Travel", "Technology"]
}
```

**Error Responses:**

```json
// 403 Forbidden - Cannot View Profile
{
  "error": "Forbidden",
  "message": "You cannot view this profile",
  "statusCode": 403,
  "details": {
    "reason": "blocked",
    "message": "You have been blocked by this user"
  }
}

// 404 Not Found - User Not Found
{
  "error": "NotFound",
  "message": "User not found",
  "statusCode": 404
}
```

---

#### POST /api/photos

Upload a new photo to profile.

**Authentication:** Required

**Rate Limit:** 20 requests per hour

**Content-Type:** multipart/form-data

**File Requirements:**

- Formats: JPEG, PNG, WebP
- Max size: 10MB
- Min resolution: 800x800px
- Max resolution: 4096x4096px
- Max photos per profile: 9

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| photo | file | Yes | Photo file |
| order | integer | No | Display order (1-9) |

**Example Request:**

```bash
curl -X POST https://api.flamoral.com/api/photos \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "photo=@/path/to/photo.jpg" \
  -F "order=2"
```

**Example Response: 201 Created**

```json
{
  "id": "photo_new123",
  "url": "https://cdn.flamoral.com/photos/usr_abc123/photo_new123.jpg",
  "thumbnailUrl": "https://cdn.flamoral.com/photos/usr_abc123/photo_new123_thumb.jpg",
  "isPrimary": false,
  "isVerified": false,
  "order": 2,
  "uploadedAt": "2024-01-20T16:00:00Z",
  "moderationStatus": "pending",
  "processingStatus": "completed"
}
```

**Processing Pipeline:**

1. **Upload**: File is uploaded to temporary storage
2. **Validation**: Format, size, and resolution are verified
3. **Moderation**: AI checks for NSFW content, faces, etc.
4. **Processing**: Image is resized and optimized
5. **Thumbnails**: Multiple thumbnail sizes are generated
6. **CDN Upload**: Final images are uploaded to CDN
7. **Database**: Photo metadata is saved to database

**Error Responses:**

```json
// 400 Bad Request - Max Photos Reached
{
  "error": "MaxPhotosReached",
  "message": "You have reached the maximum of 9 photos",
  "statusCode": 400,
  "details": {
    "currentCount": 9,
    "maximum": 9
  }
}

// 400 Bad Request - Invalid File
{
  "error": "InvalidFile",
  "message": "Only JPEG, PNG, and WebP formats are supported",
  "statusCode": 400,
  "details": {
    "receivedFormat": "image/gif",
    "supportedFormats": ["image/jpeg", "image/png", "image/webp"]
  }
}

// 413 Payload Too Large
{
  "error": "FileTooLarge",
  "message": "File size must be less than 10MB",
  "statusCode": 413,
  "details": {
    "fileSize": 12582912,
    "maxSize": 10485760
  }
}

// 422 Unprocessable Entity - Failed Moderation
{
  "error": "ModerationFailed",
  "message": "Photo does not meet content guidelines",
  "statusCode": 422,
  "details": {
    "reason": "nsfw_content",
    "confidence": 0.95
  }
}
```

---

This completes the first major section. The full documentation continues with:

- Discovery & Matching Service
- Messaging Service (including WebSocket events)
- Payment Service (including Stripe webhooks)
- Media Service
- Notification Service
- Admin Service
- Moderation Service
- Advanced Topics (Webhooks, SDKs, Error Codes Reference)

Would you like me to continue with the remaining sections?
