# Logging Configuration Fixes - Summary

## Overview

Comprehensive logging configuration has been implemented across all Flamoral services to provide:
- Consistent structured logging
- PII/sensitive data sanitization
- Correlation ID support for distributed tracing
- Application Insights integration
- Environment-aware formatting
- Production-safe logging

---

## Files Created

### 1. Core Logging Infrastructure

#### TypeScript/Node.js

| File | Purpose | Status |
|------|---------|--------|
| `backend/shared/utils/logger-fixed.ts` | Main logger factory with Winston | Created |
| `backend/shared/middleware/correlation-id.ts` | Correlation ID middleware | Created |
| `backend/shared/middleware/request-logger.ts` | HTTP request/response logging | Created |
| `backend/shared/middleware/error-logger.ts` | Error logging and handling | Created |
| `backend/shared/utils/app-insights-integration.ts` | Application Insights integration | Created |

#### Python

| File | Purpose | Status |
|------|---------|--------|
| `backend/services/ai-services/shared/logging_config.py` | Python logging configuration | Created |

### 2. Service-Specific Loggers

All service loggers created with `-fixed.ts` suffix to preserve originals:

| Service | File | Status |
|---------|------|--------|
| Auth Service | `auth-service/src/utils/logger-fixed.ts` | Created |
| User Service | `user-service/src/utils/logger-fixed.ts` | Created |
| API Gateway | `api-gateway/src/utils/logger-fixed.ts` | Created |
| Matching Service | `matching-service/src/utils/logger-fixed.ts` | Created |
| Notification Service | `notification-service/src/utils/logger-fixed.ts` | Created |
| Payment Service | `payment-service/src/utils/logger-fixed.ts` | Created |
| Messaging Service | `messaging-service/src/utils/logger-fixed.ts` | Created |
| Admin Service | `admin-service/src/utils/logger-fixed.ts` | Created |
| Moderation Service | `moderation-service/src/utils/logger-fixed.ts` | Created |

### 3. Python AI Services

| Service | File | Status |
|---------|------|--------|
| NLP Service | `nlp-service/app/logging_setup.py` | Created |
| Recommendation Service | `recommendation-service/app/logging_setup.py` | Created |
| Dating Coach Service | `dating-coach-service/app/logging_setup.py` | Created |

### 4. Shared Packages

| File | Purpose | Status |
|------|---------|--------|
| `packages/shared/utils/src/logger-fixed.ts` | Browser/Node.js compatible logger | Created |

### 5. Documentation & Examples

| File | Purpose | Status |
|------|---------|--------|
| `LOGGING_CONFIGURATION_GUIDE.md` | Complete configuration guide | Created |
| `LOGGER_TEMPLATE.ts` | Template for new services | Created |
| `EXPRESS_MIDDLEWARE_EXAMPLE.ts` | Express.js integration example | Created |
| `FASTAPI_MIDDLEWARE_EXAMPLE.py` | FastAPI integration example | Created |

---

## Key Features Implemented

### 1. Environment-Aware Logging

**Development:**
- Colored console output
- Full stack traces
- Debug-level logging
- Metadata included in logs

**Production:**
- Structured JSON logs
- Info-level logging (configurable)
- Stack traces on errors only
- Optimized for log aggregation

### 2. PII Sanitization

Automatically redacts sensitive data:
- ✅ Passwords, tokens, API keys
- ✅ Email addresses (shows domain only)
- ✅ Phone numbers
- ✅ Credit card numbers
- ✅ SSN, bank accounts
- ✅ Session IDs
- ✅ Private keys
- ✅ Authorization headers

### 3. Correlation ID Support

**Features:**
- Automatic correlation ID generation
- Header propagation (`x-correlation-id`)
- AsyncLocalStorage for Node.js
- Request state for Python
- Distributed tracing support

**Usage:**
```typescript
// Automatically added by middleware
const requestLogger = addCorrelationId(logger, req.correlationId);
requestLogger.info('Processing request'); // Includes correlation ID
```

### 4. Structured Logging

**TypeScript:**
```typescript
logger.info('User authenticated', {
  userId: '123',
  method: 'oauth',
  provider: 'google'
});
```

**Python:**
```python
logger.info('User authenticated', extra={
    'user_id': '123',
    'method': 'oauth',
    'provider': 'google'
})
```

**Output (Production):**
```json
{
  "timestamp": "2025-12-16 10:30:45",
  "level": "info",
  "message": "User authenticated",
  "service": "auth-service",
  "environment": "production",
  "version": "1.0.0",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "123",
  "method": "oauth",
  "provider": "google"
}
```

### 5. Application Insights Integration

**Setup:**
```typescript
import { initializeAppInsights, addAppInsightsToLogger } from '../../../shared/utils/app-insights-integration';
import logger from './utils/logger';

// Initialize
initializeAppInsights('service-name', process.env.APPLICATIONINSIGHTS_CONNECTION_STRING);

// Add to logger
addAppInsightsToLogger(logger);
```

**Features:**
- Automatic telemetry collection
- Distributed tracing with W3C correlation
- Performance metrics
- Exception tracking
- Custom events and metrics
- 10% sampling in production

### 6. Request/Response Logging

**Features:**
- Automatic HTTP request logging
- Response time tracking
- Status code logging
- Configurable path exclusion
- Optional body/header logging
- Sensitive header sanitization

---

## Migration Instructions

### TypeScript Services

**Step 1:** Backup current logger
```bash
cd backend/services/your-service/src/utils
cp logger.ts logger.ts.backup
```

**Step 2:** Replace with fixed logger
```bash
cp logger-fixed.ts logger.ts
```

**Step 3:** Update middleware (in `src/app.ts` or `src/index.ts`)
```typescript
import { correlationId } from '../../../shared/middleware/correlation-id';
import { createRequestLogger } from '../../../shared/middleware/request-logger';
import { createErrorLogger, createErrorResponseHandler } from '../../../shared/middleware/error-logger';
import logger from './utils/logger';

const app = express();

// Add middleware (order matters!)
app.use(correlationId);                           // 1. Correlation ID
app.use(createRequestLogger({ logger }));         // 2. Request logger
app.use(express.json());                          // 3. Body parser
// ... your routes ...
app.use(createErrorLogger({ logger }));           // 4. Error logger
app.use(createErrorResponseHandler({ logger }));  // 5. Error handler
```

**Step 4:** Test
```bash
NODE_ENV=development npm start
# Check colored console logs

NODE_ENV=production npm start
# Check JSON logs
```

### Python Services

**Step 1:** Update imports in `app/main.py`
```python
# Replace:
import structlog
logger = structlog.get_logger()

# With:
from app.logging_setup import logger
```

**Step 2:** Add middleware (if not already present)
```python
from uuid import uuid4

@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    correlation_id = request.headers.get('x-correlation-id', str(uuid4()))
    request.state.correlation_id = correlation_id
    request.state.logger = add_correlation_id(logger, correlation_id)

    response = await call_next(request)
    response.headers['x-correlation-id'] = correlation_id
    return response
```

**Step 3:** Update all imports
```bash
# Find all logger imports
grep -r "from app.main import logger" .

# Replace with:
from app.logging_setup import logger
```

**Step 4:** Test
```bash
NODE_ENV=development python -m uvicorn app.main:app
# Check colored console logs

NODE_ENV=production python -m uvicorn app.main:app
# Check JSON logs
```

---

## Configuration

### Environment Variables

All services support these environment variables:

```bash
# Required
NODE_ENV=production                    # Environment (development, production)

# Optional
LOG_LEVEL=debug                        # Override log level
APP_VERSION=1.0.0                      # Application version
APPLICATIONINSIGHTS_CONNECTION_STRING=xxx  # Azure Application Insights
```

### Log Levels

| Level | When to Use |
|-------|-------------|
| `debug` | Development debugging, detailed diagnostics |
| `info` | General information, user actions, state changes |
| `warn` | Warnings, degraded performance, deprecated APIs |
| `error` | Errors, exceptions, failures |

---

## Testing Checklist

### Development Environment

- [ ] Logs are colored in console
- [ ] Timestamps are included
- [ ] Service name is shown
- [ ] Metadata is displayed
- [ ] Stack traces shown for errors
- [ ] Correlation IDs are generated
- [ ] File logging works (if enabled)

### Production Environment

- [ ] Logs are JSON format
- [ ] No sensitive data in logs (emails redacted, tokens hidden)
- [ ] Correlation IDs propagate across services
- [ ] Application Insights receiving telemetry
- [ ] Performance metrics are captured
- [ ] Errors are tracked properly
- [ ] Log level is appropriate (info or warn)

### Cross-Service Testing

- [ ] Correlation IDs pass between services
- [ ] Distributed tracing works
- [ ] All services use consistent format
- [ ] Logs can be aggregated and searched

---

## Best Practices

### DO ✅

- Use structured logging with metadata
- Include correlation IDs in inter-service calls
- Log at appropriate levels
- Include context (userId, orderId, etc.)
- Use child loggers for components
- Log performance metrics
- Handle errors gracefully

### DON'T ❌

- Log sensitive data directly (passwords, full credit cards)
- Use string concatenation for logs
- Log in tight loops without throttling
- Include full user objects (use IDs)
- Log at debug level in production
- Skip correlation IDs
- Ignore errors silently

---

## Examples

### Basic Logging
```typescript
logger.info('User created', { userId: user.id });
logger.warn('Cache miss', { key: 'user:123' });
logger.error('Database error', { error: err.message });
```

### With Child Logger
```typescript
const dbLogger = createChildLogger(logger, { component: 'database' });
dbLogger.info('Query executed', { duration: '45ms', rows: 10 });
```

### With Correlation ID
```typescript
const requestLogger = addCorrelationId(logger, req.correlationId);
requestLogger.info('Processing payment', { orderId: '123' });
```

### Error Handling
```typescript
try {
  await processPayment(orderId);
} catch (error) {
  logger.error('Payment processing failed', {
    orderId,
    error: error.message,
    stack: error.stack,
  });
  throw error;
}
```

---

## Troubleshooting

### Logs Not Appearing

1. Check `NODE_ENV` and `LOG_LEVEL` environment variables
2. Verify logger is properly imported
3. Check console for initialization errors
4. Ensure middleware is added in correct order

### Sensitive Data Still Visible

1. Check field names match SENSITIVE_FIELDS list
2. Verify sanitization is enabled
3. Test with sample data
4. Update SENSITIVE_FIELDS if needed

### Correlation IDs Not Working

1. Ensure correlation middleware is FIRST
2. Check header name (`x-correlation-id`)
3. Verify AsyncLocalStorage is supported (Node.js 12.17+)
4. Test with curl: `curl -H "x-correlation-id: test-123" http://localhost:3000`

### Application Insights Not Receiving Data

1. Verify connection string is correct
2. Check initialization in startup code
3. Ensure flush is called on shutdown
4. Check Azure portal for ingestion errors
5. Verify firewall/network access

---

## Support & Maintenance

### Adding New Services

1. Copy `LOGGER_TEMPLATE.ts` to `src/utils/logger.ts`
2. Replace `SERVICE_NAME` with your service name
3. Add correlation ID middleware
4. Add request logging middleware
5. Add error logging middleware
6. Test thoroughly

### Updating Existing Services

1. Backup current logger implementation
2. Copy appropriate `-fixed.ts` file
3. Update imports in service code
4. Add middleware if missing
5. Test in development
6. Deploy to production

### Monitoring

- Monitor Application Insights dashboards
- Set up alerts for error rates
- Track correlation IDs for debugging
- Review log volumes for cost optimization
- Audit sanitization effectiveness

---

## Summary

✅ **Completed:**
- Centralized logger configuration for TypeScript and Python
- PII sanitization across all services
- Correlation ID support for distributed tracing
- Application Insights integration
- Request/response logging middleware
- Error logging and handling
- Environment-aware formatting
- Comprehensive documentation

🔧 **Action Required:**
- Replace existing loggers with fixed versions
- Add middleware to Express and FastAPI apps
- Configure Application Insights connection strings
- Test in development and production
- Update service documentation

📚 **Resources:**
- `LOGGING_CONFIGURATION_GUIDE.md` - Full configuration guide
- `EXPRESS_MIDDLEWARE_EXAMPLE.ts` - Express.js example
- `FASTAPI_MIDDLEWARE_EXAMPLE.py` - FastAPI example
- `LOGGER_TEMPLATE.ts` - Template for new services

---

For questions or issues, refer to the logging configuration guide or examples provided.
