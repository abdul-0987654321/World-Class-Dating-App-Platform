# Quick Fix Guide - Auth Service 503 Error

## Problem
Auth endpoints return 503 Service Unavailable

## Root Cause
Missing service URL environment variables in API Gateway deployment

## Solution (3 Steps)

### 1. Edit `deployment.yaml`
File: `infrastructure/helm/flamoral/templates/deployment.yaml`

**Location**: Line ~51 (API Gateway container, after the `env:` section)

**Add**:
```yaml
          envFrom:
            - configMapRef:
                name: {{ $fullName }}-api-gateway-config
            - secretRef:
                name: {{ $fullName }}-secrets
                optional: true
```

### 2. Update `values.yaml`
File: `infrastructure/helm/flamoral/values.yaml`

**Append to end**:
```bash
cat values-additions.yaml >> values.yaml
```

### 3. Deploy
```bash
cd infrastructure/helm/flamoral

# Deploy
helm upgrade flamoral . -f values-prod.yaml --namespace production

# Restart API Gateway
kubectl rollout restart deployment/flamoral-api-gateway -n production

# Verify
kubectl exec -n production deployment/flamoral-api-gateway -- \
  env | grep AUTH_SERVICE_URL
```

## Verify Success
```bash
# Should show: http://flamoral-auth-service:3001
kubectl exec -n production deployment/flamoral-api-gateway -- \
  env | grep AUTH_SERVICE_URL

# Should return health status (not connection error)
kubectl exec -n production deployment/flamoral-api-gateway -- \
  wget -qO- http://flamoral-auth-service:3001/health

# Should return 401 Unauthorized (not 503)
curl -X POST https://api.flamoral.com/api/v1/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
```

## Files Already Created
✓ `templates/configmap.yaml` - Service URLs configuration
✓ `values-additions.yaml` - Configuration values to add
✓ `api-gateway-envFrom.patch` - Deployment patch reference
✓ `FIX-API-GATEWAY-ROUTING.md` - Detailed documentation
✓ `AUTH-ROUTING-FIX-SUMMARY.md` - Complete guide

## Need Help?
Check logs:
```bash
kubectl logs -n production deployment/flamoral-api-gateway --tail=100 -f
```

Look for:
- "Circuit authService CLOSED" ✓ Good
- "Circuit authService OPEN" ✗ Bad - check service connectivity
- "Response from authService: 200" ✓ Good
- "Connection refused" ✗ Bad - check environment variables
