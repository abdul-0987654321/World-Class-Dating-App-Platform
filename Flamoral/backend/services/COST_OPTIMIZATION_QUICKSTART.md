# Cost Optimization Quick Start Guide

## Quick Implementation Guide for Developers

This guide shows you how to quickly add cost optimization features to your service.

---

## 1. API Caching (External API Calls)

### When to Use
- Calling Azure Cognitive Services (Face API, Computer Vision, Content Moderator)
- Calling AWS Rekognition
- Calling Stripe API
- Any expensive external API where results don't change often

### Implementation

```typescript
import { ServiceCacheWrappers, generateImageHash } from '@flamoral/shared/utils/api-cache';
import Redis from 'ioredis';

// Initialize
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

const cacheWrapper = new ServiceCacheWrappers(redis);

// Example: Cache Azure Face Detection
const imageHash = generateImageHash(imageBuffer);
const faceDetectionResult = await cacheWrapper.cacheFaceDetection(
  async () => {
    // Your expensive API call
    return await azureFaceClient.detectFaces(imageBuffer);
  },
  imageHash
);

// Example: Cache Stripe Customer
const customerData = await cacheWrapper.cacheStripeCustomer(
  async () => {
    return await stripe.customers.retrieve(customerId);
  },
  customerId
);
```

**Expected Savings**: 60-80% reduction in API costs for cached operations

---

## 2. Circuit Breakers (Prevent Retry Storms)

### When to Use
- Before any external API call
- Especially for unreliable services
- Payment gateways
- Messaging services

### Implementation

```typescript
import { CircuitBreakerFactory } from '@flamoral/shared/utils/circuit-breaker';

// Create circuit breaker (do this once, reuse across requests)
const azureBreaker = CircuitBreakerFactory.createAzureBreaker('Face-API');

// Use in your code
try {
  const result = await azureBreaker.execute(async () => {
    return await azureFaceClient.detectFaces(imageBuffer);
  });

  // Success!
  return result;
} catch (error) {
  // Circuit is open or request failed
  console.error('Face detection failed:', error);

  // Use fallback or queue for later
  if (error.message === 'Circuit breaker is OPEN') {
    // Queue the operation for retry later
    await queueForRetry(imageBuffer);
  }

  throw error;
}
```

**Expected Savings**: Prevents cost accumulation during service outages

---

## 3. Rate Limiting (Prevent Abuse)

### When to Use
- All user-facing endpoints
- Expensive operations (uploads, AI processing)
- External API calls

### Implementation

```typescript
import { CostOptimizedRateLimiter } from '@flamoral/shared/middleware/rate-limiter';
import Redis from 'ioredis';

const redis = new Redis({ /* config */ });
const rateLimiter = new CostOptimizedRateLimiter(redis);

// Apply to Express routes
app.use('/api/upload', rateLimiter.expensive());        // 10 req/min
app.use('/api/ai', rateLimiter.aiServices());           // 20 req/min
app.use('/api/external', rateLimiter.externalApi());    // 30 req/min
app.use('/api/*', rateLimiter.standard());              // 60 req/min
```

**Expected Savings**: 30-50% reduction in abuse-related costs

---

## 4. Request Batching (Notifications & Database)

### When to Use
- Sending notifications (email, SMS, push)
- Database inserts/updates
- Analytics events

### Implementation

```typescript
import { NotificationBatcher, DatabaseQueryBatcher } from '@flamoral/shared/utils/request-batcher';

// Notification Batching
const notificationBatcher = new NotificationBatcher();

const emailBatcher = notificationBatcher.createEmailBatcher(async (emails) => {
  // Send all emails in one API call
  await sendgrid.send(emails);
});

// Add individual notifications - they're automatically batched
await emailBatcher.add({
  to: 'user@example.com',
  subject: 'New Match!',
  template: 'match-notification',
  data: { matchName: 'John' }
});

// Database Batching
const dbBatcher = new DatabaseQueryBatcher();

const insertBatcher = dbBatcher.createInsertBatcher(async (items) => {
  // Insert all items in one query
  await db('analytics_events').insert(items);
});

// Add individual items - they're automatically batched
await insertBatcher.add({
  user_id: userId,
  event_type: 'profile_view',
  timestamp: new Date()
});
```

**Expected Savings**: 40-60% reduction in notification costs, 20-30% in database costs

---

## 5. Request Deduplication (Prevent Duplicate Operations)

### When to Use
- Payment processing
- Expensive operations that shouldn't be duplicated
- Operations that take time to complete

### Implementation

```typescript
import { RequestDeduplicator } from '@flamoral/shared/middleware/rate-limiter';
import Redis from 'ioredis';

const redis = new Redis({ /* config */ });
const deduplicator = new RequestDeduplicator(redis);

// Apply as middleware
app.post('/api/payment', deduplicator.deduplicate({
  window: 2000, // 2 seconds
  keyGenerator: (req) => {
    // Generate unique key based on request
    return `payment:${req.user.id}:${req.body.amount}:${req.body.currency}`;
  }
}), async (req, res) => {
  // Process payment
  const result = await processPayment(req.body);
  res.json(result);
});
```

**Expected Savings**: Prevents duplicate charges and operations

---

## 6. Graceful Degradation (Handle High Load)

### When to Use
- Non-critical features that can be disabled under load
- Analytics and tracking
- AI-powered features
- Image optimization

### Implementation

```typescript
import {
  FeatureFlagManager,
  createDegradationMiddleware,
  createQueueMiddleware
} from '@flamoral/shared/utils/graceful-degradation';

// Initialize (do once at startup)
FeatureFlagManager.initialize();

// Protect expensive endpoints
app.use('/api/ai/recommendations',
  createDegradationMiddleware('ai-recommendations')
);

// Queue operations under load
app.post('/api/analytics/track',
  createQueueMiddleware('analytics-events', async (req) => {
    await analyticsQueue.add(req.body);
  })
);

// Check in code
if (FeatureFlagManager.isEnabled('image-optimization')) {
  await optimizeImage(image);
} else {
  // Skip optimization under high load
  console.log('Image optimization disabled due to high load');
}
```

**Expected Savings**: Prevents cost spikes during traffic surges

---

## Configuration Setup

### 1. Add to your service's .env file

```env
# Cost Optimization
ENABLE_API_CACHING=true
CIRCUIT_BREAKER_ENABLED=true
ENABLE_REQUEST_BATCHING=true
ENABLE_GRACEFUL_DEGRADATION=true
ENABLE_REQUEST_DEDUPLICATION=true

# Redis (required for caching and rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 2. Install dependencies

```bash
npm install ioredis
```

### 3. Import shared utilities

```typescript
// In your service's package.json
{
  "dependencies": {
    "@flamoral/shared": "workspace:*"
  }
}
```

---

## Testing

### Test Circuit Breaker

```typescript
// Simulate failures
for (let i = 0; i < 6; i++) {
  try {
    await breaker.execute(async () => {
      throw new Error('Service unavailable');
    });
  } catch (error) {
    console.log(`Attempt ${i + 1} failed`);
  }
}

// Check state
console.log(breaker.getState()); // Should be 'OPEN' after 5 failures
```

### Test Batching

```typescript
// Add multiple items quickly
for (let i = 0; i < 10; i++) {
  await batcher.add({ id: i, data: `Item ${i}` });
}

// Check queue size
console.log(batcher.getQueueSize()); // Should be less than 10 (batching in progress)
```

### Test Cache

```typescript
// First call (cache miss)
console.time('First call');
const result1 = await cacheWrapper.cacheFaceDetection(apiCall, hash);
console.timeEnd('First call'); // Slow

// Second call (cache hit)
console.time('Second call');
const result2 = await cacheWrapper.cacheFaceDetection(apiCall, hash);
console.timeEnd('Second call'); // Fast!
```

---

## Common Patterns

### Pattern 1: Expensive API Call with All Protections

```typescript
async function detectFaces(imageBuffer: Buffer) {
  const imageHash = generateImageHash(imageBuffer);

  // 1. Check rate limit (handled by middleware)
  // 2. Check cache
  const result = await cacheWrapper.cacheFaceDetection(
    async () => {
      // 3. Use circuit breaker
      return await faceApiBreaker.execute(async () => {
        // 4. Make API call
        return await azureFaceClient.detectFaces(imageBuffer);
      });
    },
    imageHash
  );

  return result;
}
```

### Pattern 2: Batch Notifications with Fallback

```typescript
async function sendNotifications(users: User[], message: string) {
  // Check if feature is enabled
  if (!FeatureFlagManager.isEnabled('push-notifications-non-urgent')) {
    // Queue for later
    await notificationQueue.add({ users, message });
    return { queued: true };
  }

  // Send via batcher
  const results = await Promise.all(
    users.map(user => pushBatcher.add({
      userId: user.id,
      message,
      timestamp: new Date()
    }))
  );

  return { sent: true, count: results.length };
}
```

### Pattern 3: Payment with Deduplication and Circuit Breaker

```typescript
async function processPayment(userId: string, amount: number) {
  // Deduplication handled by middleware

  // Use circuit breaker
  try {
    const result = await paymentBreaker.execute(async () => {
      // Cache customer data
      const customer = await cacheWrapper.cacheStripeCustomer(
        async () => await stripe.customers.retrieve(userId),
        userId
      );

      // Process payment
      return await stripe.paymentIntents.create({
        amount,
        customer: customer.id,
        currency: 'usd'
      });
    });

    return result;
  } catch (error) {
    if (error.message === 'Circuit breaker is OPEN') {
      // Queue for retry
      await paymentQueue.add({ userId, amount });
      throw new Error('Payment service temporarily unavailable');
    }
    throw error;
  }
}
```

---

## Monitoring

### Key Metrics to Track

1. **Cache Hit Rate**: Target > 70%
   ```typescript
   const stats = await cacheWrapper.getStats('azure:face');
   const hitRate = stats.hits / (stats.hits + stats.misses);
   ```

2. **Circuit Breaker State**: Alert on 'OPEN'
   ```typescript
   const state = breaker.getState();
   if (state === CircuitState.OPEN) {
     // Alert ops team
   }
   ```

3. **Batch Efficiency**
   ```typescript
   const queueSize = batcher.getQueueSize();
   // Low queue = good batching
   ```

4. **Degradation Events**
   ```typescript
   const status = FeatureFlagManager.getInstance().getStatus();
   console.log('Degradation level:', status.levelName);
   console.log('Disabled features:', status.disabledFeatures);
   ```

---

## Troubleshooting

### Cache Not Working

1. Check Redis connection
2. Verify ENABLE_API_CACHING=true
3. Check cache key generation (should be consistent)
4. Verify TTL is appropriate

### Circuit Breaker Always Open

1. Check external service status
2. Verify thresholds are not too strict
3. Check timeout values
4. Review error logs

### Batching Too Slow

1. Reduce batch size
2. Decrease batch interval
3. Increase concurrency
4. Check queue depth

---

## Need Help?

1. Read full documentation: `BACKEND_COST_OPTIMIZATION.md`
2. Check configuration: `backend/shared/config/cost-optimization.ts`
3. Review examples: `backend/services/*/src/`
4. Contact DevOps team

---

**Last Updated**: January 13, 2025
