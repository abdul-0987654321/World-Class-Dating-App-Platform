# CI/CD Quick Reference Guide - Flamoral Dating Platform

> Quick reference for common CI/CD pipeline operations and commands

## Pipeline URLs

- **Main Project:** https://dev.azure.com/citadelcloudmanagement/DatingPlatform
- **CI Pipeline:** https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build?definitionId={ci-id}
- **CD Pipeline:** https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build?definitionId={cd-id}

## Quick Commands

### Check Deployment Status

```bash
# Check pods in dev
kubectl get pods -n flamoral-dev

# Check pods in test
kubectl get pods -n flamoral-test

# Check pods in production
kubectl get pods -n flamoral-prod

# Check all resources in environment
kubectl get all -n flamoral-{env}

# Check ingress
kubectl get ingress -n flamoral-{env}
```

### Manual Deployment Verification

```bash
# Get deployment logs
kubectl logs -n flamoral-{env} deployment/{service}

# Describe deployment
kubectl describe deployment -n flamoral-{env} {service}

# Check pod events
kubectl get events -n flamoral-{env} --sort-by='.lastTimestamp'

# Port forward for testing
kubectl port-forward -n flamoral-{env} svc/{service} 8080:80
```

### Docker Image Information

```bash
# List ACR repositories
az acr repository list --name flamoralacr8eq5eg

# List image tags
az acr repository show-tags --name flamoralacr8eq5eg --repository flamoral/{service}

# Show image manifest
az acr repository show --name flamoralacr8eq5eg --image flamoral/{service}:{tag}
```

### Terraform Operations

```bash
# Check current state
az storage blob list \
  --account-name flamoraltfstate \
  --container-name tfstate

# Download state file (for inspection)
az storage blob download \
  --account-name flamoraltfstate \
  --container-name tfstate \
  --name {env}.terraform.tfstate \
  --file local-state.tfstate
```

## Common Pipeline Triggers

### Trigger CI Pipeline Manually

1. Go to Azure DevOps
2. Navigate to Pipelines → CI Pipeline
3. Click "Run pipeline"
4. Select branch
5. Click "Run"

### Trigger CD Pipeline Manually

1. Go to Azure DevOps
2. Navigate to Pipelines → CD Pipeline
3. Click "Run pipeline"
4. Select resources (CI pipeline run)
5. Click "Run"

### Trigger Infrastructure Pipeline

1. Go to Azure DevOps
2. Navigate to Pipelines → Infrastructure Pipeline
3. Click "Run pipeline"
4. Set parameters:
   - Environment: dev/test/prod
   - Action: plan/apply/destroy
   - Auto-approve: true/false
5. Click "Run"

## Environment Endpoints

### Development
- Web: https://dev.flamoral.app
- API: https://api.dev.flamoral.app
- Health: https://api.dev.flamoral.app/health

### Test
- Web: https://test.flamoral.app
- API: https://api.test.flamoral.app
- Health: https://api.test.flamoral.app/health

### Production
- Web: https://flamoral.app
- API: https://api.flamoral.app
- Health: https://api.flamoral.app/health

## Approval Workflow

### Test Environment
- **Approvers:** qa-team@flamoral.com, devops@flamoral.com
- **Timeout:** 4 hours
- **Location:** Azure DevOps → Environments → flamoral-test

### Production Environment
- **Approvers:** release-managers@flamoral.com, cto@flamoral.com
- **Timeout:** 24 hours
- **Location:** Azure DevOps → Environments → flamoral-production

## Rollback Procedures

### Application Rollback (Blue-Green)

```bash
# Check current slot
kubectl get svc flamoral-api-gateway -n flamoral-prod -o jsonpath='{.spec.selector.slot}'

# Switch back to previous slot
kubectl patch svc flamoral-api-gateway -n flamoral-prod \
  -p '{"spec":{"selector":{"slot":"blue"}}}'  # or "green"
```

### Helm Rollback

```bash
# List releases
helm list -n flamoral-{env}

# Show release history
helm history -n flamoral-{env} flamoral-{env}

# Rollback to previous revision
helm rollback -n flamoral-{env} flamoral-{env}

# Rollback to specific revision
helm rollback -n flamoral-{env} flamoral-{env} {revision}
```

### Terraform Rollback

```bash
# Note: Terraform doesn't have built-in rollback
# Options:
# 1. Re-run previous pipeline with old code
# 2. Manually revert changes and apply
# 3. Use terraform state commands (advanced)
```

## Troubleshooting Quick Checks

### Pipeline Fails at Build Stage

```bash
# Check build logs in Azure DevOps
# Common issues:
# - npm install failures → Check package-lock.json
# - TypeScript errors → Run `npm run typecheck` locally
# - Docker build fails → Verify Dockerfile syntax
```

### Pipeline Fails at Deployment

```bash
# Check Helm deployment
kubectl get events -n flamoral-{env} --sort-by='.lastTimestamp'

# Check pod status
kubectl describe pod {pod-name} -n flamoral-{env}

# Check pod logs
kubectl logs {pod-name} -n flamoral-{env}

# Common issues:
# - ImagePullBackOff → Check ACR credentials
# - CrashLoopBackOff → Check application logs
# - Pending → Check resource quotas
```

### Health Check Fails

```bash
# Test endpoint directly
curl -v https://api.{env}.flamoral.app/health

# Check ingress
kubectl get ingress -n flamoral-{env}
kubectl describe ingress -n flamoral-{env}

# Check DNS
nslookup api.{env}.flamoral.app

# Common issues:
# - 502/503 → Pods not ready
# - 404 → Ingress misconfigured
# - Timeout → Network/firewall issues
```

## Security Scan Reports

### Accessing Reports

1. Navigate to Pipeline Run
2. Click on "Artifacts"
3. Download relevant report:
   - `npm-audit-report`
   - `trivy-fs-report`
   - `container-scan-results`
   - `security-report`

### Common Vulnerabilities Actions

**High/Critical NPM Vulnerabilities:**
```bash
# Update specific package
npm update {package-name}

# Update all packages (careful!)
npm update

# Use npm audit fix
npm audit fix
npm audit fix --force  # May cause breaking changes
```

**Container Vulnerabilities:**
```bash
# Update base image in Dockerfile
FROM node:20-alpine  # Use specific versions

# Rebuild and scan locally
docker build -t test .
trivy image test
```

## Monitoring and Logs

### View Pipeline Logs

1. Navigate to Pipeline Run
2. Click on specific job
3. View logs in real-time or download

### View Application Logs

```bash
# Stream logs from pod
kubectl logs -f -n flamoral-{env} {pod-name}

# Get logs from all pods of a service
kubectl logs -n flamoral-{env} -l app={service} --tail=100

# Get logs from previous pod instance (if crashed)
kubectl logs -n flamoral-{env} {pod-name} --previous
```

### Azure Monitor / Application Insights

- Portal: https://portal.azure.com
- Navigate to Application Insights resource
- View logs, metrics, and traces

## Variable Groups Access

### View Variable Groups

1. Azure DevOps → Pipelines → Library
2. Select variable group:
   - `flamoral-shared-vars`
   - `flamoral-cd-vars`
   - `datingplatform-terraform-common`
   - `flamoral-security-vars`

### Update Variables

1. Click on variable group
2. Click "Edit"
3. Update values
4. Click "Save"
5. Re-run pipeline to pick up changes

## Best Practices Checklist

### Before Deploying to Production

- [ ] All tests passing in Test environment
- [ ] Security scans reviewed
- [ ] Database migrations tested
- [ ] Rollback plan prepared
- [ ] Monitoring dashboards accessible
- [ ] Approvers notified
- [ ] Change documented
- [ ] Maintenance window scheduled (if needed)

### After Deployment

- [ ] Health checks passing
- [ ] Monitoring metrics normal
- [ ] No error spikes in logs
- [ ] User-facing features working
- [ ] Performance metrics acceptable
- [ ] Stakeholders notified
- [ ] Documentation updated

## Emergency Contacts

- **DevOps Team:** devops@flamoral.com
- **Release Managers:** release-managers@flamoral.com
- **CTO:** cto@flamoral.com
- **On-Call:** [Configure PagerDuty/On-Call rotation]

## Additional Resources

- **Full Documentation:** [CICD_PIPELINES.md](./CICD_PIPELINES.md)
- **Architecture:** [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)
- **Deployment Guide:** [DEPLOYMENT_K8S_GUIDE.md](./DEPLOYMENT_K8S_GUIDE.md)
- **Azure DevOps Setup:** [azure-devops-setup.md](./azure-devops-setup.md)

---

**Last Updated:** 2025-12-08
**Maintained By:** DevOps Team
