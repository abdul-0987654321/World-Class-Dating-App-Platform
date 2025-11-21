# Payment Service Webhook Integration

## Overview

The payment service integrates with Stripe webhooks to handle payment events and automatically sync subscription, coin, and boost purchases with the user-service.

## Supported Webhook Events

### Payment Intent Events

#### `payment_intent.succeeded`
- **Purpose**: Handle successful one-time payments (coins, boosts)
- **Actions**:
  - For coin purchases: Add coins to user balance via user-service
  - For boost purchases: Activate boost for user via user-service
  - Send success notification to user

#### `payment_intent.payment_failed`
- **Purpose**: Handle failed payment attempts
- **Actions**:
  - Send failure notification to user
  - Log failure for debugging

### Subscription Events

#### `customer.subscription.created` / `customer.subscription.updated`
- **Purpose**: Handle subscription creation and updates
- **Actions**:
  - Update user's subscription tier in user-service
  - Update subscription status (active, past_due, unpaid, canceled)
  - Update subscription end date
  - Send notification to user

#### `customer.subscription.deleted`
- **Purpose**: Handle subscription cancellation
- **Actions**:
  - Downgrade user to free tier in user-service
  - Send cancellation notification

### Invoice Events

#### `invoice.payment_succeeded`
- **Purpose**: Handle successful subscription renewals
- **Actions**:
  - Send renewal success notification

#### `invoice.payment_failed`
- **Purpose**: Handle failed subscription renewals
- **Actions**:
  - Update subscription status to past_due
  - Send payment failure notification with instructions to update payment method

## Configuration

### Environment Variables

```bash
# Payment Service (.env)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
USER_SERVICE_URL=http://localhost:3001
SERVICE_API_KEY=your-secure-internal-service-key
```

```bash
# User Service (.env)
SERVICE_API_KEY=your-secure-internal-service-key
```

### Stripe Webhook Setup

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://yourdomain.com/api/payments/webhook`
4. Select the following events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Inter-Service Communication

The payment-service communicates with user-service via internal HTTP endpoints:

### Internal Endpoints (user-service)

All internal endpoints require `X-Service-Key` header for authentication.

#### Update Subscription
```http
PUT /api/internal/subscriptions/update
Content-Type: application/json
X-Service-Key: your-service-key

{
  "userId": "uuid",
  "tier": "basic|mid|ultra|free",
  "stripeSubscriptionId": "sub_...",
  "status": "active|canceled|past_due|unpaid",
  "currentPeriodEnd": "2024-12-31T23:59:59Z"
}
```

#### Add Coins
```http
POST /api/internal/coins/add
Content-Type: application/json
X-Service-Key: your-service-key

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
X-Service-Key: your-service-key

{
  "userId": "uuid",
  "productSku": "BOOST_1HR",
  "durationMinutes": 60,
  "stripePaymentId": "pi_..."
}
```

#### Send Notification
```http
POST /api/internal/notifications/send
Content-Type: application/json
X-Service-Key: your-service-key

{
  "userId": "uuid",
  "type": "payment_success|payment_failed|subscription_updated|subscription_canceled|subscription_renewed",
  "message": "Notification message"
}
```

## Product SKUs

### Coin Packages
- `COIN_PACK_SMALL`: 100 coins
- `COIN_PACK_MEDIUM`: 500 coins
- `COIN_PACK_LARGE`: 1200 coins
- `COIN_PACK_XL`: 2500 coins

### Boost Packages
- `BOOST_30MIN`: 30 minutes
- `BOOST_1HR`: 60 minutes
- `BOOST_3HR`: 180 minutes

## Metadata Requirements

### Payment Intent Metadata
For webhook processing to work, payment intents must include:
```javascript
{
  userId: 'uuid',
  type: 'coin_purchase' | 'boost_purchase',
  productSku: 'COIN_PACK_MEDIUM' | 'BOOST_1HR'
}
```

### Subscription Metadata
Subscriptions must include:
```javascript
{
  userId: 'uuid',
  tier: 'basic' | 'mid' | 'ultra'
}
```

## Error Handling

- All webhook handlers include try-catch blocks
- Errors are logged but don't cause webhook failures
- Failed notifications are logged but don't block payment processing
- User-service communication errors are logged with detailed messages

## Testing

### Local Testing with Stripe CLI

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3002/api/payments/webhook`
4. Trigger test events:
   ```bash
   stripe trigger payment_intent.succeeded
   stripe trigger customer.subscription.updated
   stripe trigger invoice.payment_succeeded
   ```

### Manual Testing

Use the Stripe Dashboard to:
1. Create test payment intents with proper metadata
2. Create test subscriptions
3. Cancel subscriptions
4. Trigger invoice payments
5. Monitor webhook delivery in Stripe Dashboard > Developers > Webhooks

## Security

- Webhook signatures are verified using `STRIPE_WEBHOOK_SECRET`
- Internal service endpoints require `X-Service-Key` authentication
- All sensitive data is transmitted over HTTPS in production
- Failed webhook signature verification returns 400 Bad Request

## Monitoring

Monitor the following:
- Webhook delivery success rate in Stripe Dashboard
- User-service integration errors in payment-service logs
- Failed notifications (non-critical)
- Payment intent and subscription status mismatches

## Troubleshooting

### Webhook Not Firing
- Verify webhook endpoint URL in Stripe Dashboard
- Check that endpoint is publicly accessible (use ngrok for local testing)
- Verify webhook signing secret matches `.env`

### User-Service Integration Failing
- Check `USER_SERVICE_URL` is correct
- Verify `SERVICE_API_KEY` matches between services
- Check user-service logs for errors
- Verify internal endpoints are accessible

### Metadata Missing
- Ensure all payment intents include userId and type
- Ensure all subscriptions include userId and tier
- Check payment creation code in controllers
