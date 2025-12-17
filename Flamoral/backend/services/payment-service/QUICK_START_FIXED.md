# Payment Service - Quick Start Guide

Get your payment service up and running in 10 minutes!

## Prerequisites

- Node.js 20+
- PostgreSQL running
- Stripe account (test mode)

## Step 1: Environment Setup (2 minutes)

1. Copy the environment template:
   ```bash
   cd backend/services/payment-service
   cp .env.example .env
   ```

2. Edit `.env` and update:
   ```env
   # Database (use your actual credentials)
   DB_PASSWORD=your_postgres_password

   # Stripe (get from https://dashboard.stripe.com/apikeys)
   STRIPE_SECRET_KEY=sk_test_your_key_here
   STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
   ```

## Step 2: Install Dependencies (1 minute)

```bash
npm install
```

## Step 3: Database Setup (2 minutes)

1. Create database:
   ```bash
   createdb flamoral_payments
   ```

2. Run migrations:
   ```bash
   npm run migrate
   ```

3. Seed initial data:
   ```bash
   npm run seed
   ```

## Step 4: Stripe Webhook Setup (2 minutes)

1. Install Stripe CLI (if not already installed):

   **Windows (PowerShell as Admin):**
   ```powershell
   scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
   scoop install stripe
   ```

   **macOS:**
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Start webhook forwarding:
   ```bash
   stripe listen --forward-to localhost:3005/api/webhooks/stripe
   ```

4. Copy the webhook secret from the output:
   ```
   Your webhook signing secret is whsec_xxxxxxxxxxxxx
   ```

5. Add to `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

## Step 5: Verify Configuration (1 minute)

Run the configuration checker:
```bash
npm run check-config
```

You should see all green checkmarks ✅

## Step 6: Start the Service (1 minute)

```bash
npm run dev
```

You should see:
```
[payment-service] INFO: Stripe configured in test mode (API version: 2024-12-18.acacia)
[payment-service] INFO: Database connection successful
[payment-service] INFO: Payment Service running on port 3005
```

## Step 7: Test It! (1 minute)

### Test 1: Health Check

```bash
curl http://localhost:3005/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "payment-service",
  "timestamp": "2025-01-15T..."
}
```

### Test 2: Webhook

In a new terminal, trigger a test webhook:
```bash
stripe trigger payment_intent.succeeded
```

Check the payment service logs - you should see webhook processing messages.

### Test 3: Configuration Status

```bash
curl http://localhost:3005/api/payments/config/status
```

## Next Steps

### Create Products in Stripe

```bash
# Create a test product
stripe products create --name="Premium Subscription" --description="Premium tier"

# Create a monthly price
stripe prices create \
  --product=prod_xxxxx \
  --unit-amount=1999 \
  --currency=usd \
  --recurring='{"interval":"month"}'
```

### Test Payment Flow

1. Use the frontend integration guide: `PAYMENT_INTEGRATION.md`
2. Test with Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

## Common Issues

### Issue: Database Connection Failed

**Solution:**
```bash
# Check if PostgreSQL is running
pg_isready

# If not running, start it:
# macOS:
brew services start postgresql
# Windows (if using Windows Subsystem for Linux):
sudo service postgresql start
# Windows (native):
# Use Services app or PostgreSQL installer
```

### Issue: Stripe API Key Invalid

**Solution:**
1. Go to https://dashboard.stripe.com/apikeys
2. Make sure you're in **Test mode** (toggle in top right)
3. Copy the correct keys (they should start with `sk_test_` and `pk_test_`)

### Issue: Webhook Secret Invalid

**Solution:**
1. Make sure Stripe CLI is running: `stripe listen --forward-to localhost:3005/api/webhooks/stripe`
2. Copy the secret from the terminal output
3. Update `.env` file
4. Restart the payment service

## Quick Reference

### Start Everything

```bash
# Terminal 1: Start payment service
npm run dev

# Terminal 2: Start Stripe webhook forwarding
stripe listen --forward-to localhost:3005/api/webhooks/stripe
```

### Useful Commands

```bash
# Check configuration
npm run check-config

# View logs (if using PM2)
pm2 logs payment-service

# Test webhook
stripe trigger payment_intent.succeeded

# List Stripe customers
stripe customers list --limit=5

# Check database
psql -d flamoral_payments -c "SELECT * FROM stripe_webhook_events LIMIT 5"
```

## What's Next?

1. Read the full [Payment Integration Guide](./PAYMENT_INTEGRATION.md)
2. Review [Webhook Testing Guide](./WEBHOOK_TESTING_GUIDE.md)
3. Complete the [Setup Checklist](./SETUP_CHECKLIST.md)
4. Integrate with your frontend using [payment.service.ts](../../apps/web-app/src/services/payment.service.ts)

## Support

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Webhook Testing**: https://stripe.com/docs/webhooks/test

---

**Pro Tip**: Keep the Stripe CLI running in a separate terminal while developing. It will automatically forward all webhook events to your local service!
