# Stripe Webhook Quick Reference Guide

## Quick Start

### 1. Environment Setup (30 seconds)
```bash
# Copy and configure .env file
cp .env.example .env

# Required variables:
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
USER_SERVICE_URL=http://localhost:3001
NOTIFICATION_SERVICE_URL=http://localhost:3008
```

### 2. Database Setup (1 minute)
```bash
# Run migrations
npm run migrate:up

# Verify tables created
psql -d dating_app_payment -c "\dt"
```

### 3. Local Testing (2 minutes)
```bash
# Terminal 1: Start payment service
npm run dev

# Terminal 2: Forward webhooks with Stripe CLI
stripe login
stripe listen --forward-to localhost:3005/api/webhooks/stripe

# Terminal 3: Trigger test events
stripe trigger payment_intent.succeeded
```

## Event Handlers Cheat Sheet

### Payment Processing
```typescript
// Coin Purchase Success
Event: payment_intent.succeeded
Metadata Required: { user_id, type: 'coin_purchase', package_id }
Actions: Add coins → Notify user

// Boost Purchase Success
Event: payment_intent.succeeded
Metadata Required: { user_id, type: 'boost_purchase', product_sku }
Actions: Activate boost → Notify user

// Payment Failed
Event: payment_intent.payment_failed
Actions: Log failure → Notify user
```

### Subscriptions
```typescript
// New Subscription
Event: customer.subscription.created
Metadata Required: { user_id }
Actions: Create DB record → Update user tier → Notify

// Subscription Renewed
Event: invoice.payment_succeeded
Actions: Create transaction → Send receipt

// Subscription Failed
Event: invoice.payment_failed
Actions: Mark past_due → Start 3-day grace period → Notify
```

### Refunds
```typescript
// Refund Processed
Event: charge.refunded
Actions: Deduct coins/features → Create refund record → Notify

// Dispute Created
Event: charge.dispute.created
Actions: Mark disputed → Alert admin
```

## Common Commands

### Stripe CLI
```bash
# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3005/api/webhooks/stripe

# Trigger specific event
stripe trigger payment_intent.succeeded

# Trigger with metadata
stripe trigger payment_intent.succeeded \
  --add payment_intent:metadata[user_id]=user_123 \
  --add payment_intent:metadata[type]=coin_purchase

# View logs
stripe logs tail

# Test webhook endpoint
curl -X POST http://localhost:3005/api/webhooks/stripe \
  -H "stripe-signature: $(stripe events tail --limit 1 --format json | jq -r '.[0].request.idempotency_key')" \
  -d @test_event.json
```

### Database Queries
```sql
-- Check recent webhook events
SELECT stripe_event_id, event_type, status, created_at
FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 20;

-- Find failed events
SELECT stripe_event_id, event_type, error_message, retry_count
FROM stripe_webhook_events
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Check transaction history for user
SELECT type, status, amount, description, created_at
FROM transactions
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;

-- Get webhook statistics
SELECT
  event_type,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'processed' THEN 1 ELSE 0 END) as success,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM stripe_webhook_events
WHERE created_at > NOW() - INTERVAL '24 HOURS'
GROUP BY event_type;
```

### NPM Scripts
```bash
# Development
npm run dev                    # Start dev server with hot reload

# Database
npm run migrate:up             # Run migrations
npm run migrate:down           # Rollback migrations
npm run migrate:latest         # Run pending migrations

# Testing
npm run test                   # Run all tests
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests
npm run test:watch             # Watch mode

# Production
npm run build                  # Build TypeScript
npm start                      # Start production server

# Maintenance
node dist/scripts/process-failed-webhooks.js  # Retry failed webhooks
```

## Troubleshooting

### Problem: Webhook not receiving events
```bash
# Check endpoint accessibility
curl -I https://yourdomain.com/api/webhooks/stripe

# Verify Stripe CLI connection
stripe listen --print-secret

# Check firewall/network
telnet yourdomain.com 443
```

### Problem: Signature verification failed
```bash
# Verify webhook secret
echo $STRIPE_WEBHOOK_SECRET

# Check if using raw body parser
# File: webhook.routes.ts
express.raw({ type: 'application/json' })

# Test with Stripe CLI
stripe listen --forward-to localhost:3005/api/webhooks/stripe
```

### Problem: User service integration failing
```bash
# Check user service is running
curl http://localhost:3001/health

# Verify service API key
curl -H "X-Service-Key: $SERVICE_API_KEY" \
  http://localhost:3001/api/internal/users/test

# Check logs
tail -f logs/payment-service.log | grep "user-service"
```

### Problem: Events marked as failed
```sql
-- Find error patterns
SELECT error_message, COUNT(*)
FROM stripe_webhook_events
WHERE status = 'failed'
GROUP BY error_message;

-- Retry specific event
UPDATE stripe_webhook_events
SET status = 'pending', retry_count = 0
WHERE stripe_event_id = 'evt_...';

-- Then run retry script
node dist/scripts/process-failed-webhooks.js
```

## Metadata Requirements

### Payment Intent
```typescript
{
  user_id: string;           // REQUIRED
  type: string;              // REQUIRED: 'coin_purchase' | 'boost_purchase'
  package_id?: string;       // For coin purchases
  product_sku?: string;      // Product identifier
  product_name?: string;     // Display name
}
```

### Subscription
```typescript
{
  user_id: string;           // REQUIRED
  tier?: string;             // 'premium' | 'premium_plus'
  plan_name?: string;        // Display name
}
```

### Checkout Session
```typescript
{
  user_id: string;           // REQUIRED (or use client_reference_id)
  type?: string;             // Purchase type
}
```

## HTTP Endpoints

### Webhook Endpoint
```
POST /api/webhooks/stripe
Content-Type: application/json
Headers: stripe-signature

Returns: 200 { received: true }
```

### Health Check
```
GET /api/webhooks/health

Returns: 200 {
  status: 'healthy',
  service: 'payment-service-webhooks',
  timestamp: '2025-12-02T...'
}
```

### Test Endpoint (Development Only)
```
POST /api/webhooks/test
Content-Type: application/json

Returns: 200 { received: true, message: 'Test webhook received' }
```

## Monitoring Dashboards

### Stripe Dashboard
```
https://dashboard.stripe.com/webhooks
→ View all webhook attempts
→ See success/failure rates
→ Replay failed events
→ Update endpoint settings
```

### Application Logs
```bash
# Real-time logs
tail -f logs/payment-service.log

# Error logs only
tail -f logs/payment-service.log | grep ERROR

# Specific event
grep "evt_ABC123" logs/payment-service.log

# Today's webhook activity
grep "$(date +%Y-%m-%d)" logs/payment-service.log | grep webhook
```

## Environment-Specific Settings

### Development
```bash
NODE_ENV=development
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # From Stripe CLI
USER_SERVICE_URL=http://localhost:3001
```

### Staging
```bash
NODE_ENV=staging
STRIPE_SECRET_KEY=sk_test_...  # Still test mode
STRIPE_WEBHOOK_SECRET=whsec_...  # From Stripe Dashboard
USER_SERVICE_URL=https://staging-api.yourdomain.com
```

### Production
```bash
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_...  # Live mode!
STRIPE_WEBHOOK_SECRET=whsec_...  # Production webhook secret
USER_SERVICE_URL=https://api.yourdomain.com
```

## Cron Job Setup

### Linux/macOS
```bash
# Edit crontab
crontab -e

# Add retry job (every 5 minutes)
*/5 * * * * cd /path/to/payment-service && node dist/scripts/process-failed-webhooks.js >> /var/log/webhook-retry.log 2>&1

# Add cleanup job (daily at 3 AM)
0 3 * * * cd /path/to/payment-service && node dist/scripts/cleanup-old-events.js >> /var/log/webhook-cleanup.log 2>&1
```

### Windows (Task Scheduler)
```powershell
# Create scheduled task
schtasks /create /tn "WebhookRetry" /tr "node C:\path\to\dist\scripts\process-failed-webhooks.js" /sc minute /mo 5

# Verify task
schtasks /query /tn "WebhookRetry"
```

### Docker/Kubernetes
```yaml
# CronJob manifest
apiVersion: batch/v1
kind: CronJob
metadata:
  name: webhook-retry
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: webhook-retry
            image: payment-service:latest
            command: ["node", "dist/scripts/process-failed-webhooks.js"]
```

## Production Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Webhook endpoint added in Stripe Dashboard
- [ ] Signing secret copied to `.env`
- [ ] SSL certificate valid
- [ ] User service accessible
- [ ] Notification service accessible
- [ ] Cron job configured for retries
- [ ] Monitoring alerts set up
- [ ] Test webhook with Stripe Dashboard
- [ ] Verify idempotency working
- [ ] Check logs for errors
- [ ] Test payment flow end-to-end

## Performance Benchmarks

| Operation | Expected Time | Alert Threshold |
|-----------|---------------|-----------------|
| Event Processing | < 500ms | > 2s |
| Database Write | < 100ms | > 500ms |
| User Service Call | < 200ms | > 1s |
| Notification Send | < 150ms | > 1s |
| Total Webhook Response | < 1s | > 3s |

## Support Contacts

- **Stripe Support**: https://support.stripe.com
- **Documentation**: https://stripe.com/docs/webhooks
- **API Status**: https://status.stripe.com
- **Community**: https://discord.gg/stripe (unofficial)

---

**Quick Reference Version**: 1.0.0
**Last Updated**: 2025-12-02
**Maintained By**: Payment Service Team
