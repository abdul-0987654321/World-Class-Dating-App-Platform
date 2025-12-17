# Logging Configuration Guide

## Overview

This guide provides comprehensive instructions for implementing consistent logging across all Flamoral services.

## Table of Contents

1. [TypeScript/Node.js Services](#typescript-services)
2. [Python AI Services](#python-services)
3. [Correlation IDs](#correlation-ids)
4. [Application Insights](#application-insights)
5. [Best Practices](#best-practices)
6. [Migration Guide](#migration-guide)

---

## TypeScript Services

### Using the Shared Logger

All TypeScript services should use the centralized logger from `backend/shared/utils/logger.ts`.

#### Basic Setup

```typescript
// src/utils/logger.ts
import createLogger from '../../../shared/utils/logger';

export const logger = createLogger('your-service-name');
export { createChildLogger, addCorrelationId } from '../../../shared/utils/logger';
export default logger;
```

#### Usage Examples

```typescript
import logger, { createChildLogger } from './utils/logger';

// Basic logging
logger.info('User logged in', { userId: '123' });
logger.error('Database connection failed', { error: err.message });
logger.warn('Cache miss', { key: 'user:123' });
logger.debug('Processing request', { path: req.path });

// Child logger with context
const dbLogger = createChildLogger(logger, { component: 'database' });
dbLogger.info('Query executed', { duration: '45ms' });

// With correlation ID
import { addCorrelationId } from './utils/logger';
const requestLogger = addCorrelationId(logger, req.correlationId);
requestLogger.info('Processing request');
```

### Features

- **Environment-Aware**: Automatically adjusts log level and format based on `NODE_ENV`
- **PII Sanitization**: Automatically redacts sensitive data (emails, tokens, passwords, etc.)
- **JSON in Production**: Structured JSON logs for production, colored console for development
- **Correlation IDs**: Support for request tracing across services
- **File Logging**: Optional file logging in development (disabled in production)

### Configuration

Environment variables:

```bash
NODE_ENV=production          # Controls format and log level
LOG_LEVEL=debug             # Override default log level (debug, info, warn, error)
APP_VERSION=1.0.0           # Included in all logs
```

---

## Python Services

### Using the Shared Logger

All Python AI services should use the centralized logging configuration.

#### Basic Setup

```python
# app/logging_setup.py
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../shared'))

from logging_config import configure_logging, get_logger

# Configure logging
configure_logging('your-service-name')

# Get logger
logger = get_logger('your-service-name', service='your-service-name')
```

#### Usage Examples

```python
from app.logging_setup import logger, add_correlation_id

# Basic logging
logger.info('User profile analyzed', extra={'user_id': '123', 'score': 0.85})
logger.error('ML model failed', extra={'model': 'recommendation', 'error': str(e)})
logger.warning('API rate limit approaching', extra={'remaining': 10})
logger.debug('Processing request', extra={'path': request.path})

# With correlation ID
correlation_id = request.headers.get('x-correlation-id')
if correlation_id:
    request_logger = add_correlation_id(logger, correlation_id)
    request_logger.info('Processing request')
```

### Features

- **Environment-Aware**: JSON for production, colored console for development
- **PII Sanitization**: Automatic redaction of sensitive data
- **Structured Logging**: Consistent JSON format
- **FastAPI Integration**: Works seamlessly with FastAPI/Uvicorn

### Configuration

Environment variables:

```bash
NODE_ENV=production          # Controls format
LOG_LEVEL=INFO              # Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
APP_VERSION=1.0.0           # Included in all logs
```

---

## Correlation IDs

Correlation IDs enable distributed tracing across microservices.

### Express.js Middleware

```typescript
// src/app.ts
import express from 'express';
import { correlationId } from '../../../shared/middleware/correlation-id';

const app = express();

// Add correlation ID middleware FIRST
app.use(correlationId);

// Other middleware...
```

### Using in Request Handlers

```typescript
import { addCorrelationId } from './utils/logger';

app.get('/users/:id', (req, res) => {
  const requestLogger = addCorrelationId(logger, (req as any).correlationId);
  requestLogger.info('Fetching user', { userId: req.params.id });

  // Your logic here...
});
```

### FastAPI Middleware

```python
from fastapi import FastAPI, Request
from uuid import uuid4
import logging

app = FastAPI()

@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    correlation_id = request.headers.get('x-correlation-id', str(uuid4()))

    # Add to request state
    request.state.correlation_id = correlation_id

    # Process request
    response = await call_next(request)

    # Add to response headers
    response.headers['x-correlation-id'] = correlation_id

    return response
```

---

## Application Insights

### Initialization

```typescript
// src/app.ts or src/index.ts
import { initializeAppInsights, addAppInsightsToLogger } from '../../../shared/utils/app-insights-integration';
import logger from './utils/logger';

// Initialize Application Insights
initializeAppInsights('your-service-name', process.env.APPLICATIONINSIGHTS_CONNECTION_STRING);

// Add to logger
addAppInsightsToLogger(logger);
```

### Environment Variables

```bash
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxx;IngestionEndpoint=https://...
```

### Graceful Shutdown

```typescript
import { flushAppInsights } from '../../../shared/utils/app-insights-integration';

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await flushAppInsights();
  process.exit(0);
});
```

---

## Best Practices

### 1. Log Levels

- **DEBUG**: Detailed diagnostic information (development only)
- **INFO**: General informational messages (user actions, state changes)
- **WARN**: Warning messages (degraded performance, deprecated APIs)
- **ERROR**: Error messages (exceptions, failures)

### 2. Structured Logging

Always use structured metadata:

```typescript
// Good
logger.info('User authenticated', { userId: '123', method: 'oauth' });

// Bad
logger.info(`User 123 authenticated via oauth`);
```

### 3. Sensitive Data

The logger automatically sanitizes:
- Passwords, tokens, API keys
- Email addresses (shows domain only)
- Phone numbers
- Credit card numbers
- Session IDs

**Still be cautious**: Don't log sensitive data unnecessarily.

### 4. Error Logging

Always include error context:

```typescript
try {
  // operation
} catch (error) {
  logger.error('Operation failed', {
    operation: 'processPayment',
    userId: user.id,
    error: error.message,
    stack: error.stack,
  });
}
```

### 5. Performance Logging

Log performance metrics for monitoring:

```typescript
const start = Date.now();
const result = await service.processData();
const duration = Date.now() - start;

logger.info('Data processed', {
  operation: 'processData',
  duration: `${duration}ms`,
  recordCount: result.count,
});
```

---

## Migration Guide

### Replacing Existing Loggers

#### Step 1: Update Import

**Old:**
```typescript
import { createLogger } from '@flamoral/shared';
import winston from 'winston';

export const logger: winston.Logger = createLogger('service-name');
```

**New:**
```typescript
import createLogger from '../../../shared/utils/logger';

export const logger = createLogger('service-name');
export { createChildLogger, addCorrelationId } from '../../../shared/utils/logger';
```

#### Step 2: Update Service Code

Search and replace in your service:

```bash
# Find all logger imports
grep -r "import.*logger" src/

# Update to use fixed logger
# Change:
import logger from './utils/logger';

# To:
import logger from './utils/logger-fixed';
```

#### Step 3: Test

```bash
# Development
NODE_ENV=development npm start

# Check logs are colored and include metadata

# Production
NODE_ENV=production npm start

# Check logs are JSON format
```

#### Step 4: Rename Files

```bash
# Once tested, replace old logger
mv src/utils/logger.ts src/utils/logger.old.ts
mv src/utils/logger-fixed.ts src/utils/logger.ts
```

### Python Services

#### Step 1: Add Shared Config

```bash
# Create shared logging config
cp backend/services/ai-services/shared/logging_config.py your-service/
```

#### Step 2: Update main.py

**Old:**
```python
import structlog

structlog.configure(...)
logger = structlog.get_logger()
```

**New:**
```python
from app.logging_setup import logger, get_logger
```

#### Step 3: Update Imports

```python
# Replace all instances of:
from app.main import logger

# With:
from app.logging_setup import logger
```

---

## File Reference

### Created Files

1. **Backend Shared:**
   - `backend/shared/utils/logger-fixed.ts` - Main logger factory
   - `backend/shared/middleware/correlation-id.ts` - Correlation ID middleware
   - `backend/shared/middleware/request-logger.ts` - Request logging middleware
   - `backend/shared/utils/app-insights-integration.ts` - Application Insights helper

2. **Service Loggers (replace existing):**
   - `backend/services/auth-service/src/utils/logger-fixed.ts`
   - `backend/services/user-service/src/utils/logger-fixed.ts`
   - `backend/services/api-gateway/src/utils/logger-fixed.ts`
   - `backend/services/matching-service/src/utils/logger-fixed.ts`
   - `backend/services/notification-service/src/utils/logger-fixed.ts`
   - `backend/services/payment-service/src/utils/logger-fixed.ts`
   - `backend/services/messaging-service/src/utils/logger-fixed.ts`
   - `backend/services/admin-service/src/utils/logger-fixed.ts`
   - `backend/services/moderation-service/src/utils/logger-fixed.ts`

3. **Python Services:**
   - `backend/services/ai-services/shared/logging_config.py` - Python logging config
   - `backend/services/ai-services/nlp-service/app/logging_setup.py`
   - `backend/services/ai-services/recommendation-service/app/logging_setup.py`
   - `backend/services/ai-services/dating-coach-service/app/logging_setup.py`

4. **Templates:**
   - `backend/services/LOGGER_TEMPLATE.ts` - Template for new services

---

## Support

For questions or issues with logging configuration:
1. Check this guide
2. Review the logger source code
3. Test in development environment first
4. Verify environment variables are set correctly

---

## Checklist

- [ ] Replace logger.ts with logger-fixed.ts in all services
- [ ] Add correlation ID middleware to Express apps
- [ ] Add correlation ID middleware to FastAPI apps
- [ ] Configure Application Insights connection strings
- [ ] Update Python services to use shared logging config
- [ ] Test in development environment
- [ ] Test in production environment
- [ ] Verify logs appear in Application Insights
- [ ] Verify PII is sanitized
- [ ] Verify correlation IDs are working across services
