# Logging Quick Reference Card

## TypeScript Services

### Setup
```typescript
// src/utils/logger.ts
import createLogger from '../../../shared/utils/logger';
export const logger = createLogger('service-name');
export { createChildLogger, addCorrelationId } from '../../../shared/utils/logger';
export default logger;
```

### Basic Usage
```typescript
import logger from './utils/logger';

logger.debug('Debugging info', { data: value });
logger.info('User action', { userId: '123' });
logger.warn('Warning message', { reason: 'timeout' });
logger.error('Error occurred', { error: err.message });
```

### With Context
```typescript
import { createChildLogger } from './utils/logger';

const dbLogger = createChildLogger(logger, { component: 'database' });
dbLogger.info('Query executed', { duration: '45ms' });
```

### With Correlation ID
```typescript
import { addCorrelationId } from './utils/logger';

const reqLogger = addCorrelationId(logger, req.correlationId);
reqLogger.info('Processing request');
```

### Middleware Setup
```typescript
import { correlationId } from '../../../shared/middleware/correlation-id';
import { createRequestLogger } from '../../../shared/middleware/request-logger';
import { createErrorLogger, createErrorResponseHandler } from '../../../shared/middleware/error-logger';

app.use(correlationId);                          // 1. First
app.use(createRequestLogger({ logger }));        // 2. Second
app.use(express.json());                         // 3. Body parser
// ... routes ...
app.use(createErrorLogger({ logger }));          // 4. Before error handler
app.use(createErrorResponseHandler({ logger })); // 5. Last
```

---

## Python Services

### Setup
```python
# app/logging_setup.py
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../shared'))
from logging_config import configure_logging, get_logger

configure_logging('service-name')
logger = get_logger('service-name', service='service-name')
```

### Basic Usage
```python
from app.logging_setup import logger

logger.debug('Debugging info', extra={'data': value})
logger.info('User action', extra={'user_id': '123'})
logger.warning('Warning message', extra={'reason': 'timeout'})
logger.error('Error occurred', extra={'error': str(e)}, exc_info=True)
```

### With Correlation ID
```python
from app.logging_setup import add_correlation_id

correlation_id = request.headers.get('x-correlation-id')
req_logger = add_correlation_id(logger, correlation_id)
req_logger.info('Processing request')
```

### Middleware Setup
```python
from uuid import uuid4

@app.middleware("http")
async def correlation_middleware(request: Request, call_next):
    correlation_id = request.headers.get('x-correlation-id', str(uuid4()))
    request.state.correlation_id = correlation_id
    response = await call_next(request)
    response.headers['x-correlation-id'] = correlation_id
    return response
```

---

## Application Insights

### TypeScript
```typescript
import { initializeAppInsights, addAppInsightsToLogger } from '../../../shared/utils/app-insights-integration';

// In startup code
initializeAppInsights('service-name', process.env.APPLICATIONINSIGHTS_CONNECTION_STRING);
addAppInsightsToLogger(logger);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await flushAppInsights();
  process.exit(0);
});
```

### Environment Variable
```bash
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxx;IngestionEndpoint=https://...
```

---

## Environment Variables

```bash
NODE_ENV=production              # Environment (development/production)
LOG_LEVEL=info                  # Log level (debug/info/warn/error)
APP_VERSION=1.0.0               # Application version
APPLICATIONINSIGHTS_CONNECTION_STRING=xxx  # Azure connection string
```

---

## Log Levels

| Level | Usage |
|-------|-------|
| `debug` | Development diagnostics |
| `info` | Normal operations, user actions |
| `warn` | Warnings, degraded performance |
| `error` | Errors, exceptions |

---

## Sensitive Data Sanitization

**Automatically Redacted:**
- Passwords, tokens, API keys
- Email addresses (shows domain: `[REDACTED]@example.com`)
- Phone numbers: `[REDACTED_PHONE]`
- Credit cards, SSN, bank accounts
- Session IDs, private keys

**Safe to Log:**
- User IDs (not emails)
- Order IDs, transaction IDs
- Timestamps, durations
- Status codes, counts
- Non-sensitive metadata

---

## Best Practices

### ✅ DO
```typescript
// Structured logging
logger.info('Payment processed', { orderId: '123', amount: 99.99 });

// Include context
logger.error('API call failed', {
  endpoint: '/users',
  statusCode: 500,
  error: err.message
});

// Use child loggers
const apiLogger = createChildLogger(logger, { component: 'api-client' });
```

### ❌ DON'T
```typescript
// String concatenation
logger.info(`Payment processed for order ${orderId}`);

// Logging sensitive data
logger.debug('User credentials', { password: user.password });

// Logging in loops without throttling
users.forEach(u => logger.debug('Processing', { user: u }));
```

---

## Common Patterns

### Error Handling
```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', {
    operation: 'riskyOperation',
    error: error.message,
    stack: error.stack
  });
  throw error;
}
```

### Performance Tracking
```typescript
const start = Date.now();
const result = await processData();
logger.info('Data processed', {
  duration: `${Date.now() - start}ms`,
  recordCount: result.length
});
```

### Request Tracing
```typescript
app.get('/api/users/:id', async (req, res) => {
  const reqLogger = addCorrelationId(logger, req.correlationId);

  reqLogger.info('Fetching user', { userId: req.params.id });

  const user = await getUser(req.params.id);

  reqLogger.info('User fetched', {
    userId: req.params.id,
    found: !!user
  });

  res.json(user);
});
```

---

## Testing

### Development
```bash
NODE_ENV=development npm start
# Expected: Colored console logs, full metadata, stack traces
```

### Production
```bash
NODE_ENV=production npm start
# Expected: JSON logs, no colors, sanitized data
```

### Test Correlation IDs
```bash
curl -H "x-correlation-id: test-123" http://localhost:3000/api/endpoint
# Check logs for: [test-123]
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No logs | Check `LOG_LEVEL`, ensure logger imported |
| Wrong format | Verify `NODE_ENV` setting |
| Sensitive data visible | Update field names, check SENSITIVE_FIELDS |
| No correlation ID | Add correlation middleware FIRST |
| App Insights not working | Check connection string, firewall |

---

## Files to Update

1. **Service Logger:** `src/utils/logger.ts`
2. **Main App:** `src/app.ts` or `src/index.ts` (add middleware)
3. **Controllers:** Update logger imports
4. **Tests:** Mock logger if needed

---

## Quick Migration

```bash
# 1. Backup
cp src/utils/logger.ts src/utils/logger.backup.ts

# 2. Copy fixed version
cp src/utils/logger-fixed.ts src/utils/logger.ts

# 3. Update app.ts with middleware (see examples above)

# 4. Test
NODE_ENV=development npm start

# 5. Verify in production
NODE_ENV=production npm start
```

---

## Help

- **Full Guide:** `LOGGING_CONFIGURATION_GUIDE.md`
- **Examples:** `EXPRESS_MIDDLEWARE_EXAMPLE.ts`, `FASTAPI_MIDDLEWARE_EXAMPLE.py`
- **Summary:** `LOGGING_FIXES_SUMMARY.md`
- **Template:** `LOGGER_TEMPLATE.ts`
