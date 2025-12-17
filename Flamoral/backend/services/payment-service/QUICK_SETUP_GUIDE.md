# Payment Service - Quick Setup Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- Stripe account (test mode for development)
- Required services running: User Service, Notification Service

---

## Step 1: Environment Configuration

### Create `.env` file:

```bash
# Copy from example
cp .env.example .env
```

### Update Required Variables:

```bash
# Stripe Keys (Get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Webhook Secret (Get after creating webhook endpoint)
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_payments
DB_USER=postgres
DB_PASSWORD=your_password

# Service URLs
USER_SERVICE_URL=http://localhost:3002
NOTIFICATION_SERVICE_URL=http://localhost:3012
ANALYTICS_SERVICE_URL=http://localhost:3007
```

---

## Step 2: Database Setup

### Create Database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE flamoral_payments;

# Exit psql
\q
```

### Run Migrations:

```bash
npm run db:migrate
```

---

## Step 3: Install Dependencies

```bash
npm install
```

---

## Step 4: Configure Stripe Webhooks

### Option A: Development (Stripe CLI)

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3006/api/webhooks/stripe

# Copy the webhook secret to .env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Option B: Production (Stripe Dashboard)

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events:
   - `customer.subscription.*`
   - `payment_intent.*`
   - `invoice.*`
   - `checkout.session.*`
   - `charge.*`
   - `refund.*`
   - `payment_method.*`
5. Copy webhook signing secret to .env

---

## Step 5: Start the Service

### Development Mode:

```bash
npm run dev
```

### Production Mode:

```bash
npm run build
npm start
```

---

## Step 6: Verify Setup

### Check Configuration:

```bash
curl http://localhost:3006/api/payments/config/status
```

Expected response:
```json
{
  "success": true,
  "data": {
    "configured": true,
    "mode": "test",
    "apiVersion": "2024-12-18.acacia",
    "environment": "development",
    "validation": {
      "valid": true,
      "errors": []
    }
  }
}
```

### Test Health Endpoint:

```bash
curl http://localhost:3006/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "payment-service",
  "timestamp": "2025-12-15T..."
}
```

---

## Step 7: Test Payment Flow

### Create Test Customer:

```bash
curl -X POST http://localhost:3006/api/payments/customers \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "email": "test@example.com",
    "name": "Test User"
  }'
```

### Create Payment Intent:

```bash
curl -X POST http://localhost:3006/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 9.99,
    "currency": "usd",
    "customerId": "cus_xxxxxxxxxxxxx",
    "metadata": {
      "userId": "test-user-123",
      "type": "subscription"
    }
  }'
```

### Test Webhook:

```bash
# In separate terminal with Stripe CLI running:
stripe trigger payment_intent.succeeded
```

---

## Common Issues & Solutions

### Issue: "STRIPE_SECRET_KEY is not configured"

**Solution:**
- Check `.env` file exists
- Verify `STRIPE_SECRET_KEY` is set and starts with `sk_`
- Restart the service after updating .env

### Issue: "Webhook signature verification failed"

**Solutions:**
1. Check `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
2. Ensure using Stripe CLI secret when testing locally
3. Verify webhook endpoint URL is correct
4. Check raw body is being passed to webhook handler

### Issue: "Database connection failed"

**Solutions:**
1. Check PostgreSQL is running: `pg_isready`
2. Verify database credentials in .env
3. Ensure database exists: `psql -l`
4. Check network connectivity

### Issue: "Rate limit exceeded"

**Solution:**
- Wait 1 minute and try again
- Adjust rate limits in .env:
  ```bash
  RATE_LIMIT_PAYMENT_MAX_REQUESTS=20
  RATE_LIMIT_STANDARD_MAX_REQUESTS=100
  ```

---

## Testing with Test Cards

### Successful Payment:
- Card: `4242 4242 4242 4242`
- Exp: Any future date
- CVC: Any 3 digits

### Card Declined:
- Card: `4000 0000 0000 0002`

### Insufficient Funds:
- Card: `4000 0000 0000 9995`

### 3D Secure Required:
- Card: `4000 0025 0000 3155`

Full list: https://stripe.com/docs/testing

---

## Monitoring

### View Logs:

```bash
# Real-time logs
tail -f logs/payment-service.log

# Error logs only
tail -f logs/payment-service.log | grep ERROR
```

### Check Webhook Events:

```sql
-- Connect to database
psql -d flamoral_payments

-- View recent webhook events
SELECT
  stripe_event_id,
  event_type,
  status,
  created_at
FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 10;

-- View failed webhooks
SELECT * FROM stripe_webhook_events WHERE status = 'failed';
```

### Monitor Rate Limits:

```bash
# Check rate limit stats (if monitoring endpoint exists)
curl http://localhost:3006/api/admin/rate-limit/stats
```

---

## Production Deployment

### Before Going Live:

1. **Switch to Live Mode:**
   ```bash
   STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_live_xxxxxxxxxxxxx
   ```

2. **Update Webhook URL** in Stripe Dashboard

3. **Enable Production Security:**
   ```bash
   NODE_ENV=production
   ENABLE_GRACEFUL_DEGRADATION=true
   ```

4. **Test All Flows:**
   - Subscription creation
   - Payment processing
   - Webhook handling
   - Refunds

5. **Monitor for 24 Hours:**
   - Check error rates
   - Verify webhook processing
   - Watch for rate limiting issues

---

## Quick Commands

```bash
# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm start

# Check config
npm run check:config

# Process failed webhooks
npm run webhooks:retry
```

---

## Environment Variables Quick Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | ✅ Yes | - | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | ✅ Yes | - | Webhook signing secret |
| `DB_HOST` | ✅ Yes | localhost | Database host |
| `DB_NAME` | ✅ Yes | - | Database name |
| `PORT` | ❌ No | 3006 | Service port |
| `PAYMENT_CURRENCY` | ❌ No | usd | Default currency |
| `TRIAL_PERIOD_DAYS` | ❌ No | 7 | Trial period length |
| `WEBHOOK_MAX_RETRIES` | ❌ No | 5 | Max webhook retries |
| `RATE_LIMIT_PAYMENT_MAX_REQUESTS` | ❌ No | 10 | Payment requests/min |

---

## Support & Resources

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Test Cards**: https://stripe.com/docs/testing
- **Webhook Tester**: https://dashboard.stripe.com/test/webhooks
- **API Reference**: https://stripe.com/docs/api

---

**Last Updated**: 2025-12-15
**Service Port**: 3006
**API Base URL**: `/api/payments`
**Webhook URL**: `/api/webhooks/stripe`
