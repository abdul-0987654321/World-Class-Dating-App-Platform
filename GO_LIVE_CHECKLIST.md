# Flamoral Platform - Go-Live Checklist
**Resources Restart & Production Launch**

**Version:** 2.0
**Date:** December 13, 2025
**Project:** Flamoral Dating Platform
**Launch Commander:** _______________

---

## Document Overview

This checklist covers the complete process of restarting shut-down resources and launching the Flamoral dating platform to production. It includes pre-launch preparation, resource restart procedures, verification steps, and post-launch monitoring.

**Total Estimated Time:**
- Pre-launch preparation: 4-8 hours
- Resource restart: 45-90 minutes
- Verification & testing: 30-60 minutes
- **Total active work: 6-11 hours**

---

## Status Legend

- ✅ **COMPLETE** - Task finished successfully
- 🔄 **IN PROGRESS** - Currently working on this
- ⏳ **PENDING** - Waiting to start
- ⚠️ **ISSUE** - Problem encountered
- ❌ **BLOCKED** - Cannot proceed

---

# PHASE 1: PRE-LAUNCH PREPARATION (1 Week Before)

**Estimated Time:** 4-8 hours (distributed over several days)
**Start Date:** _______________
**Target Completion:** T-24 hours before launch

## 1.1 Code & Build Readiness

### Code Quality
- [ ] All code reviewed and merged to `main` branch
- [ ] No open critical or high-priority issues in issue tracker
- [ ] Code freeze in effect (main branch locked)
- [ ] Version tagged: v_______________
- [ ] Release notes finalized and reviewed
- [ ] All TODO/FIXME comments addressed or documented

**Version Tag:** _______________
**Issues Remaining:** _______________
**Status:** ☐ READY  ☐ NOT READY

### CI/CD Pipeline
- [ ] All CI/CD pipelines passing (GitHub Actions)
- [ ] Unit tests: 100% passing (coverage >80%)
- [ ] Integration tests: 100% passing
- [ ] E2E tests: 100% passing
- [ ] Docker images built successfully
- [ ] Images pushed to ACR: `flamoralacr.azurecr.io`
- [ ] Image tags verified and documented

**Pipeline Status:** _______________
**Image Tag:** _______________
**Status:** ☐ READY  ☐ NOT READY

---

## 1.2 Security Audit

### Security Scanning
- [ ] Security scanning completed (Snyk, OWASP ZAP)
- [ ] No critical vulnerabilities found
- [ ] High-priority vulnerabilities addressed or accepted
- [ ] Dependency audit passed (`npm audit`)
- [ ] Container image scanning passed
- [ ] Secrets scanning passed (no credentials in code)

**Critical Vulns:** _______________
**High Vulns:** _______________
**Status:** ☐ READY  ☐ NOT READY

### Authentication & Authorization
- [ ] **CRITICAL:** Admin service JWT secret moved to Key Vault
- [ ] httpOnly cookies verified in auth responses
- [ ] Token validation tested
- [ ] RBAC permissions verified on all endpoints
- [ ] Service-to-service authentication tested
- [ ] Session management tested

**Critical Issues:** _______________
**Status:** ☐ READY  ☐ NOT READY

### Secrets Management
- [ ] All secrets stored in Azure Key Vault (no hardcoded values)
- [ ] Key Vault access tested with Managed Identity
- [ ] Secrets rotation policy configured
- [ ] Emergency access procedures documented
- [ ] Secret backup stored securely

**Key Vaults Verified:**
- [ ] flamoralprodauthkv (4 secrets)
- [ ] flamoralprodpaymentkv (2 secrets)
- [ ] flamoralproddatakv (2 secrets)
- [ ] flamoralprodexternalkv (6 secrets)
- [ ] flamoralprodinfrakv (3 secrets)

**Total Secrets:** 17/17 verified
**Status:** ☐ READY  ☐ NOT READY

---

## 1.3 Performance & Load Testing

### Performance Testing
- [ ] Performance testing completed
- [ ] Response time p95 < 500ms verified
- [ ] Response time p99 < 1000ms verified
- [ ] Database query performance acceptable
- [ ] N+1 query issues resolved
- [ ] Redis KEYS command replaced with SCAN

**P95 Response Time:** _____ms
**P99 Response Time:** _____ms
**Status:** ☐ READY  ☐ NOT READY

### Load Testing
- [ ] Load testing completed (K6, Artillery)
- [ ] 1,000 concurrent users tested successfully
- [ ] 10,000 concurrent users tested successfully
- [ ] Peak load capacity documented
- [ ] Database handles 100K requests/min
- [ ] WebSocket: 50K concurrent connections tested
- [ ] File uploads: 1000/min tested
- [ ] Auto-scaling verified under load

**Max Concurrent Users Tested:** _______________
**Auto-scaling Trigger:** _______________
**Status:** ☐ READY  ☐ NOT READY

---

## 1.4 Backup Procedures

### Database Backups
- [ ] PostgreSQL backup procedure tested
- [ ] MongoDB backup procedure tested (if applicable)
- [ ] Redis persistence configured
- [ ] Backup restoration tested successfully
- [ ] Point-in-time recovery (PITR) verified
- [ ] Backup retention policy: 30 days configured
- [ ] Automated daily backups scheduled (2 AM UTC)

**Last Backup Test:** _______________
**Restoration Time:** _____minutes
**Status:** ☐ READY  ☐ NOT READY

### Configuration Backups
- [ ] Kubernetes manifests backed up
- [ ] Terraform state backed up
- [ ] DNS configuration documented
- [ ] TLS certificates backed up
- [ ] Environment variables documented

**Backup Location:** _______________
**Status:** ☐ READY  ☐ NOT READY

---

## 1.5 Rollback Procedures

### Rollback Testing
- [ ] Rollback procedure documented and reviewed
- [ ] Quick rollback (application only) tested - 5-10 min target
- [ ] Full rollback (infrastructure + app) tested - 15-30 min target
- [ ] Database rollback procedure tested
- [ ] Previous version images available in ACR
- [ ] Rollback command scripts prepared and tested

**Rollback Scripts Location:** _______________
**Previous Stable Version:** _______________
**Status:** ☐ READY  ☐ NOT READY

---

## 1.6 Monitoring & Alerting

### Monitoring Setup
- [ ] Prometheus configured and accessible
- [ ] Grafana dashboards created and accessible
- [ ] Azure Application Insights configured
- [ ] Log Analytics workspace configured
- [ ] Azure Monitor alerts configured
- [ ] UptimeRobot monitors configured
- [ ] Sentry error tracking configured

**Grafana URL:** _______________
**App Insights URL:** _______________
**Status:** ☐ READY  ☐ NOT READY

### Alert Configuration
- [ ] **Critical alerts** configured:
  - [ ] Pod/service down
  - [ ] Error rate >5%
  - [ ] Database connection failures
  - [ ] Certificate expiration (< 7 days)
- [ ] **Warning alerts** configured:
  - [ ] High latency (p95 >1s)
  - [ ] High CPU usage (>80%)
  - [ ] High memory usage (>85%)
  - [ ] Disk space low (<20%)
- [ ] **Info alerts** configured:
  - [ ] Deployments
  - [ ] Scaling events
  - [ ] Backup completions

**PagerDuty Integration:** ☐ Configured
**Slack Notifications:** ☐ Configured
**Email Alerts:** ☐ Configured
**Status:** ☐ READY  ☐ NOT READY

---

## 1.7 Documentation Review

### Technical Documentation
- [ ] Architecture documentation current
- [ ] API documentation complete (OpenAPI spec)
- [ ] Deployment guide reviewed and updated
- [ ] Runbooks for common issues complete (20+ scenarios)
- [ ] Incident response procedures documented
- [ ] Database schema documentation current
- [ ] Infrastructure-as-code documented

**Documentation Location:** _______________
**Last Updated:** _______________
**Status:** ☐ READY  ☐ NOT READY

### Operational Documentation
- [ ] On-call rotation schedule published
- [ ] Escalation procedures documented
- [ ] Emergency contact list current
- [ ] Support procedures documented
- [ ] User documentation complete

**On-call Tool:** PagerDuty / Other: _______________
**Status:** ☐ READY  ☐ NOT READY

---

# PHASE 2: DAY BEFORE LAUNCH (T-24 Hours)

**Estimated Time:** 2-4 hours
**Start Date:** _______________
**Start Time:** _______________

## 2.1 Team Coordination

### Team Availability
- [ ] Launch Commander confirmed: _______________
- [ ] DevOps Lead confirmed: _______________
- [ ] Backend Lead confirmed: _______________
- [ ] Frontend Lead confirmed: _______________
- [ ] QA Lead confirmed: _______________
- [ ] Security Lead confirmed: _______________
- [ ] Support Lead confirmed: _______________
- [ ] On-call engineer confirmed: _______________

**Total Team Members Available:** _______________
**Status:** ☐ READY  ☐ NOT READY

### Communication Channels
- [ ] Launch war room (video call) scheduled
- [ ] Slack channel #launch-war-room created
- [ ] Emergency contact list shared with all team members
- [ ] Communication plan documented and shared
- [ ] Stakeholder notification list prepared
- [ ] Status page access verified

**War Room Link:** _______________
**Launch Time:** _______________
**Status:** ☐ READY  ☐ NOT READY

---

## 2.2 External Services Verification

### Payment Processing
- [ ] Stripe production account verified and active
- [ ] Stripe API keys in Key Vault verified
- [ ] Webhook endpoints configured: `https://api.flamoral.com/webhooks/stripe`
- [ ] Webhook signature validation tested
- [ ] Test payment processed successfully
- [ ] Payment reconciliation process ready

**Stripe Account ID:** _______________
**Test Payment:** ☐ Success  ☐ Failed
**Status:** ☐ READY  ☐ NOT READY

### Email Service
- [ ] SendGrid production account verified
- [ ] SendGrid API key in Key Vault verified
- [ ] Email templates tested
- [ ] Test email sent successfully
- [ ] SPF/DKIM/DMARC records verified
- [ ] Email deliverability tested

**Test Email Sent To:** _______________
**Delivery Status:** ☐ Inbox  ☐ Spam  ☐ Failed
**Status:** ☐ READY  ☐ NOT READY

### SMS Service (if applicable)
- [ ] Twilio production account verified
- [ ] Twilio credentials in Key Vault verified
- [ ] Test SMS sent successfully
- [ ] Phone number verified

**Test SMS Sent To:** _______________
**Delivery Status:** ☐ Success  ☐ Failed
**Status:** ☐ READY  ☐ NOT READY

### Other External Services
- [ ] Azure Blob Storage: Upload/download tested
- [ ] Firebase: Push notifications tested
- [ ] OpenAI API: Connectivity tested
- [ ] Sentry: Error tracking tested
- [ ] All vendor status pages checked (no active incidents)

**Vendor Status Pages:**
- [ ] Azure: https://status.azure.com
- [ ] Stripe: https://status.stripe.com
- [ ] SendGrid: https://status.sendgrid.com
- [ ] Twilio: https://status.twilio.com

**Status:** ☐ READY  ☐ NOT READY

---

## 2.3 Database Pre-Checks

### PostgreSQL
- [ ] PostgreSQL instance status verified
- [ ] Connection string in Key Vault verified
- [ ] Database connection tested from AKS
- [ ] Migration scripts ready and tested
- [ ] Database performance baseline captured
- [ ] Index health verified
- [ ] Backup verified within last 24 hours

**Database Version:** _______________
**Last Backup:** _______________
**Status:** ☐ READY  ☐ NOT READY

### Redis
- [ ] Redis instance status verified
- [ ] Connection string in Key Vault verified
- [ ] Redis connection tested from AKS
- [ ] Memory configuration verified
- [ ] Persistence configuration verified
- [ ] Failover tested

**Redis Version:** _______________
**Memory Allocated:** _______________
**Status:** ☐ READY  ☐ NOT READY

---

## 2.4 DNS & SSL Verification

### DNS Configuration
- [ ] DNS zone configured: `flamoral.com`
- [ ] A records verified for all subdomains:
  - [ ] `flamoral.com` → 48.200.65.15
  - [ ] `www.flamoral.com` → 48.200.65.15
  - [ ] `api.flamoral.com` → 48.200.65.15
  - [ ] `admin.flamoral.com` → 48.200.65.15
- [ ] DNS propagation verified (dig/nslookup)
- [ ] TTL values appropriate (300s for launch)

**DNS Propagation:** ☐ Complete  ☐ In Progress
**Status:** ☐ READY  ☐ NOT READY

### SSL/TLS Certificates
- [ ] TLS certificates ready (Let's Encrypt)
- [ ] Certificate issuance tested
- [ ] Auto-renewal configured (cert-manager)
- [ ] Certificate validity >30 days
- [ ] Certificate chain verified
- [ ] HTTPS redirect configured

**Certificate Expiry:** _______________
**Certificate Issuer:** Let's Encrypt
**Status:** ☐ READY  ☐ NOT READY

---

# PHASE 3: LAUNCH DAY - PRE-START (T-4 Hours)

**Estimated Time:** 1-2 hours
**Start Date:** _______________
**Start Time:** _______________

## 3.1 Team Assembly

### War Room Setup
- [ ] Launch Commander online and in war room
- [ ] DevOps Lead online and in war room
- [ ] Backend Lead online and in war room
- [ ] Frontend Lead online and in war room
- [ ] QA Lead online and in war room
- [ ] Support Lead online and in war room
- [ ] Screen sharing working
- [ ] All team members have access to monitoring dashboards

**War Room Active:** ☐ Yes  ☐ No
**Team Members Present:** _____/7
**Status:** ☐ READY  ☐ NOT READY

---

## 3.2 Azure Account Verification

### Azure CLI & Access
- [ ] Azure CLI installed and updated: `az --version`
- [ ] Logged in to Azure: `az login`
- [ ] Correct subscription selected:
  ```bash
  az account show
  # Expected: ebd1613e-fea0-4b6d-8918-7e4de6a71c44
  ```
- [ ] Sufficient permissions verified (Contributor role)
- [ ] kubectl installed and configured
- [ ] kubectl context set to production cluster

**Subscription ID:** _______________
**Azure Account:** _______________
**Status:** ☐ READY  ☐ NOT READY

---

## 3.3 Final Pre-Flight Checks

### Infrastructure Resources
- [ ] Resource group exists: `flamoral-prod-rg`
- [ ] AKS cluster exists: `flamoral-prod-aks` (can be stopped)
- [ ] PostgreSQL server exists (can be stopped)
- [ ] Redis cache exists (can be stopped)
- [ ] Container registry accessible: `flamoralacr.azurecr.io`
- [ ] Front Door profile exists: `flamoral-prod-afd`
- [ ] All 5 Key Vaults exist and accessible

**Resource Group:** ☐ Exists
**Resources Count:** _______________
**Status:** ☐ READY  ☐ NOT READY

### Monitoring Dashboards
- [ ] All monitoring dashboards open and visible
- [ ] Prometheus accessible
- [ ] Grafana accessible
- [ ] Azure Portal open to resource group
- [ ] Application Insights dashboard open
- [ ] Sentry dashboard open

**All Dashboards Accessible:** ☐ Yes  ☐ No
**Status:** ☐ READY  ☐ NOT READY

---

# PHASE 4: LAUNCH DAY - RESOURCE RESTART (T-0)

**Estimated Time:** 45-90 minutes
**Start Time:** _______________

## 4.1 Start PostgreSQL Database (Priority 1)

**Estimated Time:** 10-15 minutes
**Start Time:** _______________

### Start PostgreSQL Server

```bash
# Start PostgreSQL Flexible Server
az postgres flexible-server start \
  --name flamoral-prod-postgres \
  --resource-group flamoral-prod-rg

# Wait for server to be ready (may take 5-10 minutes)
az postgres flexible-server show \
  --name flamoral-prod-postgres \
  --resource-group flamoral-prod-rg \
  --query state
```

**Actions:**
- [ ] Command executed successfully
- [ ] Server state shows "Ready"
- [ ] No errors in command output

**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

**If FAILED, error message:** _______________

---

### Verify PostgreSQL Connectivity

```bash
# Test connection from local machine
# (Get connection string from Key Vault first)
az keyvault secret show \
  --vault-name flamoralproddatakv \
  --name postgresql-connection-string \
  --query value -o tsv

# Test connection using psql or from an AKS pod
kubectl run postgres-test --rm -it --restart=Never \
  --image=postgres:15 \
  --namespace=flamoral-prod \
  -- psql "postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE" -c "SELECT version();"
```

**Actions:**
- [ ] Connection string retrieved successfully
- [ ] Database connection successful
- [ ] Database version verified
- [ ] Sample query executed successfully
- [ ] Connection latency acceptable (<50ms)

**Database Version:** _______________
**Connection Latency:** _____ms
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

## 4.2 Start Redis Cache (Priority 2)

**Estimated Time:** 5-10 minutes
**Start Time:** _______________

### Start Redis Instance

```bash
# Check if Redis needs to be started (Premium tier may not support stop/start)
# If using Azure Cache for Redis Basic/Standard:
az redis show \
  --name flamoral-prod-redis \
  --resource-group flamoral-prod-rg \
  --query provisioningState

# If stopped, start it
# Note: Standard/Premium tier Redis usually runs continuously
```

**Actions:**
- [ ] Redis status checked
- [ ] Redis running or started successfully
- [ ] Provisioning state is "Succeeded"

**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Verify Redis Connectivity

```bash
# Get Redis connection details
az keyvault secret show \
  --vault-name flamoralproddatakv \
  --name redis-connection-string \
  --query value -o tsv

# Test Redis connection from AKS pod
kubectl run redis-test --rm -it --restart=Never \
  --image=redis:7 \
  --namespace=flamoral-prod \
  -- redis-cli -h HOST -p 6380 -a PASSWORD --tls ping
```

**Actions:**
- [ ] Connection string retrieved successfully
- [ ] Redis connection successful (PONG response)
- [ ] TLS connection working
- [ ] Connection latency acceptable (<20ms)

**Redis Version:** _______________
**Connection Latency:** _____ms
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

## 4.3 Start AKS Cluster (Priority 3)

**Estimated Time:** 15-20 minutes
**Start Time:** _______________

### Start AKS Cluster

```bash
# Start the AKS cluster
az aks start \
  --name flamoral-prod-aks \
  --resource-group flamoral-prod-rg

# This may take 10-15 minutes
# Monitor progress with:
az aks show \
  --name flamoral-prod-aks \
  --resource-group flamoral-prod-rg \
  --query powerState
```

**Actions:**
- [ ] Command executed successfully
- [ ] Cluster state shows "Running"
- [ ] No errors during startup

**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

**If FAILED, error message:** _______________

---

### Verify AKS Cluster Health

```bash
# Get AKS credentials
az aks get-credentials \
  --name flamoral-prod-aks \
  --resource-group flamoral-prod-rg \
  --overwrite-existing

# Check cluster nodes
kubectl get nodes

# Expected output: All nodes should show "Ready" status
# Example:
# NAME                                STATUS   ROLES   AGE   VERSION
# aks-nodepool1-12345678-vmss000000   Ready    agent   30d   v1.28.3
# aks-nodepool1-12345678-vmss000001   Ready    agent   30d   v1.28.3
# aks-nodepool1-12345678-vmss000002   Ready    agent   30d   v1.28.3
```

**Actions:**
- [ ] Credentials retrieved successfully
- [ ] kubectl can connect to cluster
- [ ] All nodes show "Ready" status
- [ ] Node count matches expected: _____/_____ ready

**Node Count:** _____ Ready / _____ Total
**Kubernetes Version:** _______________
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Verify Cluster System Pods

```bash
# Check system pods in kube-system namespace
kubectl get pods -n kube-system

# All pods should be Running or Completed
# Key pods to verify:
# - kube-proxy-*
# - coredns-*
# - azure-cni-*
# - metrics-server-*
```

**Actions:**
- [ ] All kube-system pods running
- [ ] CoreDNS pods healthy (2 replicas)
- [ ] Metrics server running
- [ ] No pods in CrashLoopBackOff state

**System Pods Status:** _____/_____ Running
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

## 4.4 Verify Ingress Controller (Priority 4)

**Estimated Time:** 5 minutes
**Start Time:** _______________

### Check NGINX Ingress Controller

```bash
# Check ingress controller pods
kubectl get pods -n ingress-nginx

# Verify ingress service has external IP
kubectl get svc -n ingress-nginx

# Expected output should show external IP: 48.200.65.15
```

**Actions:**
- [ ] Ingress controller pods running
- [ ] External IP assigned: 48.200.65.15
- [ ] LoadBalancer service healthy

**External IP:** _______________
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Test Ingress Endpoint

```bash
# Test ingress endpoint is reachable
curl -I http://48.200.65.15/health --max-time 10

# If services not yet deployed, this may return 404 or 503
# That's OK - we're just verifying the ingress is reachable
```

**Actions:**
- [ ] Ingress endpoint reachable
- [ ] Response received (any HTTP response code is OK at this stage)

**HTTP Response Code:** _______________
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

## 4.5 Deploy Application Services (Priority 5)

**Estimated Time:** 20-30 minutes
**Start Time:** _______________

### Deploy Namespace & Base Resources

```bash
# Create production namespace if needed
kubectl apply -f infrastructure/kubernetes/production/namespace.yaml

# Verify namespace
kubectl get namespace flamoral-prod
```

**Actions:**
- [ ] Namespace exists or created
- [ ] Namespace shows "Active" status

**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Deploy External Secrets Operator

```bash
# Install External Secrets Operator (if not already installed)
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm upgrade --install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace \
  --wait

# Deploy SecretStore configurations for Key Vaults
kubectl apply -f infrastructure/kubernetes/production/external-secrets/
```

**Actions:**
- [ ] External Secrets Operator installed
- [ ] All SecretStore resources created (5 Key Vaults)
- [ ] ExternalSecret resources created
- [ ] Secrets synced successfully from Key Vaults

**Secrets Synced:** _____/17
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Deploy cert-manager & TLS Certificates

```bash
# Install cert-manager (if not already installed)
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true \
  --wait

# Deploy ClusterIssuer for Let's Encrypt
kubectl apply -f infrastructure/kubernetes/production/cert-manager.yaml

# Deploy certificate resources
kubectl apply -f infrastructure/kubernetes/production/flamoral-certificate.yaml

# Wait for certificates to be issued (may take 2-5 minutes)
kubectl get certificates -n flamoral-prod --watch
```

**Actions:**
- [ ] cert-manager installed and running
- [ ] ClusterIssuer created (Let's Encrypt production)
- [ ] Certificate resources created
- [ ] Certificates issued successfully (status: Ready=True)

**Certificates Ready:** _____/_____
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Deploy Infrastructure Services

```bash
# Deploy PgBouncer (connection pooler)
kubectl apply -f infrastructure/kubernetes/services/pgbouncer-deployment.yaml

# Deploy Redis connection pod (if needed)
# Already using Azure Redis, skip if not needed

# Verify infrastructure pods
kubectl get pods -n flamoral-prod | grep -E "(pgbouncer|redis)"
```

**Actions:**
- [ ] PgBouncer deployed and running
- [ ] PgBouncer connected to PostgreSQL
- [ ] No errors in PgBouncer logs

**PgBouncer Status:** ☐ Running  ☐ Failed
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Deploy Backend Microservices

```bash
# Deploy all backend services
kubectl apply -f infrastructure/kubernetes/services/all-services-manifests.yaml

# Or deploy individually:
kubectl apply -f infrastructure/kubernetes/services/user-service.yaml
kubectl apply -f infrastructure/kubernetes/services/auth-service.yaml
kubectl apply -f infrastructure/kubernetes/services/matching-service.yaml
kubectl apply -f infrastructure/kubernetes/services/messaging-service.yaml
# ... continue for all services

# Watch pod startup
kubectl get pods -n flamoral-prod --watch
```

**Services to Deploy:**
- [ ] user-service - Pods: _____/3 ready
- [ ] auth-service - Pods: _____/3 ready
- [ ] matching-service - Pods: _____/3 ready
- [ ] messaging-service - Pods: _____/3 ready
- [ ] media-service - Pods: _____/3 ready
- [ ] payment-service - Pods: _____/2 ready
- [ ] notification-service - Pods: _____/2 ready
- [ ] moderation-service - Pods: _____/2 ready
- [ ] analytics-service - Pods: _____/2 ready
- [ ] realtime-service - Pods: _____/3 ready
- [ ] api-gateway - Pods: _____/5 ready

**Total Pods Running:** _____/_____
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Deploy Web Application (Frontend)

```bash
# Deploy web application
kubectl apply -f infrastructure/kubernetes/deployments/web-app-deployment.yaml

# Verify web app pods
kubectl get pods -n flamoral-prod | grep web-app

# Expected: 3 replicas running
```

**Actions:**
- [ ] Web app deployment created
- [ ] Web app pods running: _____/3
- [ ] No errors in web app logs

**Web App Pods:** _____/3 Running
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Deploy Ingress Resources

```bash
# Deploy ingress configuration
kubectl apply -f infrastructure/kubernetes/base/ingress.yaml

# Verify ingress created
kubectl get ingress -n flamoral-prod

# Check ingress has IP address assigned
```

**Actions:**
- [ ] Ingress resources created
- [ ] Ingress has external IP: 48.200.65.15
- [ ] TLS configured on ingress
- [ ] All routes defined

**Ingress IP:** _______________
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Deploy Autoscaling (HPA)

```bash
# Deploy Horizontal Pod Autoscalers
kubectl apply -f infrastructure/kubernetes/autoscaling/hpa-all-services.yaml

# Verify HPAs created
kubectl get hpa -n flamoral-prod
```

**Actions:**
- [ ] HPAs created for all services
- [ ] Metrics server available
- [ ] HPA can read current metrics

**HPAs Created:** _____/_____
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

## 4.6 Configure Azure Front Door Routing (Priority 6)

**Estimated Time:** 5-10 minutes
**Start Time:** _______________

### Deploy Front Door Routes

```bash
# Navigate to Front Door deployment scripts
cd infrastructure/azure

# Run deployment script (PowerShell)
./deploy-frontdoor-routes.ps1

# Or Bash
./deploy-frontdoor-routes.sh
```

**Actions:**
- [ ] Script executed successfully
- [ ] All 6 routing rules created:
  - [ ] default-route (`/*`)
  - [ ] api-route (`/api/*`, `/graphql`, `/v1/*`)
  - [ ] websocket-route (`/ws/*`, `/socket.io/*`)
  - [ ] static-route (`/static/*`, `/assets/*`)
  - [ ] media-route (`/media/*`, `/uploads/*`)
  - [ ] health-route (`/health`, `/healthz`)
- [ ] HTTPS redirect enabled
- [ ] Caching configured
- [ ] Compression enabled

**Routes Created:** _____/6
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Verify Front Door Routes

```bash
# List all routes
az afd route list \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --output table

# Verify route details
az afd route show \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --route-name default-route
```

**Actions:**
- [ ] All routes listed in Azure CLI
- [ ] All routes show "Enabled" status
- [ ] Forwarding protocol: "HttpsOnly"
- [ ] Origin group: "flamoral-origin-group"

**Routes Status:** All Enabled: ☐ Yes  ☐ No
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

# PHASE 5: VERIFICATION & TESTING (T+15 minutes)

**Estimated Time:** 30-60 minutes
**Start Time:** _______________

## 5.1 Pod Health Verification

### Check All Pod Status

```bash
# Get all pods in production namespace
kubectl get pods -n flamoral-prod

# Check for any pods not in Running state
kubectl get pods -n flamoral-prod --field-selector=status.phase!=Running

# Check pod resource usage
kubectl top pods -n flamoral-prod
```

**Actions:**
- [ ] All pods in "Running" state
- [ ] No pods in CrashLoopBackOff
- [ ] No pods in Error state
- [ ] No pending pods
- [ ] CPU usage <50% per pod
- [ ] Memory usage <60% per pod

**Pods Running:** _____/_____ (100%)
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Check Pod Logs for Errors

```bash
# Check logs for each service
for service in user auth matching messaging media payment notification moderation analytics realtime api-gateway web-app; do
  echo "Checking $service-service..."
  kubectl logs deployment/$service-service -n flamoral-prod --tail=50 | grep -i error
done
```

**Actions:**
- [ ] No critical errors in logs
- [ ] All services connected to databases
- [ ] All services loaded configuration successfully
- [ ] No authentication/authorization errors

**Critical Errors Found:** _____
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

## 5.2 Service Health Checks

### Test Internal Service Health

```bash
# Test health endpoints from within cluster
kubectl run curl-test --rm -it --restart=Never \
  --image=curlimages/curl \
  --namespace=flamoral-prod \
  -- sh -c "
    for service in user auth matching messaging media payment notification moderation analytics realtime; do
      echo \"Testing \$service-service...\"
      curl -f http://\$service-service:3000/health || echo \"FAILED: \$service-service\"
    done
  "
```

**Health Check Results:**
- [ ] user-service: ☐ 200 OK
- [ ] auth-service: ☐ 200 OK
- [ ] matching-service: ☐ 200 OK
- [ ] messaging-service: ☐ 200 OK
- [ ] media-service: ☐ 200 OK
- [ ] payment-service: ☐ 200 OK
- [ ] notification-service: ☐ 200 OK
- [ ] moderation-service: ☐ 200 OK
- [ ] analytics-service: ☐ 200 OK
- [ ] realtime-service: ☐ 200 OK

**All Services Healthy:** ☐ Yes  ☐ No
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

## 5.3 DNS & TLS Verification

### Verify DNS Resolution

```bash
# Test DNS resolution for all domains
for domain in flamoral.com www.flamoral.com api.flamoral.com admin.flamoral.com; do
  echo "Testing $domain..."
  dig +short $domain
  # Expected: 48.200.65.15
done
```

**DNS Resolution:**
- [ ] flamoral.com → 48.200.65.15
- [ ] www.flamoral.com → 48.200.65.15
- [ ] api.flamoral.com → 48.200.65.15
- [ ] admin.flamoral.com → 48.200.65.15

**All DNS Resolving:** ☐ Yes  ☐ No
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Verify TLS Certificates

```bash
# Check certificate validity
for domain in flamoral.com api.flamoral.com admin.flamoral.com; do
  echo "Checking certificate for $domain..."
  echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | \
    openssl x509 -noout -dates
done

# Or use online tools:
# https://www.ssllabs.com/ssltest/
```

**TLS Certificate Status:**
- [ ] flamoral.com: Valid certificate
- [ ] api.flamoral.com: Valid certificate
- [ ] admin.flamoral.com: Valid certificate
- [ ] Certificate expiry >30 days
- [ ] Certificate issued by Let's Encrypt
- [ ] TLS 1.2+ enforced
- [ ] SSL Labs grade: A or A+

**Certificate Expiry:** _______________
**SSL Labs Grade:** _______________
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

## 5.4 Front Door Verification

### Test Front Door Endpoint

```bash
# Test Front Door CDN endpoint
curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net

# Expected: HTTP/2 200 or 307 (redirect)
# Should NOT be 404 or 503
```

**Actions:**
- [ ] Front Door endpoint responds
- [ ] HTTP response: 200 OK or 307 Redirect
- [ ] No 404 errors (routing working)
- [ ] No 503 errors (origin reachable)
- [ ] X-Azure-Ref header present

**HTTP Status Code:** _______________
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Test Front Door Routing

```bash
# Test various routes through Front Door
curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net/
curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net/api/health
curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net/health

# All should route correctly
```

**Routing Tests:**
- [ ] `/` (default route): ☐ Works
- [ ] `/api/health` (API route): ☐ Works
- [ ] `/health` (health route): ☐ Works
- [ ] `/static/` (static route): ☐ Works

**All Routes Working:** ☐ Yes  ☐ No
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

## 5.5 External Access Testing

### Test Production Domains

```bash
# Test main website
curl -I https://flamoral.com

# Test WWW redirect
curl -I https://www.flamoral.com

# Test API endpoint
curl -I https://api.flamoral.com/health

# Test admin portal
curl -I https://admin.flamoral.com
```

**External Access:**
- [ ] https://flamoral.com: ☐ 200 OK
- [ ] https://www.flamoral.com: ☐ Redirects to flamoral.com
- [ ] https://api.flamoral.com/health: ☐ 200 OK
- [ ] https://admin.flamoral.com: ☐ 200 OK
- [ ] All using HTTPS (TLS)
- [ ] No certificate warnings

**All Domains Accessible:** ☐ Yes  ☐ No
**Completion Time:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

## 5.6 Smoke Tests - Critical User Journeys

### Test 1: User Registration

```bash
# Test user registration endpoint
curl -X POST https://api.flamoral.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'

# Expected: 201 Created with user object
```

**Actions:**
- [ ] Registration endpoint accessible
- [ ] Registration accepts valid data
- [ ] Password validation working
- [ ] Email validation working
- [ ] Response includes user ID
- [ ] No errors in logs

**Status Code:** _______________
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Test 2: User Login

```bash
# Test login endpoint
curl -X POST https://api.flamoral.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# Expected: 200 OK with access_token and refresh_token
```

**Actions:**
- [ ] Login endpoint accessible
- [ ] Login with valid credentials succeeds
- [ ] JWT tokens returned
- [ ] Tokens have correct structure
- [ ] Session created in Redis
- [ ] No errors in logs

**Access Token Received:** ☐ Yes  ☐ No
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Test 3: API Gateway Authentication

```bash
# Test protected endpoint with JWT
TOKEN="<access_token_from_login>"

curl -X GET https://api.flamoral.com/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with user profile
```

**Actions:**
- [ ] Protected endpoint requires authentication
- [ ] Valid JWT token accepted
- [ ] User profile returned
- [ ] No 401 Unauthorized errors
- [ ] No errors in logs

**Status:** ☐ SUCCESS  ☐ FAILED

---

### Test 4: Database Connectivity (Via API)

```bash
# Test endpoint that queries database
curl -X GET https://api.flamoral.com/api/v1/health/db \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with database status
```

**Actions:**
- [ ] Database health check passes
- [ ] PostgreSQL connection working
- [ ] Query execution successful
- [ ] Response time acceptable (<200ms)

**DB Response Time:** _____ms
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Test 5: Redis Connectivity (Via API)

```bash
# Test endpoint that uses Redis
curl -X GET https://api.flamoral.com/api/v1/health/cache \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with cache status
```

**Actions:**
- [ ] Redis health check passes
- [ ] Redis connection working
- [ ] Cache read/write successful
- [ ] Response time acceptable (<100ms)

**Redis Response Time:** _____ms
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Test 6: File Upload (Media Service)

```bash
# Test file upload
curl -X POST https://api.flamoral.com/api/v1/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-image.jpg"

# Expected: 200 OK with file URL
```

**Actions:**
- [ ] File upload endpoint accessible
- [ ] File upload successful
- [ ] File stored in Azure Blob Storage
- [ ] File URL returned
- [ ] File accessible at returned URL

**Status:** ☐ SUCCESS  ☐ FAILED

---

### Test 7: WebSocket Connection (Real-time Service)

```bash
# Test WebSocket connection (use a WebSocket client)
# wscat -c "wss://api.flamoral.com/ws?token=$TOKEN"

# Or using JavaScript in browser console:
# const ws = new WebSocket('wss://api.flamoral.com/ws?token=TOKEN');
# ws.onopen = () => console.log('Connected');
# ws.onmessage = (e) => console.log('Message:', e.data);
```

**Actions:**
- [ ] WebSocket endpoint accessible
- [ ] WebSocket connection established
- [ ] Authentication working
- [ ] Messages can be sent and received
- [ ] Connection stable

**Status:** ☐ SUCCESS  ☐ FAILED

---

### Test 8: Payment Processing (Test Mode)

```bash
# Test payment endpoint with Stripe test card
curl -X POST https://api.flamoral.com/api/v1/payments/subscribe \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "premium_monthly",
    "payment_method": "pm_card_visa"
  }'

# Expected: 200 OK with subscription object
```

**Actions:**
- [ ] Payment endpoint accessible
- [ ] Stripe integration working
- [ ] Test card processed successfully
- [ ] Subscription created
- [ ] Webhook received (check Stripe dashboard)

**Status:** ☐ SUCCESS  ☐ FAILED

---

## 5.7 Frontend Verification

### Test Web Application

**Manual Testing in Browser:**

**Actions:**
- [ ] Open https://flamoral.com in browser
- [ ] Homepage loads without errors
- [ ] No JavaScript console errors
- [ ] Static assets loading (CSS, images, fonts)
- [ ] Page load time <3 seconds
- [ ] Responsive design working (mobile/tablet/desktop)
- [ ] Registration form works
- [ ] Login form works
- [ ] User can navigate between pages
- [ ] API calls from frontend working

**Homepage Load Time:** _____seconds
**Console Errors:** _____
**Status:** ☐ SUCCESS  ☐ FAILED

---

## 5.8 Monitoring & Metrics Verification

### Verify Prometheus Metrics

```bash
# Check Prometheus can scrape metrics
# Open Prometheus UI and query:
# up{namespace="flamoral-prod"}

# All targets should show "up" status
```

**Actions:**
- [ ] Prometheus accessible
- [ ] All service targets "up"
- [ ] Metrics being collected
- [ ] No scrape errors

**Targets Up:** _____/_____
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Verify Grafana Dashboards

**Actions:**
- [ ] Grafana accessible
- [ ] Infrastructure dashboard showing data
- [ ] Application dashboard showing data
- [ ] All panels displaying metrics
- [ ] No "No Data" panels

**Status:** ☐ SUCCESS  ☐ FAILED

---

### Verify Application Insights

**Actions:**
- [ ] Application Insights receiving data
- [ ] Request telemetry visible
- [ ] Dependency calls tracked
- [ ] No failures or errors
- [ ] Performance metrics within acceptable ranges

**Status:** ☐ SUCCESS  ☐ FAILED

---

### Verify Alerting

**Actions:**
- [ ] Alert rules configured in Prometheus
- [ ] PagerDuty integration working
- [ ] Test alert sent successfully
- [ ] Alert received by on-call engineer
- [ ] Slack notifications working

**Test Alert Received:** ☐ Yes  ☐ No
**Status:** ☐ SUCCESS  ☐ FAILED

---

# PHASE 6: POST-LAUNCH MONITORING (First 24 Hours)

**Start Time:** _______________

## 6.1 Immediate Post-Launch (T+10 Minutes)

**Checkpoint Time:** _______________

### System Metrics

```bash
# Check pod status
kubectl get pods -n flamoral-prod

# Check resource usage
kubectl top pods -n flamoral-prod
kubectl top nodes
```

**Metrics:**
- [ ] All pods running: _____/_____ (100%)
- [ ] CPU usage: ____% (target: <50%)
- [ ] Memory usage: ____% (target: <60%)
- [ ] Error rate: ____% (target: <0.5%)
- [ ] Response time p95: _____ms (target: <500ms)
- [ ] Active connections: _____

**Status:** ☐ GREEN  ☐ YELLOW  ☐ RED

**Issues Found:** _______________________________________________

**Action Taken:** _______________________________________________

---

## 6.2 First Hour Checkpoint (T+1 Hour)

**Checkpoint Time:** _______________

### Application Health

**Actions:**
- [ ] Website fully accessible
- [ ] All API endpoints responding
- [ ] Stripe webhooks processing correctly
- [ ] Email delivery working
- [ ] SMS delivery working (if applicable)
- [ ] File uploads working
- [ ] WebSocket connections stable
- [ ] No pod restarts

**Pod Restarts:** _____
**Status:** ☐ GREEN  ☐ YELLOW  ☐ RED

### Performance Metrics

**Metrics:**
- [ ] Response time p95: _____ms (target: <500ms)
- [ ] Response time p99: _____ms (target: <1000ms)
- [ ] Error rate: ____% (target: <0.5%)
- [ ] Database query time p95: _____ms (target: <100ms)
- [ ] Cache hit rate: ____% (target: >70%)
- [ ] Throughput: _____ requests/min

**Status:** ☐ GREEN  ☐ YELLOW  ☐ RED

### User Testing

**Actions:**
- [ ] Test users created: _____
- [ ] End-to-end user journeys completed: _____
- [ ] Registrations working
- [ ] Logins working
- [ ] Profile updates working
- [ ] Messaging working
- [ ] Payments working (test mode)

**Critical Bugs Found:** _____
**Status:** ☐ GREEN  ☐ YELLOW  ☐ RED

---

## 6.3 Monitoring Schedule (First 24 Hours)

### Hourly Monitoring

| Hour | Team Member | CPU % | Memory % | Error % | P95 (ms) | Issues | Status | Sign-off |
|------|-------------|-------|----------|---------|----------|--------|--------|----------|
| T+1  | __________ | ___% | ___% | ___% | ___ms | ______ | ☐ ✅ ☐ ⚠️ ☐ ❌ | _______ |
| T+2  | __________ | ___% | ___% | ___% | ___ms | ______ | ☐ ✅ ☐ ⚠️ ☐ ❌ | _______ |
| T+3  | __________ | ___% | ___% | ___% | ___ms | ______ | ☐ ✅ ☐ ⚠️ ☐ ❌ | _______ |
| T+4  | __________ | ___% | ___% | ___% | ___ms | ______ | ☐ ✅ ☐ ⚠️ ☐ ❌ | _______ |
| T+6  | __________ | ___% | ___% | ___% | ___ms | ______ | ☐ ✅ ☐ ⚠️ ☐ ❌ | _______ |
| T+8  | __________ | ___% | ___% | ___% | ___ms | ______ | ☐ ✅ ☐ ⚠️ ☐ ❌ | _______ |
| T+12 | __________ | ___% | ___% | ___% | ___ms | ______ | ☐ ✅ ☐ ⚠️ ☐ ❌ | _______ |
| T+24 | __________ | ___% | ___% | ___% | ___ms | ______ | ☐ ✅ ☐ ⚠️ ☐ ❌ | _______ |

---

## 6.4 Metrics to Monitor Continuously

### Infrastructure Metrics
- [ ] Node CPU usage <80%
- [ ] Node memory usage <85%
- [ ] Disk space usage <80%
- [ ] Network throughput within limits
- [ ] No node failures

### Application Metrics
- [ ] Pod CPU usage <70%
- [ ] Pod memory usage <75%
- [ ] Request rate stable
- [ ] Error rate <0.5%
- [ ] Response time p95 <500ms
- [ ] Response time p99 <1000ms

### Database Metrics
- [ ] Database CPU <70%
- [ ] Database memory <80%
- [ ] Connection pool utilization <80%
- [ ] Query latency p95 <100ms
- [ ] No slow queries >1s
- [ ] Replication lag <1s (if applicable)

### Cache Metrics
- [ ] Redis CPU <60%
- [ ] Redis memory <80%
- [ ] Cache hit rate >70%
- [ ] Evictions minimal
- [ ] Connection count stable

### Business Metrics
- [ ] User registrations tracking
- [ ] Login success rate >95%
- [ ] Payment success rate >98%
- [ ] Email delivery rate >99%
- [ ] API success rate >99.5%

---

## 6.5 Error Log Monitoring

### Check Logs Hourly

```bash
# Check for errors in application logs
kubectl logs -n flamoral-prod -l app=api-gateway --tail=100 | grep -i error
kubectl logs -n flamoral-prod -l app=user-service --tail=100 | grep -i error
# Repeat for all services

# Check for 5xx errors
kubectl logs -n flamoral-prod -l app=api-gateway --tail=1000 | grep " 5[0-9][0-9] "

# Check Sentry for error trends
# Visit Sentry dashboard and check error count
```

**Actions:**
- [ ] Error logs reviewed every hour
- [ ] No critical errors
- [ ] 5xx errors <0.1% of requests
- [ ] Error trends decreasing or stable
- [ ] Sentry showing acceptable error rates

**Hourly Error Count Log:**
| Hour | Error Count | Critical | High | Medium | Notes |
|------|-------------|----------|------|--------|-------|
| T+1  | _____ | _____ | _____ | _____ | __________ |
| T+2  | _____ | _____ | _____ | _____ | __________ |
| T+4  | _____ | _____ | _____ | _____ | __________ |
| T+8  | _____ | _____ | _____ | _____ | __________ |
| T+24 | _____ | _____ | _____ | _____ | __________ |

---

# PHASE 7: ROLLBACK PROCEDURES (If Needed)

**Only complete this section if rollback is required**

## 7.1 Rollback Decision Criteria

**Rollback is required if:**
- [ ] Error rate >5% for >10 minutes
- [ ] Critical functionality broken (auth, payments)
- [ ] Data corruption detected
- [ ] Security vulnerability discovered
- [ ] >50% of pods crashing
- [ ] Database connection failures
- [ ] External service integration failures (Stripe, SendGrid)

**Rollback Trigger:** _______________________________________________

**Time Decided:** _______________
**Decided By:** _______________
**Approved By:** _______________

---

## 7.2 Quick Rollback - Application Only (5-10 Minutes)

**Use this for application code issues only**

### Rollback Backend Services

```bash
# Rollback all microservices to previous version
for service in user auth matching messaging media payment notification moderation analytics realtime api-gateway; do
  echo "Rolling back $service-service..."
  kubectl rollout undo deployment/$service-service -n flamoral-prod
  kubectl rollout status deployment/$service-service -n flamoral-prod
done
```

**Actions:**
- [ ] Rollback command executed
- [ ] All deployments rolled back
- [ ] Pods restarted with previous version
- [ ] All pods running: _____/_____

**Rollback Start Time:** _______________
**Rollback Complete Time:** _______________
**Duration:** _____ minutes
**Status:** ☐ SUCCESS  ☐ FAILED

---

### Rollback Frontend

```bash
# Rollback web application
kubectl rollout undo deployment/web-app -n flamoral-prod
kubectl rollout status deployment/web-app -n flamoral-prod
```

**Actions:**
- [ ] Frontend rolled back
- [ ] Web app pods running
- [ ] Website accessible

**Status:** ☐ SUCCESS  ☐ FAILED

---

### Verify Rollback

```bash
# Check all pods running
kubectl get pods -n flamoral-prod

# Test health endpoints
curl https://api.flamoral.com/health
curl https://flamoral.com
```

**Actions:**
- [ ] All pods running previous version
- [ ] Health checks passing
- [ ] Error rate back to normal
- [ ] Users can access application
- [ ] Core functionality working

**Post-Rollback Status:** ☐ GREEN  ☐ YELLOW  ☐ RED

---

## 7.3 Full Rollback - Infrastructure + Application (15-30 Minutes)

**Use this for infrastructure or database issues**

### Rollback Database Migration (If Needed)

```bash
# Run rollback migration
kubectl apply -f infrastructure/kubernetes/jobs/rollback-migration-job.yaml
kubectl logs -f job/db-rollback -n flamoral-prod

# Verify database state
# (Use psql or database client to verify)
```

**Actions:**
- [ ] Rollback migration executed
- [ ] No errors in migration logs
- [ ] Database schema reverted
- [ ] Data integrity verified

**Status:** ☐ SUCCESS  ☐ FAILED

---

### Rollback Kubernetes Resources

```bash
# Revert to previous Kubernetes manifests
# (Restore from backup or git)
cd infrastructure/kubernetes/production

# Reset to previous commit
git checkout <previous-commit-hash>

# Reapply manifests
kubectl apply -f .
```

**Actions:**
- [ ] Previous manifests restored
- [ ] Resources reapplied
- [ ] All pods running correctly

**Status:** ☐ SUCCESS  ☐ FAILED

---

### Verify Full Rollback

**Actions:**
- [ ] All infrastructure back to previous state
- [ ] All services running
- [ ] Database accessible
- [ ] Redis accessible
- [ ] Full smoke tests passing
- [ ] Monitoring shows green

**Status:** ☐ SUCCESS  ☐ FAILED

---

## 7.4 Post-Rollback Communication

```
Subject: Flamoral Launch - Rollback Executed

Team,

We have executed a rollback of the Flamoral platform deployment.

Reason: [REASON]
Time: [TIME]
Duration: [DURATION]

Current Status: [GREEN/YELLOW/RED]

Next Steps:
1. [ACTION 1]
2. [ACTION 2]

Post-mortem meeting scheduled for: [DATE/TIME]

Launch Commander: [NAME]
```

**Actions:**
- [ ] Team notified via Slack
- [ ] Stakeholders notified via email
- [ ] Status page updated
- [ ] Post-mortem scheduled

---

# PHASE 8: GO-LIVE SUCCESS DECLARATION

**Complete if launch is successful**

## 8.1 Success Criteria

**Launch declared successful when:**
- [x] All services deployed successfully
- [x] All smoke tests passed
- [x] Error rate <0.5%
- [x] Response time p95 <500ms
- [x] No critical issues
- [x] User journeys working end-to-end
- [x] Payment processing working
- [x] T+1 hour checkpoint passed with GREEN status
- [x] No rollback required

**Launch Declared Successful:** ☐ YES  ☐ NO

**Time Declared:** _______________
**Declared By (Launch Commander):** _______________
**Approved By (CTO/VP Eng):** _______________

---

## 8.2 Team Communication

### Internal Announcement

```
Subject: Flamoral Platform - LIVE! 🎉

Team,

Congratulations! The Flamoral dating platform is now LIVE in production.

Launch Time: [TIME]
Status: SUCCESS ✅

Metrics:
- All services: Running
- Error rate: [X]%
- Response time p95: [X]ms
- User journeys: All passing

Special thanks to the entire team for making this happen!

Production URLs:
- Website: https://flamoral.com
- API: https://api.flamoral.com
- Admin: https://admin.flamoral.com

Monitoring Plan:
- 24-hour war room active
- On-call rotation in effect
- Monitoring dashboards: [LINKS]

Keep up the great work!

Launch Commander: [NAME]
```

**Actions:**
- [ ] Internal announcement sent (Slack)
- [ ] Team congratulated
- [ ] Monitoring plan confirmed (24 hours)
- [ ] Support team ready and briefed
- [ ] Marketing team notified
- [ ] Leadership notified

**Announcement Sent:** ☐ Yes  ☐ No
**Time:** _______________

---

## 8.3 Post-Launch Action Items

### Immediate (T+24 Hours)
- [ ] Continue hourly monitoring
- [ ] Address any non-critical issues
- [ ] Collect user feedback
- [ ] Monitor analytics and business metrics
- [ ] Review error logs for trends
- [ ] Adjust resource allocations if needed

### Short-term (Week 1)
- [ ] Daily standup with engineering and ops
- [ ] Performance optimization based on real data
- [ ] Address top user-reported issues
- [ ] Security monitoring review
- [ ] Cost monitoring and optimization
- [ ] Scale resources based on actual usage

### Medium-term (Week 2-4)
- [ ] Conduct post-launch retrospective
- [ ] Document lessons learned
- [ ] Update runbooks based on incidents
- [ ] Implement feature flags for gradual rollout
- [ ] Plan for v1.1 features
- [ ] Schedule first security audit review

---

# PHASE 9: EMERGENCY CONTACTS & ESCALATION

## 9.1 On-Call Rotation

| Role | Name | Phone | Email | Availability |
|------|------|-------|-------|--------------|
| Launch Commander | __________ | __________ | __________ | 24/7 (T+0 to T+48h) |
| DevOps Lead | __________ | __________ | __________ | 24/7 (T+0 to T+48h) |
| Backend Lead | __________ | __________ | __________ | 24/7 (T+0 to T+48h) |
| On-Call Engineer (Primary) | __________ | __________ | __________ | 24/7 ongoing |
| On-Call Engineer (Secondary) | __________ | __________ | __________ | 24/7 ongoing |
| Security Lead | __________ | __________ | __________ | On-demand |
| Database Admin | __________ | __________ | __________ | On-demand |
| CTO | __________ | __________ | __________ | Escalation only |

---

## 9.2 Escalation Procedures

### Severity Levels

**P0 - Critical (Immediate Response)**
- Complete service outage
- Data breach or security incident
- Payment processing failure
- Database corruption
- **Response Time:** <15 minutes
- **Escalate To:** Launch Commander → CTO

**P1 - High (Urgent Response)**
- Partial service outage
- Major feature broken
- High error rate (>5%)
- Performance degradation (>2s response time)
- **Response Time:** <30 minutes
- **Escalate To:** On-Call Engineer → DevOps Lead

**P2 - Medium (Standard Response)**
- Minor feature issue
- Non-critical bug
- Moderate error rate (1-5%)
- **Response Time:** <2 hours
- **Escalate To:** On-Call Engineer

**P3 - Low (Planned Response)**
- Cosmetic issues
- Feature requests
- Documentation updates
- **Response Time:** <24 hours
- **Escalate To:** Product Manager

---

## 9.3 Escalation Flow

```
User Report / Alert
        ↓
On-Call Engineer (Primary)
        ↓
[If unresolved in 30 min]
        ↓
On-Call Engineer (Secondary)
        ↓
[If unresolved in 1 hour or P0/P1]
        ↓
Service Lead (DevOps/Backend/Frontend)
        ↓
[If unresolved in 2 hours or P0]
        ↓
Launch Commander
        ↓
[If business impact or P0]
        ↓
CTO / VP Engineering
```

---

## 9.4 Vendor Support Contacts

| Vendor | Contact Method | Support URL | Status Page | SLA |
|--------|----------------|-------------|-------------|-----|
| Microsoft Azure | +1-800-642-7676 | portal.azure.com | status.azure.com | 24/7 |
| Azure Support | Create ticket in portal | azure.microsoft.com/support | - | Response: 1 hour (Sev A) |
| Stripe | Dashboard chat | support.stripe.com | status.stripe.com | 24/7 |
| SendGrid | +1-877-969-8647 | support.sendgrid.com | status.sendgrid.com | Business hours |
| Twilio | +1-855-853-2235 | support.twilio.com | status.twilio.com | 24/7 |
| Let's Encrypt | Community forum | community.letsencrypt.org | letsencrypt.status.io | Community |
| GitHub | Support ticket | support.github.com | githubstatus.com | 24/7 (Enterprise) |

---

## 9.5 Critical URLs & Resources

### Production URLs
- **Main Website:** https://flamoral.com
- **WWW Redirect:** https://www.flamoral.com
- **API Gateway:** https://api.flamoral.com
- **Admin Dashboard:** https://admin.flamoral.com
- **Front Door CDN:** https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net
- **Direct AKS:** https://flamoral.westus2.cloudapp.azure.com

### Monitoring & Operations
- **Azure Portal:** https://portal.azure.com
- **Grafana:** [URL]
- **Prometheus:** [URL]
- **Application Insights:** [URL]
- **Sentry:** [URL]
- **PagerDuty:** https://flamoral.pagerduty.com
- **GitHub Actions:** https://github.com/[org]/[repo]/actions

### Documentation
- **Runbooks:** `docs/runbooks/`
- **Architecture Docs:** `ARCHITECTURE.md`
- **Deployment Docs:** `PRODUCTION_DEPLOYMENT_GUIDE.md`
- **API Docs:** `https://api.flamoral.com/docs`

---

## 9.6 Quick Reference Commands

### Check Overall Status
```bash
# All pods
kubectl get pods -n flamoral-prod

# All services
kubectl get svc -n flamoral-prod

# All ingresses
kubectl get ingress -n flamoral-prod

# Node status
kubectl get nodes

# Cluster events
kubectl get events -n flamoral-prod --sort-by='.lastTimestamp'
```

### Check Service Health
```bash
# All health endpoints
for service in user auth matching messaging media payment notification moderation analytics realtime; do
  curl -f https://api.flamoral.com/api/v1/$service-service/health
done
```

### View Logs
```bash
# Service logs
kubectl logs deployment/[service-name] -n flamoral-prod --tail=100 --follow

# All pods for a service
kubectl logs -l app=[service-name] -n flamoral-prod --tail=100

# Previous pod logs (if crashed)
kubectl logs deployment/[service-name] -n flamoral-prod --previous
```

### Restart Service
```bash
# Restart deployment (rolling restart)
kubectl rollout restart deployment/[service-name] -n flamoral-prod

# Scale down and up
kubectl scale deployment/[service-name] --replicas=0 -n flamoral-prod
kubectl scale deployment/[service-name] --replicas=3 -n flamoral-prod
```

### Rollback Service
```bash
# Rollback to previous version
kubectl rollout undo deployment/[service-name] -n flamoral-prod

# Rollback to specific revision
kubectl rollout undo deployment/[service-name] --to-revision=[number] -n flamoral-prod

# Check rollout status
kubectl rollout status deployment/[service-name] -n flamoral-prod
```

### Scale Service
```bash
# Scale up
kubectl scale deployment/[service-name] --replicas=10 -n flamoral-prod

# Scale down
kubectl scale deployment/[service-name] --replicas=2 -n flamoral-prod
```

### Database Commands
```bash
# Connect to PostgreSQL
kubectl run psql --rm -it --restart=Never --image=postgres:15 -n flamoral-prod \
  -- psql "postgresql://[connection-string]"

# Connect to Redis
kubectl run redis-cli --rm -it --restart=Never --image=redis:7 -n flamoral-prod \
  -- redis-cli -h [host] -p 6380 -a [password] --tls
```

---

# INCIDENT LOG

**Use this section to log any incidents during go-live**

## Incident 1

**Time:** _______________
**Severity:** ☐ P0  ☐ P1  ☐ P2  ☐ P3
**Component:** _______________
**Description:**

_______________________________________________________________

**Impact:**

_______________________________________________________________

**Action Taken:**

_______________________________________________________________

**Resolution:**

_______________________________________________________________

**Resolution Time:** _______________
**Status:** ☐ RESOLVED  ☐ ONGOING  ☐ ESCALATED

**Root Cause:**

_______________________________________________________________

**Prevention:**

_______________________________________________________________

---

## Incident 2

**Time:** _______________
**Severity:** ☐ P0  ☐ P1  ☐ P2  ☐ P3
**Component:** _______________
**Description:** _______________________________________________
**Action Taken:** _______________________________________________
**Resolution Time:** _______________
**Status:** ☐ RESOLVED  ☐ ONGOING

---

## Incident 3

**Time:** _______________
**Severity:** ☐ P0  ☐ P1  ☐ P2  ☐ P3
**Component:** _______________
**Description:** _______________________________________________
**Action Taken:** _______________________________________________
**Resolution Time:** _______________
**Status:** ☐ RESOLVED  ☐ ONGOING

---

# POST-LAUNCH RETROSPECTIVE

**Schedule meeting within 48 hours of launch**

**Meeting Date:** _______________
**Meeting Time:** _______________
**Location:** _______________

## Attendees Required
- [ ] Launch Commander
- [ ] DevOps Lead
- [ ] Backend Lead
- [ ] Frontend Lead
- [ ] QA Lead
- [ ] Security Lead
- [ ] Product Manager
- [ ] CTO / VP Engineering

## Agenda

### 1. Launch Timeline Review (15 min)
- Actual timeline vs. planned timeline
- Phases that took longer than expected
- Phases that went faster than expected

### 2. What Went Well (20 min)
- Processes that worked effectively
- Team collaboration highlights
- Technical solutions that worked well
- Tools that proved valuable

### 3. What Went Wrong (30 min)
- Issues encountered during launch
- Unexpected problems
- Process failures
- Communication breakdowns
- Technical challenges

### 4. Incidents Review (20 min)
- Review each incident logged
- Root cause analysis
- Could incidents have been prevented?
- Response time and resolution effectiveness

### 5. Lessons Learned (20 min)
- Key takeaways
- Process improvements
- Documentation gaps
- Training needs

### 6. Action Items (15 min)
- Immediate fixes needed
- Runbook updates
- Process improvements
- Documentation updates
- Training recommendations

### 7. Next Steps (10 min)
- Assign owners to action items
- Set deadlines
- Plan for next release
- Schedule follow-up review

---

## Lessons Learned

### What Went Well

1. _______________________________________________________________

2. _______________________________________________________________

3. _______________________________________________________________

4. _______________________________________________________________

5. _______________________________________________________________

---

### What Could Be Improved

1. _______________________________________________________________

2. _______________________________________________________________

3. _______________________________________________________________

4. _______________________________________________________________

5. _______________________________________________________________

---

### Action Items

| # | Action Item | Owner | Deadline | Status |
|---|-------------|-------|----------|--------|
| 1 | __________________ | ________ | ________ | ☐ TODO |
| 2 | __________________ | ________ | ________ | ☐ TODO |
| 3 | __________________ | ________ | ________ | ☐ TODO |
| 4 | __________________ | ________ | ________ | ☐ TODO |
| 5 | __________________ | ________ | ________ | ☐ TODO |

---

# LAUNCH METRICS SUMMARY

## Timeline Summary

| Phase | Planned Duration | Actual Duration | Status |
|-------|------------------|-----------------|--------|
| Pre-Launch Preparation | 4-8 hours | _____ hours | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| Day Before Launch | 2-4 hours | _____ hours | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| Pre-Start Checks | 1-2 hours | _____ hours | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| PostgreSQL Start | 10-15 min | _____ min | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| Redis Start | 5-10 min | _____ min | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| AKS Cluster Start | 15-20 min | _____ min | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| Service Deployment | 20-30 min | _____ min | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| Front Door Config | 5-10 min | _____ min | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| Verification & Testing | 30-60 min | _____ min | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| **Total** | **6-11 hours** | **_____ hours** | ☐ ✅ ☐ ⚠️ ☐ ❌ |

---

## Performance Metrics (T+24 Hours)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Uptime | 99.9% | _____% | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| Error Rate | <0.5% | _____% | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| Response Time p95 | <500ms | _____ms | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| Response Time p99 | <1000ms | _____ms | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| Database Query p95 | <100ms | _____ms | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| Cache Hit Rate | >70% | _____% | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| CPU Usage (avg) | <50% | _____% | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| Memory Usage (avg) | <60% | _____% | ☐ ✅ ☐ ⚠️ ☐ ❌ |

---

## Business Metrics (T+24 Hours)

| Metric | Actual | Notes |
|--------|--------|-------|
| User Registrations | _____ | __________ |
| Successful Logins | _____ | __________ |
| Active Users | _____ | __________ |
| Matches Created | _____ | __________ |
| Messages Sent | _____ | __________ |
| Payment Transactions | _____ | __________ |
| Payment Success Rate | _____% | __________ |
| Email Delivery Rate | _____% | __________ |
| API Requests (total) | _____ | __________ |
| API Success Rate | _____% | __________ |

---

## Resource Utilization

| Resource | Allocated | Used | Utilization | Status |
|----------|-----------|------|-------------|--------|
| AKS Nodes | _____ | _____ | _____% | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| Total CPU Cores | _____ | _____ | _____% | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| Total Memory (GB) | _____ | _____ | _____% | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| Pod Count | _____ | _____ | - | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| PostgreSQL Connections | _____ | _____ | _____% | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| Redis Memory (GB) | _____ | _____ | _____% | ☐ ✅ ☐ ⚠️ ☐ ❌ |
| Blob Storage (GB) | _____ | _____ | - | ☐ ✅ ☐ ⚠️ ☐ ❌ |

---

# SIGN-OFF

## Final Approval

**I certify that the Flamoral platform has been successfully launched to production and all success criteria have been met.**

| Role | Name | Signature | Date | Time |
|------|------|-----------|------|------|
| **Launch Commander** | ____________ | ____________ | ________ | ________ |
| **DevOps Lead** | ____________ | ____________ | ________ | ________ |
| **Backend Lead** | ____________ | ____________ | ________ | ________ |
| **Frontend Lead** | ____________ | ____________ | ________ | ________ |
| **QA Lead** | ____________ | ____________ | ________ | ________ |
| **Security Lead** | ____________ | ____________ | ________ | ________ |
| **CTO / VP Engineering** | ____________ | ____________ | ________ | ________ |

---

## Launch Status

**Overall Launch Status:** ☐ SUCCESS  ☐ PARTIAL SUCCESS  ☐ FAILED

**Current Production Status:** ☐ RUNNING  ☐ DEGRADED  ☐ DOWN

**Monitoring Status:** ☐ 24h WAR ROOM ACTIVE  ☐ NORMAL ON-CALL

**Next Review Date:** _______________

---

# NOTES

**Use this space for additional notes, observations, or important information:**

_______________________________________________________________

_______________________________________________________________

_______________________________________________________________

_______________________________________________________________

_______________________________________________________________

_______________________________________________________________

_______________________________________________________________

_______________________________________________________________

_______________________________________________________________

_______________________________________________________________

---

**END OF GO-LIVE CHECKLIST**

---

## Document Information

**Document:** Flamoral Platform - Go-Live Checklist
**Version:** 2.0
**Created:** December 13, 2025
**Last Updated:** December 13, 2025
**Next Review:** After launch retrospective
**Owner:** Platform Engineering Team
**Status:** Ready for use

**Related Documentation:**
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Comprehensive deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Detailed deployment checklist
- `QUICK_DEPLOY.md` - Quick reference guide
- `LAUNCH_DAY_CHECKLIST.md` - Original launch day procedures
- `PRODUCTION_READINESS_CHECKLIST.md` - Pre-launch readiness
- `ROLLBACK_PLAN.md` - Detailed rollback procedures
- `ARCHITECTURE.md` - System architecture
- `docs/runbooks/` - Operational runbooks

---

**For questions or updates to this checklist, contact:**
- DevOps Lead: devops@flamoral.com
- Engineering Leadership: vpeng@flamoral.com

**Emergency Contact:** oncall@flamoral.pagerduty.com

---

**This checklist is a living document. Please update after each launch with lessons learned and improvements.**
