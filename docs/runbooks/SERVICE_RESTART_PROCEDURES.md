# Flamoral Dating Platform - Service Restart Procedures

## Overview

This runbook provides detailed procedures for restarting individual services and performing full system restarts in the Flamoral dating platform. It includes proper dependency ordering, health check verification, and rollback procedures.

**Last Updated:** 2025-12-17
**Version:** 1.0.0
**Maintained By:** DevOps & SRE Team

## Table of Contents

1. [Service Architecture](#service-architecture)
2. [Pre-Restart Checklist](#pre-restart-checklist)
3. [Individual Service Restarts](#individual-service-restarts)
4. [Full System Restart](#full-system-restart)
5. [Dependency Order](#dependency-order)
6. [Health Check Verification](#health-check-verification)
7. [Rollback Procedures](#rollback-procedures)
8. [Common Scenarios](#common-scenarios)
9. [Troubleshooting](#troubleshooting)

## Service Architecture

### Service Inventory

```
Infrastructure Layer (Azure)
├── PostgreSQL Database (flamoral-prod-postgres)
├── Redis Cache (flamoral-prod-redis)
├── Storage Account (flamoralprod)
├── Azure Front Door (flamoral-prod-fd)
└── SignalR Service (flamoral-prod-signalr)

Kubernetes Services (AKS)
├── dating-api (Main API service)
├── dating-worker (Background jobs)
├── dating-scheduler (Cron jobs)
├── dating-matching-service (Matching algorithm)
├── dating-messaging-service (Real-time messaging)
├── dating-notification-service (Notifications)
├── dating-media-service (Photo processing)
└── dating-admin-api (Admin panel)

Supporting Services
├── ingress-nginx (Ingress controller)
├── cert-manager (SSL certificates)
├── metrics-server (Resource metrics)
└── prometheus/grafana (Monitoring)
```

### Service Dependencies

```
PostgreSQL Database
    ↓
Redis Cache
    ↓
dating-api (Core API)
    ↓
┌───────────────┬───────────────┬───────────────┐
│               │               │               │
dating-worker   dating-matching dating-messaging
                                    ↓
                            dating-notification
    ↓
dating-scheduler
```

## Pre-Restart Checklist

### Before Any Restart

#### 1. Assess Impact
```bash
# Check current traffic
kubectl top pods -n datingapp

# Check active users
kubectl exec -n datingapp deployment/dating-api -- \
  curl -s localhost:8080/metrics | grep active_users

# Check pending jobs
kubectl exec -n datingapp deployment/dating-worker -- \
  curl -s localhost:8080/metrics | grep pending_jobs
```

#### 2. Notify Stakeholders
```markdown
# Post in #engineering-alerts Slack channel:

⚠️ SERVICE RESTART SCHEDULED
Service: [service-name]
Environment: [production/staging/dev]
Scheduled Time: [YYYY-MM-DD HH:MM UTC]
Expected Duration: [X minutes]
Expected Impact: [None/Minimal/Moderate]
Reason: [Brief explanation]
Performed By: @username
```

#### 3. Enable Monitoring
```bash
# Open monitoring dashboards
# - Grafana: https://grafana.flamoral.com
# - Application Insights: Azure Portal
# - Kubernetes Dashboard

# Tail logs in separate terminal
kubectl logs -n datingapp deployment/dating-api -f --tail=100
```

#### 4. Backup Current State
```bash
# Export current deployment state
kubectl get deployment dating-api -n datingapp -o yaml > backup-dating-api-deployment.yaml

# Export current ConfigMaps
kubectl get configmap -n datingapp -o yaml > backup-configmaps.yaml

# Export current Secrets (encrypted)
kubectl get secrets -n datingapp -o yaml > backup-secrets.yaml
```

## Individual Service Restarts

### Restart: dating-api (Main API Service)

**Impact:** High - Core API will be briefly unavailable
**Estimated Downtime:** 30-60 seconds (rolling update)
**When to Use:** After config changes, memory leaks, deployment updates

#### Rolling Restart (Zero Downtime)
```bash
# Verify current state
kubectl get pods -n datingapp -l app=dating-api

# Perform rolling restart
kubectl rollout restart deployment/dating-api -n datingapp

# Monitor rollout progress
kubectl rollout status deployment/dating-api -n datingapp --timeout=5m

# Verify all pods are ready
kubectl get pods -n datingapp -l app=dating-api

# Check pod events
kubectl describe pods -n datingapp -l app=dating-api | grep -A 10 Events
```

#### Verification
```bash
# Check health endpoint
kubectl exec -n datingapp deployment/dating-api -- \
  curl -s localhost:8080/health | jq

# Expected output:
# {
#   "status": "healthy",
#   "database": "connected",
#   "redis": "connected",
#   "version": "1.2.3"
# }

# Test external endpoint
curl -s https://api.flamoral.com/health | jq

# Check error logs
kubectl logs -n datingapp deployment/dating-api --tail=50 | grep -i error
```

### Restart: dating-worker (Background Jobs)

**Impact:** Low - Jobs may be delayed
**Estimated Downtime:** 0 seconds (graceful shutdown)
**When to Use:** After job queue config changes

```bash
# Check pending jobs before restart
kubectl exec -n datingapp deployment/dating-worker -- \
  curl -s localhost:8080/metrics | grep 'jobs_pending\|jobs_processing'

# Graceful restart with 30s termination grace period
kubectl rollout restart deployment/dating-worker -n datingapp

# Monitor
kubectl rollout status deployment/dating-worker -n datingapp

# Verify jobs resumed
sleep 10
kubectl exec -n datingapp deployment/dating-worker -- \
  curl -s localhost:8080/metrics | grep jobs_processed_total
```

### Restart: dating-scheduler (Cron Jobs)

**Impact:** Low - Scheduled tasks may be delayed
**Estimated Downtime:** 0 seconds
**When to Use:** After cron schedule changes

```bash
# Check running schedules
kubectl exec -n datingapp deployment/dating-scheduler -- \
  curl -s localhost:8080/schedules | jq

# Restart
kubectl rollout restart deployment/dating-scheduler -n datingapp

# Verify schedules reloaded
kubectl logs -n datingapp deployment/dating-scheduler --tail=50 | grep "Loaded schedule"
```

### Restart: dating-matching-service (Matching Algorithm)

**Impact:** Medium - Matching temporarily unavailable
**Estimated Downtime:** 30 seconds
**When to Use:** After algorithm updates

```bash
# Check current matching queue
kubectl exec -n datingapp deployment/dating-matching-service -- \
  curl -s localhost:8080/metrics | grep matching_queue_size

# Restart
kubectl rollout restart deployment/dating-matching-service -n datingapp

# Monitor
kubectl rollout status deployment/dating-matching-service -n datingapp

# Verify matching resumed
kubectl exec -n datingapp deployment/dating-matching-service -- \
  curl -s localhost:8080/health | jq
```

### Restart: dating-messaging-service (Real-time Messaging)

**Impact:** High - Active conversations will disconnect
**Estimated Downtime:** 30-60 seconds
**When to Use:** After SignalR or WebSocket config changes

```bash
# Check active connections
kubectl exec -n datingapp deployment/dating-messaging-service -- \
  curl -s localhost:8080/metrics | grep active_connections

# Notify users (optional)
# Enable "reconnecting" message in frontend

# Restart with increased grace period for connections to drain
kubectl patch deployment dating-messaging-service -n datingapp \
  -p '{"spec":{"template":{"spec":{"terminationGracePeriodSeconds":60}}}}'

kubectl rollout restart deployment/dating-messaging-service -n datingapp

# Monitor
kubectl rollout status deployment/dating-messaging-service -n datingapp

# Verify connections restored
sleep 30
kubectl exec -n datingapp deployment/dating-messaging-service -- \
  curl -s localhost:8080/metrics | grep active_connections
```

### Restart: dating-notification-service (Notifications)

**Impact:** Low - Notifications may be delayed
**Estimated Downtime:** 0 seconds
**When to Use:** After notification template changes

```bash
# Check pending notifications
kubectl exec -n datingapp deployment/dating-notification-service -- \
  curl -s localhost:8080/metrics | grep notifications_pending

# Restart
kubectl rollout restart deployment/dating-notification-service -n datingapp

# Monitor
kubectl rollout status deployment/dating-notification-service -n datingapp

# Verify notifications sending
kubectl logs -n datingapp deployment/dating-notification-service --tail=20 | grep "Notification sent"
```

### Restart: dating-media-service (Photo Processing)

**Impact:** Medium - Photo uploads temporarily unavailable
**Estimated Downtime:** 30 seconds
**When to Use:** After image processing changes

```bash
# Check processing queue
kubectl exec -n datingapp deployment/dating-media-service -- \
  curl -s localhost:8080/metrics | grep 'images_processing\|images_pending'

# Restart
kubectl rollout restart deployment/dating-media-service -n datingapp

# Monitor
kubectl rollout status deployment/dating-media-service -n datingapp

# Verify processing resumed
kubectl exec -n datingapp deployment/dating-media-service -- \
  curl -s localhost:8080/health | jq
```

### Restart: dating-admin-api (Admin Panel)

**Impact:** Low - Admin features unavailable
**Estimated Downtime:** 30 seconds
**When to Use:** After admin feature updates

```bash
# Restart
kubectl rollout restart deployment/dating-admin-api -n datingapp

# Monitor
kubectl rollout status deployment/dating-admin-api -n datingapp

# Verify
curl -s https://admin.flamoral.com/health | jq
```

## Full System Restart

### When to Perform Full System Restart

- After major infrastructure changes
- After Kubernetes cluster upgrade
- After network configuration changes
- Recovery from cluster-wide issues
- Planned maintenance window

### Full System Restart Procedure

#### Phase 1: Pre-Restart Preparation (T-30 minutes)

```bash
# 1. Announce maintenance window
# Post to status page and notify users

# 2. Enable maintenance mode
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: maintenance-mode
  namespace: datingapp
data:
  enabled: "true"
  message: "Flamoral is undergoing scheduled maintenance. We'll be back shortly!"
  estimated_duration: "30 minutes"
EOF

# 3. Backup all configurations
mkdir -p /tmp/flamoral-backup-$(date +%Y%m%d-%H%M)
cd /tmp/flamoral-backup-$(date +%Y%m%d-%H%M)

kubectl get all,configmap,secret,ingress,pvc -n datingapp -o yaml > backup-all-resources.yaml
kubectl get deployment,statefulset,daemonset -n datingapp -o yaml > backup-workloads.yaml

# 4. Snapshot current metrics
kubectl top pods -n datingapp > metrics-before.txt
kubectl top nodes > nodes-before.txt
```

#### Phase 2: Graceful Shutdown (Reverse Dependency Order)

```bash
# Step 1: Stop frontend traffic (optional)
kubectl scale deployment/ingress-nginx-controller --replicas=0 -n ingress-nginx

# Step 2: Stop application services (reverse order)
echo "Stopping admin API..."
kubectl scale deployment/dating-admin-api --replicas=0 -n datingapp

echo "Stopping notification service..."
kubectl scale deployment/dating-notification-service --replicas=0 -n datingapp

echo "Stopping messaging service (waiting for connections to drain)..."
kubectl scale deployment/dating-messaging-service --replicas=0 -n datingapp
sleep 30

echo "Stopping media service..."
kubectl scale deployment/dating-media-service --replicas=0 -n datingapp

echo "Stopping matching service..."
kubectl scale deployment/dating-matching-service --replicas=0 -n datingapp

echo "Stopping scheduler..."
kubectl scale deployment/dating-scheduler --replicas=0 -n datingapp

echo "Stopping worker (waiting for jobs to complete)..."
kubectl scale deployment/dating-worker --replicas=0 -n datingapp
sleep 30

echo "Stopping main API..."
kubectl scale deployment/dating-api --replicas=0 -n datingapp

# Step 3: Verify all pods stopped
kubectl get pods -n datingapp
```

#### Phase 3: Restart Infrastructure Services (if needed)

```bash
# Only if infrastructure services need restart

# Restart Redis (if needed)
# NOTE: This will clear in-memory cache
az redis restart \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-redis

# Wait for Redis to be available
echo "Waiting for Redis restart..."
sleep 120

# Verify Redis
az redis show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-redis \
  --query "provisioningState" -o tsv

# Database restart - see DATABASE_FAILOVER_RUNBOOK.md
# Only in extreme cases
```

#### Phase 4: Start Services (Dependency Order)

```bash
# Step 1: Start core API first
echo "Starting main API..."
kubectl scale deployment/dating-api --replicas=3 -n datingapp

# Wait for API to be ready
kubectl wait --for=condition=ready pod -l app=dating-api -n datingapp --timeout=120s

# Verify API health
kubectl exec -n datingapp deployment/dating-api -- curl -s localhost:8080/health | jq

# Step 2: Start dependent services
echo "Starting worker..."
kubectl scale deployment/dating-worker --replicas=2 -n datingapp
sleep 5

echo "Starting matching service..."
kubectl scale deployment/dating-matching-service --replicas=2 -n datingapp
sleep 5

echo "Starting messaging service..."
kubectl scale deployment/dating-messaging-service --replicas=3 -n datingapp
sleep 5

echo "Starting notification service..."
kubectl scale deployment/dating-notification-service --replicas=2 -n datingapp
sleep 5

echo "Starting scheduler..."
kubectl scale deployment/dating-scheduler --replicas=1 -n datingapp
sleep 5

echo "Starting media service..."
kubectl scale deployment/dating-media-service --replicas=2 -n datingapp
sleep 5

echo "Starting admin API..."
kubectl scale deployment/dating-admin-api --replicas=2 -n datingapp

# Step 3: Start ingress
kubectl scale deployment/ingress-nginx-controller --replicas=2 -n ingress-nginx

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod --all -n datingapp --timeout=300s
```

#### Phase 5: Verification and Monitoring

```bash
# 1. Check all pods are running
kubectl get pods -n datingapp
kubectl get pods -n datingapp | grep -v Running | grep -v Completed

# 2. Check service endpoints
echo "Checking service health..."

curl -s https://api.flamoral.com/health | jq
curl -s https://admin.flamoral.com/health | jq

# 3. Run smoke tests
cd /path/to/tests
npm run test:smoke

# 4. Monitor error rates
kubectl logs -n datingapp deployment/dating-api --tail=100 | grep -i error

# 5. Check metrics
kubectl top pods -n datingapp > metrics-after.txt

# 6. Disable maintenance mode
kubectl delete configmap maintenance-mode -n datingapp

# 7. Monitor for 15 minutes
watch -n 5 'kubectl get pods -n datingapp'
```

#### Phase 6: Post-Restart Validation

```bash
# Check critical user journeys

# Test 1: User Login
curl -X POST https://api.flamoral.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' | jq

# Test 2: Get Matches
curl -X GET https://api.flamoral.com/v1/matches \
  -H "Authorization: Bearer $TEST_TOKEN" | jq

# Test 3: Send Message
curl -X POST https://api.flamoral.com/v1/messages \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipient_id":"123","content":"test message"}' | jq

# Test 4: Upload Photo
curl -X POST https://api.flamoral.com/v1/photos \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -F "photo=@test-image.jpg" | jq

# Test 5: Real-time Messaging
# Connect to WebSocket and verify connection
```

## Dependency Order

### Startup Order (Critical Path)

```
1. Infrastructure Layer (external to Kubernetes)
   ├── PostgreSQL Database (must be ready)
   ├── Redis Cache (must be ready)
   └── Storage Account (must be ready)

2. Core Services (Tier 1) - Start first
   └── dating-api (all other services depend on this)

3. Processing Services (Tier 2) - Start after API
   ├── dating-worker (depends on API)
   ├── dating-matching-service (depends on API)
   └── dating-media-service (depends on API)

4. Communication Services (Tier 3) - Start after processing
   ├── dating-messaging-service (depends on API)
   └── dating-notification-service (depends on messaging)

5. Scheduled Services (Tier 4) - Start after all others
   └── dating-scheduler (depends on worker)

6. Admin Services (Tier 5) - Start last
   └── dating-admin-api (depends on API)

7. Ingress Layer
   └── ingress-nginx (start after all services ready)
```

### Shutdown Order (Reverse of Startup)

```
1. Stop accepting new traffic
   └── ingress-nginx

2. Stop admin services
   └── dating-admin-api

3. Stop scheduled services
   └── dating-scheduler

4. Stop communication services
   ├── dating-notification-service
   └── dating-messaging-service (allow time for connections to drain)

5. Stop processing services
   ├── dating-media-service
   ├── dating-matching-service
   └── dating-worker (allow time for jobs to complete)

6. Stop core API
   └── dating-api

7. Infrastructure services (only if necessary)
   ├── Redis
   └── PostgreSQL
```

## Health Check Verification

### Automated Health Check Script

```bash
#!/bin/bash
# health-check.sh - Comprehensive health check for all services

NAMESPACE="datingapp"
FAILED=0

echo "=== Flamoral Service Health Check ==="
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Function to check service health
check_service() {
    local service=$1
    local port=$2

    echo -n "Checking $service... "

    # Check if pods are running
    RUNNING=$(kubectl get pods -n $NAMESPACE -l app=$service --field-selector=status.phase=Running --no-headers | wc -l)
    DESIRED=$(kubectl get deployment $service -n $NAMESPACE -o jsonpath='{.spec.replicas}')

    if [ "$RUNNING" -eq "$DESIRED" ] && [ "$RUNNING" -gt 0 ]; then
        # Check health endpoint
        HEALTH=$(kubectl exec -n $NAMESPACE deployment/$service -- curl -s -o /dev/null -w "%{http_code}" localhost:$port/health)

        if [ "$HEALTH" -eq 200 ]; then
            echo "✓ HEALTHY ($RUNNING/$DESIRED pods)"
        else
            echo "✗ UNHEALTHY (HTTP $HEALTH)"
            FAILED=1
        fi
    else
        echo "✗ PODS NOT READY ($RUNNING/$DESIRED)"
        FAILED=1
    fi
}

# Check all services
check_service "dating-api" "8080"
check_service "dating-worker" "8080"
check_service "dating-scheduler" "8080"
check_service "dating-matching-service" "8080"
check_service "dating-messaging-service" "8080"
check_service "dating-notification-service" "8080"
check_service "dating-media-service" "8080"
check_service "dating-admin-api" "8080"

echo ""
echo "=== External Endpoints ==="

# Check external endpoints
check_external() {
    local url=$1
    local name=$2

    echo -n "Checking $name... "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$HTTP_CODE" -eq 200 ]; then
        echo "✓ OK (HTTP $HTTP_CODE)"
    else
        echo "✗ FAILED (HTTP $HTTP_CODE)"
        FAILED=1
    fi
}

check_external "https://api.flamoral.com/health" "Main API"
check_external "https://admin.flamoral.com/health" "Admin API"

echo ""
echo "=== Infrastructure Services ==="

# Check database
echo -n "Checking PostgreSQL... "
DB_CHECK=$(kubectl exec -n $NAMESPACE deployment/dating-api -- \
    curl -s localhost:8080/health/database | jq -r '.status')

if [ "$DB_CHECK" = "connected" ]; then
    echo "✓ CONNECTED"
else
    echo "✗ DISCONNECTED"
    FAILED=1
fi

# Check Redis
echo -n "Checking Redis... "
REDIS_CHECK=$(kubectl exec -n $NAMESPACE deployment/dating-api -- \
    curl -s localhost:8080/health/redis | jq -r '.status')

if [ "$REDIS_CHECK" = "connected" ]; then
    echo "✓ CONNECTED"
else
    echo "✗ DISCONNECTED"
    FAILED=1
fi

echo ""
if [ $FAILED -eq 0 ]; then
    echo "=== All systems operational ==="
    exit 0
else
    echo "=== Some systems have issues ==="
    exit 1
fi
```

### Manual Health Checks

#### Quick Health Check
```bash
# Check all pods status
kubectl get pods -n datingapp

# Check all services
kubectl get svc -n datingapp

# Check ingress
kubectl get ingress -n datingapp
```

#### Detailed Health Check
```bash
# Check each service individually
for svc in dating-api dating-worker dating-scheduler dating-matching-service \
           dating-messaging-service dating-notification-service dating-media-service \
           dating-admin-api; do
    echo "=== $svc ==="
    kubectl exec -n datingapp deployment/$svc -- curl -s localhost:8080/health | jq
    echo ""
done
```

## Rollback Procedures

### Rollback Individual Service Restart

**If service fails after restart:**

```bash
# Option 1: Rollback to previous deployment
kubectl rollout undo deployment/dating-api -n datingapp

# Monitor rollback
kubectl rollout status deployment/dating-api -n datingapp

# Verify rollback
kubectl rollout history deployment/dating-api -n datingapp
```

### Rollback Full System Restart

**If full system restart fails:**

```bash
# Step 1: Stop all services immediately
kubectl scale deployment --all --replicas=0 -n datingapp

# Step 2: Restore from backup
kubectl apply -f /tmp/flamoral-backup-TIMESTAMP/backup-workloads.yaml

# Step 3: Restore ConfigMaps and Secrets
kubectl apply -f /tmp/flamoral-backup-TIMESTAMP/backup-all-resources.yaml

# Step 4: Verify restoration
kubectl get pods -n datingapp

# Step 5: Run health checks
./health-check.sh
```

### Emergency Rollback

**Critical: Service completely broken after restart:**

```bash
# Step 1: Deploy last known good version
kubectl set image deployment/dating-api \
  dating-api=ghcr.io/flamoral/dating-api:v1.2.3 \
  -n datingapp

# Step 2: Force immediate rollout
kubectl rollout restart deployment/dating-api -n datingapp

# Step 3: Monitor closely
kubectl logs -n datingapp deployment/dating-api -f

# Step 4: If still failing, restore from backup
kubectl replace --force -f backup-dating-api-deployment.yaml
```

## Common Scenarios

### Scenario 1: Restart After Config Change

**Situation:** Changed environment variable in ConfigMap

```bash
# Update ConfigMap
kubectl edit configmap app-config -n datingapp

# Restart affected services to pick up changes
kubectl rollout restart deployment/dating-api -n datingapp
kubectl rollout restart deployment/dating-worker -n datingapp

# Verify config loaded
kubectl exec -n datingapp deployment/dating-api -- env | grep NEW_CONFIG
```

### Scenario 2: Restart After Memory Leak

**Situation:** Service consuming excessive memory

```bash
# Check current memory usage
kubectl top pods -n datingapp | grep dating-api

# Restart service
kubectl rollout restart deployment/dating-api -n datingapp

# Monitor memory after restart
watch -n 5 'kubectl top pods -n datingapp | grep dating-api'

# If leak persists, investigate and fix code
```

### Scenario 3: Restart During High Traffic

**Situation:** Need to restart during peak hours

```bash
# Increase replicas before restart
kubectl scale deployment/dating-api --replicas=6 -n datingapp

# Wait for new pods to be ready
kubectl wait --for=condition=ready pod -l app=dating-api -n datingapp

# Perform rolling restart (built-in graceful handling)
kubectl rollout restart deployment/dating-api -n datingapp

# After restart completes, scale back down
kubectl scale deployment/dating-api --replicas=3 -n datingapp
```

### Scenario 4: Restart After Failed Deployment

**Situation:** New deployment is broken

```bash
# Immediately rollback
kubectl rollout undo deployment/dating-api -n datingapp

# Check rollback status
kubectl rollout status deployment/dating-api -n datingapp

# Verify service recovered
kubectl exec -n datingapp deployment/dating-api -- curl -s localhost:8080/health | jq

# Check what went wrong
kubectl logs -n datingapp deployment/dating-api --previous --tail=100
```

## Troubleshooting

### Issue: Pods Not Starting

**Problem:** Pods stuck in Pending or CrashLoopBackOff

```bash
# Check pod status
kubectl describe pod -n datingapp -l app=dating-api

# Common causes and fixes:

# 1. Insufficient resources
kubectl describe nodes | grep -A 5 "Allocated resources"

# 2. Image pull errors
kubectl get events -n datingapp --sort-by='.lastTimestamp' | grep Failed

# 3. ConfigMap or Secret missing
kubectl get configmap,secret -n datingapp

# 4. Health check failing
kubectl logs -n datingapp -l app=dating-api --tail=100
```

### Issue: Service Not Responding After Restart

**Problem:** Pods running but service not responding

```bash
# Check if pods are actually ready
kubectl get pods -n datingapp -l app=dating-api

# Check service endpoints
kubectl get endpoints dating-api -n datingapp

# Test connectivity from another pod
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -v http://dating-api:8080/health

# Check logs for errors
kubectl logs -n datingapp deployment/dating-api --tail=100
```

### Issue: Database Connection Errors After Restart

**Problem:** Service can't connect to database

```bash
# Verify database is running
az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --query "state" -o tsv

# Check connection string secret
kubectl get secret postgres-credentials -n datingapp -o jsonpath='{.data.connection-string}' | base64 -d

# Test connection from pod
kubectl exec -n datingapp deployment/dating-api -- \
  curl -s localhost:8080/health/database | jq

# Check firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres -o table
```

### Issue: Restart Taking Too Long

**Problem:** Rolling restart stuck or very slow

```bash
# Check rollout status
kubectl rollout status deployment/dating-api -n datingapp

# Check if new pods are starting
kubectl get pods -n datingapp -l app=dating-api -w

# Check rollout history
kubectl rollout history deployment/dating-api -n datingapp

# If stuck, force restart
kubectl rollout restart deployment/dating-api -n datingapp --force

# If still stuck, manual intervention
kubectl delete pods -n datingapp -l app=dating-api
```

## Best Practices

1. **Always Use Rolling Restarts:** Never scale to 0 unless absolutely necessary
2. **Monitor During Restarts:** Keep logs and metrics visible
3. **Respect Dependencies:** Follow dependency order for full restarts
4. **Graceful Shutdown:** Allow services time to drain connections
5. **Verify Health:** Always run health checks after restart
6. **Communication:** Notify team before restarting production services
7. **Timing:** Avoid restarts during peak traffic if possible
8. **Documentation:** Document reason for restart in incident log

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-17 | DevOps Team | Initial creation |

---

**Document Status:** Active
**Next Review Date:** 2026-01-17
**Document Owner:** SRE Team Lead
