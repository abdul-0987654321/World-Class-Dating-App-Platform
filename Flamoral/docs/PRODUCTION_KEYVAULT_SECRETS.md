# Production Key Vault Secrets - Flamoral Dating Platform

This document describes all secrets populated in the 5 production Key Vaults for the Flamoral Dating Platform.

## Vault Architecture

The platform uses a **vault-per-app-per-environment** architecture for enhanced security isolation:

| Vault Name | Purpose | Security Level |
|------------|---------|----------------|
| `flamoralprodauthkv` | Authentication secrets (JWT, OAuth, sessions) | Premium SKU |
| `flamoralprodpaymentkv` | Payment provider secrets (Stripe, IAP) | Premium SKU (PCI compliance) |
| `flamoralproddatakv` | Database and cache connection secrets | Premium SKU |
| `flamoralprodexternalkv` | Third-party API keys | Premium SKU |
| `flamoralprodinfrakv` | Infrastructure and service secrets | Premium SKU |

## Secrets Populated

### 1. Auth Vault (`flamoralprodauthkv`)

Authentication and session management secrets:

| Secret Name | Type | Description | Status |
|-------------|------|-------------|--------|
| `jwt-secret` | Generated | Main JWT signing secret (64 chars) | ✅ Generated |
| `jwt-access-secret` | Generated | JWT access token signing secret (64 chars) | ✅ Generated |
| `jwt-refresh-secret` | Generated | JWT refresh token signing secret (64 chars) | ✅ Generated |
| `session-secret` | Generated | Session cookie signing secret (32 chars) | ✅ Generated |

**All secrets in this vault are automatically generated using cryptographically secure random number generation.**

### 2. Payment Vault (`flamoralprodpaymentkv`)

Payment provider credentials:

| Secret Name | Type | Description | Status |
|-------------|------|-------------|--------|
| `stripe-secret-key` | Placeholder | Stripe secret API key (sk_live_...) | ⚠️ **NEEDS REPLACEMENT** |
| `stripe-webhook-secret` | Placeholder | Stripe webhook signing secret (whsec_...) | ⚠️ **NEEDS REPLACEMENT** |

**Action Required:** Replace placeholder values with actual Stripe credentials from [Stripe Dashboard](https://dashboard.stripe.com/apikeys).

```bash
# Update Stripe secret key
az keyvault secret set \
  --vault-name flamoralprodpaymentkv \
  --name stripe-secret-key \
  --value "sk_live_YOUR_ACTUAL_KEY"

# Update Stripe webhook secret
az keyvault secret set \
  --vault-name flamoralprodpaymentkv \
  --name stripe-webhook-secret \
  --value "whsec_YOUR_ACTUAL_SECRET"
```

### 3. Data Vault (`flamoralproddatakv`)

Database and cache connection secrets:

| Secret Name | Type | Description | Status |
|-------------|------|-------------|--------|
| `postgres-password` | Generated | PostgreSQL admin password (32 chars) | ✅ Generated |
| `redis-password` | Generated | Redis authentication password (32 chars) | ✅ Generated |

**All secrets in this vault are automatically generated using cryptographically secure random number generation.**

**Note:** Additional connection strings (postgres-connection-string, redis-connection-string, mongodb-uri, cosmosdb-key) may be automatically created by Terraform based on resource outputs.

### 4. External Services Vault (`flamoralprodexternalkv`)

Third-party service API keys:

| Secret Name | Type | Description | Status |
|-------------|------|-------------|--------|
| `sendgrid-api-key` | Placeholder | SendGrid email API key | ⚠️ **NEEDS REPLACEMENT** |
| `twilio-auth-token` | Placeholder | Twilio SMS authentication token | ⚠️ **NEEDS REPLACEMENT** |
| `firebase-private-key` | Placeholder | Firebase Cloud Messaging private key | ⚠️ **NEEDS REPLACEMENT** |
| `agora-app-certificate` | Placeholder | Agora video/audio app certificate | ⚠️ **NEEDS REPLACEMENT** |
| `sentry-dsn` | Placeholder | Sentry error tracking DSN | ⚠️ **NEEDS REPLACEMENT** |
| `openai-api-key` | Placeholder | OpenAI API key for AI features | ⚠️ **NEEDS REPLACEMENT** |

**Action Required:** Replace all placeholder values with actual API keys from respective service providers.

```bash
# Update SendGrid API key
az keyvault secret set \
  --vault-name flamoralprodexternalkv \
  --name sendgrid-api-key \
  --value "SG.YOUR_ACTUAL_KEY"

# Update Twilio auth token
az keyvault secret set \
  --vault-name flamoralprodexternalkv \
  --name twilio-auth-token \
  --value "YOUR_ACTUAL_TOKEN"

# Update Firebase private key (multiline JSON)
az keyvault secret set \
  --vault-name flamoralprodexternalkv \
  --name firebase-private-key \
  --file firebase-service-account.json

# Update Agora app certificate
az keyvault secret set \
  --vault-name flamoralprodexternalkv \
  --name agora-app-certificate \
  --value "YOUR_ACTUAL_CERTIFICATE"

# Update Sentry DSN
az keyvault secret set \
  --vault-name flamoralprodexternalkv \
  --name sentry-dsn \
  --value "https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID"

# Update OpenAI API key
az keyvault secret set \
  --vault-name flamoralprodexternalkv \
  --name openai-api-key \
  --value "sk-YOUR_ACTUAL_KEY"
```

### 5. Infrastructure Vault (`flamoralprodinfrakv`)

Infrastructure and internal service secrets:

| Secret Name | Type | Description | Status |
|-------------|------|-------------|--------|
| `service-api-key` | Generated | Internal service-to-service API key (64 chars) | ✅ Generated |
| `encryption-key` | Generated | Data encryption key (64 hex chars / 32 bytes) | ✅ Generated |
| `azure-storage-connection-string` | Placeholder | Azure Storage connection string | ⚠️ **NEEDS REPLACEMENT** |

**Action Required:** Replace the Azure Storage connection string with the actual value.

```bash
# Get the storage connection string from Terraform output or Azure Portal
STORAGE_CONN_STR=$(az storage account show-connection-string \
  --name flamoralprodXXXXXX \
  --resource-group flamoral-prod-rg \
  --output tsv)

# Update the secret
az keyvault secret set \
  --vault-name flamoralprodinfrakv \
  --name azure-storage-connection-string \
  --value "$STORAGE_CONN_STR"
```

**Note:** Additional infrastructure secrets (azure-face-api-key, azure-content-moderator-key, azure-service-bus-connection-string, application-insights-connection-string, elasticsearch-password) may be created by Terraform or require manual population based on deployed resources.

## Running the Population Script

### Prerequisites

1. Azure CLI installed and authenticated:
   ```bash
   az login
   az account set --subscription "YOUR_SUBSCRIPTION_ID"
   ```

2. Appropriate Key Vault permissions:
   - Key Vault Secrets Officer (or Administrator) role on all 5 vaults
   - Can be granted via:
     ```bash
     az role assignment create \
       --role "Key Vault Secrets Officer" \
       --assignee YOUR_USER_PRINCIPAL_ID \
       --scope /subscriptions/SUB_ID/resourceGroups/flamoral-prod-rg/providers/Microsoft.KeyVault/vaults/VAULT_NAME
     ```

### PowerShell (Windows)

```powershell
cd DatingPlatform\scripts
.\populate-prod-keyvault-secrets.ps1
```

### Bash (Linux/Mac)

```bash
cd DatingPlatform/scripts
chmod +x populate-prod-keyvault-secrets.sh
./populate-prod-keyvault-secrets.sh
```

## Post-Population Tasks

### 1. Verify Secrets

Verify all secrets were created successfully:

```bash
# List secrets in each vault
az keyvault secret list --vault-name flamoralprodauthkv --output table
az keyvault secret list --vault-name flamoralprodpaymentkv --output table
az keyvault secret list --vault-name flamoralproddatakv --output table
az keyvault secret list --vault-name flamoralprodexternalkv --output table
az keyvault secret list --vault-name flamoralprodinfrakv --output table
```

### 2. Replace Placeholder Values

Update all secrets marked as **NEEDS REPLACEMENT** with actual values from service providers:

- **Stripe**: Get from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
- **SendGrid**: Get from [SendGrid Settings](https://app.sendgrid.com/settings/api_keys)
- **Twilio**: Get from [Twilio Console](https://console.twilio.com/)
- **Firebase**: Download service account JSON from [Firebase Console](https://console.firebase.google.com/)
- **Agora**: Get from [Agora Console](https://console.agora.io/)
- **Sentry**: Get from [Sentry Project Settings](https://sentry.io/settings/)
- **OpenAI**: Get from [OpenAI API Keys](https://platform.openai.com/api-keys)
- **Azure Storage**: Get from Azure Portal or Terraform output

### 3. Update Kubernetes Secrets

Update the Kubernetes secret providers to reference the Key Vaults:

```bash
kubectl apply -f infrastructure/kubernetes/secrets/service-vault-providers.yaml
```

### 4. Grant Application Access

Ensure AKS managed identities have access (should be handled by Terraform):

```bash
# Verify AKS identity has "Key Vault Secrets User" role on all vaults
az role assignment list \
  --assignee AKS_KUBELET_IDENTITY_OBJECT_ID \
  --scope /subscriptions/SUB_ID/resourceGroups/flamoral-prod-rg
```

## Security Best Practices

1. **Never commit secrets to version control**
2. **Rotate secrets regularly** (use `scripts/deployment/rotate-secrets.sh`)
3. **Monitor Key Vault access** via Azure Monitor and Log Analytics
4. **Use managed identities** for application access (no credentials in code)
5. **Enable soft delete and purge protection** (already configured)
6. **Restrict network access** to Key Vaults (configured for AKS subnet only)
7. **Enable audit logging** (configured via diagnostic settings)

## Troubleshooting

### Permission Denied Errors

If you get permission errors:

```bash
# Check your current permissions
az role assignment list --assignee $(az ad signed-in-user show --query id -o tsv) --all

# Request access from the subscription owner
```

### Network Access Errors

If you can't access vaults due to network restrictions:

```bash
# Temporarily add your IP to the vault firewall
az keyvault network-rule add \
  --name VAULT_NAME \
  --ip-address YOUR_IP_ADDRESS
```

### Secret Not Found

If Kubernetes pods can't access secrets:

1. Verify the CSI driver is installed: `kubectl get pods -n kube-system | grep secrets-store`
2. Check SecretProviderClass: `kubectl get secretproviderclass -A`
3. Verify AKS identity has access: See "Grant Application Access" above
4. Check pod logs: `kubectl logs POD_NAME`

## References

- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
- [Azure Key Vault Best Practices](https://docs.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [Secrets Store CSI Driver](https://secrets-store-csi-driver.sigs.k8s.io/)
- [Azure Provider for Secrets Store CSI Driver](https://azure.github.io/secrets-store-csi-driver-provider-azure/)

## Support

For issues or questions:
1. Check this documentation
2. Review Terraform module: `infrastructure/terraform/modules/service-vaults/`
3. Check deployment guide: `infrastructure/config/DEPLOYMENT_GUIDE.md`
4. Contact the DevOps team
