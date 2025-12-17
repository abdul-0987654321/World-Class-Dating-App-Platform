# Health Checks and Graceful Degradation - Quick Reference

## Health Endpoints

### GET /health/ready
**Purpose**: Kubernetes readiness probe - determines if pod can receive traffic

**Returns**:
- `200 OK`: Pod is ready to serve traffic
- `503 Service Unavailable`: Pod is not ready (don't send traffic)

**Checks**:
- Redis connectivity (non-critical, degraded if down)
- Critical service circuit breakers (auth, payment)
- Memory pressure (<90% heap usage)

**Kubernetes Config**:
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 80
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

**Response Example**:
```json
{
  "status": "ready",
  "timestamp": "2025-12-15T10:30:00.000Z",
  "environment": "production",
  "checks": [
    {"name": "redis", "healthy": true, "latency": 5},
    {"name": "authService", "healthy": true},
    {"name": "paymentService", "healthy": true},
    {"name": "memory", "healthy": true}
  ],
  "circuitBreakers": {
    "healthy": 8,
    "degraded": 1,
    "unhealthy": 1
  }
}
```

### GET /health/live
**Purpose**: Kubernetes liveness probe - determines if pod should be restarted

**Returns**:
- `200 OK`: Process is healthy
- `503 Service Unavailable`: Process should be restarted

**Checks**:
- Process is responsive
- Memory usage (RSS < 2GB)
- No memory leaks detected

**Kubernetes Config**:
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 80
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**Response Example**:
```json
{
  "status": "alive",
  "timestamp": "2025-12-15T10:30:00.000Z",
  "uptime": 3600.5,
  "uptimeFormatted": "1h 0m 0s",
  "pid": 12345,
  "memory": {
    "rss": "512.5MB",
    "heapUsed": "256.3MB",
    "heapTotal": "512.0MB"
  }
}
```

### GET /health/services
**Purpose**: Deep health check of all downstream services

**Use Case**: Monitoring dashboards, debugging

**Response Example**:
```json
{
  "status": "degraded",
  "summary": "8/10 services healthy",
  "services": {
    "authService": {
      "healthy": true,
      "latency": "45ms",
      "circuit": {
        "state": "CLOSED",
        "failures": 0,
        "successes": 1250
      },
      "metrics": {
        "totalRequests": 1250,
        "failureRate": "0.00%",
        "slowCallRate": "2.40%",
        "avgResponseTime": "45ms",
        "p95ResponseTime": "120ms",
        "uptime": "99.92%"
      }
    },
    "matchingService": {
      "healthy": false,
      "latency": "5000ms",
      "circuit": {
        "state": "OPEN",
        "failures": 5,
        "successes": 0
      }
    }
  },
  "timestamp": "2025-12-15T10:30:00.000Z"
}
```

### GET /health/circuits
**Purpose**: Circuit breaker status for all services

**Use Case**: Operational monitoring, incident investigation

**Response Example**:
```json
{
  "summary": {
    "healthy": 8,
    "degraded": 1,
    "unhealthy": 1,
    "total": 10
  },
  "circuits": {
    "authService": {
      "state": "CLOSED",
      "failures": 0,
      "successes": 1250,
      "lastFailureTime": null,
      "nextAttemptTime": null
    },
    "matchingService": {
      "state": "OPEN",
      "failures": 5,
      "successes": 0,
      "lastFailureTime": 1702640400000,
      "nextAttemptTime": 1702640460000
    }
  },
  "config": {
    "failureThreshold": 5,
    "successThreshold": 2,
    "timeout": 30000,
    "resetTimeout": 60000
  },
  "timestamp": "2025-12-15T10:30:00.000Z"
}
```

### GET /health/metrics
**Purpose**: Prometheus/Grafana metrics

**Use Case**: Time-series monitoring, alerting

**Response Example**:
```json
{
  "process": {
    "uptime": 3600.5,
    "pid": 12345,
    "memory": {
      "rss": 536870912,
      "heapUsed": 268435456,
      "heapTotal": 536870912,
      "external": 8388608
    }
  },
  "circuitBreakers": {
    "authService": {
      "totalRequests": 1250,
      "failureRate": 0.0,
      "slowCallRate": 2.4,
      "avgResponseTime": 45.5,
      "p95ResponseTime": 120.3,
      "uptime": 99.92
    }
  },
  "timestamp": "2025-12-15T10:30:00.000Z"
}
```

## Graceful Degradation Behavior

### Critical Services (Fail Fast)
- **authService**: No fallback, returns 503
- **paymentService**: No fallback, returns 503

**Error Response**:
```json
{
  "statusCode": 503,
  "error": "Service Unavailable",
  "message": "Service is temporarily unavailable. Please try again shortly.",
  "retryAfter": 30,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-15T10:30:00.000Z"
}
```

### Non-Critical Services (Graceful Degradation)
- **userService, matchingService, messagingService, etc.**

**Fallback Hierarchy**:
1. Fresh cache (if available and valid)
2. Stale cache (if available, up to 1 hour old)
3. Empty array for lists
4. Null for single items
5. 503 error for mutations (POST/PUT/DELETE)

**Degraded Response Examples**:
```json
// List endpoint with no data
GET /api/v1/matches
[]

// Single item with no data
GET /api/v1/users/123
null

// Cached data (with warning in logs)
GET /api/v1/users/123
{
  "id": "123",
  "name": "John Doe",
  "email": "john@example.com"
}
// Server log: "Using STALE cache for userService/users/123 (age: 3600s, expired 1200s ago)"

// Mutation request (no fallback)
POST /api/v1/users
{
  "statusCode": 503,
  "error": "Service Unavailable",
  "message": "Service is temporarily unavailable. Please try again shortly.",
  "retryAfter": 30,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Cache Behavior

### Cacheable Endpoints
- **Method**: GET only
- **Excludes**: /health, /metrics, /status, /realtime, /stream, /websocket

### Cache TTL by Type
```
Profile/User data:  5 minutes
Matches:           10 minutes
Analytics:         15 minutes
Notifications:      2 minutes
Default:            5 minutes
```

### Cache Storage
- **Primary**: Redis (shared across pods)
- **Fallback**: In-memory (max 100 items per pod)
- **Stale TTL**: Up to 1 hour for degraded mode

### Cache Keys
```
Format: cache:{serviceName}:{path}

Examples:
- cache:userService:/users/123
- cache:matchingService:/matches
- cache:analyticsService:/stats/daily
```

## Request ID Tracing

Every request gets a unique ID that flows through the system:

### Headers
```
Incoming: No header (generated by gateway)
Outgoing: X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
```

### Logs
```
[550e8400-e29b-41d4-a716-446655440000] Proxying GET /users/123 to userService
[550e8400-e29b-41d4-a716-446655440000] Response from userService: 200 (45ms)
```

### Error Responses
```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "An error occurred",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-15T10:30:00.000Z"
}
```

### Support Ticket Usage
```
User reports: "I got an error when trying to view my profile"
Support: "What was the request ID?"
User: "550e8400-e29b-41d4-a716-446655440000"
Support: *searches logs* "Found it! The user service was down at that time."
```

## Error Sanitization

### User-Facing Errors (Sanitized)
```json
{
  "statusCode": 503,
  "error": "Service Unavailable",
  "message": "Service is temporarily unavailable. Please try again shortly.",
  "requestId": "550e8400-...",
  "timestamp": "2025-12-15T..."
}
```

### Server-Side Logs (Detailed)
```json
{
  "level": "error",
  "message": "Service fallback for matchingService POST /matches",
  "context": {
    "service": "matchingService",
    "critical": false,
    "circuitState": "OPEN",
    "failures": 5,
    "lastFailureTime": 1702640400000,
    "error": "ECONNREFUSED: Connection refused",
    "requestId": "550e8400-..."
  }
}
```

## Monitoring Queries

### Grafana Queries

**Service Health Over Time**:
```promql
rate(http_requests_total{status="200"}[5m]) /
rate(http_requests_total[5m])
```

**Cache Hit Rate**:
```promql
rate(cache_hits_total[5m]) /
(rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
```

**Circuit Breaker State**:
```promql
circuit_breaker_state{service="authService"}
```

**Stale Cache Usage**:
```promql
rate(cache_stale_hits_total[5m])
```

### Alert Rules

**Critical Service Down**:
```yaml
alert: CriticalServiceCircuitOpen
expr: circuit_breaker_state{service=~"authService|paymentService"} == 2
for: 1m
severity: critical
```

**High Stale Cache Usage**:
```yaml
alert: HighStaleCacheUsage
expr: rate(cache_stale_hits_total[5m]) / rate(http_requests_total[5m]) > 0.1
for: 5m
severity: warning
```

**Redis Cache Down**:
```yaml
alert: RedisCacheUnavailable
expr: redis_connected == 0
for: 5m
severity: warning
```

## Troubleshooting

### Pod Not Receiving Traffic
1. Check readiness probe: `kubectl describe pod <pod-name>`
2. Check health endpoint: `curl http://pod-ip/health/ready`
3. Look for:
   - Critical service circuit breakers open
   - Memory pressure >90%
   - Redis connectivity issues

### Pod Restarting Frequently
1. Check liveness probe: `kubectl logs <pod-name> --previous`
2. Check health endpoint: `curl http://pod-ip/health/live`
3. Look for:
   - Memory leaks (RSS > 2GB)
   - Unhandled exceptions
   - Event loop blockage

### Stale Data Being Returned
1. Check cache logs: `grep "STALE cache" /var/log/api-gateway.log`
2. Verify service health: `curl http://api-gateway/health/services`
3. Check circuit breaker: `curl http://api-gateway/health/circuits`
4. Actions:
   - If service is down, wait for recovery
   - If circuit is open, wait for half-open transition
   - Clear cache if needed: `redis-cli FLUSHDB`

### High Error Rates
1. Check circuit breaker states
2. Review error logs with request IDs
3. Check service health endpoints
4. Verify network connectivity
5. Check resource utilization

## Quick Commands

```bash
# Check if pod is ready
kubectl get pods -l app=api-gateway -o wide

# Check readiness probe status
kubectl describe pod <pod-name> | grep -A 10 Readiness

# Check liveness probe status
kubectl describe pod <pod-name> | grep -A 10 Liveness

# View health endpoint
kubectl port-forward <pod-name> 8080:80
curl http://localhost:8080/health/ready

# Check circuit breakers
curl http://localhost:8080/health/circuits

# View detailed service health
curl http://localhost:8080/health/services | jq

# Follow logs with request ID
kubectl logs -f <pod-name> | grep "550e8400-..."

# Check Redis cache connection
kubectl exec -it <pod-name> -- redis-cli -h redis-service PING

# View cache statistics
curl http://localhost:8080/health/metrics | jq '.cache'
```

## Best Practices

### For Developers
1. Always include request ID in error responses
2. Use appropriate HTTP status codes
3. Log detailed errors server-side, generic messages to users
4. Test both success and failure scenarios
5. Verify cache invalidation after mutations

### For Operations
1. Monitor circuit breaker states
2. Set up alerts for critical service failures
3. Track cache hit rates and stale usage
4. Review request ID patterns for abuse
5. Keep Redis cache pruned

### For Support
1. Always ask for request ID
2. Search logs using request ID
3. Check health endpoints during incidents
4. Verify service status before escalating
5. Document patterns in runbooks

---

**Last Updated**: December 15, 2025
**Version**: 1.0
**Maintained By**: Platform Engineering Team
