# Quick Reference Guide

Quick commands and references for managing the Dating App infrastructure.

## 📋 Quick Commands

### Deployment

```bash
# Deploy to staging (blue-green)
kubectl set image deployment/api-gateway-green api-gateway=ghcr.io/datingapp/api-gateway:v1.2.0 -n dating-app
kubectl patch service api-gateway -n dating-app -p '{"spec":{"selector":{"version":"green"}}}'

# Deploy to production (canary)
cd infrastructure/kubernetes/deployments && ./canary-rollout.sh

# Rollback
kubectl rollout undo deployment/api-gateway -n dating-app
```

### Monitoring

```bash
# Access Grafana
kubectl port-forward svc/grafana 3000:3000 -n monitoring

# Get Grafana password
kubectl get secret grafana-secrets -n monitoring -o jsonpath="{.data.admin-password}" | base64 -d

# Check Prometheus targets
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
# Open: http://localhost:9090/targets
```

### Logging

```bash
# Access Kibana
kubectl port-forward svc/kibana 5601:5601 -n logging

# Check Elasticsearch cluster health
kubectl exec -it elasticsearch-0 -n logging -- curl -X GET "localhost:9200/_cluster/health?pretty"

# View recent errors
kubectl logs -l app=api-gateway -n dating-app --tail=100 | grep ERROR
```

### Scaling

```bash
# Manual scale
kubectl scale deployment api-gateway --replicas=10 -n dating-app

# Check HPA status
kubectl get hpa -n dating-app
kubectl describe hpa api-gateway-hpa -n dating-app

# Check VPA recommendations
kubectl describe vpa api-gateway-vpa -n dating-app
```

### Health Checks

```bash
# Check deployment health
./scripts/check-deployment-health.sh blue

# Check all pods
kubectl get pods -n dating-app

# Check pod logs
kubectl logs -f <pod-name> -n dating-app

# Check pod details
kubectl describe pod <pod-name> -n dating-app
```

## 🔍 Useful Queries

### Prometheus Queries (PromQL)

```promql
# Request rate
sum(rate(http_requests_total[5m])) by (service)

# Error rate percentage
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100

# P95 response time
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))

# CPU usage
rate(container_cpu_usage_seconds_total{namespace="dating-app"}[5m]) * 100

# Memory usage
container_memory_usage_bytes{namespace="dating-app"} / container_spec_memory_limit_bytes * 100
```

### Kibana Queries (KQL)

```
# All errors in last hour
log_level: ERROR AND @timestamp >= now-1h

# Slow requests (> 1 second)
duration_ms > 1000 AND http_method: *

# Authentication failures
message: ("authentication failed" OR "login failed")

# Errors by service
log_level: ERROR AND service: "api-gateway"

# 5xx HTTP errors
http_status >= 500 AND http_status < 600
```

### kubectl Shortcuts

```bash
# Get all resources
kubectl get all -n dating-app

# Get pods with labels
kubectl get pods -l app=api-gateway -n dating-app

# Get events sorted by time
kubectl get events -n dating-app --sort-by='.lastTimestamp'

# Execute command in pod
kubectl exec -it <pod-name> -n dating-app -- /bin/sh

# Copy files from pod
kubectl cp <pod-name>:/path/to/file ./local-file -n dating-app

# Resource usage
kubectl top pods -n dating-app
kubectl top nodes
```

## 📊 Dashboard URLs

### Production
- **Application**: https://datingapp.com
- **API**: https://api.datingapp.com
- **Grafana**: https://grafana.datingapp.com
- **Kibana**: https://kibana.datingapp.com

### Staging
- **Application**: https://staging.datingapp.com
- **API**: https://api.staging.datingapp.com
- **Blue**: https://blue.api.staging.datingapp.com
- **Green**: https://green.api.staging.datingapp.com

### Development
- Port-forward services to localhost

## 🚨 Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Error Rate | > 1% | > 5% | Check logs, consider rollback |
| Response Time (p95) | > 1s | > 2s | Check database, scale up |
| CPU Usage | > 80% | > 90% | Scale up pods |
| Memory Usage | > 85% | > 95% | Scale up pods, check leaks |
| Database Connections | > 80% | > 90% | Optimize queries, scale DB |
| Redis Memory | > 85% | > 95% | Increase memory, check eviction |
| Disk Usage | > 80% | > 90% | Clean logs, expand storage |

## 🔐 Secret Locations

```bash
# Database credentials
kubectl get secret dating-app-database-secrets -n dating-app

# Redis password
kubectl get secret dating-app-redis-secrets -n dating-app

# JWT secrets
kubectl get secret dating-app-jwt-secrets -n dating-app

# AWS credentials
kubectl get secret dating-app-aws-secrets -n dating-app

# Grafana password
kubectl get secret grafana-secrets -n monitoring

# Elasticsearch password
kubectl get secret elasticsearch-credentials -n logging
```

## 📁 Important Files

### Configuration
- Ingress: `infrastructure/kubernetes/ingress/ingress-nginx.yaml`
- HPA: `infrastructure/kubernetes/autoscaling/hpa.yaml`
- ConfigMaps: `infrastructure/kubernetes/config/advanced-configmaps.yaml`
- Secrets: `infrastructure/kubernetes/security/advanced-secrets.yaml`
- Network Policies: `infrastructure/kubernetes/security/network-policies.yaml`

### Monitoring
- Prometheus: `infrastructure/monitoring/prometheus/prometheus-complete.yaml`
- Alerts: `infrastructure/monitoring/prometheus/alert-rules-complete.yaml`
- Grafana: `infrastructure/monitoring/grafana/grafana-complete.yaml`

### Logging
- Elasticsearch: `infrastructure/logging/elasticsearch/elasticsearch-complete.yaml`
- Logstash: `infrastructure/logging/logstash/logstash-complete.yaml`
- Kibana: `infrastructure/logging/kibana/kibana-complete.yaml`

### Deployment
- Blue-Green: `infrastructure/kubernetes/deployments/blue-green-deployment.yaml`
- Canary: `infrastructure/kubernetes/deployments/canary-deployment.yaml`
- CI/CD: `.github/workflows/ci-cd-complete.yml`

## 🛠️ Troubleshooting Quick Fixes

### Pod CrashLooping
```bash
kubectl logs <pod-name> -n dating-app --previous
kubectl describe pod <pod-name> -n dating-app
# Check for: insufficient resources, failed health checks, missing secrets
```

### Service Not Reachable
```bash
kubectl get endpoints <service-name> -n dating-app
kubectl get svc <service-name> -n dating-app
kubectl get ingress -n dating-app
# Verify: pods are ready, service selector matches, ingress configured
```

### High Memory Usage
```bash
kubectl top pods -n dating-app | sort -k 4 -h -r
# Scale up: kubectl scale deployment <name> --replicas=5 -n dating-app
# Or increase limits in deployment yaml
```

### Database Connection Issues
```bash
kubectl get pod -l app=postgres -n dating-app
kubectl logs <postgres-pod> -n dating-app
# Test connection:
kubectl exec -it <postgres-pod> -n dating-app -- psql -U postgres
```

### Image Pull Errors
```bash
kubectl describe pod <pod-name> -n dating-app
# Check if secret exists:
kubectl get secret ghcr-secret -n dating-app
# Recreate if needed:
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=$GITHUB_USERNAME \
  --docker-password=$GITHUB_TOKEN \
  -n dating-app
```

## 📞 Contacts

- **DevOps Lead**: devops-lead@datingapp.com
- **DevOps Team**: devops@datingapp.com
- **On-Call Engineer**: Use PagerDuty
- **Emergency Hotline**: +1-XXX-XXX-XXXX
- **Slack Channel**: #dating-app-ops

## 📚 Documentation Links

- [Infrastructure Guide](INFRASTRUCTURE_GUIDE.md) - Complete setup guide
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Deployment procedures
- [Setup Complete](INFRASTRUCTURE_SETUP_COMPLETE.md) - What was created
- [Kubernetes README](KUBERNETES_INFRASTRUCTURE_README.md) - Overview

## 🔄 Common Workflows

### Deploy New Version to Staging
1. Push code to `develop` branch
2. CI/CD automatically builds and tests
3. Green environment gets updated
4. Run smoke tests: `./tests/smoke-tests.sh https://green.api.staging.datingapp.com`
5. Check health: `./scripts/check-deployment-health.sh green`
6. Switch traffic: `kubectl patch service api-gateway -n dating-app -p '{"spec":{"selector":{"version":"green"}}}'`
7. Monitor for 30 minutes
8. If issues: Switch back to blue

### Deploy New Version to Production
1. Push code to `main` branch (with approval)
2. CI/CD starts canary deployment
3. 10% traffic → monitor 5 min → check metrics
4. 25% traffic → monitor 5 min → check metrics
5. 50% traffic → monitor 5 min → check metrics
6. 100% traffic → promote to stable
7. Monitor for 24 hours

### Handle Production Incident
1. Check Grafana dashboards for anomalies
2. Check Kibana for error spikes
3. Identify affected service(s)
4. Scale up if resource issue: `kubectl scale deployment <name> --replicas=10 -n dating-app`
5. Rollback if bad deployment: `kubectl rollout undo deployment/<name> -n dating-app`
6. Check database connections and slow queries
7. Notify team in #dating-app-ops
8. Document incident for post-mortem

### Scale for Traffic Spike
1. Check current HPA status: `kubectl get hpa -n dating-app`
2. If HPA not keeping up, manual scale: `kubectl scale deployment api-gateway --replicas=20 -n dating-app`
3. Monitor Grafana: CPU, memory, response times
4. Check database connections: `kubectl exec -it postgres-0 -n dating-app -- psql -c "SELECT count(*) FROM pg_stat_activity;"`
5. Scale database if needed (increase connection pool)
6. Monitor for 1 hour, then scale back if traffic normalizes

---

**Keep this guide handy for daily operations!** 📖

Last Updated: December 2024
