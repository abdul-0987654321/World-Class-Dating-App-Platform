# Flamoral Platform - Service Dependency Map

**Generated:** 2026-01-05
**Version:** 1.0.0

---

## Service Architecture Overview

```
                                    ┌─────────────────┐
                                    │   CloudFront    │
                                    │     (CDN)       │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │      WAF        │
                                    │  (Protection)   │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  API Gateway    │
                                    │  (Entry Point)  │
                                    └────────┬────────┘
                                             │
        ┌────────────────┬──────────────────┼───────────────────┬────────────────┐
        │                │                  │                   │                │
┌───────▼───────┐ ┌──────▼──────┐ ┌────────▼────────┐ ┌────────▼───────┐ ┌──────▼──────┐
│ Auth Service  │ │User Service │ │Matching Service │ │Messaging Svc   │ │Payment Svc  │
└───────┬───────┘ └──────┬──────┘ └────────┬────────┘ └────────┬───────┘ └──────┬──────┘
        │                │                  │                   │                │
        └────────────────┴──────────────────┴───────────────────┴────────────────┘
                                             │
                    ┌────────────────────────┼─────────────────────────┐
                    │                        │                         │
           ┌────────▼────────┐      ┌────────▼────────┐       ┌───────▼───────┐
           │  PostgreSQL     │      │    Redis        │       │     S3        │
           │  (Aurora)       │      │ (ElastiCache)   │       │   (Media)     │
           └─────────────────┘      └─────────────────┘       └───────────────┘
```

---

## Individual Service Dependencies

### 1. API Gateway Service
**Purpose:** Entry point for all API requests

| Dependency Type | Resource | Purpose |
|-----------------|----------|---------|
| **Database** | PostgreSQL (Aurora) | Rate limit state, API keys |
| **Cache** | Redis (ElastiCache) | Session cache, rate limiting |
| **Queue** | - | - |
| **Storage** | - | - |
| **External APIs** | All backend services | Proxy routing |

**Downstream Services:**
- auth-service
- user-service
- matching-service
- messaging-service
- payment-service
- notification-service
- media-service
- analytics-service
- moderation-service
- admin-service
- partnership-service

---

### 2. Auth Service
**Purpose:** Authentication, authorization, 2FA

| Dependency Type | Resource | Purpose |
|-----------------|----------|---------|
| **Database** | PostgreSQL (Aurora) | Users, tokens, sessions |
| **Cache** | Redis (ElastiCache) | Token blacklist, session cache |
| **Queue** | SQS (notification) | Email verification, password reset |
| **Storage** | - | - |
| **Secrets** | Secrets Manager | JWT keys, OAuth secrets |
| **External APIs** | - | - |

**Environment Variables:**
```
DATABASE_URL           → Aurora PostgreSQL
REDIS_URL              → ElastiCache Redis
JWT_SECRET             → Secrets Manager
JWT_REFRESH_SECRET     → Secrets Manager
EMAIL_VERIFICATION_URL → Application config
```

---

### 3. User Service
**Purpose:** User profiles, settings, verification, gamification

| Dependency Type | Resource | Purpose |
|-----------------|----------|---------|
| **Database** | PostgreSQL (Aurora) | User profiles, settings, achievements |
| **Cache** | Redis (ElastiCache) | Profile cache, session data |
| **Queue** | SQS (notification) | Verification emails, notifications |
| **Storage** | S3 (media bucket) | Profile photos (via media-service) |
| **External APIs** | Twilio | Phone verification |
| **External APIs** | SendGrid | Email delivery |

**Internal Service Dependencies:**
- auth-service (token validation)
- media-service (photo management)
- notification-service (alerts)

---

### 4. Matching Service
**Purpose:** Discovery, swipes, matches, recommendations

| Dependency Type | Resource | Purpose |
|-----------------|----------|---------|
| **Database** | PostgreSQL (Aurora) | Swipes, matches, preferences |
| **Cache** | Redis (ElastiCache) | Discovery cache, match cache |
| **Queue** | SQS (matching) | Match processing |
| **Queue** | SNS (match-events) | Match event publishing |
| **Storage** | - | - |
| **ML Service** | Internal | Recommendation scoring |

**Internal Service Dependencies:**
- user-service (profile data)
- notification-service (match notifications)
- analytics-service (event tracking)

**Published Events (SNS):**
- `match.created`
- `match.superlike`
- `match.expired`
- `match.unmatched`

---

### 5. Messaging Service
**Purpose:** Conversations, messages, calls, encryption

| Dependency Type | Resource | Purpose |
|-----------------|----------|---------|
| **Database** | PostgreSQL (Aurora) | Conversations, messages |
| **Database** | CosmosDB (optional) | Message history |
| **Cache** | Redis (ElastiCache) | Typing indicators, presence |
| **Queue** | SQS (message_events) | Message processing |
| **Queue** | SNS (message-events) | Event publishing |
| **Storage** | S3 (media bucket) | Chat attachments |
| **External APIs** | Twilio | Voice/video calls |
| **External APIs** | Google Calendar | Calendar integration |
| **External APIs** | Apple Calendar | Calendar integration |
| **External APIs** | Outlook Calendar | Calendar integration |

**Internal Service Dependencies:**
- auth-service (token validation)
- user-service (user data)
- notification-service (message notifications)
- media-service (attachment handling)

**WebSocket Events:**
- `new_message`
- `message_delivered`
- `message:read`
- `typing`
- `call:incoming`
- `call:ended`

---

### 6. Notification Service
**Purpose:** Push, email, SMS, in-app notifications

| Dependency Type | Resource | Purpose |
|-----------------|----------|---------|
| **Database** | PostgreSQL (Aurora) | Notification history, preferences |
| **Cache** | Redis (ElastiCache) | Device tokens, delivery state |
| **Queue** | SQS (notification) | Notification processing |
| **Queue** | Bull (Redis) | Job processing |
| **External APIs** | AWS SNS | Push (iOS/Android), SMS |
| **External APIs** | AWS SES | Email delivery |
| **External APIs** | FCM | Android push |
| **External APIs** | APNS | iOS push |

**Consumed Queues:**
- `notification` (SQS)
- `email` (SQS)
- `sms` (SQS)

**Notification Channels:**
- PUSH (FCM, APNS, SNS)
- EMAIL (SES)
- SMS (SNS, Twilio)
- IN_APP

---

### 7. Media Service
**Purpose:** Photo/video upload, processing, verification

| Dependency Type | Resource | Purpose |
|-----------------|----------|---------|
| **Database** | PostgreSQL (Aurora) | Media metadata |
| **Cache** | Redis (ElastiCache) | Processing status |
| **Queue** | SQS (media-processing) | Processing jobs |
| **Storage** | S3 (media bucket) | Media files |
| **CDN** | CloudFront | Media delivery |
| **External APIs** | AWS Rekognition | Content moderation |
| **External APIs** | Azure Content Moderator | Additional moderation |

**Background Workers:**
- content-moderation.worker
- deepfake-detection.worker
- image-processing.worker
- photo-verification.worker

---

### 8. Payment Service
**Purpose:** Payments, subscriptions, IAP

| Dependency Type | Resource | Purpose |
|-----------------|----------|---------|
| **Database** | PostgreSQL (Aurora) | Transactions, subscriptions |
| **Cache** | Redis (ElastiCache) | Idempotency keys |
| **Queue** | SNS (payment-events) | Payment event publishing |
| **Secrets** | Secrets Manager | API keys |
| **External APIs** | Stripe | Primary payments |
| **External APIs** | Paystack | African markets |
| **External APIs** | Flutterwave | African markets |
| **External APIs** | Apple IAP | iOS purchases |
| **External APIs** | Google Play | Android purchases |

**Webhook Endpoints:**
- `/webhooks/stripe` (Stripe-Signature)
- `/webhooks/paystack` (x-paystack-signature)
- `/webhooks/flutterwave` (verif-hash)

**Published Events (SNS):**
- `payment.succeeded`
- `payment.failed`
- `subscription.created`
- `subscription.cancelled`
- `subscription.renewed`

---

### 9. Analytics Service
**Purpose:** Event tracking, dashboards, predictions

| Dependency Type | Resource | Purpose |
|-----------------|----------|---------|
| **Database** | PostgreSQL (Aurora) | Event storage, aggregations |
| **Cache** | Redis (ElastiCache) | Dashboard cache |
| **Queue** | SQS (analytics) | Event ingestion |
| **External APIs** | - | - |

**Consumed Events:**
- All SNS topics (fan-out to SQS)

**Background Jobs:**
- churn-prediction.job

---

### 10. Moderation Service
**Purpose:** Content moderation, CSAM detection, reporting

| Dependency Type | Resource | Purpose |
|-----------------|----------|---------|
| **Database** | PostgreSQL (Aurora) | Reports, violations |
| **Cache** | Redis (ElastiCache) | Hash cache |
| **Queue** | SQS (moderation) | Moderation queue |
| **Storage** | S3 (quarantine) | Quarantined content |
| **External APIs** | AWS Rekognition | Image analysis |
| **External APIs** | Azure Content Moderator | Text analysis |
| **External APIs** | NCMEC | CSAM reporting |

**Internal Service Dependencies:**
- media-service (content access)
- user-service (user actions)
- notification-service (staff alerts)

---

### 11. Admin Service
**Purpose:** Admin dashboard, user management, A/B testing

| Dependency Type | Resource | Purpose |
|-----------------|----------|---------|
| **Database** | PostgreSQL (Aurora) | Admin data, A/B tests |
| **Cache** | Redis (ElastiCache) | Dashboard cache |
| **Queue** | - | - |
| **External APIs** | CloudWatch | Metrics |

**Internal Service Dependencies:**
- All services (read access)
- user-service (user management)
- analytics-service (metrics)

---

### 12. Automation Service
**Purpose:** Icebreakers, workflows, background jobs

| Dependency Type | Resource | Purpose |
|-----------------|----------|---------|
| **Database** | PostgreSQL (Aurora) | Workflow state |
| **Cache** | Redis (ElastiCache) | Job state |
| **Queue** | RabbitMQ | Job processing |
| **Queue** | Bull (Redis) | Worker jobs |

**Message Queue Consumers:**
- match-events.consumer (RabbitMQ)
- message-events.consumer (RabbitMQ)

**Background Workers:**
- call-signal.worker
- cleanup-retention.worker
- discovery-ranking.worker
- match-creation.worker
- message-delivery.worker
- moderation-triage.worker
- notification.worker
- subscription-sync.worker
- verification.worker

---

### 13. Partnership Service
**Purpose:** Restaurant/event bookings, gifts

| Dependency Type | Resource | Purpose |
|-----------------|----------|---------|
| **Database** | PostgreSQL (Aurora) | Bookings, orders |
| **Cache** | Redis (ElastiCache) | API response cache |
| **External APIs** | OpenTable | Restaurant reservations |
| **External APIs** | Resy | Restaurant reservations |
| **External APIs** | EventBrite | Event tickets |
| **External APIs** | Ticketmaster | Event tickets |
| **External APIs** | Flowers API | Gift delivery |

---

## AWS Resource Summary by Service

| Service | Aurora | ElastiCache | S3 | SQS | SNS | Secrets | KMS |
|---------|--------|-------------|----|----|-----|---------|-----|
| api-gateway | ✓ | ✓ | - | - | - | ✓ | ✓ |
| auth-service | ✓ | ✓ | - | ✓ | - | ✓ | ✓ |
| user-service | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| matching-service | ✓ | ✓ | - | ✓ | ✓ | - | ✓ |
| messaging-service | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| notification-service | ✓ | ✓ | - | ✓ | ✓ | ✓ | ✓ |
| media-service | ✓ | ✓ | ✓ | ✓ | - | ✓ | ✓ |
| payment-service | ✓ | ✓ | - | - | ✓ | ✓ | ✓ |
| analytics-service | ✓ | ✓ | - | ✓ | - | - | ✓ |
| moderation-service | ✓ | ✓ | ✓ | ✓ | - | ✓ | ✓ |
| admin-service | ✓ | ✓ | - | - | - | ✓ | ✓ |
| automation-service | ✓ | ✓ | - | ✓ | ✓ | - | ✓ |
| partnership-service | ✓ | ✓ | - | - | - | ✓ | ✓ |

---

## External API Dependencies

| Provider | Services Using | Purpose |
|----------|----------------|---------|
| **Stripe** | payment-service | Primary payments |
| **Paystack** | payment-service | African payments |
| **Flutterwave** | payment-service | African payments |
| **Apple IAP** | payment-service | iOS purchases |
| **Google Play** | payment-service | Android purchases |
| **AWS SES** | notification-service | Email delivery |
| **AWS SNS** | notification-service | Push/SMS |
| **FCM** | notification-service | Android push |
| **APNS** | notification-service | iOS push |
| **Twilio** | user-service, messaging-service | Phone verification, calls |
| **SendGrid** | user-service | Transactional email |
| **AWS Rekognition** | media-service, moderation-service | Image analysis |
| **Azure Content Moderator** | moderation-service | Content moderation |
| **NCMEC** | moderation-service | CSAM reporting |
| **OpenTable** | partnership-service | Reservations |
| **Resy** | partnership-service | Reservations |
| **EventBrite** | partnership-service | Events |
| **Ticketmaster** | partnership-service | Events |
| **Google Calendar** | messaging-service | Calendar sync |
| **Apple Calendar** | messaging-service | Calendar sync |
| **Outlook Calendar** | messaging-service | Calendar sync |

---

## Data Flow Diagrams

### User Registration Flow
```
Client → API Gateway → Auth Service → PostgreSQL
                    ↓
                 Redis (session)
                    ↓
              SQS (notification)
                    ↓
           Notification Service → SES (email)
```

### Match Creation Flow
```
Client → API Gateway → Matching Service → PostgreSQL
                                       ↓
                                   Redis (cache)
                                       ↓
                              SNS (match-events)
                             ↙              ↘
              SQS (notification)        SQS (analytics)
                    ↓                        ↓
           Notification Service    Analytics Service
                    ↓
                FCM/APNS
```

### Payment Flow
```
Client → API Gateway → Payment Service → Stripe API
                                       ↓
                                   PostgreSQL
                                       ↓
                              SNS (payment-events)
                             ↙              ↘
              SQS (notification)       User Service
                    ↓                  (subscription update)
           Notification Service
```

### Media Upload Flow
```
Client → API Gateway → Media Service → S3 (presign)
                                    ↓
                              Client → S3 (upload)
                                    ↓
                              S3 Event → SQS
                                    ↓
                           Media Service Workers
                          ↙         ↓         ↘
                   Rekognition   Processing   CDN Invalidation
                        ↓
                  Moderation Service (if flagged)
```

---

## Critical Dependencies (Single Points of Failure)

| Component | Impact | Mitigation |
|-----------|--------|------------|
| Aurora PostgreSQL | All services down | Multi-AZ, read replicas |
| ElastiCache Redis | Session loss, degraded performance | Multi-AZ, cluster mode |
| API Gateway | All traffic blocked | Multi-region failover |
| Stripe | Payment processing down | Fallback to Paystack |
| AWS SES | Email delivery stopped | Fallback to SendGrid |
| AWS SNS | Push notifications down | Fallback to FCM direct |

---

## Service Communication Patterns

| Pattern | Services | Transport |
|---------|----------|-----------|
| Sync HTTP | api-gateway ↔ all services | REST/JSON |
| Async Events | matching ↔ notification | SNS → SQS |
| Async Events | payment ↔ user | SNS → SQS |
| WebSocket | messaging ↔ clients | Socket.IO |
| Background Jobs | automation workers | RabbitMQ/Bull |

---

*Document generated as part of Phase 0 SaaS Platform Audit*
