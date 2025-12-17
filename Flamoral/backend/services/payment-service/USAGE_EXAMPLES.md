# Payment Service Usage Examples

## Creating Payment Intents with Proper Metadata

### Coin Purchase

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

async function createCoinPurchaseIntent(
  userId: string,
  packageId: string,
  amount: number
) {
  // Fetch coin package details
  const coinPackage = await db('coin_packages')
    .where({ id: packageId })
    .first();

  if (!coinPackage) {
    throw new Error('Coin package not found');
  }

  // Create payment intent with required metadata
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(coinPackage.price * 100), // Convert to cents
    currency: 'usd',
    metadata: {
      user_id: userId,
      type: 'coin_purchase',
      package_id: packageId,
      product_sku: `COIN_PACK_${coinPackage.coin_amount}`,
      product_name: coinPackage.name,
    },
    description: `Purchase ${coinPackage.name}`,
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}
```

### Boost Purchase

```typescript
async function createBoostPurchaseIntent(
  userId: string,
  boostSku: 'BOOST_30MIN' | 'BOOST_1HR' | 'BOOST_3HR'
) {
  // Define boost products
  const boostProducts = {
    BOOST_30MIN: { name: '30 Minute Boost', price: 4.99, duration: 30 },
    BOOST_1HR: { name: '1 Hour Boost', price: 7.99, duration: 60 },
    BOOST_3HR: { name: '3 Hour Boost', price: 14.99, duration: 180 },
  };

  const product = boostProducts[boostSku];

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(product.price * 100),
    currency: 'usd',
    metadata: {
      user_id: userId,
      type: 'boost_purchase',
      product_sku: boostSku,
      product_name: product.name,
    },
    description: `Purchase ${product.name}`,
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}
```

### Subscription Creation

```typescript
async function createSubscription(
  userId: string,
  planId: string,
  customerId: string
) {
  // Fetch plan details
  const plan = await db('subscription_plans')
    .where({ id: planId })
    .first();

  if (!plan) {
    throw new Error('Plan not found');
  }

  // Create subscription
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [
      {
        price: plan.stripe_price_id_monthly, // or stripe_price_id_yearly
      },
    ],
    metadata: {
      user_id: userId,
      tier: plan.name,
      plan_name: plan.display_name,
    },
    trial_period_days: 7, // Optional trial period
  });

  return subscription;
}
```

## Webhook Event Handling Flow

### Coin Purchase Flow

```
1. Client creates payment intent
   ↓
2. User completes payment
   ↓
3. Stripe sends 'payment_intent.succeeded' webhook
   ↓
4. Payment Service receives webhook
   ↓
5. Verifies signature
   ↓
6. Checks for duplicate event
   ↓
7. Processes coin purchase:
   - Creates transaction record
   - Creates coin transaction
   - Calls User Service to add coins
   - Sends notification
   ↓
8. Returns 200 to Stripe
```

### Subscription Flow

```
1. Client creates subscription
   ↓
2. Stripe processes payment
   ↓
3. Stripe sends 'customer.subscription.created' webhook
   ↓
4. Payment Service receives webhook
   ↓
5. Creates subscription record
   ↓
6. Updates User Service subscription tier
   ↓
7. Sends notification
   ↓
8. Returns 200 to Stripe
```

## Complete Controller Example

```typescript
import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * Create payment intent for coin purchase
   * POST /api/payments/coins/purchase
   */
  async purchaseCoins(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, packageId } = req.body;

      // Validate input
      if (!userId || !packageId) {
        return res.status(400).json({
          error: 'Missing required fields: userId, packageId',
        });
      }

      // Create payment intent
      const result = await this.paymentService.createCoinPurchaseIntent(
        userId,
        packageId
      );

      return res.status(200).json({
        success: true,
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
      });
    } catch (error: any) {
      return res.status(500).json({
        error: error.message,
      });
    }
  }

  /**
   * Create payment intent for boost purchase
   * POST /api/payments/boosts/purchase
   */
  async purchaseBoost(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, boostSku } = req.body;

      if (!userId || !boostSku) {
        return res.status(400).json({
          error: 'Missing required fields: userId, boostSku',
        });
      }

      const validSkus = ['BOOST_30MIN', 'BOOST_1HR', 'BOOST_3HR'];
      if (!validSkus.includes(boostSku)) {
        return res.status(400).json({
          error: 'Invalid boost SKU',
        });
      }

      const result = await this.paymentService.createBoostPurchaseIntent(
        userId,
        boostSku
      );

      return res.status(200).json({
        success: true,
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
      });
    } catch (error: any) {
      return res.status(500).json({
        error: error.message,
      });
    }
  }

  /**
   * Create or update subscription
   * POST /api/payments/subscriptions/create
   */
  async createSubscription(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, planId, paymentMethodId } = req.body;

      if (!userId || !planId || !paymentMethodId) {
        return res.status(400).json({
          error: 'Missing required fields: userId, planId, paymentMethodId',
        });
      }

      const result = await this.paymentService.createSubscription(
        userId,
        planId,
        paymentMethodId
      );

      return res.status(200).json({
        success: true,
        subscription: result,
      });
    } catch (error: any) {
      return res.status(500).json({
        error: error.message,
      });
    }
  }
}
```

## Frontend Integration

### React Example - Coin Purchase

```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_test_...');

function CoinPurchaseForm({ userId, packageId }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create payment intent
      const response = await fetch('/api/payments/coins/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, packageId }),
      });

      const { clientSecret } = await response.json();

      // Confirm payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (result.error) {
        console.error(result.error);
        alert('Payment failed: ' + result.error.message);
      } else {
        // Payment succeeded - webhook will handle the rest
        alert('Payment successful! Your coins will be added shortly.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe || loading}>
        {loading ? 'Processing...' : 'Purchase Coins'}
      </button>
    </form>
  );
}
```

## Testing Webhook Locally

### Using Stripe CLI

```bash
# 1. Install Stripe CLI
# Download from https://stripe.com/docs/stripe-cli

# 2. Login to Stripe
stripe login

# 3. Forward webhooks to local server
stripe listen --forward-to localhost:3005/api/payments/webhook

# 4. In another terminal, trigger test events
stripe trigger payment_intent.succeeded \
  --add payment_intent:metadata[user_id]=test-user-123 \
  --add payment_intent:metadata[type]=coin_purchase \
  --add payment_intent:metadata[package_id]=pkg-uuid

stripe trigger customer.subscription.created \
  --add subscription:metadata[user_id]=test-user-123 \
  --add subscription:metadata[tier]=premium

stripe trigger invoice.payment_succeeded

stripe trigger invoice.payment_failed
```

### Manual Testing with Postman

```bash
# Get webhook signing secret from Stripe CLI output
# Example: whsec_test_secret123

# Send POST request to http://localhost:3005/api/payments/webhook
# Headers:
#   - stripe-signature: [generated signature]
#   - Content-Type: application/json
# Body: [Stripe event JSON]
```

## Monitoring and Debugging

### Check Webhook Status

```sql
-- View recent webhook events
SELECT
  stripe_event_id,
  event_type,
  status,
  error_message,
  created_at
FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 10;

-- Count events by status
SELECT status, COUNT(*)
FROM stripe_webhook_events
GROUP BY status;

-- Find failed events
SELECT *
FROM stripe_webhook_events
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Check Transactions

```sql
-- Recent transactions
SELECT
  user_id,
  type,
  status,
  amount,
  currency,
  description,
  created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 20;

-- Failed transactions
SELECT *
FROM transactions
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Application Logs

```bash
# View payment service logs
tail -f logs/combined.log

# Filter for errors
tail -f logs/error.log

# Filter for specific user
grep "user-id-here" logs/combined.log
```

## Common Issues and Solutions

### Issue: Webhook signature verification fails

**Solution:**
```typescript
// Make sure to use raw body parser for webhook endpoint
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }), // Use raw, not json()
  webhookController.handleStripeWebhook
);
```

### Issue: Duplicate events processed

**Solution:**
The implementation includes idempotency checks. Verify:
```typescript
// Check if event was already processed
const isDuplicate = await webhookService.isEventProcessed(event.id);
if (isDuplicate) {
  return res.status(200).json({ received: true, duplicate: true });
}
```

### Issue: User service not receiving updates

**Solution:**
1. Check USER_SERVICE_URL is correct
2. Verify SERVICE_API_KEY matches in both services
3. Check network connectivity
4. Review user service logs

## Best Practices

1. **Always include metadata** in payment intents and subscriptions
2. **Handle errors gracefully** - log but don't fail on notification errors
3. **Use transactions** for database operations
4. **Monitor webhook health** in Stripe Dashboard
5. **Test thoroughly** with Stripe CLI before production
6. **Set up alerts** for failed webhooks
7. **Keep signing secrets secure** - never commit to version control
8. **Use idempotency** to prevent duplicate processing
9. **Log everything** for debugging and audit trails
10. **Version your API** to handle changes safely
