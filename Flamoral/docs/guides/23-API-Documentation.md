# Flamoral API Documentation

**Version**: 2.0.0
**Base URL**: `https://api.flamoral.com/v1`
**WebSocket URL**: `wss://api.flamoral.com`

---

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Token Refresh
Tokens expire after 15 minutes. Use the refresh token to get a new access token.

---

## API Endpoints

### 1. Authentication (`/auth`)

#### POST /auth/register
Register a new user account

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "phone_number": "+1234567890",
  "date_of_birth": "1995-06-15",
  "first_name": "John",
  "gender": "male",
  "terms_accepted": true
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "phone_number": "+1234567890"
    },
    "tokens": {
      "access_token": "jwt_access_token",
      "refresh_token": "jwt_refresh_token",
      "expires_in": 900
    }
  }
}
```

#### POST /auth/login
User login

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "subscription_tier": "free"
    },
    "tokens": {
      "access_token": "jwt_access_token",
      "refresh_token": "jwt_refresh_token",
      "expires_in": 900
    }
  }
}
```

#### POST /auth/refresh
Refresh access token

**Request:**
```json
{
  "refresh_token": "jwt_refresh_token"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "access_token": "new_jwt_access_token",
    "expires_in": 900
  }
}
```

#### POST /auth/verify-phone
Send SMS verification code

**Request:**
```json
{
  "phone_number": "+1234567890"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Verification code sent"
}
```

#### POST /auth/verify-phone/confirm
Confirm phone verification

**Request:**
```json
{
  "phone_number": "+1234567890",
  "code": "123456"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "phone_verified": true
  }
}
```

---

### 2. User Profile (`/profile`)

#### GET /profile/me
Get current user's profile

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "first_name": "John",
    "date_of_birth": "1995-06-15",
    "age": 29,
    "gender": "male",
    "bio": "Love hiking and coffee",
    "photos": [
      {
        "id": "uuid",
        "url": "https://cdn.flamoral.com/photos/...",
        "position": 0,
        "is_primary": true
      }
    ],
    "interests": ["hiking", "coffee", "travel"],
    "location": {
      "city": "San Francisco",
      "state": "CA"
    },
    "profile_completion": 85
  }
}
```

#### PUT /profile/me
Update current user's profile

**Request:**
```json
{
  "bio": "Updated bio",
  "height_cm": 180,
  "education": "Bachelor's Degree",
  "occupation": "Software Engineer"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "profile": { /* updated profile */ },
    "profile_completion": 90
  }
}
```

#### POST /profile/photos
Upload profile photo

**Request:** `multipart/form-data`
```
photo: <file>
position: 0
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "photo": {
      "id": "uuid",
      "url": "https://cdn.flamoral.com/photos/...",
      "thumbnail_url": "https://cdn.flamoral.com/thumbnails/...",
      "position": 0,
      "moderation_status": "pending"
    }
  }
}
```

#### DELETE /profile/photos/:photoId
Delete profile photo

**Response:** `204 No Content`

#### PUT /profile/photos/reorder
Reorder profile photos

**Request:**
```json
{
  "photo_order": [
    { "id": "uuid1", "position": 0 },
    { "id": "uuid2", "position": 1 }
  ]
}
```

**Response:** `200 OK`

---

### 3. Discovery (`/discovery`)

#### GET /discovery/profiles
Get profiles for discovery/swiping

**Query Parameters:**
- `limit`: Number of profiles (default: 10, max: 50)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "id": "uuid",
        "first_name": "Sarah",
        "age": 27,
        "bio": "Adventure seeker",
        "photos": [ /* array of photo objects */ ],
        "distance_km": 5,
        "compatibility_score": 85,
        "common_interests": ["hiking", "travel"]
      }
    ],
    "has_more": true
  }
}
```

#### POST /discovery/swipe
Record a swipe action

**Request:**
```json
{
  "target_user_id": "uuid",
  "action": "like" // or "pass" or "super_like"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "match": true, // if mutual like
    "match_id": "uuid",
    "daily_likes_remaining": 45
  }
}
```

#### POST /discovery/rewind
Undo last swipe (Premium feature)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "rewound_user_id": "uuid"
  }
}
```

---

### 4. Matches (`/matches`)

#### GET /matches
Get list of matches

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "id": "uuid",
        "user": {
          "id": "uuid",
          "first_name": "Sarah",
          "age": 27,
          "photos": [ /* photos */ ]
        },
        "matched_at": "2025-11-20T10:30:00Z",
        "last_message": {
          "content": "Hey! How are you?",
          "created_at": "2025-11-22T15:45:00Z",
          "read": false
        },
        "unread_count": 3
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "has_more": true
    }
  }
}
```

#### DELETE /matches/:matchId
Unmatch with user

**Response:** `204 No Content`

---

### 5. Messaging (`/messages`)

#### GET /messages/:matchId
Get conversation messages

**Query Parameters:**
- `before`: Get messages before this message ID
- `limit`: Number of messages (default: 50)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "message_id",
        "match_id": "uuid",
        "sender_id": "uuid",
        "content": "Hey! How are you?",
        "type": "text",
        "read": true,
        "read_at": "2025-11-22T16:00:00Z",
        "created_at": "2025-11-22T15:45:00Z"
      }
    ],
    "has_more": false
  }
}
```

#### POST /messages/:matchId
Send a message

**Request:**
```json
{
  "content": "Hey! How are you?",
  "type": "text"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "message": {
      "id": "message_id",
      "match_id": "uuid",
      "sender_id": "uuid",
      "content": "Hey! How are you?",
      "created_at": "2025-11-22T15:45:00Z"
    }
  }
}
```

#### PUT /messages/:matchId/read
Mark messages as read

**Response:** `200 OK`

---

### 6. Subscriptions (`/subscriptions`)

#### GET /subscriptions/plans
Get available subscription plans

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "premium_monthly",
        "name": "Premium",
        "price_cents": 1999,
        "currency": "USD",
        "interval": "month",
        "features": [
          "Unlimited likes",
          "See who liked you",
          "Advanced filters",
          "5 Super Likes per week"
        ]
      },
      {
        "id": "premium_yearly",
        "name": "Premium",
        "price_cents": 9999,
        "currency": "USD",
        "interval": "year",
        "discount_percentage": 58
      }
    ]
  }
}
```

#### POST /subscriptions/subscribe
Subscribe to a plan

**Request:**
```json
{
  "plan_id": "premium_monthly",
  "payment_method_id": "pm_stripe_payment_method"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "uuid",
      "tier": "premium",
      "status": "active",
      "current_period_end": "2025-12-22T00:00:00Z"
    }
  }
}
```

#### POST /subscriptions/cancel
Cancel subscription

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Subscription will be cancelled at period end"
}
```

---

### 7. Boosts (`/boosts`)

#### POST /boosts/purchase
Purchase a profile boost

**Request:**
```json
{
  "boost_type": "profile_boost", // or "spotlight"
  "payment_method": "coins" // or "stripe"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "boost": {
      "id": "uuid",
      "type": "profile_boost",
      "started_at": "2025-11-22T16:00:00Z",
      "expires_at": "2025-11-22T16:30:00Z"
    }
  }
}
```

---

### 8. Preferences (`/preferences`)

#### GET /preferences
Get user preferences

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "interested_in_genders": ["female"],
    "min_age": 25,
    "max_age": 35,
    "max_distance_km": 30,
    "show_me_on_discover": true
  }
}
```

#### PUT /preferences
Update user preferences

**Request:**
```json
{
  "min_age": 23,
  "max_age": 33,
  "max_distance_km": 50
}
```

**Response:** `200 OK`

---

### 9. Reports (`/reports`)

#### POST /reports
Report a user

**Request:**
```json
{
  "reported_user_id": "uuid",
  "reason": "inappropriate_photos",
  "details": "User has inappropriate photos in their profile"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Report submitted successfully"
}
```

---

### 10. Blocks (`/blocks`)

#### POST /blocks
Block a user

**Request:**
```json
{
  "blocked_user_id": "uuid",
  "reason": "harassment"
}
```

**Response:** `201 Created`

#### DELETE /blocks/:userId
Unblock a user

**Response:** `204 No Content`

---

### 11. Admin (`/admin`)

All admin endpoints require `admin` or `moderator` role.

#### GET /admin/users
Get users list

**Query Parameters:**
- `page`, `limit`, `status`, `subscription_tier`, `search`

#### PUT /admin/users/:userId/status
Update user status

**Request:**
```json
{
  "status": "suspended",
  "reason": "Violation of terms"
}
```

#### GET /admin/reports
Get moderation queue

#### PUT /admin/reports/:reportId/resolve
Resolve a report

---

## WebSocket Events

### Connection
```javascript
const socket = io('wss://api.flamoral.com', {
  auth: {
    token: 'jwt_access_token'
  }
});
```

### Events

#### Client → Server

**`typing:start`**
```json
{
  "match_id": "uuid"
}
```

**`typing:stop`**
```json
{
  "match_id": "uuid"
}
```

**`message:send`**
```json
{
  "match_id": "uuid",
  "content": "Hello!",
  "type": "text"
}
```

#### Server → Client

**`match:new`**
```json
{
  "match": {
    "id": "uuid",
    "user": { /* user object */ },
    "matched_at": "2025-11-22T16:00:00Z"
  }
}
```

**`message:new`**
```json
{
  "message": {
    "id": "message_id",
    "match_id": "uuid",
    "sender_id": "uuid",
    "content": "Hello!",
    "created_at": "2025-11-22T16:00:00Z"
  }
}
```

**`typing:active`**
```json
{
  "match_id": "uuid",
  "user_id": "uuid",
  "typing": true
}
```

---

## Error Responses

### Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Error Codes
- `VALIDATION_ERROR` - 400
- `UNAUTHORIZED` - 401
- `FORBIDDEN` - 403
- `NOT_FOUND` - 404
- `RATE_LIMIT_EXCEEDED` - 429
- `INTERNAL_SERVER_ERROR` - 500

---

## Rate Limiting

**Free Users:**
- 50 likes per day
- 1 super like per day
- 100 API requests per minute

**Premium Users:**
- Unlimited likes
- 5 super likes per week
- 300 API requests per minute

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1637856000
```

---

**API Version**: 2.0.0
**Last Updated**: November 23, 2025
