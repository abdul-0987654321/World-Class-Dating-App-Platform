# Monitoring & Logging Setup Guide

**Date:** 2025-11-20
**Status:** ✅ GUIDE COMPLETE - Ready for Implementation

---

## Overview

This guide provides step-by-step instructions for setting up comprehensive monitoring, logging, and error tracking for the Flamoral dating platform.

---

## 1. Error Tracking with Sentry

### Why Sentry?
- **Free Tier:** 5,000 errors/month
- **Real-time alerts:** Get notified immediately
- **Stack traces:** Full error context with line numbers
- **Release tracking:** See which deployment caused issues
- **Performance monitoring:** Track slow API calls
- **User impact:** See how many users are affected

### Setup Steps

#### A. Create Sentry Account
1. Go to https://sentry.io/
2. Sign up for free account
3. Create a new organization: "Flamoral"

#### B. Create Projects
Create separate projects for each service:
- `flamoral-user-service`
- `flamoral-payment-service`
- `flamoral-messaging-service`
- `flamoral-matching-service`
- `flamoral-moderation-service`
- `flamoral-media-service`
- `flamoral-frontend-web`

#### C. Get DSN Keys
For each project, copy the DSN (Data Source Name):
```
https://xxxxx@o123456.ingest.sentry.io/7891234
```

#### D. Install Sentry SDK

**Backend Services (Node.js/TypeScript):**
```bash
npm install --save @sentry/node @sentry/profiling-node
```

**Frontend (React):**
```bash
npm install --save @sentry/react
```

#### E. Configure Sentry

**Backend Configuration:**
Create `backend/shared/sentry.ts`:
```typescript
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export function initializeSentry(serviceName: string) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 1.0,
    integrations: [
      new ProfilingIntegration(),
    ],
    beforeSend(event, hint) {
      // Don't send errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error(hint.originalException || hint.syntheticException);
        return null;
      }
      return event;
    },
    release: `${serviceName}@${process.env.APP_VERSION || 'dev'}`,
  });
}

export default Sentry;
```

**Frontend Configuration:**
Create `frontend/web/src/utils/sentry.ts`:
```typescript
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export function initializeSentry() {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    integrations: [
      new BrowserTracing(),
      new Sentry.Replay({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
```

#### F. Environment Variables

Add to `.env`:
```env
# Sentry Configuration
SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/7891234
APP_VERSION=1.0.0
```

---

## 2. Centralized Logging with Winston

### Why Winston?
- Industry standard for Node.js
- Multiple transports (file, console, cloud)
- Log levels (error, warn, info, debug)
- Structured logging (JSON format)
- Integration with logging services

### Setup Steps

#### A. Install Winston
```bash
npm install --save winston winston-daily-rotate-file
```

#### B. Create Logger Configuration

Create `backend/shared/logger.ts`:
```typescript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as Sentry from '@sentry/node';

const logLevel = process.env.LOG_LEVEL || 'info';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format (human-readable for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let msg = `${timestamp} [${service}] ${level}: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create transports
const transports: winston.transport[] = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
  })
);

// File transports (production only)
if (process.env.NODE_ENV === 'production') {
  // All logs
  transports.push(
    new DailyRotateFile({
      filename: 'logs/%DATE%-combined.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    })
  );

  // Error logs
  transports.push(
    new DailyRotateFile({
      filename: 'logs/%DATE%-error.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: logFormat,
    })
  );
}

// Create logger
export function createLogger(serviceName: string) {
  const logger = winston.createLogger({
    level: logLevel,
    defaultMeta: { service: serviceName },
    transports,
    exceptionHandlers: [
      new winston.transports.File({ filename: 'logs/exceptions.log' }),
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: 'logs/rejections.log' }),
    ],
  });

  // Send errors to Sentry
  const originalError = logger.error.bind(logger);
  logger.error = (message: string, meta?: any) => {
    originalError(message, meta);

    // Send to Sentry if in production
    if (process.env.NODE_ENV === 'production' && meta?.error) {
      Sentry.captureException(meta.error, {
        extra: meta,
        tags: {
          service: serviceName,
        },
      });
    }
  };

  return logger;
}

export default createLogger;
```

#### C. Environment Variables
```env
LOG_LEVEL=info  # debug, info, warn, error
NODE_ENV=production
```

---

## 3. Request Logging with Morgan

### Setup Steps

#### A. Install Morgan
```bash
npm install --save morgan
```

#### B. Configure Morgan

Add to your Express app:
```typescript
import morgan from 'morgan';
import { createLogger } from './shared/logger';

const logger = createLogger('http');

// Custom Morgan stream
const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Morgan middleware
app.use(
  morgan(
    ':method :url :status :res[content-length] - :response-time ms',
    { stream }
  )
);
```

---

## 4. Performance Monitoring with New Relic (Optional)

### Why New Relic?
- **Free Tier:** 100GB data/month
- **APM:** Track API response times
- **Database monitoring:** Slow query detection
- **Real user monitoring:** Frontend performance
- **Custom dashboards:** Business metrics

### Setup Steps

#### A. Sign Up
1. Go to https://newrelic.com/
2. Sign up for free account
3. Create application: "Flamoral"

#### B. Install Agent
```bash
npm install --save newrelic
```

#### C. Configure New Relic

Create `newrelic.js` in project root:
```javascript
exports.config = {
  app_name: ['Flamoral User Service'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: 'info',
  },
  distributed_tracing: {
    enabled: true,
  },
  transaction_tracer: {
    enabled: true,
  },
};
```

#### D. Load New Relic
Add to top of your main file:
```typescript
require('newrelic');
```

#### E. Environment Variables
```env
NEW_RELIC_LICENSE_KEY=your_license_key_here
NEW_RELIC_APP_NAME=Flamoral-User-Service
```

---

## 5. Uptime Monitoring

### Option 1: UptimeRobot (Free)
1. Go to https://uptimerobot.com/
2. Sign up for free account
3. Add monitors for:
   - https://yourdomain.com (main site)
   - https://api.yourdomain.com/health (API health)
4. Configure alerts (email, SMS, Slack)

### Option 2: Pingdom
1. Go to https://www.pingdom.com/
2. Similar setup to UptimeRobot
3. More advanced features (paid)

---

## 6. Log Aggregation (Optional for Production)

### Option 1: ELK Stack (Self-Hosted)
- **Elasticsearch:** Store logs
- **Logstash:** Process logs
- **Kibana:** Visualize logs

### Option 2: CloudWatch (AWS)
- Native integration with AWS
- Pay-per-use pricing
- Query logs with CloudWatch Insights

### Option 3: Datadog
- All-in-one monitoring platform
- Free tier available
- Easy setup

---

## 7. Monitoring Dashboard Setup

### Create Custom Dashboards

#### A. Error Dashboard
- Error count by service
- Error rate over time
- Top errors
- Affected users
- Error types (4xx, 5xx)

#### B. Performance Dashboard
- API response time (p50, p95, p99)
- Database query time
- Slow endpoints
- Request rate
- CPU/Memory usage

#### C. Business Dashboard
- Active users
- New signups
- Matches created
- Messages sent
- Revenue metrics
- Conversion rates

---

## 8. Alert Configuration

### Critical Alerts (Immediate Action Required)
- **Service Down:** Any service returns 500 errors > 5% of requests
- **Database Down:** Database connection failures
- **Payment Failures:** Stripe webhook failures
- **High Error Rate:** Error rate > 1% for 5 minutes
- **Slow Response Time:** P95 response time > 2 seconds

### Warning Alerts (Monitor Closely)
- **High Memory Usage:** > 80% for 10 minutes
- **High CPU Usage:** > 70% for 10 minutes
- **Disk Space Low:** < 10% free space
- **Webhook Delays:** Webhooks taking > 5 seconds

### Info Alerts (FYI)
- **Deployment Complete**
- **Daily Summary Report**
- **Weekly Performance Report**

---

## 9. Implementation Checklist

### Backend Setup
- [ ] Install Sentry SDK in all services
- [ ] Configure Sentry DSN for each service
- [ ] Set up Winston logger
- [ ] Add Morgan for request logging
- [ ] Configure log rotation
- [ ] Test error reporting

### Frontend Setup
- [ ] Install Sentry React SDK
- [ ] Configure Sentry DSN
- [ ] Add error boundary
- [ ] Test error reporting
- [ ] Enable session replay

### Monitoring
- [ ] Create Sentry projects
- [ ] Set up uptime monitoring
- [ ] Configure alert rules
- [ ] Create custom dashboards
- [ ] Test alert notifications

### Documentation
- [ ] Document logging conventions
- [ ] Create runbook for common issues
- [ ] Document alert response procedures

---

## 10. Logging Best Practices

### Do's ✅
- **Log at appropriate levels:**
  - `error`: Errors that need immediate attention
  - `warn`: Potential issues
  - `info`: Important events (user login, payment success)
  - `debug`: Detailed diagnostic information
- **Include context:** User ID, request ID, metadata
- **Log exceptions with stack traces**
- **Use structured logging (JSON)**
- **Sanitize sensitive data** (passwords, credit cards, tokens)

### Don'ts ❌
- **Don't log sensitive information**
- **Don't log in tight loops** (performance impact)
- **Don't log entire objects** (can be huge)
- **Don't use console.log in production** (use logger instead)

---

## 11. Cost Estimates

### Free Tier Services
- **Sentry:** Free (5,000 errors/month)
- **UptimeRobot:** Free (50 monitors, 5-minute checks)
- **New Relic:** Free (100GB/month)
- **CloudWatch:** Free tier (5GB logs, 1 million requests)

### Paid Plans (If Needed)
- **Sentry Team:** $26/month (50,000 errors/month)
- **New Relic Pro:** $99/month (unlimited users)
- **Datadog:** $15/host/month
- **Pingdom:** $10/month (10 uptime checks)

**Estimated Monthly Cost (Small Scale):** $0-50 (free tiers sufficient)
**Estimated Monthly Cost (Medium Scale):** $100-300

---

## 12. Monitoring Metrics to Track

### Technical Metrics
- **Uptime:** Target 99.9%
- **Error Rate:** Target < 0.1%
- **Response Time (P95):** Target < 500ms
- **Database Query Time:** Target < 100ms
- **Memory Usage:** Target < 70%
- **CPU Usage:** Target < 60%

### Business Metrics
- **Daily Active Users (DAU)**
- **Monthly Active Users (MAU)**
- **User Retention:** Day 1, Day 7, Day 30
- **Match Rate:** % of swipes that result in matches
- **Message Response Rate:** % of messages that get replies
- **Subscription Conversion:** % of users who subscribe
- **Churn Rate:** % of users who cancel

---

## 13. Example Integration

### Express App with Full Monitoring

```typescript
import express from 'express';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import morgan from 'morgan';
import { createLogger } from './shared/logger';
import { initializeSentry } from './shared/sentry';

const app = express();
const logger = createLogger('user-service');

// Initialize Sentry (must be first)
initializeSentry('user-service');

// Request tracing
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Request logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// Your routes here
app.get('/api/users', async (req, res) => {
  try {
    // Your code
    res.json({ success: true });
  } catch (error) {
    logger.error('Error fetching users', { error });
    res.status(500).json({ success: false });
  }
});

// Sentry error handler (must be before other error handlers)
app.use(Sentry.Handlers.errorHandler());

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(3001, () => {
  logger.info('Server started on port 3001');
});
```

---

## 14. Testing Monitoring Setup

### Test Error Tracking
```typescript
// Backend - throw a test error
app.get('/test/error', () => {
  throw new Error('Test error for Sentry');
});

// Frontend - throw a test error
const testError = () => {
  throw new Error('Test error from frontend');
};
```

### Test Logging
```typescript
logger.debug('Debug message');
logger.info('Info message', { userId: '123' });
logger.warn('Warning message');
logger.error('Error message', { error: new Error('Test error') });
```

### Verify in Sentry
1. Go to Sentry dashboard
2. Check "Issues" tab
3. Verify test errors appear
4. Check user context and breadcrumbs

---

## 15. Runbook for Common Issues

### Service Down
1. Check Sentry for errors
2. Check logs: `tail -f logs/error.log`
3. Check server status: `pm2 status`
4. Restart service: `pm2 restart user-service`
5. Check health endpoint: `curl https://api.yourdomain.com/health`

### High Error Rate
1. Check Sentry for top errors
2. Identify affected endpoints
3. Check recent deployments
4. Rollback if needed
5. Fix and redeploy

### Slow Response Time
1. Check New Relic for slow transactions
2. Identify slow database queries
3. Check for N+1 queries
4. Add database indexes
5. Implement caching

---

## Summary

✅ **Sentry** - Error tracking and performance monitoring
✅ **Winston** - Structured logging with rotation
✅ **Morgan** - HTTP request logging
✅ **UptimeRobot** - Uptime monitoring and alerts
✅ **New Relic (Optional)** - APM and performance insights

**Total Setup Time:** 6-8 hours
**Monthly Cost:** $0-300 depending on scale
**Impact:** Critical for production operations

---

**Status:** ✅ **MONITORING GUIDE COMPLETE**
**Next:** Implement Sentry integration in all services
