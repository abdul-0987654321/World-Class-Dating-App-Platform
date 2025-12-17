# Regional Failover Procedure

## Overview

This document outlines the procedure for failing over the Flamoral platform from the primary region (West US 2) to a secondary region in the event of a regional outage or disaster.

## Prerequisites

- Secondary region infrastructure deployed
- Database geo-replication configured
- DNS access available
- Azure Front Door configured with multi-region origins
- Emergency response team notified

## Failover Decision Criteria

Initiate regional failover when:

1. **Complete Regional Outage**
   - Azure region status shows outage
   - Multiple services in region unavailable
   - No estimated time for restoration

2. **Extended Service Degradation**
   - Service degradation lasting > 30 minutes
   - RTO approaching or exceeded
   - Performance below acceptable thresholds

3. **Planned Maintenance**
   - Scheduled regional migration
   - Infrastructure updates requiring downtime
   - Disaster recovery testing

## Failover Time Estimate

| Component | Time Required |
|-----------|---------------|
| Decision and Approval | 15 minutes |
| Database Failover | 30 minutes |
| DNS Update | 15 minutes (+ propagation) |
| Front Door Reconfiguration | 10 minutes |
| Verification | 30 minutes |
| **Total** | **~2 hours** |

## Pre-Failover Checklist

Before initiating failover:

- [ ] Confirm outage severity and scope
- [ ] Verify secondary region availability
- [ ] Check database replication lag
- [ ] Notify stakeholders (internal)
- [ ] Prepare status page update
- [ ] Document incident start time
- [ ] Establish war room/communication channel

---

## Phase 1: Assessment (0-15 minutes)

### 1.1 Verify Primary Region Status

```bash
# Check Azure service health
az rest --method get \
  --uri "https://management.azure.com/subscriptions/{subscriptionId}/providers/Microsoft.ResourceHealth/availabilityStatuses?api-version=2020-05-01" \
  | jq '.value[] | select(.location == "westus2")'

# Check resource status
az resource list \
  --resource-group flamoral-prod-rg \
  --query "[].{Name:name, State:properties.provisioningState}" \
  --output table
```

### 1.2 Verify Secondary Region Readiness

```bash
# Check secondary region resources
az resource list \
  --resource-group flamoral-prod-secondary-rg \
  --query "[].{Name:name, State:properties.provisioningState}" \
  --output table

# Verify AKS cluster health
az aks show \
  --resource-group flamoral-prod-secondary-rg \
  --name flamoral-prod-secondary-aks \
  --query "provisioningState"

# Check node status
az aks nodepool list \
  --resource-group flamoral-prod-secondary-rg \
  --cluster-name flamoral-prod-secondary-aks \
  --output table
```

### 1.3 Check Database Replication

```bash
# Check replication lag
az postgres flexible-server replica list \
  --resource-group flamoral-prod-rg \
  --server-name flamoral-prod-postgres

# Verify secondary database is ready
az postgres flexible-server show \
  --resource-group flamoral-prod-secondary-rg \
  --name flamoral-prod-postgres-secondary \
  --query "{Name:name, State:state, Replication:replicationRole}"
```

### Decision Point

**Go/No-Go Decision**: Based on assessment, decide whether to proceed with failover.

---

## Phase 2: Database Failover (15-45 minutes)

### 2.1 Prepare for Database Failover

```bash
# Stop writes to primary database (scale down applications)
kubectl scale deployment dating-api --replicas=0 -n default --context=primary-cluster
kubectl scale deployment chat-service --replicas=0 -n default --context=primary-cluster
kubectl scale deployment media-processor --replicas=0 -n default --context=primary-cluster

# Wait for connections to drain (30 seconds)
sleep 30
```

### 2.2 Promote Secondary Database

```bash
# Promote read replica to primary
az postgres flexible-server replica promote \
  --resource-group flamoral-prod-secondary-rg \
  --name flamoral-prod-postgres-secondary

# Wait for promotion to complete (can take 5-10 minutes)
# Monitor promotion status
az postgres flexible-server show \
  --resource-group flamoral-prod-secondary-rg \
  --name flamoral-prod-postgres-secondary \
  --query "replicationRole"
```

### 2.3 Verify Database Promotion

```bash
# Connect to promoted database
psql -h flamoral-prod-postgres-secondary.postgres.database.azure.com \
  -U flamoraladmin -d flamoral

# Verify read-write capability
psql> SELECT pg_is_in_recovery();  -- Should return 'f' (false)
psql> \q

# Check data integrity
psql -h flamoral-prod-postgres-secondary.postgres.database.azure.com \
  -U flamoraladmin -d flamoral \
  -c "SELECT COUNT(*) FROM users;"
```

### 2.4 Update Database Connection Strings

```bash
# Get secondary database connection details
SECONDARY_DB_HOST="flamoral-prod-postgres-secondary.postgres.database.azure.com"

# Update Key Vault secrets
az keyvault secret set \
  --vault-name flamoral-prod-kv-secondary \
  --name postgres-connection-string \
  --value "postgresql://flamoraladmin:${PASSWORD}@${SECONDARY_DB_HOST}:5432/flamoral?sslmode=require"
```

---

## Phase 3: Application Failover (45-60 minutes)

### 3.1 Connect to Secondary AKS Cluster

```bash
# Get credentials for secondary cluster
az aks get-credentials \
  --resource-group flamoral-prod-secondary-rg \
  --name flamoral-prod-secondary-aks \
  --overwrite-existing

# Verify cluster connectivity
kubectl get nodes
kubectl get pods --all-namespaces
```

### 3.2 Verify Application Deployments

```bash
# Check deployment status
kubectl get deployments -n default
kubectl get services -n default
kubectl get ingress -n default

# Check pod health
kubectl get pods -n default -o wide

# Verify all pods are running
PODS_NOT_READY=$(kubectl get pods -n default --field-selector=status.phase!=Running | tail -n +2 | wc -l)
if [ $PODS_NOT_READY -gt 0 ]; then
    echo "WARNING: $PODS_NOT_READY pods are not ready"
    kubectl get pods -n default --field-selector=status.phase!=Running
fi
```

### 3.3 Scale Up Secondary Applications

```bash
# Scale up applications to production capacity
kubectl scale deployment dating-api --replicas=3 -n default
kubectl scale deployment chat-service --replicas=2 -n default
kubectl scale deployment media-processor --replicas=2 -n default
kubectl scale deployment chat-worker --replicas=2 -n default
kubectl scale deployment dating-web --replicas=3 -n default

# Wait for pods to be ready
kubectl wait --for=condition=ready pod \
  -l app=dating-api \
  -n default \
  --timeout=300s
```

---

## Phase 4: Network Failover (60-75 minutes)

### 4.1 Update Azure Front Door Routing

```bash
# Get secondary region public IP
SECONDARY_IP=$(az network public-ip show \
  --resource-group flamoral-prod-secondary-rg \
  --name flamoral-prod-secondary-ingress-pip \
  --query "ipAddress" \
  --output tsv)

echo "Secondary region IP: $SECONDARY_IP"

# Update Front Door origin to use secondary
az afd origin update \
  --resource-group flamoral-prod-rg \
  --profile-name flamoral-prod-afd \
  --origin-group-name flamoral-origin-group \
  --origin-name flamoral-secondary-origin \
  --host-name "${SECONDARY_IP}" \
  --priority 1 \
  --weight 1000 \
  --enabled true

# Disable primary origin
az afd origin update \
  --resource-group flamoral-prod-rg \
  --profile-name flamoral-prod-afd \
  --origin-group-name flamoral-origin-group \
  --origin-name flamoral-primary-origin \
  --enabled false
```

### 4.2 Update DNS (Backup Method)

If Front Door is not working, update DNS directly:

```bash
# Update DNS A records to point to secondary region
az network dns record-set a update \
  --resource-group flamoral-prod-rg \
  --zone-name flamoral.com \
  --name "@" \
  --set aRecords[0].ipv4Address="${SECONDARY_IP}"

az network dns record-set a update \
  --resource-group flamoral-prod-rg \
  --zone-name flamoral.com \
  --name "www" \
  --set aRecords[0].ipv4Address="${SECONDARY_IP}"

az network dns record-set a update \
  --resource-group flamoral-prod-rg \
  --zone-name flamoral.com \
  --name "api" \
  --set aRecords[0].ipv4Address="${SECONDARY_IP}"
```

### 4.3 Verify DNS Propagation

```bash
# Check DNS resolution
dig @8.8.8.8 flamoral.com A
dig @8.8.8.8 www.flamoral.com A
dig @8.8.8.8 api.flamoral.com A

# Check from multiple locations
nslookup flamoral.com 8.8.8.8
nslookup flamoral.com 1.1.1.1
```

---

## Phase 5: Verification (75-105 minutes)

### 5.1 Health Check Verification

```bash
# Test health endpoints
curl -I https://flamoral.com/health
curl -I https://www.flamoral.com/health
curl -I https://api.flamoral.com/health

# Expected response: HTTP/2 200
```

### 5.2 Functional Testing

```bash
# Test API endpoints
# Authentication
curl -X POST https://api.flamoral.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# User profile
curl https://api.flamoral.com/api/users/me \
  -H "Authorization: Bearer ${TOKEN}"

# Matches
curl https://api.flamoral.com/api/matches \
  -H "Authorization: Bearer ${TOKEN}"
```

### 5.3 Application Monitoring

```bash
# Check application logs
kubectl logs -f deployment/dating-api -n default --tail=100
kubectl logs -f deployment/chat-service -n default --tail=100

# Check for errors
kubectl logs deployment/dating-api -n default --since=5m | grep -i error
kubectl logs deployment/chat-service -n default --since=5m | grep -i error
```

### 5.4 Performance Verification

```bash
# Check response times
time curl -s https://api.flamoral.com/health > /dev/null
time curl -s https://www.flamoral.com/ > /dev/null

# Check database query performance
psql -h flamoral-prod-postgres-secondary.postgres.database.azure.com \
  -U flamoraladmin -d flamoral \
  -c "\timing on" \
  -c "SELECT COUNT(*) FROM users;"
```

---

## Phase 6: Post-Failover (105+ minutes)

### 6.1 Update Status Page

```plaintext
Title: Service Restored - Regional Failover Completed

We have successfully completed a failover to our secondary region due to
[brief description of incident]. All services are now operational.

Current Status: Operational
Next Update: [Time]
```

### 6.2 Notify Stakeholders

**Internal Communication**:
```plaintext
Subject: RESOLVED - Regional Failover Completed

Team,

We have successfully failed over to our secondary region. All services
are operational and performing normally.

Summary:
- Incident Start: [Time]
- Failover Initiated: [Time]
- Failover Completed: [Time]
- Total Downtime: [Duration]

Current Status:
✓ Database: Running on secondary (promoted)
✓ Applications: Running in secondary region
✓ DNS: Updated and propagated
✓ Health Checks: All passing

Next Steps:
- Continue monitoring for 24 hours
- Schedule post-incident review
- Plan for failback when primary region is restored

Thanks,
[Team]
```

### 6.3 Enhanced Monitoring

```bash
# Set up enhanced monitoring for 24 hours
# Increase alert sensitivity
# Monitor key metrics:
# - Response times
# - Error rates
# - Database connections
# - Pod restart counts
```

---

## Phase 7: Failback Planning

When primary region is restored and stable:

### 7.1 Pre-Failback Assessment

- [ ] Primary region stable for at least 24 hours
- [ ] All primary resources healthy
- [ ] Database replication re-established (secondary → primary)
- [ ] Change window scheduled
- [ ] Stakeholders notified

### 7.2 Failback Procedure

The failback procedure is essentially the reverse of the failover:

1. Establish replication from secondary (current primary) to original primary
2. Let replication catch up completely
3. Schedule maintenance window
4. Stop writes to secondary
5. Promote original primary database
6. Update connection strings
7. Update Front Door/DNS to original primary
8. Verify and monitor

### 7.3 Failback Script

```bash
# To be executed during planned maintenance window
# See failback.sh script (to be created)
```

---

## Rollback Plan

If failover encounters issues:

### Rollback Triggers
- Secondary region unhealthy
- Database promotion failed
- Critical functionality not working
- Unacceptable performance degradation

### Rollback Steps

1. **Immediate**:
   ```bash
   # Re-enable primary origin in Front Door
   az afd origin update \
     --resource-group flamoral-prod-rg \
     --profile-name flamoral-prod-afd \
     --origin-group-name flamoral-origin-group \
     --origin-name flamoral-primary-origin \
     --enabled true
   ```

2. **If possible**: Revert DNS changes

3. **Communicate**: Update stakeholders about rollback

4. **Investigate**: Determine why failover failed

---

## Testing Schedule

### Quarterly Failover Tests

Test the entire failover procedure quarterly during planned maintenance:

**Test Procedure**:
1. Announce planned test to stakeholders
2. Execute failover to secondary region
3. Verify all functionality
4. Run for 2 hours
5. Execute failback to primary
6. Document results and issues

**Success Criteria**:
- Failover completed within RTO (2 hours)
- No data loss
- All functionality working
- Acceptable performance

---

## Contact Information

See [contact-list.md](./contact-list.md) for emergency contacts during failover.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-13 | DevOps Team | Initial version |

**Last Reviewed**: 2024-12-13
**Next Review**: 2025-03-13
**Document Owner**: DevOps Team
