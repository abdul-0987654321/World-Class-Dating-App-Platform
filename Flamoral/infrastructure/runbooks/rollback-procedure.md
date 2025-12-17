# Rollback Procedure

## Overview
This runbook describes how to rollback a deployment to a previous stable version.

## When to Rollback
- Critical bugs affecting user experience
- Error rate > 5%
- Performance degradation > 50%
- Security vulnerability discovered
- Data integrity issues

## Quick Rollback (< 5 minutes)

### Kubernetes Rollback

```bash
# Identify the environment
ENVIRONMENT="prod"  # or staging, dev

# Get deployment history
kubectl rollout history deployment/dating-api -n datingapp --context ${ENVIRONMENT}-aks

# Rollback to previous version
kubectl rollout undo deployment/dating-api -n datingapp --context ${ENVIRONMENT}-aks
kubectl rollout undo deployment/media-processor -n datingapp --context ${ENVIRONMENT}-aks
kubectl rollout undo deployment/chat-worker -n datingapp --context ${ENVIRONMENT}-aks

# Monitor rollback
kubectl rollout status deployment/dating-api -n datingapp --context ${ENVIRONMENT}-aks
kubectl rollout status deployment/media-processor -n datingapp --context ${ENVIRONMENT}-aks
kubectl rollout status deployment/chat-worker -n datingapp --context ${ENVIRONMENT}-aks

# Verify health
kubectl get pods -n datingapp --context ${ENVIRONMENT}-aks
```

### Helm Rollback

```bash
# List releases
helm list -n datingapp

# Get revision history
helm history dating-api -n datingapp

# Rollback to specific revision
REVISION=$(helm history dating-api -n datingapp --max 2 -o json | jq '.[1].revision')
helm rollback dating-api ${REVISION} -n datingapp

helm rollback media-processor ${REVISION} -n datingapp
helm rollback chat-worker ${REVISION} -n datingapp
```

## Infrastructure Rollback

### Terraform State Rollback

```bash
# CAUTION: Only use in emergency situations

# Step 1: Backup current state
cd infrastructure
terraform state pull > state-backup-$(date +%Y%m%d-%H%M%S).json

# Step 2: List state versions
az storage blob list \
  --account-name datingapptfstate \
  --container-name tfstate \
  --prefix terraform.tfstate \
  --query "[].{Name:name, LastModified:properties.lastModified}" \
  --output table

# Step 3: Download previous state
az storage blob download \
  --account-name datingapptfstate \
  --container-name tfstate \
  --name terraform.tfstate.previous \
  --file previous-state.json

# Step 4: Review differences
terraform show previous-state.json

# Step 5: Restore previous state (if necessary)
# This should be a last resort - contact tech lead first
terraform state push previous-state.json

# Step 6: Apply previous configuration
git checkout <previous-commit>
terraform plan -var-file=envs/prod.tfvars
terraform apply -var-file=envs/prod.tfvars
```

## Database Rollback

### PostgreSQL Schema Rollback

```bash
# Step 1: Connect to database
az postgres flexible-server connect \
  --name datingapp-prod-postgres \
  --admin-user psqladmin

# Step 2: List recent migrations
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 10;

# Step 3: Rollback migration (if using migration tool)
npm run migrate:rollback --env=production

# Step 4: Verify schema
\dt  # List tables
```

### Database Restore from Backup

```bash
# Step 1: List available backups
az postgres flexible-server backup list \
  --resource-group datingapp-prod-rg \
  --name datingapp-prod-postgres

# Step 2: Restore to point in time
az postgres flexible-server restore \
  --resource-group datingapp-prod-rg \
  --name datingapp-prod-postgres-restored \
  --source-server datingapp-prod-postgres \
  --restore-time "2024-01-01T10:00:00Z"
```

## Post-Rollback Actions

1. **Verify System Health**
   ```bash
   # Check all services
   kubectl get pods -n datingapp

   # Run smoke tests
   npm run test:smoke:prod

   # Verify metrics
   # - Error rate < 1%
   # - Response time normal
   # - No critical alerts
   ```

2. **Communication**
   - Notify stakeholders of rollback
   - Update status page
   - Post mortem scheduled

3. **Investigation**
   - Gather logs: `kubectl logs -n datingapp -l app=dating-api --tail=1000`
   - Review Application Insights
   - Create incident report

4. **Prevention**
   - Update tests to catch issue
   - Review deployment process
   - Update runbooks

## Rollback Decision Matrix

| Severity | Error Rate | Response Time | Action |
|----------|-----------|---------------|---------|
| P0 | >10% | >2000ms | Immediate rollback |
| P1 | 5-10% | 1000-2000ms | Rollback within 15 min |
| P2 | 2-5% | 500-1000ms | Investigate, prepare rollback |
| P3 | <2% | <500ms | Monitor, fix forward |

## Emergency Contacts
- On-call Engineer: oncall@flamoral.com
- Database Admin: dba@flamoral.com
- Infrastructure Team: infra@flamoral.com
- Incident Commander: commander@flamoral.com
