# Project Restructure Plan

**Date:** 2025-11-21
**Status:** In Progress

---

## Current Issues Identified

### Frontend
- ❌ Multiple frontend folders (`/frontend/src`, `/frontend/web`, `/frontend/mobile`)
- ❌ Inconsistent component organization
- ❌ Services scattered across different locations
- ❌ No clear separation of concerns

### Backend
- ⚠️ Microservices architecture but needs better organization
- ❌ Duplicated configurations across services
- ❌ No unified API gateway structure
- ❌ Middleware and validators duplicated

### Infrastructure
- ❌ Docker files scattered in multiple locations
- ❌ Multiple docker-compose files (dev, staging, production)
- ❌ No centralized infrastructure folder

### Documentation
- ⚠️ 50+ documentation files in root directory
- ❌ No organized docs folder structure

---

## New Structure Plan

```
World-Class-Dating-App-Platform/
├── backend/
│   ├── src/
│   │   ├── api/                      # API Layer
│   │   │   ├── rest/                 # REST endpoints
│   │   │   ├── graphql/              # GraphQL schema & resolvers
│   │   │   └── websocket/            # WebSocket handlers
│   │   ├── services/                 # Business Logic
│   │   │   ├── auth/
│   │   │   ├── user/
│   │   │   ├── match/
│   │   │   ├── messaging/
│   │   │   ├── media/
│   │   │   ├── payment/
│   │   │   ├── notification/
│   │   │   ├── analytics/
│   │   │   ├── moderation/
│   │   │   └── integrations/        # External services
│   │   ├── repositories/            # Data Access Layer
│   │   │   ├── postgres/
│   │   │   ├── mongodb/
│   │   │   └── redis/
│   │   ├── middleware/              # Express middleware
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   └── ratelimit.middleware.ts
│   │   ├── validators/              # Input validation
│   │   ├── config/                  # Configuration
│   │   │   ├── database.ts
│   │   │   ├── redis.ts
│   │   │   ├── storage.ts
│   │   │   └── services.ts
│   │   ├── utils/                   # Shared utilities
│   │   ├── types/                   # TypeScript types
│   │   └── server.ts                # Main entry point
│   ├── migrations/                  # Database migrations
│   ├── tests/                       # Tests
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── web/                         # Web Application
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/                 # App configuration
│   │   │   │   ├── routes/          # Routing
│   │   │   │   ├── store/           # State management
│   │   │   │   └── hooks/           # Custom hooks
│   │   │   ├── components/          # UI Components
│   │   │   │   ├── common/          # Reusable components
│   │   │   │   ├── layout/          # Layout components
│   │   │   │   ├── features/        # Feature-specific components
│   │   │   │   └── pages/           # Page components
│   │   │   ├── services/            # Services
│   │   │   │   ├── api/             # API client
│   │   │   │   ├── auth/            # Auth service
│   │   │   │   ├── websocket/       # WebSocket client
│   │   │   │   ├── cache/           # Caching
│   │   │   │   └── storage/         # Local storage
│   │   │   ├── utils/               # Utilities
│   │   │   ├── types/               # TypeScript types
│   │   │   ├── styles/              # Global styles
│   │   │   ├── assets/              # Static assets
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   └── mobile/                      # React Native App
│       ├── android/
│       ├── ios/
│       ├── src/
│       │   ├── components/
│       │   ├── screens/
│       │   ├── navigation/
│       │   ├── services/
│       │   ├── store/
│       │   ├── hooks/
│       │   ├── utils/
│       │   └── types/
│       ├── App.tsx
│       └── package.json
│
├── infrastructure/
│   ├── docker/
│   │   ├── backend/
│   │   │   ├── Dockerfile
│   │   │   └── .dockerignore
│   │   ├── frontend/
│   │   │   ├── Dockerfile
│   │   │   ├── nginx.conf
│   │   │   └── .dockerignore
│   │   ├── nginx/
│   │   │   ├── Dockerfile
│   │   │   ├── nginx.conf
│   │   │   └── ssl/
│   │   └── monitoring/
│   │       ├── prometheus/
│   │       └── grafana/
│   ├── k8s/                        # Kubernetes (if needed)
│   │   ├── base/
│   │   ├── dev/
│   │   ├── staging/
│   │   └── production/
│   ├── terraform/                  # Infrastructure as Code
│   └── scripts/                    # Deployment scripts
│
├── docs/                           # Documentation
│   ├── api/                        # API documentation
│   ├── architecture/               # Architecture docs
│   ├── deployment/                 # Deployment guides
│   ├── development/                # Development guides
│   └── user-guides/                # User guides
│
├── scripts/                        # Build & deployment scripts
│   ├── build.sh
│   ├── deploy.sh
│   └── test.sh
│
├── .github/                        # GitHub workflows
│   └── workflows/
│       ├── backend-ci.yml
│       ├── frontend-ci.yml
│       └── docker-build-push.yml
│
├── docker-compose.yml              # Production compose
├── docker-compose.dev.yml          # Development compose
├── .env.example                    # Environment template
├── .gitignore
├── package.json                    # Root package.json
├── README.md
└── LICENSE
```

---

## Migration Steps

### Phase 1: Documentation Cleanup ✅
1. Create `/docs` folder
2. Move all `.md` files to appropriate `/docs` subfolders
3. Keep only README.md, LICENSE, and CHANGELOG.md in root

### Phase 2: Frontend Restructure ✅
1. Consolidate `/frontend/src` into `/frontend/web/src`
2. Organize components by feature
3. Move services to `/frontend/web/src/services`
4. Update all imports

### Phase 3: Backend Restructure ✅
1. Keep microservices but reorganize
2. Create unified structure with clear layers
3. Consolidate shared code
4. Update configurations

### Phase 4: Infrastructure Setup ✅
1. Create `/infrastructure/docker` folder
2. Move all Docker files
3. Create new Dockerfiles
4. Rebuild docker-compose.yml

### Phase 5: Testing & Validation ✅
1. Fix all import paths
2. Run tests
3. Verify Docker builds
4. Test all services

---

## Next Actions

1. ✅ Create new folder structure
2. ✅ Move and reorganize files
3. ✅ Update Dockerfiles
4. ✅ Create unified docker-compose.yml
5. ✅ Update documentation
6. ✅ Test everything

---

**Status**: Ready to execute restructuring
