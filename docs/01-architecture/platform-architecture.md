# Flamoral Platform Architecture

## Overview

Flamoral uses a microservices architecture deployed on Azure Kubernetes Service (AKS). Each service owns its domain, has its own database schema, and communicates via REST APIs and message queues.

## Architecture Principles

1. **Service Independence**: Each service can be deployed, scaled, and failed independently
2. **Server Authority**: All business logic enforced server-side; clients are untrusted
3. **Event-Driven**: Async processing via message queues for non-critical paths
4. **Fail-Safe**: Graceful degradation when dependencies unavailable
5. **Observable**: Every request traced, every error logged, every metric collected

## System Diagram

```
                                    ┌─────────────────┐
                                    │   CloudFlare    │
                                    │   (CDN + WAF)   │
                                    └────────┬────────┘
                                             │
                                    ┌────────┴────────┐
                                    │  Azure Front    │
                                    │     Door        │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
           ┌────────┴────────┐     ┌────────┴────────┐     ┌────────┴────────┐
           │   Web App       │     │   API Gateway   │     │  WebSocket      │
           │   (Static)      │     │   (Kong/NGINX)  │     │   Gateway       │
           └─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                            │                       │
                    ┌───────────────────────┼───────────────────────┤
                    │                       │                       │
        ┌───────────┴───────────┐           │           ┌───────────┴───────────┐
        │     Auth Service      │           │           │   Messaging Service   │
        │  ┌─────────────────┐  │           │           │  ┌─────────────────┐  │
        │  │ Authentication  │  │           │           │  │  Conversations  │  │
        │  │ Authorization   │  │           │           │  │    Messages     │  │
        │  │ Sessions        │  │           │           │  │  Attachments    │  │
        │  └─────────────────┘  │           │           │  └─────────────────┘  │
        └───────────────────────┘           │           └───────────────────────┘
                                            │
        ┌───────────────────────┐           │           ┌───────────────────────┐
        │    Profile Service    │           │           │   Discovery Service   │
        │  ┌─────────────────┐  │           │           │  ┌─────────────────┐  │
        │  │   Profiles      │  │           │           │  │      Feed       │  │
        │  │   Photos        │  │           │           │  │    Ranking      │  │
        │  │   Preferences   │  │           │           │  │   Candidates    │  │
        │  └─────────────────┘  │           │           │  └─────────────────┘  │
        └───────────────────────┘           │           └───────────────────────┘
                                            │
        ┌───────────────────────┐           │           ┌───────────────────────┐
        │   Matching Service    │           │           │     Call Service      │
        │  ┌─────────────────┐  │           │           │  ┌─────────────────┐  │
        │  │  Likes/Passes   │  │           │           │  │   Call Setup    │  │
        │  │    Matches      │  │           │           │  │   Signaling     │  │
        │  │   Super-Likes   │  │           │           │  │    Quality      │  │
        │  └─────────────────┘  │           │           │  └─────────────────┘  │
        └───────────────────────┘           │           └───────────────────────┘
                                            │
        ┌───────────────────────┐           │           ┌───────────────────────┐
        │ Verification Service  │           │           │  Moderation Service   │
        │  ┌─────────────────┐  │           │           │  ┌─────────────────┐  │
        │  │   ID Verify     │  │           │           │  │    Reports      │  │
        │  │    Selfie       │  │           │           │  │     Cases       │  │
        │  │   Liveness      │  │           │           │  │    Actions      │  │
        │  └─────────────────┘  │           │           │  └─────────────────┘  │
        └───────────────────────┘           │           └───────────────────────┘
                                            │
        ┌───────────────────────┐           │           ┌───────────────────────┐
        │   Payment Service     │           │           │     Media Service     │
        │  ┌─────────────────┐  │           │           │  ┌─────────────────┐  │
        │  │ Subscriptions   │  │           │           │  │     Upload      │  │
        │  │   Webhooks      │  │           │           │  │    Scanning     │  │
        │  │  Entitlements   │  │           │           │  │     Serving     │  │
        │  └─────────────────┘  │           │           │  └─────────────────┘  │
        └───────────────────────┘           │           └───────────────────────┘
                                            │
        ┌───────────────────────┐           │           ┌───────────────────────┐
        │ Notification Service  │           │           │    Admin Service      │
        │  ┌─────────────────┐  │           │           │  ┌─────────────────┐  │
        │  │      Push       │  │           │           │  │   Back-office   │  │
        │  │     Email       │  │           │           │  │    Support      │  │
        │  │    In-App       │  │           │           │  │   Analytics     │  │
        │  └─────────────────┘  │           │           │  └─────────────────┘  │
        └───────────────────────┘           │           └───────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    │                 Data Layer                     │
                    │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
                    │  │ PostgreSQL  │ │    Redis    │ │Azure Blob   ││
                    │  │  Cluster    │ │   Cluster   │ │  Storage    ││
                    │  └─────────────┘ └─────────────┘ └─────────────┘│
                    │  ┌─────────────┐ ┌─────────────┐               │
                    │  │Service Bus  │ │Elasticsearch│               │
                    │  │  (Queues)   │ │  (Search)   │               │
                    │  └─────────────┘ └─────────────┘               │
                    └───────────────────────────────────────────────┘
```

## Service Details

### Auth Service

**Responsibility**: User authentication and authorization

**Endpoints**:
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `GET /auth/session` - Current session

**Dependencies**:
- PostgreSQL (users, sessions, tokens)
- Redis (session cache, rate limiting)

**Scaling**: 2-10 replicas based on auth request volume

---

### Profile Service

**Responsibility**: User profile management

**Endpoints**:
- `GET /profile/me` - Get current user profile
- `PUT /profile/me` - Update profile
- `POST /profile/photos` - Upload photo
- `DELETE /profile/photos/:id` - Delete photo

**Dependencies**:
- PostgreSQL (profiles, profile_versions, photos, preferences)
- Redis (profile cache)
- Media Service (photo storage)

**Events Published**:
- `profile.updated` - Profile changed
- `photo.uploaded` - New photo added

---

### Discovery Service

**Responsibility**: Generate and serve discovery feed

**Endpoints**:
- `GET /discovery/feed` - Get candidates

**Dependencies**:
- PostgreSQL (read replicas for queries)
- Redis (candidate cache, bloom filters)
- Matching Service (exclusion lists)

**Workers**:
- `discovery_ranking_worker` - Pre-compute rankings

---

### Matching Service

**Responsibility**: Process likes and create matches

**Endpoints**:
- `POST /discovery/like` - Like a user
- `POST /discovery/pass` - Pass on a user
- `POST /discovery/super-like` - Super-like
- `GET /matches` - List matches
- `DELETE /matches/:id` - Unmatch

**Dependencies**:
- PostgreSQL (likes, passes, super_likes, matches)
- Redis (like caps, daily counters)
- Messaging Service (create conversation on match)

**Workers**:
- `match_creation_worker` - Process mutual likes

---

### Messaging Service

**Responsibility**: Conversations and messages

**Endpoints**:
- `GET /conversations` - List conversations
- `GET /conversations/:id` - Get conversation
- `POST /conversations/:id/messages` - Send message

**Dependencies**:
- PostgreSQL (conversations, messages)
- Redis (presence, typing indicators)
- WebSocket Gateway (real-time delivery)
- Media Service (attachments)

**Workers**:
- `message_delivery_worker` - Ensure delivery

---

### Call Service

**Responsibility**: Audio/video calling

**Endpoints**:
- `POST /calls/request` - Request call
- `POST /calls/accept` - Accept call
- `POST /calls/reject` - Reject call
- `POST /calls/end` - End call

**Dependencies**:
- PostgreSQL (call_sessions, call_events)
- Twilio/Agora (call infrastructure)
- WebSocket Gateway (signaling)

**Workers**:
- `call_signal_worker` - Handle signaling

---

### Verification Service

**Responsibility**: Identity verification

**Endpoints**:
- `POST /verification/start` - Start verification
- `POST /verification/upload` - Upload document
- `GET /verification/status` - Check status

**Dependencies**:
- PostgreSQL (verification_requests, results)
- Onfido/similar (verification provider)
- Media Service (artifact storage)

**Workers**:
- `verification_worker` - Process verifications

---

### Moderation Service

**Responsibility**: Reports and enforcement

**Endpoints**:
- `POST /reports` - Submit report

**Dependencies**:
- PostgreSQL (reports, cases, actions)
- Media Service (evidence)
- Notification Service (action notifications)

**Workers**:
- `moderation_triage_worker` - Auto-triage reports

---

### Payment Service

**Responsibility**: Subscriptions and billing

**Endpoints**:
- `GET /subscriptions/plans` - List plans
- `POST /subscriptions/subscribe` - Subscribe
- `GET /subscriptions/status` - Current subscription
- `POST /webhooks/stripe` - Stripe webhooks

**Dependencies**:
- PostgreSQL (subscriptions, payment_events)
- Stripe (payment processing)
- Redis (entitlement cache)

**Workers**:
- `subscription_sync_worker` - Sync with Stripe

---

### Media Service

**Responsibility**: File upload, scanning, serving

**Endpoints**:
- `POST /media/upload` - Upload file

**Dependencies**:
- Azure Blob Storage (file storage)
- Azure CDN (serving)
- Content moderation API (scanning)
- PostgreSQL (media_files, scan_results)

---

### Notification Service

**Responsibility**: Push, email, in-app notifications

**Dependencies**:
- Firebase (push notifications)
- SendGrid (email)
- PostgreSQL (notification log)
- Redis (delivery status)

**Workers**:
- `notification_worker` - Send notifications

---

## Data Flow Examples

### Like -> Match Flow

```
1. User A POST /discovery/like {target: User B}
2. Matching Service checks if User B already liked User A
3. If mutual:
   a. Create match record
   b. Publish match.created event
   c. Messaging Service creates conversation
   d. Notification Service sends push to both
4. Return response with match_created: true
```

### Message Send Flow

```
1. User A POST /conversations/:id/messages {content: "Hello"}
2. Messaging Service validates:
   a. Users are matched
   b. Idempotency key not used
   c. Rate limit not exceeded
3. Store message in PostgreSQL
4. Publish message.created event
5. WebSocket Gateway delivers to User B (if online)
6. Notification worker sends push (if offline)
7. Return 201 with message
```

### Subscription Purchase Flow

```
1. User POST /subscriptions/subscribe {plan: "plus"}
2. Payment Service:
   a. Create Stripe checkout session
   b. Return checkout URL
3. User completes payment on Stripe
4. Stripe POST /webhooks/stripe {event: "checkout.session.completed"}
5. Payment Service:
   a. Validate webhook signature
   b. Update user_subscriptions
   c. Update entitlements_snapshot
   d. Publish subscription.upgraded event
6. User sees premium features enabled
```

## Resilience Patterns

### Circuit Breaker
- External service calls wrapped in circuit breakers
- Open after 5 failures in 30 seconds
- Half-open test after 60 seconds

### Retry with Backoff
- Transient failures retry 3 times
- Exponential backoff: 1s, 2s, 4s
- Dead letter queue after exhausted retries

### Bulkhead
- Separate thread pools per external dependency
- Prevents cascade failures

### Timeout
- External API calls: 5s timeout
- Internal service calls: 2s timeout
- Database queries: 10s timeout

## Caching Strategy

| Data | Cache | TTL | Invalidation |
|------|-------|-----|--------------|
| User session | Redis | 15 min | On logout/refresh |
| User profile | Redis | 5 min | On profile update |
| Entitlements | Redis | 1 min | On subscription change |
| Discovery feed | Redis | 1 min | On like/pass/match |
| Subscription plans | Redis | 1 hour | Manual |

## Database Schema Guidelines

- All tables have `created_at` and `updated_at` timestamps
- Soft deletes via `deleted_at` column where applicable
- UUIDs for primary keys
- Foreign key constraints enforced
- Indexes on frequently queried columns
- Separate read replicas for analytics queries
