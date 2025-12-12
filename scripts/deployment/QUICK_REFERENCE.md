# Deployment Scripts - Quick Reference

## One-Line Commands for Common Tasks

### Deployments

```bash
# Full production deployment
./deploy-all.sh --env production

# Deploy with notifications
./deploy-all.sh --env production --notification ops@flamoral.com --slack-webhook https://hooks.slack.com/...

# Deploy single service
./deploy-service.sh --service user-service --env production

# Blue-green deployment
./blue-green-deploy.sh --service api-gateway --image-tag v2.0.0

# Canary deployment
./canary-deploy.sh --service user-service --image-tag v1.5.0 --auto-promote
```

### Health & Monitoring

```bash
# Quick health check
./health-check.sh --env production

# Watch health continuously
watch -n 30 './health-check.sh --env production'

# Check specific namespace
./health-check.sh --namespace flamoral-staging --verbose
```

### Database Operations

```bash
# Run all migrations
./migrate-databases.sh --env production

# Migrate single service
./migrate-databases.sh --env production --service user-service

# Dry run migrations
./migrate-databases.sh --env production --dry-run
```

### Rollback Operations

```bash
# Rollback single service
./rollback.sh --service api-gateway

# Rollback all services
./rollback.sh --all

# Rollback to specific revision
./rollback.sh --service user-service --revision 5
```

### Scaling

```bash
# Scale to peak traffic
./scale-services.sh --profile peak

# Scale to maintenance mode
./scale-services.sh --profile maintenance

# Scale specific service
./scale-services.sh --service api-gateway --replicas 20
```

### Security & Maintenance

```bash
# Rotate all secrets
./rotate-secrets.sh --key-vault flamoral-prod-kv

# Renew SSL certificates
./ssl-renewal.sh

# Check SSL status
./ssl-renewal.sh --check-only

# Verify backups
./backup-verify.sh --storage-account flamoralprodsa --days 7
```

### Disaster Recovery

```bash
# Verify DR readiness
./disaster-recovery.sh --verify-only

# Execute DR
./disaster-recovery.sh --recovery-point 2025-12-10-14-30 --environment production
```

## Emergency Procedures

### Service is Down

```bash
# 1. Check health
./health-check.sh --env production

# 2. Check logs
kubectl logs -n flamoral-dating -l app=user-service --tail=100

# 3. Restart deployment
kubectl rollout restart deployment/user-service -n flamoral-dating

# 4. If still down, rollback
./rollback.sh --service user-service
```

### High Error Rate

```bash
# 1. Immediate rollback
./rollback.sh --service api-gateway

# 2. Scale up to handle traffic
./scale-services.sh --profile peak

# 3. Verify health
./health-check.sh --env production
```

### Database Issues

```bash
# 1. Check database pods
kubectl get pods -n flamoral-dating -l app=postgres

# 2. Rollback migrations if recent
./migrate-databases.sh --env production --rollback

# 3. Restore from backup if needed
./disaster-recovery.sh --recovery-point YYYY-MM-DD-HH-MM
```

## Scheduled Maintenance

### Weekly

```bash
# Verify backups
./backup-verify.sh --storage-account flamoralprodsa --days 7

# Check SSL certificates
./ssl-renewal.sh --check-only
```

### Monthly

```bash
# Rotate secrets
./rotate-secrets.sh --key-vault flamoral-prod-kv

# Test disaster recovery
./disaster-recovery.sh --verify-only

# Review and optimize scaling
./scale-services.sh --profile normal
```

## Deployment Cheat Sheet

| Task | Command | Duration |
|------|---------|----------|
| Full deployment | `./deploy-all.sh --env production` | 15-20 min |
| Single service | `./deploy-service.sh --service NAME` | 3-5 min |
| Blue-green | `./blue-green-deploy.sh --service NAME --image-tag TAG` | 5-7 min |
| Canary | `./canary-deploy.sh --service NAME --image-tag TAG` | 10-15 min |
| Migrations | `./migrate-databases.sh --env production` | 5-10 min |
| Rollback | `./rollback.sh --service NAME` | 2-3 min |
| Health check | `./health-check.sh --env production` | 1-2 min |
| Scale | `./scale-services.sh --profile PROFILE` | 3-5 min |

## Key Environment Variables

```bash
export NAMESPACE="flamoral-dating"
export ENVIRONMENT="production"
export KEY_VAULT_NAME="flamoral-prod-kv"
export NOTIFICATION_EMAIL="ops@flamoral.com"
```

## Useful kubectl Commands

```bash
# Get all pods
kubectl get pods -n flamoral-dating

# Watch pod status
kubectl get pods -n flamoral-dating -w

# Get logs
kubectl logs -n flamoral-dating deployment/api-gateway --tail=100 -f

# Describe pod
kubectl describe pod -n flamoral-dating POD_NAME

# Port forward
kubectl port-forward -n flamoral-dating svc/api-gateway 3000:3000

# Execute command in pod
kubectl exec -it -n flamoral-dating POD_NAME -- /bin/sh

# Get events
kubectl get events -n flamoral-dating --sort-by='.lastTimestamp'
```

## Monitoring URLs

- **Grafana**: https://grafana.flamoral.com
- **Prometheus**: https://prometheus.flamoral.com
- **Kibana**: https://kibana.flamoral.com
- **Application Insights**: Azure Portal

## Support Contacts

- **Deployment Issues**: ops@flamoral.com
- **Emergency Hotline**: +1-555-0100
- **Slack Channel**: #ops-alerts
