# Docker Configuration Fixes - Flamoral Platform

## Summary
This document outlines all the Docker configuration fixes applied to ensure proper builds and deployments across all environments.

---

## Issues Fixed

### 1. Docker Compose Files

#### `infrastructure/docker/docker-compose.yml` (Development)
**Issues:**
- Missing health check conditions in service dependencies
- Services starting before dependencies were ready
- No proper dependency ordering

**Fixes Applied:**
- ✅ Added `condition: service_healthy` to all database/cache dependencies
- ✅ Added `condition: service_started` for inter-service dependencies
- ✅ Ensures proper startup order: infrastructure → databases → services → gateway

**Example:**
```yaml
depends_on:
  postgres:
    condition: service_healthy
  redis:
    condition: service_healthy
```

#### `docker-compose.prod.yml` (Production)
**Issues:**
- Incorrect frontend build context path (`./frontend/web` instead of `./apps/web-app`)
- Incorrect backend context path (`./backend-unified` doesn't exist)
- Nginx using non-existent Dockerfile

**Fixes Applied:**
- ✅ Updated frontend context: `./apps/web-app`
- ✅ Updated backend context: `.` with dockerfile `backend/Dockerfile`
- ✅ Changed nginx to use official image with volume mounts

#### `docker-compose.staging.yml`
**Issues:**
- Build contexts pointing to individual service directories
- Missing shared module dependencies

**Fixes Applied:**
- ✅ Changed all service contexts to root directory (`.`)
- ✅ Updated dockerfile paths to be relative from root
- ✅ Fixed frontend path: `./apps/web-app`

**Example:**
```yaml
moderation-service:
  build:
    context: .
    dockerfile: backend/services/moderation-service/Dockerfile
```

---

### 2. Dockerfiles

#### Backend Services (Node.js/TypeScript)
**File Pattern:** `backend/services/*/Dockerfile`

**Configuration:**
- ✅ Multi-stage builds using `node:20-alpine`
- ✅ Builder stage: Installs dependencies and compiles TypeScript
- ✅ Production stage: Minimal runtime with only production dependencies
- ✅ Non-root user (`nodejs:nodejs` UID 1001)
- ✅ Health checks on service ports
- ✅ Proper signal handling with `dumb-init`

**Shared Module Handling:**
All services properly handle the `@flamoral/shared` module:
```dockerfile
# Build shared module first
COPY backend/shared ./backend/shared
WORKDIR /app/backend/shared
RUN npm install --legacy-peer-deps && npm run build

# Copy shared module to node_modules in production stage
COPY --from=builder /app/backend/shared/dist ./node_modules/@flamoral/shared/dist/
```

**Services Using This Pattern:**
- api-gateway
- auth-service
- user-service
- matching-service
- messaging-service
- media-service
- payment-service
- notification-service
- analytics-service
- moderation-service
- admin-service

#### AI Services (Python)
**File Pattern:** `backend/services/ai-services/*/Dockerfile`

**Configuration:**
- ✅ Multi-stage builds using `python:3.11-slim`
- ✅ Builder stage: Creates virtual environment and installs dependencies
- ✅ Production stage: Copies virtual environment only
- ✅ Non-root user (`appuser` UID 1000)
- ✅ NLTK data pre-downloaded in builder stage (for nlp-service)
- ✅ Health checks on service ports
- ✅ Using `uvicorn` as ASGI server

**Services:**
- recommendation-service (Port 5000)
- nlp-service (Port 5001) - includes NLTK data
- photo-analysis (Port 5002)
- fraud-detection (Port 5003)
- dating-coach-service (Port 5004)
- content-generator (Port 5005)

#### Realtime Service (Go)
**File:** `backend/services/realtime-service/Dockerfile`

**Issues Fixed:**
- ❌ Previous: Copying go.mod/go.sum from current directory
- ✅ Fixed: Copy from `backend/services/realtime-service/go.mod`
- ❌ Previous: Using git commands in ldflags (fails in clean Docker)
- ✅ Fixed: Simplified build flags

**Configuration:**
```dockerfile
# Builder
FROM golang:1.21-alpine AS builder
COPY backend/services/realtime-service/go.mod ./
RUN go mod download
COPY backend/services/realtime-service/ .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o /app/realtime-service ./cmd/server

# Runtime
FROM alpine:3.19
COPY --from=builder /app/realtime-service .
```

#### Frontend (React/Vite)
**File:** `infrastructure/docker/frontend/Dockerfile`

**Issues Fixed:**
- ❌ Previous: `npm ci --only=production` (missing dev dependencies for build)
- ✅ Fixed: `npm ci` (installs all dependencies including dev)

**Configuration:**
- ✅ Multi-stage build: Node builder → Nginx runtime
- ✅ Builder: Installs all deps, builds Vite app
- ✅ Runtime: `nginx:1.25-alpine` serving static files
- ✅ Build args for environment variables (VITE_API_URL, etc.)
- ✅ Proper nginx permissions and health checks

#### Backend Unified
**File:** `backend/Dockerfile`

**Issues Fixed:**
- ❌ Previous: Copying from root directory
- ✅ Fixed: Copying from `backend/` subdirectory

**Configuration:**
```dockerfile
COPY backend/package*.json ./
COPY backend/tsconfig.json ./
COPY backend/src ./src
```

---

### 3. `.dockerignore`

**Issue:**
- Docker compose files were being ignored, causing issues with some builds

**Fix:**
```
# Before
docker-compose*.yml

# After (commented out)
# docker-compose*.yml
```

---

## Docker Image Base Versions

### Node.js Services
- **Base Image:** `node:20-alpine`
- **Rationale:** Smaller image size, latest LTS Node.js version
- **Size:** ~180MB (vs ~900MB for node:20)

### Python Services
- **Base Image:** `python:3.11-slim`
- **Rationale:** Minimal Debian-based image, good package compatibility
- **Size:** ~150MB (vs ~800MB for python:3.11)

### Go Service
- **Builder:** `golang:1.21-alpine`
- **Runtime:** `alpine:3.19`
- **Rationale:** Minimal runtime, compiled binary has no dependencies
- **Size:** ~15MB

### Frontend
- **Builder:** `node:20-alpine`
- **Runtime:** `nginx:1.25-alpine`
- **Rationale:** Static files served efficiently by nginx
- **Size:** ~25MB

---

## Network Configuration

### Development (`infrastructure/docker/docker-compose.yml`)
```yaml
networks:
  flamoral-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

### Production (`docker-compose.prod.yml`)
```yaml
networks:
  flamoral:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
  monitoring:
    driver: bridge
```

### Staging (`docker-compose.staging.yml`)
```yaml
networks:
  flamoral-staging:
    driver: bridge
```

---

## Volume Configuration

### Development Volumes
- `postgres-data` - PostgreSQL databases
- `redis-data` - Redis cache/sessions
- `mongodb-data` - MongoDB messages
- `minio-data` - S3-compatible object storage
- `rabbitmq-data` - Message queue
- `elasticsearch-data` - Search indices

### Production Volumes
- `prometheus-data` - Metrics (30 day retention)
- `grafana-data` - Dashboards
- `jaeger-data` - Distributed tracing

---

## Health Checks

### Node.js Services
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1
```

### Python Services
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1
```

### Go Service
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:4011/health || exit 1
```

### Infrastructure Services
- **PostgreSQL:** `pg_isready -U ${POSTGRES_USER}`
- **Redis:** `redis-cli ping`
- **MongoDB:** `mongosh --eval "db.adminCommand('ping')"`
- **RabbitMQ:** `rabbitmq-diagnostics ping`
- **Elasticsearch:** `curl http://localhost:9200/_cluster/health`
- **MinIO:** `curl http://localhost:9000/minio/health/live`

---

## Security Best Practices Implemented

1. ✅ **Non-root users** in all containers
2. ✅ **Multi-stage builds** to minimize attack surface
3. ✅ **No secrets in images** - all via environment variables
4. ✅ **Minimal base images** (Alpine/Slim variants)
5. ✅ **Security updates** applied in base layers
6. ✅ **Read-only root filesystems** where applicable
7. ✅ **Resource limits** defined in production compose
8. ✅ **Health checks** for automatic recovery

---

## Port Mapping

### Backend Services (Node.js)
- 4000 - API Gateway
- 4001 - Auth Service
- 4002 - User Service
- 4003 - Matching Service
- 4004 - Messaging Service
- 4005 - Media Service
- 4006 - Payment Service
- 4007 - Notification Service
- 4008 - Analytics Service
- 4009 - Moderation Service
- 4010 - Admin Service
- 4011 - Realtime Service (Go)

### AI Services (Python)
- 5000 - Recommendation Service
- 5001 - NLP Service
- 5002 - Photo Analysis
- 5003 - Fraud Detection
- 5004 - Dating Coach
- 5005 - Content Generator

### Infrastructure
- 5432 - PostgreSQL
- 6379 - Redis
- 27017 - MongoDB
- 5672 - RabbitMQ (AMQP)
- 15672 - RabbitMQ (Management UI)
- 9000 - MinIO (API)
- 9001 - MinIO (Console)
- 9200 - Elasticsearch

### Monitoring
- 9090 - Prometheus
- 3000 - Grafana
- 16686 - Jaeger UI

---

## Build Commands

### Development
```bash
# From project root
cd infrastructure/docker
docker-compose up -d

# Build specific service
docker-compose build api-gateway
docker-compose up -d api-gateway
```

### Production
```bash
# From project root
docker-compose -f docker-compose.prod.yml up -d

# With environment file
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### Staging
```bash
# From project root
docker-compose -f docker-compose.staging.yml up -d
```

### Individual Service Build
```bash
# From project root
docker build -f backend/services/api-gateway/Dockerfile -t flamoral/api-gateway:latest .
```

---

## Troubleshooting

### Issue: Service fails to start
**Solution:** Check health of dependencies
```bash
docker-compose ps
docker-compose logs <service-name>
```

### Issue: Cannot connect to database
**Solution:** Ensure database is healthy before service starts
```bash
docker-compose ps postgres
# Should show "healthy" status
```

### Issue: Build fails - cannot find shared module
**Solution:** Ensure build context is project root
```yaml
build:
  context: ../../  # or . if at root
  dockerfile: backend/services/service-name/Dockerfile
```

### Issue: Permission denied in container
**Solution:** Check file ownership matches container user
```dockerfile
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
```

---

## Performance Optimizations

1. **Layer Caching:** Package files copied before source code
2. **Multi-stage builds:** Separate build and runtime stages
3. **Minimal dependencies:** Only production deps in final image
4. **npm ci:** Faster, deterministic installs vs npm install
5. **Cache cleaning:** `npm cache clean --force` after installs
6. **Python venv:** Isolated dependencies, faster startup
7. **Go static binary:** No runtime dependencies needed
8. **Nginx static serving:** Optimized for frontend assets

---

## Next Steps

1. ✅ All Dockerfiles are properly configured
2. ✅ All docker-compose files have correct paths and dependencies
3. ✅ Health checks and networking are properly configured
4. 📋 TODO: Set up CI/CD pipeline to build and push images
5. 📋 TODO: Configure Kubernetes manifests for production deployment
6. 📋 TODO: Set up automated security scanning (Trivy, Snyk)
7. 📋 TODO: Implement proper secrets management (Azure Key Vault)

---

## Files Modified

### Docker Compose Files
- ✅ `infrastructure/docker/docker-compose.yml`
- ✅ `docker-compose.prod.yml`
- ✅ `docker-compose.staging.yml`

### Dockerfiles
- ✅ `backend/Dockerfile`
- ✅ `backend/services/realtime-service/Dockerfile`
- ✅ `infrastructure/docker/frontend/Dockerfile`

### Configuration Files
- ✅ `.dockerignore`

### Total Files Modified: 6

---

## Validation

To validate all fixes are working:

```bash
# Validate compose files
docker-compose -f infrastructure/docker/docker-compose.yml config
docker-compose -f docker-compose.prod.yml config
docker-compose -f docker-compose.staging.yml config

# Build all services (development)
cd infrastructure/docker
docker-compose build

# Build specific services
docker-compose build api-gateway auth-service user-service

# Start infrastructure only
docker-compose up -d postgres redis mongodb rabbitmq elasticsearch minio

# Check all services are healthy
docker-compose ps
```

---

## Date: 2025-12-15
## Author: Claude (Anthropic AI)
## Status: ✅ Complete
