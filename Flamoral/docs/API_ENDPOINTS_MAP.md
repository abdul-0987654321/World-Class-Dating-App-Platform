# Flamoral Platform - API Endpoints Map

## Overview

This document provides a comprehensive mapping of all frontend-to-backend API connections for the Flamoral Dating Platform. It serves as a reference for developers working on frontend applications.

**Last Updated:** December 2025
**API Version:** v1
**Base URL:** `https://api.flamoral.com` (production)

---

## Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [User & Profile Endpoints](#user--profile-endpoints)
3. [Matching & Discovery Endpoints](#matching--discovery-endpoints)
4. [Messaging Endpoints](#messaging-endpoints)
5. [Payment Endpoints](#payment-endpoints)
6. [Notification Endpoints](#notification-endpoints)
7. [Media Endpoints](#media-endpoints)
8. [Moderation & Safety Endpoints](#moderation--safety-endpoints)
9. [Admin Endpoints](#admin-endpoints)
10. [WebSocket Events](#websocket-events)
11. [Response Codes](#response-codes)

---

## API Base URLs

### Production
- **API Gateway:** `https://api.flamoral.com`
- **WebSocket:** `wss://api.flamoral.com`
- **GraphQL:** `https://api.flamoral.com/graphql`

### Staging
- **API Gateway:** `https://api-staging.flamoral.com`
- **WebSocket:** `wss://api-staging.flamoral.com`
- **GraphQL:** `https://api-staging.flamoral.com/graphql`

### Development
- **API Gateway:** `http://localhost:4000`
- **WebSocket:** `ws://localhost:5000`
- **GraphQL:** `http://localhost:4000/graphql`

---

## Authentication Endpoints

### POST `/api/v1/auth/register`
**Description:** Register a new user account

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "dateOfBirth": "1990-01-15",
  "gender": "male",
  "acceptedTerms": true
}
```

**Response (201):**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Frontend Usage:**
- **Web:** `apps/web-app/src/services/auth.service.ts`
- **Mobile:** `apps/mobile-app/src/services/auth.service.ts`

---

### POST `/api/v1/auth/login`
**Description:** Login with email and password

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "profileComplete": true
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Frontend Usage:**
- **Web:** `apps/web-app/src/services/auth.service.ts`
- **Mobile:** `apps/mobile-app/src/services/auth.service.ts`

---

### POST `/api/v1/auth/refresh-token`
**Description:** Refresh access token using refresh token

**Request (Web - httpOnly cookie):**
```
Headers: { credentials: 'include' }
```

**Request (Mobile - token in body):**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Frontend Usage:**
- **Web:** `apps/web-app/src/services/api.client.ts` (automatic)
- **Mobile:** `apps/mobile-app/src/api/client.ts` (automatic)

---

### POST `/api/v1/auth/logout`
**Description:** Logout and invalidate tokens

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Frontend Usage:**
- **Web:** `apps/web-app/src/services/auth.service.ts`
- **Mobile:** `apps/mobile-app/src/services/auth.service.ts`

---

### POST `/api/v1/auth/forgot-password`
**Description:** Request password reset email

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "Password reset email sent"
}
```

---

### POST `/api/v1/auth/reset-password`
**Description:** Reset password with token

**Request:**
```json
{
  "token": "reset_token_xyz",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200):**
```json
{
  "message": "Password reset successful"
}
```

---

### POST `/api/v1/auth/social/google`
**Description:** Login/Register with Google OAuth

**Request:**
```json
{
  "idToken": "google_id_token",
  "accessToken": "google_access_token"
}
```

**Response (200):**
```json
{
  "user": { ... },
  "accessToken": "...",
  "refreshToken": "...",
  "isNewUser": false
}
```

**Frontend Usage:**
- **Web:** `apps/web-app/src/hooks/useSocialAuth.ts`
- **Mobile:** `apps/mobile-app/src/components/auth/SocialLoginButtons.tsx`

---

### POST `/api/v1/auth/social/facebook`
**Description:** Login/Register with Facebook OAuth

---

### POST `/api/v1/auth/social/apple`
**Description:** Login/Register with Apple Sign In

---

## User & Profile Endpoints

### GET `/api/v1/users/me`
**Description:** Get current user profile

**Response (200):**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "age": 32,
  "gender": "male",
  "bio": "Love hiking and travel...",
  "photos": [...],
  "location": {
    "city": "San Francisco",
    "state": "CA",
    "country": "USA"
  },
  "verified": true,
  "subscription": {
    "tier": "premium",
    "expiresAt": "2025-12-31T23:59:59Z"
  }
}
```

**Frontend Usage:**
- **Web:** `apps/web-app/src/services/profile.service.ts`
- **Mobile:** `apps/mobile-app/src/services/profile.service.ts`

---

### PUT `/api/v1/users/profile`
**Description:** Update user profile

**Request:**
```json
{
  "name": "John Doe",
  "bio": "Updated bio...",
  "interests": ["hiking", "photography", "travel"],
  "lookingFor": "relationship",
  "location": {
    "city": "San Francisco",
    "state": "CA"
  }
}
```

**Response (200):**
```json
{
  "id": "user_123",
  "name": "John Doe",
  // Updated profile data
}
```

---

### POST `/api/v1/users/photos`
**Description:** Upload profile photo

**Request (multipart/form-data):**
```
photo: [File]
isPrimary: true
```

**Response (201):**
```json
{
  "id": "photo_123",
  "url": "https://cdn.flamoral.com/photos/user_123/photo_123.jpg",
  "thumbnailUrl": "https://cdn.flamoral.com/photos/user_123/thumb_photo_123.jpg",
  "isPrimary": true,
  "moderationStatus": "pending"
}
```

**Frontend Usage:**
- **Web:** `apps/web-app/src/components/PhotoUpload.tsx`
- **Mobile:** `apps/mobile-app/src/components/media/PhotoUpload.tsx`

---

### DELETE `/api/v1/users/photos/:photoId`
**Description:** Delete a profile photo

**Response (200):**
```json
{
  "message": "Photo deleted successfully"
}
```

---

### GET `/api/v1/users/:userId/profile`
**Description:** Get another user's public profile

**Response (200):**
```json
{
  "id": "user_456",
  "name": "Jane Smith",
  "age": 28,
  "bio": "...",
  "photos": [...],
  "verified": true,
  "distance": 5.2
}
```

---

### POST `/api/v1/users/verify/phone`
**Description:** Send phone verification code

**Request:**
```json
{
  "phoneNumber": "+1234567890"
}
```

**Response (200):**
```json
{
  "message": "Verification code sent",
  "expiresIn": 300
}
```

---

### POST `/api/v1/users/verify/phone/confirm`
**Description:** Confirm phone verification code

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "verified": true,
  "phoneNumber": "+1234567890"
}
```

---

### POST `/api/v1/users/verify/photo`
**Description:** Submit photo for verification

**Request (multipart/form-data):**
```
photo: [File]
pose: "neutral"
```

**Response (201):**
```json
{
  "id": "verification_123",
  "status": "pending",
  "estimatedTime": "2-5 minutes"
}
```

---

## Matching & Discovery Endpoints

### GET `/api/v1/matching/discover`
**Description:** Get profiles to swipe on

**Query Parameters:**
- `limit` - Number of profiles (default: 10, max: 50)
- `offset` - Pagination offset

**Response (200):**
```json
{
  "profiles": [
    {
      "id": "user_789",
      "name": "Sarah",
      "age": 26,
      "photos": [...],
      "bio": "...",
      "distance": 3.5,
      "compatibility": 85
    }
  ],
  "hasMore": true,
  "nextOffset": 10
}
```

**Frontend Usage:**
- **Web:** `apps/web-app/src/services/discovery.service.ts`
- **Mobile:** `apps/mobile-app/src/screens/Discovery/DiscoveryScreen.tsx`

---

### POST `/api/v1/matching/swipe`
**Description:** Swipe on a profile (like/pass)

**Request:**
```json
{
  "targetUserId": "user_789",
  "action": "like",
  "superLike": false
}
```

**Response (200):**
```json
{
  "match": true,
  "matchId": "match_123",
  "conversation": {
    "id": "conv_123"
  }
}
```

**Frontend Usage:**
- **Web:** `apps/web-app/src/components/SwipeCard.tsx`
- **Mobile:** `apps/mobile-app/src/components/discovery/SwipeCard.tsx`

---

### GET `/api/v1/matching/matches`
**Description:** Get list of matches

**Query Parameters:**
- `limit` - Number of matches (default: 20)
- `offset` - Pagination offset

**Response (200):**
```json
{
  "matches": [
    {
      "id": "match_123",
      "user": {
        "id": "user_789",
        "name": "Sarah",
        "photos": [...]
      },
      "matchedAt": "2025-12-01T12:00:00Z",
      "conversation": {
        "id": "conv_123",
        "lastMessage": "Hi! How are you?",
        "unreadCount": 2
      }
    }
  ],
  "total": 45
}
```

---

### POST `/api/v1/matching/super-like`
**Description:** Send a super like

**Request:**
```json
{
  "targetUserId": "user_789"
}
```

**Response (200):**
```json
{
  "superLikeSent": true,
  "remaining": 4
}
```

---

### POST `/api/v1/matching/boost`
**Description:** Activate profile boost

**Response (200):**
```json
{
  "boostActive": true,
  "expiresAt": "2025-12-01T13:00:00Z",
  "remaining": 2
}
```

---

## Messaging Endpoints

### GET `/api/v1/messaging/conversations`
**Description:** Get list of conversations

**Response (200):**
```json
{
  "conversations": [
    {
      "id": "conv_123",
      "user": {
        "id": "user_789",
        "name": "Sarah",
        "photo": "..."
      },
      "lastMessage": {
        "id": "msg_456",
        "content": "See you soon!",
        "sentAt": "2025-12-01T14:30:00Z"
      },
      "unreadCount": 0
    }
  ]
}
```

**Frontend Usage:**
- **Web:** `apps/web-app/src/components/ConversationList.tsx`
- **Mobile:** `apps/mobile-app/src/components/messaging/ConversationList.tsx`

---

### GET `/api/v1/messaging/conversations/:conversationId/messages`
**Description:** Get messages in a conversation

**Query Parameters:**
- `limit` - Number of messages (default: 50)
- `before` - Message ID for pagination

**Response (200):**
```json
{
  "messages": [
    {
      "id": "msg_456",
      "conversationId": "conv_123",
      "senderId": "user_789",
      "content": "Hi! How are you?",
      "type": "text",
      "status": "read",
      "createdAt": "2025-12-01T12:00:00Z"
    }
  ],
  "hasMore": true
}
```

---

### POST `/api/v1/messaging/conversations/:conversationId/messages`
**Description:** Send a message

**Request:**
```json
{
  "content": "Hello!",
  "type": "text"
}
```

**Response (201):**
```json
{
  "id": "msg_789",
  "conversationId": "conv_123",
  "senderId": "user_123",
  "content": "Hello!",
  "type": "text",
  "status": "sent",
  "createdAt": "2025-12-01T15:00:00Z"
}
```

---

### POST `/api/v1/messaging/conversations/:conversationId/media`
**Description:** Send media message (image, GIF, voice note)

**Request (multipart/form-data):**
```
media: [File]
type: "image"
```

**Response (201):**
```json
{
  "id": "msg_790",
  "conversationId": "conv_123",
  "senderId": "user_123",
  "type": "image",
  "mediaUrl": "https://cdn.flamoral.com/messages/msg_790.jpg",
  "status": "sent",
  "createdAt": "2025-12-01T15:05:00Z"
}
```

---

### PUT `/api/v1/messaging/conversations/:conversationId/read`
**Description:** Mark messages as read

**Request:**
```json
{
  "messageIds": ["msg_456", "msg_457"]
}
```

**Response (200):**
```json
{
  "markedRead": 2
}
```

---

### DELETE `/api/v1/messaging/conversations/:conversationId`
**Description:** Delete conversation

**Response (200):**
```json
{
  "message": "Conversation deleted"
}
```

---

## Payment Endpoints

### GET `/api/v1/payments/subscriptions`
**Description:** Get available subscription plans

**Response (200):**
```json
{
  "plans": [
    {
      "id": "premium_monthly",
      "name": "Premium - Monthly",
      "price": 29.99,
      "currency": "USD",
      "interval": "month",
      "features": [
        "Unlimited likes",
        "See who likes you",
        "5 Super Likes per day"
      ]
    }
  ]
}
```

---

### POST `/api/v1/payments/subscriptions/subscribe`
**Description:** Subscribe to a plan

**Request:**
```json
{
  "planId": "premium_monthly",
  "paymentMethodId": "pm_123456"
}
```

**Response (201):**
```json
{
  "subscription": {
    "id": "sub_123",
    "planId": "premium_monthly",
    "status": "active",
    "currentPeriodEnd": "2026-01-01T00:00:00Z"
  }
}
```

---

### POST `/api/v1/payments/coins/purchase`
**Description:** Purchase coin packages

**Request:**
```json
{
  "packageId": "coins_100",
  "paymentMethodId": "pm_123456"
}
```

**Response (201):**
```json
{
  "purchase": {
    "id": "purchase_123",
    "coins": 100,
    "newBalance": 150
  }
}
```

---

### GET `/api/v1/payments/balance`
**Description:** Get current coin balance

**Response (200):**
```json
{
  "balance": 150,
  "currency": "coins"
}
```

---

## Notification Endpoints

### GET `/api/v1/notifications`
**Description:** Get user notifications

**Query Parameters:**
- `limit` - Number of notifications (default: 20)
- `unreadOnly` - Filter unread (boolean)

**Response (200):**
```json
{
  "notifications": [
    {
      "id": "notif_123",
      "type": "new_match",
      "title": "It's a match!",
      "body": "You and Sarah liked each other",
      "data": {
        "matchId": "match_123",
        "userId": "user_789"
      },
      "read": false,
      "createdAt": "2025-12-01T12:00:00Z"
    }
  ],
  "unreadCount": 5
}
```

---

### PUT `/api/v1/notifications/:notificationId/read`
**Description:** Mark notification as read

**Response (200):**
```json
{
  "read": true
}
```

---

### PUT `/api/v1/notifications/settings`
**Description:** Update notification preferences

**Request:**
```json
{
  "pushEnabled": true,
  "emailEnabled": false,
  "types": {
    "newMatches": true,
    "newMessages": true,
    "likes": false
  }
}
```

**Response (200):**
```json
{
  "settings": { ... }
}
```

---

## Media Endpoints

### POST `/api/v1/media/upload`
**Description:** Upload media file

**Request (multipart/form-data):**
```
file: [File]
type: "profile_photo"
```

**Response (201):**
```json
{
  "id": "media_123",
  "url": "https://cdn.flamoral.com/media/media_123.jpg",
  "thumbnailUrl": "https://cdn.flamoral.com/media/thumb_media_123.jpg",
  "type": "image",
  "size": 2048576
}
```

---

## Moderation & Safety Endpoints

### POST `/api/v1/safety/report`
**Description:** Report a user

**Request:**
```json
{
  "reportedUserId": "user_999",
  "reason": "inappropriate_behavior",
  "details": "Sent harassing messages",
  "evidence": ["msg_123", "msg_124"]
}
```

**Response (201):**
```json
{
  "reportId": "report_123",
  "status": "submitted"
}
```

---

### POST `/api/v1/safety/block`
**Description:** Block a user

**Request:**
```json
{
  "blockedUserId": "user_999"
}
```

**Response (200):**
```json
{
  "blocked": true
}
```

---

### GET `/api/v1/safety/blocked`
**Description:** Get list of blocked users

**Response (200):**
```json
{
  "blockedUsers": [
    {
      "id": "user_999",
      "blockedAt": "2025-12-01T10:00:00Z"
    }
  ]
}
```

---

### DELETE `/api/v1/safety/block/:userId`
**Description:** Unblock a user

**Response (200):**
```json
{
  "unblocked": true
}
```

---

## Admin Endpoints

### GET `/api/v1/admin/users`
**Description:** Get all users (admin only)

**Query Parameters:**
- `limit` - Number of users
- `offset` - Pagination offset
- `search` - Search query
- `status` - Filter by status

**Response (200):**
```json
{
  "users": [...],
  "total": 10000,
  "page": 1,
  "totalPages": 500
}
```

---

### PUT `/api/v1/admin/users/:userId/moderate`
**Description:** Moderate a user (admin only)

**Request:**
```json
{
  "action": "suspend",
  "reason": "Terms violation",
  "duration": "7d"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "user_999",
    "status": "suspended",
    "suspendedUntil": "2025-12-08T00:00:00Z"
  }
}
```

---

## WebSocket Events

### Connection
```typescript
// Connect to WebSocket
socket = io('wss://api.flamoral.com', {
  auth: { token: accessToken },
  transports: ['websocket', 'polling']
});
```

### Events to Emit (Client → Server)

#### `join_conversation`
```typescript
socket.emit('join_conversation', {
  conversationId: 'conv_123'
});
```

#### `send_message`
```typescript
socket.emit('send_message', {
  conversationId: 'conv_123',
  content: 'Hello!',
  type: 'text'
});
```

#### `typing`
```typescript
socket.emit('typing', {
  conversationId: 'conv_123',
  isTyping: true
});
```

#### `mark_read`
```typescript
socket.emit('mark_read', {
  conversationId: 'conv_123',
  messageIds: ['msg_456', 'msg_457']
});
```

### Events to Listen (Server → Client)

#### `new_message`
```typescript
socket.on('new_message', (data) => {
  console.log('New message:', data.message);
});
```

#### `message_delivered`
```typescript
socket.on('message_delivered', (data) => {
  console.log('Message delivered:', data.messageId);
});
```

#### `message_read`
```typescript
socket.on('message_read', (data) => {
  console.log('Messages read:', data.messageIds);
});
```

#### `typing`
```typescript
socket.on('typing', (data) => {
  console.log('User typing:', data.userId, data.isTyping);
});
```

#### `user_online`
```typescript
socket.on('user_online', (data) => {
  console.log('User online:', data.userId);
});
```

#### `user_offline`
```typescript
socket.on('user_offline', (data) => {
  console.log('User offline:', data.userId);
});
```

#### `new_match`
```typescript
socket.on('new_match', (data) => {
  console.log('New match:', data.match);
});
```

---

## Response Codes

### Success Codes

| Code | Description |
|------|-------------|
| 200  | OK - Request successful |
| 201  | Created - Resource created successfully |
| 204  | No Content - Request successful, no content to return |

### Client Error Codes

| Code | Description |
|------|-------------|
| 400  | Bad Request - Invalid request data |
| 401  | Unauthorized - Authentication required |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource not found |
| 409  | Conflict - Resource conflict (e.g., duplicate) |
| 422  | Unprocessable Entity - Validation failed |
| 429  | Too Many Requests - Rate limit exceeded |

### Server Error Codes

| Code | Description |
|------|-------------|
| 500  | Internal Server Error |
| 502  | Bad Gateway - Service unavailable |
| 503  | Service Unavailable - Temporary |
| 504  | Gateway Timeout |

---

## Error Response Format

All errors follow this structure:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": {
    "field": "email",
    "message": "Email is required"
  }
}
```

---

## Rate Limiting

### Limits by Endpoint Type

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| User Profile | 100 requests | 1 minute |
| Discovery | 50 requests | 1 minute |
| Messaging | 100 requests | 1 minute |
| Media Upload | 10 uploads | 1 minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
```

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
- `limit` - Items per page (default: 20, max: 100)
- `offset` - Number of items to skip

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150,
    "hasMore": true
  }
}
```

---

## Frontend Implementation Examples

### Web App (React)
```typescript
// apps/web-app/src/services/matching.service.ts
import { apiClient } from './api.client';

export const matchingService = {
  async getDiscovery(limit = 10) {
    return apiClient.get(`/api/v1/matching/discover?limit=${limit}`);
  },

  async swipe(targetUserId: string, action: 'like' | 'pass') {
    return apiClient.post('/api/v1/matching/swipe', {
      targetUserId,
      action
    });
  }
};
```

### Mobile App (React Native)
```typescript
// apps/mobile-app/src/services/api/match.service.ts
import { apiClient } from '../client';

export const matchService = {
  async discover(limit = 10) {
    return apiClient.get(`/api/v1/matching/discover?limit=${limit}`);
  },

  async swipe(targetUserId: string, action: 'like' | 'pass') {
    return apiClient.post('/api/v1/matching/swipe', {
      targetUserId,
      action
    });
  }
};
```

---

## Related Documentation

- [Frontend Connectivity Guide](./FRONTEND_CONNECTIVITY_GUIDE.md)
- [WebSocket Integration](../WEBSOCKET_INTEGRATION.md)
- [Authentication Flow](../SECURITY_IMPLEMENTATION_SUMMARY.md)
- [API Testing](../TESTING_GUIDE.md)
