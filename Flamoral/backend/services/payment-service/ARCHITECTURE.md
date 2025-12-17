# Payment Service Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Flamoral Payment Service                     │
│                         Port: 3005                                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌──────────────┐            ┌──────────────┐          ┌──────────────┐
│   Frontend   │            │    Stripe    │          │  PostgreSQL  │
│  (React.js)  │            │     API      │          │   Database   │
└──────────────┘            └──────────────┘          └──────────────┘
        │                           │                           │
        │                           │                           │
        ├── Payment UI              ├── Webhooks                ├── Transactions
        ├── Checkout               ├── Payments                ├── Subscriptions
        └── Subscriptions          ├── Customers               ├── Webhook Events
                                   └── Products                └── Payment Methods
```

## Component Architecture

### 1. API Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                          API Layer                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │   Payment      │  │    Webhook     │  │      IAP         │  │
│  │   Routes       │  │    Routes      │  │    Routes        │  │
│  └────────────────┘  └────────────────┘  └──────────────────┘  │
│          │                   │                     │            │
│          ▼                   ▼                     ▼            │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │   Payment      │  │    Webhook     │  │      IAP         │  │
│  │  Controller    │  │   Controller   │  │   Controller     │  │
│  └────────────────┘  └────────────────┘  └──────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Service Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                        Service Layer                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Payment Service                           │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  • createPaymentIntent()                                   │ │
│  │  • purchaseSubscription()                                  │ │
│  │  • cancelSubscription()                                    │ │
│  │  • updateSubscriptionTier()                                │ │
│  │  • purchaseCoins()                                         │ │
│  │  • purchaseBoost()                                         │ │
│  │  • processRefund()                                         │ │
│  │  • createCustomer()                                        │ │
│  │  • createCheckoutSession()                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                 Webhook Service                            │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  • handleSubscriptionCreated()                             │ │
│  │  • handleSubscriptionUpdated()                             │ │
│  │  • handleSubscriptionDeleted()                             │ │
│  │  • handlePaymentIntentSucceeded()                          │ │
│  │  • handlePaymentIntentFailed()                             │ │
│  │  • handleInvoicePaymentSucceeded()                         │ │
│  │  • handleInvoicePaymentFailed()                            │ │
│  │  • handleRefundCreated()                                   │ │
│  │  • handleChargeRefunded()                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Infrastructure Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Database   │  │   External   │  │    Validation        │  │
│  │  Connection  │  │   Clients    │  │   Middleware         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│         │                  │                     │              │
│         ▼                  ▼                     ▼              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Knex.js    │  │     User     │  │   Joi Schemas        │  │
│  │   (ORM)      │  │   Service    │  │   (Validation)       │  │
│  └──────────────┘  │              │  └──────────────────────┘  │
│                    │ Notification │                            │
│                    │   Service    │                            │
│                    └──────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Subscription Purchase Flow

```
┌──────────┐     ┌────────────┐     ┌─────────────┐     ┌──────────┐
│ Frontend │────▶│  Payment   │────▶│   Stripe    │────▶│ Webhook  │
│          │     │  Service   │     │     API     │     │ Handler  │
└──────────┘     └────────────┘     └─────────────┘     └──────────┘
     │                  │                   │                  │
     │ 1. Create        │ 2. Create        │ 3. Process       │ 4. Update
     │ Checkout         │ Customer &       │ Payment          │ Database
     │ Session          │ Subscription     │                  │
     │                  │                  │                  │
     ▼                  ▼                  ▼                  ▼
┌──────────┐     ┌────────────┐     ┌─────────────┐     ┌──────────┐
│ Redirect │     │   Store    │     │   Trigger   │     │  Notify  │
│   to     │     │  Metadata  │     │   Webhook   │     │   User   │
│ Stripe   │     │            │     │   Events    │     │          │
└──────────┘     └────────────┘     └─────────────┘     └──────────┘
```

### Webhook Processing Flow

```
┌──────────────┐
│    Stripe    │
│   Webhook    │
└──────┬───────┘
       │
       │ POST /api/webhooks/stripe
       │
       ▼
┌──────────────┐
│   Verify     │──── Signature Invalid ────▶ Return 400
│  Signature   │
└──────┬───────┘
       │ Valid
       ▼
┌──────────────┐
│    Check     │──── Duplicate ────▶ Return 200 (already processed)
│ Idempotency  │
└──────┬───────┘
       │ New Event
       ▼
┌──────────────┐
│    Store     │
│    Event     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Process    │
│    Event     │
│   Handler    │
└──────┬───────┘
       │
       ├──────▶ Update Database
       │
       ├──────▶ Call User Service
       │
       ├──────▶ Send Notifications
       │
       ▼
┌──────────────┐
│     Mark     │
│  Processed   │
└──────┬───────┘
       │
       ▼
   Return 200
```

### One-Time Purchase Flow

```
┌──────────┐     ┌────────────┐     ┌─────────────┐
│ Frontend │────▶│  Payment   │────▶│   Stripe    │
│          │     │  Service   │     │     API     │
└──────────┘     └────────────┘     └─────────────┘
     │                  │                   │
     │ 1. Create        │ 2. Create        │ 3. Process
     │ Payment          │ Payment          │ Payment
     │ Intent           │ Intent           │
     │                  │                  │
     ▼                  ▼                  ▼
┌──────────┐     ┌────────────┐     ┌─────────────┐
│  Stripe  │     │   Return   │     │   Trigger   │
│ Elements │     │   Client   │     │   Webhook   │
│  Confirm │     │   Secret   │     │             │
└──────────┘     └────────────┘     └─────────────┘
     │                                      │
     │                                      ▼
     │                              ┌─────────────┐
     │                              │   Webhook   │
     │                              │   Handler   │
     │                              └─────────────┘
     │                                      │
     ▼                                      ▼
┌──────────┐                        ┌─────────────┐
│ Success/ │                        │   Credit    │
│  Failure │                        │   User      │
│ Callback │                        │   Account   │
└──────────┘                        └─────────────┘
```

## Database Schema

### Key Tables

```
┌─────────────────────────────────────────────────────────────┐
│                     Database Schema                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐    ┌────────────────────────┐    │
│  │ subscription_plans   │    │  user_subscriptions    │    │
│  ├──────────────────────┤    ├────────────────────────┤    │
│  │ id                   │    │ id                     │    │
│  │ name                 │    │ user_id                │    │
│  │ tier                 │◀───┤ plan_id (FK)           │    │
│  │ stripe_price_id_*    │    │ stripe_subscription_id │    │
│  │ features             │    │ stripe_customer_id     │    │
│  └──────────────────────┘    │ status                 │    │
│                               │ current_period_start   │    │
│  ┌──────────────────────┐    │ current_period_end     │    │
│  │ transactions         │    │ trial_start/end        │    │
│  ├──────────────────────┤    │ cancel_at_period_end   │    │
│  │ id                   │    │ grace_period_end       │    │
│  │ user_id              │    └────────────────────────┘    │
│  │ subscription_id (FK) │                                  │
│  │ stripe_payment_*_id  │    ┌────────────────────────┐    │
│  │ type                 │    │ payment_methods        │    │
│  │ status               │    ├────────────────────────┤    │
│  │ amount               │    │ id                     │    │
│  │ currency             │    │ user_id                │    │
│  │ metadata             │    │ stripe_payment_method_ │    │
│  └──────────────────────┘    │ stripe_customer_id     │    │
│                               │ type                   │    │
│  ┌──────────────────────┐    │ card_brand/last4/etc   │    │
│  │stripe_webhook_events │    └────────────────────────┘    │
│  ├──────────────────────┤                                  │
│  │ id                   │    ┌────────────────────────┐    │
│  │ stripe_event_id      │    │ coin_transactions      │    │
│  │ event_type           │    ├────────────────────────┤    │
│  │ payload              │    │ id                     │    │
│  │ status               │    │ user_id                │    │
│  │ retry_count          │    │ transaction_id (FK)    │    │
│  │ error_message        │    │ package_id             │    │
│  │ processed_at         │    │ type                   │    │
│  └──────────────────────┘    │ amount                 │    │
│                               │ balance_after          │    │
│                               └────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Security Architecture

### Authentication & Authorization

```
┌──────────────────────────────────────────────────────────────┐
│                    Security Layers                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Layer 1: Transport Security                                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  • HTTPS/TLS (Production)                              │  │
│  │  • HTTP (Development)                                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                             ▼                                 │
│  Layer 2: CORS & CSP                                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  • Origin Validation                                   │  │
│  │  • Content Security Policy (Stripe)                    │  │
│  │  • Allowed Headers/Methods                             │  │
│  └────────────────────────────────────────────────────────┘  │
│                             ▼                                 │
│  Layer 3: Authentication                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  • JWT Token Validation                                │  │
│  │  • Service API Key (Internal)                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                             ▼                                 │
│  Layer 4: Input Validation                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  • Joi Schema Validation                               │  │
│  │  • Type Checking                                       │  │
│  │  • Sanitization                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                             ▼                                 │
│  Layer 5: Webhook Signature Verification                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  • Stripe Signature Validation                         │  │
│  │  • Event Idempotency                                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                             ▼                                 │
│  Layer 6: Rate Limiting                                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  • Per-user Limits                                     │  │
│  │  • Global Limits                                       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

### Development Environment

```
┌─────────────────────────────────────────────────────────────┐
│                  Development Environment                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   React      │  │   Payment    │  │   PostgreSQL     │  │
│  │   Dev        │  │   Service    │  │   (Local)        │  │
│  │   Server     │  │   (nodemon)  │  │                  │  │
│  │  :5173       │  │   :3005      │  │   :5432          │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         │                 │                    │            │
│         │                 │                    │            │
│         └─────────────────┴────────────────────┘            │
│                           │                                 │
│                           ▼                                 │
│                  ┌──────────────┐                           │
│                  │  Stripe CLI  │                           │
│                  │  (Webhooks)  │                           │
│                  └──────────────┘                           │
│                           │                                 │
│                           ▼                                 │
│                  ┌──────────────┐                           │
│                  │  Stripe API  │                           │
│                  │  (Test Mode) │                           │
│                  └──────────────┘                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                 Production Environment                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Load Balancer                      │   │
│  │                    (HTTPS/SSL)                        │   │
│  └───────────────────┬──────────────────────────────────┘   │
│                      │                                       │
│          ┌───────────┼───────────┐                          │
│          ▼           ▼           ▼                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │ Payment  │ │ Payment  │ │ Payment  │                    │
│  │ Service  │ │ Service  │ │ Service  │                    │
│  │ Instance │ │ Instance │ │ Instance │                    │
│  │    #1    │ │    #2    │ │    #3    │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
│          │           │           │                          │
│          └───────────┼───────────┘                          │
│                      │                                       │
│          ┌───────────┴───────────┐                          │
│          ▼                       ▼                          │
│  ┌──────────────┐        ┌──────────────┐                  │
│  │  PostgreSQL  │        │    Redis     │                  │
│  │   (Primary)  │        │   (Cache)    │                  │
│  └──────────────┘        └──────────────┘                  │
│          │                                                  │
│          ▼                                                  │
│  ┌──────────────┐                                          │
│  │  PostgreSQL  │                                          │
│  │  (Replica)   │                                          │
│  └──────────────┘                                          │
│                                                              │
│  External:                                                  │
│  ┌──────────────┐        ┌──────────────┐                  │
│  │  Stripe API  │        │    Other     │                  │
│  │  (Live Mode) │        │   Services   │                  │
│  └──────────────┘        └──────────────┘                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Validate   │──── Validation Error ────▶ Return 400 + Error Details
│   Input     │
└──────┬──────┘
       │ Valid
       ▼
┌─────────────┐
│   Process   │
│   Request   │
└──────┬──────┘
       │
       ├──── Database Error ────▶ Log + Return 500
       │
       ├──── Stripe Error ────▶ Log + Return 400/502
       │
       ├──── Business Logic Error ────▶ Return 400 + Message
       │
       ▼
┌─────────────┐
│   Success   │────▶ Return 200 + Data
└─────────────┘
```

## Monitoring Points

```
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring Points                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Application Metrics:                                       │
│  • Request rate                                             │
│  • Response time (p50, p95, p99)                            │
│  • Error rate                                               │
│  • Active connections                                       │
│                                                              │
│  Business Metrics:                                          │
│  • Payment success rate                                     │
│  • Subscription conversion rate                             │
│  • Refund rate                                              │
│  • Average transaction value                                │
│                                                              │
│  Infrastructure Metrics:                                    │
│  • CPU utilization                                          │
│  • Memory usage                                             │
│  • Database connection pool                                 │
│  • Database query performance                               │
│                                                              │
│  Integration Metrics:                                       │
│  • Stripe API latency                                       │
│  • Stripe API error rate                                    │
│  • Webhook processing time                                  │
│  • Webhook failure rate                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Technology Stack                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Runtime:          Node.js 20+                              │
│  Language:         TypeScript 5+                            │
│  Framework:        Express.js 4+                            │
│  Database:         PostgreSQL 14+                           │
│  ORM:              Knex.js 3+                               │
│  Validation:       Joi 17+                                  │
│  Payment Gateway:  Stripe (API v2024-12-18.acacia)          │
│  HTTP Client:      Axios 1.7+                               │
│  Logging:          Winston 3+                               │
│  Testing:          Jest 29+                                 │
│  Cache:            Redis (optional)                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```
