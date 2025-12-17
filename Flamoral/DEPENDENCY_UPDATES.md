# Dependency Updates - Migration Guide

This document outlines the dependency updates performed on December 13, 2025, and the required code changes for each package.

## Summary of Updates

| Package | Old Version | New Version | Type | Breaking Changes |
|---------|-------------|-------------|------|------------------|
| Twilio | 4.20.0 | 5.3.6 | Major | No (backward compatible) |
| Stripe | 14.9.0 | 14.25.0 | Minor | No |
| MongoDB | 6.3.0 | 6.12.0 | Minor | No |
| Sentry | 7.93.0 | 8.40.0 | Major | Yes (significant) |

---

## 1. Twilio (4.20.0 → 5.3.6)

### Status: LOW RISK - No Breaking Changes

### Summary
Twilio v5 is fully backward compatible with v4. The migration is primarily an internal architecture change to OpenAPI-based code generation.

### Changes Required: NONE

The Twilio team ensured zero breaking changes when upgrading from v4 to v5. All existing APIs remain functional.

### What's New in v5
- Auto-generated code via OpenAPI for faster feature additions
- Added support for `application/json` content type in request bodies
- Improved consistency across language versions

### Files Using Twilio
- `backend/services/user-service/src/infrastructure/sms/twilio.service.ts`
- `backend/services/notification-service/src/services/sms-notification.service.ts`

### Verification Steps
1. No code changes required
2. Test SMS sending functionality after `npm install`
3. Verify verification code sending works correctly

### References
- [Twilio Node.js UPGRADE.md](https://github.com/twilio/twilio-node/blob/main/UPGRADE.md)
- [Twilio Node.js VERSIONS.md](https://github.com/twilio/twilio-node/blob/main/VERSIONS.md)

---

## 2. Stripe (14.9.0 → 14.25.0)

### Status: LOW RISK - Minor Version Update

### Summary
Minor version updates with new API features and bug fixes. No breaking changes between these versions.

### Changes Required: NONE (Optional: Update API Version)

### What's New (14.9.0 → 14.25.0)
- Updated pinned API version to `2024-09-30.acacia` and `2024-10-28.acacia`
- Added support for new Usage Billing APIs
- Added `parseThinEvent()` method for parsing thin events
- Added `rawRequest()` method for making unsupported API requests
- Support for V2 Event Destinations
- Various bug fixes and improvements

### Optional: Update Stripe API Version
The payment service currently uses `apiVersion: '2024-12-18.acacia'`. This is already a newer version than what's pinned in the SDK, which is fine.

**Current code (already correct):**
```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});
```

### Files Using Stripe
- `backend/services/payment-service/src/domain/services/payment.service.ts`
- `backend/services/payment-service/src/domain/services/webhook.service.ts`
- `backend/services/payment-service/src/api/controllers/webhook.controller.ts`
- Multiple test files in payment-service

### Verification Steps
1. No code changes required
2. Test payment intent creation after `npm install`
3. Verify webhook handling works correctly
4. Test subscription management functions

### References
- [Stripe Node.js Changelog](https://github.com/stripe/stripe-node/blob/master/CHANGELOG.md)
- [Stripe API Versioning](https://stripe.com/docs/api/versioning)

---

## 3. MongoDB (6.3.0 → 6.12.0)

### Status: LOW RISK - Minor Version Update

### Summary
Minor version updates with new features and bug fixes. No breaking changes within the 6.x series.

### Changes Required: NONE

### What's New (6.3.0 → 6.12.0)
- **v6.10**: First official release supporting MongoDB Server 8.0
- Added support for bulk write API across multiple databases/collections
- Allows SRV hostnames with fewer than three parts (e.g., `mongodb.local`)
- **v6.12**: Added support for v2.0 of zstd compression algorithm
- Upgraded bson package to v6.10.1
- Improved error handling for replica-set primary staleness
- Better socket data reading in object mode

### Deprecations (Not Breaking)
- `explain` options for find and aggregate operations deprecated
- MongoDB Server 3.6 support deprecated (will be removed in future)

### Files Using MongoDB
- `backend/tests/integration/helpers/database.ts`

Note: Your project primarily uses PostgreSQL with Knex. MongoDB appears to be used only in test helpers.

### Verification Steps
1. No code changes required
2. Run integration tests after `npm install`
3. Verify database helper functions work correctly

### References
- [MongoDB Node.js Driver Release Notes](https://www.mongodb.com/docs/drivers/node/current/reference/release-notes/)
- [MongoDB Driver GitHub Releases](https://github.com/mongodb/node-mongodb-native/releases)

---

## 4. Sentry (7.93.0 → 8.40.0)

### Status: HIGH RISK - Major Version with Breaking Changes

### Summary
Sentry v8 introduces significant breaking changes, primarily rewriting the Node.js SDK to use OpenTelemetry under the hood. This requires careful migration and code updates.

### Required Changes: YES (Multiple Files)

### Breaking Changes Overview

1. **Integrations Changed from Classes to Functions**
2. **`configureScope` Removed**
3. **Performance API Changes**
4. **Hub Deprecated**
5. **Initialization Structure Changed**
6. **Various Deprecated APIs Removed**

---

### Migration Steps

#### STEP 1: Create Instrument File (REQUIRED)

Sentry v8 requires initialization in a separate file that's imported FIRST.

**Create:** `backend/shared/instrument.ts`

```typescript
import * as Sentry from '@sentry/node';

// Initialize Sentry BEFORE any other imports
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 1.0,

    // V8 no longer requires explicit integrations for auto-instrumentation
    // Remove: autoDiscoverNodePerformanceMonitoringIntegrations()

    beforeSend(event, hint) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Sentry Error (not sent):', hint.originalException || hint.syntheticException);
        return null;
      }

      // Remove sensitive data
      if (event.request) {
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }

        if (event.request.query_string) {
          event.request.query_string = event.request.query_string
            .replace(/password=[^&]+/gi, 'password=[REDACTED]')
            .replace(/token=[^&]+/gi, 'token=[REDACTED]');
        }
      }

      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data && breadcrumb.data.url) {
        breadcrumb.data.url = breadcrumb.data.url
          .replace(/password=[^&]+/gi, 'password=[REDACTED]')
          .replace(/token=[^&]+/gi, 'token=[REDACTED]');
      }
      return breadcrumb;
    },

    ignoreErrors: [
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],

    release: `backend@${process.env.APP_VERSION || 'dev'}`,
  });

  console.log('Sentry initialized');
}
```

#### STEP 2: Update sentry.config.ts

**File:** `backend/shared/sentry.config.ts`

Replace the entire file:

```typescript
import * as Sentry from '@sentry/node';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * In v8, this should be called from instrument.ts which is imported first
 */
export function initializeSentry(serviceName: string): void {
  if (!process.env.SENTRY_DSN) {
    console.warn(
      `Sentry DSN not configured for ${serviceName}. Error tracking disabled.`
    );
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    serverName: serviceName,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 1.0,

    // V8: Integrations are auto-discovered, no need to specify them
    // Removed: ProfilingIntegration - now built-in

    beforeSend(event, hint) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Sentry Error (not sent):', hint.originalException || hint.syntheticException);
        return null;
      }

      if (event.request) {
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }

        if (event.request.query_string) {
          event.request.query_string = event.request.query_string
            .replace(/password=[^&]+/gi, 'password=[REDACTED]')
            .replace(/token=[^&]+/gi, 'token=[REDACTED]');
        }
      }

      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data && breadcrumb.data.url) {
        breadcrumb.data.url = breadcrumb.data.url
          .replace(/password=[^&]+/gi, 'password=[REDACTED]')
          .replace(/token=[^&]+/gi, 'token=[REDACTED]');
      }
      return breadcrumb;
    },

    ignoreErrors: [
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],

    release: `${serviceName}@${process.env.APP_VERSION || 'dev'}`,
  });

  console.log(`Sentry initialized for ${serviceName}`);
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; username?: string }): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context
 */
export function clearUser(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>): void {
  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a new span for performance monitoring (V8 API)
 * Replaces the old startTransaction API
 */
export function startSpan<T>(
  options: { name: string; op: string },
  callback: () => T | Promise<T>
): Promise<T> {
  return Sentry.startSpan(options, callback);
}

/**
 * Get the active span for adding data
 */
export function getActiveSpan(): ReturnType<typeof Sentry.getActiveSpan> {
  return Sentry.getActiveSpan();
}

export default Sentry;
```

#### STEP 3: Update Main Server Files

**For each service's main entry point (e.g., `backend/server.ts`, `backend/services/*/src/index.ts`):**

Add this as the FIRST import:

```typescript
// MUST be imported first!
import './shared/instrument';
// or for services:
import '../../shared/instrument';

// ... rest of imports
```

#### STEP 4: Replace configureScope Usage

Search for `Sentry.configureScope` and replace:

**Old (v7):**
```typescript
Sentry.configureScope((scope) => {
  scope.setTag('key', 'value');
  scope.setUser({ id: userId });
});
```

**New (v8):**
```typescript
Sentry.getCurrentScope().setTag('key', 'value');
Sentry.setUser({ id: userId });
```

#### STEP 5: Update Performance Monitoring

The old `startTransaction` API is removed. Use the new span API:

**Old (v7):**
```typescript
const transaction = Sentry.startTransaction({
  name: 'Payment Processing',
  op: 'payment',
});

try {
  // Do work
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('error');
  throw error;
} finally {
  transaction.finish();
}
```

**New (v8):**
```typescript
await Sentry.startSpan(
  { name: 'Payment Processing', op: 'payment' },
  async () => {
    // Do work
    // Span automatically finishes and sets status
  }
);
```

#### STEP 6: Remove Deprecated Imports

Remove these if present:

```typescript
// Remove these imports
import { ProfilingIntegration } from '@sentry/profiling-node'; // Built-in now
import { Severity } from '@sentry/node'; // Use SeverityLevel type instead

// Update type usage
type Level = Sentry.SeverityLevel; // Use this instead of Severity enum
```

#### STEP 7: Update Request Isolation (if used)

If you're using `runWithAsyncContext`:

**Old (v7):**
```typescript
Sentry.runWithAsyncContext(async () => {
  // Handle request
});
```

**New (v8):**
```typescript
Sentry.withIsolationScope(async () => {
  // Handle request
});
```

---

### Files Requiring Updates

1. **backend/shared/sentry.config.ts** - Update entire file (see STEP 2)
2. **Create: backend/shared/instrument.ts** - New file required (see STEP 1)
3. **backend/server.ts** - Add instrument import as first line
4. **All service entry points** - Add instrument import as first line

---

### Verification Steps

1. Update all files as outlined above
2. Run `npm install` in backend and all services
3. Start the application and verify Sentry initializes
4. Trigger an error and verify it appears in Sentry dashboard
5. Check performance monitoring still works
6. Verify user context is properly set

---

### Migration Checklist

- [ ] Install @sentry/node@^8.40.0
- [ ] Create backend/shared/instrument.ts
- [ ] Update backend/shared/sentry.config.ts
- [ ] Add instrument import to backend/server.ts (FIRST import)
- [ ] Add instrument import to all service entry points
- [ ] Search and replace `Sentry.configureScope` with `Sentry.getCurrentScope()`
- [ ] Update any `startTransaction` calls to use `startSpan`
- [ ] Remove ProfilingIntegration imports
- [ ] Replace Severity enum with SeverityLevel type
- [ ] Test error tracking
- [ ] Test performance monitoring
- [ ] Verify user context works

---

### References
- [Sentry Node.js v7 to v8 Migration Guide](https://docs.sentry.io/platforms/javascript/guides/node/migration/v7-to-v8/)
- [Sentry JavaScript SDK v8 Retrospective](https://sentry.engineering/blog/js-sdk-v8-retrospective)

---

## Installation Instructions

### 1. Update Dependencies

Run in the root backend directory:

```bash
cd backend
npm install
```

### 2. Update Service Dependencies

Run for each service that uses the updated packages:

```bash
# Payment Service (uses Stripe)
cd services/payment-service
npm install

# Notification Service (uses Twilio)
cd services/notification-service
npm install

# User Service (uses Twilio)
cd services/user-service
npm install
```

### 3. Apply Sentry v8 Code Changes

Follow the Sentry migration steps above (STEPS 1-7).

### 4. Testing

After updates, run:

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

---

## Rollback Plan

If issues occur after updating:

1. **Immediate Rollback:**
   ```bash
   git checkout backend/package.json
   git checkout backend/services/*/package.json
   npm install
   ```

2. **Restore Sentry v7:**
   ```bash
   git checkout backend/shared/sentry.config.ts
   npm install @sentry/node@^7.93.0
   ```

3. **Individual Package Rollback:**
   - Twilio: `npm install twilio@^4.20.0`
   - Stripe: `npm install stripe@^14.9.0`
   - MongoDB: `npm install mongodb@^6.3.0`
   - Sentry: `npm install @sentry/node@^7.93.0`

---

## Timeline

- **Preparation:** Review this document thoroughly
- **Implementation:** 2-4 hours (mostly Sentry v8 changes)
- **Testing:** 2-3 hours
- **Monitoring:** 24-48 hours post-deployment

---

## Risk Assessment

| Package | Risk Level | Impact | Mitigation |
|---------|-----------|--------|------------|
| Twilio | Low | None | Fully backward compatible |
| Stripe | Low | Minimal | Minor version, no breaking changes |
| MongoDB | Low | Minimal | Minor version, no breaking changes |
| Sentry | High | Significant | Requires code changes, thorough testing |

---

## Support Contacts

- **Twilio Issues:** https://support.twilio.com
- **Stripe Issues:** https://support.stripe.com
- **MongoDB Issues:** https://www.mongodb.com/support
- **Sentry Issues:** https://sentry.io/support

---

## Notes

- All dependency versions have been updated in package.json files
- Sentry v8 is the only package requiring code changes
- Test thoroughly in development before deploying to production
- Monitor error rates and performance metrics after deployment
- Keep this document updated as issues are discovered and resolved

---

**Last Updated:** December 13, 2025
**Author:** Claude (Dependency Analysis & Migration Planning)
