# Architecture Overview - Flamoral Platform

Comprehensive system architecture documentation for the Flamoral dating platform.

**Last Updated:** 2025-12-18
**Status:** Production Ready

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Technology Stack](#technology-stack)
4. [Microservices](#microservices)
5. [Data Layer](#data-layer)
6. [External Integrations](#external-integrations)
7. [Deployment Architecture](#deployment-architecture)
8. [Scalability & Performance](#scalability--performance)

---

## System Overview

Flamoral is a world-class dating platform built with a modern, scalable microservices architecture featuring:

- **18 Microservices** - Independent, scalable backend services
- **Multi-client Support** - Web (React), iOS, Android
- **Real-time Communication** - WebSocket for messaging and notifications
- **Cloud-native** - Azure infrastructure with containerized deployment
- **API Gateway Pattern** - Centralized routing and security

### Key Characteristics

- **Microservices Architecture**: Services communicate via REST APIs and message queues
- **Event-Driven**: RabbitMQ for asynchronous communication
- **Polyglot Persistence**: PostgreSQL, MongoDB, Redis for different data needs
- **Containerized**: Docker containers orchestrated with Kubernetes/Azure Container Apps
- **Zero-downtime Deployment**: Blue-green deployments with health checks
- **Horizontally Scalable**: Stateless services that scale independently

---

## Architecture Diagram

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            CLIENTS                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Web Browser │  │ Mobile (iOS) │  │Mobile(Android)│             │
│  │   (React)    │  │ (React Native)│ │(React Native) │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
└─────────┼─────────────────┼──────────────────┼───────────────────────┘
          │                 │                  │
          │         HTTPS / TLS 1.3           │
          ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   AZURE FRONT DOOR (CDN + WAF)                       │
│  • Global load balancing                                            │
│  • DDoS protection                                                  │
│  • Web Application Firewall                                         │
│  • SSL/TLS termination                                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼─────┐    ┌──────▼──────┐    ┌──────▼──────┐
    │   Web     │    │ API Gateway │    │  WebSocket  │
    │  (Static) │    │ (Port 3000) │    │ (Port 5000) │
    │  (NGINX)  │    │             │    │(Socket.io)  │
    └───────────┘    └──────┬──────┘    └──────┬──────┘
                            │                  │
          ┌─────────────────┴──────────────────┴─────────────────┐
          │              MICROSERVICES LAYER                      │
          │                                                       │
          │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
          │  │   Auth   │  │   User   │  │ Matching │          │
          │  │ Service  │  │ Service  │  │ Service  │          │
          │  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
          │       │             │             │                  │
          │  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐          │
          │  │Messaging │  │  Media   │  │  Notif   │          │
          │  │ Service  │  │ Service  │  │ Service  │          │
          │  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
          │       │             │             │                  │
          │  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐          │
          │  │ Payment  │  │Analytics │  │   Admin  │          │
          │  │ Service  │  │ Service  │  │ Service  │          │
          │  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
          │       │             │             │                  │
          │  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐          │
          │  │Moderation│  │Automation│  │Realtime  │          │
          │  │ Service  │  │ Service  │  │ Service  │          │
          │  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
          │       │             │             │                  │
          │  ┌────▼─────────────▼─────────────▼─────┐          │
          │  │         AI Services (5 Services)      │          │
          │  │  • Dating Coach  • NLP                │          │
          │  │  • Photo Analysis • Recommendation    │          │
          │  │  • Fraud Detection                    │          │
          │  └───────────────────────────────────────┘          │
          └───────────────────┬───────────────────────────────────┘
                             │
          ┌─────────────────┴─────────────────┐
          │         DATA & MESSAGING           │
          │                                    │
          │  ┌──────────────┐ ┌──────────────┐│
          │  │  PostgreSQL  │ │   MongoDB    ││
          │  │ (Relational) │ │  (Document)  ││
          │  │              │ │              ││
          │  │ • Users      │ │ • Messages   ││
          │  │ • Profiles   │ │ • Analytics  ││
          │  │ • Matches    │ │ • Logs       ││
          │  │ • Payments   │ │ • Events     ││
          │  └──────────────┘ └──────────────┘│
          │                                    │
          │  ┌──────────────┐ ┌──────────────┐│
          │  │    Redis     │ │  RabbitMQ    ││
          │  │   (Cache)    │ │   (Queue)    ││
          │  │              │ │              ││
          │  │ • Sessions   │ │ • Matching   ││
          │  │ • Cache      │ │ • Notifs     ││
          │  │ • Rate Limit │ │ • Analytics  ││
          │  └──────────────┘ └──────────────┘│
          └────────────────────────────────────┘
                             │
          ┌─────────────────┴─────────────────┐
          │      EXTERNAL SERVICES             │
          │                                    │
          │  ┌────────────┐  ┌────────────┐  │
          │  │   Azure    │  │   Stripe   │  │
          │  │  Storage   │  │  Payments  │  │
          │  │  Face API  │  │            │  │
          │  │ Moderator  │  │            │  │
          │  └────────────┘  └────────────┘  │
          │                                    │
          │  ┌────────────┐  ┌────────────┐  │
          │  │   Twilio   │  │ SendGrid   │  │
          │  │    SMS     │  │   Email    │  │
          │  └────────────┘  └────────────┘  │
          │                                    │
          │  ┌────────────┐  ┌────────────┐  │
          │  │   Agora    │  │   Sentry   │  │
          │  │Video/Voice │  │Error Track │  │
          │  └────────────┘  └────────────┘  │
          └────────────────────────────────────┘
                             │
          ┌─────────────────┴─────────────────┐
          │   MONITORING & OBSERVABILITY       │
          │                                    │
          │  ┌────────────────┐               │
          │  │ Azure Monitor  │               │
          │  │ App Insights   │               │
          │  │ Log Analytics  │               │
          │  └────────────────┘               │
          └────────────────────────────────────┘
```

---

## Technology Stack

### Frontend

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | Web UI framework | 18.x |
| **React Native** | Mobile apps (iOS/Android) | 0.72 |
| **TypeScript** | Type safety | 5.x |
| **Redux Toolkit** | State management | 2.x |
| **React Router** | Web navigation | 6.x |
| **React Navigation** | Mobile navigation | 6.x |
| **Socket.io Client** | Real-time communication | 4.x |
| **Axios** | HTTP client | 1.x |
| **React Query** | Server state management | 5.x |

### Backend

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime | 20.x LTS |
| **TypeScript** | Type safety | 5.x |
| **NestJS** | Framework (microservices) | 10.x |
| **Express** | Web framework | 4.x |
| **Socket.io** | WebSocket server | 4.x |
| **Passport** | Authentication | 0.7 |
| **TypeORM** | PostgreSQL ORM | 0.3 |
| **Mongoose** | MongoDB ODM | 8.x |
| **ioredis** | Redis client | 5.x |
| **amqplib** | RabbitMQ client | 0.10 |

### Databases & Storage

| Technology | Purpose | Use Cases |
|------------|---------|-----------|
| **PostgreSQL 16** | Primary database | Users, profiles, matches, payments |
| **MongoDB 7** | Document store | Messages, analytics, logs |
| **Redis 7** | Cache & session | Sessions, cache, rate limiting |
| **RabbitMQ 3.12** | Message queue | Async processing, events |
| **Azure Blob Storage** | Object storage | Photos, videos, files |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| **Azure Container Apps** | Microservices hosting |
| **Azure Front Door** | CDN, WAF, load balancing |
| **Azure Key Vault** | Secrets management |
| **Azure Monitor** | Logging and metrics |
| **Application Insights** | APM |
| **Azure Database for PostgreSQL** | Managed PostgreSQL |
| **Azure Cosmos DB** | Managed MongoDB |
| **Azure Cache for Redis** | Managed Redis |
| **Docker** | Containerization |
| **GitHub Actions** | CI/CD |

---

## Microservices

### Core Services

#### 1. API Gateway
**Port:** 3000
**Purpose:** Centralized entry point for all client requests
**Responsibilities:**
- Request routing to microservices
- JWT authentication
- Rate limiting
- CSRF protection
- Request/response logging
- Circuit breaking

#### 2. Auth Service
**Purpose:** Authentication and authorization
**Responsibilities:**
- User registration and login
- JWT token issuance and validation
- Password hashing (bcrypt)
- OAuth 2.0 (Google, Facebook, Apple)
- Two-factor authentication (TOTP, SMS)
- Biometric authentication (mobile)
- Session management

**Database:** PostgreSQL (users, sessions)

#### 3. User Service
**Purpose:** User profile management
**Responsibilities:**
- Profile CRUD operations
- Photo management
- Privacy settings
- Block/unblock users
- User preferences
- Achievements
- Account deletion (GDPR)

**Database:** PostgreSQL (profiles, photos)

#### 4. Matching Service
**Purpose:** User matching and discovery
**Responsibilities:**
- Swipe functionality (like, pass, super like)
- Match creation
- Recommendation algorithm
- Nearby users (geolocation)
- Profile boost
- Match expiration

**Database:** PostgreSQL (matches, swipes)
**Queue:** RabbitMQ (match notifications)

#### 5. Messaging Service
**Purpose:** Real-time messaging
**Responsibilities:**
- Send/receive messages
- End-to-end encryption (Signal Protocol)
- Conversation management
- Typing indicators
- Read receipts
- Message reactions
- Enhanced messaging (GIFs, voice notes, location)

**Database:** MongoDB (messages)
**Real-time:** Socket.io

#### 6. Media Service
**Purpose:** Media upload and processing
**Responsibilities:**
- Photo upload and validation
- Video upload and transcoding
- Image resizing and optimization
- Thumbnail generation
- Azure Blob Storage integration
- Content moderation integration

**Storage:** Azure Blob Storage
**Queue:** RabbitMQ (processing jobs)

#### 7. Notification Service
**Purpose:** Push notifications and alerts
**Responsibilities:**
- Push notifications (FCM, APNS)
- Email notifications (SendGrid)
- SMS notifications (Twilio)
- In-app notifications
- Device management
- Notification preferences

**Database:** PostgreSQL (notifications, devices)
**Queue:** RabbitMQ (notification jobs)

#### 8. Payment Service
**Purpose:** Payments and subscriptions
**Responsibilities:**
- Stripe integration
- Subscription management
- Coin purchases
- In-app purchases (iOS, Android)
- Payment history
- Webhook handling

**Database:** PostgreSQL (subscriptions, transactions)

#### 9. Analytics Service
**Purpose:** User behavior analytics
**Responsibilities:**
- Event tracking
- User statistics
- Engagement metrics
- Dashboard data
- Advertising tracking
- Conversion tracking

**Database:** MongoDB (events)

#### 10. Moderation Service
**Purpose:** Content moderation and safety
**Responsibilities:**
- User reports
- Content review
- Automated content scanning
- Azure Content Moderator integration
- CSAM detection
- Moderation queue management

**Database:** PostgreSQL (reports, violations)

#### 11. Automation Service
**Purpose:** Message automation and smart features
**Responsibilities:**
- Icebreaker suggestions
- Smart reply suggestions
- Scheduled messages
- Auto-responder
- Dating coach integration

**Database:** PostgreSQL (automation settings)

#### 12. Admin Service
**Purpose:** Administrative dashboard
**Responsibilities:**
- User management (ban, unban)
- Report review
- Platform analytics
- Content moderation tools
- System configuration

**Database:** PostgreSQL (admin actions)

#### 13. Realtime Service
**Purpose:** WebSocket connections
**Responsibilities:**
- WebSocket connection management
- Real-time message delivery
- Online/offline status
- Typing indicators broadcast
- Match notifications
- Presence tracking

**Protocol:** WebSocket (Socket.io)
**Cache:** Redis (connection state)

#### 14. Policy Service
**Purpose:** Legal and policy documents
**Responsibilities:**
- Terms of service
- Privacy policy
- Community guidelines
- Cookie policy
- DMCA policy

**Database:** PostgreSQL (policy versions)

#### 15. Workflow Engine
**Purpose:** Business process automation
**Responsibilities:**
- Workflow definition and execution
- User onboarding flows
- Match expiration workflows
- Subscription renewal workflows

**Database:** PostgreSQL (workflows)

### AI Services

#### 16. Dating Coach Service
**Purpose:** AI-powered dating advice
**Responsibilities:**
- Profile optimization suggestions
- Conversation starters
- Dating advice
- OpenAI GPT integration

#### 17. Fraud Detection Service
**Purpose:** Fake profile and fraud detection
**Responsibilities:**
- Suspicious behavior detection
- Fake profile identification
- Photo authenticity verification

#### 18. NLP Service
**Purpose:** Natural language processing
**Responsibilities:**
- Text analysis
- Sentiment analysis
- Inappropriate content detection

#### 19. Photo Analysis Service
**Purpose:** Photo verification and quality analysis
**Responsibilities:**
- Face detection
- Photo quality scoring
- Selfie verification
- Azure Face API integration

#### 20. Recommendation Service (ML)
**Purpose:** Machine learning recommendations
**Responsibilities:**
- Personalized recommendations
- ML model training
- Compatibility scoring

---

## Data Layer

### PostgreSQL Schema

#### Core Tables

**users**
- id, email, password_hash, email_verified
- two_factor_enabled, two_factor_secret
- created_at, updated_at

**profiles**
- user_id, first_name, last_name, date_of_birth
- gender, interested_in, bio, location
- photos (JSONB), preferences (JSONB)

**matches**
- id, user1_id, user2_id, matched_at
- conversation_id, expired_at, status

**swipes**
- user_id, target_user_id, type (like/pass/super_like)
- created_at

**subscriptions**
- user_id, plan_id, status, stripe_subscription_id
- current_period_start, current_period_end

**reports**
- reporter_id, reported_user_id, reason, description
- status (pending/reviewed/resolved), created_at

### MongoDB Collections

**messages**
```json
{
  "_id": "ObjectId",
  "conversation_id": "uuid",
  "sender_id": "uuid",
  "recipient_id": "uuid",
  "encrypted_content": "string",
  "iv": "string",
  "auth_tag": "string",
  "type": "text|image|voice|gif|location",
  "read_at": "timestamp",
  "created_at": "timestamp"
}
```

**analytics_events**
```json
{
  "user_id": "uuid",
  "event_type": "page_view|swipe|message_sent",
  "properties": {},
  "timestamp": "timestamp"
}
```

### Redis Data Structures

**Sessions:**
```
Key: session:{userId}
Value: { token, deviceId, createdAt, expiresAt }
TTL: 7 days
```

**Rate Limiting:**
```
Key: rate_limit:{userId}:{endpoint}
Value: request count
TTL: 1 minute
```

**Cache:**
```
Key: cache:user:{userId}
Value: JSON stringified user data
TTL: 1 hour
```

### RabbitMQ Queues

- **matching.queue** - New matches to process
- **notification.queue** - Notifications to send
- **media.processing.queue** - Media files to process
- **analytics.queue** - Analytics events to process
- **moderation.queue** - Content to moderate

---

## External Integrations

### Payment Processing
- **Stripe** - Credit card payments, subscriptions
- **Apple In-App Purchase** - iOS subscriptions
- **Google Play Billing** - Android subscriptions

### Communication
- **SendGrid** - Transactional emails
- **Twilio** - SMS for 2FA and notifications
- **Agora** - Video/voice calling

### Cloud Services
- **Azure Blob Storage** - Photo and video storage
- **Azure Content Moderator** - Content moderation
- **Azure Face API** - Face detection and verification
- **Azure Key Vault** - Secrets management

### Analytics & Monitoring
- **Sentry** - Error tracking
- **Application Insights** - APM
- **Google Analytics** - Web analytics
- **Firebase Analytics** - Mobile analytics

### Authentication
- **Google OAuth** - Google Sign-In
- **Facebook Login** - Facebook authentication
- **Apple Sign-In** - Apple authentication

---

## Deployment Architecture

### Azure Container Apps

Each microservice is deployed as an independent container app:

```
flamoral-api-gateway
flamoral-auth-service
flamoral-user-service
flamoral-matching-service
flamoral-messaging-service
flamoral-media-service
flamoral-notification-service
flamoral-payment-service
flamoral-analytics-service
flamoral-moderation-service
flamoral-automation-service
flamoral-admin-service
flamoral-realtime-service
flamoral-policy-service
flamoral-workflow-engine
flamoral-dating-coach-service
flamoral-fraud-detection-service
flamoral-nlp-service
flamoral-photo-analysis-service
flamoral-recommendation-service
```

### Scaling Configuration

```yaml
API Gateway:
  min_replicas: 2
  max_replicas: 10
  cpu_threshold: 70%

Auth Service:
  min_replicas: 2
  max_replicas: 5
  cpu_threshold: 75%

Messaging Service:
  min_replicas: 2
  max_replicas: 10
  cpu_threshold: 70%

Other Services:
  min_replicas: 1
  max_replicas: 5
  cpu_threshold: 80%
```

### Networking

- **Azure Virtual Network** - Private network for services
- **Azure Front Door** - Global load balancing and CDN
- **Azure Application Gateway** - Regional load balancing
- **Private Endpoints** - Database access via private network only

### CI/CD Pipeline

```
GitHub → GitHub Actions → Docker Build → Azure Container Registry → Azure Container Apps
```

**Pipeline Steps:**
1. Code commit to main branch
2. Run tests (unit, integration, E2E)
3. Build Docker images
4. Push to Azure Container Registry
5. Deploy to staging environment
6. Run smoke tests
7. Manual approval for production
8. Blue-green deployment to production
9. Health check validation
10. Rollback if health checks fail

---

## Scalability & Performance

### Horizontal Scaling
- Stateless services that can scale independently
- Load balancing across service instances
- Auto-scaling based on CPU and memory metrics

### Caching Strategy
- **L1 Cache**: In-memory cache per service instance
- **L2 Cache**: Shared Redis cache
- **CDN**: Static assets served via Azure Front Door

### Database Optimization
- Read replicas for PostgreSQL
- Database connection pooling
- Query optimization with indexes
- Partitioning for large tables (messages, events)

### Performance Targets
- **API Response Time**: < 200ms (p95)
- **WebSocket Latency**: < 50ms
- **Page Load Time**: < 2s
- **Time to Interactive**: < 3s

### Monitoring & Alerting
- **Uptime**: 99.9% SLA
- **Error Rate**: < 0.1%
- **Latency**: p50 < 100ms, p95 < 200ms, p99 < 500ms

---

## Related Documentation

- [Database Schema](./DATABASE_SCHEMA.md)
- [API Inventory](../api/api-inventory.md)
- [Development Inventory](../development/development-inventory.md)
- [Deployment Guide](../deployment/azure-deployment.md)
- [Security Overview](../security/security-overview.md)

---

**Maintained by:** Flamoral Engineering Team
**Review Frequency:** Quarterly
**Last Review:** 2025-12-18
