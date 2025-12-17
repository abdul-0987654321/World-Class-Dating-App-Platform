# Flamoral Dating Platform - Emergency Scaling Runbook

## Overview

This runbook provides procedures for handling sudden traffic spikes, resource exhaustion, and emergency scaling scenarios in the Flamoral dating platform. It covers both vertical and horizontal scaling for all infrastructure components.

**Last Updated:** 2025-12-17
**Version:** 1.0.0
**Maintained By:** DevOps & SRE Team

## Table of Contents

1. [Scaling Architecture](#scaling-architecture)
2. [Rapid Assessment](#rapid-assessment)
3. [Application Scaling](#application-scaling)
4. [Database Scaling](#database-scaling)
5. [Cache Scaling](#cache-scaling)
6. [Infrastructure Scaling](#infrastructure-scaling)
7. [Automated Scaling](#automated-scaling)
8. [Cost Considerations](#cost-considerations)
9. [Rollback Procedures](#rollback-procedures)

## Scaling Architecture

### Current Capacity

**Production Environment:**
```
Application Tier (AKS):
├── dating-api: 3-10 pods (HPA enabled)
├── dating-worker: 2-8 pods (HPA enabled)
├── dating-matching-service: 2-6 pods (HPA enabled)
├── dating-messaging-service: 3-12 pods (HPA enabled)
├── dating-notification-service: 2-6 pods (HPA enabled)
└── dating-media-service: 2-6 pods (HPA enabled)

Database Tier:
├── PostgreSQL: GP_Standard_D4s_v3 (4 vCores, 16GB)
└── Read Replicas: 2x D4s_v3

Cache Tier:
└── Redis Premium P1 (6GB, 20k ops/sec)

Compute Tier (AKS):
├── System Node Pool: 2-4 nodes (D4s_v3)
└── User Node Pool: 3-10 nodes (D8s_v3)
```

### Scaling Limits

| Component | Current | Min | Max | Auto-Scale |
|-----------|---------|-----|-----|------------|
| dating-api pods | 3 | 2 | 20 | Yes (CPU 70%) |
| dating-worker pods | 2 | 1 | 15 | Yes (CPU 70%) |
| dating-messaging pods | 3 | 2 | 25 | Yes (CPU/Conn) |
| AKS user nodes | 3 | 3 | 20 | Yes (CPU 75%) |
| PostgreSQL vCores | 4 | 2 | 64 | Manual |
| Redis Cache | P1 | C0 | P5 | Manual |

## Rapid Assessment

### First 2 Minutes: Identify Bottleneck

#### Check Current Load
```bash
# Overall cluster health
kubectl top nodes

# Pod resource usage
kubectl top pods -n datingapp --sort-by=cpu
kubectl top pods -n datingapp --sort-by=memory

# Quick metrics
kubectl get hpa -n datingapp

# Current pod counts
kubectl get deployments -n datingapp -o wide
```

#### Identify the Constraint
```bash
# 1. Check if pods are CPU constrained
kubectl top pods -n datingapp | awk '{if ($3 > 80) print $0}'

# 2. Check if pods are memory constrained
kubectl top pods -n datingapp | awk '{if ($4 > 80) print $0}'

# 3. Check pending pods (node capacity issue)
kubectl get pods -n datingapp --field-selector=status.phase=Pending

# 4. Check database connections
kubectl exec -n datingapp deployment/dating-api -- \
  curl -s localhost:8080/metrics | grep database_connections_active

# 5. Check cache hit rate
kubectl exec -n datingapp deployment/dating-api -- \
  curl -s localhost:8080/metrics | grep cache_hit_rate
```

#### Check Application Insights
```bash
# Request rate
az monitor app-insights metrics show \
  --app datingapp-prod-appinsights \
  --metric requests/rate \
  --interval PT1M

# Response time
az monitor app-insights metrics show \
  --app datingapp-prod-appinsights \
  --metric requests/duration \
  --interval PT1M \
  --aggregation avg

# Error rate
az monitor app-insights metrics show \
  --app datingapp-prod-appinsights \
  --metric requests/failed \
  --interval PT1M
```

### Decision Matrix

| Symptom | Likely Cause | Quick Action | Runbook Section |
|---------|--------------|--------------|-----------------|
| High CPU on pods | Traffic spike | Scale pods horizontally | [Pod Scaling](#horizontal-pod-scaling) |
| High memory on pods | Memory leak | Restart + scale | [Service Restart](SERVICE_RESTART_PROCEDURES.md) |
| Pods pending | Node capacity | Scale AKS nodes | [Node Scaling](#aks-node-scaling) |
| Database CPU >80% | Query load | Add read replicas | [Database Scaling](#database-scaling) |
| Database connections maxed | Connection pool | Scale pods down or increase max | [DB Connection Pool](#database-connection-pool-scaling) |
| Redis memory >90% | Cache full | Scale Redis or evict | [Cache Scaling](#cache-scaling) |
| High latency | Multiple factors | Scale everything | [Full Scale](#emergency-full-scale) |

## Application Scaling

### Horizontal Pod Scaling

#### Quick Scale: dating-api

**When:** Traffic spike, high CPU/memory on API pods

```bash
# Check current status
kubectl get deployment dating-api -n datingapp
kubectl get hpa dating-api -n datingapp

# Immediate manual scale
kubectl scale deployment/dating-api --replicas=10 -n datingapp

# Monitor scaling
watch -n 2 'kubectl get pods -n datingapp -l app=dating-api'

# Verify new pods are ready
kubectl wait --for=condition=ready pod -l app=dating-api -n datingapp --timeout=120s

# Check distribution across nodes
kubectl get pods -n datingapp -l app=dating-api -o wide
```

#### Quick Scale: dating-worker

**When:** Job queue backing up

```bash
# Check current queue size
kubectl exec -n datingapp deployment/dating-worker -- \
  curl -s localhost:8080/metrics | grep 'jobs_pending\|jobs_processing'

# Scale workers
kubectl scale deployment/dating-worker --replicas=8 -n datingapp

# Monitor job processing rate
watch -n 5 'kubectl exec -n datingapp deployment/dating-worker -- \
  curl -s localhost:8080/metrics | grep jobs_completed_total'
```

#### Quick Scale: dating-messaging-service

**When:** Active connection count high, message latency increasing

```bash
# Check active connections
kubectl exec -n datingapp deployment/dating-messaging-service -- \
  curl -s localhost:8080/metrics | grep active_connections

# Scale messaging service
kubectl scale deployment/dating-messaging-service --replicas=12 -n datingapp

# Verify connection distribution
for pod in $(kubectl get pods -n datingapp -l app=dating-messaging-service -o name); do
  echo "$pod:"
  kubectl exec -n datingapp $pod -- \
    curl -s localhost:8080/metrics | grep active_connections
done
```

#### Update HPA Limits

**When:** Need to allow higher auto-scaling

```bash
# Update HPA max replicas
kubectl patch hpa dating-api -n datingapp -p '{"spec":{"maxReplicas":20}}'

# Update HPA target CPU
kubectl patch hpa dating-api -n datingapp -p '{"spec":{"targetCPUUtilizationPercentage":60}}'

# Verify HPA configuration
kubectl get hpa dating-api -n datingapp -o yaml

# Check HPA events
kubectl describe hpa dating-api -n datingapp | grep -A 10 Events
```

### Vertical Pod Scaling

**When:** Pods consistently hitting resource limits

#### Increase Pod Resources
```bash
# Update deployment with higher limits
kubectl patch deployment dating-api -n datingapp -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "dating-api",
          "resources": {
            "requests": {
              "cpu": "1000m",
              "memory": "2Gi"
            },
            "limits": {
              "cpu": "2000m",
              "memory": "4Gi"
            }
          }
        }]
      }
    }
  }
}'

# Rolling update will apply changes
kubectl rollout status deployment/dating-api -n datingapp
```

### AKS Node Scaling

#### Manual Node Pool Scaling

**When:** Pods pending due to insufficient node capacity

```bash
# Check current node pool size
az aks nodepool show \
  --resource-group datingapp-prod-rg \
  --cluster-name flamoral-prod-aks \
  --name userpool \
  --query "{count:count, min:minCount, max:maxCount}" -o table

# Check why pods are pending
kubectl describe pod -n datingapp <pending-pod-name> | grep -A 10 Events

# Scale node pool immediately
az aks nodepool scale \
  --resource-group datingapp-prod-rg \
  --cluster-name flamoral-prod-aks \
  --name userpool \
  --node-count 10

# Monitor node provisioning
watch -n 10 'kubectl get nodes'

# Wait for nodes to be ready
kubectl wait --for=condition=ready node -l agentpool=userpool --timeout=600s
```

#### Update Cluster Autoscaler

**When:** Need to increase autoscaling capacity

```bash
# Update node pool autoscaler limits
az aks nodepool update \
  --resource-group datingapp-prod-rg \
  --cluster-name flamoral-prod-aks \
  --name userpool \
  --min-count 5 \
  --max-count 20 \
  --enable-cluster-autoscaler

# Verify autoscaler settings
az aks nodepool show \
  --resource-group datingapp-prod-rg \
  --cluster-name flamoral-prod-aks \
  --name userpool \
  --query "{min:minCount, max:maxCount, current:count, autoScale:enableAutoScaling}" -o table
```

## Database Scaling

### Database Connection Pool Scaling

#### Check Current Connection Usage
```bash
# Total connections
psql "host=flamoral-prod-postgres.postgres.database.azure.com \
      port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  -c "SELECT count(*) as total_connections,
      (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
      FROM pg_stat_activity;"

# Connections by application
psql "host=flamoral-prod-postgres.postgres.database.azure.com \
      port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  -c "SELECT application_name, state, count(*) as count
      FROM pg_stat_activity
      GROUP BY application_name, state
      ORDER BY count DESC;"
```

#### Increase Application Connection Pool
```bash
# Update ConfigMap with higher pool size
kubectl create configmap database-config \
  --from-literal=DB_POOL_SIZE=50 \
  --from-literal=DB_POOL_MAX=100 \
  --from-literal=DB_POOL_MIN=10 \
  --from-literal=DB_POOL_IDLE_TIMEOUT=30000 \
  --dry-run=client -o yaml | kubectl apply -f - -n datingapp

# Restart services to pick up new config
kubectl rollout restart deployment/dating-api -n datingapp
kubectl rollout restart deployment/dating-worker -n datingapp
```

### Vertical Database Scaling

**When:** Database CPU >80%, slow queries, connection limits reached

#### Scale Up PostgreSQL SKU
```bash
# Check current SKU
az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --query "{sku:sku.name, tier:sku.tier, vCores:sku.capacity}" -o table

# Scale up to larger SKU (D8s_v3 - 8 vCores, 32GB)
# WARNING: This will cause brief downtime (~1-2 minutes)
az postgres flexible-server update \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --sku-name Standard_D8s_v3

# Monitor scaling operation
watch -n 5 'az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --query "state" -o tsv'

# Verify new SKU
az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --query "{sku:sku.name, state:state}" -o table
```

#### Increase Storage
```bash
# Check current storage
az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --query "{storage:storageProfile.storageMB}" -o table

# Increase storage (in GB)
az postgres flexible-server update \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --storage-size 512

# Monitor operation
watch -n 10 'az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --query "state" -o tsv'
```

### Horizontal Database Scaling

#### Add Read Replica

**When:** Read-heavy workload, need to offload read queries

```bash
# Create read replica
az postgres flexible-server replica create \
  --replica-name flamoral-prod-postgres-read-3 \
  --resource-group datingapp-prod-rg \
  --source-server flamoral-prod-postgres \
  --location eastus2

# Monitor replica creation
watch -n 30 'az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres-read-3 \
  --query "state" -o tsv'

# Verify replica is ready
az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres-read-3 \
  --query "{name:name, state:state, replicationRole:replicationRole}" -o table
```

#### Configure Application to Use Read Replica
```bash
# Update ConfigMap with read replica endpoint
kubectl create configmap database-config \
  --from-literal=DB_READ_HOST="flamoral-prod-postgres-read-3.postgres.database.azure.com" \
  --from-literal=DB_WRITE_HOST="flamoral-prod-postgres.postgres.database.azure.com" \
  --dry-run=client -o yaml | kubectl apply -f - -n datingapp

# Restart services
kubectl rollout restart deployment/dating-api -n datingapp

# Verify read traffic going to replica
psql "host=flamoral-prod-postgres-read-3.postgres.database.azure.com \
      port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  -c "SELECT count(*) FROM pg_stat_activity WHERE application_name LIKE '%dating-api%';"
```

## Cache Scaling

### Redis Scaling

#### Check Current Redis Usage
```bash
# Get Redis metrics
az redis show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-redis \
  --query "{sku:sku.name, capacity:sku.capacity}" -o table

# Check memory usage
az monitor metrics list \
  --resource /subscriptions/YOUR_SUB/resourceGroups/datingapp-prod-rg/providers/Microsoft.Cache/Redis/flamoral-prod-redis \
  --metric usedmemorypercentage \
  --interval PT1M \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ) \
  --aggregation Average

# Check from application
kubectl exec -n datingapp deployment/dating-api -- \
  curl -s localhost:8080/metrics | grep 'redis_memory_used\|cache_hit_rate'
```

#### Vertical Scale Redis

**When:** Memory usage >90%, evictions occurring

```bash
# Scale Redis to higher tier (Premium P2 - 13GB)
# WARNING: Premium tier changes may cause brief connection drops
az redis update \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-redis \
  --sku Premium \
  --vm-size P2

# Monitor scaling
watch -n 10 'az redis show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-redis \
  --query "provisioningState" -o tsv'

# Verify new tier
az redis show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-redis \
  --query "{sku:sku.name, capacity:sku.capacity, provisioningState:provisioningState}" -o table
```

#### Horizontal Scale Redis (Clustering)

**When:** Need to distribute load across multiple shards

```bash
# Enable Redis clustering (Premium tier required)
az redis update \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-redis \
  --sku Premium \
  --vm-size P1 \
  --shard-count 3

# This will:
# - Distribute data across 3 shards
# - Increase throughput 3x
# - Require client library to support clustering

# Verify clustering
az redis show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-redis \
  --query "{shardCount:shardCount, clusterEnabled:enableNonSslPort}" -o table
```

### Cache Eviction Strategy

**When:** Can't scale Redis immediately, need to free memory

```bash
# Connect to Redis from pod
kubectl exec -it -n datingapp deployment/dating-api -- redis-cli -h flamoral-prod-redis.redis.cache.windows.net -p 6380 -a $REDIS_PASSWORD --tls

# Check memory info
> INFO memory

# Set eviction policy (if not already set)
> CONFIG SET maxmemory-policy allkeys-lru

# Manually evict specific keys (if needed)
> SCAN 0 MATCH temp:* COUNT 1000
> DEL temp:key1 temp:key2 ...

# Flush specific patterns (CAUTION)
> EVAL "return redis.call('del', unpack(redis.call('keys', ARGV[1])))" 0 temp:*

# Clear session cache (if safe)
> FLUSHDB

# Exit
> EXIT
```

## Infrastructure Scaling

### Frontend/CDN Scaling

**When:** High bandwidth consumption, slow asset delivery

```bash
# Check Azure Front Door metrics
az monitor metrics list \
  --resource /subscriptions/YOUR_SUB/resourceGroups/datingapp-prod-rg/providers/Microsoft.Network/frontdoors/flamoral-prod-fd \
  --metric TotalLatency \
  --interval PT5M

# Azure Front Door scales automatically, but you can:

# 1. Add more origins
az network front-door backend-pool backend add \
  --front-door-name flamoral-prod-fd \
  --resource-group datingapp-prod-rg \
  --pool-name DefaultBackendPool \
  --address new-origin.flamoral.com \
  --backend-host-header new-origin.flamoral.com

# 2. Enable caching for more content
az network front-door routing-rule update \
  --front-door-name flamoral-prod-fd \
  --resource-group datingapp-prod-rg \
  --name DefaultRoutingRule \
  --caching Enabled \
  --query-parameter-strip-directive StripAll
```

### Storage Scaling

**When:** High storage IOPS, slow file operations

```bash
# Check storage account performance
az storage account show \
  --resource-group datingapp-prod-rg \
  --name flamoralprod \
  --query "{sku:sku.name, tier:sku.tier}" -o table

# Upgrade to Premium storage (if on Standard)
az storage account update \
  --resource-group datingapp-prod-rg \
  --name flamoralprod \
  --sku Premium_LRS

# Or create separate premium storage for hot data
az storage account create \
  --resource-group datingapp-prod-rg \
  --name flamoralprodpremium \
  --sku Premium_LRS \
  --kind BlockBlobStorage \
  --location westus2
```

## Automated Scaling

### Configure Horizontal Pod Autoscaler

#### Enable HPA for All Services
```bash
# dating-api
kubectl autoscale deployment dating-api \
  --cpu-percent=70 \
  --min=3 \
  --max=20 \
  -n datingapp

# dating-worker
kubectl autoscale deployment dating-worker \
  --cpu-percent=70 \
  --min=2 \
  --max=15 \
  -n datingapp

# dating-messaging-service (based on CPU and memory)
kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dating-messaging-service
  namespace: datingapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dating-messaging-service
  minReplicas: 3
  maxReplicas: 25
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
      - type: Pods
        value: 4
        periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
EOF
```

#### Custom Metrics Autoscaling

**Scale based on application metrics (e.g., queue size, active connections)**

```bash
# Requires metrics-server and custom metrics adapter

# Scale worker based on job queue size
kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dating-worker
  namespace: datingapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dating-worker
  minReplicas: 2
  maxReplicas: 15
  metrics:
  - type: Pods
    pods:
      metric:
        name: jobs_pending
      target:
        type: AverageValue
        averageValue: "100"
EOF

# Scale messaging based on active connections
kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dating-messaging-service
  namespace: datingapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dating-messaging-service
  minReplicas: 3
  maxReplicas: 25
  metrics:
  - type: Pods
    pods:
      metric:
        name: active_websocket_connections
      target:
        type: AverageValue
        averageValue: "1000"
EOF
```

### Configure Cluster Autoscaler

```bash
# Enable cluster autoscaler on node pool
az aks nodepool update \
  --resource-group datingapp-prod-rg \
  --cluster-name flamoral-prod-aks \
  --name userpool \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 20

# Update autoscaler profile
az aks update \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-aks \
  --cluster-autoscaler-profile \
    scale-down-delay-after-add=10m \
    scale-down-unneeded-time=10m \
    scale-down-utilization-threshold=0.5 \
    max-graceful-termination-sec=600

# Verify autoscaler configuration
az aks show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-aks \
  --query "autoScalerProfile" -o json
```

## Emergency Full Scale

### Critical: Scale Everything Immediately

**When:** Major traffic spike (e.g., viral event, press coverage, Super Bowl ad)

```bash
#!/bin/bash
# emergency-scale.sh - Scale entire platform

echo "=== EMERGENCY SCALE UP ==="
echo "Starting at $(date)"

# 1. Scale AKS nodes
echo "Scaling AKS nodes to max..."
az aks nodepool scale \
  --resource-group datingapp-prod-rg \
  --cluster-name flamoral-prod-aks \
  --name userpool \
  --node-count 15 &

# 2. Scale all application pods
echo "Scaling application pods..."
kubectl scale deployment/dating-api --replicas=15 -n datingapp &
kubectl scale deployment/dating-worker --replicas=10 -n datingapp &
kubectl scale deployment/dating-matching-service --replicas=6 -n datingapp &
kubectl scale deployment/dating-messaging-service --replicas=20 -n datingapp &
kubectl scale deployment/dating-notification-service --replicas=6 -n datingapp &
kubectl scale deployment/dating-media-service --replicas=6 -n datingapp &

# Wait for pod scaling
wait
echo "Application pods scaled."

# 3. Update HPA limits
echo "Updating HPA limits..."
kubectl patch hpa dating-api -n datingapp -p '{"spec":{"maxReplicas":30}}'
kubectl patch hpa dating-messaging-service -n datingapp -p '{"spec":{"maxReplicas":40}}'

# 4. Scale database (requires manual intervention for SKU change)
echo "NOTE: Database scaling requires manual SKU change if needed"
echo "Current database: D4s_v3 (4 vCores)"
echo "Recommended: D8s_v3 or higher"

# 5. Scale Redis
echo "Scaling Redis to P3..."
az redis update \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-redis \
  --vm-size P3 &

# 6. Increase connection pool limits
kubectl patch configmap database-config -n datingapp \
  --type merge \
  -p '{"data":{"DB_POOL_SIZE":"100","DB_POOL_MAX":"200"}}'

kubectl rollout restart deployment/dating-api -n datingapp
kubectl rollout restart deployment/dating-worker -n datingapp

wait
echo "=== EMERGENCY SCALE COMPLETE ==="
echo "Monitor metrics closely for next 30 minutes"
```

## Cost Considerations

### Estimated Costs After Scaling

**Normal Load:**
- AKS: $800/month
- PostgreSQL D4s_v3: $300/month
- Redis P1: $250/month
- Total: ~$1,350/month

**2x Scale:**
- AKS (6 nodes): $1,600/month
- PostgreSQL D8s_v3: $600/month
- Redis P2: $500/month
- Total: ~$2,700/month (+$1,350/month)

**4x Scale:**
- AKS (12 nodes): $3,200/month
- PostgreSQL D16s_v3: $1,200/month
- Redis P3: $900/month
- Total: ~$5,300/month (+$3,950/month)

### Cost Optimization After Scale Event

```bash
# After traffic normalizes, scale back down

# 1. Reduce pod replicas
kubectl scale deployment/dating-api --replicas=3 -n datingapp
kubectl scale deployment/dating-messaging-service --replicas=3 -n datingapp

# 2. Scale down AKS nodes
az aks nodepool scale \
  --resource-group datingapp-prod-rg \
  --cluster-name flamoral-prod-aks \
  --name userpool \
  --node-count 3

# 3. Downgrade Redis (if safe)
az redis update \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-redis \
  --vm-size P1

# 4. Downgrade database (requires downtime)
# Only do during maintenance window
az postgres flexible-server update \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --sku-name Standard_D4s_v3
```

## Rollback Procedures

### Rollback Application Scaling

```bash
# Scale pods back to normal
kubectl scale deployment/dating-api --replicas=3 -n datingapp
kubectl scale deployment/dating-worker --replicas=2 -n datingapp
kubectl scale deployment/dating-messaging-service --replicas=3 -n datingapp

# Restore HPA limits
kubectl patch hpa dating-api -n datingapp -p '{"spec":{"maxReplicas":10}}'
```

### Rollback Infrastructure Scaling

```bash
# Scale down AKS nodes
az aks nodepool scale \
  --resource-group datingapp-prod-rg \
  --cluster-name flamoral-prod-aks \
  --name userpool \
  --node-count 3

# Downgrade database SKU (requires maintenance window)
az postgres flexible-server update \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --sku-name Standard_D4s_v3

# Downgrade Redis
az redis update \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-redis \
  --vm-size P1
```

## Monitoring During Scaling

### Key Metrics to Watch

```bash
# Application metrics
kubectl exec -n datingapp deployment/dating-api -- \
  curl -s localhost:8080/metrics | grep -E 'request_rate|response_time|error_rate'

# Resource utilization
watch -n 5 'kubectl top pods -n datingapp'
watch -n 5 'kubectl top nodes'

# Database metrics
# - Connection count
# - Query latency
# - CPU/Memory usage

# Cache metrics
# - Memory usage
# - Hit rate
# - Eviction rate
```

## Best Practices

1. **Monitor Proactively:** Set alerts before reaching capacity
2. **Test Scaling:** Regular load testing to verify autoscaling works
3. **Document Limits:** Know the maximum capacity of each component
4. **Cost Awareness:** Understand cost implications of scaling
5. **Gradual Scaling:** Scale incrementally rather than max immediately
6. **Communicate:** Notify team when performing emergency scaling
7. **Post-Event Analysis:** Review what triggered scaling, optimize for future

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-17 | DevOps Team | Initial creation |

---

**Document Status:** Active
**Next Review Date:** 2026-01-17
**Document Owner:** SRE Team Lead
