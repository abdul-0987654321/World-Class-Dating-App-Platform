# ConnectSphere API Reference Guide

Quick reference for all API endpoints with examples.

**Base URL:** `http://localhost:3001/api`

**Authentication:** All endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

---

## Photos API

### Get User Photos
```http
GET /photos
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "url": "https://example.com/photo.jpg",
      "thumbnail_url": "https://example.com/thumb.jpg",
      "position": 0,
      "is_primary": true,
      "is_verified": true,
      "created_at": "2025-11-16T00:00:00Z"
    }
  ]
}
```

### Add Photo
```http
POST /photos
Content-Type: application/json

{
  "url": "https://example.com/photo.jpg",
  "thumbnail_url": "https://example.com/thumb.jpg"
}
```

### Delete Photo
```http
DELETE /photos/:photoId
```

### Set Primary Photo
```http
PUT /photos/:photoId/primary
```

---

## Prompts API

### Get Available Prompts
```http
GET /prompts
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "question": "What's your ideal weekend?",
      "category": "lifestyle",
      "is_active": true,
      "display_order": 1
    }
  ]
}
```

### Get User Prompts
```http
GET /prompts/user
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "prompt_id": "uuid",
      "answer": "Hiking in the mountains!",
      "prompt": {
        "id": "uuid",
        "question": "What's your ideal weekend?"
      }
    }
  ]
}
```

### Add Prompt Answer
```http
POST /prompts/user
Content-Type: application/json

{
  "prompt_id": "uuid",
  "answer": "Hiking in the mountains!"
}
```

### Update Prompt Answer
```http
PUT /prompts/user/:promptId
Content-Type: application/json

{
  "answer": "Updated answer here"
}
```

### Delete Prompt Answer
```http
DELETE /prompts/user/:promptId
```

---

## Swipes API

### Like Profile
```http
POST /swipes/like
Content-Type: application/json

{
  "target_user_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "swipe": {
      "id": "uuid",
      "swiper_id": "uuid",
      "swiped_id": "uuid",
      "action": "like"
    },
    "is_match": true,
    "match": {
      "id": "uuid",
      "user1_id": "uuid",
      "user2_id": "uuid"
    }
  }
}
```

### Pass Profile
```http
POST /swipes/pass
Content-Type: application/json

{
  "target_user_id": "uuid"
}
```

### Super Like Profile
```http
POST /swipes/super-like
Content-Type: application/json

{
  "target_user_id": "uuid"
}
```

### Get Swipe Statistics
```http
GET /swipes/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_swipes": 150,
    "likes": 75,
    "passes": 70,
    "super_likes": 5
  }
}
```

### Get Swipe History
```http
GET /swipes/history?limit=50
```

### Get Remaining Swipes
```http
GET /swipes/remaining
```

**Response:**
```json
{
  "success": true,
  "data": {
    "remaining": 25,
    "limit": 50,
    "is_premium": false
  }
}
```

---

## Matches API

### Get Matches
```http
GET /matches?limit=50
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user1_id": "uuid",
      "user2_id": "uuid",
      "is_active": true,
      "created_at": "2025-11-16T00:00:00Z",
      "other_user": {
        "id": "uuid",
        "first_name": "Jane",
        "age": 28,
        "bio": "Coffee enthusiast",
        "city": "San Francisco",
        "photos": [...]
      }
    }
  ],
  "count": 10
}
```

### Unmatch
```http
POST /matches/:matchId/unmatch
```

### Get Match Statistics
```http
GET /matches/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_matches": 25,
    "active_matches": 20
  }
}
```

### Get Match Details
```http
GET /matches/:matchId
```

---

## Discovery API

### Get Discovery Profiles
```http
GET /discovery?limit=20&age_min=25&age_max=35&distance_max=50&gender=female
```

**Query Parameters:**
- `limit` (number) - Default: 20
- `age_min` (number) - Minimum age
- `age_max` (number) - Maximum age
- `distance_max` (number) - Max distance in km
- `gender` (string) - 'male', 'female', 'other'

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "first_name": "Sarah",
      "age": 29,
      "bio": "Nurse who loves animals",
      "occupation": "Registered Nurse",
      "city": "Denver",
      "distance": 15.5,
      "photos": [
        {
          "id": "uuid",
          "url": "https://example.com/photo.jpg",
          "thumbnail_url": "https://example.com/thumb.jpg",
          "position": 0
        }
      ],
      "interests": ["hiking", "photography"],
      "prompts": [
        {
          "question": "What's your ideal weekend?",
          "answer": "Hiking in the mountains!"
        }
      ],
      "is_verified": true
    }
  ],
  "count": 20
}
```

### Get Profile by ID
```http
GET /discovery/:profileId
```

---

## Profile API

### Get Current User Profile
```http
GET /profile
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "bio": "Software engineer who loves hiking",
    "occupation": "Software Engineer",
    "education": "B.S. Computer Science",
    "height": 175,
    "city": "San Francisco",
    "state": "California",
    "country": "USA",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "interests": ["hiking", "photography", "cooking"],
    "languages": ["English", "Spanish"],
    "smoking": "never",
    "drinking": "socially",
    "exercise": "regularly",
    "diet": "any",
    "pets": "dog",
    "profile_completion_percentage": 85,
    "profile_completed": true,
    "created_at": "2025-11-01T00:00:00Z",
    "updated_at": "2025-11-16T00:00:00Z"
  }
}
```

### Update Profile
```http
PUT /profile
Content-Type: application/json

{
  "bio": "Updated bio text",
  "occupation": "Senior Software Engineer",
  "education": "M.S. Computer Science",
  "height": 175,
  "city": "San Francisco",
  "state": "California",
  "country": "USA",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "interests": ["hiking", "photography", "cooking"],
  "languages": ["English", "Spanish", "French"],
  "smoking": "never",
  "drinking": "socially",
  "exercise": "regularly",
  "diet": "vegetarian",
  "pets": "dog"
}
```

**All fields are optional in the update request.**

---

## Authentication API

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "is_verified": true,
      "is_email_verified": true
    }
  }
}
```

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1995-06-15",
  "gender": "male"
}
```

---

## Error Responses

### Standard Error Format
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

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests (Rate Limited)
- `500` - Internal Server Error

---

## Rate Limits

- **General Endpoints:** 100 requests per 15 minutes
- **Auth Endpoints:** 5 requests per 15 minutes
- **Swipe Endpoints:** 50 swipes per day (free users)

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699900800
```

---

## Validation Rules

### Photos
- URL: Required, valid URL format
- Max 9 photos per user
- Min 2 photos to delete

### Prompts
- prompt_id: Required, UUID format
- answer: Required, 1-200 characters
- Max 6 prompts per user

### Swipes
- target_user_id: Required, UUID format
- Cannot swipe on self
- Cannot swipe on same user twice

### Profile
- bio: Max 500 characters
- occupation: Max 100 characters
- education: Max 100 characters
- height: 100-250 cm
- latitude: -90 to 90
- longitude: -180 to 180
- interests: Max 10 items
- languages: Max 10 items

---

## Testing with cURL

### Login and Get Token
```bash
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test.user@example.com","password":"Test@123"}' \
  -s | jq -r '.data.token')
```

### Get Discovery Profiles
```bash
curl -X GET "http://localhost:3001/api/discovery?limit=20" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq
```

### Like a Profile
```bash
curl -X POST http://localhost:3001/api/swipes/like \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_user_id":"TARGET_USER_ID"}' \
  -s | jq
```

### Update Profile
```bash
curl -X PUT http://localhost:3001/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Updated bio",
    "interests": ["hiking", "photography"]
  }' \
  -s | jq
```

---

## Swagger Documentation

Interactive API documentation available at:
```
http://localhost:3001/api-docs
```

**Features:**
- Try out endpoints directly
- View request/response schemas
- Authentication integration
- Example payloads

---

## Test Accounts

**Email:** test.user@example.com
**Password:** Test@123

**Other Test Users:**
- david.kim@example.com
- jessica.taylor@example.com
- ryan.martinez@example.com
- ashley.brown@example.com
- kevin.wilson@example.com
- lauren.davis@example.com
- chris.anderson@example.com
- sarah.johnson@example.com
- michael.chen@example.com
- emily.rodriguez@example.com

All test accounts use password: **Test@123**

---

**Last Updated:** 2025-11-16
