# CI/CD Pipeline - Quick Reference Guide

## 🚀 Quick Start

### First Time Setup

1. **Configure GitHub Secrets** (Settings → Secrets and variables → Actions)
   ```
   Required secrets:
   - AZURE_CREDENTIALS
   - SLACK_WEBHOOK_URL
   - INFRACOST_API_KEY
   - PROD_URL
   - PROD_API_URL
   - STAGING_URL
   - STAGING_API_URL
   ```

2. **Set Up GitHub Environments** (Settings → Environments)
   - Create: `production`, `production-approval`, `staging`
   - Add protection rules for production (2 reviewers)

3. **Test the Pipeline**
   ```bash
   # Test staging deployment
   git checkout develop
   git commit --allow-empty -m "test: CI/CD pipeline"
   git push origin develop
   ```

---

## 📋 Common Commands

### Deploy to Staging (Automatic)
```bash
git checkout develop
git pull origin develop
git merge feature/my-feature
git push origin develop
# Staging deployment triggers automatically
```

### Deploy to Production (Manual Approval)
```bash
git checkout main
git pull origin main
git merge develop
git push origin main
# 1. Go to Actions → Deploy to Production
# 2. Approve deployment when prompted
# 3. Monitor progress in GitHub Actions
```

### Manual Production Deployment
```bash
# Via GitHub UI
1. Go to Actions → Deploy to Production
2. Click "Run workflow"
3. Select deployment strategy (canary/blue-green/rolling)
4. Click "Run workflow"
5. Approve when prompted
```

### View Cost Report
```bash
# Automatic: Every Monday at 9:00 AM UTC
# Manual: Actions → Weekly Cost Report → Run workflow
```

### Validate Infrastructure Changes
```bash
# Create PR with infrastructure changes
# infrastructure-check.yml runs automatically
```

---

## 🔧 Manual Deployments

### Deploy Specific Service
```bash
# 1. Login to Azure
az login
az aks get-credentials --resource-group flamoral-prod-rg --name flamoral-prod-aks

# 2. Update deployment
kubectl set image deployment/user-service \
  user-service=flamoralprodacr.azurecr.io/flamoral/user-service:v1.2.3 \
  -n flamoral-prod

# 3. Monitor rollout
kubectl rollout status deployment/user-service -n flamoral-prod
```

### Quick Rollback
```bash
# Via Helm (recommended)
helm rollback flamoral-prod -n flamoral-prod

# Via kubectl
kubectl rollout undo deployment/user-service -n flamoral-prod
```

---

## 📊 Monitoring

### Check Deployment Status
```bash
# Via kubectl
kubectl get pods -n flamoral-prod
kubectl get deployments -n flamoral-prod

# Via Helm
helm list -n flamoral-prod
helm status flamoral-prod -n flamoral-prod
```

### View Logs
```bash
# Pod logs
kubectl logs -f <pod-name> -n flamoral-prod

# Deployment logs
kubectl logs deployment/user-service -n flamoral-prod --tail=100
```

### Check Resource Usage
```bash
kubectl top pods -n flamoral-prod
kubectl top nodes
```

---

## 🎯 Deployment Strategies

### Canary (Default - Production)
- Gradual rollout: 10% → 25% → 50% → 75% → 100%
- Best for high-risk changes
- Easy early detection

### Blue-Green
- Zero downtime
- Instant rollback
- Best for critical updates

### Rolling
- Simple and predictable
- Resource efficient
- Best for low-risk updates

---

## 🔐 Security

### Scan Infrastructure
```bash
# Automatic on PR to main/develop
# Manual: Actions → Infrastructure Check → Run workflow
```

### View Security Alerts
```bash
# GitHub UI: Security → Code scanning alerts
```

---

## 💰 Cost Management

### View Cost Reports
- **Weekly Report:** Check Issues with label `cost-report`
- **Manual Report:** Actions → Weekly Cost Report → Run workflow
- **Slack:** Check `#finance` channel every Monday

### Cost Optimization Actions
1. Review weekly cost report
2. Identify top cost resources
3. Implement recommendations
4. Monitor cost trends

---

## 🚨 Emergency Procedures

### Emergency Rollback
```bash
# Method 1: Via GitHub Actions
1. Go to Actions → Deploy to Production
2. Wait for rollback job (auto-triggers on failure)

# Method 2: Manual Helm Rollback
helm rollback flamoral-prod -n flamoral-prod

# Method 3: Blue-Green Switch
kubectl patch configmap deployment-slot -n flamoral-prod \
  --type merge -p '{"data":{"active":"blue"}}'
```

### Check Service Health
```bash
# API Health
curl https://api.flamoral.com/health

# All Services
kubectl get pods -n flamoral-prod
```

### Emergency Contacts
- **Slack:** #incidents
- **On-Call:** Check PagerDuty
- **Email:** devops@flamoral.com

---

## 📝 Workflow Triggers

| Workflow | Trigger | Duration |
|----------|---------|----------|
| deploy-production.yml | Push to `main` or manual | 30-45 min |
| deploy-staging.yml | Push to `develop` | 25-35 min |
| infrastructure-check.yml | PR with infra changes | 10-15 min |
| cost-report.yml | Weekly Monday 9am UTC | 5-10 min |

---

## 🔍 Troubleshooting

### Build Fails
```bash
# Check GitHub Actions logs
# Verify Dockerfile exists
# Check service path
```

### Deployment Hangs
```bash
# Check pod status
kubectl describe pod <pod-name> -n flamoral-prod

# Check events
kubectl get events -n flamoral-prod --sort-by='.lastTimestamp'
```

### Image Pull Errors
```bash
# Verify ACR access
az acr login --name flamoralprodacr

# Check image exists
az acr repository show-tags --name flamoralprodacr --repository flamoral/user-service
```

### Tests Fail
```bash
# Check test logs in GitHub Actions
# Run tests locally
cd tests && npm run test:integration
```

---

## 📚 Documentation

- **Full Guide:** [.github/DEPLOYMENT.md](.github/DEPLOYMENT.md)
- **Implementation:** See root CICD_PIPELINE_IMPLEMENTATION_SUMMARY.md
- **Infrastructure:** [infrastructure/README.md](../infrastructure/README.md)

---

## ✅ Checklist: Before Production Deployment

- [ ] All staging tests passed
- [ ] Release candidate created
- [ ] Security scans completed
- [ ] Cost impact reviewed
- [ ] Rollback plan ready
- [ ] Team notified
- [ ] Monitoring dashboard open
- [ ] Off-peak hours confirmed

---

## 🎨 Slack Notifications

### Channels
- `#production-deployments` - Production updates
- `#staging-deployments` - Staging updates
- `#infrastructure` - Infrastructure changes
- `#finance` - Cost reports

### Notification Types
- 🚀 Deployment started
- ✅ Deployment successful
- ❌ Deployment failed
- ⚠️ Rollback executed
- 💰 Weekly cost report

---

## 🔄 Common Workflows

### Add New Service to Pipeline

1. **Add to build matrix** in `deploy-production.yml`:
   ```yaml
   - name: new-service
     path: backend/services/new-service
   ```

2. **Add to staging** in `deploy-staging.yml`

3. **Create Dockerfile** in service directory

4. **Test build**:
   ```bash
   docker build -t test:latest backend/services/new-service
   ```

### Update Environment Variables

1. **Update Key Vault** (production secrets)
   ```bash
   az keyvault secret set --vault-name flamoral-prod-kv \
     --name NEW_SECRET --value "secret-value"
   ```

2. **Update GitHub Secrets** (CI/CD)
   - Settings → Secrets → New secret

3. **Update Helm values** (configuration)
   - Edit `infrastructure/helm/flamoral/values-prod.yaml`

### Create Hotfix

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-fix

# 2. Make fix and commit
git add .
git commit -m "fix: critical issue"

# 3. Push and create PR
git push origin hotfix/critical-fix

# 4. After approval, merge to main
# 5. Production deployment triggers automatically

# 6. Also merge back to develop
git checkout develop
git merge hotfix/critical-fix
git push origin develop
```

---

## 📈 Performance Tips

### Speed Up Builds
- Use Docker layer caching
- Minimize dependencies
- Use multi-stage builds

### Optimize Tests
- Run in parallel where possible
- Use test isolation
- Skip unnecessary tests in staging

### Reduce Costs
- Scale down non-production environments
- Use spot instances for dev
- Enable autoscaling
- Review weekly cost reports

---

## 🎓 Best Practices

### ✅ DO
- Test in staging first
- Use semantic versioning
- Tag releases properly
- Monitor deployments
- Review cost reports weekly
- Keep secrets rotated
- Document changes

### ❌ DON'T
- Deploy to prod without testing
- Skip approval gates
- Ignore failed tests
- Use `latest` tags in prod
- Commit secrets
- Deploy during peak hours
- Skip rollback testing

---

**Last Updated:** December 2024
**Quick Questions?** Check [DEPLOYMENT.md](DEPLOYMENT.md) or ask in #devops
