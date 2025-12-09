# Automation Service - Quick Start Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- RabbitMQ 3.12+
- OpenAI API key (for AI features)

## Setup Steps

### 1. Install Dependencies

```bash
cd automation-service
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set the following required variables:

```bash
# Database
DB_HOST=localhost
DB_NAME=flamoral_automation
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# Service API Key (must match across all services)
SERVICE_API_KEY=your-service-api-key-here

# JWT Secret
JWT_ACCESS_SECRET=your-jwt-secret-here

# OpenAI (for AI features)
OPENAI_API_KEY=your-openai-api-key
```

### 3. Initialize Database

The service will automatically create all required tables on first run. Alternatively:

```bash
npm run build
node dist/index.js
```

The database schema includes:
- automation_flows
- flow_executions
- icebreaker_suggestions
- scheduled_messages
- conversation_health
- ghosting_detections
- re_engagement_attempts

### 4. Start the Service

**Development mode (with hot reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

The service will start on port 3013 (configurable via PORT env var).

## Verify Installation

### Health Check
```bash
curl http://localhost:3013/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "automation-service",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0"
}
```

### Service Info
```bash
curl http://localhost:3013/
```

## Testing Features

### 1. Generate Icebreakers

```bash
curl -X POST http://localhost:3013/api/icebreakers/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "match-uuid",
    "matchUserId": "user-uuid",
    "tone": "casual",
    "includeEmoji": true
  }'
```

### 2. Generate Reply Suggestions

```bash
curl -X POST http://localhost:3013/api/reply-assistant/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conversation-uuid",
    "messageHistory": [
      {
        "senderId": "user-uuid",
        "content": "Hey! How are you?",
        "timestamp": "2024-01-01T10:00:00Z",
        "type": "text"
      }
    ],
    "tone": "friendly"
  }'
```

### 3. Create Scheduled Message

```bash
curl -X POST http://localhost:3013/api/scheduled-messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "match-uuid",
    "conversationId": "conversation-uuid",
    "messageType": "engagement_nudge",
    "scheduleType": "once",
    "scheduledFor": "2024-01-02T12:00:00Z",
    "content": "Don'\''t forget to check your matches!",
    "channel": "push"
  }'
```

## Common Issues

### Port Already in Use
Change the port in `.env`:
```bash
PORT=3014
```

### Database Connection Failed
- Ensure PostgreSQL is running
- Verify credentials in `.env`
- Check database exists: `createdb flamoral_automation`

### Redis Connection Failed
- Ensure Redis is running: `redis-cli ping`
- Verify Redis host/port in `.env`

### RabbitMQ Connection Failed
- Ensure RabbitMQ is running: `rabbitmqctl status`
- Verify RabbitMQ URL in `.env`

### OpenAI API Errors
- Verify API key is valid
- Check API quota/limits
- Service will fallback to template-based suggestions

## Integration with Other Services

### Required Service Endpoints

The automation service needs these other services to be running:

1. **Messaging Service** (port 3003)
   - Sends automated messages
   - Retrieves conversation data

2. **Notification Service** (port 3008)
   - Sends push notifications
   - Sends email/SMS notifications

3. **User Service** (port 3001)
   - Fetches user profiles
   - Retrieves user preferences

4. **Matching Service** (port 3002)
   - Gets match details
   - Retrieves match scores

### Service-to-Service Authentication

Ensure `SERVICE_API_KEY` is the same across all services:

```bash
# Generate a secure key
openssl rand -hex 32

# Add to .env in ALL services
SERVICE_API_KEY=your-generated-key
```

## RabbitMQ Setup

The service listens to these exchanges and queues:

### Exchange
- Name: `flamoral_events`
- Type: `topic`

### Queues
- `match_events` - Bindings: `match.created`, `match.superlike`, `match.anniversary`
- `message_events` - Bindings: `message.sent`, `message.read`, `conversation.updated`

To publish test events:

```bash
# Install RabbitMQ management plugin (if not already)
rabbitmq-plugins enable rabbitmq_management

# Access management UI
# http://localhost:15672 (guest/guest)

# Publish test event via CLI
rabbitmqadmin publish exchange=flamoral_events \
  routing_key=match.created \
  payload='{"type":"match.created","data":{"matchId":"test","userId1":"user1","userId2":"user2"}}'
```

## Feature Flags

Enable/disable features in `.env`:

```bash
# Auto-DM flows (match event automation)
ENABLE_AUTO_DM_FLOWS=true

# AI-powered icebreaker suggestions
ENABLE_ICEBREAKER_SUGGESTIONS=true

# Ghosting detection and re-engagement
ENABLE_GHOSTING_DETECTION=true

# Scheduled messaging system
ENABLE_SCHEDULED_MESSAGES=true

# AI reply assistant
ENABLE_AI_REPLY_ASSISTANT=true
```

## Docker Quick Start

```bash
# Build image
docker build -t automation-service .

# Run with Docker
docker run -d \
  --name automation-service \
  -p 3013:3013 \
  -e DB_HOST=host.docker.internal \
  -e DB_NAME=flamoral_automation \
  -e DB_USER=postgres \
  -e DB_PASSWORD=your_password \
  -e REDIS_HOST=host.docker.internal \
  -e RABBITMQ_URL=amqp://host.docker.internal:5672 \
  -e SERVICE_API_KEY=your-service-key \
  -e JWT_ACCESS_SECRET=your-jwt-secret \
  -e OPENAI_API_KEY=your-openai-key \
  automation-service
```

## Development Tips

### Hot Reload
The dev server watches for changes and automatically reloads:
```bash
npm run dev
```

### TypeScript Compilation
Check for type errors:
```bash
npm run build
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Debugging
Add breakpoints in your IDE or use:
```bash
node --inspect dist/index.js
```

## Next Steps

1. **Create Automation Flows**: Define custom workflow automation
2. **Configure Cron Jobs**: Set up recurring scheduled messages
3. **Tune AI Settings**: Adjust OpenAI model and parameters
4. **Monitor Performance**: Set up logging and metrics collection
5. **Scale Horizontally**: Deploy multiple instances behind a load balancer

## Support

For issues or questions:
- Check logs: Service outputs detailed logs to console
- Review README.md for detailed documentation
- Check RabbitMQ management UI for queue status
- Monitor database performance

## Resources

- [Main README](./README.md) - Full documentation
- [Environment Variables](./.env.example) - All configuration options
- [API Documentation](./README.md#api-endpoints) - Endpoint details
- [Service Architecture](./README.md#architecture) - System design
