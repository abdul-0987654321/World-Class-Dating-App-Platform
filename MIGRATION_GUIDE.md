# ConnectSphere Platform - Migration Guide

## Overview

This guide documents the complete restructuring of the ConnectSphere Dating Platform from a microservices architecture to a unified, production-ready structure.

## What Changed

### 🔄 Major Changes

1. **Backend Consolidation**
   - Merged 9 microservices into 1 unified backend
   - Single codebase for REST, GraphQL, and WebSocket
   - Centralized configuration and database connections
   - Unified logging and error handling

2. **Frontend Reorganization**
   - Clean component structure
   - Proper service layer separation
   - Standardized routing and state management

3. **Infrastructure Overhaul**
   - Clean Docker images with multi-stage builds
   - Single docker-compose.yml file
   - NGINX API Gateway configuration
   - Monitoring stack integration

4. **Docker Hub Integration**
   - Repository: `citadelcloud1/world-class-dating-platform`
   - Clean image tags and versioning
   - Automated build process

## New Project Structure

```
ConnectSphere/
├── backend-unified/              # 🆕 NEW - Consolidated backend
│   ├── src/
│   │   ├── api/
│   │   │   ├── rest/
│   │   │   ├── graphql/
│   │   │   └── websocket/
│   │   ├── services/
│   │   │   ├── auth/
│   │   │   ├── user/
│   │   │   ├── matching/
│   │   │   ├── messaging/
│   │   │   ├── media/
│   │   │   ├── moderation/
│   │   │   ├── notification/
│   │   │   ├── payment/
│   │   │   ├── analytics/
│   │   │   └── integrations/
│   │   │       ├── azure/
│   │   │       ├── stripe/
│   │   │       ├── twilio/
│   │   │       ├── sendgrid/
│   │   │       ├── agora/
│   │   │       └── sentry/
│   │   ├── repositories/
│   │   │   ├── postgres/
│   │   │   ├── mongodb/
│   │   │   └── redis/
│   │   ├── middleware/
│   │   ├── validators/
│   │   ├── config/
│   │   ├── utils/
│   │   ├── types/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── migrations/
│   ├── tests/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── package.json
│   └── .env.example
│
├── frontend/                     # ✨ CLEANED - Organized structure
│   └── web/
│       ├── src/
│       │   ├── app/              # Routing & state
│       │   ├── components/       # UI components
│       │   ├── services/         # API clients
│       │   ├── hooks/
│       │   ├── utils/
│       │   └── assets/
│       ├── public/
│       ├── Dockerfile
│       └── package.json
│
├── infrastructure/               # ♻️ REORGANIZED
│   ├── docker/
│   │   ├── backend/              # 🆕 NEW
│   │   │   ├── Dockerfile
│   │   │   └── Dockerfile.dev
│   │   ├── frontend/             # 🆕 NEW
│   │   │   ├── Dockerfile
│   │   │   ├── Dockerfile.dev
│   │   │   └── nginx-frontend.conf
│   │   ├── nginx/                # 🆕 NEW - API Gateway
│   │   │   ├── Dockerfile
│   │   │   ├── nginx.conf
│   │   │   └── conf.d/
│   │   │       └── default.conf
│   │   └── monitoring/
│   ├── k8s/
│   ├── terraform/
│   ├── ansible/
│   ├── database/
│   ├── scripts/
│   └── monitoring/
│
├── docs/                         # 📚 DOCUMENTATION
├── tests/                        # 🧪 E2E tests
├── docker-compose-new.yml        # 🆕 NEW - Complete setup
├── ARCHITECTURE.md               # 🆕 NEW
├── MIGRATION_GUIDE.md            # 🆕 NEW (this file)
├── .env.example
├── .gitignore
└── README.md
```

## Removed/Deprecated

### ❌ Removed Files/Folders

1. **Old Microservices Structure**
   ```
   ❌ backend/services/user-service/
   ❌ backend/services/matching-service/
   ❌ backend/services/messaging-service/
   ❌ backend/services/media-service/
   ❌ backend/services/moderation-service/
   ❌ backend/services/notification-service/
   ❌ backend/services/payment-service/
   ❌ backend/services/analytics-service/
   ❌ backend/services/api-gateway/
   ```
   **Reason**: Consolidated into `backend-unified/`

2. **Duplicate Docker Files**
   ```
   ❌ docker-compose.dev.yml
   ❌ docker-compose.staging.yml
   ❌ Multiple scattered Dockerfiles
   ```
   **Reason**: Replaced with clean `docker-compose-new.yml`

3. **Scattered Configuration Files**
   ```
   ❌ Multiple .env files across services
   ❌ Duplicate database configs
   ❌ Redundant docker configs
   ```
   **Reason**: Centralized in root `.env.example`

4. **Duplicate Frontend Folders**
   ```
   ❌ frontend/src/ (if it was duplicate)
   ```
   **Reason**: Consolidated into `frontend/web/src/`

5. **Old Infrastructure**
   ```
   ❌ infrastructure/kubernetes/ (duplicate of k8s/)
   ❌ Scattered docker files
   ```
   **Reason**: Cleaned and organized

## Migration Steps

### Step 1: Backup Current Code

```bash
# Create backup
cd World-Class-Dating-App-Platform
tar -czf ../backup-$(date +%Y%m%d).tar.gz .

# Or use git
git add .
git commit -m "Backup before restructuring"
git push origin backup-branch
```

### Step 2: Code Migration

#### Backend Migration

**Option A: Manual Migration**

1. Copy business logic from each microservice:
   ```bash
   # Example for user service
   cp backend/services/user-service/src/services/* backend-unified/src/services/user/
   cp backend/services/user-service/src/api/controllers/* backend-unified/src/api/rest/
   cp backend/services/user-service/src/api/routes/* backend-unified/src/api/rest/
   ```

2. Update imports in copied files:
   ```typescript
   // OLD
   import { UserRepository } from '../repositories/user.repository';

   // NEW
   import { UserRepository } from '@repositories/postgres/user.repository';
   ```

3. Consolidate database connections:
   - All PostgreSQL connections → `config/database.config.ts`
   - All MongoDB connections → `config/database.config.ts`
   - All Redis connections → `config/redis.config.ts`

4. Merge middleware:
   - Authentication middleware from all services → `middleware/auth.middleware.ts`
   - Rate limiting → `middleware/rateLimit.middleware.ts`

**Option B: Gradual Migration** (Recommended for large teams)

1. Keep old structure temporarily
2. Create new unified backend alongside
3. Migrate one service at a time
4. Test thoroughly after each migration
5. Remove old services when confident

#### Frontend Migration

Frontend is already well-organized. Only need to:

1. Ensure all API calls point to new endpoints:
   ```typescript
   // OLD (if there were service-specific endpoints)
   const API_URL = 'http://localhost:3001';

   // NEW
   const API_URL = process.env.VITE_API_URL || 'http://localhost/api';
   ```

2. Update WebSocket connections:
   ```typescript
   // OLD
   const socket = io('http://localhost:5001');

   // NEW
   const socket = io(process.env.VITE_WS_URL || 'http://localhost/ws');
   ```

### Step 3: Environment Configuration

1. Create unified `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Fill in all credentials:
   ```bash
   # Required: Database passwords
   DB_PASSWORD=your_secure_password
   MONGODB_PASSWORD=your_secure_password
   REDIS_PASSWORD=your_secure_password
   RABBITMQ_PASSWORD=your_secure_password

   # Required: JWT secrets
   JWT_ACCESS_SECRET=$(openssl rand -base64 64)
   JWT_REFRESH_SECRET=$(openssl rand -base64 64)

   # Required: External services
   AZURE_STORAGE_KEY=...
   STRIPE_SECRET_KEY=...
   TWILIO_AUTH_TOKEN=...
   SENDGRID_API_KEY=...
   ```

### Step 4: Database Migration

1. **Export existing data** (if applicable):
   ```bash
   # PostgreSQL
   pg_dump connectsphere > backup.sql

   # MongoDB
   mongodump --db connectsphere --out /backup/mongo
   ```

2. **Update database schemas**:
   ```bash
   cd backend-unified
   npm install
   npm run migrate
   ```

3. **Import data** (if needed):
   ```bash
   psql connectsphere < backup.sql
   mongorestore --db connectsphere /backup/mongo
   ```

### Step 5: Docker Build & Test

1. **Build all images**:
   ```bash
   # Build backend
   cd backend-unified
   docker build -t connectsphere-backend .

   # Build frontend
   cd ../frontend/web
   docker build -f ../../infrastructure/docker/frontend/Dockerfile -t connectsphere-frontend .

   # Build NGINX gateway
   cd ../../infrastructure/docker/nginx
   docker build -t connectsphere-nginx .
   ```

2. **Test with docker-compose**:
   ```bash
   cd ../../..
   docker-compose -f docker-compose-new.yml up -d
   ```

3. **Verify services**:
   ```bash
   # Check health
   curl http://localhost/health
   curl http://localhost/api/health

   # Check logs
   docker-compose -f docker-compose-new.yml logs -f backend
   ```

### Step 6: Deploy to Docker Hub

1. **Login to Docker Hub**:
   ```bash
   docker login
   # Username: citadelcloud1
   # Password: dckr_pat_l2QV_RTE3ScNgCiS1hUbS9hjiA0
   ```

2. **Tag images**:
   ```bash
   docker tag connectsphere-backend citadelcloud1/world-class-dating-platform:backend-latest
   docker tag connectsphere-frontend citadelcloud1/world-class-dating-platform:frontend-latest
   docker tag connectsphere-nginx citadelcloud1/world-class-dating-platform:nginx-latest
   docker tag connectsphere-backend citadelcloud1/world-class-dating-platform:backend-v1.0.0
   docker tag connectsphere-frontend citadelcloud1/world-class-dating-platform:frontend-v1.0.0
   docker tag connectsphere-nginx citadelcloud1/world-class-dating-platform:nginx-v1.0.0
   ```

3. **Push to Docker Hub**:
   ```bash
   docker push citadelcloud1/world-class-dating-platform:backend-latest
   docker push citadelcloud1/world-class-dating-platform:frontend-latest
   docker push citadelcloud1/world-class-dating-platform:nginx-latest
   docker push citadelcloud1/world-class-dating-platform:backend-v1.0.0
   docker push citadelcloud1/world-class-dating-platform:frontend-v1.0.0
   docker push citadelcloud1/world-class-dating-platform:nginx-v1.0.0
   ```

### Step 7: Update CI/CD Pipelines

Update your CI/CD configuration (if you have one):

```yaml
# .github/workflows/deploy.yml (example)
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Backend
        run: |
          cd backend-unified
          docker build -t ${{ secrets.DOCKER_REPO }}:backend-${{ github.sha }} .

      - name: Build Frontend
        run: |
          cd frontend/web
          docker build -f ../../infrastructure/docker/frontend/Dockerfile -t ${{ secrets.DOCKER_REPO }}:frontend-${{ github.sha }} .

      - name: Push to Docker Hub
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push ${{ secrets.DOCKER_REPO }}:backend-${{ github.sha }}
          docker push ${{ secrets.DOCKER_REPO }}:frontend-${{ github.sha }}
```

## Testing Checklist

### ✅ Backend Tests

- [ ] All unit tests pass: `npm test`
- [ ] Integration tests pass
- [ ] Database connections work
- [ ] Redis caching works
- [ ] RabbitMQ queues work
- [ ] External services integrate correctly
- [ ] Authentication flow works
- [ ] API endpoints respond correctly

### ✅ Frontend Tests

- [ ] App builds successfully: `npm run build`
- [ ] All pages load
- [ ] API calls work
- [ ] WebSocket connects
- [ ] Authentication works
- [ ] Routing works
- [ ] State management works

### ✅ Integration Tests

- [ ] End-to-end user flow works
- [ ] Login → Profile → Matching → Messaging
- [ ] Payment flow works
- [ ] Photo upload works
- [ ] Real-time messaging works
- [ ] Notifications work

### ✅ Infrastructure Tests

- [ ] Docker images build successfully
- [ ] Docker containers start correctly
- [ ] Health checks pass
- [ ] NGINX routes correctly
- [ ] Load balancing works (if applicable)
- [ ] SSL/TLS works (if configured)

### ✅ Performance Tests

- [ ] API response time < 200ms
- [ ] Page load time < 2s
- [ ] WebSocket latency < 100ms
- [ ] Database queries < 50ms
- [ ] Memory usage acceptable
- [ ] No memory leaks

## Rollback Plan

If issues arise, rollback steps:

1. **Stop new services**:
   ```bash
   docker-compose -f docker-compose-new.yml down
   ```

2. **Restore from backup**:
   ```bash
   tar -xzf ../backup-YYYYMMDD.tar.gz
   ```

3. **Restart old services**:
   ```bash
   docker-compose up -d
   ```

4. **Restore database** (if modified):
   ```bash
   psql connectsphere < backup.sql
   ```

## Common Issues & Solutions

### Issue 1: Port Conflicts

**Problem**: Ports 80, 443, 3000, 4000, 5000 already in use

**Solution**:
```bash
# Find processes using ports
netstat -ano | findstr :80
netstat -ano | findstr :3000

# Kill processes or change ports in .env
```

### Issue 2: Database Connection Fails

**Problem**: Backend can't connect to PostgreSQL/MongoDB

**Solution**:
1. Check if databases are running:
   ```bash
   docker-compose ps
   ```

2. Check environment variables:
   ```bash
   docker exec connectsphere-backend env | grep DB
   ```

3. Check network connectivity:
   ```bash
   docker network inspect connectsphere_connectsphere
   ```

### Issue 3: NGINX 502 Bad Gateway

**Problem**: NGINX can't reach backend

**Solution**:
1. Check if backend is running:
   ```bash
   docker-compose ps backend
   ```

2. Check backend health:
   ```bash
   docker exec connectsphere-backend curl http://localhost:3000/health
   ```

3. Check NGINX configuration:
   ```bash
   docker exec connectsphere-nginx nginx -t
   ```

### Issue 4: Frontend Can't Reach API

**Problem**: CORS errors or 404s from frontend

**Solution**:
1. Check environment variables:
   ```bash
   cat frontend/web/.env
   # Should have: VITE_API_URL=http://localhost/api
   ```

2. Rebuild frontend with correct env:
   ```bash
   docker-compose -f docker-compose-new.yml build frontend
   ```

### Issue 5: Docker Build Fails

**Problem**: Out of disk space or memory

**Solution**:
```bash
# Clean up Docker
docker system prune -a

# Increase Docker memory (Docker Desktop settings)
# Recommended: 4GB RAM, 50GB disk
```

## Performance Optimization

### After Migration

1. **Enable caching**:
   - Redis for API responses
   - NGINX for static assets
   - Browser caching headers

2. **Optimize database queries**:
   - Add indexes
   - Use connection pooling
   - Enable query caching

3. **Enable monitoring**:
   - Set up Prometheus alerts
   - Create Grafana dashboards
   - Monitor error rates

4. **Scale horizontally**:
   - Add more backend instances
   - Use load balancer
   - Add read replicas for database

## Next Steps

1. **Monitor production** for 1-2 weeks
2. **Collect metrics** and optimize bottlenecks
3. **Update documentation** based on learnings
4. **Train team** on new structure
5. **Plan next phase** of improvements

## Support & Questions

- **Documentation**: See `ARCHITECTURE.md` and `README.md`
- **Issues**: Create GitHub issue
- **Architecture questions**: Review `ARCHITECTURE.md`
- **Docker issues**: Check Docker logs

## Summary of Benefits

✅ **Simplified Architecture**
- 1 backend instead of 9 microservices
- Easier to understand and maintain
- Faster development

✅ **Better Performance**
- No inter-service network latency
- Shared connections and caches
- Optimized build process

✅ **Easier Deployment**
- Single docker-compose file
- Clear infrastructure
- Simple CI/CD

✅ **Cost Reduction**
- Fewer running containers
- Less resource overhead
- Simpler infrastructure

✅ **Better Developer Experience**
- Unified codebase
- Single point of debugging
- Consistent patterns

## Conclusion

This migration transforms the ConnectSphere platform from a complex microservices setup into a clean, maintainable, production-ready monolith. The new structure provides room for growth while maintaining simplicity and performance.

**Status**: ✅ Structure created and documented
**Next**: Manual migration of existing business logic

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-13
**Maintained By**: ConnectSphere Team
