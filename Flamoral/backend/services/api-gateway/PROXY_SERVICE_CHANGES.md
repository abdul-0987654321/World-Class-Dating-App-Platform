# Proxy Service Changes for Cache Integration

This document provides the exact code changes needed to integrate ResponseCacheService into proxy.service.ts.

## Change 1: Add Import

**Location**: Top of file (line 4)

**Before**:
```typescript
import { CircuitBreakerService } from './circuit-breaker.service';
import { v4 as uuidv4 } from 'uuid';
```

**After**:
```typescript
import { CircuitBreakerService } from './circuit-breaker.service';
import { ResponseCacheService } from './response-cache.service';
import { v4 as uuidv4 } from 'uuid';
```

---

## Change 2: Inject ResponseCacheService

**Location**: Constructor (around line 74)

**Before**:
```typescript
constructor(
  private readonly configService: ConfigService,
  private readonly circuitBreaker: CircuitBreakerService,
) {
  this.internalServiceKey = this.configService.get<string>('internalServiceKey');
  this.initializeServices();
}
```

**After**:
```typescript
constructor(
  private readonly configService: ConfigService,
  private readonly circuitBreaker: CircuitBreakerService,
  private readonly responseCache: ResponseCacheService,
) {
  this.internalServiceKey = this.configService.get<string>('internalServiceKey');
  this.initializeServices();
}
```

---

## Change 3: Add tryCache Method

**Location**: After `sleep()` method (around line 218)

**Add This Method**:
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

---

## Change 4: Modify forward() Method Signature

**Location**: Around line 223

**Before**:
```typescript
async forward<T = any>(
  serviceName: string,
  method: string,
  path: string,
  data?: any,
  headers?: Record<string, string>,
): Promise<T> {
```

**After**:
```typescript
async forward<T = any>(
  serviceName: string,
  method: string,
  path: string,
  data?: any,
  headers?: Record<string, string>,
  requestId?: string,
): Promise<T> {
```

---

## Change 5: Add Cache Check at Start of forward()

**Location**: Beginning of `forward()` method (around line 230)

**Before**:
```typescript
async forward<T = any>(
  serviceName: string,
  method: string,
  path: string,
  data?: any,
  headers?: Record<string, string>,
  requestId?: string,
): Promise<T> {
  const serviceConfig = this.serviceConfigs.get(serviceName);

  // Use circuit breaker to protect against cascading failures
  return this.circuitBreaker.execute(
```

**After**:
```typescript
async forward<T = any>(
  serviceName: string,
  method: string,
  path: string,
  data?: any,
  headers?: Record<string, string>,
  requestId?: string,
): Promise<T> {
  const serviceConfig = this.serviceConfigs.get(serviceName);

  // For GET requests, try to get fresh cache first
  if (method === 'GET' && this.responseCache.isCacheable(method, path)) {
    const cachedData = await this.responseCache.get(serviceName, path);
    if (cachedData !== null) {
      return cachedData;
    }
  }

  // Use circuit breaker to protect against cascading failures
  return this.circuitBreaker.execute(
```

---

## Change 6: Add Request ID to Config Headers

**Location**: Inside circuit breaker execute callback (around line 238)

**Before**:
```typescript
const config: AxiosRequestConfig = {
  method,
  url: path,
  data,
  headers: headers ? { ...headers } : undefined,
};
```

**After**:
```typescript
const config: AxiosRequestConfig = {
  method,
  url: path,
  data,
  headers: headers ? {
    ...headers,
    ...(requestId ? { 'X-Request-ID': requestId } : {}),
  } : requestId ? { 'X-Request-ID': requestId } : undefined,
};
```

---

## Change 7: Add Cache Storage After Success

**Location**: After successful response (around line 251)

**Before**:
```typescript
try {
  // Execute with retry logic
  const response = await this.executeWithRetry<T>(
    serviceName,
    () => service.request(config),
  );
  return response.data;
} catch (error: any) {
```

**After**:
```typescript
try {
  // Execute with retry logic
  const response = await this.executeWithRetry<T>(
    serviceName,
    () => service.request(config),
  );

  // Cache successful GET responses
  if (method === 'GET' && this.responseCache.isCacheable(method, path)) {
    await this.responseCache.set(serviceName, path, response.data);
  }

  return response.data;
} catch (error: any) {
```

---

## Change 8: Sanitize Error Messages

**Location**: Error handling in forward() (around line 260)

**Before**:
```typescript
// Create error with additional context
const httpError = new HttpException(
  {
    message,
    service: serviceName,
    path,
    statusCode: status,
  },
  status,
);
```

**After**:
```typescript
// Create error with additional context but sanitize internal details
const httpError = new HttpException(
  {
    message,
    statusCode: status,
    ...(requestId ? { requestId } : {}),
  },
  status,
);
```

**Before**:
```typescript
// Network or timeout error
const networkError = new HttpException(
  {
    message: 'Service communication error',
    service: serviceName,
    path,
    originalError: error.message,
  },
  503,
);
```

**After**:
```typescript
// Network or timeout error - SANITIZE ERROR MESSAGE
const networkError = new HttpException(
  {
    message: 'Service temporarily unavailable',
    statusCode: 503,
    ...(requestId ? { requestId } : {}),
  },
  503,
);
```

---

## Change 9: Update createFallback Signature

**Location**: createFallback() method (around line 291)

**Before**:
```typescript
private createFallback<T>(
  serviceName: string,
  method: string,
  path: string,
): () => Promise<T> {
```

**After**:
```typescript
private createFallback<T>(
  serviceName: string,
  method: string,
  path: string,
  requestId?: string,
): () => Promise<T> {
```

---

## Change 10: Update createFallback to Use Cache

**Location**: Inside createFallback() (around line 305)

**Before**:
```typescript
return async () => {
  this.logger.warn(`Circuit breaker fallback triggered for ${serviceName} - ${method} ${path}`);

  const serviceConfig = this.serviceConfigs.get(serviceName);

  // Critical services should not have fallbacks - fail fast
  if (serviceConfig?.critical) {
    throw new HttpException(
      {
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Service is temporarily unavailable. Please try again shortly.',
        retryAfter: 30,
      },
      503,
    );
  }

  // For non-critical GET requests, return empty/degraded response
  if (method === 'GET') {
```

**After**:
```typescript
return async () => {
  this.logger.warn(`Circuit breaker fallback triggered for ${serviceName} - ${method} ${path}`);

  const serviceConfig = this.serviceConfigs.get(serviceName);
  const circuitStatus = this.circuitBreaker.getCircuitStatus(serviceName);

  // Try to get cached response first for non-critical services
  if (!serviceConfig?.critical && method === 'GET') {
    const cachedData = await this.tryCache(serviceName, path, method);
    if (cachedData !== null) {
      return cachedData;
    }

    // No cache available, try empty/degraded response
```

---

## Change 11: Update Error Response in createFallback

**Location**: End of createFallback() (around line 325)

**Before**:
```typescript
// For mutations, throw service unavailable
throw new HttpException(
  {
    statusCode: 503,
    error: 'Service Unavailable',
    message: 'Service is temporarily unavailable. Please try again shortly.',
    retryAfter: 30,
  },
  503,
);
```

**After**:
```typescript
// Critical services or mutations should fail with proper error
const retryAfter = 30; // Suggest retry after 30 seconds
const errorContext = {
  statusCode: 503,
  error: 'Service Unavailable',
  message: 'Service is temporarily unavailable. Please try again shortly.',
  retryAfter,
  ...(requestId ? { requestId } : {}),
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
```

---

## Change 12: Update createFallback Call

**Location**: In forward() method (around line 289)

**Before**:
```typescript
// Fallback function - returns graceful degradation response where possible
this.createFallback(serviceName, method, path),
```

**After**:
```typescript
// Fallback function - returns graceful degradation response where possible
this.createFallback(serviceName, method, path, requestId),
```

---

## Change 13: Update All Proxy Methods

**Location**: get, post, put, patch, delete methods (around line 364)

**Before**:
```typescript
async get<T = any>(
  serviceName: string,
  path: string,
  headers?: Record<string, string>,
): Promise<T> {
  return this.forward<T>(serviceName, 'GET', path, undefined, headers);
}
```

**After**:
```typescript
async get<T = any>(
  serviceName: string,
  path: string,
  headers?: Record<string, string>,
  requestId?: string,
): Promise<T> {
  return this.forward<T>(serviceName, 'GET', path, undefined, headers, requestId);
}
```

**Repeat for**:
- `post()` method
- `put()` method
- `patch()` method
- `delete()` method

---

## Change 14: Add getCacheStats Method

**Location**: End of class (around line 416)

**Add This Method**:
```typescript
/**
 * Get cache statistics
 */
getCacheStats() {
  return this.responseCache.getCacheStats();
}
```

---

## Complete Example of Updated Methods

### Complete forward() Method:
```typescript
async forward<T = any>(
  serviceName: string,
  method: string,
  path: string,
  data?: any,
  headers?: Record<string, string>,
  requestId?: string,
): Promise<T> {
  const serviceConfig = this.serviceConfigs.get(serviceName);

  // For GET requests, try to get fresh cache first
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
          ...(requestId ? { 'X-Request-ID': requestId } : {}),
        } : requestId ? { 'X-Request-ID': requestId } : undefined,
      };

      try {
        // Execute with retry logic
        const response = await this.executeWithRetry<T>(
          serviceName,
          () => service.request(config),
        );

        // Cache successful GET responses
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
              ...(requestId ? { requestId } : {}),
            },
            status,
          );
          (httpError as any).statusCode = status;
          throw httpError;
        }

        // Network or timeout error - SANITIZE ERROR MESSAGE
        const networkError = new HttpException(
          {
            message: 'Service temporarily unavailable',
            statusCode: 503,
            ...(requestId ? { requestId } : {}),
          },
          503,
        );
        (networkError as any).statusCode = 503;
        throw networkError;
      }
    },
    // Fallback function - returns graceful degradation response where possible
    this.createFallback(serviceName, method, path, requestId),
  );
}
```

### Complete createFallback() Method:
```typescript
private createFallback<T>(
  serviceName: string,
  method: string,
  path: string,
  requestId?: string,
): () => Promise<T> {
  return async () => {
    this.logger.warn(`Circuit breaker fallback triggered for ${serviceName} - ${method} ${path}`);

    const serviceConfig = this.serviceConfigs.get(serviceName);
    const circuitStatus = this.circuitBreaker.getCircuitStatus(serviceName);

    // Try to get cached response first for non-critical services
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
      message: 'Service is temporarily unavailable. Please try again shortly.',
      retryAfter,
      ...(requestId ? { requestId } : {}),
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

---

## Verification Checklist

After making changes, verify:

- [ ] ResponseCacheService imported
- [ ] ResponseCacheService injected in constructor
- [ ] tryCache() method added
- [ ] forward() signature updated with requestId parameter
- [ ] Cache check added at start of forward()
- [ ] Cache storage added after successful responses
- [ ] Request ID added to headers
- [ ] Error messages sanitized
- [ ] createFallback() signature updated with requestId
- [ ] createFallback() uses tryCache()
- [ ] Detailed error logging added
- [ ] All proxy methods (get/post/put/patch/delete) updated
- [ ] getCacheStats() method added
- [ ] File compiles without errors
- [ ] All tests pass

---

## Testing

After changes, test:

1. **Cache functionality**:
   ```bash
   # First request (cache miss)
   curl -v http://localhost:3000/api/users/123

   # Second request (cache hit)
   curl -v http://localhost:3000/api/users/123
   ```

2. **Graceful degradation**:
   ```bash
   # Stop a non-critical service
   kubectl scale deployment user-service --replicas=0

   # Should return cached or empty data
   curl http://localhost:3000/api/users/123
   ```

3. **Request ID tracking**:
   ```bash
   curl -H "X-Request-ID: test-123" http://localhost:3000/api/users/123
   # Check logs for "test-123"
   ```

4. **Error sanitization**:
   ```bash
   # Stop a critical service
   kubectl scale deployment auth-service --replicas=0

   # Should return generic error (no internal details)
   curl http://localhost:3000/api/auth/login
   ```

---

**Last Updated**: December 15, 2025
**Status**: Ready for implementation
**Estimated Time**: 30-45 minutes
