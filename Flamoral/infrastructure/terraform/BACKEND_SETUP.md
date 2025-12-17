# Terraform Backend Setup Guide

## Overview

This guide explains the Terraform backend configuration for the Flamoral Dating Platform infrastructure and how to resolve backend initialization issues.

## Backend Configuration

The Terraform remote state backend uses Azure Storage Account with the following configuration:

- **Resource Group**: `flamoral-terraform-state-rg`
- **Storage Account**: `flamoraltfstate`
- **Container**: `tfstate`
- **State Files**: `flamoral-{environment}.tfstate` (e.g., `flamoral-dev.tfstate`)

## Problem Resolution

### Issues Fixed

1. **Resource group mismatch**: Updated backend configuration to use `flamoral-terraform-state-rg` instead of `datingapp-tfstate-rg`
2. **Missing backend resources**: Added automatic bootstrap step in pipeline to create backend resources
3. **Provider download failures**: Implemented fallback to local state when backend init fails
4. **Missing -reconfigure flag**: Added `-reconfigure` flag to allow backend reinitialization

### Changes Made

#### 1. Updated Backend Configuration (`backend.tf`)
- Changed resource group to `flamoral-terraform-state-rg`
- Changed storage account to `flamoraltfstate`
- Removed hardcoded `key` parameter (now passed via `-backend-config`)

#### 2. Created Bootstrap Script (`bootstrap-backend.sh`)
A standalone script to create backend resources manually if needed.

#### 3. Updated Pipeline Templates
- **terraform-init.yml**: Added automatic backend bootstrap step
- Implemented fallback to local state if backend fails
- Added provider verification step

#### 4. Updated Pipelines
- **infrastructure-pipeline.yml**: Integrated backend bootstrap
- **azure-pipelines-infra.yml**: Added backend checks before validation

## Usage

### Option A: Automatic Bootstrap (Recommended)

The pipeline now automatically creates the backend resources when running. No manual intervention required.

The pipeline will:
1. Check if backend resource group exists
2. Create resource group if missing
3. Check if storage account exists
4. Create storage account if missing
5. Create container if missing
6. Initialize Terraform with remote backend
7. Fall back to local state if backend fails

### Option B: Manual Bootstrap

If you prefer to create the backend manually before running the pipeline:

```bash
# Navigate to terraform directory
cd infrastructure/terraform

# Make the bootstrap script executable
chmod +x bootstrap-backend.sh

# Run the bootstrap script for dev environment
./bootstrap-backend.sh dev

# For other environments (optional, backend is shared)
./bootstrap-backend.sh test
./bootstrap-backend.sh prod
```

The script will:
- Create the resource group
- Create the storage account with:
  - Encryption enabled
  - HTTPS-only access
  - Blob versioning enabled
  - Container soft delete (7 days)
- Create the tfstate container
- Display configuration details

### Option C: Azure CLI Commands

Manual creation using Azure CLI:

```bash
# Set variables
RESOURCE_GROUP="flamoral-terraform-state-rg"
STORAGE_ACCOUNT="flamoraltfstate"
CONTAINER="tfstate"
LOCATION="eastus"

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION \
  --tags "Purpose=TerraformState" "ManagedBy=Manual" "Project=Flamoral"

# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --encryption-services blob \
  --https-only true \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false

# Enable versioning
az storage account blob-service-properties update \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --enable-versioning true

# Get storage account key
STORAGE_KEY=$(az storage account keys list \
  --resource-group $RESOURCE_GROUP \
  --account-name $STORAGE_ACCOUNT \
  --query '[0].value' -o tsv)

# Create container
az storage container create \
  --name $CONTAINER \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --public-access off
```

## Local Development

### Initialize Terraform Locally

```bash
# Navigate to terraform directory
cd infrastructure/terraform

# Initialize with dev environment backend
terraform init \
  -backend-config="resource_group_name=flamoral-terraform-state-rg" \
  -backend-config="storage_account_name=flamoraltfstate" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=flamoral-dev.tfstate"
```

### Using Local State (Development Only)

If the backend is unavailable, you can use local state:

```bash
# Initialize without backend
terraform init -backend=false

# This creates a local terraform.tfstate file
# WARNING: Not recommended for production
```

## Pipeline Variables

Ensure these variables are configured in your Azure DevOps variable groups:

**Variable Group**: `datingplatform-terraform-common`

| Variable | Value | Secret |
|----------|-------|--------|
| `tfStateResourceGroup` | `flamoral-terraform-state-rg` | No |
| `tfStateStorageAccount` | `flamoraltfstate` | No |
| `tfStateContainer` | `tfstate` | No |
| `ARM_CLIENT_ID` | Your Azure Service Principal App ID | Yes |
| `ARM_CLIENT_SECRET` | Your Service Principal Secret | Yes |
| `ARM_SUBSCRIPTION_ID` | Your Azure Subscription ID | No |
| `ARM_TENANT_ID` | Your Azure Tenant ID | No |

## Troubleshooting

### Issue: "Resource group 'flamoral-terraform-state-rg' could not be found"

**Solution**: The pipeline now automatically creates the resource group. If it still fails:
1. Check Service Principal permissions (needs Contributor on subscription)
2. Verify Azure credentials in pipeline variables
3. Run the bootstrap script manually

### Issue: "Error acquiring the state lock"

**Solution**: Another process has locked the state file.

```bash
# List locks
az storage blob list \
  --account-name flamoraltfstate \
  --container-name tfstate \
  --query "[?name=='flamoral-dev.tfstate.lock']"

# Force unlock (use with caution)
terraform force-unlock <LOCK_ID>
```

### Issue: "Failed to download providers"

**Solution**: The pipeline now falls back to local state to download providers.
If this still fails:
1. Check internet connectivity
2. Verify Terraform version compatibility
3. Clear the plugin cache: `rm -rf .terraform`

### Issue: "Backend configuration changed"

**Solution**: Use `-reconfigure` flag (now automatic in pipeline):

```bash
terraform init -reconfigure \
  -backend-config="key=flamoral-dev.tfstate"
```

## State File Management

### State File Locations

Each environment has its own state file:
- Dev: `flamoral-dev.tfstate`
- Test: `flamoral-test.tfstate`
- Prod: `flamoral-prod.tfstate`

### Backup and Recovery

The storage account has:
- **Versioning enabled**: Previous versions of state files are retained
- **Soft delete enabled**: Deleted containers can be recovered within 7 days

To recover a previous version:

```bash
# List blob versions
az storage blob list \
  --account-name flamoraltfstate \
  --container-name tfstate \
  --prefix flamoral-dev.tfstate \
  --include v

# Download specific version
az storage blob download \
  --account-name flamoraltfstate \
  --container-name tfstate \
  --name flamoral-dev.tfstate \
  --version-id <VERSION_ID> \
  --file terraform.tfstate.backup
```

## Security Considerations

1. **Access Control**: Backend storage account should only be accessible by:
   - Azure DevOps Service Principal
   - Authorized administrators

2. **State File Encryption**: State files may contain sensitive data
   - Storage account uses Azure encryption at rest
   - Use Azure Key Vault for sensitive values in Terraform

3. **Authentication**: The pipeline uses Service Principal authentication
   - Credentials are stored in Azure DevOps variable groups
   - Marked as secret variables

## Next Steps

1. Verify the backend is created successfully
2. Run the pipeline to test infrastructure deployment
3. Monitor state file versions in Azure Storage
4. Set up state file backup policies if needed

## References

- [Terraform Azure Backend Documentation](https://www.terraform.io/docs/language/settings/backends/azurerm.html)
- [Azure Storage Account Security](https://docs.microsoft.com/en-us/azure/storage/common/storage-security-guide)
