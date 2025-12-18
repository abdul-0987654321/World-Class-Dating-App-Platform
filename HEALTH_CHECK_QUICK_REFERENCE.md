# Kubernetes Health Check Quick Reference

## Quick Commands

### Connect to AKS Cluster
```bash
az aks get-credentials --resource-group flamoral-prod-rg --name flamoral-prod-aks
```

### View Current Configuration
```bash
# List all deployments
kubectl get deployments -n flamoral-dating

# Get health probe config for specific service
kubectl get deployment api-gateway -n flamoral-dating -o yaml | grep -A 10 "Probe"

# One-liner to see all health check paths
kubectl get deployments -n flamoral-dating -o json | jq -r '.items[] | "\(.metadata.name): liveness=\(.spec.template.spec.containers[0].livenessProbe.httpGet.path // "none") readiness=\(.spec.template.spec.containers[0].readinessProbe.httpGet.path // "none")"'
```

### Fix Single Service
```bash
# Example: Fix API Gateway
kubectl patch deployment api-gateway -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/health"}
]'
```

### Fix All Services
```bash
# Make script executable
chmod +x fix-health-checks.sh

# Run fix script
./fix-health-checks.sh
```

### Verify Health Checks
```bash
# Run verification script
chmod +x verify-health-checks.sh
./verify-health-checks.sh

# Manual verification
kubectl get pods -n flamoral-dating
kubectl get events -n flamoral-dating | grep -i health
```

### Test Health Endpoint
```bash
# Port-forward to service
kubectl port-forward -n flamoral-dating svc/api-gateway 8080:3000

# In another terminal, test endpoint
curl http://localhost:8080/health

# Or test from within a pod
kubectl exec -n flamoral-dating <pod-name> -- wget -qO- http://localhost:3000/health
```

### Monitor Rollout
```bash
# Watch all pods
kubectl get pods -n flamoral-dating -w

# Check specific deployment rollout
kubectl rollout status deployment/api-gateway -n flamoral-dating

# View recent events
kubectl get events -n flamoral-dating --sort-by='.lastTimestamp' | tail -20
```

### Troubleshooting
```bash
# Describe pod to see probe failures
kubectl describe pod <pod-name> -n flamoral-dating

# View logs
kubectl logs -n flamoral-dating <pod-name> --tail=100

# View previous container logs (if restarted)
kubectl logs -n flamoral-dating <pod-name> --previous

# Check endpoints
kubectl get endpoints -n flamoral-dating

# Exec into pod for debugging
kubectl exec -it <pod-name> -n flamoral-dating -- /bin/sh
```

### Rollback if Needed
```bash
# View rollout history
kubectl rollout history deployment/api-gateway -n flamoral-dating

# Rollback to previous version
kubectl rollout undo deployment/api-gateway -n flamoral-dating

# Rollback to specific revision
kubectl rollout undo deployment/api-gateway -n flamoral-dating --to-revision=2
```

## Service Port Reference

| Service | Port | Health Endpoint | Ready Endpoint |
|---------|------|-----------------|----------------|
| api-gateway | 3000 | /health | /health |
| user-service | 3001 | /health | /health |
| auth-service | 3002 | /health | /health |
| matching-service | 3003 | /health | /health |
| messaging-service | 3004 | /health | /health |
| media-service | 3005 | /health | /health |
| payment-service | 3006 | /health | /health |
| notification-service | 3007 | /health | /health |
| analytics-service | 3008 | /health | /health |
| moderation-service | 3009 | /health | /health |
| realtime-service | 3010 | /health | /health |
| admin-service | 3011 | /health | /health |
| advertising-service | 3012 | /health | /health |
| automation-service | 3013 | /health | /health |
| workflow-engine | 3014 | /health | /health |
| ai-recommendation-service | 5000 | /health | /ready |
| nlp-service | 5001 | /health | /ready |
| content-generator | 5002 | /health | /ready |

## Expected Probe Configuration

### Standard Services (Node.js/TypeScript)
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: <service-port>
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: <service-port>
  initialDelaySeconds: 15
  periodSeconds: 5
```

### AI Services (Python FastAPI)
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: <service-port>
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: <service-port>
  initialDelaySeconds: 20
  periodSeconds: 5
```

## Common Issues & Solutions

### Issue: Pods constantly restarting
**Cause**: Liveness probe failing
**Solution**:
```bash
# Check logs to see why health endpoint is failing
kubectl logs <pod-name> -n flamoral-dating

# Verify health endpoint path is correct
kubectl get deployment <service> -n flamoral-dating -o yaml | grep -A 5 livenessProbe

# Test endpoint manually
kubectl exec <pod-name> -n flamoral-dating -- wget -qO- http://localhost:<port>/health
```

### Issue: Pods exist but not receiving traffic
**Cause**: Readiness probe failing
**Solution**:
```bash
# Check readiness probe configuration
kubectl get deployment <service> -n flamoral-dating -o yaml | grep -A 5 readinessProbe

# Check endpoints (should show pod IPs if ready)
kubectl get endpoints <service> -n flamoral-dating

# Test readiness endpoint
kubectl exec <pod-name> -n flamoral-dating -- wget -qO- http://localhost:<port>/health
```

### Issue: 404 errors on health checks
**Cause**: Wrong health check path configured
**Solution**:
```bash
# Check current path
kubectl get deployment <service> -n flamoral-dating -o jsonpath='{.spec.template.spec.containers[0].livenessProbe.httpGet.path}'

# Fix with patch command
kubectl patch deployment <service> -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"}
]'
```

### Issue: Probe timing out
**Cause**: Service takes too long to respond
**Solution**:
```bash
# Increase timeout and initial delay
kubectl patch deployment <service> -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/initialDelaySeconds", "value": 60},
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/timeoutSeconds", "value": 10}
]'
```

## Health Check Best Practices

1. **Liveness Probe**: Should check if the application is alive (can respond to requests)
   - Use `/health` endpoint
   - Longer initial delay (30s) to allow app startup
   - Less frequent checks (10s period)

2. **Readiness Probe**: Should check if the application is ready to serve traffic
   - Use `/health` or `/ready` endpoint
   - Shorter initial delay (15s)
   - More frequent checks (5s period)
   - Can check database connections, cache availability, etc.

3. **Startup Probe**: For slow-starting applications
   - Prevents liveness probe from killing container during startup
   - Only needed for apps that take >60s to start

## Files

- **Detailed Documentation**: `KUBERNETES_HEALTH_CHECK_FIX.md`
- **Fix Script**: `fix-health-checks.sh`
- **Verification Script**: `verify-health-checks.sh`
- **This Reference**: `HEALTH_CHECK_QUICK_REFERENCE.md`

## Support

For detailed troubleshooting, see `KUBERNETES_HEALTH_CHECK_FIX.md`
