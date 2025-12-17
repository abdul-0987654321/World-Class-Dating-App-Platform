# Deployment Checklist - Auth Service Routing Fix

## Pre-Deployment Verification

- [ ] Working directory: `C:/Users/citad/OneDrive/Documents/Dating/Flamoral`
- [ ] All fix files present in correct locations
- [ ] kubectl access to production cluster verified: `kubectl get nodes`
- [ ] Helm installed: `helm version`
- [ ] Current Helm release status checked: `helm list -n production`

## Code Changes

### 1. ConfigMap Creation
- [x] File created: `infrastructure/helm/flamoral/templates/configmap.yaml`
- [x] Contains all service URLs with Kubernetes DNS names
- [x] Includes circuit breaker, proxy, timeout, CORS, and rate limit config

### 2. Deployment Update
- [ ] File to edit: `infrastructure/helm/flamoral/templates/deployment.yaml`
- [ ] Located API Gateway deployment section (lines 8-67)
- [ ] Found env: section (around line 47-51)
- [ ] Added envFrom: section after env: section
- [ ] Verified indentation matches (10 spaces before envFrom:)
- [ ] Referenced ConfigMap: `{{ $fullName }}-api-gateway-config`
- [ ] Referenced secrets (optional): `{{ $fullName }}-secrets`

**Code to add**:
```yaml
          envFrom:
            - configMapRef:
                name: {{ $fullName }}-api-gateway-config
            - secretRef:
                name: {{ $fullName }}-secrets
                optional: true
```

### 3. Values Update
- [ ] File to edit: `infrastructure/helm/flamoral/values.yaml`
- [ ] Opened file in text editor
- [ ] Scrolled to end of file (after line 376)
- [ ] Appended content from `values-additions.yaml`
- [ ] Verified YAML formatting is correct (no tabs, proper indentation)

**Quick method**:
```bash
cd infrastructure/helm/flamoral
cat values-additions.yaml >> values.yaml
```

## Deployment Steps

### Phase 1: Validate Changes
- [ ] Helm template renders correctly:
  ```bash
  cd infrastructure/helm/flamoral
  helm template flamoral . -f values-prod.yaml > /tmp/rendered.yaml
  ```
- [ ] Check rendered ConfigMap exists in output:
  ```bash
  grep -A 10 "api-gateway-config" /tmp/rendered.yaml
  ```
- [ ] Check deployment has envFrom:
  ```bash
  grep -A 5 "envFrom" /tmp/rendered.yaml
  ```
- [ ] No YAML syntax errors in output

### Phase 2: Deploy to Production
- [ ] Create backup of current deployment:
  ```bash
  kubectl get deployment flamoral-api-gateway -n production -o yaml > /tmp/api-gateway-backup.yaml
  ```
- [ ] Deploy Helm upgrade:
  ```bash
  helm upgrade flamoral . \
    -f values-prod.yaml \
    --namespace production \
    --wait \
    --timeout 10m
  ```
- [ ] Deployment successful (exit code 0)
- [ ] No error messages in output

### Phase 3: Verify Deployment
- [ ] ConfigMap created:
  ```bash
  kubectl get configmap flamoral-api-gateway-config -n production
  ```
- [ ] ConfigMap has correct data:
  ```bash
  kubectl get configmap flamoral-api-gateway-config -n production -o yaml | grep AUTH_SERVICE_URL
  ```
- [ ] Expected output: `AUTH_SERVICE_URL: "http://flamoral-auth-service:3001"`

### Phase 4: Restart Services
- [ ] Restart API Gateway deployment:
  ```bash
  kubectl rollout restart deployment/flamoral-api-gateway -n production
  ```
- [ ] Wait for rollout:
  ```bash
  kubectl rollout status deployment/flamoral-api-gateway -n production
  ```
- [ ] All pods running:
  ```bash
  kubectl get pods -n production -l app.kubernetes.io/component=api-gateway
  ```
- [ ] All pods show `Running` status with `2/2` ready

### Phase 5: Verify Environment
- [ ] Get pod name:
  ```bash
  POD=$(kubectl get pods -n production -l app.kubernetes.io/component=api-gateway -o jsonpath='{.items[0].metadata.name}')
  echo $POD
  ```
- [ ] Check AUTH_SERVICE_URL:
  ```bash
  kubectl exec -n production $POD -- env | grep AUTH_SERVICE_URL
  ```
- [ ] Expected: `AUTH_SERVICE_URL=http://flamoral-auth-service:3001`
- [ ] Check circuit breaker config:
  ```bash
  kubectl exec -n production $POD -- env | grep CIRCUIT_
  ```
- [ ] Expected: Multiple CIRCUIT_* variables set

### Phase 6: Test Connectivity
- [ ] Health check from API Gateway to Auth Service:
  ```bash
  kubectl exec -n production $POD -- wget -qO- http://flamoral-auth-service:3001/health
  ```
- [ ] Expected: JSON response with `"status":"healthy"`
- [ ] No connection errors

### Phase 7: External Testing
- [ ] Test login endpoint (should fail auth, not service):
  ```bash
  curl -v -X POST https://api.flamoral.com/api/v1/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  ```
- [ ] Expected status: `401 Unauthorized` (NOT 503)
- [ ] Response body contains auth error (NOT circuit breaker error)

### Phase 8: Log Verification
- [ ] Check recent logs:
  ```bash
  kubectl logs -n production deployment/flamoral-api-gateway --tail=50
  ```
- [ ] Look for successful proxy logs:
  - `[<id>] Proxying POST /api/auth/login to authService`
  - `[<id>] Response from authService: 200|401|400 (<time>ms)`
- [ ] NO errors like:
  - `Connection refused`
  - `ECONNREFUSED`
  - `Circuit breaker fallback triggered`
  - `Circuit authService OPEN`

### Phase 9: Circuit Breaker Status
- [ ] Check circuit breaker state:
  ```bash
  kubectl logs -n production deployment/flamoral-api-gateway --tail=100 | grep -i "circuit.*authService"
  ```
- [ ] Expected: `Circuit authService CLOSED` or no circuit messages (good)
- [ ] NOT expected: `Circuit authService OPEN` (bad)

### Phase 10: Run Verification Script
- [ ] Make script executable:
  ```bash
  chmod +x verify-auth-fix.sh
  ```
- [ ] Run verification:
  ```bash
  ./verify-auth-fix.sh production
  ```
- [ ] All checks pass ✓
- [ ] No critical failures ✗

## Post-Deployment Monitoring

### First Hour
- [ ] Monitor logs continuously:
  ```bash
  kubectl logs -n production deployment/flamoral-api-gateway -f
  ```
- [ ] Watch for circuit breaker messages
- [ ] Verify auth requests succeeding
- [ ] No 503 errors reported

### First Day
- [ ] Check metrics dashboard (if available)
- [ ] Verify auth service response times normal
- [ ] Check circuit breaker metrics
- [ ] Monitor error rates
- [ ] Verify no user complaints about auth failures

### Error Handling
If issues occur:
- [ ] Check circuit breaker status
- [ ] Verify environment variables still set
- [ ] Check auth service health
- [ ] Review logs for new errors
- [ ] Test connectivity between services
- [ ] Consider manual circuit reset if stuck OPEN

## Rollback Plan (If Needed)

### Quick Rollback
- [ ] Rollback Helm release:
  ```bash
  helm rollback flamoral -n production
  ```
- [ ] Verify rollback successful:
  ```bash
  kubectl rollout status deployment/flamoral-api-gateway -n production
  ```

### Manual Rollback
- [ ] Restore deployment from backup:
  ```bash
  kubectl apply -f /tmp/api-gateway-backup.yaml
  ```
- [ ] Delete ConfigMap:
  ```bash
  kubectl delete configmap flamoral-api-gateway-config -n production
  ```

## Success Criteria

- [x] All code changes completed
- [ ] Helm upgrade deployed successfully
- [ ] ConfigMap created with correct service URLs
- [ ] API Gateway pods restarted and running
- [ ] Environment variables correctly set in pods
- [ ] Auth service reachable from API Gateway
- [ ] External auth endpoints return proper HTTP codes (not 503)
- [ ] Circuit breaker remains CLOSED
- [ ] Logs show successful service communication
- [ ] No 503 errors in production
- [ ] User authentication working normally

## Sign-off

**Deployed by**: _________________
**Date**: _________________
**Time**: _________________
**Verified by**: _________________
**Notes**: _________________________________________________

## Support Contacts

- **Documentation**: See `AUTH-ROUTING-FIX-SUMMARY.md` for detailed info
- **Quick Reference**: See `QUICK-FIX-GUIDE.md` for fast commands
- **Troubleshooting**: Check logs and connectivity using verification script

## Additional Resources

| File | Description |
|------|-------------|
| `FIX-API-GATEWAY-ROUTING.md` | Complete technical documentation |
| `AUTH-ROUTING-FIX-SUMMARY.md` | Executive summary and deployment guide |
| `QUICK-FIX-GUIDE.md` | Quick reference for commands |
| `verify-auth-fix.sh` | Automated verification script |
| `templates/configmap.yaml` | ConfigMap template (created) |
| `values-additions.yaml` | Configuration values to add |
| `api-gateway-envFrom.patch` | Deployment patch reference |
| `deployment-patch.yaml` | Human-readable patch guide |
