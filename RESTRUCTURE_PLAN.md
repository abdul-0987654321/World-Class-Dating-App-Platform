# ConnectSphere Platform - Complete Restructuring Plan

## Executive Summary
This document outlines the complete reorganization of the ConnectSphere Dating Platform into a clean, consistent, production-ready structure. The restructuring consolidates microservices into a unified backend, standardizes the frontend architecture, and establishes clean Docker infrastructure.

## Current State Analysis

### Backend (Microservices - TO BE CONSOLIDATED)
```
backend/
├── services/
│   ├── user-service/
│   ├── matching-service/
│   ├── messaging-service/
│   ├── media-service/
│   ├── moderation-service/
│   ├── notification-service/
│   ├── payment-service/
│   ├── analytics-service/
│   └── api-gateway/
└── shared/
```

### Frontend (Mixed Structure - TO BE CLEANED)
```
frontend/
├── web/
├── mobile/
└── src/ (duplicate/unclear structure)
```

### Infrastructure (Partially Organized)
```
infrastructure/
├── docker/ (needs cleanup)
├── k8s/
├── kubernetes/ (duplicate)
├── terraform/
├── monitoring/
└── database/
```

## Target Structure

### 1. Backend - Unified Monolith Architecture
```
backend/
├── src/
│   ├── api/
│   │   ├── rest/           # REST endpoints
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── matching/
│   │   │   ├── messaging/
│   │   │   ├── media/
│   │   │   ├── payments/
│   │   │   └── index.ts
│   │   ├── graphql/        # GraphQL schema & resolvers
│   │   │   ├── schema/
│   │   │   ├── resolvers/
│   │   │   └── index.ts
│   │   └── websocket/      # WebSocket handlers
│   │       ├── chat/
│   │       ├── notifications/
│   │       └── index.ts
│   ├── services/           # Business logic (consolidated from microservices)
│   │   ├── auth/
│   │   ├── user/
│   │   ├── matching/
│   │   ├── messaging/
│   │   ├── media/
│   │   ├── moderation/
│   │   ├── notification/
│   │   ├── payment/
│   │   ├── analytics/
│   │   └── integrations/   # External service integrations
│   │       ├── azure/
│   │       ├── stripe/
│   │       ├── twilio/
│   │       ├── sendgrid/
│   │       ├── agora/
│   │       └── sentry/
│   ├── repositories/       # Data access layer (ORM/DAO)
│   │   ├── postgres/
│   │   │   ├── user.repository.ts
│   │   │   ├── profile.repository.ts
│   │   │   └── ...
│   │   ├── mongodb/
│   │   │   ├── message.repository.ts
│   │   │   ├── analytics.repository.ts
│   │   │   └── ...
│   │   └── redis/
│   │       ├── cache.repository.ts
│   │       └── session.repository.ts
│   ├── validators/         # Input validation schemas
│   │   ├── auth.validator.ts
│   │   ├── user.validator.ts
│   │   └── ...
│   ├── middleware/         # Express/Fastify middleware
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── logging.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   └── ...
│   ├── config/             # Configuration management
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── queue.config.ts
│   │   └── ...
│   ├── utils/              # Utility functions
│   │   ├── logger.ts
│   │   ├── crypto.ts
│   │   └── ...
│   ├── types/              # TypeScript type definitions
│   ├── app.ts              # App initialization
│   └── server.ts           # Server entry point
├── migrations/             # Database migrations
│   ├── postgres/
│   └── mongodb/
├── tests/                  # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── Dockerfile              # Production Docker build
├── Dockerfile.dev          # Development Docker build
├── package.json
├── tsconfig.json
└── .env.example
```

### 2. Frontend - Web Application
```
frontend/web/
├── src/
│   ├── app/                # Routing & state management
│   │   ├── routes/
│   │   ├── store/          # Redux/Zustand store
│   │   └── App.tsx
│   ├── components/         # UI components
│   │   ├── auth/
│   │   ├── profile/
│   │   ├── matching/
│   │   ├── messaging/
│   │   ├── common/
│   │   └── layout/
│   ├── services/           # API & service layer
│   │   ├── api/            # REST/GraphQL API client
│   │   │   ├── auth.api.ts
│   │   │   ├── user.api.ts
│   │   │   └── ...
│   │   ├── websocket/      # WebSocket client
│   │   ├── cache/          # Client-side caching
│   │   └── storage/        # Local/session storage
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── assets/             # Static assets
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   ├── styles/             # Global styles
│   └── index.tsx
├── public/
├── Dockerfile              # Production build
├── Dockerfile.dev          # Development build
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### 3. Frontend - Mobile Application
```
frontend/mobile/
├── src/
│   ├── screens/
│   ├── components/
│   ├── navigation/
│   ├── services/
│   ├── hooks/
│   ├── utils/
│   └── App.tsx
├── android/
├── ios/
├── package.json
└── tsconfig.json
```

### 4. Infrastructure - Consolidated
```
infrastructure/
├── docker/
│   ├── backend/
│   │   ├── Dockerfile
│   │   └── Dockerfile.dev
│   ├── frontend/
│   │   ├── Dockerfile
│   │   └── Dockerfile.dev
│   ├── nginx/
│   │   ├── Dockerfile
│   │   ├── nginx.conf
│   │   ├── conf.d/
│   │   │   ├── api-gateway.conf
│   │   │   ├── websocket.conf
│   │   │   └── static.conf
│   │   └── ssl/ (optional)
│   └── monitoring/
│       ├── prometheus/
│       │   ├── Dockerfile
│       │   └── prometheus.yml
│       └── grafana/
│           ├── Dockerfile
│           └── dashboards/
├── k8s/                    # Kubernetes manifests
│   ├── backend/
│   ├── frontend/
│   ├── database/
│   └── ingress/
├── terraform/              # Infrastructure as Code
│   ├── aws/
│   ├── azure/
│   └── modules/
├── ansible/                # Configuration management
├── database/               # Database scripts
│   ├── postgres/
│   │   ├── init/
│   │   └── backups/
│   └── mongodb/
│       └── init/
├── scripts/                # Deployment & utility scripts
│   ├── deploy.sh
│   ├── backup.sh
│   └── health-check.sh
└── monitoring/
    ├── grafana/
    │   └── provisioning/
    └── prometheus/
        └── rules/
```

### 5. Root Level
```
project-root/
├── backend/
├── frontend/
├── infrastructure/
├── docs/                   # Documentation
├── tests/                  # E2E & integration tests
├── scripts/                # Root-level scripts
├── docker-compose.yml      # Single, clean compose file
├── docker-compose.dev.yml  # Development override
├── .env.example
├── .gitignore
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## Docker Infrastructure

### Backend Dockerfile (Multi-Stage)
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
EXPOSE 3000 4000 5000
CMD ["node", "dist/server.js"]
```

### Frontend Dockerfile (Multi-Stage with NGINX)
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production with NGINX
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose Structure
```yaml
version: '3.9'

services:
  # Frontend
  frontend:
    build: ./frontend/web
    ports: ["8080:8080"]

  # Backend (unified)
  backend:
    build: ./backend
    ports: ["3000:3000", "4000:4000", "5000:5000"]

  # NGINX Gateway
  nginx:
    build: ./infrastructure/docker/nginx
    ports: ["80:80", "443:443"]

  # Databases
  postgres:
    image: postgres:15-alpine

  mongodb:
    image: mongo:7-jammy

  redis:
    image: redis:7-alpine

  # Queue
  rabbitmq:
    image: rabbitmq:3.12-management-alpine

  # Search
  elasticsearch:
    image: elasticsearch:8.11.0

  # Monitoring
  prometheus:
    build: ./infrastructure/docker/monitoring/prometheus

  grafana:
    build: ./infrastructure/docker/monitoring/grafana
```

## Network Architecture

### API Gateway (NGINX)
- **Route /api/** → Backend REST (port 3000)
- **Route /graphql** → Backend GraphQL (port 4000)
- **Route /ws** → Backend WebSocket (port 5000)
- **Route /** → Frontend (port 8080)
- **Route /static/** → CDN/Static assets

### Load Balancing
- Round-robin for REST API
- Sticky sessions for WebSocket
- Health checks every 30s

## Data Layer Integration

### PostgreSQL
- Primary relational database
- Users, profiles, subscriptions, payments
- Connection pooling: min=2, max=10

### MongoDB
- Document store for messages, analytics
- Real-time data, logs
- Indexed for fast queries

### Redis
- Session store
- Caching layer (user profiles, match results)
- Rate limiting data
- TTL: 1 hour for cache, 24 hours for sessions

### RabbitMQ / Kafka
- **Queues:**
  - matching_queue
  - notification_queue
  - analytics_queue
  - moderation_queue

## External Services Integration

### Azure Services
- **Azure Storage**: Media files (photos, videos)
- **Azure Face API**: Photo verification
- **Azure Content Moderator**: Content moderation

### Stripe
- Payment processing
- Subscription management
- Webhook handling

### Twilio
- SMS verification
- Phone number validation

### SendGrid
- Transactional emails
- Template management

### Agora
- Video/voice calling
- Token generation

### Sentry
- Error tracking
- Performance monitoring

### Google Analytics
- User behavior tracking
- Conversion tracking

## Migration Steps

### Phase 1: Backup & Preparation
1. Create full backup of current codebase
2. Document all existing API endpoints
3. Create migration checklist

### Phase 2: Backend Consolidation
1. Create new unified backend structure
2. Move business logic from each microservice to corresponding service folder
3. Consolidate database connections
4. Merge API routes into /api/rest, /api/graphql, /api/websocket
5. Update all imports

### Phase 3: Frontend Reorganization
1. Create clean frontend structure
2. Move components to proper folders
3. Consolidate services layer
4. Update imports

### Phase 4: Infrastructure Cleanup
1. Create clean Dockerfiles
2. Build new docker-compose.yml
3. Configure NGINX properly
4. Set up monitoring

### Phase 5: Testing & Validation
1. Run all tests
2. Validate all endpoints
3. Check Docker builds
4. Verify environment variables

### Phase 6: Documentation
1. Update README
2. Create architecture diagram
3. Document all changes
4. Create migration summary

## Success Criteria
✓ Single unified backend with clear separation of concerns
✓ Clean frontend structure with organized components
✓ Working Docker builds for all services
✓ Clean docker-compose.yml with all services
✓ Proper NGINX routing
✓ All database connections working
✓ External services integrated
✓ All tests passing
✓ Complete documentation
✓ Images pushed to Docker Hub

## Docker Hub Deployment
- **Repository**: citadelcloud1/world-class-dating-platform
- **Tags**:
  - `latest` (production)
  - `backend-latest`
  - `frontend-latest`
  - `v1.0.0` (versioned)
