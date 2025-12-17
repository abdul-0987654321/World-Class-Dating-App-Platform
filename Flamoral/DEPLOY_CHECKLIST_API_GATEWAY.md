# API Gateway Routing Fix - Deployment Checklist

## Pre-Deployment Checklist

### Environment Verification
- [ ] Connected to correct Kubernetes cluster
- [ ] kubectl is installed and working
- [ ] Have necessary cluster permissions
- [ ] Namespace 'flamoral' exists
- [ ] API Gateway pods are currently running (check baseline)

### Backup Current Configuration
```bash
# Backup current ingress
kubectl get ingress -n flamoral flamoral-main-ingress -o yaml > ingress-backup-$(date +%Y%m%d-%H%M%S).yaml

# Backup current pod state
kubectl get pods -n flamoral -o yaml > pods-backup-$(date +%Y%m%d-%H%M%S).yaml
```

- [ ] Ingress configuration backed up
- [ ] Pod state documented

## Deployment Steps

### Step 1: Deploy Ingress Fixes

**Option A - Automated (Recommended):**
```bash
# Linux/Mac
./deploy-api-gateway-fix.sh

# Windows PowerShell
.\deploy-api-gateway-fix.ps1
```
- [ ] Deployment script executed successfully

**Option B - Manual:**
```bash
kubectl apply -f infrastructure/kubernetes/production/ingress.yaml
```
- [ ] Ingress applied successfully

### Step 2: Wait for Propagation
```bash
# Wait 30 seconds for ingress to update
sleep 30
```
- [ ] Waited for ingress propagation

### Step 3: Verify Ingress Configuration
```bash
# Check ingress was updated
kubectl get ingress -n flamoral flamoral-main-ingress -o yaml | grep -A10 "/health"
```

Expected output should show:
```yaml
- path: /health
  pathType: Prefix
  backend:
    service:
      name: api-gateway
      port:
        number: 4000
```

- [ ] Ingress shows /health route
- [ ] Ingress shows port 4000
- [ ] /health route is FIRST in the path list

## Post-Deployment Verification

### Step 1: Check Pod Status
```bash
kubectl get pods -n flamoral -l app=api-gateway
```

Expected output:
```
NAME                           READY   STATUS    RESTARTS   AGE
api-gateway-xxxxxxxxxx-xxxxx   1/1     Running   0          Xm
```

- [ ] Pods show Ready 1/1
- [ ] Pods show Status Running
- [ ] No excessive restarts

### Step 2: Check Service
```bash
kubectl get svc -n flamoral api-gateway
```

Expected output should show port 4000:
```
NAME          TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)    AGE
api-gateway   ClusterIP   10.x.x.x       <none>        4000/TCP   Xd
```

- [ ] Service exists
- [ ] Port is 4000
- [ ] Service type is ClusterIP

### Step 3: Check Health Probes
```bash
kubectl describe pod -n flamoral -l app=api-gateway | grep -A5 "Liveness\|Readiness"
```

Expected: Both probes should be passing

- [ ] Liveness probe passing
- [ ] Readiness probe passing
- [ ] No probe failures in events

### Step 4: Check Pod Logs
```bash
kubectl logs -n flamoral -l app=api-gateway --tail=50
```

Check for:
- [ ] No 404 errors for /health
- [ ] No connection errors
- [ ] No unusual error messages

### Step 5: Test Health Endpoint Locally
```bash
# Port forward to API Gateway
kubectl port-forward -n flamoral svc/api-gateway 4000:4000 &
PF_PID=$!

# Wait a moment
sleep 2

# Test health endpoint
curl -v http://localhost:4000/health

# Kill port forward
kill $PF_PID
```

Expected response:
- [ ] HTTP 200 OK status
- [ ] JSON response with status "ok"
- [ ] No connection errors

### Step 6: Test via Ingress (Critical)
```bash
# Test health endpoint through ingress
curl -v https://api.flamoral.com/health
```

Expected response:
- [ ] HTTP 200 OK status (not 404)
- [ ] JSON response with health status
- [ ] SSL certificate valid
- [ ] Response time < 1 second

### Step 7: Test All Health Endpoints
```bash
# Test basic health
curl https://api.flamoral.com/health

# Test readiness
curl https://api.flamoral.com/health/ready

# Test liveness
curl https://api.flamoral.com/health/live

# Test services health
curl https://api.flamoral.com/health/services

# Test circuit breakers
curl https://api.flamoral.com/health/circuits
```

- [ ] /health returns 200 OK
- [ ] /health/ready returns 200 OK
- [ ] /health/live returns 200 OK
- [ ] /health/services returns data
- [ ] /health/circuits returns data

### Step 8: Test API Routes
```bash
# Test API route (if you have auth token)
curl https://api.flamoral.com/api/v1/users

# Should get 401 Unauthorized (not 404) if not authenticated
# 404 means routing is still broken
```

- [ ] API routes accessible (401 or valid response, NOT 404)
- [ ] No routing errors

### Step 9: Monitor for Issues
```bash
# Watch pods for 2 minutes
kubectl get pods -n flamoral -l app=api-gateway -w

# In another terminal, watch logs
kubectl logs -n flamoral -l app=api-gateway -f
```

Watch for:
- [ ] Pods remain stable (no restarts)
- [ ] No error messages in logs
- [ ] Health checks continue passing

### Step 10: Check Ingress Controller Logs
```bash
kubectl logs -n flamoral -l app.kubernetes.io/name=ingress-nginx --tail=100
```

Check for:
- [ ] No errors routing to api-gateway
- [ ] Health endpoint requests successful
- [ ] No upstream connection errors

## Troubleshooting

### If Health Endpoint Still Returns 404

1. **Verify ingress was actually updated:**
   ```bash
   kubectl get ingress -n flamoral flamoral-main-ingress -o yaml
   ```
   - Look for `/health` path
   - Verify port is 4000

2. **Restart ingress controller:**
   ```bash
   kubectl rollout restart deployment -n flamoral ingress-nginx-controller
   ```

3. **Check ingress class:**
   ```bash
   kubectl get ingress -n flamoral flamoral-main-ingress -o jsonpath='{.spec.ingressClassName}'
   ```
   - Should be "nginx"

4. **Test directly to pod:**
   ```bash
   POD=$(kubectl get pods -n flamoral -l app=api-gateway -o jsonpath='{.items[0].metadata.name}')
   kubectl exec -n flamoral $POD -- curl localhost:4000/health
   ```

### If Pods Are Not Ready

1. **Check probe configuration:**
   ```bash
   kubectl describe pod -n flamoral -l app=api-gateway
   ```

2. **Check pod logs:**
   ```bash
   kubectl logs -n flamoral -l app=api-gateway
   ```

3. **Verify service endpoints:**
   ```bash
   kubectl get endpoints -n flamoral api-gateway
   ```

### If SSL/TLS Errors

1. **Check certificate:**
   ```bash
   kubectl get certificate -n flamoral
   kubectl describe certificate -n flamoral flamoral-tls
   ```

2. **Check cert-manager:**
   ```bash
   kubectl logs -n cert-manager -l app=cert-manager
   ```

## Rollback Procedure

If critical issues occur:

### Quick Rollback
```bash
# Rollback ingress
kubectl rollout undo ingress/flamoral-main-ingress -n flamoral

# Verify rollback
kubectl get ingress -n flamoral flamoral-main-ingress -o yaml

# Test health endpoint
curl https://api.flamoral.com/health
```

### Restore from Backup
```bash
# Find your backup file
ls -lt ingress-backup-*.yaml | head -1

# Apply backup
kubectl apply -f ingress-backup-YYYYMMDD-HHMMSS.yaml

# Verify
kubectl get ingress -n flamoral
```

- [ ] Rollback executed if needed
- [ ] Service restored to previous state
- [ ] Issue documented for analysis

## Success Criteria

All of the following must be true:

- [ ] ✅ `curl https://api.flamoral.com/health` returns HTTP 200 OK
- [ ] ✅ Response contains valid JSON health status
- [ ] ✅ All API Gateway pods show Ready 1/1
- [ ] ✅ Kubernetes readiness probes passing
- [ ] ✅ Kubernetes liveness probes passing
- [ ] ✅ No 404 errors in pod logs for /health
- [ ] ✅ Ingress shows /health route on port 4000
- [ ] ✅ All health endpoints accessible
- [ ] ✅ API routes return proper responses (401 or data, not 404)
- [ ] ✅ No errors in ingress controller logs

## Post-Deployment Tasks

### Documentation
- [ ] Update deployment notes with actual deployment time
- [ ] Document any issues encountered
- [ ] Update runbook if needed

### Monitoring
- [ ] Set up monitoring alert for /health endpoint
- [ ] Verify existing monitors still work
- [ ] Check dashboard shows healthy status

### Communication
- [ ] Notify team deployment is complete
- [ ] Report health endpoint status
- [ ] Document any lessons learned

## Sign-Off

- Deployed by: ___________________________
- Date/Time: ___________________________
- Deployment successful: [ ] Yes [ ] No
- Rollback required: [ ] Yes [ ] No
- Notes: ___________________________________________________________________

## Reference Documents

- **Comprehensive Guide:** `API_GATEWAY_ROUTING_FIX_COMPLETE.md`
- **Quick Reference:** `API_GATEWAY_QUICK_FIX.md`
- **Fix Summary:** `FIX_SUMMARY_API_ROUTING.md`
- **Deployment Scripts:**
  - Linux/Mac: `deploy-api-gateway-fix.sh`
  - Windows: `deploy-api-gateway-fix.ps1`

## Emergency Contacts

- Kubernetes Cluster: Check cluster documentation
- API Gateway: Review pod logs and health endpoints
- Ingress Controller: Check ingress-nginx logs

---

**IMPORTANT:** Do not skip verification steps. Each step ensures the fix is properly applied and working.
