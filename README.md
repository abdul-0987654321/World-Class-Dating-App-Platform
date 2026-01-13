# Flamoral - Premium Dating Platform

<div align="center">

![Flamoral Logo](apps/branding/logo.svg)

**A production-grade, microservices-based dating platform**

[![Build Status](https://github.com/oks-citadel/World-Class-Dating-App-Platform/actions/workflows/flamoral-unified-pipeline.yml/badge.svg)](https://github.com/oks-citadel/World-Class-Dating-App-Platform/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![AWS](https://img.shields.io/badge/AWS-ECS_Fargate-FF9900.svg)](https://aws.amazon.com/)

[Website](https://flamoral.com) | [API Docs](docs/API.md) | [Architecture](docs/ARCHITECTURE.md) | [AI Security](docs/ai-security/)

</div>

---

## Overview

Flamoral is a world-class dating platform featuring web and mobile applications, powered by **27 microservices** deployed on **Amazon ECS Fargate**. The platform supports millions of users with real-time messaging, AI-powered matching, video calls, speed dating, communities, gamification, and comprehensive safety features.

### Key Highlights

- **300+ API Endpoints** across 27 microservices
- **Real-time Messaging** with WebSocket/Socket.io
- **AI-Powered Matching** with AWS Bedrock and ML recommendations
- **Video/Voice Calls** via Agora SDK
- **Speed Dating Events** with real-time matchmaking
- **Communities & Groups** for interest-based connections
- **Gamification System** with achievements, streaks, and quests
- **Multi-Platform** - Web (React), iOS & Android (React Native) with 95%+ parity
- **Enterprise Security** - JWT, OAuth 2.0, RBAC, encryption at rest
- **AI Security** - Kill switch, circuit breakers, bias detection
- **GDPR Compliant** - Full data export/deletion, consent management
- **AWS-Only Infrastructure** - Terraform-managed, single VPC architecture
- **Cost Optimized** - Anomaly detection, Savings Plans, scheduled scaling
- **99.9% SLA Target** with auto-scaling and disaster recovery

---

## Microservices (27 Total)

All services deployed on **AWS ECS Fargate** with ports 3000-3026.

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 3000 | Entry point, routing, rate limiting |
| Auth Service | 3001 | Authentication, JWT, OAuth 2.0, MFA |
| User Service | 3002 | User account management |
| Profile Service | 3003 | Profile data, photos, preferences |
| Matching Service | 3004 | Discovery, swipes, matches |
| Messaging Service | 3005 | Real-time chat, WebSocket |
| Notification Service | 3006 | Push, email, SMS notifications |
| Payment Service | 3007 | Stripe integration, payments |
| Subscription Service | 3008 | Premium tiers, billing |
| Media Service | 3009 | Photo/video upload, processing |
| Moderation Service | 3010 | AI content moderation |
| Analytics Service | 3011 | Usage analytics, dashboards |
| Recommendation Service | 3012 | AI-powered recommendations |
| Search Service | 3013 | User discovery, filters |
| Location Service | 3014 | Geolocation, proximity |
| Verification Service | 3015 | Identity verification |
| Report Service | 3016 | User reports, safety |
| Admin Service | 3017 | Admin dashboard |
| Webhook Service | 3018 | External integrations |
| Scheduler Service | 3019 | Scheduled jobs, cron |
| Worker Service | 3020 | Background processing |
| Email Service | 3021 | Email delivery (SES) |
| Realtime Service | 3022 | WebSocket connections |
| Workflow Engine | 3023 | Business workflows |
| Automation Service | 3024 | Automated actions |
| Advertising Service | 3025 | Ad campaigns, targeting |
| Partnership Service | 3026 | Partner integrations |

See [PORT_MAPPING.md](docs/PORT_MAPPING.md) for complete details.

---

## New Features (v2.0)

### Speed Dating
- Live virtual speed dating sessions
- Timed 3-5 minute video chat rounds
- Real-time mutual interest detection
- Post-event match results

### Communities
- Interest-based groups and events
- Member discovery within communities
- Group messaging and activities

### Gamification
- 50+ achievements and badges
- Daily quests for rewards
- Login streaks with bonuses
- Weekly and all-time leaderboards

---

## AI Security

### Kill Switch System
Emergency AI shutdown per service via SSM Parameter Store.

### Features
- Per-service AI kill switch
- Circuit breaker pattern
- Prompt injection detection
- Output validation (hallucination/bias)
- Audit logging (90-day retention)
- Cost anomaly detection for Bedrock/Rekognition

---

## Subscription Tiers (6-Tier Model)

Consistent across Web, iOS, and Android platforms:

| Tier | Price/Month | Key Features |
|------|-------------|--------------|
| **Free** | $0 | 50 daily swipes, basic matching |
| **Basic** | $9.99 | Unlimited swipes, see who likes you |
| **Plus** | $14.99 | Incognito mode, read receipts |
| **Premium** | $19.99 | Passport, unlimited super likes |
| **Premium+** | $29.99 | Message before matching |
| **Elite** | $49.99 | VIP badge, dedicated support |

---

## Infrastructure

### Single VPC Architecture
- Staging: 10.0.0.0/22 (public), 10.0.16.0/20 (private)
- Production: 10.0.4.0/22 (public), 10.0.32.0/20 (private)

### Terraform Modules (29)
networking, ecs-cluster, ecs-iam, ecs-alb, rds, elasticache, dynamodb, s3, cognito, ecr, secrets, messaging, monitoring, route53, acm, cloudfront, ses, budgets, cicd, ai-security, cost-management, image-signing

---

## Cost Optimization

| Feature | Savings |
|---------|---------|
| Fargate Spot (staging) | Up to 70% |
| Aurora Serverless v2 | Pay-per-use |
| Scheduled Scaling | Off-peak savings |
| S3 Intelligent-Tiering | Auto-optimization |

---

## Mobile App (67 Screens)

| Category | Count | Status |
|----------|-------|--------|
| Authentication | 6 | Complete |
| Profile | 8 | Complete |
| Discovery | 5 | Complete |
| Matching | 4 | Complete |
| Messaging | 6 | Complete |
| **Gamification** | 5 | **NEW** |
| **Communities** | 6 | **NEW** |
| **Speed Dating** | 5 | **NEW** |
| Settings | 8 | Complete |
| Safety | 4 | Complete |

---

## Quick Start

Clone repository, install dependencies, start Docker services:

git clone https://github.com/oks-citadel/World-Class-Dating-App-Platform.git
cd World-Class-Dating-App-Platform
npm install
docker-compose up -d postgres redis mongodb
npm run dev:backend

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and AWS infrastructure
- [Deployment](docs/DEPLOYMENT.md) - Terraform and ECS deployment guide
- [Port Mapping](docs/PORT_MAPPING.md) - Complete service port assignments
- [Operations](docs/OPERATIONS.md) - Runbooks and procedures
- [API Documentation](docs/API.md) - API reference
- [AI Security](docs/ai-security/) - AI kill switch and safety controls

---

## License

MIT License - see [LICENSE](LICENSE)

---

<div align="center">

**Flamoral** | [flamoral.com](https://flamoral.com) | Built for Production

*Version 2.0.0 | Last Updated: 2026-01-13 | AWS ECS Fargate*

</div>

---

## Recent Updates (2026-01-13)

### Pipeline & Infrastructure Fixes
- ✅ Fixed CI/CD deploy script to use AWS ECS Fargate (removed Kubernetes references)
- ✅ Added `"type": "module"` to package.json for ESLint v9 flat config compatibility
- ✅ Updated deployment commands to use AWS ECS CLI

### Payment Security Fixes
- ✅ **CRITICAL**: Removed mock subscription upgrade bypass in web app
- ✅ Subscription upgrades and cancellations now require API authentication
- ✅ No localStorage manipulation for payment status

### Subscription Tier Consistency
- ✅ Unified 6-tier model (free, basic, plus, premium, premium_plus, elite) across:
  - Mobile app Redux slice
  - Mobile subscription plans screen
  - Web app subscription service
  - Backend payment service
- ✅ Removed legacy 3-tier (gold/platinum/diamond) references

### Brand Consistency
- ✅ Unified color system across all platforms:
  - Primary: Electric Pink (#ff2d75)
  - Accent: Emerald Green (#00d9a5)
  - Background: Midnight Blue (#1a1a2e)
- ✅ Updated branding tokens to match web/mobile themes
