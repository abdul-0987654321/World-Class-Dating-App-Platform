# Flamoral Production Go-Live Checklist

**Last Updated:** December 13, 2025
**Status:** Resources Stopped - Development Mode

## Current State

The production resources are currently stopped to save costs (~$815/month savings). Before going live, follow this checklist to ensure a successful deployment.

---

## Phase 1: Pre-Restart Verification

### 1.1 Code Fixes Applied (Completed)
- [x] Dockerfile port mismatches fixed
  - matching-service: 3003 → 3009
  - notification-service: 3008 → 3012
  - workflow-engine: 3011 → 3013
- [x] SSL/TLS certificate validation enabled (`rejectUnauthorized: true`)
  - 13 database connection files fixed
- [x] WebSocket CORS security implemented
  - API Gateway: Origin validation callback
  - Realtime Service: Proper CheckOrigin function
- [x] Kubernetes security contexts added
  - Pod-level: runAsNonRoot, runAsUser, fsGroup
  - Container-level: readOnlyRootFilesystem, capabilities drop
  - Volume mounts for tmp and cache directories
- [x] Frontend CSP hardened
  - Removed unsafe-eval from script-src
  - Added HSTS, proper security headers in nginx.conf

### 1.2 Configuration Verification
- [ ] Verify all `.env.production` files have real API keys (not placeholders)
- [ ] Confirm Azure Key Vault has all required secrets:
  - [ ] `jwt-secret` (min 32 characters)
  - [ ] `stripe-secret-key`
  - [ ] `stripe-webhook-secret`
  - [ ] `sendgrid-api-key`
  - [ ] `twilio-auth-token`
  - [ ] `firebase-private-key`
  - [ ] `agora-app-certificate`
  - [ ] `database-password`
  - [ ] `redis-password`
- [ ] Verify DNS records are configured:
  - [ ] `flamoral.com` → Front Door endpoint
  - [ ] `www.flamoral.com` → CNAME to flamoral.com
  - [ ] `api.flamoral.com` → Front Door endpoint

---

## Phase 2: Infrastructure Restart

### 2.1 Start PostgreSQL Database
```bash
# Start PostgreSQL (takes 2-5 minutes)
az postgres flexible-server start \
  --name flamoral-prod-postgres \
  --resource-group flamoral-prod-rg

# Verify it's running
az postgres flexible-server show \
  --name flamoral-prod-postgres \
  --resource-group flamoral-prod-rg \
  --query "state" -o tsv
```
- [ ] PostgreSQL started and healthy
- [ ] Connection test successful

**Note:** Azure auto-restarts stopped PostgreSQL after 7 days. Re-stop if not ready to go live.

### 2.2 Start AKS Cluster
```bash
# Start AKS cluster (takes 5-10 minutes)
az aks start \
  --name flamoral-prod-aks \
  --resource-group flamoral-prod-rg

# Get kubectl credentials
az aks get-credentials \
  --name flamoral-prod-aks \
  --resource-group flamoral-prod-rg \
  --overwrite-existing

# Verify cluster is running
kubectl get nodes
```
- [ ] AKS cluster started
- [ ] All nodes in Ready state

---

## Phase 3: Kubernetes Deployment

### 3.1 Apply Namespace and Core Resources
```bash
cd infrastructure/kubernetes/production

# Apply namespace
kubectl apply -f namespace.yaml

# Apply External Secrets
kubectl apply -f external-secrets/

# Verify secrets are synced
kubectl get externalsecrets -n flamoral
```
- [ ] Namespace created
- [ ] External Secrets synced from Key Vault

### 3.2 Deploy Services
```bash
# Deploy all services using kustomize
kubectl apply -k deployments/

# Watch deployment progress
kubectl get pods -n flamoral -w
```
- [ ] All pods running (no CrashLoopBackOff)
- [ ] All pods pass readiness probes

### 3.3 Apply TLS Certificate
```bash
# Apply cert-manager issuer and certificate
kubectl apply -f flamoral-certificate.yaml

# Check certificate status
kubectl get certificates -n flamoral
```
- [ ] Certificate issued by Let's Encrypt

---

## Phase 4: Verification

### 4.1 Service Health Checks
```bash
# Check all pods are running
kubectl get pods -n flamoral

# Check all services
kubectl get svc -n flamoral

# Check ingress
kubectl get ingress -n flamoral
```

### 4.2 Endpoint Testing
- [ ] API Gateway health: `curl https://api.flamoral.com/health`
- [ ] Auth Service: `curl https://api.flamoral.com/api/v1/auth/health`
- [ ] User Service: `curl https://api.flamoral.com/api/v1/users/health`
- [ ] WebSocket connection: Test wss://api.flamoral.com

### 4.3 Frontend Testing
- [ ] Homepage loads: https://flamoral.com
- [ ] Assets load correctly (no mixed content)
- [ ] Login flow works
- [ ] WebSocket real-time features work

---

## Phase 5: DNS & CDN Configuration

### 5.1 Azure Front Door Routes
```bash
# Verify Front Door endpoint
az afd endpoint list \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg

# Verify routes are configured
az afd route list \
  --profile-name flamoral-prod-afd \
  --endpoint-name flamoral-prod-endpoint \
  --resource-group flamoral-prod-rg
```
- [ ] Front Door routes active
- [ ] Custom domains verified

### 5.2 DNS Propagation
```bash
# Check DNS resolution
nslookup flamoral.com
nslookup api.flamoral.com
nslookup www.flamoral.com
```
- [ ] DNS resolving to correct IPs
- [ ] SSL certificates valid

---

## Phase 6: Monitoring & Alerts

### 6.1 Enable Monitoring
- [ ] Azure Monitor alerts configured
- [ ] Application Insights connected
- [ ] Sentry error tracking verified
- [ ] Log Analytics workspace receiving logs

### 6.2 Set Up Alerts
- [ ] CPU/Memory alerts
- [ ] Error rate alerts
- [ ] Response time alerts
- [ ] Certificate expiry alerts

---

## Phase 7: Security Checklist

### 7.1 Pre-Launch Security
- [x] All database connections use SSL
- [x] WebSocket CORS properly configured
- [x] CSP headers configured (no unsafe-eval)
- [x] HSTS enabled
- [ ] WAF rules verified
- [ ] Rate limiting tested
- [ ] CSRF protection verified

### 7.2 Compliance
- [ ] GDPR compliance verified
- [ ] Privacy policy accessible
- [ ] Terms of service accessible
- [ ] Cookie consent implemented
- [ ] Data retention policies configured

---

## Rollback Procedure

If issues occur after go-live:

### Immediate Rollback
```bash
# Scale down all deployments
kubectl scale deployment --all --replicas=0 -n flamoral

# Stop AKS cluster
az aks stop \
  --name flamoral-prod-aks \
  --resource-group flamoral-prod-rg

# Stop PostgreSQL
az postgres flexible-server stop \
  --name flamoral-prod-postgres \
  --resource-group flamoral-prod-rg
```

### Investigate and Fix
1. Check pod logs: `kubectl logs <pod-name> -n flamoral`
2. Check events: `kubectl get events -n flamoral --sort-by='.lastTimestamp'`
3. Review Application Insights for errors

---

## Contact & Support

- **Infrastructure Issues:** Check INCIDENT_RESPONSE.md
- **Deployment Issues:** Check PRODUCTION_DEPLOYMENT_GUIDE.md
- **Service Issues:** Check SERVICE_PORT_ALLOCATION.md

---

## Estimated Restart Time

| Component | Time |
|-----------|------|
| PostgreSQL Start | 2-5 minutes |
| AKS Cluster Start | 5-10 minutes |
| Pods Ready | 5-10 minutes |
| DNS Propagation | 0-24 hours (if changed) |
| **Total (no DNS changes)** | **15-25 minutes** |

---

## Post Go-Live Tasks

After successful launch:

- [ ] Monitor error rates for 24 hours
- [ ] Review performance metrics
- [ ] Test all critical user flows
- [ ] Set up regular backup verification
- [ ] Document any issues encountered
- [ ] Schedule PostgreSQL auto-stop reminder (7-day Azure limit)
