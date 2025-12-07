# Azure DevOps Variable Groups Configuration

This document describes the variable groups required for Terraform infrastructure deployment.

## Overview

The DatingPlatform infrastructure pipelines use the following variable groups:
- `datingplatform-terraform-common` - Shared variables across all environments
- `datingplatform-terraform-dev` - Development environment variables
- `datingplatform-terraform-test` - Test environment variables
- `datingplatform-terraform-prod` - Production environment variables

## Variable Group: datingplatform-terraform-common

Shared variables used across all environments.

| Variable | Value | Secret |
|----------|-------|--------|
| `ARM_SUBSCRIPTION_ID` | `ebd1613e-fea0-4b6d-8918-7e4de6a71c44` | No |
| `ARM_TENANT_ID` | `<your-tenant-id>` | No |
| `TERRAFORM_STORAGE_ACCOUNT` | `sttfstatedatingplatform` | No |
| `TERRAFORM_CONTAINER_NAME` | `tfstate` | No |
| `TERRAFORM_RESOURCE_GROUP` | `rg-terraform-state-westus2` | No |
| `TF_VERSION` | `1.6.6` | No |

### Create via Azure CLI

```bash
az pipelines variable-group create \
  --name "datingplatform-terraform-common" \
  --org "https://dev.azure.com/citadelcloudmanagement" \
  --project "DatingPlatform" \
  --variables \
    ARM_SUBSCRIPTION_ID="ebd1613e-fea0-4b6d-8918-7e4de6a71c44" \
    ARM_TENANT_ID="<your-tenant-id>" \
    TERRAFORM_STORAGE_ACCOUNT="sttfstatedatingplatform" \
    TERRAFORM_CONTAINER_NAME="tfstate" \
    TERRAFORM_RESOURCE_GROUP="rg-terraform-state-westus2" \
    TF_VERSION="1.6.6"
```

## Variable Group: datingplatform-terraform-dev

Development environment specific variables.

| Variable | Value | Secret |
|----------|-------|--------|
| `ARM_CLIENT_ID` | `<dev-sp-client-id>` | No |
| `ARM_CLIENT_SECRET` | `<dev-sp-secret>` | **Yes** |
| `TF_ENVIRONMENT` | `dev` | No |
| `TF_WORKING_DIR` | `terraform/environments/dev` | No |

### Create via Azure CLI

```bash
az pipelines variable-group create \
  --name "datingplatform-terraform-dev" \
  --org "https://dev.azure.com/citadelcloudmanagement" \
  --project "DatingPlatform" \
  --variables \
    ARM_CLIENT_ID="<dev-sp-client-id>" \
    TF_ENVIRONMENT="dev" \
    TF_WORKING_DIR="terraform/environments/dev"

# Add secret separately
az pipelines variable-group variable create \
  --group-id <group-id> \
  --name "ARM_CLIENT_SECRET" \
  --value "<dev-sp-secret>" \
  --secret true \
  --org "https://dev.azure.com/citadelcloudmanagement" \
  --project "DatingPlatform"
```

## Variable Group: datingplatform-terraform-test

Test environment specific variables.

| Variable | Value | Secret |
|----------|-------|--------|
| `ARM_CLIENT_ID` | `<test-sp-client-id>` | No |
| `ARM_CLIENT_SECRET` | `<test-sp-secret>` | **Yes** |
| `TF_ENVIRONMENT` | `test` | No |
| `TF_WORKING_DIR` | `terraform/environments/test` | No |

## Variable Group: datingplatform-terraform-prod

Production environment specific variables.

| Variable | Value | Secret |
|----------|-------|--------|
| `ARM_CLIENT_ID` | `<prod-sp-client-id>` | No |
| `ARM_CLIENT_SECRET` | `<prod-sp-secret>` | **Yes** |
| `TF_ENVIRONMENT` | `prod` | No |
| `TF_WORKING_DIR` | `terraform/environments/prod` | No |

## Service Connection Configuration

Create an Azure Resource Manager service connection named `azure-terraform-connection`:

1. Go to **Project Settings** → **Service connections**
2. Click **New service connection**
3. Select **Azure Resource Manager**
4. Choose **Service principal (manual)**
5. Configure:
   - Subscription ID: `ebd1613e-fea0-4b6d-8918-7e4de6a71c44`
   - Subscription Name: `DatingPlatform`
   - Service Principal Id: `<client-id of applyplatform-terraform-sp>`
   - Service Principal Key: `<client-secret>`
   - Tenant ID: `<your-tenant-id>`
6. Name: `azure-terraform-connection`

## Environment Configuration

Create environments with appropriate approval gates:

### Development Environment

```bash
# No approvals required - auto-deploy
az pipelines environment create \
  --name "datingplatform-dev" \
  --org "https://dev.azure.com/citadelcloudmanagement" \
  --project "DatingPlatform"
```

### Test Environment

```bash
# Optional approvals
az pipelines environment create \
  --name "datingplatform-test" \
  --org "https://dev.azure.com/citadelcloudmanagement" \
  --project "DatingPlatform"
```

### Production Environment

Configure manual approval in Azure DevOps UI:

1. Go to **Pipelines** → **Environments**
2. Click on `datingplatform-prod`
3. Click the three dots menu → **Approvals and checks**
4. Add **Approvals**
5. Add required approvers

## Security Best Practices

1. **Use Key Vault for secrets**: Link variable groups to Azure Key Vault
2. **Limit access**: Only grant access to required pipelines
3. **Audit regularly**: Review variable group access and values
4. **Rotate secrets**: Regularly rotate service principal secrets
5. **Separate credentials**: Use different service principals per environment

## Linking Variable Groups to Key Vault

For enhanced security, link secrets to Azure Key Vault:

```bash
az pipelines variable-group create \
  --name "datingplatform-terraform-secrets" \
  --org "https://dev.azure.com/citadelcloudmanagement" \
  --project "DatingPlatform" \
  --authorize true \
  --variables \
    ARM_CLIENT_SECRET="$(ARM_CLIENT_SECRET_FROM_KV)"
```

## Troubleshooting

### Common Issues

1. **Authentication failures**
   - Verify service principal credentials
   - Check ARM environment variables are set
   - Ensure service principal has required permissions

2. **Variable not found**
   - Verify variable group is linked to pipeline
   - Check variable name matches exactly (case-sensitive)

3. **Permission denied**
   - Grant pipeline access to variable group
   - Verify service principal RBAC assignments

### Verify Service Principal

```bash
az ad sp show --id <client-id>
az role assignment list --assignee <client-id> --subscription "ebd1613e-fea0-4b6d-8918-7e4de6a71c44"
```
