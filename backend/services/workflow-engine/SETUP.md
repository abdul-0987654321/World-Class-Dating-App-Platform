# Workflow Engine Setup Guide

Complete setup instructions for the Workflow Engine microservice.

## Prerequisites

- Node.js 20.x or higher
- PostgreSQL 15.x
- Redis 7.x
- RabbitMQ 3.x
- Docker & Docker Compose (optional)

## Installation

### Option 1: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f workflow-engine

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

The service will be available at `http://localhost:3011`

### Option 2: Manual Setup

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Setup Database

```sql
-- Create database
CREATE DATABASE workflow_engine_db;

-- Connect to database
\c workflow_engine_db

-- Tables will be auto-created by TypeORM on first run
```

#### 3. Setup Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or install locally
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt-get install redis-server
sudo systemctl start redis
```

#### 4. Setup RabbitMQ

```bash
# Using Docker
docker run -d -p 5672:5672 -p 15672:15672 rabbitmq:3-management-alpine

# Or install locally
# macOS
brew install rabbitmq
brew services start rabbitmq

# Ubuntu
sudo apt-get install rabbitmq-server
sudo systemctl start rabbitmq-server
```

#### 5. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

#### 6. Run Migrations

```bash
# Build the application first
npm run build

# Migrations run automatically on startup
# Or manually with TypeORM CLI
npx typeorm migration:run
```

#### 7. Start the Service

```bash
# Development mode (with hot reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3011` |
| `NODE_ENV` | Environment | `development` |
| `DATABASE_HOST` | PostgreSQL host | `localhost` |
| `DATABASE_PORT` | PostgreSQL port | `5432` |
| `DATABASE_NAME` | Database name | `workflow_engine_db` |
| `DATABASE_USER` | Database user | `postgres` |
| `DATABASE_PASSWORD` | Database password | `postgres` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `RABBITMQ_URL` | RabbitMQ connection URL | `amqp://localhost:5672` |
| `NOTIFICATION_SERVICE_URL` | Notification service URL | `http://localhost:3008` |
| `USER_SERVICE_URL` | User service URL | `http://localhost:3002` |
| `MATCHING_SERVICE_URL` | Matching service URL | `http://localhost:3009` |
| `PAYMENT_SERVICE_URL` | Payment service URL | `http://localhost:3006` |
| `INTERNAL_SERVICE_KEY` | Internal API authentication key | `internal-service-key` |
| `MAX_RETRY_ATTEMPTS` | Maximum workflow retry attempts | `3` |
| `WORKFLOW_EXECUTION_TIMEOUT` | Workflow timeout (ms) | `300000` |

## Verification

### 1. Check Service Health

```bash
curl http://localhost:3011/health
```

Expected response:
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  }
}
```

### 2. Access API Documentation

Open your browser to: `http://localhost:3011/api/docs`

### 3. Test Workflow Creation

```bash
curl -X POST http://localhost:3011/api/v1/workflows \
  -H "Content-Type: application/json" \
  -H "X-Internal-Service-Key: internal-service-key" \
  -d '{
    "name": "Test Workflow",
    "trigger": {
      "type": "first_login"
    },
    "actions": [
      {
        "type": "send_push",
        "config": {
          "title": "Welcome!",
          "body": "Test message"
        }
      }
    ],
    "status": "draft"
  }'
```

### 4. Import Workflow Templates

```bash
# Use the included workflow templates
# Import via API or database directly
```

### 5. Check RabbitMQ Connections

```bash
# Access RabbitMQ Management UI
# http://localhost:15672
# Default credentials: guest/guest (or admin/admin in docker-compose)

# Verify queues are created:
# - flamoral_match_events
# - flamoral_message_events
# - flamoral_like_events
# - flamoral_subscription_events
# - flamoral_user_login_events
# etc.
```

## Integration with Other Services

### 1. Configure Other Services

Other services need to publish events to RabbitMQ. Example from matching service:

```typescript
// In matching service
await rabbitMQ.publish('matching.events', 'match.created', {
  userId: user1.id,
  matchedUserId: user2.id,
  matchId: match.id,
  timestamp: new Date(),
});
```

### 2. Update API Gateway

Add workflow engine proxy routes in api-gateway:

```typescript
// In api-gateway configuration
services: {
  // ... other services
  workflowService: process.env.WORKFLOW_SERVICE_URL || 'http://localhost:3011',
}
```

### 3. Internal Service Authentication

All services calling workflow engine must include the internal service key:

```typescript
const response = await axios.post(
  'http://localhost:3011/api/v1/workflows',
  workflowData,
  {
    headers: {
      'X-Internal-Service-Key': process.env.INTERNAL_SERVICE_KEY,
    },
  },
);
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:e2e
```

### Manual Testing with Postman

1. Import `postman-collection.json` into Postman
2. Set the `internalServiceKey` variable
3. Run the requests

## Monitoring

### Logs

```bash
# Docker logs
docker-compose logs -f workflow-engine

# Local logs
npm run start:dev
```

### Metrics

Access the analytics dashboard:

```bash
curl -H "X-Internal-Service-Key: internal-service-key" \
  http://localhost:3011/api/v1/analytics/dashboard
```

### Database Queries

```sql
-- Check workflow count
SELECT COUNT(*) FROM workflows;

-- Check execution statistics
SELECT status, COUNT(*)
FROM workflow_executions
GROUP BY status;

-- Recent executions
SELECT * FROM workflow_executions
ORDER BY created_at DESC
LIMIT 10;

-- Workflow performance
SELECT
  w.name,
  w.execution_count,
  w.success_count,
  w.failure_count,
  ROUND(w.success_count::decimal / NULLIF(w.execution_count, 0) * 100, 2) as success_rate
FROM workflows w
WHERE w.status = 'active'
ORDER BY w.execution_count DESC;
```

## Troubleshooting

### Service won't start

1. Check database connection:
```bash
psql -h localhost -U postgres -d workflow_engine_db
```

2. Check Redis connection:
```bash
redis-cli ping
```

3. Check RabbitMQ connection:
```bash
rabbitmqctl status
```

### Workflows not triggering

1. Verify RabbitMQ queues exist
2. Check if workflows are in "active" status
3. Verify other services are publishing events
4. Check workflow engine logs for errors

### Database errors

```bash
# Reset database
npm run build
# Then manually drop and recreate tables
```

### Performance issues

1. Check database indexes
2. Monitor RabbitMQ queue sizes
3. Check workflow execution durations
4. Review retry logic configuration

## Production Deployment

### 1. Build for Production

```bash
npm run build
```

### 2. Environment Configuration

- Use strong `INTERNAL_SERVICE_KEY`
- Configure proper database credentials
- Enable SSL for database connections
- Use managed Redis and RabbitMQ services

### 3. Scaling

- Run multiple instances behind a load balancer
- Use Redis for distributed state
- Configure RabbitMQ clustering
- Monitor execution queue depth

### 4. Security

- Restrict network access to internal services only
- Use API keys for all internal communication
- Enable database SSL
- Implement rate limiting
- Regular security audits

## Support

For issues or questions:
- Check the main README.md
- Review API documentation at `/api/docs`
- Check logs for error messages
- Contact the development team

## License

Proprietary - Flamoral Dating Platform
