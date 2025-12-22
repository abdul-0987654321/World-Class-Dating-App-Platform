# Messaging Automation Service - API Documentation

Base URL: `http://localhost:3013` (development) or `https://api.flamoral.com/automation` (production)

## Authentication

All endpoints (except health checks) require authentication.

### User Authentication
```http
Authorization: Bearer <jwt-token>
```

### Service-to-Service Authentication
```http
X-Service-API-Key: <service-api-key>
```

---

## Message Automation Endpoints

### Create Auto-Response Template

Create an automatic response template that triggers on specific keywords or conditions.

**Endpoint:** `POST /api/automation/auto-response`

**Authentication:** Required (User)

**Request Body:**
```json
{
  "trigger": "hello",
  "response": "Hi {name}! {time} How can I help you?",
  "enabled": true,
  "conditions": {
    "timeOfDay": ["9-17"],
    "conversationContext": "greeting",
    "userStatus": "online"
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-123",
    "trigger": "hello",
    "response": "Hi {name}! {time} How can I help you?",
    "enabled": true,
    "conditions": {
      "timeOfDay": ["9-17"],
      "conversationContext": "greeting"
    }
  }
}
```

**Placeholders:**
- `{name}` - Sender's first name
- `{time}` - Time-appropriate greeting (Good morning/afternoon/evening)
- `{topic}` - Last discussed topic

---

### Schedule a Message

Schedule a message for delivery at a specific time or optimal time based on recipient activity.

**Endpoint:** `POST /api/automation/schedule-message`

**Authentication:** Required (User)

**Request Body:**
```json
{
  "recipientId": "user-456",
  "message": "Hey! How was your weekend?",
  "scheduledAt": "2024-01-20T14:00:00Z",
  "useOptimalTiming": false,
  "timezone": "America/New_York"
}
```

**Request Body (Optimal Timing):**
```json
{
  "recipientId": "user-456",
  "message": "Hey! How was your weekend?",
  "useOptimalTiming": true,
  "timezone": "America/New_York"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "schedule-123",
    "userId": "user-123",
    "recipientId": "user-456",
    "message": "Hey! How was your weekend?",
    "scheduledAt": "2024-01-20T19:00:00Z",
    "status": "pending",
    "timezone": "America/New_York"
  }
}
```

---

### Get Scheduled Messages

Retrieve all scheduled messages for the authenticated user.

**Endpoint:** `GET /api/automation/scheduled-messages`

**Authentication:** Required (User)

**Query Parameters:**
- `status` (optional): Filter by status (pending, sent, failed, cancelled)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "schedule-123",
      "userId": "user-123",
      "recipientId": "user-456",
      "message": "Hey! How was your weekend?",
      "scheduledAt": "2024-01-20T19:00:00Z",
      "status": "pending",
      "timezone": "America/New_York"
    }
  ]
}
```

---

### Cancel Scheduled Message

Cancel a scheduled message before it's sent.

**Endpoint:** `DELETE /api/automation/scheduled-messages/:scheduleId`

**Authentication:** Required (User)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Scheduled message cancelled"
}
```

---

## Smart Reply Endpoints

### Generate Smart Replies

Generate AI-powered reply suggestions based on conversation context.

**Endpoint:** `POST /api/automation/smart-replies`

**Authentication:** Required (User)

**Request Body:**
```json
{
  "conversationId": "conv-123",
  "lastMessage": "What do you like to do for fun?",
  "conversationHistory": [
    {
      "senderId": "user-456",
      "content": "Hey! Nice to match with you!",
      "createdAt": "2024-01-15T10:00:00Z"
    },
    {
      "senderId": "user-123",
      "content": "Hi! Thanks, you too!",
      "createdAt": "2024-01-15T10:02:00Z"
    },
    {
      "senderId": "user-456",
      "content": "What do you like to do for fun?",
      "createdAt": "2024-01-15T10:05:00Z"
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": "sugg-1",
        "text": "I love hiking and exploring new trails! What about you?",
        "tone": "casual",
        "confidence": 0.92,
        "category": "question"
      },
      {
        "id": "sugg-2",
        "text": "I'm really into photography and live music. Do you have any hobbies?",
        "tone": "friendly",
        "confidence": 0.87,
        "category": "statement"
      },
      {
        "id": "sugg-3",
        "text": "That's a great question! I enjoy trying new restaurants and weekend getaways.",
        "tone": "casual",
        "confidence": 0.83,
        "category": "statement"
      }
    ],
    "conversationId": "conv-123"
  }
}
```

---

### Generate Conversation Starters

Generate personalized conversation starters based on profile compatibility.

**Endpoint:** `POST /api/automation/conversation-starters`

**Authentication:** Required (User)

**Request Body:**
```json
{
  "matchUserId": "user-789",
  "matchId": "match-123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "starters": [
      {
        "id": "starter-1",
        "text": "I noticed we both love hiking! Have you done any good trails lately?",
        "category": "interest_based",
        "relevanceScore": 0.95,
        "context": "Based on shared interest: hiking"
      },
      {
        "id": "starter-2",
        "text": "Your profile mentioned photography - what kind of shots do you like to take?",
        "category": "profile_based",
        "relevanceScore": 0.88,
        "context": "Based on profile interest: photography"
      },
      {
        "id": "starter-3",
        "text": "Hey! What's the most interesting place you've traveled to recently?",
        "category": "question",
        "relevanceScore": 0.75,
        "context": "Generic conversation starter"
      }
    ],
    "matchUserId": "user-789"
  }
}
```

---

### Analyze Message Effectiveness

Analyze a message and receive effectiveness score with improvement suggestions.

**Endpoint:** `POST /api/automation/analyze-message`

**Authentication:** Required (User)

**Request Body:**
```json
{
  "message": "Hey what's up"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "score": 0.65,
    "suggestions": [
      "Consider adding a question to encourage conversation",
      "Make your message more personal by referencing their profile",
      "Include more details to make your message more engaging"
    ],
    "improvedVersions": [
      "Hey! I saw you like hiking - what's your favorite trail?",
      "Hey! How's your day going? I'd love to hear more about your interests."
    ],
    "analysis": {
      "length_score": 0.5,
      "engagement_score": 0.6,
      "tone_analysis": {
        "casual": 0.8,
        "friendly": 0.6,
        "flirty": 0.1,
        "formal": 0.0,
        "playful": 0.3
      },
      "question_count": 0,
      "has_emoji": false,
      "word_count": 3,
      "character_count": 13,
      "readability": 0.8,
      "personalization": 0.4
    }
  }
}
```

**Score Ranges:**
- `0.0 - 0.4`: Poor - Needs significant improvement
- `0.4 - 0.6`: Fair - Could be better
- `0.6 - 0.8`: Good - Solid message
- `0.8 - 1.0`: Excellent - Highly effective

---

### Rewrite Message in Different Tone

Rewrite a message to match a desired tone while preserving meaning.

**Endpoint:** `POST /api/automation/rewrite-message`

**Authentication:** Required (User)

**Request Body:**
```json
{
  "message": "Hey, want to meet up sometime?",
  "targetTone": "flirty"
}
```

**Supported Tones:**
- `casual` - Relaxed and natural
- `flirty` - Charming and romantic
- `friendly` - Warm and approachable
- `formal` - Professional and polished
- `playful` - Fun and lighthearted

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "original": "Hey, want to meet up sometime?",
    "targetTone": "flirty",
    "rewrites": [
      "Hey there! I'd love to see that smile in person. Coffee this week? ☕",
      "So when can I take you out for that drink we've been talking about? 😊",
      "I've been thinking it would be fun to meet up. How about we grab dinner soon?"
    ]
  }
}
```

---

## Icebreaker Endpoints

### Generate Icebreakers

Generate AI-powered icebreaker messages for a new match.

**Endpoint:** `POST /api/automation/icebreakers`

**Authentication:** Required (User)

**Request Body:**
```json
{
  "matchUserId": "user-789",
  "matchId": "match-123",
  "tone": "casual",
  "includeEmoji": true
}
```

**Tone Options:**
- `casual` (default)
- `friendly`
- `playful`
- `flirty`
- `sincere`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": "ice-1",
        "message": "I noticed we both love hiking! What got you into it? 🏔️",
        "category": "question",
        "tone": "casual",
        "score": 0.92,
        "reasoning": "Based on shared interest: hiking"
      },
      {
        "id": "ice-2",
        "message": "Your photos from Yosemite are amazing! I've been dying to go there.",
        "category": "compliment",
        "tone": "casual",
        "score": 0.88,
        "reasoning": "Based on profile photos"
      },
      {
        "id": "ice-3",
        "message": "Hey! I saw you're into photography too. What's your favorite subject to shoot?",
        "category": "question",
        "tone": "casual",
        "score": 0.85,
        "reasoning": "Based on shared interest: photography"
      }
    ],
    "generatedAt": "2024-01-15T10:00:00Z",
    "expiresAt": "2024-01-16T10:00:00Z",
    "metadata": {
      "matchScore": 0.87,
      "sharedInterests": ["hiking", "photography", "travel"]
    }
  }
}
```

---

### Mark Icebreaker as Used

Mark an icebreaker as used to track usage and prevent duplicate suggestions.

**Endpoint:** `POST /api/automation/icebreakers/:suggestionId/mark-used`

**Authentication:** Required (User)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Icebreaker marked as used"
}
```

---

## System Endpoints

### Health Check

Check if the service is running and healthy.

**Endpoint:** `GET /health`

**Authentication:** Not required

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "service": "automation-service",
  "timestamp": "2024-01-15T10:00:00Z",
  "connections": {
    "socket": 42,
    "rabbitmq": true
  }
}
```

---

### Readiness Check

Check if the service is ready to accept requests (all dependencies available).

**Endpoint:** `GET /ready`

**Authentication:** Not required

**Response:** `200 OK`
```json
{
  "status": "ready",
  "service": "automation-service"
}
```

**Response (Not Ready):** `503 Service Unavailable`
```json
{
  "status": "not ready",
  "reason": "RabbitMQ not connected"
}
```

---

### Service Information

Get information about the service and available features.

**Endpoint:** `GET /`

**Authentication:** Not required

**Response:** `200 OK`
```json
{
  "service": "Flamoral Messaging Automation Service",
  "version": "1.0.0",
  "status": "running",
  "features": [
    "Auto-response templates",
    "Message scheduling",
    "Smart reply suggestions",
    "Conversation starters",
    "Icebreaker generation",
    "Message timing optimization"
  ],
  "endpoints": {
    "health": "/health",
    "ready": "/ready",
    "api": "/api/automation"
  }
}
```

---

## WebSocket API

### Connection

Connect to the WebSocket server with JWT authentication.

```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3013', {
  auth: {
    token: 'your-jwt-token'
  },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected to automation service');
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
});
```

---

### Events

#### connected
Emitted when the client successfully connects.

```javascript
socket.on('connected', (data) => {
  console.log('Connection confirmed:', data);
  // data: {
  //   socketId: string,
  //   userId: string,
  //   timestamp: string
  // }
});
```

---

#### message:suggestion
Emitted when new message suggestions are available.

```javascript
socket.on('message:suggestion', (data) => {
  console.log('New message suggestion:', data);
  // data: {
  //   conversationId: string,
  //   suggestions: Array<Suggestion>,
  //   timestamp: string
  // }
});
```

---

#### icebreaker:available
Emitted when icebreakers are generated for a match.

```javascript
socket.on('icebreaker:available', (data) => {
  console.log('Icebreakers ready:', data);
  // data: {
  //   matchId: string,
  //   matchUserId: string,
  //   timestamp: string
  // }
});
```

---

#### smart_reply:suggestions
Emitted when smart reply suggestions are generated.

```javascript
socket.on('smart_reply:suggestions', (data) => {
  console.log('Smart replies:', data);
  // data: {
  //   conversationId: string,
  //   suggestions: Array<SmartReplySuggestion>,
  //   timestamp: string
  // }
});
```

---

#### scheduled_message:notification
Emitted when a scheduled message is sent.

```javascript
socket.on('scheduled_message:notification', (data) => {
  console.log('Scheduled message sent:', data);
  // data: {
  //   scheduleId: string,
  //   recipientId: string,
  //   sentAt: string,
  //   timestamp: string
  // }
});
```

---

#### automation:status
Emitted when automation status changes.

```javascript
socket.on('automation:status', (data) => {
  console.log('Automation status:', data);
  // data: {
  //   feature: string,
  //   status: string,
  //   message: string,
  //   timestamp: string
  // }
});
```

---

## Error Responses

All endpoints follow a consistent error response format.

### 400 Bad Request
```json
{
  "error": "Recipient ID and message are required"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Invalid service API key"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to generate smart replies"
}
```

---

## Rate Limits

Default rate limits per user (configurable via environment variables):

- **Automation actions**: 10 per day
- **Scheduled messages**: 5 per day
- **AI requests**: 20 per hour
- **API requests**: 100 per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1610000000
```

---

## Pagination

Endpoints that return lists support pagination:

```http
GET /api/automation/scheduled-messages?limit=20&offset=40
```

Response includes pagination metadata:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 40,
    "total": 150,
    "hasMore": true
  }
}
```

---

## Filtering

List endpoints support filtering:

```http
GET /api/automation/scheduled-messages?status=pending&timezone=America/New_York
```

---

## Sorting

List endpoints support sorting:

```http
GET /api/automation/scheduled-messages?sort=scheduledAt&order=desc
```

---

## API Versioning

The API uses URL versioning:

- Current version: `/api/automation/...`
- Future versions: `/api/v2/automation/...`

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3013/api/automation',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Generate smart replies
const replies = await client.post('/smart-replies', {
  conversationId: 'conv-123',
  lastMessage: 'How are you?',
  conversationHistory: []
});

// Schedule message
const schedule = await client.post('/schedule-message', {
  recipientId: 'user-456',
  message: 'Hey! How was your weekend?',
  useOptimalTiming: true
});
```

### Python

```python
import requests

headers = {'Authorization': f'Bearer {token}'}
base_url = 'http://localhost:3013/api/automation'

# Generate icebreakers
response = requests.post(
    f'{base_url}/icebreakers',
    headers=headers,
    json={
        'matchUserId': 'user-789',
        'matchId': 'match-123',
        'tone': 'casual'
    }
)

icebreakers = response.json()
```

---

## Postman Collection

A complete Postman collection is available at:
`/docs/Flamoral-Automation-Service.postman_collection.json`

Import this into Postman for easy API testing.

---

## Support

For API support or questions:
- Email: api-support@flamoral.com
- Documentation: https://docs.flamoral.com/automation-service
- Status Page: https://status.flamoral.com

---

**API Version:** 1.0.0
**Last Updated:** January 2024
**Maintained by:** Flamoral Engineering Team
