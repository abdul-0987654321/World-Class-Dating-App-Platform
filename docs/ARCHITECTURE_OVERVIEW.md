# Flamoral Dating Platform - Architecture Overview

## Executive Summary

Flamoral is a world-class, enterprise-grade dating platform built with modern cloud-native architecture. The platform supports web and mobile applications, real-time messaging, AI-powered matching, and comprehensive monetization features.

**Domain**: flamoral.com
**Cloud Provider**: Microsoft Azure
**Architecture Style**: Microservices
**Deployment Model**: Kubernetes (AKS)

---

## 1. High-Level Architecture

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                        INTERNET                              │
                                    └─────────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │              Azure Front Door / CDN                          │
                                    │         (Global Load Balancing, WAF, TLS)                   │
                                    │              flamoral.com / api.flamoral.com                 │
                                    └─────────────────────────────────────────────────────────────┘
                                                              │
                           ┌──────────────────────────────────┼──────────────────────────────────┐
                           │                                  │                                  │
                           ▼                                  ▼                                  ▼
              ┌────────────────────────┐        ┌────────────────────────┐        ┌────────────────────────┐
              │      Web App CDN       │        │    API Gateway (AKS)   │        │   Static Assets CDN    │
              │   (React/Vite SPA)     │        │     Port: 4000         │        │   (Blob Storage)       │
              │   flamoral.com         │        │   api.flamoral.com     │        │   cdn.flamoral.com     │
              └────────────────────────┘        └────────────────────────┘        └────────────────────────┘
                                                              │
                                    ┌─────────────────────────┼─────────────────────────┐
                                    │                         │                         │
                    ┌───────────────┴───────────────┐        │        ┌───────────────┴───────────────┐
                    │      Core Services (AKS)       │        │        │     AI Services (AKS)          │
                    ├────────────────────────────────┤        │        ├────────────────────────────────┤
                    │ • Auth Service (3001)          │        │        │ • Dating Coach Service         │
                    │ • User Service (3002)          │        │        │ • Recommendation Service       │
                    │ • Matching Service (3003)      │        │        │ • Photo Analysis Service       │
                    │ • Messaging Service (3004)     │        │        │ • NLP Service                  │
                    │ • Media Service (3006)         │        │        │ • Fraud Detection Service      │
                    │ • Payment Service              │        │        └────────────────────────────────┘
                    │ • Notification Service         │        │
                    │ • Analytics Service            │        │
                    │ • Moderation Service           │        │
                    │ • Realtime Service (WebSocket) │        │
                    └────────────────────────────────┘        │
                                    │                         │
                    ┌───────────────┴───────────────────────────┴───────────────┐
                    │                         Data Layer                         │
                    ├────────────────────────────────────────────────────────────┤
                    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
                    │  │ PostgreSQL   │  │   MongoDB    │  │    Redis     │     │
                    │  │ (Primary DB) │  │ (Documents)  │  │   (Cache)    │     │
                    │  └──────────────┘  └──────────────┘  └──────────────┘     │
                    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
                    │  │Elasticsearch │  │   RabbitMQ   │  │ Blob Storage │     │
                    │  │   (Search)   │  │   (Queue)    │  │   (Media)    │     │
                    │  └──────────────┘  └──────────────┘  └──────────────┘     │
                    └────────────────────────────────────────────────────────────┘
```

---

## 2. Application Components

### 2.1 Frontend Applications

| Application | Technology | Description | Port |
|-------------|------------|-------------|------|
| Web App | React 18, Vite, TypeScript | Main web application (SPA) | 5173 (dev) |
| Mobile App | React Native 0.73 | iOS and Android native apps | N/A |
| Admin Dashboard | React | Platform administration | Integrated |

### 2.2 Backend Services

| Service | Port | Technology | Responsibility |
|---------|------|------------|----------------|
| API Gateway | 4000 | Express.js | Request routing, auth middleware, rate limiting |
| Auth Service | 3001 | Express.js | JWT auth, social login, 2FA |
| User Service | 3002 | Express.js | Profile CRUD, preferences |
| Matching Service | 3003 | Express.js | AI matching algorithm, swipes |
| Messaging Service | 3004 | Express.js + Socket.io | Real-time chat, message history |
| Media Service | 3006 | Express.js + Sharp | Photo/video upload, processing |
| Payment Service | - | Express.js + Stripe | Subscriptions, payments |
| Notification Service | - | Express.js | Push, email, SMS notifications |
| Analytics Service | - | Express.js | Event tracking, metrics |
| Moderation Service | - | Express.js | Content moderation, reporting |
| Realtime Service | - | Socket.io | WebSocket connections, presence |

### 2.3 AI/ML Services (Python)

| Service | Purpose |
|---------|---------|
| Dating Coach | Conversational AI for dating advice |
| Recommendation | ML-based match recommendations |
| Photo Analysis | Photo quality, face detection |
| NLP Service | Sentiment analysis, bio analysis |
| Fraud Detection | Fake account/bot detection |

---

## 3. Data Architecture

### 3.1 Database Selection

| Database | Use Case | Technology |
|----------|----------|------------|
| **PostgreSQL 16** | Primary relational data (users, profiles, subscriptions) | Azure Database for PostgreSQL |
| **MongoDB 7** | Document storage (messages, activity logs) | Azure Cosmos DB (MongoDB API) |
| **Redis 7** | Caching, sessions, real-time features | Azure Cache for Redis |
| **Elasticsearch 8** | Full-text search, user discovery | Azure Cognitive Search |
| **RabbitMQ 3** | Message queuing, async processing | Azure Service Bus |

### 3.2 Key Database Tables (PostgreSQL)

```sql
-- Core Tables
users              -- User authentication and accounts
profiles           -- User profile information
photos             -- Profile photos metadata
prompts            -- Hinge-style prompts/answers

-- Matching System
swipes             -- Swipe history (like/pass)
matches            -- Confirmed matches
conversations      -- Chat conversations
messages           -- Message records

-- Monetization
subscriptions      -- Subscription plans
payments           -- Payment transactions
coins              -- Virtual currency
boosts             -- Profile visibility boosts

-- Safety & Moderation
safety_reports     -- User reports
blocks             -- Blocked users

-- Analytics
analytics_events   -- Event tracking
```

---

## 4. Infrastructure Architecture (Azure)

### 4.1 Environment Strategy

| Environment | Purpose | Public Access | SKU Tier |
|-------------|---------|---------------|----------|
| **dev** | Development & testing | Internal only | Basic/Standard |
| **test** | QA and staging | Internal only | Standard |
| **prod** | Production | Public (flamoral.com) | Premium |

### 4.2 Azure Resources Per Environment

```
Azure Resource Group: rg-flamoral-{env}-{region}
├── Networking
│   ├── Virtual Network (10.{env}.0.0/16)
│   ├── Subnets (app, db, cache, mgmt, private-endpoints)
│   └── Network Security Groups
├── Compute
│   ├── Azure Kubernetes Service (AKS)
│   │   ├── System Node Pool (3 nodes)
│   │   └── User Node Pool (auto-scaling)
│   └── Azure Container Registry (ACR)
├── Data
│   ├── Azure Database for PostgreSQL
│   ├── Azure Cosmos DB (MongoDB API)
│   ├── Azure Cache for Redis
│   └── Azure Storage Account (Blob)
├── Security
│   ├── Azure Key Vault
│   └── Managed Identities
├── Monitoring
│   ├── Log Analytics Workspace
│   └── Application Insights
└── Networking (Prod Only)
    ├── Azure Front Door
    └── Azure DNS Zone (flamoral.com)
```

### 4.3 Network Architecture

```
Production VNet: 10.2.0.0/16
├── snet-app         10.2.1.0/24  (App Service delegation)
├── snet-db          10.2.2.0/24  (Database subnet)
├── snet-cache       10.2.3.0/24  (Redis subnet)
├── snet-mgmt        10.2.4.0/24  (Management subnet)
└── snet-private-ep  10.2.5.0/24  (Private endpoints)

Test VNet: 10.1.0.0/16
Dev VNet:  10.0.0.0/16
```

---

## 5. Kubernetes Architecture (AKS)

### 5.1 Namespace Structure

```
├── flamoral-system    # System components
├── flamoral-app       # Application services
├── flamoral-data      # Data services
├── flamoral-ai        # AI/ML services
├── monitoring         # Prometheus, Grafana
└── ingress-nginx      # Ingress controller
```

### 5.2 Deployment Strategy

| Service Type | Replicas (Prod) | HPA | Resources |
|--------------|-----------------|-----|-----------|
| API Gateway | 3 | Yes (3-10) | 500m CPU, 512Mi RAM |
| Core Services | 2 | Yes (2-8) | 250m CPU, 256Mi RAM |
| AI Services | 2 | Yes (2-4) | 1 CPU, 1Gi RAM |
| Workers | 2 | Yes (2-6) | 250m CPU, 256Mi RAM |

### 5.3 Ingress Configuration

```yaml
# Production Ingress
- host: flamoral.com
  paths:
    - path: /
      service: web-app
- host: api.flamoral.com
  paths:
    - path: /
      service: api-gateway
    - path: /ws
      service: realtime-service
```

---

## 6. CI/CD Pipeline Architecture

### 6.1 Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Azure DevOps Pipelines                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│  │   CI Pipeline   │───▶│  Build & Test   │───▶│  Push to ACR    │            │
│  │  (on PR/push)   │    │                 │    │                 │            │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│           │                                                                     │
│           ▼                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│  │  CD Pipeline    │───▶│  Deploy to Dev  │───▶│  Deploy to Test │            │
│  │  (on merge)     │    │   (auto)        │    │   (auto)        │            │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│                                    │                    │                       │
│                                    ▼                    ▼                       │
│                         ┌─────────────────┐    ┌─────────────────┐            │
│                         │ Deploy to Prod  │◀───│  Manual Approval │            │
│                         │  (with approval)│    │                 │            │
│                         └─────────────────┘    └─────────────────┘            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Pipeline Definitions

| Pipeline | Trigger | Purpose |
|----------|---------|---------|
| `azure-pipelines-infra.yml` | terraform/** changes | Infrastructure deployment |
| `ci-pipeline.yml` | PR to main/develop | Build, test, security scan |
| `cd-pipeline.yml` | Merge to main | Deploy to all environments |
| `security-pipeline.yml` | Weekly schedule | Security scanning |

---

## 7. Security Architecture

### 7.1 Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Client ──▶ API Gateway ──▶ Auth Service ──▶ JWT Token          │
│                  │                                              │
│                  ▼                                              │
│           Token Validation (every request)                      │
│                  │                                              │
│                  ▼                                              │
│           Backend Services (authenticated)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Security Measures

| Layer | Security Control |
|-------|------------------|
| **Edge** | Azure Front Door WAF, DDoS Protection |
| **Transport** | TLS 1.3, HTTPS enforced |
| **Application** | JWT tokens, rate limiting, CORS |
| **Data** | Encryption at rest, Azure Key Vault |
| **Network** | NSGs, Private endpoints, VNet isolation |
| **Code** | Checkov scanning, dependency audit |

---

## 8. Monitoring & Observability

### 8.1 Monitoring Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    Observability Stack                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Metrics: Prometheus ──▶ Grafana (Dashboards)                   │
│  Logs: Filebeat ──▶ Elasticsearch ──▶ Kibana                    │
│  Traces: Application Insights (Azure)                           │
│  Alerts: AlertManager ──▶ PagerDuty/Slack                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Key Metrics Tracked

- API response times (p50, p95, p99)
- Error rates by service
- Active users and sessions
- Match rate and engagement
- Payment conversion rates
- Infrastructure utilization

---

## 9. External Integrations

| Service | Purpose | Provider |
|---------|---------|----------|
| **Payments** | Subscription billing | Stripe |
| **Email** | Transactional email | SendGrid |
| **SMS** | Phone verification | Twilio |
| **Push Notifications** | Mobile push | FCM, APNS |
| **Video Calling** | In-app video/voice | Agora |
| **Face Detection** | Photo verification | Azure Face API |
| **Content Moderation** | Safety screening | Azure Content Moderator |

---

## 10. Disaster Recovery & Business Continuity

### 10.1 Backup Strategy

| Component | Backup Frequency | Retention | Method |
|-----------|------------------|-----------|--------|
| PostgreSQL | Daily + Transaction logs | 30 days | Azure Backup |
| MongoDB | Daily | 14 days | Cosmos DB automatic |
| Blob Storage | Continuous | 7 days (soft delete) | GRS replication |
| Key Vault | Automatic | Soft delete enabled | Azure managed |

### 10.2 Recovery Objectives

| Metric | Target |
|--------|--------|
| RTO (Recovery Time Objective) | < 4 hours |
| RPO (Recovery Point Objective) | < 1 hour |
| Availability SLA | 99.9% |

---

## 11. Scalability Design

### 11.1 Horizontal Scaling

```
Auto-scaling Configuration:
├── AKS Node Pool: 3-10 nodes
├── API Gateway Pods: 3-10 replicas
├── Core Services: 2-8 replicas each
├── AI Services: 2-4 replicas each
└── Database: Read replicas available
```

### 11.2 Expected Capacity

| Metric | Target Capacity |
|--------|-----------------|
| Concurrent Users | 100,000+ |
| API Requests/sec | 10,000+ |
| WebSocket Connections | 50,000+ |
| Daily Messages | 10 million+ |

---

## 12. Technology Stack Summary

| Category | Technologies |
|----------|--------------|
| **Frontend** | React 18, React Native, TypeScript, Vite, Tailwind CSS |
| **Backend** | Node.js 20, Express.js, TypeScript, Socket.io |
| **AI/ML** | Python, TensorFlow, spaCy |
| **Databases** | PostgreSQL, MongoDB, Redis, Elasticsearch |
| **Infrastructure** | Azure, Terraform, Kubernetes, Helm |
| **CI/CD** | Azure DevOps, GitHub Actions |
| **Monitoring** | Prometheus, Grafana, ELK Stack, Application Insights |
| **Security** | Azure Key Vault, WAF, TLS, JWT |

---

## 13. Gaps and Future Improvements

### Current Gaps
1. Service mesh (Istio/Linkerd) not yet implemented
2. Distributed tracing (Jaeger) not configured
3. API versioning strategy needs formalization
4. Multi-region deployment not yet configured

### Planned Improvements
1. Implement service mesh for better observability
2. Add geo-redundancy for global users
3. Implement feature flags system
4. Add A/B testing framework
5. Enhance ML recommendation models

---

## Document Information

| Field | Value |
|-------|-------|
| Last Updated | December 2024 |
| Version | 2.0 |
| Author | Flamoral Platform Team |
| Status | Production Ready |
