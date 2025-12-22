# Error Handling System

**Last Updated:** 2025-12-21
**Version:** 1.0.0

---

## Overview

The Flamoral platform implements a unified error handling system across three layers:

1. **HTTP Layer** - Standardized API responses with error codes and correlation IDs
2. **Backend Code** - Typed error classes with automatic status code mapping
3. **Frontend UX** - Global error handlers with user-friendly messaging

This document provides an overview of the error system. For detailed reference, see:

- [Error Codes Reference](./errors/error-codes.md) - Complete list of all error codes
- [Frontend Handling](./errors/frontend-handling.md) - How the frontend handles errors
- [Backend Integration](./errors/backend-integration.md) - How to use errors in backend services
- [API Contract](./errors/api-contract.md) - Exact JSON schema for error responses

---

## The Three Layers

### Layer 1: HTTP Response (What the client receives)

Every API error follows a standard JSON format:

```json
{
  "code": "UNAUTHORIZED",
  "message": "Authentication required",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "path": "/api/v1/profile/me"
}
```

### Layer 2: Backend Code (How services throw errors)

Services use typed error classes and factory functions:

```typescript
// Using NestJS exceptions with custom payload
import { ApiErrors } from './filters/http-exception.filter';

throw ApiErrors.unauthorized('Invalid credentials');
throw ApiErrors.notFound('User', userId);
throw ApiErrors.paymentRequired('Super likes require Gold plan', 'GOLD', 'FREE');
```

### Layer 3: Frontend UX (What the user sees)

The frontend API client catches errors and displays appropriate UI:

| HTTP Status | UX Behavior |
|-------------|-------------|
| 400 | Show inline validation errors on forms |
| 401 | Redirect to login page |
| 402 | Show upgrade modal with plan options |
| 403 | Show access denied message |
| 404 | Show "not found" page or toast |
| 429 | Show rate limit message with retry timer |
| 500+ | Show generic error toast, log to Sentry |

---

## Standard API Error Response Format

All API errors follow this structure (matching `openapi.yaml`):

```typescript
interface ApiErrorResponse {
  code: string;              // Machine-readable error code (e.g., "UNAUTHORIZED")
  message: string;           // Human-readable message
  correlation_id: string;    // UUID for tracing in logs
  timestamp: string;         // ISO 8601 timestamp
  path: string;              // Request path that caused the error

  // Additional fields for specific error types:
  required_plan?: string;    // For 402 errors
  current_plan?: string;     // For 402 errors
  retry_after?: number;      // For 429 errors (seconds)
  details?: object;          // For validation errors
}
```

---

## HTTP Status Code Mapping

| Status | Code | When to Use |
|--------|------|-------------|
| 400 | `BAD_REQUEST` | Invalid input, validation failures |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication |
| 402 | `PAYMENT_REQUIRED` | Feature requires subscription upgrade |
| 403 | `FORBIDDEN` | User lacks permission for action |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Resource already exists (e.g., duplicate email) |
| 413 | `PAYLOAD_TOO_LARGE` | Uploaded file exceeds size limit |
| 422 | `UNPROCESSABLE_ENTITY` | Semantic validation failure |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error |
| 502 | `BAD_GATEWAY` | Upstream service failure |
| 503 | `SERVICE_UNAVAILABLE` | Service temporarily unavailable |
| 504 | `GATEWAY_TIMEOUT` | Upstream service timeout |

---

## How to Add New Error Codes

### Step 1: Define the error code

Add to `backend/services/api-gateway/src/filters/http-exception.filter.ts`:

```typescript
const ERROR_CODES: Record<number, string> = {
  // ... existing codes
  418: 'IM_A_TEAPOT',  // Add your new code
};
```

### Step 2: Add factory method (optional)

If the error needs special handling:

```typescript
export class ApiErrors {
  // ... existing methods

  static imATeapot(message: string): HttpException {
    return new HttpException({
      code: 'IM_A_TEAPOT',
      message,
    }, 418);
  }
}
```

### Step 3: Update documentation

1. Add to `docs/errors/error-codes.md`
2. Update frontend handling if needed
3. Update OpenAPI spec in `docs/02-api/openapi.yaml`

---

## How to Use Errors in a New Service

### Step 1: Import the error classes

For NestJS services:

```typescript
import { HttpExceptionFilter, ApiErrors } from '@flamoral/shared/filters';
```

For Express services:

```typescript
import {
  errorHandlerMiddleware,
  AppError,
  ValidationError
} from '@flamoral/shared/middleware/error-handler.middleware';
```

### Step 2: Register the global exception filter (NestJS)

```typescript
// main.ts
import { HttpExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(3000);
}
```

### Step 3: Register error middleware (Express)

```typescript
// app.ts
import { errorHandlerMiddleware, notFoundHandler } from './middleware/error-handler.middleware';

// After all routes
app.use(notFoundHandler);
app.use(errorHandlerMiddleware);
```

### Step 4: Throw errors in your handlers

```typescript
// Controller example
@Get(':id')
async getUser(@Param('id') id: string) {
  const user = await this.userService.findById(id);
  if (!user) {
    throw ApiErrors.notFound('User', id);
  }
  return user;
}
```

---

## Correlation ID Usage

Every error includes a `correlation_id` for tracing:

1. Client sends `X-Correlation-ID` header (optional)
2. If not provided, server generates UUID
3. Same ID used in logs and error response
4. Include in bug reports for easy debugging

```typescript
// The filter automatically handles this
const correlationId = request.headers['x-correlation-id'] ||
                      request.headers['x-request-id'] ||
                      uuidv4();
```

---

## Production vs Development

The error system behaves differently based on `NODE_ENV`:

### Production
- Generic messages for 500+ errors
- No stack traces exposed
- Full logging to monitoring system

### Development
- Detailed error messages
- Stack traces included in response
- Verbose console logging

```typescript
// Example: Production sanitizes 500 errors
if (process.env.NODE_ENV === 'production') {
  message = 'An unexpected error occurred';
} else {
  message = exception.message; // Full details in dev
}
```

---

## Best Practices

### Do:
- Always use typed error classes
- Include correlation ID in logs
- Return user-safe messages
- Log detailed errors server-side
- Use appropriate HTTP status codes

### Don't:
- Expose internal error details to clients
- Include stack traces in production responses
- Use generic 500 for all errors
- Forget to handle async errors
- Log sensitive data (passwords, tokens)

---

## Related Documentation

- [Error Codes Reference](./errors/error-codes.md)
- [Frontend Error Handling](./errors/frontend-handling.md)
- [Backend Integration Guide](./errors/backend-integration.md)
- [API Error Contract](./errors/api-contract.md)
- [OpenAPI Specification](./02-api/openapi.yaml)
