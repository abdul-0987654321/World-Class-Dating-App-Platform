# Docker Compose Configuration Fixes

## Required Changes for infrastructure/docker/docker-compose.yml

### 1. Workflow Engine Port Conflict Fix

**Issue:** Workflow engine uses port 4011 which conflicts with realtime-service

**Fix:**
```yaml
workflow-engine:
  build:
    context: ../../
    dockerfile: backend/services/workflow-engine/Dockerfile
  image: flamoral/workflow-engine:latest
  container_name: flamoral-workflow-engine
  environment:
    NODE_ENV: development
    PORT: 4013  # Changed from 4011
    DATABASE_URL: postgresql://${POSTGRES_USER:-flamoral}:${POSTGRES_PASSWORD:-flamoral_dev_pass}@postgres:5432/flamoral
    REDIS_URL: redis://:${REDIS_PASSWORD:-flamoral_redis_pass}@redis:6379
  ports:
    - "4013:4013"  # Changed from 4011:4011
  depends_on:
    - postgres
    - redis
  networks:
    - flamoral-network
  restart: unless-stopped
```

### 2. Realtime Service Build Context Fix

**Issue:** Realtime service Dockerfile expects go.mod in service directory but build context is project root

**Fix:**
```yaml
realtime-service:
  build:
    context: ../../backend/services/realtime-service  # Changed from ../../
    dockerfile: Dockerfile
  image: flamoral/realtime-service:latest
  container_name: flamoral-realtime-service
  environment:
    NODE_ENV: development
    PORT: 4011
    REDIS_URL: redis://:${REDIS_PASSWORD:-flamoral_redis_pass}@redis:6379
    JWT_SECRET: ${JWT_SECRET:-dev_jwt_secret_change_in_production}
  ports:
    - "4011:4011"
  depends_on:
    - redis
  networks:
    - flamoral-network
  restart: unless-stopped
```

### 3. Python AI Services Build Context Options

**Option A: Keep context at root, use full paths in Dockerfile (RECOMMENDED)**

This is what we implemented in the fixed Dockerfiles. No changes needed to docker-compose.yml.

Current configuration (keep as-is):
```yaml
photo-analysis:
  build:
    context: ../../  # Build from project root
    dockerfile: backend/services/ai-services/photo-analysis/Dockerfile
```

**Option B: Change context to service directory, update Dockerfile paths**

Alternative approach (would require changing fixed Dockerfiles back):
```yaml
photo-analysis:
  build:
    context: ../../backend/services/ai-services/photo-analysis
    dockerfile: Dockerfile
```

### Complete Updated docker-compose.yml Sections

Replace these sections in `infrastructure/docker/docker-compose.yml`:

```yaml
  # Update realtime-service
  realtime-service:
    build:
      context: ../../backend/services/realtime-service
      dockerfile: Dockerfile
    image: flamoral/realtime-service:latest
    container_name: flamoral-realtime-service
    environment:
      NODE_ENV: development
      PORT: 4011
      REDIS_URL: redis://:${REDIS_PASSWORD:-flamoral_redis_pass}@redis:6379
      JWT_SECRET: ${JWT_SECRET:-dev_jwt_secret_change_in_production}
    ports:
      - "4011:4011"
    depends_on:
      - redis
    networks:
      - flamoral-network
    restart: unless-stopped

  # Add workflow-engine (if not present)
  workflow-engine:
    build:
      context: ../../
      dockerfile: backend/services/workflow-engine/Dockerfile
    image: flamoral/workflow-engine:latest
    container_name: flamoral-workflow-engine
    environment:
      NODE_ENV: development
      PORT: 4013
      DATABASE_URL: postgresql://${POSTGRES_USER:-flamoral}:${POSTGRES_PASSWORD:-flamoral_dev_pass}@postgres:5432/flamoral
      REDIS_URL: redis://:${REDIS_PASSWORD:-flamoral_redis_pass}@redis:6379
      RABBITMQ_URL: amqp://${RABBITMQ_USER:-flamoral}:${RABBITMQ_PASSWORD:-flamoral_rabbit_pass}@rabbitmq:5672
    ports:
      - "4013:4013"
    depends_on:
      - postgres
      - redis
      - rabbitmq
    networks:
      - flamoral-network
    restart: unless-stopped

  # Add automation-service (if not present)
  automation-service:
    build:
      context: ../../
      dockerfile: backend/services/automation-service/Dockerfile
    image: flamoral/automation-service:latest
    container_name: flamoral-automation-service
    environment:
      NODE_ENV: development
      PORT: 4012
      DATABASE_URL: postgresql://${POSTGRES_USER:-flamoral}:${POSTGRES_PASSWORD:-flamoral_dev_pass}@postgres:5432/flamoral
      REDIS_URL: redis://:${REDIS_PASSWORD:-flamoral_redis_pass}@redis:6379
    ports:
      - "4012:4012"
    depends_on:
      - postgres
      - redis
    networks:
      - flamoral-network
    restart: unless-stopped

  # Add advertising-service (if not present)
  advertising-service:
    build:
      context: ../../backend/services/advertising-service
      dockerfile: Dockerfile
    image: flamoral/advertising-service:latest
    container_name: flamoral-advertising-service
    environment:
      NODE_ENV: development
      PORT: 3009
      DATABASE_URL: postgresql://${POSTGRES_USER:-flamoral}:${POSTGRES_PASSWORD:-flamoral_dev_pass}@postgres:5432/flamoral
      REDIS_URL: redis://:${REDIS_PASSWORD:-flamoral_redis_pass}@redis:6379
    ports:
      - "3009:3009"
    depends_on:
      - postgres
      - redis
    networks:
      - flamoral-network
    restart: unless-stopped
```

## Complete Port Mapping Reference

After all fixes, services should use these ports:

### Core Services
- API Gateway: 4000
- Auth Service: 4001
- User Service: 4002
- Matching Service: 4003
- Messaging Service: 4004
- Media Service: 4005
- Payment Service: 4006
- Notification Service: 4007
- Analytics Service: 4008
- Moderation Service: 4009
- Admin Service: 4010
- Realtime Service: 4011
- Automation Service: 4012
- Workflow Engine: 4013

### AI Services (Python)
- Recommendation Service: 5000
- NLP Service: 5001
- Photo Analysis: 5002
- Fraud Detection: 5003
- Dating Coach: 5004
- Content Generator: 5005

### Infrastructure
- PostgreSQL: 5432
- Redis: 6379
- MongoDB: 27017
- MinIO: 9000, 9001
- RabbitMQ: 5672, 15672
- Elasticsearch: 9200

### Other
- Advertising Service: 3009

## Environment Variables Best Practices

Create a `.env` file in the project root:

```bash
# Database
POSTGRES_USER=flamoral
POSTGRES_PASSWORD=flamoral_dev_pass_change_in_production
MONGO_USER=flamoral
MONGO_PASSWORD=flamoral_mongo_pass_change_in_production

# Redis
REDIS_PASSWORD=flamoral_redis_pass_change_in_production

# RabbitMQ
RABBITMQ_USER=flamoral
RABBITMQ_PASSWORD=flamoral_rabbit_pass_change_in_production

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123_change_in_production

# JWT
JWT_SECRET=dev_jwt_secret_change_in_production_to_32_char_random
JWT_EXPIRES_IN=24h

# Bcrypt
BCRYPT_ROUNDS=10

# External Services (Development placeholders)
SENDGRID_API_KEY=your_sendgrid_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
FCM_SERVER_KEY=your_fcm_key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
OPENAI_API_KEY=your_openai_key

# Monitoring
GRAFANA_ADMIN_PASSWORD=admin_change_in_production
```

## Development vs Production

### Development Setup
```bash
# Use infrastructure/docker/docker-compose.yml
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# View logs
docker-compose -f infrastructure/docker/docker-compose.yml logs -f [service-name]

# Rebuild specific service
docker-compose -f infrastructure/docker/docker-compose.yml build [service-name]
docker-compose -f infrastructure/docker/docker-compose.yml up -d [service-name]
```

### Production Setup
```bash
# Use infrastructure/docker/docker-compose.production.yml
# Ensure all images are built and pushed to ACR first

# Build and push to ACR
az acr login --name flamoralacr8eq5eg
docker-compose -f infrastructure/docker/docker-compose.yml build
docker tag flamoral/api-gateway:latest flamoralacr8eq5eg.azurecr.io/flamoral-api-gateway:v1.0.0
docker push flamoralacr8eq5eg.azurecr.io/flamoral-api-gateway:v1.0.0

# Deploy
docker-compose -f infrastructure/docker/docker-compose.production.yml up -d
```

## Health Check Verification

After starting services, verify health:

```bash
# Check all service health
docker-compose -f infrastructure/docker/docker-compose.yml ps

# Manual health checks
curl http://localhost:4000/health  # API Gateway
curl http://localhost:4001/health  # Auth Service
curl http://localhost:4002/health  # User Service
# ... etc for all services

# Python services
curl http://localhost:5000/health  # Recommendation
curl http://localhost:5001/health  # NLP
curl http://localhost:5002/health  # Photo Analysis
curl http://localhost:5003/health  # Fraud Detection
curl http://localhost:5004/health  # Dating Coach
curl http://localhost:5005/health  # Content Generator

# Go service
curl http://localhost:4011/health  # Realtime
```

## Common Build Issues and Solutions

### Issue: "COPY failed: file not found"
**Solution:** Check build context in docker-compose.yml matches paths in Dockerfile COPY commands

### Issue: "failed to solve with frontend dockerfile.v0"
**Solution:** Check Dockerfile syntax, especially multi-line RUN commands

### Issue: Health check failing
**Solution:** Ensure curl is installed in the runtime image

### Issue: Permission denied
**Solution:** Check that non-root user has proper ownership of files

### Issue: Port already in use
**Solution:** Check port mappings, ensure no conflicts, stop other services using the port

## Testing Strategy

1. **Test individual service builds:**
```bash
docker build -f backend/services/api-gateway/Dockerfile -t test-api-gateway .
```

2. **Test with docker-compose:**
```bash
docker-compose -f infrastructure/docker/docker-compose.yml build api-gateway
docker-compose -f infrastructure/docker/docker-compose.yml up -d api-gateway
docker-compose -f infrastructure/docker/docker-compose.yml logs -f api-gateway
```

3. **Test full stack:**
```bash
docker-compose -f infrastructure/docker/docker-compose.yml up -d
docker-compose -f infrastructure/docker/docker-compose.yml ps
```

4. **Verify service communication:**
```bash
# From inside a container
docker exec -it flamoral-api-gateway sh
curl http://auth-service:4001/health
curl http://user-service:4002/health
```

## Rollback Plan

If issues occur after applying fixes:

1. **Stop all services:**
```bash
docker-compose -f infrastructure/docker/docker-compose.yml down
```

2. **Revert Dockerfile changes:**
```bash
# Linux/Mac
./apply-dockerfile-fixes.sh --revert

# Windows
.\apply-dockerfile-fixes.ps1 -Revert
```

3. **Rebuild and restart:**
```bash
docker-compose -f infrastructure/docker/docker-compose.yml build
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```

## Next Steps After Fixes

1. Update CI/CD pipelines with new build contexts
2. Test full deployment in staging environment
3. Update Kubernetes manifests with correct image tags
4. Document any service-specific environment variables
5. Set up monitoring alerts for health check failures
6. Create runbooks for common issues
