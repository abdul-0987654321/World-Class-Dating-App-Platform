# Payment Service Webhook Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         STRIPE CLOUD                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Webhook Events:                                           │ │
│  │  • payment_intent.succeeded                                │ │
│  │  • payment_intent.payment_failed                           │ │
│  │  • customer.subscription.created/updated/deleted           │ │
│  │  • invoice.payment_succeeded/failed                        │ │
│  └─────────────────────┬──────────────────────────────────────┘ │
└────────────────────────┼────────────────────────────────────────┘
                         │ HTTPS Webhook
                         │ (Signed with webhook secret)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT SERVICE                               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  WebhookController (webhook.controller.ts)              │   │
│  │  • Verify Stripe signature                              │   │
│  │  • Parse raw body                                        │   │
│  │  • Route to WebhookService                              │   │
│  └─────────────────────┬───────────────────────────────────┘   │
│                        │                                         │
│  ┌─────────────────────▼───────────────────────────────────┐   │
│  │  WebhookService (webhook.service.ts)                    │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ 1. Check Idempotency                             │   │   │
│  │  │    - Query stripe_webhook_events table           │   │   │
│  │  │    - Return early if already processed           │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ 2. Store Event                                   │   │   │
│  │  │    - Insert into stripe_webhook_events           │   │   │
│  │  │    - Status: pending                             │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ 3. Process Event by Type                         │   │   │
│  │  │    ┌─────────────────────────────────────────┐   │   │   │
│  │  │    │ Payment Intent Succeeded                │   │   │   │
│  │  │    │  • Extract metadata (user_id, type)     │   │   │   │
│  │  │    │  • Route to handler:                    │   │   │   │
│  │  │    │    - Coin Purchase → processCoinPurchase│   │   │   │
│  │  │    │    - Boost Purchase → processBoostPurch.│   │   │   │
│  │  │    └─────────────────────────────────────────┘   │   │   │
│  │  │    ┌─────────────────────────────────────────┐   │   │   │
│  │  │    │ Subscription Events                     │   │   │   │
│  │  │    │  • Create/Update subscription record    │   │   │   │
│  │  │    │  • Call User Service API                │   │   │   │
│  │  │    │  • Send notification                    │   │   │   │
│  │  │    └─────────────────────────────────────────┘   │   │   │
│  │  │    ┌─────────────────────────────────────────┐   │   │   │
│  │  │    │ Invoice Events                          │   │   │   │
│  │  │    │  • Record transaction                   │   │   │   │
│  │  │    │  • Update subscription status           │   │   │   │
│  │  │    │  • Send notification                    │   │   │   │
│  │  │    └─────────────────────────────────────────┘   │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ 4. Mark Event Processed                          │   │   │
│  │  │    - Update stripe_webhook_events                │   │   │
│  │  │    - Status: processed (or failed on error)      │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                        │                                         │
│  Database Tables:      │                                         │
│  • stripe_webhook_events                                        │
│  • transactions                                                  │
│  • coin_transactions                                             │
│  • user_subscriptions                                            │
└────────────────────────┼────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌──────────────────┐           ┌──────────────────┐
│  USER SERVICE    │           │  NOTIFICATION    │
│                  │           │  SERVICE         │
│  Internal APIs:  │           │                  │
│  ├─ /coins/add   │           │  Internal APIs:  │
│  ├─ /boosts/     │           │  └─ /send        │
│  │   activate    │           │                  │
│  └─ /subscripti  │           │  Sends:          │
│     ons/update   │           │  • Email         │
│                  │           │  • Push          │
│  Updates:        │           │  • In-app        │
│  • User balance  │           └──────────────────┘
│  • Subscription  │
│  • Boost status  │
└──────────────────┘
```

## Coin Purchase Flow

```
┌──────────┐     ┌────────┐     ┌──────────┐     ┌──────────┐     ┌───────────┐
│  Client  │────▶│ Stripe │────▶│ Payment  │────▶│   User   │────▶│Notification│
│          │     │        │     │ Service  │     │ Service  │     │  Service   │
└──────────┘     └────────┘     └──────────┘     └──────────┘     └───────────┘
     │                │               │                │                  │
     │ Create         │               │                │                  │
     │ Payment        │               │                │                  │
     │ Intent         │               │                │                  │
     │───────────────▶│               │                │                  │
     │                │               │                │                  │
     │◀───────────────│               │                │                  │
     │ Client Secret  │               │                │                  │
     │                │               │                │                  │
     │ Confirm        │               │                │                  │
     │ Payment        │               │                │                  │
     │───────────────▶│               │                │                  │
     │                │               │                │                  │
     │                │ payment_      │                │                  │
     │                │ intent.       │                │                  │
     │                │ succeeded     │                │                  │
     │                │──────────────▶│                │                  │
     │                │               │                │                  │
     │                │               │ 1. Create      │                  │
     │                │               │    Transaction │                  │
     │                │               │    Record      │                  │
     │                │               │                │                  │
     │                │               │ 2. Create Coin │                  │
     │                │               │    Transaction │                  │
     │                │               │                │                  │
     │                │               │ 3. Add Coins   │                  │
     │                │               │───────────────▶│                  │
     │                │               │                │                  │
     │                │               │◀───────────────│                  │
     │                │               │    Success     │                  │
     │                │               │                │                  │
     │                │               │ 4. Notify User │                  │
     │                │               │──────────────────────────────────▶│
     │                │               │                │                  │
     │                │               │◀──────────────────────────────────│
     │                │               │                │         Success  │
     │                │◀──────────────│                │                  │
     │                │     200 OK    │                │                  │
     │                │               │                │                  │
```

## Subscription Flow

```
┌──────────┐     ┌────────┐     ┌──────────┐     ┌──────────┐     ┌───────────┐
│  Client  │────▶│ Stripe │────▶│ Payment  │────▶│   User   │────▶│Notification│
│          │     │        │     │ Service  │     │ Service  │     │  Service   │
└──────────┘     └────────┘     └──────────┘     └──────────┘     └───────────┘
     │                │               │                │                  │
     │ Create         │               │                │                  │
     │ Subscription   │               │                │                  │
     │───────────────▶│               │                │                  │
     │                │               │                │                  │
     │                │ customer.     │                │                  │
     │                │ subscription. │                │                  │
     │                │ created       │                │                  │
     │                │──────────────▶│                │                  │
     │                │               │                │                  │
     │                │               │ 1. Create Sub  │                  │
     │                │               │    Record      │                  │
     │                │               │                │                  │
     │                │               │ 2. Update User │                  │
     │                │               │    Tier        │                  │
     │                │               │───────────────▶│                  │
     │                │               │                │                  │
     │                │               │◀───────────────│                  │
     │                │               │    Success     │                  │
     │                │               │                │                  │
     │                │               │ 3. Notify User │                  │
     │                │               │──────────────────────────────────▶│
     │                │               │                │                  │
     │                │◀──────────────│                │                  │
     │                │     200 OK    │                │                  │
     │                │               │                │                  │
     │                │ invoice.      │                │                  │
     │                │ payment_      │                │                  │
     │                │ succeeded     │                │                  │
     │                │──────────────▶│                │                  │
     │                │               │                │                  │
     │                │               │ 4. Record      │                  │
     │                │               │    Payment     │                  │
     │                │               │                │                  │
     │                │               │ 5. Send Receipt│                  │
     │                │               │──────────────────────────────────▶│
     │                │               │                │                  │
```

## Database Schema Relationships

```
┌─────────────────────────────┐
│ stripe_webhook_events       │
├─────────────────────────────┤
│ id (PK)                     │
│ stripe_event_id (UNIQUE)    │◀─── Idempotency Key
│ event_type                  │
│ payload (JSONB)             │
│ status                      │
│ retry_count                 │
└─────────────────────────────┘

┌─────────────────────────────┐         ┌─────────────────────────┐
│ transactions                │         │ user_subscriptions      │
├─────────────────────────────┤         ├─────────────────────────┤
│ id (PK)                     │    ┌───▶│ id (PK)                 │
│ user_id                     │    │    │ user_id                 │
│ subscription_id (FK)        │────┘    │ plan_id (FK)            │
│ stripe_payment_intent_id    │         │ stripe_subscription_id  │
│ stripe_invoice_id           │         │ stripe_customer_id      │
│ type                        │         │ status                  │
│ status                      │         │ billing_cycle           │
│ amount                      │         └─────────────────────────┘
│ currency                    │                     │
│ description                 │                     │
│ metadata (JSONB)            │                     │
└─────────────────────────────┘                     │
         │                                          │
         │                                          ▼
         │                          ┌─────────────────────────┐
         │                          │ subscription_plans      │
         │                          ├─────────────────────────┤
         │                          │ id (PK)                 │
         │                          │ name                    │
         │                          │ stripe_price_id_monthly │
         │                          │ stripe_price_id_yearly  │
         │                          │ features (JSONB)        │
         │                          └─────────────────────────┘
         │
         ▼
┌─────────────────────────────┐         ┌─────────────────────────┐
│ coin_transactions           │         │ coin_packages           │
├─────────────────────────────┤         ├─────────────────────────┤
│ id (PK)                     │    ┌───▶│ id (PK)                 │
│ user_id                     │    │    │ name                    │
│ transaction_id (FK)         │────┘    │ coin_amount             │
│ package_id (FK)             │────────▶│ bonus_coins             │
│ type                        │         │ price                   │
│ amount                      │         │ stripe_price_id         │
│ balance_after               │         └─────────────────────────┘
│ description                 │
└─────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Webhook Event Received                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
            ┌─────────────────────┐
            │ Verify Signature    │
            └─────────┬───────────┘
                      │
            ┌─────────▼──────────┐
            │ Valid?             │
            └─────────┬──────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
      No │                         │ Yes
         ▼                         ▼
    ┌────────┐           ┌──────────────────┐
    │ Return │           │ Check Idempotency│
    │ 400    │           └────────┬─────────┘
    └────────┘                    │
                        ┌─────────▼──────────┐
                        │ Already Processed? │
                        └─────────┬──────────┘
                                  │
                     ┌────────────┴────────────┐
                     │                         │
                  Yes│                         │ No
                     ▼                         ▼
              ┌────────────┐         ┌──────────────────┐
              │ Return 200 │         │ Store Event      │
              │ (duplicate)│         │ (status: pending)│
              └────────────┘         └────────┬─────────┘
                                               │
                                               ▼
                                     ┌──────────────────┐
                                     │ Process Event    │
                                     └────────┬─────────┘
                                              │
                                 ┌────────────┴────────────┐
                                 │                         │
                             Success                    Error
                                 │                         │
                                 ▼                         ▼
                      ┌──────────────────┐    ┌──────────────────┐
                      │ Mark Processed   │    │ Mark Failed      │
                      │ Return 200       │    │ Log Error        │
                      └──────────────────┘    │ Increment Retry  │
                                              │ Return 200       │
                                              └──────────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │ Stripe Retries   │
                                              │ Automatically    │
                                              └──────────────────┘
```

## Key Components

### 1. Webhook Controller
- Entry point for all webhooks
- Verifies Stripe signatures
- Handles raw body parsing
- Routes to service layer

### 2. Webhook Service
- Contains all business logic
- Manages database operations
- Coordinates with other services
- Implements idempotency

### 3. User Service Client
- HTTP client for User Service API
- Handles authentication
- Type-safe method signatures
- Error handling and logging

### 4. Notification Service Client
- HTTP client for Notification Service
- Non-blocking operation
- Graceful failure handling
- Multiple notification types

### 5. Database Layer
- Knex.js query builder
- Transaction support
- Connection pooling
- Type-safe queries

## Security Layers

```
┌────────────────────────────────────────────────────────────┐
│                        Security Layers                      │
├────────────────────────────────────────────────────────────┤
│ 1. Stripe Signature Verification                           │
│    • Validates webhook authenticity                        │
│    • Uses STRIPE_WEBHOOK_SECRET                           │
│    • Prevents replay attacks                              │
├────────────────────────────────────────────────────────────┤
│ 2. Service-to-Service Authentication                       │
│    • X-Service-Key header required                        │
│    • Minimum 32 characters                                │
│    • Shared between services                              │
├────────────────────────────────────────────────────────────┤
│ 3. Environment Variable Configuration                      │
│    • No secrets in code                                    │
│    • Separate .env files per environment                  │
│    • .env files in .gitignore                            │
├────────────────────────────────────────────────────────────┤
│ 4. Database Security                                       │
│    • Parameterized queries (Knex)                         │
│    • Connection pooling with limits                       │
│    • SSL in production                                    │
├────────────────────────────────────────────────────────────┤
│ 5. Input Validation                                        │
│    • TypeScript type checking                             │
│    • Metadata validation                                  │
│    • Required field checks                                │
└────────────────────────────────────────────────────────────┘
```
