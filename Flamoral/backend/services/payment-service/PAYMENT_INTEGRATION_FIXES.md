# Payment Integration Configuration Fixes

## Overview

This document outlines all the fixes and improvements made to the Flamoral payment service to ensure secure, reliable, and properly configured payment processing.

## Date: 2025-12-15

---

## 1. Stripe Configuration Security ✅

### Issues Fixed:
- **Insecure secret key handling**: Keys were accessed directly from environment variables without validation
- **No environment validation**: Missing validation for required Stripe configuration
- **Test/Live mode mismatch**: No checks to prevent using test keys in production

### Solutions Implemented:

#### Created `src/config/payment.config.ts`:
- **Centralized configuration management** for all Stripe and payment settings
- **Automatic validation** of Stripe keys on initialization
- **Environment mode detection** (test vs live) with production safety checks
- **Singleton Stripe client** to prevent multiple instances
- **Sanitized logging** to prevent secret exposure in logs

```typescript
// Key features:
- validateStripeConfig(): Validates all Stripe configuration
- getStripeClient(): Returns singleton Stripe instance
- verifyWebhookSignature(): Secure webhook signature verification
- getSanitizedConfig(): Safe logging without exposing secrets
```

### Security Improvements:
1. **Validates secret keys** start with `sk_` and webhook secrets with `whsec_`
2. **Prevents test keys in production** environment
3. **Warns when using live keys** in non-production environments
4. **Masks secrets in logs** - only shows last 4 characters
5. **Fails fast** - exits on configuration errors in production

---

## 2. Webhook Signature Verification ✅

### Issues Fixed:
- **Inconsistent signature verification**: Multiple implementations across files
- **Missing signature validation**: No check for missing signature headers
- **Error messages too generic**: Not helpful for debugging

### Solutions Implemented:

#### Updated Webhook Controller:
- **Centralized signature verification** using `paymentConfig.verifyWebhookSignature()`
- **Enhanced error logging** with detailed error messages
- **Missing signature detection** before attempting verification
- **Proper error responses** with specific webhook error codes

```typescript
// Before:
event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

// After:
const result = paymentConfig.verifyWebhookSignature(req.body, sig);
if (!result.valid || !result.event) {
  logger.error('Webhook signature verification failed:', result.error);
  return res.status(400).json({ error: `Webhook Error: ${result.error}` });
}
```

### Security Improvements:
1. **Always verifies webhook signature** before processing
2. **Logs failed verification attempts** for security monitoring
3. **Returns appropriate HTTP status codes** (400 for invalid signatures)
4. **Prevents webhook replay attacks** through idempotency checks

---

## 3. Error Handling & Timeout Configuration ✅

### Issues Fixed:
- **No global error handler**: Unhandled errors crashed the service
- **Generic error messages**: Not user-friendly
- **No request timeouts**: Requests could hang indefinitely
- **Missing async error handling**: Promise rejections not caught

### Solutions Implemented:

#### Created `src/api/middleware/error-handler.middleware.ts`:

**Custom Error Classes:**
- `PaymentError` - Base payment error class
- `StripeError` - Stripe-specific errors with user-friendly messages
- `WebhookError` - Webhook processing errors
- `RateLimitError` - Rate limit exceeded errors
- `ValidationError` - Input validation errors

**Error Handler Features:**
1. **User-friendly error messages** for all Stripe error types
2. **Detailed logging** with stack traces for debugging
3. **Proper HTTP status codes** (400, 429, 500, etc.)
4. **Consistent error response format**

**Request Timeout:**
```typescript
// 30-second timeout for all requests
app.use(requestTimeout(30000));
```

**Async Handler Wrapper:**
```typescript
// Automatically catches promise rejections
router.post('/create-intent', asyncHandler(controller.createPaymentIntent));
```

### Improvements:
1. **Catches all unhandled errors** before they crash the service
2. **Returns structured error responses** with error codes
3. **Prevents hanging requests** with automatic timeouts
4. **Logs all errors** for monitoring and debugging
5. **User-friendly messages** for card declines, insufficient funds, etc.

---

## 4. Rate Limiting ✅

### Issues Fixed:
- **No rate limiting**: Vulnerable to abuse and DoS attacks
- **Unlimited payment requests**: Could be used to test stolen cards
- **No per-user limits**: IP-based only, easy to circumvent

### Solutions Implemented:

#### Created `src/api/middleware/rate-limit.middleware.ts`:

**Features:**
- **Per-user rate limiting** (not just IP-based)
- **Separate limits** for payment vs standard endpoints
- **Configurable windows and limits** via environment variables
- **Rate limit headers** in responses (`X-RateLimit-*`)
- **Automatic cleanup** of expired entries

**Configuration:**
```bash
RATE_LIMIT_WINDOW_MS=60000              # 1 minute
RATE_LIMIT_PAYMENT_MAX_REQUESTS=10      # 10 payment requests per minute
RATE_LIMIT_STANDARD_MAX_REQUESTS=60     # 60 standard requests per minute
```

**Applied to Routes:**
```typescript
// Payment endpoints - strict limits
router.post('/create-intent', paymentRateLimit, ...);
router.post('/subscription/create', paymentRateLimit, ...);

// Standard endpoints - relaxed limits
router.get('/customers/:id', standardRateLimit, ...);
```

### Security Improvements:
1. **Prevents card testing attacks** (limited payment attempts)
2. **Prevents API abuse** (rate limits all endpoints)
3. **User-level tracking** (not just IP)
4. **Retry-After headers** to inform clients when to retry
5. **Automatic expiration** (no memory leaks)

---

## 5. Subscription Pricing Configuration ✅

### Issues Fixed:
- **Hardcoded pricing**: Prices scattered across codebase
- **No pricing validation**: Could create subscriptions with invalid tiers
- **Missing tier comparison**: No way to determine upgrades vs downgrades
- **Inconsistent pricing**: Different prices in different files

### Solutions Implemented:

#### Created `src/config/pricing.config.ts`:

**Centralized Pricing:**
```typescript
export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: { monthlyPrice: 0, ... },
  basic: { monthlyPrice: 9.99, yearlyPrice: 79.99, ... },
  plus: { monthlyPrice: 14.99, yearlyPrice: 119.99, ... },
  premium: { monthlyPrice: 19.99, yearlyPrice: 159.99, ... },
  premium_plus: { monthlyPrice: 29.99, yearlyPrice: 239.99, ... },
  elite: { monthlyPrice: 49.99, yearlyPrice: 399.99, ... },
};
```

**PricingService Helper Functions:**
- `getPlan(tier)` - Get plan details by tier
- `getPlanPrice(tier, billingCycle)` - Get price for specific billing cycle
- `getYearlySavings(tier)` - Calculate yearly savings
- `getSavingsPercentage(tier, cycle)` - Calculate discount percentage
- `compareTiers(current, new)` - Determine upgrade/downgrade
- `isValidTier(tier)` - Validate subscription tier
- `isValidBillingCycle(cycle)` - Validate billing cycle

**Coin Packages:**
```typescript
export const COIN_PACKAGES: CoinPackage[] = [
  { id: 'COIN_PACK_SMALL', coinAmount: 100, price: 4.99, bonusCoins: 0 },
  { id: 'COIN_PACK_MEDIUM', coinAmount: 500, price: 19.99, bonusCoins: 50 },
  { id: 'COIN_PACK_LARGE', coinAmount: 1200, price: 39.99, bonusCoins: 200 },
  { id: 'COIN_PACK_XL', coinAmount: 2500, price: 79.99, bonusCoins: 500 },
];
```

**Boost Products:**
```typescript
export const BOOST_PRODUCTS: BoostProduct[] = [
  { id: 'BOOST_30MIN', durationMinutes: 30, price: 3.99 },
  { id: 'BOOST_1HR', durationMinutes: 60, price: 5.99 },
  { id: 'BOOST_3HR', durationMinutes: 180, price: 12.99 },
];
```

### Improvements:
1. **Single source of truth** for all pricing
2. **Easy to update pricing** (one place to change)
3. **Automatic calculations** (savings, discounts, etc.)
4. **Type-safe** pricing with TypeScript
5. **Validation helpers** to prevent invalid subscriptions

---

## 6. Webhook Retry Logic & Idempotency ✅

### Issues Fixed:
- **No retry mechanism**: Failed webhooks were lost
- **Duplicate processing**: Same event could be processed multiple times
- **No event tracking**: Couldn't see webhook processing status

### Existing Implementation (Verified):

**Idempotency Check:**
```typescript
async handleStripeWebhook(req: Request, res: Response) {
  // Check for duplicate event
  const isDuplicate = await webhookService.isEventProcessed(event.id);
  if (isDuplicate) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  // Store event for processing
  await webhookService.storeEvent(event);

  // Process event...
  await webhookService.markEventProcessed(event.id);
}
```

**Event Storage:**
```typescript
// stripe_webhook_events table stores:
- stripe_event_id (unique)
- event_type
- payload (full event data)
- status (pending, processed, failed, permanently_failed)
- retry_count
- error_message
- processed_at timestamp
```

**Configuration:**
```bash
WEBHOOK_MAX_RETRIES=5
WEBHOOK_RETRY_DELAYS=60,300,900,3600,7200  # Exponential backoff
WEBHOOK_EVENT_RETENTION_DAYS=30
```

### Features:
1. **Prevents duplicate processing** (idempotency)
2. **Stores all webhook events** for audit trail
3. **Tracks processing status** (pending, processed, failed)
4. **Retry failed events** with exponential backoff
5. **Event retention policy** (cleanup after 30 days)
6. **Manual retry capability** via `process-failed-webhooks` script

---

## 7. Additional Security Enhancements ✅

### Content Security Policy (Helmet):
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'js.stripe.com'],
      frameSrc: ["'self'", 'js.stripe.com'],
      connectSrc: ["'self'", 'api.stripe.com'],
    },
  },
}));
```

### CORS Configuration:
```typescript
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
}));
```

### Webhook Route Protection:
```typescript
// Webhooks use raw body parser for signature verification
app.use('/api/webhooks', webhookRoutes);  // BEFORE express.json()

// All other routes use JSON parser
app.use(express.json());
app.use('/api/payments', paymentRoutes);
```

---

## Configuration Checklist

### Required Environment Variables:

```bash
# Stripe Configuration (REQUIRED)
STRIPE_SECRET_KEY=sk_test_or_live_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_or_live_key_here
STRIPE_WEBHOOK_SECRET=whsec_webhook_secret_here
STRIPE_API_VERSION=2024-12-18.acacia

# Database (REQUIRED)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_payments
DB_USER=postgres
DB_PASSWORD=your_password_here

# Service URLs (REQUIRED)
USER_SERVICE_URL=http://localhost:3002
NOTIFICATION_SERVICE_URL=http://localhost:3012
ANALYTICS_SERVICE_URL=http://localhost:3007

# Payment Configuration
PAYMENT_CURRENCY=usd
TRIAL_PERIOD_DAYS=7
PAYMENT_GRACE_PERIOD_DAYS=3

# Webhook Configuration
WEBHOOK_MAX_RETRIES=5
WEBHOOK_RETRY_DELAYS=60,300,900,3600,7200
WEBHOOK_EVENT_RETENTION_DAYS=30

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_PAYMENT_MAX_REQUESTS=10
RATE_LIMIT_STANDARD_MAX_REQUESTS=60

# Feature Flags
ENABLE_COIN_PURCHASES=true
ENABLE_BOOST_PURCHASES=true
ENABLE_SUBSCRIPTIONS=true
ENABLE_REFUNDS=true
ENABLE_PRORATED_REFUNDS=true

# Stripe API Optimization
STRIPE_MAX_NETWORK_RETRIES=3
STRIPE_TIMEOUT=30000
```

---

## Testing the Fixes

### 1. Test Stripe Configuration:
```bash
# Check configuration status
curl http://localhost:3006/api/payments/config/status
```

### 2. Test Rate Limiting:
```bash
# Send 11 requests in quick succession (should rate limit on 11th)
for i in {1..11}; do
  curl -X POST http://localhost:3006/api/payments/create-intent \
    -H "Content-Type: application/json" \
    -d '{"amount": 10, "customerId": "cus_test"}'
done
```

### 3. Test Webhook Signature:
```bash
# Use Stripe CLI to test webhooks
stripe listen --forward-to localhost:3006/api/webhooks/stripe
stripe trigger payment_intent.succeeded
```

### 4. Test Error Handling:
```bash
# Test with invalid data
curl -X POST http://localhost:3006/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'
```

---

## Deployment Checklist

### Before Deploying to Production:

- [ ] **Update Stripe keys** to LIVE mode (`sk_live_...`, `whsec_...`)
- [ ] **Configure webhook endpoint** in Stripe Dashboard
- [ ] **Set all required environment variables**
- [ ] **Test webhook signature verification** with Stripe CLI
- [ ] **Enable rate limiting** with production limits
- [ ] **Configure CORS** with production domains
- [ ] **Test all payment flows** (subscription, coins, boosts)
- [ ] **Verify error logging** is working
- [ ] **Test idempotency** of webhook handling
- [ ] **Run database migrations**
- [ ] **Monitor for errors** in first 24 hours

### Production Environment Variables:

```bash
NODE_ENV=production
STRIPE_SECRET_KEY=*** # INJECT FROM AZURE KEY VAULT
STRIPE_WEBHOOK_SECRET=*** # INJECT FROM AZURE KEY VAULT
DB_PASSWORD=*** # INJECT FROM AZURE KEY VAULT
JWT_ACCESS_SECRET=*** # INJECT FROM AZURE KEY VAULT
JWT_REFRESH_SECRET=*** # INJECT FROM AZURE KEY VAULT
```

---

## Monitoring & Logging

### Key Metrics to Monitor:

1. **Webhook Processing**:
   - Success rate
   - Failed events count
   - Retry attempts
   - Processing latency

2. **Payment Success Rate**:
   - Successful payments / Total attempts
   - Common failure reasons
   - Refund rate

3. **Rate Limiting**:
   - Number of rate-limited requests
   - Users hitting limits frequently

4. **Error Rates**:
   - 4xx errors (client errors)
   - 5xx errors (server errors)
   - Stripe API errors

### Logging Examples:

```typescript
// Payment service logs:
logger.info('Stripe configured in test mode (API version: 2024-12-18.acacia)');
logger.info('Payment service configuration:', { features, limits });

// Webhook processing:
logger.info('Stored webhook event: evt_xxx (payment_intent.succeeded)');
logger.info('Marked event evt_xxx as processed');

// Rate limiting:
logger.warn('Payment rate limit exceeded for user user_123');

// Errors:
logger.error('Webhook signature verification failed:', error);
logger.error('Payment intent creation failed:', error);
```

---

## Summary of Files Created/Modified

### New Files Created:
1. `src/config/payment.config.ts` - Centralized payment configuration
2. `src/config/pricing.config.ts` - Subscription tiers and pricing
3. `src/api/middleware/rate-limit.middleware.ts` - Rate limiting
4. `src/api/middleware/error-handler.middleware.ts` - Error handling
5. `PAYMENT_INTEGRATION_FIXES.md` - This documentation

### Files Modified:
1. `src/index.ts` - Added config initialization and error handlers
2. `src/domain/services/payment.service.ts` - Use centralized config
3. `src/api/controllers/webhook.controller.ts` - Improved webhook handling
4. `src/api/routes/payment.routes.ts` - Added rate limiting and error handling

---

## Benefits of These Fixes

### Security:
✅ Secure Stripe key handling with validation
✅ Webhook signature verification
✅ Rate limiting to prevent abuse
✅ Protection against card testing attacks
✅ CORS and CSP headers configured

### Reliability:
✅ Global error handling prevents crashes
✅ Request timeouts prevent hanging
✅ Webhook idempotency prevents duplicates
✅ Retry logic for failed webhooks
✅ Comprehensive logging for debugging

### Maintainability:
✅ Centralized configuration (single source of truth)
✅ Type-safe pricing configuration
✅ Reusable middleware
✅ Consistent error responses
✅ Well-documented code

### Performance:
✅ Singleton Stripe client
✅ Rate limiting prevents overload
✅ Automatic cleanup of expired data
✅ Efficient webhook processing

---

## Next Steps

1. **Run Tests**: Execute unit and integration tests
2. **Update Documentation**: Ensure all docs reflect new configuration
3. **Deploy to Staging**: Test all flows in staging environment
4. **Monitor**: Watch logs and metrics after deployment
5. **Iterate**: Adjust rate limits and timeouts based on real usage

---

## Support

For issues or questions:
1. Check logs in `logs/payment-service.log`
2. Review Stripe Dashboard for webhook events
3. Check database `stripe_webhook_events` table
4. Contact DevOps team for production issues

---

**Last Updated**: 2025-12-15
**Author**: Claude (Anthropic)
**Version**: 1.0.0
