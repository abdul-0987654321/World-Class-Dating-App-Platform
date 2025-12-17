# Azure Cost Management - Implementation Summary

## Overview

This directory contains Azure-specific cost management configurations that complement the Terraform module implementation. These files provide alternative deployment methods and additional cost control capabilities.

## Files in This Directory

### 1. budget-alerts.json
**Purpose:** Azure Resource Manager (ARM) template for budget alerts

**Use Case:**
- Deploy budgets without Terraform
- Quick budget setup via Azure Portal
- CI/CD pipeline integration
- Template-based deployments

**Deployment:**
```bash
# Via Azure CLI
az deployment sub create \
  --location eastus \
  --template-file budget-alerts.json \
  --parameters \
    environment=prod \
    notificationEmails='["devops@flamoral.com","finance@flamoral.com"]' \
    overallBudget=2500 \
    computeBudget=600 \
    storageBudget=200 \
    networkingBudget=400 \
    databaseBudget=800

# Via Azure Portal
# Upload budget-alerts.json as custom deployment template
```

**Features:**
- 5 separate budgets (overall, compute, storage, networking, database)
- 4-tier alerting (50%, 75%, 90%, 100%)
- Email and role-based notifications
- Forecasted spending alerts

### 2. cost-tags-policy.json
**Purpose:** Azure Policy definition for cost allocation tagging

**Use Case:**
- Enforce required tags on all resources
- Ensure cost allocation compliance
- Tag inheritance from resource groups
- Audit non-compliant resources

**Deployment:**
```bash
# Create policy definition
az policy definition create \
  --name flamoral-cost-tags \
  --mode Indexed \
  --rules cost-tags-policy.json \
  --params '{"effect":{"type":"String","allowedValues":["Audit","Deny"],"defaultValue":"Audit"}}'

# Assign to production (Deny mode)
az policy assignment create \
  --name flamoral-cost-tags-prod \
  --policy flamoral-cost-tags \
  --scope /subscriptions/<sub-id>/resourceGroups/flamoral-prod-rg \
  --params '{"effect":{"value":"Deny"}}'

# Assign to staging/dev (Audit mode)
az policy assignment create \
  --name flamoral-cost-tags-staging \
  --policy flamoral-cost-tags \
  --scope /subscriptions/<sub-id>/resourceGroups/flamoral-staging-rg \
  --params '{"effect":{"value":"Audit"}}'
```

**Required Tags:**
- `Environment`: dev, staging, prod, shared
- `Service`: Service name (e.g., flamoral-platform)
- `Team`: Owning team (e.g., platform, backend, frontend)
- `CostCenter`: Billing department (e.g., engineering)
- `BillingOwner`: Accountable person/team (optional)
- `ManagedBy`: Provisioning method (e.g., terraform)

**Features:**
- Tag requirement enforcement
- Tag value validation
- Tag inheritance from resource groups
- System resource exemptions

### 3. setup-cost-export.sh
**Purpose:** Automated setup of Azure Cost Management export

**Use Case:**
- Configure daily/weekly/monthly cost data exports
- Export cost data to storage for analysis
- Power BI integration
- Custom reporting and analytics

**Usage:**
```bash
# Production daily export
./setup-cost-export.sh \
  -s <subscription-id> \
  -r flamoral-prod-rg \
  -a flamoralcostexpprod \
  -f Daily

# Staging weekly export
./setup-cost-export.sh \
  -s <subscription-id> \
  -r flamoral-staging-rg \
  -a flamoralcostexpstaging \
  -f Weekly

# Download exported data
az storage blob list \
  --account-name flamoralcostexpprod \
  --container-name cost-exports \
  --output table

az storage blob download \
  --account-name flamoralcostexpprod \
  --container-name cost-exports \
  --name <export-file.csv> \
  --file monthly-costs.csv
```

**Features:**
- Automated export creation
- Daily/Weekly/Monthly schedules
- CSV format for easy analysis
- Helper scripts for download

### 4. deploy-frontdoor-routes.sh / .ps1
**Purpose:** Front Door routing configuration (included for reference)

**Note:** Not directly cost-related, but Front Door is a major cost component (~$325/month).

## Implementation Strategy

### Terraform-First Approach (Recommended)

**Pros:**
- Infrastructure as Code
- Version controlled
- Automated deployments
- State management
- Easier to maintain

**Cons:**
- Some features not available in Terraform (cost exports)
- Requires Terraform knowledge

**Use:**
```bash
cd infrastructure/terraform/environments/prod
terraform init
terraform plan -target=module.cost_management
terraform apply -target=module.cost_management
```

### ARM Template Approach

**Pros:**
- Native Azure format
- Portal deployment support
- No additional tools required
- Quick one-off deployments

**Cons:**
- Less maintainable at scale
- No state management
- Harder to version control
- Manual updates required

**Use:**
```bash
az deployment sub create \
  --location eastus \
  --template-file budget-alerts.json \
  --parameters @parameters.json
```

### Hybrid Approach (Production Recommended)

**Core Infrastructure:** Terraform
- Resource groups, networking, compute, storage
- Main cost management module
- Infrastructure-level budgets

**Supplemental Controls:** Azure CLI/Portal
- Cost exports (not available in Terraform)
- Azure Policy assignments
- Ad-hoc budget adjustments
- Manual optimizations

## Quick Start Guide

### 1. Deploy via Terraform (Recommended)

```bash
# Navigate to environment
cd infrastructure/terraform/environments/prod

# Review configuration
cat terraform.tfvars

# Update cost management variables
cat >> terraform.tfvars << EOF
enable_cost_management = true
cost_notification_emails = ["devops@flamoral.com", "finance@flamoral.com"]
overall_monthly_budget = 2500
EOF

# Deploy
terraform init
terraform apply -target=module.cost_management
```

### 2. Configure Cost Export

```bash
# Get storage account from Terraform output
STORAGE_ACCOUNT=$(terraform output -json | jq -r '.cost_management.value.cost_export_storage_account_name')

# Run setup script
cd ../../azure
./setup-cost-export.sh \
  -s <subscription-id> \
  -r flamoral-prod-rg \
  -a $STORAGE_ACCOUNT \
  -f Daily
```

### 3. Deploy Tagging Policy

```bash
# Create and assign policy
az policy definition create \
  --name flamoral-cost-tags \
  --mode Indexed \
  --rules cost-tags-policy.json

az policy assignment create \
  --name flamoral-cost-tags-prod \
  --policy flamoral-cost-tags \
  --scope /subscriptions/<sub-id>/resourceGroups/flamoral-prod-rg \
  --params '{"effect":{"value":"Deny"}}'
```

### 4. Verify Deployment

```bash
# List budgets
az consumption budget list --subscription <sub-id> --output table

# Check action groups
az monitor action-group list --resource-group flamoral-prod-rg --output table

# Verify policy compliance
az policy state list \
  --policy-assignment flamoral-cost-tags-prod \
  --output table
```

### 5. Generate Cost Report

```bash
cd ../../../scripts
./check-cost-recommendations.sh -o markdown -f initial-report.md
```

## Cost Breakdown by Component

### Azure Front Door
- **Current:** Premium tier - $325/month
- **Optimization:** Review WAF rules, optimize routing
- **Reserved Instance:** Not available

### Azure Kubernetes Service
- **Current:** 2-4 nodes Standard_D2s_v3 - ~$150-300/month
- **Optimization:** Use autoscaling, reserved instances
- **Reserved Instance:** 29% savings with 1-year, 50% with 3-year

### PostgreSQL Flexible Server
- **Current:** GP_Standard_D4s_v3 - $365/month
- **Optimization:** Burstable tier for non-prod, read replicas
- **Reserved Instance:** 35% savings with 1-year, 50% with 3-year

### Redis Cache
- **Current:** Premium P1 - $411/month
- **Optimization:** Right-size based on usage, Standard tier for non-prod
- **Reserved Instance:** 35% savings with 1-year, 50% with 3-year

### Container Registry
- **Current:** Premium (shared) - $450/month
- **Optimization:** Clean up old images, consider Basic for non-prod
- **Reserved Instance:** Not available

### Storage & CosmosDB
- **Current:** ~$65/month
- **Optimization:** Lifecycle policies, Cool/Archive tiers
- **Reserved Instance:** Available for CosmosDB

### Monitoring & Logs
- **Current:** ~$30/month
- **Optimization:** Reduce retention, filter logs
- **Reserved Instance:** Not available

**Total Monthly Cost (Production):** ~$2,400-2,500

## Cost Optimization Checklist

### Immediate Actions (No Disruption)

- [ ] Deploy budget alerts (this repository)
- [ ] Enable cost export for analysis
- [ ] Apply required cost allocation tags
- [ ] Clean up unused resources (disks, IPs)
- [ ] Delete old container images
- [ ] Review Azure Advisor recommendations

**Estimated Savings:** $50-100/month

### Short-Term Actions (1-3 months)

- [ ] Purchase 1-year reserved instances for AKS (2 nodes)
- [ ] Purchase 3-year reserved capacity for PostgreSQL
- [ ] Implement storage lifecycle policies
- [ ] Optimize Front Door routing and caching
- [ ] Right-size underutilized resources
- [ ] Auto-shutdown non-production environments

**Estimated Savings:** $500-800/month

### Long-Term Actions (3-12 months)

- [ ] Evaluate 3-year reserved instances for all stable workloads
- [ ] Migrate appropriate workloads to serverless
- [ ] Implement comprehensive auto-scaling
- [ ] Review and optimize database queries
- [ ] Consider multi-region cost optimization
- [ ] Negotiate Enterprise Agreement with Microsoft

**Estimated Savings:** $1,000-1,500/month

## Monitoring & Reporting

### Daily
- Automated cost anomaly detection
- Budget alert monitoring

### Weekly
```bash
./scripts/check-cost-recommendations.sh -o markdown -f weekly-report.md
```

### Monthly
- Budget vs. actual analysis
- Cost allocation by team/service
- Reserved instance utilization review
- Optimization recommendations implementation

### Quarterly
- Reserved instance renewal decisions
- Budget forecast updates
- Strategic cost optimization planning

## Support & Documentation

### Internal Resources
- **Comprehensive Guide:** `COST_MANAGEMENT_GUIDE.md`
- **Terraform Module:** `infrastructure/terraform/modules/cost-management/`
- **Scripts:** `scripts/check-cost-recommendations.sh`
- **PowerShell Tools:** `infrastructure/cost-control/scripts/`

### Azure Resources
- [Cost Management Portal](https://portal.azure.com/#view/Microsoft_Azure_CostManagement/Menu/~/overview)
- [Azure Advisor](https://portal.azure.com/#view/Microsoft_Azure_Expert/AdvisorMenuBlade/~/Cost)
- [Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)
- [Reserved Instances](https://portal.azure.com/#view/Microsoft_Azure_Reservations/ReservationsBrowseBlade)

### Contact
- **DevOps Team:** devops@flamoral.com
- **Finance Questions:** finance@flamoral.com
- **Azure Support:** [Portal Support](https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade)

## Version History

- **v1.0.0** (2024-12-13): Initial cost management implementation
  - Terraform module with budgets and alerts
  - ARM templates for alternative deployment
  - Cost export automation
  - Tagging policy enforcement
  - Comprehensive documentation

---

**Maintained By:** Platform/DevOps Team
**Last Updated:** 2024-12-13
**Next Review:** 2025-01-13
