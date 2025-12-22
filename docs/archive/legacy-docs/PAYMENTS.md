# Payment System Documentation

## Overview

Flamoral's payment system supports multiple payment providers to accept payments worldwide. The system is designed to handle subscriptions, consumable purchases (coins, boosts), and in-app purchases across web and mobile platforms.

## Supported Payment Providers

| Provider | Markets | Payment Methods | Use Case |
|----------|---------|-----------------|----------|
| **Stripe** | Global (Primary) | Cards, Apple Pay, Google Pay, ACH, SEPA | Primary payment gateway |
| **PayPal** | Global (Secondary) | PayPal Wallet, Venmo (US) | Alternative for users preferring PayPal |
| **Flutterwave** | Africa | Cards, Mobile Money, Bank Transfer, USSD | African markets |
| **Paystack** | Africa (Nigeria focus) | Cards, Mobile Money, Bank Transfer | Nigerian market |
| **Apple IAP** | iOS | In-App Purchases | iOS app subscriptions & consumables |
| **Google Play** | Android | Google Play Billing | Android app subscriptions & consumables |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Web/Mobile)                      │
├─────────────────────────────────────────────────────────────────┤
│  PaymentCheckout  │  CoinShop  │  SubscriptionScreen (Mobile)   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Payment API Routes                           │
│  /api/payments/*  │  /api/webhooks/*                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PaymentService                              │
│              (Orchestrates all providers)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────┬───────────┼───────────┬───────────┐
        ▼           ▼           ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│  Stripe   │ │  PayPal   │ │Flutterwave│ │ Paystack  │ │   IAP     │
│ Provider  │ │ Provider  │ │ Provider  │ │ Provider  │ │(Apple/Goo)│
└───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     WebhookService                               │
│             (Unified webhook processing)                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Database                                   │
│  payment_customers │ user_subscriptions │ payment_transactions  │
│  user_wallets │ wallet_transactions │ webhook_events            │
└─────────────────────────────────────────────────────────────────┘
```

## Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
PAYPAL_MODE=sandbox|live

# Flutterwave
FLUTTERWAVE_SECRET_KEY=FLWSECK_...
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_...
FLUTTERWAVE_ENCRYPTION_KEY=...
FLUTTERWAVE_WEBHOOK_SECRET=...

# Paystack
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...

# Apple IAP
APPLE_BUNDLE_ID=com.flamoral.app
APPLE_SHARED_SECRET=...

# Google Play
GOOGLE_PACKAGE_NAME=com.flamoral.app
GOOGLE_SERVICE_ACCOUNT_KEY={"type": "service_account", ...}
```

## API Endpoints

### Checkout & Payments

```
POST /api/payments/checkout
  - Create hosted checkout session (Stripe, PayPal, Flutterwave, Paystack)
  - Body: { provider, productId, productType, successUrl, cancelUrl }

POST /api/payments/intent
  - Create payment intent for embedded checkout
  - Body: { provider, amount, currency, productId, paymentMethodId }

POST /api/payments/confirm
  - Confirm a payment
  - Body: { paymentIntentId, provider, paymentMethodId }
```

### In-App Purchases (Mobile)

```
POST /api/payments/iap/validate
  - Validate Apple/Google receipt
  - Body: { provider, receipt, productId, transactionId, packageName }

POST /api/payments/iap/restore
  - Restore previous purchases
  - Body: { provider, receipt, packageName }
```

### African Payment Methods

```
POST /api/payments/mobile-money
  - Initiate mobile money payment (MTN, Vodafone, M-Pesa, etc.)
  - Body: { provider, amount, currency, phoneNumber, network }

POST /api/payments/bank-transfer
  - Get bank transfer details / virtual account
  - Body: { provider, amount, currency, email }

POST /api/payments/ussd
  - Get USSD payment code (Nigeria)
  - Body: { provider, amount, currency, accountBank }
```

### Subscriptions

```
GET /api/payments/subscription
  - Get current subscription status

POST /api/payments/subscription/cancel
  - Cancel subscription
  - Body: { reason, cancelImmediately }

POST /api/payments/subscription/resume
  - Resume paused subscription

POST /api/payments/subscription/update
  - Change subscription plan
  - Body: { newPlanId, prorate }
```

### Payment Methods

```
GET /api/payments/methods
  - Get saved payment methods

POST /api/payments/methods
  - Add new payment method
  - Body: { provider, paymentMethodToken, setAsDefault }

DELETE /api/payments/methods/:id
  - Remove payment method

PUT /api/payments/methods/:id/default
  - Set default payment method
```

### Wallet

```
GET /api/payments/wallet
  - Get coin/gem balance

GET /api/payments/wallet/transactions
  - Get wallet transaction history
  - Query: { limit, offset, type }
```

### Products & Plans

```
GET /api/payments/products
  - Get available products (coins, boosts)
  - Query: { type, country }

GET /api/payments/plans
  - Get subscription plans
  - Query: { country }

GET /api/payments/providers
  - Get available payment providers
  - Query: { country, platform }
```

### Webhooks

```
POST /api/webhooks/stripe
POST /api/webhooks/paypal
POST /api/webhooks/flutterwave
POST /api/webhooks/paystack
POST /api/webhooks/apple
POST /api/webhooks/google
```

## Webhook Configuration

### Stripe
1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://api.flamoral.com/api/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `charge.refunded`

### PayPal
1. Go to PayPal Developer Dashboard > Webhooks
2. Add endpoint: `https://api.flamoral.com/api/webhooks/paypal`
3. Select events:
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
   - `BILLING.SUBSCRIPTION.*`

### Flutterwave
1. Go to Flutterwave Dashboard > Settings > Webhooks
2. Set URL: `https://api.flamoral.com/api/webhooks/flutterwave`
3. Copy the secret hash for verification

### Paystack
1. Go to Paystack Dashboard > Settings > API Keys & Webhooks
2. Set Webhook URL: `https://api.flamoral.com/api/webhooks/paystack`
3. Events are automatically sent for all transaction types

### Apple App Store Server Notifications
1. Go to App Store Connect > App > App Information
2. Set Server URL: `https://api.flamoral.com/api/webhooks/apple`
3. Configure for both Version 1 and Version 2 notifications

### Google Play Real-Time Developer Notifications
1. Create a Cloud Pub/Sub topic in Google Cloud Console
2. Add subscription push endpoint: `https://api.flamoral.com/api/webhooks/google`
3. Configure in Google Play Console > Monetization setup

## Database Schema

### Core Tables

```sql
-- Payment provider customers
CREATE TABLE payment_customers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  provider payment_provider,
  provider_customer_id VARCHAR,
  email VARCHAR,
  name VARCHAR,
  UNIQUE(user_id, provider)
);

-- User subscriptions
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  provider payment_provider,
  provider_subscription_id VARCHAR,
  plan_id VARCHAR,
  status subscription_status,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN,
  UNIQUE(provider, provider_subscription_id)
);

-- Payment transactions
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  provider payment_provider,
  provider_transaction_id VARCHAR,
  type transaction_type,
  amount INTEGER,
  currency VARCHAR(3),
  status VARCHAR,
  UNIQUE(provider, provider_transaction_id)
);

-- User wallets
CREATE TABLE user_wallets (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(id),
  coins INTEGER DEFAULT 0,
  gems INTEGER DEFAULT 0,
  bonus_coins INTEGER DEFAULT 0
);

-- Webhook events (idempotency)
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY,
  provider payment_provider,
  event_id VARCHAR,
  event_type VARCHAR,
  status VARCHAR,
  processed_at TIMESTAMP,
  UNIQUE(provider, event_id)
);
```

## Mobile Integration

### iOS (React Native)

```typescript
import { paymentService } from './services/payments/PaymentService';

// Initialize on app start
await paymentService.initialize();

// Get products
const subscriptions = await paymentService.getSubscriptions();
const consumables = await paymentService.getConsumables();

// Purchase subscription
const purchase = await paymentService.purchaseSubscription('com.flamoral.gold.monthly');

// Purchase consumable
const coins = await paymentService.purchaseConsumable('com.flamoral.coins.500');

// Restore purchases
const restored = await paymentService.restorePurchases();

// Cleanup on unmount
paymentService.cleanup();
```

### Android (React Native)

Same API as iOS - the `PaymentService` handles platform-specific logic internally.

### App Store / Play Store Setup

#### iOS Products (App Store Connect)
- `com.flamoral.gold.monthly` - Gold Monthly ($14.99)
- `com.flamoral.gold.yearly` - Gold Yearly ($99.99)
- `com.flamoral.platinum.monthly` - Platinum Monthly ($24.99)
- `com.flamoral.platinum.yearly` - Platinum Yearly ($149.99)
- `com.flamoral.diamond.monthly` - Diamond Monthly ($39.99)
- `com.flamoral.diamond.yearly` - Diamond Yearly ($239.99)
- `com.flamoral.coins.100` - 100 Coins ($4.99)
- `com.flamoral.coins.500` - 500 Coins ($19.99)
- `com.flamoral.coins.1000` - 1000 Coins ($34.99)

#### Android Products (Google Play Console)
Same products with shorter IDs: `gold_monthly`, `coins_500`, etc.

## Feature Flags

Payment providers can be enabled/disabled per country:

```sql
-- Enable Stripe for US, Canada, UK
INSERT INTO payment_feature_flags (key, enabled, countries)
VALUES ('stripe_enabled', true, ARRAY['US', 'CA', 'GB']);

-- Enable Flutterwave for African markets
INSERT INTO payment_feature_flags (key, enabled, countries)
VALUES ('flutterwave_enabled', true, ARRAY['NG', 'GH', 'KE', 'UG']);
```

## Security Considerations

1. **Webhook Verification**: All webhooks verify signatures before processing
2. **Idempotency**: Webhook events are deduplicated using `webhook_events` table
3. **Receipt Validation**: All IAP receipts are validated server-side
4. **PCI Compliance**: Card details never touch our servers (tokenization)
5. **Rate Limiting**: All payment endpoints are rate-limited
6. **Audit Logging**: All payment operations are logged to `payment_audit_log`

## Testing

### Test Cards (Stripe)
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0027 6000 3184`

### Sandbox Environments
- PayPal: Use sandbox credentials
- Flutterwave: Use test keys (FLWSECK_TEST-...)
- Paystack: Use test keys (sk_test_...)
- Apple: Use sandbox environment
- Google: Use license testing accounts

### Running Tests
```bash
cd backend
npm run test:payments
```

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check webhook URL is publicly accessible
   - Verify webhook secret is correct
   - Check firewall rules

2. **IAP validation failing**
   - Ensure bundle ID matches
   - Check shared secret for Apple
   - Verify service account for Google

3. **Mobile money timing out**
   - User may need to confirm on their phone
   - Check network is supported in the region

4. **Subscription not activating**
   - Check webhook is processing correctly
   - Verify user_subscriptions table is being updated

## Revenue Dashboard

Access the admin revenue dashboard at `/admin/revenue` to view:
- Total revenue by period
- Revenue by provider
- Revenue by subscription plan
- Revenue by region
- Recent transactions
- Refund rates

## Support

For payment-related issues:
- Check `payment_audit_log` for detailed error information
- Review webhook_events for failed webhook processing
- Contact provider support with transaction IDs
