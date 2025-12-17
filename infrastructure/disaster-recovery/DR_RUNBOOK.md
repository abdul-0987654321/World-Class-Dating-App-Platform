# Flamoral Platform - Disaster Recovery Runbook

## Table of Contents
1. [Overview](#overview)
2. [Disaster Scenarios](#disaster-scenarios)
3. [Recovery Time Objectives (RTO)](#recovery-time-objectives-rto)
4. [Recovery Point Objectives (RPO)](#recovery-point-objectives-rpo)
5. [Emergency Contacts](#emergency-contacts)
6. [Recovery Procedures](#recovery-procedures)
7. [Testing Schedule](#testing-schedule)

## Overview

This runbook provides step-by-step procedures for recovering the Flamoral dating platform from various disaster scenarios. All recovery procedures assume that regular backups are being performed according to the backup schedule.

### Critical Systems
- **AKS Cluster**: flamoral-prod-aks
- **Database**: PostgreSQL Flexible Server (flamoral-prod-postgres)
- **Cache**: Redis Cache (flamoral-prod-redis)
- **Storage**: Azure Blob Storage (flamoralprod*)
- **CDN/WAF**: Azure Front Door (flamoral-prod-afd)
- **DNS**: Azure DNS Zone (flamoral.com)

## Disaster Scenarios

### Scenario 1: Complete AKS Cluster Failure
**Impact**: All application services unavailable
**RTO**: 2 hours
**RPO**: 15 minutes

### Scenario 2: Database Corruption/Failure
**Impact**: Data loss, application unable to read/write data
**RTO**: 4 hours
**RPO**: 1 hour (based on backup frequency)

### Scenario 3: Regional Azure Outage
**Impact**: All services in primary region unavailable
**RTO**: 4 hours
**RPO**: 1 hour

### Scenario 4: Accidental Data Deletion
**Impact**: User data or configurations lost
**RTO**: 1 hour
**RPO**: 1 hour

### Scenario 5: Security Breach/Ransomware
**Impact**: Systems compromised, potential data breach
**RTO**: 8 hours
**RPO**: 1 hour

## Recovery Time Objectives (RTO)

| System | RTO | Priority |
|--------|-----|----------|
| DNS | 15 minutes | Critical |
| Front Door | 30 minutes | Critical |
| AKS Cluster | 2 hours | Critical |
| Database | 4 hours | Critical |
| Redis Cache | 1 hour | High |
| Storage Account | 2 hours | High |
| Monitoring | 2 hours | Medium |

## Recovery Point Objectives (RPO)

| Data Type | RPO | Backup Frequency |
|-----------|-----|------------------|
| Database | 1 hour | Hourly |
| Configuration | 15 minutes | Continuous (via backups) |
| User Files | 24 hours | Daily |
| Logs | 5 minutes | Real-time streaming |

## Emergency Contacts

See [contact-list.md](./contact-list.md) for detailed contact information.

**Emergency Response Team**:
- Platform Lead: [Primary Contact]
- DevOps Lead: [Primary Contact]
- Database Administrator: [Primary Contact]
- Security Lead: [Primary Contact]
- Azure Support: Available via Azure Portal

## Recovery Procedures

### Pre-Recovery Checklist

Before initiating any recovery procedure:

- [ ] Confirm the disaster scenario
- [ ] Notify the emergency response team
- [ ] Document the incident start time
- [ ] Identify the last known good state
- [ ] Verify backup availability
- [ ] Establish communication channel (Teams/Slack)
- [ ] Initiate incident response procedure

---

## Procedure 1: AKS Cluster Complete Recovery

### When to Use
- Complete cluster failure
- Cluster becomes unresponsive
- Need to rebuild cluster from scratch

### Prerequisites
- Access to Azure subscription
- Latest backup of Kubernetes configurations
- Access to container registry (ACR)
- Terraform state backup

### Steps

#### 1. Assess the Situation
```bash
# Check cluster status
az aks show --resource-group flamoral-prod-rg --name flamoral-prod-aks

# Check node status
az aks nodepool list --resource-group flamoral-prod-rg --cluster-name flamoral-prod-aks

# Check recent events
kubectl get events --all-namespaces --sort-by='.lastTimestamp'
```

#### 2. Decision Point: Repair vs Rebuild

**Option A: Repair Cluster** (if cluster is accessible)
```bash
# Try to repair node pool
az aks nodepool update \
  --resource-group flamoral-prod-rg \
  --cluster-name flamoral-prod-aks \
  --name system \
  --enable-cluster-autoscaler

# Scale node pool
az aks nodepool scale \
  --resource-group flamoral-prod-rg \
  --cluster-name flamoral-prod-aks \
  --name system \
  --node-count 3
```

**Option B: Rebuild Cluster** (if cluster is completely failed)

#### 3. Rebuild AKS Cluster (if necessary)

```bash
# Navigate to Terraform directory
cd infrastructure/terraform/environments/prod

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply infrastructure
terraform apply -auto-approve

# Wait for cluster to be ready (10-15 minutes)
```

#### 4. Restore Kubernetes Configurations

```bash
# Connect to new cluster
az aks get-credentials \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks \
  --overwrite-existing

# Run restore script
cd infrastructure/disaster-recovery
./restore-from-backup.sh --k8s --latest
```

#### 5. Restore Secrets

```bash
# Restore encrypted secrets
./restore-from-backup.sh --secrets --latest
```

#### 6. Restore Helm Releases

```bash
# Get latest backup directory
LATEST_BACKUP=$(ls -1dt ../../backups/*/ | head -n 1)

# Restore each Helm release
cd ${LATEST_BACKUP}/helm

for namespace in */; do
  ns=${namespace%/}
  if [ -f "$ns/releases.json" ]; then
    # Restore each release in namespace
    for release in $(jq -r '.[].name' "$ns/releases.json"); do
      helm upgrade --install $release \
        -f "$ns/${release}_values.yaml" \
        --namespace $ns \
        --create-namespace \
        [CHART_LOCATION]
    done
  fi
done
```

#### 7. Verify Services

```bash
# Check all pods
kubectl get pods --all-namespaces

# Check deployments
kubectl get deployments --all-namespaces

# Check services
kubectl get services --all-namespaces

# Check ingress
kubectl get ingress --all-namespaces
```

#### 8. Restore DNS (if needed)

```bash
cd infrastructure/scripts
./rollback.sh --dns
```

#### 9. Verify Application Health

```bash
# Check health endpoints
curl https://api.flamoral.com/health
curl https://www.flamoral.com/health

# Check Front Door health
az afd endpoint show \
  --resource-group flamoral-prod-rg \
  --profile-name flamoral-prod-afd \
  --endpoint-name flamoral-prod
```

#### 10. Complete Recovery

- [ ] All pods running and healthy
- [ ] All services responding
- [ ] Health checks passing
- [ ] DNS resolution working
- [ ] SSL certificates valid
- [ ] Monitoring and alerting restored
- [ ] Document recovery time and issues
- [ ] Communicate service restoration to stakeholders

---

## Procedure 2: Database Recovery

### When to Use
- Database corruption
- Accidental data deletion
- Database server failure
- Need to restore to specific point in time

### Prerequisites
- Database backup available
- Access to Azure subscription
- Database administrator credentials

### Steps

#### 1. Assess Database State

```bash
# Check database server status
az postgres flexible-server show \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-postgres

# Test database connectivity
psql -h flamoral-prod-postgres.postgres.database.azure.com \
  -U flamoraladmin -d flamoral
```

#### 2. Stop Application Traffic

```bash
# Scale down deployments to prevent writes
kubectl scale deployment dating-api --replicas=0 -n default
kubectl scale deployment chat-service --replicas=0 -n default
kubectl scale deployment media-processor --replicas=0 -n default
```

#### 3. Create Database Backup (Current State)

```bash
# Create emergency backup before restore
cd infrastructure/scripts
./database-backup.sh --emergency
```

#### 4. Restore from Backup

**Option A: Azure Portal Restore**
1. Navigate to Azure Portal > PostgreSQL flexible server
2. Select "Restore"
3. Choose restore point (time or latest backup)
4. Specify new server name: flamoral-prod-postgres-restored
5. Click "Review + Create"

**Option B: Azure CLI Restore**
```bash
# Restore to point in time
az postgres flexible-server restore \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-postgres-restored \
  --source-server flamoral-prod-postgres \
  --restore-time "2024-01-01T12:00:00Z"

# Or restore from specific backup
az postgres flexible-server restore \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-postgres-restored \
  --source-server flamoral-prod-postgres \
  --backup-id [BACKUP_ID]
```

#### 5. Verify Restored Database

```bash
# Connect to restored database
psql -h flamoral-prod-postgres-restored.postgres.database.azure.com \
  -U flamoraladmin -d flamoral

# Verify data integrity
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM matches;
SELECT COUNT(*) FROM messages;

# Check latest timestamps
SELECT MAX(created_at) FROM users;
SELECT MAX(created_at) FROM matches;
```

#### 6. Switch to Restored Database

**Update connection strings in Key Vault**:
```bash
# Get new connection string
NEW_HOST="flamoral-prod-postgres-restored.postgres.database.azure.com"

# Update in Key Vault
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name postgres-connection-string \
  --value "postgresql://flamoraladmin:${PASSWORD}@${NEW_HOST}:5432/flamoral?sslmode=require"
```

**Update Kubernetes secrets**:
```bash
# Force pods to restart and pick up new connection string
kubectl rollout restart deployment dating-api -n default
kubectl rollout restart deployment chat-service -n default
```

#### 7. Restore Application Traffic

```bash
# Scale deployments back up
kubectl scale deployment dating-api --replicas=3 -n default
kubectl scale deployment chat-service --replicas=2 -n default
kubectl scale deployment media-processor --replicas=2 -n default

# Verify pods are healthy
kubectl get pods -n default
```

#### 8. Verify Application Functionality

```bash
# Test API endpoints
curl -X POST https://api.flamoral.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Monitor logs
kubectl logs -f deployment/dating-api -n default
```

#### 9. Data Validation

- [ ] User authentication working
- [ ] User profiles accessible
- [ ] Messages loading correctly
- [ ] Matches displaying properly
- [ ] No data corruption detected
- [ ] All recent transactions present

#### 10. Cleanup

```bash
# After confirming restoration success, you can delete the old server
# CAUTION: Only do this after thorough verification

# Rename servers (optional)
# 1. Delete old server
az postgres flexible-server delete \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-postgres \
  --yes

# 2. Rename restored server
# (Note: Server rename is not supported, so update DNS/connection strings instead)
```

---

## Procedure 3: Regional Failover

### When to Use
- Complete Azure region outage
- Major regional disaster
- Extended regional service degradation

### Prerequisites
- Secondary region configured
- Database geo-replication enabled
- Front Door multi-region routing configured

### Steps

#### 1. Confirm Regional Outage

```bash
# Check Azure status
# Visit: https://status.azure.com/

# Check resource availability
az resource list \
  --resource-group flamoral-prod-rg \
  --location westus2 \
  --query "[].{Name:name, State:properties.provisioningState}"
```

#### 2. Activate Secondary Region

**This procedure requires pre-configured secondary region infrastructure**

```bash
# Deploy to secondary region
cd infrastructure/terraform/environments/prod-secondary

terraform init
terraform apply -auto-approve
```

#### 3. Update DNS for Failover

```bash
# Update DNS A records to point to secondary region
az network dns record-set a update \
  --resource-group flamoral-prod-rg \
  --zone-name flamoral.com \
  --name "@" \
  --set aRecords[0].ipv4Address="[SECONDARY_IP]"

az network dns record-set a update \
  --resource-group flamoral-prod-rg \
  --zone-name flamoral.com \
  --name "www" \
  --set aRecords[0].ipv4Address="[SECONDARY_IP]"

az network dns record-set a update \
  --resource-group flamoral-prod-rg \
  --zone-name flamoral.com \
  --name "api" \
  --set aRecords[0].ipv4Address="[SECONDARY_IP]"
```

#### 4. Activate Read Replica as Primary

```bash
# Promote read replica to primary
az postgres flexible-server replica promote \
  --resource-group flamoral-prod-secondary-rg \
  --name flamoral-prod-postgres-secondary
```

#### 5. Update Front Door Routing

```bash
# Update Front Door origin priority
az afd origin update \
  --resource-group flamoral-prod-rg \
  --profile-name flamoral-prod-afd \
  --origin-group-name flamoral-origin-group \
  --origin-name flamoral-secondary-origin \
  --priority 1 \
  --weight 1000

# Disable primary origin
az afd origin update \
  --resource-group flamoral-prod-rg \
  --profile-name flamoral-prod-afd \
  --origin-group-name flamoral-origin-group \
  --origin-name flamoral-primary-origin \
  --enabled false
```

#### 6. Verify Failover

- [ ] DNS propagation complete (check with `dig flamoral.com`)
- [ ] Application accessible from secondary region
- [ ] Database read/write operations working
- [ ] User sessions maintained
- [ ] Health checks passing

#### 7. Monitor and Communicate

- [ ] Update status page
- [ ] Notify users of potential brief interruption
- [ ] Monitor application performance
- [ ] Watch for errors or issues

---

## Procedure 4: Configuration Rollback

See [rollback.sh](../scripts/rollback.sh) script for automated rollback procedures.

### Quick Rollback Commands

```bash
# Rollback specific service
./rollback.sh --service api

# Rollback all services
./rollback.sh --all

# Rollback DNS
./rollback.sh --dns

# Rollback Front Door
./rollback.sh --frontdoor
```

---

## Testing Schedule

### Disaster Recovery Drills

| Test Type | Frequency | Duration | Participants |
|-----------|-----------|----------|--------------|
| Database Restore | Quarterly | 2 hours | DBA, DevOps |
| AKS Recovery | Bi-annually | 4 hours | DevOps, Platform Team |
| Regional Failover | Annually | 8 hours | All Teams |
| Configuration Rollback | Monthly | 1 hour | DevOps |
| Full DR Exercise | Annually | 1 day | All Teams |

### Test Documentation

After each DR test:
1. Document actual RTO vs target RTO
2. Document actual RPO vs target RPO
3. Identify issues and gaps
4. Update runbook with lessons learned
5. Update automation scripts
6. Schedule remediation for identified gaps

---

## Post-Recovery Actions

After any disaster recovery:

1. **Document the Incident**
   - Timeline of events
   - Root cause analysis
   - Recovery steps taken
   - Issues encountered
   - Actual RTO/RPO achieved

2. **Post-Incident Review**
   - Schedule within 48 hours
   - Review what went well
   - Identify improvements
   - Update runbooks
   - Update automation

3. **Communication**
   - Internal stakeholders
   - Users (if applicable)
   - Status page update
   - Post-mortem report

4. **Remediation**
   - Fix root cause
   - Implement preventive measures
   - Update monitoring/alerting
   - Schedule follow-up

---

## Appendix

### Useful Commands

**Check Azure Service Health**:
```bash
az rest --method get \
  --uri "https://management.azure.com/subscriptions/{subscriptionId}/providers/Microsoft.ResourceHealth/availabilityStatuses?api-version=2020-05-01"
```

**Check AKS Node Health**:
```bash
kubectl get nodes -o wide
kubectl describe node [NODE_NAME]
```

**Check Pod Logs**:
```bash
kubectl logs -f deployment/[DEPLOYMENT_NAME] -n [NAMESPACE]
kubectl logs --previous deployment/[DEPLOYMENT_NAME] -n [NAMESPACE]
```

**Check Database Connections**:
```bash
psql -h [HOST] -U [USER] -d [DATABASE] -c "SELECT count(*) FROM pg_stat_activity;"
```

### Additional Resources

- [Azure Disaster Recovery Documentation](https://docs.microsoft.com/en-us/azure/site-recovery/)
- [AKS Backup and Restore](https://docs.microsoft.com/en-us/azure/aks/operator-best-practices-storage)
- [PostgreSQL Backup and Restore](https://docs.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-backup-restore)
- [Azure Front Door Routing](https://docs.microsoft.com/en-us/azure/frontdoor/front-door-routing-architecture)

---

**Last Updated**: 2024-12-13
**Document Owner**: DevOps Team
**Review Frequency**: Quarterly
