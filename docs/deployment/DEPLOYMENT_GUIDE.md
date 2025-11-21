# Deployment Guide - World-Class Dating Platform

**Date:** 2025-01-19
**Version:** 2.0.0 with Analytics Service
**Docker Hub:** https://hub.docker.com/repository/docker/citadelcloud1/world-class-dating-platform

---

## Overview

This guide covers deploying the complete World-Class Dating Platform including the new Analytics Service with advertising tracking capabilities.

### Services Included

1. **user-service** (Port 3001) - User management and authentication
2. **matching-service** (Port 3002) - Matching algorithm
3. **messaging-service** (Port 3003) - Real-time messaging with Socket.IO
4. **media-service** (Port 3004) - Photo/video uploads
5. **moderation-service** (Port 3005) - Content moderation
6. **notification-service** (Port 3006) - Push notifications
7. **analytics-service** (Port 3007) - **NEW** Tracking and analytics
8. **payment-service** (Port 3008) - Subscriptions and payments
9. **api-gateway** (Port 4000) - API Gateway
10. **web-frontend** (Port 3000) - React web application

---

## Prerequisites

### Required Software

- Docker Desktop 4.0+ (with Docker Compose)
- Git
- Node.js 20+ (for local development)
- PostgreSQL 15+ (for databases)
- Redis 7+ (for caching and queuing)

### Required Accounts

- Docker Hub account
- Meta Business Manager (for Meta Pixel and CAPI)
- Google Tag Manager account
- Google Analytics 4 property
- Stripe account (for payments)
- SendGrid account (for emails)
- Twilio account (for SMS)
- Firebase project (for push notifications)

---

## Step 1: Build Docker Images

### Option A: Using PowerShell (Windows)

```powershell
# Navigate to project root
cd World-Class-Dating-App-Platform

# Make sure Docker Desktop is running
docker info

# Run build script
.\docker-build-push.ps1
```

### Option B: Using Bash (Linux/Mac)

```bash
# Navigate to project root
cd World-Class-Dating-App-Platform

# Make script executable
chmod +x docker-build-push.sh

# Run build script
./docker-build-push.sh
```

### Option C: Manual Build (Individual Services)

```bash
# Analytics Service
cd backend/services/analytics-service
docker build -t citadelcloud1/world-class-dating-platform:analytics-service-latest .
docker push citadelcloud1/world-class-dating-platform:analytics-service-latest

# User Service
cd ../user-service
docker build -t citadelcloud1/world-class-dating-platform:user-service-latest .
docker push citadelcloud1/world-class-dating-platform:user-service-latest

# Repeat for other services...
```

---

## Step 2: Environment Configuration

### Backend Services (.env files)

Each service needs its own `.env` file. Copy from `.env.example`:

#### Analytics Service

```bash
cd backend/services/analytics-service
cp .env.example .env
```

Edit `.env`:
```env
# Database (PostgreSQL)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=connectsphere_analytics
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=7

# Analytics Configuration
EVENT_BATCH_SIZE=1000
EVENT_FLUSH_INTERVAL_MS=5000
DATA_RETENTION_DAYS=365

# Meta CAPI
META_PIXEL_ID=XXXXXXXXXXXX
META_CAPI_ACCESS_TOKEN=your_access_token

# JWT Secrets
JWT_ACCESS_SECRET=your_jwt_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_chars
SERVICE_API_KEY=your_internal_service_api_key
```

#### Repeat for All Services

- user-service
- matching-service
- messaging-service
- media-service
- moderation-service
- notification-service
- payment-service
- api-gateway

### Frontend Configuration

```bash
cd frontend/web
cp .env.example .env
```

Edit `.env`:
```env
# API Configuration
VITE_API_URL=http://localhost:4000

# Analytics Configuration
VITE_ANALYTICS_ENABLED=true
VITE_ANALYTICS_API_URL=http://localhost:3007
VITE_GTM_ID=GTM-XXXXXXX
VITE_META_PIXEL_ID=XXXXXXXXXXXX
```

---

## Step 3: Database Setup

### PostgreSQL Databases

Create databases for each service:

```sql
-- Main user database
CREATE DATABASE connectsphere_users;

-- Analytics database
CREATE DATABASE connectsphere_analytics;

-- Other service databases
CREATE DATABASE connectsphere_matching;
CREATE DATABASE connectsphere_messaging;
CREATE DATABASE connectsphere_media;
CREATE DATABASE connectsphere_moderation;
CREATE DATABASE connectsphere_notifications;
CREATE DATABASE connectsphere_payments;
```

### Run Migrations

#### Analytics Service Migration

```bash
cd backend/services/analytics-service
psql -U postgres -d connectsphere_analytics -f src/infrastructure/database/migrations/001_create_tracking_tables.sql
```

#### Other Services

```bash
# User Service
cd backend/services/user-service
npx knex migrate:latest

# Repeat for other services...
```

---

## Step 4: Docker Compose Deployment

### Create docker-compose.yml

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Redis Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Analytics Service (NEW)
  analytics-service:
    image: citadelcloud1/world-class-dating-platform:analytics-service-latest
    ports:
      - "3007:3007"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    env_file:
      - ./backend/services/analytics-service/.env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  # User Service
  user-service:
    image: citadelcloud1/world-class-dating-platform:user-service-latest
    ports:
      - "3001:3001"
    env_file:
      - ./backend/services/user-service/.env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  # Matching Service
  matching-service:
    image: citadelcloud1/world-class-dating-platform:matching-service-latest
    ports:
      - "3002:3002"
    env_file:
      - ./backend/services/matching-service/.env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  # Messaging Service
  messaging-service:
    image: citadelcloud1/world-class-dating-platform:messaging-service-latest
    ports:
      - "3003:3003"
    env_file:
      - ./backend/services/messaging-service/.env
    depends_on:
      - redis
    restart: unless-stopped

  # Media Service
  media-service:
    image: citadelcloud1/world-class-dating-platform:media-service-latest
    ports:
      - "3004:3004"
    env_file:
      - ./backend/services/media-service/.env
    depends_on:
      - postgres
    restart: unless-stopped

  # Moderation Service
  moderation-service:
    image: citadelcloud1/world-class-dating-platform:moderation-service-latest
    ports:
      - "3005:3005"
    env_file:
      - ./backend/services/moderation-service/.env
    depends_on:
      - postgres
    restart: unless-stopped

  # Notification Service
  notification-service:
    image: citadelcloud1/world-class-dating-platform:notification-service-latest
    ports:
      - "3006:3006"
    env_file:
      - ./backend/services/notification-service/.env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  # Payment Service
  payment-service:
    image: citadelcloud1/world-class-dating-platform:payment-service-latest
    ports:
      - "3008:3008"
    env_file:
      - ./backend/services/payment-service/.env
    depends_on:
      - postgres
    restart: unless-stopped

  # API Gateway
  api-gateway:
    image: citadelcloud1/world-class-dating-platform:api-gateway-latest
    ports:
      - "4000:4000"
    env_file:
      - ./backend/services/api-gateway/.env
    depends_on:
      - user-service
      - matching-service
      - messaging-service
      - media-service
      - analytics-service
    restart: unless-stopped

  # Web Frontend
  web-frontend:
    image: citadelcloud1/world-class-dating-platform:web-frontend-latest
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:4000
      - VITE_ANALYTICS_API_URL=http://localhost:3007
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Start All Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f analytics-service

# Check status
docker-compose ps
```

---

## Step 5: Verify Deployment

### Health Checks

```bash
# Analytics Service
curl http://localhost:3007/health

# User Service
curl http://localhost:3001/health

# API Gateway
curl http://localhost:4000/health

# Web Frontend
curl http://localhost:3000
```

Expected response for analytics service:
```json
{
  "status": "healthy",
  "service": "analytics-service",
  "timestamp": "2025-01-19T...",
  "database": {
    "connected": true,
    "pool": {
      "totalCount": 2,
      "idleCount": 2,
      "waitingCount": 0
    }
  }
}
```

### Test Analytics Tracking

```bash
# Track test event
curl -X POST http://localhost:3007/api/tracking/event \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "test",
    "eventName": "deployment_test",
    "sessionId": "test-session-123"
  }'

# Get analytics
curl http://localhost:3007/api/analytics/funnel/conversion-rates
```

---

## Step 6: Frontend Integration

### Verify Analytics in Browser

1. Open browser to http://localhost:3000
2. Open Developer Tools (F12)
3. Go to Console tab
4. Look for:
   - "Analytics initialized successfully"
   - "GTM initialized: GTM-XXXXXXX"
   - "Meta Pixel initialized: XXXXXXXXXXXX"

### Verify GTM Data Layer

In Console:
```javascript
// Check dataLayer exists
console.log(window.dataLayer);

// Should see events like:
// [{event: "gtm.js", ...}, {event: "page_view", ...}]
```

### Verify Meta Pixel

In Console:
```javascript
// Check fbq exists
console.log(window.fbq);

// Should be function
```

---

## Step 7: Configure Tracking

### Google Tag Manager Setup

1. Go to https://tagmanager.google.com/
2. Create new container (Web)
3. Copy Container ID (GTM-XXXXXXX)
4. Add to frontend `.env`: `VITE_GTM_ID=GTM-XXXXXXX`

**Configure Tags:**
- Meta Pixel tag
- Google Analytics 4 tag
- TikTok Pixel tag
- Conversion tracking tags

### Meta Pixel Setup

1. Go to https://business.facebook.com/
2. Events Manager → Data Sources
3. Create Pixel
4. Copy Pixel ID
5. Add to frontend `.env`: `VITE_META_PIXEL_ID=XXXXXXXXXXXX`

**Get CAPI Access Token:**
1. Events Manager → Settings
2. Conversions API → Generate Access Token
3. Add to analytics service `.env`: `META_CAPI_ACCESS_TOKEN=...`

### Test Events in Meta Events Manager

1. Enable Test Events
2. Get test event code
3. Add to analytics `.env`: `META_TEST_EVENT_CODE=...`
4. Visit your site
5. Check Events Manager for test events

---

## Step 8: Monitoring

### Docker Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f analytics-service

# Last 100 lines
docker-compose logs --tail=100 analytics-service
```

### Database Monitoring

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d connectsphere_analytics

# Check tracking events
SELECT COUNT(*) FROM tracking_events;

# Check recent events
SELECT event_type, event_name, created_at
FROM tracking_events
ORDER BY created_at DESC
LIMIT 10;

# Check conversion funnel
SELECT utm_source, COUNT(*) as total_sessions
FROM conversion_funnel
GROUP BY utm_source;
```

---

## Troubleshooting

### Analytics Service Won't Start

1. Check logs: `docker-compose logs analytics-service`
2. Verify database connection
3. Check environment variables
4. Ensure PostgreSQL is running

### Database Connection Errors

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection inside container
docker-compose exec analytics-service sh
# Inside container:
nc -zv postgres 5432
```

### Frontend Analytics Not Tracking

1. Check browser console for errors
2. Verify GTM_ID and META_PIXEL_ID in `.env`
3. Check network tab for API calls to analytics service
4. Verify CORS settings

### Docker Build Fails

```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker build --no-cache -t ... .
```

---

## Scaling Considerations

### Horizontal Scaling

```yaml
# docker-compose.yml
analytics-service:
  deploy:
    replicas: 3
    resources:
      limits:
        cpus: '1'
        memory: 1G
```

### Load Balancing

Use Nginx or Traefik for load balancing:

```nginx
upstream analytics {
    least_conn;
    server analytics-service-1:3007;
    server analytics-service-2:3007;
    server analytics-service-3:3007;
}
```

---

## Security Checklist

- [ ] All `.env` files configured with strong passwords
- [ ] JWT secrets are 32+ characters
- [ ] Database passwords are secure
- [ ] CORS origins are restricted
- [ ] HTTPS enabled in production
- [ ] API keys are not committed to Git
- [ ] Service-to-service authentication enabled
- [ ] Rate limiting configured
- [ ] Firewall rules configured

---

## Production Deployment

### Recommended Infrastructure

- **Cloud Provider:** AWS, Azure, or Google Cloud
- **Container Orchestration:** Kubernetes or AWS ECS
- **Database:** Managed PostgreSQL (AWS RDS, Azure Database)
- **Cache:** Managed Redis (AWS ElastiCache, Azure Cache)
- **CDN:** CloudFlare or AWS CloudFront
- **Monitoring:** Datadog, New Relic, or Grafana
- **Logging:** ELK Stack or CloudWatch

### Production Checklist

- [ ] Use managed databases (no self-hosted PostgreSQL)
- [ ] Enable database backups
- [ ] Configure auto-scaling
- [ ] Set up monitoring and alerts
- [ ] Configure log aggregation
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure CDN for static assets
- [ ] Set up CI/CD pipeline
- [ ] Configure error tracking (Sentry)
- [ ] Enable database read replicas
- [ ] Configure Redis clustering
- [ ] Set up disaster recovery plan

---

## Support

For issues or questions:
1. Check service logs: `docker-compose logs -f [service-name]`
2. Verify health endpoints: `curl http://localhost:[port]/health`
3. Review environment variables
4. Check database connectivity
5. Review this guide

---

## Summary

✅ **Services:** 10 total (9 backend + 1 frontend)
✅ **New Service:** Analytics Service with tracking
✅ **Docker Images:** Built and pushed to Docker Hub
✅ **Frontend:** Analytics integration complete
✅ **Tracking:** GTM, Meta Pixel, server-side CAPI
✅ **Database:** PostgreSQL with complete schema
✅ **Documentation:** Comprehensive guides

**Next Steps:**
1. Deploy to production environment
2. Configure advertising pixels
3. Set up monitoring and alerts
4. Test end-to-end tracking flow
5. Implement remaining analytics features (TikTok, GA4, etc.)
