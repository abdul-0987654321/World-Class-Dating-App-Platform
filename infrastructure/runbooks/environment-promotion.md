# Environment Promotion Runbook

## Overview
This runbook describes the process for promoting code changes through environments (dev → staging → prod).

## Prerequisites
- [ ] All tests passing in source environment
- [ ] Code review approved
- [ ] Security scan completed
- [ ] Change request approved (for production)
- [ ] Stakeholders notified

## Promotion Steps

### 1. Dev to Staging

```bash
# Step 1: Verify dev deployment is healthy
kubectl get pods -n datingapp --context dev-aks
kubectl get ingress -n datingapp --context dev-aks

# Step 2: Run automated tests
npm run test:integration --env=dev

# Step 3: Tag the release
git tag -a v1.x.x-staging -m "Promote to staging"
git push origin v1.x.x-staging

# Step 4: Trigger staging deployment
gh workflow run helm-deploy.yml \
  -f environment=staging \
  -f service=all \
  -f image_tag=v1.x.x-staging

# Step 5: Monitor deployment
kubectl rollout status deployment/dating-api -n datingapp --context staging-aks
kubectl rollout status deployment/media-processor -n datingapp --context staging-aks
kubectl rollout status deployment/chat-worker -n datingapp --context staging-aks

# Step 6: Run smoke tests
npm run test:smoke --env=staging

# Step 7: Verify metrics
# Check Application Insights dashboard for errors
# Verify response times < 500ms
# Check error rate < 1%
```

### 2. Staging to Production

**IMPORTANT: This requires manual approval**

```bash
# Step 1: Create production change request
# Document: Changes, rollback plan, testing evidence

# Step 2: Obtain approvals
# - Tech lead approval
# - Product owner approval
# - Operations team approval

# Step 3: Schedule deployment window
# Recommended: Low-traffic hours (2-4 AM UTC)

# Step 4: Pre-deployment checklist
# [ ] Database migrations tested
# [ ] Rollback procedure documented
# [ ] On-call engineer assigned
# [ ] Monitoring alerts configured
# [ ] Communication plan ready

# Step 5: Tag production release
git tag -a v1.x.x -m "Production release v1.x.x"
git push origin v1.x.x

# Step 6: Apply infrastructure changes (if any)
cd infrastructure
terraform plan -var-file=envs/prod.tfvars
# Review plan carefully
terraform apply -var-file=envs/prod.tfvars

# Step 7: Deploy application
gh workflow run helm-deploy.yml \
  -f environment=prod \
  -f service=all \
  -f image_tag=v1.x.x

# Step 8: Monitor deployment
watch kubectl get pods -n datingapp --context prod-aks

# Step 9: Run production smoke tests
npm run test:smoke:prod

# Step 10: Monitor metrics for 30 minutes
# - Check error rates in Application Insights
# - Monitor response times
# - Check database connection pool
# - Verify Redis cache hit rate
# - Monitor AKS node health

# Step 11: Post-deployment verification
curl -f https://api.datingapp.com/health
curl -f https://api.datingapp.com/metrics

# Step 12: Update status page
# Post deployment success notification
```

## Rollback Procedure
See [rollback-procedure.md](./rollback-procedure.md)

## Success Criteria
- [ ] All pods running and ready
- [ ] Health checks passing
- [ ] Error rate < 0.1%
- [ ] P95 response time < 300ms
- [ ] No critical alerts firing
- [ ] User-facing features functional

## Post-Deployment
- [ ] Update deployment log
- [ ] Close change request
- [ ] Notify stakeholders
- [ ] Document any issues encountered
- [ ] Update runbook if needed

## Contacts
- On-call Engineer: oncall@datingapp.com
- Tech Lead: tech-lead@datingapp.com
- Operations: ops-team@datingapp.com
