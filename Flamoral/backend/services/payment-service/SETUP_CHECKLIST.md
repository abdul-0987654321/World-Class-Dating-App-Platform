# Payment Service Setup Checklist

Complete this checklist to ensure your payment service is properly configured and ready for production.

## Prerequisites

- [ ] Node.js 20+ installed
- [ ] PostgreSQL 14+ installed and running
- [ ] Stripe account created (test mode)
- [ ] Stripe CLI installed (for local testing)

## Environment Configuration

### 1. Database Setup

- [ ] PostgreSQL database created (`flamoral_payments`)
- [ ] Database user created with proper permissions
- [ ] Database connection tested
- [ ] Environment variables configured:
  - [ ] `DB_HOST`
  - [ ] `DB_PORT`
  - [ ] `DB_NAME`
  - [ ] `DB_USER`
  - [ ] `DB_PASSWORD`
  - [ ] `DB_SSL` (false for local, true for production)

### 2. Stripe Configuration

- [ ] Stripe account created
- [ ] API keys obtained from Stripe Dashboard
- [ ] Environment variables configured:
  - [ ] `STRIPE_SECRET_KEY` (sk_test_... for test mode)
  - [ ] `STRIPE_PUBLISHABLE_KEY` (pk_test_... for test mode)
  - [ ] `STRIPE_WEBHOOK_SECRET` (whsec_... from Stripe CLI or Dashboard)
  - [ ] `STRIPE_API_VERSION` (2024-12-18.acacia)

### 3. Service Configuration

- [ ] Environment variables configured:
  - [ ] `SERVICE_NAME=payment-service`
  - [ ] `NODE_ENV` (development/production)
  - [ ] `PORT=3005`
  - [ ] `LOG_LEVEL=info`

### 4. Service URLs

- [ ] Service URLs configured:
  - [ ] `USER_SERVICE_URL=http://localhost:3002`
  - [ ] `AUTH_SERVICE_URL=http://localhost:3001`
  - [ ] `NOTIFICATION_SERVICE_URL=http://localhost:3012`
  - [ ] `ANALYTICS_SERVICE_URL=http://localhost:3007`

### 5. CORS Configuration

- [ ] CORS origins configured:
  - [ ] `CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:4000`
  - [ ] Production domains added (if applicable)

### 6. JWT Configuration (Optional)

- [ ] JWT secrets configured (if using internal auth):
  - [ ] `JWT_ACCESS_SECRET` (minimum 32 characters)
  - [ ] `JWT_REFRESH_SECRET` (minimum 32 characters)
  - [ ] `JWT_ACCESS_EXPIRES_IN=24h`
  - [ ] `JWT_REFRESH_EXPIRES_IN=30d`

## Installation

- [ ] Dependencies installed:
  ```bash
  cd backend/services/payment-service
  npm install
  ```

## Database Migrations

- [ ] Run migrations:
  ```bash
  npm run migrate
  ```

- [ ] Verify tables created:
  - [ ] `subscription_plans`
  - [ ] `user_subscriptions`
  - [ ] `transactions`
  - [ ] `stripe_webhook_events`
  - [ ] `payment_methods`
  - [ ] `coin_packages`
  - [ ] `coin_transactions`

- [ ] Run seed data:
  ```bash
  npm run seed
  ```

## Stripe Setup

### Products and Prices

- [ ] Subscription products created in Stripe Dashboard:
  - [ ] Basic Tier ($9.99/month)
  - [ ] Plus Tier ($14.99/month)
  - [ ] Premium Tier ($19.99/month)
  - [ ] Premium+ Tier ($29.99/month)
  - [ ] Elite Tier ($49.99/month)

- [ ] Yearly pricing created (with discounts):
  - [ ] Basic Yearly ($95.88/year)
  - [ ] Plus Yearly ($143.88/year)
  - [ ] Premium Yearly ($191.88/year)
  - [ ] Premium+ Yearly ($287.88/year)
  - [ ] Elite Yearly ($479.88/year)

- [ ] One-time products created:
  - [ ] Coin packages (100, 500, 1200, 2500 coins)
  - [ ] Boost products (30min, 1hr, 3hr)

- [ ] Price IDs saved and configured in database

### Webhooks

- [ ] Webhook endpoint created in Stripe Dashboard:
  - [ ] Development: Stripe CLI forwarding configured
  - [ ] Production: Webhook URL added (`https://yourdomain.com/api/webhooks/stripe`)

- [ ] Webhook events selected:
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `customer.subscription.trial_will_end`
  - [ ] `payment_intent.succeeded`
  - [ ] `payment_intent.payment_failed`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
  - [ ] `checkout.session.completed`
  - [ ] `charge.refunded`
  - [ ] `refund.created`

- [ ] Webhook signing secret configured in environment

## Configuration Validation

- [ ] Run configuration checker:
  ```bash
  npm run check-config
  ```

- [ ] All critical checks passed:
  - [ ] Stripe API connection successful
  - [ ] Database connection successful
  - [ ] All required environment variables set
  - [ ] Service URLs valid

## Testing

### Unit Tests

- [ ] Run unit tests:
  ```bash
  npm run test:unit
  ```

- [ ] All unit tests pass

### Integration Tests

- [ ] Run integration tests:
  ```bash
  npm run test:integration
  ```

- [ ] All integration tests pass

### Manual Testing

- [ ] Service starts without errors:
  ```bash
  npm run dev
  ```

- [ ] Health endpoint responds:
  ```bash
  curl http://localhost:3005/health
  ```

- [ ] Webhook endpoint accessible:
  ```bash
  curl http://localhost:3005/api/webhooks/health
  ```

### Stripe Webhook Testing

- [ ] Stripe CLI connected:
  ```bash
  stripe listen --forward-to localhost:3005/api/webhooks/stripe
  ```

- [ ] Test webhook events:
  - [ ] `stripe trigger payment_intent.succeeded`
  - [ ] `stripe trigger customer.subscription.created`
  - [ ] `stripe trigger invoice.payment_succeeded`

- [ ] Verify events logged in database:
  ```sql
  SELECT * FROM stripe_webhook_events ORDER BY created_at DESC LIMIT 5;
  ```

## Frontend Integration

- [ ] Payment service client created (`payment.service.ts`)
- [ ] Stripe.js installed:
  ```bash
  npm install @stripe/stripe-js @stripe/react-stripe-js
  ```

- [ ] Stripe provider configured in app
- [ ] Environment variables set:
  - [ ] `VITE_STRIPE_PUBLISHABLE_KEY`
  - [ ] `VITE_PAYMENT_SERVICE_URL`

- [ ] Test payment flow from frontend:
  - [ ] Create checkout session
  - [ ] Complete test payment
  - [ ] Verify webhook processing
  - [ ] Check subscription created

## Security

- [ ] Secrets not committed to version control
- [ ] `.env` file in `.gitignore`
- [ ] Webhook signature verification enabled
- [ ] CORS properly configured
- [ ] HTTPS enabled (production only)
- [ ] Rate limiting configured
- [ ] Input validation implemented

## Monitoring

- [ ] Logging configured:
  - [ ] Log level set appropriately
  - [ ] Logs being written to console/file

- [ ] Error tracking configured (optional):
  - [ ] Sentry/similar service integrated
  - [ ] Error alerts set up

- [ ] Webhook monitoring:
  - [ ] Check Stripe Dashboard for webhook status
  - [ ] Monitor failed webhook events
  - [ ] Set up alerts for critical failures

## Documentation

- [ ] README.md reviewed
- [ ] API documentation reviewed
- [ ] Webhook integration guide reviewed
- [ ] Payment integration guide reviewed
- [ ] Team trained on payment flow

## Production Readiness

### Before Going Live

- [ ] Switch to live Stripe API keys
- [ ] Configure production webhook endpoint
- [ ] Test with real payment methods (small amounts)
- [ ] Verify tax calculation (if applicable)
- [ ] Review Stripe billing settings
- [ ] Set up customer support for payment issues
- [ ] Create runbook for common issues
- [ ] Set up monitoring and alerts
- [ ] Back up database
- [ ] Test disaster recovery

### Production Deployment

- [ ] Environment variables configured in production
- [ ] Database migrations run
- [ ] Service deployed
- [ ] Health checks passing
- [ ] Webhooks receiving events
- [ ] Test end-to-end payment flow
- [ ] Monitor for errors in first 24 hours
- [ ] Verify reconciliation with Stripe Dashboard

## Compliance

- [ ] PCI compliance reviewed
- [ ] Privacy policy updated (payment processing)
- [ ] Terms of service updated (subscription terms)
- [ ] Refund policy defined
- [ ] Data retention policy configured
- [ ] GDPR compliance (if applicable)
- [ ] Legal review completed

## Support

- [ ] Payment support documentation created
- [ ] Customer support trained on:
  - [ ] Subscription management
  - [ ] Refund process
  - [ ] Payment failure handling
  - [ ] Cancellation process

## Final Checks

- [ ] All configuration checks passed
- [ ] All tests passing
- [ ] Webhooks working correctly
- [ ] Frontend integration complete
- [ ] Documentation complete
- [ ] Team trained
- [ ] Production deployment plan ready

---

## Quick Reference

### Start Services

```bash
# Database
sudo service postgresql start

# Stripe CLI (local development)
stripe listen --forward-to localhost:3005/api/webhooks/stripe

# Payment Service
npm run dev
```

### Useful Commands

```bash
# Check configuration
npm run check-config

# Run migrations
npm run migrate

# Seed data
npm run seed

# Run tests
npm test

# Check Stripe balance
stripe balance

# List recent events
stripe events list --limit=10
```

### Common Debugging

```bash
# Check service logs
tail -f logs/payment-service.log

# Check database connection
psql -U postgres -d flamoral_payments -c "SELECT 1"

# Check webhook events
psql -U postgres -d flamoral_payments -c "SELECT * FROM stripe_webhook_events ORDER BY created_at DESC LIMIT 5"

# Check Stripe connectivity
curl -u sk_test_xxxxx: https://api.stripe.com/v1/balance
```

---

**Status**: ☐ Not Started | ⏳ In Progress | ✅ Complete | ❌ Blocked

Update this checklist as you complete each item to track your progress!
