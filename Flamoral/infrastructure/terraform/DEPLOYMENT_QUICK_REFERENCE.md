# Terraform Deployment Quick Reference

## Quick Start Commands

### 1. Initialize Terraform
```bash
cd C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\terraform
terraform init -upgrade
```

### 2. Validate Configuration
```bash
# Run custom validation script
chmod +x validate.sh
./validate.sh

# Or run Terraform validate directly
terraform validate
```

### 3. Format Code
```bash
terraform fmt -recursive
```

### 4. Plan Deployment
```bash
# For dev environment
terraform plan -var-file="environments/dev/terraform.tfvars" -out=tfplan

# For staging environment
terraform plan -var-file="environments/staging/terraform.tfvars" -out=tfplan

# For production environment
terraform plan -var-file="environments/prod/terraform.tfvars" -out=tfplan
```

### 5. Apply Changes
```bash
terraform apply tfplan
```

### 6. Destroy Resources (if needed)
```bash
terraform destroy -var-file="environments/dev/terraform.tfvars"
```

---

## Critical Fixes Applied (2025-12-15)

### ✓ Provider Versions Updated
- Azure Provider: `~> 4.0` (was 3.80)
- Kubernetes: `~> 2.33` (was 2.23)
- Helm: `~> 2.16` (was 2.11)
- Terraform: `>= 1.5` (was 1.4)

### ✓ AKS Configuration Fixed
- Updated Azure AD RBAC syntax
- Added Key Vault secrets rotation interval
- Updated Kubernetes to version 1.30

### ✓ Resource Naming Fixed
- Storage accounts: Added random suffix for global uniqueness
- Key Vault: Added random suffix for global uniqueness
- All names follow lowercase requirements

### ✓ PostgreSQL Configuration Enhanced
- Added Private DNS Zone
- Added VNet link for DNS resolution
- Enhanced password security

### ✓ Network Configuration Validated
- All subnets properly configured
- NSG rules validated
- Service endpoints configured
- Private endpoints supported

---

## Environment Configuration Files

### Development
**File:** `environments/dev/terraform.tfvars`
```hcl
prefix              = "flamoral"
env                 = "dev"
location            = "eastus"
subscription_id     = "YOUR_SUBSCRIPTION_ID"
tenant_id           = "YOUR_TENANT_ID"

# AKS Configuration
aks_node_count      = 2
aks_node_vm_size    = "Standard_D2s_v3"
kubernetes_version  = "1.30"

# Database Configuration
postgres_sku        = "B_Standard_B2s"
postgres_storage_mb = 32768  # 32 GB

# Redis Configuration
redis_sku          = "Basic"
redis_family       = "C"
redis_capacity     = 0

# Feature Flags
enable_private_endpoints = false
enable_ddos_protection   = false
enable_cost_management   = true
```

### Staging
**File:** `environments/staging/terraform.tfvars`
```hcl
prefix              = "flamoral"
env                 = "staging"
location            = "eastus"

# AKS Configuration
aks_node_count      = 3
aks_node_vm_size    = "Standard_D4s_v3"

# Database Configuration
postgres_sku        = "GP_Standard_D2s_v3"
postgres_storage_mb = 65536  # 64 GB

# Redis Configuration
redis_sku          = "Standard"
redis_family       = "C"
redis_capacity     = 1

# Feature Flags
enable_private_endpoints = true
enable_cost_management   = true
```

### Production
**File:** `environments/prod/terraform.tfvars`
```hcl
prefix              = "flamoral"
env                 = "prod"
location            = "eastus"

# AKS Configuration
aks_node_count      = 5
aks_node_vm_size    = "Standard_D8s_v3"

# Database Configuration
postgres_sku        = "GP_Standard_D8s_v3"
postgres_storage_mb = 131072  # 128 GB

# Redis Configuration
redis_sku          = "Premium"
redis_family       = "P"
redis_capacity     = 2

# Feature Flags
enable_private_endpoints = true
enable_ddos_protection   = true
enable_cost_management   = true
enable_backup            = true
```

---

## Required Variables

### Essential (Must Configure)
```hcl
subscription_id = "YOUR_AZURE_SUBSCRIPTION_ID"
tenant_id       = "YOUR_AZURE_TENANT_ID"
prefix          = "your-prefix"  # e.g., "flamoral"
env             = "dev|staging|prod"
location        = "eastus"  # or your preferred region
```

### Optional (Have Defaults)
```hcl
vnet_address_space       = ["10.0.0.0/16"]
aks_subnet_prefix        = "10.0.1.0/24"
db_subnet_prefix         = "10.0.2.0/24"
redis_subnet_prefix      = "10.0.3.0/24"
kubernetes_version       = "1.30"
enable_private_endpoints = true
enable_waf               = true
enable_ddos_protection   = false
```

---

## Module Structure

```
infrastructure/terraform/
├── main.tf                 # Main configuration
├── variables.tf            # Global variables
├── outputs.tf             # Output values
├── providers.tf           # Additional providers
├── backend.tf             # Backend configuration
├── validate.sh            # Validation script
├── FIXES_APPLIED.md       # This document
├── environments/          # Environment configs
│   ├── dev/
│   ├── staging/
│   └── prod/
└── modules/               # Reusable modules
    ├── aks/
    ├── network/
    ├── postgres/
    ├── redis/
    ├── storage_blob/
    ├── keyvault/
    ├── signalr/
    ├── cosmosdb/
    ├── frontdoor/
    └── monitor/
```

---

## Common Issues and Solutions

### Issue: Storage Account Name Already Exists
**Solution:** The random suffix should handle this, but if it persists:
```bash
terraform apply -replace="module.storage.random_string.storage_suffix"
```

### Issue: Key Vault Name Already Exists
**Solution:**
```bash
terraform apply -replace="module.keyvault.random_string.kv_suffix"
```

### Issue: AKS API Server Connection Timeout
**Solution:** Check your IP is whitelisted:
```hcl
authorized_ip_ranges = ["YOUR_PUBLIC_IP/32"]
```

### Issue: PostgreSQL DNS Resolution Fails
**Solution:** Ensure VNet link is created:
```bash
terraform apply -target="module.postgres.azurerm_private_dns_zone_virtual_network_link.postgres"
```

### Issue: Provider Version Conflicts
**Solution:**
```bash
rm -rf .terraform .terraform.lock.hcl
terraform init -upgrade
```

---

## Validation Checklist

Before running `terraform apply`:

- [ ] Azure CLI logged in: `az login`
- [ ] Correct subscription selected: `az account show`
- [ ] Backend initialized: `terraform init`
- [ ] Configuration valid: `terraform validate`
- [ ] Code formatted: `terraform fmt -recursive`
- [ ] Variables set in terraform.tfvars
- [ ] Plan reviewed: `terraform plan`
- [ ] No hardcoded secrets
- [ ] Resource naming correct
- [ ] Network ranges don't conflict

---

## Post-Deployment Verification

### 1. Check AKS Cluster
```bash
az aks get-credentials --resource-group flamoral-dev-rg --name flamoral-dev-aks
kubectl get nodes
kubectl get pods --all-namespaces
```

### 2. Test PostgreSQL Connection
```bash
# Get connection details from Key Vault
az keyvault secret show --vault-name flamoral-dev-kv-xxxx --name postgres-password
```

### 3. Verify Storage Account
```bash
az storage account show --name flamoraldevstxxxxxx --resource-group flamoral-dev-rg
```

### 4. Check Front Door Status
```bash
az afd endpoint show --profile-name flamoral-dev-fd --endpoint-name flamoral-dev-endpoint --resource-group flamoral-dev-rg
```

### 5. Verify Monitoring
```bash
az monitor log-analytics workspace show --resource-group flamoral-dev-rg --workspace-name flamoral-dev-logs
```

---

## Cost Estimation

### Development Environment
- **AKS:** ~$150/month (2 nodes, D2s_v3)
- **PostgreSQL:** ~$50/month (Basic tier)
- **Redis:** ~$15/month (Basic C0)
- **Storage:** ~$25/month
- **Networking:** ~$50/month
- **Monitoring:** ~$25/month
- **Total:** ~$315-400/month

### Staging Environment
- **AKS:** ~$350/month (3 nodes, D4s_v3)
- **PostgreSQL:** ~$180/month (GP tier)
- **Redis:** ~$75/month (Standard C1)
- **Storage:** ~$50/month
- **Networking:** ~$100/month
- **Total:** ~$755-900/month

### Production Environment
- **AKS:** ~$1,200/month (5 nodes, D8s_v3)
- **PostgreSQL:** ~$650/month (GP tier, large)
- **Redis:** ~$350/month (Premium P2)
- **Storage:** ~$150/month
- **Front Door:** ~$150/month
- **DDoS Protection:** ~$3,000/month (if enabled)
- **Total:** ~$2,500-3,500/month (without DDoS)
- **Total:** ~$5,500-6,500/month (with DDoS)

*Note: Prices are estimates and vary by region and actual usage*

---

## Security Best Practices

### Implemented
- ✓ Network isolation with VNets
- ✓ Private endpoints for PaaS services
- ✓ RBAC for all services
- ✓ TLS 1.2 minimum
- ✓ Encryption at rest
- ✓ Key Vault for secrets
- ✓ WAF enabled on Front Door
- ✓ NSG rules limiting access

### Recommended for Production
- [ ] Azure Policy enforcement
- [ ] Azure Security Center Standard tier
- [ ] Azure Sentinel for SIEM
- [ ] Regular security assessments
- [ ] Penetration testing
- [ ] Incident response plan
- [ ] Backup and disaster recovery testing

---

## Backup and Recovery

### Automated Backups
- **PostgreSQL:** Daily, 7-day retention (dev/staging), 35-day retention (prod)
- **CosmosDB:** Continuous backup mode
- **Key Vault:** Soft delete enabled, 90-day retention
- **Storage:** Soft delete enabled, 30-day retention

### Manual Backup Procedures
```bash
# Backup AKS configuration
kubectl get all --all-namespaces -o yaml > aks-backup.yaml

# Export Terraform state
terraform state pull > terraform.tfstate.backup

# Backup Key Vault secrets
az keyvault secret backup --vault-name <vault-name> --name <secret-name> --file <backup-file>
```

---

## Monitoring and Alerts

### Configured Alerts
- CPU usage > 85%
- Memory usage > 85%
- Error rate > 5%
- Response time > 2 seconds
- Budget thresholds

### Monitoring Dashboards
- Application Insights: Performance monitoring
- Log Analytics: Centralized logging
- Azure Monitor: Infrastructure metrics
- Cost Management: Budget tracking

---

## Support Contacts

### Azure Support
- Portal: https://portal.azure.com
- Support tickets: Azure Portal > Help + Support

### Terraform Support
- Documentation: https://www.terraform.io/docs
- Registry: https://registry.terraform.io
- Community: https://discuss.hashicorp.com

---

## Version History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-15 | 2.0.0 | Major fixes: provider updates, AKS config, naming, PostgreSQL DNS | Infrastructure Team |
| Previous | 1.0.0 | Initial configuration | Infrastructure Team |

---

## Next Steps

1. **Review Configuration:** Examine all fixes in FIXES_APPLIED.md
2. **Set Variables:** Update terraform.tfvars for your environment
3. **Run Validation:** Execute ./validate.sh
4. **Test Plan:** Run terraform plan and review output
5. **Deploy:** Run terraform apply
6. **Verify:** Follow post-deployment checklist
7. **Document:** Record any environment-specific notes
8. **Monitor:** Set up alerts and dashboards
9. **Test:** Verify all services are working
10. **Celebrate:** Infrastructure deployed successfully! 🎉
