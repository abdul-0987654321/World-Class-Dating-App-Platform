# Docker Quick Start Guide

Fast track to getting Flamoral Dating Platform running with Docker.

## 5-Minute Setup

### 1. Prerequisites Check

```bash
# Check if Docker is installed
docker --version
docker-compose --version

# If not installed, download from:
# https://docs.docker.com/get-docker/
```

### 2. Clone and Navigate

```bash
cd /path/to/DatingPlatform/infrastructure/docker
```

### 3. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your values (optional for dev)
# Default values work for local development
nano .env  # or use your preferred editor
```

### 4. Start Services

```bash
# Option A: Using script (recommended)
./dev-start.sh

# Option B: Using Make
make dev-start

# Option C: Using docker-compose directly
docker-compose up -d
```

### 5. Verify Services

```bash
# Check health
./health-check.sh

# Or check manually
curl http://localhost:4000/health  # API Gateway
```

### 6. Access Services

```
API Gateway:     http://localhost:4000
API Docs:        http://localhost:4000/api/docs
PostgreSQL:      localhost:5432
Redis:           localhost:6379
MinIO Console:   http://localhost:9001
RabbitMQ:        http://localhost:15672
```

## Common Commands

### Development

```bash
# Start everything
make dev-start

# Start with rebuild
make dev-start-build

# Start specific service
make dev-start-service SERVICE=api-gateway

# Stop everything
make dev-stop

# View logs
make dev-logs

# View logs for specific service
make dev-logs-service SERVICE=api-gateway

# Restart
make dev-restart
```

### Building

```bash
# Build all images
make build TAG=v1.0.0

# Build without cache
make build-no-cache TAG=v1.0.0

# Build in parallel (faster)
make build-parallel TAG=v1.0.0

# Build specific service
make build-service SERVICE=api-gateway TAG=v1.0.0
```

### Deployment

```bash
# Deploy to staging
make deploy ENV=staging TAG=v1.0.0

# Deploy to production
make deploy ENV=prod TAG=v1.0.0

# Deploy specific service
make deploy-service SERVICE=api-gateway ENV=prod TAG=v1.0.0
```

### Health & Monitoring

```bash
# Check all services
make health

# Check specific service
make health-service SERVICE=api-gateway

# Show running containers
make ps

# Show resource usage
make stats
```

### Database Access

```bash
# PostgreSQL
make db-shell

# Redis
make redis-shell

# MongoDB
make mongo-shell
```

### Cleanup

```bash
# Stop and remove containers
make clean

# Remove everything (including volumes)
make clean-all
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
make dev-logs

# Check specific service
make dev-logs-service SERVICE=api-gateway

# Restart specific service
docker-compose restart api-gateway
```

### Port Already in Use

```bash
# Find process using port (Windows)
netstat -ano | findstr :4000

# Find process using port (Linux/Mac)
lsof -i :4000

# Stop the conflicting service or change port in .env
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Out of Disk Space

```bash
# Clean up unused Docker resources
make clean

# Remove everything (careful!)
make clean-all

# Remove dangling images
docker image prune -a
```

### Build Failed

```bash
# Build without cache
make build-no-cache

# Check Docker version
docker --version

# Ensure you're in the correct directory
pwd
```

## Environment-Specific Setup

### Development

```bash
# Use default .env values
cp .env.example .env

# Start services
make dev-start
```

### Staging

```bash
# Create staging environment file
cp .env.example .env.staging

# Edit with staging values
nano .env.staging

# Deploy to staging
make deploy ENV=staging TAG=v1.0.0
```

### Production

```bash
# Create production environment file
cp .env.example .env.prod

# Edit with production values (IMPORTANT!)
nano .env.prod

# Deploy to production
make deploy ENV=prod TAG=v1.0.0
```

## Service URLs Reference

### Backend Services

| Service | Port | Health Check |
|---------|------|--------------|
| API Gateway | 4000 | http://localhost:4000/health |
| Auth Service | 4001 | http://localhost:4001/health |
| User Service | 4002 | http://localhost:4002/health |
| Matching Service | 4003 | http://localhost:4003/health |
| Messaging Service | 4004 | http://localhost:4004/health |
| Media Service | 4005 | http://localhost:4005/health |
| Payment Service | 4006 | http://localhost:4006/health |
| Notification Service | 4007 | http://localhost:4007/health |
| Analytics Service | 4008 | http://localhost:4008/health |
| Moderation Service | 4009 | http://localhost:4009/health |
| Admin Service | 4010 | http://localhost:4010/health |
| Realtime Service | 4011 | http://localhost:4011/health |

### AI Services

| Service | Port | Health Check |
|---------|------|--------------|
| Recommendation | 5000 | http://localhost:5000/health |
| NLP Service | 5001 | http://localhost:5001/health |
| Photo Analysis | 5002 | http://localhost:5002/health |
| Fraud Detection | 5003 | http://localhost:5003/health |
| Dating Coach | 5004 | http://localhost:5004/health |
| Content Generator | 5005 | http://localhost:5005/health |

### Infrastructure

| Service | Port | Access |
|---------|------|--------|
| PostgreSQL | 5432 | `psql -h localhost -U flamoral -d flamoral` |
| Redis | 6379 | `redis-cli -h localhost` |
| MongoDB | 27017 | `mongosh localhost:27017` |
| MinIO | 9000 | http://localhost:9000 |
| MinIO Console | 9001 | http://localhost:9001 |
| RabbitMQ | 15672 | http://localhost:15672 |
| Elasticsearch | 9200 | http://localhost:9200 |

## Next Steps

1. **Read Full Documentation**: See [README.md](README.md)
2. **Configure Environment**: Update `.env` with real credentials
3. **Run Tests**: Execute test suites
4. **Setup CI/CD**: Configure automated deployments
5. **Monitor Services**: Setup monitoring and alerting

## Getting Help

- Check logs: `make dev-logs`
- Health check: `make health`
- Full docs: [README.md](README.md)
- System info: `make info`

## Quick Reference Card

```bash
# Start
make dev-start

# Stop
make dev-stop

# Logs
make dev-logs

# Health
make health

# Build
make build TAG=v1.0.0

# Push
make push TAG=v1.0.0

# Deploy
make deploy ENV=staging TAG=v1.0.0

# Clean
make clean

# Help
make help
```
