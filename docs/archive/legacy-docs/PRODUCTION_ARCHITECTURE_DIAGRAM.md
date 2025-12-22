# Flamoral Dating Platform - Production Architecture

## Overview

This document provides a comprehensive architectural diagram and documentation for the Flamoral Dating Platform production deployment, including multi-region configuration, service topology, and operational procedures.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    AZURE FRONT DOOR (Global)                                            │
│                              ┌─────────────────────────────────────────┐                                │
│                              │  • Global Load Balancing                │                                │
│                              │  • WAF Protection (OWASP Rules)         │                                │
│                              │  • SSL/TLS Termination                  │                                │
│                              │  • Geographic Routing                   │                                │
│                              │  • DDoS Protection                      │                                │
│                              │  • CDN for Static Assets                │                                │
│                              └───────────────┬─────────────────────────┘                                │
│                                              │                                                          │
│                    ┌─────────────────────────┼─────────────────────────┐                                │
│                    │                         │                         │                                │
│                    ▼                         ▼                         ▼                                │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐                  │
│  │   AMERICAS REGION       │  │    EUROPE REGION        │  │    AFRICA REGION        │                  │
│  │   (East US)             │  │    (West Europe)        │  │    (South Africa North) │                  │
│  │   americas.flamoral.com │  │    eu.flamoral.com      │  │    africa.flamoral.com  │                  │
│  └───────────┬─────────────┘  └───────────┬─────────────┘  └───────────┬─────────────┘                  │
└──────────────│─────────────────────────────│─────────────────────────────│──────────────────────────────┘

               │                             │                             │
               ▼                             ▼                             ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              AZURE KUBERNETES SERVICE (AKS) CLUSTERS                                     │
├──────────────────────────────┬─────────────────────────────┬─────────────────────────────────────────────┤
│     AKS Americas             │     AKS Europe              │     AKS Africa                              │
│     10.40.0.0/16            │     10.50.0.0/16            │     10.60.0.0/16                            │
│     3-20 User Nodes         │     3-20 User Nodes         │     2-15 User Nodes                         │
│     3-5 System Nodes        │     3-5 System Nodes        │     2-4 System Nodes                        │
│     Zone Redundant (1,2,3)  │     Zone Redundant (1,2,3)  │     Single Zone                             │
└──────────────────────────────┴─────────────────────────────┴─────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    MICROSERVICES ARCHITECTURE                                            │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐    │
│  │                              API GATEWAY (NestJS) - Port 4000                                   │    │
│  │  • JWT Authentication       • Rate Limiting          • Circuit Breaker                         │    │
│  │  • CORS/CSRF Protection     • Request Routing        • Health Aggregation                      │    │
│  │  • API Versioning           • DDoS Protection        • Subscription Guards                     │    │
│  └───────────────────────────────────────────┬─────────────────────────────────────────────────────┘    │
│                                              │                                                          │
│              ┌───────────────────────────────┼───────────────────────────────┐                          │
│              │               │               │               │               │                          │
│              ▼               ▼               ▼               ▼               ▼                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐          │
│  │ Auth Service  │  │ User Service  │  │ Matching Svc  │  │ Messaging Svc │  │ Media Service │          │
│  │   Port 3001   │  │   Port 3002   │  │   Port 3009   │  │   Port 3003   │  │   Port 3005   │          │
│  │ • JWT Tokens  │  │ • Profiles    │  │ • Swipes      │  │ • Real-time   │  │ • Photo Upload│          │
│  │ • OAuth 2.0   │  │ • Settings    │  │ • Matches     │  │ • Socket.IO   │  │ • Moderation  │          │
│  │ • 2FA/TOTP    │  │ • Gamification│  │ • Boosts      │  │ • E2E Encrypt │  │ • Azure Blob  │          │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘          │
│          │                  │                  │                  │                  │                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐          │
│  │ Notification  │  │ Payment Svc   │  │ Analytics Svc │  │ Moderation    │  │ Admin Service │          │
│  │   Port 3008   │  │   Port 3006   │  │   Port 3007   │  │   Port 3012   │  │   Port 3010   │          │
│  │ • FCM/APNs    │  │ • Stripe      │  │ • Events      │  │ • AI Safety   │  │ • Dashboard   │          │
│  │ • SendGrid    │  │ • Paystack    │  │ • Metrics     │  │ • CSAM Detect │  │ • Monitoring  │          │
│  │ • Bull Queue  │  │ • Flutterwave │  │ • Funnels     │  │ • AWS Rekog   │  │ • Health      │          │
│  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘          │
│                                                                                                          │
│  ┌───────────────┐  ┌───────────────┐                                                                   │
│  │ Automation    │  │ Advertising   │                                                                   │
│  │   Port 3009   │  │   Port 3011   │                                                                   │
│  │ • RabbitMQ    │  │ • AI Ads      │                                                                   │
│  │ • AI Replies  │  │ • Targeting   │                                                                   │
│  │ • Scheduling  │  │ • Analytics   │                                                                   │
│  └───────────────┘  └───────────────┘                                                                   │
│                                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         DATA LAYER                                                       │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                          │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐      │
│  │   PostgreSQL (Regional)     │  │   Azure Cosmos DB           │  │   Redis Cache (Regional)    │      │
│  │   • User Data               │  │   • Messaging Data          │  │   • Session Data            │      │
│  │   • Subscriptions           │  │   • Global Replication      │  │   • Rate Limiting           │      │
│  │   • Payments                │  │   • Low Latency Reads       │  │   • Real-time State         │      │
│  │   • Geo-redundant Backup    │  │   • Multi-region Writes     │  │   • Zone Redundant          │      │
│  │   • Data Residency          │  │                             │  │   • Bull Queues             │      │
│  └─────────────────────────────┘  └─────────────────────────────┘  └─────────────────────────────┘      │
│                                                                                                          │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐                                       │
│  │   Azure Blob Storage        │  │   RabbitMQ                  │                                       │
│  │   • Media Files             │  │   • Event Messaging         │                                       │
│  │   • User Photos/Videos      │  │   • Async Processing        │                                       │
│  │   • Geo-redundant (GRS)     │  │   • match_events            │                                       │
│  │   • CDN Integration         │  │   • message_events          │                                       │
│  └─────────────────────────────┘  └─────────────────────────────┘                                       │
│                                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              SHARED INFRASTRUCTURE (Global)                                              │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                          │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐      │
│  │   Azure Container Registry  │  │   Azure Key Vault           │  │   Azure SignalR             │      │
│  │   (Geo-replicated Premium)  │  │   (Per Region)              │  │   (Premium - Real-time)     │      │
│  │   • westus2 (primary)       │  │   • Secrets Management      │  │   • WebSocket Management    │      │
│  │   • eastus                  │  │   • Certificate Storage     │  │   • Presence Updates        │      │
│  │   • westeurope              │  │   • Key Rotation            │  │   • Typing Indicators       │      │
│  │   • southafricanorth        │  │   • RBAC Access             │  │   • Match Notifications     │      │
│  └─────────────────────────────┘  └─────────────────────────────┘  └─────────────────────────────┘      │
│                                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              MONITORING & OBSERVABILITY                                                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐          │
│  │   Prometheus  │  │    Grafana    │  │    Jaeger     │  │    Sentry     │  │  Log Analytics│          │
│  │   • Metrics   │  │  • Dashboards │  │  • Tracing    │  │  • Errors     │  │  • Azure Mon  │          │
│  │   • Alerts    │  │  • Alerts     │  │  • Spans      │  │  • APM        │  │  • Logs       │          │
│  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘          │
│                                                                                                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                                                │
│  │  AlertManager │  │     Loki      │  │   ELK Stack   │                                                │
│  │  • Routing    │  │  • Log Agg    │  │  • Search     │                                                │
│  │  • Silencing  │  │  • Queries    │  │  • Kibana     │                                                │
│  └───────────────┘  └───────────────┘  └───────────────┘                                                │
│                                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Subscription Tiers & Service Separation

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              SUBSCRIPTION TIER MODEL (6-Tier)                                    │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  TIER          PRICE      FEATURES                                   RATE LIMITS                │
│  ─────────────────────────────────────────────────────────────────────────────────────────────  │
│                                                                                                  │
│  FREE          $0/mo      • Basic Matching                          • 50 swipes/day            │
│                           • Limited Profiles                         • 1 super like/day         │
│                           • Standard Support                         • 0 boosts/month           │
│                                                                                                  │
│  BASIC         $9.99/mo   • Unlimited Swipes                        • Unlimited swipes          │
│                           • See Who Liked You                        • 5 super likes/day        │
│                           • 5 Super Likes/day                        • 1 boost/month            │
│                                                                                                  │
│  PLUS          $14.99/mo  • Incognito Mode                          • Unlimited swipes          │
│                           • Read Receipts                            • 10 super likes/day       │
│                           • Priority Support                         • 1 boost/month            │
│                                                                                                  │
│  PREMIUM       $19.99/mo  • Unlimited Super Likes                   • Unlimited swipes          │
│                           • Passport (Location Change)               • Unlimited super likes    │
│                           • Advanced Filters                         • 2 boosts/month           │
│                                                                                                  │
│  PREMIUM+      $29.99/mo  • Message Before Match                    • Unlimited swipes          │
│                           • Profile Boost Weekly                     • Unlimited super likes    │
│                           • See Who's Online                         • 4 boosts/month           │
│                                                                                                  │
│  ELITE         $49.99/mo  • VIP Badge                               • Unlimited everything      │
│                           • Concierge Support                        • 12 boosts/month          │
│                           • Priority Matching                        • Priority queue           │
│                           • Exclusive Events                                                    │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Multi-Currency Support

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              PAYMENT PROCESSING ARCHITECTURE                                     │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│                              ┌─────────────────────────┐                                        │
│                              │    Payment Service       │                                        │
│                              │    (Port 3006)          │                                        │
│                              └───────────┬─────────────┘                                        │
│                                          │                                                      │
│              ┌───────────────────────────┼───────────────────────────┐                          │
│              │                           │                           │                          │
│              ▼                           ▼                           ▼                          │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐                  │
│  │       STRIPE        │    │      PAYSTACK       │    │    FLUTTERWAVE      │                  │
│  │ • USD, EUR, GBP     │    │ • NGN (Nigeria)     │    │ • NGN, GHS, KES     │                  │
│  │ • Global Coverage   │    │ • ZAR (S. Africa)   │    │ • ZAR, TZS, UGX     │                  │
│  │ • Subscriptions     │    │ • Local Cards       │    │ • Pan-African       │                  │
│  │ • Webhooks          │    │ • Mobile Money      │    │ • Mobile Money      │                  │
│  └─────────────────────┘    └─────────────────────┘    └─────────────────────┘                  │
│                                                                                                  │
│              ┌───────────────────────────────────────────────────────┐                          │
│              │                                                       │                          │
│              ▼                                                       ▼                          │
│  ┌─────────────────────┐                                ┌─────────────────────┐                  │
│  │   APPLE IAP         │                                │   GOOGLE PLAY       │                  │
│  │ • iOS Purchases     │                                │ • Android Purchases │                  │
│  │ • Auto-currency     │                                │ • Auto-currency     │                  │
│  │ • Subscription Sync │                                │ • Subscription Sync │                  │
│  └─────────────────────┘                                └─────────────────────┘                  │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Internationalization (i18n)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              I18N IMPLEMENTATION                                                 │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  PACKAGE: @flamoral/i18n (packages/i18n/)                                                       │
│  LIBRARY: i18next 23.7.0 + react-i18next 13.5.0                                                │
│                                                                                                  │
│  SUPPORTED LANGUAGES:                                                                           │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐                        │
│  │   English   │   Spanish   │   French    │   German    │  Portuguese │                        │
│  │     (en)    │     (es)    │     (fr)    │     (de)    │     (pt)    │                        │
│  │     ✓       │     ✓       │   Planned   │   Planned   │   Planned   │                        │
│  └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘                        │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐                                      │
│  │   Italian   │   Japanese  │   Korean    │   Chinese   │                                      │
│  │     (it)    │     (ja)    │     (ko)    │     (zh)    │                                      │
│  │   Planned   │   Planned   │   Planned   │   Planned   │                                      │
│  └─────────────┴─────────────┴─────────────┴─────────────┘                                      │
│                                                                                                  │
│  REGIONAL LANGUAGE SUPPORT (backend/services/policy-service/config/regions.json):              │
│  • US: en, es                                                                                   │
│  • California: en, es, zh                                                                       │
│  • EU: en, de, fr, es, it, nl, pl, ro                                                          │
│  • Canada: en, fr                                                                               │
│  • Japan: ja, en                                                                                │
│  • China: zh                                                                                    │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Regional Compliance Configuration

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              REGIONAL COMPLIANCE MATRIX                                          │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  REGION       DATA RESIDENCY     COMPLIANCE          DATA RETENTION    ENCRYPTION               │
│  ───────────────────────────────────────────────────────────────────────────────────────────    │
│                                                                                                  │
│  Americas     North America      SOC2, CCPA          7 years           AES-256 at rest          │
│  (eastus)     US-only backups    HIPAA-ready         CCPA deletion     TLS 1.3 in transit       │
│                                                      on request                                  │
│                                                                                                  │
│  Europe       European Union     GDPR, SOC2          GDPR compliant    AES-256 at rest          │
│  (westeurope) EU-only storage    ePrivacy            Right to erasure  TLS 1.3 in transit       │
│                                  PCI-DSS             Data portability                            │
│                                                                                                  │
│  Africa       Africa             POPIA (SA)          POPIA compliant   AES-256 at rest          │
│  (safrican)   Local storage      Nigeria NDPR        7 years           TLS 1.3 in transit       │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Network Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              NETWORK TOPOLOGY                                                    │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  VNET ALLOCATION:                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐    │
│  │  Region        │  VNET CIDR      │  AKS Subnet    │  DB Subnet    │  Redis Subnet      │    │
│  ├─────────────────────────────────────────────────────────────────────────────────────────┤    │
│  │  Primary       │  10.30.0.0/16   │  10.30.1.0/24  │  10.30.2.0/24 │  10.30.3.0/24      │    │
│  │  (westus2)     │                 │                │               │                    │    │
│  ├─────────────────────────────────────────────────────────────────────────────────────────┤    │
│  │  Americas      │  10.40.0.0/16   │  10.40.1.0/24  │  10.40.2.0/24 │  10.40.3.0/24      │    │
│  │  (eastus)      │                 │                │               │                    │    │
│  ├─────────────────────────────────────────────────────────────────────────────────────────┤    │
│  │  Europe        │  10.50.0.0/16   │  10.50.1.0/24  │  10.50.2.0/24 │  10.50.3.0/24      │    │
│  │  (westeurope)  │                 │                │               │                    │    │
│  ├─────────────────────────────────────────────────────────────────────────────────────────┤    │
│  │  Africa        │  10.60.0.0/16   │  10.60.1.0/24  │  10.60.2.0/24 │  10.60.3.0/24      │    │
│  │  (safrican)    │                 │                │               │                    │    │
│  └─────────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                                  │
│  NETWORK POLICIES:                                                                              │
│  • Default deny all ingress/egress                                                              │
│  • API → PostgreSQL (5432) allowed                                                              │
│  • API → Redis (6379) allowed                                                                   │
│  • Ingress → API pods (80/8080) allowed                                                         │
│  • External HTTPS (443) allowed                                                                 │
│  • Prometheus metrics collection allowed                                                        │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## CI/CD Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              CI/CD WORKFLOW                                                      │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│   │  Commit  │───▶│  Build   │───▶│   Test   │───▶│  Scan    │───▶│  Deploy  │                  │
│   │          │    │          │    │          │    │          │    │          │                  │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘                  │
│                                                                                                  │
│   1. Git Push     2. Docker      3. Unit Tests   4. Security    5. Helm                         │
│   to main/        Build all      Integration     Scans          Deploy to                       │
│   feature         21 services    E2E Tests       SAST/DAST      AKS                             │
│                                                                                                  │
│   ENVIRONMENTS:                                                                                 │
│   • dev     → feature branches → auto-deploy                                                    │
│   • staging → main branch      → auto-deploy + approval                                         │
│   • prod    → release tags     → manual approval required                                       │
│                                                                                                  │
│   DEPLOYMENT STRATEGIES:                                                                        │
│   • Blue-Green: Zero-downtime deployments                                                       │
│   • Canary: Gradual rollout (10% → 50% → 100%)                                                 │
│   • Rollback: Automated on health check failure                                                 │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Service Dependencies

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              SERVICE DEPENDENCY GRAPH                                            │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│                           ┌─────────────────┐                                                   │
│                           │   API Gateway   │                                                   │
│                           └────────┬────────┘                                                   │
│                                    │                                                            │
│        ┌───────────┬───────────┬───┴───┬───────────┬───────────┬───────────┐                   │
│        ▼           ▼           ▼       ▼           ▼           ▼           ▼                   │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│   │  Auth   │ │  User   │ │ Matching│ │Messaging│ │  Media  │ │ Payment │ │Analytics│         │
│   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └─────────┘         │
│        │           │           │           │           │           │                            │
│        └───────────┴───────────┴───────────┴───────────┴───────────┘                           │
│                                    │                                                            │
│                    ┌───────────────┼───────────────┐                                           │
│                    ▼               ▼               ▼                                           │
│            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                                     │
│            │ PostgreSQL  │ │  Cosmos DB  │ │    Redis    │                                     │
│            │ (Regional)  │ │  (Global)   │ │  (Regional) │                                     │
│            └─────────────┘ └─────────────┘ └─────────────┘                                     │
│                                                                                                  │
│  CRITICAL PATH SERVICES (Required for basic functionality):                                     │
│  • Auth Service → User authentication                                                           │
│  • User Service → Profile management                                                            │
│  • API Gateway  → Request routing                                                               │
│                                                                                                  │
│  GRACEFUL DEGRADATION (App functions with reduced features if unavailable):                    │
│  • Analytics Service                                                                            │
│  • Advertising Service                                                                          │
│  • Automation Service                                                                           │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Quick Reference

| Component | Technology | Port | Database |
|-----------|------------|------|----------|
| API Gateway | NestJS | 4000 | - |
| Auth Service | Express | 3001 | PostgreSQL + Redis |
| User Service | Express | 3002 | PostgreSQL + Redis |
| Messaging Service | Express | 3003 | Cosmos DB + Redis |
| Media Service | Express | 3005 | PostgreSQL + Azure Blob |
| Payment Service | Express | 3006 | PostgreSQL |
| Analytics Service | Express | 3007 | PostgreSQL |
| Notification Service | Express | 3008 | PostgreSQL + Redis |
| Matching Service | Express | 3009 | PostgreSQL + Redis |
| Admin Service | Express | 3010 | PostgreSQL + Redis |
| Advertising Service | Express | 3011 | PostgreSQL |
| Moderation Service | Express | 3012 | PostgreSQL |

---

*Last Updated: December 2024*
*Document Version: 1.0.0*
