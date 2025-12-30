# FLAMORAL - Azure AD Group Provisioning Guide

## Overview

This document provides step-by-step instructions for provisioning Azure AD security groups used by the FLAMORAL platform for group-driven authorization. These groups control subscription tiers, feature access, and administrative roles.

---

## Group Inventory

| Group Name | Environment Variable | Purpose |
|------------|---------------------|---------|
| `saas-free` | `GROUP_ID_SAAS_FREE` | Free tier users - basic access |
| `saas-standard` | `GROUP_ID_SAAS_STANDARD` | Standard subscription users |
| `saas-premium` | `GROUP_ID_SAAS_PREMIUM` | Premium subscription users |
| `saas-verified` | `GROUP_ID_SAAS_VERIFIED` | Identity verified users |
| `saas-moderator` | `GROUP_ID_SAAS_MODERATOR` | Content moderators |
| `saas-operator` | `GROUP_ID_SAAS_OPERATOR` | Operations staff |
| `saas-admin` | `GROUP_ID_SAAS_ADMIN` | Platform administrators |
| `banned` | `GROUP_ID_BANNED` | Banned/suspended users |

---

## Prerequisites

### Required Permissions

The account running the provisioning script must have one of the following Azure AD roles:

- **Global Administrator** (most permissive)
- **Groups Administrator** (recommended for least privilege)
- **User Administrator** (can create groups but with some limitations)

Or the following Microsoft Graph API permissions:

- `Group.Create`
- `Group.ReadWrite.All`

### Required Tools

1. **Azure CLI** - Version 2.40.0 or later
   - Install: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
   - Verify: `az version`

2. **PowerShell** (for Windows) - Version 5.1 or later
   - Verify: `$PSVersionTable.PSVersion`

3. **Bash** (for Linux/macOS/WSL)
   - Any modern shell that supports arrays

---

## Step-by-Step Provisioning Guide

### Step 1: Authenticate to Azure

```bash
# Login to Azure (opens browser for authentication)
az login

# Verify you're logged into the correct tenant
az account show

# If you have multiple tenants, set the correct one
az account set --subscription "Your-Subscription-Name"
```

### Step 2: Verify Permissions

```bash
# Test that you can list groups (verifies permissions)
az ad group list --top 5

# Check your current user's roles
az role assignment list --assignee $(az ad signed-in-user show --query id -o tsv)
```

### Step 3: Run the Provisioning Script

#### Option A: Bash (Linux/macOS/WSL)

```bash
# Navigate to scripts directory
cd scripts/

# Make the script executable (if needed)
chmod +x provision-ad-groups.sh

# Run in dry-run mode first (recommended)
./provision-ad-groups.sh --dry-run

# Run the actual provisioning
./provision-ad-groups.sh
```

#### Option B: PowerShell (Windows)

```powershell
# Navigate to scripts directory
cd scripts/

# Run in dry-run mode first (recommended)
.\provision-ad-groups.ps1 -DryRun

# Run the actual provisioning
.\provision-ad-groups.ps1
```

### Step 4: Capture Output

The script will output environment variables in this format:

```
GROUP_ID_SAAS_FREE=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GROUP_ID_SAAS_STANDARD=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GROUP_ID_SAAS_PREMIUM=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GROUP_ID_SAAS_VERIFIED=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GROUP_ID_SAAS_MODERATOR=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GROUP_ID_SAAS_OPERATOR=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GROUP_ID_SAAS_ADMIN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GROUP_ID_BANNED=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**IMPORTANT**: Save these values securely. You will need them for configuration.

---

## Environment Variable Mapping

### Local Development (.env files)

Add to your local `.env` files:

```bash
# Azure AD Group IDs (saas-* naming convention)
GROUP_ID_SAAS_FREE=<guid-from-script>
GROUP_ID_SAAS_STANDARD=<guid-from-script>
GROUP_ID_SAAS_PREMIUM=<guid-from-script>
GROUP_ID_SAAS_VERIFIED=<guid-from-script>
GROUP_ID_SAAS_MODERATOR=<guid-from-script>
GROUP_ID_SAAS_OPERATOR=<guid-from-script>
GROUP_ID_SAAS_ADMIN=<guid-from-script>
GROUP_ID_BANNED=<guid-from-script>
```

### Service-Specific Configuration

Update these `.env.example` files with the new variables:

- `backend/services/auth-service/.env.example`
- `backend/services/api-gateway/.env.example`
- `identity/automation/.env` (for group-sync service)

---

## GitHub Secrets Configuration

### Required Secrets

Navigate to: **GitHub Repository** > **Settings** > **Secrets and variables** > **Actions**

Add the following repository secrets:

| Secret Name | Description |
|-------------|-------------|
| `GROUP_ID_SAAS_FREE` | Azure AD group ID for free tier |
| `GROUP_ID_SAAS_STANDARD` | Azure AD group ID for standard tier |
| `GROUP_ID_SAAS_PREMIUM` | Azure AD group ID for premium tier |
| `GROUP_ID_SAAS_VERIFIED` | Azure AD group ID for verified users |
| `GROUP_ID_SAAS_MODERATOR` | Azure AD group ID for moderators |
| `GROUP_ID_SAAS_OPERATOR` | Azure AD group ID for operators |
| `GROUP_ID_SAAS_ADMIN` | Azure AD group ID for administrators |
| `GROUP_ID_BANNED` | Azure AD group ID for banned users |

### Adding Secrets via GitHub CLI

```bash
# Authenticate with GitHub CLI
gh auth login

# Add secrets (replace with actual values)
gh secret set GROUP_ID_SAAS_FREE --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
gh secret set GROUP_ID_SAAS_STANDARD --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
gh secret set GROUP_ID_SAAS_PREMIUM --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
gh secret set GROUP_ID_SAAS_VERIFIED --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
gh secret set GROUP_ID_SAAS_MODERATOR --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
gh secret set GROUP_ID_SAAS_OPERATOR --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
gh secret set GROUP_ID_SAAS_ADMIN --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
gh secret set GROUP_ID_BANNED --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

---

## Azure Key Vault Configuration (Production)

For production deployments, store group IDs in Azure Key Vault.

### Add Secrets to Key Vault

```bash
# Set Key Vault name
KEY_VAULT="flamoral-prod-kv"

# Add each group ID
az keyvault secret set --vault-name $KEY_VAULT --name "group-id-saas-free" --value "<guid>"
az keyvault secret set --vault-name $KEY_VAULT --name "group-id-saas-standard" --value "<guid>"
az keyvault secret set --vault-name $KEY_VAULT --name "group-id-saas-premium" --value "<guid>"
az keyvault secret set --vault-name $KEY_VAULT --name "group-id-saas-verified" --value "<guid>"
az keyvault secret set --vault-name $KEY_VAULT --name "group-id-saas-moderator" --value "<guid>"
az keyvault secret set --vault-name $KEY_VAULT --name "group-id-saas-operator" --value "<guid>"
az keyvault secret set --vault-name $KEY_VAULT --name "group-id-saas-admin" --value "<guid>"
az keyvault secret set --vault-name $KEY_VAULT --name "group-id-banned" --value "<guid>"
```

### External Secrets Operator Mapping

Add to your External Secrets configuration:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: flamoral-group-ids
  namespace: flamoral-prod
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-key-vault
    kind: ClusterSecretStore
  target:
    name: flamoral-group-secrets
  data:
    - secretKey: GROUP_ID_SAAS_FREE
      remoteRef:
        key: group-id-saas-free
    - secretKey: GROUP_ID_SAAS_STANDARD
      remoteRef:
        key: group-id-saas-standard
    - secretKey: GROUP_ID_SAAS_PREMIUM
      remoteRef:
        key: group-id-saas-premium
    - secretKey: GROUP_ID_SAAS_VERIFIED
      remoteRef:
        key: group-id-saas-verified
    - secretKey: GROUP_ID_SAAS_MODERATOR
      remoteRef:
        key: group-id-saas-moderator
    - secretKey: GROUP_ID_SAAS_OPERATOR
      remoteRef:
        key: group-id-saas-operator
    - secretKey: GROUP_ID_SAAS_ADMIN
      remoteRef:
        key: group-id-saas-admin
    - secretKey: GROUP_ID_BANNED
      remoteRef:
        key: group-id-banned
```

---

## Verification Steps

### 1. Verify Groups in Azure Portal

1. Navigate to: https://portal.azure.com
2. Go to: **Azure Active Directory** > **Groups**
3. Search for `saas-` to find all subscription groups
4. Verify each group exists with correct description

### 2. Verify Groups via CLI

```bash
# List all saas-* groups
az ad group list --query "[?starts_with(displayName, 'saas-')].{name:displayName, id:id}" -o table

# Verify specific group
az ad group show --group "saas-free" --query "{name:displayName, id:id, description:description}"
```

### 3. Verify B2C Token Contains Groups

After adding a test user to a group:

```bash
# Get a test token and decode it at jwt.io
# Verify the 'groups' claim contains the expected group IDs
```

### 4. Test Authorization Middleware

```bash
# Start the auth-service locally with the new group IDs
# Make a request and verify the user object contains correct tier/roles
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/auth/session
```

---

## Rollback Procedure

If you need to remove the groups (e.g., for re-provisioning):

### Delete All Groups

```bash
# WARNING: This will delete all groups. Use with caution.

# Delete each group
az ad group delete --group "saas-free"
az ad group delete --group "saas-standard"
az ad group delete --group "saas-premium"
az ad group delete --group "saas-verified"
az ad group delete --group "saas-moderator"
az ad group delete --group "saas-operator"
az ad group delete --group "saas-admin"
az ad group delete --group "banned"
```

### Rollback from Key Vault

```bash
# Soft delete secrets (can be recovered)
az keyvault secret delete --vault-name $KEY_VAULT --name "group-id-saas-free"
# ... repeat for all secrets

# Purge secrets (permanent - cannot be recovered)
az keyvault secret purge --vault-name $KEY_VAULT --name "group-id-saas-free"
# ... repeat for all secrets
```

### Restore from Backup

If you exported group IDs before deletion:

1. Re-run the provisioning script
2. Update Key Vault with new IDs
3. Update GitHub Secrets with new IDs
4. Redeploy affected services

---

## Troubleshooting

### Common Issues

#### "Insufficient privileges" Error

**Cause**: Account lacks Group.Create permission.

**Solution**:
1. Request Groups Administrator role
2. Or use a service principal with `Group.ReadWrite.All` permission

#### "Group already exists" Warning

**Cause**: Group was previously created.

**Solution**: This is normal - the script is idempotent. The existing group ID will be used.

#### "Unable to connect to Azure" Error

**Cause**: Azure CLI not authenticated or network issue.

**Solution**:
```bash
az logout
az login
```

#### Groups Not Appearing in Token

**Cause**: Azure AD B2C not configured to emit groups claim.

**Solution**:
1. In Azure Portal, go to B2C tenant
2. Navigate to App Registrations > Your App
3. Token Configuration > Add groups claim
4. Select "Security groups" or "Groups assigned to the application"

---

## Related Documentation

- [SECRETS_INVENTORY.md](../SECRETS_INVENTORY.md) - Complete secrets reference
- [ENTITLEMENTS.md](../ENTITLEMENTS.md) - Subscription tier features
- [b2c-authorization.ts](../../backend/shared/src/middleware/b2c-authorization.ts) - Authorization middleware
- [group-sync.js](../../identity/automation/group-sync.js) - Group synchronization service

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2024-12-25 | 1.0.0 | Initial provisioning guide |
