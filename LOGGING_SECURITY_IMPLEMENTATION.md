# Logging & Security Implementation Guide

## Overview

This document describes the comprehensive logging and security improvements implemented across the Flamoral Dating Platform to ensure production safety and compliance.

## Table of Contents

1. [Logging Infrastructure](#logging-infrastructure)
2. [Security Features](#security-features)
3. [Build Configuration](#build-configuration)
4. [Migration Guide](#migration-guide)
5. [Best Practices](#best-practices)

---

## Logging Infrastructure

### Environment-Aware Logging

All three platforms (Mobile, Web, Backend) now have environment-aware logging that:

- **Production**: Only logs ERROR level and above, no console output
- **Staging**: Logs WARN level and above
- **Development**: Logs everything (DEBUG, INFO, WARN, ERROR)

### Key Features

#### 1. Automatic PII Sanitization

All logger implementations automatically sanitize sensitive data:

```typescript
// Sensitive fields that are automatically redacted:
- password, token, accessToken, refreshToken
- email, phone, phoneNumber, address
- credit_card, cvv, ssn, bankAccount
- latitude, longitude, location
- birthdate, dob, privateKey
```

**Example:**

```typescript
// Before
console.log('User login:', { email: 'user@example.com', password: '123456' });

// After (automatically sanitized)
logger.info('User login', { email: '[REDACTED]@example.com', password: '[REDACTED]' });
```

#### 2. Platform-Specific Loggers

##### Mobile App (`apps/mobile-app/src/utils/logger.ts`)

```typescript
import logger from '@utils/logger';

// Basic logging
logger.debug('Debug message', { context: 'optional' });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error occurred', error, { context: 'additional' });
logger.fatal('Critical error', error);

// Specialized logging
logger.performance('API Call', 150); // duration in ms
logger.network('GET', '/api/users', 200, 150);
logger.userAction('Button Clicked', { buttonId: 'login' });
```

##### Web App (`apps/web-app/src/utils/logger.ts`)

```typescript
import logger, { startTimer } from '@utils/logger';

// Basic logging (same as mobile)
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error occurred', error);

// Performance timing
const endTimer = startTimer('API Call');
// ... do work ...
endTimer(); // Automatically logs duration
```

##### Backend Services (`backend/shared/utils/logger.ts`)

```typescript
import createLogger from '@backend/shared/utils/logger';

const logger = createLogger('service-name');

// Winston-based logging
logger.debug('Debug message', { metadata: 'optional' });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error occurred', { error: error.message });
```

### Log Levels

| Level | When to Use | Production | Staging | Development |
|-------|-------------|-----------|---------|-------------|
| DEBUG | Detailed debugging info | ❌ | ❌ | ✅ |
| INFO | General information | ❌ | ❌ | ✅ |
| WARN | Warning conditions | ❌ | ✅ | ✅ |
| ERROR | Error conditions | ✅ | ✅ | ✅ |
| FATAL | Critical errors | ✅ | ✅ | ✅ |

---

## Security Features

### 1. Root/Jailbreak Detection (Mobile)

**Location:** `apps/mobile-app/src/utils/security.ts`

```typescript
import { performSecurityCheck, enforceSecurityPolicy } from '@utils/security';

// In App.tsx or main entry point
useEffect(() => {
  const isSecure = enforceSecurityPolicy();
  if (!isSecure) {
    // App will show warning and can exit
  }
}, []);

// Get detailed security check
const checks = performSecurityCheck();
console.log({
  isRooted: checks.isRooted,
  isJailbroken: checks.isJailbroken,
  hasXposed: checks.hasXposed,
  hasFrida: checks.hasFrida,
});
```

**Features:**
- Detects jailbroken iOS devices
- Detects rooted Android devices
- Detects hooking frameworks (Xposed, Frida)
- Detects mock location apps
- Shows user-friendly warning

### 2. Screenshot Protection (Mobile)

**Location:** `apps/mobile-app/src/utils/security.ts`

#### Using Hook

```typescript
import { useScreenshotProtection } from '@utils/security';

function PaymentScreen() {
  useScreenshotProtection(true); // Enable protection for this screen

  return <View>...</View>;
}
```

#### Using HOC

```typescript
import { withScreenshotProtection } from '@utils/security';

const PaymentScreen = () => {
  return <View>...</View>;
};

export default withScreenshotProtection(PaymentScreen);
```

#### Manual Control

```typescript
import { screenshotProtection } from '@utils/security';

// Enable
screenshotProtection.enableProtection();

// Disable
screenshotProtection.disableProtection();
```

**Protected Screens:**
- Payment pages
- Bank details
- Personal information
- Settings
- Verification screens
- Private messages

---

## Build Configuration

### Mobile App (React Native)

#### Metro Bundler (`apps/mobile-app/metro.config.js`)

```javascript
// Automatically removes console.log in production
minifierConfig: {
  compress: {
    drop_console: process.env.NODE_ENV === 'production',
    drop_debugger: true,
  },
}
```

#### Babel Configuration (`apps/mobile-app/babel.config.js`)

```javascript
// Removes console.log/debug/info in production, keeps error/warn
if (isProduction) {
  plugins.unshift([
    'transform-remove-console',
    {
      exclude: ['error', 'warn'],
    },
  ]);
}
```

### Web App (Vite)

#### Vite Configuration (`apps/web-app/vite.config.ts`)

```typescript
build: {
  // Disable source maps in production
  sourcemap: !isProduction,

  // Remove console statements in production
  terserOptions: {
    compress: {
      drop_console: true,
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.info', 'console.debug'],
    },
  },
}
```

### Backend Services

#### Winston Logger Configuration

```typescript
// Only write log files in non-production
if (!isProduction) {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    })
  );
}

// Only include stack traces in non-production
winston.format.errors({ stack: process.env.NODE_ENV !== 'production' })
```

---

## Migration Guide

### Step 1: Install Dependencies

#### Mobile App

```bash
cd apps/mobile-app
npm install jail-monkey react-native-screen-capture
npm install --save-dev babel-plugin-transform-remove-console
```

#### Web App

```bash
cd apps/web-app
npm install @sentry/react
```

#### Backend

```bash
cd backend/shared
npm install winston
```

### Step 2: Replace Console Statements

#### Option A: Automated Script

```bash
# Run the automated replacement script
node scripts/replace-console-logs.js apps/mobile-app/src
node scripts/replace-console-logs.js apps/web-app/src
node scripts/replace-console-logs.js backend/services
```

#### Option B: Manual Replacement

**Before:**

```typescript
console.log('User logged in:', userId);
console.error('Login failed:', error);
console.debug('API response:', data);
```

**After:**

```typescript
import logger from '@utils/logger';

logger.info('User logged in', { userId });
logger.error('Login failed', error, { userId });
logger.debug('API response', { data });
```

### Step 3: Update Import Paths

Ensure the logger import path is correct based on file location:

```typescript
// For files in src/screens/
import logger from '../utils/logger';

// For files in src/components/
import logger from '../../utils/logger';

// Using TypeScript path mapping (recommended)
import logger from '@utils/logger';
```

### Step 4: Add Screenshot Protection

Add to sensitive screens:

```typescript
import { useScreenshotProtection } from '@utils/security';

function SensitiveScreen() {
  useScreenshotProtection(true);

  return (
    <View>
      {/* Your sensitive content */}
    </View>
  );
}
```

### Step 5: Add Security Check

Add to App initialization:

```typescript
// App.tsx
import { enforceSecurityPolicy } from '@utils/security';

function App() {
  useEffect(() => {
    const isSecure = enforceSecurityPolicy();
    if (!isSecure) {
      logger.warn('Device security check failed');
    }
  }, []);

  return <YourApp />;
}
```

---

## Best Practices

### 1. Never Log Sensitive Data

```typescript
// ❌ BAD
logger.info('User data', { password: user.password, email: user.email });

// ✅ GOOD
logger.info('User data', { userId: user.id, username: user.username });
// Email and password are automatically sanitized if accidentally logged
```

### 2. Use Appropriate Log Levels

```typescript
// ❌ BAD - Using wrong level
logger.info('Critical payment error', error); // Should be error

// ✅ GOOD - Using correct level
logger.error('Payment processing failed', error, { orderId });
```

### 3. Provide Context

```typescript
// ❌ BAD - No context
logger.error('API call failed', error);

// ✅ GOOD - With context
logger.error('Failed to fetch user profile', error, {
  userId,
  endpoint: '/api/users/profile',
  statusCode: response.status,
});
```

### 4. Use Performance Logging

```typescript
// ✅ GOOD - Measure performance
const endTimer = startTimer('Database Query');
const results = await db.query('SELECT * FROM users');
endTimer(); // Automatically logs duration
```

### 5. Don't Log in Tight Loops

```typescript
// ❌ BAD
users.forEach(user => {
  logger.debug('Processing user', { userId: user.id }); // Too many logs
});

// ✅ GOOD
logger.debug('Processing users batch', { count: users.length });
users.forEach(user => {
  // Process without logging each item
});
logger.info('Users batch processed', { count: users.length });
```

### 6. Error Handling

```typescript
// ❌ BAD
try {
  await apiCall();
} catch (error) {
  console.log(error); // Lost in production
}

// ✅ GOOD
try {
  await apiCall();
} catch (error) {
  logger.error('API call failed', error, {
    endpoint: '/api/endpoint',
    userId,
  });
  throw error; // Re-throw if needed
}
```

### 7. Network Request Logging

```typescript
// ✅ GOOD
const startTime = Date.now();
try {
  const response = await fetch(url);
  const duration = Date.now() - startTime;

  logger.network('GET', url, response.status, duration, {
    userId,
  });

  return response.json();
} catch (error) {
  const duration = Date.now() - startTime;
  logger.network('GET', url, 0, duration, { error: error.message });
  throw error;
}
```

---

## Environment Variables

### Mobile App

```bash
# .env
ENV=production  # or development, staging

# React Native Config
SENTRY_DSN=your_sentry_dsn
```

### Web App

```bash
# .env.production
VITE_APP_ENV=production
VITE_SENTRY_DSN=your_sentry_dsn
```

### Backend

```bash
# .env
NODE_ENV=production
LOG_LEVEL=warn
LOG_METADATA=false  # Set to true to include metadata in prod logs
```

---

## Security Checklist

- [ ] All console.log statements replaced with logger
- [ ] Logger imported in all modified files
- [ ] Screenshot protection enabled on sensitive screens
- [ ] Root/jailbreak detection enabled in mobile app
- [ ] Source maps disabled for production builds
- [ ] Console removal configured in build tools
- [ ] Sensitive data sanitization tested
- [ ] Error tracking (Sentry) configured
- [ ] Environment variables properly set
- [ ] Production builds tested without debug logs
- [ ] Performance logging added to critical paths
- [ ] Security checks pass on production builds

---

## Testing

### Test Logger in Development

```typescript
// This should show in development
logger.debug('Development only message');

// This should show in all environments
logger.error('Error message');
```

### Test Production Build

```bash
# Mobile
cd apps/mobile-app
NODE_ENV=production npm run build

# Web
cd apps/web-app
npm run build

# Verify no console.log in output
# Verify no source maps in dist/
# Verify logger works correctly
```

### Test Security Features

```typescript
// Test root detection
const checks = performSecurityCheck();
expect(checks.isRooted).toBe(false);

// Test screenshot protection
screenshotProtection.enableProtection();
expect(screenshotProtection.isEnabled()).toBe(true);
```

---

## Monitoring & Alerts

### Sentry Integration

The logger automatically sends WARN and ERROR level logs to Sentry:

```typescript
logger.error('Payment failed', error, {
  userId,
  amount,
  // This context is automatically sent to Sentry
});
```

### Custom Alerts

Set up alerts in Sentry for:
- High error rates
- Security policy violations
- Performance degradation
- Screenshot detection on sensitive screens

---

## Support

For questions or issues with the logging system:

1. Check this documentation
2. Review code examples in `/apps/*/src/utils/logger.ts`
3. Check existing usage patterns in the codebase
4. Contact the security team

---

## Additional Resources

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Sentry React Native](https://docs.sentry.io/platforms/react-native/)
- [Sentry React](https://docs.sentry.io/platforms/javascript/guides/react/)
- [React Native Security Best Practices](https://reactnative.dev/docs/security)

---

**Last Updated:** December 2025
**Version:** 1.0.0
