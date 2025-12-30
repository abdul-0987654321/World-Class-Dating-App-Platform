# Security Hardening Guide - Flamoral Dating Platform

This document outlines the security hardening measures implemented for the Flamoral Dating Platform infrastructure.

## Security Fixes Applied

### 1. WAF Policy Association with Azure Front Door
**Issue:** WAF policy was created but not associated with Front Door endpoints.

**Fix:**
- Updated `infrastructure/terraform/modules/frontdoor/main.tf`
- Added `azurerm_cdn_frontdoor_security_policy` resource
- WAF now actively protects all Front Door endpoints with:
  - OWASP Default Rule Set 2.1
  - Microsoft Bot Manager Rule Set
  - Rate limiting rules
  - Geo-blocking capabilities

**Impact:** All incoming traffic through Front Door is now protected by WAF rules.

---

### 2. Removed Overly Permissive Firewall Rules

#### PostgreSQL
**Issue:** Firewall rule allowing all Azure Services (0.0.0.0)

**Fix:**
- Removed `azurerm_postgresql_flexible_server_firewall_rule` from `infrastructure/terraform/modules/postgres/main.tf`
- Access now controlled via:
  - VNet integration with delegated subnet
  - Private DNS zones
  - Service endpoints on AKS subnet

**Impact:** PostgreSQL is no longer accessible from public Azure services, only from authorized VNet resources.

#### Redis
**Issue:** Firewall rule allowing all Azure Services (0.0.0.0)

**Fix:**
- Removed `azurerm_redis_firewall_rule` from `infrastructure/terraform/modules/redis/main.tf`
- Access controlled via:
  - VNet injection (Premium SKU)
  - Private endpoints
  - Service endpoints on AKS subnet

**Impact:** Redis is no longer accessible from public Azure services.

---

### 3. Fixed Hardcoded Default Password in Elasticsearch

**Issue:** Elasticsearch manifest contained hardcoded password "CHANGE_ME_ELASTICSEARCH_PASSWORD"

**Fix:**
- Updated `infrastructure/logging/elasticsearch/elasticsearch-complete.yaml`
- Removed hardcoded password
- Added documentation for secure secret creation:
  ```bash
  kubectl create secret generic elasticsearch-credentials \
    --from-literal=username=elastic \
    --from-literal=password=$(openssl rand -base64 32) \
    -n logging
  ```
- Recommended Azure Key Vault integration with CSI driver

**Impact:** Elasticsearch passwords must now be generated securely and cannot be committed to version control.

---

### 4. AKS API Server Access Restrictions

**Issue:** AKS API server was accessible from any IP address

**Fix:**
- Added `authorized_ip_ranges` variable to `infrastructure/terraform/modules/aks/variables.tf`
- Added `api_server_access_profile` block to `infrastructure/terraform/modules/aks/main.tf`
- API server access can now be restricted to specific IP ranges

**Configuration Example:**
```hcl
module "aks" {
  source = "./modules/aks"

  authorized_ip_ranges = [
    "203.0.113.0/24",  # Office IP range
    "198.51.100.5/32"  # VPN gateway
  ]
}
```

**Impact:** AKS API server can now be locked down to authorized networks only.

---

### 5. Key Vault Purge Protection

**Issue:** Production Key Vault had purge protection disabled on destroy

**Fix:**
- Added `enable_purge_protection` variable to `infrastructure/terraform/modules/keyvault/variables.tf`
- Updated `infrastructure/terraform/modules/keyvault/main.tf` to use variable instead of hardcoded check
- Production environments should set `enable_purge_protection = true`

**Configuration:**
```hcl
# Production
module "keyvault" {
  source = "./modules/keyvault"

  enable_purge_protection = true  # Cannot be disabled once enabled
  soft_delete_retention_days = 90
}

# Development
module "keyvault" {
  source = "./modules/keyvault"

  enable_purge_protection = false
  soft_delete_retention_days = 7
}
```

**Impact:** Production Key Vault data is protected from accidental deletion with 90-day retention.

---

### 6. Removed Public HTTP Access from NSG Rules

**Issue:** Network Security Groups allowed HTTP (port 80) traffic from any source

**Fix:**
- Removed HTTP security rule from `infrastructure/terraform/modules/network/main.tf`
- Only HTTPS (port 443) is now allowed at NSG level
- HTTP-to-HTTPS redirect should be configured at ingress controller level

**Impact:** All inbound traffic must use HTTPS, improving security posture.

---

### 7. Enabled Disk Encryption for AKS Nodes

**Issue:** AKS node disks were not encrypted at host level

**Fix:**
- Added `enable_disk_encryption` variable to `infrastructure/terraform/modules/aks/variables.tf`
- Added `enable_host_encryption = true` to default and worker node pools
- Added `disk_encryption_set_id` variable for custom encryption keys

**Configuration:**
```hcl
module "aks" {
  source = "./modules/aks"

  enable_disk_encryption = true
  disk_encryption_set_id = azurerm_disk_encryption_set.main.id  # Optional
}
```

**Impact:** All AKS node disks are now encrypted at rest using Azure-managed or customer-managed keys.

---

### 8. Migrated to Pod Security Standards

**Issue:** PodSecurityPolicy API is deprecated (removed in Kubernetes 1.25)

**Fix:**
- Created `infrastructure/kubernetes/security/pod-security-standards.yaml`
- Implemented Pod Security Standards using namespace labels:
  - **Production/Staging:** `restricted` level (most secure)
  - **Development:** `baseline` level (allows some flexibility)
  - **Logging/Monitoring:** `baseline` level (required for system components)

**Features:**
- Enforce, audit, and warn modes
- OPA Gatekeeper integration for policy enforcement
- ResourceQuotas and LimitRanges
- Example deployment with secure configuration

**Migration Path:**
1. Apply namespace labels with `warn` mode
2. Fix any violations in applications
3. Switch to `enforce` mode
4. Remove deprecated PodSecurityPolicy objects

**Impact:** Kubernetes security policies are now future-proof and compliant with current standards.

---

### 9. Implemented Mutual TLS (mTLS) with Istio

**Issue:** No service-to-service encryption or mutual authentication

**Fix:**
- Created `infrastructure/kubernetes/security/istio-mtls-config.yaml`
- Deployed Istio service mesh with production configuration
- Enabled strict mTLS across the mesh

**Features:**
- **Automatic mTLS:** All service-to-service traffic encrypted
- **PeerAuthentication:** Strict mTLS mode enforced
- **AuthorizationPolicies:**
  - Default deny-all policy
  - Explicit allow rules for authorized communication
  - JWT-based authentication for external requests
- **Gateway Configuration:**
  - HTTPS ingress with TLS termination
  - HTTP-to-HTTPS redirect
- **ServiceEntries:** External service access (Azure PostgreSQL, Redis)
- **Traffic Management:** Routing, retries, timeouts
- **Observability:** Metrics, tracing, access logs

**Installation:**
```bash
# Install Istio
istioctl install -f infrastructure/kubernetes/security/istio-mtls-config.yaml

# Enable sidecar injection for namespaces
kubectl label namespace dating-app-production istio-injection=enabled
kubectl label namespace dating-app-staging istio-injection=enabled

# Verify mTLS is enforced
kubectl exec -it <pod> -c istio-proxy -- pilot-agent request GET stats | grep ssl
```

**Impact:**
- All service-to-service communication is encrypted and authenticated
- Zero-trust security model implemented
- Protection against man-in-the-middle attacks
- Enhanced observability and traffic control

---

## Configuration Examples

### Production Environment Variables

Create a `terraform.tfvars` file for production:

```hcl
# Production - Maximum Security
environment = "production"

# AKS Security
authorized_ip_ranges = [
  "203.0.113.0/24",    # Office network
  "198.51.100.5/32"    # Bastion host
]
enable_disk_encryption = true

# Key Vault Security
enable_purge_protection = true
soft_delete_retention_days = 90

# Network Security - HTTPS only
remove_http_nsg_rule = true

# WAF Configuration
waf_mode = "Prevention"
enable_geo_filtering = true
blocked_countries = ["KP", "IR", "SY"]
```

### Staging Environment Variables

```hcl
# Staging - Balanced Security
environment = "staging"

# AKS Security - More permissive for testing
authorized_ip_ranges = [
  "203.0.113.0/24",
  "0.0.0.0/0"  # Temporary for testing, remove in production
]
enable_disk_encryption = true

# Key Vault Security
enable_purge_protection = false
soft_delete_retention_days = 7

# WAF Configuration
waf_mode = "Detection"  # Log only, don't block
```

### Development Environment Variables

```hcl
# Development - Developer-friendly
environment = "development"

# AKS Security - Open for development
authorized_ip_ranges = []  # Empty = allow all
enable_disk_encryption = false  # Optional for dev

# Key Vault Security
enable_purge_protection = false
soft_delete_retention_days = 7
```

---

## Deployment Order

1. **Terraform Infrastructure** (with security fixes)
   ```bash
   cd infrastructure/terraform/environments/prod
   terraform init
   terraform plan
   terraform apply
   ```

2. **Pod Security Standards**
   ```bash
   kubectl apply -f infrastructure/kubernetes/security/pod-security-standards.yaml
   ```

3. **Istio Service Mesh**
   ```bash
   # Install Istio operator
   istioctl operator init

   # Apply Istio configuration
   kubectl apply -f infrastructure/kubernetes/security/istio-mtls-config.yaml

   # Enable sidecar injection
   kubectl label namespace dating-app-production istio-injection=enabled
   ```

4. **Deploy Applications**
   ```bash
   # Applications will automatically get Istio sidecar and security policies
   kubectl apply -f infrastructure/kubernetes/services/
   ```

---

## Verification Steps

### 1. Verify WAF Protection
```bash
# Check WAF policy association
az network front-door waf-policy show \
  --resource-group flamoral-prod-rg \
  --name flamoralprodwaf

# Test WAF blocking (should return 403)
curl -X POST https://api.flamoral.com/api/test \
  -H "User-Agent: BadBot" \
  --max-time 5
```

### 2. Verify Database Security
```bash
# PostgreSQL should not be publicly accessible
nmap -p 5432 flamoral-prod-postgres.postgres.database.azure.com

# Should only work from within VNet
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- \
  psql -h flamoral-prod-postgres.postgres.database.azure.com -U flamoraladmin
```

### 3. Verify AKS API Security
```bash
# From unauthorized IP (should fail)
kubectl get nodes

# From authorized IP (should succeed)
kubectl get nodes --kubeconfig=./kubeconfig-prod
```

### 4. Verify Pod Security Standards
```bash
# Try to create privileged pod (should fail in production)
kubectl run test --image=nginx --privileged -n dating-app-production

# Check namespace security labels
kubectl get namespace dating-app-production -o yaml | grep pod-security
```

### 5. Verify mTLS
```bash
# Check peer authentication
kubectl get peerauthentication -A

# Verify mTLS is active
kubectl exec -it <pod-name> -c istio-proxy -n dating-app-production -- \
  pilot-agent request GET stats | grep ssl.handshake

# Test service communication (should use mTLS)
kubectl exec -it <pod-name> -n dating-app-production -- \
  curl http://user-service:8080/health
```

### 6. Verify Disk Encryption
```bash
# Check AKS node encryption
az aks show \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks \
  --query "agentPoolProfiles[].enableEncryptionAtHost"
```

---

## Security Best Practices

1. **Secrets Management**
   - Never commit secrets to Git
   - Use Azure Key Vault with CSI driver
   - Rotate secrets regularly (90 days)

2. **Network Security**
   - Use Private Link for Azure services
   - Implement network policies in Kubernetes
   - Restrict egress traffic with Istio

3. **Identity and Access**
   - Use Azure AD integration for AKS
   - Implement RBAC at both Azure and Kubernetes levels
   - Use managed identities instead of service principals

4. **Monitoring and Auditing**
   - Enable Azure Security Center
   - Configure alerts for security events
   - Review audit logs regularly

5. **Compliance**
   - Enable Azure Policy for governance
   - Use Microsoft Defender for Cloud
   - Implement compliance scanning with Trivy

---

## Security Contacts

- **Security Team:** security@flamoral.com
- **DevOps Team:** devops@flamoral.com
- **Incident Response:** incidents@flamoral.com

---

## Additional Resources

- [Azure Security Baseline for AKS](https://docs.microsoft.com/en-us/security/benchmark/azure/baselines/aks-security-baseline)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Istio Security Best Practices](https://istio.io/latest/docs/ops/best-practices/security/)
- [Azure WAF Best Practices](https://docs.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-best-practices)

---

**Last Updated:** 2025-12-11
**Version:** 1.0
**Maintained by:** Flamoral Security Team
