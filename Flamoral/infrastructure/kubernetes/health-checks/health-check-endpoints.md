# Health Check Endpoints Documentation

## Overview
All services in the Flamoral platform must implement standardized health check endpoints for Kubernetes liveness and readiness probes, load balancers, and monitoring systems.

## Required Endpoints

### 1. `/health` - Liveness Probe
**Purpose**: Indicates if the service is alive and should not be restarted.

**Response Format**:
```json
{
  "status": "ok",
  "service": "api-gateway",
  "timestamp": "2025-12-15T10:30:00.000Z",
  "uptime": 12345
}
```

**HTTP Status Codes**:
- `200 OK`: Service is healthy
- `503 Service Unavailable`: Service is unhealthy

**Implementation Requirements**:
- Must respond within 5 seconds
- Should NOT check external dependencies (database, redis, etc.)
- Only checks if the application process is running
- Used for Kubernetes liveness probes

---

### 2. `/health/ready` or `/ready` - Readiness Probe
**Purpose**: Indicates if the service is ready to accept traffic.

**Response Format**:
```json
{
  "status": "ready",
  "service": "api-gateway",
  "timestamp": "2025-12-15T10:30:00.000Z",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "downstream_services": "ok"
  }
}
```

**HTTP Status Codes**:
- `200 OK`: Service is ready
- `503 Service Unavailable`: Service is not ready

**Implementation Requirements**:
- Must respond within 10 seconds
- SHOULD check critical dependencies (database, cache, required services)
- Used for Kubernetes readiness probes and load balancer health checks
- Service will not receive traffic until this returns 200

---

### 3. `/health/live` - Alternative Liveness
**Purpose**: Alternative liveness endpoint (if `/health` is used for other purposes).

**Same as `/health` endpoint**

---

### 4. `/metrics` - Prometheus Metrics (Optional but Recommended)
**Purpose**: Expose application metrics for monitoring.

**Port**: Typically exposed on a separate port (9090, 9091, etc.)

**Format**: Prometheus text format
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 12345
```

---

## Kubernetes Configuration

### Liveness Probe Configuration
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
  successThreshold: 1
```

### Readiness Probe Configuration
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: http
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
  successThreshold: 1
```

---

## Service-Specific Health Checks

### API Gateway
- **Liveness**: Check if Express/NestJS server is running
- **Readiness**: Check Redis connection, validate JWT secret loaded

### Auth Service
- **Liveness**: Check if server is running
- **Readiness**: Check database connection, Redis connection, JWT configuration

### User Service
- **Liveness**: Check if server is running
- **Readiness**: Check PostgreSQL connection, Redis connection, S3/Azure Storage

### Matching Service
- **Liveness**: Check if server is running
- **Readiness**: Check PostgreSQL, Redis, ElasticSearch/Azure Search

### Messaging Service
- **Liveness**: Check if server is running
- **Readiness**: Check PostgreSQL, Redis, WebSocket server

### Media Service
- **Liveness**: Check if server is running
- **Readiness**: Check storage connection, image processing capability

### Payment Service
- **Liveness**: Check if server is running
- **Readiness**: Check database, Redis, Stripe API connectivity

### Notification Service
- **Liveness**: Check if server is running
- **Readiness**: Check database, Redis, email/SMS provider connectivity

### Realtime Service (Go)
- **Liveness**: Check if WebSocket server is running
- **Readiness**: Check Redis connection, message queue connectivity

---

## Implementation Examples

### Node.js/NestJS Example
```typescript
// health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator, RedisHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
    ]);
  }
}
```

### Express.js Example
```javascript
// healthRoutes.js
const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: process.env.SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.get('/health/ready', async (req, res) => {
  try {
    // Check database
    await db.query('SELECT 1');

    // Check Redis
    await redis.ping();

    res.status(200).json({
      status: 'ready',
      checks: {
        database: 'ok',
        redis: 'ok',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
    });
  }
});

module.exports = router;
```

### Go Example
```go
// health.go
package health

import (
    "encoding/json"
    "net/http"
    "time"
)

type HealthResponse struct {
    Status    string    `json:"status"`
    Service   string    `json:"service"`
    Timestamp time.Time `json:"timestamp"`
    Uptime    float64   `json:"uptime"`
}

var startTime = time.Now()

func HealthHandler(w http.ResponseWriter, r *http.Request) {
    response := HealthResponse{
        Status:    "ok",
        Service:   "realtime-service",
        Timestamp: time.Now(),
        Uptime:    time.Since(startTime).Seconds(),
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(response)
}

func ReadinessHandler(w http.ResponseWriter, r *http.Request) {
    // Check Redis connection
    if err := redisClient.Ping(context.Background()).Err(); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        json.NewEncoder(w).Encode(map[string]string{
            "status": "not ready",
            "error": err.Error(),
        })
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{
        "status": "ready",
    })
}
```

---

## Testing Health Endpoints

### Using curl
```bash
# Test liveness
curl -f http://localhost:4000/health

# Test readiness
curl -f http://localhost:4000/health/ready

# Test from within Kubernetes
kubectl exec -it <pod-name> -- curl -f http://localhost:4000/health
```

### Using kubectl
```bash
# Check pod status
kubectl get pods -n dating-app

# Describe pod to see probe results
kubectl describe pod <pod-name> -n dating-app

# View events for probe failures
kubectl get events -n dating-app --sort-by='.lastTimestamp'
```

---

## Common Issues and Solutions

### Issue: Readiness probe failing repeatedly
**Solution**:
- Check if external dependencies (database, redis) are accessible
- Increase `initialDelaySeconds` to allow more startup time
- Check application logs for connection errors

### Issue: Liveness probe causing restart loops
**Solution**:
- Ensure `/health` endpoint doesn't check external dependencies
- Increase `timeoutSeconds` or `failureThreshold`
- Check if application is deadlocking or hanging

### Issue: Service not receiving traffic
**Solution**:
- Verify readiness probe is passing
- Check service selector matches pod labels
- Verify ingress/service configuration

---

## Best Practices

1. **Keep liveness probes simple**: Only check if the process is alive
2. **Make readiness probes comprehensive**: Check all critical dependencies
3. **Set appropriate timeouts**: Allow enough time for checks to complete
4. **Use circuit breakers**: Prevent cascading failures from dependency checks
5. **Log probe failures**: Help with debugging
6. **Monitor probe metrics**: Track probe success/failure rates
7. **Test during deployment**: Verify probes work before production
8. **Use startup probes for slow-starting apps**: Prevent premature restarts

---

## Monitoring and Alerting

### Prometheus Queries
```promql
# Probe success rate
rate(prober_probe_total{result="successful"}[5m])

# Probe failures
rate(prober_probe_total{result="failed"}[5m]) > 0

# Pod restarts due to liveness failures
rate(kube_pod_container_status_restarts_total[5m]) > 0
```

### Alerting Rules
```yaml
- alert: HighPodRestartRate
  expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
  for: 5m
  annotations:
    summary: "High pod restart rate for {{ $labels.pod }}"

- alert: ReadinessProbeFailure
  expr: sum(rate(prober_probe_total{result="failed"}[5m])) by (pod) > 0.1
  for: 5m
  annotations:
    summary: "Readiness probe failures for {{ $labels.pod }}"
```
