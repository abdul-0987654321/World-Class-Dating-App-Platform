# Logging Quick Reference Card

## Import Logger

```typescript
// Mobile & Web Apps
import logger from '@utils/logger';

// Backend Services
import createLogger from '@backend/shared/utils/logger';
const logger = createLogger('service-name');
```

## Basic Usage

```typescript
// Development only - detailed debugging
logger.debug('Debug info', { context });

// General information flow
logger.info('User action completed', { userId });

// Warning conditions
logger.warn('Deprecated API used', { endpoint });

// Error conditions
logger.error('Operation failed', error, { context });

// Critical system failures
logger.fatal('System failure', error, { context });
```

## Specialized Logging

```typescript
// Performance measurement
logger.performance('Operation Name', durationMs, { context });

// Network requests
logger.network('GET', '/api/endpoint', 200, durationMs, { context });

// User actions (analytics)
logger.userAction('Button Clicked', { buttonId });

// Timing helper (Web only)
const endTimer = startTimer('Operation');
// ... do work ...
endTimer(); // Automatically logs duration
```

## Security Features (Mobile)

```typescript
// Root/Jailbreak Detection
import { enforceSecurityPolicy } from '@utils/security';

useEffect(() => {
  enforceSecurityPolicy(); // Shows warning if device compromised
}, []);

// Screenshot Protection
import { useScreenshotProtection } from '@utils/security';

function PaymentScreen() {
  useScreenshotProtection(true);
  return <View>...</View>;
}
```

## Migration Pattern

### Before
```typescript
console.log('User logged in:', userId);
console.error('API failed:', error);
console.debug('Data:', data);
```

### After
```typescript
import logger from '@utils/logger';

logger.info('User logged in', { userId });
logger.error('API call failed', error, { endpoint });
logger.debug('Data received', { data });
```

## Environment Behavior

| Level | Development | Staging | Production |
|-------|-------------|---------|------------|
| DEBUG | ✅ Shows    | ❌ Hidden | ❌ Hidden |
| INFO  | ✅ Shows    | ❌ Hidden | ❌ Hidden |
| WARN  | ✅ Shows    | ✅ Shows  | ❌ Hidden |
| ERROR | ✅ Shows    | ✅ Shows  | ✅ Shows |
| FATAL | ✅ Shows    | ✅ Shows  | ✅ Shows |

## Auto-Sanitized Fields

These fields are automatically redacted:
- password, token, apiKey, secret
- email, phone, address
- creditCard, cvv, bankAccount, ssn
- latitude, longitude, location
- sessionId, sessionToken

## Best Practices

✅ **DO**
```typescript
logger.info('User login', { userId });
logger.error('API failed', error, { endpoint, statusCode });
logger.performance('Query', duration);
```

❌ **DON'T**
```typescript
console.log('user:', user.password); // Sensitive!
logger.info('Token:', token); // Auto-sanitized but avoid
logger.debug('Card:', creditCard); // Auto-sanitized but avoid
```

## Build Commands

```bash
# Production builds (auto-removes console.log)
NODE_ENV=production npm run build

# Automated log replacement
node scripts/replace-console-logs.js apps/mobile-app/src
```

## Environment Variables

```bash
# Mobile (.env)
ENV=production

# Web (.env.production)
VITE_APP_ENV=production

# Backend (.env)
NODE_ENV=production
LOG_LEVEL=warn
```

## Verification

```bash
# Check for remaining console.logs
grep -r "console\\.log" apps/*/src --exclude-dir=node_modules

# Verify production build
NODE_ENV=production npm run build
# Should see NO console.log in output
# Should see NO .map files (source maps)
```

## Common Errors

**Logger not found**
```typescript
// Fix: Check import path
import logger from '../utils/logger'; // Relative
import logger from '@utils/logger';   // Path mapping (preferred)
```

**Types not working**
```json
// Add to tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@utils/*": ["./src/utils/*"]
    }
  }
}
```

## Documentation

- [Complete Guide](./LOGGING_SECURITY_IMPLEMENTATION.md)
- [Migration Examples](./CONSOLE_LOG_MIGRATION_EXAMPLES.md)
- [Dependencies](./SECURITY_LOGGING_DEPENDENCIES.md)

---

**Print this page for quick reference during development!**
