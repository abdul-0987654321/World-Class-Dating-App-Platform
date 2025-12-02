# Stripe Webhook Setup Guide

## Overview

This guide explains how to set up and configure Stripe webhooks for the Dating App payment service. Webhooks are essential for handling real-time payment events, subscription changes, and ensuring data consistency between Stripe and your application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Stripe Dashboard Setup](#stripe-dashboard-setup)
4. [Local Development Setup](#local-development-setup)
5. [Production Deployment](#production-deployment)
6. [Webhook Events](#webhook-events)
7. [Security Best Practices](#security-best-practices)
8. [Testing Webhooks](#testing-webhooks)
9. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)

## Prerequisites

- Stripe account (test and production)
- Node.js 18+ installed
- PostgreSQL database configured
- SSL certificate for production (webhooks require HTTPS)

## Environment Configuration

Add the following environment variables to your `.env` file:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... # Test key for development
STRIPE_PUBLISHABLE_KEY=pk_test_... # Test publishable key

# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook signing secret from Stripe Dashboard

# Service URLs
USER_SERVICE_URL=http://localhost:3001
NOTIFICATION_SERVICE_URL=http://localhost:3008

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dating_app_payment

# Node Environment
NODE_ENV=development # or production
PORT=3003
```

## Stripe Dashboard Setup

### Step 1: Create Webhook Endpoint

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**

### Step 2: Configure Endpoint URL

**For Development:**
```
Use Stripe CLI (see Local Development Setup section)
```

**For Production:**
```
https://your-domain.com/api/webhooks/stripe
```

### Step 3: Select Events to Listen

Select the following events (or click "Select all" for comprehensive coverage):

#### Subscription Events (Critical)
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`
- `customer.subscription.pending_update_applied`
- `customer.subscription.pending_update_expired`

#### Payment Events (Critical)
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `payment_intent.requires_action`

#### Invoice Events (Critical)
- `invoice.paid`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `invoice.payment_action_required`
- `invoice.upcoming`
- `invoice.finalized`

#### Checkout Events (Important)
- `checkout.session.completed`
- `checkout.session.expired`

#### Customer Events (Important)
- `customer.created`
- `customer.updated`
- `customer.deleted`

#### Charge Events (Important)
- `charge.succeeded`
- `charge.failed`
- `charge.refunded`
- `charge.dispute.created`

#### Payment Method Events (Optional but Recommended)
- `payment_method.attached`
- `payment_method.detached`

### Step 4: Get Webhook Signing Secret

1. After creating the endpoint, click on it to view details
2. Click **Reveal** in the "Signing secret" section
3. Copy the secret (starts with `whsec_`)
4. Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`

## Local Development Setup

### Using Stripe CLI (Recommended)

1. **Install Stripe CLI:**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Windows
   scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
   scoop install stripe

   # Linux
   wget https://github.com/stripe/stripe-cli/releases/download/vX.X.X/stripe_X.X.X_linux_x86_64.tar.gz
   tar -xvf stripe_X.X.X_linux_x86_64.tar.gz
   ```

2. **Authenticate with Stripe:**
   ```bash
   stripe login
   ```

3. **Forward webhooks to local server:**
   ```bash
   stripe listen --forward-to localhost:3003/api/webhooks/stripe
   ```

4. **Copy the webhook signing secret:**
   The CLI will display a signing secret (starts with `whsec_`). Add it to your `.env` file.

5. **Trigger test events:**
   ```bash
   # In a new terminal window
   stripe trigger payment_intent.succeeded
   stripe trigger customer.subscription.created
   stripe trigger invoice.payment_failed
   ```

### Manual ngrok Setup (Alternative)

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Start ngrok tunnel:**
   ```bash
   ngrok http 3003
   ```

3. **Use the HTTPS URL in Stripe Dashboard:**
   ```
   https://your-unique-id.ngrok.io/api/webhooks/stripe
   ```

## Production Deployment

### Pre-deployment Checklist

- [ ] SSL certificate installed and valid
- [ ] Environment variables configured in production
- [ ] Database migrations run successfully
- [ ] Production Stripe API keys configured
- [ ] Webhook endpoint is publicly accessible
- [ ] CORS configured if needed
- [ ] Rate limiting configured

### Production Setup Steps

1. **Update Stripe Dashboard:**
   - Use production API keys
   - Add production webhook endpoint URL
   - Select same events as test mode
   - Copy production webhook signing secret

2. **Deploy Application:**
   ```bash
   # Build the application
   npm run build

   # Run database migrations
   npm run migrate:up

   # Start the production server
   npm run start:prod
   ```

3. **Verify Webhook Endpoint:**
   - Send a test webhook from Stripe Dashboard
   - Check application logs for successful processing
   - Verify event appears in `stripe_webhook_events` table

## Webhook Events

### Event Processing Flow

```
Stripe → Webhook Endpoint → Signature Verification → Idempotency Check → Event Storage → Event Processing → Database Update → User Service Sync → Notification
```

### Event Handlers

Each webhook event is processed by a dedicated handler:

| Event Type | Handler Method | Description |
|------------|----------------|-------------|
| `customer.subscription.created` | `handleSubscriptionCreated` | New subscription created |
| `customer.subscription.updated` | `handleSubscriptionUpdated` | Subscription modified (plan change, status change) |
| `customer.subscription.deleted` | `handleSubscriptionDeleted` | Subscription canceled |
| `customer.subscription.trial_will_end` | `handleTrialWillEnd` | Trial ending soon (3 days notice) |
| `payment_intent.succeeded` | `handlePaymentIntentSucceeded` | Payment successful (coins, boosts, one-time) |
| `payment_intent.payment_failed` | `handlePaymentIntentFailed` | Payment declined or failed |
| `invoice.paid` | `handleInvoicePaymentSucceeded` | Subscription payment successful |
| `invoice.payment_failed` | `handleInvoicePaymentFailed` | Subscription payment failed (grace period starts) |
| `charge.refunded` | `handleChargeRefunded` | Refund processed (revoke features) |
| `charge.dispute.created` | `handleDisputeCreated` | Chargeback/dispute filed |

### Idempotency

All webhook events are checked for duplicate processing:

1. Event received → Check `stripe_webhook_events` table
2. If `stripe_event_id` exists with status `processed` → Return success (200)
3. If new event → Store in database with status `pending`
4. Process event → Update status to `processed`
5. If error → Update status to `failed` and increment `retry_count`

### Retry Logic

Failed events are automatically retried with exponential backoff:

- **Retry 1:** 1 minute after failure
- **Retry 2:** 5 minutes after retry 1
- **Retry 3:** 15 minutes after retry 2
- **Retry 4:** 1 hour after retry 3
- **Retry 5:** 2 hours after retry 4
- **After 5 retries:** Marked as `permanently_failed` and admin is notified

Run the retry service with a cron job:
```bash
# Add to crontab (runs every 5 minutes)
*/5 * * * * cd /path/to/app && node dist/scripts/process-failed-webhooks.js
```

## Security Best Practices

### 1. Signature Verification

Always verify webhook signatures to ensure events are from Stripe:

```typescript
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### 2. Use Raw Body

Stripe signature verification requires the raw request body:

```typescript
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
```

### 3. HTTPS Only

Production webhooks MUST use HTTPS:
- Stripe will not send webhooks to HTTP endpoints in production
- Use a valid SSL certificate (Let's Encrypt recommended)

### 4. IP Whitelisting (Optional)

For additional security, whitelist Stripe's webhook IPs:

```
# Stripe webhook IPs (as of 2025)
3.18.12.63
3.130.192.231
13.235.14.237
13.235.122.149
...
# See: https://stripe.com/docs/ips
```

### 5. Environment Variables

Never hardcode secrets in code:
- Use environment variables for webhook secrets
- Rotate secrets periodically
- Use different secrets for test and production

### 6. Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
import rateLimit from 'express-rate-limit';

const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
});

app.use('/api/webhooks/stripe', webhookLimiter);
```

## Testing Webhooks

### Test with Stripe CLI

```bash
# Trigger specific events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed

# Test with custom metadata
stripe trigger payment_intent.succeeded \
  --add payment_intent:metadata[user_id]=test_user_123 \
  --add payment_intent:metadata[type]=coin_purchase \
  --add payment_intent:metadata[package_id]=pkg_50coins
```

### Test with Stripe Dashboard

1. Go to **Developers** → **Webhooks** → Select your endpoint
2. Click **Send test webhook**
3. Select event type
4. Customize payload if needed
5. Send

### Integration Tests

```typescript
// Example test
describe('Webhook Processing', () => {
  it('should process subscription.created event', async () => {
    const event = {
      id: 'evt_test_123',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_test_123',
          customer: 'cus_test_123',
          // ... subscription data
        }
      }
    };

    const response = await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', generateTestSignature(event))
      .send(event);

    expect(response.status).toBe(200);
  });
});
```

## Monitoring and Troubleshooting

### View Webhook Logs in Stripe Dashboard

1. Go to **Developers** → **Webhooks**
2. Click on your endpoint
3. View recent webhook attempts (successful and failed)
4. Click on individual events to see request/response

### Application Logging

Check application logs for webhook processing:

```bash
# View real-time logs
tail -f /var/log/payment-service/webhook.log

# Search for specific event
grep "evt_1AbCdEfGh" /var/log/payment-service/webhook.log

# Check failed events
grep "ERROR.*webhook" /var/log/payment-service/webhook.log
```

### Database Queries

```sql
-- Check recent webhook events
SELECT stripe_event_id, event_type, status, retry_count, created_at
FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 100;

-- Find failed events
SELECT stripe_event_id, event_type, error_message, retry_count
FROM stripe_webhook_events
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Check permanently failed events
SELECT stripe_event_id, event_type, error_message
FROM stripe_webhook_events
WHERE status = 'permanently_failed';

-- Webhook statistics
SELECT
  event_type,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'processed' THEN 1 ELSE 0 END) as processed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM stripe_webhook_events
GROUP BY event_type;
```

### Common Issues

#### Issue: Signature verification failed

**Cause:** Wrong webhook secret or body parser issue

**Solution:**
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Ensure using `express.raw()` for webhook endpoint
- Check Stripe Dashboard for correct signing secret

#### Issue: Duplicate event processing

**Cause:** Idempotency check not working

**Solution:**
- Check database index on `stripe_event_id`
- Verify `isEventProcessed` method is called
- Review transaction isolation level

#### Issue: Events timing out

**Cause:** Long-running synchronous operations

**Solution:**
- Make webhook handler asynchronous
- Use background job queue for heavy processing
- Return 200 response quickly, process in background

#### Issue: Failed payments not retrying

**Cause:** Retry service not running

**Solution:**
- Check cron job is configured
- Verify retry service is executing
- Check database for failed events

### Performance Monitoring

```sql
-- Average processing time by event type
SELECT
  event_type,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_seconds,
  MAX(EXTRACT(EPOCH FROM (processed_at - created_at))) as max_seconds
FROM stripe_webhook_events
WHERE status = 'processed'
GROUP BY event_type
ORDER BY avg_seconds DESC;
```

## Support

For issues or questions:

1. Check [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
2. Review application logs and database
3. Test with Stripe CLI
4. Contact support team with event ID and error details

## Changelog

- **v1.0.0** (2025-01-25): Initial webhook implementation
  - All critical events supported
  - Idempotency and retry logic
  - Grace period for failed payments
  - Refund handling with feature revocation
