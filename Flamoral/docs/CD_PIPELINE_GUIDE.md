# Continuous Deployment Pipeline Guide

## Overview

The Flamoral Dating Platform uses a comprehensive CD (Continuous Deployment) pipeline with multiple deployment strategies and built-in safety mechanisms.

## Pipeline Architecture

### 📋 Pipeline Files

1. **`pipelines/cd-pipeline.yml`** - Main CD pipeline with Blue-Green deployment
2. **`pipelines/cd-pipeline-canary.yml`** - Alternative pipeline with Canary deployment

### 🔄 Deployment Stages

#### Main CD Pipeline (Blue-Green Strategy)

```
Dev → Test → Production (Blue-Green) → Post-Deployment Monitoring
```

**Stage 1: Deploy to Development**
- ✅ Automatic deployment after CI pipeline success
- ✅ Database migrations run automatically
- ✅ Comprehensive health checks
- ✅ Smoke tests
- ⚙️ Single replica for dev environment

**Stage 2: Deploy to Test**
- 🔐 **Manual approval required** (QA team)
- ✅ Database migrations
- ✅ Health checks
- ✅ E2E integration tests
- ✅ Performance baseline tests
- ⚙️ Auto-scaling enabled (2-5 replicas)

**Stage 3: Deploy to Production**
- 🔐 **Manual approval required** (Release managers, CTO, DevOps)
- ✅ Blue-Green deployment strategy
- ✅ Database migrations with rollback support
- ✅ Progressive traffic switching
- ✅ Automated rollback on failure
- ✅ Comprehensive validation
- ⚙️ Auto-scaling enabled (5-50 replicas)

**Stage 4: Post-Deployment Monitoring**
- ✅ 10-minute health monitoring
- ✅ Success notifications
- ✅ Metrics collection

#### Canary CD Pipeline (Progressive Rollout)

```
Dev → Test → Canary 10% → Promote 50% → Full Rollout 100%
```

**Progressive Traffic Stages:**
1. Deploy canary with 10% traffic
2. Monitor and validate (manual approval)
3. Increase to 50% traffic
4. Monitor and validate (manual approval)
5. Full rollout to 100%
6. Clean up canary deployment

## 🎯 Deployment Strategies

### Blue-Green Deployment (Default)

**How it works:**
1. Deploy new version to inactive slot (Blue or Green)
2. Run validation tests on new slot
3. Switch traffic to new slot
4. Keep old slot running for instant rollback

**Advantages:**
- Zero-downtime deployments
- Instant rollback capability
- Clear separation between versions
- Easy A/B testing

**When to use:**
- Standard production deployments
- Critical updates requiring quick rollback
- When you want instant traffic switching

### Canary Deployment (Alternative)

**How it works:**
1. Deploy new version alongside current version
2. Route small percentage of traffic to new version
3. Monitor metrics and error rates
4. Progressively increase traffic
5. Complete rollout or rollback based on metrics

**Advantages:**
- Gradual exposure to new features
- Early detection of issues
- Lower risk for critical changes
- Real-world testing with production traffic

**When to use:**
- High-risk feature releases
- Major version updates
- When you need gradual rollout
- A/B testing scenarios

## 🔧 Key Components

### Database Migrations

**Template:** `pipelines/templates/database-migration.yml`

**Features:**
- Pre-deployment migration execution
- Dry-run capability for testing
- Automatic rollback on failure
- Migration status verification
- Kubernetes Job-based execution

**Usage:**
```yaml
- template: templates/database-migration.yml
  parameters:
    environment: production
    namespace: flamoral-prod
    imageTag: $(imageTag)
    dryRun: false  # Set to true for testing
```

### Health Checks

**Template:** `pipelines/templates/health-check.yml`

**Validates:**
- Pod readiness and availability
- HTTP endpoint health
- API functionality
- Performance baselines
- Service connectivity

**Features:**
- Configurable retry logic (default: 10 retries)
- Adjustable retry delays (default: 30 seconds)
- Comprehensive endpoint testing
- Performance metrics collection

### Rollback Mechanism

**Template:** `pipelines/templates/rollback-deployment.yml`

**Capabilities:**
- Automatic rollback on deployment failure
- Helm release rollback
- Database migration rollback (optional)
- Post-rollback validation
- Detailed rollback reporting

**Triggers:**
- Deployment failure
- Validation failure
- Manual intervention

## 🚀 Deployment Flow

### Successful Deployment Flow

```
┌─────────────────────────────────────────────────┐
│ 1. CI Pipeline Completes Successfully           │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ 2. Dev Deployment (Automatic)                   │
│    - Database Migrations                        │
│    - Helm Deployment                            │
│    - Health Checks                              │
│    - Smoke Tests                                │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ 3. Test Deployment (Manual Approval)            │
│    - QA Team Approval                           │
│    - Database Migrations                        │
│    - Helm Deployment                            │
│    - Health Checks                              │
│    - E2E Tests                                  │
│    - Performance Tests                          │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ 4. Production Approval                          │
│    - Release Manager Review                     │
│    - Pre-deployment Checklist                   │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ 5. Production Deployment (Blue-Green)           │
│    - Determine Deployment Slot                  │
│    - Database Migrations                        │
│    - Deploy to Inactive Slot                    │
│    - Validation Tests                           │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ 6. Traffic Switch Approval                      │
│    - Verify New Slot Health                     │
│    - Manual Approval                            │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ 7. Switch Traffic to New Slot                   │
│    - Update Service Selectors                   │
│    - Deployment Summary                         │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ 8. Post-Deployment Monitoring                   │
│    - 10-minute Health Monitoring                │
│    - Success Notifications                      │
└─────────────────────────────────────────────────┘
```

### Failure and Rollback Flow

```
┌─────────────────────────────────────────────────┐
│ Deployment or Validation Failure                │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ Automated Rollback Triggered                    │
│    - Database Rollback (if enabled)             │
│    - Helm Release Rollback                      │
│    - Verification                               │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ Post-Rollback Health Check                      │
│    - Verify Services Restored                   │
│    - Endpoint Testing                           │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ Rollback Summary & Notifications                │
└─────────────────────────────────────────────────┘
```

## 📝 Configuration

### Environment Variables

**Common Variables** (`templates/variables-common.yml`):
- Azure subscription details
- ACR registry information
- Kubernetes cluster settings

**Dev Environment** (`templates/variables-dev.yml`):
```yaml
environment: dev
namespace: flamoral-dev
replicaCount: 1
autoscalingEnabled: false
```

**Test Environment** (`templates/variables-test.yml`):
```yaml
environment: test
namespace: flamoral-test
replicaCount: 2
autoscalingEnabled: true
autoscalingMinReplicas: 2
autoscalingMaxReplicas: 5
```

**Production Environment** (`templates/variables-prod.yml`):
```yaml
environment: production
namespace: flamoral-prod
replicaCount: 5
autoscalingEnabled: true
autoscalingMinReplicas: 5
autoscalingMaxReplicas: 50
resourceRequestMemory: 1Gi
resourceRequestCpu: 1000m
resourceLimitMemory: 2Gi
resourceLimitCpu: 2000m
```

### Helm Chart Configuration

The pipeline uses Helm charts located in `infrastructure/helm/flamoral/`.

**Key Features:**
- Slot-based deployments (blue/green)
- Configurable replicas and autoscaling
- Resource limits and requests
- Health probes (liveness/readiness)
- Security contexts
- Pod disruption budgets

## 🔐 Security & Compliance

### Approval Gates

1. **Test Environment:**
   - Required approvers: QA team, DevOps
   - Timeout: 4 hours
   - Rejection on timeout

2. **Production Deployment:**
   - Required approvers: Release managers, CTO, DevOps
   - Pre-deployment checklist required
   - Timeout: 24 hours
   - Rejection on timeout

3. **Traffic Switch:**
   - Required approvers: Release managers
   - Validation of new slot health
   - Timeout: 1 hour

### Secrets Management

- Database credentials stored in Kubernetes secrets
- ACR credentials managed via service connections
- Key Vault integration for sensitive configuration

## 📊 Monitoring & Alerts

### Built-in Monitoring

1. **Pod Health:**
   - Readiness checks
   - Liveness checks
   - Restart count monitoring

2. **HTTP Health:**
   - `/health` endpoint validation
   - `/ready` endpoint validation
   - Response time measurement

3. **Performance Baselines:**
   - Response time tracking
   - Threshold validation
   - Alert on degradation

### Post-Deployment

- 10-minute continuous health monitoring
- Error rate tracking
- Performance metrics collection

## 🛠️ Troubleshooting

### Common Issues

**1. Migration Failures:**
```bash
# Check migration job logs
kubectl logs job/database-migration-<env> -n <namespace>

# Verify database connectivity
kubectl exec -it <pod> -n <namespace> -- env | grep DB_
```

**2. Health Check Failures:**
```bash
# Check pod status
kubectl get pods -n <namespace>

# Check pod logs
kubectl logs <pod-name> -n <namespace>

# Test health endpoint manually
curl https://<api-host>/health
```

**3. Deployment Timeout:**
```bash
# Check deployment status
kubectl rollout status deployment/<deployment-name> -n <namespace>

# Describe deployment for events
kubectl describe deployment/<deployment-name> -n <namespace>
```

### Manual Rollback

If automated rollback fails:

```bash
# List Helm releases
helm list -n <namespace>

# Rollback to previous version
helm rollback <release-name> -n <namespace>

# Verify rollback
kubectl get pods -n <namespace>
```

## 🎓 Best Practices

1. **Always review changes before approving production deployments**
2. **Monitor application metrics during canary rollouts**
3. **Keep database migrations reversible**
4. **Test rollback procedures regularly**
5. **Use canary deployments for high-risk changes**
6. **Maintain deployment runbooks**
7. **Document deployment incidents**
8. **Regular pipeline testing in lower environments**

## 📞 Support

For deployment issues or questions:
- DevOps Team: devops@flamoral.com
- Escalation: CTO, Release Managers
- Documentation: This guide and Azure DevOps pipeline comments

## 📚 Additional Resources

- [Helm Documentation](https://helm.sh/docs/)
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Azure DevOps Pipelines](https://docs.microsoft.com/en-us/azure/devops/pipelines/)
- [Blue-Green Deployments](https://martinfowler.com/bliki/BlueGreenDeployment.html)
- [Canary Deployments](https://martinfowler.com/bliki/CanaryRelease.html)
