# Service Principal Setup Guide - Flamoral Platform

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Service Principal Architecture](#service-principal-architecture)
4. [Creating a New Service Principal](#creating-a-new-service-principal)
5. [Required Permissions and Roles](#required-permissions-and-roles)
6. [Generating and Rotating Client Secrets](#generating-and-rotating-client-secrets)
7. [Updating Azure DevOps Variable Groups](#updating-azure-devops-variable-groups)
8. [Security Best Practices](#security-best-practices)
9. [Troubleshooting](#troubleshooting)
10. [Automation Scripts](#automation-scripts)

---

## Overview

Service Principals (SPs) are Azure AD identities used to authenticate applications and automation tools with Azure services. The Flamoral platform uses Service Principals to enable secure, automated Terraform deployments across multiple environments.

### Why Service Principals?

- **Automated Authentication**: Enable CI/CD pipelines to deploy infrastructure without user interaction
- **Granular Permissions**: Assign specific RBAC roles for least-privilege access
- **Credential Management**: Centralized secret management and rotation
- **Audit Trail**: Track all actions performed by the service principal

### Service Principals Used by Flamoral

The platform uses the following service principal:

| Name | Purpose | Environments | Subscription |
|------|---------|--------------|--------------|
| `applyplatform-terraform-sp` | Terraform infrastructure deployment | Dev, Test, Prod | ebd1613e-fea0-4b6d-8918-7e4de6a71c44 |

---

## Prerequisites

Before creating or managing service principals, ensure you have:

1. **Azure CLI** version 2.50.0 or higher
   ```bash
   az --version
   ```

2. **Appropriate Azure AD Permissions**:
   - Application Administrator role (to create service principals)
   - Owner or User Access Administrator role (to assign RBAC roles)

3. **Azure Subscription Access**:
   - Subscription ID: `ebd1613e-fea0-4b6d-8918-7e4de6a71c44`
   - Tenant Domain: `citadelcloudmanagementgmail.onmicrosoft.com`

4. **Azure DevOps Access**:
   - Organization: `https://dev.azure.com/citadelcloudmanagement`
   - Project: `DatingPlatform`
   - Permissions to manage variable groups

---

## Service Principal Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Azure Active Directory                       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Service Principal: applyplatform-terraform-sp         │    │
│  │                                                         │    │
│  │  - App ID (Client ID): xxxxxxxx-xxxx-xxxx-xxxx        │    │
│  │  - Object ID: xxxxxxxx-xxxx-xxxx-xxxx                 │    │
│  │  - Client Secret: [Stored in Azure DevOps]            │    │
│  └─────────────────┬───────────────────────────────────────┘    │
│                    │                                             │
└────────────────────┼─────────────────────────────────────────────┘
                     │
                     │ Authenticated via
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│                  Azure Subscription                              │
│           ebd1613e-fea0-4b6d-8918-7e4de6a71c44                  │
│                                                                  │
│  RBAC Role Assignments:                                         │
│  ├─ Contributor (Resource management)                           │
│  ├─ User Access Administrator (Role assignments)                │
│  ├─ Key Vault Administrator (Secret management)                 │
│  └─ Storage Blob Data Contributor (Terraform state)             │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Dev Env     │  │  Test Env    │  │  Prod Env    │          │
│  │  Resources   │  │  Resources   │  │  Resources   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Creating a New Service Principal

### Method 1: Using Azure CLI (Manual)

#### Step 1: Login to Azure

```bash
# Login with your Azure credentials
az login --tenant citadelcloudmanagementgmail.onmicrosoft.com

# Set the correct subscription
az account set --subscription ebd1613e-fea0-4b6d-8918-7e4de6a71c44

# Verify you're in the correct subscription
az account show
```

#### Step 2: Create the Service Principal

```bash
# Create service principal with Contributor role
az ad sp create-for-rbac \
  --name "applyplatform-terraform-sp" \
  --role "Contributor" \
  --scopes "/subscriptions/ebd1613e-fea0-4b6d-8918-7e4de6a71c44" \
  --output json

# Output will look like:
# {
#   "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   "displayName": "applyplatform-terraform-sp",
#   "password": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
#   "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
# }
```

**IMPORTANT**:
- Save the `password` (client secret) immediately - it cannot be retrieved later
- Store it securely in a password manager or Key Vault
- The `appId` is your ARM_CLIENT_ID
- The `password` is your ARM_CLIENT_SECRET
- The `tenant` is your ARM_TENANT_ID

#### Step 3: Verify Creation

```bash
# Get the client ID from the previous output
CLIENT_ID="<your-app-id>"

# Verify service principal exists
az ad sp show --id $CLIENT_ID

# Check current role assignments
az role assignment list --assignee $CLIENT_ID --output table
```

### Method 2: Using Automation Script (Recommended)

The platform includes a PowerShell script for automated service principal configuration:

```powershell
# Navigate to the DatingPlatform directory
cd C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform

# Run the configuration script
.\scripts\configure-sp.ps1 -CreateNew -SetEnvironmentVariables

# The script will:
# 1. Create the service principal
# 2. Assign required RBAC roles
# 3. Display credentials (save these!)
# 4. Set environment variables for current session
# 5. Provide Azure DevOps configuration guidance
```

For Linux/macOS:

```bash
cd /path/to/DatingPlatform

# Make script executable
chmod +x scripts/configure-sp.sh

# Run the script
./scripts/configure-sp.sh --create-new --set-env
```

---

## Required Permissions and Roles

The service principal requires the following RBAC role assignments for Terraform operations:

### 1. Contributor Role

**Purpose**: Manage all Azure resources (create, update, delete)

**Scope**: Subscription level

```bash
az role assignment create \
  --assignee $CLIENT_ID \
  --role "Contributor" \
  --scope "/subscriptions/ebd1613e-fea0-4b6d-8918-7e4de6a71c44"
```

**Permissions Granted**:
- Create and manage resource groups
- Deploy Azure resources (App Services, AKS, SQL, etc.)
- Update and modify existing resources
- Delete resources

**Cannot Do**:
- Assign roles to other principals
- Modify subscription-level policies

### 2. User Access Administrator Role

**Purpose**: Manage role assignments for managed identities and other resources

**Scope**: Subscription level

```bash
az role assignment create \
  --assignee $CLIENT_ID \
  --role "User Access Administrator" \
  --scope "/subscriptions/ebd1613e-fea0-4b6d-8918-7e4de6a71c44"
```

**Why Required**:
- Assign managed identities to AKS clusters
- Configure RBAC for Application Gateway
- Set up Key Vault access policies
- Grant permissions to service principals created by Terraform

**Security Note**: This is a privileged role. Consider using Privileged Identity Management (PIM) for production.

### 3. Key Vault Administrator Role

**Purpose**: Full access to Key Vault operations

**Scope**: Subscription level (or specific Key Vault resource)

```bash
az role assignment create \
  --assignee $CLIENT_ID \
  --role "Key Vault Administrator" \
  --scope "/subscriptions/ebd1613e-fea0-4b6d-8918-7e4de6a71c44"
```

**Why Required**:
- Create and manage Key Vaults
- Store and retrieve secrets (database passwords, API keys)
- Configure Key Vault access policies
- Manage certificates and keys
- Enable Key Vault for Azure Disk Encryption

### 4. Storage Blob Data Contributor Role

**Purpose**: Manage Terraform state files in Azure Blob Storage

**Scope**: Terraform state storage account

```bash
az role assignment create \
  --assignee $CLIENT_ID \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/ebd1613e-fea0-4b6d-8918-7e4de6a71c44/resourceGroups/rg-terraform-state-westus2/providers/Microsoft.Storage/storageAccounts/sttfstatedatingplatform"
```

**Why Required**:
- Read and write Terraform state files
- Lock state during operations
- Support remote state backends

### Assign All Roles at Once

```bash
CLIENT_ID="<your-service-principal-client-id>"
SUBSCRIPTION_ID="ebd1613e-fea0-4b6d-8918-7e4de6a71c44"

# Assign all required roles
for ROLE in "Contributor" "User Access Administrator" "Key Vault Administrator" "Storage Blob Data Contributor"
do
  echo "Assigning role: $ROLE"
  az role assignment create \
    --assignee $CLIENT_ID \
    --role "$ROLE" \
    --scope "/subscriptions/$SUBSCRIPTION_ID"
done
```

### Verify Role Assignments

```bash
# List all role assignments
az role assignment list \
  --assignee $CLIENT_ID \
  --subscription $SUBSCRIPTION_ID \
  --output table

# Expected output:
# Principal                            Role                          Scope
# -----------------------------------  ---------------------------  --------------------------------
# applyplatform-terraform-sp          Contributor                   /subscriptions/ebd1613e...
# applyplatform-terraform-sp          User Access Administrator     /subscriptions/ebd1613e...
# applyplatform-terraform-sp          Key Vault Administrator       /subscriptions/ebd1613e...
# applyplatform-terraform-sp          Storage Blob Data Contributor /subscriptions/ebd1613e...
```

---

## Generating and Rotating Client Secrets

### Why Rotate Secrets?

- **Security Best Practice**: Limit exposure window if credentials are compromised
- **Compliance**: Many standards require regular credential rotation (90-180 days)
- **Least Privilege**: Old secrets should be revoked after rotation

### Secret Rotation Schedule

| Environment | Rotation Frequency | Approval Required |
|-------------|-------------------|-------------------|
| Development | 180 days | No |
| Test | 90 days | Tech Lead |
| Production | 90 days | Security Team + DevOps Lead |

### Method 1: Generate New Secret (Recommended)

This method creates a new secret while keeping the old one active, allowing zero-downtime rotation.

```bash
CLIENT_ID="<your-service-principal-client-id>"

# Generate a new credential with 90-day expiration
az ad sp credential reset \
  --id $CLIENT_ID \
  --append \
  --years 0.25 \
  --output json

# Output:
# {
#   "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   "password": "NEW-SECRET-HERE",
#   "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
# }
```

**Important**: The `--append` flag adds a new secret without removing existing ones.

### Method 2: Reset Secret (Replace All)

This method removes all existing secrets and creates a new one. Use with caution in production.

```bash
# Reset credential (removes all existing secrets)
az ad sp credential reset \
  --id $CLIENT_ID \
  --years 1 \
  --output json

# Save the new password immediately
```

### Method 3: Using Azure Portal

1. Navigate to Azure Portal: https://portal.azure.com
2. Go to **Azure Active Directory** > **App registrations**
3. Click **All applications** tab
4. Search for `applyplatform-terraform-sp`
5. Click on the application
6. Select **Certificates & secrets** from left menu
7. Under **Client secrets**, click **+ New client secret**
8. Configure:
   - **Description**: `Rotated on YYYY-MM-DD - Pipeline use`
   - **Expires**: Select 90 days, 180 days, or custom
9. Click **Add**
10. **IMMEDIATELY COPY** the secret value (you won't see it again)

### Secret Rotation Process (Zero-Downtime)

1. **Generate New Secret** (keep old one active)
   ```bash
   az ad sp credential reset --id $CLIENT_ID --append --years 0.25
   ```

2. **Update Azure DevOps Variable Groups** (see next section)

3. **Test New Secret** in Dev environment first
   ```bash
   # Set new secret temporarily
   export ARM_CLIENT_SECRET="new-secret-here"

   # Test authentication
   az login --service-principal \
     -u $ARM_CLIENT_ID \
     -p $ARM_CLIENT_SECRET \
     --tenant $ARM_TENANT_ID

   # Run Terraform plan to verify
   terraform plan
   ```

4. **Update Test Environment** after Dev verification

5. **Update Production Environment** after Test verification

6. **Remove Old Secret** after 7-day grace period
   ```bash
   # List all credentials
   az ad sp credential list --id $CLIENT_ID

   # Delete old credential by key ID
   az ad sp credential delete --id $CLIENT_ID --key-id <old-key-id>
   ```

### View Existing Secrets

```bash
# List all credentials and their expiration dates
az ad sp credential list --id $CLIENT_ID --output table

# Output:
# CustomKeyIdentifier    EndDateTime              KeyId                                StartDateTime
# ---------------------  -----------------------  -----------------------------------  -----------------------
#                        2025-03-07T00:00:00Z     xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  2024-12-07T00:00:00Z
```

### Set Expiration Reminder

```bash
# Get credential expiration dates
az ad sp credential list --id $CLIENT_ID \
  --query "[].{KeyId:keyId, EndDate:endDateTime}" \
  --output table

# Add to calendar/monitoring system 30 days before expiration
```

---

## Updating Azure DevOps Variable Groups

After generating a new client secret, update the Azure DevOps variable groups used by pipelines.

### Variable Group Structure

The Flamoral platform uses the following variable groups:

1. **datingplatform-terraform-common** - Shared across all environments
2. **datingplatform-terraform-dev** - Development environment
3. **datingplatform-terraform-test** - Test environment
4. **datingplatform-terraform-prod** - Production environment

### Method 1: Azure DevOps Web UI (Recommended for Production)

#### Step 1: Navigate to Variable Groups

1. Go to Azure DevOps: https://dev.azure.com/citadelcloudmanagement
2. Select **DatingPlatform** project
3. Click **Pipelines** > **Library**
4. Find `datingplatform-terraform-common` variable group

#### Step 2: Update Common Variables (One-Time Setup)

Click **+ Variable** or edit existing variables:

| Variable Name | Value | Secret | Notes |
|--------------|-------|--------|-------|
| `ARM_SUBSCRIPTION_ID` | `ebd1613e-fea0-4b6d-8918-7e4de6a71c44` | No | Subscription ID |
| `ARM_TENANT_ID` | `<your-tenant-id>` | No | Get via `az account show --query tenantId -o tsv` |
| `TERRAFORM_STORAGE_ACCOUNT` | `sttfstatedatingplatform` | No | Terraform state storage |
| `TERRAFORM_CONTAINER_NAME` | `tfstate` | No | State blob container |
| `TERRAFORM_RESOURCE_GROUP` | `rg-terraform-state-westus2` | No | State resource group |
| `TF_VERSION` | `1.6.6` | No | Terraform version |

Click **Save** after adding variables.

#### Step 3: Update Environment-Specific Variables

For each environment (dev, test, prod), update the respective variable group:

**Variable Group**: `datingplatform-terraform-dev`

| Variable Name | Value | Secret | Notes |
|--------------|-------|--------|-------|
| `ARM_CLIENT_ID` | `<service-principal-app-id>` | No | From `az ad sp show` |
| `ARM_CLIENT_SECRET` | `<new-client-secret>` | **YES** | Mark as secret! |
| `TF_ENVIRONMENT` | `dev` | No | Environment name |
| `TF_WORKING_DIR` | `terraform/environments/dev` | No | Terraform working directory |

**Important**:
- Click the lock icon next to `ARM_CLIENT_SECRET` to mark it as secret
- Secret values are encrypted and masked in logs

Repeat for `datingplatform-terraform-test` and `datingplatform-terraform-prod`.

### Method 2: Azure CLI

```bash
# Set variables
ORGANIZATION="https://dev.azure.com/citadelcloudmanagement"
PROJECT="DatingPlatform"
CLIENT_ID="<your-client-id>"
CLIENT_SECRET="<your-new-client-secret>"

# Update dev environment variable group
az pipelines variable-group variable update \
  --group-id <group-id> \
  --name "ARM_CLIENT_SECRET" \
  --value "$CLIENT_SECRET" \
  --secret true \
  --org "$ORGANIZATION" \
  --project "$PROJECT"

# Repeat for test and prod
```

### Method 3: Using Azure DevOps REST API

```bash
# Get PAT token from: https://dev.azure.com/citadelcloudmanagement/_usersSettings/tokens
PAT_TOKEN="<your-personal-access-token>"
ORG="citadelcloudmanagement"
PROJECT="DatingPlatform"

# Get variable group ID
curl -u :$PAT_TOKEN \
  "https://dev.azure.com/$ORG/$PROJECT/_apis/distributedtask/variablegroups?api-version=7.0" \
  | jq '.value[] | select(.name=="datingplatform-terraform-dev") | .id'

# Update secret variable
VARIABLE_GROUP_ID="<id-from-above>"

curl -X PUT \
  -u :$PAT_TOKEN \
  -H "Content-Type: application/json" \
  "https://dev.azure.com/$ORG/$PROJECT/_apis/distributedtask/variablegroups/$VARIABLE_GROUP_ID?api-version=7.0" \
  -d '{
    "variables": {
      "ARM_CLIENT_SECRET": {
        "value": "'$CLIENT_SECRET'",
        "isSecret": true
      }
    }
  }'
```

### Method 4: Using PowerShell Script

```powershell
# Install Azure DevOps extension if not already installed
az extension add --name azure-devops

# Set organization default
az devops configure --defaults organization=https://dev.azure.com/citadelcloudmanagement project=DatingPlatform

# Update variable group
$variableGroups = @("datingplatform-terraform-dev", "datingplatform-terraform-test", "datingplatform-terraform-prod")
$newSecret = Read-Host "Enter new ARM_CLIENT_SECRET" -AsSecureString
$secretPlainText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($newSecret))

foreach ($group in $variableGroups) {
    Write-Host "Updating $group..." -ForegroundColor Yellow

    # Get group ID
    $groupId = az pipelines variable-group list --query "[?name=='$group'].id" -o tsv

    # Update secret
    az pipelines variable-group variable update `
        --group-id $groupId `
        --name "ARM_CLIENT_SECRET" `
        --value $secretPlainText `
        --secret true

    Write-Host "Updated $group successfully" -ForegroundColor Green
}

# Clear secret from memory
Remove-Variable secretPlainText
```

### Verification Steps

After updating variable groups:

1. **Run a Test Pipeline**:
   - Navigate to **Pipelines** > **All**
   - Select infrastructure pipeline
   - Click **Run pipeline**
   - Choose **Dev** environment
   - Monitor for authentication success

2. **Check Pipeline Logs**:
   ```
   [Terraform Init]
   Initializing the backend...
   Successfully configured the backend "azurerm"!

   [Terraform Plan]
   Acquiring state lock. This may take a few moments...
   Refreshing Terraform state in-memory prior to plan...
   ```

3. **Verify No Authentication Errors**:
   - No "401 Unauthorized" messages
   - No "403 Forbidden" errors
   - State lock acquired successfully

---

## Security Best Practices

### 1. Principle of Least Privilege

**DO**:
- Grant only the minimum required roles
- Use resource-level scoping when possible
- Review permissions quarterly

**DON'T**:
- Grant Owner role to service principals
- Use subscription-wide permissions when resource-level suffices
- Keep unused service principals active

```bash
# Good: Resource-level permission
az role assignment create \
  --assignee $CLIENT_ID \
  --role "Contributor" \
  --scope "/subscriptions/$SUB_ID/resourceGroups/rg-datingplatform-dev"

# Avoid: Subscription-level when not needed
# (But required for Terraform multi-resource deployments)
```

### 2. Secret Management

**DO**:
- Rotate secrets every 90 days minimum
- Store secrets in Azure Key Vault or Azure DevOps secure variables
- Use short expiration periods (90-180 days)
- Set calendar reminders 30 days before expiration
- Use separate service principals per environment (if possible)

**DON'T**:
- Store secrets in code repositories
- Share secrets via email or messaging apps
- Use secrets that never expire
- Reuse secrets across environments
- Log secrets in pipeline output

```bash
# Good: 90-day expiration
az ad sp credential reset --id $CLIENT_ID --years 0.25

# Avoid: Indefinite expiration
az ad sp credential reset --id $CLIENT_ID --years 99
```

### 3. Access Control

**DO**:
- Limit who can view/edit variable groups
- Use Azure AD Conditional Access for Azure Portal
- Enable MFA for all admin accounts
- Audit service principal usage regularly
- Use Azure DevOps pipeline permissions

**DON'T**:
- Grant everyone access to variable groups
- Share service principal credentials with contractors
- Use personal accounts for service principals

```bash
# Review who has access to service principal
az ad sp owner list --id $CLIENT_ID

# Review role assignments
az role assignment list --assignee $CLIENT_ID --include-inherited
```

### 4. Monitoring and Auditing

**Enable Azure AD Sign-in Logs**:

```bash
# View service principal sign-ins (last 7 days)
az monitor activity-log list \
  --caller $CLIENT_ID \
  --start-time 2024-12-01T00:00:00Z \
  --output table
```

**Set Up Alerts**:

1. Navigate to Azure Portal > Azure Active Directory
2. Go to **Security** > **Identity Protection**
3. Create alert for:
   - Failed authentication attempts (>10 in 1 hour)
   - New credential added
   - Permission changes
   - Unusual sign-in location

**Review Logs Regularly**:

```bash
# Terraform state access logs
az storage blob service-properties show \
  --account-name sttfstatedatingplatform \
  --query logging

# Enable storage logging if not enabled
az storage logging update \
  --account-name sttfstatedatingplatform \
  --services b \
  --log rwd \
  --retention 30
```

### 5. Credential Isolation

**Use Managed Identities When Possible**:

For Azure resources (VMs, App Services, AKS):
- Prefer Managed Identities over Service Principals
- No secret management required
- Automatic credential rotation

```terraform
# Example: AKS with managed identity (preferred)
resource "azurerm_kubernetes_cluster" "main" {
  identity {
    type = "SystemAssigned"
  }
}
```

**Separate Service Principals by Environment**:

| Environment | Service Principal | Justification |
|-------------|------------------|---------------|
| Dev | `applyplatform-terraform-dev-sp` | Isolated blast radius |
| Test | `applyplatform-terraform-test-sp` | Separate permissions |
| Prod | `applyplatform-terraform-prod-sp` | Production isolation |

### 6. Terraform State Security

**Secure Backend Configuration**:

```hcl
# terraform/shared/provider.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state-westus2"
    storage_account_name = "sttfstatedatingplatform"
    container_name       = "tfstate"
    key                  = "flamoral.tfstate"

    # Use SAS token or service principal
    use_azuread_auth = true  # Recommended
  }
}
```

**State File Encryption**:

- Enable encryption at rest on storage account
- Enable soft delete (retain deleted states for 30 days)
- Configure network access restrictions

```bash
# Enable storage encryption (enabled by default)
az storage account update \
  --name sttfstatedatingplatform \
  --resource-group rg-terraform-state-westus2 \
  --encryption-services blob

# Enable soft delete
az storage blob service-properties delete-policy update \
  --account-name sttfstatedatingplatform \
  --enable true \
  --days-retained 30
```

### 7. Compliance and Governance

**Tag Service Principals**:

```bash
# Tag application registration (not available via CLI, use Portal)
# Portal: Azure AD > App registrations > applyplatform-terraform-sp > Notes
```

**Document Service Principal Usage**:

Maintain a spreadsheet/wiki with:
- Service Principal name
- Purpose and owner
- Assigned roles and scopes
- Secret expiration dates
- Last rotation date
- Associated pipelines

**Regular Access Reviews**:

Schedule quarterly reviews:
1. List all service principals: `az ad sp list --all`
2. Review role assignments: `az role assignment list --all`
3. Check credential expiration: `az ad sp credential list --id $CLIENT_ID`
4. Remove unused service principals
5. Rotate secrets that are > 90 days old

---

## Troubleshooting

### Common Authentication Errors

#### 1. Error: "Failed to get OAuth token"

**Symptoms**:
```
Error: building account: getting authenticated object ID: Error listing Service Principals:
    autorest/azure: Service returned an error. Status=403 Code="Authorization_RequestDenied"
```

**Possible Causes**:
- Incorrect client ID
- Expired or invalid client secret
- Wrong tenant ID
- Service principal doesn't exist

**Solution**:

```bash
# Verify credentials
echo "Client ID: $ARM_CLIENT_ID"
echo "Tenant ID: $ARM_TENANT_ID"
echo "Subscription: $ARM_SUBSCRIPTION_ID"

# Test authentication manually
az login --service-principal \
  -u $ARM_CLIENT_ID \
  -p $ARM_CLIENT_SECRET \
  --tenant $ARM_TENANT_ID

# If successful, credentials are correct
# If failed, regenerate secret
az ad sp credential reset --id $ARM_CLIENT_ID
```

#### 2. Error: "Insufficient privileges"

**Symptoms**:
```
Error: authorization.RoleAssignmentsClient#Create: Failure responding to request:
    StatusCode=403 -- Original Error: autorest/azure: Service returned an error.
    Status=403 Code="AuthorizationFailed"
    Message="The client '...' does not have authorization to perform action
    'Microsoft.Authorization/roleAssignments/write'"
```

**Possible Causes**:
- Missing "User Access Administrator" role
- Attempting to assign roles at wrong scope

**Solution**:

```bash
# Check current role assignments
az role assignment list --assignee $ARM_CLIENT_ID --output table

# Add User Access Administrator role
az role assignment create \
  --assignee $ARM_CLIENT_ID \
  --role "User Access Administrator" \
  --scope "/subscriptions/$ARM_SUBSCRIPTION_ID"

# Verify assignment
az role assignment list --assignee $ARM_CLIENT_ID --role "User Access Administrator"
```

#### 3. Error: "Key Vault access denied"

**Symptoms**:
```
Error: checking for presence of existing Secret "dbpassword" (Key Vault "https://kv-datingplatform-dev.vault.azure.net/"):
    keyvault.BaseClient#GetSecret: Failure responding to request: StatusCode=403
    Message="The user, group or application does not have secrets get permission"
```

**Possible Causes**:
- Missing "Key Vault Administrator" role
- Access policy not configured
- Network restrictions blocking access

**Solution**:

```bash
# Option 1: Assign RBAC role (recommended)
az role assignment create \
  --assignee $ARM_CLIENT_ID \
  --role "Key Vault Administrator" \
  --scope "/subscriptions/$ARM_SUBSCRIPTION_ID"

# Option 2: Add access policy (legacy)
az keyvault set-policy \
  --name kv-datingplatform-dev \
  --spn $ARM_CLIENT_ID \
  --secret-permissions get list set delete \
  --key-permissions get list create delete \
  --certificate-permissions get list create delete
```

#### 4. Error: "Terraform state lock failed"

**Symptoms**:
```
Error: Error acquiring the state lock

Error message: storage: service returned error: StatusCode=403,
    ErrorCode=AuthorizationPermissionMismatch
```

**Possible Causes**:
- Missing "Storage Blob Data Contributor" role
- Storage account firewall blocking access
- State already locked by another process

**Solution**:

```bash
# Add Storage role
az role assignment create \
  --assignee $ARM_CLIENT_ID \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/$ARM_SUBSCRIPTION_ID/resourceGroups/rg-terraform-state-westus2/providers/Microsoft.Storage/storageAccounts/sttfstatedatingplatform"

# If state is stuck locked, force unlock (CAUTION!)
terraform force-unlock <lock-id>

# Check storage account network rules
az storage account show \
  --name sttfstatedatingplatform \
  --resource-group rg-terraform-state-westus2 \
  --query networkRuleSet
```

#### 5. Error: "Subscription not found"

**Symptoms**:
```
Error: Error building ARM Config:
    Error getting authenticated object ID:
    Error listing Service Principals:
    autorest/azure: Service returned an error.
    Status=404 Code="SubscriptionNotFound" Message="The subscription ... could not be found."
```

**Possible Causes**:
- Wrong subscription ID
- Service principal doesn't have access to subscription
- Subscription was deleted/moved

**Solution**:

```bash
# List accessible subscriptions
az account list --output table

# Verify subscription ID
az account show --subscription ebd1613e-fea0-4b6d-8918-7e4de6a71c44

# Grant access to subscription (requires Owner)
az role assignment create \
  --assignee $ARM_CLIENT_ID \
  --role "Contributor" \
  --scope "/subscriptions/ebd1613e-fea0-4b6d-8918-7e4de6a71c44"
```

### Debugging Checklist

When encountering service principal issues, run through this checklist:

- [ ] **Verify credentials are set**:
  ```bash
  env | grep ARM_
  ```

- [ ] **Test manual login**:
  ```bash
  az login --service-principal -u $ARM_CLIENT_ID -p $ARM_CLIENT_SECRET --tenant $ARM_TENANT_ID
  ```

- [ ] **Check service principal exists**:
  ```bash
  az ad sp show --id $ARM_CLIENT_ID
  ```

- [ ] **Verify role assignments**:
  ```bash
  az role assignment list --assignee $ARM_CLIENT_ID --all
  ```

- [ ] **Check secret expiration**:
  ```bash
  az ad sp credential list --id $ARM_CLIENT_ID
  ```

- [ ] **Review Azure DevOps variable groups**:
  - Go to Pipelines > Library
  - Check variables are set correctly
  - Verify secret variables are marked as secret

- [ ] **Check pipeline logs** for detailed error messages

- [ ] **Validate subscription access**:
  ```bash
  az account show --subscription $ARM_SUBSCRIPTION_ID
  ```

### Getting Help

If issues persist after troubleshooting:

1. **Check Azure Status**: https://status.azure.com/
2. **Review Azure AD Audit Logs**: Portal > Azure AD > Audit logs
3. **Contact Azure Support**: For subscription/tenant issues
4. **Internal Team**:
   - DevOps Lead: For pipeline configuration
   - Security Team: For permission issues
   - Platform Team: For Terraform errors

---

## Automation Scripts

The Flamoral platform includes automation scripts for service principal management:

### PowerShell Script: configure-sp.ps1

**Location**: `C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\scripts\configure-sp.ps1`

**Features**:
- Create new service principal
- Assign required RBAC roles
- Display configuration for Azure DevOps
- Set environment variables
- Validate setup

**Usage**:

```powershell
# Create new service principal
.\scripts\configure-sp.ps1 -CreateNew

# Configure existing service principal
.\scripts\configure-sp.ps1

# Create and set environment variables
.\scripts\configure-sp.ps1 -CreateNew -SetEnvironmentVariables

# Use custom service principal name
.\scripts\configure-sp.ps1 -ServicePrincipalName "my-custom-sp" -CreateNew
```

**Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ServicePrincipalName` | String | `applyplatform-terraform-sp` | Name of service principal |
| `SubscriptionId` | String | `ebd1613e-fea0-4b6d-8918-7e4de6a71c44` | Azure subscription ID |
| `TenantDomain` | String | `citadelcloudmanagementgmail.onmicrosoft.com` | Tenant domain |
| `CreateNew` | Switch | False | Create new service principal |
| `SetEnvironmentVariables` | Switch | False | Set ARM_* environment variables |

### Bash Script: configure-sp.sh

**Location**: `C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\scripts\configure-sp.sh`

**Usage**:

```bash
# Make executable
chmod +x scripts/configure-sp.sh

# Create new service principal
./scripts/configure-sp.sh --create-new

# Configure existing
./scripts/configure-sp.sh

# Set environment variables
./scripts/configure-sp.sh --set-env
```

### Backend Setup Script

**Location**: `scripts/setup-backend.ps1` / `scripts/setup-backend.sh`

**Purpose**: Initialize Terraform backend storage

**Usage**:

```powershell
# Create Terraform state storage
.\scripts\setup-backend.ps1
```

This creates:
- Resource Group: `rg-terraform-state-westus2`
- Storage Account: `sttfstatedatingplatform`
- Blob Container: `tfstate`
- Assigns service principal permissions

---

## Quick Reference

### Environment Variables

Set these in your shell or CI/CD system:

```bash
export ARM_CLIENT_ID="<service-principal-app-id>"
export ARM_CLIENT_SECRET="<service-principal-secret>"
export ARM_SUBSCRIPTION_ID="ebd1613e-fea0-4b6d-8918-7e4de6a71c44"
export ARM_TENANT_ID="<your-tenant-id>"
```

### Common Commands

```bash
# Create service principal
az ad sp create-for-rbac --name applyplatform-terraform-sp \
  --role Contributor \
  --scopes /subscriptions/ebd1613e-fea0-4b6d-8918-7e4de6a71c44

# Rotate secret
az ad sp credential reset --id $CLIENT_ID --append --years 0.25

# List credentials
az ad sp credential list --id $CLIENT_ID

# Delete old credential
az ad sp credential delete --id $CLIENT_ID --key-id $KEY_ID

# Check role assignments
az role assignment list --assignee $CLIENT_ID --output table

# Test login
az login --service-principal -u $CLIENT_ID -p $CLIENT_SECRET --tenant $TENANT_ID
```

### Terraform Configuration

```hcl
# Provider configuration
provider "azurerm" {
  features {}

  # These are read from environment variables
  # ARM_CLIENT_ID
  # ARM_CLIENT_SECRET
  # ARM_SUBSCRIPTION_ID
  # ARM_TENANT_ID
}

# Backend configuration
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state-westus2"
    storage_account_name = "sttfstatedatingplatform"
    container_name       = "tfstate"
    key                  = "flamoral.tfstate"
    use_azuread_auth     = true
  }
}
```

### Azure DevOps Variable Groups

**Common Variables** (`datingplatform-terraform-common`):
- `ARM_SUBSCRIPTION_ID`: ebd1613e-fea0-4b6d-8918-7e4de6a71c44
- `ARM_TENANT_ID`: (from `az account show`)
- `TERRAFORM_STORAGE_ACCOUNT`: sttfstatedatingplatform
- `TERRAFORM_CONTAINER_NAME`: tfstate
- `TERRAFORM_RESOURCE_GROUP`: rg-terraform-state-westus2

**Environment-Specific** (`datingplatform-terraform-<env>`):
- `ARM_CLIENT_ID`: (service principal app ID)
- `ARM_CLIENT_SECRET`: (secret - mark as secret variable)
- `TF_ENVIRONMENT`: dev/test/prod
- `TF_WORKING_DIR`: terraform/environments/<env>

---

## Additional Resources

### Microsoft Documentation

- [Azure Service Principals](https://docs.microsoft.com/en-us/azure/active-directory/develop/app-objects-and-service-principals)
- [Azure RBAC Roles](https://docs.microsoft.com/en-us/azure/role-based-access-control/built-in-roles)
- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure DevOps Variable Groups](https://docs.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups)

### Internal Documentation

- [Deployment Guide](./DEPLOYMENT-GUIDE.md)
- [CI/CD Pipelines](./CI_CD_PIPELINES.md)
- [Variable Groups Setup](../pipelines/variable-groups/README.md)
- [Infrastructure Pipeline](../pipelines/README.md)

### Platform Information

- **Azure DevOps**: https://dev.azure.com/citadelcloudmanagement
- **Azure Portal**: https://portal.azure.com
- **Subscription ID**: ebd1613e-fea0-4b6d-8918-7e4de6a71c44
- **Tenant**: citadelcloudmanagementgmail.onmicrosoft.com

---

## Appendix

### A. Service Principal Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                  Service Principal Lifecycle                     │
└─────────────────────────────────────────────────────────────────┘

1. CREATION
   └─> az ad sp create-for-rbac
       └─> Returns: appId, password, tenant
           └─> SAVE CREDENTIALS IMMEDIATELY

2. CONFIGURATION
   └─> Assign RBAC roles
       ├─> Contributor
       ├─> User Access Administrator
       ├─> Key Vault Administrator
       └─> Storage Blob Data Contributor

3. DEPLOYMENT
   └─> Update Azure DevOps variable groups
       └─> Test in Dev → Test → Prod

4. MONITORING (Ongoing)
   └─> Review audit logs
   └─> Check credential expiration
   └─> Validate permissions

5. ROTATION (Every 90 days)
   └─> Generate new secret with --append
       └─> Update variable groups
           └─> Test thoroughly
               └─> Remove old secret after grace period

6. DECOMMISSION (When no longer needed)
   └─> Remove from variable groups
       └─> Delete role assignments
           └─> Delete service principal
```

### B. RBAC Role Comparison

| Role | Create Resources | Assign Roles | Manage Key Vault | Cost |
|------|-----------------|--------------|------------------|------|
| Reader | No | No | No | Free |
| Contributor | Yes | No | No | Free |
| Owner | Yes | Yes | Yes | Free |
| Key Vault Administrator | KV only | KV only | Yes | Free |
| User Access Administrator | No | Yes | No | Free |

**Recommendation for Terraform**:
- Contributor + User Access Administrator + Key Vault Administrator + Storage Blob Data Contributor

### C. Secret Expiration Best Practices

| Environment | Expiration | Rotation Frequency | Grace Period |
|-------------|-----------|-------------------|--------------|
| Development | 180 days | 180 days | 7 days |
| Test | 90 days | 90 days | 7 days |
| Production | 90 days | 90 days | 14 days |

**Grace Period**: Time to keep old secret active after creating new one.

---

**Document Version**: 1.0
**Last Updated**: 2024-12-07
**Maintained By**: DevOps Team
**Contact**: devops@flamoral.com
