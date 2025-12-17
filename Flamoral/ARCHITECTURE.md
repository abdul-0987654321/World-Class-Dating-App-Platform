# Flamoral Platform - Architecture Documentation

## System Overview

Flamoral is a world-class dating platform built with a modern, scalable architecture featuring:
- **Unified Backend** (REST + GraphQL + WebSocket)
- **React Frontend** with mobile support
- **Microservices-inspired** but monolith-first approach
- **Cloud-native** design with Docker and Kubernetes support

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                            CLIENTS                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Web Browser │  │ Mobile (iOS) │  │Mobile(Android)│             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                 │                  │                       │
└─────────┼─────────────────┼──────────────────┼───────────────────────┘
          │                 │                  │
          │                 │                  │
          ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      NGINX API GATEWAY                               │
│                         (Port 80/443)                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Routes:                                                       │  │
│  │  • /          → Frontend (Port 8080)                          │  │
│  │  • /api/*     → Backend REST API (Port 3000)                  │  │
│  │  • /graphql   → Backend GraphQL (Port 4000)                   │  │
│  │  • /ws        → Backend WebSocket (Port 5000)                 │  │
│  │  • /static/*  → CDN/Static Assets                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────┬────────┬──────────────────┬────────────────────────────────┘
          │        │                  │
    ┌─────▼──────┐ │         ┌────────▼──────────┐
    │  Frontend  │ │         │  Backend (Unified) │
    │  (React)   │ │         │  ┌───────────────┐ │
    │            │ │         │  │ REST API      │ │
    │  - Pages   │ │         │  │ (Express)     │ │
    │  - Comps   │ │         │  │ Port: 3000    │ │
    │  - State   │ │         │  ├───────────────┤ │
    │  - Routes  │ │         │  │ GraphQL       │ │
    └────────────┘ │         │  │ (Apollo)      │ │
                   │         │  │ Port: 4000    │ │
                   │         │  ├───────────────┤ │
                   │         │  │ WebSocket     │ │
                   │         │  │ (Socket.io)   │ │
                   │         │  │ Port: 5000    │ │
                   │         │  └───────────────┘ │
                   │         │                     │
                   │         │  Services Layer:    │
                   │         │  • Auth             │
                   │         │  • User             │
                   │         │  • Matching         │
                   │         │  • Messaging        │
                   │         │  • Media            │
                   │         │  • Moderation       │
                   │         │  • Notification     │
                   │         │  • Payment          │
                   │         │  • Analytics        │
                   │         └─────────┬───────────┘
                   │                   │
                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │   PostgreSQL   │  │    MongoDB     │  │     Redis      │       │
│  │   (Relational) │  │   (Document)   │  │   (Cache)      │       │
│  │                │  │                │  │                │       │
│  │  • Users       │  │  • Messages    │  │  • Sessions    │       │
│  │  • Profiles    │  │  • Analytics   │  │  • Cache       │       │
│  │  • Matches     │  │  • Logs        │  │  • Rate Limit  │       │
│  │  • Payments    │  │  • Events      │  │                │       │
│  └────────────────┘  └────────────────┘  └────────────────┘       │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐                           │
│  │   RabbitMQ     │  │ Elasticsearch  │                           │
│  │   (Queue)      │  │   (Search)     │                           │
│  │                │  │                │                           │
│  │  • Matching    │  │  • User Search │                           │
│  │  • Notifs      │  │  • Analytics   │                           │
│  │  • Analytics   │  │                │                           │
│  │  • Moderation  │  │                │                           │
│  └────────────────┘  └────────────────┘                           │
└──────────────────────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │   Azure    │  │   Stripe   │  │   Twilio   │  │ SendGrid   │  │
│  │  Storage   │  │  Payments  │  │    SMS     │  │   Email    │  │
│  │  Face API  │  │            │  │            │  │            │  │
│  │  Moderator │  │            │  │            │  │            │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                  │
│  │   Agora    │  │   Sentry   │  │  Google    │                  │
│  │Video/Voice │  │Error Track │  │ Analytics  │                  │
│  └────────────┘  └────────────┘  └────────────┘                  │
└──────────────────────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MONITORING & OBSERVABILITY                        │
│  ┌────────────────┐              ┌────────────────┐                │
│  │   Prometheus   │─────────────▶│    Grafana     │                │
│  │ (Metrics)      │              │ (Visualization)│                │
│  └────────────────┘              └────────────────┘                │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Frontend Layer

**Technology Stack:**
- React 18 with TypeScript
- Redux Toolkit for state management
- React Router for navigation
- Vite as build tool
- Socket.io client for real-time features
- Styled Components for styling

**Key Features:**
- Server-Side Rendering (SSR) ready
- Progressive Web App (PWA) capabilities
- Optimized bundle splitting
- Lazy loading for routes
- Service Worker for offline support

**Deployment:**
- Multi-stage Docker build
- NGINX for serving static files
- Gzip compression enabled
- CDN integration ready

### 2. Backend Layer

**Technology Stack:**
- Node.js 20 with TypeScript
- Express.js for REST API
- Apollo Server for GraphQL
- Socket.io for WebSocket
- PostgreSQL with Knex.js ORM
- MongoDB with native driver
- Redis with ioredis
- RabbitMQ with amqplib

**Architecture Pattern:**
```
backend-unified/
├── api/              # API endpoints
│   ├── rest/         # RESTful routes
│   ├── graphql/      # GraphQL schema & resolvers
│   └── websocket/    # WebSocket handlers
├── services/         # Business logic
├── repositories/     # Data access
├── middleware/       # Express middleware
├── config/           # Configuration
├── validators/       # Input validation
└── utils/            # Utilities
```

**Service Modules:**
- **Auth Service**: JWT-based authentication, password hashing
- **User Service**: User management, profile CRUD
- **Matching Service**: Algorithm-based matching, swipe logic
- **Messaging Service**: Real-time chat, message history
- **Media Service**: Photo/video upload, Azure Storage integration
- **Moderation Service**: Content moderation, reporting
- **Notification Service**: Push, email, SMS notifications
- **Payment Service**: Stripe integration, subscriptions
- **Analytics Service**: User behavior tracking, metrics

### 3. Data Layer

#### PostgreSQL (Primary Database)
**Purpose**: Relational data storage

**Tables**:
- Users & Authentication
- Profiles & Preferences
- Matches & Swipes
- Subscriptions & Payments
- Reports & Moderation

**Configuration**:
- Connection pooling (min: 2, max: 10)
- SSL enabled in production
- Automatic backups
- Read replicas for scaling

#### MongoDB (Document Store)
**Purpose**: Unstructured and real-time data

**Collections**:
- Messages (chat history)
- Analytics events
- User activity logs
- Notification queue

**Configuration**:
- Replica set for high availability
- Indexed for performance
- TTL indexes for auto-cleanup

#### Redis (Cache & Session)
**Purpose**: Fast in-memory data access

**Use Cases**:
- Session management
- API response caching
- Rate limiting counters
- Real-time presence tracking

**Configuration**:
- LRU eviction policy
- Persistence with AOF
- Max memory: 512MB

#### RabbitMQ (Message Queue)
**Purpose**: Asynchronous task processing

**Queues**:
- `matching_queue`: Process match calculations
- `notification_queue`: Send notifications
- `analytics_queue`: Process analytics events
- `moderation_queue`: Review flagged content

**Configuration**:
- Durable queues
- Message TTL: 24 hours
- Dead letter exchange enabled

#### Elasticsearch (Search Engine)
**Purpose**: Full-text search and analytics

**Indices**:
- User search (by location, preferences)
- Message search
- Analytics aggregations

### 4. API Gateway (NGINX)

**Responsibilities**:
- Reverse proxy to backend services
- SSL/TLS termination
- Load balancing
- Rate limiting
- Static asset serving
- Caching headers
- Security headers

**Routing Rules**:
```
/          → Frontend (React SPA)
/api/*     → Backend REST (port 3000)
/graphql   → Backend GraphQL (port 4000)
/ws        → Backend WebSocket (port 5000)
/static/*  → CDN/Static assets
```

**Features**:
- HTTP/2 support
- Gzip compression
- Request logging
- Health checks
- Graceful shutdown

### 5. External Integrations

#### Azure Cloud Services
**Storage Blob**:
- Profile photos
- Media files (videos, gifs)
- Document storage

**Face API**:
- Photo verification
- Face detection
- Age verification

**Content Moderator**:
- Image moderation
- Text moderation
- Adult content detection

#### Stripe
- Payment processing
- Subscription management
- Webhook handling
- Refunds & disputes

#### Twilio
- SMS verification
- Phone number validation
- 2FA codes

#### SendGrid
- Transactional emails
- Email templates
- Bounce handling
- Click tracking

#### Agora
- Video calls
- Voice calls
- Token generation
- Recording

#### Sentry
- Error tracking
- Performance monitoring
- Release tracking
- User feedback

#### Google Analytics
- Page views
- User behavior
- Conversion tracking
- Custom events

### 6. Monitoring Stack

#### Prometheus
- Metrics collection
- Time-series database
- Alerting rules
- Service discovery

**Metrics Collected**:
- HTTP request duration
- Database query time
- Queue length
- Memory/CPU usage
- Custom business metrics

#### Grafana
- Metrics visualization
- Dashboard creation
- Alerting
- Multi-datasource support

**Dashboards**:
- System overview
- API performance
- Database metrics
- Business KPIs
- Error rates

## Data Flow Examples

### 1. User Registration Flow
```
1. User fills registration form → Frontend
2. Frontend validates input
3. POST /api/auth/register → NGINX Gateway
4. NGINX routes to Backend REST API
5. Backend validates data
6. Backend hashes password (bcrypt)
7. Backend creates user in PostgreSQL
8. Backend sends verification email (SendGrid)
9. Backend returns JWT tokens
10. Frontend stores tokens in localStorage
11. Frontend redirects to profile setup
```

### 2. Real-Time Messaging Flow
```
1. User types message → Frontend
2. Frontend emits via WebSocket → NGINX
3. NGINX routes to Backend WebSocket
4. Backend validates user session (JWT)
5. Backend saves message to MongoDB
6. Backend publishes to RabbitMQ (notification_queue)
7. Backend emits to recipient's WebSocket connection
8. Recipient's frontend displays message
9. Worker consumes notification queue
10. Worker sends push notification (FCM/APNS)
```

### 3. Matching Algorithm Flow
```
1. User swipes right → Frontend
2. POST /api/matching/swipe → Backend
3. Backend saves swipe to PostgreSQL
4. Backend checks for mutual match
5. If match: Backend creates match record
6. Backend publishes to matching_queue
7. Worker calculates compatibility score
8. Worker updates match in database
9. Worker publishes to notification_queue
10. User receives "It's a Match!" notification
```

### 4. Photo Upload Flow
```
1. User selects photo → Frontend
2. Frontend previews and compresses image
3. POST /api/media/upload → Backend
4. Backend validates file type/size
5. Backend generates unique filename
6. Backend uploads to Azure Blob Storage
7. Backend calls Azure Face API for verification
8. If face detected: Backend saves photo URL to PostgreSQL
9. Backend returns photo URL to frontend
10. Frontend displays uploaded photo
```

## Security Architecture

### Authentication
- JWT-based authentication
- Access tokens (15 min expiry)
- Refresh tokens (7 day expiry)
- HTTP-only cookies for refresh tokens

### Authorization
- Role-based access control (RBAC)
- Permission-based middleware
- Resource ownership validation

### Data Protection
- TLS/SSL in transit
- AES-256 encryption at rest
- Password hashing with bcrypt
- Sensitive data encryption

### Rate Limiting
- API: 100 requests / 15 min
- Auth: 5 attempts / 15 min
- Upload: 20 files / hour

### Input Validation
- Joi schemas for all inputs
- SQL injection prevention
- XSS protection
- CSRF tokens

## Scalability Considerations

### Horizontal Scaling
- Stateless backend (ready for multiple instances)
- Session stored in Redis (shared)
- Load balancing with NGINX
- Database read replicas

### Caching Strategy
- Redis for hot data
- CDN for static assets
- Browser caching headers
- API response caching

### Database Optimization
- Indexed queries
- Connection pooling
- Query optimization
- Partitioning for large tables

### Queue Processing
- Multiple worker instances
- Queue priority levels
- Dead letter queues
- Retry mechanisms

## Deployment Architecture

### Development
```
docker-compose up
```
- Hot reload enabled
- Debug mode on
- Mock external services
- Seed data loaded

### Staging
- Blue-green deployment
- Automated testing
- Integration with external services
- Real data subset

### Production
- Kubernetes cluster
- Auto-scaling (HPA)
- Rolling updates
- Health checks
- Automated backups
- CDN integration

## Disaster Recovery

### Backup Strategy
- PostgreSQL: Daily full + hourly incremental
- MongoDB: Continuous replication
- Redis: AOF + RDB snapshots
- Media: Azure geo-redundant storage

### Recovery Time Objectives
- RTO: 1 hour
- RPO: 15 minutes

### High Availability
- Multi-AZ deployment
- Database replication
- Load balancer health checks
- Automatic failover

## Performance Benchmarks

### Target Metrics
- API response time: < 200ms (p95)
- Page load time: < 2s
- WebSocket latency: < 100ms
- Database queries: < 50ms
- Concurrent users: 10,000+
- Requests per second: 1,000+

## Technology Choices - Rationale

| Technology | Why Chosen |
|-----------|-----------|
| TypeScript | Type safety, better DX, scalability |
| Node.js | Unified language, async I/O, large ecosystem |
| React | Component reusability, large community, performance |
| PostgreSQL | ACID compliance, complex queries, reliability |
| MongoDB | Flexible schema, good for real-time data |
| Redis | Ultra-fast, great for caching and sessions |
| RabbitMQ | Reliable message delivery, flexible routing |
| NGINX | Industry standard, high performance, battle-tested |
| Docker | Consistent environments, easy deployment |
| Kubernetes | Container orchestration, auto-scaling, self-healing |

## Future Enhancements

1. **Machine Learning Integration**
   - Improved matching algorithm
   - Fraud detection
   - Content recommendation

2. **Microservices Migration**
   - Split services as traffic grows
   - Service mesh (Istio)
   - Event-driven architecture

3. **Global Distribution**
   - Multi-region deployment
   - Edge computing
   - Localization

4. **Advanced Features**
   - AR filters
   - Video profiles
   - AI chatbot
   - Blockchain verification
