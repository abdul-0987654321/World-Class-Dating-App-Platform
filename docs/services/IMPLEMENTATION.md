# Messaging Automation Service - Implementation Guide

## Overview

The Messaging Automation Service is a production-ready microservice that provides intelligent message automation capabilities for the Flamoral Dating Platform. It leverages AI, real-time WebSockets, and event-driven architecture to enhance user messaging experience.

## Architecture

### Service Components

```
automation-service/
├── src/
│   ├── config/                    # Configuration management
│   │   └── index.ts              # Centralized config
│   ├── controllers/               # Request handlers
│   │   ├── message-automation.controller.ts
│   │   └── smart-reply.controller.ts
│   ├── services/                  # Business logic
│   │   ├── message-automation.service.ts    # Auto-responses & scheduling
│   │   ├── smart-reply.service.ts           # AI-powered suggestions
│   │   ├── icebreaker.service.ts            # Icebreaker generation
│   │   ├── reply-assistant.service.ts       # Reply assistance
│   │   ├── workflow-engine.service.ts       # Workflow automation
│   │   ├── ghosting-detection.service.ts    # Conversation health
│   │   ├── scheduled-message.service.ts     # Message scheduling
│   │   └── service-client.ts                # HTTP client
│   ├── infrastructure/            # Infrastructure layer
│   │   ├── database/
│   │   │   └── knex.ts           # PostgreSQL connection
│   │   ├── cache/
│   │   │   └── redis.ts          # Redis caching
│   │   ├── messaging/
│   │   │   └── rabbitmq.ts       # RabbitMQ integration
│   │   └── websocket/
│   │       └── socket-manager.ts  # Socket.IO manager
│   ├── middleware/                # Express middleware
│   │   └── auth.middleware.ts    # Authentication
│   ├── routes/                    # API routes
│   │   └── index.ts              # Route definitions
│   ├── models/                    # Database models
│   │   ├── automation-flow.model.ts
│   │   ├── icebreaker.model.ts
│   │   ├── scheduled-message.model.ts
│   │   └── index.ts
│   ├── dtos/                      # Data transfer objects
│   │   ├── automation-flow.dto.ts
│   │   ├── conversation-automation.dto.ts
│   │   ├── icebreaker.dto.ts
│   │   ├── scheduled-message.dto.ts
│   │   └── index.ts
│   └── index.ts                   # Main entry point
├── k8s/                           # Kubernetes manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   ├── hpa.yaml
│   └── serviceaccount.yaml
├── migrations/                    # Database migrations
│   └── 001_create_message_automation_tables.sql
├── Dockerfile                     # Docker configuration
├── docker-compose.yml            # Local development setup
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── .env.example                  # Environment template
└── README.md                     # Documentation
```

## Key Features Implementation

### 1. Auto-Response Templates

**Location**: `src/services/message-automation.service.ts`

**Features**:
- Context-aware trigger matching
- Conditional responses based on time, sentiment, and conversation state
- Template personalization with user data
- Usage tracking and analytics

**API Endpoint**:
```typescript
POST /api/automation/auto-response
{
  "trigger": "hello",
  "response": "Hi {name}! {time}",
  "conditions": {
    "timeOfDay": ["9-17"],
    "conversationContext": "greeting"
  }
}
```

### 2. Message Scheduling

**Location**: `src/services/message-automation.service.ts`

**Features**:
- Schedule messages for specific times
- Optimal timing calculation based on recipient activity
- Timezone support
- Automatic retry on failure
- Cancellation support

**Implementation**:
```typescript
await messageAutomationService.scheduleMessage(
  userId,
  recipientId,
  message,
  {
    useOptimalTiming: true,
    timezone: 'America/New_York'
  }
);
```

**Cron Job**: Runs every minute to process due messages

### 3. Smart Reply Suggestions

**Location**: `src/services/smart-reply.service.ts`

**Features**:
- AI-powered reply generation using NLP service
- Context-aware suggestions based on conversation history
- Multiple tone options (casual, flirty, friendly, formal, playful)
- Fallback suggestions when AI is unavailable
- 5-minute caching for performance

**Integration with NLP Service**:
```typescript
const response = await axios.post(
  `${nlpServiceUrl}/api/v1/message-assistant/reply-suggestions`,
  {
    conversationHistory,
    tone: 'casual',
    count: 3
  }
);
```

### 4. Conversation Starters

**Location**: `src/services/smart-reply.service.ts`

**Features**:
- Profile-based personalization
- Interest matching
- Category classification (interest_based, profile_based, question)
- Relevance scoring
- 1-hour caching

**Flow**:
1. Fetch both user profiles
2. Find shared interests
3. Call NLP service for AI-generated starters
4. Cache results
5. Return prioritized suggestions

### 5. Icebreaker Generation

**Location**: `src/services/icebreaker.service.ts`

**Features**:
- OpenAI GPT-4 integration
- Profile compatibility analysis
- Multiple categories (question, compliment, observation)
- Confidence scoring
- Template fallbacks
- Database persistence with expiration

**AI Prompt Example**:
```typescript
const prompt = `You are a dating coach helping create personalized icebreaker messages.

User 1: ${user.firstName}, ${user.age}, interests: ${user.interests}
User 2: ${matchUser.firstName}, ${matchUser.age}, interests: ${matchUser.interests}
Shared interests: ${sharedInterests}

Generate 3 engaging icebreaker messages with tone: ${tone}
Format: JSON array with message, category, score, reasoning`;
```

### 6. Message Analysis

**Location**: `src/services/smart-reply.service.ts`

**Features**:
- Effectiveness scoring (0-1)
- Length analysis
- Engagement factors (questions, emojis, personal pronouns)
- Tone detection
- Readability scoring
- Personalization assessment
- Actionable improvement suggestions

**Scoring Factors**:
- Message length (ideal: 10-40 words)
- Questions present (+0.2)
- Emojis present (+0.1)
- Personal pronouns (+0.1)
- Readability (based on avg word length)

### 7. Message Rewriting

**Location**: `src/services/smart-reply.service.ts`

**Features**:
- Tone transformation
- Meaning preservation option
- Multiple variations
- Change analysis (length, tone shift)

**Supported Tones**:
- Casual
- Flirty
- Friendly
- Formal
- Playful

## Real-Time Features

### Socket.IO Integration

**Location**: `src/infrastructure/websocket/socket-manager.ts`

**Features**:
- JWT authentication middleware
- User room management
- Online status tracking
- Event broadcasting

**Events Emitted**:
- `connected` - Connection confirmation
- `message:suggestion` - New message suggestions
- `icebreaker:available` - Icebreakers ready
- `smart_reply:suggestions` - Smart replies available
- `scheduled_message:notification` - Scheduled message sent
- `automation:status` - Automation status updates

**Connection Example**:
```javascript
const socket = io('ws://localhost:3013', {
  auth: { token: 'jwt-token' }
});

socket.on('smart_reply:suggestions', (data) => {
  console.log('New suggestions:', data.suggestions);
});
```

### Read Receipts Tracking

**Database Table**: `message_read_receipts`

**Features**:
- Read timestamp tracking
- Delivery confirmation
- Unique constraint per message-user pair

### Typing Indicators

**Database Table**: `typing_indicators`

**Features**:
- Real-time typing status
- Auto-expiration (10 seconds)
- Per-conversation tracking
- Cleanup job for expired indicators

## Event-Driven Architecture

### RabbitMQ Integration

**Location**: `src/infrastructure/messaging/rabbitmq.ts`

**Features**:
- Auto-reconnection on failure
- Message persistence
- Fair dispatch (prefetch: 1)
- Dead letter queue support
- Exchange: `flamoral_events` (topic)

**Queues**:
- `match_events` - Match creation/updates
- `message_events` - Message activity
- `user_events` - User profile changes
- `automation_scheduled_messages` - Scheduled message queue
- `automation_icebreakers` - Icebreaker processing
- `automation_smart_replies` - Smart reply generation

**Event Handlers**:

```typescript
// Match created → Generate icebreakers
rabbitMQ.subscribe('match_events', async (event) => {
  if (event.type === 'match.created') {
    await socketManager.sendIcebreakerNotification(
      event.data.userId,
      { matchId: event.data.matchId }
    );
  }
});

// Message received → Check auto-response
rabbitMQ.subscribe('message_events', async (event) => {
  if (event.type === 'message.received') {
    const result = await messageAutomationService
      .processIncomingMessage(...);

    if (result.shouldAutoRespond) {
      await rabbitMQ.publish('message.send', {
        senderId: recipientId,
        recipientId: senderId,
        content: result.response,
        metadata: { automated: true }
      });
    }
  }
});
```

## Caching Strategy

### Redis Integration

**Location**: `src/infrastructure/cache/redis.ts`

**Cache Keys**:
- `auto_response:{userId}` - Auto-response templates (24h TTL)
- `smart_reply:{conversationId}:{messageHash}` - Smart replies (5min TTL)
- `conversation_starters:{userId}:{matchUserId}` - Starters (1h TTL)
- `icebreaker:{userId}:{matchUserId}` - Icebreakers (24h TTL)
- `user:{userId}:tone_preference` - User tone preference (1h TTL)
- `user:{userId}:online` - Online status (5min TTL)

**Cache Helper Methods**:
```typescript
await cache.get<T>(key);
await cache.set(key, value, ttlSeconds);
await cache.delete(key);
await cache.exists(key);
await cache.expire(key, ttlSeconds);
```

## Database Schema

### Key Tables

1. **scheduled_messages**
   - Stores scheduled messages
   - Status: pending, sent, failed, cancelled
   - Timezone support
   - Error tracking

2. **auto_response_templates**
   - User-defined templates
   - Trigger matching
   - Condition-based activation
   - Usage analytics

3. **message_templates**
   - Reusable templates
   - Category and tone classification
   - Public/private visibility
   - Rating system

4. **smart_reply_cache**
   - AI-generated suggestions
   - Conversation context
   - Expiration tracking

5. **conversation_starters_cache**
   - Profile-based starters
   - Match association
   - Usage tracking

6. **automation_analytics**
   - Feature usage tracking
   - Success/failure metrics
   - Error logging

7. **user_automation_preferences**
   - Per-user settings
   - Feature toggles
   - Quiet hours
   - Daily limits

8. **message_read_receipts**
   - Read status tracking
   - Delivery confirmation

9. **typing_indicators**
   - Real-time typing status
   - Auto-expiration

10. **message_effectiveness_scores**
    - Message analysis results
    - Improvement suggestions

### Migration

Run the migration:
```bash
psql -U postgres -d flamoral_automation -f migrations/001_create_message_automation_tables.sql
```

## Service Integration

### Internal Service Communication

**Service URLs** (configured via environment):
- User Service: `/api/internal/users/:userId`
- Matching Service: `/api/internal/matches/:matchId`
- Messaging Service: `/api/internal/messages/send`
- Analytics Service: `/api/internal/users/:userId/activity-patterns`
- NLP Service: `/api/v1/message-assistant/*`

**Authentication**:
- Service-to-service: `X-Service-API-Key` header
- User requests: `Authorization: Bearer <jwt>`

### NLP Service Integration

**Endpoints Used**:
- `POST /api/v1/message-assistant/reply-suggestions`
- `POST /api/v1/message-assistant/conversation-starters`
- `POST /api/v1/message-assistant/analyze-effectiveness`
- `POST /api/v1/message-assistant/rewrite`
- `POST /api/v1/analyze/context`

## Deployment

### Local Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f automation-service

# Stop services
docker-compose down
```

### Kubernetes Deployment

```bash
# Create namespace
kubectl create namespace flamoral

# Apply secrets (create these first)
kubectl apply -f k8s/secrets/

# Apply manifests
kubectl apply -f k8s/

# Verify deployment
kubectl get pods -n flamoral -l app=automation-service

# Check logs
kubectl logs -f deployment/automation-service -n flamoral

# Port forward for testing
kubectl port-forward svc/automation-service 3013:3013 -n flamoral
```

### Scaling

**Horizontal Pod Autoscaler** configured for:
- Min replicas: 2
- Max replicas: 10
- CPU target: 70%
- Memory target: 80%

**Manual scaling**:
```bash
kubectl scale deployment automation-service --replicas=5 -n flamoral
```

## Monitoring & Observability

### Health Checks

**Liveness Probe**:
- Path: `/health`
- Initial delay: 30s
- Period: 10s

**Readiness Probe**:
- Path: `/ready`
- Initial delay: 20s
- Period: 5s

### Metrics

Exposed at `/metrics` for Prometheus scraping:
- Request count and duration
- Active WebSocket connections
- Queue depth
- Cache hit/miss rates
- AI service call latency

### Logging

Structured JSON logs with:
- Service name
- Request ID
- User ID
- Event type
- Timestamp
- Error details

## Security

### Authentication

- JWT verification for user endpoints
- Service API key for internal calls
- Socket.IO token authentication

### Rate Limiting

Configured per user:
- Automation actions: 10/day
- Scheduled messages: 5/day
- AI requests: 20/hour

### Data Protection

- Sensitive data encrypted at rest
- TLS for all network communication
- Secrets managed via Kubernetes secrets
- No plaintext passwords in logs

## Testing

### Unit Tests

```bash
npm run test:unit
```

Test coverage for:
- Service logic
- Controller handlers
- Utility functions
- Cache operations

### Integration Tests

```bash
npm run test:integration
```

Test scenarios:
- End-to-end API flows
- WebSocket connections
- RabbitMQ event processing
- Database operations
- External service integration

### Manual Testing

```bash
# Test auto-response
curl -X POST http://localhost:3013/api/automation/auto-response \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"trigger":"hello","response":"Hi there!"}'

# Test smart replies
curl -X POST http://localhost:3013/api/automation/smart-replies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"123","lastMessage":"How are you?"}'
```

## Performance Optimization

### Caching Strategy

- Template data cached in Redis
- AI responses cached for 5 minutes
- Profile data cached for 1 hour
- Cache invalidation on updates

### Database Optimization

- Indexes on frequently queried columns
- Partial indexes for active records
- GIN indexes for JSONB columns
- Regular VACUUM and ANALYZE

### Connection Pooling

- PostgreSQL: 2-10 connections
- Redis: Persistent connection
- HTTP: Keep-alive enabled

## Troubleshooting

### Common Issues

1. **WebSocket connection fails**
   - Check JWT token validity
   - Verify CORS settings
   - Check firewall rules

2. **RabbitMQ not connecting**
   - Verify RabbitMQ is running
   - Check connection URL
   - Review credentials

3. **AI suggestions failing**
   - Verify OpenAI API key
   - Check NLP service availability
   - Review rate limits

4. **Messages not scheduling**
   - Check cron job is running
   - Verify database connectivity
   - Review message status

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

## Future Enhancements

- [ ] Multi-language support
- [ ] A/B testing for message templates
- [ ] Advanced sentiment analysis
- [ ] Conversation flow optimization
- [ ] Machine learning for optimal timing
- [ ] Voice message support
- [ ] GIF and sticker suggestions
- [ ] Template marketplace
- [ ] Advanced analytics dashboard
- [ ] Webhook support for custom integrations

## Conclusion

The Messaging Automation Service is a production-ready, scalable microservice that significantly enhances the messaging experience on the Flamoral Dating Platform. It leverages modern technologies and best practices to provide intelligent, real-time messaging features.

For questions or support, contact the development team.
