# Flamoral Infrastructure - Quick Reference Guide

## Quick Deployment Commands

### Deploy Everything (Production)
```bash
helm install flamoral ./infrastructure/helm/flamoral-platform \
  -f ./infrastructure/helm/flamoral-platform/values-prod.yaml \
  -n flamoral-dating --create-namespace
```

### Deploy Development
```bash
helm install flamoral ./infrastructure/helm/flamoral-platform \
  -f ./infrastructure/helm/flamoral-platform/values-dev.yaml \
  -n flamoral-dating --create-namespace
```

### Upgrade Release
```bash
helm upgrade flamoral ./infrastructure/helm/flamoral-platform \
  -f ./infrastructure/helm/flamoral-platform/values-prod.yaml \
  -n flamoral-dating
```

## Service Access

| Service | Internal URL | External URL | Port |
|---------|-------------|--------------|------|
| API Gateway | api-gateway.flamoral-dating:3000 | api.flamoral.com | 80/443 |
| Auth Service | auth-service.flamoral-dating:3002 | - | 3002 |
| User Service | user-service.flamoral-dating:3001 | - | 3001 |
| Realtime | realtime-service.flamoral-dating:8080 | ws.flamoral.com | 8080 |
| Grafana | grafana.monitoring:3000 | grafana.flamoral.com | 80 |
| Prometheus | prometheus-server.monitoring:9090 | prometheus.flamoral.com | 80 |
| Jaeger | jaeger-query.tracing:16686 | tracing.flamoral.com | 80 |

## Essential kubectl Commands

### Check Service Status
```bash
# All services
kubectl get pods -n flamoral-dating

# Specific service
kubectl get pods -n flamoral-dating -l app=api-gateway

# Watch status
kubectl get pods -n flamoral-dating -w
```

### View Logs
```bash
# Recent logs
kubectl logs -n flamoral-dating -l app=api-gateway --tail=100

# Follow logs
kubectl logs -n flamoral-dating -l app=api-gateway -f

# Previous container
kubectl logs -n flamoral-dating <pod-name> --previous
```

### Scale Services
```bash
# Manual scale
kubectl scale deployment api-gateway -n flamoral-dating --replicas=10

# Check HPA status
kubectl get hpa -n flamoral-dating

# Describe HPA
kubectl describe hpa api-gateway-hpa -n flamoral-dating
```

### Debugging
```bash
# Describe pod
kubectl describe pod <pod-name> -n flamoral-dating

# Execute in pod
kubectl exec -it <pod-name> -n flamoral-dating -- /bin/sh

# Port forward
kubectl port-forward -n flamoral-dating svc/api-gateway 3000:3000
```

## Monitoring Quick Access

### View Metrics
```bash
# Port forward Grafana
kubectl port-forward -n monitoring svc/grafana 3000:80

# Access: http://localhost:3000
# Default: admin / <from secret>
```

### Check Alerts
```bash
# Active alerts
kubectl exec -n monitoring prometheus-server-0 -- \
  promtool query instant http://localhost:9090 ALERTS

# Alertmanager status
kubectl port-forward -n monitoring svc/alertmanager 9093:9093
# Access: http://localhost:9093
```

### View Traces
```bash
# Port forward Jaeger
kubectl port-forward -n tracing svc/jaeger-query 16686:16686

# Access: http://localhost:16686
```

### Query Logs
```bash
# Port forward Loki
kubectl port-forward -n logging svc/loki 3100:3100

# Query via LogCLI
logcli query '{namespace="flamoral-dating",app="api-gateway"}' \
  --addr=http://localhost:3100
```

## Backup & Recovery

### Manual Backup
```bash
# Run backup script
./infrastructure/disaster-recovery/backup-scripts.sh

# Velero backup
velero backup create manual-backup-$(date +%Y%m%d) \
  --include-namespaces flamoral-dating,flamoral-ai \
  --wait
```

### Restore
```bash
# List backups
velero backup get

# Restore specific backup
velero restore create --from-backup <backup-name> --wait

# Database restore (PostgreSQL)
# See: infrastructure/disaster-recovery/DISASTER_RECOVERY_PLAN.md
```

## Blue-Green Deployment

### Switch to Green Version
```bash
# Run automated script
./infrastructure/kubernetes/deployments/switch-to-green.sh
```

### Manual Switch
```bash
# 1. Scale up green
kubectl scale deployment api-gateway-green -n flamoral-dating --replicas=5

# 2. Wait for ready
kubectl wait --for=condition=available deployment/api-gateway-green -n flamoral-dating

# 3. Switch traffic
kubectl patch service api-gateway -n flamoral-dating \
  -p '{"spec":{"selector":{"version":"green"}}}'

# 4. Scale down blue
kubectl scale deployment api-gateway-blue -n flamoral-dating --replicas=0
```

### Rollback
```bash
./infrastructure/kubernetes/deployments/rollback-to-blue.sh
```

## Resource Management

### Check Resource Usage
```bash
# Node resources
kubectl top nodes

# Pod resources
kubectl top pods -n flamoral-dating

# Namespace resources
kubectl describe resourcequota -n flamoral-dating
```

### View VPA Recommendations
```bash
kubectl get vpa -n flamoral-dating
kubectl describe vpa api-gateway-vpa -n flamoral-dating
```

## Configuration Updates

### Update ConfigMap
```bash
kubectl edit configmap api-gateway-config -n flamoral-dating

# Or apply from file
kubectl apply -f infrastructure/kubernetes/services/api-gateway.yaml
```

### Update Secret
```bash
kubectl create secret generic api-gateway-secrets \
  --from-literal=JWT_SECRET='new-secret' \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Restart Deployment
```bash
kubectl rollout restart deployment/api-gateway -n flamoral-dating
kubectl rollout status deployment/api-gateway -n flamoral-dating
```

## Troubleshooting Quick Fixes

### Pod Stuck in Pending
```bash
# Check events
kubectl describe pod <pod-name> -n flamoral-dating

# Check node resources
kubectl top nodes

# Check PVC status
kubectl get pvc -n flamoral-dating
```

### Pod CrashLoopBackOff
```bash
# View logs
kubectl logs <pod-name> -n flamoral-dating --previous

# Check resource limits
kubectl describe pod <pod-name> -n flamoral-dating | grep -A 5 Limits

# Check liveness/readiness probes
kubectl describe pod <pod-name> -n flamoral-dating | grep -A 10 Liveness
```

### Service Not Accessible
```bash
# Check service
kubectl get svc api-gateway -n flamoral-dating

# Check endpoints
kubectl get endpoints api-gateway -n flamoral-dating

# Check ingress
kubectl get ingress -n flamoral-dating
kubectl describe ingress api-gateway-ingress -n flamoral-dating
```

### High Memory/CPU
```bash
# Check metrics
kubectl top pod <pod-name> -n flamoral-dating

# Check HPA status
kubectl get hpa -n flamoral-dating

# Check VPA recommendations
kubectl describe vpa <service>-vpa -n flamoral-dating

# Force scale up
kubectl scale deployment <service> -n flamoral-dating --replicas=10
```

## Alert Response

### Critical Alert
1. Check service status: `kubectl get pods -n flamoral-dating -l app=<service>`
2. View recent logs: `kubectl logs -n flamoral-dating -l app=<service> --tail=200`
3. Check metrics in Grafana
4. Follow runbook: `infrastructure/disaster-recovery/DISASTER_RECOVERY_PLAN.md`

### Database Alert
1. Check database pods: `kubectl get pods -n flamoral-dating -l app=postgres`
2. Check connections: `kubectl exec -it postgres-0 -n flamoral-dating -- psql -c "SELECT * FROM pg_stat_activity;"`
3. Check replication: `kubectl exec -it postgres-0 -n flamoral-dating -- psql -c "SELECT * FROM pg_stat_replication;"`

### Payment Service Alert
1. Immediate scale up: `kubectl scale deployment payment-service -n flamoral-dating --replicas=5`
2. Check Stripe status: https://status.stripe.com
3. Review payment queue: Check Redis queue depth
4. Notify stakeholders

## Useful Aliases

Add to `.bashrc` or `.zshrc`:
```bash
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get svc'
alias kgd='kubectl get deployments'
alias kl='kubectl logs'
alias kd='kubectl describe'
alias ke='kubectl exec -it'
alias kn='kubectl config set-context --current --namespace'

# Flamoral specific
alias kf='kubectl -n flamoral-dating'
alias kfp='kubectl get pods -n flamoral-dating'
alias kfl='kubectl logs -n flamoral-dating'
alias kfg='kubectl port-forward -n monitoring svc/grafana 3000:80'
```

## Emergency Contacts

- **Incident Commander:** +1-555-0100
- **On-Call Engineer:** Check PagerDuty
- **Slack:** #incident-response
- **War Room:** Zoom link in Slack channel

## Important Links

- **Grafana:** https://grafana.flamoral.com
- **Prometheus:** https://prometheus.flamoral.com
- **Jaeger:** https://tracing.flamoral.com
- **Status Page:** https://status.flamoral.com
- **Runbooks:** `infrastructure/runbooks/`
- **Full Docs:** `infrastructure/INFRASTRUCTURE_COMPLETE.md`

## File Locations

```
infrastructure/
├── kubernetes/
│   ├── services/               # Service manifests
│   ├── autoscaling/           # HPA & VPA configs
│   └── deployments/           # Blue-green configs
├── helm/
│   └── flamoral-platform/     # Main Helm chart
├── monitoring/
│   ├── prometheus/            # Prometheus configs
│   ├── alertmanager/          # Alert configs
│   └── grafana/              # Dashboards
├── logging/                   # Loki configs
├── disaster-recovery/        # DR procedures
└── INFRASTRUCTURE_COMPLETE.md # Complete docs
```

## Health Check URLs

| Service | Health Check URL |
|---------|-----------------|
| API Gateway | http://api-gateway:3000/health |
| Auth Service | http://auth-service:3002/health |
| User Service | http://user-service:3001/health |
| Matching | http://matching-service:3003/health |
| Messaging | http://messaging-service:3004/health |
| Payment | http://payment-service:3006/health |

---

**For detailed documentation, see:** `infrastructure/INFRASTRUCTURE_COMPLETE.md`
