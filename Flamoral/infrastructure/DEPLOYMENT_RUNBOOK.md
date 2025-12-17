# Flamoral Production Deployment Runbook

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Emergency Contacts](#emergency-contacts)
9. [FAQ](#faq)

---

## Overview

This runbook provides comprehensive instructions for deploying the Flamoral dating platform to production. The deployment is fully automated using orchestration scripts that execute all necessary steps in the correct order.

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Deployment Flow                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. DNS Deployment (Azure DNS Zone + A Records)             │
│     ↓                                                        │
│  2. Kubernetes Namespace & ConfigMaps                       │
│     ↓                                                        │
│  3. External Secrets (Azure Key Vault Integration)          │
│     ↓                                                        │
│  4. TLS Certificate (cert-manager + Let's Encrypt)          │
│     ↓                                                        │
│  5. Azure Front Door Routing Rules                          │
│     ↓                                                        │
│  6. Verification & Health Checks                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Information

- **Domain**: flamoral.com
- **Target IP**: 48.200.65.15
- **Kubernetes Namespace**: flamoral
- **Resource Group**: flamoral-prod-rg
- **AKS Cluster**: flamoral-prod-aks
- **Key Vault**: flamoral-prod-kv
- **Estimated Total Time**: 20-35 minutes (excluding DNS propagation)

---

## Prerequisites

### Required Tools

Before starting the deployment, ensure you have the following tools installed:

| Tool | Minimum Version | Installation Link |
|------|----------------|-------------------|
| Azure CLI | 2.50.0+ | https://docs.microsoft.com/cli/azure/install-azure-cli |
| kubectl | 1.25.0+ | https://kubernetes.io/docs/tasks/tools/ |
| helm | 3.12.0+ | https://helm.sh/docs/intro/install/ |
| jq | 1.6+ | https://stedolan.github.io/jq/download/ |
| dig | - | Part of `dnsutils` package |
| curl | 7.68.0+ | Usually pre-installed |

### Azure Resources

The following Azure resources must exist before deployment:

- ✅ Resource Group: `flamoral-prod-rg`
- ✅ AKS Cluster: `flamoral-prod-aks`
- ✅ Azure Key Vault: `flamoral-prod-kv`
- ✅ Azure Container Registry: `flamoralacr` (optional - can be created)
- ✅ Azure Front Door Profile: `flamoral-prod-afd`

### Required Secrets in Key Vault

Ensure these secrets are present in Azure Key Vault:

| Secret Name | Description | Example Format |
|-------------|-------------|----------------|
| `database-password` | PostgreSQL password | `strong-password-123` |
| `database-url` | Full database connection string | `postgresql://user:pass@host/db` |
| `jwt-secret` | JWT signing secret | `random-256-bit-string` |
| `jwt-access-secret` | JWT access token secret | `random-256-bit-string` |
| `jwt-refresh-secret` | JWT refresh token secret | `random-256-bit-string` |
| `stripe-secret-key` | Stripe API secret | `sk_live_...` |
| `sendgrid-api-key` | SendGrid API key | `SG.xxxxx...` |
| `twilio-auth-token` | Twilio auth token | `xxxxx...` |

### Permissions Required

The deployment requires the following Azure permissions:

- **Resource Group**: Contributor or Owner
- **AKS Cluster**: Azure Kubernetes Service Cluster User Role
- **Key Vault**: Key Vault Secrets Officer or Administrator
- **DNS Zone**: DNS Zone Contributor
- **Front Door**: CDN Profile Contributor

---

## Pre-Deployment Checklist

### Automated Pre-Deployment Check

Run the automated pre-deployment check script:

**Bash (Linux/macOS):**
```bash
cd infrastructure/scripts
./pre-deployment-check.sh
```

**PowerShell (Windows):**
```powershell
cd infrastructure\scripts
.\pre-deployment-check.ps1
```

This script will verify:
- ✓ All required tools are installed
- ✓ Azure CLI is authenticated
- ✓ kubectl is configured
- ✓ Azure resources exist
- ✓ Key Vault secrets are present
- ✓ Network connectivity
- ✓ Permissions are correct
- ✓ Git repository is clean

### Manual Checklist

Before proceeding, confirm:

- [ ] All team members have been notified of the deployment
- [ ] Database backups are current and verified
- [ ] Monitoring and alerting systems are operational
- [ ] Incident response team is on standby
- [ ] Rollback plan has been reviewed
- [ ] Deployment window has been communicated to stakeholders
- [ ] Change request has been approved (if required)

---

## Deployment Steps

### Step 1: DNS Deployment

**Duration**: 5-10 minutes (propagation can take up to 48 hours)

This step creates the Azure DNS Zone and configures A records for:
- flamoral.com
- www.flamoral.com
- api.flamoral.com
- admin.flamoral.com

**What happens:**
1. Creates Azure DNS Zone
2. Configures A records pointing to the ingress IP
3. Adds CAA records for Let's Encrypt
4. Waits for initial DNS propagation check

**Manual execution (if needed):**
```bash
cd infrastructure/dns
./configure-dns.sh
```

**Verification:**
```bash
dig flamoral.com @8.8.8.8
dig www.flamoral.com @8.8.8.8
dig api.flamoral.com @8.8.8.8
```

**Expected output:** All queries should return `48.200.65.15`

---

### Step 2: Kubernetes Namespace and Configurations

**Duration**: 2-3 minutes

This step prepares the Kubernetes cluster:
1. Creates the `flamoral` namespace
2. Labels the namespace appropriately
3. Applies ConfigMaps for shared configuration

**What happens:**
```bash
kubectl create namespace flamoral
kubectl label namespace flamoral environment=production
kubectl apply -f infrastructure/kubernetes/configmaps -n flamoral
```

**Verification:**
```bash
kubectl get namespace flamoral
kubectl get configmaps -n flamoral
```

---

### Step 3: External Secrets Operator

**Duration**: 5-8 minutes

This step sets up Azure Key Vault integration:
1. Installs External Secrets Operator (if not present)
2. Deploys SecretProviderClass for Azure Key Vault
3. Configures managed identity for secret access

**What happens:**
1. Helm installs External Secrets Operator
2. Creates CSI driver integration
3. Maps Key Vault secrets to Kubernetes secrets

**Verification:**
```bash
kubectl get pods -n external-secrets
kubectl get secretproviderclass -n flamoral
```

---

### Step 4: TLS Certificate

**Duration**: 3-5 minutes

This step configures SSL/TLS certificates:
1. Installs cert-manager (if not present)
2. Creates Let's Encrypt ClusterIssuer
3. Deploys Ingress with TLS configuration
4. Waits for certificate issuance

**Requirements:**
- DNS must be properly configured
- Domain must be resolvable
- HTTP-01 challenge must be accessible

**What happens:**
1. cert-manager is deployed to `cert-manager` namespace
2. ClusterIssuer is created for Let's Encrypt production
3. Ingress resource requests certificate
4. Let's Encrypt validates domain ownership
5. Certificate is issued and stored as Kubernetes secret

**Verification:**
```bash
kubectl get certificate -n flamoral
kubectl describe certificate flamoral-tls -n flamoral
```

**Expected output:**
```
Status:
  Conditions:
    Type:    Ready
    Status:  True
```

---

### Step 5: Azure Front Door Routing Rules

**Duration**: 3-5 minutes

This step configures Azure Front Door:
1. Creates routing rules for different traffic types
2. Configures caching policies
3. Sets up compression rules
4. Enables HTTPS redirect

**Routes created:**
- `/` - Default route (web traffic)
- `/api/*` - API route
- `/ws/*` - WebSocket route
- `/static/*` - Static assets route
- `/media/*` - Media route
- `/health` - Health check route

**Manual execution (if needed):**
```bash
cd infrastructure/azure
./deploy-frontdoor-routes.sh
```

**Verification:**
```bash
az afd route list \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --output table
```

---

### Step 6: Verification

**Duration**: 2-3 minutes

This step performs comprehensive verification:
1. Checks namespace and pod status
2. Verifies services are running
3. Confirms ingress is configured
4. Tests TLS certificate
5. Performs DNS resolution checks
6. Executes health check endpoints

**Verification commands:**
```bash
# Check all pods
kubectl get pods -n flamoral -o wide

# Check services
kubectl get services -n flamoral

# Check ingress
kubectl get ingress -n flamoral

# Test HTTPS endpoint
curl -I https://api.flamoral.com/health

# Check certificate
echo | openssl s_client -servername flamoral.com -connect flamoral.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Automated Deployment

### Full Deployment

Run the master deployment script to execute all steps automatically:

**Bash (Linux/macOS):**
```bash
cd infrastructure/scripts
./deploy-production.sh
```

**PowerShell (Windows):**
```powershell
cd infrastructure\scripts
.\deploy-production.ps1
```

### Deployment Options

#### Dry Run
Test the deployment without making changes:
```bash
./deploy-production.sh --dry-run
```

#### Skip DNS
If DNS is already configured:
```bash
./deploy-production.sh --skip-dns
```

#### Run Specific Step
Execute only a specific step:
```bash
./deploy-production.sh --step tls
```

Valid steps: `dns`, `namespace`, `secrets`, `tls`, `frontdoor`, `verify`

#### Verbose Mode
Enable detailed logging:
```bash
./deploy-production.sh --verbose
```

#### Disable Rollback
Prevent automatic rollback on failure:
```bash
./deploy-production.sh --no-rollback
```

### Deployment Logs

All deployment activity is logged to:
```
infrastructure/logs/deployment_YYYYMMDD_HHMMSS.log
```

The deployment status is tracked in:
```
infrastructure/scripts/deployment-status.json
```

---

## Post-Deployment Verification

### 1. DNS Verification

Verify DNS resolution for all domains:

```bash
# Check from multiple DNS servers
dig flamoral.com @8.8.8.8        # Google DNS
dig flamoral.com @1.1.1.1        # Cloudflare DNS
dig flamoral.com @208.67.222.222 # OpenDNS

# Check all subdomains
for subdomain in "" "www." "api." "admin."; do
  echo "Checking ${subdomain}flamoral.com"
  dig ${subdomain}flamoral.com @8.8.8.8 +short
done
```

**Expected**: All should return `48.200.65.15`

### 2. HTTPS/TLS Verification

Test SSL certificate:

```bash
# Check certificate validity
curl -vI https://flamoral.com 2>&1 | grep -E 'SSL|certificate|expire'

# Detailed certificate check
echo | openssl s_client -servername flamoral.com -connect flamoral.com:443 2>/dev/null | openssl x509 -noout -text | grep -E 'Issuer|Subject|Not Before|Not After'
```

**Expected**:
- Issuer: Let's Encrypt
- Valid certificate chain
- Expiry date at least 60 days in future

### 3. Application Health Checks

Test all health endpoints:

```bash
# API health
curl -f https://api.flamoral.com/health
curl -f https://api.flamoral.com/ready

# Front Door health
curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net/health
```

**Expected**: HTTP 200 OK

### 4. Kubernetes Resources

Verify all Kubernetes resources are healthy:

```bash
# All resources in namespace
kubectl get all -n flamoral

# Pod status (all should be Running)
kubectl get pods -n flamoral -o wide

# Check pod logs for errors
kubectl logs -n flamoral -l app=api-gateway --tail=50

# Check events for issues
kubectl get events -n flamoral --sort-by='.lastTimestamp' | tail -20
```

### 5. Front Door Verification

Test Front Door routing:

```bash
# Test different routes
curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net/
curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net/api/health
curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net/static/test.css

# Verify caching headers
curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net/ | grep -i cache
```

### 6. Security Verification

```bash
# Check security headers
curl -I https://flamoral.com | grep -E 'Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options'

# Verify HTTPS redirect
curl -I http://flamoral.com | grep -i location

# Test rate limiting
for i in {1..10}; do curl -I https://api.flamoral.com/test; done
```

---

## Rollback Procedures

### Automatic Rollback

The deployment script includes automatic rollback on failure. If any step fails:

1. Deployment stops immediately
2. Error is logged with details
3. Rollback is initiated (unless `--no-rollback` flag is used)
4. Namespace and all resources are deleted
5. Status file is updated with rollback information

### Manual Rollback

If you need to manually rollback:

#### 1. Delete Kubernetes Resources

```bash
# Delete all resources in namespace
kubectl delete namespace flamoral --timeout=120s

# If namespace is stuck, force delete
kubectl delete namespace flamoral --grace-period=0 --force
```

#### 2. Rollback DNS Changes

```bash
# List DNS records
az network dns record-set a list \
  --zone-name flamoral.com \
  --resource-group flamoral-prod-rg

# Delete A records (if needed)
az network dns record-set a delete \
  --name www \
  --zone-name flamoral.com \
  --resource-group flamoral-prod-rg \
  --yes
```

#### 3. Remove Front Door Routes

```bash
# List routes
az afd route list \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg

# Delete specific route
az afd route delete \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --route-name default-route
```

#### 4. Delete TLS Certificates

```bash
# Delete certificate
kubectl delete certificate flamoral-tls -n flamoral

# Delete ClusterIssuer
kubectl delete clusterissuer letsencrypt-prod
```

#### 5. Verify Rollback

```bash
# Check namespace is deleted
kubectl get namespace flamoral

# Check DNS records
dig flamoral.com @8.8.8.8

# Check Front Door routes
az afd route list \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg
```

---

## Troubleshooting Guide

### Common Issues

#### Issue 1: DNS Not Propagating

**Symptoms:**
- `dig` commands return no results or NXDOMAIN
- Certificate issuance fails with DNS validation error

**Resolution:**
```bash
# Check nameservers are configured
az network dns zone show \
  --name flamoral.com \
  --resource-group flamoral-prod-rg \
  --query nameServers

# Verify nameservers at registrar match Azure nameservers
# Wait additional time (DNS can take up to 48 hours)

# Check from different DNS servers
dig flamoral.com @8.8.8.8
dig flamoral.com @1.1.1.1

# Clear local DNS cache
# Linux/macOS: sudo systemd-resolve --flush-caches
# Windows: ipconfig /flushdns
```

#### Issue 2: Certificate Issuance Failing

**Symptoms:**
- Certificate status shows "Issuing" for extended period
- Certificate has error conditions

**Diagnosis:**
```bash
# Check certificate status
kubectl describe certificate flamoral-tls -n flamoral

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager --tail=50

# Check challenge status
kubectl get challenges -n flamoral
kubectl describe challenge <challenge-name> -n flamoral
```

**Resolution:**
```bash
# Delete and recreate certificate
kubectl delete certificate flamoral-tls -n flamoral
kubectl apply -f ../flamoral-ingress-tls.yaml -n flamoral

# Ensure DNS is working
dig flamoral.com @8.8.8.8

# Ensure ingress is accessible
curl http://flamoral.com/.well-known/acme-challenge/test
```

#### Issue 3: Pods Not Starting

**Symptoms:**
- Pods stuck in Pending, CrashLoopBackOff, or ImagePullBackOff
- Services not accessible

**Diagnosis:**
```bash
# Check pod status
kubectl get pods -n flamoral -o wide

# Check pod events
kubectl describe pod <pod-name> -n flamoral

# Check pod logs
kubectl logs <pod-name> -n flamoral --previous
kubectl logs <pod-name> -n flamoral
```

**Common Causes & Solutions:**

**ImagePullBackOff:**
```bash
# Verify ACR credentials
az acr login --name flamoralacr

# Check if image exists
az acr repository list --name flamoralacr

# Verify AKS can pull from ACR
az aks check-acr \
  --name flamoral-prod-aks \
  --resource-group flamoral-prod-rg \
  --acr flamoralacr.azurecr.io
```

**Missing Secrets:**
```bash
# Check secrets exist
kubectl get secrets -n flamoral

# Check SecretProviderClass
kubectl get secretproviderclass -n flamoral
kubectl describe secretproviderclass flamoral-azure-keyvault -n flamoral

# Verify Key Vault secrets
az keyvault secret list --vault-name flamoral-prod-kv
```

**Resource Constraints:**
```bash
# Check node resources
kubectl top nodes

# Check pod resource requests
kubectl describe nodes | grep -A 5 "Allocated resources"

# Scale down non-critical pods
kubectl scale deployment <deployment-name> -n flamoral --replicas=1
```

#### Issue 4: Ingress Not Working

**Symptoms:**
- 404 errors when accessing the domain
- Connection timeouts
- Certificate warnings

**Diagnosis:**
```bash
# Check ingress status
kubectl get ingress -n flamoral
kubectl describe ingress flamoral-ingress -n flamoral

# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller --tail=50

# Check service endpoints
kubectl get endpoints -n flamoral
```

**Resolution:**
```bash
# Verify ingress controller has external IP
kubectl get service -n ingress-nginx ingress-nginx-controller

# Verify ingress class
kubectl get ingressclass

# Recreate ingress
kubectl delete ingress flamoral-ingress -n flamoral
kubectl apply -f ../flamoral-ingress-tls.yaml -n flamoral
```

#### Issue 5: Front Door Not Routing

**Symptoms:**
- Front Door returns 404 or 502 errors
- Routes not working as expected

**Diagnosis:**
```bash
# Check route configuration
az afd route list \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --output table

# Check origin health
az afd origin list \
  --origin-group-name flamoral-origin-group \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg

# Test origin directly
curl https://48.200.65.15/health -H "Host: api.flamoral.com" -k
```

**Resolution:**
```bash
# Redeploy routes
cd infrastructure/azure
./deploy-frontdoor-routes.sh

# Purge Front Door cache
az afd endpoint purge \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --content-paths "/*"
```

#### Issue 6: Key Vault Access Denied

**Symptoms:**
- Pods cannot access secrets
- "Access denied" errors in logs

**Diagnosis:**
```bash
# Check managed identity
az aks show \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks \
  --query identityProfile

# Check Key Vault access policies
az keyvault show \
  --name flamoral-prod-kv \
  --query properties.accessPolicies
```

**Resolution:**
```bash
# Get AKS managed identity
IDENTITY_CLIENT_ID=$(az aks show \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks \
  --query identityProfile.kubeletidentity.clientId -o tsv)

# Grant Key Vault access
az keyvault set-policy \
  --name flamoral-prod-kv \
  --object-id $IDENTITY_CLIENT_ID \
  --secret-permissions get list
```

---

## Emergency Contacts

### Primary Contacts

| Role | Name | Email | Phone | Availability |
|------|------|-------|-------|--------------|
| DevOps Lead | [Name] | devops-lead@flamoral.com | +1-XXX-XXX-XXXX | 24/7 |
| Backend Lead | [Name] | backend-lead@flamoral.com | +1-XXX-XXX-XXXX | Business Hours |
| Platform Engineer | [Name] | platform@flamoral.com | +1-XXX-XXX-XXXX | On-Call |
| Security Lead | [Name] | security@flamoral.com | +1-XXX-XXX-XXXX | On-Call |

### Escalation Path

1. **Level 1**: DevOps Engineer (0-30 minutes)
2. **Level 2**: DevOps Lead (30-60 minutes)
3. **Level 3**: Engineering Manager (60+ minutes)
4. **Level 4**: CTO (Critical incidents only)

### External Support

| Service | Contact | Support Link |
|---------|---------|--------------|
| Azure Support | Azure Portal | https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade |
| Let's Encrypt | Forum | https://community.letsencrypt.org/ |
| DNS Provider | Support | [Your DNS Provider Support] |

### Incident Communication Channels

- **Slack**: #production-incidents
- **Email**: incidents@flamoral.com
- **Status Page**: https://status.flamoral.com (if available)

---

## FAQ

### Q: How long does the full deployment take?

**A:** The automated deployment typically takes 20-35 minutes. However, DNS propagation can take up to 48 hours to fully complete worldwide. The deployment script waits for initial DNS propagation but doesn't block on full global propagation.

### Q: Can I run the deployment during business hours?

**A:** While the deployment can be run at any time, it's recommended to deploy during a maintenance window or low-traffic period. The deployment includes automated rollback, but there may be brief service interruptions.

### Q: What happens if the deployment fails?

**A:** The deployment script includes automatic rollback. If any step fails:
1. The deployment stops immediately
2. An error is logged with details
3. Previously deployed resources are removed
4. The status file is updated
5. You can review logs and fix issues before retrying

### Q: Can I resume a failed deployment?

**A:** Yes, you can use the `--step` option to resume from a specific step:
```bash
./deploy-production.sh --step tls
```

### Q: How do I check the deployment status?

**A:** Review the status tracker file:
```bash
cat infrastructure/scripts/deployment-status.json | jq
```

Or check the deployment logs:
```bash
tail -f infrastructure/logs/deployment_*.log
```

### Q: Can I skip DNS if it's already configured?

**A:** Yes, use the `--skip-dns` flag:
```bash
./deploy-production.sh --skip-dns
```

### Q: What if DNS isn't propagating?

**A:** DNS propagation can take time. You can:
1. Verify nameservers are correct at your registrar
2. Test from different DNS servers
3. Wait up to 48 hours for full propagation
4. Proceed with deployment - cert-manager will retry

### Q: How do I update secrets after deployment?

**A:** Update secrets in Azure Key Vault:
```bash
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name secret-name \
  --value "new-value"
```

Then restart pods to pick up new secrets:
```bash
kubectl rollout restart deployment <deployment-name> -n flamoral
```

### Q: How do I add a new subdomain?

**A:** Add DNS A record:
```bash
az network dns record-set a add-record \
  --record-set-name subdomain \
  --zone-name flamoral.com \
  --resource-group flamoral-prod-rg \
  --ipv4-address 48.200.65.15
```

Update ingress and certificate configuration accordingly.

### Q: How often should I run deployments?

**A:** This depends on your release schedule. However:
- Run full deployment for major releases
- Use targeted deployments for minor updates
- Always test in staging first
- Schedule during maintenance windows when possible

### Q: What monitoring is in place?

**A:** After deployment, monitor via:
- Azure Monitor for infrastructure metrics
- Application Insights for application metrics
- Kubernetes dashboard for cluster health
- Front Door analytics for CDN performance

### Q: How do I scale the deployment?

**A:** Scale deployments using kubectl:
```bash
kubectl scale deployment api-gateway -n flamoral --replicas=5
```

Or update deployment manifests and reapply.

---

## Appendix

### A. File Locations

```
infrastructure/
├── scripts/
│   ├── deploy-production.sh          # Master deployment script (Bash)
│   ├── deploy-production.ps1         # Master deployment script (PowerShell)
│   ├── pre-deployment-check.sh       # Pre-deployment verification
│   └── deployment-status.json        # Deployment status tracker
├── dns/
│   └── configure-dns.sh              # DNS configuration script
├── azure/
│   └── deploy-frontdoor-routes.sh    # Front Door routing script
├── kubernetes/
│   ├── secrets/
│   │   └── azure-keyvault-secretprovider.yaml
│   └── configmaps/
│       └── *.yaml
└── logs/
    └── deployment_*.log              # Deployment logs
```

### B. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-13 | DevOps Team | Initial deployment runbook |

### C. Related Documentation

- [Architecture Guide](../ARCHITECTURE.md)
- [Security Compliance](../SECURITY_COMPLIANCE.md)
- [DNS Configuration Guide](dns/DNS_CONFIGURATION.md)
- [Front Door Routing Guide](azure/FRONTDOOR_ROUTING_GUIDE.md)
- [Rollback Plan](../ROLLBACK_PLAN.md)

---

**Document Maintained By**: Flamoral DevOps Team
**Last Updated**: 2025-12-13
**Next Review**: 2025-03-13
