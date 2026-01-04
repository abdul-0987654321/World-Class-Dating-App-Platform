# Flamoral - Premium Dating Platform

<div align="center">

![Flamoral Logo](apps/branding/logo.svg)

**A production-grade, microservices-based dating platform**

[![Build Status](https://github.com/oks-citadel/World-Class-Dating-App-Platform/actions/workflows/flamoral-pipeline.yml/badge.svg)](https://github.com/oks-citadel/World-Class-Dating-App-Platform/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![AWS](https://img.shields.io/badge/AWS-EKS-FF9900.svg)](https://aws.amazon.com/)

[Website](https://flamoral.com) | [API Docs](docs/API_DOCUMENTATION.md) | [Architecture](docs/ARCHITECTURE.md) | [Operations](docs/OPERATIONS.md)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Subscription Tiers](#subscription-tiers)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Microservices](#microservices)
- [Infrastructure](#infrastructure)
- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Deployment](#deployment)
- [Documentation](#documentation)

---

## Overview

Flamoral is a world-class dating platform featuring web and mobile applications, powered by 14+ microservices deployed on Amazon EKS. The platform supports millions of users with real-time messaging, AI-powered matching, video calls, and comprehensive safety features.

### Key Highlights

- **200+ API Endpoints** across 14 microservices
- **Real-time Messaging** with WebSocket/Socket.io
- **AI-Powered Matching** with machine learning recommendations
- **Video/Voice Calls** via Agora SDK
- **Multi-Platform** - Web (React), iOS & Android (React Native)
- **Enterprise Security** - JWT, OAuth 2.0, RBAC, encryption at rest
- **GDPR Compliant** - Full data export/deletion, consent management
- **AWS-Only Infrastructure** - Terraform-managed, multi-region support
- **99.9% SLA Target** with auto-scaling and disaster recovery

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
| **ID Verification** | Government ID validation via AWS Textract |
| **Background Checks** | Optional background verification |
| **Block & Report** | User safety controls |
| **Content Moderation** | AI + human review pipeline |
| **Deepfake Detection** | AI-powered media verification |
| **Panic Button** | Emergency safety features |
| **Encryption** | End-to-end encrypted messages |
| **Safety Center** | Tips, resources, emergency contacts |

### Gamification

| Feature | Description |
|---------|-------------|
| **Daily Rewards** | Login streaks, free boosts |
| **Achievements** | Badges for milestones |
| **Coins/Gems System** | Virtual currency for features |
| **Challenges** | Weekly engagement challenges |
| **Leaderboards** | Engagement rankings |

---

## Subscription Tiers

Flamoral offers a **6-tier subscription model** to cater to different user needs:

| Feature | Free | Basic | Plus | Premium | Premium+ | Elite |
|---------|:----:|:-----:|:----:|:-------:|:--------:|:-----:|
| **Price (Monthly)** | $0 | $9.99 | $14.99 | $19.99 | $29.99 | $49.99 |
| **Price (Yearly)** | $0 | $95.88 | $143.88 | $191.88 | $287.88 | $479.88 |
| **Trial Days** | - | 7 | 7 | 14 | 14 | 14 |
| **Unlimited Swipes** | - | X | X | X | X | X |
| **See Who Likes You** | - | X | X | X | X | X |
| **Rewind/Undo** | - | X | X | X | X | X |
| **Ad-Free** | - | X | X | X | X | X |
| **Incognito Mode** | - | - | X | X | X | X |
| **Priority Likes** | - | - | X | X | X | X |
| **Read Receipts** | - | - | X | X | X | X |
| **Unlimited Super Likes** | - | - | - | X | X | X |
| **Passport/Travel Mode** | - | - | - | X | X | X |
| **Advanced Filters** | - | - | - | X | X | X |
| **Profile Controls** | - | - | - | X | X | X |
| **Message Before Match** | - | - | - | - | X | X |
| **Weekly Boost** | - | - | - | - | X | X |
| **See Profile Visitors** | - | - | - | - | X | X |
| **Priority Support** | - | - | - | - | X | X |
| **VIP Badge** | - | - | - | - | - | X |
| **Elite Matches** | - | - | - | - | - | X |
| **Dedicated Account Manager** | - | - | - | - | - | X |
| **Unlimited Boosts** | - | - | - | - | - | X |
| **Early Access** | - | - | - | - | - | X |

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
| Python | 3.11 | AI/ML services |

### Databases

| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL (Aurora) | 15 | Primary relational data |
| Redis (ElastiCache) | 7 | Caching, sessions, queues |
| MongoDB (DocumentDB) | 7 | Messages, analytics events |
| Elasticsearch | 8 | Full-text search |

### AWS Infrastructure (Production)

| Service | Purpose |
|---------|---------|
| **Amazon EKS** | Kubernetes orchestration |
| **Amazon RDS (Aurora)** | PostgreSQL database (Serverless v2) |
| **Amazon ElastiCache** | Redis cluster for caching |
| **Amazon DocumentDB** | MongoDB-compatible document store |
| **Amazon S3** | Media file storage |
| **Amazon CloudFront** | CDN and WAF |
| **Amazon SES** | Transactional email |
| **Amazon SNS** | Push notifications & pub/sub |
| **Amazon SQS** | Message queues |
| **AWS Cognito** | User pool management |
| **AWS Secrets Manager** | Secrets management |
| **Amazon ECR** | Docker image registry |
| **AWS KMS** | Encryption key management |
| **Amazon Route 53** | DNS management |
| **AWS ACM** | SSL/TLS certificates |
| **Amazon CloudWatch** | Logging & monitoring |
| **AWS X-Ray** | Distributed tracing |

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
| Agora | Video/voice calls |
| AWS Rekognition | Content moderation |
| AWS Textract | Document OCR |

---

## Architecture

```
                                    +-------------------+
                                    |   CloudFront      |
                                    |   (CDN + WAF)     |
                                    +--------+----------+
                                             |
                    +------------------------+------------------------+
                    |                        |                        |
              +-----v-----+           +------v------+          +------v------+
              |  Web App  |           | Mobile Apps |          |   Admin     |
              |  React    |           |React Native |          |  Dashboard  |
              +-----+-----+           +------+------+          +------+------+
                    |                        |                        |
                    +------------------------+------------------------+
                                             |
                                    +--------v--------+
                                    |   API Gateway   |
                                    |   Port: 4000    |
                                    +--------+--------+
                                             |
        +----------+----------+----------+---+---+----------+----------+----------+
        |          |          |          |       |          |          |          |
   +----v----++----v----++----v----++----v---++--v---++-----v----++----v----++----v----+
   |  Auth   ||  User   || Match   ||Message ||Media || Payment  || Notify  ||Analytics|
   |  3001   ||  3002   ||  3003   ||  5000  || 3009 ||  3005    ||  3008   ||  3007   |
   +----+----++----+----++----+----++----+---++--+---++-----+----++----+----++----+----+
        |          |          |          |       |          |          |          |
        +----------+----------+----------+---+---+----------+----------+----------+
                                             |
                    +------------------------+------------------------+
                    |                        |                        |
              +-----v-----+           +------v------+          +------v------+
              | Aurora    |           | ElastiCache |          | DocumentDB  |
              | PostgreSQL|           |    Redis    |          |   MongoDB   |
              +-----------+           +-------------+          +-------------+
```

---

## Microservices

| Service | Port | Technology | Description |
|---------|------|------------|-------------|
| **API Gateway** | 4000 | NestJS + Express | Entry point, routing, auth verification, rate limiting |
| **Auth Service** | 3001 | Express | Authentication, JWT tokens, OAuth, MFA |
| **User Service** | 3002 | Express | Profile management, settings, gamification, safety |
| **Matching Service** | 3003 | Express + Bull | Discovery algorithm, swipes, matches, speed dating |
| **Messaging Service** | 5000 | Express + Socket.io | Real-time chat, WebSocket connections, calls |
| **Payment Service** | 3005 | Express + Stripe | Subscriptions, coins, in-app purchases, refunds |
| **Notification Service** | 3008 | Express | Push (SNS), email (SES), SMS notifications |
| **Media Service** | 3009 | Express + Sharp | Photo/video processing, S3 upload |
| **Admin Service** | 3010 | Express | Admin dashboard backend, moderation tools |
| **Advertising Service** | 3011 | Express | Ad campaigns, targeting, revenue tracking |
| **Moderation Service** | 3012 | Express | Content review, deepfake detection |
| **Analytics Service** | 3007 | Express | Event tracking, dashboards, churn prediction |
| **Automation Service** | 3013 | NestJS + Bull | Workflows, scheduled jobs, icebreakers |
| **Partnership Service** | 3014 | Express | Restaurant/event partners, date planning |

### AI Services (Python)

| Service | Purpose |
|---------|---------|
| **Deepfake Detection** | AI-powered media verification |
| **ML Recommendations** | Profile recommendation engine |

---

## Infrastructure

### AWS Production Environment

| Resource | Name Pattern | Purpose |
|----------|--------------|---------|
| EKS Cluster | `flamoral-prod-eks` | Kubernetes orchestration |
| Aurora PostgreSQL | `flamoral-prod-aurora` | Primary database (Serverless v2) |
| ElastiCache Redis | `flamoral-prod-redis` | Caching & sessions |
| S3 Buckets | `flamoral-prod-{media,backups,logs}` | Object storage |
| ECR Repositories | `flamoral-{service-name}` | Docker images |
| Secrets Manager | `flamoral-prod-{secret}` | Secrets storage |
| CloudFront Distribution | `flamoral-prod` | CDN with WAF |
| Route 53 Zone | `flamoral.com` | DNS management |
| SES Domain | `flamoral.com` | Email delivery |
| SNS Topics | `flamoral-prod-{topic}` | Pub/sub messaging |
| SQS Queues | `flamoral-prod-{queue}` | Message queues |

### Terraform Modules

| Module | Purpose |
|--------|---------|
| `networking` | VPC, subnets, NAT gateways, VPC endpoints |
| `eks` | EKS cluster, node groups, OIDC provider |
| `rds` | Aurora PostgreSQL cluster |
| `elasticache` | Redis replication group |
| `s3` | S3 buckets with encryption & lifecycle |
| `cognito` | User pool & identity pool |
| `ecr` | Container registry repositories |
| `secrets` | Secrets Manager secrets |
| `messaging` | SQS queues & SNS topics |
| `monitoring` | CloudWatch, X-Ray, dashboards |
| `route53` | DNS zones & records |
| `acm` | SSL/TLS certificates |
| `cloudfront` | CDN distributions & WAF |
| `ses` | Email infrastructure |
| `budgets` | Cost alerts & controls |
| `cicd` | CodePipeline & CodeBuild |

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

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- AWS CLI v2 (configured)
- Terraform 1.6+
- kubectl
- Helm 3.x
- Git

### Local Development

```bash
# Clone repository
git clone https://github.com/oks-citadel/World-Class-Dating-App-Platform.git
cd World-Class-Dating-App-Platform

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your local configuration

# Start databases (Docker)
docker-compose up -d postgres redis mongodb

# Run database migrations
npm run db:migrate

# Start backend services
npm run dev:backend

# Start web app (separate terminal)
cd apps/web-app
npm run dev

# Start mobile app (separate terminal)
cd apps/mobile-app
npm run ios  # or npm run android
```

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

---

## Environment Setup

See [docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md) for detailed environment configuration.

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/flamoral
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017/flamoral

# Authentication
JWT_SECRET=your-secure-secret
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Deployment

### CI/CD Pipeline

```
Push to develop   -> Build -> Test -> Deploy to DEV
Push to release/* -> Build -> Test -> Deploy to STAGING
Push to main      -> Build -> Test -> Deploy to PRODUCTION
Daily 9 PM UTC    -> Nightly Build -> Deploy to PRODUCTION
```

### Infrastructure Deployment (Terraform)

```bash
# Initialize Terraform
cd infrastructure/terraform/environments/prod
terraform init

# Plan changes
terraform plan -out=tfplan

# Apply changes
terraform apply tfplan
```

### Application Deployment

```bash
# Manual deployment via GitHub Actions
gh workflow run flamoral-pipeline.yml -f environment=production

# Direct kubectl deployment
aws eks update-kubeconfig --region us-east-1 --name flamoral-prod-eks
kubectl get pods -n flamoral-prod
```

### Rollback

```bash
# Rollback deployment
kubectl rollout undo deployment/api-gateway -n flamoral-prod

# Verify rollback
kubectl rollout status deployment/api-gateway -n flamoral-prod
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System architecture & AWS services |
| [API Documentation](docs/API_DOCUMENTATION.md) | Complete API endpoint reference |
| [Operations Runbook](docs/OPERATIONS.md) | Deployment & incident procedures |
| [Environment Setup](docs/ENVIRONMENT_SETUP.md) | Configuration guide |
| [SEV-1 Runbooks](docs/05-reliability/runbooks.md) | Incident response procedures |
| [Security](docs/03-security/authentication-architecture.md) | Auth flow & security |

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

*Version 1.0.0 | Last Updated: 2026-01-03 | AWS Production*

</div>
