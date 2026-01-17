# Flamoral Platform - System Map

## Executive Summary
Flamoral is a production-grade microservices-based dating platform deployed on **AWS ECS Fargate**. The system comprises 20+ backend services, web and mobile frontends, with full observability, CI/CD automation, and compliance controls.

**Technology Stack:** Node.js/TypeScript, React/Vite, React Native, PostgreSQL (Aurora), Redis (ElastiCache), Docker, AWS ECS, Terraform

---

## Service Architecture Overview

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| API Gateway | 4000 | NestJS + Express | Entry point, routing, auth verification |
| Auth Service | 3001 | Express | Authentication, JWT, OAuth |
| User Service | 3002 | Express | Profile management |
| Matching Service | 3003 | Express + Bull | AI recommendations, swipes |
| Messaging Service | 5000 | Express + Socket.io | Real-time messaging |
| Payment Service | 3005 | Express + Stripe | Subscriptions, payments |
| Notification Service | 3008 | Express | Push, email, SMS |
| Media Service | 3009 | Express + Sharp | Photo processing |
| Admin Service | 3010 | Express | Admin dashboard backend |
| Advertising Service | 3011 | Express | Ad management |
| Moderation Service | 3012 | Express | Content moderation |
| Analytics Service | 3007 | Express + ES | Event tracking |
| Automation Service | 3013 | NestJS + Bull | Workflow automation |

---

## Data Stores

| Store | Type | Purpose |
|-------|------|---------|
| Aurora PostgreSQL | RDBMS | Primary data storage |
| ElastiCache Redis | Cache | Sessions, caching, job queues |
| DocumentDB | Document | Messages (MongoDB-compatible) |
| AWS S3 | Object | Profile photos, media |
| OpenSearch | Search | Full-text search, analytics |

---

## Infrastructure

### AWS Resources (Production)
- **Region:** `us-east-1`
- **ECS Cluster:** `flamoral-prod-ecs`
- **Aurora PostgreSQL:** Aurora Serverless v2 cluster
- **ElastiCache:** Redis cluster
- **ECR:** `flamoral-*` repositories
- **Secrets Manager:** `flamoral-*` secrets
- **S3 Buckets:** `flamoral-media`, `flamoral-backups`

### External Integrations
- **Stripe** - Payments
- **AWS SES** - Email (migrated from SendGrid)
- **AWS SNS** - SMS (migrated from Twilio)
- **AWS SNS** - Push notifications (migrated from Firebase)
- **Agora** - Video calls
- **CloudWatch** - Logging and monitoring

---

## Authentication Flow
1. Client → Auth Service: Login request
2. Auth Service: Validate credentials
3. Auth Service → Client: JWT (access + refresh tokens)
4. Client → API Gateway: Request with Bearer token
5. API Gateway: Validate JWT, route to service

**RBAC Roles:** admin, moderator, support, user, premium_user, elite_user

---

## Subscription Tiers

| Tier | Price | Daily Likes | Super Likes | Features |
|------|-------|-------------|-------------|----------|
| Free | $0 | 10 | 1 | Basic |
| Premium | $19.99/mo | 100 | 5 | Priority matching, filters |
| Elite | $39.99/mo | Unlimited | 10 | All features, travel mode |

---

## Observability

- **Logging:** Winston → CloudWatch Logs
- **Metrics:** CloudWatch Container Insights
- **Tracing:** AWS X-Ray
- **Alerts:** CloudWatch Alarms → SNS → Email

---

## CI/CD Pipeline

1. **Code Push** → GitHub Actions
2. **Lint + Test** → Unit, Integration tests
3. **Security Scan** → Trivy, SAST
4. **Build** → Docker images → ECR
5. **Deploy** → ECS Task Definitions → ECS Fargate
6. **Smoke Tests** → Post-deployment verification

---

## Key Directories

```
/apps/
  web-app/          # React (Vite) web frontend
  mobile-app/       # React Native mobile
  branding/         # Logo, icons, brand assets
/backend/
  services/         # All microservices
  shared/           # Shared utilities
/infrastructure/
  terraform/        # IaC definitions (AWS)
  docker/           # Dockerfiles
  local-dev/        # Docker Compose for local dev
  disaster-recovery/# DR runbooks
  runbooks/         # Operational runbooks
  scripts/          # Deployment scripts
/.github/
  workflows/        # CI/CD pipelines
/docs/
  api/              # OpenAPI specs
  01-architecture/  # System documentation
  02-api/           # API documentation
  03-security/      # Security documentation
/packages/
  shared/           # Shared TypeScript packages
```

---

*Last Updated: 2026-01-17*
