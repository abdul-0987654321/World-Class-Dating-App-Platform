# Service-to-Service Authentication - Quick Start Guide

## Setup (5 minutes)

### 1. Generate Service API Key

```bash
# Generate a secure random key
openssl rand -hex 32

# Copy the output, you'll need it for the next step
```

### 2. Configure Environment Variables

Create a `.env` file in each service directory:

```bash
# Copy the example file
cp .env.example .env

# Edit and add your SERVICE_API_KEY
nano .env
```

Add to all services:
```env
SERVICE_API_KEY=<your-generated-key-from-step-1>
USER_SERVICE_URL=http://localhost:3001
NOTIFICATION_SERVICE_URL=http://localhost:3008
MATCHING_SERVICE_URL=http://localhost:3002
# ... etc
```

**IMPORTANT**: Use the **same** SERVICE_API_KEY in all services!

### 3. Start Services

```bash
# Start all services
cd user-service && npm run dev &
cd notification-service && npm run dev &
cd matching-service && npm run dev &
cd payment-service && npm run dev &
cd messaging-service && npm run dev &
cd moderation-service && npm run dev &
```

## Usage Examples

### Example 1: Payment Service calls User Service

```typescript
// payment-service/src/infrastructure/clients/user-service.client.ts

import { ServiceClient } from '../../../shared/clients/service-client';

const client = new ServiceClient({
  baseURL: process.env.USER_SERVICE_URL,
  serviceName: 'payment-service',
});

// Add coins after successful payment
await client.post('/api/internal/coins/add', {
  userId: '123',
  amount: 100,
  transactionType: 'purchase',
  stripePaymentId: 'pi_123',
  productSku: 'COINS_100',
});
```

### Example 2: User Service receives request

```typescript
// user-service/src/api/routes/internal.routes.ts

import { Router } from 'express';
import { authenticateService } from '../middleware/service-auth.middleware';

const router = Router();

// Protect all internal routes
router.use(authenticateService);

// Add coins endpoint
router.post('/coins/add', async (req, res) => {
  const { userId, amount } = req.body;

  // Access service metadata
  console.log(`Request from: ${req.serviceId}`);
  console.log(`Request ID: ${req.requestId}`);

  // Your business logic here
  await coinService.addCoins(userId, amount);

  res.json({ success: true });
});

export default router;
```

### Example 3: Sending Notifications

```typescript
// Any service can send notifications

import { ServiceClient } from '../shared/clients/service-client';

const notificationClient = new ServiceClient({
  baseURL: process.env.NOTIFICATION_SERVICE_URL,
  serviceName: 'matching-service',
});

// Send notification when users match
await notificationClient.post('/api/internal/notifications/send', {
  userId: '123',
  type: 'new_match',
  title: 'New Match!',
  body: 'You have a new match with Sarah',
  channel: 'push',
  data: {
    matchId: 'match_456',
  },
});
```

## Testing

### Test Authentication

```bash
# Test WITHOUT service key (should fail)
curl -X POST http://localhost:3001/api/internal/coins/add \
  -H "Content-Type: application/json" \
  -d '{"userId":"123","amount":100}'

# Expected: 401 Unauthorized


# Test WITH service key (should succeed)
curl -X POST http://localhost:3001/api/internal/coins/add \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: your-service-key" \
  -H "X-Request-ID: test-request-123" \
  -H "X-Source-Service: test-client" \
  -d '{"userId":"123","amount":100}'

# Expected: 200 OK
```

### Test Service Client

```typescript
// test-service-client.ts

import { ServiceClient } from './shared/clients/service-client';

async function testServiceClient() {
  const client = new ServiceClient({
    baseURL: 'http://localhost:3001',
    serviceName: 'test-client',
    enableLogging: true,
  });

  try {
    const response = await client.get('/api/internal/users/123');
    console.log('Success:', response.data);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testServiceClient();
```

## Common Patterns

### Pattern 1: Create a Service Client Class

```typescript
// src/infrastructure/clients/user-service.client.ts

import { ServiceClient } from '../../../shared/clients/service-client';

export class UserServiceClient {
  private client: ServiceClient;

  constructor() {
    this.client = new ServiceClient({
      baseURL: process.env.USER_SERVICE_URL,
      serviceName: 'payment-service',
      maxRetries: 3,
      timeout: 10000,
    });
  }

  async updateSubscription(userId: string, tier: string) {
    const response = await this.client.put('/api/internal/subscriptions/update', {
      userId,
      tier,
    });
    return response.data;
  }

  async addCoins(userId: string, amount: number) {
    const response = await this.client.post('/api/internal/coins/add', {
      userId,
      amount,
      transactionType: 'purchase',
      stripePaymentId: 'pi_123',
      productSku: 'COINS_100',
    });
    return response.data;
  }
}

// Usage
const userService = new UserServiceClient();
await userService.updateSubscription('123', 'premium');
```

### Pattern 2: Protect Internal Routes

```typescript
// src/api/routes/internal.routes.ts

import { Router } from 'express';
import { authenticateService } from '../middleware/service-auth.middleware';

const router = Router();

// Apply to all routes
router.use(authenticateService);

// Your internal endpoints
router.post('/endpoint1', handler1);
router.get('/endpoint2', handler2);
router.put('/endpoint3', handler3);

export default router;
```

### Pattern 3: Error Handling

```typescript
try {
  const response = await client.post('/api/internal/endpoint', data);
  return response.data;
} catch (error: any) {
  // Handle specific errors
  switch (error.code) {
    case 'CIRCUIT_BREAKER_OPEN':
      logger.warn('Service temporarily unavailable, using fallback');
      return fallbackValue;

    case 'SERVICE_UNAVAILABLE':
      logger.error('Service unreachable, queuing for retry');
      await queueForRetry(data);
      throw error;

    case 'INVALID_SERVICE_KEY':
      logger.error('Authentication failed - check SERVICE_API_KEY');
      throw error;

    default:
      logger.error('Unexpected error:', error);
      throw error;
  }
}
```

## Troubleshooting

### Issue: "MISSING_SERVICE_KEY"

**Solution**: Ensure SERVICE_API_KEY is set in your .env file

```bash
# Check if environment variable is set
echo $SERVICE_API_KEY

# If empty, add to .env
echo "SERVICE_API_KEY=your-key-here" >> .env
```

### Issue: "INVALID_SERVICE_KEY"

**Solution**: Ensure all services use the same key

```bash
# Check key in all services
grep SERVICE_API_KEY user-service/.env
grep SERVICE_API_KEY payment-service/.env
grep SERVICE_API_KEY notification-service/.env

# They should all be identical
```

### Issue: Service URLs not working

**Solution**: Check that services are running and URLs are correct

```bash
# Check if service is running
curl http://localhost:3001/health

# Check environment variable
echo $USER_SERVICE_URL

# Update if needed
export USER_SERVICE_URL=http://localhost:3001
```

### Issue: Timeout errors

**Solution**: Increase timeout or check service performance

```typescript
const client = new ServiceClient({
  baseURL: process.env.USER_SERVICE_URL,
  serviceName: 'my-service',
  timeout: 30000, // Increase to 30 seconds
});
```

## Security Checklist

- [ ] SERVICE_API_KEY is strong and random (32+ characters)
- [ ] Same SERVICE_API_KEY is used across all services
- [ ] SERVICE_API_KEY is stored in .env, not in code
- [ ] .env files are in .gitignore
- [ ] Different keys for dev/staging/prod environments
- [ ] All internal routes use authenticateService middleware
- [ ] HTTPS is used in production
- [ ] Rate limiting is implemented
- [ ] Logging is enabled for security auditing

## Next Steps

1. Read the full documentation: [SERVICE_TO_SERVICE_AUTH.md](./SERVICE_TO_SERVICE_AUTH.md)
2. Review service endpoints for your use case
3. Implement service clients for your service
4. Add internal endpoints to your service
5. Test thoroughly in development
6. Set up monitoring and alerting
7. Deploy to staging/production

## Resources

- **Full Documentation**: `SERVICE_TO_SERVICE_AUTH.md`
- **Example .env**: `.env.example`
- **Shared Middleware**: `shared/middleware/service-auth.middleware.ts`
- **Service Client**: `shared/clients/service-client.ts`

## Support

If you encounter issues:
1. Check the logs for detailed error messages
2. Verify environment variables are set correctly
3. Test with curl to isolate the problem
4. Review the full documentation
5. Check service health endpoints

## Quick Reference

### Required Headers

```
X-Service-Key: <SERVICE_API_KEY>
X-Request-ID: <unique-id>
X-Source-Service: <your-service-name>
```

### Error Codes

- `MISSING_SERVICE_KEY`: No X-Service-Key header
- `INVALID_SERVICE_KEY`: Wrong service key
- `MISSING_REQUEST_ID`: No X-Request-ID header
- `SERVICE_UNAVAILABLE`: Service is down or unreachable
- `CIRCUIT_BREAKER_OPEN`: Too many failures, circuit breaker activated

### Service Ports

- User Service: 3001
- Matching Service: 3002
- Messaging Service: 3003
- Moderation Service: 3004
- Payment Service: 3005
- Notification Service: 3008
- Media Service: 3007
- Analytics Service: 3008
- AI Service: 3009
- Advertising Service: 3010
- Auth Service: 3011
- Realtime Service: 3012
