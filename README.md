# Flamoral - Premium Dating Platform

<div align="center">

![Flamoral Logo](apps/branding/logo.svg)

**A production-grade, microservices-based dating platform**

[![Build Status](https://github.com/oks-citadel/World-Class-Dating-App-Platform/actions/workflows/flamoral-pipeline.yml/badge.svg)](https://github.com/oks-citadel/World-Class-Dating-App-Platform/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Azure](https://img.shields.io/badge/Azure-AKS-0089D6.svg)](https://azure.microsoft.com/)

[Website](https://flamoral.com) | [API Docs](docs/02-api/API_INVENTORY.md) | [Architecture](docs/01-architecture/SYSTEM_MAP.md)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Subscription Tiers](#subscription-tiers)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Microservices](#microservices)
- [API Reference](#api-reference)
- [Infrastructure](#infrastructure)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Deployment](#deployment)
- [Documentation](#documentation)

---

## Overview

Flamoral is a world-class dating platform featuring web and mobile applications, powered by 13+ microservices deployed on Azure Kubernetes Service (AKS). The platform supports millions of users with real-time messaging, AI-powered matching, video calls, and comprehensive safety features.

### Key Highlights

- **150+ API Endpoints** across 13 microservices
- **Real-time Messaging** with WebSocket/Socket.io
- **AI-Powered Matching** with machine learning recommendations
- **Video/Voice Calls** via Agora SDK
- **Multi-Platform** - Web (React), iOS & Android (React Native)
- **Enterprise Security** - JWT, OAuth 2.0, RBAC, encryption at rest
- **GDPR Compliant** - Full data export/deletion, consent management
- **99.9% SLA Target** with auto-scaling and multi-region support

---

## Features

### Core Features

| Feature | Description |
|---------|-------------|
| **User Authentication** | Email, phone, Google, Facebook, Apple Sign-In |
| **Profile Management** | Photos, bio, interests, verification badges |
| **Discovery Engine** | AI-powered profile recommendations |
| **Swipe Mechanics** | Like, Pass, Super Like, Rewind |
| **Matching System** | Instant match notifications |
| **Real-time Chat** | Text, photos, GIFs, voice notes |
| **Video/Voice Calls** | In-app calling via Agora |
| **Push Notifications** | Match alerts, messages, reminders |

### Premium Features

| Feature | Tier | Description |
|---------|------|-------------|
| **See Who Likes You** | Premium+ | View profiles that liked you |
| **Unlimited Likes** | Elite | No daily swipe limits |
| **Super Likes** | Premium+ | Stand out with super likes |
| **Profile Boost** | Premium+ | 10x visibility for 30 minutes |
| **Travel Mode** | Elite | Match in any location worldwide |
| **Advanced Filters** | Premium+ | Height, education, lifestyle |
| **Read Receipts** | Premium+ | Know when messages are read |
| **Priority Matching** | Elite | Appear first in discovery |
| **Incognito Mode** | Elite | Browse without being seen |
| **Undo Swipe** | Premium+ | Rewind accidental passes |

### Safety & Trust

| Feature | Description |
|---------|-------------|
| **Photo Verification** | AI-powered selfie verification |
| **ID Verification** | Government ID validation |
| **Block & Report** | User safety controls |
| **Content Moderation** | AI + human review pipeline |
| **CSAM Detection** | PhotoDNA integration, NCMEC reporting |
| **Encryption** | End-to-end encrypted messages |
| **Safety Center** | Tips, resources, emergency contacts |

### Gamification

| Feature | Description |
|---------|-------------|
| **Daily Rewards** | Login streaks, free boosts |
| **Achievements** | Badges for milestones |
| **Coins System** | Virtual currency for features |
| **Leaderboards** | Engagement rankings |

---

## Subscription Tiers

| Feature | Free | Premium | Elite |
|---------|:----:|:-------:|:-----:|
| **Price** | $0 | $19.99/mo | $39.99/mo |
| **Daily Likes** | 10 | 100 | Unlimited |
| **Super Likes** | 1/day | 5/day | 10/day |
| **See Who Likes You** | - | Yes | Yes |
| **Rewind/Undo** | - | Yes | Yes |
| **Advanced Filters** | - | Yes | Yes |
| **Profile Boost** | - | 1/mo | 3/mo |
| **Travel Mode** | - | - | Yes |
| **Incognito Mode** | - | - | Yes |
| **Priority Support** | - | - | Yes |
| **Read Receipts** | - | Yes | Yes |
| **Ad-Free** | - | Yes | Yes |

### Coin Packages

| Package | Coins | Price | Bonus |
|---------|-------|-------|-------|
| Starter | 100 | $4.99 | - |
| Popular | 500 | $19.99 | +50 |
| Best Value | 1500 | $49.99 | +300 |
| Ultimate | 5000 | $99.99 | +1500 |

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | Web application |
| React Native | 0.73 | iOS & Android apps |
| TypeScript | 5.3 | Type safety |
| Redux Toolkit | 2.x | State management |
| Tailwind CSS | 3.x | Styling |
| Socket.io Client | 4.x | Real-time communication |
| React Query | 5.x | Server state management |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20 LTS | Runtime |
| Express | 4.x | HTTP framework |
| NestJS | 10.x | API Gateway, Automation |
| TypeScript | 5.3 | Type safety |
| Socket.io | 4.x | WebSocket server |
| Bull | 4.x | Job queues |
| Prisma | 5.x | ORM |

### Databases

| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | 16 | Primary relational data |
| Redis | 7 | Caching, sessions, queues |
| MongoDB | 7 | Messages, analytics events |
| Elasticsearch | 8 | Full-text search |
| Azure Blob | - | Media storage |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Azure AKS | Kubernetes orchestration |
| Azure PostgreSQL | Managed database |
| Azure Redis | Managed cache |
| Azure Cosmos DB | Managed MongoDB |
| Azure Blob Storage | Media files |
| Azure Key Vault | Secrets management |
| Azure Front Door | CDN, WAF, load balancing |
| Azure Container Registry | Docker images |

### DevOps & Monitoring

| Technology | Purpose |
|------------|---------|
| GitHub Actions | CI/CD pipelines |
| Terraform | Infrastructure as Code |
| Helm | Kubernetes package manager |
| Docker | Containerization |
| Prometheus | Metrics collection |
| Grafana | Dashboards |
| Jaeger | Distributed tracing |
| Sentry | Error tracking |
| PagerDuty | Alerting |

### External Integrations

| Service | Purpose |
|---------|---------|
| Stripe | Payments & subscriptions |
| SendGrid | Transactional email |
| Twilio | SMS verification |
| Firebase | Push notifications |
| Agora | Video/voice calls |
| PhotoDNA | CSAM detection |
| Google Vision | Content moderation |

---

## Architecture

```
                                    ┌─────────────────┐
                                    │   Azure Front   │
                                    │     Door        │
                                    │   (CDN + WAF)   │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
              ┌─────▼─────┐           ┌──────▼──────┐          ┌──────▼──────┐
              │  Web App  │           │ Mobile Apps │          │   Admin     │
              │  React    │           │React Native │          │  Dashboard  │
              └─────┬─────┘           └──────┬──────┘          └──────┬──────┘
                    │                        │                        │
                    └────────────────────────┼────────────────────────┘
                                             │
                                    ┌────────▼────────┐
                                    │   API Gateway   │
                                    │   Port: 4000    │
                                    └────────┬────────┘
                                             │
        ┌──────────┬──────────┬──────────┬───┴───┬──────────┬──────────┬──────────┐
        │          │          │          │       │          │          │          │
   ┌────▼────┐┌────▼────┐┌────▼────┐┌────▼───┐┌──▼───┐┌─────▼────┐┌────▼────┐┌────▼────┐
   │  Auth   ││  User   ││ Match   ││Message ││Media ││ Payment  ││ Notify  ││Analytics│
   │  3001   ││  3002   ││  3003   ││  5000  ││ 3009 ││  3005    ││  3008   ││  3007   │
   └────┬────┘└────┬────┘└────┬────┘└────┬───┘└──┬───┘└─────┬────┘└────┬────┘└────┬────┘
        │          │          │          │       │          │          │          │
        └──────────┴──────────┴──────────┴───┬───┴──────────┴──────────┴──────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
              ┌─────▼─────┐           ┌──────▼──────┐          ┌──────▼──────┐
              │PostgreSQL │           │    Redis    │          │   MongoDB   │
              │  Primary  │           │    Cache    │          │  Messages   │
              └───────────┘           └─────────────┘          └─────────────┘
```

---

## Microservices

| Service | Port | Technology | Description |
|---------|------|------------|-------------|
| **API Gateway** | 4000 | NestJS + Express | Entry point, routing, auth verification, rate limiting |
| **Auth Service** | 3001 | Express | Authentication, JWT tokens, OAuth, MFA |
| **User Service** | 3002 | Express | Profile management, settings, preferences |
| **Matching Service** | 3003 | Express + Bull | Discovery algorithm, swipes, matches |
| **Messaging Service** | 5000 | Express + Socket.io | Real-time chat, WebSocket connections |
| **Payment Service** | 3005 | Express + Stripe | Subscriptions, coins, refunds |
| **Notification Service** | 3008 | Express | Push, email, SMS notifications |
| **Media Service** | 3009 | Express + Sharp | Photo/video processing, CDN upload |
| **Admin Service** | 3010 | Express | Admin dashboard backend |
| **Advertising Service** | 3011 | Express | Ad campaigns, targeting |
| **Moderation Service** | 3012 | Express | Content review, CSAM detection |
| **Analytics Service** | 3007 | Express + ES | Event tracking, dashboards |
| **Automation Service** | 3013 | NestJS + Bull | Workflows, scheduled jobs |

---

## API Reference

### Service Endpoints Summary

| Service | Endpoints | Auth Required |
|---------|-----------|---------------|
| Auth Service | 12 | No (mostly) |
| User Service | 80+ | Yes |
| Matching Service | 18 | Yes |
| Messaging Service | 20 | Yes |
| Payment Service | 7 | Yes |
| Notification Service | 10 | Yes |
| Media Service | 15 | Yes |
| Admin Service | 25+ | Admin role |
| Analytics Service | 12 | Mixed |

### Authentication API

```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login
POST   /api/auth/logout            # Logout
POST   /api/auth/refresh-token     # Refresh JWT
POST   /api/auth/verify-email      # Verify email
POST   /api/auth/forgot-password   # Request password reset
POST   /api/auth/reset-password    # Reset password
GET    /api/auth/me                # Get current user
POST   /api/auth/social/google     # Google OAuth
POST   /api/auth/social/facebook   # Facebook OAuth
POST   /api/auth/social/apple      # Apple Sign-In
```

### Profile & User API

```
GET    /api/profile                # Get own profile
PUT    /api/profile                # Update profile
GET    /api/profile/:userId        # Get user profile
GET    /api/photos                 # Get photos
POST   /api/photos                 # Upload photo
DELETE /api/photos/:id             # Delete photo
PUT    /api/photos/:id/primary     # Set primary photo
GET    /api/subscription           # Get subscription
POST   /api/subscription/upgrade   # Upgrade tier
GET    /api/privacy                # Get privacy settings
PUT    /api/privacy                # Update privacy
POST   /api/blocks                 # Block user
POST   /api/report                 # Report user
```

### Discovery & Matching API

```
GET    /api/discovery              # Get recommended profiles
POST   /api/discovery/refresh      # Refresh recommendations
POST   /api/swipes                 # Process swipe (like/pass)
GET    /api/swipes/likes           # See who liked me
POST   /api/swipes/undo            # Undo last swipe
POST   /api/super-likes            # Send super like
GET    /api/matches                # Get all matches
DELETE /api/matches/:id            # Unmatch
POST   /api/boosts                 # Activate boost
```

### Messaging API

```
GET    /api/conversations                    # Get conversations
GET    /api/conversations/:id                # Get conversation
GET    /api/conversations/:id/messages       # Get messages
POST   /api/messages                         # Send message
PUT    /api/messages/:id                     # Edit message
DELETE /api/messages/:id                     # Delete message
PUT    /api/messages/:id/status              # Mark read
POST   /api/messages/:id/react               # Add reaction
POST   /api/calls/token                      # Get call token
POST   /api/calls/initiate                   # Start call
```

### Payment API

```
POST   /api/payments/create-intent           # Create payment
POST   /api/payments/subscription/create     # Subscribe
POST   /api/payments/subscription/cancel     # Cancel
GET    /api/payments/methods/:customerId     # Payment methods
POST   /api/payments/methods/add             # Add card
POST   /api/payments/refund                  # Request refund
POST   /api/payments/webhook                 # Stripe webhook
```

### WebSocket Events

```javascript
// Client → Server
socket.emit('message:send', { conversationId, content, type });
socket.emit('message:typing', { conversationId, isTyping });
socket.emit('message:read', { conversationId, messageId });

// Server → Client
socket.on('message:new', (message) => {});
socket.on('message:typing', ({ conversationId, userId, isTyping }) => {});
socket.on('user:online', ({ userId, isOnline }) => {});
socket.on('match:new', (match) => {});
socket.on('call:incoming', (callData) => {});
```

**Full API documentation:** [docs/02-api/API_INVENTORY.md](docs/02-api/API_INVENTORY.md)

---

## Infrastructure

### Azure Production Environment

| Resource | Name | Purpose |
|----------|------|---------|
| Resource Group | `flamoral-prod-rg` | All production resources |
| AKS Cluster | `flamoral-prod-aks` | Kubernetes orchestration |
| PostgreSQL | `flamoral-prod-postgres` | Primary database |
| Redis | `flamoral-prod-redis` | Caching & sessions |
| Cosmos DB | `flamoral-prod-cosmos` | Messages & analytics |
| Blob Storage | `flamoralprodmedia` | Photos & videos |
| Key Vault | `flamoral-prod-kv` | Secrets & certificates |
| ACR | `flamoralprodacr` | Docker images |
| Front Door | `flamoral-prod-fd` | CDN, WAF, routing |
| Log Analytics | `flamoral-prod-logs` | Centralized logging |

### Kubernetes Namespaces

```
flamoral-prod     # Production workloads
flamoral-staging  # Staging environment
monitoring        # Prometheus, Grafana
ingress           # NGINX Ingress Controller
```

### Resource Limits (per pod)

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|-------------|-----------|----------------|--------------|
| API Gateway | 250m | 1000m | 256Mi | 1Gi |
| Auth Service | 100m | 500m | 128Mi | 512Mi |
| User Service | 100m | 500m | 128Mi | 512Mi |
| Matching Service | 250m | 1000m | 256Mi | 1Gi |
| Messaging Service | 250m | 1000m | 256Mi | 1Gi |
| Media Service | 500m | 2000m | 512Mi | 2Gi |

### Auto-Scaling

| Service | Min Replicas | Max Replicas | CPU Target |
|---------|--------------|--------------|------------|
| API Gateway | 3 | 20 | 70% |
| Auth Service | 2 | 10 | 70% |
| Matching Service | 3 | 15 | 70% |
| Messaging Service | 3 | 20 | 60% |
| Media Service | 2 | 10 | 70% |

---

## Project Structure

```
flamoral/
├── .github/
│   └── workflows/              # CI/CD pipelines
│       ├── flamoral-pipeline.yml
│       └── nightly-health-check.yml
├── apps/
│   ├── web-app/                # React web application
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   ├── mobile-app/             # React Native (iOS/Android)
│   │   ├── src/
│   │   ├── ios/
│   │   ├── android/
│   │   └── package.json
│   └── branding/               # Brand assets
├── backend/
│   ├── services/
│   │   ├── api-gateway/        # Port 4000
│   │   ├── auth-service/       # Port 3001
│   │   ├── user-service/       # Port 3002
│   │   ├── matching-service/   # Port 3003
│   │   ├── messaging-service/  # Port 5000
│   │   ├── payment-service/    # Port 3005
│   │   ├── notification-service/ # Port 3008
│   │   ├── media-service/      # Port 3009
│   │   ├── admin-service/      # Port 3010
│   │   ├── advertising-service/ # Port 3011
│   │   ├── moderation-service/ # Port 3012
│   │   ├── analytics-service/  # Port 3007
│   │   └── automation-service/ # Port 3013
│   └── shared/                 # Shared utilities
│       ├── errors/
│       ├── middleware/
│       ├── utils/
│       └── constants/
├── infrastructure/
│   ├── terraform/              # Azure IaC
│   ├── kubernetes/             # K8s manifests
│   ├── helm/                   # Helm charts
│   └── scripts/                # Deployment scripts
├── docs/
│   ├── 00-overview/            # Platform overview
│   ├── 01-architecture/        # System architecture
│   ├── 02-api/                 # API documentation
│   ├── 03-security/            # Security docs
│   ├── 04-compliance/          # GDPR, privacy
│   ├── 05-reliability/         # SLO/SLA, runbooks
│   ├── 06-testing/             # Test strategy
│   └── 07-operations/          # Operations
├── scripts/
│   ├── validate-traffic.sh     # Traffic validation
│   ├── test-harness.sh         # Automated tests
│   ├── release-readiness-gate.sh # Pre-deploy checks
│   └── synthetic-monitoring.ts # Synthetic tests
├── tests/
│   ├── e2e/                    # End-to-end tests
│   ├── integration/            # Integration tests
│   └── load/                   # Load tests
├── package.json
├── docker-compose.yml
└── README.md
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Azure CLI (for deployment)
- Git

### Local Development

```bash
# Clone repository
git clone https://github.com/oks-citadel/World-Class-Dating-App-Platform.git
cd World-Class-Dating-App-Platform

# Install dependencies
npm install

# Start databases
docker-compose up -d postgres redis mongodb

# Start backend services
npm run dev:backend

# Start web app (separate terminal)
cd apps/web-app
npm run dev

# Start mobile app (separate terminal)
cd apps/mobile-app
npm run ios  # or npm run android
```

### Environment Variables

```bash
# Copy example env files
cp config/dev/.env.example .env

# Required variables
DATABASE_URL=postgresql://user:pass@localhost:5432/flamoral
REDIS_URL=redis://localhost:6379
MONGODB_URL=mongodb://localhost:27017/flamoral
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
```

---

## Deployment

### CI/CD Pipeline

```
Push to develop   → Build → Test → Deploy to DEV
Push to release/* → Build → Test → Deploy to STAGING
Push to main      → Build → Test → Deploy to PRODUCTION
```

### Manual Deployment

```bash
# Deploy to production
gh workflow run flamoral-pipeline.yml -f environment=production

# Check deployment status
az aks get-credentials -g flamoral-prod-rg -n flamoral-prod-aks
kubectl get pods -n flamoral-prod
```

### Rollback

```bash
kubectl rollout undo deployment/api-gateway -n flamoral-prod
kubectl rollout status deployment/api-gateway -n flamoral-prod
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [System Map](docs/01-architecture/SYSTEM_MAP.md) | Complete architecture overview |
| [API Inventory](docs/02-api/API_INVENTORY.md) | All 150+ API endpoints |
| [OpenAPI Spec](docs/02-api/openapi-complete.yaml) | Machine-readable API |
| [Authentication](docs/03-security/authentication-architecture.md) | Auth flow & security |
| [Runbooks](docs/05-reliability/runbooks.md) | Incident response |
| [Error Codes](docs/02-api/errors/error-codes.md) | Error handling |

---

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/validate-traffic.sh` | Validate service connectivity |
| `scripts/test-harness.sh` | Run automated test suite |
| `scripts/release-readiness-gate.sh` | Pre-deployment checks |
| `scripts/synthetic-monitoring.ts` | User journey validation |

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/oks-citadel/World-Class-Dating-App-Platform/issues)
- **Email:** support@flamoral.com

---

<div align="center">

**Flamoral** | [flamoral.com](https://flamoral.com) | Built for Production

*Version 4.0.0 | Last Updated: 2025-12-22*

</div>
