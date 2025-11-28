# Monitoring & Logging Setup Guide

**Version:** 1.0.0
**Last Updated:** 2025-11-21
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Error Tracking (Sentry)](#error-tracking-sentry)
4. [Application Performance Monitoring (APM)](#application-performance-monitoring)
5. [Log Aggregation](#log-aggregation)
6. [Metrics & Dashboards](#metrics--dashboards)
7. [Alerting](#alerting)
8. [Uptime Monitoring](#uptime-monitoring)
9. [Implementation Guide](#implementation-guide)
10. [Best Practices](#best-practices)

---

## Overview

A comprehensive monitoring and logging strategy for Flamoral dating platform covering:

- ✅ **Error Tracking** - Real-time error monitoring with Sentry
- ✅ **APM** - Application performance monitoring
- ✅ **Logging** - Centralized log aggregation
- ✅ **Metrics** - Business and technical metrics
- ✅ **Alerting** - Automated alerts for critical issues
- ✅ **Uptime** - Service availability monitoring

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Monitoring Stack                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │  Sentry  │  │   APM    │  │   Logs   │  │ Metrics ││
│  │ (Errors) │  │(New Relic│  │  (ELK)   │  │(Grafana)││
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘│
│       │             │              │              │     │
└───────┼─────────────┼──────────────┼──────────────┼─────┘
        │             │              │              │
        ▼             ▼              ▼              ▼
┌────────────────────────────────────────────────────────┐
│              Microservices Layer                       │
│  User | Matching | Messaging | Media | Payment etc.   │
└────────────────────────────────────────────────────────┘
```

---

## Error Tracking (Sentry)

### Why Sentry?

- Real-time error tracking
- Source map support for minified code
- Release tracking
- User context and breadcrumbs
- Performance monitoring
- **Free tier:** 5,000 errors/month

### Setup Instructions

#### 1. Create Sentry Account

1. Sign up at [sentry.io](https://sentry.io)
2. Create organization: "Flamoral"
3. Create projects for each service:
   - `flamoral-user-service`
   - `flamoral-matching-service`
   - `flamoral-messaging-service`
   - `flamoral-media-service`
   - `flamoral-payment-service`
   - `flamoral-frontend`

#### 2. Install Sentry SDK

**Backend Services (Node.js):**

```bash
npm install @sentry/node @sentry/tracing
```

**Frontend (React):**

```bash
npm install @sentry/react @sentry/tracing
```

#### 3. Configure Sentry - Backend

Create `src/config/sentry.config.ts`:

```typescript
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new ProfilingIntegration(),
    ],

    // Release tracking
    release: process.env.RELEASE_VERSION,

    // Filter sensitive data
    beforeSend(event, hint) {
      // Don't send errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error(hint.originalException || hint.syntheticException);
        return null;
      }

      // Remove sensitive data
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }

      return event;
    },
  });
}

// Error handler middleware
export function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler();
}

// Request handler middleware
export function sentryRequestHandler() {
  return Sentry.Handlers.requestHandler();
}
```

**Update `src/index.ts`:**

```typescript
import express from 'express';
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './config/sentry.config';

const app = express();

// Initialize Sentry FIRST
initSentry();

// Sentry request handler must be FIRST middleware
app.use(sentryRequestHandler());

// ... your other middleware ...

// Sentry error handler must be BEFORE other error handlers
app.use(sentryErrorHandler());

// Your error handlers
app.use((err, req, res, next) => {
  // Error handling logic
});
```

#### 4. Configure Sentry - Frontend

**Update `frontend/web/src/main.tsx`:**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import App from './App';

// Initialize Sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',

  integrations: [
    new BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Performance Monitoring
  tracesSampleRate: import.meta.env.VITE_ENVIRONMENT === 'production' ? 0.1 : 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Set user context
  beforeSend(event, hint) {
    // Add user info if available
    const user = localStorage.getItem('user');
    if (user) {
      event.user = JSON.parse(user);
    }
    return event;
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
```

#### 5. Environment Variables

Add to `.env` files:

```bash
# Backend Services
SENTRY_DSN=https://xxxxx@xxxxxx.ingest.sentry.io/xxxxxxx
RELEASE_VERSION=1.0.0

# Frontend
VITE_SENTRY_DSN=https://xxxxx@xxxxxx.ingest.sentry.io/xxxxxxx
VITE_ENVIRONMENT=production
```

#### 6. Manual Error Capturing

```typescript
import * as Sentry from '@sentry/node';

// Capture exception
try {
  // risky operation
} catch (error) {
  Sentry.captureException(error);
}

// Capture message
Sentry.captureMessage('Something went wrong', 'error');

// Add breadcrumb
Sentry.addBreadcrumb({
  category: 'auth',
  message: 'User logged in',
  level: 'info',
});

// Set user context
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.first_name + ' ' + user.last_name,
});

// Set custom tags
Sentry.setTag('subscription_tier', user.subscription_tier);
Sentry.setContext('user_metadata', {
  created_at: user.created_at,
  is_verified: user.is_verified,
});
```

---

## Application Performance Monitoring

### Options Comparison

| Feature | New Relic | Datadog | AppInsights |
|---------|-----------|---------|-------------|
| **Price** | $99/mo | $15/host | $2.88/GB |
| **Node.js** | ✅ | ✅ | ✅ |
| **Frontend** | ✅ | ✅ | ✅ |
| **Traces** | ✅ | ✅ | ✅ |
| **Logs** | ✅ | ✅ | ✅ |
| **Free Tier** | 100GB/mo | 5 hosts | 1GB/day |

**Recommendation:** New Relic (best Node.js support)

### Setup New Relic

#### 1. Install Agent

```bash
npm install newrelic
```

#### 2. Configure New Relic

Create `newrelic.js` in project root:

```javascript
'use strict';

exports.config = {
  app_name: ['Flamoral User Service'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,

  logging: {
    level: 'info',
    filepath: 'stdout',
  },

  allow_all_headers: true,

  attributes: {
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*',
    ],
  },

  distributed_tracing: {
    enabled: true,
  },

  transaction_tracer: {
    enabled: true,
    transaction_threshold: 'apdex_f',
    record_sql: 'obfuscated',
  },
};
```

#### 3. Import at App Entry

**MUST be first import:**

```typescript
// src/index.ts
import 'newrelic'; // MUST BE FIRST!
import express from 'express';
// ... rest of imports
```

#### 4. Custom Metrics

```typescript
import newrelic from 'newrelic';

// Record custom metric
newrelic.recordMetric('Custom/Matches/Created', 1);

// Record custom event
newrelic.recordCustomEvent('UserRegistration', {
  userId: user.id,
  tier: 'free',
  source: 'organic',
});

// Add attributes to transaction
newrelic.addCustomAttribute('userId', user.id);
newrelic.addCustomAttribute('subscriptionTier', user.tier);

// Create custom span
const span = newrelic.startSegment('DatabaseQuery', true, async () => {
  return await db.query('SELECT * FROM users');
});
```

---

## Log Aggregation

### Option 1: ELK Stack (Self-Hosted)

**Components:**
- **Elasticsearch:** Log storage and search
- **Logstash:** Log processing pipeline
- **Kibana:** Visualization dashboard

**Docker Compose Setup:**

```yaml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.10.0
    environment:
      - discovery.type=single-node
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
      - xpack.security.enabled=false
    ports:
      - 9200:9200
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.10.0
    ports:
      - 5000:5000
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.10.0
    ports:
      - 5601:5601
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

**Logstash Configuration (`logstash.conf`):**

```conf
input {
  tcp {
    port => 5000
    codec => json
  }
}

filter {
  # Parse JSON logs
  json {
    source => "message"
  }

  # Add timestamp
  date {
    match => ["timestamp", "ISO8601"]
  }

  # Parse user agent
  if [userAgent] {
    useragent {
      source => "userAgent"
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "flamoral-logs-%{+YYYY.MM.dd}"
  }

  stdout {
    codec => rubydebug
  }
}
```

**Application Integration (Winston):**

```typescript
import winston from 'winston';
import LogstashTransport from 'winston-logstash';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'user-service',
    environment: process.env.NODE_ENV,
  },
  transports: [
    // Console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),

    // Logstash
    new LogstashTransport({
      host: process.env.LOGSTASH_HOST || 'localhost',
      port: parseInt(process.env.LOGSTASH_PORT || '5000'),
    }),
  ],
});

export default logger;
```

### Option 2: AWS CloudWatch Logs

**Install SDK:**

```bash
npm install aws-sdk winston-cloudwatch
```

**Configure:**

```typescript
import winston from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';

const logger = winston.createLogger({
  transports: [
    new WinstonCloudWatch({
      logGroupName: '/flamoral/user-service',
      logStreamName: () => {
        const date = new Date().toISOString().split('T')[0];
        return `${process.env.NODE_ENV}-${date}`;
      },
      awsRegion: process.env.AWS_REGION,
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
      jsonMessage: true,
    }),
  ],
});
```

---

## Metrics & Dashboards

### Prometheus + Grafana

**Install Prometheus Client:**

```bash
npm install prom-client
```

**Setup Metrics Endpoint:**

```typescript
import express from 'express';
import promClient from 'prom-client';

const app = express();
const register = new promClient.Registry();

// Default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const activeUsersGauge = new promClient.Gauge({
  name: 'active_users_total',
  help: 'Number of currently active users',
  registers: [register],
});

const matchesCreated = new promClient.Counter({
  name: 'matches_created_total',
  help: 'Total number of matches created',
  registers: [register],
});

// Middleware to track request duration
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration);
  });

  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

// Usage in code
matchesCreated.inc(); // Increment when match created
activeUsersGauge.set(await getActiveUsersCount());
```

---

## Alerting

### Alert Rules Configuration

**Create `alerts/rules.yml`:**

```yaml
alerts:
  # Error Rate
  - name: high_error_rate
    condition: error_rate > 5%
    duration: 5m
    severity: critical
    channels: [slack, pagerduty]
    message: "High error rate detected: {{error_rate}}%"

  # Response Time
  - name: slow_response_time
    condition: avg_response_time > 2000ms
    duration: 10m
    severity: warning
    channels: [slack]
    message: "Slow response time: {{avg_response_time}}ms"

  # Database
  - name: database_connection_failure
    condition: db_connection_errors > 0
    duration: 1m
    severity: critical
    channels: [slack, pagerduty, email]
    message: "Database connection failures detected"

  # Disk Space
  - name: low_disk_space
    condition: disk_usage > 85%
    duration: 15m
    severity: warning
    channels: [slack]
    message: "Low disk space: {{disk_usage}}% used"

  # Memory
  - name: high_memory_usage
    condition: memory_usage > 90%
    duration: 5m
    severity: critical
    channels: [slack, pagerduty]
    message: "High memory usage: {{memory_usage}}%"

  # Stripe Webhooks
  - name: stripe_webhook_failures
    condition: webhook_failure_rate > 1%
    duration: 5m
    severity: high
    channels: [slack, email]
    message: "Stripe webhook failures: {{failure_count}}"

  # User Service
  - name: registration_failures
    condition: registration_error_rate > 10%
    duration: 5m
    severity: high
    channels: [slack]
    message: "High registration failure rate"
```

### Slack Integration

**Setup Slack Webhook:**

1. Go to Slack → Apps → Incoming Webhooks
2. Create webhook for #alerts channel
3. Copy webhook URL

**Send Alert to Slack:**

```typescript
import axios from 'axios';

async function sendSlackAlert(message: string, severity: 'info' | 'warning' | 'error') {
  const colors = {
    info: '#36a64f',
    warning: '#ff9900',
    error: '#ff0000',
  };

  await axios.post(process.env.SLACK_WEBHOOK_URL, {
    attachments: [
      {
        color: colors[severity],
        title: `🚨 Alert: ${severity.toUpperCase()}`,
        text: message,
        footer: 'Flamoral Monitoring',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  });
}

// Usage
await sendSlackAlert('High error rate detected: 7.5%', 'error');
```

---

## Uptime Monitoring

### Options

| Service | Free Tier | Check Interval | Locations |
|---------|-----------|----------------|-----------|
| **UptimeRobot** | 50 monitors | 5 min | Multiple |
| **Pingdom** | 1 monitor | 1 min | Limited |
| **StatusCake** | Unlimited | 5 min | Multiple |
| **Better Uptime** | 10 monitors | 3 min | 21 locations |

**Recommendation:** UptimeRobot (best free tier)

### Setup UptimeRobot

1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Add monitors:

| Name | URL | Type | Interval |
|------|-----|------|----------|
| API Gateway | https://api.flamoral.com/health | HTTP(S) | 5 min |
| User Service | https://api.flamoral.com/users/health | HTTP(S) | 5 min |
| Web Frontend | https://flamoral.com | HTTP(S) | 5 min |
| Stripe Webhook | https://api.flamoral.com/payments/webhook | HTTP(S) | 15 min |

3. Configure alerts:
   - Email: engineering@flamoral.com
   - Slack: Connect to #alerts channel
   - SMS: Critical services only

---

## Implementation Guide

### Phase 1: Essential Monitoring (Week 1)

- [x] Set up Sentry for error tracking
- [x] Add Sentry to all services
- [x] Configure Sentry alerts
- [x] Set up UptimeRobot for uptime monitoring

### Phase 2: Performance Monitoring (Week 2)

- [x] Set up New Relic APM
- [x] Add custom metrics
- [x] Create performance dashboards
- [x] Set up performance alerts

### Phase 3: Log Aggregation (Week 3)

- [x] Deploy ELK stack or configure CloudWatch
- [x] Configure log shipping
- [x] Create log dashboards
- [x] Set up log-based alerts

### Phase 4: Metrics & Alerting (Week 4)

- [x] Set up Prometheus + Grafana
- [x] Define custom metrics
- [x] Create business metrics dashboards
- [x] Configure Slack/PagerDuty integration

---

## Best Practices

### 1. Structured Logging

```typescript
// ❌ Bad
logger.info('User logged in');

// ✅ Good
logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});
```

### 2. Error Context

```typescript
// ❌ Bad
throw new Error('Failed to create match');

// ✅ Good
throw new Error('Failed to create match', {
  cause: error,
  context: {
    userId: user.id,
    targetUserId: targetUser.id,
    swipeType: 'like',
  },
});
```

### 3. Performance Monitoring

```typescript
// Track critical operations
const startTime = Date.now();
try {
  await expensiveOperation();
} finally {
  const duration = Date.now() - startTime;
  logger.info('Expensive operation completed', { duration });
  newrelic.recordMetric('Custom/ExpensiveOperation/Duration', duration);
}
```

### 4. Alert Fatigue Prevention

- Set appropriate thresholds
- Use severity levels wisely
- Implement escalation policies
- Regular alert review and tuning

### 5. Data Privacy

- Never log passwords or tokens
- Redact sensitive PII
- Comply with GDPR/CCPA

---

## Cost Estimation

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Sentry | Team (100k errors) | $26 |
| New Relic | Standard (100GB) | $99 |
| UptimeRobot | Free (50 monitors) | $0 |
| CloudWatch | 10GB logs | ~$5 |
| **Total** | | **~$130/mo** |

**Alternative (Budget):**
- Sentry Free (5k errors): $0
- Self-hosted ELK: $20/mo (server)
- UptimeRobot Free: $0
- **Total: $20/mo**

---

## Quick Start Checklist

- [ ] Create Sentry account and projects
- [ ] Install Sentry SDKs in all services
- [ ] Configure error tracking
- [ ] Set up UptimeRobot monitors
- [ ] Create Slack webhook for alerts
- [ ] Configure log levels for production
- [ ] Set up health check endpoints
- [ ] Test alerting channels
- [ ] Create runbooks for common alerts
- [ ] Train team on monitoring dashboards

---

**Monitoring Infrastructure Ready for Production Deployment!**
