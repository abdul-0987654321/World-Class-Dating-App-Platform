# Stripe Webhook Implementation - Complete Guide

## Overview

This payment service implements comprehensive Stripe webhook handlers that automatically process payments, manage subscriptions, and synchronize data with the User Service and Notification Service.

## Implemented Webhook Events

### Payment Intent Events

#### `payment_intent.succeeded`
Handles successful one-time payments for coins and boosts.

**Actions:**
- Records transaction in database
- For coin purchases:
  - Creates coin transaction record
  - Calls User Service to add coins to balance
  - Sends success notification
- For boost purchases:
  - Calls User Service to activate boost
  - Sends success notification
- Logs all operations

**Required Metadata:**
```typescript
{
  user_id: string;           // UUID of the user
  type: 'coin_purchase' | 'boost_purchase';
  package_id?: string;       // For coin purchases
  product_sku?: string;      // Product SKU (e.g., 'BOOST_1HR')
  product_name?: string;     // Display name
}
```

#### `payment_intent.payment_failed`
Handles failed payment attempts.

**Actions:**
- Records failed transaction with error details
- Sends payment failure notification to user
- Logs failure reason

### Subscription Events

#### `customer.subscription.created`
Handles new subscription creation.

**Actions:**
- Creates subscription record in database
- Updates user's subscription tier in User Service
- Sends subscription update notification
- Handles trial periods if applicable

**Required Metadata:**
```typescript
{
  user_id: string;
  tier?: string;
  plan_name?: string;
}
```

#### `customer.subscription.updated`
Handles subscription modifications (upgrades, downgrades, renewals).

**Actions:**
- Updates subscription record
- Updates user's subscription tier and status
- Sends subscription update notification
- Handles cancellation scheduling

#### `customer.subscription.deleted`
Handles subscription cancellations.

**Actions:**
- Marks subscription as canceled
- Downgrades user to free tier
- Sends cancellation notification with access end date

### Invoice Events

#### `invoice.payment_succeeded`
Handles successful subscription renewals.

**Actions:**
- Records successful payment transaction
- Sends renewal notification with next billing date
- Updates subscription period

#### `invoice.payment_failed`
Handles failed subscription renewals.

**Actions:**
- Records failed payment
- Updates subscription status to 'past_due'
- Sends payment failure notification with instructions
- Updates user subscription status

## Architecture

### File Structure

```
payment-service/
├── src/
│   ├── api/
│   │   └── controllers/
│   │       └── webhook.controller.ts      # Webhook endpoint handler
│   ├── domain/
│   │   └── services/
│   │       └── webhook.service.ts         # Business logic
│   ├── infrastructure/
│   │   ├── clients/
│   │   │   ├── user-service.client.ts     # User service integration
│   │   │   └── notification-service.client.ts  # Notification integration
│   │   └── database/
│   │       └── connection.ts              # Database connection
│   ├── types/
│   │   └── stripe-events.types.ts         # TypeScript type definitions
│   └── utils/
│       └── logger.ts                      # Winston logger
```

### Service Dependencies

```
┌─────────────────┐
│ Stripe Webhooks │
└────────┬────────┘
         │
         v
┌─────────────────────┐
│ Payment Service     │
│ - Webhook Handler   │
│ - Business Logic    │
│ - Data Persistence  │
└─────┬───────┬───────┘
      │       │
      v       v
┌─────────┐ ┌──────────────┐
│ User    │ │ Notification │
│ Service │ │ Service      │
└─────────┘ └──────────────┘
```

## Database Schema

### stripe_webhook_events
Tracks all webhook events for idempotency.

```sql
- id (uuid, primary key)
- stripe_event_id (string, unique) - Stripe event ID
- event_type (string) - Event type
- payload (jsonb) - Full event data
- status (enum) - pending, processed, failed
- error_message (text)
- retry_count (integer)
- processed_at (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

### transactions
Records all payment transactions.

```sql
- id (uuid, primary key)
- user_id (uuid) - User reference
- subscription_id (uuid) - Subscription reference
- stripe_payment_intent_id (string)
- stripe_invoice_id (string)
- stripe_charge_id (string)
- type (enum) - subscription, coin_purchase, boost_purchase, etc.
- status (enum) - pending, succeeded, failed, refunded
- amount (decimal)
- currency (string)
- description (text)
- metadata (jsonb)
- failure_code (string)
- failure_message (text)
- processed_at (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

### coin_transactions
Tracks coin balance changes.

```sql
- id (uuid, primary key)
- user_id (uuid)
- transaction_id (uuid)
- package_id (uuid)
- type (enum) - purchase, spent, earned, refund
- amount (integer) - Coin amount
- balance_after (integer) - Balance after transaction
- description (text)
- created_at (timestamp)
```

## Integration Points

### User Service API Endpoints

All endpoints require `X-Service-Key` header for authentication.

#### Update Subscription
```http
PUT /api/internal/subscriptions/update
Content-Type: application/json

{
  "userId": "uuid",
  "tier": "free|premium|premium_plus",
  "stripeSubscriptionId": "sub_...",
  "status": "active|canceled|past_due|unpaid|trialing",
  "currentPeriodEnd": "2024-12-31T23:59:59Z"
}
```

#### Add Coins
```http
POST /api/internal/coins/add
Content-Type: application/json

{
  "userId": "uuid",
  "amount": 500,
  "transactionType": "purchase",
  "stripePaymentId": "pi_...",
  "productSku": "COIN_PACK_MEDIUM"
}
```

#### Activate Boost
```http
POST /api/internal/boosts/activate
Content-Type: application/json

{
  "userId": "uuid",
  "productSku": "BOOST_1HR",
  "durationMinutes": 60,
  "stripePaymentId": "pi_..."
}
```

### Notification Service API Endpoints

#### Send Notification
```http
POST /api/internal/notifications/send
Content-Type: application/json

{
  "userId": "uuid",
  "type": "payment_success|payment_failed|subscription_updated|...",
  "title": "Notification Title",
  "body": "Notification message",
  "data": { ... }
}
```

## Error Handling

### Idempotency
- Every webhook event is stored before processing
- Duplicate events are detected and rejected
- Event ID is used as idempotency key

### Transaction Safety
- Database transactions wrap critical operations
- Failed operations are logged and marked for retry
- User service calls use try-catch with detailed logging

### Notification Failures
- Notification failures don't block payment processing
- Failures are logged but don't throw exceptions
- Non-critical operation pattern

### Retry Logic
- Failed events are marked with retry count
- Webhook events can be reprocessed manually
- Stripe automatic retries are supported

## Security

### Webhook Signature Verification
```typescript
// Automatically verified in webhook controller
const event = stripe.webhooks.constructEvent(
  req.body,
  signature,
  webhookSecret
);
```

### Service Authentication
- Internal API calls use `X-Service-Key` header
- Key must be configured in both services
- Minimum 32 characters required

### Data Validation
- All metadata fields are validated
- Missing required fields throw descriptive errors
- Type safety enforced with TypeScript

## Testing

### Local Testing with Stripe CLI

1. Install Stripe CLI:
```bash
# Download from https://stripe.com/docs/stripe-cli
```

2. Login and forward webhooks:
```bash
stripe login
stripe listen --forward-to localhost:3005/api/payments/webhook
```

3. Trigger test events:
```bash
# Test coin purchase
stripe trigger payment_intent.succeeded \
  --add payment_intent:metadata[user_id]=test-user-id \
  --add payment_intent:metadata[type]=coin_purchase \
  --add payment_intent:metadata[package_id]=package-uuid

# Test subscription creation
stripe trigger customer.subscription.created \
  --add subscription:metadata[user_id]=test-user-id

# Test invoice payment
stripe trigger invoice.payment_succeeded
```

### Manual Testing

Use the Stripe Dashboard:
1. Go to Developers > Webhooks
2. Select your webhook endpoint
3. Click "Send test webhook"
4. Choose event type and customize data
5. Monitor logs for processing

### Unit Testing

```bash
npm run test:unit
```

Test files located in `tests/unit/services/webhook.service.test.ts`

## Monitoring

### Key Metrics to Monitor

1. **Webhook Delivery Rate**
   - Check Stripe Dashboard for failed deliveries
   - Monitor retry attempts

2. **Processing Success Rate**
   - Query `stripe_webhook_events` table
   - Track `status = 'failed'` events

3. **User Service Integration**
   - Monitor error logs for API failures
   - Track response times

4. **Notification Delivery**
   - Check notification service logs
   - Non-critical but important for UX

### Logging

All operations are logged with Winston:
- Info: Successful operations
- Warn: Missing data, skipped operations
- Error: Failures, exceptions

Log format:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "service": "payment-service",
  "message": "Coin purchase processed for user ...",
  "metadata": { ... }
}
```

## Configuration

### Environment Variables

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Service URLs
USER_SERVICE_URL=http://localhost:3001
NOTIFICATION_SERVICE_URL=http://localhost:3008

# Authentication
SERVICE_API_KEY=your-internal-service-key-min-32-chars

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_payments
DB_USER=postgres
DB_PASSWORD=your_password
```

### Stripe Dashboard Setup

1. Go to Developers > Webhooks
2. Click "Add endpoint"
3. Enter URL: `https://yourdomain.com/api/payments/webhook`
4. Select events:
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
5. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

## Troubleshooting

### Webhook Not Receiving Events

**Check:**
- Endpoint is publicly accessible (use ngrok for local testing)
- URL is correct in Stripe Dashboard
- Firewall allows incoming connections

### Signature Verification Failing

**Check:**
- `STRIPE_WEBHOOK_SECRET` matches Dashboard
- Using raw body parser (not JSON parser)
- No modifications to request body

### User Service Integration Failing

**Check:**
- `USER_SERVICE_URL` is correct
- `SERVICE_API_KEY` matches in both services
- User service is running and accessible
- Network connectivity between services

### Missing Metadata

**Check:**
- Payment creation includes required metadata
- Metadata keys are correct (user_id, type, etc.)
- Values are properly formatted (UUIDs, etc.)

### Database Errors

**Check:**
- Database migrations are up to date
- Connection pool is not exhausted
- Foreign key constraints are satisfied

## Best Practices

1. **Always Include Metadata**
   - Add user_id to all payment intents
   - Include type for proper routing
   - Add descriptive product information

2. **Handle Idempotency**
   - Check for duplicate events
   - Use database transactions
   - Log all operations

3. **Graceful Degradation**
   - Don't block payments on notification failures
   - Log errors for later investigation
   - Implement retry mechanisms

4. **Monitor Actively**
   - Set up alerts for failed webhooks
   - Track user service integration errors
   - Monitor database performance

5. **Test Thoroughly**
   - Test all webhook event types
   - Verify idempotency handling
   - Check error scenarios

## Support

For issues or questions:
- Check Stripe Dashboard webhook logs
- Review payment service error logs
- Consult Stripe API documentation
- Test with Stripe CLI for debugging
