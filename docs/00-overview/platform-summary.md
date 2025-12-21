# Flamoral Platform Summary

> **Mission**: Build the most trusted, secure, and engaging dating platform that prioritizes authentic connections.

## What is Flamoral?

Flamoral is a production dating SaaS platform that connects users seeking meaningful relationships. The platform provides:

- **Discovery**: AI-powered matching based on preferences, compatibility, and behavior
- **Messaging**: Real-time chat with text, images, voice, and video calling
- **Verification**: Multi-level identity verification for trust and safety
- **Subscriptions**: Tiered access with premium features for enhanced experience

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Web App  │  │ iOS App  │  │ Android  │  │  Admin   │        │
│  │ (Next.js)│  │ (Swift)  │  │ (Kotlin) │  │  Portal  │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
└───────┼─────────────┼─────────────┼─────────────┼───────────────┘
        │             │             │             │
        └─────────────┴──────┬──────┴─────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                   API Gateway / Load Balancer                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                      Microservices                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    Auth     │  │   Profile   │  │  Discovery  │              │
│  │   Service   │  │   Service   │  │   Service   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Matching   │  │  Messaging  │  │    Calls    │              │
│  │   Service   │  │   Service   │  │   Service   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │Verification │  │ Moderation  │  │   Payment   │              │
│  │   Service   │  │   Service   │  │   Service   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    Media    │  │Notification │  │    Admin    │              │
│  │   Service   │  │   Service   │  │   Service   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                     Data Layer                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  PostgreSQL  │  │    Redis     │  │ Blob Storage │           │
│  │  (Primary)   │  │   (Cache)    │  │   (Media)    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│  ┌──────────────┐  ┌──────────────┐                              │
│  │  Message     │  │   Search     │                              │
│  │   Queue      │  │   (Elastic)  │                              │
│  └──────────────┘  └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (React), TypeScript |
| Mobile | React Native (planned) |
| Backend | Node.js, TypeScript, Express |
| Database | PostgreSQL 15 |
| Cache | Redis Cluster |
| Queue | Redis (Bull) / Azure Service Bus |
| Storage | Azure Blob Storage + CDN |
| Search | Elasticsearch (optional) |
| Realtime | WebSocket (Socket.io) |
| Calls | Twilio / Agora |
| Payments | Stripe |
| Verification | Onfido / similar |
| Email | SendGrid |
| Push | Firebase Cloud Messaging |
| Auth | JWT (access + refresh tokens) |
| CI/CD | GitHub Actions / Azure DevOps |
| Hosting | Azure Kubernetes Service (AKS) |
| Monitoring | Application Insights, Prometheus, Grafana |

## Core User Flows

### 1. Registration & Onboarding
```
Register -> Email Verify -> Create Profile -> Upload Photos -> Set Preferences -> Enter Discovery
```

### 2. Discovery & Matching
```
View Feed -> Like/Pass/Super-Like -> Mutual Like -> Match Created -> Conversation Started
```

### 3. Messaging
```
Open Conversation -> Send Message -> Real-time Delivery -> Read Receipt
```

### 4. Verification
```
Start Verification -> Upload Documents -> Processing -> Approved/Denied -> Badge Updated
```

### 5. Subscription
```
View Plans -> Select Plan -> Payment -> Entitlements Updated -> Features Enabled
```

## Service Boundaries

| Service | Responsibility |
|---------|----------------|
| Auth | Registration, login, tokens, sessions, password reset |
| Profile | User profiles, photos, preferences, versioning |
| Discovery | Feed generation, ranking, candidate caching |
| Matching | Like/pass processing, match creation, unmatch |
| Messaging | Conversations, messages, attachments, realtime |
| Calls | Audio/video calls, signaling, quality metrics |
| Verification | Identity verification, document processing |
| Moderation | Reports, cases, actions, enforcement |
| Payment | Subscriptions, webhooks, entitlements |
| Media | Upload, scanning, serving, CDN |
| Notification | Push, email, in-app notifications |
| Admin | Back-office operations, support tools |

## Subscription Tiers

| Tier | Price | Key Features |
|------|-------|--------------|
| Free | $0 | 50 likes/day, 3 photos, basic discovery |
| Plus | $19.99/mo | 100 likes/day, 6 photos, see who liked you, rewind |
| Premium | $39.99/mo | Unlimited likes, 9 photos, read receipts, calls, priority support |

## Key Metrics

### Business Metrics
- DAU/MAU ratio
- Match rate (likes -> matches)
- Message response rate
- Subscription conversion rate
- Churn rate
- LTV/CAC ratio

### Technical Metrics
- API latency (p50, p95, p99)
- Error rate by endpoint
- Uptime (target: 99.9%)
- Message delivery latency
- Call quality metrics

## Environments

| Environment | Purpose | URL |
|-------------|---------|-----|
| Development | Local development | localhost:3000 |
| Staging | Pre-production testing | staging.flamoral.com |
| Production | Live users | app.flamoral.com |

## Key Documents

| Document | Location |
|----------|----------|
| API Contract | [docs/02-api/openapi.yaml](../02-api/openapi.yaml) |
| API Inventory | [docs/02-api/api-inventory.md](../02-api/api-inventory.md) |
| Non-Negotiables | [docs/00-overview/non-negotiables.md](./non-negotiables.md) |
| Architecture | [docs/01-architecture/](../01-architecture/) |
| Security | [docs/03-security/](../03-security/) |
| Runbooks | [docs/05-reliability/runbooks.md](../05-reliability/runbooks.md) |
