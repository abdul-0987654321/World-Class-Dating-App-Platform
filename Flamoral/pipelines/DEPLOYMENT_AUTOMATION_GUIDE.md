# Flamoral Dating Platform - Complete CI/CD Deployment Automation Guide

## Table of Contents
1. [Overview](#overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [Prerequisites](#prerequisites)
4. [Pipeline Configuration](#pipeline-configuration)
5. [Deployment Strategies](#deployment-strategies)
6. [Environment Configuration](#environment-configuration)
7. [Rollback Procedures](#rollback-procedures)
8. [Notifications](#notifications)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## Overview

The Flamoral Dating Platform uses a comprehensive CI/CD pipeline system that supports:

- **Automated builds** for all microservices
- **Multi-stage deployments** (Dev → Staging → Production)
- **Multiple deployment strategies** (Rolling, Canary, Blue-Green)
- **Automated testing** (Unit, Integration, E2E, Smoke)
- **Manual approval gates** for production
- **Automatic rollback** on deployment failures
- **Real-time notifications** via Slack and Microsoft Teams

### Pipelines Available

1. **azure-pipelines.yml** - CI Pipeline (Build, Test, Push)
2. **azure-pipelines-complete-cd.yml** - CD Pipeline (Deploy with approval gates)
3. **complete-cd-pipeline.yml** - GitHub Actions CD (Alternative)
4. **unified-ci.yml** - GitHub Actions CI (Existing)

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CI PIPELINE                               │
├─────────────────────────────────────────────────────────────────┤
│  1. Code Quality → 2. Build → 3. Test → 4. Security Scan       │
│                          ↓                                       │
│                  5. Docker Build → 6. Push to ACR               │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                        CD PIPELINE                               │
├─────────────────────────────────────────────────────────────────┤
│  1. Pre-Deployment Validation                                    │
│  2. Deploy to Dev (Automatic)                                    │
│  3. Deploy to Staging (Automatic)                                │
│  4. Run E2E Tests                                                │
│  5. Manual Approval Gate ⚠️                                      │
│  6. Backup Production State                                      │
│  7. Deploy to Production                                         │
│  8. Post-Deployment Validation                                   │
│  9. Rollback on Failure (Automatic)                              │
│ 10. Send Notifications                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Azure Resources

#### 1. Azure Container Registry (ACR)
```bash
# Create ACR
az acr create \
  --resource-group flamoral-prod-rg \
  --name flamoralprodacr \
  --sku Premium \
  --location eastus

# Enable admin access
az acr update --name flamoralprodacr --admin-enabled true
```

#### 2. Azure Kubernetes Service (AKS)
```bash
# Development
az aks create \
  --resource-group flamoral-dev-rg \
  --name flamoral-dev-aks \
  --node-count 2 \
  --node-vm-size Standard_D2s_v3 \
  --enable-managed-identity \
  --attach-acr flamoralprodacr

# Staging
az aks create \
  --resource-group flamoral-staging-rg \
  --name flamoral-staging-aks \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-managed-identity \
  --attach-acr flamoralprodacr

# Production
az aks create \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks \
  --node-count 5 \
  --node-vm-size Standard_D8s_v3 \
  --enable-managed-identity \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10 \
  --attach-acr flamoralprodacr
```

#### 3. Azure PostgreSQL Flexible Server
```bash
az postgres flexible-server create \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-db \
  --location eastus \
  --admin-user flamoral_admin \
  --admin-password <secure-password> \
  --sku-name Standard_D4s_v3 \
  --tier GeneralPurpose \
  --storage-size 128 \
  --version 16 \
  --backup-retention 30
```

### Azure DevOps Configuration

#### Variable Groups

Create the following variable groups in Azure DevOps Library:

**1. flamoral-common-vars**
```yaml
Variables:
  ACR_NAME: flamoralprodacr
  ACR_LOGIN_SERVER: flamoralprodacr.azurecr.io
  HELM_VERSION: 3.13.0
  NODE_VERSION: 20.x

Secrets:
  ACR_USERNAME: <from Azure Portal>
  ACR_PASSWORD: <from Azure Portal>
  SNYK_TOKEN: <from Snyk>
```

**2. flamoral-dev-vars**
```yaml
Variables:
  DEV_RESOURCE_GROUP: flamoral-dev-rg
  DEV_AKS_CLUSTER: flamoral-dev-aks
  DEV_API_URL: https://dev-api.flamoral.com
  DEV_URL: https://dev.flamoral.com

Secrets:
  DEV_DB_CONNECTION_STRING: <PostgreSQL connection string>
```

**3. flamoral-staging-vars**
```yaml
Variables:
  STAGING_RESOURCE_GROUP: flamoral-staging-rg
  STAGING_AKS_CLUSTER: flamoral-staging-aks
  STAGING_API_URL: https://staging-api.flamoral.com
  STAGING_URL: https://staging.flamoral.com

Secrets:
  STAGING_DB_CONNECTION_STRING: <PostgreSQL connection string>
```

**4. flamoral-production-vars**
```yaml
Variables:
  PROD_RESOURCE_GROUP: flamoral-prod-rg
  PROD_AKS_CLUSTER: flamoral-prod-aks
  PROD_API_URL: https://api.flamoral.com
  PROD_URL: https://flamoral.com
  PROD_APPROVER_EMAIL_1: lead@flamoral.com
  PROD_APPROVER_EMAIL_2: cto@flamoral.com

Secrets:
  PROD_DB_CONNECTION_STRING: <PostgreSQL connection string>
  SLACK_WEBHOOK_URL: <Slack webhook URL>
  TEAMS_WEBHOOK_URL: <Teams webhook URL>
```

#### Service Connections

**1. Azure Service Connection**
- Name: `Azure-Service-Connection`
- Type: Azure Resource Manager
- Authentication: Service Principal (Automatic)
- Scope: Subscription level

**2. ACR Service Connection**
- Name: `flamoral-acr-connection`
- Type: Docker Registry
- Registry Type: Azure Container Registry
- Connection: `flamoralprodacr`

**3. AKS Service Connections**
- `flamoral-aks-dev` - Dev AKS cluster
- `flamoral-aks-staging` - Staging AKS cluster
- `flamoral-aks-prod` - Production AKS cluster

#### Environments

Create environments in Azure DevOps with approval gates:

**1. flamoral-dev**
- Approvals: None (automatic)
- Checks: None

**2. flamoral-staging**
- Approvals: None (automatic)
- Checks: None

**3. flamoral-production**
- Approvals: Required (2 approvers)
  - Lead Developer
  - CTO or DevOps Lead
- Checks:
  - Invoke Azure Function (optional - for additional validation)
  - Query Azure Monitor (optional - for health checks)

**4. production-approval**
- Approvals: Required (2 approvers)
- Exclusive lock: Enabled (prevent concurrent deployments)
- Timeout: 24 hours

**5. production-rollback**
- Approvals: Required (1 approver)
- Use for emergency rollback scenarios

### GitHub Configuration

#### Environments

Create the following environments in GitHub repository settings:

**1. development**
- Required reviewers: None
- Wait timer: 0 minutes
- Deployment branches: `develop`

**2. staging**
- Required reviewers: None
- Wait timer: 0 minutes
- Deployment branches: `main`

**3. production-approval**
- Required reviewers: 2 (Lead Dev, CTO)
- Wait timer: 0 minutes
- Deployment branches: `main`

**4. production**
- Required reviewers: None
- Wait timer: 0 minutes
- Deployment branches: `main`

**5. production-rollback**
- Required reviewers: 1
- Wait timer: 0 minutes
- Deployment branches: `main`

#### Secrets

Configure the following secrets in GitHub repository settings:

```yaml
AZURE_CREDENTIALS: |
  {
    "clientId": "<client-id>",
    "clientSecret": "<client-secret>",
    "subscriptionId": "<subscription-id>",
    "tenantId": "<tenant-id>"
  }

# Development
DEV_RESOURCE_GROUP: flamoral-dev-rg
DEV_AKS_CLUSTER: flamoral-dev-aks

# Staging
STAGING_RESOURCE_GROUP: flamoral-staging-rg
STAGING_AKS_CLUSTER: flamoral-staging-aks

# Production
PROD_RESOURCE_GROUP: flamoral-prod-rg
PROD_AKS_CLUSTER: flamoral-prod-aks
PROD_URL: https://flamoral.com
PROD_API_URL: https://api.flamoral.com

# Notifications
SLACK_WEBHOOK_URL: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
TEAMS_WEBHOOK_URL: https://outlook.office.com/webhook/YOUR/WEBHOOK/URL

# Optional
CODECOV_TOKEN: <codecov token>
SNYK_TOKEN: <snyk token>
```

## Pipeline Configuration

### CI Pipeline (azure-pipelines.yml)

**Trigger Configuration:**
```yaml
trigger:
  branches:
    include:
      - main
      - develop
      - feature/*
  paths:
    exclude:
      - docs/**
      - '*.md'
```

**Stages:**
1. **Build and Test** - Compile, lint, test all services
2. **Build Docker Images** - Build and push to ACR
3. **Security Scanning** - Trivy, npm audit, Snyk
4. **Publish Artifacts** - Helm charts, release notes
5. **Notifications** - Slack/Teams notifications

**Running the CI Pipeline:**
```bash
# Automatically triggered on push to main/develop
# Or manually trigger:
az pipelines run --name "Flamoral-CI" --branch main
```

### CD Pipeline (azure-pipelines-complete-cd.yml)

**Trigger:** Manual only (via UI or API)

**Parameters:**
- `environment`: Target environment (dev/staging/production)
- `deploymentStrategy`: Deployment strategy (rolling/canary/blue-green)
- `imageTag`: Docker image tag to deploy

**Running the CD Pipeline:**

**Azure DevOps UI:**
1. Navigate to Pipelines → Flamoral-Complete-CD
2. Click "Run pipeline"
3. Select parameters:
   - Environment: production
   - Strategy: canary
   - Image Tag: abc123 (from CI build)
4. Click "Run"

**Azure CLI:**
```bash
az pipelines run \
  --name "Flamoral-Complete-CD" \
  --parameters environment=production deploymentStrategy=canary imageTag=abc123
```

**REST API:**
```bash
curl -X POST \
  "https://dev.azure.com/{org}/{project}/_apis/pipelines/{pipelineId}/runs?api-version=7.0" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {PAT}" \
  -d '{
    "templateParameters": {
      "environment": "production",
      "deploymentStrategy": "canary",
      "imageTag": "abc123"
    }
  }'
```

### GitHub Actions CD Pipeline

**Trigger:**
```yaml
# Automatic on push to main/develop
on:
  push:
    branches: [main, develop]

# Or manual trigger
workflow_dispatch:
  inputs:
    environment: dev/staging/production
    deployment_strategy: rolling/canary/blue-green
```

**Running GitHub Actions CD:**

**Via UI:**
1. Go to Actions tab
2. Select "Complete CD Pipeline"
3. Click "Run workflow"
4. Choose branch and parameters
5. Click "Run workflow"

**Via GitHub CLI:**
```bash
gh workflow run complete-cd-pipeline.yml \
  -f environment=production \
  -f deployment_strategy=canary
```

## Deployment Strategies

### 1. Rolling Update (Default)

**Best for:** Regular updates, low-risk changes

**How it works:**
1. Gradually replaces old pods with new ones
2. Ensures zero downtime
3. Configurable max unavailable and max surge

**Configuration:**
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0  # No downtime
    maxSurge: 1        # 1 extra pod during update
```

**Use when:**
- Deploying to dev/staging
- Low-risk bug fixes
- Configuration updates

### 2. Canary Deployment

**Best for:** High-risk changes, gradual rollout

**How it works:**
1. Deploy to 10% of traffic
2. Monitor metrics for 3 minutes
3. Gradually increase: 10% → 25% → 50% → 75% → 100%
4. Auto-rollback if issues detected

**Traffic Distribution:**
```
Time   | Canary | Stable | Action
-------|--------|--------|------------------
0 min  |  10%   |  90%   | Initial deployment
3 min  |  25%   |  75%   | First validation
5 min  |  50%   |  50%   | Halfway point
7 min  |  75%   |  25%   | Near completion
9 min  | 100%   |   0%   | Full rollout
```

**Use when:**
- Deploying major features
- Database schema changes
- API breaking changes
- Production deployments

### 3. Blue-Green Deployment

**Best for:** Instant rollback capability

**How it works:**
1. Deploy to inactive slot (blue or green)
2. Run full validation
3. Switch traffic instantly
4. Keep old version for quick rollback

**Configuration:**
```yaml
# Current: Blue (active)
# Deploy to: Green (inactive)
# After validation: Green becomes active
```

**Use when:**
- Zero-downtime requirement
- Need instant rollback
- Complex applications
- Regulatory compliance

## Environment Configuration

### Development Environment

**Purpose:** Rapid development and testing

**Configuration:**
```yaml
environment: development
namespace: flamoral-dev
replicaCount: 1
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
autoscaling:
  enabled: false
```

**Deployment:**
- Automatic on push to `develop` branch
- No approval required
- Fast rollout

### Staging Environment

**Purpose:** Pre-production testing, QA validation

**Configuration:**
```yaml
environment: staging
namespace: flamoral-staging
replicaCount: 2
resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
```

**Deployment:**
- Automatic after dev deployment succeeds
- Runs E2E tests
- Performance testing enabled

### Production Environment

**Purpose:** Live user traffic

**Configuration:**
```yaml
environment: production
namespace: flamoral-prod
replicaCount: 3
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 2000m
    memory: 2Gi
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
```

**Deployment:**
- Manual approval required (2 approvers)
- Automatic backup before deployment
- Canary or blue-green strategy
- Full monitoring and alerting

## Rollback Procedures

### Automatic Rollback

The pipeline automatically rolls back if:
- Deployment fails
- Health checks fail
- Post-deployment validation fails
- Timeout exceeded

**Rollback Process:**
1. Detect failure in deployment stage
2. Download backup artifacts
3. Restore previous deployment state
4. Verify rollback succeeded
5. Send rollback notification

### Manual Rollback

**Scenario 1: Recent deployment needs rollback**
```bash
# Via Azure DevOps
az pipelines run \
  --name "Flamoral-Complete-CD" \
  --parameters environment=production deploymentStrategy=rolling imageTag=<previous-tag>

# Via kubectl
kubectl rollout undo deployment/<deployment-name> -n flamoral-prod

# Verify
kubectl rollout status deployment/<deployment-name> -n flamoral-prod
```

**Scenario 2: Rollback to specific version**
```bash
# List revision history
kubectl rollout history deployment/<deployment-name> -n flamoral-prod

# Rollback to specific revision
kubectl rollout undo deployment/<deployment-name> --to-revision=<revision> -n flamoral-prod
```

**Scenario 3: Emergency rollback with backup**
```bash
# Download backup from pipeline artifacts
az pipelines runs artifact download \
  --run-id <run-id> \
  --artifact-name production-backup-<build-id>

# Apply backup
kubectl apply -f prod-deployments-backup.yaml -n flamoral-prod

# Wait for rollback
kubectl rollout status deployment --all -n flamoral-prod --timeout=600s
```

### Database Rollback

**Automated backups before deployment:**
```bash
# List backups
az postgres flexible-server backup list \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-db

# Restore specific backup
az postgres flexible-server restore \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-db-restored \
  --source-server flamoral-prod-db \
  --restore-time "2025-01-15T10:00:00Z"
```

## Notifications

### Slack Integration

**Setup:**
1. Create Slack app at https://api.slack.com/apps
2. Enable Incoming Webhooks
3. Create webhook for #deployments channel
4. Add webhook URL to variable group

**Notification Types:**
- ✅ Deployment success
- ❌ Deployment failure
- ⚠️ Rollback executed
- 🚀 Production deployment started
- ⏳ Waiting for approval

**Sample Notification:**
```json
{
  "text": "✅ Flamoral Deployment SUCCESS",
  "attachments": [{
    "color": "good",
    "fields": [
      {"title": "Environment", "value": "Production", "short": true},
      {"title": "Image Tag", "value": "abc123", "short": true},
      {"title": "Strategy", "value": "Canary", "short": true},
      {"title": "Duration", "value": "12m 34s", "short": true}
    ]
  }]
}
```

### Microsoft Teams Integration

**Setup:**
1. Go to Teams channel
2. Click "Connectors" → "Incoming Webhook"
3. Configure webhook
4. Copy webhook URL
5. Add to variable group

**Features:**
- Rich card formatting
- Action buttons (View Build, View Logs)
- Status indicators
- Deployment timeline

## Troubleshooting

### Common Issues

#### Issue 1: Image not found in ACR
```bash
# Verify image exists
az acr repository show-tags \
  --name flamoralprodacr \
  --repository flamoral/api-gateway \
  --orderby time_desc

# Solution: Run CI pipeline first
```

#### Issue 2: Helm deployment timeout
```bash
# Check pod status
kubectl get pods -n flamoral-prod

# Check events
kubectl get events -n flamoral-prod --sort-by='.lastTimestamp'

# Check logs
kubectl logs <pod-name> -n flamoral-prod

# Solution: Increase timeout or fix pod issues
```

#### Issue 3: Database migration fails
```bash
# Check migration job logs
kubectl logs job/db-migration-prod-<build-id> -n flamoral-prod

# Manual migration
kubectl run migration-manual \
  --image=flamoralprodacr.azurecr.io/flamoral/user-service:latest \
  --restart=Never \
  --env="DATABASE_URL=..." \
  -- npm run migrate
```

#### Issue 4: Health check fails after deployment
```bash
# Check service endpoints
kubectl get svc -n flamoral-prod

# Test health endpoint
kubectl run curl-test --image=curlimages/curl -it --rm -- \
  curl http://api-gateway-service:4000/health

# Check ingress
kubectl describe ingress -n flamoral-prod
```

#### Issue 5: Rollback not working
```bash
# Check rollout history
kubectl rollout history deployment/<name> -n flamoral-prod

# Force delete pods
kubectl delete pods -l app=<app-name> -n flamoral-prod --grace-period=0 --force

# Verify deployment
kubectl get deployments -n flamoral-prod
```

### Debug Mode

**Enable debug logging:**

**Azure DevOps:**
```yaml
variables:
  system.debug: true
```

**GitHub Actions:**
```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

**Kubernetes:**
```bash
# Enable verbose logging
kubectl --v=8 get pods -n flamoral-prod

# Check API server logs
kubectl logs -n kube-system <apiserver-pod>
```

## Best Practices

### 1. Image Tagging Strategy

**Use semantic versioning:**
```bash
# Format: <branch>-<short-sha>-<timestamp>
main-abc1234-20250115-120000

# Tags to apply:
- ${IMAGE_TAG}           # Unique per build
- ${BRANCH}-latest       # Latest for branch
- latest                 # Overall latest
```

### 2. Resource Limits

**Always set resource requests and limits:**
```yaml
resources:
  requests:
    cpu: 250m      # Minimum guaranteed
    memory: 512Mi
  limits:
    cpu: 1000m     # Maximum allowed
    memory: 1Gi
```

### 3. Health Checks

**Implement proper health checks:**
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### 4. Deployment Windows

**Schedule production deployments:**
- **Preferred:** Tuesday-Thursday, 10:00-14:00 UTC
- **Avoid:** Fridays, weekends, holidays
- **Emergency:** Anytime with proper approval

### 5. Monitoring

**Monitor key metrics during deployment:**
- Error rate (should stay < 1%)
- Response time (P95, P99)
- CPU and memory usage
- Database connections
- Queue depth

### 6. Testing Requirements

**Before production:**
- ✅ All unit tests pass
- ✅ Integration tests pass
- ✅ E2E tests pass on staging
- ✅ Load testing completed
- ✅ Security scan clean
- ✅ Manual QA sign-off

### 7. Documentation

**Keep updated:**
- Release notes
- API changelog
- Database migrations
- Configuration changes
- Known issues

### 8. Communication

**Notify stakeholders:**
- 24 hours before: Planned deployment
- During: Deployment in progress
- After: Deployment complete/failed
- Issues: Incident reports

## Additional Resources

- [Azure Pipelines Documentation](https://docs.microsoft.com/azure/devops/pipelines/)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Helm Documentation](https://helm.sh/docs/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [Azure AKS Documentation](https://docs.microsoft.com/azure/aks/)

## Support

For issues or questions:
- **DevOps Team:** devops@flamoral.com
- **On-call:** +1-xxx-xxx-xxxx
- **Slack:** #devops-support
- **Documentation:** https://docs.flamoral.com/pipelines
