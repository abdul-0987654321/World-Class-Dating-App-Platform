# Flamoral Platform - System Architecture

**Version:** 2.0.0
**Last Updated:** 2026-01-03
**Infrastructure:** AWS-Only (Terraform-Managed)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Diagram](#architecture-diagram)
4. [Microservices Architecture](#microservices-architecture)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [AWS Services](#aws-services)
7. [Infrastructure Modules](#infrastructure-modules)
8. [Service Communication](#service-communication)
9. [Security Architecture](#security-architecture)
10. [Scalability & Performance](#scalability--performance)

---

## Executive Summary

Flamoral is a production-grade microservices-based dating platform deployed exclusively on AWS infrastructure. The platform comprises 14+ backend services, web and mobile frontends, with full observability, CI/CD automation, and compliance controls.

**Key Metrics:**
- 14+ microservices
- 200+ API endpoints
- 99.9% uptime SLA target
- Sub-100ms API response times
- Millions of concurrent users supported

**Technology Stack:**
- **Backend:** Node.js/TypeScript, Python 3.11
- **Frontend:** React 18, React Native 0.73
- **Databases:** Aurora PostgreSQL 15, ElastiCache Redis 7, DocumentDB
- **Infrastructure:** AWS EKS, Terraform, Helm, Docker
- **CI/CD:** GitHub Actions, AWS CodePipeline

---

## System Overview

```
+-----------------------------------------------------------------------------------+
|                                    INTERNET                                        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                              AWS CLOUDFRONT (CDN + WAF)                            |
|  - Global edge locations                                                           |
|  - DDoS protection                                                                 |
|  - Web Application Firewall                                                        |
|  - SSL/TLS termination                                                             |
+-----------------------------------------------------------------------------------+
                                         |
              +--------------------+-----+-----+--------------------+
              |                    |           |                    |
              v                    v           v                    v
+-------------+-------+   +-------+-------+   +-------+-------+   +-------+--------+
|   Web Application   |   |  Mobile App   |   | Mobile App    |   |  Admin Panel   |
|   (React 18)        |   |  (iOS)        |   | (Android)     |   |  (React)       |
|   flamoral.com      |   |  React Native |   | React Native  |   |  admin.flam... |
+---------------------+   +---------------+   +---------------+   +----------------+
              |                    |           |                    |
              +--------------------+-----+-----+--------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                              AWS APPLICATION LOAD BALANCER                         |
|  - Layer 7 load balancing                                                          |
|  - Health checks                                                                   |
|  - Path-based routing                                                              |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                              AMAZON EKS CLUSTER                                    |
|  Namespace: flamoral-prod                                                          |
|                                                                                    |
|  +-------------+  +-------------+  +-------------+  +-------------+               |
|  | API Gateway |  | Auth Service|  | User Service|  | Matching    |               |
|  | Port: 4000  |  | Port: 3001  |  | Port: 3002  |  | Port: 3003  |               |
|  +-------------+  +-------------+  +-------------+  +-------------+               |
|                                                                                    |
|  +-------------+  +-------------+  +-------------+  +-------------+               |
|  | Messaging   |  | Payment     |  | Notification|  | Media       |               |
|  | Port: 5000  |  | Port: 3005  |  | Port: 3008  |  | Port: 3009  |               |
|  +-------------+  +-------------+  +-------------+  +-------------+               |
|                                                                                    |
|  +-------------+  +-------------+  +-------------+  +-------------+               |
|  | Admin       |  | Advertising |  | Moderation  |  | Analytics   |               |
|  | Port: 3010  |  | Port: 3011  |  | Port: 3012  |  | Port: 3007  |               |
|  +-------------+  +-------------+  +-------------+  +-------------+               |
|                                                                                    |
|  +-------------+  +-------------+  +-------------+                                |
|  | Automation  |  | Partnership |  | AI Services |                                |
|  | Port: 3013  |  | Port: 3014  |  | (Python)    |                                |
|  +-------------+  +-------------+  +-------------+                                |
+-----------------------------------------------------------------------------------+
                                         |
              +----------+---------------+---------------+----------+
              |          |               |               |          |
              v          v               v               v          v
+----------+  +----------+  +------------+  +-----------+  +--------+
| Aurora   |  | Elasti-  |  | DocumentDB |  | S3        |  | SQS/   |
| Postgres |  | Cache    |  | (MongoDB)  |  | Buckets   |  | SNS    |
| (RDS)    |  | (Redis)  |  |            |  |           |  |        |
+----------+  +----------+  +------------+  +-----------+  +--------+
```

---

## Architecture Diagram

### High-Level Request Flow

```
User Request
     |
     v
+--------------------+
|    CloudFront      |  <-- CDN, WAF, DDoS Protection
+--------------------+
     |
     v
+--------------------+
|    Route 53        |  <-- DNS Resolution
+--------------------+
     |
     v
+--------------------+
|    ALB             |  <-- Load Balancing, SSL Termination
+--------------------+
     |
     v
+--------------------+
|    API Gateway     |  <-- Authentication, Rate Limiting, Routing
|    (Port 4000)     |
+--------------------+
     |
     +-------+-------+-------+-------+
     |       |       |       |       |
     v       v       v       v       v
+------+ +------+ +------+ +------+ +------+
| Auth | | User | |Match | | Msg  | |Media |
+------+ +------+ +------+ +------+ +------+
     |       |       |       |       |
     +-------+-------+-------+-------+
             |
             v
+--------------------+
|    Data Layer      |
| Aurora | Redis | S3|
+--------------------+
```

### Detailed Service Architecture

```
+-----------------------------------------------------------------------------------+
|                                  API GATEWAY                                       |
|  NestJS + Express | Port 4000                                                      |
|  - JWT validation                                                                  |
|  - Rate limiting (100 req/15min default)                                           |
|  - Request routing                                                                 |
|  - API versioning                                                                  |
+-----------------------------------------------------------------------------------+
         |                    |                    |                    |
         v                    v                    v                    v
+----------------+   +----------------+   +----------------+   +----------------+
| AUTH SERVICE   |   | USER SERVICE   |   | MATCHING SVC   |   | MESSAGING SVC  |
| Port: 3001     |   | Port: 3002     |   | Port: 3003     |   | Port: 5000     |
|                |   |                |   |                |   |                |
| - Registration |   | - Profiles     |   | - Discovery    |   | - Real-time    |
| - Login/Logout |   | - Photos       |   | - Swipes       |   | - WebSocket    |
| - OAuth 2.0    |   | - Settings     |   | - Matches      |   | - Voice/Video  |
| - JWT tokens   |   | - Verification |   | - Super Likes  |   | - Media msgs   |
| - MFA          |   | - Gamification |   | - Boosts       |   | - Reactions    |
| - Password     |   | - Safety       |   | - Speed Dating |   | - Typing       |
+----------------+   +----------------+   +----------------+   +----------------+
         |                    |                    |                    |
         +--------------------+--------------------+--------------------+
                              |
         +--------------------+--------------------+--------------------+
         |                    |                    |                    |
         v                    v                    v                    v
+----------------+   +----------------+   +----------------+   +----------------+
| PAYMENT SVC    |   | NOTIFY SVC     |   | MEDIA SVC      |   | ADMIN SVC      |
| Port: 3005     |   | Port: 3008     |   | Port: 3009     |   | Port: 3010     |
|                |   |                |   |                |   |                |
| - Stripe       |   | - Push (SNS)   |   | - Upload       |   | - Dashboard    |
| - Subscriptions|   | - Email (SES)  |   | - Processing   |   | - User mgmt    |
| - Coins/Gems   |   | - SMS          |   | - CDN delivery |   | - Moderation   |
| - IAP          |   | - In-app       |   | - Verification |   | - Analytics    |
| - Refunds      |   | - Preferences  |   | - Video encode |   | - Reports      |
+----------------+   +----------------+   +----------------+   +----------------+
         |                    |                    |                    |
         +--------------------+--------------------+--------------------+
                              |
         +--------------------+--------------------+--------------------+
         |                    |                    |                    |
         v                    v                    v                    v
+----------------+   +----------------+   +----------------+   +----------------+
| ADVERTISING    |   | MODERATION     |   | ANALYTICS      |   | AUTOMATION     |
| Port: 3011     |   | Port: 3012     |   | Port: 3007     |   | Port: 3013     |
|                |   |                |   |                |   |                |
| - Campaigns    |   | - Content AI   |   | - Events       |   | - Workflows    |
| - Targeting    |   | - Deepfake     |   | - Dashboards   |   | - Scheduled    |
| - Creatives    |   | - Reports      |   | - Churn pred   |   | - Icebreakers  |
| - Revenue      |   | - CSAM detect  |   | - Segmentation |   | - Jobs         |
+----------------+   +----------------+   +----------------+   +----------------+
         |                    |
         v                    v
+----------------+   +----------------+
| PARTNERSHIP    |   | AI SERVICES    |
| Port: 3014     |   | Python         |
|                |   |                |
| - Restaurants  |   | - Deepfake     |
| - Events       |   | - ML Recs      |
| - Date plans   |   | - Face embed   |
| - Affiliates   |   | - Moderation   |
+----------------+   +----------------+
```

---

## Microservices Architecture

### Service Inventory

| Service | Port | Technology | Database | Queue | Purpose |
|---------|------|------------|----------|-------|---------|
| API Gateway | 4000 | NestJS | - | - | Request routing, auth |
| Auth Service | 3001 | Express | PostgreSQL | - | Authentication |
| User Service | 3002 | Express | PostgreSQL | SQS | User management |
| Matching Service | 3003 | Express + Bull | PostgreSQL, Redis | SQS | Discovery, matching |
| Messaging Service | 5000 | Express + Socket.io | PostgreSQL, DocumentDB | SQS | Real-time chat |
| Payment Service | 3005 | Express | PostgreSQL | SQS | Payments |
| Notification Service | 3008 | Express | PostgreSQL | SQS | Notifications |
| Media Service | 3009 | Express + Sharp | PostgreSQL, S3 | SQS | Media processing |
| Admin Service | 3010 | Express | PostgreSQL | - | Administration |
| Advertising Service | 3011 | Express | PostgreSQL | SQS | Ad management |
| Moderation Service | 3012 | Express | PostgreSQL | SQS | Content moderation |
| Analytics Service | 3007 | Express | PostgreSQL, ES | SQS | Analytics |
| Automation Service | 3013 | NestJS + Bull | PostgreSQL, Redis | SQS | Automation |
| Partnership Service | 3014 | Express | PostgreSQL | - | Partnerships |

### Service Dependencies

```
                    +------------------+
                    |   API Gateway    |
                    +--------+---------+
                             |
         +-------------------+-------------------+
         |         |         |         |         |
         v         v         v         v         v
    +--------+ +--------+ +--------+ +--------+ +--------+
    |  Auth  | |  User  | | Match  | |  Msg   | | Media  |
    +--------+ +--------+ +--------+ +--------+ +--------+
         |         |         |         |         |
         |         +----+----+         |         |
         |              |              |         |
         v              v              v         v
    +--------+     +--------+     +--------+ +--------+
    | Payment|     | Notify |     |Analytics| | Admin  |
    +--------+     +--------+     +--------+ +--------+
```

---

## Data Flow Diagrams

### User Registration Flow

```
User                   API Gateway          Auth Service         User Service         SQS              Notification
  |                        |                     |                    |                |                    |
  |---Register Request---->|                     |                    |                |                    |
  |                        |---Validate--------->|                    |                |                    |
  |                        |                     |---Create User----->|                |                    |
  |                        |                     |                    |---Save DB----->|                    |
  |                        |                     |                    |<--Confirm------|                    |
  |                        |                     |<---User Created----|                |                    |
  |                        |                     |                    |                |                    |
  |                        |                     |---Publish Event--->|                |                    |
  |                        |                     |                    |                |---Send Welcome---->|
  |                        |<---JWT Tokens-------|                    |                |                    |
  |<---Success + Tokens----|                     |                    |                |                    |
```

### Matching Flow

```
User A                  API Gateway         Matching Service           Redis              SQS           User B
  |                         |                     |                      |                 |               |
  |---Like User B---------->|                     |                      |                 |               |
  |                         |---Process Swipe---->|                      |                 |               |
  |                         |                     |---Check Cache------->|                 |               |
  |                         |                     |<---User B Liked A----|                 |               |
  |                         |                     |                      |                 |               |
  |                         |                     |---Create Match------>|                 |               |
  |                         |                     |                      |                 |               |
  |                         |                     |---Publish Event----->|                 |               |
  |                         |                     |                      |                 |---Notify A--->|
  |                         |                     |                      |                 |---Notify B--->|
  |                         |<---Match Created----|                      |                 |               |
  |<---Match Notification---|                     |                      |                 |               |
```

### Real-Time Messaging Flow

```
User A              WebSocket Gateway         Messaging Service         DocumentDB          Redis          User B
  |                       |                         |                       |                 |               |
  |---Connect WS--------->|                         |                       |                 |               |
  |                       |---Authenticate--------->|                       |                 |               |
  |                       |<---Session Created------|                       |                 |               |
  |                       |                         |---Subscribe----------->|                 |               |
  |                       |                         |                       |                 |               |
  |---Send Message------->|                         |                       |                 |               |
  |                       |---Process Message------>|                       |                 |               |
  |                       |                         |---Store-------------->|                 |               |
  |                       |                         |---Publish------------>|                 |               |
  |                       |                         |                       |                 |---Deliver---->|
  |<---Delivery Confirm---|                         |                       |                 |               |
```

---

## AWS Services

### Compute & Container Services

| Service | Resource | Purpose |
|---------|----------|---------|
| **Amazon EKS** | `flamoral-{env}-eks` | Kubernetes cluster management |
| **EC2 (via EKS)** | Node groups | Container hosting |
| **Amazon ECR** | `flamoral-{service}` | Docker image registry |

### Database Services

| Service | Resource | Purpose |
|---------|----------|---------|
| **Amazon RDS (Aurora)** | `flamoral-{env}-aurora` | PostgreSQL database |
| | | - Serverless v2 (0.5-16 ACU) |
| | | - Multi-AZ deployment |
| | | - Automated backups |
| **Amazon ElastiCache** | `flamoral-{env}-redis` | Redis cluster |
| | | - 2+ node cluster |
| | | - Automatic failover |
| **Amazon DocumentDB** | `flamoral-{env}-docdb` | MongoDB-compatible store |

### Storage Services

| Service | Resource | Purpose |
|---------|----------|---------|
| **Amazon S3** | `flamoral-{env}-media` | User photos, videos |
| | `flamoral-{env}-backups` | Database backups |
| | `flamoral-{env}-logs` | Application logs |
| **AWS KMS** | `flamoral-{env}-eks-kms` | Encryption keys |

### Networking & Content Delivery

| Service | Resource | Purpose |
|---------|----------|---------|
| **Amazon VPC** | `flamoral-{env}-vpc` | Network isolation |
| **Amazon CloudFront** | `flamoral-{env}` | CDN, WAF |
| **Amazon Route 53** | `flamoral.com` | DNS management |
| **AWS ACM** | `*.flamoral.com` | SSL/TLS certificates |

### Messaging & Integration

| Service | Resource | Purpose |
|---------|----------|---------|
| **Amazon SQS** | Various queues | Async processing |
| | `flamoral-{env}-matching` | Match processing |
| | `flamoral-{env}-notification` | Push notifications |
| | `flamoral-{env}-media-processing` | Media jobs |
| | `flamoral-{env}-email` | Email delivery |
| **Amazon SNS** | Various topics | Pub/sub messaging |
| | `flamoral-{env}-user-events` | User lifecycle |
| | `flamoral-{env}-match-events` | Match events |
| **Amazon SES** | `flamoral.com` | Transactional email |

### Security & Identity

| Service | Resource | Purpose |
|---------|----------|---------|
| **AWS Cognito** | `flamoral-{env}` | User pool management |
| **AWS Secrets Manager** | Various secrets | Credential storage |
| **AWS IAM** | Various roles | Access control |

### Monitoring & Observability

| Service | Resource | Purpose |
|---------|----------|---------|
| **Amazon CloudWatch** | Log groups | Centralized logging |
| | Dashboards | Operational visibility |
| | Alarms | Automated alerting |
| **AWS X-Ray** | Traces | Distributed tracing |

### CI/CD & Automation

| Service | Resource | Purpose |
|---------|----------|---------|
| **AWS CodePipeline** | `flamoral-{env}-pipeline` | Deployment pipeline |
| **AWS CodeBuild** | Build projects | Container builds |
| **Amazon EventBridge** | Scheduled rules | Nightly builds |

---

## Infrastructure Modules

### Terraform Module Structure

```
infrastructure/terraform/
+-- environments/
|   +-- dev/
|   |   +-- main.tf
|   |   +-- variables.tf
|   +-- staging/
|   |   +-- main.tf
|   |   +-- variables.tf
|   +-- prod/
|       +-- main.tf
|       +-- variables.tf
|       +-- outputs.tf
+-- modules/
    +-- networking/        # VPC, subnets, NAT, endpoints
    +-- eks/               # EKS cluster, node groups
    +-- rds/               # Aurora PostgreSQL
    +-- elasticache/       # Redis cluster
    +-- s3/                # S3 buckets
    +-- cognito/           # User pools
    +-- ecr/               # Container registry
    +-- secrets/           # Secrets Manager
    +-- messaging/         # SQS, SNS
    +-- monitoring/        # CloudWatch, X-Ray
    +-- route53/           # DNS
    +-- acm/               # Certificates
    +-- cloudfront/        # CDN, WAF
    +-- ses/               # Email
    +-- budgets/           # Cost alerts
    +-- cicd/              # CodePipeline
```

### Module Descriptions

| Module | Resources Created | Key Variables |
|--------|-------------------|---------------|
| **networking** | VPC, subnets (public/private/db), NAT Gateway, VPC endpoints, flow logs | `vpc_cidr`, `availability_zones` |
| **eks** | EKS cluster, managed node groups, OIDC provider, add-ons | `cluster_version`, `node_groups` |
| **rds** | Aurora cluster, instances, parameter groups, security groups | `engine_version`, `serverless_min/max_capacity` |
| **elasticache** | Redis replication group, subnet group, security group | `node_type`, `num_cache_clusters` |
| **s3** | S3 buckets, encryption, lifecycle rules, policies | `buckets`, `versioning_enabled` |
| **cognito** | User pool, identity pool, clients | `mfa_configuration`, `password_policy` |
| **ecr** | ECR repositories, lifecycle policies | `repositories`, `scan_on_push` |
| **secrets** | Secrets Manager secrets, IAM roles | `secrets`, `rotation_days` |
| **messaging** | SQS queues, SNS topics, subscriptions, DLQ | `queues`, `topics` |
| **monitoring** | CloudWatch log groups, dashboards, alarms | `log_retention_days`, `alarm_actions` |
| **route53** | Hosted zones, DNS records, health checks | `domain_name`, `create_www_record` |
| **acm** | SSL certificates, DNS validation | `domain_name`, `subject_alternative_names` |
| **cloudfront** | Distributions, origin access, WAF rules | `domain_names`, `price_class` |
| **ses** | Domain identity, DKIM, DMARC | `domain`, `mail_from_subdomain` |
| **budgets** | Budget alerts, cost thresholds | `monthly_budget_amount` |
| **cicd** | CodePipeline, CodeBuild, EventBridge | `github_repository`, `enable_nightly_build` |

---

## Service Communication

### Communication Patterns

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **Synchronous HTTP** | Real-time queries | REST APIs via API Gateway |
| **Asynchronous Messaging** | Background processing | SQS queues |
| **Pub/Sub** | Event broadcasting | SNS topics + SQS subscriptions |
| **WebSocket** | Real-time updates | Socket.io via Messaging Service |

### Internal Service Authentication

```
Service A                  Service B
    |                          |
    |---Request + Service Key->|
    |                          |---Validate Key
    |                          |<--Key Valid
    |<---Response--------------|
```

**Service Key Headers:**
- `X-Service-Key`: Internal service authentication
- `X-Request-ID`: Distributed tracing correlation

### Event-Driven Architecture

```
+------------------+
|   User Service   |---[user:created]---+
+------------------+                     |
                                         v
                                  +-------------+
                                  |  SNS Topic  |
                                  | user-events |
                                  +------+------+
                                         |
              +-----------------+--------+--------+-----------------+
              |                 |                 |                 |
              v                 v                 v                 v
    +------------------+ +------------------+ +------------------+ +------------------+
    | Notification SQS | | Analytics SQS    | | Matching SQS     | | Email SQS        |
    +------------------+ +------------------+ +------------------+ +------------------+
              |                 |                 |                 |
              v                 v                 v                 v
    +------------------+ +------------------+ +------------------+ +------------------+
    | Notify Service   | | Analytics Svc    | | Matching Service | | Email Worker     |
    +------------------+ +------------------+ +------------------+ +------------------+
```

---

## Security Architecture

### Authentication Flow

```
Client              CloudFront           API Gateway          Auth Service          Cognito
   |                    |                     |                     |                   |
   |---Login Request--->|                     |                     |                   |
   |                    |---Forward---------->|                     |                   |
   |                    |                     |---Authenticate----->|                   |
   |                    |                     |                     |---Validate------->|
   |                    |                     |                     |<--User Data-------|
   |                    |                     |<---JWT Tokens-------|                   |
   |                    |<---Set Cookies------|                     |                   |
   |<---Tokens----------|                     |                     |                   |
```

### Authorization Layers

```
+------------------+
|   CloudFront     |  Layer 1: WAF, Rate Limiting, Geo-blocking
+------------------+
         |
+------------------+
|   API Gateway    |  Layer 2: JWT Validation, RBAC
+------------------+
         |
+------------------+
|   Microservice   |  Layer 3: Business Logic Authorization
+------------------+
         |
+------------------+
|   Database       |  Layer 4: Row-Level Security (PostgreSQL)
+------------------+
```

### Encryption

| Layer | Method | Key Management |
|-------|--------|----------------|
| **In Transit** | TLS 1.3 | ACM certificates |
| **At Rest (S3)** | AES-256 | KMS customer-managed |
| **At Rest (RDS)** | AES-256 | KMS customer-managed |
| **At Rest (ElastiCache)** | AES-256 | KMS customer-managed |
| **Secrets** | AES-256 | Secrets Manager |

---

## Scalability & Performance

### Auto-Scaling Configuration

| Component | Min | Max | Scale Metric |
|-----------|-----|-----|--------------|
| EKS Nodes (System) | 2 | 4 | CPU 70% |
| EKS Nodes (App) | 0 | 10 | CPU 70% |
| EKS Nodes (Spot) | 0 | 10 | CPU 70% |
| API Gateway Pods | 3 | 20 | CPU 70% |
| Messaging Pods | 3 | 20 | CPU 60% |
| Aurora (Serverless) | 0.5 ACU | 16 ACU | Load |

### Performance Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API P50 Latency | < 50ms | > 100ms |
| API P99 Latency | < 200ms | > 500ms |
| WebSocket Latency | < 100ms | > 250ms |
| Error Rate | < 0.1% | > 1% |
| Availability | 99.9% | < 99.5% |

### Caching Strategy

```
+----------+     +----------+     +----------+     +----------+
|  Client  |---->| CloudFront|---->| Redis    |---->| Database |
|          |     | (Edge)   |     | (Cache)  |     | (Source) |
+----------+     +----------+     +----------+     +----------+
   TTL: 60s         TTL: 300s       TTL: 3600s       Persistent
```

| Cache Layer | TTL | Data Types |
|-------------|-----|------------|
| CloudFront | 60s | Static assets, API responses |
| Redis | 5m-1h | Session data, discovery candidates |
| Application | 1m | Hot data, rate limits |

---

## Disaster Recovery

### Backup Strategy

| Resource | Frequency | Retention | Location |
|----------|-----------|-----------|----------|
| Aurora Snapshots | Daily | 14 days | Same region |
| S3 Media | Continuous | Versioned | Cross-region replication |
| Secrets | On change | 30 days | Same region |
| EKS Config | On change | Git | GitHub |

### Recovery Objectives

| Metric | Target |
|--------|--------|
| RTO (Recovery Time Objective) | < 1 hour |
| RPO (Recovery Point Objective) | < 15 minutes |

### Multi-Region Strategy

```
Primary: us-east-1                    DR: us-west-2
+------------------+                  +------------------+
|   EKS Cluster    |                  |   EKS Cluster    |
|   Aurora Primary |---Replication--->|   Aurora Replica |
|   S3 Buckets     |---Replication--->|   S3 Buckets     |
+------------------+                  +------------------+
```

---

*Document maintained by the Platform Engineering team.*
*For questions, contact: platform@flamoral.com*
