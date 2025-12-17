# Stripe Webhook Testing Guide

This guide covers how to test Stripe webhooks in the payment service.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Setting Up Webhooks](#setting-up-webhooks)
3. [Local Testing with Stripe CLI](#local-testing-with-stripe-cli)
4. [Testing Webhook Events](#testing-webhook-events)
5. [Verifying Webhook Processing](#verifying-webhook-processing)
6. [Common Issues](#common-issues)

## Prerequisites

- Stripe account (test mode)
- Stripe CLI installed
- Payment service running locally
- PostgreSQL database running

## Setting Up Webhooks

### 1. Install Stripe CLI

**Windows:**
```bash
# Using Scoop
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# Download the latest release
wget https://github.com/stripe/stripe-cli/releases/download/vX.X.X/stripe_X.X.X_linux_x86_64.tar.gz
tar -xvf stripe_X.X.X_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

### 2. Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authorize the CLI.

### 3. Configure Environment Variables

Update your `.env` file with the webhook secret from Stripe CLI:

```env
# Get this secret from `stripe listen --print-secret`
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

## Local Testing with Stripe CLI

### Start Webhook Forwarding

Forward Stripe webhook events to your local server:

```bash
stripe listen --forward-to localhost:3005/api/webhooks/stripe
```

You'll see output like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

Copy this webhook secret to your `.env` file.

### Keep the Listener Running

Keep this terminal window open while testing. The listener will forward all Stripe events to your local server.

## Testing Webhook Events

### 1. Test Subscription Events

**Create a subscription:**
```bash
stripe trigger customer.subscription.created
```

**Update a subscription:**
```bash
stripe trigger customer.subscription.updated
```

**Delete a subscription:**
```bash
stripe trigger customer.subscription.deleted
```

**Trial ending:**
```bash
stripe trigger customer.subscription.trial_will_end
```

### 2. Test Payment Events

**Successful payment:**
```bash
stripe trigger payment_intent.succeeded
```

**Failed payment:**
```bash
stripe trigger payment_intent.payment_failed
```

**Payment requires action:**
```bash
stripe trigger payment_intent.requires_action
```

### 3. Test Invoice Events

**Invoice paid:**
```bash
stripe trigger invoice.payment_succeeded
```

**Invoice payment failed:**
```bash
stripe trigger invoice.payment_failed
```

**Upcoming invoice:**
```bash
stripe trigger invoice.upcoming
```

### 4. Test Refund Events

**Refund created:**
```bash
stripe trigger refund.created
```

**Charge refunded:**
```bash
stripe trigger charge.refunded
```

### 5. Test Checkout Events

**Checkout completed:**
```bash
stripe trigger checkout.session.completed
```

**Checkout expired:**
```bash
stripe trigger checkout.session.expired
```

## Verifying Webhook Processing

### 1. Check Logs

The payment service logs all webhook events:

```bash
# Terminal running the payment service
[payment-service] INFO: Webhook event received: evt_xxxxxxxxxxxxx
[payment-service] INFO: Processing subscription created: sub_xxxxxxxxxxxxx
[payment-service] INFO: Subscription created for user xxxxx: premium (active)
```

### 2. Check Database

Query the webhook events table:

```sql
-- View recent webhook events
SELECT
  stripe_event_id,
  event_type,
  status,
  created_at,
  processed_at,
  error_message
FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 10;

-- Check for failed events
SELECT * FROM stripe_webhook_events
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Check event processing stats
SELECT
  status,
  COUNT(*) as count
FROM stripe_webhook_events
GROUP BY status;
```

### 3. Check Transaction Records

Verify that transactions were created:

```sql
-- View recent transactions
SELECT
  id,
  user_id,
  type,
  status,
  amount,
  currency,
  description,
  processed_at
FROM transactions
ORDER BY created_at DESC
LIMIT 10;
```

### 4. Check Subscription Records

Verify subscription updates:

```sql
-- View active subscriptions
SELECT
  us.user_id,
  sp.name as plan_name,
  us.status,
  us.current_period_start,
  us.current_period_end,
  us.stripe_subscription_id
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
ORDER BY us.created_at DESC;
```

## Testing Custom Scenarios

### Create a Test Customer and Subscription

```bash
# Create a customer
stripe customers create --email="test@example.com" --name="Test User"

# Create a subscription for the customer
stripe subscriptions create \
  --customer=cus_xxxxxxxxxxxxx \
  --items='[{"price": "price_xxxxxxxxxxxxx"}]' \
  --metadata='{"user_id": "test-user-123", "tier": "premium"}'
```

### Simulate Payment Failures

```bash
# Create a payment intent that will fail
stripe payment_intents create \
  --amount=2000 \
  --currency=usd \
  --payment-method=pm_card_chargeDeclined \
  --confirm=true \
  --metadata='{"user_id": "test-user-123", "type": "coin_purchase"}'
```

### Test Webhook Retry Logic

```bash
# Stop your payment service
# Trigger an event
stripe trigger payment_intent.succeeded

# Start your payment service
# The webhook will be retried by Stripe automatically
```

## Production Webhook Setup

### 1. Create Webhook in Stripe Dashboard

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your production webhook URL:
   ```
   https://yourdomain.com/api/webhooks/stripe
   ```

4. Select events to listen for:
   - `customer.subscription.*`
   - `payment_intent.*`
   - `invoice.*`
   - `checkout.session.*`
   - `charge.*`
   - `refund.*`
   - `payment_method.*`

5. Click **Add endpoint**

### 2. Configure Production Webhook Secret

1. Copy the **Signing secret** from the webhook details page
2. Add it to your production environment variables:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_production_secret_here
   ```

### 3. Test Production Webhooks

Use Stripe CLI to forward events to production:

```bash
stripe listen --forward-to https://yourdomain.com/api/webhooks/stripe
```

Or trigger test events directly from the Stripe Dashboard.

## Common Issues

### Issue 1: Webhook Signature Verification Failed

**Error:**
```
Webhook signature verification failed: No signatures found matching the expected signature
```

**Solution:**
- Ensure `STRIPE_WEBHOOK_SECRET` is set correctly
- Make sure you're using the raw request body (not parsed JSON)
- Check that the webhook endpoint uses `express.raw()` middleware

### Issue 2: Duplicate Events

**Error:**
```
Duplicate webhook event: evt_xxxxxxxxxxxxx
```

**Solution:**
This is normal - Stripe may send the same event multiple times. The payment service handles idempotency automatically.

### Issue 3: Database Connection Failed

**Error:**
```
Database connection failed: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Run migrations: `npm run migrate`

### Issue 4: Event Not Processed

**Error:**
```
Plan not found for price ID: price_xxxxxxxxxxxxx
```

**Solution:**
- Ensure subscription plans are seeded in the database
- Map Stripe price IDs to your internal plan IDs in the database

## Monitoring Webhooks

### View Webhook Logs in Stripe Dashboard

1. Go to **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. View the **Recent events** tab
4. Check response codes and retry attempts

### Check Webhook Event Stats

```bash
# Get webhook event statistics
curl http://localhost:3005/api/webhooks/health
```

### Monitor Failed Webhooks

```sql
-- Failed events in the last 24 hours
SELECT
  stripe_event_id,
  event_type,
  error_message,
  retry_count,
  created_at
FROM stripe_webhook_events
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

## Best Practices

1. **Always verify webhook signatures** - Never skip signature verification
2. **Handle idempotency** - Store event IDs and check for duplicates
3. **Respond quickly** - Return 200 response immediately, process async if needed
4. **Retry failed events** - Implement retry logic for transient failures
5. **Log everything** - Log all webhook events for debugging
6. **Test thoroughly** - Test all webhook events before going live
7. **Monitor errors** - Set up alerts for failed webhooks
8. **Keep secrets secure** - Never commit webhook secrets to version control

## Resources

- [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)
