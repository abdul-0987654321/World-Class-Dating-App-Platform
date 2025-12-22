# Backend Integration Guide

**Last Updated:** 2025-12-21
**Version:** 1.0.0

---

This document explains how to integrate the error handling system into backend services.

## Overview

The Flamoral backend uses two error handling approaches:

1. **NestJS Services** - Use `HttpExceptionFilter` and `ApiErrors` factory class
2. **Express Services** - Use `errorHandlerMiddleware` and `AppError` class

---

## NestJS Error Handling

### Setting Up the Exception Filter

The global exception filter is located at:
`backend/services/api-gateway/src/filters/http-exception.filter.ts`

Register it in your main.ts:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Register global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(3000);
}
bootstrap();
```

### Using the ApiErrors Factory

The `ApiErrors` class provides factory methods for common error types:

```typescript
import { ApiErrors } from '../filters/http-exception.filter';

@Controller('users')
export class UsersController {
  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.userService.findById(id);

    if (!user) {
      throw ApiErrors.notFound('User', id);
    }

    return user;
  }

  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    const existing = await this.userService.findByEmail(createUserDto.email);

    if (existing) {
      throw ApiErrors.badRequest('Email already registered', 'EMAIL_ALREADY_EXISTS');
    }

    return this.userService.create(createUserDto);
  }
}
```

### Available Factory Methods

```typescript
export class ApiErrors {
  // 400 Bad Request
  static badRequest(message: string, code?: string, details?: Record<string, any>): BadRequestException;

  // 401 Unauthorized
  static unauthorized(message?: string): UnauthorizedException;

  // 402 Payment Required
  static paymentRequired(message: string, requiredPlan: string, currentPlan: string): HttpException;

  // 403 Forbidden
  static forbidden(message?: string): ForbiddenException;

  // 404 Not Found
  static notFound(resource: string, id?: string): NotFoundException;

  // 429 Rate Limited
  static rateLimited(message?: string, retryAfter?: number): HttpException;

  // 500 Internal Server Error
  static internalError(message?: string): HttpException;

  // 503 Service Unavailable
  static serviceUnavailable(service: string): HttpException;
}
```

### Examples

```typescript
// 400 - Bad Request with custom code
throw ApiErrors.badRequest(
  'Invalid date format',
  'INVALID_DATE_FORMAT',
  { field: 'date_of_birth', expected: 'YYYY-MM-DD' }
);

// 401 - Unauthorized
throw ApiErrors.unauthorized('Invalid token');

// 402 - Payment Required
throw ApiErrors.paymentRequired(
  'Super Likes require a Gold subscription',
  'GOLD',
  'FREE'
);

// 403 - Forbidden
throw ApiErrors.forbidden('You cannot access this resource');

// 404 - Not Found with ID
throw ApiErrors.notFound('Match', matchId);

// 429 - Rate Limited with retry time
throw ApiErrors.rateLimited('Too many likes', 3600); // retry after 1 hour

// 500 - Internal Server Error
throw ApiErrors.internalError('Database connection failed');

// 503 - Service Unavailable
throw ApiErrors.serviceUnavailable('Payment Service');
```

---

## Express Error Handling

### Setting Up Error Middleware

For Express-based services, use the shared error handler middleware:
`backend/services/shared/middleware/error-handler.middleware.ts`

```typescript
// app.ts
import express from 'express';
import {
  errorHandlerMiddleware,
  notFoundHandler,
  initializeErrorHandlers
} from '@flamoral/shared/middleware/error-handler.middleware';

const app = express();

// Initialize process-level error handlers
initializeErrorHandlers();

// ... your routes here ...

// 404 handler - MUST be after all routes
app.use(notFoundHandler);

// Global error handler - MUST be last
app.use(errorHandlerMiddleware);
```

### Using the AppError Class

```typescript
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError
} from '@flamoral/shared/middleware/error-handler.middleware';

// Basic usage
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await userService.findById(req.params.id);

    if (!user) {
      throw new NotFoundError(`User with ID ${req.params.id} not found`);
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});
```

### Available Error Classes

```typescript
// 400 - Validation Error
throw new ValidationError('Invalid input', { fields: ['email', 'password'] });

// 401 - Unauthorized
throw new UnauthorizedError('Token expired');

// 403 - Forbidden
throw new ForbiddenError('Insufficient permissions');

// 404 - Not Found
throw new NotFoundError('Resource not found');

// 409 - Conflict
throw new ConflictError('Email already exists', { email: 'test@example.com' });

// 429 - Too Many Requests
throw new TooManyRequestsError('Rate limit exceeded', 60); // retry after 60 seconds

// 500 - Internal Server Error
throw new InternalServerError('Database connection failed');

// 503 - Service Unavailable
throw new ServiceUnavailableError('Service is under maintenance');
```

### Async Handler Wrapper

Use the `asyncHandler` to catch errors in async route handlers:

```typescript
import { asyncHandler } from '@flamoral/shared/middleware/error-handler.middleware';

// Without wrapper - requires try/catch
router.get('/users', async (req, res, next) => {
  try {
    const users = await userService.findAll();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// With wrapper - cleaner code
router.get('/users', asyncHandler(async (req, res) => {
  const users = await userService.findAll();
  res.json(users);
}));
```

---

## Handling Third-Party Service Errors

### Stripe Errors

```typescript
import Stripe from 'stripe';
import { ApiErrors } from '../filters/http-exception.filter';

async function handlePayment(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      switch (error.type) {
        case 'StripeCardError':
          throw ApiErrors.badRequest(
            error.message,
            'PAYMENT_CARD_ERROR',
            { decline_code: error.decline_code }
          );

        case 'StripeRateLimitError':
          throw ApiErrors.rateLimited('Payment service busy', 30);

        case 'StripeAuthenticationError':
          // Log this - it's our configuration error
          logger.error('Stripe authentication failed', { error });
          throw ApiErrors.internalError('Payment service configuration error');

        default:
          throw ApiErrors.serviceUnavailable('Payment Service');
      }
    }
    throw error;
  }
}
```

### External API Errors

```typescript
import axios from 'axios';

async function callExternalService(data: any) {
  try {
    const response = await axios.post('https://api.external.com/endpoint', data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // External service returned an error
        const status = error.response.status;

        if (status === 429) {
          throw ApiErrors.rateLimited('External service rate limit');
        }

        if (status >= 500) {
          throw ApiErrors.serviceUnavailable('External Service');
        }

        // Map external error to our format
        throw ApiErrors.badRequest(
          error.response.data?.message || 'External service error',
          'EXTERNAL_SERVICE_ERROR'
        );
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw ApiErrors.serviceUnavailable('External Service');
      }
    }

    throw error;
  }
}
```

### Database Errors

```typescript
import { QueryFailedError } from 'typeorm';

async function createUser(userData: CreateUserDto) {
  try {
    return await userRepository.save(userData);
  } catch (error) {
    if (error instanceof QueryFailedError) {
      // Handle unique constraint violation
      if (error.message.includes('duplicate key')) {
        throw ApiErrors.badRequest(
          'Email already exists',
          'EMAIL_ALREADY_EXISTS'
        );
      }

      // Handle foreign key violation
      if (error.message.includes('foreign key')) {
        throw ApiErrors.badRequest(
          'Referenced resource not found',
          'FOREIGN_KEY_VIOLATION'
        );
      }
    }

    // Re-throw as internal error
    logger.error('Database error', { error });
    throw ApiErrors.internalError('Database operation failed');
  }
}
```

---

## Correlation ID Usage

### Extracting Correlation ID

The exception filter automatically extracts or generates correlation IDs:

```typescript
const correlationId = (request.headers['x-correlation-id'] as string) ||
                      (request.headers['x-request-id'] as string) ||
                      uuidv4();
```

### Logging with Correlation ID

Always include correlation ID in logs:

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  async findById(id: string, correlationId?: string) {
    this.logger.log(`Finding user ${id}`, { correlationId });

    try {
      const user = await this.userRepository.findOne(id);

      if (!user) {
        this.logger.warn(`User not found: ${id}`, { correlationId });
        return null;
      }

      return user;
    } catch (error) {
      this.logger.error(`Error finding user ${id}`, {
        correlationId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
```

### Passing Correlation ID Between Services

```typescript
async function callInternalService(endpoint: string, data: any, correlationId: string) {
  const response = await axios.post(endpoint, data, {
    headers: {
      'X-Correlation-ID': correlationId,
    },
  });
  return response.data;
}
```

---

## Adding Error Middleware to a New Service

### Step-by-Step Guide

1. **Install dependencies:**

```bash
npm install uuid
```

2. **Copy the filter/middleware** (or import from shared package)

3. **Register in main.ts/app.ts:**

```typescript
// NestJS
app.useGlobalFilters(new HttpExceptionFilter());

// Express
app.use(errorHandlerMiddleware);
```

4. **Configure logging:**

```typescript
// Ensure your logger is configured
import logger from './utils/logger';

// The error handler uses this for logging
```

5. **Test error handling:**

```typescript
// Add a test route
@Get('test-error')
testError() {
  throw ApiErrors.badRequest('Test error');
}
```

---

## Best Practices

### Do:
- Use typed error classes
- Include meaningful error messages
- Log errors with correlation IDs
- Map third-party errors to standard format
- Handle async errors properly

### Don't:
- Expose internal error details
- Log sensitive data
- Use generic 500 for all errors
- Forget to handle promise rejections
- Re-throw errors without wrapping

---

## Related Documentation

- [Main Error Handling Guide](../errors.md)
- [Error Codes Reference](./error-codes.md)
- [Frontend Error Handling](./frontend-handling.md)
- [API Error Contract](./api-contract.md)
