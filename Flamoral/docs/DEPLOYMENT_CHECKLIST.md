# Deployment Checklist

## Pre-Deployment Checklist

### 📋 Before Starting Deployment

- [ ] **Code Review Completed**
  - All PRs reviewed and approved
  - Code merged to appropriate branch
  - No outstanding critical issues

- [ ] **CI Pipeline Status**
  - ✅ CI pipeline passed successfully
  - ✅ All unit tests passing
  - ✅ Code quality checks passed
  - ✅ Security scans completed
  - ✅ Docker images built and pushed to ACR

- [ ] **Database Migrations**
  - [ ] Migration scripts reviewed
  - [ ] Migrations tested in dev environment
  - [ ] Rollback scripts prepared (if needed)
  - [ ] Database backup verified

- [ ] **Documentation Updated**
  - [ ] CHANGELOG updated
  - [ ] API documentation current
  - [ ] Deployment notes prepared
  - [ ] Known issues documented

---

## Development Deployment Checklist

### ✅ Dev Environment (Automatic)

**Expected Duration:** 15-20 minutes

1. **Pipeline Triggered**
   - [ ] CI pipeline completed successfully
   - [ ] CD pipeline triggered automatically
   - [ ] Correct image tag being deployed

2. **Database Migration**
   - [ ] Migration job created
   - [ ] Migrations executed successfully
   - [ ] Migration logs reviewed

3. **Deployment**
   - [ ] Helm chart deployed
   - [ ] Pods started successfully
   - [ ] Services created/updated

4. **Health Checks**
   - [ ] All pods are ready
   - [ ] Health endpoints responding (200 OK)
   - [ ] API functionality verified
   - [ ] Performance baseline acceptable

5. **Smoke Tests**
   - [ ] Smoke tests passed
   - [ ] No errors in logs
   - [ ] Basic functionality working

**Validation:**
```bash
# Check deployment status
curl https://api.dev.flamoral.app/health

# Verify services
kubectl get pods -n flamoral-dev
kubectl get svc -n flamoral-dev
```

---

## Test Deployment Checklist

### ✅ Test Environment (Manual Approval Required)

**Expected Duration:** 30-45 minutes

1. **Pre-Approval**
   - [ ] Dev deployment successful
   - [ ] Dev environment stable for 15+ minutes
   - [ ] No critical issues reported

2. **Approval Gate**
   - [ ] QA team notified
   - [ ] DevOps team notified
   - [ ] Approval received

3. **Database Migration**
   - [ ] Migration job created
   - [ ] Migrations executed successfully
   - [ ] Schema changes verified

4. **Deployment**
   - [ ] Helm chart deployed
   - [ ] All pods ready (2+ replicas)
   - [ ] Autoscaling configured
   - [ ] Services updated

5. **Health Checks**
   - [ ] Pod health verified
   - [ ] HTTP endpoints healthy
   - [ ] API functionality confirmed
   - [ ] Performance within acceptable range

6. **Integration Tests**
   - [ ] E2E tests executed
   - [ ] Test results reviewed
   - [ ] Test coverage acceptable
   - [ ] No regression detected

7. **Performance Tests**
   - [ ] Load test results reviewed
   - [ ] Response times acceptable
   - [ ] Resource usage normal
   - [ ] No bottlenecks identified

**Validation:**
```bash
# Check test environment
curl https://api.test.flamoral.app/health

# Review test results
# Azure DevOps → Pipelines → Tests

# Check performance
kubectl top pods -n flamoral-test
```

---

## Production Deployment Checklist

### 🚀 Production (Blue-Green Strategy)

**Expected Duration:** 45-60 minutes

#### Phase 1: Pre-Deployment Approval

- [ ] **Prerequisites**
  - [ ] Test environment deployment successful
  - [ ] Test environment stable for 24+ hours
  - [ ] All stakeholders notified
  - [ ] Deployment window scheduled
  - [ ] Rollback plan reviewed

- [ ] **Pre-Deployment Checklist**
  - [ ] All tests passed in Test environment
  - [ ] Performance metrics are acceptable
  - [ ] Database migrations reviewed
  - [ ] Rollback plan is ready
  - [ ] Monitoring dashboards accessible
  - [ ] On-call engineer assigned
  - [ ] Communication plan prepared

- [ ] **Approval Received**
  - [ ] Release Manager approval
  - [ ] CTO approval (if required)
  - [ ] DevOps team approval

#### Phase 2: Deployment Execution

1. **Deployment Initiated**
   - [ ] Deployment slot determined (Blue/Green)
   - [ ] Pre-deployment log reviewed
   - [ ] Image tag verified

2. **Database Migration**
   - [ ] Migration job started
   - [ ] Migrations executed successfully
   - [ ] Schema changes verified
   - [ ] Migration logs reviewed
   - [ ] Database backup confirmed

3. **Blue-Green Deployment**
   - [ ] New slot deployment started
   - [ ] Namespace verified
   - [ ] ACR pull secret created
   - [ ] Helm chart deployed
   - [ ] Pods starting on new slot

4. **Pod Validation**
   - [ ] All pods ready on new slot
   - [ ] Correct replica count (5+)
   - [ ] Resource limits applied
   - [ ] Security contexts set
   - [ ] No pod errors

5. **Health Validation**
   - [ ] Pod readiness confirmed
   - [ ] Health endpoints responding
   - [ ] API functionality verified
   - [ ] Performance baseline met
   - [ ] Service connectivity confirmed

#### Phase 3: Traffic Switch Approval

- [ ] **New Slot Validation**
  - [ ] New slot is healthy
  - [ ] No errors in logs
  - [ ] Performance acceptable
  - [ ] All services responding
  - [ ] Monitoring shows green

- [ ] **Traffic Switch Approval**
  - [ ] Release Manager approval
  - [ ] Ready to switch traffic
  - [ ] Rollback plan confirmed

#### Phase 4: Traffic Switch

1. **Switch Execution**
   - [ ] Service selector updated
   - [ ] Traffic switched to new slot
   - [ ] Old slot still running (rollback ready)

2. **Immediate Validation**
   - [ ] Health check post-switch
   - [ ] Error rates normal
   - [ ] Response times acceptable
   - [ ] No user-reported issues

#### Phase 5: Post-Deployment

1. **Monitoring (First 10 Minutes)**
   - [ ] Health checks passing
   - [ ] No error spikes
   - [ ] Performance stable
   - [ ] User traffic normal
   - [ ] No alerts triggered

2. **Extended Monitoring (First Hour)**
   - [ ] Application metrics normal
   - [ ] Database performance stable
   - [ ] No memory leaks detected
   - [ ] Cache hit rates normal
   - [ ] External service calls working

3. **Cleanup**
   - [ ] Old slot can be removed (after 24h)
   - [ ] Deployment summary sent
   - [ ] Success notifications sent
   - [ ] Monitoring dashboards updated
   - [ ] Documentation updated

**Validation:**
```bash
# Production health check
curl https://api.flamoral.app/health

# Check active slot
kubectl get svc flamoral-api-gateway -n flamoral-prod -o jsonpath='{.spec.selector.slot}'

# Monitor pods
kubectl get pods -n flamoral-prod -w

# Check metrics
kubectl top pods -n flamoral-prod
```

---

## Production Deployment Checklist (Canary Strategy)

### 🐤 Alternative: Canary Deployment

**Expected Duration:** 1.5 - 2 hours

#### Phase 1: Canary 10%

- [ ] **Pre-Canary**
  - [ ] All pre-deployment checks passed
  - [ ] Canary approval received
  - [ ] Monitoring dashboards ready

- [ ] **Canary Deployment (10%)**
  - [ ] Canary pods deployed
  - [ ] Traffic split configured (10%)
  - [ ] Canary pods healthy
  - [ ] No errors in canary logs

- [ ] **Canary Monitoring (5 minutes)**
  - [ ] Error rates normal
  - [ ] No pod restarts
  - [ ] No CrashLoopBackOff
  - [ ] Performance acceptable
  - [ ] User feedback positive

#### Phase 2: Promote to 50%

- [ ] **50% Approval**
  - [ ] Canary 10% successful
  - [ ] Metrics look good
  - [ ] Approval to increase traffic

- [ ] **Increase Traffic (50%)**
  - [ ] Canary replicas increased
  - [ ] Traffic split updated (50%)
  - [ ] All pods healthy

- [ ] **Monitoring (10 minutes)**
  - [ ] Error rates stable
  - [ ] Performance acceptable
  - [ ] No issues detected

#### Phase 3: Full Rollout (100%)

- [ ] **100% Approval**
  - [ ] Canary 50% successful
  - [ ] Ready for full rollout
  - [ ] Approval received

- [ ] **Full Deployment**
  - [ ] All replicas updated
  - [ ] Traffic at 100%
  - [ ] Canary deployment removed
  - [ ] Stable deployment confirmed

- [ ] **Post-Rollout**
  - [ ] Monitoring normal
  - [ ] No issues reported
  - [ ] Success notifications sent

**Validation:**
```bash
# Check canary pods
kubectl get pods -n flamoral-prod -l slot=canary

# Verify traffic split
kubectl get ingress flamoral -n flamoral-prod -o yaml | grep canary

# Monitor error rates
# (Use your monitoring dashboard)
```

---

## Rollback Checklist

### ⚠️ If Issues Detected

#### Immediate Rollback (Blue-Green)

- [ ] **Decision to Rollback**
  - [ ] Issue severity assessed
  - [ ] Rollback approved
  - [ ] Team notified

- [ ] **Rollback Execution**
  - [ ] Traffic switched back to old slot
  - [ ] Old slot verified healthy
  - [ ] New slot stopped

- [ ] **Validation**
  - [ ] Service restored
  - [ ] Error rates normal
  - [ ] Users not impacted

#### Automated Rollback (On Failure)

The pipeline automatically rolls back if:
- Deployment fails
- Health checks fail
- Validation fails
- Pod startup fails

**Monitor:**
- [ ] Rollback job started
- [ ] Database rollback (if enabled)
- [ ] Helm rollback completed
- [ ] Service verified
- [ ] Incident logged

**Manual Rollback (If Needed):**
```bash
# Helm rollback
helm rollback flamoral-prod -n flamoral-prod

# Verify
kubectl get pods -n flamoral-prod
curl https://api.flamoral.app/health
```

---

## Post-Deployment Checklist

### ✅ After Successful Deployment

1. **Immediate (First Hour)**
   - [ ] Monitor error rates
   - [ ] Check application logs
   - [ ] Verify user reports
   - [ ] Update status page
   - [ ] Send success notification

2. **Short Term (First Day)**
   - [ ] Monitor performance metrics
   - [ ] Review database performance
   - [ ] Check resource utilization
   - [ ] Gather user feedback
   - [ ] Update documentation

3. **Long Term (First Week)**
   - [ ] Remove old deployment slot
   - [ ] Archive deployment artifacts
   - [ ] Update deployment records
   - [ ] Conduct retrospective
   - [ ] Document lessons learned

---

## Emergency Contacts

**During Deployment:**
- **DevOps Team:** devops@flamoral.com
- **On-Call Engineer:** [See PagerDuty]
- **Release Manager:** release-managers@flamoral.com
- **CTO:** cto@flamoral.com

**Escalation Path:**
1. DevOps Team
2. Lead DevOps Engineer
3. Engineering Manager
4. CTO

---

## Quick Reference Commands

### Health Checks
```bash
# Dev
curl https://api.dev.flamoral.app/health

# Test
curl https://api.test.flamoral.app/health

# Production
curl https://api.flamoral.app/health
```

### Pod Status
```bash
# Get pods
kubectl get pods -n <namespace>

# Watch pods
kubectl get pods -n <namespace> -w

# Pod details
kubectl describe pod <pod-name> -n <namespace>

# Pod logs
kubectl logs <pod-name> -n <namespace>
```

### Deployment Status
```bash
# Get deployments
kubectl get deployments -n <namespace>

# Rollout status
kubectl rollout status deployment/<name> -n <namespace>

# Rollout history
kubectl rollout history deployment/<name> -n <namespace>
```

### Service Status
```bash
# Get services
kubectl get svc -n <namespace>

# Get endpoints
kubectl get endpoints -n <namespace>

# Get ingress
kubectl get ingress -n <namespace>
```

---

## Notes

- ✅ All checks must pass before proceeding
- ⚠️ Stop deployment if any critical issue detected
- 🔄 Rollback is always an option
- 📊 Monitor metrics continuously
- 📝 Document any issues or deviations
- 🚨 Communicate status to stakeholders

---

**Last Updated:** 2025-12-07
**Version:** 1.0
**Status:** Production Ready
