# Shared Package Usage Guide - Flamoral

## Overview

Flamoral has two shared packages:
1. **packages/shared** - Frontend shared utilities, types, and constants
2. **backend/shared** - Backend shared utilities, types, and configurations

## Installation & Setup

### Running the Fix

First, apply the fixes to ensure all utilities are properly exported:

```bash
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral
node fix-shared-exports-complete.js
```

### Building the Packages

```bash
# Build backend shared package
cd backend/shared
npm run build

# Build frontend shared package (if using workspaces)
cd ../../packages/shared
npm run build
```

## Backend Shared Package (@flamoral/shared)

### Importing Utilities

```typescript
import {
  // Logger
  createLogger,
  sanitize,

  // Types
  User,
  Match,
  Message,
  Gender,
  MatchStatus,
  MessageType,

  // Utils
  CircuitBreaker,
  CircuitBreakerFactory,
  ApiCache,
  ServiceCacheWrappers,
  GracefulDegradationManager,
  RequestBatcher,
  DatabaseQueryBatcher,
  NotificationBatcher,

  // Service Client
  ServiceClient,
  ServiceRegistry,
  createServiceClients,

  // Config
  getEnvironmentConfig,
  CostOptimizationConfig,

  // Constants
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUBSCRIPTION_TIERS,

  // Subscription Utilities
  isValidTier,
  getTierLevel,
  hasEqualOrHigherTier,
  hasFeatureAccess,
} from '@flamoral/shared';
```

### Logger Usage

```typescript
import { createLogger } from '@flamoral/shared';

const logger = createLogger('my-service');

logger.info('Service started', { port: 3000 });
logger.error('Database connection failed', { error: err.message });
logger.debug('Processing request', { userId: '123' });
logger.warn('High memory usage detected', { usage: 85 });
```

### Circuit Breaker Usage

```typescript
import { CircuitBreakerFactory } from '@flamoral/shared';

// Create a circuit breaker for external API
const apiBreaker = CircuitBreakerFactory.createExternalApiBreaker('stripe-api');

// Use it to protect API calls
try {
  const result = await apiBreaker.execute(async () => {
    return await stripe.customers.create({
      email: user.email,
    });
  });
} catch (error) {
  // Circuit is open or request failed
  logger.error('Stripe API call failed', { error });
}

// Check circuit state
const state = apiBreaker.getState(); // CLOSED, OPEN, or HALF_OPEN
const stats = apiBreaker.getStats();
```

### API Cache Usage

```typescript
import { ApiCache } from '@flamoral/shared';

// Create a cache instance
const cache = new ApiCache({
  ttl: 3600, // 1 hour
  maxSize: 1000,
  namespace: 'stripe-customers',
});

// Cache API results
const getCachedCustomer = async (customerId: string) => {
  const cacheKey = `customer:${customerId}`;

  // Try to get from cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const customer = await stripe.customers.retrieve(customerId);

  // Store in cache
  await cache.set(cacheKey, customer);

  return customer;
};
```

### Request Batcher Usage

```typescript
import { DatabaseQueryBatcher } from '@flamoral/shared';

const batcher = new DatabaseQueryBatcher();

// Batch user lookups
const users = await batcher.batchUserLookup([
  'user-1',
  'user-2',
  'user-3',
]);

// Batch profile updates
await batcher.batchProfileUpdate([
  { userId: 'user-1', data: { bio: 'Updated bio' } },
  { userId: 'user-2', data: { occupation: 'Engineer' } },
]);
```

### Graceful Degradation Usage

```typescript
import {
  GracefulDegradationManager,
  createDegradationMiddleware
} from '@flamoral/shared';

const degradationManager = new GracefulDegradationManager();

// Start monitoring
degradationManager.startMonitoring();

// Check if a feature should be disabled
if (degradationManager.shouldDisableFeature('ai-recommendations')) {
  // Fall back to simpler recommendations
  return getBasicRecommendations(userId);
}

// Use as Express middleware
app.post('/api/analytics',
  createDegradationMiddleware('analytics-events'),
  analyticsController.track
);
```

### Service Client Usage

```typescript
import { ServiceClient, createServiceClients } from '@flamoral/shared';

// Create a single service client
const authClient = new ServiceClient({
  baseUrl: 'http://localhost:3001',
  serviceName: 'auth-service',
  timeout: 5000,
});

const result = await authClient.get('/api/users/123');

// Or use the registry for multiple services
const registry = createServiceClients({
  authServiceUrl: process.env.AUTH_SERVICE_URL,
  userServiceUrl: process.env.USER_SERVICE_URL,
  matchingServiceUrl: process.env.MATCHING_SERVICE_URL,
});

const authService = registry.get('auth');
const userService = registry.get('user');
```

### Subscription Tiers Usage

```typescript
import {
  hasFeatureAccess,
  hasEqualOrHigherTier,
  SUBSCRIPTION_TIERS,
  FEATURE_TIER_REQUIREMENTS
} from '@flamoral/shared';

// Check if user has access to a feature
const canSeeWhoLiked = hasFeatureAccess(user.subscriptionTier, 'see-who-liked');

// Check tier level
const isPremiumOrHigher = hasEqualOrHigherTier(
  user.subscriptionTier,
  SUBSCRIPTION_TIERS.PREMIUM
);

// Get feature requirements
const requiredTier = FEATURE_TIER_REQUIREMENTS['unlimited-swipes'];
```

### Environment Config Usage

```typescript
import { getEnvironmentConfig } from '@flamoral/shared';

const config = getEnvironmentConfig();

// Access configuration
const dbConfig = config.database;
const redisConfig = config.redis;
const jwtConfig = config.jwt;

console.log(`Connecting to database: ${dbConfig.host}:${dbConfig.port}`);
```

### Cost Optimization Config Usage

```typescript
import { CostOptimizationConfig } from '@flamoral/shared';

// Get rate limiting config
const rateLimit = CostOptimizationConfig.rateLimiting.standard;

// Get batching config
const batchConfig = CostOptimizationConfig.batching.database;

// Get caching config
const cacheConfig = CostOptimizationConfig.caching.stripe.customer;

// Use in your service
const maxRequests = rateLimit.maxRequests; // 60
const windowMs = rateLimit.windowMs; // 60000 (1 minute)
```

### Database Configuration Usage

```typescript
import {
  createOptimizedPool,
  createReadReplicaPool,
  DatabasePerformanceMonitor
} from '@flamoral/shared';

// Create optimized connection pool
const pool = createOptimizedPool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Create read replica pool
const readPool = createReadReplicaPool({
  primary: { host: 'primary.db.com' },
  replicas: [
    { host: 'replica1.db.com', weight: 1 },
    { host: 'replica2.db.com', weight: 1 },
  ],
});

// Monitor performance
const monitor = new DatabasePerformanceMonitor(pool);
monitor.startMonitoring();
```

### Rate Limiter Middleware Usage

```typescript
import { createRateLimiter } from '@flamoral/shared';
import express from 'express';

const app = express();

// Apply rate limiting
const limiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
});

app.use('/api/', limiter);

// Stricter limit for auth endpoints
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts',
});

app.use('/api/auth/login', authLimiter);
```

## Frontend Shared Package (@flamoral/shared)

### Types

```typescript
import type {
  User,
  Profile,
  Match,
  Message,
  Conversation,
  Payment,
  Subscription,
} from '@flamoral/shared';

const user: User = {
  id: '123',
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  // ...
};
```

### Constants

```typescript
import {
  API_BASE_URL,
  MAX_PHOTOS,
  MIN_PHOTOS,
  FREE_DAILY_SWIPES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROUTES,
} from '@flamoral/shared';

console.log(`API URL: ${API_BASE_URL}`);
console.log(`Upload ${MIN_PHOTOS} to ${MAX_PHOTOS} photos`);
console.log(`Free users get ${FREE_DAILY_SWIPES} daily swipes`);
```

### Validators

```typescript
import {
  validateEmail,
  validatePassword,
  validateProfile,
  validateMessage,
} from '@flamoral/shared';

const emailError = validateEmail('test@example.com');
const passwordError = validatePassword('mypassword123');
const profileError = validateProfile(profileData);
```

### Utilities

```typescript
import {
  formatDate,
  formatDistance,
  calculateAge,
  formatCurrency,
  createLogger,
  ServiceClient,
} from '@flamoral/shared';

const age = calculateAge(new Date('1990-01-01')); // 35
const distance = formatDistance(1500); // "1.5 km"
const date = formatDate(new Date()); // "Dec 15, 2025"
const price = formatCurrency(19.99); // "$19.99"
```

## Best Practices

### 1. Use Circuit Breakers for External APIs

Always wrap external API calls with circuit breakers to prevent cascading failures:

```typescript
const paymentBreaker = CircuitBreakerFactory.createPaymentBreaker();

const charge = await paymentBreaker.execute(async () => {
  return await stripe.charges.create({ amount, currency, source });
});
```

### 2. Cache Expensive Operations

Use the API cache for expensive operations:

```typescript
const cache = new ApiCache({ ttl: 3600, maxSize: 1000 });

const result = await cache.getOrSet('expensive-key', async () => {
  return await expensiveOperation();
});
```

### 3. Batch Database Queries

Use request batchers to reduce database load:

```typescript
const batcher = new DatabaseQueryBatcher();

// Instead of N queries
const users = await Promise.all(userIds.map(id => db.getUser(id)));

// Do this (1 query)
const users = await batcher.batchUserLookup(userIds);
```

### 4. Enable Graceful Degradation

Monitor system health and disable non-critical features under load:

```typescript
const degradation = new GracefulDegradationManager();
degradation.startMonitoring();

if (degradation.shouldDisableFeature('analytics')) {
  // Skip analytics
  return;
}
```

### 5. Use Structured Logging

Always use the logger with proper metadata:

```typescript
// Good
logger.info('User logged in', { userId, ip, userAgent });

// Bad
console.log(`User ${userId} logged in from ${ip}`);
```

## Troubleshooting

### Build Errors

If you encounter build errors after the fix:

```bash
# Clean and rebuild
cd backend/shared
rm -rf dist node_modules
npm install
npm run build
```

### Import Errors

If you get "Cannot find module" errors:

1. Check that the package is built: `ls backend/shared/dist`
2. Verify package.json exports are correct
3. Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### Type Errors

If you get TypeScript errors:

1. Ensure TypeScript version is 5.3.2 or higher
2. Check tsconfig.json includes the correct paths
3. Run `npx tsc --noEmit` to check for type errors

## Summary

The shared packages provide essential utilities for:

**Backend:**
- Logging with automatic PII redaction
- Circuit breakers for fault tolerance
- API caching for cost optimization
- Request batching for efficiency
- Graceful degradation under load
- Service-to-service communication
- Database connection pooling
- Rate limiting
- Cost optimization configurations

**Frontend:**
- Type-safe API interfaces
- Validation schemas
- Formatting utilities
- Application constants
- Shared business logic

Use these utilities to maintain consistency, reduce code duplication, and implement best practices across all services.
