# Stripe Payment Integration - Quick Reference

**Last Updated:** December 15, 2025

---

## Quick Start

### 1. Environment Setup
```bash
# Required environment variables
STRIPE_SECRET_KEY=sk_test_...              # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...            # Webhook signing secret
STRIPE_PUBLISHABLE_KEY=pk_test_...         # Frontend publishable key
USER_SERVICE_URL=http://localhost:3002     # User service URL
NOTIFICATION_SERVICE_URL=http://localhost:3012  # Notification service URL
```

### 2. Start Payment Service
```bash
cd backend/services/payment-service
npm install
npm run dev
```

### 3. Test Webhooks Locally
```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local service
stripe listen --forward-to localhost:3006/api/webhooks/stripe

# In another terminal, trigger test events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
```

---

## API Endpoints

### Base URL
```
Local: http://localhost:3006/api/payments
Production: https://flamoral.com/api/payments
```

### Payment Intents
```bash
# Create payment intent
POST /create-intent
{
  "amount": 9.99,
  "currency": "usd",
  "customerId": "cus_...",
  "metadata": {
    "userId": "uuid",
    "type": "coin_purchase"
  }
}
```

### Checkout Sessions
```bash
# Create checkout session
POST /checkout/create
{
  "customerEmail": "user@example.com",
  "successUrl": "https://flamoral.com/success",
  "cancelUrl": "https://flamoral.com/cancel",
  "mode": "subscription",
  "priceId": "price_...",
  "metadata": {
    "userId": "uuid",
    "tier": "premium"
  }
}

# Get checkout session
GET /checkout/:sessionId
```

### Subscriptions
```bash
# Create subscription
POST /subscription/create
{
  "userId": "uuid",
  "tier": "premium",
  "priceId": "price_...",
  "email": "user@example.com",
  "paymentMethodId": "pm_...",
  "trialDays": 7
}

# Cancel subscription
POST /subscription/cancel
{
  "subscriptionId": "sub_...",
  "immediately": false
}

# Update subscription tier
POST /subscription/update-tier
{
  "subscriptionId": "sub_...",
  "newPriceId": "price_..."
}
```

### Customers
```bash
# Create customer
POST /customers
{
  "userId": "uuid",
  "email": "user@example.com",
  "name": "John Doe"
}

# Get customer
GET /customers/:customerId
```

### Payment Methods
```bash
# Get payment methods
GET /methods/:customerId

# Add payment method
POST /methods/add
{
  "customerId": "cus_...",
  "paymentMethodId": "pm_..."
}
```

### Refunds
```bash
# Process refund
POST /refund
{
  "paymentIntentId": "pi_...",
  "amount": 9.99,  // Optional (full refund if not specified)
  "reason": "requested_by_customer"  // duplicate, fraudulent, requested_by_customer
}
```

### Configuration
```bash
# Get Stripe configuration status
GET /config/status

# Response:
{
  "success": true,
  "data": {
    "configured": true,
    "mode": "test",
    "apiVersion": "2024-12-18.acacia",
    "validation": {
      "valid": true,
      "errors": []
    }
  }
}
```

---

## Subscription Tiers

### Supported Tiers
1. **free** - Free tier (default)
2. **basic** - Basic subscription
3. **plus** - Plus subscription
4. **premium** - Premium subscription
5. **premium_plus** - Premium Plus subscription
6. **elite** - Elite subscription

### Billing Cycles
- `monthly` - Monthly billing
- `3_months` - Quarterly billing
- `6_months` - Semi-annual billing
- `yearly` - Annual billing

---

## Webhook Events

### Setup Webhook Endpoint
```
URL: https://flamoral.com/api/payments/webhooks/stripe
Method: POST
Events: Select all or specific events
```

### Critical Events

#### Subscriptions
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription canceled
- `customer.subscription.trial_will_end` - Trial ending soon

#### Payments
- `payment_intent.succeeded` - Payment successful
- `payment_intent.payment_failed` - Payment failed
- `invoice.payment_succeeded` - Subscription renewal succeeded
- `invoice.payment_failed` - Subscription renewal failed

#### Refunds
- `charge.refunded` - Charge refunded
- `refund.created` - Refund created
- `refund.updated` - Refund status updated

---

## Common Workflows

### 1. Create Subscription Checkout
```typescript
// Frontend: Create checkout session
const response = await fetch('/api/payments/checkout/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerEmail: user.email,
    successUrl: window.location.origin + '/success?session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: window.location.origin + '/pricing',
    mode: 'subscription',
    priceId: 'price_premium_monthly',
    metadata: {
      userId: user.id,
      tier: 'premium'
    },
    trialPeriodDays: 7
  })
});

const { data } = await response.json();
// Redirect to Stripe Checkout
window.location.href = data.url;
```

### 2. Purchase Coins (One-Time Payment)
```typescript
// Frontend: Create checkout session for coins
const response = await fetch('/api/payments/checkout/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerEmail: user.email,
    successUrl: window.location.origin + '/coins/success',
    cancelUrl: window.location.origin + '/coins',
    mode: 'payment',
    priceId: 'price_coin_pack_500',
    metadata: {
      userId: user.id,
      type: 'coin_purchase',
      package_id: 'pkg_500_coins'
    }
  })
});

const { data } = await response.json();
window.location.href = data.url;
```

### 3. Cancel Subscription
```typescript
// Cancel at period end (keeps access until end of billing period)
await fetch('/api/payments/subscription/cancel', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subscriptionId: user.stripeSubscriptionId,
    immediately: false
  })
});

// Cancel immediately (revokes access now)
await fetch('/api/payments/subscription/cancel', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subscriptionId: user.stripeSubscriptionId,
    immediately: true
  })
});
```

### 4. Upgrade/Downgrade Subscription
```typescript
// Change subscription tier (prorated automatically)
await fetch('/api/payments/subscription/update-tier', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subscriptionId: user.stripeSubscriptionId,
    newPriceId: 'price_elite_monthly'
  })
});
```

### 5. Process Refund
```typescript
// Full refund
await fetch('/api/payments/refund', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentIntentId: 'pi_...',
    reason: 'requested_by_customer'
  })
});

// Partial refund
await fetch('/api/payments/refund', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentIntentId: 'pi_...',
    amount: 5.00,  // Refund $5 of original payment
    reason: 'requested_by_customer'
  })
});
```

---

## Error Handling

### Common Errors

```typescript
// Invalid Stripe key
{
  "success": false,
  "message": "STRIPE_SECRET_KEY is not configured"
}

// Invalid webhook signature
{
  "error": "Webhook Error: No signatures found matching the expected signature"
}

// Missing required fields
{
  "success": false,
  "message": "User ID and email are required"
}

// Stripe API error
{
  "success": false,
  "message": "Failed to create payment intent: Your card was declined"
}
```

### Error Response Structure
```typescript
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

---

## Testing

### Test Cards (Stripe)
```
# Successful payment
4242 4242 4242 4242

# Card requires authentication
4000 0025 0000 3155

# Card declined
4000 0000 0000 0002

# Insufficient funds
4000 0000 0000 9995
```

### Test Webhooks
```bash
# Subscription created
stripe trigger customer.subscription.created

# Payment succeeded
stripe trigger payment_intent.succeeded

# Payment failed
stripe trigger payment_intent.payment_failed

# Subscription canceled
stripe trigger customer.subscription.deleted

# Refund created
stripe trigger charge.refunded
```

### Manual Testing Checklist
- [ ] Create checkout session
- [ ] Complete payment
- [ ] Verify webhook received
- [ ] Check user subscription updated
- [ ] Cancel subscription
- [ ] Verify cancellation notification
- [ ] Process refund
- [ ] Verify coin/feature revocation

---

## Monitoring

### Health Checks
```bash
# Service health
curl http://localhost:3006/health

# Webhook health
curl http://localhost:3006/api/webhooks/health

# Configuration status
curl http://localhost:3006/api/payments/config/status
```

### Logs
```bash
# View payment service logs
docker logs payment-service -f

# Filter for errors
docker logs payment-service | grep ERROR

# Filter for specific event type
docker logs payment-service | grep "payment_intent.succeeded"
```

### Webhook Event Stats
```typescript
// Get webhook statistics
const webhookService = new WebhookService();
const stats = await webhookService.getEventStats();

console.log(stats);
// {
//   total: 1250,
//   processed: 1200,
//   failed: 30,
//   pending: 20
// }
```

---

## Troubleshooting

### Webhook Not Receiving Events
1. Check webhook secret is correct
2. Verify webhook URL is accessible
3. Check Stripe Dashboard webhook logs
4. Test with Stripe CLI: `stripe listen --forward-to localhost:3006/api/webhooks/stripe`

### Payment Failing
1. Check Stripe API key is valid
2. Verify customer exists
3. Check payment method is attached
4. Review Stripe Dashboard payment logs
5. Check test card numbers

### Subscription Not Updating
1. Verify webhook events are being processed
2. Check `stripe_webhook_events` table for failed events
3. Verify user-service is accessible
4. Check subscription ID is correct

### Refund Not Processing
1. Verify payment intent ID is correct
2. Check payment was successful
3. Verify refund hasn't already been processed
4. Check Stripe Dashboard refund status

---

## Security Best Practices

1. **Always verify webhook signatures**
   ```typescript
   const event = stripe.webhooks.constructEvent(
     rawBody,
     signature,
     webhookSecret
   );
   ```

2. **Use environment variables for secrets**
   - Never hardcode API keys
   - Use different keys for dev/staging/production

3. **Validate all input**
   - Use Joi schemas for validation
   - Sanitize user input

4. **Log security events**
   - Failed webhook signature verifications
   - Invalid API key attempts
   - Suspicious refund requests

5. **Implement rate limiting**
   - Protect payment endpoints
   - Prevent abuse

---

## Support Resources

### Documentation
- Stripe API: https://stripe.com/docs/api
- Stripe Webhooks: https://stripe.com/docs/webhooks
- Stripe Testing: https://stripe.com/docs/testing

### Stripe Dashboard
- Test Mode: https://dashboard.stripe.com/test
- Live Mode: https://dashboard.stripe.com/

### Internal Resources
- Full Fix Report: `STRIPE_PAYMENT_FIXES_COMPLETE.md`
- Payment Service README: `backend/services/payment-service/README.md`
- Webhook Implementation: `backend/services/payment-service/WEBHOOK_IMPLEMENTATION.md`

---

## Quick Commands

```bash
# Start payment service
npm run dev

# Run migrations
npm run migrate:latest

# Rollback migration
npm run migrate:rollback

# Process failed webhooks
npm run process-failed-webhooks

# Test Stripe connection
stripe customer list

# View webhook events
stripe events list

# Create test subscription
stripe subscriptions create --customer cus_... --items[0][price]=price_...
```

---

**Need Help?** Check logs, webhook events table, and Stripe Dashboard for detailed error information.
