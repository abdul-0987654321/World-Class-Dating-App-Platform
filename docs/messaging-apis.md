# Messaging API Reference

## Base URL
```
Production: https://api.flamoral.com/messaging
Staging: https://api-staging.flamoral.com/messaging
Local: http://localhost:3003/api
```

## Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## Conversations

### List Conversations
Get all conversations for the authenticated user.

**Endpoint:** `GET /conversations`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max 50) |
| status | string | active | Filter by status: active, archived, all |

**Request:**
```bash
curl -X GET "https://api.flamoral.com/messaging/conversations?page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv-123e4567-e89b-12d3",
      "participantIds": ["user-1", "user-2"],
      "otherParticipant": {
        "id": "user-2",
        "name": "Jane Doe",
        "photoUrl": "https://cdn.flamoral.com/photos/user-2.jpg",
        "isOnline": true,
        "lastSeen": null
      },
      "status": "active",
      "lastMessage": {
        "content": "Hey, how are you?",
        "sentAt": "2024-01-15T10:30:00Z",
        "senderId": "user-2"
      },
      "unreadCount": 3,
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### Create Conversation
Start a new conversation with another user.

**Endpoint:** `POST /conversations`

**Request Body:**
```json
{
  "participantId": "user-2"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "conversation": {
    "id": "conv-789e1234-a56b-78c9",
    "participantIds": ["user-1", "user-2"],
    "status": "active",
    "createdAt": "2024-01-15T10:35:00Z",
    "updatedAt": "2024-01-15T10:35:00Z",
    "unreadCounts": {
      "user-1": 0,
      "user-2": 0
    }
  }
}
```

**Error Response (409 Conflict):**
```json
{
  "success": false,
  "error": "Conversation already exists",
  "existingConversationId": "conv-existing-id"
}
```

---

### Get Conversation
Get details of a specific conversation.

**Endpoint:** `GET /conversations/:conversationId`

**Response (200 OK):**
```json
{
  "success": true,
  "conversation": {
    "id": "conv-123e4567-e89b-12d3",
    "participantIds": ["user-1", "user-2"],
    "participants": [
      {
        "id": "user-1",
        "name": "John Smith",
        "photoUrl": "https://cdn.flamoral.com/photos/user-1.jpg"
      },
      {
        "id": "user-2",
        "name": "Jane Doe",
        "photoUrl": "https://cdn.flamoral.com/photos/user-2.jpg"
      }
    ],
    "status": "active",
    "createdAt": "2024-01-10T08:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "settings": {
      "muteUntil": null,
      "pinnedAt": null
    }
  }
}
```

---

### Archive Conversation
Archive a conversation.

**Endpoint:** `PUT /conversations/:conversationId/archive`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Conversation archived"
}
```

---

### Delete Conversation
Delete a conversation (soft delete, can be recovered).

**Endpoint:** `DELETE /conversations/:conversationId`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Conversation deleted"
}
```

---

## Messages

### Get Messages
Get messages in a conversation with pagination.

**Endpoint:** `GET /conversations/:conversationId/messages`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | Messages per page (max 100) |
| before | string | - | Get messages before this message ID |
| after | string | - | Get messages after this message ID |

**Request:**
```bash
curl -X GET "https://api.flamoral.com/messaging/conversations/conv-123/messages?limit=50" \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg-abc123",
      "conversationId": "conv-123",
      "senderId": "user-1",
      "receiverId": "user-2",
      "content": "Hello! How are you?",
      "type": "text",
      "status": "read",
      "sentAt": "2024-01-15T10:00:00Z",
      "deliveredAt": "2024-01-15T10:00:05Z",
      "readAt": "2024-01-15T10:05:00Z",
      "reactions": [
        {
          "emoji": "❤️",
          "userId": "user-2",
          "createdAt": "2024-01-15T10:06:00Z"
        }
      ]
    },
    {
      "id": "msg-def456",
      "conversationId": "conv-123",
      "senderId": "user-2",
      "receiverId": "user-1",
      "content": "https://cdn.flamoral.com/media/image-123.jpg",
      "type": "image",
      "status": "read",
      "sentAt": "2024-01-15T10:10:00Z",
      "metadata": {
        "width": 1200,
        "height": 800,
        "thumbnailUrl": "https://cdn.flamoral.com/media/thumb-123.jpg"
      }
    }
  ],
  "hasMore": true,
  "oldestMessageId": "msg-abc123"
}
```

---

### Send Message
Send a new message in a conversation.

**Endpoint:** `POST /messages`

**Request Body (Text Message):**
```json
{
  "conversationId": "conv-123",
  "content": "Hello! Nice to meet you.",
  "type": "text"
}
```

**Request Body (Reply to Message):**
```json
{
  "conversationId": "conv-123",
  "content": "I agree!",
  "type": "text",
  "replyToId": "msg-original-id"
}
```

**Request Body (Image Message):**
```json
{
  "conversationId": "conv-123",
  "content": "https://cdn.flamoral.com/media/image-123.jpg",
  "type": "image",
  "metadata": {
    "width": 1200,
    "height": 800,
    "thumbnailUrl": "https://cdn.flamoral.com/media/thumb-123.jpg"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": {
    "id": "msg-new123",
    "conversationId": "conv-123",
    "senderId": "user-1",
    "receiverId": "user-2",
    "content": "Hello! Nice to meet you.",
    "type": "text",
    "status": "sent",
    "sentAt": "2024-01-15T11:00:00Z"
  }
}
```

**Error Response (400 - Content Blocked):**
```json
{
  "success": false,
  "error": "Message blocked by content moderation",
  "moderationResult": {
    "action": "block",
    "reason": "Content policy violation",
    "flags": [
      {
        "type": "personal_info",
        "severity": "medium",
        "details": "Message may contain personal information"
      }
    ]
  }
}
```

---

### Update Message
Edit a message (only text messages, within time limit).

**Endpoint:** `PUT /messages/:messageId`

**Request Body:**
```json
{
  "content": "Updated message content"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": {
    "id": "msg-abc123",
    "content": "Updated message content",
    "editedAt": "2024-01-15T11:05:00Z"
  }
}
```

---

### Delete Message
Delete a message.

**Endpoint:** `DELETE /messages/:messageId`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| deleteForAll | boolean | false | Delete for all participants |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Message deleted"
}
```

---

### Add Reaction
Add an emoji reaction to a message.

**Endpoint:** `POST /messages/:messageId/reactions`

**Request Body:**
```json
{
  "emoji": "❤️"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "reactions": [
    {
      "emoji": "❤️",
      "userId": "user-1",
      "createdAt": "2024-01-15T11:10:00Z"
    }
  ]
}
```

---

### Remove Reaction
Remove a reaction from a message.

**Endpoint:** `DELETE /messages/:messageId/reactions/:emoji`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Reaction removed"
}
```

---

## Virtual Gifts

### Get Gift Catalog
Get all available virtual gifts.

**Endpoint:** `GET /gifts`

**Response (200 OK):**
```json
{
  "success": true,
  "gifts": [
    {
      "id": "rose",
      "name": "Rose",
      "emoji": "🌹",
      "price": 5,
      "category": "basic",
      "description": "A beautiful red rose to show you care",
      "isActive": true
    },
    {
      "id": "diamond",
      "name": "Diamond",
      "emoji": "💎",
      "price": 500,
      "category": "luxury",
      "description": "A dazzling diamond for someone truly special",
      "isActive": true
    }
  ],
  "categories": {
    "basic": [/* basic gifts */],
    "premium": [/* premium gifts */],
    "luxury": [/* luxury gifts */]
  }
}
```

---

### Send Gift
Send a virtual gift to another user.

**Endpoint:** `POST /gifts/send`

**Request Body:**
```json
{
  "conversationId": "conv-123",
  "giftId": "rose",
  "message": "For you! 💕"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": {
    "id": "msg-gift-123",
    "conversationId": "conv-123",
    "senderId": "user-1",
    "receiverId": "user-2",
    "content": "For you! 💕",
    "type": "gift",
    "status": "sent",
    "sentAt": "2024-01-15T12:00:00Z",
    "metadata": {
      "gift": {
        "id": "rose",
        "name": "Rose",
        "emoji": "🌹",
        "price": 5
      },
      "transactionId": "txn-abc123"
    }
  }
}
```

**Error Response (400 - Insufficient Coins):**
```json
{
  "success": false,
  "error": "Insufficient coins",
  "required": 5,
  "available": 3
}
```

---

### Get Gift History
Get user's gift transaction history.

**Endpoint:** `GET /gifts/history`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| type | string | all | Filter: sent, received, all |
| limit | number | 50 | Items per page |

**Response (200 OK):**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "txn-abc123",
      "senderId": "user-1",
      "receiverId": "user-2",
      "giftId": "rose",
      "coinsSpent": 5,
      "createdAt": "2024-01-15T12:00:00Z",
      "gift": {
        "id": "rose",
        "name": "Rose",
        "emoji": "🌹",
        "price": 5,
        "category": "basic"
      }
    }
  ]
}
```

---

### Get Gift Stats
Get user's gift statistics.

**Endpoint:** `GET /gifts/stats`

**Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "totalSent": 25,
    "totalReceived": 42,
    "coinsSpent": 150,
    "coinsEarned": 294,
    "mostSentGift": {
      "giftId": "rose",
      "count": 15
    },
    "mostReceivedGift": {
      "giftId": "heart",
      "count": 20
    }
  }
}
```

---

## Moderation

### Report Content
Report a message or conversation for review.

**Endpoint:** `POST /moderation/report`

**Request Body:**
```json
{
  "conversationId": "conv-123",
  "messageIds": ["msg-abc123", "msg-def456"],
  "reason": "harassment",
  "details": "User is sending unwanted messages"
}
```

**Valid Reasons:**
- `harassment`
- `spam`
- `scam`
- `inappropriate_content`
- `impersonation`
- `threats`
- `underage`
- `solicitation`
- `other`

**Response (200 OK):**
```json
{
  "success": true,
  "reportId": "report-xyz789",
  "message": "Report submitted successfully. Our team will review it within 24 hours."
}
```

---

### Block User
Block a user from messaging you.

**Endpoint:** `POST /moderation/block`

**Request Body:**
```json
{
  "userId": "user-2",
  "conversationId": "conv-123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User blocked successfully. They will no longer be able to contact you."
}
```

---

### Unblock User
Unblock a previously blocked user.

**Endpoint:** `DELETE /moderation/block/:userId`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User unblocked successfully."
}
```

---

### Get Blocked Users
Get list of blocked users.

**Endpoint:** `GET /moderation/blocked`

**Response (200 OK):**
```json
{
  "success": true,
  "blockedUsers": [
    {
      "userId": "user-blocked-1",
      "blockedAt": "2024-01-10T08:00:00Z",
      "user": {
        "id": "user-blocked-1",
        "name": "Blocked User",
        "photoUrl": "https://cdn.flamoral.com/photos/blocked.jpg"
      }
    }
  ]
}
```

---

### Check Block Status
Check if messaging is blocked between two users.

**Endpoint:** `GET /moderation/check/:userId`

**Response (200 OK):**
```json
{
  "success": true,
  "isBlocked": false
}
```

---

### Get Safety Tips
Get safety tips for users.

**Endpoint:** `GET /moderation/safety-tips`

**Response (200 OK):**
```json
{
  "success": true,
  "tips": {
    "general": [
      "Never share personal financial information",
      "Meet in public places for first dates",
      "Tell a friend where you're going",
      "Trust your instincts - if something feels off, it probably is",
      "Take your time getting to know someone before meeting in person"
    ],
    "spotScams": [
      "Be wary of profiles that seem too good to be true",
      "Watch out for requests for money, no matter the reason",
      "Be cautious of people who avoid video calls or meeting in person",
      "Don't click on suspicious links",
      "Report users who ask you to move to other platforms immediately"
    ],
    "reporting": [
      "You can report any user from their profile or chat",
      "Reports are reviewed by our safety team within 24 hours",
      "You can block any user at any time",
      "Your reports are confidential and help keep our community safe"
    ]
  }
}
```

---

## Media Upload

### Upload Media
Upload media files for messages.

**Endpoint:** `POST /media/upload`

**Request:**
```bash
curl -X POST "https://api.flamoral.com/messaging/media/upload" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@image.jpg" \
  -F "type=image"
```

**Response (200 OK):**
```json
{
  "success": true,
  "media": {
    "id": "media-123",
    "url": "https://cdn.flamoral.com/media/image-123.jpg",
    "thumbnailUrl": "https://cdn.flamoral.com/media/thumb-123.jpg",
    "type": "image",
    "mimeType": "image/jpeg",
    "size": 245760,
    "width": 1200,
    "height": 800
  }
}
```

---

## WebSocket Connection

### Connect
Connect to the WebSocket server for real-time messaging.

**URL:** `wss://api.flamoral.com/messaging`

**Query Parameters:**
```
?token=<jwt_token>
```

**Connection Example (JavaScript):**
```javascript
import { io } from 'socket.io-client';

const socket = io('wss://api.flamoral.com/messaging', {
  auth: {
    token: 'your-jwt-token'
  },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Connected to messaging server');
});

socket.on('message:new', (message) => {
  console.log('New message:', message);
});

// Send a message
socket.emit('message:send', {
  conversationId: 'conv-123',
  content: 'Hello!',
  type: 'text'
});

// Join a conversation room
socket.emit('conversation:join', {
  conversationId: 'conv-123'
});

// Send typing indicator
socket.emit('typing:start', {
  conversationId: 'conv-123'
});
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Invalid or missing authentication |
| FORBIDDEN | 403 | Not authorized to access resource |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| RATE_LIMITED | 429 | Too many requests |
| CONTENT_BLOCKED | 400 | Message blocked by moderation |
| INSUFFICIENT_COINS | 400 | Not enough coins for gift |
| USER_BLOCKED | 403 | Cannot message blocked user |
| CONVERSATION_BLOCKED | 403 | Conversation is blocked |
| SERVER_ERROR | 500 | Internal server error |

**Error Response Format:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Send Message | 10/minute per conversation |
| Upload Media | 20/hour |
| Send Gift | 50/day |
| Report | 10/day |
| API General | 100/minute |

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705320000
```
