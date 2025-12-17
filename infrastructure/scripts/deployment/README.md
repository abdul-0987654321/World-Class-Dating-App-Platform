# Flamoral Dating Platform - Production Deployment Scripts

Enterprise-grade deployment automation for the Flamoral Dating Platform with comprehensive production capabilities.

## Overview

This directory contains production-ready deployment scripts that provide:
- Zero-downtime deployments
- Automated rollback capabilities
- Health monitoring and verification
- Database migration management
- Disaster recovery procedures
- Security automation
- Scale management

## Scripts Inventory

### Core Deployment Scripts

#### 1. `deploy-all.sh` - Complete Deployment Orchestration
The master deployment script that orchestrates the entire deployment process.

```bash
# Full production deployment
./deploy-all.sh --env production

# Dry run to preview changes
./deploy-all.sh --env production --dry-run

# Deploy specific services only
./deploy-all.sh --env production --services user-service,api-gateway

# Deploy with notifications
./deploy-all.sh --env production \
  --notification admin@flamoral.com \
  --slack-webhook https://hooks.slack.com/...

# Deploy with automatic rollback on failure
./deploy-all.sh --env production --rollback-on-fail
```

**Features:**
- Pre-deployment validation
- Infrastructure provisioning
- Database migrations
- Service deployments in dependency order
- Post-deployment verification
- Notification support (Email & Slack)
- Comprehensive logging
- State tracking

#### 2. `deploy-service.sh` - Individual Service Deployment
Deploy a single microservice with full validation.

```bash
# Deploy specific service
./deploy-service.sh --service user-service --env production

# Deploy with custom image tag
./deploy-service.sh --service api-gateway --image-tag v1.2.3

# Deploy with custom replica count
./deploy-service.sh --service matching-service --replicas 10

# Dry run
./deploy-service.sh --service auth-service --dry-run
```

**Features:**
- Docker image build and push
- Kubernetes manifest application
- Health check validation
- Automatic rollout monitoring
- Backup before deployment

### Advanced Deployment Strategies

#### 3. `blue-green-deploy.sh` - Blue-Green Deployment
Zero-downtime deployments with instant rollback capability.

```bash
# Deploy new version with blue-green strategy
./blue-green-deploy.sh --service api-gateway --image-tag v2.0.0

# Deploy without cleaning up old version
./blue-green-deploy.sh --service user-service --image-tag v1.5.0 --no-cleanup

# Custom health check timeout
./blue-green-deploy.sh --service matching-service \
  --image-tag v1.3.0 \
  --health-timeout 600
```

**Features:**
- Parallel environment deployment
- Traffic switching with verification
- Smoke testing before traffic switch
- Automatic rollback on failure
- Optional cleanup of old environment

**Workflow:**
1. Detects current active color (blue/green)
2. Deploys to inactive color
3. Waits for new deployment to be healthy
4. Runs smoke tests
5. Switches traffic to new deployment
6. Monitors for issues
7. Optionally cleans up old deployment

#### 4. `canary-deploy.sh` - Canary Deployment
Gradual rollout with continuous monitoring.

```bash
# Start canary deployment
./canary-deploy.sh --service api-gateway --image-tag v2.0.0

# Custom traffic increment
./canary-deploy.sh --service user-service \
  --image-tag v1.5.0 \
  --start-percentage 5 \
  --increment 5

# Automatic promotion to 100%
./canary-deploy.sh --service matching-service \
  --image-tag v1.3.0 \
  --auto-promote

# Custom monitoring duration per stage
./canary-deploy.sh --service messaging-service \
  --image-tag v1.4.0 \
  --monitor-duration 120
```

**Features:**
- Gradual traffic shift (10% → 20% → ... → 100%)
- Continuous metrics monitoring
- Automatic rollback on error threshold
- Manual approval gates (optional)
- Error rate monitoring

### Database Management

#### 5. `migrate-databases.sh` - Database Migration Script
Run database migrations with automatic backup and rollback.

```bash
# Run all migrations
./migrate-databases.sh --env production

# Migrate specific service
./migrate-databases.sh --env production --service user-service

# Dry run to see pending migrations
./migrate-databases.sh --env production --dry-run

# Skip backup (not recommended)
./migrate-databases.sh --env production --no-backup

# Disable automatic rollback
./migrate-databases.sh --env production --no-auto-rollback
```

**Features:**
- Automatic database backups before migration
- Transaction-wrapped migrations
- Automatic rollback on failure
- Migration verification
- Support for all database services
- Backup retention

**Safety Measures:**
- Creates backup before each service migration
- Verifies migration tracking table
- Tests database connectivity
- Validates migration files
- Automatic rollback on any failure

### Rollback & Recovery

#### 6. `rollback.sh` - Deployment Rollback
Rollback deployments to previous versions.

```bash
# Rollback specific service
./rollback.sh --service api-gateway

# Rollback to specific revision
./rollback.sh --service user-service --revision 5

# Rollback all services
./rollback.sh --all

# Rollback entire deployment by ID
./rollback.sh --deployment-id deploy-20251211-143000
```

**Features:**
- Single service rollback
- Bulk rollback capability
- Revision-specific rollback
- Deployment ID tracking
- Automatic health verification

#### 7. `disaster-recovery.sh` - Disaster Recovery
Complete disaster recovery procedures.

```bash
# Verify DR readiness
./disaster-recovery.sh --verify-only

# Execute disaster recovery
./disaster-recovery.sh \
  --recovery-point 2025-12-10-14-30 \
  --environment production \
  --region westus2
```

**Features:**
- DR readiness verification
- Automated failover to secondary region
- Database restoration from point-in-time
- Service redeployment
- Recovery verification
- Detailed recovery report

**Recovery Process:**
1. Verify backup availability
2. Promote read replica to primary
3. Update DNS records
4. Restore from backup
5. Redeploy all services
6. Verify recovery
7. Generate recovery report

### Health & Monitoring

#### 8. `health-check.sh` - Health Check Verification
Comprehensive health verification for all services.

```bash
# Run all health checks
./health-check.sh --env production

# Verbose output with details
./health-check.sh --env production --verbose

# Check specific namespace
./health-check.sh --namespace flamoral-staging
```

**Checks:**
- Pod health status
- Readiness probes
- Service endpoints
- Metrics endpoints
- Resource utilization
- Error rates

**Output:**
- ✓ user-service: All pods healthy (3/3)
- ✓ auth-service: Endpoint responding
- ✓ api-gateway: Metrics available
- ✗ payment-service: Unhealthy pods (2/3)

### Security & Maintenance

#### 9. `rotate-secrets.sh` - Secrets Rotation
Rotate all sensitive credentials with zero downtime.

```bash
# Rotate all secrets
./rotate-secrets.sh --key-vault flamoral-prod-kv

# Dry run to preview changes
./rotate-secrets.sh --key-vault flamoral-prod-kv --dry-run

# Rotate without restarting pods
./rotate-secrets.sh --key-vault flamoral-prod-kv --no-restart
```

**Rotated Secrets:**
- Database passwords (all services)
- JWT secrets
- API keys (Stripe, Apple, Google)
- Service-to-service auth tokens
- Encryption keys

**Process:**
1. Generate new secrets
2. Update Azure Key Vault
3. Update Kubernetes secrets
4. Update external services
5. Restart deployments
6. Verify connectivity

#### 10. `ssl-renewal.sh` - SSL Certificate Renewal
Automatic SSL certificate renewal via cert-manager.

```bash
# Check certificate status
./ssl-renewal.sh --check-only

# Renew all certificates
./ssl-renewal.sh

# Renew specific namespace
./ssl-renewal.sh --namespace flamoral-production
```

**Features:**
- Automatic Let's Encrypt integration
- Certificate status monitoring
- Forced renewal capability
- Multi-domain support
- Certificate expiry alerts

### Backup & Verification

#### 11. `backup-verify.sh` - Backup Verification
Verify backup integrity and availability.

```bash
# Verify recent backups
./backup-verify.sh --storage-account flamoralprodsa

# Check last 14 days
./backup-verify.sh \
  --storage-account flamoralprodsa \
  --days 14

# Generate detailed report
./backup-verify.sh \
  --storage-account flamoralprodsa \
  --generate-report
```

**Verification:**
- Backup existence check
- Integrity validation (compression test)
- Restore capability test
- Size validation
- Retention policy compliance
- HTML report generation

### Scaling Operations

#### 12. `scale-services.sh` - Service Scaling
Scale services for different traffic levels.

```bash
# Scale to peak traffic profile
./scale-services.sh --profile peak

# Scale to maintenance mode
./scale-services.sh --profile maintenance

# Scale specific service
./scale-services.sh --service api-gateway --replicas 20

# Available profiles: maintenance, low, normal, high, peak
./scale-services.sh --profile high
```

**Scaling Profiles:**

| Profile | Description | Typical Replicas |
|---------|-------------|------------------|
| **maintenance** | Minimal resources | 1 per service |
| **low** | Off-peak hours | 2 per service |
| **normal** | Regular traffic | 3-5 per service |
| **high** | Increased traffic | 5-10 per service |
| **peak** | Maximum capacity | 10-20 per service |

**Features:**
- Predefined scaling profiles
- Custom replica counts
- HPA limit adjustment
- Resource monitoring
- Graceful scaling

## Deployment Workflows

### Standard Production Deployment

```bash
# 1. Verify prerequisites
./deploy-all.sh --env production --dry-run

# 2. Deploy infrastructure changes
cd ../../infrastructure/terraform
terraform plan -var-file=environments/production/terraform.tfvars
terraform apply

# 3. Run database migrations
./migrate-databases.sh --env production

# 4. Deploy all services
./deploy-all.sh --env production --notification admin@flamoral.com

# 5. Verify deployment
./health-check.sh --env production

# 6. Monitor for 30 minutes
watch -n 30 './health-check.sh --env production'
```

### Zero-Downtime Service Update

```bash
# Option 1: Blue-Green Deployment
./blue-green-deploy.sh \
  --service api-gateway \
  --image-tag v2.0.0

# Option 2: Canary Deployment
./canary-deploy.sh \
  --service api-gateway \
  --image-tag v2.0.0 \
  --start-percentage 10 \
  --increment 10
```

### Emergency Rollback

```bash
# Rollback specific service
./rollback.sh --service api-gateway

# Or rollback entire deployment
./rollback.sh --deployment-id deploy-20251211-143000

# Verify rollback
./health-check.sh --env production
```

### Routine Maintenance

```bash
# 1. Scale down to maintenance mode
./scale-services.sh --profile maintenance

# 2. Rotate secrets (monthly)
./rotate-secrets.sh --key-vault flamoral-prod-kv

# 3. Renew SSL certificates (if needed)
./ssl-renewal.sh --check-only
./ssl-renewal.sh  # if renewal needed

# 4. Verify backups
./backup-verify.sh --storage-account flamoralprodsa --days 7

# 5. Scale back to normal
./scale-services.sh --profile normal
```

### Disaster Recovery

```bash
# 1. Verify DR readiness (monthly test)
./disaster-recovery.sh --verify-only

# 2. In case of actual disaster
./disaster-recovery.sh \
  --recovery-point 2025-12-10-14-30 \
  --environment production \
  --region westus2

# 3. Verify recovery
./health-check.sh --env production

# 4. Monitor closely for 24-48 hours
```

## Environment Variables

Key environment variables used across scripts:

```bash
# Azure Configuration
export AZURE_SUBSCRIPTION_ID="your-subscription-id"
export AZURE_TENANT_ID="your-tenant-id"
export KEY_VAULT_NAME="flamoral-prod-kv"

# Kubernetes Configuration
export KUBECONFIG="/path/to/kubeconfig"
export NAMESPACE="flamoral-dating"

# Notification Configuration
export NOTIFICATION_EMAIL="admin@flamoral.com"
export SLACK_WEBHOOK_URL="https://hooks.slack.com/..."

# Deployment Configuration
export ENVIRONMENT="production"
export IMAGE_REGISTRY="flamoral.azurecr.io"
```

## Prerequisites

### Required Tools

- `kubectl` (v1.28+) - Kubernetes CLI
- `helm` (v3.12+) - Kubernetes package manager
- `az` (2.50+) - Azure CLI
- `docker` (20.10+) - Container runtime
- `git` (2.40+) - Version control
- `jq` (1.6+) - JSON processor
- `curl` - HTTP client
- `openssl` - Cryptography toolkit

### Required Permissions

- Azure Subscription Contributor
- AKS Cluster Admin
- Key Vault Secrets Officer
- Storage Blob Data Contributor
- DNS Zone Contributor

## Logging & Audit Trail

All scripts generate comprehensive logs:

```
logs/deployment/
├── deploy-all-20251211_143000.log
├── deployment-state-deploy-20251211_143000.json
├── pre-deployment-state-20251211_143000.yaml
└── health-check-20251211_150000.log
```

**Log Retention:**
- Deployment logs: 90 days
- Health check logs: 30 days
- Backup verification: 180 days
- Audit logs: 365 days

## Notifications

Scripts support multiple notification channels:

### Email Notifications
```bash
./deploy-all.sh \
  --env production \
  --notification admin@flamoral.com,ops@flamoral.com
```

### Slack Notifications
```bash
./deploy-all.sh \
  --env production \
  --slack-webhook https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## Best Practices

### Pre-Deployment Checklist

- [ ] Run dry-run deployment
- [ ] Verify all tests pass in CI/CD
- [ ] Review infrastructure changes
- [ ] Check database migration plans
- [ ] Ensure backups are current
- [ ] Notify team of deployment
- [ ] Have rollback plan ready

### During Deployment

- [ ] Monitor deployment logs in real-time
- [ ] Watch service health metrics
- [ ] Check error rates in monitoring
- [ ] Verify critical user flows
- [ ] Monitor database performance
- [ ] Check external service integrations

### Post-Deployment

- [ ] Run comprehensive health checks
- [ ] Verify all services responding
- [ ] Check data consistency
- [ ] Monitor error rates for 1 hour
- [ ] Review application logs
- [ ] Update deployment documentation
- [ ] Notify team of completion

## Troubleshooting

### Common Issues

#### Deployment Fails

```bash
# Check logs
tail -f logs/deployment/deploy-all-*.log

# Check pod status
kubectl get pods -n flamoral-dating

# Check pod logs
kubectl logs -n flamoral-dating deployment/api-gateway --tail=100

# Rollback if needed
./rollback.sh --service api-gateway
```

#### Health Checks Fail

```bash
# Detailed health check
./health-check.sh --env production --verbose

# Check specific service
kubectl describe pod -n flamoral-dating -l app=user-service

# Check service endpoints
kubectl get svc -n flamoral-dating

# Port-forward to debug
kubectl port-forward -n flamoral-dating svc/user-service 3001:3001
```

#### Migration Fails

```bash
# Check migration logs
kubectl logs -n flamoral-dating job/migrate-user-service-*

# Manually rollback if auto-rollback failed
./migrate-databases.sh --env production --rollback

# Verify database state
kubectl exec -it -n flamoral-dating postgres-0 -- psql -U flamoral
```

## Security Considerations

1. **Secrets Management**
   - All secrets stored in Azure Key Vault
   - Never commit secrets to version control
   - Rotate secrets regularly (monthly)
   - Use separate secrets per environment

2. **Access Control**
   - Use RBAC for all Kubernetes resources
   - Implement least privilege principle
   - Audit access logs regularly
   - Use service accounts for automation

3. **Network Security**
   - All traffic encrypted in transit (TLS)
   - Network policies between services
   - WAF protection on all public endpoints
   - DDoS protection enabled

4. **Compliance**
   - Audit logs retained per compliance requirements
   - Encryption at rest for all data
   - Regular security scanning
   - Incident response procedures documented

## Support & Maintenance

### Regular Maintenance Tasks

**Daily:**
- Monitor deployment health
- Check error rates
- Review logs for anomalies

**Weekly:**
- Verify backup integrity
- Review resource utilization
- Update documentation

**Monthly:**
- Rotate secrets
- Test disaster recovery
- Review and optimize scaling
- Update SSL certificates
- Audit security settings

### Emergency Contacts

- **Deployment Issues**: ops-team@flamoral.com
- **Security Issues**: security@flamoral.com
- **Database Issues**: dba@flamoral.com
- **On-Call**: +1-555-0100

## Contributing

When adding new deployment scripts:

1. Follow existing script structure
2. Add comprehensive help text
3. Implement dry-run mode
4. Add logging and error handling
5. Update this README
6. Test in staging environment first

## License

Copyright 2025 Flamoral Dating Platform. All rights reserved.
