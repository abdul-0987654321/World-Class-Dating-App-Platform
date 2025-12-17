# Monitoring & Logging Implementation Checklist

**Project:** Flamoral Dating Platform
**Date:** December 15, 2025
**Completion Status:** Code Complete - Integration Pending

## Quick Status

- ✅ All code files created
- ✅ Documentation complete
- ⏳ Dependencies need installation
- ⏳ Module integration required
- ⏳ Environment configuration needed

---

## Phase 1: Metrics Endpoint Fix (CRITICAL)

### Files Created
- ✅ `backend/services/api-gateway/src/services/metrics.service.ts`
- ✅ `backend/services/api-gateway/src/services/metrics.module.ts`
- ✅ `backend/services/api-gateway/src/controllers/metrics.controller.ts`
- ✅ `backend/services/api-gateway/src/middleware/metrics.middleware.ts`
- ✅ `backend/services/api-gateway/METRICS_INTEGRATION_GUIDE.md`

### Implementation Steps

#### Step 1: Install Dependencies
```bash
cd backend/services/api-gateway
npm install prom-client@^15.1.0
```
- [ ] Dependency installed
- [ ] package-lock.json updated
- [ ] No version conflicts

#### Step 2: Import MetricsModule

Edit `backend/services/api-gateway/src/app.module.ts`:

**Line ~9-11, add import:**
```typescript
import { MetricsModule } from './services/metrics.module';
```

**Line ~48-57, add to imports array:**
```typescript
imports: [
  // ... existing
  HealthModule,
  ProxyModule,
  MetricsModule,  // ADD THIS
  ControllersModule,
  WebsocketModule,
],
```

- [ ] Import added
- [ ] Module added to imports
- [ ] No TypeScript errors

#### Step 3: Test Metrics Endpoint

```bash
# Start server
npm run start:dev

# Test endpoint
curl http://localhost:4000/api/v1/metrics
```

**Expected Output:**
```
# HELP flamoral_http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE flamoral_http_request_duration_seconds histogram
...
```

- [ ] Endpoint returns 200
- [ ] Prometheus format output
- [ ] Metrics updating on requests

---

## Phase 2: Sentry Integration Enhancement

### Files Created
- ✅ `backend/shared/utils/logger-sentry-integration.ts`

### Implementation Steps

#### Step 1: Verify Sentry Package

```bash
cd backend
npm list @sentry/node
# Should show @sentry/node@8.40.0 or similar
```

- [ ] Package already installed
- [ ] Version compatible (>= 8.0.0)

#### Step 2: Configure Environment Variables

Add to production `.env`:
```bash
SENTRY_DSN=https://[key]@o[orgid].ingest.sentry.io/[projectid]
NODE_ENV=production
LOG_LEVEL=warn
```

Get DSN from:
1. Login to sentry.io
2. Select/Create project
3. Settings → Client Keys (DSN)

- [ ] Sentry project created
- [ ] DSN obtained
- [ ] Environment variable set
- [ ] Verified in production config

#### Step 3: Update Services to Use Sentry Logger (Optional)

**Old way:**
```typescript
import createLogger from '@backend/shared/utils/logger';
const logger = createLogger('service-name');
```

**New way:**
```typescript
import createLoggerWithSentry from '@backend/shared/utils/logger-sentry-integration';
const logger = createLoggerWithSentry('service-name');
```

Services to update (priority order):
- [ ] api-gateway
- [ ] user-service
- [ ] payment-service
- [ ] matching-service
- [ ] messaging-service

#### Step 4: Test Sentry Error Reporting

```typescript
// Log a test error
logger.error('Test Sentry integration', new Error('Test error'), {
  testContext: 'monitoring-setup',
  userId: 'test-user'
});
```

Check Sentry dashboard for error.

- [ ] Error appears in Sentry
- [ ] Context data attached
- [ ] Stack trace visible
- [ ] Service tagged correctly

---

## Phase 3: Prometheus Configuration

### Update Prometheus Config

Edit `infrastructure/monitoring/prometheus/prometheus.yaml`:

```yaml
scrape_configs:
  - job_name: 'flamoral-api-gateway'
    static_configs:
      - targets: ['api-gateway:4000']
    metrics_path: '/api/v1/metrics'
    scrape_interval: 15s
    scrape_timeout: 10s
```

- [ ] Config file updated
- [ ] Target address correct
- [ ] Prometheus restarted
- [ ] Endpoint scraped successfully

### Verify in Prometheus UI

1. Open Prometheus UI (http://localhost:9090)
2. Go to Status → Targets
3. Find `flamoral-api-gateway` job
4. Status should be "UP"

- [ ] Target visible in Prometheus
- [ ] Status: UP
- [ ] Last scrape successful
- [ ] Metrics queryable

---

## Phase 4: Grafana Dashboards

### Import Metrics Queries

Test these queries in Grafana:

```promql
# Request rate
rate(flamoral_http_requests_total[5m])

# Error rate
rate(flamoral_http_request_errors_total[5m])

# P95 latency
histogram_quantile(0.95, rate(flamoral_http_request_duration_seconds_bucket[5m]))

# Memory usage
flamoral_api_gateway_process_resident_memory_bytes
```

- [ ] All queries return data
- [ ] Graphs render correctly
- [ ] Data updates in real-time

### Create Dashboard

1. Create new dashboard in Grafana
2. Add panels for each metric
3. Save as "Flamoral API Gateway"

- [ ] Dashboard created
- [ ] Panels configured
- [ ] Saved and accessible

---

## Phase 5: Alerting Rules

### Configure Alerts

Create `infrastructure/monitoring/prometheus/alert-rules.yaml`:

```yaml
groups:
  - name: flamoral_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(flamoral_http_request_errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error rate above 5%"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(flamoral_http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency above 2s"
```

- [ ] Alert rules created
- [ ] Prometheus configured to load rules
- [ ] Test alerts triggered
- [ ] Notifications configured

---

## Phase 6: Logging Verification

### Verify Existing Logging System

Already implemented and working:

- ✅ Environment-aware log levels
- ✅ PII sanitization (50+ fields)
- ✅ Structured JSON logging
- ✅ File rotation (dev only)
- ✅ Console output

### Test Logging Levels

```bash
# Development
NODE_ENV=development npm start
# Should see: DEBUG, INFO, WARN, ERROR

# Production
NODE_ENV=production npm start
# Should see: WARN, ERROR only
```

- [ ] Dev mode shows all levels
- [ ] Prod mode shows WARN+ERROR only
- [ ] PII sanitization working
- [ ] No sensitive data in logs

---

## Phase 7: Production Deployment

### Pre-Deployment Checklist

- [ ] All dependencies installed
- [ ] Modules properly imported
- [ ] Environment variables set
- [ ] Tests passing
- [ ] No TypeScript errors
- [ ] Documentation reviewed

### Deployment Steps

1. **Merge to staging branch**
   ```bash
   git checkout staging
   git merge feature/monitoring-fixes
   ```

2. **Deploy to staging**
   ```bash
   npm run deploy:staging
   ```

3. **Verify staging**
   - [ ] /api/v1/metrics returns data
   - [ ] /health returns OK
   - [ ] Logs appear in console
   - [ ] Sentry receives errors

4. **Deploy to production**
   ```bash
   npm run deploy:production
   ```

5. **Verify production**
   - [ ] Metrics endpoint accessible
   - [ ] Prometheus scraping data
   - [ ] Grafana showing metrics
   - [ ] Sentry receiving errors
   - [ ] Alerts configured
   - [ ] No performance degradation

---

## Phase 8: Documentation Updates

### Update Existing Docs

Files to update with new metrics endpoint info:

1. **README.md**
   - [ ] Add metrics endpoint to API list
   - [ ] Update monitoring section

2. **docs/deployment/MONITORING_AND_LOGGING_SETUP.md**
   - [ ] Add Prometheus metrics section
   - [ ] Update Sentry integration info
   - [ ] Add new dashboards

3. **infrastructure/monitoring/README.md**
   - [ ] Document metrics endpoint
   - [ ] Add example queries
   - [ ] Update architecture diagram

### New Documentation Created

- ✅ MONITORING_LOGGING_FIX_REPORT.md
- ✅ MONITORING_FIX_QUICKSTART.md
- ✅ MONITORING_IMPLEMENTATION_CHECKLIST.md (this file)
- ✅ backend/services/api-gateway/METRICS_INTEGRATION_GUIDE.md

---

## Testing Verification

### Unit Tests

```bash
cd backend/services/api-gateway
npm test
```

- [ ] All tests passing
- [ ] No new test failures
- [ ] Metrics tests added (optional)

### Integration Tests

```bash
# Test full workflow
curl http://localhost:4000/health
curl http://localhost:4000/api/v1/metrics
curl http://localhost:4000/api/users  # Generate traffic
curl http://localhost:4000/api/v1/metrics  # Check updated metrics
```

- [ ] Health check works
- [ ] Metrics endpoint works
- [ ] Metrics update with traffic
- [ ] Error metrics increment on errors

### Load Testing

```bash
# Optional: Use k6 or Apache Bench
ab -n 1000 -c 10 http://localhost:4000/health
```

- [ ] Metrics handle high load
- [ ] No memory leaks
- [ ] Performance acceptable

---

## Rollback Plan

If issues occur in production:

### Quick Rollback

1. **Remove MetricsModule from app.module.ts**
   ```typescript
   // Comment out or remove:
   // MetricsModule,
   ```

2. **Restart service**
   ```bash
   npm restart
   ```

3. **Verify service health**
   ```bash
   curl http://localhost:4000/health
   ```

- [ ] Rollback procedure documented
- [ ] Team trained on rollback
- [ ] Backup of working config

---

## Support Resources

### Documentation
- Full Report: `MONITORING_LOGGING_FIX_REPORT.md`
- Quick Start: `MONITORING_FIX_QUICKSTART.md`
- Integration Guide: `backend/services/api-gateway/METRICS_INTEGRATION_GUIDE.md`
- Logging Guide: `LOGGING_SECURITY_IMPLEMENTATION.md`

### External Links
- [prom-client Docs](https://github.com/siimon/prom-client)
- [Prometheus Docs](https://prometheus.io/docs/)
- [Sentry Node.js](https://docs.sentry.io/platforms/node/)
- [Winston Logger](https://github.com/winstonjs/winston)

### Contact
- DevOps Team: devops@flamoral.com
- Security Team: security@flamoral.com
- On-call: Use PagerDuty escalation

---

## Sign-Off

### Development Team
- [ ] Code reviewed
- [ ] Tests passed
- [ ] Documentation complete
- [ ] Ready for QA

**Signed:** ___________________ **Date:** ___________

### QA Team
- [ ] Staging tested
- [ ] Metrics verified
- [ ] Logging verified
- [ ] Ready for production

**Signed:** ___________________ **Date:** ___________

### DevOps Team
- [ ] Infrastructure ready
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Ready to deploy

**Signed:** ___________________ **Date:** ___________

---

**Status:** Ready for Implementation
**Risk Level:** Low (additive changes only)
**Estimated Time:** 1-2 hours
**Rollback Time:** 5 minutes
