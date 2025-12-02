# Azure DevOps Pipelines - Quick Start Guide

Quick reference for setting up and using the CI/CD pipelines for Flamoral Dating App Platform.

## Quick Setup (5 Minutes)

### 1. Create Service Connections
```bash
# In Azure DevOps → Project Settings → Service Connections

1. Azure Container Registry
   Name: flamoral-acr
   Registry: flamoralacr.azurecr.io

2. Kubernetes (Dev)
   Name: flamoral-aks-dev
   Cluster: flamoral-aks-dev

3. Kubernetes (Test)
   Name: flamoral-aks-test
   Cluster: flamoral-aks-test

4. Kubernetes (Prod)
   Name: flamoral-aks-prod
   Cluster: flamoral-aks-prod

5. Azure Subscription
   Name: flamoral-azure-subscription
```

### 2. Create Variable Groups
```bash
# In Azure DevOps → Pipelines → Library

flamoral-build-variables:
  - nodeVersion: '20.x'
  - goVersion: '1.21'
  - pythonVersion: '3.11'

flamoral-docker-variables:
  - containerRegistry: 'flamoral-acr'
  - containerRegistryUrl: 'flamoralacr.azurecr.io'
  - imagePrefix: 'flamoral'

flamoral-dev-variables:
  - environment: 'dev'
  - namespace: 'flamoral-dev'
  - DATABASE_URL: [secret]
  - REDIS_URL: [secret]

flamoral-test-variables:
  - environment: 'test'
  - namespace: 'flamoral-test'
  - DATABASE_URL: [secret]
  - REDIS_URL: [secret]

flamoral-prod-variables:
  - environment: 'prod'
  - namespace: 'flamoral-prod'
  - DATABASE_URL: [secret]
  - REDIS_URL: [secret]
```

### 3. Create Environments
```bash
# In Azure DevOps → Pipelines → Environments

1. flamoral-dev (no approvals)
2. flamoral-test (approval: DevOps team)
3. flamoral-prod (approval: Manager + SRE)
4. flamoral-prod-maintenance (approval: SRE)
```

### 4. Create Pipelines
```bash
# In Azure DevOps → Pipelines → New Pipeline

1. CI: Build All Services
   File: azure-pipelines/ci/build-all-services.yml

2. CI: Test All Services
   File: azure-pipelines/ci/test-all-services.yml

3. CI: Docker Build
   File: azure-pipelines/ci/docker-build.yml

4. CD: Deploy to Dev
   File: azure-pipelines/cd/deploy-dev.yml

5. CD: Deploy to Test
   File: azure-pipelines/cd/deploy-test.yml

6. CD: Deploy to Prod
   File: azure-pipelines/cd/deploy-prod.yml
```

## Common Workflows

### Workflow 1: Feature Development
```bash
# 1. Create feature branch
git checkout -b feature/new-matching-algorithm

# 2. Make changes
# ... code changes ...

# 3. Commit and push
git add .
git commit -m "Add new matching algorithm"
git push origin feature/new-matching-algorithm

# 4. Automatic triggers:
#    ✓ Build All Services pipeline runs
#    ✓ Test All Services pipeline runs

# 5. Create PR to develop
# 6. Wait for CI checks to pass
# 7. Merge PR

# 8. Automatic deployment to Dev
#    ✓ Docker Build pipeline runs
#    ✓ Deploy to Dev pipeline runs
```

### Workflow 2: Release to Test
```bash
# 1. Merge develop to main
git checkout main
git merge develop
git push origin main

# 2. Automatic triggers:
#    ✓ Docker Build pipeline runs (on main)

# 3. Manual approval in Azure DevOps
#    → Pipelines → Deploy to Test → Run pipeline
#    → Wait for approval notification
#    → DevOps team approves

# 4. Automatic deployment:
#    ✓ Database backup
#    ✓ Deploy all services
#    ✓ Run integration tests
#    ✓ Run performance tests
#    ✓ Run security tests
```

### Workflow 3: Production Deployment
```bash
# 1. Manual trigger only
#    → Pipelines → Deploy to Prod → Run pipeline

# 2. Pre-production checklist:
#    ✓ Docker images verified
#    ✓ Test environment healthy
#    ✓ No active incidents

# 3. Manager approval
#    → Engineering Manager reviews
#    → CTO approves

# 4. Backup production data:
#    ✓ PostgreSQL backup
#    ✓ Azure Storage snapshot
#    ✓ K8s state export

# 5. Blue-Green deployment:
#    ✓ Deploy to green environment
#    ✓ Smoke tests on green
#    ✓ Traffic switch approval
#    ✓ Gradual rollout: 10% → 50% → 100%
#    ✓ Monitor for 15 minutes

# 6. Cleanup:
#    ✓ Scale down blue environment
#    ✓ Send notifications
```

## Quick Commands

### Check Pipeline Status
```bash
# Using Azure CLI
az pipelines runs list --org https://dev.azure.com/flamoral --project FlavoralApp

# Check specific pipeline
az pipelines runs show --id <run-id> --org https://dev.azure.com/flamoral
```

### Trigger Manual Deployment
```bash
# Deploy to Test
az pipelines run --name "Deploy to Test" --org https://dev.azure.com/flamoral

# Deploy to Production
az pipelines run --name "Deploy to Prod" --org https://dev.azure.com/flamoral
```

### View Logs
```bash
# Get pipeline logs
az pipelines runs show --id <run-id> --org https://dev.azure.com/flamoral --output table

# Download logs
az pipelines runs artifact download --run-id <run-id> --path ./logs
```

## Pipeline Decision Tree

```
Code Push
    |
    ├─ Feature Branch → Build + Test (No Deploy)
    |
    ├─ Develop Branch → Build + Test + Docker Build → Deploy Dev (Auto)
    |
    └─ Main Branch → Build + Test + Docker Build → Deploy Test (Manual) → Deploy Prod (Manual)
```

## Service-Specific Commands

### Build Single Service
```bash
# Node.js service
cd backend/services/auth-service
npm ci
npm run build
npm run test

# Go service
cd backend/services/realtime-service
go mod download
go build
go test ./...

# Python service
cd backend/services/ai-services/nlp-service
pip install -r requirements.txt
pytest tests/
```

### Build Docker Image Locally
```bash
# Build image
docker build -t flamoral/auth-service:local -f backend/services/auth-service/Dockerfile backend/services/auth-service

# Run locally
docker run -p 3000:3000 flamoral/auth-service:local

# Test health
curl http://localhost:3000/health
```

### Deploy to K8s Manually
```bash
# Set context
kubectl config use-context flamoral-aks-dev

# Deploy service
kubectl apply -f k8s/base/auth-service-deployment.yaml -n flamoral-dev

# Check status
kubectl get pods -n flamoral-dev -l app=auth-service

# View logs
kubectl logs -n flamoral-dev -l app=auth-service --tail=100
```

## Troubleshooting Quick Fixes

### Build Failing
```bash
# Clear caches
rm -rf node_modules package-lock.json
npm install

# Clear Docker cache
docker system prune -a
```

### Tests Failing
```bash
# Run tests locally with same environment
docker-compose up -d postgres redis mongodb
npm run test:integration

# Check test database
psql -h localhost -U postgres -d flamoral_test
```

### Deployment Failing
```bash
# Check pod status
kubectl get pods -n flamoral-dev

# Describe pod
kubectl describe pod <pod-name> -n flamoral-dev

# Check logs
kubectl logs <pod-name> -n flamoral-dev

# Rollback deployment
kubectl rollout undo deployment/auth-service -n flamoral-dev
```

### Image Not Found
```bash
# Login to ACR
az acr login --name flamoralacr

# List images
az acr repository list --name flamoralacr --output table

# Show tags
az acr repository show-tags --name flamoralacr --repository flamoral/auth-service
```

## Monitoring URLs

### Azure DevOps
- **Pipelines**: https://dev.azure.com/flamoral/FlavoralApp/_build
- **Releases**: https://dev.azure.com/flamoral/FlavoralApp/_release
- **Test Results**: https://dev.azure.com/flamoral/FlavoralApp/_testManagement

### Application Environments
- **Dev**: https://api-dev.flamoral.com
- **Test**: https://api-test.flamoral.com
- **Prod**: https://api.flamoral.com

### Monitoring Dashboards
- **Grafana**: https://grafana.flamoral.com
- **Prometheus**: https://prometheus.flamoral.com
- **Application Insights**: https://portal.azure.com (Azure Monitor)

## Emergency Procedures

### Rollback Production
```bash
# Option 1: Switch back to blue environment
kubectl apply -f k8s/service-mesh/blue-traffic-switch.yaml -n flamoral-prod

# Option 2: Rollback specific deployment
kubectl rollout undo deployment/auth-service -n flamoral-prod

# Option 3: Scale up blue, scale down green
kubectl scale deployment --selector=version=blue --replicas=3 -n flamoral-prod
kubectl scale deployment --selector=version=green --replicas=0 -n flamoral-prod
```

### Stop All Deployments
```bash
# Cancel running pipeline
az pipelines run cancel --id <run-id> --org https://dev.azure.com/flamoral

# Or in Azure DevOps UI
# Pipelines → Running → [...] → Cancel
```

### Emergency Hotfix
```bash
# 1. Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-bug-fix

# 2. Make fix and commit
git commit -m "Fix critical bug"
git push origin hotfix/critical-bug-fix

# 3. Fast-track through environments
# - Merge to develop → Auto deploy to Dev
# - Merge to main → Manual deploy to Test (expedited approval)
# - Manual deploy to Prod (emergency approval)
```

## Useful Scripts

### Check All Services Health
```bash
#!/bin/bash
SERVICES=(
  "auth-service" "user-service" "api-gateway"
  "matching-service" "messaging-service" "payment-service"
  "notification-service" "media-service" "moderation-service"
  "analytics-service" "advertising-service" "realtime-service"
  "nlp-service" "recommendation-service" "fraud-detection" "photo-analysis"
)

for service in "${SERVICES[@]}"; do
  echo "Checking $service..."
  curl -f https://api.flamoral.com/api/$service/health || echo "FAILED: $service"
done
```

### Bulk Update Images
```bash
#!/bin/bash
IMAGE_TAG=$1

SERVICES=(
  "auth-service" "user-service" "api-gateway"
  # ... other services
)

for service in "${SERVICES[@]}"; do
  kubectl set image deployment/$service \
    $service=flamoralacr.azurecr.io/flamoral/$service:$IMAGE_TAG \
    -n flamoral-dev
done
```

## Support Contacts

| Issue Type | Contact | Email |
|------------|---------|-------|
| Pipeline Failures | DevOps Team | devops@flamoral.com |
| Deployment Issues | SRE Team | sre@flamoral.com |
| Test Failures | QA Team | qa@flamoral.com |
| Production Incidents | On-Call Engineer | oncall@flamoral.com |
| Security Concerns | Security Team | security@flamoral.com |

## Additional Resources

- **Full Documentation**: [README.md](./README.md)
- **Azure DevOps Docs**: https://docs.microsoft.com/azure/devops/
- **Internal Wiki**: https://wiki.flamoral.com/devops
- **Runbook**: https://wiki.flamoral.com/runbook

---

**Quick Reference Version**: 1.0.0
**Last Updated**: December 2024
