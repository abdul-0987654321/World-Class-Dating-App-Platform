# Quick Start Guide - Stripe Webhook Integration

## 🚀 Get Up and Running in 5 Minutes

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Stripe account
- Running User Service (optional for testing)
- Running Notification Service (optional for testing)

## Step 1: Install Dependencies

```bash
cd backend/services/payment-service
npm install
```

This will install:
- Express, Stripe SDK, Knex, PostgreSQL driver
- Winston for logging
- Axios for HTTP client
- TypeScript and all dev dependencies

## Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file
nano .env  # or use your preferred editor
```

### Required Configuration

```bash
# Database (REQUIRED)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_payments
DB_USER=postgres
DB_PASSWORD=your_password_here

# Stripe (REQUIRED)
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here

# Service Authentication (REQUIRED)
SERVICE_API_KEY=generate-a-random-32-char-string-here

# Service URLs (REQUIRED)
USER_SERVICE_URL=http://localhost:3001
NOTIFICATION_SERVICE_URL=http://localhost:3008
```

### Generate Secure API Key

```bash
# Generate a random 32-character key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 3: Set Up Database

```bash
# Run migrations
npm run migrate

# Verify tables were created
psql -U postgres -d flamoral_payments -c "\dt"
```

Expected tables:
- subscription_plans
- user_subscriptions
- payment_methods
- transactions
- coin_packages
- coin_transactions
- stripe_webhook_events

## Step 4: Get Stripe Webhook Secret

### Option A: Use Stripe CLI (Recommended for Development)

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Windows: Download from https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3005/api/payments/webhook

# Copy the webhook signing secret (starts with whsec_)
# Add it to .env as STRIPE_WEBHOOK_SECRET
```

### Option B: Create Webhook in Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. URL: `https://your-domain.com/api/payments/webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy "Signing secret" to `.env`

## Step 5: Start the Service

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

You should see:
```
[payment-service] Payment Service running on port 3005
[payment-service] Environment: development
```

## Step 6: Test the Webhook

### Test Health Check

```bash
curl http://localhost:3005/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "payment-service",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Test Webhook with Stripe CLI

```bash
# In a separate terminal, trigger a test event
stripe trigger payment_intent.succeeded \
  --add payment_intent:metadata[user_id]=test-user-123 \
  --add payment_intent:metadata[type]=coin_purchase \
  --add payment_intent:metadata[package_id]=pkg-test-123

# Check the logs in your payment service terminal
# You should see processing messages
```

### View Processed Events

```bash
# Connect to database
psql -U postgres -d flamoral_payments

# Query webhook events
SELECT stripe_event_id, event_type, status, created_at
FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 5;

# Check transactions
SELECT user_id, type, status, amount, description, created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 5;
```

## Step 7: Create Test Payment (Optional)

### Create Coin Purchase Payment Intent

```bash
curl -X POST http://localhost:3005/api/payments/coins/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "packageId": "existing-package-id"
  }'
```

### Create Subscription

```bash
curl -X POST http://localhost:3005/api/payments/subscriptions/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "planId": "existing-plan-id",
    "paymentMethodId": "pm_card_visa"
  }'
```

## Common Commands

### Development

```bash
# Run with auto-reload
npm run dev

# Run tests
npm test

# Run only unit tests
npm run test:unit

# Check TypeScript errors
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Database

```bash
# Run migrations
npm run migrate

# Rollback migrations
npm run migrate:rollback

# View migration status
npm run migrate:status

# Create new migration
npm run migrate:make migration_name
```

### Debugging

```bash
# View logs
tail -f logs/combined.log

# View only errors
tail -f logs/error.log

# Watch for specific user
tail -f logs/combined.log | grep "user-id-here"

# View Stripe webhook events in database
psql -U postgres -d flamoral_payments -c "
  SELECT
    event_type,
    status,
    error_message,
    created_at
  FROM stripe_webhook_events
  WHERE status = 'failed'
  ORDER BY created_at DESC;
"
```

## Troubleshooting

### Issue: Database Connection Failed

**Check:**
```bash
# Verify PostgreSQL is running
pg_isready

# Test connection
psql -U postgres -d flamoral_payments -c "SELECT 1"
```

**Fix:**
- Ensure PostgreSQL is running
- Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in `.env`
- Verify database exists: `psql -U postgres -l`

### Issue: Stripe Signature Verification Failed

**Check:**
```bash
# Verify webhook secret is set
echo $STRIPE_WEBHOOK_SECRET

# Check .env file
cat .env | grep STRIPE_WEBHOOK_SECRET
```

**Fix:**
- Ensure `STRIPE_WEBHOOK_SECRET` in `.env` matches Stripe Dashboard
- For local testing, use Stripe CLI secret
- Verify raw body parser is used (not JSON parser)

### Issue: User Service Connection Failed

**Check:**
```bash
# Verify User Service is running
curl http://localhost:3001/health

# Check service key
echo $SERVICE_API_KEY
```

**Fix:**
- Start User Service
- Verify `USER_SERVICE_URL` in `.env`
- Ensure `SERVICE_API_KEY` matches in both services

### Issue: Webhooks Not Being Received

**For Local Development:**
```bash
# Use Stripe CLI to forward webhooks
stripe listen --forward-to localhost:3005/api/payments/webhook

# Make sure you copy the webhook secret shown
```

**For Production:**
- Verify webhook URL is publicly accessible
- Check firewall settings
- Verify SSL certificate is valid
- Check Stripe Dashboard webhook logs

## Next Steps

### 1. Implement User Service Internal Endpoints

The Payment Service expects these endpoints in the User Service:

```typescript
// PUT /api/internal/subscriptions/update
// POST /api/internal/coins/add
// POST /api/internal/boosts/activate
```

See `WEBHOOK_INTEGRATION.md` for complete API specifications.

### 2. Set Up Notification Service

Configure the Notification Service to handle:

```typescript
// POST /api/internal/notifications/send
```

### 3. Configure Production Webhooks

1. Deploy Payment Service to production
2. Add webhook endpoint in Stripe Dashboard
3. Select all required events
4. Update `STRIPE_WEBHOOK_SECRET` with production value

### 4. Set Up Monitoring

Monitor these metrics:
- Webhook delivery success rate (Stripe Dashboard)
- Failed events in `stripe_webhook_events` table
- User Service integration errors
- Notification delivery rate

### 5. Add Alerting

Set up alerts for:
- Failed webhook events
- User Service API failures
- Database connection issues
- High error rates

## Testing Checklist

- [ ] Health check endpoint responds
- [ ] Database connection works
- [ ] Stripe CLI forwards webhooks successfully
- [ ] Payment intent success creates transaction
- [ ] Subscription creation updates user tier
- [ ] Invoice payment records transaction
- [ ] Failed payments are logged correctly
- [ ] Notifications are sent (when service available)
- [ ] Idempotency prevents duplicate processing
- [ ] Error handling works gracefully

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Webhook endpoint is HTTPS
- [ ] Webhook secret is production value
- [ ] Service API key is secure (32+ chars)
- [ ] Logging configured for production
- [ ] Monitoring set up
- [ ] Alerts configured
- [ ] User Service endpoints implemented
- [ ] Notification Service configured
- [ ] All tests passing
- [ ] Load testing completed

## Support Resources

- **Architecture Diagram:** `ARCHITECTURE_DIAGRAM.md`
- **Complete Implementation Guide:** `WEBHOOK_IMPLEMENTATION.md`
- **Usage Examples:** `USAGE_EXAMPLES.md`
- **Implementation Summary:** `IMPLEMENTATION_SUMMARY.md`
- **Stripe Documentation:** https://stripe.com/docs/webhooks
- **Stripe CLI Guide:** https://stripe.com/docs/stripe-cli

## Getting Help

### Viewing Logs

```bash
# Real-time logs
npm run dev

# Check error logs
cat logs/error.log

# Check all logs
cat logs/combined.log
```

### Database Debugging

```bash
# Check recent webhook events
psql -U postgres -d flamoral_payments -c "
  SELECT * FROM stripe_webhook_events
  ORDER BY created_at DESC
  LIMIT 10;
"

# Check transactions
psql -U postgres -d flamoral_payments -c "
  SELECT * FROM transactions
  ORDER BY created_at DESC
  LIMIT 10;
"
```

### Stripe Dashboard

- View webhook delivery: https://dashboard.stripe.com/test/webhooks
- View events: https://dashboard.stripe.com/test/events
- View logs: https://dashboard.stripe.com/test/logs

---

## You're All Set! 🎉

Your Payment Service is now ready to handle Stripe webhooks. The service will:
- ✅ Process coin purchases
- ✅ Activate boosts
- ✅ Manage subscriptions
- ✅ Handle invoices
- ✅ Send notifications
- ✅ Log everything

For detailed information, refer to the other documentation files.
