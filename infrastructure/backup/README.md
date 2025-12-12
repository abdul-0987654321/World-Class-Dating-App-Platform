# Backup and Disaster Recovery System
# Flamoral Dating Platform

## Overview

This directory contains the complete backup and disaster recovery infrastructure for the Flamoral Dating Platform. It provides enterprise-grade data protection with automated backups, point-in-time recovery, and comprehensive disaster recovery procedures.

## Table of Contents

1. [Architecture](#architecture)
2. [Backup Strategy](#backup-strategy)
3. [Quick Start](#quick-start)
4. [Components](#components)
5. [Recovery Procedures](#recovery-procedures)
6. [Testing](#testing)
7. [Monitoring](#monitoring)
8. [Maintenance](#maintenance)

---

## Architecture

### Backup Infrastructure

```
┌─────────────────────────────────────────────────────────────────┐
│                    Flamoral Dating Platform                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │ PostgreSQL  │   │ Cosmos DB   │   │   Redis     │           │
│  │ (User Data) │   │ (Messages)  │   │  (Cache)    │           │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘           │
│         │                  │                  │                   │
│         ▼                  ▼                  ▼                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │           Backup Automation Layer                 │           │
│  │  - Hourly DB backups                              │           │
│  │  - WAL archiving (PITR)                           │           │
│  │  - Continuous backup (Cosmos)                     │           │
│  │  - Snapshot backups (Redis)                       │           │
│  └──────────────────────────────────────────────────┘           │
│                         │                                         │
└─────────────────────────┼─────────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────────┐
         │    Primary Backup Storage          │
         │    (Azure Blob - RAGRS)            │
         │  - Encryption at rest              │
         │  - Soft delete (30 days)           │
         │  - Immutable storage               │
         │  - 30-day retention                │
         └────────┬───────────────────────────┘
                  │
                  │ Cross-region replication
                  │
                  ▼
         ┌────────────────────────────────────┐
         │  Secondary Backup Storage (DR)     │
         │  (Azure Blob - GRS)                │
         │  - West US 2 region                │
         │  - 90-day retention                │
         │  - Disaster recovery only          │
         └────────────────────────────────────┘
```

### Kubernetes Backup with Velero

```
┌─────────────────────────────────────────────────────────┐
│                  AKS Cluster                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ Namespaces │  │   PVCs     │  │  Secrets   │        │
│  │ ConfigMaps │  │ Deployments│  │  Ingress   │        │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘        │
│        │                │                │                │
│        └────────────────┴────────────────┘                │
│                         │                                 │
│                         ▼                                 │
│                 ┌──────────────┐                         │
│                 │    Velero     │                         │
│                 │  - Hourly     │                         │
│                 │  - Daily      │                         │
│                 │  - Weekly     │                         │
│                 └───────┬───────┘                         │
│                         │                                 │
└─────────────────────────┼─────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Velero Backup Store  │
              │  (Azure Blob Storage) │
              └───────────────────────┘
```

---

## Backup Strategy

### RTO/RPO Targets

| Component | RTO | RPO | Backup Frequency |
|-----------|-----|-----|------------------|
| Authentication | 5 min | 0 min | Real-time replication |
| Payment Processing | 5 min | 0 min | Real-time replication |
| User Database | 15 min | 15 min | Hourly + WAL archiving |
| Messages (Cosmos) | 15 min | 15 min | Continuous backup |
| Matching Data | 30 min | 1 hour | Hourly |
| Media Files | 1 hour | 1 hour | Continuous replication |
| Kubernetes State | 1 hour | 1 hour | Hourly (critical), Daily (full) |

### Backup Types

#### 1. PostgreSQL Backups

**Hourly Logical Backups:**
- Full database dumps using `pg_dump`
- Compressed format
- Stored in Azure Blob Storage
- 30-day retention

**Continuous WAL Archiving:**
- Write-Ahead Logs archived every 5 minutes
- Enables Point-in-Time Recovery (PITR)
- Stored separately for quick recovery

**Weekly Base Backups:**
- Physical backup using `pg_basebackup`
- Used for faster full recovery
- Includes all WAL files

#### 2. Cosmos DB Backups

**Continuous Backup:**
- Automatic continuous backup (Azure managed)
- 30-day retention window
- Point-in-time restore capability
- Geo-redundant storage

#### 3. Blob Storage Backups

**Geo-Redundant Replication:**
- Automatic replication to secondary region
- Read-access in DR scenario
- Versioning enabled
- Soft delete: 30 days

**Lifecycle Management:**
- Hot tier: 0-7 days
- Cool tier: 7-90 days
- Archive tier: 90+ days

#### 4. Kubernetes Backups (Velero)

**Hourly Critical Services:**
- Services tagged with `backup-tier: critical`
- 7-day retention
- Includes PVCs and secrets

**Daily Full Backup:**
- All namespaces and resources
- 30-day retention
- Cluster-scoped resources included

**Weekly Comprehensive:**
- Complete cluster state
- 90-day retention
- All namespaces, including system

### Retention Policy

| Backup Type | Retention | Storage Tier |
|-------------|-----------|--------------|
| Hourly DB | 7 days | Hot |
| Daily DB | 30 days | Cool |
| Weekly DB | 90 days | Archive |
| Kubernetes Hourly | 7 days | Hot |
| Kubernetes Daily | 30 days | Cool |
| Kubernetes Weekly | 90 days | Archive |
| Media Files | 90 days (active) | Cool |
| Logs | 30 days | Cool |
| Compliance Data | 7 years | Archive |

---

## Quick Start

### Initial Setup

```bash
# 1. Set environment variables
export AZURE_SUBSCRIPTION_ID="your-subscription-id"
export AZURE_RESOURCE_GROUP="flamoral-production-rg"
export BACKUP_STORAGE_ACCOUNT="flamoralbackup"
export ENV="production"

# 2. Deploy backup infrastructure via Terraform
cd ../../terraform/environments/production
terraform init
terraform apply -target=module.backup

# 3. Setup automated backups
cd ../../../infrastructure/backup
bash setup-backups.sh

# 4. Install Velero for Kubernetes backups
cd ../../scripts/disaster-recovery
bash velero-setup.sh install

# 5. Verify setup
bash ../../infrastructure/backup/setup-backups.sh verify
```

### Manual Backup

```bash
# PostgreSQL backup
bash scripts/disaster-recovery/postgres-backup.sh

# Kubernetes backup
bash scripts/disaster-recovery/velero-setup.sh backup create manual-backup

# Full system backup
bash infrastructure/backup/backup-automation.sh full
```

### Restore Operations

```bash
# Restore single database
bash scripts/disaster-recovery/postgres-restore.sh -d flamoral_users

# Restore from specific timestamp
bash scripts/disaster-recovery/postgres-restore.sh -t 20241211-143000

# Point-in-time recovery
bash scripts/disaster-recovery/postgres-restore.sh -p "2024-12-11 14:30:00"

# Restore Kubernetes resources
bash scripts/disaster-recovery/velero-setup.sh restore create <backup-name>

# Full environment rebuild (DR)
bash scripts/disaster-recovery/full-environment-rebuild.sh
```

---

## Components

### 1. Terraform Module (`terraform/modules/backup`)

Infrastructure as Code for backup resources:

- **Backup Storage Accounts** (RAGRS)
- **Recovery Services Vault**
- **Backup Automation Account**
- **Monitoring and Alerts**
- **Lifecycle Management Policies**

### 2. Backup Scripts (`scripts/disaster-recovery/`)

| Script | Purpose | Frequency |
|--------|---------|-----------|
| `postgres-backup.sh` | PostgreSQL automated backup | Hourly |
| `postgres-restore.sh` | PostgreSQL restore with PITR | On-demand |
| `velero-setup.sh` | Velero installation and management | Setup/On-demand |
| `full-environment-rebuild.sh` | Complete DR recovery | DR event only |
| `data-validation.sh` | Backup integrity verification | Daily |

### 3. Velero Configuration

Kubernetes backup solution with schedules:

- **Hourly:** Critical services (auth, payment)
- **Daily:** Full namespace backup
- **Weekly:** Comprehensive cluster backup

### 4. Monitoring

- **Prometheus Metrics:** Backup success/failure, duration, size
- **Grafana Dashboards:** Backup health, trends, storage usage
- **Alerts:** Failed backups, delayed backups, storage capacity

---

## Recovery Procedures

### Single Service Recovery (RTO: 5-15 min)

Use for individual service failures.

```bash
# 1. Restart service
kubectl rollout restart deployment/<service> -n flamoral-dating

# 2. If restart fails, rollback
kubectl rollout undo deployment/<service> -n flamoral-dating

# 3. Verify
kubectl rollout status deployment/<service> -n flamoral-dating
```

### Database Recovery (RTO: 30 min)

Use for database corruption or data loss.

```bash
# Latest backup
bash scripts/disaster-recovery/postgres-restore.sh

# Specific timestamp
bash scripts/disaster-recovery/postgres-restore.sh -t 20241211-120000

# Point-in-time (15 minutes ago)
bash scripts/disaster-recovery/postgres-restore.sh -p "$(date -d '15 minutes ago' +'%Y-%m-%d %H:%M:%S')"
```

### Kubernetes Cluster Recovery (RTO: 1 hour)

Use for cluster-wide issues.

```bash
# List available backups
bash scripts/disaster-recovery/velero-setup.sh backup list

# Restore from backup
bash scripts/disaster-recovery/velero-setup.sh restore create <backup-name>

# Monitor restore
velero restore get
kubectl get pods --all-namespaces
```

### Full Disaster Recovery (RTO: 4 hours)

Use for complete regional failure.

**See detailed procedures in `DR_RUNBOOK.md`**

```bash
# Activate full DR (requires confirmation)
bash scripts/disaster-recovery/full-environment-rebuild.sh

# Monitor progress
tail -f /var/log/flamoral-dr/rebuild-*.log

# Verify recovery
bash scripts/disaster-recovery/data-validation.sh --comprehensive
```

---

## Testing

### Regular Testing Schedule

| Test Type | Frequency | Duration | Impact |
|-----------|-----------|----------|--------|
| Backup verification | Daily | 5 min | None |
| Single service restore | Weekly | 15 min | Test environment |
| Database restore | Monthly | 30 min | Test environment |
| Full DR drill | Quarterly | 4 hours | Staged production |

### Run Tests

```bash
# Backup verification
bash scripts/disaster-recovery/data-validation.sh --quick

# Database restore test (dry run)
DRY_RUN=true bash scripts/disaster-recovery/postgres-restore.sh

# Full DR test (staging)
ENV=staging bash scripts/disaster-recovery/full-environment-rebuild.sh

# Velero restore test
velero restore create test-restore --from-backup daily-full-latest --namespace-mappings flamoral-dating:flamoral-dating-test
```

---

## Monitoring

### Key Metrics

1. **Backup Success Rate**
   - Target: 100%
   - Alert: < 95%

2. **Backup Duration**
   - PostgreSQL: < 30 min
   - Kubernetes: < 60 min
   - Alert: > 2x normal

3. **Backup Size Trend**
   - Monitor growth rate
   - Alert: Unexpected spikes

4. **Storage Usage**
   - Target: < 80%
   - Alert: > 90%

5. **Time Since Last Backup**
   - PostgreSQL: < 2 hours
   - Kubernetes: < 25 hours
   - Alert: Overdue

### Access Dashboards

```bash
# Grafana backup dashboard
https://grafana.flamoral.com/d/backup-overview

# Prometheus metrics
https://prometheus.flamoral.com/graph?g0.expr=backup_*

# Azure Portal
https://portal.azure.com → Recovery Services Vault
```

### Alerts

Alerts configured in:
- Prometheus AlertManager
- Azure Monitor
- PagerDuty

Notification channels:
- Email: devops@flamoral.com
- Slack: #backup-alerts
- PagerDuty: On-call rotation

---

## Maintenance

### Weekly Tasks

- [ ] Review backup success rate
- [ ] Check storage usage
- [ ] Verify retention policies
- [ ] Review failed backup logs

### Monthly Tasks

- [ ] Test restore procedure
- [ ] Review and update documentation
- [ ] Audit backup configurations
- [ ] Cleanup old backups manually (if needed)
- [ ] Review RTO/RPO compliance

### Quarterly Tasks

- [ ] Full DR drill
- [ ] Update contact information
- [ ] Review and update runbooks
- [ ] Audit backup security
- [ ] Capacity planning review

### Annual Tasks

- [ ] Comprehensive DR test with stakeholders
- [ ] Review and update DR plan
- [ ] Update compliance documentation
- [ ] Vendor review (Azure, backup tools)
- [ ] Team training and knowledge transfer

---

## Troubleshooting

### Backup Failures

```bash
# Check backup logs
tail -f /var/log/flamoral-backups/postgres-backup-*.log

# Verify storage access
az storage container exists \
  --name postgresql-backups \
  --account-name $BACKUP_STORAGE_ACCOUNT

# Check disk space
df -h

# Verify database connectivity
PGPASSWORD=$PG_PASSWORD psql -h $PG_HOST -U $PG_USER -c "SELECT 1"
```

### Restore Issues

```bash
# Verify backup integrity
bash scripts/disaster-recovery/data-validation.sh --quick

# Check backup availability
bash scripts/disaster-recovery/postgres-restore.sh -l

# Test restore (dry run)
DRY_RUN=true bash scripts/disaster-recovery/postgres-restore.sh
```

### Velero Issues

```bash
# Check Velero status
velero get backup
velero get restore

# View Velero logs
kubectl logs -n velero -l app.kubernetes.io/name=velero

# Verify backup location
velero backup-location get
```

---

## Security

### Access Control

- Backup storage: Azure RBAC
- Encryption: AES-256 at rest
- Network: Private endpoints (production)
- Secrets: Azure Key Vault

### Encryption

- **At Rest:** Azure Storage Service Encryption (SSE)
- **In Transit:** TLS 1.2+
- **Backups:** Encrypted before upload (optional)
- **Keys:** Customer-managed keys (CMK) for production

### Compliance

- **GDPR:** 30-day soft delete, encryption
- **HIPAA:** Encryption, audit logs, access controls
- **SOC 2:** Documented procedures, regular testing
- **PCI DSS:** Secure storage, encryption, access logs

---

## Cost Optimization

### Storage Tiers

| Tier | Use Case | Cost/GB |
|------|----------|---------|
| Hot | Recent backups (0-7 days) | $0.018 |
| Cool | Monthly backups (7-90 days) | $0.01 |
| Archive | Long-term retention (90+ days) | $0.002 |

### Optimization Strategies

1. **Lifecycle Policies:** Automatic tier transitions
2. **Compression:** Reduce backup size by 70-80%
3. **Deduplication:** Incremental backups
4. **Retention Review:** Delete unnecessary old backups
5. **Regional Storage:** Use cheaper regions for archives

### Current Costs (Estimated)

- Storage (Hot): ~$200/month
- Storage (Cool): ~$100/month
- Storage (Archive): ~$50/month
- Egress (DR testing): ~$20/month
- **Total:** ~$370/month

---

## References

### Internal Documentation

- [DR Runbook](./DR_RUNBOOK.md) - Detailed recovery procedures
- [Disaster Recovery Plan](../disaster-recovery/DISASTER_RECOVERY_PLAN.md) - Overall DR strategy
- [Infrastructure Guide](../INFRASTRUCTURE_GUIDE.md) - Platform architecture

### External Resources

- [Azure Backup Documentation](https://docs.microsoft.com/en-us/azure/backup/)
- [PostgreSQL Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)
- [Velero Documentation](https://velero.io/docs/)
- [Azure Storage Lifecycle Management](https://docs.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)

---

## Support

### Get Help

- **Slack:** #backup-support
- **Email:** devops@flamoral.com
- **On-Call:** PagerDuty escalation

### Report Issues

1. Create ticket in JIRA: [BACKUP] prefix
2. Include logs and error messages
3. Specify environment and urgency
4. Tag relevant team members

---

**Last Updated:** 2024-12-11
**Version:** 1.0.0
**Maintained By:** DevOps Team
