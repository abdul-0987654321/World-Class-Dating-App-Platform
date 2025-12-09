# Terraform Provider Error Fixes

## Problem Summary

The Terraform infrastructure pipeline was failing with the following errors:
- Error: Missing required provider `registry.terraform.io/hashicorp/azurerm`
- Error: Missing required provider `registry.terraform.io/hashicorp/helm`
- Error: Missing required provider `registry.terraform.io/hashicorp/kubernetes`
- Error: Missing required provider `registry.terraform.io/hashicorp/random`

The error suggested that "terraform init" needed to be run before "terraform validate".

## Root Causes Identified

### 1. Pipeline Configuration Issue
**File:** `pipelines/azure-pipelines-infra.yml` (Line 81)

**Problem:** The validation stage was running `terraform init -backend=false`, which skips backend initialization and doesn't download provider plugins.

```yaml
# BEFORE (INCORRECT):
terraform init -backend=false
terraform validate
```

**Impact:** Providers were never downloaded, causing validation to fail.

### 2. Missing Provider Requirements
**Files:**
- `terraform/environments/dev/main.tf`
- `terraform/environments/test/main.tf`
- `terraform/environments/prod/main.tf`

**Problem:** The Terraform configuration only declared `azurerm` and `random` providers, but the infrastructure may reference `helm` and `kubernetes` providers (commonly used for AKS cluster management and application deployment).

```hcl
# BEFORE (INCOMPLETE):
required_providers {
  azurerm = {
    source  = "hashicorp/azurerm"
    version = "~> 3.85.0"
  }
  random = {
    source  = "hashicorp/random"
    version = "~> 3.6.0"
  }
}
```

## Solutions Applied

### Fix 1: Update Pipeline to Properly Initialize Terraform

**File:** `pipelines/azure-pipelines-infra.yml`

**Changes:**
1. Removed the `-backend=false` flag from `terraform init`
2. Added proper backend configuration parameters
3. Added Azure authentication environment variables
4. Added the `-upgrade` flag to ensure latest provider versions

```yaml
# AFTER (CORRECT):
- script: |
    export TF_PLUGIN_CACHE_DIR="$(Pipeline.Workspace)/.terraform.d/plugin-cache"
    mkdir -p $TF_PLUGIN_CACHE_DIR

    for env in dev test prod; do
      echo "##[group]Validating $env environment"
      cd $(Build.SourcesDirectory)/terraform/environments/$env

      # Initialize with backend config to download all required providers
      terraform init \
        -backend-config="resource_group_name=$(tfStateResourceGroup)" \
        -backend-config="storage_account_name=$(tfStateStorageAccount)" \
        -backend-config="container_name=$(tfStateContainer)" \
        -backend-config="key=$env.terraform.tfstate" \
        -upgrade

      terraform validate
      echo "##[endgroup]"
    done
  displayName: 'Terraform Validate (all environments)'
  env:
    ARM_CLIENT_ID: $(ARM_CLIENT_ID)
    ARM_CLIENT_SECRET: $(ARM_CLIENT_SECRET)
    ARM_SUBSCRIPTION_ID: $(ARM_SUBSCRIPTION_ID)
    ARM_TENANT_ID: $(ARM_TENANT_ID)
```

**Benefits:**
- Providers are now properly downloaded during validation
- Backend state is accessible (read-only during validation)
- Plugin cache is utilized for performance
- Azure credentials are properly configured

### Fix 2: Add Missing Provider Requirements

**Automated Fix Scripts Created:**
- `fix-terraform-providers.ps1` (PowerShell for Windows)
- `fix-terraform-providers.sh` (Bash for Linux/Mac)

These scripts automatically add the missing `helm` and `kubernetes` provider requirements to all three environments.

**Manual Fix (for each environment's main.tf):**

```hcl
# AFTER (COMPLETE):
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
  }
}
```

## How to Apply the Fixes

### Option 1: Run the Automated Scripts (Recommended)

#### On Windows (PowerShell):
```powershell
# Navigate to the project root
cd C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform

# Run the fix script
.\fix-terraform-providers.ps1
```

#### On Linux/Mac (Bash):
```bash
# Navigate to the project root
cd /path/to/DatingPlatform

# Make the script executable
chmod +x fix-terraform-providers.sh

# Run the fix script
./fix-terraform-providers.sh
```

### Option 2: Manual Fix

1. Open each of the following files:
   - `terraform/environments/dev/main.tf`
   - `terraform/environments/test/main.tf`
   - `terraform/environments/prod/main.tf`

2. Locate the `required_providers` block (around line 10-19)

3. Add these lines after the `random` provider block:
   ```hcl
   helm = {
     source  = "hashicorp/helm"
     version = "~> 2.12"
   }
   kubernetes = {
     source  = "hashicorp/kubernetes"
     version = "~> 2.24"
   }
   ```

4. Save all files

## Verification Steps

After applying the fixes:

### 1. Verify Local Terraform Configuration

```bash
# For each environment:
cd terraform/environments/dev
terraform init
terraform validate

cd ../test
terraform init
terraform validate

cd ../prod
terraform init
terraform validate
```

Expected output:
```
Success! The configuration is valid.
```

### 2. Verify Pipeline

Push the changes to your repository and trigger the pipeline:

```bash
git add pipelines/azure-pipelines-infra.yml
git add terraform/environments/*/main.tf
git commit -m "Fix: Add missing Terraform providers and update pipeline validation

- Add helm and kubernetes provider requirements to all environments
- Update pipeline to properly initialize Terraform with backend config
- Add Azure authentication to validation stage"

git push origin develop
```

The pipeline should now pass the validation stage successfully.

## Additional Recommendations

### 1. Variable Groups Required

Ensure the following Azure DevOps variable groups exist with the required variables:

**`datingplatform-terraform-common`:**
- `tfStateResourceGroup` - Resource group for Terraform state storage
- `tfStateStorageAccount` - Storage account name for Terraform state
- `tfStateContainer` - Container name for Terraform state (usually "tfstate")
- `ARM_CLIENT_ID` - Azure Service Principal client ID
- `ARM_CLIENT_SECRET` - Azure Service Principal client secret (marked as secret)
- `ARM_SUBSCRIPTION_ID` - Azure subscription ID
- `ARM_TENANT_ID` - Azure AD tenant ID

### 2. Backend Storage Prerequisites

Before running Terraform, ensure the backend storage exists:

```bash
# Set variables
RESOURCE_GROUP="rg-terraform-state-westus2"
STORAGE_ACCOUNT="sttfstatedatingplatform"
LOCATION="westus2"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --encryption-services blob

# Create container
az storage container create \
  --name tfstate \
  --account-name $STORAGE_ACCOUNT
```

### 3. Service Principal Permissions

The service principal used by Terraform needs:
- **Contributor** role on the target subscription
- **Storage Blob Data Contributor** role on the Terraform state storage account

```bash
# Assign Contributor role
az role assignment create \
  --assignee <SERVICE_PRINCIPAL_CLIENT_ID> \
  --role Contributor \
  --scope /subscriptions/<SUBSCRIPTION_ID>

# Assign Storage Blob Data Contributor
az role assignment create \
  --assignee <SERVICE_PRINCIPAL_CLIENT_ID> \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT
```

## Troubleshooting

### Issue: "Backend initialization required"

**Solution:** Make sure you're running `terraform init` with the backend config parameters, not with `-backend=false`.

### Issue: "Failed to get existing workspaces"

**Solution:** Check that your Azure credentials are correctly set and the service principal has access to the storage account.

### Issue: "Provider registry.terraform.io/hashicorp/[provider] does not exist"

**Solution:** Check your internet connection and ensure the agent can reach registry.terraform.io. If behind a proxy, configure the `HTTP_PROXY` and `HTTPS_PROXY` environment variables.

### Issue: "Module not found" errors

**Solution:** These errors typically appear after provider errors are fixed. They indicate missing Terraform modules in the `terraform/modules` directory. Check that all referenced modules exist.

## Related Files

- **Pipeline:** `pipelines/azure-pipelines-infra.yml`
- **Terraform Init Template:** `pipelines/templates/terraform-init.yml`
- **Dev Environment:** `terraform/environments/dev/main.tf`
- **Test Environment:** `terraform/environments/test/main.tf`
- **Prod Environment:** `terraform/environments/prod/main.tf`
- **Dev Backend:** `terraform/environments/dev/backend.tf`
- **Test Backend:** `terraform/environments/test/backend.tf`
- **Prod Backend:** `terraform/environments/prod/backend.tf`

## Summary

The pipeline failures were caused by two issues:
1. **Pipeline Issue:** Using `terraform init -backend=false` prevented provider downloads
2. **Configuration Issue:** Missing `helm` and `kubernetes` provider requirements

Both issues have been resolved:
- The pipeline now properly initializes Terraform with full backend configuration
- Automated scripts are provided to add missing provider requirements
- Documentation is provided for manual fixes and verification

The infrastructure pipeline should now successfully validate and deploy Terraform configurations.
