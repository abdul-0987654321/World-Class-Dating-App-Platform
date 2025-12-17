# Workflow Engine Service

A visual workflow builder system for dating app automation, similar to Zapier/n8n but specifically designed for dating platform events.

## Overview

The Workflow Engine enables admins to create automated workflows that respond to user events, evaluate conditions, and execute actions. This allows for sophisticated user engagement, retention, and monetization strategies without code changes.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   Trigger   │────▶│  Conditions  │────▶│  Actions   │
│   Events    │     │  Evaluator   │     │  Executor  │
└─────────────┘     └──────────────┘     └────────────┘
      │                    │                    │
      ▼                    ▼                    ▼
  RabbitMQ          External APIs        Notification
   Events           (User, Match,         Payment
                    Payment Services)     Services
```

## Features

### 1. Trigger Types (10 Total)

- **match_created**: When two users match
- **message_sent**: When a user sends a message
- **like_received**: When a user receives a like
- **super_like**: When a user receives a super like
- **subscription_purchase**: When a user buys a subscription
- **coin_purchase**: When a user purchases coins
- **first_login**: When a user logs in for the first time
- **profile_completed**: When a user completes their profile
- **abandoned_onboarding**: When a user abandons onboarding
- **user_inactive_7d**: When a user is inactive for 7 days

### 2. Condition Types (4 Total)

- **user_premium**: Check if user has premium subscription
- **profile_complete_percentage**: Check profile completion %
- **match_count**: Check number of matches
- **message_count**: Check number of messages sent

Operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `contains`

### 3. Action Types (8 Total)

- **send_push**: Send push notification
- **send_sms**: Send SMS message
- **send_email**: Send email
- **send_in_app_message**: Send in-app notification
- **add_coins**: Add coins to user account
- **activate_boost**: Activate profile boost
- **update_profile_score**: Adjust profile score
- **promote_user**: Increase user visibility

## API Endpoints

### Workflow Management

```
POST   /api/v1/workflows              Create workflow
GET    /api/v1/workflows              List all workflows
GET    /api/v1/workflows/:id          Get workflow by ID
PUT    /api/v1/workflows/:id          Update workflow
DELETE /api/v1/workflows/:id          Delete workflow
PATCH  /api/v1/workflows/:id/enable   Enable workflow
PATCH  /api/v1/workflows/:id/disable  Disable workflow
POST   /api/v1/workflows/:id/duplicate Duplicate workflow
GET    /api/v1/workflows/:id/statistics Get workflow stats
```

### Execution Management

```
POST   /api/v1/executions/trigger     Manually trigger workflows
GET    /api/v1/executions             List executions
GET    /api/v1/executions/:id         Get execution details
GET    /api/v1/executions/workflow/:workflowId Get workflow executions
POST   /api/v1/executions/:id/cancel  Cancel execution
GET    /api/v1/executions/statistics/summary Execution statistics
```

### Analytics

```
GET    /api/v1/analytics/workflows/performance    Workflow performance
GET    /api/v1/analytics/workflows/:id/timeline   Execution timeline
GET    /api/v1/analytics/triggers/popularity      Trigger usage stats
GET    /api/v1/analytics/actions/usage           Action usage stats
GET    /api/v1/analytics/dashboard               Dashboard overview
```

## Example Workflow

**Welcome New Premium Users**

```json
{
  "name": "Welcome New Premium Users",
  "description": "Send welcome package to new premium subscribers",
  "trigger": {
    "type": "subscription_purchase"
  },
  "conditions": [
    {
      "type": "profile_complete_percentage",
      "operator": "gte",
      "value": 80
    }
  ],
  "actions": [
    {
      "type": "send_push",
      "config": {
        "title": "Welcome to Premium!",
        "body": "Thank you for upgrading. Here's a gift!"
      }
    },
    {
      "type": "add_coins",
      "config": {
        "amount": 50,
        "reason": "premium_welcome_bonus"
      },
      "delay": 2000
    },
    {
      "type": "activate_boost",
      "config": {
        "duration": 60,
        "type": "profile_boost"
      },
      "delay": 5000
    }
  ],
  "status": "active",
  "priority": 10,
  "tags": ["retention", "premium", "welcome"]
}
```

## Environment Variables

```bash
PORT=3011
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=workflow_engine_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

REDIS_HOST=localhost
REDIS_PORT=6379

RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_QUEUE_PREFIX=flamoral_

NOTIFICATION_SERVICE_URL=http://localhost:3008
USER_SERVICE_URL=http://localhost:3002
MATCHING_SERVICE_URL=http://localhost:3009
PAYMENT_SERVICE_URL=http://localhost:3006

INTERNAL_SERVICE_KEY=internal-service-key

MAX_RETRY_ATTEMPTS=3
RETRY_INITIAL_DELAY=1000
RETRY_MAX_DELAY=30000
RETRY_BACKOFF_FACTOR=2

WORKFLOW_EXECUTION_TIMEOUT=300000
WORKFLOW_PARALLEL_LIMIT=10
```

## Installation

```bash
# Install dependencies
npm install

# Run in development
npm run start:dev

# Build
npm run build

# Run in production
npm run start:prod
```

## Docker

```bash
# Build image
docker build -t workflow-engine .

# Run container
docker run -p 3011:3011 --env-file .env workflow-engine
```

## Database Schema

### workflows
- id (uuid, PK)
- name (string)
- description (text)
- trigger (jsonb)
- conditions (jsonb)
- actions (jsonb)
- status (enum: draft, active, paused, archived)
- priority (int)
- tags (string[])
- executionCount (int)
- successCount (int)
- failureCount (int)
- lastExecutedAt (timestamp)
- createdAt (timestamp)
- updatedAt (timestamp)

### workflow_executions
- id (uuid, PK)
- workflowId (uuid, FK)
- userId (uuid)
- status (enum: pending, running, completed, failed, retrying, cancelled)
- triggerData (jsonb)
- metadata (jsonb)
- conditionsEvaluated (boolean)
- conditionResults (jsonb)
- actionsExecuted (jsonb)
- error (text)
- retryCount (int)
- attempt (int)
- startTime (timestamp)
- endTime (timestamp)
- duration (int)
- createdAt (timestamp)

## Event Integration

The workflow engine subscribes to RabbitMQ events from other services:

**Matching Service Events:**
- `match.created`
- `like.received`
- `super_like.received`

**Messaging Service Events:**
- `message.sent`

**Payment Service Events:**
- `subscription.purchased`
- `coins.purchased`

**User Service Events:**
- `user.first_login`
- `profile.completed`
- `onboarding.abandoned`
- `user.inactive_7d`

## Retry Logic

Failed workflows are retried with exponential backoff:

1. Initial delay: 1 second
2. Backoff factor: 2x
3. Max delay: 30 seconds
4. Max attempts: 3

Example retry delays: 1s → 2s → 4s

## Monitoring

### Health Check
```bash
GET /health
```

### Metrics
- Total workflows
- Active workflows
- Total executions
- Success rate
- Average execution time
- Recent executions (24h)

## Security

All API endpoints require internal service authentication:

```bash
curl -H "X-Internal-Service-Key: your-key" \
     http://localhost:3011/api/v1/workflows
```

## Use Cases

1. **User Onboarding**: Send welcome messages and bonuses to new users
2. **Re-engagement**: Bring back inactive users with special offers
3. **Monetization**: Reward premium subscribers with exclusive perks
4. **Gamification**: Award badges and coins for achievements
5. **Support**: Auto-respond to user actions with helpful tips
6. **Retention**: Prevent churn with targeted interventions
7. **Growth**: Encourage referrals and social sharing
8. **Quality**: Guide users to complete profiles and improve match quality

## Future Enhancements

- [ ] Visual workflow builder UI
- [ ] A/B testing for workflows
- [ ] Workflow versioning
- [ ] Custom JavaScript conditions
- [ ] Webhook actions
- [ ] Schedule-based triggers
- [ ] User segmentation
- [ ] Workflow templates marketplace
- [ ] Real-time execution monitoring
- [ ] Performance optimization recommendations

## License

Proprietary - Flamoral Dating Platform
