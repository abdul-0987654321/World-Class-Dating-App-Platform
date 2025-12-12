# Messaging Architecture

## Overview

The Flamoral Dating Platform messaging system provides a real-time, secure, and feature-rich communication experience similar to WeChat and WhatsApp. Built on a microservices architecture, it supports 1-to-1 messaging with rich media, virtual gifts, and comprehensive moderation.

## High-Level Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │     │  Mobile Client  │     │   Admin Panel   │
│  (React/Next)   │     │  (React Native) │     │    (React)      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │      API Gateway        │
                    │   (Kong / Azure APIM)   │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌────────┴────────┐    ┌────────┴────────┐    ┌────────┴────────┐
│  Auth Service   │    │Messaging Service│    │  User Service   │
│    (JWT/OAuth)  │    │  (Socket.IO)    │    │   (Profiles)    │
└─────────────────┘    └────────┬────────┘    └─────────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
┌────────┴────────┐   ┌────────┴────────┐   ┌────────┴────────┐
│  Payment Svc    │   │ Moderation Svc  │   │ Notification Svc│
│ (Coins/Gifts)   │   │ (AI + Rules)    │   │  (Push/Email)   │
└─────────────────┘   └─────────────────┘   └─────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │      Data Layer       │
                    │                       │
         ┌──────────┴──────────┬───────────┴──────────┐
         │                     │                      │
┌────────┴────────┐  ┌────────┴────────┐   ┌────────┴────────┐
│    Cosmos DB    │  │   PostgreSQL    │   │      Redis      │
│   (Messages)    │  │   (Metadata)    │   │  (Cache/Pub-Sub)│
└─────────────────┘  └─────────────────┘   └─────────────────┘
```

## Data Models

### Message

```typescript
interface Message {
  id: string;                    // UUID v4
  conversationId: string;        // Reference to conversation
  senderId: string;              // User who sent the message
  receiverId: string;            // User who receives the message
  content: string;               // Message text or media URL
  type: MessageType;             // text, image, video, audio, file, gif, gift
  status: MessageStatus;         // sent, delivered, read, failed
  sentAt: Date;                  // When message was sent
  deliveredAt?: Date;            // When delivered to recipient
  readAt?: Date;                 // When read by recipient
  editedAt?: Date;               // Last edit timestamp
  isDeleted: boolean;            // Soft delete flag
  deletedAt?: Date;              // Deletion timestamp
  replyToId?: string;            // ID of message being replied to
  reactions?: MessageReaction[]; // User reactions (emoji)
  metadata?: MessageMetadata;    // Type-specific data
}

type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'gif' | 'gift';
type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';
```

### Conversation

```typescript
interface Conversation {
  id: string;                    // UUID v4
  participantIds: string[];      // Array of 2 user IDs
  status: ConversationStatus;    // active, archived, blocked, deleted
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last update timestamp
  lastMessageAt?: Date;          // Last message timestamp
  lastMessagePreview?: string;   // Truncated last message
  unreadCounts: Record<string, number>; // Unread per participant
  settings: ConversationSettings;
  encryptionInfo?: EncryptionInfo;
}

type ConversationStatus = 'active' | 'archived' | 'blocked' | 'deleted';

interface ConversationSettings {
  muteUntil?: Date;              // Mute notifications until
  customNotificationSound?: string;
  pinnedAt?: Date;               // Pin conversation to top
}
```

### Virtual Gift

```typescript
interface VirtualGift {
  id: string;                    // e.g., 'rose', 'diamond'
  name: string;                  // Display name
  emoji: string;                 // Visual representation
  price: number;                 // Cost in coins
  category: GiftCategory;        // basic, premium, luxury
  description: string;           // Gift description
  animationUrl?: string;         // Animation for gift display
  isActive: boolean;             // Available for purchase
  createdAt: Date;
}

type GiftCategory = 'basic' | 'premium' | 'luxury';

interface GiftTransaction {
  id: string;
  senderId: string;
  receiverId: string;
  giftId: string;
  conversationId: string;
  coinsSpent: number;
  creatorShare: number;          // 70% goes to receiver
  platformShare: number;         // 30% platform fee
  status: TransactionStatus;
  createdAt: Date;
}
```

### Moderation

```typescript
interface ModerationResult {
  isAllowed: boolean;
  flags: ModerationFlag[];
  action: 'allow' | 'flag' | 'block' | 'auto_block';
  reason?: string;
  confidence: number;            // 0-1 confidence score
}

interface ModerationFlag {
  type: FlagType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: string;
}

type FlagType =
  | 'spam'
  | 'harassment'
  | 'scam'
  | 'explicit'
  | 'personal_info'
  | 'prohibited_content'
  | 'link';

interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  conversationId: string;
  messageIds?: string[];
  reason: ReportReason;
  details?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  resolution?: string;
}

type ReportReason =
  | 'harassment'
  | 'spam'
  | 'scam'
  | 'inappropriate_content'
  | 'impersonation'
  | 'threats'
  | 'underage'
  | 'solicitation'
  | 'other';
```

## WebSocket Events

### Client to Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `message:send` | `{ conversationId, content, type, metadata?, replyToId? }` | Send a message |
| `message:read` | `{ conversationId, messageIds }` | Mark messages as read |
| `message:delete` | `{ messageId }` | Delete a message |
| `typing:start` | `{ conversationId }` | User started typing |
| `typing:stop` | `{ conversationId }` | User stopped typing |
| `conversation:join` | `{ conversationId }` | Join a conversation room |
| `conversation:leave` | `{ conversationId }` | Leave a conversation room |
| `presence:update` | `{ status }` | Update online status |
| `reaction:add` | `{ messageId, emoji }` | Add reaction to message |
| `reaction:remove` | `{ messageId, emoji }` | Remove reaction |

### Server to Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `message:new` | `Message` | New message received |
| `message:delivered` | `{ messageId, deliveredAt }` | Message delivered |
| `message:read` | `{ messageIds, readAt }` | Messages read by recipient |
| `message:deleted` | `{ messageId, deletedBy }` | Message was deleted |
| `typing:indicator` | `{ conversationId, userId, isTyping }` | Typing status |
| `user:online` | `{ userId }` | User came online |
| `user:offline` | `{ userId, lastSeen }` | User went offline |
| `gift:received` | `{ gift, senderId, conversationId }` | Virtual gift received |
| `reaction:update` | `{ messageId, reactions }` | Reactions updated |
| `error` | `{ code, message }` | Error occurred |

## Sequence Diagrams

### Send Message Flow

```
┌────────┐     ┌─────────────┐     ┌───────────────┐     ┌───────────┐     ┌────────┐
│ Sender │     │ WebSocket   │     │ Messaging Svc │     │ Moderation│     │Receiver│
└───┬────┘     └──────┬──────┘     └───────┬───────┘     └─────┬─────┘     └───┬────┘
    │                 │                    │                   │               │
    │ message:send    │                    │                   │               │
    │────────────────>│                    │                   │               │
    │                 │ processMessage()   │                   │               │
    │                 │───────────────────>│                   │               │
    │                 │                    │ moderateContent() │               │
    │                 │                    │──────────────────>│               │
    │                 │                    │                   │               │
    │                 │                    │<─ moderation result               │
    │                 │                    │                   │               │
    │                 │                    │ [if allowed]      │               │
    │                 │                    │ saveMessage()     │               │
    │                 │                    │───────────┐       │               │
    │                 │                    │<──────────┘       │               │
    │                 │                    │                   │               │
    │                 │<── message:new ────│                   │               │
    │<── confirmation │                    │                   │               │
    │                 │                    │                   │               │
    │                 │                    │ message:new       │               │
    │                 │─────────────────────────────────────────────────────>│
    │                 │                    │                   │               │
    │                 │<── message:delivered ──────────────────────────────────│
    │<── delivered ───│                    │                   │               │
    │                 │                    │                   │               │
```

### Send Virtual Gift Flow

```
┌────────┐     ┌─────────────┐     ┌───────────────┐     ┌───────────┐     ┌────────┐
│ Sender │     │  API/Socket │     │ Messaging Svc │     │Payment Svc│     │Receiver│
└───┬────┘     └──────┬──────┘     └───────┬───────┘     └─────┬─────┘     └───┬────┘
    │                 │                    │                   │               │
    │ POST /gifts/send│                    │                   │               │
    │────────────────>│                    │                   │               │
    │                 │ sendGift()         │                   │               │
    │                 │───────────────────>│                   │               │
    │                 │                    │ validateGift()    │               │
    │                 │                    │───────────┐       │               │
    │                 │                    │<──────────┘       │               │
    │                 │                    │                   │               │
    │                 │                    │ deductCoins()     │               │
    │                 │                    │──────────────────>│               │
    │                 │                    │<── success ───────│               │
    │                 │                    │                   │               │
    │                 │                    │ creditCreator()   │               │
    │                 │                    │──────────────────>│               │
    │                 │                    │<── success ───────│               │
    │                 │                    │                   │               │
    │                 │                    │ createMessage()   │               │
    │                 │                    │───────────┐       │               │
    │                 │                    │<──────────┘       │               │
    │                 │                    │                   │               │
    │<── gift sent ───│                    │                   │               │
    │                 │                    │                   │               │
    │                 │                    │ gift:received     │               │
    │                 │─────────────────────────────────────────────────────>│
    │                 │                    │                   │               │
```

### Message Moderation Flow

```
┌─────────────┐     ┌───────────────┐     ┌──────────────┐     ┌─────────────┐
│Message Input│     │ Chat Mod Svc  │     │ AI Mod Svc   │     │Rule Engine  │
└──────┬──────┘     └───────┬───────┘     └──────┬───────┘     └──────┬──────┘
       │                    │                    │                    │
       │ moderateMessage()  │                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │                    │ checkSpamRate()    │                    │
       │                    │─────────────────────────────────────────>│
       │                    │<── spam result ────────────────────────│
       │                    │                    │                    │
       │                    │ checkScamPatterns()│                    │
       │                    │─────────────────────────────────────────>│
       │                    │<── scam result ────────────────────────│
       │                    │                    │                    │
       │                    │ checkPersonalInfo()│                    │
       │                    │─────────────────────────────────────────>│
       │                    │<── info result ────────────────────────│
       │                    │                    │                    │
       │                    │ analyzeContent()   │                    │
       │                    │───────────────────>│                    │
       │                    │<── AI analysis ────│                    │
       │                    │                    │                    │
       │                    │ determineAction()  │                    │
       │                    │───────────┐        │                    │
       │                    │<──────────┘        │                    │
       │                    │                    │                    │
       │<── ModerationResult│                    │                    │
       │                    │                    │                    │
```

## Technology Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **WebSocket**: Socket.IO 4.x
- **Message Queue**: Azure Service Bus / Redis Pub/Sub
- **Databases**:
  - Cosmos DB (MongoDB API) - Messages
  - PostgreSQL - Metadata, Users
  - Redis - Caching, Presence, Sessions

### Frontend
- **Web**: React 18+ with Next.js
- **Mobile**: React Native with Expo
- **State**: React Query + Zustand
- **Styling**: Tailwind CSS (Web), NativeWind (Mobile)

### Infrastructure
- **Cloud**: Microsoft Azure
- **Container**: Docker + Azure Kubernetes Service
- **CDN**: Azure CDN for media
- **Storage**: Azure Blob Storage for media files

## Security Considerations

### Authentication & Authorization
- JWT tokens with refresh mechanism
- Conversation-level access validation
- Rate limiting per user and IP

### Content Security
- Real-time content moderation
- Scam and spam detection
- Personal information filtering
- Link validation

### Data Protection
- TLS 1.3 for all connections
- End-to-end encryption ready (key exchange interfaces)
- Secure media URL generation with expiry
- GDPR-compliant data handling

## Performance Optimizations

### Message Delivery
- Connection pooling for database
- Redis caching for active conversations
- Message batching for read receipts
- Lazy loading for message history

### Scalability
- Horizontal scaling with sticky sessions
- Redis-based Socket.IO adapter
- Database sharding by conversation ID
- CDN for static assets and media

## Monitoring & Observability

### Metrics
- Message delivery latency
- WebSocket connection count
- Error rates by type
- Moderation action rates

### Logging
- Structured JSON logging
- Correlation IDs for tracing
- Audit logs for moderation

### Alerts
- High error rates
- Delivery delays
- System resource thresholds
