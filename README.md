# Flamoral - World-Class Dating Platform

<div align="center">

![Flamoral Logo](apps/branding/logo/flamoral-logo.png)

**A production-grade, enterprise microservices dating platform**

[![Build Status](https://github.com/oks-citadel/World-Class-Dating-App-Platform/actions/workflows/flamoral-unified-pipeline.yml/badge.svg)](https://github.com/oks-citadel/World-Class-Dating-App-Platform/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://react.dev/)
[![AWS](https://img.shields.io/badge/AWS-ECS_Fargate-FF9900.svg)](https://aws.amazon.com/)

[Website](https://flamoral.com) | [API Docs](docs/API.md) | [Architecture](docs/ARCHITECTURE.md) | [Security](docs/SECURITY.md)

</div>

---

## Executive Summary

Flamoral is a **production-ready dating platform** built with a **30-service microservices architecture** deployed on **AWS ECS Fargate**. The platform consists of a React web application, React Native mobile apps (iOS & Android), and a comprehensive backend supporting millions of users with real-time messaging, AI-powered matching, video calls, gamification, and enterprise-grade security.

### Key Metrics

| Metric                     | Value                                  |
| -------------------------- | -------------------------------------- |
| **Backend Services**       | 30 microservices                       |
| **API Endpoints**          | 300+                                   |
| **Frontend Apps**          | Web (React) + Mobile (React Native)    |
| **Infrastructure Modules** | 40+ Terraform modules                  |
| **Test Coverage**          | Unit, Integration, E2E, Load, Security |
| **Target SLA**             | 99.9% uptime                           |

### Core Capabilities

- **Real-time Messaging** - WebSocket/Socket.io with end-to-end encryption
- **AI-Powered Matching** - ML recommendations with compatibility scoring
- **Video/Voice Calls** - Agora SDK integration for high-quality calls
- **Speed Dating Events** - Live virtual matchmaking sessions
- **Communities & Groups** - Interest-based social features
- **Gamification** - Achievements, quests, streaks, leaderboards
- **Enterprise Security** - JWT, OAuth 2.0, RBAC, MFA, encryption at rest
- **AI Safety Controls** - Kill switch, circuit breakers, bias detection
- **GDPR Compliance** - Data export/deletion, consent management

---

## Project Structure

```
flamoral-monorepo/
├── apps/                           # Frontend Applications
│   ├── web-app/                    # React 18 + Vite + TypeScript
│   │   ├── src/
│   │   │   ├── components/         # 30+ React components
│   │   │   ├── pages/              # Route pages
│   │   │   ├── services/           # API clients
│   │   │   ├── store/              # Redux state management
│   │   │   ├── hooks/              # Custom React hooks
│   │   │   └── contexts/           # React contexts
│   │   ├── Dockerfile              # Production container
│   │   └── package.json
│   │
│   ├── mobile-app/                 # React Native + Expo
│   │   ├── src/                    # Mobile source code
│   │   ├── e2e/                    # Detox E2E tests
│   │   └── app.config.js           # Expo configuration
│   │
│   └── branding/                   # Brand assets & guidelines
│
├── backend/                        # Backend Services Monorepo
│   ├── services/                   # 30 Microservices
│   │   ├── api-gateway/            # Port 4000 - Entry point
│   │   ├── auth-service/           # Port 3001 - Authentication
│   │   ├── user-service/           # Port 3002 - User management
│   │   ├── matching-service/       # Port 3003 - Discovery & matching
│   │   ├── messaging-service/      # Port 5000 - Real-time chat
│   │   ├── payment-service/        # Port 3005 - Stripe payments
│   │   ├── analytics-service/      # Port 3007 - Usage analytics
│   │   ├── notification-service/   # Port 3008 - Push/email/SMS
│   │   ├── media-service/          # Port 3009 - Photo/video
│   │   ├── admin-service/          # Port 3010 - Admin backend
│   │   ├── advertising-service/    # Port 3011 - Ad campaigns
│   │   ├── moderation-service/     # Port 3012 - Content moderation
│   │   ├── automation-service/     # Port 3013 - Workflows
│   │   ├── partnership-service/    # Port 3014 - Partnerships
│   │   ├── profile-service/        # Port 3015 - Profile management
│   │   ├── subscription-service/   # Port 3016 - Subscriptions
│   │   ├── recommendation-service/ # Port 3021 - ML recommendations
│   │   ├── verification-service/   # Port 3022 - ID verification
│   │   ├── realtime-service/       # Port 8081 - WebSocket hub
│   │   ├── workflow-engine/        # Port 3020 - Business workflows
│   │   ├── search-service/         # Port 3023 - Search & filtering
│   │   ├── location-service/       # Port 3024 - Geolocation
│   │   ├── report-service/         # Port 3025 - Reporting
│   │   ├── webhook-service/        # Port 3026 - Webhooks
│   │   ├── scheduler-service/      # Port 3017 - Task scheduling
│   │   ├── worker-service/         # Port 3018 - Background jobs
│   │   ├── email-service/          # Port 3019 - Email delivery
│   │   ├── ai-services/            # AI/ML microservices
│   │   │   ├── dating-coach-service/   # Port 8004
│   │   │   ├── deepfake-detection/     # Port 8010
│   │   │   ├── content-generator/
│   │   │   └── nlp-service/
│   │   └── shared/                 # Internal service utilities
│   │
│   ├── shared/                     # Shared Backend Libraries
│   │   ├── src/
│   │   │   ├── cache/              # Redis caching layer
│   │   │   ├── database/           # Database utilities
│   │   │   ├── middleware/         # Shared middleware
│   │   │   ├── types/              # TypeScript types
│   │   │   └── utils/              # Utility functions
│   │   └── package.json
│   │
│   ├── tests/                      # Integration & E2E Tests
│   │   ├── e2e/api/                # API E2E tests
│   │   ├── integration/            # Integration tests
│   │   └── fixtures/               # Test data
│   │
│   ├── knexfile.ts                 # Database migrations config
│   └── jest.config.js              # Test configuration
│
├── packages/                       # Shared Packages (npm Workspaces)
│   ├── shared/
│   │   ├── types/                  # @flamoral/types
│   │   ├── utils/                  # @flamoral/utils
│   │   ├── constants/              # @flamoral/constants
│   │   ├── validators/             # @flamoral/validators
│   │   └── api-client/             # @flamoral/api-client
│   ├── socket-client/              # WebSocket client
│   ├── i18n/                       # Internationalization
│   ├── video-sdk/                  # Video call abstraction
│   └── asset-branding/             # Brand assets package
│
├── infrastructure/                 # DevOps & Deployment
│   ├── terraform/                  # Infrastructure as Code
│   │   ├── modules/                # 40+ reusable modules
│   │   └── environments/           # dev, staging, prod configs
│   ├── docker/                     # Docker configurations
│   ├── scripts/deployment/         # Deployment automation
│   ├── local-dev/                  # Local development compose
│   └── load-testing/               # K6 performance tests
│
├── docs/                           # Documentation (50+ files)
│   ├── ARCHITECTURE.md             # System design
│   ├── API.md                      # API reference
│   ├── SECURITY.md                 # Security guidelines
│   ├── DEPLOYMENT.md               # Deployment guide
│   └── ...
│
├── tests/                          # Root-level Test Orchestration
│   ├── e2e/                        # Playwright E2E tests
│   ├── api/                        # API contract tests
│   └── security/                   # Security tests
│
├── .github/workflows/              # CI/CD Pipelines
│   ├── flamoral-unified-pipeline.yml   # Main pipeline
│   ├── qa-nightly.yml              # Nightly regression
│   └── qa-pr-gate.yml              # PR validation
│
├── docker-compose.yml              # Local development
├── package.json                    # Root monorepo config
└── README.md                       # This file
```

---

## Technology Stack

### Frontend

| Technology       | Version | Purpose                 |
| ---------------- | ------- | ----------------------- |
| React            | 18.3.1  | Web UI framework        |
| React Native     | 0.83.1  | Mobile app framework    |
| TypeScript       | 5.3.x   | Type safety             |
| Vite             | 7.3.0   | Web build tool          |
| Expo             | 52.0.x  | Mobile build tool       |
| Redux Toolkit    | 2.0.x   | State management        |
| React Query      | 5.x     | Server state            |
| Socket.io Client | 4.8.x   | Real-time communication |
| Agora SDK        | 4.19.x  | Video/voice calls       |
| Stripe.js        | 8.5.x   | Payments                |
| Vitest           | 4.0.x   | Unit testing            |
| Playwright       | 1.40.x  | E2E testing             |

### Backend

| Technology    | Version | Purpose                      |
| ------------- | ------- | ---------------------------- |
| Node.js       | 20.x    | Runtime                      |
| NestJS        | 10.3.x  | Backend framework            |
| Express       | 4.18.x  | HTTP server                  |
| TypeScript    | 5.3.x   | Type safety                  |
| PostgreSQL    | 15.x    | Primary database             |
| Redis         | 7.x     | Caching & sessions           |
| MongoDB       | 6.x     | Document storage (analytics) |
| GraphQL       | 16.8.x  | API query language           |
| Apollo Server | 4.9.x   | GraphQL server               |
| Socket.io     | 4.8.x   | WebSocket server             |
| Knex.js       | 3.x     | Database migrations          |
| TypeORM       | 0.3.x   | ORM                          |
| Jest          | 29.x    | Testing                      |

### Infrastructure

| Technology            | Version   | Purpose                  |
| --------------------- | --------- | ------------------------ |
| AWS ECS Fargate       | -         | Container orchestration  |
| AWS Aurora PostgreSQL | 15.x      | Managed database         |
| AWS ElastiCache       | Redis 7.x | Managed caching          |
| AWS S3                | -         | Object storage           |
| AWS CloudFront        | -         | CDN                      |
| AWS Cognito           | -         | User authentication      |
| AWS SES/SNS           | -         | Email & SMS              |
| AWS WAF               | -         | Web application firewall |
| Terraform             | 1.7.x     | Infrastructure as Code   |
| Docker                | -         | Containerization         |
| GitHub Actions        | -         | CI/CD                    |

---

## Microservices Architecture

### Service Port Mapping

| Port | Service                | Description                         |
| ---- | ---------------------- | ----------------------------------- |
| 4000 | API Gateway            | Entry point, routing, rate limiting |
| 3001 | Auth Service           | JWT, OAuth 2.0, MFA, sessions       |
| 3002 | User Service           | User account management             |
| 3003 | Matching Service       | Discovery, swipes, matches, ML      |
| 3005 | Payment Service        | Stripe integration, subscriptions   |
| 3007 | Analytics Service      | Usage metrics, dashboards           |
| 3008 | Notification Service   | Push, email, SMS                    |
| 3009 | Media Service          | Photo/video upload, processing      |
| 3010 | Admin Service          | Admin dashboard backend             |
| 3011 | Advertising Service    | Ad campaigns, targeting             |
| 3012 | Moderation Service     | AI content moderation               |
| 3013 | Automation Service     | Workflow automation                 |
| 3014 | Partnership Service    | Partnership management              |
| 3015 | Profile Service        | Profile management                  |
| 3016 | Subscription Service   | Subscription lifecycle              |
| 3017 | Scheduler Service      | Scheduled tasks                     |
| 3018 | Worker Service         | Background job processing           |
| 3019 | Email Service          | Email templates, delivery           |
| 3020 | Workflow Engine        | Business process orchestration      |
| 3021 | Recommendation Service | ML-based recommendations            |
| 3022 | Verification Service   | ID verification (Jumio/Onfido)      |
| 3023 | Search Service         | Elasticsearch-based search          |
| 3024 | Location Service       | Geolocation, proximity              |
| 3025 | Report Service         | User reports, analytics             |
| 3026 | Webhook Service        | External webhook management         |
| 5000 | Messaging Service      | Real-time chat, WebSocket           |
| 8004 | Dating Coach AI        | AI conversation assistance          |
| 8010 | Deepfake Detection     | AI photo verification               |
| 8081 | Realtime Service       | WebSocket hub, presence             |

---

## Getting Started

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0 (package manager)
- **Docker** & Docker Compose
- **Git**

### 1. Clone Repository

```bash
git clone https://github.com/oks-citadel/World-Class-Dating-App-Platform.git
cd World-Class-Dating-App-Platform
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
npm install
```

### 3. Environment Configuration

```bash
# Copy environment templates
cp .env.example .env
cp .env.dev.example .env.development

# Backend services
cp backend/.env.example backend/.env
cp backend/services/api-gateway/.env.example backend/services/api-gateway/.env
# ... repeat for each service as needed

# Frontend
cp apps/web-app/.env.example apps/web-app/.env
cp apps/mobile-app/.env.example apps/mobile-app/.env
```

**Key Environment Variables:**

```env
# Application
NODE_ENV=development
WEB_URL=http://localhost:5173
API_URL=http://localhost:4000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Authentication (generate secure secrets)
JWT_ACCESS_SECRET=<64-character-random-string>
JWT_REFRESH_SECRET=<64-character-random-string>
SERVICE_API_KEY=<32-character-random-string>

# Stripe (use test keys for development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 4. Start Infrastructure Services

```bash
# Start PostgreSQL, Redis, and LocalStack (AWS emulation)
docker-compose up -d postgres redis localstack

# Or use the development-specific compose
docker-compose -f infrastructure/local-dev/docker-compose.dev.yml up -d
```

### 5. Run Database Migrations

```bash
cd backend
npm run migrate
```

### 6. Start Development Servers

**Backend Services:**

```bash
# Start all backend services (from root)
npm run dev:backend

# Or start individual services
cd backend/services/api-gateway && npm run dev
cd backend/services/auth-service && npm run dev
# ... etc
```

**Web Application:**

```bash
npm run dev:web
# Opens at http://localhost:5173
```

**Mobile Application:**

```bash
npm run dev:mobile
# Or directly: cd apps/mobile-app && npx expo start
```

### 7. Verify Installation

```bash
# Health check
curl http://localhost:4000/health

# API docs (if enabled)
open http://localhost:4000/api/docs
```

---

## Development Workflow

### Available Scripts

```bash
# Root-level commands
npm run install:all          # Install all dependencies
npm run build:all            # Build all packages and services
npm run test:all             # Run all tests
npm run lint:all             # Lint all code

# Frontend
npm run dev:web              # Start web app dev server
npm run dev:mobile           # Start mobile app dev server
npm run build:web            # Build web app for production

# Backend
npm run dev:backend          # Start backend services
npm run build:backend        # Build backend services
npm run test:backend         # Run backend unit tests
npm run test:integration     # Run integration tests (requires Docker)

# Testing
npm run test:e2e             # Run Playwright E2E tests
npm run test:e2e:api         # Run API E2E tests
npm run test:smoke           # Run smoke tests
npm run test:load            # Run K6 load tests

# Docker
npm run docker:dev:up        # Start development containers
npm run docker:dev:down      # Stop development containers
npm run docker:test:up       # Start test environment
```

### Code Quality

```bash
# Linting
npm run lint:all             # ESLint all packages

# Type checking
npx tsc --noEmit         # TypeScript compilation check

# Formatting
npx prettier --check .   # Check formatting
npx prettier --write .   # Fix formatting
```

### Database Operations

```bash
cd backend

# Run migrations
npm run migrate              # Apply all pending migrations
npm run migrate:rollback     # Rollback last migration

# Seeding
npm run seed                 # Run all seeders

# Generate migration
npx knex migrate:make migration_name
```

---

## Testing

### Test Layers

| Layer        | Framework   | Location                       | Command                 |
| ------------ | ----------- | ------------------------------ | ----------------------- |
| Unit Tests   | Jest/Vitest | `*/src/**/*.test.ts`           | `npm run test`             |
| Integration  | Jest        | `backend/tests/integration/`   | `npm run test:integration` |
| E2E (API)    | Jest        | `tests/e2e/api/`               | `npm run test:e2e:api`     |
| E2E (UI)     | Playwright  | `tests/e2e/`                   | `npm run test:e2e`         |
| Load Testing | K6          | `infrastructure/load-testing/` | `npm run test:load`        |
| Security     | Custom      | `tests/security/`              | `npm run test:security`    |

### Running Tests

```bash
# Unit tests with coverage
npm run test:backend -- --coverage

# Integration tests (starts Docker containers)
npm run test:integration:docker

# E2E tests
npm run test:e2e

# All CI tests
npm run test:ci
```

### Test Reports

- **Allure Reports:** `allure-results/`, `backend/allure-results/`
- **Coverage Reports:** `backend/coverage/`
- **Playwright Reports:** `playwright-report/`

---

## Deployment

### CI/CD Pipeline

The platform uses a unified GitHub Actions pipeline (`flamoral-unified-pipeline.yml`) with the following stages:

1. **PR Quality Gates** - Code review automation
2. **Security Scanning** - SAST, dependency scanning
3. **Build & Test** - Linting, compilation, tests
4. **Infrastructure Validation** - Terraform plan
5. **Docker Image Builds** - 30 container images
6. **Staging Deployment** - ECS Fargate
7. **E2E Tests** - Post-deployment validation
8. **Production Approval** - Manual gate
9. **Production Deployment** - ECS Fargate

### Manual Deployment

```bash
# Build all Docker images
cd infrastructure/docker
./build-all.sh

# Push to ECR
./push-all.sh

# Deploy to staging
cd infrastructure/scripts/deployment
./deploy-all.sh staging

# Deploy to production (requires approval)
./deploy-all.sh production
```

### Terraform Infrastructure

```bash
cd infrastructure/terraform

# Initialize
terraform init

# Plan changes
terraform plan -var-file=environments/staging/terraform.tfvars

# Apply changes
terraform apply -var-file=environments/staging/terraform.tfvars
```

---

## Subscription Tiers

| Tier         | Price/Month | Features                            |
| ------------ | ----------- | ----------------------------------- |
| **Free**     | $0          | 50 daily swipes, basic matching     |
| **Basic**    | $9.99       | Unlimited swipes, see who likes you |
| **Plus**     | $14.99      | Incognito mode, read receipts       |
| **Premium**  | $19.99      | Passport, unlimited super likes     |
| **Premium+** | $29.99      | Message before matching             |
| **Elite**    | $49.99      | VIP badge, dedicated support        |

---

## Security

### Authentication

- **JWT Tokens** - Access (15min) + Refresh (7d)
- **OAuth 2.0** - Google, Apple, Facebook
- **MFA** - TOTP-based two-factor authentication
- **Session Management** - Redis-backed sessions

### Data Protection

- **Encryption at Rest** - AWS KMS
- **Encryption in Transit** - TLS 1.3
- **Message Encryption** - End-to-end for chats
- **PII Handling** - Tokenization, masking

### AI Security

- **Kill Switch** - Per-service AI shutdown via SSM
- **Circuit Breakers** - Automatic fault isolation
- **Prompt Injection Detection** - Input sanitization
- **Output Validation** - Hallucination/bias detection
- **Cost Anomaly Detection** - Bedrock/Rekognition monitoring

---

## Documentation

| Document                                             | Description                       |
| ---------------------------------------------------- | --------------------------------- |
| [Architecture](docs/ARCHITECTURE.md)                 | System design, AWS infrastructure |
| [API Reference](docs/API.md)                         | Complete API documentation        |
| [Security](docs/SECURITY.md)                         | Security guidelines, threat model |
| [Deployment](docs/DEPLOYMENT.md)                     | Terraform & ECS deployment        |
| [Port Mapping](docs/PORT_MAPPING.md)                 | Service port assignments          |
| [Operations](docs/OPERATIONS.md)                     | Runbooks, procedures              |
| [Caching](docs/CACHING.md)                           | Caching strategy                  |
| [AI Security](docs/ai-security/)                     | AI kill switch, safety controls   |
| [Secrets Rotation](docs/SECRETS_ROTATION_RUNBOOK.md) | Secrets management                |
| [Troubleshooting](docs/TROUBLESHOOTING.md)           | Common issues & solutions         |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- TypeScript strict mode
- ESLint + Prettier formatting
- Conventional commit messages
- 80% test coverage target

---

## License

MIT License - see [LICENSE](LICENSE)

---

<div align="center">

**Flamoral** | [flamoral.com](https://flamoral.com) | Where Passion Meets Connection

_Version 2.0.0 | Last Updated: 2026-01-20 | AWS ECS Fargate_

</div>
