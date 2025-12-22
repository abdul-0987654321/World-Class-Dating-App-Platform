# Flamoral Workflow Engine

A powerful, production-ready workflow automation engine for the Flamoral Dating Platform. This service orchestrates user journeys, automates engagement campaigns, and provides sophisticated A/B testing capabilities for optimizing conversion funnels.

## 🌟 Features

### Core Capabilities

- **Event-Driven Triggers**: React to user actions in real-time
  - Match creation, messages sent/received
  - Profile completion milestones
  - Subscription purchases, coin transactions
  - User activity patterns (inactive users, first login)

- **Conditional Logic**: Execute workflows based on user state
  - Premium status checks
  - Profile completion percentage
  - Match count, message count
  - Custom user attributes

- **Multi-Channel Actions**: Engage users across platforms
  - Push notifications
  - Email campaigns
  - SMS messaging
  - In-app messages
  - Reward distribution (coins, boosts)
  - Profile score adjustments

- **A/B Testing**: Optimize conversion with variant testing
  - Traffic splitting by percentage
  - Statistical confidence calculations
  - Performance comparison analytics
  - Automatic winner selection

- **Analytics & Funnel Metrics**: Data-driven insights
  - Execution success rates
  - Conversion tracking
  - User journey analytics
  - Performance benchmarking

### Technical Features

- **Distributed Architecture**: Kubernetes-ready with horizontal scaling
- **Message Queue Integration**: RabbitMQ for reliable event processing
- **Caching Layer**: Redis for workflow state and performance optimization
- **PostgreSQL Storage**: Persistent workflow definitions and execution history
- **Retry Logic**: Automatic retries with exponential backoff
- **Health Checks**: Built-in monitoring and observability

## 🏗️ Architecture

```
┌─────────────────┐
│  API Gateway    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│   Workflow      │────▶│   RabbitMQ      │
│   Engine API    │     │   Events        │
└────────┬────────┘     └─────────────────┘
         │
         ├──────────┬──────────┬──────────┐
         ▼          ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │ Redis  │ │Postgres│ │ User   │ │Notif.  │
    │ Cache  │ │   DB   │ │Service │ │Service │
    └────────┘ └────────┘ └────────┘ └────────┘
```

## 📦 Installation

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL >= 14
- Redis >= 6.2
- RabbitMQ >= 3.11

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run migration:run

# Start development server
npm run start:dev
```

### Docker Deployment

```bash
# Build Docker image
docker build -t flamoral/workflow-engine:latest .

# Run with Docker Compose
docker-compose up -d
```

### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Verify deployment
kubectl get pods -n flamoral -l app=workflow-engine
```

## 🚀 Quick Start

### Creating Your First Workflow

```typescript
POST /api/v1/workflows

{
  "name": "Welcome New Users",
  "description": "Send welcome message to new users",
  "trigger": {
    "type": "first_login"
  },
  "conditions": [
    {
      "type": "profile_complete_percentage",
      "operator": "lt",
      "value": 50
    }
  ],
  "actions": [
    {
      "type": "send_push",
      "config": {
        "title": "Welcome to Flamoral!",
        "body": "Complete your profile to find matches"
      }
    }
  ],
  "status": "draft",
  "priority": 100
}
```

### Activating a Workflow

```typescript
POST /api/v1/workflows/:workflowId/activate
```

### Triggering a Workflow

```typescript
POST /api/v1/executions/trigger

{
  "triggerType": "match_created",
  "triggerData": {
    "matchId": "uuid",
    "userId": "uuid",
    "matchedUserId": "uuid"
  },
  "userId": "uuid"
}
```

### Viewing Execution History

```typescript
GET /api/v1/executions/workflow/:workflowId
```

## 📊 A/B Testing

### Creating A/B Test Variants

```typescript
POST /api/v1/workflows/ab-test

{
  "baseWorkflowId": "uuid",
  "testGroup": "welcome_message_test",
  "variants": [
    {
      "variant": "control",
      "percentage": 50,
      "modifications": {
        "actions": [...]
      }
    },
    {
      "variant": "variant_a",
      "percentage": 50,
      "modifications": {
        "actions": [...]
      }
    }
  ]
}
```

### Viewing Test Results

```typescript
GET /api/v1/analytics/ab-test/:testGroup?startDate=2024-01-01&endDate=2024-01-31
```

## 📈 Analytics & Monitoring

### Workflow Performance

```typescript
GET /api/v1/analytics/workflow/:workflowId/performance
```

Response:
```json
{
  "totalExecutions": 1250,
  "successRate": 94.5,
  "avgExecutionTime": 345,
  "recentExecutions": [...]
}
```

### Funnel Metrics

```typescript
GET /api/v1/analytics/funnel/:workflowId?startDate=2024-01-01&endDate=2024-01-31
```

Response:
```json
{
  "trigger": "match_created",
  "totalUsers": 1000,
  "conditionsPassed": 850,
  "conditionsPassedRate": 85.0,
  "actionsCompleted": 765,
  "conversionRate": 76.5
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3011` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `workflow_engine` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `RABBITMQ_HOST` | RabbitMQ host | `localhost` |
| `RABBITMQ_PORT` | RabbitMQ port | `5672` |

See `.env.example` for complete configuration options.

## 📝 Workflow Definition Schema

### Trigger Types

- `match_created` - When two users match
- `message_sent` - When a user sends a message
- `like_received` - When a user receives a like
- `super_like` - When a user receives a super like
- `subscription_purchase` - When a user upgrades to premium
- `coin_purchase` - When a user buys coins
- `first_login` - When a user logs in for the first time
- `profile_completed` - When a user completes their profile
- `abandoned_onboarding` - When a user abandons onboarding
- `user_inactive_7d` - When a user is inactive for 7 days

### Condition Types

- `user_premium` - Check if user has premium subscription
- `profile_complete_percentage` - Check profile completion %
- `match_count` - Check number of matches
- `message_count` - Check number of messages sent

### Action Types

- `send_push` - Send push notification
- `send_sms` - Send SMS message
- `send_email` - Send email
- `send_in_app_message` - Show in-app message
- `add_coins` - Add coins to user account
- `activate_boost` - Activate profile boost
- `update_profile_score` - Update user's profile score
- `promote_user` - Increase user visibility

## 🔒 Security

### Authentication

The Workflow Engine uses two authentication methods:

1. **Internal Service Key**: For service-to-service communication
   ```
   X-Internal-Service-Key: <your-service-key>
   ```

2. **JWT Tokens**: For admin/user access
   ```
   Authorization: Bearer <jwt-token>
   ```

### Rate Limiting

Built-in rate limiting protects the API:
- 100 requests per minute per IP
- 1000 workflow executions per hour per user

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:e2e

# Run with coverage
npm run test:cov
```

## 📚 API Documentation

Once the service is running, access the interactive API documentation:

```
http://localhost:3011/api/docs
```

## 🎯 Use Cases

### 1. User Onboarding

Automate the onboarding journey:
- Welcome messages on first login
- Profile completion reminders
- Guided tours and tips

### 2. Re-engagement

Win back inactive users:
- Targeted notifications based on inactivity period
- Personalized incentives (coins, boosts)
- New match highlights

### 3. Premium Conversion

Drive subscription upgrades:
- Feature discovery campaigns
- Limited-time offers
- Profile completion incentives

### 4. User Milestones

Celebrate achievements:
- First match celebrations
- Message streak rewards
- Profile completeness bonuses

### 5. Behavioral Triggers

React to user behavior:
- Low engagement warnings
- High activity rewards
- Abandoned cart recovery

## 🔄 Workflow Examples

See the `/examples` directory for complete workflow definitions:

- `onboarding-workflow.json` - New user onboarding
- `first-match-workflow.json` - First match celebration
- `inactive-user-reengagement.json` - Re-engagement campaign
- `premium-conversion-workflow.json` - Premium upsell
- `ab-test-notification-variants.yaml` - A/B test setup

## 🚀 Performance

### Benchmarks

- **Execution Throughput**: 10,000+ workflows/minute
- **Average Latency**: <100ms for workflow lookup
- **Event Processing**: <500ms end-to-end
- **A/B Test Overhead**: <5ms per execution

### Scaling

The service horizontally scales based on:
- CPU utilization (target: 70%)
- Memory utilization (target: 80%)
- Custom metrics (queue depth, execution rate)

Default configuration:
- Min replicas: 3
- Max replicas: 10
- Scale up: 4 pods per 30 seconds
- Scale down: 2 pods per 60 seconds

## 🐛 Troubleshooting

### Common Issues

**Workflow not executing:**
- Check workflow status is `active`
- Verify trigger configuration
- Check RabbitMQ connection
- Review execution logs

**High failure rate:**
- Review retry configuration
- Check dependent service health
- Verify action configurations
- Check network connectivity

**Slow performance:**
- Enable Redis caching
- Review database indexes
- Check RabbitMQ queue depth
- Scale up replicas

## 📖 Further Reading

- [Architecture Documentation](./docs/architecture.md)
- [API Reference](./docs/api-reference.md)
- [Deployment Guide](./docs/deployment.md)
- [Best Practices](./docs/best-practices.md)

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

Copyright © 2024 Flamoral Dating Platform. All rights reserved.

## 🆘 Support

For issues and questions:
- GitHub Issues: [flamoral/workflow-engine/issues](https://github.com/flamoral/workflow-engine/issues)
- Documentation: [docs.flamoral.com](https://docs.flamoral.com)
- Email: engineering@flamoral.com

## 🗺️ Roadmap

### Q1 2025
- [ ] Visual workflow builder UI
- [ ] Custom JavaScript actions
- [ ] Webhook triggers
- [ ] Multi-step workflows with branching

### Q2 2025
- [ ] Machine learning-based optimization
- [ ] Advanced analytics dashboard
- [ ] Template marketplace
- [ ] Workflow versioning

---

Built with ❤️ by the Flamoral Engineering Team
