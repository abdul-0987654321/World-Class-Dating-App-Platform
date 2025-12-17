# Monitoring & Logging Fix - Quick Start Guide

## What Was Fixed

1. ✅ **Created /api/v1/metrics endpoint** - Now returns Prometheus metrics
2. ✅ **Enhanced Sentry integration** - Automatic error reporting from logger
3. ✅ **Verified logging configuration** - Already properly configured with PII protection

## Immediate Action Required (5 minutes)

### Step 1: Install Dependencies

```bash
cd backend/services/api-gateway
npm install prom-client@^15.1.0
```

### Step 2: Update app.module.ts

Edit `backend/services/api-gateway/src/app.module.ts`:

**Add this import at the top:**
```typescript
import { MetricsModule } from './services/metrics.module';
```

**Add MetricsModule to imports array (around line 48):**
```typescript
@Module({
  imports: [
    // ... existing imports
    HealthModule,
    ProxyModule,
    MetricsModule,  // ADD THIS LINE
    ControllersModule,
    WebsocketModule,
  ],
  // ... rest unchanged
})
```

### Step 3: Configure Sentry (Production Only)

Add to your production `.env` file:

```bash
# Get this from sentry.io
SENTRY_DSN=https://your-key@o0000000.ingest.sentry.io/0000000
```

### Step 4: Test

```bash
# Start the API gateway
npm run start:dev

# Test the metrics endpoint
curl http://localhost:4000/api/v1/metrics

# Expected: Prometheus metrics output
```

## Files Created

### Core Metrics System
- `backend/services/api-gateway/src/services/metrics.service.ts`
- `backend/services/api-gateway/src/services/metrics.module.ts`
- `backend/services/api-gateway/src/controllers/metrics.controller.ts`
- `backend/services/api-gateway/src/middleware/metrics.middleware.ts`

### Enhanced Logger
- `backend/shared/utils/logger-sentry-integration.ts`

### Documentation
- `MONITORING_LOGGING_FIX_REPORT.md` - Full details
- `METRICS_INTEGRATION_GUIDE.md` - Detailed setup guide
- `MONITORING_FIX_QUICKSTART.md` - This file

## What You Get

### Metrics Available at /api/v1/metrics

- **HTTP Requests**: Duration, count, errors
- **Connections**: Active HTTP and WebSocket connections
- **System**: CPU, memory, heap, event loop lag
- **Custom**: Ready for your business metrics

### Logging Features (Already Working)

- Environment-aware log levels (debug in dev, error in prod)
- Automatic PII sanitization (50+ sensitive fields)
- Structured JSON logging
- File rotation (dev only)
- **NEW**: Sentry error tracking (production)

## Quick Commands

```bash
# Install dependencies
npm install prom-client@^15.1.0

# Start dev server
npm run start:dev

# Test health endpoint
curl http://localhost:4000/health

# Test metrics endpoint
curl http://localhost:4000/api/v1/metrics

# Check for errors
# Errors are automatically sent to Sentry in production
```

## Prometheus Configuration

Update `infrastructure/monitoring/prometheus/prometheus.yaml`:

```yaml
scrape_configs:
  - job_name: 'flamoral-api-gateway'
    static_configs:
      - targets: ['localhost:4000']
    metrics_path: '/api/v1/metrics'
    scrape_interval: 15s
```

## Common Grafana Queries

```promql
# Request rate
rate(flamoral_http_requests_total[5m])

# Error rate
rate(flamoral_http_request_errors_total[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(flamoral_http_request_duration_seconds_bucket[5m]))

# Active connections
flamoral_active_http_connections

# Memory usage
flamoral_api_gateway_process_resident_memory_bytes
```

## Troubleshooting

**Metrics endpoint returns 404?**
- Check MetricsModule is imported in app.module.ts
- Run `npm list prom-client` to verify installation
- Restart the application

**Sentry not receiving errors?**
- Verify SENTRY_DSN is set
- Check NODE_ENV is 'production'
- Errors below ERROR level won't be sent

**Need help?**
- See `MONITORING_LOGGING_FIX_REPORT.md` for full details
- Check `METRICS_INTEGRATION_GUIDE.md` for advanced setup
- Review existing `LOGGING_QUICK_REFERENCE.md`

## Status

- ✅ Code Complete
- ⏳ Dependencies Need Installation
- ⏳ Module Import Required
- ⏳ Sentry DSN Configuration (optional)
- ⏳ Testing Needed

**Estimated Time to Complete**: 5-10 minutes
