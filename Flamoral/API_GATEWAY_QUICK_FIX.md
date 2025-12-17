# API Gateway /health 404 Fix - Quick Reference

## Problem
`api.flamoral.com/health` returns **404 Not Found**

## Root Cause
1. Ingress routes pointing to wrong port (80 instead of 4000)
2. Missing explicit `/health` route in ingress configurations
3. Route priority issues

## Quick Fix

### Method 1: Automated Deployment (Recommended)

**Linux/Mac:**
```bash
cd /path/to/Flamoral
chmod +x deploy-api-gateway-fix.sh
./deploy-api-gateway-fix.sh
```

**Windows PowerShell:**
```powershell
cd C:\Users\citad\OneDrive\Documents\Dating\Flamoral
.\deploy-api-gateway-fix.ps1
```

### Method 2: Manual Deployment

```bash
# Apply the production ingress fix
kubectl apply -f infrastructure/kubernetes/production/ingress.yaml

# Verify it was applied
kubectl get ingress -n flamoral flamoral-main-ingress -o yaml | grep -A5 "/health"

# Check pods are running
kubectl get pods -n flamoral -l app=api-gateway

# Test the health endpoint
curl https://api.flamoral.com/health
```

## Files Fixed

All ingress files have been corrected:
1. `infrastructure/kubernetes/production/ingress.yaml` ✅
2. `infrastructure/kubernetes/base/ingress.yaml` ✅
3. `infrastructure/kubernetes/deploy/ingress.yaml` ✅
4. `infrastructure/k8s/production-ingress.yaml` ✅
5. `infrastructure/k8s/production-ingress-updated.yaml` ✅
6. `infrastructure/kubernetes/FIXES/ingress-fix.yaml` ✅

## Key Changes

### Before (BROKEN):
```yaml
- host: api.flamoral.com
  paths:
  - path: /
    backend:
      service:
        name: api-gateway
        port:
          number: 80  # WRONG
```

### After (FIXED):
```yaml
- host: api.flamoral.com
  paths:
  - path: /health  # NEW - explicit health route
    backend:
      service:
        name: api-gateway
        port:
          number: 4000  # CORRECT
  - path: /
    backend:
      service:
        name: api-gateway
        port:
          number: 4000  # CORRECT
```

## Verification

### 1. Test Locally (Port Forward)
```bash
kubectl port-forward -n flamoral svc/api-gateway 4000:4000
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "ok",
  "info": {
    "memory_heap": { "status": "up" },
    "memory_rss": { "status": "up" }
  }
}
```

### 2. Test via Ingress
```bash
curl -v https://api.flamoral.com/health
```

Expected: **HTTP 200 OK**

### 3. Check Kubernetes Probes
```bash
# Check pod status
kubectl get pods -n flamoral -l app=api-gateway

# Should show: Ready 1/1, Status Running

# Check events
kubectl describe pod -n flamoral -l app=api-gateway | grep -A10 Events
```

## Available Health Endpoints

After the fix, all these endpoints work:

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe (checks dependencies)
- `GET /health/live` - Liveness probe (process health)
- `GET /health/services` - Deep health check (all services)
- `GET /health/circuits` - Circuit breaker status
- `GET /health/metrics` - Detailed metrics

## Rollback

If issues occur:
```bash
# Rollback ingress
kubectl rollout undo ingress/flamoral-main-ingress -n flamoral

# Or for Helm deployments
helm rollback flamoral -n flamoral
```

## Troubleshooting

### Still Getting 404?

1. **Check ingress was applied:**
   ```bash
   kubectl get ingress -n flamoral flamoral-main-ingress -o yaml
   ```
   Look for `/health` path and port `4000`

2. **Check API Gateway is running:**
   ```bash
   kubectl get pods -n flamoral -l app=api-gateway
   ```
   Should show Ready 1/1

3. **Check logs:**
   ```bash
   kubectl logs -n flamoral -l app=api-gateway --tail=100
   ```

4. **Check service:**
   ```bash
   kubectl get svc -n flamoral api-gateway
   ```
   Should show port 4000

5. **Test directly to pod:**
   ```bash
   # Get pod name
   POD=$(kubectl get pods -n flamoral -l app=api-gateway -o jsonpath='{.items[0].metadata.name}')

   # Port forward to pod
   kubectl port-forward -n flamoral $POD 4000:4000

   # Test
   curl http://localhost:4000/health
   ```

### DNS Issues?

If `api.flamoral.com` doesn't resolve:
```bash
# Check DNS
nslookup api.flamoral.com

# Check ingress IP
kubectl get ingress -n flamoral

# Test with IP directly
curl http://<INGRESS-IP>/health -H "Host: api.flamoral.com"
```

### SSL/TLS Issues?

```bash
# Check certificate
kubectl get secret -n flamoral flamoral-tls

# Check cert-manager
kubectl get certificate -n flamoral

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager
```

## Success Criteria

✅ `curl https://api.flamoral.com/health` returns 200 OK
✅ API Gateway pods show Ready 1/1
✅ Kubernetes readiness probes pass
✅ Kubernetes liveness probes pass
✅ No 404 errors in logs for /health

## Complete Documentation

For full details, see: `API_GATEWAY_ROUTING_FIX_COMPLETE.md`

## Need Help?

Check these resources:
1. API Gateway logs: `kubectl logs -n flamoral -l app=api-gateway`
2. Ingress logs: `kubectl logs -n flamoral -l app.kubernetes.io/name=ingress-nginx`
3. Cluster events: `kubectl get events -n flamoral --sort-by='.lastTimestamp'`
