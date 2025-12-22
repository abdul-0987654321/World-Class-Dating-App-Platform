# Flamoral Platform - System Map

## Executive Summary
Flamoral is a production-grade microservices-based dating platform deployed on Azure AKS. The system comprises 18+ backend services, web and mobile frontends, with full observability, CI/CD automation, and compliance controls.

**Technology Stack:** Node.js/TypeScript, React/Next.js, React Native, PostgreSQL, Redis, MongoDB, Docker, Kubernetes, Terraform

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
| PostgreSQL | RDBMS | Primary data storage |
| Redis | Cache | Sessions, caching, job queues |
| MongoDB/Cosmos | Document | Messages, analytics events |
| Azure Blob | Object | Profile photos, media |
| Elasticsearch | Search | Full-text search, analytics |

---

## Infrastructure

### Azure Resources (Production)
- **Resource Group:** `flamoral-prod-rg`
- **AKS Cluster:** `flamoral-prod-aks`
- **PostgreSQL:** `flamoral-prod-postgres.postgres.database.azure.com`
- **Redis:** `flamoral-prod-redis.redis.cache.windows.net`
- **ACR:** `flamoralprodacr.azurecr.io`
- **Key Vault:** `flamoral-prod-kv`

### External Integrations
- **Stripe** - Payments
- **SendGrid** - Email
- **Twilio** - SMS
- **Firebase** - Push notifications
- **Agora** - Video calls
- **Sentry** - Error tracking

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

- **Logging:** Winston → Azure Log Analytics
- **Metrics:** Prometheus + Grafana
- **Tracing:** Jaeger / Application Insights
- **Errors:** Sentry
- **Alerts:** AlertManager → PagerDuty/Email

---

## CI/CD Pipeline

1. **Code Push** → GitHub Actions
2. **Lint + Test** → Unit, Integration tests
3. **Security Scan** → Trivy, SAST
4. **Build** → Docker images → ACR
5. **Deploy** → Helm → AKS
6. **Smoke Tests** → Post-deployment verification

---

## Key Directories

```
/apps/
  web-app/          # React web frontend
  mobile-app/       # React Native mobile
/backend/
  services/         # All microservices
  shared/           # Shared utilities
/infrastructure/
  terraform/        # IaC definitions
  kubernetes/       # K8s manifests
  helm/             # Helm charts
  monitoring/       # Grafana, Prometheus
/.github/
  workflows/        # CI/CD pipelines
/docs/
  api/              # OpenAPI specs
  architecture/     # System documentation
```

---

*Last Updated: 2025-12-22*
