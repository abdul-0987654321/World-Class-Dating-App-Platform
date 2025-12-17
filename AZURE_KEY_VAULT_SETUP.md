# Azure Key Vault Setup Guide - Flamoral Dating Platform

This guide provides step-by-step instructions for setting up and managing Azure Key Vault for secure secrets management in the Flamoral dating platform.

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Storing Secrets](#storing-secrets)
- [Accessing Secrets](#accessing-secrets)
- [Secret Rotation](#secret-rotation)
- [Troubleshooting](#troubleshooting)

---

## Overview

Azure Key Vault is used to securely store and manage all sensitive credentials and secrets for the Flamoral platform. This ensures that:

- No secrets are stored in source code or configuration files
- Access to secrets is controlled and audited
- Secrets can be rotated without code changes
- Compliance requirements are met

**Key Vaults:**
- **Production:** `flamoral-prod-kv`
- **Staging:** `flamoral-staging-kv`
- **Development:** Use local `.env` files (NOT committed to git)

---

## Prerequisites

Before setting up Azure Key Vault, ensure you have:

1. **Azure Account & Subscription**
   - Active Azure subscription
   - Appropriate permissions to create Key Vaults
   - Resource group created for the environment

2. **Azure CLI Installed**
   ```bash
   # Install Azure CLI
   # Windows (using winget)
   winget install Microsoft.AzureCLI

   # macOS (using Homebrew)
   brew install azure-cli

   # Linux
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

3. **Authentication**
   ```bash
   # Login to Azure
   az login

   # Set the correct subscription
   az account set --subscription "Your-Subscription-ID"
   ```

4. **Required Permissions**
   - Key Vault Contributor role
   - Secrets Officer role
   - Managed Identity access (for production)

---

## Initial Setup

### Step 1: Create Key Vault

**For Production:**

```bash
# Create the Key Vault
az keyvault create \
  --name flamoral-prod-kv \
  --resource-group flamoral-prod-rg \
  --location eastus \
  --enable-rbac-authorization true \
  --enable-soft-delete true \
  --soft-delete-retention-days 90 \
  --enable-purge-protection true

# Enable logging and monitoring
az monitor diagnostic-settings create \
  --name flamoral-prod-kv-diagnostics \
  --resource /subscriptions/{subscription-id}/resourceGroups/flamoral-prod-rg/providers/Microsoft.KeyVault/vaults/flamoral-prod-kv \
  --workspace /subscriptions/{subscription-id}/resourceGroups/flamoral-prod-rg/providers/Microsoft.OperationalInsights/workspaces/flamoral-prod-workspace \
  --logs '[{"category":"AuditEvent","enabled":true,"retentionPolicy":{"enabled":true,"days":90}}]' \
  --metrics '[{"category":"AllMetrics","enabled":true,"retentionPolicy":{"enabled":true,"days":90}}]'
```

**For Staging:**

```bash
# Create the Key Vault
az keyvault create \
  --name flamoral-staging-kv \
  --resource-group flamoral-staging-rg \
  --location eastus \
  --enable-rbac-authorization true \
  --enable-soft-delete true \
  --soft-delete-retention-days 30
```

### Step 2: Configure Access Policies

**Using Managed Identity (Recommended for Production):**

```bash
# Create a managed identity for AKS cluster
az aks update \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks \
  --enable-managed-identity

# Get the managed identity principal ID
IDENTITY_PRINCIPAL_ID=$(az aks show \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks \
  --query "identityProfile.kubeletidentity.objectId" \
  --output tsv)

# Grant the identity access to Key Vault secrets
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $IDENTITY_PRINCIPAL_ID \
  --scope /subscriptions/{subscription-id}/resourceGroups/flamoral-prod-rg/providers/Microsoft.KeyVault/vaults/flamoral-prod-kv
```

**For Development/Testing Access:**

```bash
# Get your user principal ID
USER_PRINCIPAL_ID=$(az ad signed-in-user show --query id --output tsv)

# Grant yourself access to manage secrets (for initial setup)
az role assignment create \
  --role "Key Vault Secrets Officer" \
  --assignee $USER_PRINCIPAL_ID \
  --scope /subscriptions/{subscription-id}/resourceGroups/flamoral-prod-rg/providers/Microsoft.KeyVault/vaults/flamoral-prod-kv
```

### Step 3: Configure Network Security

**Restrict Access to Key Vault:**

```bash
# Enable firewall (deny by default)
az keyvault update \
  --name flamoral-prod-kv \
  --resource-group flamoral-prod-rg \
  --default-action Deny

# Allow access from AKS subnet
az keyvault network-rule add \
  --name flamoral-prod-kv \
  --resource-group flamoral-prod-rg \
  --subnet /subscriptions/{subscription-id}/resourceGroups/flamoral-prod-rg/providers/Microsoft.Network/virtualNetworks/flamoral-prod-vnet/subnets/aks-subnet

# Allow access from your current IP (for management)
MY_IP=$(curl -s https://api.ipify.org)
az keyvault network-rule add \
  --name flamoral-prod-kv \
  --resource-group flamoral-prod-rg \
  --ip-address $MY_IP
```

---

## Storing Secrets

### Secret Naming Convention

Use the following naming convention for consistency:

```
{SERVICE}-{CATEGORY}-{NAME}

Examples:
- DB-PASSWORD
- JWT-ACCESS-SECRET
- STRIPE-SECRET-KEY
- AZURE-STORAGE-CONNECTION-STRING
```

### Step 1: Database Credentials

```bash
# PostgreSQL Password
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name DB-PASSWORD \
  --value "GENERATE_STRONG_PASSWORD_HERE"

# Database Connection String
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name DATABASE-URL \
  --value "postgresql://flamoral_admin:PASSWORD@flamoral-prod-postgres.postgres.database.azure.com:5432/flamoral?sslmode=require"

# MongoDB/Cosmos DB URI
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name MONGODB-URI \
  --value "mongodb://USERNAME:PASSWORD@flamoral-prod-cosmos.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb"

# Read Replicas
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name DB-READ-REPLICA-1-URL \
  --value "postgresql://..."

az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name DB-READ-REPLICA-2-URL \
  --value "postgresql://..."
```

### Step 2: Authentication Secrets

```bash
# Generate cryptographically secure JWT secrets (64+ characters)
# Use a secure random generator
JWT_ACCESS_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
JWT_SECRET=$(openssl rand -base64 64)
SESSION_SECRET=$(openssl rand -base64 48)

az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name JWT-ACCESS-SECRET \
  --value "$JWT_ACCESS_SECRET"

az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name JWT-REFRESH-SECRET \
  --value "$JWT_REFRESH_SECRET"

az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name JWT-SECRET \
  --value "$JWT_SECRET"

az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name SESSION-SECRET \
  --value "$SESSION_SECRET"

# Service-to-service API key
SERVICE_API_KEY=$(openssl rand -base64 64)
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name SERVICE-API-KEY \
  --value "$SERVICE_API_KEY"
```

### Step 3: Cache & Message Queue

```bash
# Redis
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name REDIS-PASSWORD \
  --value "GET_FROM_AZURE_PORTAL"

az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name REDIS-URL \
  --value "rediss://:PASSWORD@flamoral-prod-redis.redis.cache.windows.net:6380"

# Azure Service Bus
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name AZURE-SERVICE-BUS-CONNECTION-STRING \
  --value "Endpoint=sb://flamoral-prod-servicebus.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=KEY"
```

### Step 4: OAuth Providers

```bash
# Google OAuth
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name GOOGLE-CLIENT-SECRET \
  --value "YOUR_GOOGLE_CLIENT_SECRET"

# Facebook OAuth
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name FACEBOOK-APP-SECRET \
  --value "YOUR_FACEBOOK_APP_SECRET"

# Apple OAuth
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name APPLE-PRIVATE-KEY \
  --value "YOUR_APPLE_PRIVATE_KEY"
```

### Step 5: Payment Gateway

```bash
# Stripe (PRODUCTION - LIVE KEYS)
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name STRIPE-SECRET-KEY \
  --value "sk_live_YOUR_STRIPE_SECRET_KEY"

az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name STRIPE-WEBHOOK-SECRET \
  --value "whsec_YOUR_WEBHOOK_SECRET"
```

### Step 6: Email & SMS Services

```bash
# SendGrid
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name SENDGRID-API-KEY \
  --value "SG.YOUR_SENDGRID_API_KEY"

# Twilio
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name TWILIO-AUTH-TOKEN \
  --value "YOUR_TWILIO_AUTH_TOKEN"
```

### Step 7: Azure Services

```bash
# Azure Storage
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name AZURE-STORAGE-KEY \
  --value "YOUR_STORAGE_ACCOUNT_KEY"

az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name AZURE-STORAGE-CONNECTION-STRING \
  --value "DefaultEndpointsProtocol=https;AccountName=flamoralprodst;AccountKey=KEY;EndpointSuffix=core.windows.net"

# Azure Cognitive Services
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name AZURE-FACE-API-KEY \
  --value "YOUR_FACE_API_KEY"

az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name AZURE-CONTENT-MODERATOR-KEY \
  --value "YOUR_CONTENT_MODERATOR_KEY"
```

### Step 8: Video/Voice Services

```bash
# Agora
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name AGORA-APP-CERTIFICATE \
  --value "YOUR_AGORA_CERTIFICATE"

az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name AGORA-CUSTOMER-KEY \
  --value "YOUR_AGORA_KEY"

az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name AGORA-CUSTOMER-SECRET \
  --value "YOUR_AGORA_SECRET"
```

### Step 9: AI/ML Services

```bash
# OpenAI
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name OPENAI-API-KEY \
  --value "sk-YOUR_OPENAI_API_KEY"

# Internal AI Model
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name AI-MODEL-API-KEY \
  --value "YOUR_AI_MODEL_KEY"
```

### Step 10: Monitoring & Analytics

```bash
# Sentry
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name SENTRY-DSN \
  --value "https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID"

# Application Insights
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name APPLICATION-INSIGHTS-CONNECTION-STRING \
  --value "InstrumentationKey=YOUR_KEY;IngestionEndpoint=https://..."

# Mixpanel
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name MIXPANEL-TOKEN \
  --value "YOUR_MIXPANEL_TOKEN"

# Google Maps
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name GOOGLE-MAPS-API-KEY \
  --value "YOUR_GOOGLE_MAPS_KEY"

# Mapbox
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name MAPBOX-ACCESS-TOKEN \
  --value "YOUR_MAPBOX_TOKEN"
```

### Step 11: Search & Support

```bash
# Elasticsearch
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name ELASTICSEARCH-PASSWORD \
  --value "YOUR_ELASTICSEARCH_PASSWORD"

# Zendesk
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name ZENDESK-API-TOKEN \
  --value "YOUR_ZENDESK_TOKEN"

# PagerDuty
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name PAGERDUTY-INTEGRATION-KEY \
  --value "YOUR_PAGERDUTY_KEY"
```

---

## Accessing Secrets

### From Kubernetes (Recommended)

**Using Azure Key Vault Provider for Secrets Store CSI Driver:**

1. **Install the CSI Driver:**

```bash
# Enable the add-on
az aks enable-addons \
  --addons azure-keyvault-secrets-provider \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks
```

2. **Create SecretProviderClass:**

```yaml
# infrastructure/kubernetes/secrets/keyvault-secret-provider.yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: flamoral-keyvault-secrets
  namespace: flamoral-prod
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    useVMManagedIdentity: "true"
    userAssignedIdentityID: "{managed-identity-client-id}"
    keyvaultName: "flamoral-prod-kv"
    cloudName: ""
    objects: |
      array:
        - |
          objectName: DB-PASSWORD
          objectType: secret
          objectVersion: ""
        - |
          objectName: JWT-ACCESS-SECRET
          objectType: secret
          objectVersion: ""
        - |
          objectName: REDIS-PASSWORD
          objectType: secret
          objectVersion: ""
    tenantId: "{tenant-id}"
  secretObjects:
  - secretName: flamoral-secrets
    type: Opaque
    data:
    - objectName: DB-PASSWORD
      key: DB_PASSWORD
    - objectName: JWT-ACCESS-SECRET
      key: JWT_ACCESS_SECRET
    - objectName: REDIS-PASSWORD
      key: REDIS_PASSWORD
```

3. **Mount Secrets in Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: flamoral-prod
spec:
  template:
    spec:
      containers:
      - name: auth-service
        image: flamoral/auth-service:latest
        volumeMounts:
        - name: secrets-store
          mountPath: "/mnt/secrets-store"
          readOnly: true
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: flamoral-secrets
              key: DB_PASSWORD
        - name: JWT_ACCESS_SECRET
          valueFrom:
            secretKeyRef:
              name: flamoral-secrets
              key: JWT_ACCESS_SECRET
      volumes:
      - name: secrets-store
        csi:
          driver: secrets-store.csi.k8s.io
          readOnly: true
          volumeAttributes:
            secretProviderClass: "flamoral-keyvault-secrets"
```

### From Application Code (Node.js)

**Using Azure Identity SDK:**

```typescript
// backend/shared/config/key-vault.ts
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

const keyVaultName = process.env.KEY_VAULT_NAME || 'flamoral-prod-kv';
const keyVaultUrl = `https://${keyVaultName}.vault.azure.net`;

const credential = new DefaultAzureCredential();
const secretClient = new SecretClient(keyVaultUrl, credential);

export async function getSecret(secretName: string): Promise<string> {
  try {
    const secret = await secretClient.getSecret(secretName);
    return secret.value || '';
  } catch (error) {
    console.error(`Failed to get secret ${secretName}:`, error);
    throw error;
  }
}

// Example usage
export async function loadSecretsFromKeyVault() {
  if (process.env.NODE_ENV === 'production' && process.env.KEY_VAULT_MANAGED_IDENTITY_ENABLED === 'true') {
    process.env.DB_PASSWORD = await getSecret('DB-PASSWORD');
    process.env.JWT_ACCESS_SECRET = await getSecret('JWT-ACCESS-SECRET');
    process.env.JWT_REFRESH_SECRET = await getSecret('JWT-REFRESH-SECRET');
    process.env.REDIS_PASSWORD = await getSecret('REDIS-PASSWORD');
    // ... load other secrets
  }
}
```

### From Azure CLI (for Testing)

```bash
# Get a secret value
az keyvault secret show \
  --vault-name flamoral-prod-kv \
  --name DB-PASSWORD \
  --query value \
  --output tsv

# List all secrets
az keyvault secret list \
  --vault-name flamoral-prod-kv \
  --query "[].name" \
  --output table
```

---

## Secret Rotation

### Manual Secret Rotation

**Step 1: Generate New Secret**

```bash
# Generate new JWT secret
NEW_JWT_SECRET=$(openssl rand -base64 64)

# Store new secret with version
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name JWT-ACCESS-SECRET \
  --value "$NEW_JWT_SECRET"
```

**Step 2: Update Application**

```bash
# Restart pods to pick up new secret
kubectl rollout restart deployment/auth-service -n flamoral-prod
kubectl rollout restart deployment/api-gateway -n flamoral-prod
```

**Step 3: Verify**

```bash
# Check rollout status
kubectl rollout status deployment/auth-service -n flamoral-prod

# Verify pods are running
kubectl get pods -n flamoral-prod
```

### Automated Rotation

**Create Rotation Function (Azure Function):**

```typescript
// Rotate secrets on a schedule (e.g., every 90 days)
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';
import crypto from 'crypto';

export async function rotateJWTSecrets() {
  const client = new SecretClient(
    'https://flamoral-prod-kv.vault.azure.net',
    new DefaultAzureCredential()
  );

  const newAccessSecret = crypto.randomBytes(64).toString('base64');
  const newRefreshSecret = crypto.randomBytes(64).toString('base64');

  await client.setSecret('JWT-ACCESS-SECRET', newAccessSecret);
  await client.setSecret('JWT-REFRESH-SECRET', newRefreshSecret);

  // Trigger deployment restart
  // ... implement restart logic
}
```

---

## Troubleshooting

### Common Issues

**1. Access Denied**

```bash
# Error: The user, group or application does not have secrets get permission

# Solution: Check role assignments
az role assignment list \
  --scope /subscriptions/{subscription-id}/resourceGroups/flamoral-prod-rg/providers/Microsoft.KeyVault/vaults/flamoral-prod-kv \
  --output table

# Grant necessary permissions
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee {user-or-managed-identity-id} \
  --scope {key-vault-resource-id}
```

**2. Network Access Denied**

```bash
# Error: Client address is not authorized

# Solution: Add IP to firewall
az keyvault network-rule add \
  --name flamoral-prod-kv \
  --ip-address YOUR_IP
```

**3. Managed Identity Not Working**

```bash
# Check if managed identity is enabled
az aks show \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks \
  --query "identityProfile.kubeletidentity.objectId"

# Verify role assignments
az role assignment list \
  --assignee {managed-identity-object-id} \
  --output table
```

**4. Secret Not Found**

```bash
# List all secrets
az keyvault secret list \
  --vault-name flamoral-prod-kv \
  --output table

# Check secret name (case-sensitive)
az keyvault secret show \
  --vault-name flamoral-prod-kv \
  --name DB-PASSWORD
```

### Audit Logs

**View Access Logs:**

```bash
# Get recent access logs
az monitor activity-log list \
  --resource-group flamoral-prod-rg \
  --start-time 2025-12-01T00:00:00Z \
  --end-time 2025-12-17T23:59:59Z \
  --query "[?contains(authorization.action, 'Microsoft.KeyVault')]" \
  --output table
```

### Backup and Recovery

**Backup Key Vault:**

```bash
# Backup specific secret
az keyvault secret backup \
  --vault-name flamoral-prod-kv \
  --name DB-PASSWORD \
  --file db-password-backup.blob

# Restore secret
az keyvault secret restore \
  --vault-name flamoral-prod-kv \
  --file db-password-backup.blob
```

---

## Best Practices

1. **Use Managed Identity** - Avoid storing credentials for Key Vault access
2. **Enable Soft Delete** - Protect against accidental deletion
3. **Enable Purge Protection** - Prevent permanent deletion
4. **Use RBAC** - Grant least-privilege access
5. **Enable Logging** - Monitor all access to secrets
6. **Rotate Secrets** - Regular rotation schedule
7. **Version Secrets** - Keep secret history
8. **Network Restrictions** - Limit access to trusted networks
9. **Tag Secrets** - Use tags for organization
10. **Document Everything** - Keep this guide updated

---

## Additional Resources

- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
- [Azure Key Vault Best Practices](https://docs.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [CSI Driver for Azure Key Vault](https://azure.github.io/secrets-store-csi-driver-provider-azure/)
- [Azure Identity SDK](https://www.npmjs.com/package/@azure/identity)

---

Last Updated: 2025-12-17
Version: 1.0
