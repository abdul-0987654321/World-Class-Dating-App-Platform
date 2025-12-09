# Workflow Engine - Quick Start Guide

Get up and running with the Flamoral Workflow Engine in 5 minutes! ⚡

## 🚀 Quick Setup (Local Development)

### 1. Install Dependencies

```bash
cd services/workflow-engine
npm install
```

### 2. Set Up Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings (or use defaults for local development)
```

### 3. Start Infrastructure with Docker

```bash
# Start PostgreSQL, Redis, and RabbitMQ
docker-compose up -d postgres redis rabbitmq

# Wait ~10 seconds for services to be ready
```

### 4. Run Database Migrations

```bash
# Create database
psql -h localhost -p 5435 -U postgres -c "CREATE DATABASE workflow_engine_db;"

# Run migrations
psql -h localhost -p 5435 -U postgres -d workflow_engine_db < migrations/001_create_workflows_table.sql
psql -h localhost -p 5435 -U postgres -d workflow_engine_db < migrations/002_create_workflow_executions_table.sql
psql -h localhost -p 5435 -U postgres -d workflow_engine_db < migrations/003_create_analytics_views.sql
```

### 5. Start the Service

```bash
npm run start:dev
```

The service will be running at:
- **API**: http://localhost:3011
- **Swagger Docs**: http://localhost:3011/api/docs

## 📝 Create Your First Workflow (3 Steps)

### Step 1: Create a Workflow

```bash
curl -X POST http://localhost:3011/api/v1/workflows \
  -H "Content-Type: application/json" \
  -H "X-Internal-Service-Key: internal-service-key" \
  -d '{
    "name": "Welcome New Users",
    "description": "Send welcome push notification to new users",
    "trigger": {
      "type": "first_login"
    },
    "actions": [
      {
        "type": "send_push",
        "config": {
          "title": "Welcome to Flamoral! 🌺",
          "body": "Start your journey to meaningful connections"
        }
      }
    ],
    "status": "draft",
    "priority": 100
  }'
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Welcome New Users",
  "status": "draft",
  ...
}
```

### Step 2: Activate the Workflow

```bash
# Replace {workflowId} with the ID from Step 1
curl -X POST http://localhost:3011/api/v1/workflows/{workflowId}/activate \
  -H "X-Internal-Service-Key: internal-service-key"
```

### Step 3: Trigger the Workflow

```bash
curl -X POST http://localhost:3011/api/v1/executions/trigger \
  -H "Content-Type: application/json" \
  -H "X-Internal-Service-Key: internal-service-key" \
  -d '{
    "triggerType": "first_login",
    "triggerData": {
      "timestamp": "2024-01-15T10:30:00Z"
    },
    "userId": "user-123"
  }'
```

**Response:**
```json
{
  "executionIds": ["exec-550e8400-..."],
  "triggeredCount": 1
}
```

## 🎯 Common Workflows (Copy & Paste Ready)

### Welcome New User (with Conditional Logic)

```json
{
  "name": "Welcome Flow - Profile Incomplete",
  "trigger": { "type": "first_login" },
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
        "title": "Complete Your Profile",
        "body": "Add photos to get 3x more matches!"
      }
    },
    {
      "type": "send_email",
      "config": {
        "subject": "Welcome to Flamoral",
        "template": "welcome_new_user"
      },
      "delay": 5000
    }
  ],
  "status": "active",
  "priority": 100
}
```

### First Match Celebration

```json
{
  "name": "First Match Bonus",
  "trigger": { "type": "match_created" },
  "conditions": [
    {
      "type": "match_count",
      "operator": "eq",
      "value": 1
    }
  ],
  "actions": [
    {
      "type": "send_push",
      "config": {
        "title": "🎉 Your First Match!",
        "body": "Start chatting and get to know each other"
      }
    },
    {
      "type": "add_coins",
      "config": {
        "amount": 10,
        "reason": "first_match_bonus"
      },
      "delay": 1000
    }
  ],
  "status": "active",
  "priority": 90
}
```

### Re-engage Inactive Users

```json
{
  "name": "7-Day Inactive Win-Back",
  "trigger": { "type": "user_inactive_7d" },
  "conditions": [
    {
      "type": "user_premium",
      "operator": "eq",
      "value": false
    }
  ],
  "actions": [
    {
      "type": "send_push",
      "config": {
        "title": "Someone's Thinking About You 💭",
        "body": "You have new likes waiting!"
      }
    },
    {
      "type": "activate_boost",
      "config": {
        "duration": 30,
        "type": "profile_boost"
      },
      "delay": 3600000
    }
  ],
  "status": "active",
  "priority": 70
}
```

## 📊 Check Workflow Performance

```bash
# Get workflow performance metrics
curl http://localhost:3011/api/v1/analytics/workflow/{workflowId}/performance \
  -H "X-Internal-Service-Key: internal-service-key"
```

**Response:**
```json
{
  "totalExecutions": 1234,
  "successRate": 95.6,
  "avgExecutionTime": 234,
  "recentExecutions": [...]
}
```

## 🧪 Test A/B Variants

### Create Test Variants

```bash
curl -X POST http://localhost:3011/api/v1/workflows/ab-test \
  -H "Content-Type: application/json" \
  -H "X-Internal-Service-Key: internal-service-key" \
  -d '{
    "baseWorkflowId": "{workflowId}",
    "testGroup": "welcome_message_test",
    "variants": [
      {
        "variant": "control",
        "percentage": 50,
        "modifications": {
          "actions": [{
            "type": "send_push",
            "config": {
              "title": "Welcome!",
              "body": "Start your journey"
            }
          }]
        }
      },
      {
        "variant": "variant_a",
        "percentage": 50,
        "modifications": {
          "actions": [{
            "type": "send_push",
            "config": {
              "title": "Welcome to Flamoral! 🌺",
              "body": "Find your perfect match today"
            }
          }]
        }
      }
    ]
  }'
```

### View Test Results

```bash
curl "http://localhost:3011/api/v1/analytics/ab-test/welcome_message_test?startDate=2024-01-01&endDate=2024-01-31" \
  -H "X-Internal-Service-Key: internal-service-key"
```

## 🔍 View Execution History

```bash
# Get recent executions for a workflow
curl http://localhost:3011/api/v1/executions/workflow/{workflowId} \
  -H "X-Internal-Service-Key: internal-service-key"
```

## 🛠️ Useful Commands

### View All Active Workflows

```bash
curl "http://localhost:3011/api/v1/workflows?status=active" \
  -H "X-Internal-Service-Key: internal-service-key"
```

### Pause a Workflow

```bash
curl -X POST http://localhost:3011/api/v1/workflows/{workflowId}/pause \
  -H "X-Internal-Service-Key: internal-service-key"
```

### Clone a Workflow

```bash
curl -X POST http://localhost:3011/api/v1/workflows/{workflowId}/clone \
  -H "Content-Type: application/json" \
  -H "X-Internal-Service-Key: internal-service-key" \
  -d '{
    "newName": "Welcome New Users - Copy"
  }'
```

### Delete a Workflow

```bash
curl -X DELETE http://localhost:3011/api/v1/workflows/{workflowId} \
  -H "X-Internal-Service-Key: internal-service-key"
```

## 🐳 Docker Quick Start

Want everything in one command?

```bash
# Start entire stack
docker-compose up -d

# View logs
docker-compose logs -f workflow-engine

# Stop everything
docker-compose down
```

## 📚 Import Example Workflows

```bash
# Onboarding workflow
curl -X POST http://localhost:3011/api/v1/workflows \
  -H "Content-Type: application/json" \
  -H "X-Internal-Service-Key: internal-service-key" \
  -d @examples/onboarding-workflow.json

# First match celebration
curl -X POST http://localhost:3011/api/v1/workflows \
  -H "Content-Type: application/json" \
  -H "X-Internal-Service-Key: internal-service-key" \
  -d @examples/first-match-workflow.json

# Inactive user re-engagement
curl -X POST http://localhost:3011/api/v1/workflows \
  -H "Content-Type: application/json" \
  -H "X-Internal-Service-Key: internal-service-key" \
  -d @examples/inactive-user-reengagement.json

# Premium conversion
curl -X POST http://localhost:3011/api/v1/workflows \
  -H "Content-Type: application/json" \
  -H "X-Internal-Service-Key: internal-service-key" \
  -d @examples/premium-conversion-workflow.json
```

## 🔧 Troubleshooting

### Service Won't Start

```bash
# Check if ports are available
lsof -i :3011  # API port
lsof -i :5435  # PostgreSQL port
lsof -i :6382  # Redis port
lsof -i :5675  # RabbitMQ port

# Check Docker containers
docker-compose ps
docker-compose logs
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -p 5435 -U postgres -d workflow_engine_db -c "SELECT 1;"

# Verify database exists
psql -h localhost -p 5435 -U postgres -l | grep workflow
```

### Redis Connection Issues

```bash
# Test Redis connection
docker exec -it workflow-redis redis-cli ping
# Should return: PONG
```

### RabbitMQ Connection Issues

```bash
# Access RabbitMQ Management UI
open http://localhost:15675
# Login: admin / admin

# Check connection from service
docker-compose logs workflow-engine | grep -i rabbitmq
```

## 📖 Next Steps

1. **Explore the API**: Visit http://localhost:3011/api/docs
2. **Read Full Documentation**: Check `README-COMPREHENSIVE.md`
3. **Review Examples**: See all workflow templates in `/examples`
4. **Set Up Monitoring**: Configure health checks and metrics
5. **Deploy to Production**: Follow Kubernetes deployment guide

## 💡 Pro Tips

1. **Use the Swagger UI** at `/api/docs` for interactive API exploration
2. **Enable debug logging** with `LOG_LEVEL=debug` for troubleshooting
3. **Monitor RabbitMQ** at http://localhost:15675 to see event flow
4. **Check materialized views** for pre-computed analytics
5. **Use Redis caching** to speed up frequent queries

## 🎉 You're Ready!

Your workflow engine is now running and ready to automate user journeys. Start creating workflows and watch your engagement metrics soar! 🚀

For questions or issues, check the comprehensive documentation or open an issue on GitHub.

---

**Happy Automating! 🌺**
