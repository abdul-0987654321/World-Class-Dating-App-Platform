# Health Check and Monitoring Runbook

## Overview
This runbook provides procedures for monitoring system health and responding to alerts.

## Daily Health Checks

### Morning Checklist (15 minutes)
```bash
# 1. Check AKS cluster health
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running

# 2. Verify service health endpoints
curl -f https://api.datingapp.com/health
curl -f https://api-staging.datingapp.com/health

# 3. Check Application Insights dashboard
# - Error rate < 1%
# - Average response time < 300ms
# - Availability > 99.9%

# 4. Review overnight alerts
az monitor alert list --resource-group datingapp-prod-rg

# 5. Check database connection pool
kubectl exec -it postgres-pod -n datingapp -- psql -U psqladmin -c "SELECT count(*) FROM pg_stat_activity;"

# 6. Verify Redis connectivity
kubectl exec -it redis-pod -n datingapp -- redis-cli PING

# 7. Check storage account health
az storage account show \
  --name datingappprodstorage \
  --query "statusOfPrimary"
```

## Key Metrics to Monitor

### Application Metrics
```bash
# Request rate
# Target: Stable pattern, spikes during peak hours

# Error rate
# Target: < 1%
# Alert: > 2%
# Critical: > 5%

# Response time
# Target P50: < 100ms
# Target P95: < 300ms
# Target P99: < 500ms

# Availability
# Target: 99.9%
# Critical: < 99%
```

### Infrastructure Metrics
```bash
# AKS Node CPU
kubectl top nodes
# Target: < 70%
# Alert: > 85%

# AKS Node Memory
kubectl top nodes
# Target: < 75%
# Alert: > 85%

# Pod Resource Usage
kubectl top pods -n datingapp
# Check for memory leaks (increasing over time)

# Database Connections
# Target: < 80% of max connections
# Alert: > 90%

# Redis Memory
# Target: < 80%
# Alert: > 90%

# Storage Usage
az storage account show-usage \
  --name datingappprodstorage
# Alert: > 85%
```

## Alert Response Procedures

### High CPU Alert
```bash
# Step 1: Identify source
kubectl top pods -n datingapp --sort-by=cpu

# Step 2: Check for CPU-intensive operations
kubectl logs -n datingapp high-cpu-pod --tail=100

# Step 3: Scale horizontally if legitimate load
kubectl scale deployment/dating-api --replicas=6 -n datingapp

# Step 4: Investigate if abnormal
# - Check for infinite loops
# - Review recent deployments
# - Check for DDoS attack in WAF logs
```

### High Memory Alert
```bash
# Step 1: Identify memory-hungry pods
kubectl top pods -n datingapp --sort-by=memory

# Step 2: Check for memory leaks
# Compare memory usage over time in Application Insights

# Step 3: Restart affected pods if memory leak suspected
kubectl delete pod memory-leak-pod -n datingapp

# Step 4: Review application code
# - Check for large object retention
# - Review cache configuration
# - Check for event listener leaks
```

### Database Connection Pool Exhausted
```bash
# Step 1: Check current connections
kubectl exec -it postgres-pod -n datingapp -- psql -U psqladmin -c "
SELECT
  count(*) as total,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity;
"

# Step 2: Identify long-running queries
kubectl exec -it postgres-pod -n datingapp -- psql -U psqladmin -c "
SELECT
  pid,
  now() - query_start as duration,
  state,
  query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC
LIMIT 10;
"

# Step 3: Kill problematic connections if necessary
kubectl exec -it postgres-pod -n datingapp -- psql -U psqladmin -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
AND now() - state_change > interval '10 minutes';
"

# Step 4: Scale application pods to reduce connection pressure
kubectl scale deployment/dating-api --replicas=4 -n datingapp

# Step 5: Review connection pool configuration
# Check database connection settings in application config
```

### High Error Rate Alert
```bash
# Step 1: Check Application Insights for error patterns
# Look for:
# - 500 Internal Server Error
# - 502 Bad Gateway
# - 503 Service Unavailable
# - 504 Gateway Timeout

# Step 2: Review recent logs
kubectl logs -n datingapp -l app=dating-api --tail=500 | grep -i error

# Step 3: Check for failed dependencies
# - Database connectivity
# - Redis connectivity
# - External API failures

# Step 4: Verify deployment status
kubectl get deployments -n datingapp
kubectl get pods -n datingapp -o wide

# Step 5: Rollback if recent deployment
# See rollback-procedure.md

# Step 6: Scale up healthy pods
kubectl scale deployment/dating-api --replicas=5 -n datingapp
```

### Disk Space Alert
```bash
# Step 1: Check node disk usage
kubectl get nodes
kubectl describe node <node-name> | grep -A 10 "Allocated resources"

# Step 2: Identify large consumers
kubectl exec -it debug-pod -n datingapp -- df -h
kubectl exec -it debug-pod -n datingapp -- du -sh /*

# Step 3: Clean up old logs
kubectl exec -it pod-name -n datingapp -- find /var/log -type f -mtime +7 -delete

# Step 4: Evict pods from full nodes
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Step 5: Clean Docker images (if applicable)
# SSH to node and run: docker system prune -a
```

## Monitoring Dashboards

### Application Insights Queries

#### Top 10 Slowest Endpoints
```kusto
requests
| where timestamp > ago(1h)
| summarize avg(duration), count() by name
| top 10 by avg_duration desc
```

#### Error Rate by Endpoint
```kusto
requests
| where timestamp > ago(1h)
| summarize
    total = count(),
    errors = countif(success == false)
    by name
| extend error_rate = (errors * 100.0) / total
| where error_rate > 1
| order by error_rate desc
```

#### User Impact Analysis
```kusto
requests
| where timestamp > ago(1h) and success == false
| distinct user_Id
| summarize affected_users = count()
```

### Grafana Dashboard Setup
```bash
# Import dating app dashboard
kubectl apply -f monitoring/grafana-dashboard.json

# Key panels:
# 1. Request rate (req/sec)
# 2. Error rate (%)
# 3. Response time (P50, P95, P99)
# 4. Active users
# 5. Database connections
# 6. Cache hit rate
# 7. Pod CPU/Memory
# 8. Node resource utilization
```

## Performance Baselines

### Peak Hours (6PM - 10PM UTC)
- Request rate: 1000-1500 req/sec
- Active users: 50,000-75,000
- Database connections: 200-300
- Cache hit rate: > 90%

### Off-Peak Hours (2AM - 6AM UTC)
- Request rate: 100-200 req/sec
- Active users: 5,000-10,000
- Database connections: 50-100
- Cache hit rate: > 85%

## Weekly Maintenance

### Every Sunday 2AM UTC
```bash
# 1. Review weekly metrics
# - Average response time trend
# - Error rate trend
# - Resource utilization trend

# 2. Database maintenance
kubectl exec -it postgres-pod -n datingapp -- psql -U psqladmin -c "VACUUM ANALYZE;"

# 3. Check for pod restarts
kubectl get pods -n datingapp -o json | \
  jq '.items[] | select(.status.containerStatuses[].restartCount > 0)'

# 4. Review and archive old logs
# Logs older than 30 days moved to cold storage

# 5. Update monitoring dashboards if needed

# 6. Capacity planning review
# - Check growth trends
# - Plan scaling if needed
```

## Escalation Matrix

| Alert Severity | Response Time | Escalation |
|---------------|--------------|------------|
| P0 - Critical | Immediate | Page on-call + Incident Commander |
| P1 - High | 15 minutes | On-call engineer |
| P2 - Medium | 1 hour | Team Slack channel |
| P3 - Low | Next business day | Email + ticket |

## Contacts
- On-call Engineer: oncall@datingapp.com
- Operations Team: ops-team@datingapp.com
- Database Admin: dba@datingapp.com
- PagerDuty: 1-844-700-DUTY
