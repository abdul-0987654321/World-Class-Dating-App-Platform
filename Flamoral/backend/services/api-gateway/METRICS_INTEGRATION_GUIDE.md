# Metrics Integration Guide for API Gateway

## Overview

This guide explains how to integrate Prometheus metrics into the Flamoral API Gateway to enable the `/api/v1/metrics` endpoint.

## Files Created

The following files have been created to support Prometheus metrics:

1. `src/services/metrics.service.ts` - Core metrics collection service
2. `src/services/metrics.module.ts` - NestJS module for metrics
3. `src/controllers/metrics.controller.ts` - Controller exposing `/api/v1/metrics`
4. `src/middleware/metrics.middleware.ts` - Middleware for automatic request tracking

## Installation Steps

### Step 1: Install Dependencies

Add `prom-client` to package.json:

```bash
cd backend/services/api-gateway
npm install prom-client@^15.1.0
```

Or manually add to `package.json`:

```json
{
  "dependencies": {
    "prom-client": "^15.1.0"
  }
}
```

### Step 2: Update app.module.ts

Import the MetricsModule in `src/app.module.ts`:

```typescript
// Add this import at the top
import { MetricsModule } from './services/metrics.module';

// Add MetricsModule to the imports array
@Module({
  imports: [
    // ... existing imports
    HealthModule,
    ProxyModule,
    MetricsModule,  // Add this line
    ControllersModule,
    WebsocketModule,
  ],
  // ... rest of the module
})
```

### Step 3: Update main.ts

Add the metrics middleware to `src/main.ts`:

```typescript
import { MetricsMiddleware } from './middleware/metrics.middleware';
import { MetricsService } from './services/metrics.service';

// In the bootstrap function, after creating the app:
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ... existing middleware

  // Add metrics middleware
  const metricsService = app.get(MetricsService);
  app.use(new MetricsMiddleware(metricsService).use.bind(
    new MetricsMiddleware(metricsService)
  ));

  // ... rest of the bootstrap
}
```

## Metrics Exposed

The `/api/v1/metrics` endpoint exposes the following metrics:

### HTTP Metrics

- `flamoral_http_request_duration_seconds` - Histogram of HTTP request durations
  - Labels: `method`, `route`, `status_code`

- `flamoral_http_requests_total` - Counter of total HTTP requests
  - Labels: `method`, `route`, `status_code`

- `flamoral_http_request_errors_total` - Counter of HTTP errors
  - Labels: `method`, `route`, `error_type`

### Connection Metrics

- `flamoral_active_http_connections` - Gauge of active HTTP connections
- `flamoral_websocket_connections` - Gauge of active WebSocket connections

### System Metrics (Default)

- `flamoral_api_gateway_process_cpu_user_seconds_total` - CPU usage
- `flamoral_api_gateway_process_cpu_system_seconds_total` - System CPU
- `flamoral_api_gateway_process_resident_memory_bytes` - Memory usage
- `flamoral_api_gateway_nodejs_eventloop_lag_seconds` - Event loop lag
- `flamoral_api_gateway_nodejs_heap_size_total_bytes` - Heap size
- `flamoral_api_gateway_nodejs_heap_size_used_bytes` - Heap used

## Testing

### Test the Endpoint

```bash
curl http://localhost:4000/api/v1/metrics
```

Expected output (Prometheus format):
```
# HELP flamoral_http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE flamoral_http_request_duration_seconds histogram
flamoral_http_request_duration_seconds_bucket{le="0.001",method="GET",route="/health",status_code="200"} 10
...
```

### Test with Prometheus

Update your Prometheus configuration to scrape the endpoint:

```yaml
scrape_configs:
  - job_name: 'flamoral-api-gateway'
    static_configs:
      - targets: ['api-gateway:4000']
    metrics_path: '/api/v1/metrics'
    scrape_interval: 15s
```

## Monitoring in Grafana

### Sample Queries

**Request Rate:**
```promql
rate(flamoral_http_requests_total[5m])
```

**Error Rate:**
```promql
rate(flamoral_http_request_errors_total[5m])
```

**Request Duration (p95):**
```promql
histogram_quantile(0.95,
  rate(flamoral_http_request_duration_seconds_bucket[5m])
)
```

**Active Connections:**
```promql
flamoral_active_http_connections
```

## Troubleshooting

### Metrics endpoint returns 404

1. Check that MetricsModule is imported in app.module.ts
2. Verify prom-client is installed: `npm list prom-client`
3. Check that the app is running: `curl http://localhost:4000/health`

### No metrics data

1. Make some requests to generate metrics
2. Check that MetricsMiddleware is configured in main.ts
3. Verify the middleware is not skipping routes

### High cardinality warnings

The middleware automatically sanitizes route paths to avoid high cardinality:
- UUIDs → `:id`
- Numeric IDs → `:id`
- MongoDB ObjectIDs → `:id`

## Security Considerations

1. **Access Control**: Consider adding authentication to `/api/v1/metrics` in production
2. **Rate Limiting**: The metrics endpoint bypasses rate limiting by default
3. **Data Privacy**: No PII is exposed in metrics labels

## Next Steps

1. Configure Prometheus to scrape the endpoint
2. Create Grafana dashboards for visualization
3. Set up alerts based on metrics thresholds
4. Monitor memory usage and adjust retention periods

## References

- [prom-client Documentation](https://github.com/siimon/prom-client)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
