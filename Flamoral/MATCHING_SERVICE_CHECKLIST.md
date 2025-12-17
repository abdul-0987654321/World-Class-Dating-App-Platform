# matching-service Deployment Checklist

## Pre-Deployment Fixes (Required)

- [ ] Run fix script: `.\apply-typescript-fixes.ps1` OR `bash apply-typescript-fixes.sh` OR double-click `fix-now.bat`
- [ ] Verify shared package builds: `cd backend/shared && npm run build`
- [ ] Verify matching-service builds: `cd backend/services/matching-service && npm run build`
- [ ] Review changes in git: `git diff`
- [ ] Commit fixes: `git add . && git commit -m "fix: resolve TypeScript errors in matching-service"`

## Build & Test

- [ ] Run unit tests (if any): `npm test`
- [ ] Build Docker image: `docker build -t matching-service:latest .`
- [ ] Test Docker image locally: `docker run --rm -p 3003:3003 matching-service:latest`
- [ ] Verify health endpoint: `curl http://localhost:3003/health`

## Pre-Deployment Configuration

- [ ] Update environment variables in Kubernetes ConfigMap/Secret
- [ ] Verify database connection string
- [ ] Verify Redis connection (for caching)
- [ ] Verify service URLs for:
  - [ ] user-service
  - [ ] analytics-service
  - [ ] notification-service
- [ ] Set JWT_ACCESS_SECRET

## Kubernetes Deployment

- [ ] Apply Kubernetes manifests: `kubectl apply -f k8s/`
- [ ] Verify deployment: `kubectl get deployments -n flamoral`
- [ ] Check pod status: `kubectl get pods -n flamoral | grep matching-service`
- [ ] View logs: `kubectl logs -f deployment/matching-service -n flamoral`
- [ ] Verify service is accessible: `kubectl get svc matching-service -n flamoral`

## Post-Deployment Verification

- [ ] Health check passes: `curl http://matching-service/health`
- [ ] Test API endpoints:
  - [ ] GET /api/matches (get matches for user)
  - [ ] POST /api/swipes (swipe on profile)
  - [ ] GET /api/recommendations (get recommendations)
  - [ ] POST /api/boost/activate (activate profile boost)
  - [ ] POST /api/super-like (send super like)
  - [ ] GET /api/insights (get profile insights)
- [ ] Check database connectivity
- [ ] Verify analytics events are being tracked
- [ ] Verify notifications are being sent
- [ ] Monitor error logs for first 30 minutes

## Integration Tests

- [ ] Test matching algorithm works
- [ ] Test swipe functionality
- [ ] Test profile boost activation
- [ ] Test super like with message
- [ ] Test insights tracking
- [ ] Test recommendation generation
- [ ] Verify matches are created correctly
- [ ] Verify compatibility scores calculate properly

## Monitoring Setup

- [ ] Configure Prometheus metrics collection
- [ ] Set up Grafana dashboards
- [ ] Configure alerts for:
  - [ ] High error rate
  - [ ] High latency
  - [ ] Pod restarts
  - [ ] Database connection issues
  - [ ] External service failures

## Success Criteria

✅ All pods are running and healthy
✅ No error logs in first 30 minutes
✅ All API endpoints respond correctly
✅ Integration tests pass
✅ Service can connect to all dependencies
✅ Metrics are being collected
✅ No performance degradation

---

## Quick Commands Reference

### View Logs
```bash
kubectl logs -f deployment/matching-service -n flamoral
```

### Describe Pod
```bash
kubectl describe pod <pod-name> -n flamoral
```

### Check Service
```bash
kubectl get svc matching-service -n flamoral
```

### Port Forward (for local testing)
```bash
kubectl port-forward svc/matching-service 3003:3003 -n flamoral
```

### Scale Deployment
```bash
kubectl scale deployment matching-service --replicas=3 -n flamoral
```

### Rollback
```bash
kubectl rollout undo deployment/matching-service -n flamoral
```

---

**First-time deployment - matching-service has never been deployed before**
