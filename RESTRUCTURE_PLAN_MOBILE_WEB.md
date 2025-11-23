# ConnectSphere - Mobile & Web Reorganization Plan

## Executive Summary

**Goal:** Reorganize codebase for simultaneous web and mobile development without conflicts

**Approach:** Monorepo with shared packages, platform-specific clients, and unified backend

**Timeline:** Immediate implementation

---

## New Directory Structure

```
World-Class-Dating-App-Platform/
├── packages/                          # Shared packages (monorepo)
│   ├── shared/                        # Shared business logic
│   │   ├── api-client/               # API client for web & mobile
│   │   ├── types/                    # TypeScript types/interfaces
│   │   ├── utils/                    # Common utilities
│   │   ├── constants/                # Shared constants
│   │   └── validators/               # Validation schemas
│   │
│   └── ui-components/                # Shared UI logic (platform-agnostic)
│       ├── hooks/                    # React hooks
│       ├── context/                  # React context providers
│       └── store/                    # Redux store configuration
│
├── apps/                              # Platform-specific applications
│   ├── web/                          # Web application (React)
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── components/          # Web-specific components
│   │   │   ├── pages/               # Web pages
│   │   │   ├── styles/              # Web styles
│   │   │   └── App.tsx
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   └── mobile/                       # Mobile application (React Native)
│       ├── ios/                      # iOS native code
│       ├── android/                  # Android native code
│       ├── src/
│       │   ├── components/          # Mobile-specific components
│       │   ├── screens/             # Mobile screens
│       │   ├── navigation/          # React Navigation
│       │   └── App.tsx
│       ├── package.json
│       ├── metro.config.js
│       ├── app.json
│       └── tsconfig.json
│
├── backend/                           # Unified backend API
│   ├── src/
│   │   ├── api/                      # REST + GraphQL + WebSocket
│   │   ├── services/                 # Business logic services
│   │   ├── models/                   # Database models
│   │   ├── middleware/               # Express middleware
│   │   ├── config/                   # Configuration
│   │   └── utils/                    # Backend utilities
│   ├── tests/                        # Backend tests
│   ├── package.json
│   └── tsconfig.json
│
├── infrastructure/                    # DevOps (unchanged)
│   ├── docker/
│   ├── kubernetes/
│   ├── terraform/
│   └── monitoring/
│
├── scripts/                           # Build & deployment scripts
│   ├── setup.sh
│   ├── build-all.sh
│   ├── test-all.sh
│   └── seed-data.ts
│
├── fixtures/                          # Development seed data
│   ├── users.json
│   ├── profiles.json
│   ├── matches.json
│   └── messages.json
│
├── docs/                              # Documentation
│
├── package.json                       # Root workspace configuration
├── tsconfig.base.json                # Base TypeScript config
├── .eslintrc.js                      # Root ESLint config
├── .prettierrc                       # Prettier config
├── lerna.json                        # Lerna monorepo config
└── docker-compose.yml                # Development environment
```

---

## Key Changes

### 1. Monorepo Setup
- **Tool:** Yarn Workspaces + Lerna
- **Benefits:**
  - Shared dependencies
  - Unified versioning
  - Single install command
  - Code sharing between web/mobile

### 2. Shared Packages
- **packages/shared/api-client:** Platform-agnostic API client
- **packages/shared/types:** Common TypeScript interfaces
- **packages/shared/utils:** Business logic utilities
- **packages/ui-components:** React hooks, context, state

### 3. Platform-Specific Apps
- **apps/web:** React + Vite (existing frontend migrated)
- **apps/mobile:** React Native (new)
- Each has independent build configuration
- Both consume shared packages

### 4. Unified Backend
- Consolidate from microservices to monolith
- Single codebase in `/backend/`
- Remove `/backend/services/` and `/backend-unified/` confusion
- Keep `/backend/shared/` merged into main backend

### 5. Development Fixtures
- Seed data for local development
- Consistent test data across platforms
- Easy database reset scripts

---

## Implementation Steps

### Phase 1: Monorepo Setup (Immediate)
1. Create root `package.json` with workspaces
2. Create `tsconfig.base.json`
3. Install Lerna and configure
4. Set up shared package structure

### Phase 2: Shared Packages (Immediate)
5. Create `packages/shared/api-client`
6. Create `packages/shared/types`
7. Create `packages/shared/utils`
8. Create `packages/ui-components`

### Phase 3: Web Migration (Immediate)
9. Move `frontend/web` to `apps/web`
10. Update imports to use shared packages
11. Create web-specific `package.json`
12. Configure Vite build

### Phase 4: Mobile Setup (Immediate)
13. Initialize React Native in `apps/mobile`
14. Set up iOS and Android projects
15. Configure navigation (React Navigation)
16. Set up mobile-specific dependencies

### Phase 5: Backend Consolidation (Next)
17. Merge backend-unified into backend
18. Consolidate microservices (optional)
19. Update API endpoints
20. Update Docker configuration

### Phase 6: Development Environment (Next)
21. Create fixtures/seed data
22. Update docker-compose for new structure
23. Create development scripts
24. Update documentation

---

## File Migrations

### From → To
```
frontend/web/                 → apps/web/
[new]                        → apps/mobile/
backend-unified/             → backend/ (merge)
backend/shared/              → packages/shared/ (partial)
frontend/web/src/store/      → packages/ui-components/store/
[new]                        → packages/shared/api-client/
[new]                        → fixtures/
```

---

## Package Dependencies

### Root package.json
```json
{
  "name": "connectsphere-monorepo",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*",
    "backend"
  ],
  "scripts": {
    "install:all": "yarn install",
    "build:all": "lerna run build",
    "test:all": "lerna run test",
    "dev:web": "yarn workspace @connectsphere/web dev",
    "dev:mobile": "yarn workspace @connectsphere/mobile start",
    "dev:backend": "yarn workspace @connectsphere/backend dev",
    "seed": "ts-node scripts/seed-data.ts"
  }
}
```

### Shared Packages
- `@connectsphere/api-client`
- `@connectsphere/types`
- `@connectsphere/utils`
- `@connectsphere/ui-components`

### Apps
- `@connectsphere/web`
- `@connectsphere/mobile`
- `@connectsphere/backend`

---

## Development Workflow

### Setup (First Time)
```bash
# Install all dependencies
yarn install

# Seed database
yarn seed

# Start all services
docker-compose up -d
```

### Web Development
```bash
# Start web dev server
yarn dev:web

# Build web app
yarn workspace @connectsphere/web build

# Test web app
yarn workspace @connectsphere/web test
```

### Mobile Development
```bash
# Start Metro bundler
yarn dev:mobile

# Run on iOS
cd apps/mobile && npx react-native run-ios

# Run on Android
cd apps/mobile && npx react-native run-android
```

### Backend Development
```bash
# Start backend
yarn dev:backend

# Run migrations
yarn workspace @connectsphere/backend migrate

# Seed data
yarn seed
```

---

## Benefits

### For Developers
✅ Single `yarn install` for entire project
✅ Shared code = no duplication
✅ Type-safe imports across packages
✅ Hot reload on all platforms
✅ Consistent development experience

### For Architecture
✅ Clear separation of concerns
✅ Platform-specific optimizations possible
✅ Easy to add new platforms (desktop, etc.)
✅ Shared business logic = consistent behavior
✅ Independent deployment of web/mobile

### For Testing
✅ Test shared logic once, use everywhere
✅ Platform-specific tests isolated
✅ Fixtures ensure consistent test data
✅ E2E tests can cover both platforms

---

## Next Steps

1. ✅ Create this plan
2. Execute monorepo setup
3. Create shared packages
4. Migrate web application
5. Initialize mobile application
6. Create fixtures
7. Update documentation
8. Verify builds and development workflow

---

## Validation Checklist

- [ ] `yarn install` works at root
- [ ] Web app builds successfully
- [ ] Mobile app runs on iOS simulator
- [ ] Mobile app runs on Android emulator
- [ ] Backend starts without errors
- [ ] Shared packages imported correctly
- [ ] Hot reload works on web
- [ ] Hot reload works on mobile
- [ ] Database seeds successfully
- [ ] All tests pass
- [ ] Documentation updated
- [ ] CI/CD pipelines updated
