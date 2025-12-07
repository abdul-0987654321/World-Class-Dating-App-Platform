# DatingPlatform Deployment Guide

## Prerequisites

Before deploying, ensure you have:

- **Azure CLI** >= 2.50.0
- **Terraform** >= 1.6.0
- **Azure DevOps** access to citadelcloudmanagement organization
- **Service Principal** credentials for `applyplatform-terraform-sp`

## Initial Setup

### 1. Bootstrap State Storage

Run the setup script to create the Terraform state storage:

```powershell
# Windows PowerShell
cd C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform
.\scripts\setup-backend.ps1
```

```bash
# Linux/macOS/WSL
cd /path/to/DatingPlatform
chmod +x scripts/setup-backend.sh
./scripts/setup-backend.sh
```

This creates:
- Resource Group: `rg-terraform-state-westus2`
- Storage Account: `sttfstatedatingplatform`
- Container: `tfstate`

### 2. Configure Service Principal

```powershell
# Windows PowerShell
.\scripts\configure-sp.ps1 -SetEnvironmentVariables
```

```bash
# Linux/macOS/WSL
./scripts/configure-sp.sh --set-env
```

Set environment variables:
```bash
export ARM_CLIENT_ID="<client-id>"
export ARM_CLIENT_SECRET="<client-secret>"
export ARM_SUBSCRIPTION_ID="ebd1613e-fea0-4b6d-8918-7e4de6a71c44"
export ARM_TENANT_ID="<tenant-id>"
```

### 3. Set Sensitive Variables

Create a local `terraform.tfvars.local` file (gitignored) or set environment variables:

```bash
export TF_VAR_sql_admin_password="YourSecurePassword123!"
export TF_VAR_tenant_id="<your-tenant-id>"
```

## Deployment Steps

### Deploy Development Environment

```bash
cd terraform/environments/dev

# Initialize Terraform
terraform init

# Review changes
terraform plan -out=dev.tfplan

# Apply changes
terraform apply dev.tfplan
```

### Deploy Test Environment

```bash
cd terraform/environments/test

terraform init
terraform plan -out=test.tfplan
terraform apply test.tfplan
```

### Deploy Production Environment

**⚠️ Production deployment requires extra caution!**

```bash
cd terraform/environments/prod

terraform init
terraform plan -out=prod.tfplan

# Review plan carefully
terraform show prod.tfplan

# Apply with explicit approval
terraform apply prod.tfplan
```

## CI/CD Pipeline Deployment

### Via Azure DevOps

1. Navigate to **Pipelines** in Azure DevOps
2. Select `azure-pipelines-infra.yml`
3. Run pipeline

Pipeline stages:
1. **Validate** - Format check, validate, security scan
2. **Deploy Dev** - Automatic on success
3. **Deploy Test** - Automatic after dev
4. **Deploy Prod** - Requires manual approval

### Variable Groups Setup

Create the following variable groups in Azure DevOps:

1. `datingplatform-terraform-common`
2. `datingplatform-terraform-dev`
3. `datingplatform-terraform-test`
4. `datingplatform-terraform-prod`

See `pipelines/variable-groups/README.md` for details.

## Post-Deployment Verification

### Verify Resources

```bash
# Check resource group exists
az group show --name rg-datingplatform-dev-westus2

# List all resources
az resource list --resource-group rg-datingplatform-dev-westus2 -o table
```

### Verify Outputs

```bash
cd terraform/environments/dev
terraform output
```

### Test Connectivity

```bash
# Test App Service URL
curl -I https://app-datingplatform-dev.azurewebsites.net

# Test SQL connectivity (from Azure)
az sql db show --resource-group rg-datingplatform-dev-westus2 \
  --server sql-datingplatform-dev-xxxx \
  --name sqldb-datingplatform-dev
```

## Rollback Procedures

### Terraform Rollback

```bash
# View state history
terraform state list

# Revert to previous state
terraform apply -target=module.resource_name -replace
```

### Full Environment Rollback

```bash
# Destroy environment (use with caution!)
# Requires explicit confirmation
terraform destroy
```

### Pipeline Rollback

Use the `azure-pipelines-destroy.yml` pipeline with approval gates.

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   ```bash
   # Re-authenticate
   az login --tenant citadelcloudmanagementgmail.onmicrosoft.com
   az account set --subscription ebd1613e-fea0-4b6d-8918-7e4de6a71c44
   ```

2. **State Lock Error**
   ```bash
   # Break state lock (use carefully!)
   terraform force-unlock <lock-id>
   ```

3. **Resource Already Exists**
   ```bash
   # Import existing resource
   terraform import module.resource_group.azurerm_resource_group.this /subscriptions/.../resourceGroups/...
   ```

4. **Insufficient Permissions**
   - Verify service principal RBAC assignments
   - Check variable group access in Azure DevOps

## Environment-Specific Notes

### Development
- Auto-shutdown may be enabled
- Resources can be destroyed freely
- Use for feature development and testing

### Test
- Mirror production configuration
- Used for QA and integration testing
- Approval may be required for some changes

### Production
- Resource locks prevent accidental deletion
- All changes require approval
- Detailed monitoring and alerting enabled

## Support

- **Repository**: https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform
- **Pipelines**: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build
- **Azure Portal**: https://portal.azure.com
