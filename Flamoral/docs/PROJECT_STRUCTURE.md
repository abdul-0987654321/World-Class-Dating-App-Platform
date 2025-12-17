# Flamoral Dating App - Project Structure

## Overview

This document describes the canonical project structure and organization guidelines for the Flamoral dating application.

## Directory Structure

```
World-Class-Dating-App-Platform/
├── .github/                    # GitHub Actions workflows
│   └── workflows/
│       └── ci.yml              # Main CI/CD pipeline
├── apps/                       # Frontend applications
│   ├── web-app/                # React web application
│   ├── mobile-app/             # React Native mobile app
│   └── branding/               # Brand assets and guidelines
├── backend/                    # Backend services
│   ├── services/               # Microservices
│   │   ├── api-gateway/        # API Gateway (entry point)
│   │   ├── auth-service/       # Authentication & authorization
│   │   ├── user-service/       # User management
│   │   ├── matching-service/   # Match algorithm
│   │   ├── messaging-service/  # Real-time messaging
│   │   ├── media-service/      # Photo/video handling
│   │   ├── payment-service/    # Subscriptions & payments
│   │   ├── notification-service/ # Push notifications
│   │   ├── advertising-service/  # Ad tracking & analytics
│   │   ├── moderation-service/ # Content moderation
│   │   ├── analytics-service/  # User analytics
│   │   └── realtime-service/   # WebSocket connections
│   ├── shared/                 # Backend-specific shared code
│   │   ├── config/             # Environment configuration
│   │   ├── constants/          # Backend constants
│   │   ├── types/              # Backend-specific types
│   │   └── utils/              # Backend utilities (logger, encryption)
│   └── tests/                  # Backend test suites
├── packages/                   # Shared packages (monorepo)
│   ├── shared/                 # Cross-platform shared code
│   │   ├── api-client/         # API client for frontend
│   │   ├── constants/          # Universal constants
│   │   ├── types/              # Shared TypeScript types
│   │   ├── utils/              # Cross-platform utilities
│   │   └── validators/         # Input validators
│   ├── api-client/             # React Query hooks
│   ├── i18n/                   # Internationalization
│   ├── socket-client/          # WebSocket client
│   └── video-sdk/              # Video calling SDK
├── infrastructure/             # Infrastructure as Code
│   ├── terraform/              # Terraform configurations
│   │   ├── modules/            # Reusable modules
│   │   └── environments/       # Environment-specific configs
│   ├── kubernetes/             # K8s manifests
│   └── scripts/                # Deployment scripts
├── k8s/                        # Kubernetes deployment files
├── docs/                       # Project documentation
│   ├── adr/                    # Architecture Decision Records
│   ├── deployment/             # Deployment guides
│   └── advertising-tracking/   # Feature-specific docs
├── proto/                      # Protocol Buffer definitions
├── fixtures/                   # Test fixtures and seed data
└── security/                   # Security configurations
```

## Shared Code Organization

### Backend Shared (`backend/shared/`)

Contains backend-specific utilities that should NOT be exposed to frontend:

- **config/**: Environment configuration, secrets management
- **utils/logger.ts**: Winston-based logging with context
- **utils/encryption.ts**: Bcrypt, JWT signing/verification
- **utils/validation.ts**: Server-side validation with sanitization
- **constants/**: HTTP status codes, error messages
- **types/**: Backend-specific TypeScript interfaces

### Packages Shared (`packages/shared/`)

Contains cross-platform code used by both frontend and backend:

- **api-client/**: HTTP client for API calls
- **constants/**: Universal constants (subscription tiers, limits)
- **types/**: Shared TypeScript types (User, Match, Message)
- **utils/**: Cross-platform utilities (date, format, distance)
- **validators/**: Input validation schemas (Zod/Joi)

### When to Use Which

| Code Type | Location | Example |
|-----------|----------|---------|
| JWT handling | `backend/shared/utils/` | Token generation/verification |
| Password hashing | `backend/shared/utils/` | bcrypt operations |
| Server logging | `backend/shared/utils/` | Winston logger |
| User types | `packages/shared/types/` | User, Profile interfaces |
| API client | `packages/shared/api-client/` | HTTP requests |
| Date formatting | `packages/shared/utils/` | formatDate() |
| Input validation | `packages/shared/validators/` | Email, phone validation |

## Service Structure

Each microservice follows this consistent structure:

```
service-name/
├── src/
│   ├── api/                    # REST API layer
│   │   ├── routes/             # Express routes
│   │   ├── controllers/        # Request handlers
│   │   └── middleware/         # Service-specific middleware
│   ├── domain/                 # Business logic
│   │   ├── services/           # Domain services
│   │   └── entities/           # Domain entities
│   ├── infrastructure/         # External integrations
│   │   ├── database/           # Database access
│   │   │   ├── migrations/     # Database migrations
│   │   │   ├── seeds/          # Seed data
│   │   │   └── repositories/   # Data repositories
│   │   └── external/           # External API clients
│   ├── config/                 # Service configuration
│   ├── types/                  # Service-specific types
│   ├── index.ts                # Entry point
│   └── server.ts               # Express server setup
├── tests/                      # Test files
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── e2e/                    # End-to-end tests
├── Dockerfile                  # Container definition
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
└── .env.example                # Environment template
```

## Frontend Structure

### Web App (`apps/web-app/`)

```
web-app/
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── common/             # Generic components
│   │   ├── features/           # Feature-specific components
│   │   └── layout/             # Layout components
│   ├── pages/                  # Route pages
│   ├── hooks/                  # Custom React hooks
│   ├── store/                  # State management
│   ├── services/               # API services
│   ├── utils/                  # Frontend utilities
│   ├── types/                  # Frontend-specific types
│   └── assets/                 # Static assets
├── public/                     # Public assets
└── tests/                      # Frontend tests
```

### Mobile App (`apps/mobile-app/`)

```
mobile-app/
├── src/
│   ├── components/             # React Native components
│   ├── screens/                # Navigation screens
│   ├── navigation/             # Navigation config
│   ├── hooks/                  # Custom hooks
│   ├── store/                  # State management
│   ├── services/               # API services
│   └── utils/                  # Mobile utilities
├── android/                    # Android native code
├── ios/                        # iOS native code
└── __tests__/                  # Mobile tests
```

## Configuration Files

### Root Level

| File | Purpose |
|------|---------|
| `tsconfig.base.json` | Base TypeScript configuration |
| `package.json` | Root workspace configuration |
| `lerna.json` | Monorepo management |
| `docker-compose.yml` | Local development environment |
| `.env.example` | Environment variable template |

### Service Level

Each service extends the base TypeScript config:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

## Import Conventions

### Backend Services

```typescript
// Import from backend shared
import { logger } from '../../shared/utils/logger';
import { encryptPassword } from '../../shared/utils/encryption';

// Import from packages shared
import { UserType, MatchStatus } from '@flamoral/types';
import { validateEmail } from '@flamoral/validators';
```

### Frontend Apps

```typescript
// Import from packages
import { useUser } from '@flamoral/api-client';
import { formatDate } from '@flamoral/utils';
import { User } from '@flamoral/types';
```

## Best Practices

1. **Avoid Duplication**: Use shared packages instead of copying code
2. **Service Independence**: Each service should be deployable independently
3. **Type Safety**: Use TypeScript strictly across all packages
4. **Consistent Naming**: Follow established naming conventions
5. **Documentation**: Keep READMEs up to date in each package

## Migration Notes

- Legacy code in `frontend/web` has been moved to `apps/web-app`
- Duplicate `.husky/.github` directory has been removed
- Build artifacts should NOT be committed (added to .gitignore)
- CI workflow updated to include all services

---

*Last Updated: November 2024*
