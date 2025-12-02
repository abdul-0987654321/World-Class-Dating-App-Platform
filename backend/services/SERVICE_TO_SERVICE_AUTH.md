# Service-to-Service Authentication Documentation

## Overview

This document describes the service-to-service authentication system implemented across all backend services in the Flamoral Dating Platform. The system ensures secure, authenticated, and traceable communication between microservices.

## Architecture

### Components

1. **Service Authentication Middleware** (`service-auth.middleware.ts`)
   - Validates X-Service-Key header against SERVICE_API_KEY
   - Validates X-Request-ID for distributed tracing
   - Uses constant-time comparison to prevent timing attacks
   - Adds service metadata to requests for logging

2. **Service HTTP Client** (`service-client.ts`)
   - Enhanced HTTP client based on Axios
   - Automatic service authentication header injection
   - Request ID generation for tracing
   - Retry logic with exponential backoff
   - Circuit breaker pattern (optional)
   - Comprehensive error handling and logging

### Security Features

- **Constant-time comparison**: Prevents timing attacks when validating service keys
- **Request ID tracking**: Every request has a unique ID for distributed tracing
- **Service identification**: X-Source-Service header identifies the calling service
- **Detailed audit logging**: All authentication attempts are logged
- **Circuit breaker**: Protects services from cascading failures (optional)

## Environment Configuration

### Required Environment Variables

All services must have the following environment variable configured:

```bash
# Service-to-Service Authentication Key
# CRITICAL: This must be the same across ALL services
# Generate with: openssl rand -hex 32
SERVICE_API_KEY=your-secret-service-key-here

# Service URLs (for service clients)
USER_SERVICE_URL=http://localhost:3001
NOTIFICATION_SERVICE_URL=http://localhost:3008
MATCHING_SERVICE_URL=http://localhost:3002
MESSAGING_SERVICE_URL=http://localhost:3003
PAYMENT_SERVICE_URL=http://localhost:3005
MODERATION_SERVICE_URL=http://localhost:3004
```

### Generating a Secure Service API Key

```bash
# Linux/macOS
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Example output:
# a7f9c8d2e1b4f6a3d8e9c7b5a2f1d4e8b9c6a3f2e7d1c8b4a5f9e2d3c1b8a6f4
```

**IMPORTANT**:
- Use the **same** SERVICE_API_KEY across all services
- Keep this key secret and secure
- Rotate the key periodically (recommended: every 90 days)
- Never commit the key to version control

## Service Endpoints

### User Service (`user-service`)

**Base URL**: `http://localhost:3001`

#### Internal Endpoints (`/api/internal/*`)

```typescript
// Update subscription
PUT /api/internal/subscriptions/update
Body: {
  userId: string;
  tier: 'free' | 'premium' | 'premium_plus';
  stripeSubscriptionId?: string;
  status?: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  currentPeriodEnd?: Date;
}

// Add coins
POST /api/internal/coins/add
Body: {
  userId: string;
  amount: number;
  transactionType: 'purchase' | 'reward' | 'refund';
  stripePaymentId: string;
  productSku: string;
}

// Subtract coins
POST /api/internal/coins/subtract
Body: {
  userId: string;
  amount: number;
  reason: string;
}

// Activate boost
POST /api/internal/boosts/activate
Body: {
  userId: string;
  productSku: string;
  durationMinutes: number;
  stripePaymentId: string;
}

// Get user by ID
GET /api/internal/users/:userId
Response: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  isActive: boolean;
  isVerified: boolean;
  subscriptionTier: string;
  createdAt: string;
}
```

### Notification Service (`notification-service`)

**Base URL**: `http://localhost:3006`

#### Internal Endpoints (`/api/internal/notifications/*`)

```typescript
// Send notification
POST /api/internal/notifications/send
Body: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  channel?: 'push' | 'email' | 'sms' | 'all';
}

// Send bulk notifications
POST /api/internal/notifications/send-bulk
Body: {
  notifications: Array<{
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    channel?: 'push' | 'email' | 'sms' | 'all';
  }>;
}

// Get notification preferences
GET /api/internal/notifications/preferences/:userId
```

### Matching Service (`matching-service`)

**Base URL**: `http://localhost:3002`

#### Internal Endpoints (`/api/internal/matches/*`)

```typescript
// Create match
POST /api/internal/matches/create
Body: {
  userId1: string;
  userId2: string;
  matchScore?: number;
}

// Get user's matches
GET /api/internal/matches/users/:userId/matches
Query: {
  limit?: number;
  offset?: number;
  status?: 'active' | 'unmatched' | 'all';
}

// Get match by ID
GET /api/internal/matches/:matchId

// Unmatch users
POST /api/internal/matches/unmatch
Body: {
  matchId: string;
  reason?: string;
}

// Record swipe
POST /api/internal/matches/swipes/record
Body: {
  swiperId: string;
  swipedId: string;
  direction: 'like' | 'dislike' | 'superlike';
}

// Get user's swipes
GET /api/internal/matches/users/:userId/swipes
Query: {
  limit?: number;
  offset?: number;
  direction?: 'like' | 'dislike' | 'superlike' | 'all';
}
```

### Messaging Service (`messaging-service`)

**Base URL**: `http://localhost:3003`

#### Internal Endpoints (`/api/internal/messages/*`)

```typescript
// Send system message
POST /api/internal/messages/send-system
Body: {
  conversationId: string;
  userId: string;
  content: string;
  type?: 'system' | 'notification';
}

// Get conversation
GET /api/internal/messages/conversation
Query: {
  userId1: string;
  userId2: string;
}

// Delete conversation
DELETE /api/internal/messages/conversation/:conversationId
Query: {
  deleteFor?: 'all' | 'user';
  userId?: string;
}

// Get user's conversations
GET /api/internal/messages/users/:userId/conversations
Query: {
  limit?: number;
  offset?: number;
}

// Block/Unblock messaging
POST /api/internal/messages/block
Body: {
  blockerId: string;
  blockedId: string;
  action: 'block' | 'unblock';
}
```

### Moderation Service (`moderation-service`)

**Base URL**: `http://localhost:3004`

#### Internal Endpoints (`/api/internal/moderation/*`)

```typescript
// Moderate content
POST /api/internal/moderation/moderate
Body: {
  contentId: string;
  contentType: 'photo' | 'profile' | 'message' | 'bio';
  content: string | { url: string };
  userId: string;
  priority?: 'low' | 'medium' | 'high';
}

// Get moderation status
GET /api/internal/moderation/status/:contentId

// Flag content for review
POST /api/internal/moderation/flag
Body: {
  contentId: string;
  contentType: 'photo' | 'profile' | 'message' | 'bio';
  userId: string;
  reason: string;
  reportedBy?: string;
}

// Bulk moderate content
POST /api/internal/moderation/moderate-bulk
Body: {
  items: Array<{
    contentId: string;
    contentType: 'photo' | 'profile' | 'message' | 'bio';
    content: string | { url: string };
    userId: string;
  }>;
}

// Get user moderation history
GET /api/internal/moderation/users/:userId/history
Query: {
  limit?: number;
  offset?: number;
}

// Check user restrictions
GET /api/internal/moderation/users/:userId/restrictions
```

## Using the Service Client

### Basic Usage

```typescript
import { ServiceClient } from '../shared/clients/service-client';

// Create a client instance
const userServiceClient = new ServiceClient({
  baseURL: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  serviceName: 'payment-service', // Your service name
  timeout: 10000,
  maxRetries: 3,
  retryDelay: 1000,
  enableLogging: true,
});

// Make requests
const response = await userServiceClient.post('/api/internal/coins/add', {
  userId: '123',
  amount: 100,
  transactionType: 'purchase',
  stripePaymentId: 'pi_123',
  productSku: 'COINS_100',
});
```

### Advanced Configuration

```typescript
const client = new ServiceClient({
  baseURL: 'http://user-service:3001',
  serviceName: 'payment-service',

  // Timeout configuration
  timeout: 10000, // 10 seconds

  // Retry configuration
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  exponentialBackoff: true, // Double delay each retry
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],

  // Logging
  enableLogging: true,
  logger: {
    info: (msg, meta) => logger.info(msg, meta),
    warn: (msg, meta) => logger.warn(msg, meta),
    error: (msg, meta) => logger.error(msg, meta),
    debug: (msg, meta) => logger.debug(msg, meta),
  },

  // Circuit breaker (optional)
  enableCircuitBreaker: true,
  circuitBreakerThreshold: 5, // Open after 5 failures
  circuitBreakerTimeout: 60000, // Reset after 60 seconds

  // Additional headers
  headers: {
    'X-Custom-Header': 'value',
  },
});
```

### Error Handling

```typescript
try {
  const response = await client.post('/api/internal/endpoint', data);
  console.log('Success:', response.data);
} catch (error: any) {
  if (error.code === 'CIRCUIT_BREAKER_OPEN') {
    console.error('Service is temporarily unavailable');
  } else if (error.code === 'SERVICE_UNAVAILABLE') {
    console.error('Network error or service down');
  } else if (error.statusCode) {
    console.error(`HTTP ${error.statusCode}: ${error.message}`);
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## Implementing Service Authentication Middleware

### In Your Service

```typescript
// src/api/routes/internal.routes.ts
import { Router } from 'express';
import { authenticateService } from '../middleware/service-auth.middleware';

const router = Router();

// Apply authentication to all internal routes
router.use(authenticateService);

// Your internal endpoints
router.post('/endpoint', async (req, res) => {
  // Access service metadata
  const { serviceId, requestId } = req;
  console.log(`Request from ${serviceId}, ID: ${requestId}`);

  // Your logic here
});

export default router;
```

### Mounting Routes

```typescript
// src/index.ts
import internalRoutes from './api/routes/internal.routes';

// Mount internal routes
app.use('/api/internal', internalRoutes);
```

## Request Headers

### Outgoing Requests (Automatic)

The ServiceClient automatically adds these headers:

```
X-Service-Key: <SERVICE_API_KEY>
X-Source-Service: <your-service-name>
X-Request-ID: <unique-request-id>
Content-Type: application/json
```

### Incoming Request Validation

The middleware validates these headers:

```
Required:
- X-Service-Key: Must match SERVICE_API_KEY
- X-Request-ID: Must be present
- X-Source-Service: Optional but recommended
```

## Security Best Practices

1. **Key Management**
   - Use a strong, randomly generated SERVICE_API_KEY
   - Store keys in environment variables, never in code
   - Rotate keys regularly (every 90 days recommended)
   - Use different keys for different environments (dev/staging/prod)

2. **Network Security**
   - Use HTTPS/TLS in production
   - Implement network-level security (VPC, security groups)
   - Use service mesh for additional security (e.g., Istio)

3. **Monitoring & Logging**
   - Monitor authentication failures
   - Set up alerts for suspicious patterns
   - Log all internal API calls with request IDs
   - Use distributed tracing (e.g., Jaeger, Zipkin)

4. **Rate Limiting**
   - Implement rate limiting on internal endpoints
   - Different limits for different services if needed
   - Use Redis for distributed rate limiting

5. **Access Control**
   - Use the `requireServiceAccess` middleware to restrict endpoints
   - Only allow specific services to access sensitive endpoints
   - Implement the principle of least privilege

## Monitoring & Debugging

### Request Tracing

Every request has a unique X-Request-ID that flows through all services:

```typescript
// In your service
console.log(`[${req.requestId}] Processing request from ${req.serviceId}`);

// Logs will look like:
// [a7f9c8d2-e1b4-f6a3-d8e9-c7b5a2f1d4e8] Processing request from payment-service
```

### Circuit Breaker Status

Check circuit breaker status:

```typescript
const state = client.getCircuitBreakerState();
console.log('Circuit breaker state:', state); // CLOSED, OPEN, or HALF_OPEN
```

### Authentication Logs

Authentication middleware logs all attempts:

```
[ServiceAuth] Service authenticated: payment-service - POST /api/internal/coins/add - RequestID: abc123 (5ms)
[ServiceAuth] Authentication failed: Invalid service key from unknown - POST /api/internal/endpoint
```

## Troubleshooting

### Common Issues

1. **"MISSING_SERVICE_KEY" Error**
   - Ensure SERVICE_API_KEY is set in environment
   - Verify the ServiceClient is initialized correctly
   - Check that the key is being sent in requests

2. **"INVALID_SERVICE_KEY" Error**
   - Verify SERVICE_API_KEY matches across services
   - Check for trailing whitespace in .env files
   - Ensure the key wasn't modified during deployment

3. **"CIRCUIT_BREAKER_OPEN" Error**
   - The circuit breaker detected multiple failures
   - Wait for the timeout period (default: 60s)
   - Check the target service health
   - Review recent error logs

4. **Timeout Errors**
   - Increase timeout configuration
   - Check network connectivity
   - Review target service performance
   - Check for database query issues

5. **Retry Exhausted**
   - All retry attempts failed
   - Check service availability
   - Review error logs on target service
   - Verify request payload is valid

## Migration Guide

### From Direct Axios to ServiceClient

**Before:**
```typescript
import axios from 'axios';

const response = await axios.post('http://user-service:3001/api/internal/endpoint', data, {
  headers: {
    'X-Service-Key': process.env.SERVICE_API_KEY,
  },
});
```

**After:**
```typescript
import { ServiceClient } from '../shared/clients/service-client';

const client = new ServiceClient({
  baseURL: 'http://user-service:3001',
  serviceName: 'my-service',
});

const response = await client.post('/api/internal/endpoint', data);
```

## Testing

### Unit Tests

```typescript
import { authenticateService } from '../middleware/service-auth.middleware';

describe('Service Authentication Middleware', () => {
  it('should reject requests without service key', async () => {
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    authenticateService(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
```

### Integration Tests

```typescript
import { ServiceClient } from '../shared/clients/service-client';

describe('Service Client Integration', () => {
  it('should successfully call internal endpoint', async () => {
    const client = new ServiceClient({
      baseURL: 'http://localhost:3001',
      serviceName: 'test-service',
    });

    const response = await client.get('/api/internal/health');
    expect(response.status).toBe(200);
  });
});
```

## Deployment Checklist

- [ ] SERVICE_API_KEY is set in all service environments
- [ ] All service URLs are configured correctly
- [ ] Internal routes are protected with authenticateService middleware
- [ ] ServiceClient is used for all inter-service communication
- [ ] Logging is enabled and configured
- [ ] Monitoring alerts are set up for authentication failures
- [ ] Circuit breaker is configured (if needed)
- [ ] Rate limiting is implemented
- [ ] Security scanning is performed
- [ ] Documentation is updated

## Support & Resources

- **Architecture Diagram**: See `docs/architecture/service-communication.md`
- **API Reference**: See individual service README files
- **Security Guidelines**: See `docs/security/service-to-service.md`
- **Deployment Guide**: See `docs/deployment/microservices.md`

## Changelog

### Version 1.0.0 (2025-12-01)
- Initial implementation of service-to-service authentication
- Added ServiceClient with retry logic and circuit breaker
- Implemented constant-time key comparison
- Added request ID tracing
- Created comprehensive documentation
