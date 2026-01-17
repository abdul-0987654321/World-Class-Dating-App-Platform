# Flamoral API Documentation

**Version:** 1.0.0
**Base URL:** `https://api.flamoral.com`
**API Version:** v1

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [Authentication API](#authentication-api)
6. [User API](#user-api)
7. [Matching API](#matching-api)
8. [Messaging API](#messaging-api)
9. [Payment API](#payment-api)

---

## Overview

The Flamoral API is a RESTful API that provides access to all platform features including user management, matching, messaging, and payments. All requests must use HTTPS.

### Content Type

All requests and responses use JSON format:

```
Content-Type: application/json
Accept: application/json
```

### API Versioning

The API version is included in the URL path. The current version is `v1`.

```
https://api.flamoral.com/api/v1/{resource}
```

---

## Authentication

Most API endpoints require authentication using JWT (JSON Web Tokens). Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Token Types

| Token Type | Expiration | Purpose |
|------------|------------|---------|
| Access Token | 15 minutes | API authentication |
| Refresh Token | 7 days | Obtain new access tokens |

### Authentication Flow

1. User registers or logs in to receive tokens
2. Include access token in Authorization header for API requests
3. When access token expires, use refresh token to obtain new tokens
4. On logout, tokens are invalidated server-side

---

## Rate Limiting

API requests are rate limited to ensure fair usage:

| Tier | Requests per Minute | Requests per Day |
|------|---------------------|------------------|
| Free | 60 | 1,000 |
| Premium | 120 | 5,000 |
| Elite | 300 | 15,000 |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1704393600
```

---

## Error Handling

### Error Response Format

All error responses follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  },
  "timestamp": "2026-01-04T12:00:00Z",
  "requestId": "req_abc123xyz"
}
```

### Common HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created successfully |
| 204 | No Content - Request succeeded with no response body |
| 400 | Bad Request - Invalid request parameters |
| 401 | Unauthorized - Missing or invalid authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource does not exist |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server-side error |

### Common Error Codes

| Error Code | Description |
|------------|-------------|
| `INVALID_CREDENTIALS` | Email or password is incorrect |
| `TOKEN_EXPIRED` | Access token has expired |
| `TOKEN_INVALID` | Token is malformed or invalid |
| `VALIDATION_ERROR` | Request body validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource does not exist |
| `PERMISSION_DENIED` | User lacks required permissions |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `ACCOUNT_SUSPENDED` | User account has been suspended |

---

## Authentication API

Base path: `/api/v1/auth`

### POST /register

Create a new user account.

**Authentication Required:** No

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1995-06-15",
  "gender": "male",
  "interestedIn": ["female"],
  "phoneNumber": "+1234567890",
  "acceptedTerms": true,
  "acceptedPrivacyPolicy": true
}
```

**Field Validation:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| email | string | Yes | Valid email format |
| password | string | Yes | Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special |
| firstName | string | Yes | 2-50 characters |
| lastName | string | Yes | 2-50 characters |
| dateOfBirth | string | Yes | ISO 8601 date, must be 18+ years old |
| gender | string | Yes | male, female, non_binary, other |
| interestedIn | array | Yes | Array of gender preferences |
| phoneNumber | string | No | E.164 format |
| acceptedTerms | boolean | Yes | Must be true |
| acceptedPrivacyPolicy | boolean | Yes | Must be true |

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123xyz",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1995-06-15",
      "gender": "male",
      "interestedIn": ["female"],
      "isVerified": false,
      "isPremium": false,
      "createdAt": "2026-01-04T12:00:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 900
    }
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request body |
| 409 | `EMAIL_ALREADY_EXISTS` | Email is already registered |
| 409 | `PHONE_ALREADY_EXISTS` | Phone number is already registered |

---

### POST /login

Authenticate an existing user.

**Authentication Required:** No

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "deviceId": "device_abc123",
  "deviceType": "ios"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123xyz",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isVerified": true,
      "isPremium": true,
      "premiumTier": "premium",
      "lastLoginAt": "2026-01-04T12:00:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 900
    }
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request body |
| 401 | `INVALID_CREDENTIALS` | Email or password is incorrect |
| 403 | `ACCOUNT_SUSPENDED` | Account has been suspended |
| 403 | `ACCOUNT_NOT_VERIFIED` | Email verification required |

---

### POST /refresh

Refresh access token using refresh token.

**Authentication Required:** No (uses refresh token)

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 900
    }
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 401 | `TOKEN_EXPIRED` | Refresh token has expired |
| 401 | `TOKEN_INVALID` | Refresh token is invalid |
| 401 | `TOKEN_REVOKED` | Refresh token has been revoked |

---

### POST /logout

Invalidate current session and tokens.

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "allDevices": false
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Successfully logged out"
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

---

### POST /forgot-password

Request a password reset email.

**Authentication Required:** No

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "If an account exists with this email, a password reset link will be sent"
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

**Note:** This endpoint always returns 200 to prevent email enumeration attacks.

---

### POST /reset-password

Reset password using reset token.

**Authentication Required:** No

**Request Body:**

```json
{
  "token": "reset_token_abc123xyz",
  "newPassword": "NewSecurePassword456!",
  "confirmPassword": "NewSecurePassword456!"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Password has been reset successfully"
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `PASSWORDS_DO_NOT_MATCH` | Passwords do not match |
| 400 | `PASSWORD_TOO_WEAK` | Password does not meet requirements |
| 401 | `TOKEN_EXPIRED` | Reset token has expired |
| 401 | `TOKEN_INVALID` | Reset token is invalid |

---

## User API

Base path: `/api/v1/users`

### GET /profile

Retrieve the authenticated user's profile.

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "usr_abc123xyz",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1995-06-15",
      "age": 30,
      "gender": "male",
      "interestedIn": ["female"],
      "bio": "Adventure seeker and coffee enthusiast",
      "occupation": "Software Engineer",
      "company": "Tech Corp",
      "education": "MIT",
      "location": {
        "city": "San Francisco",
        "state": "CA",
        "country": "US",
        "coordinates": {
          "latitude": 37.7749,
          "longitude": -122.4194
        }
      },
      "photos": [
        {
          "id": "pho_abc123",
          "url": "https://cdn.flamoral.com/photos/abc123.jpg",
          "isPrimary": true,
          "isVerified": true,
          "order": 0
        }
      ],
      "interests": ["hiking", "photography", "cooking"],
      "height": 180,
      "bodyType": "athletic",
      "drinking": "socially",
      "smoking": "never",
      "children": "want_someday",
      "religion": "agnostic",
      "politics": "moderate",
      "isVerified": true,
      "verificationBadges": ["photo", "phone", "id"],
      "isPremium": true,
      "premiumTier": "premium",
      "premiumExpiresAt": "2026-07-04T12:00:00Z",
      "profileCompleteness": 85,
      "createdAt": "2025-06-15T10:30:00Z",
      "updatedAt": "2026-01-03T15:45:00Z"
    }
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

---

### PUT /profile

Update the authenticated user's profile.

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Updated bio text here",
  "occupation": "Senior Software Engineer",
  "company": "New Tech Corp",
  "education": "MIT",
  "interests": ["hiking", "photography", "cooking", "travel"],
  "height": 180,
  "bodyType": "athletic",
  "drinking": "socially",
  "smoking": "never",
  "children": "want_someday",
  "religion": "agnostic",
  "politics": "moderate",
  "location": {
    "city": "San Francisco",
    "state": "CA",
    "country": "US"
  }
}
```

**Field Validation:**

| Field | Type | Constraints |
|-------|------|-------------|
| firstName | string | 2-50 characters |
| lastName | string | 2-50 characters |
| bio | string | Max 500 characters |
| occupation | string | Max 100 characters |
| company | string | Max 100 characters |
| education | string | Max 100 characters |
| interests | array | Max 10 items, each max 50 chars |
| height | number | 100-250 cm |
| bodyType | string | slim, average, athletic, curvy, plus_size |
| drinking | string | never, rarely, socially, regularly |
| smoking | string | never, socially, regularly |
| children | string | have_and_want_more, have_and_dont_want_more, dont_have_and_want, dont_have_and_dont_want, want_someday, not_sure |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "usr_abc123xyz",
      "firstName": "John",
      "lastName": "Doe",
      "bio": "Updated bio text here",
      "profileCompleteness": 90,
      "updatedAt": "2026-01-04T12:00:00Z"
    }
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

---

### POST /photos

Upload a new profile photo.

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| photo | file | Yes | Image file (JPEG, PNG, WebP) |
| isPrimary | boolean | No | Set as primary photo |
| order | number | No | Display order (0-5) |

**Constraints:**

- Maximum file size: 10 MB
- Supported formats: JPEG, PNG, WebP
- Minimum dimensions: 400x400 pixels
- Maximum photos per user: 6

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "photo": {
      "id": "pho_xyz789",
      "url": "https://cdn.flamoral.com/photos/xyz789.jpg",
      "thumbnailUrl": "https://cdn.flamoral.com/photos/xyz789_thumb.jpg",
      "isPrimary": false,
      "isVerified": false,
      "order": 3,
      "width": 1200,
      "height": 1600,
      "createdAt": "2026-01-04T12:00:00Z"
    }
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `INVALID_FILE_TYPE` | File type not supported |
| 400 | `FILE_TOO_LARGE` | File exceeds 10 MB limit |
| 400 | `IMAGE_TOO_SMALL` | Image dimensions below minimum |
| 400 | `MAX_PHOTOS_REACHED` | Maximum 6 photos allowed |
| 422 | `NSFW_CONTENT_DETECTED` | Inappropriate content detected |

---

### DELETE /photos/:id

Delete a profile photo.

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Photo ID |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Photo deleted successfully"
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 404 | `PHOTO_NOT_FOUND` | Photo does not exist |
| 400 | `CANNOT_DELETE_ONLY_PHOTO` | Must have at least one photo |

---

### GET /preferences

Retrieve matching and notification preferences.

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "preferences": {
      "matching": {
        "ageRange": {
          "min": 25,
          "max": 35
        },
        "distance": {
          "max": 50,
          "unit": "km"
        },
        "genderPreference": ["female"],
        "showOnlyVerified": false,
        "showOnlyWithPhotos": true,
        "dealbreakers": {
          "smoking": ["regularly"],
          "children": []
        }
      },
      "notifications": {
        "email": {
          "newMatches": true,
          "newMessages": true,
          "likes": true,
          "promotions": false,
          "weeklyDigest": true
        },
        "push": {
          "newMatches": true,
          "newMessages": true,
          "likes": true,
          "superLikes": true,
          "profileViews": false
        },
        "sms": {
          "securityAlerts": true,
          "matchReminders": false
        }
      },
      "privacy": {
        "showOnlineStatus": true,
        "showLastActive": true,
        "showDistance": true,
        "readReceipts": true,
        "discoverable": true,
        "showInGlobalMode": false
      }
    }
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

---

### PUT /preferences

Update matching and notification preferences.

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "matching": {
    "ageRange": {
      "min": 25,
      "max": 40
    },
    "distance": {
      "max": 100,
      "unit": "km"
    },
    "showOnlyVerified": true
  },
  "notifications": {
    "email": {
      "promotions": false
    },
    "push": {
      "profileViews": true
    }
  },
  "privacy": {
    "showOnlineStatus": false,
    "discoverable": true
  }
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "preferences": {
      "matching": {
        "ageRange": {
          "min": 25,
          "max": 40
        },
        "distance": {
          "max": 100,
          "unit": "km"
        },
        "showOnlyVerified": true
      }
    },
    "updatedAt": "2026-01-04T12:00:00Z"
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

---

## Matching API

Base path: `/api/v1/matching`

### GET /suggestions

Get profile suggestions for swiping.

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 10 | Number of profiles (1-50) |
| lat | number | - | Override latitude for location |
| lng | number | - | Override longitude for location |
| refresh | boolean | false | Force refresh suggestions |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": "usr_xyz789abc",
        "firstName": "Jane",
        "age": 28,
        "bio": "Travel enthusiast and foodie",
        "occupation": "Marketing Manager",
        "distance": 12.5,
        "distanceUnit": "km",
        "photos": [
          {
            "id": "pho_abc123",
            "url": "https://cdn.flamoral.com/photos/abc123.jpg",
            "isPrimary": true,
            "isVerified": true
          }
        ],
        "interests": ["travel", "cooking", "yoga"],
        "verificationBadges": ["photo", "phone"],
        "isOnline": true,
        "lastActive": "2026-01-04T11:45:00Z",
        "compatibilityScore": 87,
        "commonInterests": ["cooking", "travel"],
        "height": 165,
        "drinking": "socially",
        "smoking": "never"
      }
    ],
    "remainingSwipes": 100,
    "nextRefreshAt": "2026-01-05T00:00:00Z"
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

**Note:** Free users have limited daily swipes. Premium users have unlimited swipes.

---

### POST /swipe

Record a swipe action (like/dislike/super-like).

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "targetUserId": "usr_xyz789abc",
  "action": "like",
  "source": "suggestions"
}
```

**Field Validation:**

| Field | Type | Required | Values |
|-------|------|----------|--------|
| targetUserId | string | Yes | Target user ID |
| action | string | Yes | like, dislike, super_like |
| source | string | No | suggestions, likes_received, search |

**Response (200 OK) - No Match:**

```json
{
  "success": true,
  "data": {
    "matched": false,
    "remainingSwipes": 99,
    "remainingSuperLikes": 5
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

**Response (200 OK) - Match:**

```json
{
  "success": true,
  "data": {
    "matched": true,
    "match": {
      "id": "match_abc123xyz",
      "user": {
        "id": "usr_xyz789abc",
        "firstName": "Jane",
        "photos": [
          {
            "id": "pho_abc123",
            "url": "https://cdn.flamoral.com/photos/abc123.jpg",
            "isPrimary": true
          }
        ]
      },
      "matchedAt": "2026-01-04T12:00:00Z",
      "conversationId": "conv_def456"
    },
    "remainingSwipes": 99
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `ALREADY_SWIPED` | Already swiped on this user |
| 400 | `CANNOT_SWIPE_SELF` | Cannot swipe on own profile |
| 402 | `NO_REMAINING_SWIPES` | Daily swipe limit reached |
| 402 | `NO_REMAINING_SUPER_LIKES` | No super likes remaining |
| 404 | `USER_NOT_FOUND` | Target user not found |

---

### GET /matches

Get all matches for the authenticated user.

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 20 | Results per page (1-100) |
| offset | number | 0 | Pagination offset |
| sort | string | recent | recent, alphabetical, active |
| filter | string | all | all, unread, new |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "id": "match_abc123xyz",
        "user": {
          "id": "usr_xyz789abc",
          "firstName": "Jane",
          "age": 28,
          "photos": [
            {
              "id": "pho_abc123",
              "url": "https://cdn.flamoral.com/photos/abc123.jpg",
              "isPrimary": true
            }
          ],
          "isOnline": true,
          "lastActive": "2026-01-04T11:45:00Z"
        },
        "conversationId": "conv_def456",
        "matchedAt": "2026-01-03T18:30:00Z",
        "lastMessage": {
          "id": "msg_ghi789",
          "content": "Hey, how are you?",
          "sentAt": "2026-01-04T10:15:00Z",
          "isRead": false,
          "senderId": "usr_xyz789abc"
        },
        "unreadCount": 2,
        "isSuperLike": false,
        "isFavorite": true
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

---

### POST /unmatch

Unmatch with a user and optionally report.

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "matchId": "match_abc123xyz",
  "reason": "not_interested",
  "report": false,
  "reportReason": null,
  "reportDetails": null,
  "blockUser": false
}
```

**Field Validation:**

| Field | Type | Required | Values |
|-------|------|----------|--------|
| matchId | string | Yes | Match ID |
| reason | string | No | not_interested, met_someone, other |
| report | boolean | No | Whether to report user |
| reportReason | string | If report=true | harassment, inappropriate_content, spam, fake_profile, underage, other |
| reportDetails | string | No | Additional details (max 1000 chars) |
| blockUser | boolean | No | Also block the user |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Successfully unmatched",
    "blocked": false,
    "reported": false
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 404 | `MATCH_NOT_FOUND` | Match does not exist |
| 400 | `ALREADY_UNMATCHED` | Already unmatched |

---

### GET /likes-received

Get users who have liked the authenticated user (Premium feature).

**Authentication Required:** Yes (Premium only)

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 20 | Results per page (1-100) |
| offset | number | 0 | Pagination offset |
| filter | string | all | all, super_likes |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "likes": [
      {
        "id": "like_abc123",
        "user": {
          "id": "usr_xyz789abc",
          "firstName": "Jane",
          "age": 28,
          "photos": [
            {
              "id": "pho_abc123",
              "url": "https://cdn.flamoral.com/photos/abc123.jpg",
              "isPrimary": true,
              "isVerified": true
            }
          ],
          "distance": 8.3,
          "distanceUnit": "km",
          "isOnline": false,
          "lastActive": "2026-01-04T09:30:00Z"
        },
        "isSuperLike": false,
        "likedAt": "2026-01-04T08:15:00Z"
      }
    ],
    "pagination": {
      "total": 12,
      "limit": 20,
      "offset": 0,
      "hasMore": false
    },
    "blurredCount": 0
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 403 | `PREMIUM_REQUIRED` | This feature requires premium subscription |

---

## Messaging API

Base path: `/api/v1/messaging`

### GET /conversations

Get all conversations for the authenticated user.

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 20 | Results per page (1-100) |
| offset | number | 0 | Pagination offset |
| filter | string | all | all, unread, archived |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv_abc123xyz",
        "matchId": "match_def456",
        "participant": {
          "id": "usr_xyz789abc",
          "firstName": "Jane",
          "photos": [
            {
              "id": "pho_abc123",
              "url": "https://cdn.flamoral.com/photos/abc123.jpg",
              "isPrimary": true
            }
          ],
          "isOnline": true,
          "lastActive": "2026-01-04T11:55:00Z"
        },
        "lastMessage": {
          "id": "msg_ghi789",
          "content": "Sounds great! See you Saturday",
          "sentAt": "2026-01-04T11:50:00Z",
          "senderId": "usr_abc123xyz",
          "type": "text",
          "isRead": true
        },
        "unreadCount": 0,
        "isArchived": false,
        "isMuted": false,
        "createdAt": "2026-01-01T14:30:00Z",
        "updatedAt": "2026-01-04T11:50:00Z"
      }
    ],
    "pagination": {
      "total": 23,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

---

### GET /conversations/:id/messages

Get messages in a specific conversation.

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Conversation ID |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | Messages per page (1-100) |
| before | string | - | Cursor for pagination (message ID) |
| after | string | - | Cursor for newer messages |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_abc123",
        "conversationId": "conv_abc123xyz",
        "senderId": "usr_xyz789abc",
        "content": "Hey! I noticed you like hiking too",
        "type": "text",
        "status": "read",
        "readAt": "2026-01-04T10:35:00Z",
        "createdAt": "2026-01-04T10:30:00Z"
      },
      {
        "id": "msg_def456",
        "conversationId": "conv_abc123xyz",
        "senderId": "usr_abc123xyz",
        "content": "Yes! I try to go every weekend",
        "type": "text",
        "status": "read",
        "readAt": "2026-01-04T10:40:00Z",
        "createdAt": "2026-01-04T10:38:00Z"
      },
      {
        "id": "msg_ghi789",
        "conversationId": "conv_abc123xyz",
        "senderId": "usr_xyz789abc",
        "content": null,
        "type": "image",
        "media": {
          "url": "https://cdn.flamoral.com/messages/img_abc123.jpg",
          "thumbnailUrl": "https://cdn.flamoral.com/messages/img_abc123_thumb.jpg",
          "width": 1200,
          "height": 900
        },
        "status": "delivered",
        "createdAt": "2026-01-04T10:45:00Z"
      }
    ],
    "pagination": {
      "hasMore": true,
      "nextCursor": "msg_xyz789"
    }
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

---

### POST /messages

Send a new message.

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body (Text Message):**

```json
{
  "conversationId": "conv_abc123xyz",
  "content": "Hey! How's your day going?",
  "type": "text"
}
```

**Request Body (Image Message - multipart/form-data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| conversationId | string | Yes | Conversation ID |
| type | string | Yes | image |
| media | file | Yes | Image file (JPEG, PNG, WebP) |

**Request Body (GIF Message):**

```json
{
  "conversationId": "conv_abc123xyz",
  "type": "gif",
  "gifUrl": "https://media.giphy.com/media/abc123/giphy.gif",
  "gifId": "abc123"
}
```

**Message Types:**

| Type | Description |
|------|-------------|
| text | Plain text message |
| image | Image attachment |
| gif | GIF from approved providers |
| icebreaker | Pre-defined icebreaker question |

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "message": {
      "id": "msg_new123",
      "conversationId": "conv_abc123xyz",
      "senderId": "usr_abc123xyz",
      "content": "Hey! How's your day going?",
      "type": "text",
      "status": "sent",
      "createdAt": "2026-01-04T12:00:00Z"
    }
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `MESSAGE_TOO_LONG` | Message exceeds 2000 characters |
| 400 | `INVALID_MESSAGE_TYPE` | Unsupported message type |
| 403 | `CONVERSATION_BLOCKED` | Conversation is blocked |
| 404 | `CONVERSATION_NOT_FOUND` | Conversation does not exist |
| 422 | `INAPPROPRIATE_CONTENT` | Message flagged by moderation |

---

### POST /typing

Send typing indicator to conversation.

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "conversationId": "conv_abc123xyz",
  "isTyping": true
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "acknowledged": true
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

**Note:** Typing indicators automatically expire after 5 seconds.

---

### POST /read-receipts

Mark messages as read.

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "conversationId": "conv_abc123xyz",
  "messageIds": ["msg_abc123", "msg_def456", "msg_ghi789"]
}
```

**Alternative - Mark all as read:**

```json
{
  "conversationId": "conv_abc123xyz",
  "markAllRead": true
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "markedRead": 3,
    "conversationId": "conv_abc123xyz"
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

---

## Payment API

Base path: `/api/v1/payments`

### GET /plans

Get available subscription plans.

**Authentication Required:** No

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "plan_basic_monthly",
        "name": "Basic",
        "tier": "basic",
        "interval": "month",
        "price": {
          "amount": 999,
          "currency": "USD",
          "formatted": "$9.99"
        },
        "features": [
          "Unlimited swipes",
          "See who likes you"
        ],
        "popular": false
      },
      {
        "id": "plan_plus_monthly",
        "name": "Plus",
        "tier": "plus",
        "interval": "month",
        "price": {
          "amount": 1499,
          "currency": "USD",
          "formatted": "$14.99"
        },
        "features": [
          "All Basic features",
          "Incognito mode",
          "Read receipts"
        ],
        "popular": false
      },
      {
        "id": "plan_premium_monthly",
        "name": "Premium",
        "tier": "premium",
        "interval": "month",
        "price": {
          "amount": 1999,
          "currency": "USD",
          "formatted": "$19.99"
        },
        "features": [
          "All Plus features",
          "Passport mode",
          "Unlimited super likes"
        ],
        "popular": true
      },
      {
        "id": "plan_premium_plus_monthly",
        "name": "Premium+",
        "tier": "premium_plus",
        "interval": "month",
        "price": {
          "amount": 2999,
          "currency": "USD",
          "formatted": "$29.99"
        },
        "features": [
          "All Premium features",
          "Message before matching"
        ],
        "popular": false
      },
      {
        "id": "plan_elite_monthly",
        "name": "Elite",
        "tier": "elite",
        "interval": "month",
        "price": {
          "amount": 4999,
          "currency": "USD",
          "formatted": "$49.99"
        },
        "features": [
          "All Premium+ features",
          "VIP badge",
          "Dedicated support"
        ],
        "popular": false
      }
    ]
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

---

### POST /subscribe

Create a new subscription.

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "planId": "plan_gold_monthly",
  "paymentMethodId": "pm_abc123xyz",
  "couponCode": "NEWYEAR2026"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_abc123xyz",
      "planId": "plan_gold_monthly",
      "tier": "gold",
      "status": "active",
      "currentPeriodStart": "2026-01-04T12:00:00Z",
      "currentPeriodEnd": "2026-02-04T12:00:00Z",
      "cancelAtPeriodEnd": false,
      "price": {
        "amount": 2699,
        "currency": "USD",
        "formatted": "$26.99"
      },
      "discount": {
        "couponCode": "NEWYEAR2026",
        "percentOff": 10,
        "amountOff": 300
      }
    },
    "invoice": {
      "id": "inv_def456",
      "amount": 2699,
      "currency": "USD",
      "status": "paid",
      "pdfUrl": "https://api.flamoral.com/invoices/inv_def456.pdf"
    }
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `INVALID_PLAN` | Plan does not exist |
| 400 | `ALREADY_SUBSCRIBED` | Active subscription exists |
| 400 | `INVALID_COUPON` | Coupon code is invalid or expired |
| 402 | `PAYMENT_FAILED` | Payment could not be processed |
| 402 | `CARD_DECLINED` | Card was declined |

---

### POST /cancel

Cancel an active subscription.

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "subscriptionId": "sub_abc123xyz",
  "reason": "too_expensive",
  "feedback": "Great app but I need to cut expenses",
  "cancelImmediately": false
}
```

**Cancellation Reasons:**

| Reason | Description |
|--------|-------------|
| too_expensive | Price is too high |
| not_using | Not using the features |
| found_match | Found a match |
| switching_apps | Switching to another app |
| technical_issues | Technical problems |
| other | Other reason |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_abc123xyz",
      "status": "active",
      "cancelAtPeriodEnd": true,
      "currentPeriodEnd": "2026-02-04T12:00:00Z",
      "canceledAt": "2026-01-04T12:00:00Z"
    },
    "message": "Your subscription will remain active until February 4, 2026"
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 404 | `SUBSCRIPTION_NOT_FOUND` | Subscription does not exist |
| 400 | `ALREADY_CANCELED` | Subscription is already canceled |

---

### GET /history

Get payment and subscription history.

**Authentication Required:** Yes

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 20 | Results per page (1-100) |
| offset | number | 0 | Pagination offset |
| type | string | all | all, subscription, purchase, refund |
| startDate | string | - | Filter by start date (ISO 8601) |
| endDate | string | - | Filter by end date (ISO 8601) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_abc123",
        "type": "subscription",
        "description": "Gold Monthly Subscription",
        "amount": {
          "value": 2999,
          "currency": "USD",
          "formatted": "$29.99"
        },
        "status": "succeeded",
        "paymentMethod": {
          "type": "card",
          "brand": "visa",
          "last4": "4242"
        },
        "invoiceUrl": "https://api.flamoral.com/invoices/inv_abc123.pdf",
        "createdAt": "2026-01-04T12:00:00Z"
      },
      {
        "id": "txn_def456",
        "type": "purchase",
        "description": "5 Super Likes Pack",
        "amount": {
          "value": 499,
          "currency": "USD",
          "formatted": "$4.99"
        },
        "status": "succeeded",
        "paymentMethod": {
          "type": "card",
          "brand": "visa",
          "last4": "4242"
        },
        "createdAt": "2025-12-28T15:30:00Z"
      },
      {
        "id": "txn_ghi789",
        "type": "refund",
        "description": "Refund - Duplicate charge",
        "amount": {
          "value": -2999,
          "currency": "USD",
          "formatted": "-$29.99"
        },
        "status": "succeeded",
        "relatedTransactionId": "txn_xyz789",
        "createdAt": "2025-12-15T09:00:00Z"
      }
    ],
    "summary": {
      "totalSpent": {
        "value": 3498,
        "currency": "USD",
        "formatted": "$34.98"
      },
      "currentSubscription": {
        "id": "sub_abc123xyz",
        "tier": "gold",
        "status": "active",
        "renewsAt": "2026-02-04T12:00:00Z"
      }
    },
    "pagination": {
      "total": 15,
      "limit": 20,
      "offset": 0,
      "hasMore": false
    }
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

---

## WebSocket API

For real-time features, connect to the WebSocket server:

```
wss://ws.flamoral.com/v1/realtime
```

### Connection

Connect with authentication:

```javascript
const socket = new WebSocket('wss://ws.flamoral.com/v1/realtime', {
  headers: {
    'Authorization': 'Bearer <access_token>'
  }
});
```

### Events

**Incoming Events:**

| Event | Description |
|-------|-------------|
| `new_match` | New match created |
| `new_message` | New message received |
| `typing_start` | User started typing |
| `typing_stop` | User stopped typing |
| `message_read` | Message was read |
| `user_online` | Match came online |
| `user_offline` | Match went offline |
| `new_like` | Someone liked you (Premium) |

**Example Event Payload:**

```json
{
  "event": "new_message",
  "data": {
    "message": {
      "id": "msg_abc123",
      "conversationId": "conv_xyz789",
      "senderId": "usr_def456",
      "content": "Hey there!",
      "type": "text",
      "createdAt": "2026-01-04T12:00:00Z"
    }
  },
  "timestamp": "2026-01-04T12:00:00Z"
}
```

---

## SDKs and Libraries

Official SDKs are available for:

- **JavaScript/TypeScript:** `npm install @flamoral/sdk`
- **iOS (Swift):** Available via CocoaPods and SPM
- **Android (Kotlin):** Available via Maven Central
- **React Native:** `npm install @flamoral/react-native-sdk`

---

## Support

For API support and questions:

- **Email:** api-support@flamoral.com
- **Developer Portal:** https://developers.flamoral.com
- **Status Page:** https://status.flamoral.com

---

*Last updated: January 4, 2026*
