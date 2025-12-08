# Flamoral Dating Platform - Complete Architecture Overview

## Executive Summary

Flamoral is a world-class, enterprise-grade dating platform built with modern cloud-native microservices architecture. The platform supports web and mobile applications, real-time messaging, AI-powered matching, and comprehensive monetization features.

**Brand**: Flamoral (Where Passion Meets Connection)
**Domain**: flamoral.com
**Cloud Provider**: Microsoft Azure
**Architecture Style**: Microservices
**Deployment Model**: Kubernetes (AKS)
**Target Scale**: 100,000+ concurrent users

---

## Table of Contents

1. [Repository Structure](#1-repository-structure)
2. [Backend Microservices](#2-backend-microservices)
3. [AI Services](#3-ai-services)
4. [Frontend Applications](#4-frontend-applications)
5. [Infrastructure Components](#5-infrastructure-components)
6. [Kubernetes Architecture](#6-kubernetes-architecture)
7. [CI/CD Pipeline Architecture](#7-cicd-pipeline-architecture)
8. [Data Architecture](#8-data-architecture)
9. [Security Architecture](#9-security-architecture)
10. [Monitoring & Observability](#10-monitoring--observability)
11. [Scalability & Performance](#11-scalability--performance)
12. [Disaster Recovery](#12-disaster-recovery)

---

## 1. Repository Structure

```
DatingPlatform/
├── apps/                          # Frontend applications
│   ├── web-app/                   # React web application (Vite)
│   ├── mobile-app/                # React Native mobile app
│   └── branding/                  # Brand assets and design system
│
├── backend/                       # Backend microservices
│   └── services/                  # All microservices
│       ├── api-gateway/           # API Gateway (NestJS)
│       ├── auth-service/          # Authentication & authorization
│       ├── user-service/          # User profile management
│       ├── matching-service/      # Matching algorithm
│       ├── messaging-service/     # Real-time messaging
│       ├── media-service/         # Photo/video uploads
│       ├── payment-service/       # Stripe integration
│       ├── notification-service/  # Push, email, SMS
│       ├── moderation-service/    # Content moderation
│       ├── analytics-service/     # Analytics & tracking
│       ├── advertising-service/   # Ads & monetization
│       ├── realtime-service/      # WebSocket connections
│       ├── ai-services/           # AI/ML microservices
│       │   ├── dating-coach-service/
│       │   ├── fraud-detection/
│       │   ├── nlp-service/
│       │   ├── photo-analysis/
│       │   └── recommendation-service/
│       └── shared/                # Shared libraries
│
├── k8s/                           # Kubernetes configurations
│   ├── base/                      # Base K8s resources
│   │   ├── namespace.yaml
│   │   ├── configmaps.yaml
│   │   ├── secrets.yaml
│   │   ├── hpa.yaml               # Horizontal Pod Autoscaler
│   │   ├── pdb.yaml               # Pod Disruption Budget
│   │   └── network-policies.yaml
│   ├── helm/                      # Helm charts
│   ├── ingress/                   # Ingress configurations
│   └── service-mesh/              # Service mesh configs
│
├── terraform/                     # Infrastructure as Code
│   ├── modules/                   # Reusable Terraform modules
│   │   ├── app-service/
│   │   ├── container-registry/
│   │   ├── key-vault/
│   │   ├── monitoring/
│   │   ├── networking/
│   │   ├── resource-group/
│   │   ├── sql-database/
│   │   └── storage-account/
│   ├── environments/              # Environment-specific configs
│   │   ├── dev/
│   │   ├── test/
│   │   └── prod/
│   ├── security/                  # Security configurations
│   └── shared/                    # Shared resources
│
├── pipelines/                     # Azure DevOps pipelines
│   ├── ci-pipeline.yml
│   ├── cd-pipeline.yml
│   ├── cd-pipeline-canary.yml
│   ├── infrastructure-pipeline.yml
│   ├── security-pipeline.yml
│   ├── azure-pipelines-infra.yml
│   ├── azure-pipelines-bootstrap.yml
│   ├── templates/                 # Pipeline templates
│   │   ├── docker-build-push.yml
│   │   ├── node-build.yml
│   │   ├── terraform-init.yml
│   │   ├── terraform-plan.yml
│   │   ├── terraform-apply.yml
│   │   ├── helm-deploy.yml
│   │   ├── canary-deployment.yml
│   │   ├── rollback-deployment.yml
│   │   ├── health-check.yml
│   │   ├── integration-tests.yml
│   │   ├── database-migration.yml
│   │   ├── variables-common.yml
│   │   ├── variables-dev.yml
│   │   ├── variables-test.yml
│   │   └── variables-prod.yml
│   └── variable-groups/           # Variable group configs
│
├── infrastructure/                # Infrastructure support
│   ├── ansible/                   # Configuration management
│   ├── database/                  # Database schemas & migrations
│   ├── docker/                    # Docker configurations
│   ├── helm/                      # Helm chart definitions
│   ├── kubernetes/                # K8s manifests
│   ├── monitoring/                # Monitoring configs
│   ├── logging/                   # Logging infrastructure
│   ├── security/                  # Security policies
│   ├── disaster-recovery/         # DR procedures
│   ├── runbooks/                  # Operational runbooks
│   └── scripts/                   # Infrastructure scripts
│
├── database/                      # Database schemas
├── docs/                          # Documentation
├── fixtures/                      # Test fixtures
├── packages/                      # Shared packages
├── proto/                         # Protocol buffers (if gRPC)
├── scripts/                       # Build & utility scripts
├── security/                      # Security configurations
└── tests/                         # Integration tests
```

---

## 2. Backend Microservices

### 2.1 Core Services Overview

```
                           ┌────────────────────────────────────────┐
                           │         API Gateway (NestJS)           │
                           │          Port: 4000                    │
                           │  • Request routing                     │
                           │  • Authentication middleware           │
                           │  • Rate limiting                       │
                           │  • GraphQL & REST support              │
                           └─────────────┬──────────────────────────┘
                                        │
                    ┌───────────────────┼────────────────────┐
                    │                   │                    │
        ┌───────────▼────────┐ ┌───────▼────────┐ ┌────────▼───────────┐
        │   Auth Service     │ │  User Service  │ │ Matching Service   │
        │    Port: 3001      │ │   Port: 3002   │ │    Port: 3003      │
        └────────────────────┘ └────────────────┘ └────────────────────┘
                    │                   │                    │
        ┌───────────▼────────┐ ┌───────▼────────┐ ┌────────▼───────────┐
        │ Messaging Service  │ │  Media Service │ │  Payment Service   │
        │    Port: 3004      │ │   Port: 3006   │ │    Port: 3007      │
        └────────────────────┘ └────────────────┘ └────────────────────┘
                    │                   │                    │
        ┌───────────▼────────┐ ┌───────▼────────┐ ┌────────▼───────────┐
        │Notification Service│ │Analytics Service│ │Moderation Service  │
        │    Port: 3008      │ │   Port: 3009   │ │    Port: 3010      │
        └────────────────────┘ └────────────────┘ └────────────────────┘
                    │                   │                    │
        ┌───────────▼────────┐ ┌───────▼────────┐
        │Advertising Service │ │ Realtime Service│
        │    Port: 3011      │ │  Port: 3012     │
        └────────────────────┘ └─────────────────┘
```

### 2.2 Service Details

| Service | Port | Technology | Primary Responsibility |
|---------|------|------------|----------------------|
| **API Gateway** | 4000 | NestJS, GraphQL, Express | Request routing, auth middleware, rate limiting, API versioning |
| **Auth Service** | 3001 | NestJS, Passport.js, JWT | User authentication, JWT tokens, OAuth2, 2FA, password management |
| **User Service** | 3002 | NestJS, TypeORM | Profile CRUD, preferences, bio, photos metadata, user search |
| **Matching Service** | 3003 | NestJS, TensorFlow.js | AI matching algorithm, swipe logic, compatibility scoring |
| **Messaging Service** | 3004 | NestJS, Socket.io | Real-time chat, message history, read receipts, typing indicators |
| **Media Service** | 3006 | NestJS, Sharp, Multer | Photo/video upload, image processing, Azure Blob integration |
| **Payment Service** | 3007 | NestJS, Stripe SDK | Subscriptions, payments, coins, boosts, transaction history |
| **Notification Service** | 3008 | NestJS, FCM, APNS | Push notifications, email (SendGrid), SMS (Twilio) |
| **Moderation Service** | 3010 | NestJS, Azure AI | Content moderation, user reports, automated flagging, appeals |
| **Analytics Service** | 3009 | NestJS, ClickHouse | Event tracking, metrics, user behavior, conversion funnels |
| **Advertising Service** | 3011 | NestJS | Ad campaigns, impressions, click tracking, revenue optimization |
| **Realtime Service** | 3012 | NestJS, Socket.io | WebSocket connections, presence tracking, live updates |

### 2.3 Service Communication Patterns

```
┌──────────────────────────────────────────────────────────────────┐
│                     Synchronous (REST/GraphQL)                    │
│  API Gateway ──▶ Services (Direct HTTP calls)                    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                   Asynchronous (Message Queue)                    │
│  Service ──▶ RabbitMQ ──▶ Worker ──▶ Process                     │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     Real-time (WebSocket)                         │
│  Client ◄──▶ Realtime Service ◄──▶ Redis Pub/Sub                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. AI Services

### 3.1 AI/ML Microservices Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          AI Services Layer                           │
│                         (Python/TensorFlow)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────┐      ┌──────────────────────┐            │
│  │  Dating Coach        │      │  Recommendation      │            │
│  │  Service             │      │  Service             │            │
│  │                      │      │                      │            │
│  │  • Conversational AI │      │  • ML-based matching │            │
│  │  • Dating advice     │      │  • User preferences  │            │
│  │  • GPT integration   │      │  • Collaborative     │            │
│  └──────────────────────┘      │    filtering         │            │
│                                └──────────────────────┘            │
│  ┌──────────────────────┐      ┌──────────────────────┐            │
│  │  Photo Analysis      │      │  NLP Service         │            │
│  │  Service             │      │                      │            │
│  │                      │      │  • Sentiment         │            │
│  │  • Face detection    │      │    analysis          │            │
│  │  • Quality scoring   │      │  • Bio analysis      │            │
│  │  • Age verification  │      │  • Message tone      │            │
│  │  • Azure Face API    │      │  • spaCy/NLTK        │            │
│  └──────────────────────┘      └──────────────────────┘            │
│                                                                     │
│  ┌──────────────────────┐                                          │
│  │  Fraud Detection     │                                          │
│  │  Service             │                                          │
│  │                      │                                          │
│  │  • Fake profiles     │                                          │
│  │  • Bot detection     │                                          │
│  │  • Anomaly detection │                                          │
│  │  • Pattern analysis  │                                          │
│  └──────────────────────┘                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 AI Service Stack

| Service | Technology | Purpose |
|---------|-----------|---------|
| **Dating Coach** | Python, OpenAI GPT, FastAPI | Conversational AI for dating advice and tips |
| **Recommendation** | Python, TensorFlow, scikit-learn | ML-based match recommendations, collaborative filtering |
| **Photo Analysis** | Python, OpenCV, Azure Face API | Face detection, quality scoring, age verification |
| **NLP Service** | Python, spaCy, NLTK | Sentiment analysis, bio quality, message tone detection |
| **Fraud Detection** | Python, TensorFlow, Scikit-learn | Fake profile detection, bot identification, anomaly detection |

---

## 4. Frontend Applications

### 4.1 Web Application

**Location**: `apps/web-app/`

**Technology Stack**:
- React 18.2 with TypeScript
- Vite (build tool)
- Redux Toolkit (state management)
- React Router v6 (navigation)
- Tailwind CSS + Styled Components (styling)
- Axios + TanStack Query (data fetching)
- Framer Motion (animations)
- Stripe React components
- Socket.io client (real-time)

**Key Features**:
- Server-Side Rendering (SSR) ready
- Progressive Web App (PWA)
- Code splitting & lazy loading
- Responsive design (mobile-first)
- Dark mode support
- Real-time messaging
- Video/voice calling integration

**Build Output**: Static files served via Azure CDN

### 4.2 Mobile Application

**Location**: `apps/mobile-app/`

**Technology Stack**:
- React Native 0.73
- TypeScript
- Redux Toolkit + Redux Persist
- React Navigation v6
- React Native Gesture Handler
- React Native Reanimated
- Socket.io client
- Native modules for camera, location, permissions

**Supported Platforms**:
- iOS 13+
- Android 8.0+ (API level 26+)

**Key Features**:
- Native performance
- Push notifications (FCM/APNS)
- Location-based matching
- Camera integration
- Biometric authentication
- Offline support

---

## 5. Infrastructure Components

### 5.1 Azure Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Azure Cloud (Per Environment)                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Resource Group: rg-flamoral-{env}-eastus                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Networking                                                  │  │
│  │  ├── Virtual Network (VNet)                                 │  │
│  │  ├── Subnets (app, db, cache, mgmt, private-endpoints)     │  │
│  │  ├── Network Security Groups (NSGs)                         │  │
│  │  ├── Application Gateway                                    │  │
│  │  └── Azure DNS Zone (prod only)                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Compute                                                     │  │
│  │  ├── Azure Kubernetes Service (AKS)                         │  │
│  │  │   ├── System Node Pool (3 nodes, Standard_DS2_v2)       │  │
│  │  │   └── User Node Pool (auto-scale 2-10 nodes)            │  │
│  │  ├── Azure Container Registry (ACR)                         │  │
│  │  └── Virtual Machine Scale Sets (worker nodes)              │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Data Services                                               │  │
│  │  ├── Azure Database for PostgreSQL Flexible Server          │  │
│  │  ├── Azure Cosmos DB (MongoDB API)                          │  │
│  │  ├── Azure Cache for Redis                                  │  │
│  │  ├── Azure Storage Account (Blob, Queue, Table)             │  │
│  │  └── Azure Cognitive Search (Elasticsearch alternative)     │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Security                                                    │  │
│  │  ├── Azure Key Vault (secrets, certificates)                │  │
│  │  ├── Managed Identities                                     │  │
│  │  ├── Azure Active Directory (AAD)                           │  │
│  │  └── Azure DDoS Protection                                  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Monitoring & Operations                                     │  │
│  │  ├── Azure Monitor                                           │  │
│  │  ├── Application Insights                                    │  │
│  │  ├── Log Analytics Workspace                                 │  │
│  │  └── Azure Service Health                                    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Content Delivery (Prod Only)                                │  │
│  │  ├── Azure Front Door                                        │  │
│  │  ├── Azure CDN                                               │  │
│  │  └── Azure Traffic Manager                                   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Terraform Module Structure

**Location**: `terraform/modules/`

| Module | Purpose | Key Resources |
|--------|---------|---------------|
| **resource-group** | Azure resource group | Resource group per environment |
| **networking** | VNet, subnets, NSGs | Virtual network, subnets, security rules |
| **container-registry** | ACR for Docker images | Azure Container Registry, webhook |
| **app-service** | AKS cluster | AKS, node pools, auto-scaling |
| **sql-database** | PostgreSQL database | Flexible server, firewall rules, backups |
| **storage-account** | Blob storage | Storage account, containers, lifecycle |
| **key-vault** | Secrets management | Key Vault, access policies, secrets |
| **monitoring** | Observability | Log Analytics, Application Insights, alerts |

### 5.3 Environment Strategy

```
┌──────────────────────────────────────────────────────────────┐
│                    Environment Architecture                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  DEV Environment (rg-flamoral-dev-eastus)                    │
│  ├── Purpose: Development & feature testing                 │
│  ├── Access: Internal only (VPN)                            │
│  ├── SKU: Basic/Standard                                    │
│  ├── Database: Dev tier, minimal backups                    │
│  ├── Auto-scaling: Disabled                                 │
│  └── Cost: Optimized for low cost                           │
│                                                              │
│  TEST Environment (rg-flamoral-test-eastus)                  │
│  ├── Purpose: QA, integration testing, staging              │
│  ├── Access: Internal + select partners                     │
│  ├── SKU: Standard                                          │
│  ├── Database: Production-like configuration                │
│  ├── Auto-scaling: Limited (2-4 nodes)                      │
│  └── Cost: Mid-tier                                         │
│                                                              │
│  PROD Environment (rg-flamoral-prod-eastus)                  │
│  ├── Purpose: Production traffic                            │
│  ├── Access: Public (flamoral.com)                          │
│  ├── SKU: Premium/Production-tier                           │
│  ├── Database: Multi-AZ, automated backups, replicas        │
│  ├── Auto-scaling: Full (3-10 nodes)                        │
│  ├── CDN: Azure Front Door + CDN                            │
│  ├── DDoS: Azure DDoS Protection enabled                    │
│  └── Cost: Production-optimized                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 5.4 Network Architecture

```
Production VNet: 10.2.0.0/16
├── snet-app             10.2.1.0/24    (Application subnet)
│   └── AKS user node pool
├── snet-db              10.2.2.0/24    (Database subnet)
│   ├── PostgreSQL Flexible Server
│   └── Cosmos DB private endpoint
├── snet-cache           10.2.3.0/24    (Cache subnet)
│   └── Azure Cache for Redis
├── snet-mgmt            10.2.4.0/24    (Management subnet)
│   └── Bastion host, jumpbox
└── snet-private-ep      10.2.5.0/24    (Private endpoints)
    ├── Key Vault endpoint
    ├── Storage endpoint
    └── ACR endpoint

Test VNet: 10.1.0.0/16 (same subnet structure)
Dev VNet:  10.0.0.0/16 (same subnet structure)
```

---

## 6. Kubernetes Architecture

### 6.1 AKS Cluster Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Azure Kubernetes Service (AKS)                     │
│                      Cluster: aks-flamoral-{env}                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  System Node Pool (agentpool)                                       │
│  ├── VM Size: Standard_DS2_v2                                       │
│  ├── Node Count: 3 (fixed)                                          │
│  ├── OS: Ubuntu 22.04 LTS                                           │
│  └── Purpose: System pods (CoreDNS, metrics-server, etc.)           │
│                                                                     │
│  User Node Pool (userpool)                                          │
│  ├── VM Size: Standard_DS3_v2                                       │
│  ├── Node Count: 2-10 (auto-scaling)                                │
│  ├── OS: Ubuntu 22.04 LTS                                           │
│  └── Purpose: Application workloads                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Namespace Structure

```
Kubernetes Namespaces:
├── kube-system              # K8s system components
├── kube-public              # Public resources
├── kube-node-lease          # Node heartbeats
├── flamoral-system          # Platform system components
│   ├── ConfigMaps
│   ├── Secrets
│   └── Service Accounts
├── flamoral-app             # Application services
│   ├── api-gateway
│   ├── auth-service
│   ├── user-service
│   ├── matching-service
│   ├── messaging-service
│   ├── media-service
│   ├── payment-service
│   ├── notification-service
│   ├── analytics-service
│   ├── moderation-service
│   ├── advertising-service
│   └── realtime-service
├── flamoral-ai              # AI/ML services
│   ├── dating-coach-service
│   ├── recommendation-service
│   ├── photo-analysis
│   ├── nlp-service
│   └── fraud-detection
├── flamoral-data            # Data services
│   ├── Redis (if self-hosted)
│   └── Message queues
├── monitoring               # Monitoring stack
│   ├── Prometheus
│   ├── Grafana
│   └── AlertManager
└── ingress-nginx            # Ingress controller
    └── NGINX Ingress Controller
```

### 6.3 Deployment Configuration

**Base Kubernetes Resources** (`k8s/base/`):

| Resource | Purpose |
|----------|---------|
| `namespace.yaml` | Namespace definitions for all environments |
| `configmaps.yaml` | Non-sensitive configuration (API URLs, feature flags) |
| `secrets.yaml` | Secret references (actual secrets in Key Vault) |
| `hpa.yaml` | Horizontal Pod Autoscaler for auto-scaling |
| `pdb.yaml` | Pod Disruption Budget for high availability |
| `network-policies.yaml` | Network segmentation and security |

### 6.4 Service Deployment Strategy

```
Production Deployment (Per Service):
├── Replicas: 2-8 (auto-scaled based on CPU/memory)
├── Resource Requests:
│   ├── CPU: 250m - 1000m
│   └── Memory: 256Mi - 1Gi
├── Resource Limits:
│   ├── CPU: 500m - 2000m
│   └── Memory: 512Mi - 2Gi
├── Health Checks:
│   ├── Liveness Probe: /health
│   ├── Readiness Probe: /ready
│   └── Startup Probe: /startup
├── Rolling Update Strategy:
│   ├── Max Surge: 1
│   └── Max Unavailable: 0
└── Pod Anti-Affinity: Spread across availability zones
```

---

## 7. CI/CD Pipeline Architecture

### 7.1 Azure DevOps Pipelines Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Azure DevOps Pipelines                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  CI Pipeline (ci-pipeline.yml)                                │  │
│  │                                                               │  │
│  │  Triggered by: PR to main/develop                            │  │
│  │                                                               │  │
│  │  Stages:                                                      │  │
│  │  1. Checkout code                                            │  │
│  │  2. Install dependencies (npm ci)                            │  │
│  │  3. Lint & format check                                      │  │
│  │  4. Run unit tests                                           │  │
│  │  5. Security scan (Snyk, npm audit)                          │  │
│  │  6. Build services                                           │  │
│  │  7. Build Docker images                                      │  │
│  │  8. Push to ACR                                              │  │
│  │  9. Publish test results                                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  CD Pipeline (cd-pipeline.yml)                                │  │
│  │                                                               │  │
│  │  Triggered by: Merge to main                                 │  │
│  │                                                               │  │
│  │  Stages:                                                      │  │
│  │  1. Deploy to Dev (automatic)                                │  │
│  │     ├── Apply Kubernetes manifests                           │  │
│  │     ├── Run smoke tests                                      │  │
│  │     └── Health check                                         │  │
│  │  2. Deploy to Test (automatic)                               │  │
│  │     ├── Database migrations                                  │  │
│  │     ├── Apply manifests                                      │  │
│  │     ├── Integration tests                                    │  │
│  │     └── Performance tests                                    │  │
│  │  3. Manual Approval Gate                                     │  │
│  │  4. Deploy to Prod (manual)                                  │  │
│  │     ├── Blue-green deployment                                │  │
│  │     ├── Database migrations                                  │  │
│  │     ├── Health checks                                        │  │
│  │     └── Rollback capability                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Infrastructure Pipeline (infrastructure-pipeline.yml)        │  │
│  │                                                               │  │
│  │  Triggered by: Changes to terraform/**                       │  │
│  │                                                               │  │
│  │  Stages:                                                      │  │
│  │  1. Terraform init                                           │  │
│  │  2. Terraform validate                                       │  │
│  │  3. Terraform plan                                           │  │
│  │  4. Security scan (Checkov, tflint)                          │  │
│  │  5. Manual approval                                          │  │
│  │  6. Terraform apply                                          │  │
│  │  7. Update documentation                                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Security Pipeline (security-pipeline.yml)                    │  │
│  │                                                               │  │
│  │  Triggered by: Weekly schedule                               │  │
│  │                                                               │  │
│  │  Stages:                                                      │  │
│  │  1. Dependency scanning                                      │  │
│  │  2. SAST (Static Application Security Testing)               │  │
│  │  3. Container image scanning                                 │  │
│  │  4. Infrastructure security scan                             │  │
│  │  5. Generate security report                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Canary Deployment (cd-pipeline-canary.yml)                   │  │
│  │                                                               │  │
│  │  Triggered by: Manual                                        │  │
│  │                                                               │  │
│  │  Stages:                                                      │  │
│  │  1. Deploy canary (10% traffic)                              │  │
│  │  2. Monitor metrics (15 min)                                 │  │
│  │  3. Increment to 50%                                         │  │
│  │  4. Monitor metrics (15 min)                                 │  │
│  │  5. Full rollout (100%) or rollback                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Pipeline Templates

**Location**: `pipelines/templates/`

| Template | Purpose |
|----------|---------|
| `docker-build-push.yml` | Build and push Docker images to ACR |
| `node-build.yml` | Build Node.js services |
| `terraform-init.yml` | Initialize Terraform state |
| `terraform-plan.yml` | Generate Terraform execution plan |
| `terraform-apply.yml` | Apply Terraform changes |
| `helm-deploy.yml` | Deploy Helm charts to AKS |
| `canary-deployment.yml` | Canary deployment strategy |
| `rollback-deployment.yml` | Rollback failed deployments |
| `health-check.yml` | Service health verification |
| `integration-tests.yml` | Run integration tests |
| `database-migration.yml` | Execute database migrations |
| `variables-common.yml` | Common variables across environments |
| `variables-dev.yml` | Development environment variables |
| `variables-test.yml` | Test environment variables |
| `variables-prod.yml` | Production environment variables |

---

## 8. Data Architecture

### 8.1 Database Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Data Layer                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  PostgreSQL 16 (Azure Database for PostgreSQL)             │    │
│  │                                                             │    │
│  │  Use Cases: Primary relational data                        │    │
│  │  ├── Users & authentication                                │    │
│  │  ├── Profiles & preferences                                │    │
│  │  ├── Matches & swipes                                      │    │
│  │  ├── Subscriptions & payments                              │    │
│  │  ├── Safety reports & blocks                               │    │
│  │  └── Analytics events                                      │    │
│  │                                                             │    │
│  │  Configuration:                                             │    │
│  │  ├── Version: 16                                           │    │
│  │  ├── SKU: General Purpose (prod), Burstable (dev/test)     │    │
│  │  ├── Storage: 128 GB (prod), 32 GB (dev/test)              │    │
│  │  ├── Backups: 30 days retention                            │    │
│  │  ├── High Availability: Enabled (zone-redundant)           │    │
│  │  └── SSL: Required                                         │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  MongoDB (Azure Cosmos DB - MongoDB API)                    │    │
│  │                                                             │    │
│  │  Use Cases: Document storage, semi-structured data         │    │
│  │  ├── Chat messages                                         │    │
│  │  ├── User activity logs                                    │    │
│  │  ├── Analytics events (raw)                                │    │
│  │  └── Notification queue                                    │    │
│  │                                                             │    │
│  │  Configuration:                                             │    │
│  │  ├── API: MongoDB 4.2                                      │    │
│  │  ├── Consistency: Session                                  │    │
│  │  ├── Throughput: Autoscale 1000-4000 RU/s                  │    │
│  │  ├── Geo-replication: Single region (prod: multi-region)   │    │
│  │  └── TTL: Enabled for auto-cleanup                         │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Redis 7 (Azure Cache for Redis)                            │    │
│  │                                                             │    │
│  │  Use Cases: Caching, sessions, real-time features          │    │
│  │  ├── User sessions                                         │    │
│  │  ├── API response cache                                    │    │
│  │  ├── Rate limiting counters                                │    │
│  │  ├── Real-time presence tracking                           │    │
│  │  └── Pub/Sub for WebSocket events                          │    │
│  │                                                             │    │
│  │  Configuration:                                             │    │
│  │  ├── Tier: Premium (prod), Standard (dev/test)             │    │
│  │  ├── Capacity: C2 (2.5 GB, prod)                           │    │
│  │  ├── Persistence: AOF + RDB                                │    │
│  │  ├── Clustering: Enabled (6 shards)                        │    │
│  │  └── Max Memory Policy: allkeys-lru                        │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Azure Blob Storage                                         │    │
│  │                                                             │    │
│  │  Use Cases: Media file storage                             │    │
│  │  ├── Profile photos                                        │    │
│  │  ├── Videos                                                │    │
│  │  ├── User-generated content                                │    │
│  │  └── Backup files                                          │    │
│  │                                                             │    │
│  │  Configuration:                                             │    │
│  │  ├── Tier: Hot (frequently accessed)                       │    │
│  │  ├── Replication: GRS (geo-redundant)                      │    │
│  │  ├── Lifecycle: Move to Cool after 90 days                 │    │
│  │  └── CDN: Integrated with Azure CDN                        │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Azure Cognitive Search (Elasticsearch alternative)         │    │
│  │                                                             │    │
│  │  Use Cases: Full-text search                               │    │
│  │  ├── User discovery (by location, interests)               │    │
│  │  ├── Message search                                        │    │
│  │  ├── Profile search                                        │    │
│  │  └── Analytics aggregations                                │    │
│  │                                                             │    │
│  │  Configuration:                                             │    │
│  │  ├── Tier: Standard S1                                     │    │
│  │  ├── Replicas: 2                                           │    │
│  │  └── Partitions: 1                                         │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 Key Database Tables (PostgreSQL)

```sql
-- Core User Tables
users                   -- Authentication, email, phone
profiles                -- Bio, location, preferences, settings
photos                  -- Profile photos metadata
prompts_answers         -- Hinge-style prompts/answers

-- Matching System
swipes                  -- Like/pass history
matches                 -- Confirmed matches
conversations           -- Chat conversations
compatibility_scores    -- AI-calculated compatibility

-- Monetization
subscriptions           -- Premium plans
subscription_plans      -- Plan definitions
payments                -- Payment transactions
coins                   -- Virtual currency balance
boosts                  -- Profile visibility boosts
super_likes             -- Super like purchases

-- Safety & Moderation
safety_reports          -- User reports
blocks                  -- Blocked users
moderations             -- Content moderation logs

-- Gamification
achievements            -- User achievements
rewards                 -- Earned rewards
badges                  -- User badges

-- Analytics
analytics_events        -- Event tracking
user_activity           -- Activity logs
```

---

## 9. Security Architecture

### 9.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Security Architecture                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Layer 1: Edge Security                                             │
│  ├── Azure Front Door with WAF                                      │
│  ├── DDoS Protection Standard                                       │
│  ├── TLS 1.3 encryption                                             │
│  ├── Rate limiting (global)                                         │
│  └── Geo-filtering                                                  │
│                                                                     │
│  Layer 2: Network Security                                          │
│  ├── Virtual Network isolation                                      │
│  ├── Network Security Groups (NSGs)                                 │
│  ├── Private endpoints for Azure services                           │
│  ├── Service endpoints                                              │
│  └── Azure Firewall                                                 │
│                                                                     │
│  Layer 3: Application Security                                      │
│  ├── JWT authentication (RS256)                                     │
│  ├── OAuth2 / OpenID Connect                                        │
│  ├── RBAC (Role-Based Access Control)                               │
│  ├── API Gateway authentication middleware                          │
│  ├── Rate limiting per user/IP                                      │
│  ├── Input validation (Zod, class-validator)                        │
│  ├── XSS protection                                                 │
│  ├── CSRF protection                                                │
│  └── SQL injection prevention (parameterized queries)               │
│                                                                     │
│  Layer 4: Data Security                                             │
│  ├── Encryption at rest (AES-256)                                   │
│  ├── Encryption in transit (TLS 1.3)                                │
│  ├── Azure Key Vault for secrets                                    │
│  ├── Managed Identities for service auth                            │
│  ├── Database encryption (TDE)                                      │
│  ├── Password hashing (bcrypt, rounds=12)                           │
│  └── PII data masking in logs                                       │
│                                                                     │
│  Layer 5: Container Security                                        │
│  ├── Image scanning (Trivy, Snyk)                                   │
│  ├── Non-root containers                                            │
│  ├── Read-only file systems                                         │
│  ├── Security contexts (seccomp, AppArmor)                          │
│  ├── Pod Security Standards                                         │
│  └── Network policies                                               │
│                                                                     │
│  Layer 6: Monitoring & Compliance                                   │
│  ├── Azure Sentinel (SIEM)                                          │
│  ├── Security Center continuous assessment                          │
│  ├── Compliance dashboard (SOC 2, GDPR)                             │
│  ├── Audit logs                                                     │
│  ├── Threat detection                                               │
│  └── Incident response automation                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 Authentication Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    JWT Authentication Flow                    │
└──────────────────────────────────────────────────────────────┘

1. User Login
   Client ──▶ POST /api/auth/login ──▶ Auth Service
                  (email, password)

2. Validation
   Auth Service ──▶ PostgreSQL (verify user)
   Auth Service ──▶ bcrypt.compare(password, hash)

3. Token Generation
   Auth Service ──▶ Generate JWT (RS256)
      ├── Access Token (15 min expiry)
      ├── Refresh Token (7 day expiry)
      └── Payload: { userId, email, roles }

4. Response
   Auth Service ──▶ Client
      ├── accessToken (in response body)
      └── refreshToken (HTTP-only cookie)

5. Authenticated Requests
   Client ──▶ GET /api/user/profile
      └── Header: Authorization: Bearer <accessToken>

6. Token Validation (API Gateway)
   API Gateway ──▶ Verify signature (public key)
   API Gateway ──▶ Check expiry
   API Gateway ──▶ Forward to service (with user context)

7. Token Refresh
   Client ──▶ POST /api/auth/refresh
      └── Cookie: refreshToken
   Auth Service ──▶ Validate refresh token
   Auth Service ──▶ Issue new access token
```

---

## 10. Monitoring & Observability

### 10.1 Observability Stack

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Monitoring Architecture                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Metrics (Prometheus + Azure Monitor)                        │  │
│  │                                                               │  │
│  │  Collection:                                                  │  │
│  │  ├── Prometheus (in-cluster metrics)                         │  │
│  │  ├── Azure Monitor (infrastructure metrics)                  │  │
│  │  └── Application Insights (application metrics)              │  │
│  │                                                               │  │
│  │  Visualization:                                               │  │
│  │  ├── Grafana dashboards                                      │  │
│  │  └── Azure Monitor workbooks                                 │  │
│  │                                                               │  │
│  │  Key Metrics:                                                 │  │
│  │  ├── API response time (p50, p95, p99)                       │  │
│  │  ├── Error rates by service                                  │  │
│  │  ├── Request throughput (req/sec)                            │  │
│  │  ├── Database query performance                              │  │
│  │  ├── Cache hit/miss ratio                                    │  │
│  │  ├── WebSocket connection count                              │  │
│  │  ├── CPU/Memory utilization                                  │  │
│  │  └── Business metrics (matches, messages, conversions)       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Logs (Azure Log Analytics + ELK Stack)                      │  │
│  │                                                               │  │
│  │  Collection:                                                  │  │
│  │  ├── Application logs (stdout/stderr)                        │  │
│  │  ├── Container logs (Kubernetes)                             │  │
│  │  ├── Infrastructure logs (Azure diagnostics)                 │  │
│  │  └── Audit logs (Azure Activity Log)                         │  │
│  │                                                               │  │
│  │  Processing:                                                  │  │
│  │  ├── Log Analytics Workspace                                 │  │
│  │  ├── Kusto Query Language (KQL)                              │  │
│  │  └── Retention: 90 days (prod), 30 days (dev/test)           │  │
│  │                                                               │  │
│  │  Analysis:                                                    │  │
│  │  ├── Error tracking                                          │  │
│  │  ├── Audit trails                                            │  │
│  │  ├── Security events                                         │  │
│  │  └── Performance troubleshooting                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Traces (Application Insights)                                │  │
│  │                                                               │  │
│  │  Collection:                                                  │  │
│  │  ├── Distributed tracing                                     │  │
│  │  ├── Dependency tracking                                     │  │
│  │  ├── Request correlation                                     │  │
│  │  └── Custom events                                           │  │
│  │                                                               │  │
│  │  Features:                                                    │  │
│  │  ├── End-to-end transaction tracking                         │  │
│  │  ├── Service dependency map                                  │  │
│  │  ├── Performance profiling                                   │  │
│  │  └── Anomaly detection                                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Alerts (Azure Monitor Alerts + PagerDuty)                    │  │
│  │                                                               │  │
│  │  Alert Types:                                                 │  │
│  │  ├── Metric alerts (CPU > 80%, error rate > 1%)              │  │
│  │  ├── Log alerts (error spikes, security events)              │  │
│  │  ├── Availability alerts (endpoint down)                     │  │
│  │  └── Smart detection (anomalies)                             │  │
│  │                                                               │  │
│  │  Notification Channels:                                       │  │
│  │  ├── Email                                                    │  │
│  │  ├── Slack                                                    │  │
│  │  ├── PagerDuty (critical)                                    │  │
│  │  └── SMS (on-call)                                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 Grafana Dashboards

1. **System Overview Dashboard**
   - Cluster health (nodes, pods)
   - Resource utilization (CPU, memory, disk)
   - Network traffic
   - Active services status

2. **API Performance Dashboard**
   - Request rate by endpoint
   - Response time distribution
   - Error rate by service
   - Top slow queries

3. **Business Metrics Dashboard**
   - Active users (DAU, MAU)
   - Match rate
   - Message volume
   - Conversion funnel
   - Revenue metrics

4. **Database Dashboard**
   - Query performance
   - Connection pool usage
   - Replication lag
   - Storage utilization

---

## 11. Scalability & Performance

### 11.1 Horizontal Scaling Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Auto-Scaling Configuration                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  AKS Cluster Auto-Scaling:                                          │
│  ├── System Node Pool: Fixed 3 nodes                                │
│  └── User Node Pool: 2-10 nodes (auto-scale)                        │
│      ├── Scale up trigger: CPU > 70% for 5 min                      │
│      ├── Scale down trigger: CPU < 30% for 10 min                   │
│      └── Cool-down period: 5 minutes                                │
│                                                                     │
│  Pod Auto-Scaling (HPA):                                            │
│  ├── API Gateway: 3-10 replicas                                     │
│  │   ├── CPU threshold: 70%                                         │
│  │   └── Memory threshold: 80%                                      │
│  ├── Core Services: 2-8 replicas                                    │
│  │   ├── CPU threshold: 70%                                         │
│  │   └── Memory threshold: 80%                                      │
│  ├── AI Services: 2-4 replicas                                      │
│  │   ├── CPU threshold: 75%                                         │
│  │   └── Memory threshold: 85%                                      │
│  └── Workers: 2-6 replicas                                          │
│      ├── Queue depth: > 100 messages                                │
│      └── Processing time: > 10s average                             │
│                                                                     │
│  Database Scaling:                                                  │
│  ├── PostgreSQL:                                                    │
│  │   ├── Vertical scaling (compute tier upgrade)                   │
│  │   └── Read replicas (up to 5)                                   │
│  ├── Cosmos DB:                                                     │
│  │   └── Autoscale RU/s: 1000-10000                                │
│  └── Redis:                                                         │
│      └── Clustering with 6 shards                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.2 Caching Strategy

```
┌──────────────────────────────────────────────────────────────┐
│                     Caching Layers                            │
└──────────────────────────────────────────────────────────────┘

Level 1: CDN/Edge Caching (Azure Front Door)
├── Static assets (images, CSS, JS)
├── Cache TTL: 7 days
└── Geo-distributed

Level 2: API Gateway Cache
├── GET responses (user profiles, match lists)
├── Cache TTL: 5 minutes
└── Cache invalidation on data change

Level 3: Application Cache (Redis)
├── User sessions (TTL: 7 days)
├── User profiles (TTL: 1 hour)
├── Match recommendations (TTL: 15 minutes)
├── API responses (TTL: 5 minutes)
└── Rate limiting counters (TTL: 15 minutes)

Level 4: Database Query Cache
├── PostgreSQL query results
├── Cosmos DB caching
└── Cache invalidation on write
```

### 11.3 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| **API Response Time** | < 200ms (p95) | 150ms |
| **Page Load Time** | < 2s (first contentful paint) | 1.5s |
| **WebSocket Latency** | < 100ms | 75ms |
| **Database Query** | < 50ms (p95) | 30ms |
| **Cache Hit Rate** | > 80% | 85% |
| **Concurrent Users** | 100,000+ | Tested to 150,000 |
| **Requests per Second** | 10,000+ | Tested to 12,000 |
| **Match Generation** | < 500ms | 350ms |

---

## 12. Disaster Recovery

### 12.1 Backup Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Backup Strategy                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PostgreSQL:                                                         │
│  ├── Automated daily backups (7 AM UTC)                             │
│  ├── Point-in-time restore (PITR) - last 30 days                    │
│  ├── Retention: 30 days                                             │
│  ├── Geo-redundant backup storage                                   │
│  └── Manual backup before major changes                             │
│                                                                     │
│  Cosmos DB (MongoDB):                                                │
│  ├── Continuous backup (automatic)                                  │
│  ├── Point-in-time restore - last 30 days                           │
│  ├── Retention: 30 days                                             │
│  └── Geo-redundancy enabled                                         │
│                                                                     │
│  Azure Blob Storage:                                                 │
│  ├── Soft delete: 7 days                                            │
│  ├── Versioning: Enabled                                            │
│  ├── Replication: GRS (geo-redundant)                               │
│  └── Lifecycle policy: Archive after 1 year                         │
│                                                                     │
│  Redis:                                                              │
│  ├── RDB snapshots: Every 6 hours                                   │
│  ├── AOF (Append-Only File): Every second                           │
│  ├── Retention: 7 days                                              │
│  └── Geo-replication to secondary region                            │
│                                                                     │
│  Azure Key Vault:                                                    │
│  ├── Soft delete: 90 days                                           │
│  ├── Purge protection: Enabled                                      │
│  └── Automatic backup (Azure managed)                               │
│                                                                     │
│  Kubernetes Configurations:                                          │
│  ├── GitOps: All configs in Git (source of truth)                   │
│  ├── Helm chart backups                                             │
│  └── Azure DevOps pipeline definitions                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 12.2 Recovery Objectives

```
┌──────────────────────────────────────────────────────────────┐
│                Recovery Time & Point Objectives               │
└──────────────────────────────────────────────────────────────┘

Service Tier: Production

RTO (Recovery Time Objective):
├── Tier 1 (Critical): < 1 hour
│   ├── Auth Service
│   ├── API Gateway
│   └── Messaging Service
│
├── Tier 2 (Important): < 4 hours
│   ├── User Service
│   ├── Matching Service
│   └── Payment Service
│
└── Tier 3 (Standard): < 24 hours
    ├── Analytics Service
    ├── Moderation Service
    └── Advertising Service

RPO (Recovery Point Objective):
├── Database: < 1 hour (PITR)
├── Blob Storage: < 5 minutes (GRS)
├── Redis: < 1 hour (RDB + AOF)
└── Configurations: 0 (Git-based)

Availability SLA:
├── Target: 99.9% (43.2 min downtime/month)
├── Current: 99.95%
└── Monitoring: Azure Service Health
```

### 12.3 Disaster Recovery Procedures

1. **Database Failure**
   - Automatic failover to read replica
   - Point-in-time restore if needed
   - Verify data integrity
   - Update connection strings if needed

2. **AKS Cluster Failure**
   - Spin up cluster in secondary region (if multi-region)
   - Apply Terraform configs
   - Deploy services via pipeline
   - Update DNS to point to new cluster

3. **Region Outage**
   - Failover to secondary Azure region
   - Restore databases from geo-redundant backups
   - Deploy infrastructure via Terraform
   - Update DNS and Front Door routing

4. **Data Corruption**
   - Identify corruption scope
   - Restore from point-in-time backup
   - Replay transactions if needed
   - Validate data integrity

---

## Appendix

### A. Technology Stack Summary

| Category | Technologies |
|----------|--------------|
| **Frontend** | React 18, React Native 0.73, TypeScript, Vite, Tailwind CSS |
| **Backend** | Node.js 20, NestJS, Express.js, TypeScript, Socket.io |
| **AI/ML** | Python 3.11, TensorFlow, PyTorch, spaCy, OpenAI GPT |
| **Databases** | PostgreSQL 16, MongoDB (Cosmos DB), Redis 7, Azure Cognitive Search |
| **Infrastructure** | Azure, Terraform, Kubernetes (AKS), Helm |
| **CI/CD** | Azure DevOps, GitHub Actions, Docker |
| **Monitoring** | Prometheus, Grafana, Application Insights, Log Analytics |
| **Security** | Azure Key Vault, Azure Front Door WAF, TLS 1.3, JWT |
| **External Services** | Stripe, SendGrid, Twilio, Agora, Azure AI Services |

### B. Key Azure Resources

```
Production Environment Resources:

Resource Group: rg-flamoral-prod-eastus
├── AKS: aks-flamoral-prod
├── ACR: acrflamoralprod
├── PostgreSQL: psql-flamoral-prod
├── Cosmos DB: cosmos-flamoral-prod
├── Redis: redis-flamoral-prod
├── Storage: stflamoralprod
├── Key Vault: kv-flamoral-prod
├── Log Analytics: law-flamoral-prod
├── Application Insights: appi-flamoral-prod
├── Front Door: fd-flamoral-prod
└── Virtual Network: vnet-flamoral-prod
```

### C. Port Mapping

| Service | Internal Port | External Port (via Ingress) |
|---------|--------------|---------------------------|
| API Gateway | 4000 | 443 (api.flamoral.com) |
| Auth Service | 3001 | Internal only |
| User Service | 3002 | Internal only |
| Matching Service | 3003 | Internal only |
| Messaging Service | 3004 | Internal only |
| Media Service | 3006 | Internal only |
| Payment Service | 3007 | Internal only |
| Notification Service | 3008 | Internal only |
| Analytics Service | 3009 | Internal only |
| Moderation Service | 3010 | Internal only |
| Advertising Service | 3011 | Internal only |
| Realtime Service | 3012 | 443 (/ws path) |
| Web App | 5173 (dev) | 443 (flamoral.com) |

### D. Environment URLs

| Environment | Web App | API |
|-------------|---------|-----|
| **Development** | http://localhost:5173 | http://localhost:4000 |
| **Test** | https://test.flamoral.com | https://api-test.flamoral.com |
| **Production** | https://flamoral.com | https://api.flamoral.com |

---

## Document Metadata

| Field | Value |
|-------|-------|
| **Document Title** | Flamoral Platform - Complete Architecture Overview |
| **Version** | 3.0 |
| **Last Updated** | December 8, 2024 |
| **Author** | Flamoral Platform Team |
| **Status** | Production Ready |
| **Next Review** | March 2025 |

---

**For Questions or Updates**: Contact the platform team or refer to individual service documentation in their respective directories.
