# Authentication Service Routing Fix - Summary

## Problem Statement
Auth endpoints at `https://api.flamoral.com/api/v1/api/auth/*` return **503 Service Unavailable** instead of proper responses.

### Symptoms
- Auth service pods: **RUNNING (2/2 healthy)** ✓
- Auth service health check: **PASSES internally** ✓
- Database connection: **SUCCESSFUL** ✓
- Redis connection: **SUCCESSFUL** ✓
- External API calls: **FAIL with 503** ✗
- Circuit breaker: **OPENS due to connection failures** ✗

## Root Cause
The API Gateway Kubernetes deployment is **missing environment variables** that specify service URLs for inter-service communication.

### Technical Details

1. **Expected Configuration**:
   - Auth service runs at: `http://flamoral-auth-service:3001` (Kubernetes DNS)
   - API Gateway's `configuration.ts` expects: `process.env.AUTH_SERVICE_URL`

2. **Actual Configuration**:
   - `AUTH_SERVICE_URL` environment variable: **NOT SET**
   - Configuration fallback: `http://localhost:3001`
   - Result: Connection to `localhost:3001` fails in Kubernetes

3. **Cascading Failure**:
   ```
   API Gateway → tries localhost:3001 → Connection Refused
   → Retry fails → Circuit Breaker counts failure
   → After 5 failures → Circuit opens
   → All subsequent requests → Fail fast with 503
   ```

## Solution Overview

### Files Created/Modified

1. **`infrastructure/helm/flamoral/templates/configmap.yaml`** (NEW)
   - Creates ConfigMap with all service URLs using Kubernetes DNS
   - Includes circuit breaker, proxy, timeout, and rate limit configuration

2. **`infrastructure/helm/flamoral/templates/deployment.yaml`** (MODIFY)
   - Add `envFrom` section to API Gateway container
   - Reference the ConfigMap for environment variables

3. **`infrastructure/helm/flamoral/values.yaml`** (MODIFY)
   - Add default configuration values
   - Copy from `values-additions.yaml`

### Key Changes

#### 1. ConfigMap (Already Created)
Location: `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/helm/flamoral/templates/configmap.yaml`

**What it does**: Provides environment variables with correct Kubernetes DNS names:
```yaml
AUTH_SERVICE_URL: "http://flamoral-auth-service:3001"
USER_SERVICE_URL: "http://flamoral-user-service:3002"
# ... etc for all services
```

#### 2. Deployment Update (NEEDS MANUAL EDIT)
Location: `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/helm/flamoral/templates/deployment.yaml`

**Line to modify**: Around line 51, after the `env:` section in API Gateway container

**Add these lines**:
```yaml
          envFrom:
            - configMapRef:
                name: {{ $fullName }}-api-gateway-config
            - secretRef:
                name: {{ $fullName }}-secrets
                optional: true
```

**Reference patch file**: `api-gateway-envFrom.patch`

#### 3. Values Update (NEEDS MANUAL EDIT)
Location: `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/helm/flamoral/values.yaml`

**Append to end of file**: Content from `values-additions.yaml`

This adds:
- Circuit breaker configuration
- Proxy settings
- Service timeouts
- CORS configuration
- Logging settings
- Rate limiting rules

## Deployment Instructions

### Step 1: Apply Code Changes

```bash
# Navigate to Helm chart directory
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/helm/flamoral

# Edit deployment.yaml manually (or apply patch)
# Add the envFrom section to API Gateway deployment as shown above

# Append values-additions.yaml to values.yaml
cat values-additions.yaml >> values.yaml
```

### Step 2: Deploy to Production

```bash
# Upgrade the Helm release
helm upgrade flamoral . \
  -f values-prod.yaml \
  --namespace production \
  --wait \
  --timeout 10m

# Verify ConfigMap was created
kubectl get configmap -n production | grep api-gateway-config

# Check ConfigMap content
kubectl describe configmap flamoral-api-gateway-config -n production
```

### Step 3: Restart API Gateway Pods

```bash
# Restart to pick up new environment variables
kubectl rollout restart deployment/flamoral-api-gateway -n production

# Wait for rollout to complete
kubectl rollout status deployment/flamoral-api-gateway -n production

# Verify pods are running
kubectl get pods -n production -l app.kubernetes.io/component=api-gateway
```

### Step 4: Verify Environment Variables

```bash
# Check environment variables are set correctly
kubectl exec -n production deployment/flamoral-api-gateway -- env | grep -E "SERVICE_URL|CIRCUIT_"

# Expected output should include:
# AUTH_SERVICE_URL=http://flamoral-auth-service:3001
# USER_SERVICE_URL=http://flamoral-user-service:3002
# CIRCUIT_FAILURE_THRESHOLD=5
# ... etc
```

### Step 5: Test Auth Service Connectivity

```bash
# Test from within API Gateway pod
kubectl exec -n production deployment/flamoral-api-gateway -- \
  wget -qO- http://flamoral-auth-service:3001/health

# Expected: {"status":"healthy","service":"auth-service",...}

# Test external endpoint
curl -X POST https://api.flamoral.com/api/v1/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}'

# Expected: 401 Unauthorized (not 503!)
# This confirms routing works, auth just failed (as expected with wrong password)
```

### Step 6: Monitor Logs

```bash
# Watch API Gateway logs
kubectl logs -n production deployment/flamoral-api-gateway --tail=50 -f

# Look for successful proxy logs:
# [<request-id>] Proxying POST /api/auth/login to authService
# [<request-id>] Response from authService: 200 (45ms)

# Check circuit breaker status
kubectl logs -n production deployment/flamoral-api-gateway --tail=100 | grep -i circuit

# Should show CLOSED state:
# Circuit authService CLOSED - service healthy
```

## Verification Checklist

- [ ] ConfigMap template exists at `templates/configmap.yaml`
- [ ] Deployment.yaml updated with `envFrom` section
- [ ] values.yaml updated with configuration sections
- [ ] Helm upgrade completed successfully
- [ ] ConfigMap created in production namespace
- [ ] API Gateway pods restarted and running
- [ ] Environment variables set correctly in pods
- [ ] Auth service reachable from API Gateway pod
- [ ] External auth endpoints return proper responses (not 503)
- [ ] Circuit breaker status shows CLOSED
- [ ] Logs show successful service-to-service communication

## Expected Results

### Before Fix
```
Request: POST /api/v1/api/auth/login
Response: 503 Service Unavailable
{
  "statusCode": 503,
  "error": "Service Unavailable",
  "message": "Critical service authService is temporarily unavailable",
  "circuitState": "OPEN"
}
```

### After Fix
```
Request: POST /api/v1/api/auth/login
Response: 401 Unauthorized (or 200 OK with valid credentials)
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

## Troubleshooting

### Issue: ConfigMap not found
**Solution**: Verify Helm upgrade completed successfully
```bash
kubectl get configmap -n production
helm list -n production
```

### Issue: Pods not picking up new environment
**Solution**: Force pod recreation
```bash
kubectl rollout restart deployment/flamoral-api-gateway -n production
kubectl delete pods -n production -l app.kubernetes.io/component=api-gateway
```

### Issue: Still getting 503 errors
**Check**:
1. Environment variables are set: `kubectl exec ... -- env | grep SERVICE_URL`
2. Auth service is running: `kubectl get pods -n production -l app.kubernetes.io/component=auth-service`
3. Network connectivity: `kubectl exec ... -- wget -O- http://flamoral-auth-service:3001/health`
4. Circuit breaker state: Check logs for "Circuit ... OPEN"

**Manual circuit reset** (if needed):
```bash
# The circuit breaker will automatically reset after 15 seconds
# Or check if there's an admin endpoint to manually reset:
kubectl exec -n production deployment/flamoral-api-gateway -- \
  wget -qO- http://localhost:3000/admin/circuit-breaker/reset/authService
```

### Issue: Auth service unreachable
**Check**:
1. Service exists: `kubectl get svc flamoral-auth-service -n production`
2. Endpoints exist: `kubectl get endpoints flamoral-auth-service -n production`
3. DNS resolution: `kubectl exec ... -- nslookup flamoral-auth-service`

## Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `templates/configmap.yaml` | Service URLs and configuration | ✓ Created |
| `templates/deployment.yaml` | API Gateway deployment | ⚠️ Needs manual edit |
| `values.yaml` | Default configuration values | ⚠️ Needs manual edit |
| `values-additions.yaml` | Values to append | ✓ Created (reference) |
| `api-gateway-envFrom.patch` | Patch file for deployment | ✓ Created (reference) |
| `deployment-patch.yaml` | Human-readable patch guide | ✓ Created (reference) |
| `FIX-API-GATEWAY-ROUTING.md` | Detailed fix documentation | ✓ Created |

## Technical Architecture

### Service Communication Flow (After Fix)

```
External Request
    ↓
NGINX Ingress
    ↓
API Gateway (port 3000)
    ↓ reads ENV: AUTH_SERVICE_URL
    ↓
Proxy Service
    ↓ HTTP request
    ↓
http://flamoral-auth-service:3001
    ↓
Auth Service Pod (port 3001)
    ↓ /api/auth/login
    ↓
Response ← 200 OK
```

### Circuit Breaker States

1. **CLOSED** (Normal): All requests go through
2. **OPEN** (Failed): Requests fail fast with 503
3. **HALF_OPEN** (Testing): Limited requests allowed to test recovery

After fix, circuit should remain **CLOSED** because connections succeed.

## Support

For questions or issues:
1. Check logs: `kubectl logs -n production deployment/flamoral-api-gateway -f`
2. Review circuit breaker metrics in logs
3. Verify service connectivity with `kubectl exec`
4. Check pod health: `kubectl get pods -n production`

## Success Criteria

✓ Auth endpoints respond with proper HTTP status codes (200, 401, 400, etc.)
✓ No 503 Service Unavailable errors
✓ Circuit breaker remains CLOSED
✓ Logs show successful service-to-service communication
✓ Auth service health checks pass
✓ User registration and login work correctly

---

**Last Updated**: 2025-12-15
**Status**: Ready for Deployment
**Tested**: Configuration validated, awaiting production deployment
