# Payment Webhook Verification Checklist

**Version:** 1.0
**Last Updated:** 2025-12-12
**Owner:** Platform Security & Payments Team
**Status:** Active

## Overview

This checklist provides comprehensive verification steps for all payment webhook integrations in the Flamoral dating platform. Use this document to verify webhook functionality, troubleshoot issues, and ensure secure payment processing across all payment providers.

## Table of Contents

1. [Stripe Webhooks](#1-stripe-webhooks)
2. [Paystack Webhooks](#2-paystack-webhooks)
3. [Flutterwave Webhooks](#3-flutterwave-webhooks)
4. [General Webhook Security](#4-general-webhook-security)
5. [Monitoring & Alerting](#5-monitoring--alerting)
6. [Troubleshooting Guide](#6-troubleshooting-guide)

---

## 1. Stripe Webhooks

### 1.1 Endpoint Configuration

**Webhook URL:** `https://api.flamoral.com/api/v1/webhooks/stripe`

#### Required Environment Variables

```bash
STRIPE_SECRET_KEY=sk_live_...          # Stripe API secret key
STRIPE_WEBHOOK_SECRET=whsec_...        # Webhook signing secret
```

### 1.2 Signature Verification

Stripe uses HMAC-SHA256 signature verification via the `stripe-signature` header.

#### Verification Process

```typescript
// Implementation reference: backend/services/payment-service/src/api/controllers/webhook.controller.ts
const sig = req.headers['stripe-signature'] as string;
const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
```

#### Required Headers

- `stripe-signature`: Timestamp and signature(s) in format: `t=timestamp,v1=signature`
- `content-type`: `application/json`

### 1.3 Test Commands

#### Test Webhook Endpoint

```bash
# Test with valid signature (replace placeholders)
curl -X POST https://api.flamoral.com/api/v1/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=1234567890,v1=PLACEHOLDER_SIGNATURE" \
  -d '{
    "id": "evt_test_webhook",
    "object": "event",
    "api_version": "2023-10-16",
    "created": 1234567890,
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test_12345",
        "object": "payment_intent",
        "amount": 2000,
        "currency": "usd",
        "status": "succeeded"
      }
    }
  }'
```

#### Test Using Stripe CLI

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Forward webhooks to local development
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
```

### 1.4 Expected Responses

#### Success Response

```json
{
  "received": true
}
```

**HTTP Status:** `200 OK`

#### Duplicate Event Response

```json
{
  "received": true,
  "duplicate": true
}
```

**HTTP Status:** `200 OK`

#### Signature Verification Failed

```json
{
  "error": "Webhook Error: No signatures found matching the expected signature for payload"
}
```

**HTTP Status:** `400 Bad Request`

#### Missing Webhook Secret

```json
{
  "error": "Webhook secret not configured"
}
```

**HTTP Status:** `500 Internal Server Error`

### 1.5 Supported Event Types

#### Subscription Events
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`
- `customer.subscription.pending_update_applied`
- `customer.subscription.pending_update_expired`

#### Invoice Events
- `invoice.paid`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `invoice.payment_action_required`
- `invoice.upcoming`
- `invoice.finalized`

#### Payment Intent Events
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `payment_intent.requires_action`

#### Checkout Events
- `checkout.session.completed`
- `checkout.session.expired`

#### Charge Events
- `charge.succeeded`
- `charge.failed`
- `charge.refunded`
- `charge.dispute.created`

#### Refund Events
- `refund.created`
- `refund.updated`

#### Customer Events
- `customer.created`
- `customer.updated`
- `customer.deleted`

#### Payment Method Events
- `payment_method.attached`
- `payment_method.detached`

### 1.6 Idempotency Requirements

**Implementation:** Event ID-based idempotency

```sql
-- Database table: stripe_webhook_events
CREATE TABLE stripe_webhook_events (
  stripe_event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(100),
  payload JSONB,
  status VARCHAR(50),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Process:**
1. Check if `event.id` exists in `stripe_webhook_events` with status `processed`
2. If duplicate, return `200 OK` with `duplicate: true`
3. If new, store event with status `pending`
4. Process event
5. Mark event as `processed` or `failed`

### 1.7 Retry Handling

**Stripe Retry Policy:**
- Stripe attempts to deliver webhooks for up to 3 days
- Exponential backoff: immediate, 1h, 3h, 6h, 12h, 24h, 48h, 72h
- Returns `200 OK` to prevent Stripe retries (internal retry mechanism handles failures)

**Internal Retry Strategy:**
```typescript
// Failed events tracked with retry_count in database
await webhookService.markEventFailed(event.id, err.message);
// Background job processes failed events (max 5 retries)
```

### 1.8 Common Failure Modes

| Failure Mode | Symptom | Resolution |
|--------------|---------|------------|
| Invalid signature | 400 error, signature verification failed | Verify `STRIPE_WEBHOOK_SECRET` matches dashboard |
| Missing secret | 500 error | Add `STRIPE_WEBHOOK_SECRET` to environment |
| Duplicate events | Multiple processing attempts | Check idempotency implementation |
| Network timeout | 504 Gateway Timeout | Check payment service health |
| Database connection | 500 error, DB query failed | Verify database connectivity |
| Invalid event format | Parsing error | Check Stripe API version compatibility |

---

## 2. Paystack Webhooks

### 2.1 Endpoint Configuration

**Webhook URL:** `https://api.flamoral.com/api/v1/webhooks/paystack`

#### Required Environment Variables

```bash
PAYSTACK_SECRET_KEY=sk_live_...           # Paystack API secret key
PAYSTACK_WEBHOOK_SECRET=your_secret_key   # Webhook verification secret
```

### 2.2 Signature Verification

Paystack uses HMAC-SHA512 signature verification via the `x-paystack-signature` header.

#### Verification Process

```typescript
// Implementation reference: backend/services/payment-service/src/domain/services/paystack-webhook.service.ts
const hash = crypto
  .createHmac('sha512', webhookSecret)
  .update(payload)  // Raw request body as string
  .digest('hex');

return hash === signature;
```

#### Required Headers

- `x-paystack-signature`: HMAC-SHA512 hex signature of raw request body
- `content-type`: `application/json`

### 2.3 Test Commands

#### Generate Test Signature

```bash
# Generate signature for testing (replace YOUR_SECRET with actual secret)
echo -n '{"event":"charge.success","data":{"reference":"test_ref_123","amount":500000,"currency":"NGN"}}' | \
  openssl dgst -sha512 -hmac "YOUR_SECRET" | \
  awk '{print $2}'
```

#### Test Webhook Endpoint

```bash
# Test charge.success event
PAYLOAD='{"event":"charge.success","data":{"id":123456,"domain":"test","status":"success","reference":"test_ref_123","amount":500000,"currency":"NGN","channel":"card","metadata":{"userId":"user_123","tier":"premium","billingCycle":"monthly"},"customer":{"id":12345,"email":"user@example.com","customer_code":"CUS_abc123"}}}'

SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha512 -hmac "YOUR_WEBHOOK_SECRET" | awk '{print $2}')

curl -X POST https://api.flamoral.com/api/v1/webhooks/paystack \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

#### Test Subscription Events

```bash
# Test subscription.create event
PAYLOAD='{"event":"subscription.create","data":{"subscription_code":"SUB_abc123","plan":{"id":123,"name":"Premium Monthly","plan_code":"PLN_premium","amount":500000,"interval":"monthly"},"metadata":{"userId":"user_123","tier":"premium"},"customer":{"email":"user@example.com"}}}'

SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha512 -hmac "YOUR_WEBHOOK_SECRET" | awk '{print $2}')

curl -X POST https://api.flamoral.com/api/v1/webhooks/paystack \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

### 2.4 Expected Responses

#### Success Response

```json
{
  "status": "success",
  "message": "Webhook processed successfully"
}
```

**HTTP Status:** `200 OK`

#### Duplicate Event Response

```json
{
  "status": "success",
  "message": "Event already processed",
  "duplicate": true
}
```

**HTTP Status:** `200 OK`

#### Signature Verification Failed

```json
{
  "error": "Invalid signature"
}
```

**HTTP Status:** `401 Unauthorized`

#### Missing Metadata

```json
{
  "error": "Missing required metadata: userId"
}
```

**HTTP Status:** `400 Bad Request`

### 2.5 Supported Event Types

#### Payment Events
- `charge.success` - Payment completed successfully
- `invoice.payment_failed` - Payment attempt failed

#### Subscription Events
- `subscription.create` - New subscription created
- `subscription.disable` - Subscription disabled
- `subscription.not_renew` - Subscription set to not renew

#### Invoice Events
- `invoice.create` - New invoice generated
- `invoice.update` - Invoice updated

#### Transfer Events
- `transfer.success` - Payout completed
- `transfer.failed` - Payout failed

#### Refund Events
- `refund.processed` - Refund completed

### 2.6 Transaction Verification

**Critical Security Step:** Always verify transactions with Paystack API

```bash
# Verify transaction API call
curl https://api.paystack.co/transaction/verify/REFERENCE \
  -H "Authorization: Bearer YOUR_SECRET_KEY"
```

```typescript
// Implementation pattern
const verifyResponse = await axios.get(
  `https://api.paystack.co/transaction/verify/${reference}`,
  { headers: { Authorization: `Bearer ${paystackSecretKey}` } }
);

if (verifyResponse.data.data.status !== 'success') {
  logger.warn('Transaction verification failed', { reference });
  return;
}
```

### 2.7 Amount Handling

**Important:** Paystack amounts are in kobo (Nigerian currency subunit)

- 1 Naira (NGN) = 100 kobo
- Convert for display: `amount / 100`
- Example: `500000 kobo = 5000 NGN`

```typescript
const amountInNaira = event.data.amount / 100;
```

### 2.8 Idempotency Requirements

**Implementation:** Event ID-based idempotency

```sql
-- Database table: paystack_webhook_events
CREATE TABLE paystack_webhook_events (
  paystack_event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(100),
  payload JSONB,
  status VARCHAR(50),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Process:**
1. Generate event ID from `reference` + `event` type
2. Check if event exists with status `processed`
3. Store event with status `pending`
4. Process event
5. Mark as `processed` or `failed` with retry count

### 2.9 Retry Handling

**Paystack Retry Policy:**
- Paystack retries failed webhooks up to 10 times
- Exponential backoff starting at 5 minutes
- Maximum retry period: 24 hours

**Internal Retry Strategy:**
```typescript
// Track retry count in database
await db('paystack_webhook_events')
  .where({ paystack_event_id: eventId })
  .update({
    status: 'failed',
    error_message: errorMessage,
    retry_count: db.raw('retry_count + 1'),
  });

// Background job retries failed events (max 5 internal retries)
```

### 2.10 Common Failure Modes

| Failure Mode | Symptom | Resolution |
|--------------|---------|------------|
| Invalid signature | 401 error, signature mismatch | Verify `PAYSTACK_WEBHOOK_SECRET` in dashboard |
| Missing secret | Warning logged, signature skipped | Add `PAYSTACK_WEBHOOK_SECRET` to environment |
| Verification failed | Transaction not verified | Check API connectivity to Paystack |
| Amount mismatch | Incorrect charge amount | Verify kobo conversion (divide by 100) |
| Missing userId | Processing skipped | Ensure `metadata.userId` included in payment |
| Duplicate reference | Multiple events for same transaction | Check event ID generation logic |

---

## 3. Flutterwave Webhooks

### 3.1 Endpoint Configuration

**Webhook URL:** `https://api.flamoral.com/api/v1/webhooks/flutterwave`

#### Required Environment Variables

```bash
FLUTTERWAVE_SECRET_KEY=FLWSECK-...           # Flutterwave API secret key
FLUTTERWAVE_WEBHOOK_SECRET=your_secret_hash   # Webhook verification hash
```

### 3.2 Signature Verification

Flutterwave uses a simpler verification approach via the `verif-hash` header.

#### Verification Process

```typescript
// Implementation reference: backend/services/payment-service/src/domain/services/flutterwave-webhook.service.ts
verifySignature(signature: string): boolean {
  return signature === this.webhookSecret;
}
```

**Note:** Flutterwave sends a static hash that matches your configured secret.

#### Required Headers

- `verif-hash`: Static secret hash configured in Flutterwave dashboard
- `content-type`: `application/json`

### 3.3 Test Commands

#### Test Webhook Endpoint

```bash
# Test charge.completed event
curl -X POST https://api.flamoral.com/api/v1/webhooks/flutterwave \
  -H "Content-Type: application/json" \
  -H "verif-hash: YOUR_WEBHOOK_SECRET" \
  -d '{
    "event": "charge.completed",
    "event.type": "CARD_TRANSACTION",
    "data": {
      "id": 12345,
      "tx_ref": "flamoral_tx_123456",
      "flw_ref": "FLW_REF_123456",
      "amount": 5000,
      "currency": "NGN",
      "charged_amount": 5000,
      "status": "successful",
      "payment_type": "card",
      "created_at": "2025-12-12T10:00:00.000Z",
      "meta": {
        "userId": "user_123",
        "tier": "premium",
        "billingCycle": "monthly"
      },
      "customer": {
        "id": 123,
        "name": "John Doe",
        "email": "john@example.com",
        "phone_number": "+2348012345678"
      }
    }
  }'
```

#### Test Subscription Events

```bash
# Test subscription.created event
curl -X POST https://api.flamoral.com/api/v1/webhooks/flutterwave \
  -H "Content-Type: application/json" \
  -H "verif-hash: YOUR_WEBHOOK_SECRET" \
  -d '{
    "event": "subscription.created",
    "data": {
      "id": 12345,
      "tx_ref": "flamoral_sub_123",
      "amount": 5000,
      "currency": "NGN",
      "status": "active",
      "plan": {
        "id": 100,
        "name": "Premium Monthly",
        "amount": 5000,
        "currency": "NGN",
        "interval": "monthly",
        "plan_token": "PLN_abc123"
      },
      "meta": {
        "userId": "user_123",
        "tier": "premium"
      }
    }
  }'
```

### 3.4 Expected Responses

#### Success Response

```json
{
  "status": "success",
  "message": "Webhook received and processed"
}
```

**HTTP Status:** `200 OK`

#### Duplicate Event Response

```json
{
  "status": "success",
  "message": "Event already processed",
  "duplicate": true
}
```

**HTTP Status:** `200 OK`

#### Signature Verification Failed

```json
{
  "error": "Invalid verification hash"
}
```

**HTTP Status:** `401 Unauthorized`

#### Processing Error

```json
{
  "error": "Failed to process webhook: [error message]"
}
```

**HTTP Status:** `500 Internal Server Error`

### 3.5 Supported Event Types

#### Payment Events
- `charge.completed` - Payment completed successfully

#### Subscription Events
- `subscription.created` - New subscription created
- `subscription.cancelled` - Subscription cancelled

#### Transfer Events
- `transfer.completed` - Payout successful
- `transfer.failed` - Payout failed

#### Refund Events
- `payment.refund.completed` - Refund processed

#### Plan Events
- `payment_plan.created` - Payment plan created

### 3.6 Transaction Verification

**Critical Security Step:** Always verify transactions with Flutterwave API

```bash
# Verify transaction API call
curl https://api.flutterwave.com/v3/transactions/TRANSACTION_ID/verify \
  -H "Authorization: Bearer YOUR_SECRET_KEY"
```

```typescript
// Implementation pattern
const verifyResponse = await axios.get(
  `https://api.flutterwave.com/v3/transactions/${event.data.id}/verify`,
  { headers: { Authorization: `Bearer ${flutterwaveSecretKey}` } }
);

if (verifyResponse.data.data.status !== 'successful') {
  logger.warn('Transaction verification failed', { tx_ref });
  return;
}
```

### 3.7 Transaction References

**Two Reference Types:**
- `tx_ref`: Your internal transaction reference (e.g., `flamoral_tx_123456`)
- `flw_ref`: Flutterwave's internal reference (e.g., `FLW_REF_123456`)

**Best Practice:** Use `tx_ref` for idempotency and tracking, `flw_ref` for Flutterwave API calls.

### 3.8 Idempotency Requirements

**Implementation:** Transaction reference-based idempotency

```sql
-- Database table: flutterwave_webhook_events
CREATE TABLE flutterwave_webhook_events (
  flutterwave_event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(100),
  payload JSONB,
  status VARCHAR(50),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Process:**
1. Generate event ID from `tx_ref` + `event` type
2. Check if event exists with status `processed`
3. Store event with status `pending`
4. Process event
5. Mark as `processed` or `failed`

### 3.9 Retry Handling

**Flutterwave Retry Policy:**
- Flutterwave retries failed webhooks for up to 24 hours
- Retry intervals: 5min, 30min, 1h, 3h, 6h, 12h, 24h
- After 24h, manual review required

**Internal Retry Strategy:**
```typescript
// Track retry attempts
await db('flutterwave_webhook_events')
  .where({ flutterwave_event_id: eventId })
  .update({
    status: 'failed',
    error_message: errorMessage,
    retry_count: db.raw('retry_count + 1'),
  });

// Background job retries up to 5 times with exponential backoff
```

### 3.10 Common Failure Modes

| Failure Mode | Symptom | Resolution |
|--------------|---------|------------|
| Invalid hash | 401 error, hash mismatch | Verify `FLUTTERWAVE_WEBHOOK_SECRET` matches dashboard |
| Missing secret | Warning logged, verification skipped | Add `FLUTTERWAVE_WEBHOOK_SECRET` to environment |
| Verification failed | Transaction not verified | Check API connectivity to Flutterwave |
| Missing metadata | Processing skipped | Ensure `meta.userId` included in payment |
| Duplicate tx_ref | Multiple events | Check tx_ref uniqueness |
| Status mismatch | Payment marked successful but isn't | Always verify via API before crediting |

---

## 4. General Webhook Security

### 4.1 Security Checklist

#### Pre-Production Verification

- [ ] All webhook secrets configured in environment variables
- [ ] Webhook endpoints use HTTPS only (TLS 1.2+)
- [ ] Signature verification enabled for all providers
- [ ] Raw request body preserved for signature verification
- [ ] No webhook secrets in source code or logs
- [ ] Rate limiting configured (100 requests/minute per IP)
- [ ] IP whitelisting enabled (optional but recommended)

#### Production Security

- [ ] Secrets stored in Azure Key Vault
- [ ] Webhook endpoints behind API Gateway
- [ ] DDoS protection enabled
- [ ] Request logging excludes sensitive data
- [ ] Failed webhook attempts monitored and alerted
- [ ] Signature verification failures logged and investigated
- [ ] Regular secret rotation schedule (quarterly)

### 4.2 IP Whitelisting (Optional)

#### Stripe IP Ranges

```
3.18.12.0/23
3.130.192.0/23
13.235.14.0/23
13.235.122.0/23
18.211.135.0/24
35.154.171.0/24
52.15.183.0/24
54.88.130.0/24
54.187.174.0/24
54.187.205.0/24
```

#### Paystack IP Ranges

```
52.31.139.75
52.49.173.169
52.214.14.220
```

#### Flutterwave IP Ranges

Contact Flutterwave support for current IP ranges.

### 4.3 Rate Limiting

**Recommended Limits:**
- 100 requests per minute per IP
- 1000 requests per hour per provider
- 10,000 requests per day per provider

**Implementation:**
```typescript
// Rate limiting in API Gateway
@UseGuards(ThrottlerGuard)
@Throttle(100, 60) // 100 requests per 60 seconds
async handleWebhook() { ... }
```

### 4.4 Request Body Handling

**Critical:** Preserve raw request body for signature verification

```typescript
// Express middleware configuration
app.use(
  '/api/webhooks',
  express.raw({ type: 'application/json' })
);

// Access raw body
const rawBody = req.body.toString('utf8');
```

### 4.5 Logging Best Practices

**DO Log:**
- Event type and ID
- Timestamp
- Processing status
- Transaction reference
- User ID (hashed if PII concern)

**DO NOT Log:**
- Full request body (may contain PII)
- Card details
- Customer email addresses
- Webhook secrets
- Full signatures

**Example:**
```typescript
logger.info('Webhook processed', {
  provider: 'stripe',
  eventType: 'payment_intent.succeeded',
  eventId: 'evt_123',
  userId: hashUserId(userId),
  status: 'success',
  processingTime: '125ms'
});
```

---

## 5. Monitoring & Alerting

### 5.1 Key Metrics to Monitor

#### Success Metrics
- **Webhook Success Rate:** Target > 99.5%
- **Average Processing Time:** Target < 500ms
- **Idempotency Hit Rate:** % of duplicate events correctly rejected

#### Error Metrics
- **Signature Verification Failures:** Alert if > 5 per hour
- **Processing Errors:** Alert if > 10 per hour
- **Database Connection Failures:** Alert immediately
- **API Verification Failures:** Alert if > 5% of events

#### Performance Metrics
- **p95 Processing Time:** Target < 1000ms
- **p99 Processing Time:** Target < 2000ms
- **Queue Depth:** For async processing (if implemented)

### 5.2 Alert Configuration

#### Critical Alerts (Immediate Response)

```yaml
# Signature verification failures spike
alert: webhook_signature_failures
condition: rate(signature_failures[5m]) > 10
severity: critical
notify: #oncall-payments, #security

# Database unavailable
alert: webhook_db_connection_failure
condition: database_errors > 0
severity: critical
notify: #oncall-platform, #oncall-payments

# Payment processing stopped
alert: webhook_zero_success
condition: successful_webhooks[10m] == 0 AND expected_volume > 0
severity: critical
notify: #oncall-payments
```

#### Warning Alerts

```yaml
# Elevated error rate
alert: webhook_error_rate_high
condition: error_rate > 5%
severity: warning
notify: #payments-team

# Slow processing
alert: webhook_processing_slow
condition: p95_latency > 2000ms
severity: warning
notify: #platform-team

# Retry queue building
alert: webhook_retry_queue_high
condition: retry_queue_depth > 100
severity: warning
notify: #payments-team
```

### 5.3 Dashboard Widgets

**Payment Webhooks Dashboard:**
1. Webhook volume by provider (last 24h)
2. Success rate by provider (last 7d)
3. Error breakdown by type (last 24h)
4. Processing time percentiles (p50, p95, p99)
5. Retry queue depth
6. Recent signature verification failures (last 1h)
7. Recent processing errors with stack traces

### 5.4 Health Check Endpoints

```bash
# Check webhook service health
GET /api/health/webhooks

# Response
{
  "status": "healthy",
  "providers": {
    "stripe": {
      "configured": true,
      "lastEvent": "2025-12-12T10:30:00Z",
      "successRate24h": 99.8
    },
    "paystack": {
      "configured": true,
      "lastEvent": "2025-12-12T10:25:00Z",
      "successRate24h": 99.5
    },
    "flutterwave": {
      "configured": true,
      "lastEvent": "2025-12-12T10:20:00Z",
      "successRate24h": 99.9
    }
  },
  "database": {
    "connected": true,
    "latency": "12ms"
  }
}
```

---

## 6. Troubleshooting Guide

### 6.1 Signature Verification Failures

#### Stripe

**Symptom:** `Webhook Error: No signatures found matching the expected signature`

**Causes:**
1. Incorrect `STRIPE_WEBHOOK_SECRET`
2. Request body modified before verification
3. Webhook secret rotated but not updated

**Resolution:**
```bash
# Step 1: Get current webhook secret from Stripe Dashboard
# https://dashboard.stripe.com/webhooks

# Step 2: Verify environment variable
echo $STRIPE_WEBHOOK_SECRET

# Step 3: Test with Stripe CLI
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
stripe trigger payment_intent.succeeded

# Step 4: Check request body handling
# Ensure raw body preserved for signature verification
```

#### Paystack

**Symptom:** `Invalid signature` or signature mismatch

**Causes:**
1. Incorrect `PAYSTACK_WEBHOOK_SECRET`
2. Character encoding issues
3. Request body parsed before signature verification

**Resolution:**
```bash
# Step 1: Get webhook secret from Paystack Dashboard
# https://dashboard.paystack.com/#/settings/developer

# Step 2: Test signature generation locally
PAYLOAD='{"event":"charge.success","data":{"reference":"test"}}'
echo -n "$PAYLOAD" | openssl dgst -sha512 -hmac "YOUR_SECRET" | awk '{print $2}'

# Step 3: Compare with header signature
# Should match exactly

# Step 4: Check for whitespace or encoding issues
# Use raw body, no JSON parsing before verification
```

#### Flutterwave

**Symptom:** `Invalid verification hash`

**Causes:**
1. Incorrect `FLUTTERWAVE_WEBHOOK_SECRET`
2. Hash not sent in `verif-hash` header

**Resolution:**
```bash
# Step 1: Get webhook hash from Flutterwave Dashboard
# https://dashboard.flutterwave.com/settings/webhooks

# Step 2: Verify exact match
curl -X POST https://api.flamoral.com/api/v1/webhooks/flutterwave \
  -H "verif-hash: YOUR_EXACT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"event":"charge.completed","data":{"id":123}}'

# Step 3: Check header name
# Must be exactly: verif-hash (lowercase, with hyphen)
```

### 6.2 Duplicate Event Issues

**Symptom:** Same event processed multiple times

**Diagnosis:**
```sql
-- Check for duplicate events
SELECT
  event_type,
  stripe_event_id,
  COUNT(*) as count,
  status
FROM stripe_webhook_events
GROUP BY event_type, stripe_event_id, status
HAVING COUNT(*) > 1;

-- Check for failed idempotency
SELECT * FROM stripe_webhook_events
WHERE stripe_event_id = 'evt_123'
ORDER BY created_at DESC;
```

**Resolution:**
1. Verify idempotency key uniqueness
2. Check database constraints (unique index on event ID)
3. Ensure atomic read-check-insert operation
4. Review concurrent request handling

### 6.3 Transaction Not Crediting User

**Symptom:** Payment successful but user not credited

**Diagnosis Checklist:**
1. [ ] Check webhook received
   ```sql
   SELECT * FROM stripe_webhook_events
   WHERE payload->>'data'->>'id' = 'pi_123';
   ```

2. [ ] Check event processing status
   ```sql
   SELECT status, error_message
   FROM stripe_webhook_events
   WHERE stripe_event_id = 'evt_123';
   ```

3. [ ] Check transaction record created
   ```sql
   SELECT * FROM transactions
   WHERE metadata->>'stripePaymentId' = 'pi_123';
   ```

4. [ ] Check user balance updated
   ```sql
   SELECT coin_balance FROM users WHERE id = 'user_123';
   ```

5. [ ] Check subscription status updated
   ```sql
   SELECT * FROM user_subscriptions
   WHERE user_id = 'user_123'
   ORDER BY created_at DESC LIMIT 1;
   ```

**Common Issues:**
- Missing `userId` in payment metadata
- User service call failed
- Database transaction rollback
- Notification service failure (doesn't affect credit, but user not notified)

**Resolution:**
```bash
# Manually reprocess event
POST /api/admin/webhooks/reprocess
{
  "provider": "stripe",
  "eventId": "evt_123"
}

# Or credit manually
POST /api/admin/users/:userId/credits
{
  "amount": 1000,
  "type": "manual_adjustment",
  "reason": "Webhook processing failed for pi_123"
}
```

### 6.4 High Retry Queue

**Symptom:** Retry queue depth increasing

**Diagnosis:**
```sql
-- Check failed events by error type
SELECT
  error_message,
  COUNT(*) as count,
  MAX(retry_count) as max_retries
FROM stripe_webhook_events
WHERE status = 'failed'
GROUP BY error_message
ORDER BY count DESC;

-- Check oldest pending events
SELECT *
FROM stripe_webhook_events
WHERE status IN ('pending', 'failed')
ORDER BY created_at ASC
LIMIT 10;
```

**Common Causes:**
- Database connection issues
- User service unavailable
- Invalid event data
- Timeout errors

**Resolution:**
1. Fix underlying issue (DB, service availability)
2. Increase retry backoff
3. Add dead letter queue for manual review
4. Clear old failed events after investigation

### 6.5 Missing Metadata

**Symptom:** `Missing required metadata: userId`

**Cause:** Payment created without required metadata

**Prevention:**
```typescript
// Always include metadata in payment creation
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
  metadata: {
    userId: user.id,
    tier: 'premium',
    billingCycle: 'monthly',
  },
});

// Paystack
const payment = await paystack.transaction.initialize({
  amount: 500000,
  email: user.email,
  metadata: {
    userId: user.id,
    tier: 'premium',
  },
});

// Flutterwave
const payment = {
  tx_ref: generateTxRef(),
  amount: 5000,
  currency: 'NGN',
  meta: {
    userId: user.id,
    tier: 'premium',
  },
};
```

**Recovery:**
```sql
-- Find user from email in payment data
SELECT u.id as user_id, t.*
FROM transactions t
LEFT JOIN users u ON u.email = t.customer_email
WHERE t.status = 'pending'
AND t.metadata->>'userId' IS NULL;

-- Manual credit after verification
```

### 6.6 Performance Issues

**Symptom:** Slow webhook processing (> 2s)

**Diagnosis:**
```typescript
// Add timing logs
const startTime = Date.now();
logger.info('Webhook processing started', { eventId });

// ... processing ...

logger.info('Webhook processing completed', {
  eventId,
  duration: Date.now() - startTime,
});
```

**Common Bottlenecks:**
1. Database queries (missing indexes)
2. External API calls (user service, notification service)
3. Large payload parsing
4. Synchronous processing

**Optimizations:**
1. Add database indexes on frequently queried columns
2. Use async processing for non-critical operations
3. Implement connection pooling
4. Cache frequently accessed data
5. Move heavy operations to background jobs

```typescript
// Async pattern
async handleWebhook(event) {
  // Critical: Verify signature, check idempotency
  await verifySignature();
  await checkDuplicate();

  // Store for async processing
  await storeEvent(event);

  // Queue background job
  await queue.add('process-webhook', { eventId: event.id });

  // Return quickly
  return { received: true };
}
```

---

## 7. Testing Procedures

### 7.1 Local Development Testing

#### Setup Test Environment

```bash
# Install webhook testing tools
npm install --save-dev @stripe/stripe-js
npm install -g stripe

# Set test environment variables
export STRIPE_SECRET_KEY=sk_test_...
export STRIPE_WEBHOOK_SECRET=whsec_test_...
export PAYSTACK_SECRET_KEY=sk_test_...
export PAYSTACK_WEBHOOK_SECRET=test_secret
export FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
export FLUTTERWAVE_WEBHOOK_SECRET=test_hash
```

#### Test Each Provider

```bash
# Stripe - Use Stripe CLI
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created

# Paystack - Manual curl
./scripts/test-paystack-webhook.sh

# Flutterwave - Manual curl
./scripts/test-flutterwave-webhook.sh
```

### 7.2 Staging Environment Testing

```bash
# Test staging webhooks
# 1. Create test payment in provider dashboard
# 2. Set webhook URL to staging: https://staging.api.flamoral.com/api/v1/webhooks/stripe
# 3. Trigger test events
# 4. Verify in staging database

# Check webhook event received
psql -h staging-db -d flamoral -c "SELECT * FROM stripe_webhook_events ORDER BY created_at DESC LIMIT 5;"

# Check transaction created
psql -h staging-db -d flamoral -c "SELECT * FROM transactions WHERE user_id = 'test_user_id' ORDER BY created_at DESC LIMIT 5;"
```

### 7.3 Production Verification

**Checklist before going live:**

- [ ] Webhook URLs configured in all provider dashboards
- [ ] Production secrets in Azure Key Vault
- [ ] Database tables created with proper indexes
- [ ] Monitoring and alerts configured
- [ ] Test events sent and processed successfully
- [ ] Error handling tested (invalid signature, duplicate events)
- [ ] Idempotency tested (send same event twice)
- [ ] Performance tested (can handle 100 webhooks/minute)
- [ ] Security review completed
- [ ] Runbook created for on-call team

---

## 8. Maintenance Schedule

### 8.1 Daily Tasks

- [ ] Check webhook success rate dashboard
- [ ] Review failed webhook events (if any)
- [ ] Monitor retry queue depth

### 8.2 Weekly Tasks

- [ ] Review webhook error logs
- [ ] Check for new event types from providers
- [ ] Verify monitoring alerts functioning
- [ ] Review performance metrics

### 8.3 Monthly Tasks

- [ ] Review and update this checklist
- [ ] Test webhook failover scenarios
- [ ] Audit webhook security configuration
- [ ] Review provider documentation for changes

### 8.4 Quarterly Tasks

- [ ] Rotate webhook secrets
- [ ] Security audit of webhook handling
- [ ] Load testing
- [ ] Review and optimize database indexes
- [ ] Update integration tests

---

## 9. Emergency Procedures

### 9.1 Webhook Outage

**If webhooks stop working:**

1. **Immediate:** Check provider status pages
   - Stripe: https://status.stripe.com
   - Paystack: https://status.paystack.com
   - Flutterwave: Check their support channels

2. **Verify:** Check application health
   ```bash
   curl https://api.flamoral.com/api/health/webhooks
   ```

3. **Investigate:** Check recent deployments or config changes

4. **Temporary Fix:** Enable manual payment verification
   ```sql
   -- Flag for manual review
   UPDATE transactions
   SET status = 'pending_manual_review'
   WHERE status = 'pending'
   AND created_at > NOW() - INTERVAL '1 hour';
   ```

5. **Recover:** Backfill missed webhooks
   ```bash
   # Stripe - List recent events
   stripe events list --limit 100

   # Manually replay
   POST /api/admin/webhooks/replay
   {
     "provider": "stripe",
     "eventIds": ["evt_123", "evt_456"]
   }
   ```

### 9.2 Security Breach

**If webhook secrets compromised:**

1. **Immediately:** Rotate all webhook secrets
2. **Verify:** Check for suspicious transactions in last 24h
3. **Audit:** Review all webhook events in breach window
4. **Report:** File incident report
5. **Update:** Change secrets in all environments

---

## 10. Reference Links

### Official Documentation

- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Paystack Webhooks](https://paystack.com/docs/payments/webhooks/)
- [Flutterwave Webhooks](https://developer.flutterwave.com/docs/integration-guides/webhooks)

### Internal Documentation

- `backend/services/payment-service/src/api/controllers/webhook.controller.ts` - Stripe webhook handler
- `backend/services/payment-service/src/domain/services/paystack-webhook.service.ts` - Paystack webhook service
- `backend/services/payment-service/src/domain/services/flutterwave-webhook.service.ts` - Flutterwave webhook service
- `backend/services/api-gateway/src/controllers/payment.controller.ts` - Payment gateway routing

### Support Contacts

- **Stripe Support:** https://support.stripe.com
- **Paystack Support:** support@paystack.com
- **Flutterwave Support:** hi@flutterwavego.com
- **Internal Payments Team:** #payments-team (Slack)
- **On-Call Engineer:** #oncall-payments (Slack)

---

## Appendix A: Webhook Event Database Schema

```sql
-- Stripe webhook events
CREATE TABLE stripe_webhook_events (
  stripe_event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stripe_events_status ON stripe_webhook_events(status);
CREATE INDEX idx_stripe_events_created ON stripe_webhook_events(created_at);
CREATE INDEX idx_stripe_events_type ON stripe_webhook_events(event_type);

-- Paystack webhook events
CREATE TABLE paystack_webhook_events (
  paystack_event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_paystack_events_status ON paystack_webhook_events(status);
CREATE INDEX idx_paystack_events_created ON paystack_webhook_events(created_at);
CREATE INDEX idx_paystack_events_type ON paystack_webhook_events(event_type);

-- Flutterwave webhook events
CREATE TABLE flutterwave_webhook_events (
  flutterwave_event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_flutterwave_events_status ON flutterwave_webhook_events(status);
CREATE INDEX idx_flutterwave_events_created ON flutterwave_webhook_events(created_at);
CREATE INDEX idx_flutterwave_events_type ON flutterwave_webhook_events(event_type);
```

---

## Appendix B: Test Webhook Scripts

### test-stripe-webhook.sh

```bash
#!/bin/bash
# Test Stripe webhook locally

# Requires Stripe CLI: https://stripe.com/docs/stripe-cli

echo "Starting Stripe webhook listener..."
echo "Make sure payment service is running on http://localhost:3000"

stripe listen --forward-to http://localhost:3000/api/webhooks/stripe

# In another terminal, trigger events:
# stripe trigger payment_intent.succeeded
# stripe trigger customer.subscription.created
```

### test-paystack-webhook.sh

```bash
#!/bin/bash
# Test Paystack webhook locally

WEBHOOK_URL="http://localhost:3000/api/webhooks/paystack"
WEBHOOK_SECRET="your_test_secret"

PAYLOAD='{
  "event": "charge.success",
  "data": {
    "id": 123456,
    "reference": "test_ref_'$(date +%s)'",
    "amount": 500000,
    "currency": "NGN",
    "status": "success",
    "metadata": {
      "userId": "test_user_123",
      "tier": "premium"
    },
    "customer": {
      "email": "test@example.com"
    }
  }
}'

SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha512 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')

curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: $SIGNATURE" \
  -d "$PAYLOAD" \
  -v
```

### test-flutterwave-webhook.sh

```bash
#!/bin/bash
# Test Flutterwave webhook locally

WEBHOOK_URL="http://localhost:3000/api/webhooks/flutterwave"
WEBHOOK_SECRET="your_test_hash"

PAYLOAD='{
  "event": "charge.completed",
  "data": {
    "id": 12345,
    "tx_ref": "flamoral_test_'$(date +%s)'",
    "flw_ref": "FLW_TEST_'$(date +%s)'",
    "amount": 5000,
    "currency": "NGN",
    "status": "successful",
    "meta": {
      "userId": "test_user_123",
      "tier": "premium"
    },
    "customer": {
      "email": "test@example.com"
    }
  }
}'

curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "verif-hash: $WEBHOOK_SECRET" \
  -d "$PAYLOAD" \
  -v
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-12
**Next Review:** 2025-01-12
**Owner:** Platform Security & Payments Team
