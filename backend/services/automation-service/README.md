# Automation Service

The Automation Service provides intelligent automation features for the Flamoral dating platform, including auto-DM flows, conversation automation, and scheduled messaging.

## Features

### 1. Auto-DM Flow System
- **Workflow Engine**: Execute automation flows based on triggers, conditions, and actions
- **Event-Driven**: React to match events, message patterns, and user activities
- **Flexible Configuration**: Define custom automation flows with multiple conditions and actions
- **Flow Types**:
  - New match → Send icebreaker
  - Daily engagement nudges
  - Weekly digests
  - Match anniversaries

### 2. Conversation Automation
- **Icebreaker Suggestions**: AI-powered personalized icebreaker messages
  - Context-aware based on user profiles
  - Multiple categories (question, compliment, observation)
  - Customizable tone and length
  - Shared interests detection

- **AI Reply Assistant**: Smart reply suggestions for conversations
  - Conversation context analysis
  - Multiple reply options with different tones
  - Sentiment analysis
  - Engagement scoring

- **Ghosting Detection**: Identify and re-engage stalled conversations
  - Configurable threshold (default: 48 hours)
  - Automatic re-engagement flows
  - Multiple attempt strategies
  - Success tracking

### 3. Scheduled Messaging
- **One-time Messages**: Schedule messages for specific dates/times
- **Recurring Messages**: Daily, weekly, or custom schedules using cron expressions
- **Match Warmup Sequences**: Automated engagement sequences for new matches
- **Multiple Channels**: Support for in-app messages, push notifications, email, SMS

## Architecture

```
automation-service/
├── src/
│   ├── api/
│   │   ├── controllers/       # REST API controllers
│   │   ├── middleware/        # Auth and service auth middleware
│   │   └── routes/           # API route definitions
│   ├── services/             # Business logic layer
│   │   ├── workflow-engine.service.ts
│   │   ├── icebreaker.service.ts
│   │   ├── reply-assistant.service.ts
│   │   ├── ghosting-detection.service.ts
│   │   └── scheduled-message.service.ts
│   ├── dtos/                 # Data transfer objects
│   ├── models/               # Database models
│   ├── queues/              # RabbitMQ consumers/producers
│   ├── workflows/           # Workflow definitions
│   ├── config/              # Configuration
│   └── infrastructure/      # Database and cache setup
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Technology Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via Knex.js)
- **Cache**: Redis
- **Message Queue**: RabbitMQ
- **Job Queue**: Bull (Redis-backed)
- **AI Integration**: OpenAI GPT-4
- **Authentication**: JWT + Service-to-Service auth

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure environment variables (see Configuration section)

# Run database migrations
npm run build
```

## Configuration

### Required Environment Variables

```bash
# Service Configuration
SERVICE_NAME=automation-service
NODE_ENV=development
PORT=3013

# JWT
JWT_ACCESS_SECRET=your-jwt-secret

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_automation
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=7

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# Service URLs
MESSAGING_SERVICE_URL=http://localhost:3003
NOTIFICATION_SERVICE_URL=http://localhost:3008
USER_SERVICE_URL=http://localhost:3001
MATCHING_SERVICE_URL=http://localhost:3002
AI_SERVICE_URL=http://localhost:3009

# Service Authentication
SERVICE_API_KEY=your-service-api-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4-turbo-preview
```

### Feature Flags

```bash
ENABLE_AUTO_DM_FLOWS=true
ENABLE_ICEBREAKER_SUGGESTIONS=true
ENABLE_GHOSTING_DETECTION=true
ENABLE_SCHEDULED_MESSAGES=true
ENABLE_AI_REPLY_ASSISTANT=true
```

## Development

```bash
# Development mode with hot reload
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start

# Run tests
npm test

# Lint code
npm run lint
npm run lint:fix
```

## API Endpoints

### Icebreakers

#### Generate Icebreaker Suggestions
```http
POST /api/icebreakers/generate
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "matchId": "uuid",
  "matchUserId": "uuid",
  "category": "question",
  "tone": "casual",
  "includeEmoji": true,
  "maxLength": 150
}
```

#### Mark Icebreaker as Used
```http
POST /api/icebreakers/{suggestionId}/use
Authorization: Bearer {jwt_token}
```

### Reply Assistant

#### Generate Reply Suggestions
```http
POST /api/reply-assistant/generate
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "conversationId": "uuid",
  "messageHistory": [
    {
      "senderId": "uuid",
      "content": "message text",
      "timestamp": "2024-01-01T00:00:00Z",
      "type": "text"
    }
  ],
  "tone": "casual",
  "maxLength": 200,
  "includeEmoji": true
}
```

### Scheduled Messages

#### Create Scheduled Message
```http
POST /api/scheduled-messages
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "matchId": "uuid",
  "conversationId": "uuid",
  "messageType": "engagement_nudge",
  "scheduleType": "once",
  "scheduledFor": "2024-01-01T12:00:00Z",
  "content": "Message content",
  "channel": "push",
  "isActive": true
}
```

#### Update Scheduled Message
```http
PUT /api/scheduled-messages/{id}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "scheduledFor": "2024-01-02T12:00:00Z",
  "isActive": false
}
```

#### Delete Scheduled Message
```http
DELETE /api/scheduled-messages/{id}
Authorization: Bearer {jwt_token}
```

#### Create Match Warmup Sequence
```http
POST /api/scheduled-messages/warmup-sequence
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "matchId": "uuid",
  "conversationId": "uuid",
  "sequence": [
    {
      "sequenceNumber": 1,
      "delayHours": 1,
      "content": "First warmup message",
      "channel": "push"
    },
    {
      "sequenceNumber": 2,
      "delayHours": 6,
      "content": "Second warmup message",
      "channel": "push"
    }
  ]
}
```

## RabbitMQ Events

### Match Events
The service listens to these match-related events:

- `match.created` - Triggers auto-icebreaker flows
- `match.superlike` - Triggers special notifications
- `match.anniversary` - Sends anniversary messages

### Message Events
The service listens to these message-related events:

- `message.sent` - Updates conversation health
- `message.read` - Tracks engagement
- `conversation.updated` - Triggers ghosting detection

## Workflow Engine

### Flow Structure

```typescript
{
  "name": "New Match Auto Icebreaker",
  "trigger": {
    "type": "new_match"
  },
  "conditions": [
    {
      "type": "time_of_day",
      "operator": "between",
      "value": ["09:00", "21:00"]
    }
  ],
  "actions": [
    {
      "type": "send_icebreaker",
      "parameters": {
        "category": "question",
        "tone": "casual"
      },
      "delayMs": 5000
    },
    {
      "type": "send_notification",
      "parameters": {
        "title": "Your icebreaker was sent!",
        "body": "Good luck with your new match!"
      }
    }
  ]
}
```

### Trigger Types
- `new_match` - When users match
- `no_response` - No reply within threshold
- `daily_engagement` - Daily scheduled trigger
- `weekly_digest` - Weekly summary
- `match_anniversary` - Match milestone
- `profile_view` - Profile viewed event
- `super_like_received` - Super like notification

### Condition Types
- `time_elapsed` - Time since event
- `message_count` - Number of messages
- `user_activity` - Recent activity check
- `subscription_tier` - User subscription level
- `match_score` - Match compatibility score
- `time_of_day` - Current time check
- `day_of_week` - Day of week check

### Action Types
- `send_message` - Send in-app message
- `send_notification` - Send push notification
- `send_icebreaker` - Generate and send icebreaker
- `generate_suggestion` - Create suggestion
- `update_user_flag` - Modify user state
- `wait` - Delay execution

## Ghosting Detection

### How It Works

1. **Detection**: Monitors conversations for inactivity (default: 48 hours)
2. **Recording**: Creates ghosting detection record in database
3. **Re-engagement**: Schedules re-engagement attempts (default: 72 hours delay)
4. **Tracking**: Monitors success of re-engagement attempts
5. **Resolution**: Marks as resolved when conversation resumes

### Configuration

```bash
GHOSTING_THRESHOLD_HOURS=48
RE_ENGAGEMENT_DELAY_HOURS=72
MAX_RE_ENGAGEMENT_ATTEMPTS=2
```

## AI Integration

### OpenAI Features

1. **Icebreaker Generation**
   - Analyzes user profiles
   - Considers shared interests
   - Generates personalized messages
   - Multiple category options

2. **Reply Suggestions**
   - Analyzes conversation context
   - Maintains conversation tone
   - Provides multiple options
   - Sentiment-aware responses

### Fallback Mechanism

If OpenAI API is unavailable or fails:
- Template-based suggestions are generated
- Service continues to operate
- Errors are logged for monitoring

## Database Schema

### Key Tables

- `automation_flows` - Workflow definitions
- `flow_executions` - Execution history
- `icebreaker_suggestions` - Generated icebreakers
- `scheduled_messages` - Scheduled message queue
- `conversation_health` - Engagement metrics
- `ghosting_detections` - Ghosting records
- `re_engagement_attempts` - Re-engagement tracking

## Monitoring

### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "automation-service",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0"
}
```

### Metrics to Monitor

- Flow execution success/failure rates
- Icebreaker generation latency
- Ghosting detection accuracy
- Re-engagement success rates
- Scheduled message delivery rates
- Queue processing times

## Error Handling

- All errors are logged with context
- Failed flows are retried based on configuration
- Circuit breaker pattern for external services
- Graceful degradation when AI services are unavailable

## Security

- JWT authentication for user endpoints
- Service-to-service authentication for internal APIs
- Rate limiting on AI-powered endpoints
- Input validation on all endpoints
- Secure secrets management

## Docker Deployment

```bash
# Build image
docker build -t automation-service .

# Run container
docker run -p 3013:3013 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -e RABBITMQ_URL=amqp://... \
  automation-service
```

## Troubleshooting

### Service won't start
- Check database connection
- Verify Redis is running
- Ensure RabbitMQ is accessible
- Validate environment variables

### Flows not executing
- Check RabbitMQ connection
- Verify flow status is 'active'
- Review flow conditions
- Check execution logs

### AI features failing
- Verify OpenAI API key
- Check rate limits
- Review API quota
- Fallback templates should activate

## Contributing

1. Follow TypeScript best practices
2. Write tests for new features
3. Update documentation
4. Follow existing code patterns

## License

Proprietary - Flamoral Dating Platform

## Support

For issues or questions:
- Check logs in `logs/` directory
- Review RabbitMQ queue status
- Monitor database performance
- Contact backend team
