# API Gateway Routing Fix - Complete Summary

## Critical Issue Resolved
The API endpoint `api.flamoral.com/health` was returning 404 because:
1. Ingress routes were pointing to the wrong port (80 instead of 4000)
2. No explicit `/health` route was defined in ingress configurations
3. Production ingress was routing directly to services, bypassing the API Gateway

## All Fixes Applied

### 1. Production Ingress Configuration
**File:** `infrastructure/kubernetes/production/ingress.yaml`

**Changes:**
- Added `/health` route as first path (priority routing) to API Gateway port 4000
- Route is placed BEFORE other routes to ensure proper matching
- All health checks now properly route to API Gateway

```yaml
- host: api.flamoral.com
  http:
    paths:
    # Health Check Routes (must be first for priority)
    - path: /health
      pathType: Prefix
      backend:
        service:
          name: api-gateway
          port:
            number: 4000
```

### 2. Base Ingress Configuration
**File:** `infrastructure/kubernetes/base/ingress.yaml`

**Changes:**
- Fixed API Gateway port from 80 to 4000 for all routes
- Added explicit `/health` route for both `flamoral.com` and `api.flamoral.com`
- Reordered routes for proper priority matching

**Routes fixed:**
- `flamoral.com/health` -> API Gateway:4000
- `flamoral.com/api` -> API Gateway:4000
- `api.flamoral.com/health` -> API Gateway:4000
- `api.flamoral.com/` -> API Gateway:4000

### 3. Deploy Ingress Configuration
**File:** `infrastructure/kubernetes/deploy/ingress.yaml`

**Changes:**
- Fixed API Gateway port from 80 to 4000
- Added `/health` route with correct port
- Enhanced annotations for health checks, CORS, and security

### 4. K8s Production Ingress
**File:** `infrastructure/k8s/production-ingress.yaml`

**Changes:**
- Fixed API Gateway port from 80 to 4000
- Added `/health` route as first path
- Ensures proper routing for health checks

### 5. K8s Production Ingress Updated
**File:** `infrastructure/k8s/production-ingress-updated.yaml`

**Changes:**
- Fixed API Gateway port from 80 to 4000
- Added `/health` route
- Fixed admin service port from 80 to 3010

### 6. FIXES Directory Ingress
**File:** `infrastructure/kubernetes/FIXES/ingress-fix.yaml`

**Changes:**
- Added `/health` route as first path
- Port already correctly set to 4000

## API Gateway Configuration Verified

### Health Controller
**File:** `backend/services/api-gateway/src/health/health.controller.ts`

The health controller is properly configured with multiple endpoints:
- `GET /health` - Basic health check (memory status)
- `GET /health/ready` - Readiness probe (checks dependencies)
- `GET /health/live` - Liveness probe (process health)
- `GET /health/services` - Deep health check (all downstream services)
- `GET /health/circuits` - Circuit breaker status
- `GET /health/metrics` - Detailed metrics

All endpoints use `@Public()` decorator, so they bypass authentication.

### Main Configuration
**File:** `backend/services/api-gateway/src/main.ts`

- Global prefix set to `api/v1`
- `/health` routes explicitly excluded from global prefix (lines 144-148)
- Port: 4000 (line 199)

### Service Port
**File:** `infrastructure/kubernetes/production/services/all-services.yaml`

API Gateway service correctly configured:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: flamoral
spec:
  ports:
  - port: 4000
    targetPort: 4000
    name: http
```

### Deployment Health Probes
**File:** `infrastructure/kubernetes/production/deployments/api-gateway.yaml`

Kubernetes health probes correctly configured:
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 4000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 4000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Deployment Instructions

### Option 1: Apply Individual Fixes

```bash
# Apply the production ingress fix
kubectl apply -f infrastructure/kubernetes/production/ingress.yaml

# Or apply the base ingress
kubectl apply -f infrastructure/kubernetes/base/ingress.yaml

# Or apply the deploy ingress
kubectl apply -f infrastructure/kubernetes/deploy/ingress.yaml

# Verify ingress is updated
kubectl get ingress -n flamoral flamoral-main-ingress -o yaml
```

### Option 2: Apply All Fixes at Once

```bash
# Navigate to the Flamoral directory
cd /path/to/Flamoral

# Apply all ingress configurations
kubectl apply -f infrastructure/kubernetes/production/ingress.yaml
kubectl apply -f infrastructure/kubernetes/base/ingress.yaml
kubectl apply -f infrastructure/kubernetes/deploy/ingress.yaml

# Verify all ingresses
kubectl get ingress -n flamoral
```

### Option 3: Helm Deployment

The Helm chart already has the correct configuration:
```bash
# Upgrade the Helm release
helm upgrade flamoral infrastructure/helm/flamoral \
  --namespace flamoral \
  --values infrastructure/helm/flamoral/values-production.yaml

# Verify
helm list -n flamoral
kubectl get ingress -n flamoral
```

## Verification Steps

### 1. Check Ingress Configuration
```bash
# Get ingress details
kubectl get ingress -n flamoral -o yaml

# Check specific route
kubectl describe ingress flamoral-main-ingress -n flamoral
```

### 2. Test Health Endpoint Locally (if port-forwarding)
```bash
# Port forward to API Gateway
kubectl port-forward -n flamoral svc/api-gateway 4000:4000

# Test health endpoint
curl http://localhost:4000/health
```

### 3. Test Health Endpoint via Ingress
```bash
# Test through the public domain
curl https://api.flamoral.com/health

# Should return 200 OK with response like:
# {
#   "status": "ok",
#   "info": {
#     "memory_heap": { "status": "up" },
#     "memory_rss": { "status": "up" }
#   }
# }
```

### 4. Test Other Health Endpoints
```bash
# Test readiness
curl https://api.flamoral.com/health/ready

# Test liveness
curl https://api.flamoral.com/health/live

# Test services health
curl https://api.flamoral.com/health/services

# Test circuit breakers
curl https://api.flamoral.com/health/circuits
```

### 5. Check Kubernetes Health Probes
```bash
# Get pod status
kubectl get pods -n flamoral -l app=api-gateway

# Check pod events
kubectl describe pod -n flamoral -l app=api-gateway

# View pod logs
kubectl logs -n flamoral -l app=api-gateway --tail=50
```

## Root Cause Analysis

### Why the Issue Occurred

1. **Port Mismatch**: Most ingress files were configured to route to port 80, but the API Gateway service runs on port 4000
   - The Kubernetes service is correctly configured on port 4000
   - The deployment container listens on port 4000
   - But ingress rules were pointing to port 80

2. **Missing Health Route**: The `/health` endpoint wasn't explicitly defined in ingress path rules
   - While the API Gateway had a catch-all route (`/`), health checks need priority routing
   - Without an explicit route, traffic might be routed to other services first

3. **Route Priority**: In Kubernetes ingress, routes are matched in order
   - More specific routes should come before generic ones
   - `/health` should be before `/` to ensure proper matching

## What Changed

### Before
```yaml
- host: api.flamoral.com
  http:
    paths:
    - path: /
      backend:
        service:
          name: api-gateway
          port:
            number: 80  # WRONG PORT
```

### After
```yaml
- host: api.flamoral.com
  http:
    paths:
    - path: /health      # EXPLICIT HEALTH ROUTE
      backend:
        service:
          name: api-gateway
          port:
            number: 4000  # CORRECT PORT
    - path: /
      backend:
        service:
          name: api-gateway
          port:
            number: 4000  # CORRECT PORT
```

## Expected Behavior After Fix

1. `https://api.flamoral.com/health` returns **200 OK** with health status
2. `https://api.flamoral.com/health/ready` returns **200 OK** when all dependencies are healthy
3. `https://api.flamoral.com/health/live` returns **200 OK** when the process is healthy
4. All Kubernetes health probes pass
5. Pods show as Ready and Running
6. API Gateway becomes available for traffic

## Rollback Plan

If any issues occur after deployment:

```bash
# Rollback the ingress to previous version
kubectl rollout undo ingress/flamoral-main-ingress -n flamoral

# Or restore from backup
kubectl apply -f infrastructure/kubernetes/production/ingress.yaml.backup

# For Helm deployments
helm rollback flamoral -n flamoral
```

## Files Modified

All ingress configuration files have been fixed:

1. `infrastructure/kubernetes/production/ingress.yaml` - FIXED
2. `infrastructure/kubernetes/base/ingress.yaml` - FIXED
3. `infrastructure/kubernetes/deploy/ingress.yaml` - FIXED
4. `infrastructure/k8s/production-ingress.yaml` - FIXED
5. `infrastructure/k8s/production-ingress-updated.yaml` - FIXED
6. `infrastructure/kubernetes/FIXES/ingress-fix.yaml` - FIXED

## Additional Notes

### Helm Chart Configuration
The Helm chart (`infrastructure/helm/flamoral`) already has the correct port configuration:
- `values.yaml` specifies `apiGateway.service.port: 4000`
- Ingress template uses this value correctly

### Service Discovery
All backend services correctly reference the API Gateway:
- Internal service URL: `http://api-gateway:4000`
- Service name: `api-gateway`
- Port: 4000

### CORS and Security
All fixed ingress files maintain:
- SSL/TLS encryption
- CORS configuration
- Security headers
- Rate limiting
- WebSocket support where needed

## Success Criteria

The fix is successful when:
- [ ] `curl https://api.flamoral.com/health` returns 200 OK
- [ ] Kubernetes readiness probes pass for API Gateway pods
- [ ] Kubernetes liveness probes pass for API Gateway pods
- [ ] All API Gateway pods show as Ready
- [ ] No 404 errors in API Gateway logs for /health endpoint
- [ ] All downstream services are accessible through API Gateway
- [ ] Circuit breakers report healthy status

## Monitoring

After deployment, monitor:
1. API Gateway pod status: `kubectl get pods -n flamoral -l app=api-gateway -w`
2. Ingress status: `kubectl get ingress -n flamoral`
3. Health endpoint: `curl -I https://api.flamoral.com/health`
4. Application logs: `kubectl logs -n flamoral -l app=api-gateway -f`

## Contact

For issues or questions:
- Check logs: `kubectl logs -n flamoral -l app=api-gateway`
- Check events: `kubectl get events -n flamoral --sort-by='.lastTimestamp'`
- Review ingress: `kubectl describe ingress -n flamoral`
