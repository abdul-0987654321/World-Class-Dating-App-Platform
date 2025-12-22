# Flamoral Platform - End-to-End Verification Checklist

## Overview

This document provides a comprehensive checklist to verify the complete Flamoral platform deployment on Azure with flamoral.com domain integration.

---

## 1. Infrastructure Verification

### 1.1 Azure Resources (All Environments)

| Component | Dev | Test | Prod | Verification Command |
|-----------|-----|------|------|----------------------|
| Resource Group | `flamoral-dev-rg` | `flamoral-test-rg` | `flamoral-prod-rg` | `az group show -n {rg}` |
| Virtual Network | 10.0.0.0/16 | 10.1.0.0/16 | 10.2.0.0/16 | `az network vnet show` |
| AKS Cluster | flamoral-dev-aks | flamoral-test-aks | flamoral-prod-aks | `az aks show` |
| PostgreSQL | flamoral-dev-postgres | flamoral-test-postgres | flamoral-prod-postgres | `az postgres flexible-server show` |
| Redis Cache | flamoral-dev-redis | flamoral-test-redis | flamoral-prod-redis | `az redis show` |
| Storage Account | flamoraldev* | flamoraltest* | flamoralprod* | `az storage account show` |
| Key Vault | flamoral-dev-kv-* | flamoral-test-kv-* | flamoral-prod-kv-* | `az keyvault show` |
| Container Registry | Shared ACR | Shared ACR | Shared ACR | `az acr show` |
| Log Analytics | flamoral-dev-logs | flamoral-test-logs | flamoral-prod-logs | `az monitor log-analytics show` |
| App Insights | flamoral-dev-appinsights | flamoral-test-appinsights | flamoral-prod-appinsights | `az monitor app-insights show` |

### 1.2 Production-Only Resources

| Component | Name | Status | Verification |
|-----------|------|--------|--------------|
| Azure DNS Zone | flamoral.com | [ ] | `az network dns zone show` |
| Front Door | flamoral-prod-afd | [ ] | `az afd profile show` |
| WAF Policy | flamoralprodwaf | [ ] | `az afd waf-policy show` |
| CDN Profile | flamoral-prod-cdn | [ ] | `az cdn profile show` |
| Public IP | flamoral-prod-ingress-pip | [ ] | `az network public-ip show` |

### 1.3 Verification Script

```bash
#!/bin/bash
# verify-infrastructure.sh

ENVIRONMENTS=("dev" "test" "prod")

for ENV in "${ENVIRONMENTS[@]}"; do
  echo "=== Verifying $ENV Environment ==="

  # Resource Group
  az group show -n "flamoral-$ENV-rg" --query "[name, location, provisioningState]" -o tsv

  # AKS Cluster
  az aks show -g "flamoral-$ENV-rg" -n "flamoral-$ENV-aks" --query "[name, powerState.code, provisioningState]" -o tsv

  # PostgreSQL
  az postgres flexible-server show -g "flamoral-$ENV-rg" -n "flamoral-$ENV-postgres" --query "[name, state]" -o tsv

  # Redis
  az redis show -g "flamoral-$ENV-rg" -n "flamoral-$ENV-redis" --query "[name, provisioningState]" -o tsv

  echo ""
done
```

---

## 2. Kubernetes Verification

### 2.1 Cluster Health

```bash
# Get AKS credentials
az aks get-credentials -g flamoral-prod-rg -n flamoral-prod-aks

# Verify cluster health
kubectl get nodes
kubectl cluster-info
kubectl get componentstatuses
```

**Expected Output:**
- [ ] All nodes in `Ready` state
- [ ] Control plane endpoints accessible
- [ ] All components `Healthy`

### 2.2 Namespaces

```bash
kubectl get namespaces
```

| Namespace | Purpose | Status |
|-----------|---------|--------|
| flamoral | Application services | [ ] |
| ingress-nginx | Ingress controller | [ ] |
| cert-manager | TLS certificates | [ ] |
| monitoring | Prometheus/Grafana | [ ] |

### 2.3 Workload Verification

```bash
# All deployments
kubectl get deployments -n flamoral

# All pods running
kubectl get pods -n flamoral

# All services
kubectl get services -n flamoral
```

**Expected Deployments:**

| Deployment | Replicas | Status |
|------------|----------|--------|
| api-gateway | 3 | [ ] Running |
| auth-service | 3 | [ ] Running |
| user-service | 3 | [ ] Running |
| matching-service | 5 | [ ] Running |
| messaging-service | 3 | [ ] Running |
| media-service | 3 | [ ] Running |
| web-app | 3 | [ ] Running |

### 2.4 Pod Health

```bash
# Check pod logs for errors
kubectl logs -n flamoral -l app=api-gateway --tail=50

# Check pod events
kubectl get events -n flamoral --sort-by='.lastTimestamp'
```

---

## 3. DNS and Domain Verification

### 3.1 Nameserver Propagation

```bash
# Verify nameservers point to Azure
dig flamoral.com NS +short
```

**Expected:**
- [ ] ns1-*.azure-dns.com
- [ ] ns2-*.azure-dns.net
- [ ] ns3-*.azure-dns.org
- [ ] ns4-*.azure-dns.info

### 3.2 DNS Record Resolution

```bash
# A Records
dig flamoral.com +short
dig www.flamoral.com +short
dig api.flamoral.com +short

# CNAME Records
dig cdn.flamoral.com CNAME +short
```

| Record | Type | Expected Value | Status |
|--------|------|----------------|--------|
| flamoral.com | A | <INGRESS_IP> | [ ] |
| www.flamoral.com | A | <INGRESS_IP> | [ ] |
| api.flamoral.com | A | <INGRESS_IP> | [ ] |
| cdn.flamoral.com | CNAME | *.azureedge.net | [ ] |

### 3.3 SSL Certificate Verification

```bash
# Check SSL certificate
echo | openssl s_client -servername flamoral.com -connect flamoral.com:443 2>/dev/null | openssl x509 -noout -dates -subject

# Verify certificate chain
curl -vI https://flamoral.com 2>&1 | grep -E "(SSL|certificate|subject)"
```

**Expected:**
- [ ] Certificate valid (not expired)
- [ ] Certificate matches domain
- [ ] Certificate chain complete

---

## 4. Application Health Checks

### 4.1 Endpoint Accessibility

```bash
# Production endpoints
curl -I https://flamoral.com
curl -I https://www.flamoral.com
curl -I https://api.flamoral.com/health
curl -I https://cdn.flamoral.com
```

| Endpoint | Expected Status | Actual | Status |
|----------|-----------------|--------|--------|
| https://flamoral.com | 200 OK | | [ ] |
| https://www.flamoral.com | 200 OK / 301 | | [ ] |
| https://api.flamoral.com/health | 200 OK | | [ ] |
| https://cdn.flamoral.com | 200 OK | | [ ] |

### 4.2 API Health Endpoints

```bash
# Health check all services via API Gateway
curl -s https://api.flamoral.com/health | jq

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2024-12-07T...",
#   "services": {
#     "auth": "healthy",
#     "user": "healthy",
#     "matching": "healthy",
#     "messaging": "healthy",
#     "media": "healthy"
#   }
# }
```

### 4.3 Service-Level Verification

| Service | Endpoint | Test Command | Status |
|---------|----------|--------------|--------|
| Auth | /api/auth/health | `curl -s https://api.flamoral.com/api/auth/health` | [ ] |
| User | /api/users/health | `curl -s https://api.flamoral.com/api/users/health` | [ ] |
| Matching | /api/matching/health | `curl -s https://api.flamoral.com/api/matching/health` | [ ] |
| Messaging | /api/messages/health | `curl -s https://api.flamoral.com/api/messages/health` | [ ] |
| Media | /api/media/health | `curl -s https://api.flamoral.com/api/media/health` | [ ] |

---

## 5. Database Connectivity

### 5.1 PostgreSQL

```bash
# From within AKS pod
kubectl exec -it -n flamoral deployment/api-gateway -- psql -h flamoral-prod-postgres.postgres.database.azure.com -U flamoraladmin -d flamoral -c "SELECT 1"
```

**Verification:**
- [ ] Connection successful
- [ ] Databases exist (flamoral, flamoral_analytics)
- [ ] Tables created
- [ ] Read/write operations work

### 5.2 Redis

```bash
# Test Redis connectivity
kubectl exec -it -n flamoral deployment/api-gateway -- redis-cli -h flamoral-prod-redis.redis.cache.windows.net -a <password> PING
```

**Expected:** `PONG`

### 5.3 Storage Account

```bash
# List containers
az storage container list --account-name flamoralprod<suffix> --auth-mode login -o table
```

**Expected Containers:**
- [ ] media
- [ ] profiles
- [ ] videos
- [ ] stories

---

## 6. Security Verification

### 6.1 WAF Protection

```bash
# Test WAF blocking (should return 403)
curl -I "https://api.flamoral.com/api/?<script>alert(1)</script>"

# Test rate limiting (100+ requests in 1 minute)
for i in {1..150}; do curl -s -o /dev/null -w "%{http_code}\n" https://api.flamoral.com/health; done
```

**Expected:**
- [ ] XSS attempts blocked (403)
- [ ] Rate limiting active (429 after threshold)

### 6.2 TLS Configuration

```bash
# Check TLS version
nmap --script ssl-enum-ciphers -p 443 flamoral.com
```

**Expected:**
- [ ] TLS 1.2 minimum
- [ ] Strong cipher suites only
- [ ] No known vulnerabilities

### 6.3 Key Vault Access

```bash
# Verify secrets exist
az keyvault secret list --vault-name flamoral-prod-kv-<suffix> -o table
```

**Expected Secrets:**
- [ ] postgres-password
- [ ] redis-connection-string
- [ ] storage-connection-string

---

## 7. CI/CD Pipeline Verification

### 7.1 Azure DevOps Pipelines

| Pipeline | Purpose | Status | Last Run |
|----------|---------|--------|----------|
| Flamoral-CI-Pipeline | Build & Test | [ ] | |
| Flamoral-CD-Pipeline | Deploy to Environments | [ ] | |
| Flamoral-Infrastructure | Terraform Deployment | [ ] | |
| Flamoral-Security | Security Scanning | [ ] | |

### 7.2 Pipeline Trigger Verification

```bash
# Verify CI triggers
git push origin feature/test-ci

# Expected: CI pipeline triggered automatically
```

### 7.3 Deployment Verification

```bash
# Check Helm releases
helm list -n flamoral

# Check deployment history
kubectl rollout history deployment/api-gateway -n flamoral
```

---

## 8. Monitoring and Logging

### 8.1 Log Analytics

```bash
# Query AKS container logs
az monitor log-analytics query \
  -w <workspace-id> \
  --analytics-query "ContainerLog | where TimeGenerated > ago(1h) | limit 10"
```

### 8.2 Application Insights

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Server response time | < 500ms | | [ ] |
| Failed requests | < 1% | | [ ] |
| Availability | > 99.9% | | [ ] |

### 8.3 Prometheus/Grafana (if deployed)

- [ ] Prometheus scraping all services
- [ ] Grafana dashboards accessible
- [ ] Alerts configured and firing correctly

---

## 9. Functional Tests

### 9.1 User Registration Flow

```bash
# Test user registration
curl -X POST https://api.flamoral.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
```

**Expected:**
- [ ] 201 Created
- [ ] User created in database
- [ ] Verification email sent

### 9.2 Authentication Flow

```bash
# Test login
curl -X POST https://api.flamoral.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

**Expected:**
- [ ] 200 OK
- [ ] JWT token returned
- [ ] Token valid and contains correct claims

### 9.3 Protected Endpoint Access

```bash
# Access protected endpoint with token
curl -X GET https://api.flamoral.com/api/users/profile \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Expected:**
- [ ] 200 OK with valid token
- [ ] 401 Unauthorized without token

### 9.4 WebSocket Connectivity

```javascript
// Test WebSocket connection
const ws = new WebSocket('wss://api.flamoral.com/ws');
ws.onopen = () => console.log('Connected');
ws.onmessage = (msg) => console.log('Message:', msg.data);
```

**Expected:**
- [ ] WebSocket connection established
- [ ] Messages sent/received successfully

---

## 10. Performance Baseline

### 10.1 Load Test (Optional)

```bash
# Using k6 for load testing
k6 run --vus 50 --duration 5m load-test.js
```

### 10.2 Expected Performance Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| API Response Time (p50) | < 200ms | | [ ] |
| API Response Time (p95) | < 500ms | | [ ] |
| API Response Time (p99) | < 1000ms | | [ ] |
| Requests/second | > 1000 | | [ ] |
| Error Rate | < 0.1% | | [ ] |

---

## 11. Final Sign-Off Checklist

### Infrastructure
- [ ] All Azure resources provisioned and healthy
- [ ] Network connectivity verified
- [ ] Security groups correctly configured

### Application
- [ ] All services deployed and running
- [ ] Health endpoints returning 200
- [ ] API functional

### Domain
- [ ] DNS resolving correctly
- [ ] SSL certificates valid
- [ ] WAF protecting endpoints

### Security
- [ ] Key Vault secrets accessible
- [ ] TLS properly configured
- [ ] Rate limiting active

### Monitoring
- [ ] Logs flowing to Log Analytics
- [ ] Application Insights tracking requests
- [ ] Alerts configured

### CI/CD
- [ ] CI pipeline triggers on push
- [ ] CD pipeline deploys correctly
- [ ] Rollback capability verified

---

## Verification Summary

| Category | Items Checked | Passed | Failed |
|----------|---------------|--------|--------|
| Infrastructure | 11 | | |
| Kubernetes | 8 | | |
| DNS/Domain | 6 | | |
| Application | 10 | | |
| Database | 4 | | |
| Security | 5 | | |
| CI/CD | 4 | | |
| Monitoring | 4 | | |
| **Total** | **52** | | |

---

## Document Information

| Field | Value |
|-------|-------|
| Last Updated | December 2024 |
| Version | 1.0 |
| Author | Flamoral DevOps Team |
| Status | Production Ready |

---

## Appendix: Quick Commands Reference

```bash
# Get all resource status
az resource list -g flamoral-prod-rg -o table

# Get AKS cluster status
az aks show -g flamoral-prod-rg -n flamoral-prod-aks --query "powerState.code" -o tsv

# Get all pods
kubectl get pods -n flamoral -o wide

# Check logs
kubectl logs -n flamoral deployment/api-gateway --tail=100

# Port forward for local testing
kubectl port-forward -n flamoral svc/api-gateway 4000:4000

# Check ingress
kubectl get ingress -n flamoral
kubectl describe ingress flamoral-ingress -n flamoral

# Test DNS
nslookup flamoral.com
dig flamoral.com ANY

# Test SSL
curl -vI https://flamoral.com 2>&1 | head -20
```
