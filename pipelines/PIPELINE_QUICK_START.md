# CI/CD Pipeline Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Prerequisites Check

```bash
# Verify you have access to:
✓ Azure subscription
✓ Azure DevOps organization
✓ GitHub repository
✓ ACR (flamoralprodacr)
✓ AKS clusters (dev, staging, prod)
```

### Step 2: Configure Secrets

**Azure DevOps:**
```bash
# Go to: Project Settings → Pipelines → Library
# Create variable groups: flamoral-common-vars, flamoral-dev-vars, etc.
```

**GitHub:**
```bash
# Go to: Settings → Secrets and variables → Actions
# Add required secrets
```

### Step 3: Run Your First Deployment

#### Option A: Azure DevOps

```bash
# 1. CI Pipeline (Automatic on push)
git push origin develop

# 2. CD Pipeline (Manual)
az pipelines run \
  --name "Flamoral-Complete-CD" \
  --parameters environment=dev deploymentStrategy=rolling imageTag=latest
```

#### Option B: GitHub Actions

```bash
# 1. Push to trigger CI/CD
git push origin develop

# 2. Or manual workflow dispatch
gh workflow run complete-cd-pipeline.yml \
  -f environment=dev \
  -f deployment_strategy=rolling
```

## 📋 Common Commands

### Build and Test

```bash
# Run CI pipeline
az pipelines run --name "Flamoral-CI"

# Check pipeline status
az pipelines runs list --pipeline-ids <pipeline-id> --status inProgress

# View logs
az pipelines runs show --id <run-id>
```

### Deploy to Environments

```bash
# Deploy to Development
az pipelines run \
  --name "Flamoral-Complete-CD" \
  --parameters environment=dev deploymentStrategy=rolling imageTag=abc123

# Deploy to Staging
az pipelines run \
  --name "Flamoral-Complete-CD" \
  --parameters environment=staging deploymentStrategy=rolling imageTag=abc123

# Deploy to Production (requires approval)
az pipelines run \
  --name "Flamoral-Complete-CD" \
  --parameters environment=production deploymentStrategy=canary imageTag=abc123
```

### Verify Deployment

```bash
# Check pods
kubectl get pods -n flamoral-prod

# Check services
kubectl get svc -n flamoral-prod

# Check ingress
kubectl get ingress -n flamoral-prod

# Test health endpoint
curl https://api.flamoral.com/health
```

### Rollback

```bash
# Automatic rollback on failure (built-in)

# Manual rollback to previous version
kubectl rollout undo deployment/api-gateway -n flamoral-prod

# Rollback to specific revision
kubectl rollout undo deployment/api-gateway --to-revision=2 -n flamoral-prod
```

## 🔧 Deployment Strategies Quick Reference

### Rolling Update
```yaml
# Use for: Regular updates, low risk
Parameters:
  deploymentStrategy: rolling

Characteristics:
  - Zero downtime
  - Gradual replacement
  - Default strategy
```

### Canary Deployment
```yaml
# Use for: High-risk changes, production
Parameters:
  deploymentStrategy: canary

Traffic Split:
  10% → 25% → 50% → 75% → 100%

Duration: ~9 minutes
```

### Blue-Green Deployment
```yaml
# Use for: Instant rollback needed
Parameters:
  deploymentStrategy: blue-green

Characteristics:
  - Instant traffic switch
  - Keep old version running
  - Quick rollback
```

## 📊 Monitoring Deployment

### Azure DevOps

```bash
# View pipeline runs
https://dev.azure.com/<org>/<project>/_build

# View environments
https://dev.azure.com/<org>/<project>/_environments

# View approvals
https://dev.azure.com/<org>/<project>/_environments/<environment>/approvals
```

### GitHub Actions

```bash
# View workflow runs
https://github.com/<org>/<repo>/actions

# View deployments
https://github.com/<org>/<repo>/deployments

# Check environment status
gh api repos/<org>/<repo>/deployments --jq '.[] | {id, environment, state}'
```

### Kubernetes

```bash
# Watch deployment progress
kubectl rollout status deployment/api-gateway -n flamoral-prod

# View deployment history
kubectl rollout history deployment/api-gateway -n flamoral-prod

# View pod logs
kubectl logs -f deployment/api-gateway -n flamoral-prod

# View events
kubectl get events -n flamoral-prod --sort-by='.lastTimestamp'
```

## ⚠️ Production Deployment Checklist

Before deploying to production:

- [ ] All tests passing in staging
- [ ] Code review completed
- [ ] QA sign-off received
- [ ] Release notes prepared
- [ ] Database migrations tested
- [ ] Rollback plan ready
- [ ] Stakeholders notified
- [ ] Monitoring dashboards ready
- [ ] On-call team available
- [ ] Deployment window scheduled

## 🔔 Notifications Setup

### Slack

```bash
# 1. Create Slack app: https://api.slack.com/apps
# 2. Enable Incoming Webhooks
# 3. Add webhook URL to variable group:
SLACK_WEBHOOK_URL: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Microsoft Teams

```bash
# 1. Go to Teams channel
# 2. Connectors → Incoming Webhook
# 3. Configure and copy webhook URL
# 4. Add to variable group:
TEAMS_WEBHOOK_URL: https://outlook.office.com/webhook/YOUR/WEBHOOK/URL
```

## 🐛 Quick Troubleshooting

### Issue: Pipeline fails at Docker build
```bash
# Solution: Check Dockerfile exists
ls backend/services/<service>/Dockerfile

# Verify ACR access
az acr login --name flamoralprodacr
```

### Issue: Deployment timeout
```bash
# Check pod status
kubectl get pods -n flamoral-prod

# View pod logs
kubectl logs <pod-name> -n flamoral-prod

# Increase timeout in pipeline
timeout: '20m'
```

### Issue: Health check fails
```bash
# Test service directly
kubectl port-forward svc/api-gateway 8080:4000 -n flamoral-prod
curl http://localhost:8080/health

# Check service configuration
kubectl describe svc api-gateway -n flamoral-prod
```

### Issue: Approval gate stuck
```bash
# Azure DevOps: Go to Environments → Approvals → Approve/Reject
# GitHub: Go to Actions → Workflow run → Review deployments
```

## 📚 Next Steps

1. **Read full documentation:** [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md)
2. **Configure monitoring:** Set up Azure Monitor, Application Insights
3. **Setup alerts:** Configure PagerDuty or similar
4. **Practice rollback:** Test rollback in dev environment
5. **Document runbooks:** Create incident response procedures

## 🆘 Getting Help

- **Slack:** #devops-support
- **Email:** devops@flamoral.com
- **On-call:** +1-xxx-xxx-xxxx
- **Documentation:** https://docs.flamoral.com

## 🎯 Success Metrics

Track these metrics for your deployments:

- **Deployment Frequency:** How often you deploy
- **Lead Time:** Code commit to production
- **MTTR:** Mean time to recovery
- **Change Failure Rate:** % of deployments causing issues
- **Deployment Success Rate:** % of successful deployments

Target:
- Deploy multiple times per day
- Lead time < 1 hour
- MTTR < 15 minutes
- Change failure rate < 5%
- Success rate > 95%
