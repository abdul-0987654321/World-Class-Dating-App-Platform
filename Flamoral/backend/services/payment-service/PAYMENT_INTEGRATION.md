# Payment Service Integration Guide

Complete guide for integrating the Flamoral payment service with Stripe.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Environment Setup](#environment-setup)
4. [Stripe Configuration](#stripe-configuration)
5. [Database Setup](#database-setup)
6. [API Endpoints](#api-endpoints)
7. [Frontend Integration](#frontend-integration)
8. [Subscription Tiers](#subscription-tiers)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

## Overview

The payment service handles:
- Subscription management (6-tier model)
- One-time purchases (coins, boosts)
- Payment processing with Stripe
- Webhook event handling
- Refunds and disputes
- Payment method management

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Payment    │────▶│   Stripe    │
│   (React)   │     │   Service    │     │     API     │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    └──────────────┘
                           ▲
                           │
                    ┌──────────────┐
                    │  Stripe      │
                    │  Webhooks    │
                    └──────────────┘
```

## Environment Setup

### Required Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Service Configuration
SERVICE_NAME=payment-service
NODE_ENV=development
PORT=3005

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_payments
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_DEBUG=false

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
STRIPE_API_VERSION=2024-12-18.acacia

# Service URLs
USER_SERVICE_URL=http://localhost:3002
NOTIFICATION_SERVICE_URL=http://localhost:3012

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Stripe Configuration

### 1. Get Stripe API Keys

1. Create a Stripe account at https://stripe.com
2. Go to **Developers → API keys**
3. Copy your:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### 2. Set Up Webhooks

#### For Development (using Stripe CLI):

```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3005/api/webhooks/stripe
```

Copy the webhook signing secret and add to `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

#### For Production:

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Click **Add endpoint**
3. Enter URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events:
   - `customer.subscription.*`
   - `payment_intent.*`
   - `invoice.*`
   - `checkout.session.*`
   - `charge.*`
   - `refund.*`
   - `payment_method.*`

5. Copy the **Signing secret** to production environment

### 3. Create Products and Prices in Stripe

#### Subscription Tiers:

```bash
# Create products for each tier
stripe products create --name="Basic Tier" --description="Entry-level paid tier"
stripe products create --name="Plus Tier" --description="Enhanced features"
stripe products create --name="Premium Tier" --description="Full feature access"
stripe products create --name="Premium+ Tier" --description="Power user tier"
stripe products create --name="Elite Tier" --description="VIP experience"

# Create prices for each product
stripe prices create \
  --product=prod_xxxxx \
  --unit-amount=999 \
  --currency=usd \
  --recurring='{"interval":"month"}'

# Create yearly price with discount
stripe prices create \
  --product=prod_xxxxx \
  --unit-amount=9588 \
  --currency=usd \
  --recurring='{"interval":"year"}'
```

#### One-time Purchase Products:

```bash
# Coin packages
stripe products create --name="100 Coins" --type=good
stripe prices create --product=prod_xxxxx --unit-amount=499 --currency=usd

stripe products create --name="500 Coins" --type=good
stripe prices create --product=prod_xxxxx --unit-amount=1999 --currency=usd

# Boosts
stripe products create --name="30-Minute Boost" --type=good
stripe prices create --product=prod_xxxxx --unit-amount=299 --currency=usd
```

## Database Setup

### 1. Create Database

```bash
# PostgreSQL
createdb flamoral_payments
```

### 2. Run Migrations

```bash
cd backend/services/payment-service
npm install
npm run migrate
```

This creates the following tables:
- `subscription_plans` - Plan definitions
- `user_subscriptions` - User subscription records
- `transactions` - Payment transactions
- `stripe_webhook_events` - Webhook event log
- `payment_methods` - Saved payment methods
- `coin_packages` - Coin package definitions
- `coin_transactions` - Coin balance tracking

### 3. Seed Initial Data

```bash
npm run seed
```

Seeds subscription plans and coin packages.

## API Endpoints

### Payment Intents

#### Create Payment Intent
```http
POST /api/payments/create-intent
Content-Type: application/json
Authorization: Bearer {token}

{
  "amount": 19.99,
  "currency": "usd",
  "customerId": "cus_xxxxx",
  "metadata": {
    "userId": "user_123",
    "type": "coin_purchase",
    "productSku": "COIN_PACK_MEDIUM"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_xxxxx_secret_xxxxx",
    "paymentIntentId": "pi_xxxxx"
  }
}
```

### Subscriptions

#### Purchase Subscription
```http
POST /api/payments/subscription/create
Content-Type: application/json
Authorization: Bearer {token}

{
  "userId": "user_123",
  "tier": "premium",
  "priceId": "price_xxxxx",
  "email": "user@example.com",
  "paymentMethodId": "pm_xxxxx",
  "trialDays": 7
}
```

#### Cancel Subscription
```http
POST /api/payments/subscription/cancel
Content-Type: application/json
Authorization: Bearer {token}

{
  "subscriptionId": "sub_xxxxx",
  "immediately": false
}
```

#### Update Subscription Tier
```http
POST /api/payments/subscription/update-tier
Content-Type: application/json
Authorization: Bearer {token}

{
  "subscriptionId": "sub_xxxxx",
  "newPriceId": "price_xxxxx"
}
```

### Checkout Sessions

#### Create Checkout Session
```http
POST /api/payments/checkout/create
Content-Type: application/json
Authorization: Bearer {token}

{
  "customerEmail": "user@example.com",
  "successUrl": "https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}",
  "cancelUrl": "https://yourapp.com/cancel",
  "mode": "subscription",
  "priceId": "price_xxxxx",
  "metadata": {
    "userId": "user_123",
    "tier": "premium"
  },
  "trialPeriodDays": 7,
  "allowPromotionCodes": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_xxxxx",
    "url": "https://checkout.stripe.com/c/pay/cs_xxxxx"
  }
}
```

### Customers

#### Create Customer
```http
POST /api/payments/customers
Content-Type: application/json
Authorization: Bearer {token}

{
  "userId": "user_123",
  "email": "user@example.com",
  "name": "John Doe"
}
```

#### Get Customer
```http
GET /api/payments/customers/{customerId}
Authorization: Bearer {token}
```

### Payment Methods

#### Get Payment Methods
```http
GET /api/payments/methods/{customerId}
Authorization: Bearer {token}
```

#### Add Payment Method
```http
POST /api/payments/methods/add
Content-Type: application/json
Authorization: Bearer {token}

{
  "customerId": "cus_xxxxx",
  "paymentMethodId": "pm_xxxxx"
}
```

### Refunds

#### Process Refund
```http
POST /api/payments/refund
Content-Type: application/json
Authorization: Bearer {token}

{
  "paymentIntentId": "pi_xxxxx",
  "amount": 10.00,
  "reason": "requested_by_customer"
}
```

### Configuration

#### Get Configuration Status
```http
GET /api/payments/config/status
Authorization: Bearer {token}
```

**Response:**
```json
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

## Frontend Integration

### 1. Install Stripe.js

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 2. Configure Stripe Provider

```tsx
// App.tsx
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function App() {
  return (
    <Elements stripe={stripePromise}>
      {/* Your app components */}
    </Elements>
  );
}
```

### 3. Implement Payment Components

#### Checkout Button Component:

```tsx
// components/CheckoutButton.tsx
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { paymentService } from '../services/payment.service';

export function CheckoutButton({ priceId, tier }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);

    try {
      // Create checkout session
      const session = await paymentService.createCheckoutSession({
        customerEmail: user.email,
        successUrl: `${window.location.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/subscription/cancel`,
        mode: 'subscription',
        priceId,
        metadata: {
          userId: user.id,
          tier,
        },
        trialPeriodDays: 7,
        allowPromotionCodes: true,
      });

      // Redirect to Stripe Checkout
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
      await stripe.redirectToCheckout({ sessionId: session.sessionId });
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleCheckout} disabled={loading}>
      {loading ? 'Processing...' : 'Subscribe Now'}
    </button>
  );
}
```

#### Payment Element Component:

```tsx
// components/PaymentForm.tsx
import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { paymentService } from '../services/payment.service';

export function PaymentForm({ amount, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);

    try {
      // Create payment intent
      const { clientSecret } = await paymentService.createPaymentIntent({
        amount,
        currency: 'usd',
        customerId: user.stripeCustomerId,
        metadata: {
          userId: user.id,
          type: 'coin_purchase',
        },
      });

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: 'if_required',
      });

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent);
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit" disabled={!stripe || loading}>
        {loading ? 'Processing...' : `Pay $${amount}`}
      </button>
    </form>
  );
}
```

### 4. Use Payment Service

```tsx
// services/payment.service.ts is already created
import { paymentService } from './services/payment.service';

// Create customer
const customer = await paymentService.createCustomer(userId, email, name);

// Create checkout session
const session = await paymentService.createCheckoutSession({...});

// Cancel subscription
await paymentService.cancelSubscription(subscriptionId);
```

## Subscription Tiers

The payment service supports a 6-tier subscription model:

| Tier | Monthly Price | Features |
|------|--------------|----------|
| **Free** | $0.00 | 50 daily swipes, 1 super like/day |
| **Basic** | $9.99 | Unlimited swipes, see who likes you |
| **Plus** | $14.99 | Incognito mode, priority likes, 1 boost/month |
| **Premium** | $19.99 | Passport, unlimited super likes, 2 boosts/month |
| **Premium+** | $29.99 | Message before match, weekly boost |
| **Elite** | $49.99 | VIP badge, 3 weekly boosts, dedicated support |

## Testing

### Run Tests

```bash
npm test
```

### Test Webhooks

See [WEBHOOK_TESTING_GUIDE.md](./WEBHOOK_TESTING_GUIDE.md) for detailed webhook testing instructions.

### Test Payment Flow

1. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`

2. Test subscription creation
3. Test payment failure handling
4. Test webhook processing
5. Test refunds

## Troubleshooting

### Common Issues

#### 1. Webhook Signature Verification Failed

**Solution:**
- Check `STRIPE_WEBHOOK_SECRET` is correct
- Ensure using raw body parser for webhook endpoint
- Verify Stripe CLI is forwarding to correct URL

#### 2. Database Connection Failed

**Solution:**
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Run migrations: `npm run migrate`

#### 3. Stripe API Error

**Solution:**
- Verify API keys are correct
- Check Stripe API version compatibility
- Review Stripe dashboard for error details

#### 4. CORS Error

**Solution:**
- Add frontend URL to `CORS_ORIGINS`
- Verify credentials: true in CORS config
- Check request headers include Authorization

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
DB_DEBUG=true
```

### Health Check

```bash
curl http://localhost:3005/health
```

## Security Best Practices

1. **Never expose secret keys** - Keep `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` secure
2. **Always verify webhooks** - Verify Stripe signature on all webhook events
3. **Use HTTPS in production** - Never use webhooks over HTTP
4. **Validate user input** - Validate all request data before processing
5. **Implement rate limiting** - Prevent abuse of payment endpoints
6. **Log all transactions** - Maintain audit trail of all payment activities
7. **Handle PCI compliance** - Use Stripe Elements, never store card data

## Support

For issues or questions:
- Check logs: `docker logs payment-service`
- Review Stripe dashboard: https://dashboard.stripe.com
- Stripe documentation: https://stripe.com/docs
