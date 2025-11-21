# Production Stripe Setup Guide

**Date:** 2025-11-20
**Status:** ✅ GUIDE COMPLETE - Ready for Implementation

---

## Overview

This guide walks through switching from Stripe test mode to production mode for the ConnectSphere dating app payment system.

---

## Current Stripe Implementation

### ✅ What's Already Implemented

The payment service (`backend/services/payment-service/src/domain/services/payment.service.ts`) includes:

**Payment Features:**
- Customer management (create, retrieve, update)
- Subscription creation and management
- Coin purchases (one-time payments)
- Boost purchases (one-time payments)
- Payment method management
- Refund processing
- Webhook handling

**Webhook Events Handled:**
- `payment_intent.succeeded` - Successful payment
- `payment_intent.payment_failed` - Failed payment
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription changes
- `customer.subscription.deleted` - Subscription canceled
- `invoice.payment_succeeded` - Successful recurring payment
- `invoice.payment_failed` - Failed recurring payment

**Environment Variables Used:**
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret

---

## Step-by-Step Production Setup

### 1. Create Stripe Production Account

#### a. Log in to Stripe Dashboard
- Go to https://dashboard.stripe.com/
- Ensure you're in **Production mode** (toggle in top-right corner)

#### b. Complete Account Activation
Before you can accept real payments, Stripe requires:
- Business information
- Banking details (for payouts)
- Tax information (W-9 for US businesses)
- Identity verification

**Steps:**
1. Click **Settings** → **Account** → **Business Profile**
2. Fill in all required information:
   - Business name
   - Business type (LLC, Corporation, Individual, etc.)
   - Business address
   - Phone number
   - Website URL
3. Add banking information:
   - Go to **Settings** → **Bank accounts and scheduling**
   - Add your bank account for payouts
4. Complete tax forms:
   - Go to **Settings** → **Tax settings**
   - Fill out W-9 (US) or W-8 (International)

---

### 2. Create Stripe Products and Prices

#### Subscription Plans

Navigate to **Products** → **Add Product** for each tier:

**Basic Subscription:**
```
Product Name: ConnectSphere Basic
Description: Basic premium features including unlimited likes and profile boosts
Pricing Model: Recurring
Price: $9.99/month
Currency: USD
Billing Period: Monthly
```
**Copy the Price ID:** `price_xxxxxxxxxxxxx`

**Mid Subscription:**
```
Product Name: ConnectSphere Mid
Description: Mid-tier premium features with advanced filters and read receipts
Pricing Model: Recurring
Price: $19.99/month
Currency: USD
Billing Period: Monthly
```
**Copy the Price ID:** `price_xxxxxxxxxxxxx`

**Ultra Subscription:**
```
Product Name: ConnectSphere Ultra
Description: Ultimate features including priority support and profile highlights
Pricing Model: Recurring
Price: $29.99/month
Currency: USD
Billing Period: Monthly
```
**Copy the Price ID:** `price_xxxxxxxxxxxxx`

#### Coin Packages

Create one-time payment products:

**Small Coin Pack:**
```
Product Name: 100 Coins
Description: Small coin package
Pricing Model: One-time
Price: $4.99
Currency: USD
Product SKU: COIN_PACK_SMALL
```
**Copy the Price ID:** `price_xxxxxxxxxxxxx`

**Medium Coin Pack:**
```
Product Name: 500 Coins
Description: Medium coin package
Pricing Model: One-time
Price: $19.99
Currency: USD
Product SKU: COIN_PACK_MEDIUM
```
**Copy the Price ID:** `price_xxxxxxxxxxxxx`

**Large Coin Pack:**
```
Product Name: 1200 Coins
Description: Large coin package (20% bonus)
Pricing Model: One-time
Price: $39.99
Currency: USD
Product SKU: COIN_PACK_LARGE
```
**Copy the Price ID:** `price_xxxxxxxxxxxxx`

**XL Coin Pack:**
```
Product Name: 2500 Coins
Description: Extra large coin package (25% bonus)
Pricing Model: One-time
Price: $74.99
Currency: USD
Product SKU: COIN_PACK_XL
```
**Copy the Price ID:** `price_xxxxxxxxxxxxx`

#### Boost Packages

**30-Minute Boost:**
```
Product Name: 30 Minute Profile Boost
Description: Boost your profile for 30 minutes
Pricing Model: One-time
Price: $2.99
Currency: USD
Product SKU: BOOST_30MIN
```
**Copy the Price ID:** `price_xxxxxxxxxxxxx`

**1-Hour Boost:**
```
Product Name: 1 Hour Profile Boost
Description: Boost your profile for 1 hour
Pricing Model: One-time
Price: $4.99
Currency: USD
Product SKU: BOOST_1HR
```
**Copy the Price ID:** `price_xxxxxxxxxxxxx`

**3-Hour Boost:**
```
Product Name: 3 Hour Profile Boost
Description: Boost your profile for 3 hours
Pricing Model: One-time
Price: $9.99
Currency: USD
Product SKU: BOOST_3HR
```
**Copy the Price ID:** `price_xxxxxxxxxxxxx`

---

### 3. Get Production API Keys

#### a. Navigate to API Keys
- Go to **Developers** → **API keys**
- Make sure you're in **Production mode** (NOT test mode)

#### b. Copy Production Keys
**Secret Key:**
```
sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
⚠️ **Never commit this to Git!**

**Publishable Key:**
```
pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
This can be safely exposed in frontend code.

---

### 4. Set Up Webhooks

#### a. Create Webhook Endpoint
1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your production webhook URL:
   ```
   https://yourdomain.com/api/payments/webhook
   ```
   Or for specific service:
   ```
   https://yourdomain.com/api/payment-service/webhook
   ```

#### b. Select Events to Listen To
Select these events:
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

#### c. Copy Webhook Signing Secret
After creating the endpoint, Stripe will show:
```
whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
**Save this - you'll need it for environment variables.**

---

### 5. Update Environment Variables

#### Production .env File

Update your production environment configuration:

```env
# ===========================================
# STRIPE PRODUCTION CONFIGURATION
# ===========================================

# Stripe Secret Key (LIVE mode - keep secure!)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe Publishable Key (LIVE mode - safe for frontend)
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe Webhook Secret (LIVE mode)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ===========================================
# STRIPE PRODUCT PRICE IDs (LIVE mode)
# ===========================================

# Subscription Plans
STRIPE_PRICE_BASIC_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_MID_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_ULTRA_MONTHLY=price_xxxxxxxxxxxxx

# Coin Packages
STRIPE_PRICE_COIN_SMALL=price_xxxxxxxxxxxxx
STRIPE_PRICE_COIN_MEDIUM=price_xxxxxxxxxxxxx
STRIPE_PRICE_COIN_LARGE=price_xxxxxxxxxxxxx
STRIPE_PRICE_COIN_XL=price_xxxxxxxxxxxxx

# Boost Packages
STRIPE_PRICE_BOOST_30MIN=price_xxxxxxxxxxxxx
STRIPE_PRICE_BOOST_1HR=price_xxxxxxxxxxxxx
STRIPE_PRICE_BOOST_3HR=price_xxxxxxxxxxxxx
```

#### Where to Set These Variables

**Option 1: Kubernetes Secrets (Recommended for Production)**
```bash
kubectl create secret generic stripe-secrets \
  --from-literal=STRIPE_SECRET_KEY=sk_live_xxx \
  --from-literal=STRIPE_WEBHOOK_SECRET=whsec_xxx \
  --namespace=production
```

**Option 2: Docker Compose (for staging/testing)**
```yaml
environment:
  - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
  - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
```

**Option 3: Cloud Provider Secrets Manager**
- AWS: AWS Secrets Manager
- Azure: Azure Key Vault
- GCP: Google Secret Manager

---

### 6. Update Frontend Configuration

#### Update Frontend Environment Variables

Create `frontend/web/.env.production`:

```env
# Stripe Publishable Key (LIVE mode)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# API URLs
VITE_API_URL=https://api.yourdomain.com
VITE_PAYMENT_SERVICE_URL=https://api.yourdomain.com/payment-service
```

#### Update Stripe Elements in Frontend

If using Stripe Elements, ensure loadStripe uses the production key:

```typescript
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
```

---

### 7. Enable Payment Methods

#### Configure Payment Methods
1. Go to **Settings** → **Payment methods**
2. Enable payment methods for your region:
   - ✅ **Cards** (Visa, Mastercard, American Express, Discover)
   - ✅ **Apple Pay**
   - ✅ **Google Pay**
   - ✅ **Link** (Stripe's one-click payment)

Optional (regional):
- PayPal
- SEPA Direct Debit (Europe)
- Afterpay/Clearpay (Buy now, pay later)
- ACH Direct Debit (US)

---

### 8. Configure Billing Settings

#### a. Customer Portal
1. Go to **Settings** → **Customer portal**
2. Enable customer portal
3. Configure allowed actions:
   - ✅ Update payment method
   - ✅ Cancel subscription
   - ✅ View invoice history
   - ✅ Update billing information

#### b. Email Receipts
1. Go to **Settings** → **Emails**
2. Configure email settings:
   - ✅ Send receipts
   - ✅ Send invoice reminders
   - ✅ Send payment failed notifications
3. Customize email branding:
   - Upload logo
   - Set brand colors
   - Set support email

#### c. Tax Collection (if applicable)
1. Go to **Settings** → **Tax**
2. Enable automatic tax collection
3. Configure tax rates for your regions

---

### 9. Test Production Integration

⚠️ **Before going live, test with small real payments!**

#### Test Checklist

**Subscription Tests:**
- [ ] Create new subscription (Basic tier)
- [ ] Upgrade subscription (Basic → Mid)
- [ ] Downgrade subscription (Mid → Basic)
- [ ] Cancel subscription (end of period)
- [ ] Cancel subscription (immediately)
- [ ] Reactivate canceled subscription
- [ ] Test failed payment (use declined test card, then switch to production)

**One-Time Payment Tests:**
- [ ] Purchase small coin pack
- [ ] Purchase large coin pack
- [ ] Purchase 30-min boost
- [ ] Purchase 1-hour boost

**Payment Method Tests:**
- [ ] Add new payment method
- [ ] Remove payment method
- [ ] Set default payment method
- [ ] Test with different card types (Visa, Mastercard, Amex)

**Webhook Tests:**
- [ ] Test subscription created webhook
- [ ] Test payment succeeded webhook
- [ ] Test payment failed webhook
- [ ] Test subscription updated webhook
- [ ] Test subscription deleted webhook
- [ ] Test invoice payment succeeded webhook

**Refund Tests:**
- [ ] Process full refund
- [ ] Process partial refund
- [ ] Verify coins/subscription are reverted

---

### 10. Monitoring and Alerts

#### Set Up Stripe Alerts
1. Go to **Settings** → **Notifications**
2. Enable alerts for:
   - ✅ Failed payments
   - ✅ High chargeback rates
   - ✅ Unusual activity
   - ✅ Webhook failures

#### Monitor Key Metrics
Dashboard metrics to watch:
- **Gross volume** - Total payment volume
- **Net volume** - After refunds and disputes
- **Success rate** - Percentage of successful payments
- **Chargeback rate** - Should be < 1%
- **MRR (Monthly Recurring Revenue)** - Subscription revenue
- **Active subscriptions** - Number of paying subscribers

---

### 11. Security Best Practices

#### ✅ Do's
- ✅ **Use HTTPS** - All production endpoints must use HTTPS
- ✅ **Verify webhooks** - Always verify webhook signatures
- ✅ **Store keys securely** - Use secrets manager, never commit to Git
- ✅ **Use idempotency keys** - Prevent duplicate charges
- ✅ **Log all transactions** - Keep audit trail
- ✅ **Handle errors gracefully** - User-friendly error messages

#### ❌ Don'ts
- ❌ **Never log secret keys** - Don't include in logs
- ❌ **Never commit keys to Git** - Use .gitignore
- ❌ **Don't store card details** - Let Stripe handle it
- ❌ **Don't skip webhook verification** - Prevents fraudulent requests
- ❌ **Don't use test keys in production** - Will fail

---

### 12. PCI Compliance

Good news: **You are PCI compliant by default** when using Stripe Elements or Checkout!

Why?
- Stripe handles all card data
- Card details never touch your servers
- Stripe is PCI Level 1 certified

You just need to:
- ✅ Use Stripe.js or Stripe Checkout
- ✅ Use HTTPS for all pages
- ✅ Don't log or store card numbers

---

### 13. Go-Live Checklist

Before launching to real users:

#### Business Setup
- [ ] Stripe account fully activated
- [ ] Banking information verified
- [ ] Tax forms submitted (W-9/W-8)
- [ ] Business profile completed

#### Technical Setup
- [ ] Production API keys configured
- [ ] Webhook endpoint created and verified
- [ ] Frontend using production publishable key
- [ ] All price IDs updated to production
- [ ] Payment methods enabled
- [ ] Customer portal enabled

#### Testing
- [ ] Test subscription flow end-to-end
- [ ] Test one-time payments
- [ ] Test webhook delivery
- [ ] Test refund process
- [ ] Test failed payment handling

#### Monitoring
- [ ] Error tracking enabled (Sentry)
- [ ] Stripe alerts configured
- [ ] Transaction logging enabled
- [ ] Revenue dashboard set up

#### Legal & Compliance
- [ ] Terms of Service mentions subscription billing
- [ ] Privacy Policy mentions payment processing
- [ ] Refund policy clearly stated
- [ ] Stripe mentioned in footer/legal pages

---

### 14. Common Issues and Solutions

#### Issue: Webhook Not Receiving Events
**Solution:**
- Verify webhook URL is publicly accessible
- Check webhook secret is correct
- Ensure endpoint returns 200 status
- Check webhook logs in Stripe Dashboard

#### Issue: Payment Fails with "Card Declined"
**Solution:**
- User's card may be declined by bank
- Suggest user contacts their bank
- Offer alternative payment method
- Check fraud detection isn't blocking payment

#### Issue: "Invalid API Key" Error
**Solution:**
- Ensure using production key (`sk_live_`) not test key (`sk_test_`)
- Verify key hasn't been deleted/rotated
- Check environment variable is set correctly

#### Issue: Webhooks Timing Out
**Solution:**
- Webhook processing should be < 5 seconds
- Return 200 immediately, process async
- Use job queue for heavy processing

---

### 15. Cost Optimization Tips

#### Reduce Stripe Fees
- **Negotiate rates** - Contact Stripe for custom pricing if processing > $100k/month
- **Optimize declined payments** - Retry failed payments (Stripe Smart Retries)
- **Use ACH/SEPA** - Lower fees than cards (0.8% vs 2.9%)
- **Annual billing** - Reduce transaction fees (12 → 1 charge per year)

#### Current Stripe Fees
- **Cards:** 2.9% + $0.30 per transaction
- **ACH:** 0.8% (capped at $5)
- **Subscriptions:** Same as above, charged monthly
- **International cards:** +1.5%
- **Currency conversion:** +1%

---

### 16. Revenue Projections

Based on your pricing:

**Monthly Recurring Revenue (MRR) Projections:**

| Subscribers | Basic ($9.99) | Mid ($19.99) | Ultra ($29.99) | Total MRR |
|-------------|---------------|--------------|----------------|-----------|
| 100         | $499.50       | $999.50      | $1,499.50      | $2,998.50 |
| 1,000       | $4,995        | $9,995       | $14,995        | $29,985   |
| 10,000      | $49,950       | $99,950      | $149,950       | $299,850  |
| 50,000      | $249,750      | $499,750     | $749,750       | $1,499,250|

**One-Time Revenue (Coins/Boosts):**
Assuming 20% of users buy coins/boosts monthly:
- Average purchase: $10/user/month
- 1,000 users × 20% × $10 = $2,000/month
- 10,000 users × 20% × $10 = $20,000/month

**Total Monthly Revenue (10,000 users example):**
- Subscriptions: ~$300,000
- Coins/Boosts: ~$20,000
- **Total: ~$320,000/month**

**Stripe Fees:**
- $320,000 × 2.9% = $9,280
- Plus $0.30 × ~10,000 transactions = $3,000
- **Total fees: ~$12,280/month (~3.8%)**

---

### 17. Support and Resources

#### Stripe Support
- **Email:** support@stripe.com
- **Chat:** https://support.stripe.com/contact
- **Phone:** Available for accounts processing > $10k/month

#### Documentation
- **API Docs:** https://docs.stripe.com/api
- **Webhooks Guide:** https://docs.stripe.com/webhooks
- **Testing Guide:** https://docs.stripe.com/testing
- **Security Guide:** https://docs.stripe.com/security

#### Stripe Dashboard
- **Production:** https://dashboard.stripe.com/
- **Test Mode:** https://dashboard.stripe.com/test/

---

## Summary

### ✅ What You've Accomplished
- Comprehensive Stripe production setup guide
- Product and price creation instructions
- Environment variable configuration
- Webhook setup documentation
- Security best practices
- Testing checklist
- Go-live checklist

### ⏱️ Estimated Setup Time
- **Account Setup:** 30 minutes
- **Product Creation:** 45 minutes
- **API Key Configuration:** 15 minutes
- **Webhook Setup:** 30 minutes
- **Testing:** 2 hours
- **Total:** ~4 hours

### 🚀 Next Steps

1. Complete Stripe account activation
2. Create all products and prices
3. Copy production API keys to secure storage
4. Update environment variables
5. Test with small real payments
6. Monitor for 24-48 hours
7. Launch to all users

---

**Status:** ✅ **PRODUCTION STRIPE GUIDE COMPLETE**

**Files Created:**
- `PRODUCTION_STRIPE_SETUP.md` - Comprehensive production setup guide

**Ready for:** Production deployment after completing setup steps above
