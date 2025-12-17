# Flamoral Dating Platform - Azure Infrastructure Deployment Guide

## Overview

This guide provides complete instructions for deploying the Flamoral Dating Platform infrastructure to Azure using Terraform across dev, staging, and production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Configuration Issues and Fixes](#configuration-issues-and-fixes)
4. [Environment Setup](#environment-setup)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment](#post-deployment)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

1. **Terraform** (>= 1.4.0)
   ```bash
   # Install Terraform
   # Windows (using Chocolatey):
   choco install terraform

   # macOS (using Homebrew):
   brew install terraform

   # Linux:
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

2. **Azure CLI** (>= 2.50.0)
   ```bash
   # Windows:
   winget install -e --id Microsoft.AzureCLI

   # macOS:
   brew install azure-cli

   # Linux:
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

3. **Git** (for cloning repository)

### Azure Requirements

- Azure Subscription: `ba233460-2dbe-4603-a594-68f93ec9deb3`
- Service Principal: `terraform-datingapp-sp`
  - Client ID: `a85e4029-4e37-4399-9390-6e18922b38e7`
  - You'll need the client secret (obtain from Azure Key Vault or Azure Portal)
- Tenant ID: `ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0`

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd DatingPlatform/infrastructure/terraform
```

### 2. Authenticate with Azure

```bash
# Login to Azure
az login

# Set the subscription
az account set --subscription ba233460-2dbe-4603-a594-68f93ec9deb3

# Verify subscription
az account show
```

### 3. Set Environment Variables

Create a `.env` file or export these variables:

```bash
# Service Principal Authentication
export ARM_CLIENT_ID="a85e4029-4e37-4399-9390-6e18922b38e7"
export ARM_CLIENT_SECRET="<your-service-principal-secret>"
export ARM_TENANT_ID="ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"
export ARM_SUBSCRIPTION_ID="ba233460-2dbe-4603-a594-68f93ec9deb3"
```

**Security Note:** Never commit the `.env` file or client secret to version control!

## Configuration Issues and Fixes

### Issues Identified and Resolved

1. **Variable Type Mismatch in dev.tfvars**
   - **Issue:** `vnet_address_space` was defined as string instead of list(string)
   - **Fix:** Updated to `vnet_address_space = ["10.10.0.0/16"]`
   - **Status:** ✅ FIXED

2. **Missing backend.tf for Staging and Production**
   - **Issue:** Only dev environment had backend.tf
   - **Fix:** Created backend.tf for staging and prod with appropriate storage account names
   - **Status:** ✅ FIXED

3. **Missing Configuration Files for Staging**
   - **Issue:** Staging only had tfvars files, missing main.tf, providers.tf, variables.tf, outputs.tf
   - **Fix:** Created complete configuration files for staging environment
   - **Status:** ✅ FIXED

4. **Duplicate terraform Block in Production**
   - **Issue:** Both backend.tf and providers.tf had terraform{} blocks
   - **Fix:** Backend configuration is now only in backend.tf
   - **Status:** ✅ FIXED

5. **Inconsistent Variable Files**
   - **Issue:** Multiple tfvars files with different variable names
   - **Fix:** Consolidated to single dev.tfvars with all required variables
   - **Status:** ✅ FIXED

### Backend Storage Configuration

Each environment uses separate storage accounts for state isolation:

| Environment | Storage Account        | Container | State File Name                    |
|-------------|------------------------|-----------|-------------------------------------|
| Dev         | flamoraltfstatedev     | tfstate   | dating-dev-rg.terraform.tfstate    |
| Staging     | flamoraltfstatestaging | tfstate   | flamoral-staging.terraform.tfstate |
| Production  | flamoraltfstateprod    | tfstate   | flamoral-prod.terraform.tfstate    |

## Environment Setup

### Create Backend Storage (One-Time Setup)

Before initializing Terraform for any environment, you must create the backend storage:

```bash
# For Development
./scripts/setup-backend.sh dev

# For Staging
./scripts/setup-backend.sh staging

# For Production
./scripts/setup-backend.sh prod
```

**What this script does:**
- Creates resource group `flamoral-tfstate-rg`
- Creates storage account for the environment
- Creates `tfstate` blob container
- Enables versioning and soft delete (30 days retention)
- Configures encryption and security settings

### Verify Backend Storage

```bash
# Check if storage account exists
az storage account list --resource-group flamoral-tfstate-rg --output table

# Verify container exists
az storage container list --account-name flamoraltfstatedev --auth-mode login --output table
```

## Deployment Steps

### Development Environment

```bash
cd environments/dev

# 1. Initialize Terraform (downloads providers, configures backend)
terraform init

# 2. Validate configuration
terraform validate

# 3. Format code (optional)
terraform fmt

# 4. Create execution plan
terraform plan -var-file="dev.tfvars" -out=tfplan

# 5. Review the plan carefully, then apply
terraform apply tfplan

# 6. View outputs
terraform output
```

### Using Deployment Scripts

Alternatively, use the provided deployment scripts:

```bash
# From terraform root directory

# Initialize
./scripts/deploy.sh dev init

# Validate
./scripts/deploy.sh dev validate

# Plan
./scripts/deploy.sh dev plan

# Apply
./scripts/deploy.sh dev apply

# View outputs
./scripts/deploy.sh dev output
```

### Staging Environment

```bash
cd environments/staging

terraform init
terraform plan -var-file="terraform.tfvars" -out=tfplan
terraform apply tfplan
```

Or using scripts:

```bash
./scripts/deploy.sh staging init
./scripts/deploy.sh staging plan
./scripts/deploy.sh staging apply
```

### Production Environment

**⚠️ PRODUCTION DEPLOYMENT - EXTRA CAUTION REQUIRED**

```bash
cd environments/prod

# Initialize
terraform init

# Plan with detailed output
terraform plan -var-file="terraform.tfvars" -out=tfplan

# Review the plan multiple times!
# Get approval from team lead/manager

# Apply
terraform apply tfplan
```

## Post-Deployment

### 1. Verify Resource Creation

```bash
# List all resources in the resource group
az resource list --resource-group Dating-dev-rg --output table

# Check AKS cluster
az aks list --resource-group Dating-dev-rg --output table

# Check PostgreSQL server
az postgres flexible-server list --resource-group Dating-dev-rg --output table
```

### 2. Get AKS Credentials

```bash
# Get kubeconfig for dev
az aks get-credentials --resource-group Dating-dev-rg --name flamoral-dev-aks

# Verify connection
kubectl get nodes
kubectl get namespaces
```

### 3. Retrieve Secrets

```bash
# Get Key Vault name
terraform output key_vault_name

# Get PostgreSQL password
az keyvault secret show --vault-name <vault-name> --name postgres-password --query value -o tsv

# Get Redis connection string
az keyvault secret show --vault-name <vault-name> --name redis-connection-string --query value -o tsv
```

### 4. Configure DNS (Production Only)

After deployment, update DNS records for `flamoral.com`:

```bash
# Get Application Gateway public IP
terraform output ingress_public_ip

# Update DNS A record to point to this IP
```

## Resource Inventory

### Development Environment Resources

| Resource Type              | Resource Name                 | Purpose                          |
|----------------------------|-------------------------------|----------------------------------|
| Resource Group             | Dating-dev-rg                 | Container for all resources      |
| Virtual Network            | flamoral-dev-vnet             | Network isolation                |
| AKS Cluster                | flamoral-dev-aks              | Kubernetes cluster               |
| Container Registry         | flamoraldevacr*               | Docker image storage             |
| PostgreSQL                 | flamoral-dev-postgres         | Primary database                 |
| Redis Cache                | flamoral-dev-redis            | Caching and sessions             |
| Storage Account            | flamoraldev*                  | Blob storage for media           |
| Key Vault                  | flamoral-dev-kv-*             | Secrets management               |
| Log Analytics Workspace    | flamoral-dev-logs             | Centralized logging              |
| Application Insights       | flamoral-dev-appinsights      | Application monitoring           |
| SignalR Service            | flamoral-dev-signalr          | Real-time messaging              |
| CDN Profile                | flamoral-dev-cdn              | Content delivery                 |

*Suffix added for global uniqueness

### Estimated Costs

**Development Environment:**
- AKS: ~$70/month (B4ms system node + D4s_v3 user node)
- PostgreSQL: ~$25/month (B1ms)
- Redis: ~$15/month (Basic C0)
- Storage: ~$5/month (LRS)
- Other services: ~$15/month
- **Total: ~$130/month**

**Staging Environment:**
- AKS: ~$300/month (D2s_v3 system nodes + D4s_v3 user nodes)
- PostgreSQL: ~$150/month (GP D4s_v3)
- Redis: ~$75/month (Standard C2)
- Storage: ~$15/month (GRS)
- **Total: ~$540/month**

**Production Environment:**
- AKS: ~$800/month (D4s_v3 system + D8s_v3 user nodes with autoscaling)
- PostgreSQL: ~$300/month (GP D4s_v3 with HA)
- Redis: ~$250/month (Premium P1)
- Storage: ~$30/month (GRS)
- Other services: ~$100/month
- **Total: ~$1,480/month**

## Troubleshooting

### Common Issues

#### 1. Backend Initialization Fails

**Error:** `Error: Failed to get existing workspaces: storage: service returned error: StatusCode=404`

**Solution:**
```bash
# Ensure backend storage is created
./scripts/setup-backend.sh dev

# Re-initialize
terraform init -reconfigure
```

#### 2. Authentication Errors

**Error:** `Error building AzureRM Client: Authorizer is not configured`

**Solution:**
```bash
# Verify environment variables are set
echo $ARM_CLIENT_ID
echo $ARM_TENANT_ID
echo $ARM_SUBSCRIPTION_ID

# Re-export if needed
export ARM_CLIENT_ID="a85e4029-4e37-4399-9390-6e18922b38e7"
export ARM_CLIENT_SECRET="<your-secret>"
export ARM_TENANT_ID="ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"
export ARM_SUBSCRIPTION_ID="ba233460-2dbe-4603-a594-68f93ec9deb3"
```

#### 3. Resource Already Exists

**Error:** `A resource with the ID ... already exists`

**Solution:**
```bash
# Import existing resource
terraform import azurerm_resource_group.dating_dev /subscriptions/<sub-id>/resourceGroups/Dating-dev-rg

# Or destroy and recreate
terraform destroy
terraform apply
```

#### 4. Quota Exceeded

**Error:** `Operation could not be completed as it results in exceeding approved quota`

**Solution:**
```bash
# Check current quotas
az vm list-usage --location westus2 --output table

# Request quota increase through Azure Portal
# Or reduce node counts in tfvars
```

#### 5. Terraform State Locked

**Error:** `Error: Error acquiring the state lock`

**Solution:**
```bash
# Force unlock (use with caution!)
terraform force-unlock <lock-id>

# Or wait for lock to expire (usually 15-20 minutes)
```

### Validation Checklist

Before running `terraform apply`:

- [ ] Correct environment variables are set
- [ ] Backend storage account exists
- [ ] Service Principal has necessary permissions
- [ ] Variable files are correct for the environment
- [ ] Plan output has been reviewed
- [ ] Team approval obtained (for staging/prod)
- [ ] Maintenance window scheduled (for prod)

### Rollback Procedure

If deployment fails:

```bash
# 1. Review error messages
terraform plan

# 2. If corruption, restore from state backup
cd <env-directory>
terraform state pull > backup.tfstate

# 3. Destroy problematic resources
terraform destroy -target=azurerm_resource.problematic_resource

# 4. Re-apply
terraform apply
```

## Security Best Practices

1. **Never commit secrets** - Use Azure Key Vault or environment variables
2. **Use service principal authentication** - Don't use personal credentials
3. **Enable state locking** - Prevent concurrent modifications
4. **Regular backups** - State file versioning is enabled
5. **Least privilege access** - Service principal should have minimal required permissions
6. **Separate environments** - Never share resources between dev/staging/prod
7. **Review plans carefully** - Always review terraform plan before apply
8. **Tag resources** - All resources are tagged for cost tracking and management

## Maintenance

### State Management

```bash
# List resources in state
terraform state list

# Show resource details
terraform state show azurerm_resource_group.dating_dev

# Move resource in state
terraform state mv source destination

# Remove resource from state (without destroying)
terraform state rm azurerm_resource.example
```

### Upgrading Providers

```bash
# Check for provider updates
terraform init -upgrade

# Update lock file
terraform providers lock
```

### Destroying Infrastructure

**⚠️ WARNING: This deletes all resources!**

```bash
# Development
terraform destroy -var-file="dev.tfvars"

# With confirmation
./scripts/deploy.sh dev destroy
```

## Additional Resources

- [Terraform Azure Provider Documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure CLI Reference](https://docs.microsoft.com/en-us/cli/azure/)
- [AKS Best Practices](https://docs.microsoft.com/en-us/azure/aks/best-practices)
- [PostgreSQL Flexible Server](https://docs.microsoft.com/en-us/azure/postgresql/flexible-server/)

## Support

For issues or questions:
1. Check this troubleshooting guide
2. Review Terraform plan output
3. Check Azure Portal for resource status
4. Review Application Insights logs
5. Contact DevOps team

---

**Last Updated:** 2025-12-11
**Version:** 1.0.0
**Maintained By:** DevOps Team
