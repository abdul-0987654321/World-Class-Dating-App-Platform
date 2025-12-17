# Azure Key Vault CLI Command Reference - Flamoral Platform

**Document Version:** 1.0
**Last Updated:** 2025-12-12
**Classification:** INTERNAL - SECURITY OPERATIONS

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Security Warnings](#security-warnings)
3. [Key Vault Inventory](#key-vault-inventory)
4. [Listing Secrets](#listing-secrets)
5. [Setting Secrets](#setting-secrets)
6. [Retrieving Secrets](#retrieving-secrets)
7. [Secret Rotation](#secret-rotation)
8. [Backup & Recovery](#backup--recovery)
9. [Verification Commands](#verification-commands)
10. [RBAC & Access Management](#rbac--access-management)
11. [Emergency Access Procedures](#emergency-access-procedures)
12. [Audit & Monitoring](#audit--monitoring)
13. [Best Practices](#best-practices)

---

## Prerequisites

### Required Tools

```bash
# Verify Azure CLI installation
az --version

# Login to Azure
az login

# Set subscription (if multiple subscriptions exist)
az account set --subscription "Flamoral-Production"

# Verify current subscription
az account show --query name -o tsv
```

### Required Permissions

- **Key Vault Secrets Officer** - For full secret management
- **Key Vault Secrets User** - For read-only access
- **User Access Administrator** - For RBAC assignments

---

## Security Warnings

> **CRITICAL SECURITY REQUIREMENTS:**
>
> 1. **NEVER** pass secret values as command-line arguments
> 2. **NEVER** store secrets in shell history
> 3. **ALWAYS** use `--file` or `stdin` for secret input
> 4. **ALWAYS** clear clipboard after copying secrets
> 5. **ALWAYS** use `--query` to limit output when retrieving secrets
> 6. **ALWAYS** enable command history encryption or disable history for sensitive sessions
> 7. **NEVER** commit Key Vault commands with actual values to version control
> 8. **ALWAYS** use managed identities over service principals when possible

### Disable Command History (Recommended for Secret Operations)

```bash
# Bash - Disable history for current session
set +o history

# PowerShell - Disable history for current session
Set-PSReadlineOption -HistorySaveStyle SaveNothing

# Re-enable when done (Bash)
set -o history
```

---

## Key Vault Inventory

Flamoral Platform uses the following Key Vaults:

| Key Vault Name | Purpose | Region | Resource Group |
|---------------|---------|--------|----------------|
| `flamoral-prod-auth-kv` | Authentication & identity secrets | East US | flamoral-prod-rg |
| `flamoral-prod-payment-kv` | Payment processing credentials | East US | flamoral-prod-rg |
| `flamoral-prod-data-kv` | Database & storage credentials | East US | flamoral-prod-rg |
| `flamoral-prod-ext-kv` | External service API keys | East US | flamoral-prod-rg |
| `flamoral-prod-infra-kv` | Infrastructure & DevOps secrets | East US | flamoral-prod-rg |

---

## Listing Secrets

### List All Secrets in a Vault

```bash
# Authentication vault
az keyvault secret list \
  --vault-name flamoral-prod-auth-kv \
  --query "[].{Name:name, Enabled:attributes.enabled, Created:attributes.created, Updated:attributes.updated}" \
  --output table

# Payment vault
az keyvault secret list \
  --vault-name flamoral-prod-payment-kv \
  --query "[].{Name:name, Enabled:attributes.enabled, Created:attributes.created, Updated:attributes.updated}" \
  --output table

# Data vault
az keyvault secret list \
  --vault-name flamoral-prod-data-kv \
  --query "[].{Name:name, Enabled:attributes.enabled, Created:attributes.created, Updated:attributes.updated}" \
  --output table

# External services vault
az keyvault secret list \
  --vault-name flamoral-prod-ext-kv \
  --query "[].{Name:name, Enabled:attributes.enabled, Created:attributes.created, Updated:attributes.updated}" \
  --output table

# Infrastructure vault
az keyvault secret list \
  --vault-name flamoral-prod-infra-kv \
  --query "[].{Name:name, Enabled:attributes.enabled, Created:attributes.created, Updated:attributes.updated}" \
  --output table
```

### List All Secrets Across All Vaults

```bash
# Create a script to list all secrets from all Flamoral vaults
for vault in flamoral-prod-auth-kv flamoral-prod-payment-kv flamoral-prod-data-kv flamoral-prod-ext-kv flamoral-prod-infra-kv; do
  echo "=== $vault ==="
  az keyvault secret list \
    --vault-name "$vault" \
    --query "[].{Name:name, Enabled:attributes.enabled, Updated:attributes.updated}" \
    --output table
  echo ""
done
```

### List Secrets with Expiration Dates

```bash
# Find secrets that are expiring or have no expiration
az keyvault secret list \
  --vault-name flamoral-prod-auth-kv \
  --query "[].{Name:name, Expires:attributes.expires, NotBefore:attributes.notBefore}" \
  --output table
```

### List Disabled Secrets

```bash
# Find disabled secrets
az keyvault secret list \
  --vault-name flamoral-prod-auth-kv \
  --query "[?attributes.enabled==\`false\`].{Name:name, Updated:attributes.updated}" \
  --output table
```

---

## Setting Secrets

### Method 1: Read from File (RECOMMENDED)

```bash
# Create a temporary file with the secret value
# IMPORTANT: Create file in a secure location with restricted permissions

# Linux/Mac
echo -n "your-secret-value" > /tmp/secret.txt
chmod 600 /tmp/secret.txt

az keyvault secret set \
  --vault-name flamoral-prod-auth-kv \
  --name "new-secret-name" \
  --file /tmp/secret.txt \
  --description "Description of the secret" \
  --tags "Environment=Production" "Owner=SecurityTeam"

# Clean up immediately
shred -u /tmp/secret.txt  # Linux
# or
rm -P /tmp/secret.txt      # Mac
# or
del /tmp/secret.txt        # Windows (use cipher /w for secure delete)
```

### Method 2: Read from stdin (RECOMMENDED)

```bash
# Prompt user for secret input (input is hidden)
read -s -p "Enter secret value: " SECRET_VALUE
echo

az keyvault secret set \
  --vault-name flamoral-prod-auth-kv \
  --name "new-secret-name" \
  --value "$SECRET_VALUE" \
  --description "Description of the secret" \
  --tags "Environment=Production" "Owner=SecurityTeam"

# Clear variable immediately
unset SECRET_VALUE
```

### Method 3: Pipe from Password Generator

```bash
# Generate and store a random secret (useful for API keys, tokens)
openssl rand -base64 32 | az keyvault secret set \
  --vault-name flamoral-prod-auth-kv \
  --name "api-token" \
  --file /dev/stdin \
  --description "Auto-generated API token"
```

### Set Secret with Expiration Date

```bash
# Set secret with expiration (1 year from now)
az keyvault secret set \
  --vault-name flamoral-prod-auth-kv \
  --name "temporary-api-key" \
  --file /tmp/secret.txt \
  --expires "$(date -u -d '+1 year' '+%Y-%m-%dT%H:%M:%SZ')" \
  --description "Expires in 1 year"
```

### Set Secret with Activation Date

```bash
# Set secret that becomes active in the future
az keyvault secret set \
  --vault-name flamoral-prod-auth-kv \
  --name "scheduled-secret" \
  --file /tmp/secret.txt \
  --not-before "$(date -u -d '+7 days' '+%Y-%m-%dT%H:%M:%SZ')" \
  --description "Activates in 7 days"
```

### Update Secret Tags/Metadata Only

```bash
# Update tags without changing the secret value
az keyvault secret set-attributes \
  --vault-name flamoral-prod-auth-kv \
  --name "existing-secret" \
  --tags "LastRotated=2025-12-12" "RotatedBy=security-team"
```

### Disable a Secret (without deleting)

```bash
# Temporarily disable a secret
az keyvault secret set-attributes \
  --vault-name flamoral-prod-auth-kv \
  --name "secret-to-disable" \
  --enabled false
```

---

## Retrieving Secrets

### Get Secret Value (SECURE METHOD)

```bash
# Get secret and store in variable (use immediately and unset)
SECRET_VALUE=$(az keyvault secret show \
  --vault-name flamoral-prod-auth-kv \
  --name "secret-name" \
  --query "value" \
  --output tsv)

# Use the secret (e.g., in an application deployment)
# ... your operation here ...

# Clear variable immediately after use
unset SECRET_VALUE
```

### Get Secret Metadata Only (NO VALUE)

```bash
# Get secret properties without retrieving the actual value
az keyvault secret show \
  --vault-name flamoral-prod-auth-kv \
  --name "secret-name" \
  --query "{Name:name, Enabled:attributes.enabled, Created:attributes.created, Updated:attributes.updated, Tags:tags}" \
  --output json
```

### Export Secret to File (USE WITH CAUTION)

```bash
# Export secret to encrypted file
az keyvault secret show \
  --vault-name flamoral-prod-auth-kv \
  --name "secret-name" \
  --query "value" \
  --output tsv > /tmp/secret.txt

# Immediately encrypt the file
gpg --symmetric --cipher-algo AES256 /tmp/secret.txt
shred -u /tmp/secret.txt

# The encrypted file is now: /tmp/secret.txt.gpg
```

---

## Secret Rotation

### Manual Secret Rotation Process

```bash
# Step 1: Generate new secret value
NEW_SECRET=$(openssl rand -base64 32)

# Step 2: Create new version of the secret
az keyvault secret set \
  --vault-name flamoral-prod-auth-kv \
  --name "api-key" \
  --value "$NEW_SECRET" \
  --tags "RotatedOn=$(date -u '+%Y-%m-%d')" "RotatedBy=$(az account show --query user.name -o tsv)"

# Step 3: Update application configuration
# (Application-specific steps here)

# Step 4: Verify new secret works
# (Testing steps here)

# Step 5: Clean up
unset NEW_SECRET
```

### Rotate Database Connection String

```bash
# IMPORTANT: This is a multi-step process requiring database coordination

# Step 1: Create new database user/password
# (Perform this in your database management system)

# Step 2: Store new connection string
read -s -p "Enter new connection string: " NEW_CONN_STRING
echo

az keyvault secret set \
  --vault-name flamoral-prod-data-kv \
  --name "postgres-connection-string" \
  --value "$NEW_CONN_STRING" \
  --tags "RotatedOn=$(date -u '+%Y-%m-%d')" "PreviousVersion=v$(date +%s)"

unset NEW_CONN_STRING

# Step 3: Update applications to use new connection string
# Step 4: Restart application services
# Step 5: Monitor for errors
# Step 6: Deactivate old database credentials (after verification)
```

### Rotate External API Keys

```bash
# For services like Twilio, SendGrid, Stripe, etc.

# Step 1: Generate new API key in the external service dashboard
# Step 2: Store new key in Key Vault
read -s -p "Enter new API key: " NEW_API_KEY
echo

az keyvault secret set \
  --vault-name flamoral-prod-ext-kv \
  --name "twilio-api-key" \
  --value "$NEW_API_KEY" \
  --tags "RotatedOn=$(date -u '+%Y-%m-%d')" "Service=Twilio"

unset NEW_API_KEY

# Step 3: Deploy updated configuration to applications
# Step 4: Verify functionality
# Step 5: Revoke old API key in external service
```

### Automated Rotation Script Template

```bash
#!/bin/bash
# rotate-secret.sh - Template for automated secret rotation

set -euo pipefail

VAULT_NAME="flamoral-prod-auth-kv"
SECRET_NAME="api-key"
ROTATION_DATE=$(date -u '+%Y-%m-%d')

# Disable history for this session
set +o history

echo "Starting rotation for: $SECRET_NAME"

# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# Store new version
az keyvault secret set \
  --vault-name "$VAULT_NAME" \
  --name "$SECRET_NAME" \
  --value "$NEW_SECRET" \
  --tags "RotatedOn=$ROTATION_DATE" "AutoRotated=true" \
  --output none

# Trigger application reload (customize for your environment)
# kubectl rollout restart deployment/app-name
# az webapp restart --name app-name --resource-group rg-name

# Clean up
unset NEW_SECRET
set -o history

echo "Rotation completed successfully"
```

---

## Backup & Recovery

### Backup Single Secret

```bash
# Backup a secret to an encrypted file
SECRET_NAME="important-secret"
VAULT_NAME="flamoral-prod-auth-kv"
BACKUP_FILE="/secure/backups/keyvault/${SECRET_NAME}-$(date +%Y%m%d).backup"

az keyvault secret backup \
  --vault-name "$VAULT_NAME" \
  --name "$SECRET_NAME" \
  --file "$BACKUP_FILE"

# The backup file is encrypted by Azure and can only be restored to a vault in the same subscription
echo "Backup saved to: $BACKUP_FILE"
```

### Backup All Secrets in a Vault

```bash
#!/bin/bash
# backup-all-secrets.sh

VAULT_NAME="flamoral-prod-auth-kv"
BACKUP_DIR="/secure/backups/keyvault/$(date +%Y%m%d)"

mkdir -p "$BACKUP_DIR"

# Get all secret names
SECRETS=$(az keyvault secret list \
  --vault-name "$VAULT_NAME" \
  --query "[].name" \
  --output tsv)

# Backup each secret
for SECRET in $SECRETS; do
  echo "Backing up: $SECRET"
  az keyvault secret backup \
    --vault-name "$VAULT_NAME" \
    --name "$SECRET" \
    --file "$BACKUP_DIR/${SECRET}.backup"
done

echo "All secrets backed up to: $BACKUP_DIR"
```

### Restore Secret from Backup

```bash
# Restore a secret from backup file
BACKUP_FILE="/secure/backups/keyvault/important-secret-20251212.backup"
VAULT_NAME="flamoral-prod-auth-kv"

az keyvault secret restore \
  --vault-name "$VAULT_NAME" \
  --file "$BACKUP_FILE"

echo "Secret restored successfully"
```

### Export Secrets for Migration (USE WITH EXTREME CAUTION)

```bash
#!/bin/bash
# export-secrets-encrypted.sh
# USE ONLY FOR DISASTER RECOVERY OR MIGRATION

VAULT_NAME="flamoral-prod-auth-kv"
EXPORT_FILE="/secure/exports/vault-export-$(date +%Y%m%d).json"
ENCRYPTION_KEY="your-gpg-key-id"

# Disable history
set +o history

# Export all secret names and values
az keyvault secret list \
  --vault-name "$VAULT_NAME" \
  --query "[].name" \
  --output tsv | while read SECRET_NAME; do

  SECRET_VALUE=$(az keyvault secret show \
    --vault-name "$VAULT_NAME" \
    --name "$SECRET_NAME" \
    --query "value" \
    --output tsv)

  echo "{\"name\":\"$SECRET_NAME\",\"value\":\"$SECRET_VALUE\"}" >> "$EXPORT_FILE.tmp"
done

# Encrypt the export
gpg --encrypt --recipient "$ENCRYPTION_KEY" "$EXPORT_FILE.tmp"
shred -u "$EXPORT_FILE.tmp"

echo "Encrypted export saved to: $EXPORT_FILE.tmp.gpg"

set -o history
```

---

## Verification Commands

### Verify Secret Exists

```bash
# Check if a secret exists (returns exit code 0 if exists)
SECRET_NAME="api-key"
VAULT_NAME="flamoral-prod-auth-kv"

if az keyvault secret show \
  --vault-name "$VAULT_NAME" \
  --name "$SECRET_NAME" \
  --query "name" \
  --output tsv &>/dev/null; then
  echo "Secret '$SECRET_NAME' exists"
else
  echo "Secret '$SECRET_NAME' does NOT exist"
fi
```

### Verify Secret is Enabled

```bash
# Check if a secret is enabled
ENABLED=$(az keyvault secret show \
  --vault-name flamoral-prod-auth-kv \
  --name "api-key" \
  --query "attributes.enabled" \
  --output tsv)

if [ "$ENABLED" = "true" ]; then
  echo "Secret is enabled"
else
  echo "Secret is DISABLED"
fi
```

### Verify Secret is Not Expired

```bash
# Check if a secret has expired
EXPIRES=$(az keyvault secret show \
  --vault-name flamoral-prod-auth-kv \
  --name "api-key" \
  --query "attributes.expires" \
  --output tsv)

if [ -n "$EXPIRES" ]; then
  CURRENT_DATE=$(date -u +%s)
  EXPIRE_DATE=$(date -d "$EXPIRES" +%s)

  if [ $CURRENT_DATE -lt $EXPIRE_DATE ]; then
    echo "Secret is valid (expires: $EXPIRES)"
  else
    echo "Secret has EXPIRED (expired: $EXPIRES)"
  fi
else
  echo "Secret has no expiration date"
fi
```

### Verify All Required Secrets Exist

```bash
#!/bin/bash
# verify-required-secrets.sh

VAULT_NAME="flamoral-prod-auth-kv"

# List of required secrets
REQUIRED_SECRETS=(
  "jwt-secret-key"
  "refresh-token-secret"
  "oauth2-client-secret"
  "session-encryption-key"
)

echo "Verifying required secrets in $VAULT_NAME..."
MISSING_SECRETS=()

for SECRET in "${REQUIRED_SECRETS[@]}"; do
  if az keyvault secret show \
    --vault-name "$VAULT_NAME" \
    --name "$SECRET" \
    --query "name" \
    --output tsv &>/dev/null; then
    echo "✓ $SECRET"
  else
    echo "✗ $SECRET (MISSING)"
    MISSING_SECRETS+=("$SECRET")
  fi
done

if [ ${#MISSING_SECRETS[@]} -eq 0 ]; then
  echo "All required secrets are present"
  exit 0
else
  echo "ERROR: ${#MISSING_SECRETS[@]} secrets are missing"
  exit 1
fi
```

### Health Check All Vaults

```bash
#!/bin/bash
# vault-health-check.sh

VAULTS=(
  "flamoral-prod-auth-kv"
  "flamoral-prod-payment-kv"
  "flamoral-prod-data-kv"
  "flamoral-prod-ext-kv"
  "flamoral-prod-infra-kv"
)

echo "=== Key Vault Health Check ==="
echo "Date: $(date -u)"
echo ""

for VAULT in "${VAULTS[@]}"; do
  echo "Checking: $VAULT"

  # Check vault accessibility
  if az keyvault show --name "$VAULT" --query "name" -o tsv &>/dev/null; then
    echo "  ✓ Vault accessible"

    # Count secrets
    SECRET_COUNT=$(az keyvault secret list --vault-name "$VAULT" --query "length([])" -o tsv)
    echo "  ✓ Secrets: $SECRET_COUNT"

    # Check for disabled secrets
    DISABLED_COUNT=$(az keyvault secret list --vault-name "$VAULT" \
      --query "length([?attributes.enabled==\`false\`])" -o tsv)
    if [ "$DISABLED_COUNT" -gt 0 ]; then
      echo "  ⚠ Disabled secrets: $DISABLED_COUNT"
    fi

    # Check for expired secrets
    EXPIRED=$(az keyvault secret list --vault-name "$VAULT" --query \
      "[?attributes.expires<'$(date -u +%Y-%m-%dT%H:%M:%SZ)'].name" -o tsv | wc -l)
    if [ "$EXPIRED" -gt 0 ]; then
      echo "  ⚠ Expired secrets: $EXPIRED"
    fi

  else
    echo "  ✗ Vault NOT accessible"
  fi
  echo ""
done
```

---

## RBAC & Access Management

### List Current Access Policies (Legacy)

```bash
# List access policies for a vault
az keyvault show \
  --name flamoral-prod-auth-kv \
  --query "properties.accessPolicies[].{ObjectId:objectId, Permissions:permissions}" \
  --output table
```

### Grant Managed Identity Access (RBAC - RECOMMENDED)

```bash
# Grant a managed identity "Key Vault Secrets User" role
MANAGED_IDENTITY_NAME="flamoral-api-identity"
VAULT_NAME="flamoral-prod-auth-kv"

# Get the managed identity object ID
IDENTITY_ID=$(az identity show \
  --name "$MANAGED_IDENTITY_NAME" \
  --resource-group flamoral-prod-rg \
  --query principalId \
  --output tsv)

# Get the Key Vault resource ID
VAULT_ID=$(az keyvault show \
  --name "$VAULT_NAME" \
  --query id \
  --output tsv)

# Assign "Key Vault Secrets User" role (read-only)
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee-object-id "$IDENTITY_ID" \
  --assignee-principal-type ServicePrincipal \
  --scope "$VAULT_ID"

echo "Granted Key Vault Secrets User access to $MANAGED_IDENTITY_NAME"
```

### Grant User Access to Vault

```bash
# Grant a user "Key Vault Secrets Officer" role (read/write)
USER_EMAIL="security-admin@flamoral.com"
VAULT_NAME="flamoral-prod-auth-kv"

# Get the Key Vault resource ID
VAULT_ID=$(az keyvault show \
  --name "$VAULT_NAME" \
  --query id \
  --output tsv)

# Assign role
az role assignment create \
  --role "Key Vault Secrets Officer" \
  --assignee "$USER_EMAIL" \
  --scope "$VAULT_ID"
```

### List Role Assignments for a Vault

```bash
# List all role assignments for a Key Vault
VAULT_ID=$(az keyvault show \
  --name flamoral-prod-auth-kv \
  --query id \
  --output tsv)

az role assignment list \
  --scope "$VAULT_ID" \
  --query "[].{Principal:principalName, Role:roleDefinitionName, Type:principalType}" \
  --output table
```

### Revoke Access

```bash
# Remove role assignment
USER_EMAIL="user@flamoral.com"
VAULT_ID=$(az keyvault show \
  --name flamoral-prod-auth-kv \
  --query id \
  --output tsv)

az role assignment delete \
  --assignee "$USER_EMAIL" \
  --role "Key Vault Secrets User" \
  --scope "$VAULT_ID"
```

### Grant Application Service Principal Access

```bash
# For App Services, Function Apps, etc.
APP_NAME="flamoral-api-app"
VAULT_NAME="flamoral-prod-auth-kv"

# Get app's managed identity
IDENTITY_ID=$(az webapp identity show \
  --name "$APP_NAME" \
  --resource-group flamoral-prod-rg \
  --query principalId \
  --output tsv)

# Get vault ID
VAULT_ID=$(az keyvault show \
  --name "$VAULT_NAME" \
  --query id \
  --output tsv)

# Grant access
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee-object-id "$IDENTITY_ID" \
  --assignee-principal-type ServicePrincipal \
  --scope "$VAULT_ID"
```

### Audit Access Permissions

```bash
#!/bin/bash
# audit-vault-access.sh

VAULT_NAME="flamoral-prod-auth-kv"

echo "=== Access Audit for $VAULT_NAME ==="
echo "Date: $(date -u)"
echo ""

VAULT_ID=$(az keyvault show --name "$VAULT_NAME" --query id --output tsv)

echo "Role Assignments:"
az role assignment list \
  --scope "$VAULT_ID" \
  --query "[].{Principal:principalName, Email:principalId, Role:roleDefinitionName, Type:principalType}" \
  --output table

echo ""
echo "Managed Identities with Access:"
az role assignment list \
  --scope "$VAULT_ID" \
  --query "[?principalType=='ServicePrincipal'].{ObjectId:principalId, Role:roleDefinitionName}" \
  --output table
```

---

## Emergency Access Procedures

### Break-Glass Access Procedure

```bash
# EMERGENCY USE ONLY
# When normal access methods fail

# 1. Authenticate with break-glass account
az login --username breakglass@flamoral.com

# 2. Verify identity
az account show

# 3. Grant yourself temporary emergency access
VAULT_ID=$(az keyvault show \
  --name flamoral-prod-auth-kv \
  --query id \
  --output tsv)

MY_OBJECT_ID=$(az ad signed-in-user show --query id --output tsv)

az role assignment create \
  --role "Key Vault Secrets Officer" \
  --assignee-object-id "$MY_OBJECT_ID" \
  --scope "$VAULT_ID"

# 4. Perform emergency operations
# ... (retrieve secrets, fix issues, etc.)

# 5. IMPORTANT: Document actions in incident log

# 6. Revoke emergency access when done
az role assignment delete \
  --assignee-object-id "$MY_OBJECT_ID" \
  --role "Key Vault Secrets Officer" \
  --scope "$VAULT_ID"

# 7. Create incident report
```

### Recover Deleted Secret (Soft Delete)

```bash
# List deleted secrets
az keyvault secret list-deleted \
  --vault-name flamoral-prod-auth-kv \
  --query "[].{Name:name, DeletedDate:deletedDate, RecoveryId:recoveryId}" \
  --output table

# Recover a deleted secret
az keyvault secret recover \
  --vault-name flamoral-prod-auth-kv \
  --name "accidentally-deleted-secret"
```

### Purge Deleted Secret (PERMANENT)

```bash
# WARNING: This is IRREVERSIBLE
# Only use if you're absolutely certain

az keyvault secret purge \
  --vault-name flamoral-prod-auth-kv \
  --name "secret-to-permanently-delete"
```

### Emergency Secret Rotation (Compromised Secret)

```bash
#!/bin/bash
# emergency-rotation.sh
# Use when a secret has been compromised

SECRET_NAME="$1"
VAULT_NAME="$2"

if [ -z "$SECRET_NAME" ] || [ -z "$VAULT_NAME" ]; then
  echo "Usage: $0 <secret-name> <vault-name>"
  exit 1
fi

echo "=== EMERGENCY SECRET ROTATION ==="
echo "Secret: $SECRET_NAME"
echo "Vault: $VAULT_NAME"
echo "Time: $(date -u)"
echo ""

# Disable history
set +o history

# 1. Disable the compromised secret immediately
echo "Step 1: Disabling compromised secret..."
az keyvault secret set-attributes \
  --vault-name "$VAULT_NAME" \
  --name "$SECRET_NAME" \
  --enabled false \
  --tags "Status=Compromised" "DisabledOn=$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

# 2. Generate new secret
echo "Step 2: Generating new secret value..."
NEW_SECRET=$(openssl rand -base64 32)

# 3. Create new secret with different name
NEW_SECRET_NAME="${SECRET_NAME}-$(date +%Y%m%d-%H%M%S)"
echo "Step 3: Storing new secret as: $NEW_SECRET_NAME"
az keyvault secret set \
  --vault-name "$VAULT_NAME" \
  --name "$NEW_SECRET_NAME" \
  --value "$NEW_SECRET" \
  --tags "ReplacedSecret=$SECRET_NAME" "RotatedOn=$(date -u '+%Y-%m-%d')" "Reason=Compromised"

# 4. Output new secret name
echo ""
echo "New secret created: $NEW_SECRET_NAME"
echo "Old secret disabled: $SECRET_NAME"
echo ""
echo "NEXT STEPS:"
echo "1. Update application configuration to use: $NEW_SECRET_NAME"
echo "2. Deploy updated configuration"
echo "3. Verify application functionality"
echo "4. Revoke access to compromised secret in external systems"
echo "5. Create incident report"
echo "6. Schedule permanent deletion of old secret after verification period"

# Clean up
unset NEW_SECRET
set -o history
```

### Emergency Vault Lockdown

```bash
#!/bin/bash
# lockdown-vault.sh
# Revoke all user access in case of security incident

VAULT_NAME="$1"

if [ -z "$VAULT_NAME" ]; then
  echo "Usage: $0 <vault-name>"
  exit 1
fi

echo "=== EMERGENCY VAULT LOCKDOWN ==="
echo "Vault: $VAULT_NAME"
echo "WARNING: This will revoke all non-admin user access"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Lockdown cancelled"
  exit 0
fi

VAULT_ID=$(az keyvault show --name "$VAULT_NAME" --query id --output tsv)

# Get all role assignments except administrators
az role assignment list \
  --scope "$VAULT_ID" \
  --query "[?roleDefinitionName!='Key Vault Administrator'].id" \
  --output tsv | while read ASSIGNMENT_ID; do

  echo "Revoking: $ASSIGNMENT_ID"
  az role assignment delete --ids "$ASSIGNMENT_ID"
done

echo ""
echo "Lockdown complete. Only administrators retain access."
echo "Create incident ticket and notify security team."
```

---

## Audit & Monitoring

### Enable Diagnostic Logging

```bash
# Enable logging to Log Analytics workspace
VAULT_NAME="flamoral-prod-auth-kv"
WORKSPACE_NAME="flamoral-prod-logs"

VAULT_ID=$(az keyvault show --name "$VAULT_NAME" --query id --output tsv)
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group flamoral-prod-rg \
  --workspace-name "$WORKSPACE_NAME" \
  --query id --output tsv)

az monitor diagnostic-settings create \
  --name "keyvault-diagnostics" \
  --resource "$VAULT_ID" \
  --workspace "$WORKSPACE_ID" \
  --logs '[
    {
      "category": "AuditEvent",
      "enabled": true,
      "retentionPolicy": {
        "enabled": true,
        "days": 90
      }
    }
  ]' \
  --metrics '[
    {
      "category": "AllMetrics",
      "enabled": true,
      "retentionPolicy": {
        "enabled": true,
        "days": 90
      }
    }
  ]'
```

### Query Audit Logs

```bash
# Query recent secret access events
az monitor log-analytics query \
  --workspace "flamoral-prod-logs" \
  --analytics-query "
    AzureDiagnostics
    | where ResourceProvider == 'MICROSOFT.KEYVAULT'
    | where OperationName == 'SecretGet'
    | project TimeGenerated, CallerIPAddress, identity_claim_appid_g, SecretUri=requestUri_s
    | order by TimeGenerated desc
    | take 50
  " \
  --output table
```

### Find Failed Access Attempts

```bash
# Query failed authentication attempts
az monitor log-analytics query \
  --workspace "flamoral-prod-logs" \
  --analytics-query "
    AzureDiagnostics
    | where ResourceProvider == 'MICROSOFT.KEYVAULT'
    | where ResultSignature == 'Unauthorized'
    | project TimeGenerated, CallerIPAddress, OperationName, ResultDescription
    | order by TimeGenerated desc
    | take 100
  " \
  --output table
```

### Monitor Secret Changes

```bash
# Query secret set/update operations
az monitor log-analytics query \
  --workspace "flamoral-prod-logs" \
  --analytics-query "
    AzureDiagnostics
    | where ResourceProvider == 'MICROSOFT.KEYVAULT'
    | where OperationName in ('SecretSet', 'SecretDelete')
    | project TimeGenerated, OperationName, CallerIPAddress, identity_claim_upn_s, SecretUri=requestUri_s
    | order by TimeGenerated desc
  " \
  --output table
```

### Set Up Alerts

```bash
# Create alert for unauthorized access attempts
az monitor metrics alert create \
  --name "keyvault-unauthorized-access" \
  --resource-group flamoral-prod-rg \
  --scopes "/subscriptions/{subscription-id}/resourceGroups/flamoral-prod-rg/providers/Microsoft.KeyVault/vaults/flamoral-prod-auth-kv" \
  --condition "count Availability < 95" \
  --description "Alert when Key Vault shows signs of unauthorized access" \
  --evaluation-frequency 5m \
  --window-size 15m \
  --severity 2 \
  --action /subscriptions/{subscription-id}/resourceGroups/flamoral-prod-rg/providers/microsoft.insights/actionGroups/security-team-alerts
```

---

## Best Practices

### 1. Secret Naming Conventions

```bash
# Use consistent naming patterns:
# Format: {service}-{environment}-{purpose}-{type}

# Examples:
az keyvault secret set --vault-name flamoral-prod-auth-kv \
  --name "api-prod-jwt-secret" --file /tmp/secret.txt

az keyvault secret set --vault-name flamoral-prod-payment-kv \
  --name "stripe-prod-webhook-secret" --file /tmp/secret.txt

az keyvault secret set --vault-name flamoral-prod-data-kv \
  --name "postgres-prod-admin-password" --file /tmp/secret.txt
```

### 2. Always Tag Secrets

```bash
# Include metadata tags for tracking and auditing
az keyvault secret set \
  --vault-name flamoral-prod-auth-kv \
  --name "api-key" \
  --file /tmp/secret.txt \
  --tags \
    "Environment=Production" \
    "Owner=SecurityTeam" \
    "Service=API" \
    "RotationSchedule=90days" \
    "CreatedBy=$(az account show --query user.name -o tsv)" \
    "CreatedOn=$(date -u '+%Y-%m-%d')"
```

### 3. Set Expiration Dates

```bash
# Always set expiration for temporary secrets
az keyvault secret set \
  --vault-name flamoral-prod-auth-kv \
  --name "temporary-access-token" \
  --file /tmp/secret.txt \
  --expires "$(date -u -d '+30 days' '+%Y-%m-%dT%H:%M:%SZ')"
```

### 4. Use Managed Identities

```bash
# Always prefer managed identities over service principals
# No need to manage credentials

# Example: App Service automatically gets Key Vault access
az webapp identity assign \
  --name flamoral-api \
  --resource-group flamoral-prod-rg

# Then grant Key Vault access to the managed identity (shown earlier)
```

### 5. Regular Secret Rotation Schedule

```bash
# Create a rotation schedule

# High-sensitivity secrets: Rotate every 30 days
#   - Database admin passwords
#   - Root API keys
#   - Encryption keys

# Medium-sensitivity: Rotate every 90 days
#   - Application API keys
#   - Service tokens
#   - Integration credentials

# Low-sensitivity: Rotate every 180 days
#   - Read-only API keys
#   - Non-critical service credentials
```

### 6. Backup Before Major Changes

```bash
# Always backup before:
# - Secret rotation
# - Vault migration
# - Major deployment
# - Access policy changes

az keyvault secret backup \
  --vault-name flamoral-prod-auth-kv \
  --name "critical-secret" \
  --file "/secure/backups/pre-rotation-$(date +%Y%m%d).backup"
```

### 7. Monitor and Alert

```bash
# Set up monitoring for:
# - Unauthorized access attempts
# - Secret modifications
# - Expired secrets
# - Failed authentication
# - Unusual access patterns

# See "Audit & Monitoring" section for specific commands
```

### 8. Principle of Least Privilege

```bash
# Grant minimum required permissions
# Use "Key Vault Secrets User" for read-only access
# Reserve "Key Vault Secrets Officer" for administrators only

# Read-only access for applications
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee-object-id "$APP_IDENTITY_ID" \
  --scope "$VAULT_ID"
```

### 9. Documentation and Change Management

```bash
# Always document:
# - Why a secret was created
# - Who has access
# - Rotation schedule
# - Related applications/services
# - Emergency contact

# Use tags and descriptions
az keyvault secret set \
  --vault-name flamoral-prod-auth-kv \
  --name "api-key" \
  --file /tmp/secret.txt \
  --description "Production API key for Flamoral mobile app. Owner: mobile-team@flamoral.com. Rotated quarterly."
```

### 10. Disable Command History for Sensitive Operations

```bash
# Always disable history when working with secrets

# Start of session
set +o history

# ... perform secret operations ...

# End of session
set -o history
```

---

## Quick Reference Commands

### Most Common Operations

```bash
# List all secrets in a vault
az keyvault secret list --vault-name flamoral-prod-auth-kv -o table

# Set a secret from stdin
read -s -p "Enter secret: " SECRET && echo && \
  az keyvault secret set --vault-name flamoral-prod-auth-kv --name "my-secret" --value "$SECRET" && \
  unset SECRET

# Get a secret value
az keyvault secret show --vault-name flamoral-prod-auth-kv --name "my-secret" --query value -o tsv

# Backup a secret
az keyvault secret backup --vault-name flamoral-prod-auth-kv --name "my-secret" --file backup.blob

# Grant managed identity access
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee-object-id "$IDENTITY_ID" \
  --scope "$VAULT_ID"

# Check vault health
az keyvault show --name flamoral-prod-auth-kv --query "{Name:name,EnableSoftDelete:properties.enableSoftDelete,EnablePurgeProtection:properties.enablePurgeProtection}" -o json
```

---

## Additional Resources

- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
- [Azure CLI Key Vault Reference](https://docs.microsoft.com/en-us/cli/azure/keyvault)
- [Key Vault Best Practices](https://docs.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [Flamoral Security Runbooks](./SECURITY_INCIDENT_RESPONSE_PLAN.md)
- [Flamoral Access Control Policy](./keyvault-access.md)

---

## Support Contacts

- **Security Team**: security@flamoral.com
- **DevOps Team**: devops@flamoral.com
- **On-Call**: +1-XXX-XXX-XXXX (PagerDuty)
- **Emergency Break-Glass**: breakglass@flamoral.com

---

**Document Classification:** INTERNAL - SECURITY OPERATIONS
**Last Reviewed:** 2025-12-12
**Next Review:** 2026-03-12
**Owner:** Security Team
