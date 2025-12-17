# Quick Verification Guide - Flamoral Platform

**Quick reference for post-deployment verification**

---

## 🚀 Quick Start (5 Minutes)

```bash
cd infrastructure/scripts

# 1. Verify deployment
./verify-deployment.sh production

# 2. Run smoke tests
./smoke-tests.sh -e production

# 3. Monitor health
./health-dashboard.sh --watch 10
```

---

## 📋 Essential Commands

### Deployment Verification
```bash
# Full verification
./verify-deployment.sh production

# Check specific environment
./verify-deployment.sh staging
```

### Smoke Tests
```bash
# Basic smoke tests
./smoke-tests.sh -e production

# Verbose output
./smoke-tests.sh -e production -v
```

### Health Dashboard
```bash
# Single view
./health-dashboard.sh

# Auto-refresh every 5 seconds
./health-dashboard.sh -w 5

# JSON output
./health-dashboard.sh -j
```

---

## ✅ Quick Health Checks

### DNS
```bash
dig flamoral.com A +short
dig api.flamoral.com A +short
```

### Certificates
```bash
curl -I https://flamoral.com
openssl s_client -connect flamoral.com:443 -servername flamoral.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

### Pods
```bash
kubectl get pods -n flamoral
kubectl get pods -n flamoral | grep -v Running
```

### Services
```bash
kubectl get svc -n flamoral
kubectl get ingress -n flamoral
```

### Health Endpoints
```bash
curl https://flamoral.com/health
curl https://api.flamoral.com/health
curl https://api.flamoral.com/api/v1/status
```

---

## 🔧 Troubleshooting

### Pod Issues
```bash
# Check pod status
kubectl get pods -n flamoral

# View pod logs
kubectl logs -n flamoral <pod-name>

# Describe pod
kubectl describe pod -n flamoral <pod-name>

# Restart deployment
kubectl rollout restart deployment/<name> -n flamoral
```

### Service Issues
```bash
# Check endpoints
kubectl get endpoints -n flamoral

# Check service
kubectl describe svc/<service-name> -n flamoral

# Port forward for testing
kubectl port-forward -n flamoral svc/<service-name> 8080:80
```

### Certificate Issues
```bash
# Check certificates
kubectl get certificate -n flamoral

# Describe certificate
kubectl describe certificate flamoral-tls -n flamoral

# Check cert-manager
kubectl get clusterissuer
kubectl logs -n cert-manager deployment/cert-manager
```

---

## 🚨 Alert Setup

### Deploy Alerts
```bash
# Edit credentials first!
vim infrastructure/monitoring/alerts-config.yaml

# Deploy
kubectl apply -f infrastructure/monitoring/alerts-config.yaml

# Verify
kubectl get configmap -n monitoring flamoral-alert-rules
kubectl get pods -n monitoring | grep alertmanager
```

### Test Alerts
```bash
# Create failing pod
kubectl run test-fail --image=busybox --restart=Never -n flamoral -- /bin/sh -c "exit 1"

# Check alerts fired
# - Check Slack
# - Check email
# - Check AlertManager UI

# Clean up
kubectl delete pod test-fail -n flamoral
```

---

## 📊 Monitoring

### Prometheus
```bash
# Port forward
kubectl port-forward -n monitoring svc/prometheus-server 9090:9090

# Access: http://localhost:9090
```

### Grafana
```bash
# Port forward
kubectl port-forward -n monitoring svc/grafana 3000:3000

# Access: http://localhost:3000
# Default login: admin/admin
```

### Logs
```bash
# Stream pod logs
kubectl logs -f -n flamoral deployment/web-app

# Last 100 lines
kubectl logs -n flamoral deployment/api-gateway --tail=100

# All pods in deployment
kubectl logs -n flamoral -l app=messaging-service --tail=50
```

---

## 📦 Key Files

| File | Purpose | Location |
|------|---------|----------|
| verify-deployment.sh | Automated verification | `infrastructure/scripts/` |
| smoke-tests.sh | Smoke testing | `infrastructure/scripts/` |
| health-dashboard.sh | Health monitoring | `infrastructure/scripts/` |
| alerts-config.yaml | Alert rules | `infrastructure/monitoring/` |
| VERIFICATION_CHECKLIST.md | Manual checklist | `infrastructure/` |

---

## 🎯 Success Criteria

### Deployment Verification
- ✅ All DNS records resolve
- ✅ All certificates valid (>30 days)
- ✅ All pods running (X/X ready)
- ✅ All health endpoints return 200
- ✅ No CrashLoopBackOff pods

### Smoke Tests
- ✅ All API endpoints respond
- ✅ Authentication flow works
- ✅ WebSocket connects
- ✅ Static assets load
- ✅ Response times <2s

### Health Dashboard
- ✅ All pods Running
- ✅ CPU usage <70%
- ✅ Memory usage <70%
- ✅ Error rate <1%
- ✅ Cache hit rate >80%

---

## 🆘 Emergency Contacts

| Team | Contact | Channel |
|------|---------|---------|
| Platform | platform-team@flamoral.com | #platform |
| On-Call | oncall@flamoral.com | #incidents |
| Security | security-team@flamoral.com | #security |

---

## 📖 Documentation Links

- **Full Guide:** `POST_DEPLOYMENT_VERIFICATION_SUMMARY.md`
- **Script Docs:** `infrastructure/scripts/VERIFICATION_SCRIPTS_README.md`
- **Checklist:** `infrastructure/VERIFICATION_CHECKLIST.md`
- **Runbooks:** https://docs.flamoral.com/runbooks

---

## 🔄 Regular Tasks

### Daily
```bash
# Check health dashboard
./health-dashboard.sh

# Review alerts
# Check Slack #flamoral-alerts
```

### Weekly
```bash
# Run smoke tests
./smoke-tests.sh -e production

# Review metrics
# Check Grafana dashboards
```

### Monthly
```bash
# Full verification
./verify-deployment.sh production

# Complete checklist
# Review VERIFICATION_CHECKLIST.md
```

---

**Last Updated:** December 13, 2025
**Version:** 1.0
