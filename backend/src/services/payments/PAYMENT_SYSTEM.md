# Multi-Gateway Payment Integration System

## Architecture Overview

This enterprise-grade payment system implements a **Hexagonal Architecture (Ports & Adapters)** with the **Strategy Pattern** for maximum flexibility and maintainability.

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Payment     │  │ Subscription│  │ Webhook                 │  │
│  │ Controller  │  │ Controller  │  │ Routes                  │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
┌─────────▼────────────────▼─────────────────────▼────────────────┐
│                    Application Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Payment     │  │ Transaction │  │ Webhook                 │  │
│  │ Router      │  │ State       │  │ Processor               │  │
│  │             │  │ Machine     │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
┌─────────▼────────────────▼─────────────────────▼────────────────┐
│                      Domain Layer                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    IPaymentProvider                         ││
│  │  (Port - defines contract for all payment providers)        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────────┐
│                   Infrastructure Layer (Adapters)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Stripe   │ │ Square   │ │ Adyen    │ │ Wise     │ │ Amazon │ │
│  │ Provider │ │ Provider │ │ Provider │ │ Provider │ │ Pay    │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Payment Providers (Adapters)

Each provider implements the `IPaymentProvider` interface:

| Provider | Use Case | Features |
|----------|----------|----------|
| **Stripe** | Primary processor | Full payment lifecycle, subscriptions, 3DS |
| **Square** | SMB & in-person | Web Payments SDK, Terminal integration |
| **Adyen** | Enterprise & global | Local payment methods, advanced fraud |
| **Wise** | International payouts | Multi-currency transfers, competitive FX |
| **Amazon Pay** | E-commerce checkout | One-click payments, Prime integration |

### 2. Payment Router

Intelligent routing with:
- **Rule-based selection** - Match currency, country, amount ranges
- **Health monitoring** - Track success rates, response times
- **Automatic failover** - Fallback to backup providers
- **Load balancing** - Distribute by weight

```typescript
const result = await router.executeWithFailover(
  async (provider) => provider.createPaymentIntent({ amount, currency }),
  context,
  maxRetries
);
```

### 3. Transaction State Machine

16-state lifecycle management:

```
CREATED → PENDING → PROCESSING → AUTHORIZED → CAPTURED → COMPLETED
    ↓         ↓          ↓           ↓
CANCELLED  REQUIRES   FAILED     CANCELLED
           ACTION

COMPLETED → REFUND_PENDING → PARTIALLY_REFUNDED → REFUNDED
    ↓
DISPUTED → CHARGEBACK_PENDING → CHARGEBACK_WON / CHARGEBACK_LOST
```

### 4. Webhook Processor

- **Signature verification** per provider
- **Idempotent processing** with deduplication
- **Retry with exponential backoff**
- **Dead letter queue** for failed events
- **Event routing** to handlers and state machine

## Database Schema

### Core Tables

```sql
-- Multi-provider customer mappings
customer_provider_mappings (user_id, provider, provider_customer_id)

-- Processor configuration
processor_configs (provider, is_active, is_healthy, health_score, success_rate)

-- Routing rules
routing_rules (name, provider, priority, conditions, weight, is_active)

-- Transaction state history
transaction_state_history (transaction_id, from_state, to_state, event)

-- Webhook events
webhook_events (provider, event_id, event_type, payload, status, attempts)

-- Idempotency keys
idempotency_keys (key, entity_type, entity_id, expires_at)

-- Disputes
disputes (transaction_id, provider, amount, reason, status, evidence_due_by)

-- Payouts (Wise)
payouts (user_id, recipient_id, amount, currency, target_amount, status)
```

## API Endpoints

### Payments
```
POST   /api/payments/intents           Create payment intent
POST   /api/payments/intents/:id/confirm   Confirm payment
POST   /api/payments/intents/:id/cancel    Cancel payment
POST   /api/payments/checkout          Create checkout session
```

### Subscriptions
```
GET    /api/payments/subscriptions     List subscriptions
POST   /api/payments/subscriptions     Create subscription
POST   /api/payments/subscriptions/:id/cancel  Cancel subscription
```

### Payment Methods
```
GET    /api/payments/methods           List payment methods
POST   /api/payments/methods           Attach payment method
DELETE /api/payments/methods/:id       Remove payment method
```

### Transactions
```
GET    /api/payments/transactions      List transactions
GET    /api/payments/transactions/:id  Get transaction details
POST   /api/payments/refunds           Create refund
```

### Payouts (Wise)
```
POST   /api/payments/payouts/quote     Get payout quote
POST   /api/payments/payouts/recipients    Create recipient
POST   /api/payments/payouts/transfers     Create transfer
POST   /api/payments/payouts/transfers/:id/fund  Fund transfer
```

### Webhooks
```
POST   /api/payments/webhooks/stripe      Stripe webhooks
POST   /api/payments/webhooks/square      Square webhooks
POST   /api/payments/webhooks/adyen       Adyen webhooks
POST   /api/payments/webhooks/wise        Wise webhooks
POST   /api/payments/webhooks/amazon-pay  Amazon Pay webhooks
GET    /api/payments/webhooks/stats       Webhook statistics
GET    /api/payments/webhooks/dead-letter Dead letter queue
```

## Usage

### Initialize Payment System

```typescript
import { createPaymentSystem } from './services/payments';

const paymentSystem = createPaymentSystem(db, logger, {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  },
  square: {
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    applicationId: process.env.SQUARE_APPLICATION_ID,
    locationId: process.env.SQUARE_LOCATION_ID,
    environment: 'production',
    webhookSignatureKey: process.env.SQUARE_WEBHOOK_KEY
  },
  adyen: {
    apiKey: process.env.ADYEN_API_KEY,
    merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
    environment: 'live',
    hmacKey: process.env.ADYEN_HMAC_KEY
  },
  wise: {
    apiKey: process.env.WISE_API_KEY,
    profileId: process.env.WISE_PROFILE_ID,
    environment: 'production'
  },
  amazonPay: {
    merchantId: process.env.AMAZON_PAY_MERCHANT_ID,
    publicKeyId: process.env.AMAZON_PAY_PUBLIC_KEY_ID,
    privateKey: process.env.AMAZON_PAY_PRIVATE_KEY,
    region: 'us',
    environment: 'production'
  }
});

// Mount routes
paymentSystem.mountRoutes(app, '/api/payments');

// Start webhook processor
paymentSystem.start();
```

### Register Custom Webhook Handlers

```typescript
paymentSystem.webhookProcessor.registerHandler({
  eventTypes: ['subscription.renewed'],
  async handle(event) {
    // Custom logic for subscription renewal
    await notificationService.sendRenewalConfirmation(event.payload);
  }
});
```

## Security & Compliance

### PCI-DSS Compliance
- **Never store raw card data** - Use tokenization
- **TLS 1.2+** for all communications
- **Webhook signature verification** for all providers
- **Audit logging** of all transactions

### Security Features
- Idempotency keys prevent duplicate charges
- State machine prevents invalid transitions
- Provider credentials in environment variables
- Rate limiting on API endpoints

## Testing

```bash
# Unit tests
npm test -- --testPathPattern=payments

# Integration tests
npm test -- --testPathPattern=integration

# Coverage
npm test -- --coverage --testPathPattern=payments
```

## Monitoring

### Metrics to Track
- Transaction success rate by provider
- Average response time by provider
- Webhook processing latency
- Dead letter queue size
- Dispute rate

### Alerting Thresholds
- Success rate < 95%
- Response time > 5s
- Dead letter queue > 100
- Dispute rate > 0.1%
