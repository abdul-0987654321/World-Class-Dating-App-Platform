# Health Checks and Graceful Degradation Implementation

## Phase 5-6: Implementation Summary

This document details the health check and graceful degradation improvements implemented in the API Gateway.

## 1. Overview

The implementation adds:
- Comprehensive health check endpoints with dependency validation
- Redis-backed response caching for graceful degradation
- Enhanced fallback mechanisms with stale cache support
- Proper error sanitization to prevent internal data leakage
- Request ID tracking for debugging
- Retry-After headers for rate limiting

## 2. Files Created

### 2.1 Response Cache Service
**File**: `src/services/response-cache.service.ts`

A new service that provides:
- Redis-backed caching with in-memory fallback
- Automatic cache TTL management based on endpoint type
- Stale cache support (up to 1 hour old) for graceful degradation
- Cache invalidation methods
- Statistics and monitoring

Key features:
```typescript
// Cache TTL configuration based on endpoint type
- Profile data: 5 minutes
- Matches: 10 minutes
- Analytics: 15 minutes
- Notifications: 2 minutes
- Default: 5 minutes

// Methods
- get(serviceName, path): Get fresh cache
- getStale(serviceName, path): Get cache even if expired (for fallback)
- set(serviceName, path, data): Store cache
- invalidate(serviceName, path): Clear specific cache
- invalidateService(serviceName): Clear all cache for a service
- isCacheable(method, path): Check if endpoint should be cached
```

**Status**: IMPLEMENTED ✓

## 3. Files to be Modified

### 3.1 Proxy Service Enhancement
**File**: `src/services/proxy.service.ts`

**Required Changes**:

1. Add ResponseCacheService import and inject in constructor:
```typescript
import { ResponseCacheService } from './response-cache.service';

constructor(
  private readonly configService: ConfigService,
  private readonly circuitBreaker: CircuitBreakerService,
  private readonly responseCache: ResponseCacheService, // ADD THIS
) {
  // ...
}
```

2. Add tryCache method (around line 240):
```typescript
/**
 * Try to get cached response for graceful degradation
 */
private async tryCache(serviceName: string, path: string, method: string): Promise<any | null> {
  // Only try cache for non-critical services and GET requests
  const serviceConfig = this.serviceConfigs.get(serviceName);
  if (serviceConfig?.critical || method !== 'GET') {
    return null;
  }

  // Try to get stale cache (allows expired cache for fallback)
  const cachedData = await this.responseCache.getStale(serviceName, path);
  if (cachedData !== null) {
    this.logger.warn(`Using cached fallback for ${serviceName}${path}`);
    return cachedData;
  }

  return null;
}
```

3. Modify forward() method to add caching support (around line 220):
```typescript
async forward<T = any>(
  serviceName: string,
  method: string,
  path: string,
  data?: any,
  headers?: Record<string, string>,
  requestId?: string, // ADD THIS PARAMETER
): Promise<T> {
  const serviceConfig = this.serviceConfigs.get(serviceName);

  // ADD THIS: For GET requests, try to get fresh cache first
  if (method === 'GET' && this.responseCache.isCacheable(method, path)) {
    const cachedData = await this.responseCache.get(serviceName, path);
    if (cachedData !== null) {
      return cachedData;
    }
  }

  // Use circuit breaker to protect against cascading failures
  return this.circuitBreaker.execute(
    serviceName,
    async () => {
      const service = this.getService(serviceName);

      const config: AxiosRequestConfig = {
        method,
        url: path,
        data,
        headers: headers ? {
          ...headers,
          ...(requestId ? { 'X-Request-ID': requestId } : {}), // ADD REQUEST ID
        } : requestId ? { 'X-Request-ID': requestId } : undefined,
      };

      try {
        // Execute with retry logic
        const response = await this.executeWithRetry<T>(
          serviceName,
          () => service.request(config),
        );

        // ADD THIS: Cache successful GET responses
        if (method === 'GET' && this.responseCache.isCacheable(method, path)) {
          await this.responseCache.set(serviceName, path, response.data);
        }

        return response.data;
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status || 500;
          const responseData = error.response?.data;

          // Preserve the original error message and status
          const message = responseData?.message || responseData?.error || error.message;

          // Create error with additional context but sanitize internal details
          const httpError = new HttpException(
            {
              message,
              statusCode: status,
              ...(requestId ? { requestId } : {}), // ADD REQUEST ID
            },
            status,
          );
          (httpError as any).statusCode = status;
          throw httpError;
        }

        // Network or timeout error - SANITIZE ERROR MESSAGE
        const networkError = new HttpException(
          {
            message: 'Service temporarily unavailable', // CHANGED FROM DETAILED ERROR
            statusCode: 503,
            ...(requestId ? { requestId } : {}), // ADD REQUEST ID
          },
          503,
        );
        (networkError as any).statusCode = 503;
        throw networkError;
      }
    },
    // Fallback function - returns graceful degradation response where possible
    this.createFallback(serviceName, method, path, requestId), // ADD REQUEST ID
  );
}
```

4. Modify createFallback() to use cache (around line 290):
```typescript
private createFallback<T>(
  serviceName: string,
  method: string,
  path: string,
  requestId?: string, // ADD THIS PARAMETER
): () => Promise<T> {
  return async () => {
    this.logger.warn(`Circuit breaker fallback triggered for ${serviceName} - ${method} ${path}`);

    const serviceConfig = this.serviceConfigs.get(serviceName);
    const circuitStatus = this.circuitBreaker.getCircuitStatus(serviceName);

    // ADD THIS: Try to get cached response first for non-critical services
    if (!serviceConfig?.critical && method === 'GET') {
      const cachedData = await this.tryCache(serviceName, path, method);
      if (cachedData !== null) {
        return cachedData;
      }

      // No cache available, try empty/degraded response
      // Return empty arrays for list endpoints
      if (path.includes('/list') || path.endsWith('s') || path.includes('/all')) {
        this.logger.warn(`Returning empty list fallback for ${serviceName} ${path}`);
        return [] as unknown as T;
      }

      // Return null for single item endpoints
      this.logger.warn(`Returning null fallback for ${serviceName} ${path}`);
      return null as unknown as T;
    }

    // Critical services or mutations should fail with proper error
    const retryAfter = 30; // Suggest retry after 30 seconds
    const errorContext = {
      statusCode: 503,
      error: 'Service Unavailable',
      message: 'Service is temporarily unavailable. Please try again shortly.', // SANITIZED MESSAGE
      retryAfter,
      ...(requestId ? { requestId } : {}), // ADD REQUEST ID
    };

    // LOG DETAILED ERROR (but don't expose to user)
    this.logger.error(
      `Service fallback for ${serviceName} ${method} ${path}: ${errorContext.message}`,
      {
        service: serviceName,
        critical: serviceConfig?.critical,
        circuitState: circuitStatus.state,
        failures: circuitStatus.failures,
      }
    );

    throw new HttpException(errorContext, 503);
  };
}
```

5. Update all proxy methods to accept requestId:
```typescript
async get<T = any>(
  serviceName: string,
  path: string,
  headers?: Record<string, string>,
  requestId?: string, // ADD THIS
): Promise<T> {
  return this.forward<T>(serviceName, 'GET', path, undefined, headers, requestId);
}

// Similarly for post, put, patch, delete
```

6. Add getCacheStats method:
```typescript
/**
 * Get cache statistics
 */
getCacheStats() {
  return this.responseCache.getCacheStats();
}
```

### 3.2 HTTP Exception Filter Enhancement
**File**: `src/filters/http-exception.filter.ts`

**Current Status**: Already has error sanitization
- Removes stack traces in production
- Logs detailed errors server-side
- Returns generic messages to users

**Additional Enhancement Required**:

Add request ID tracking (around line 15):
```typescript
catch(exception: unknown, host: ArgumentsHost) {
  const ctx = host.switchToHttp();
  const response = ctx.getResponse<Response>();
  const request = ctx.getRequest<Request>();

  // ADD THIS: Extract request ID from headers
  const requestId = request.headers['x-request-id'] as string;

  let status: number;
  let message: string | object;
  let error: string;

  if (exception instanceof HttpException) {
    status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'object') {
      message = (exceptionResponse as any).message || exception.message;
      error = (exceptionResponse as any).error || 'Error';
    } else {
      message = exceptionResponse;
      error = 'Error';
    }
  } else if (exception instanceof Error) {
    status = HttpStatus.INTERNAL_SERVER_ERROR;
    message = 'Internal server error'; // ALREADY SANITIZED
    error = 'Internal Server Error';

    // Log the actual error for debugging
    this.logger.error(
      `Unhandled exception: ${exception.message}`,
      exception.stack,
    );
  } else {
    status = HttpStatus.INTERNAL_SERVER_ERROR;
    message = 'Internal server error';
    error = 'Internal Server Error';
  }

  const errorResponse = {
    statusCode: status,
    timestamp: new Date().toISOString(),
    path: request.url,
    method: request.method,
    error,
    message,
    ...(requestId ? { requestId } : {}), // ADD REQUEST ID
    ...(process.env.NODE_ENV === 'development' && exception instanceof Error
      ? { stack: exception.stack }
      : {}),
  };

  // Log error details with request ID
  this.logger.error(
    `[${requestId || 'NO-ID'}] ${request.method} ${request.url} - ${status} - ${JSON.stringify(message)}`,
  );

  response.status(status).json(errorResponse);
}
```

### 3.3 Health Controller Enhancement
**File**: `src/health/health.controller.ts`

**Current Status**: Already implements comprehensive health checks
- Database connectivity (via Redis check)
- Redis connectivity
- Memory pressure monitoring
- Circuit breaker health
- Critical service availability

**What's Already Working**:
1. Readiness probe (`/health/ready`):
   - Checks Redis connectivity
   - Checks circuit breaker states for critical services (auth, payment)
   - Checks memory pressure (>90% = not ready)
   - Returns 200 (ready) or 503 (not ready)

2. Liveness probe (`/health/live`):
   - Simple process health check
   - Memory leak detection (RSS > 2GB = unhealthy)
   - Returns 200 (alive) or 503 (unhealthy)

3. Deep health check (`/health/services`):
   - Checks all downstream services
   - Circuit breaker metrics
   - Performance metrics (latency, uptime, failure rates)

**Additional Enhancement** - Add Retry-After header:

Modify readiness endpoint (around line 145):
```typescript
// Return appropriate HTTP status code for Kubernetes
const httpStatus = overallHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

// ADD THIS: Add Retry-After header when not ready
if (!overallHealthy) {
  res.setHeader('Retry-After', '30'); // Suggest retry after 30 seconds
}

res.status(httpStatus).json(response);
```

### 3.4 Proxy Module
**File**: `src/services/proxy.module.ts`

**Required Changes**:

Add ResponseCacheService to providers:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProxyService } from './proxy.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { ResponseCacheService } from './response-cache.service'; // ADD THIS

@Module({
  imports: [ConfigModule],
  providers: [
    ProxyService,
    CircuitBreakerService,
    ResponseCacheService, // ADD THIS
  ],
  exports: [
    ProxyService,
    CircuitBreakerService,
    ResponseCacheService, // ADD THIS
  ],
})
export class ProxyModule {}
```

### 3.5 Health Module
**File**: `src/health/health.module.ts`

**Required Changes**:

Import ProxyModule for dependency injection:
```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { ProxyModule } from '../services/proxy.module'; // ADD THIS
import { CircuitBreakerService } from '../services/circuit-breaker.service'; // ADD THIS

@Module({
  imports: [
    TerminusModule,
    ProxyModule, // ADD THIS
  ],
  controllers: [HealthController],
  providers: [CircuitBreakerService], // ADD THIS IF NOT ALREADY IMPORTED
})
export class HealthModule {}
```

## 4. Kubernetes Health Probes Configuration

**Current Configuration**: Already properly configured in deployment files

### api-gateway-optimized.yaml
```yaml
livenessProbe:
  httpGet:
    path: /health/live  # ✓ Correct endpoint
    port: 80
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3  # Restart after 3 failures

readinessProbe:
  httpGet:
    path: /health/ready  # ✓ Should be /health/ready (not /health)
    port: 80
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2  # Remove from service after 2 failures
```

**Required Change**: Update readiness probe path
```yaml
readinessProbe:
  httpGet:
    path: /health/ready  # CHANGE FROM /health TO /health/ready
    port: 80
  initialDelaySeconds: 10  # Increase to allow dependencies to initialize
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

## 5. Critical vs Non-Critical Service Classification

**Current Implementation** (proxy.service.ts line 100):
```typescript
critical: ['authService', 'paymentService'].includes(name),
```

**Rationale**:
- **Critical Services** (no fallback, fail fast):
  - `authService`: Authentication is required for user operations
  - `paymentService`: Payment operations must not degrade (money involved)

- **Non-Critical Services** (with fallback):
  - `userService`: Can return cached profiles
  - `matchingService`: Can return empty array or cached matches
  - `messagingService`: Can return empty messages temporarily
  - `analyticsService`: Can return cached stats
  - `notificationService`: Can temporarily skip notifications
  - `mediaService`: Can return cached images
  - `moderationService`: Can temporarily skip moderation

## 6. Error Sanitization Strategy

### 6.1 User-Facing Errors (Sanitized)
```typescript
// Generic messages only
{
  "statusCode": 503,
  "error": "Service Unavailable",
  "message": "Service is temporarily unavailable. Please try again shortly.",
  "retryAfter": 30,
  "requestId": "uuid-here",
  "timestamp": "2025-12-15T..."
}
```

### 6.2 Server-Side Logging (Detailed)
```typescript
this.logger.error('Service fallback', {
  service: 'authService',
  critical: true,
  circuitState: 'OPEN',
  failures: 5,
  lastFailureTime: 1234567890,
  path: '/auth/login',
  method: 'POST',
  requestId: 'uuid-here'
});
```

### 6.3 Development Mode
- Stack traces included in development
- Removed in production
- Controlled by `NODE_ENV` environment variable

## 7. Request ID Flow

1. Request enters API Gateway
2. Proxy service generates UUID and adds to headers
3. Request forwarded to downstream service with X-Request-ID header
4. Response/Error captured with request ID
5. Request ID included in:
   - Logs (server-side)
   - Error responses (user-facing)
   - Health check responses

Benefits:
- End-to-end request tracing
- Correlate logs across services
- Debug production issues without exposing internals

## 8. Testing Checklist

### 8.1 Cache Functionality
- [ ] Cache stores successful GET responses
- [ ] Cache returns fresh data within TTL
- [ ] Cache allows stale data for fallback (up to 1 hour)
- [ ] Cache skips non-cacheable endpoints (/health, /metrics, etc.)
- [ ] Memory cache works when Redis is down

### 8.2 Graceful Degradation
- [ ] Non-critical service failures return cached data
- [ ] Non-critical service failures return empty arrays for lists
- [ ] Non-critical service failures return null for single items
- [ ] Critical service failures return 503 with Retry-After header
- [ ] Mutations always fail fast (no fallback for POST/PUT/DELETE)

### 8.3 Health Endpoints
- [ ] /health/ready returns 200 when all critical services available
- [ ] /health/ready returns 503 when critical service down
- [ ] /health/live returns 200 when process healthy
- [ ] /health/live returns 503 when memory leak detected
- [ ] /health/services shows all service statuses
- [ ] /health/circuits shows circuit breaker states
- [ ] Retry-After header present in 503 responses

### 8.4 Error Sanitization
- [ ] Internal errors return generic messages to users
- [ ] Detailed errors logged server-side
- [ ] Request IDs included in all responses
- [ ] Stack traces only in development mode
- [ ] No internal service names or paths exposed

### 8.5 Kubernetes Integration
- [ ] Readiness probe prevents traffic to unhealthy pods
- [ ] Liveness probe restarts crashed pods
- [ ] Health checks don't cause cascading failures
- [ ] Probes have appropriate timeouts and thresholds

## 9. Monitoring Recommendations

### 9.1 Metrics to Track
- Cache hit rate (should be >50% for read-heavy endpoints)
- Stale cache usage (indicates service degradation)
- Circuit breaker state changes
- Health check failures
- Request ID correlation across services

### 9.2 Alerts to Configure
- Critical service circuit breaker opens
- Cache Redis connection failures
- High stale cache usage (>10% of requests)
- Readiness probe failures
- Memory pressure warnings

### 9.3 Dashboards to Create
- Service health matrix (all services x time)
- Cache performance (hit/miss ratio)
- Circuit breaker states
- Error rates by service
- Request latency percentiles (p50, p95, p99)

## 10. Performance Considerations

### 10.1 Cache Configuration
- **Redis**: Primary cache, shared across pods
- **Memory**: Fallback cache, max 100 items per pod
- **TTL**: Varies by endpoint type (2-15 minutes)
- **Stale TTL**: Up to 1 hour for degraded mode

### 10.2 Retry Configuration
- **Max Retries**: 1 (2 total attempts)
- **Retry Delay**: 500ms with exponential backoff and jitter
- **Retryable Codes**: 502, 503, 504 only (not 500)
- **Retryable Errors**: ECONNRESET, ETIMEDOUT, ECONNREFUSED, EPIPE

### 10.3 Circuit Breaker Configuration
- **Failure Threshold**: Configured per service in circuit-breaker.service.ts
- **Timeout**: Configured per service (5s - 45s based on service type)
- **Half-Open State**: Allows 1 test request after cooldown

## 11. Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| ResponseCacheService | ✅ Implemented | src/services/response-cache.service.ts created |
| Proxy Service Updates | ⚠️ Documented | Manual changes required in proxy.service.ts |
| Exception Filter Updates | ⚠️ Documented | Manual changes required in http-exception.filter.ts |
| Health Controller | ✅ Mostly Complete | Only Retry-After header needed |
| Proxy Module | ⚠️ Documented | Add ResponseCacheService to providers |
| Health Module | ⚠️ Documented | Import ProxyModule |
| Kubernetes Probes | ⚠️ Needs Update | Change readiness probe to /health/ready |

## 12. Next Steps

1. Apply the documented changes to proxy.service.ts
2. Update http-exception.filter.ts with request ID tracking
3. Add Retry-After header to health controller
4. Update proxy.module.ts to include ResponseCacheService
5. Update health.module.ts to import ProxyModule
6. Update Kubernetes deployment to use /health/ready for readiness probe
7. Test all scenarios in the testing checklist
8. Deploy to staging environment
9. Monitor metrics and adjust cache TTLs as needed
10. Deploy to production with gradual rollout

## 13. Rollback Plan

If issues occur:
1. ResponseCacheService can be disabled by not injecting it
2. Proxy service changes are backward compatible
3. Health endpoints maintain existing behavior
4. Kubernetes probes can revert to /health if needed

The implementation is designed to be incremental and non-breaking.
