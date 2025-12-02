# Disaster Recovery Failover Playbook

## Pre-Requisites
- [ ] Verify incident severity warrants failover
- [ ] Notify stakeholders via incident channel
- [ ] Create incident ticket
- [ ] Assemble DR team on bridge

## Phase 1: Assessment (Target: 5 minutes)

### 1.1 Verify Primary Region Status
```bash
# Check Azure Service Health
az rest --method get --uri "https://management.azure.com/subscriptions/{subscriptionId}/providers/Microsoft.ResourceHealth/availabilityStatuses?api-version=2020-05-01"

# Check AKS cluster health
az aks show --resource-group production-dating-app-rg --name production-dating-app-aks --query "powerState"

# Check database health
az postgres flexible-server show --resource-group production-dating-app-rg --name production-dating-app-postgres --query "state"
```

### 1.2 Verify Secondary Region Readiness
```bash
# Check secondary AKS cluster
az aks show --resource-group production-dating-app-secondary-rg --name production-dating-app-aks-secondary --query "powerState"

# Check read replica status
az postgres flexible-server show --resource-group production-dating-app-secondary-rg --name production-dating-app-postgres-replica --query "state"
```

### 1.3 Determine Failover Type
- **Partial Failover**: Specific service failure
- **Full Failover**: Complete region outage
- **Database-Only**: Database-specific issue

## Phase 2: Preparation (Target: 5 minutes)

### 2.1 Enable Maintenance Mode
```bash
# Scale down non-critical workloads in primary
kubectl scale deployment matching-engine --replicas=0 -n dating-app-production
kubectl scale deployment recommendation-engine --replicas=0 -n dating-app-production
```

### 2.2 Verify Data Replication Lag
```bash
# Check PostgreSQL replication lag
psql -h production-dating-app-postgres-replica.postgres.database.azure.com \
  -U datingappadmin -d dating_app_production \
  -c "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS replication_lag_seconds;"

# Should be < 60 seconds
```

### 2.3 Backup Current State
```bash
# Export Kubernetes state
kubectl get all -n dating-app-production -o yaml > /tmp/k8s-state-backup-$(date +%Y%m%d-%H%M%S).yaml

# Backup Key Vault secrets
az keyvault secret backup --vault-name production-dating-kv --name production-jwt-secret --file jwt-secret-backup.blob
```

## Phase 3: Database Failover (Target: 5 minutes)

### 3.1 Promote Read Replica to Primary
```bash
# Stop writes to primary (if accessible)
az postgres flexible-server update \
  --resource-group production-dating-app-rg \
  --name production-dating-app-postgres \
  --public-network-access Disabled

# Promote replica to standalone server
az postgres flexible-server replica promote \
  --resource-group production-dating-app-secondary-rg \
  --name production-dating-app-postgres-replica

# Verify promotion
az postgres flexible-server show \
  --resource-group production-dating-app-secondary-rg \
  --name production-dating-app-postgres-replica \
  --query "replicationRole"
# Should return "None" (standalone)
```

### 3.2 Update Connection Strings
```bash
# Update Key Vault secret
az keyvault secret set \
  --vault-name production-dating-kv \
  --name production-database-connection-string \
  --value "postgresql://datingappadmin:PASSWORD@production-dating-app-postgres-replica.postgres.database.azure.com:5432/dating_app_production?sslmode=require"

# Restart pods to pick up new connection string
kubectl rollout restart deployment -n dating-app-production
```

## Phase 4: Application Failover (Target: 10 minutes)

### 4.1 Update Traffic Manager
```bash
# Disable primary endpoint
az network traffic-manager endpoint update \
  --resource-group production-dating-app-rg \
  --profile-name production-dating-app-tm \
  --name primary-endpoint-eastus \
  --type azureEndpoints \
  --endpoint-status Disabled

# Enable secondary endpoint with higher priority
az network traffic-manager endpoint update \
  --resource-group production-dating-app-rg \
  --profile-name production-dating-app-tm \
  --name secondary-endpoint-westus2 \
  --type azureEndpoints \
  --endpoint-status Enabled \
  --priority 1
```

### 4.2 Scale Up Secondary Cluster
```bash
# Set context to secondary cluster
az aks get-credentials \
  --resource-group production-dating-app-secondary-rg \
  --name production-dating-app-aks-secondary

# Scale up deployments
kubectl scale deployment dating-api --replicas=10 -n dating-app-production
kubectl scale deployment dating-app --replicas=8 -n dating-app-production
kubectl scale deployment chat-worker --replicas=5 -n dating-app-production

# Verify pods are running
kubectl get pods -n dating-app-production -w
```

### 4.3 Update DNS (if needed)
```bash
# Update A record to point to secondary region
az network dns record-set a update \
  --resource-group production-dating-app-rg \
  --zone-name datingapp.com \
  --name @ \
  --set aRecords[0].ipv4Address=<SECONDARY_INGRESS_IP>
```

## Phase 5: Verification (Target: 10 minutes)

### 5.1 Health Checks
```bash
# Test API endpoint
curl -I https://api.datingapp.com/health

# Test web application
curl -I https://www.datingapp.com

# Check database connectivity
psql -h production-dating-app-postgres-replica.postgres.database.azure.com \
  -U datingappadmin -d dating_app_production -c "SELECT 1;"
```

### 5.2 Monitoring Verification
```bash
# Check Prometheus targets
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Navigate to http://localhost:9090/targets

# Check Grafana dashboards
kubectl port-forward -n monitoring svc/grafana 3000:3000
# Navigate to http://localhost:3000
```

### 5.3 Functional Testing
- [ ] User login
- [ ] Profile viewing
- [ ] Matching functionality
- [ ] Messaging
- [ ] Media upload
- [ ] Payment processing

## Phase 6: Communication

### 6.1 Status Updates
```
Template:
[TIME] - FAILOVER IN PROGRESS
Primary Region: East US - UNAVAILABLE
Secondary Region: West US 2 - ACTIVE
Current Status: [Database/Application/Traffic] failover complete
Impact: [None/Minimal/Degraded service]
ETA to full resolution: [TIME]
```

### 6.2 Notification Channels
- Status page update
- Email to customers
- Social media update
- Internal Slack announcement

## Phase 7: Post-Failover Tasks

### 7.1 Immediate (within 1 hour)
- [ ] Monitor error rates and latency
- [ ] Review and adjust autoscaling
- [ ] Check backup jobs are running
- [ ] Verify all integrations working

### 7.2 Short-term (within 24 hours)
- [ ] Create new read replica from new primary
- [ ] Review and optimize costs
- [ ] Schedule primary region recovery
- [ ] Document lessons learned

## Rollback Procedure

### When Primary Region Recovers

```bash
# 1. Verify primary region health
az aks show --resource-group production-dating-app-rg --name production-dating-app-aks

# 2. Create replica from secondary (now primary) to original primary region
az postgres flexible-server replica create \
  --replica-name production-dating-app-postgres-restored \
  --resource-group production-dating-app-rg \
  --source-server production-dating-app-postgres-replica

# 3. Wait for replica to sync (check lag < 10 seconds)

# 4. Schedule maintenance window for reverse failover

# 5. Promote original primary back during maintenance window
# 6. Update Traffic Manager to route back to primary region
# 7. Scale down secondary region to standby capacity
```

## Emergency Contacts

- **Primary On-Call**: +1-555-0001
- **Secondary On-Call**: +1-555-0002
- **Azure Support**: +1-800-642-7676
- **Database DBA**: dba@datingapp.com
- **Infrastructure Lead**: infrastructure@datingapp.com
- **CTO**: cto@datingapp.com

## Reference Documents

- Azure Service Health: https://status.azure.com
- Internal Wiki: https://wiki.datingapp.com/dr
- Incident Management: https://incidents.datingapp.com
