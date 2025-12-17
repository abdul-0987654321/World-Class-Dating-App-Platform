# Azure Key Vault External Secrets Configuration

This directory contains ExternalSecret resources for the Flamoral Dating Platform production environment. These resources sync secrets from Azure Key Vault to Kubernetes secrets using the External Secrets Operator.

## Overview

**Azure Key Vault URL**: `https://flamoral-prod-kv.vault.azure.net`
**Namespace**: `flamoral-prod`

## Prerequisites

1. **External Secrets Operator** installed in the cluster:
   ```bash
   helm repo add external-secrets https://charts.external-secrets.io
   helm install external-secrets external-secrets/external-secrets \
     -n external-secrets-system \
     --create-namespace
   ```

2. **Azure Workload Identity** configured for AKS cluster

3. **Managed Identity** with access to Azure Key Vault

4. **Azure Key Vault** (`flamoral-prod-kv`) with all required secrets populated

## File Structure

```
external-secrets/
├── README.md                    # This file
├── secret-store.yaml            # SecretStore configuration
├── auth-secrets.yaml            # Authentication & JWT secrets
├── payment-secrets.yaml         # Stripe payment secrets
├── notification-secrets.yaml    # SendGrid, Twilio, Firebase
├── media-secrets.yaml           # Azure Storage, Cognitive Services, Agora
└── database-secrets.yaml        # Database & Redis credentials
```

## Secret Groups

### 1. SecretStore (`secret-store.yaml`)
- Configures connection to Azure Key Vault
- Creates service account with workload identity
- Provides both namespace-scoped and cluster-scoped stores

### 2. Authentication Secrets (`auth-secrets.yaml`)
**Kubernetes Secret**: `flamoral-auth-secrets`

Required Azure Key Vault secrets:
- `jwt-secret` - General JWT secret
- `jwt-access-secret` - Access token secret
- `jwt-refresh-secret` - Refresh token secret
- `service-api-key` - Internal service API key
- `session-secret` - Session encryption secret
- `google-oauth-secret` - Google OAuth client secret
- `facebook-oauth-secret` - Facebook app secret
- `apple-oauth-key` - Apple OAuth private key

### 3. Payment Secrets (`payment-secrets.yaml`)
**Kubernetes Secret**: `flamoral-payment-secrets`

Required Azure Key Vault secrets:
- `stripe-secret-key` - Stripe secret API key
- `stripe-webhook-secret` - Stripe webhook signing secret
- `stripe-publishable-key` - Stripe publishable key

### 4. Notification Secrets (`notification-secrets.yaml`)
**Kubernetes Secret**: `flamoral-notification-secrets`

Required Azure Key Vault secrets:
- `sendgrid-api-key` - SendGrid API key for email
- `twilio-account-sid` - Twilio account SID
- `twilio-auth-token` - Twilio authentication token
- `firebase-private-key` - Firebase private key
- `fcm-server-key` - Firebase Cloud Messaging server key

### 5. Media Secrets (`media-secrets.yaml`)
**Kubernetes Secret**: `flamoral-media-secrets`

Required Azure Key Vault secrets:
- `azure-storage-key` - Azure Storage account key
- `azure-storage-connection-string` - Azure Storage connection string
- `azure-face-api-key` - Azure Face API key
- `azure-content-moderator-key` - Azure Content Moderator key
- `azure-computer-vision-key` - Azure Computer Vision key
- `agora-app-id` - Agora application ID
- `agora-app-certificate` - Agora app certificate
- `agora-customer-key` - Agora customer key
- `agora-customer-secret` - Agora customer secret

### 6. Database Secrets (`database-secrets.yaml`)
**Kubernetes Secret**: `flamoral-database-secrets`

Required Azure Key Vault secrets:
- `db-host` - PostgreSQL host
- `db-name` - Database name
- `db-user` - Database user
- `db-password` - Database password
- `db-read-replica-1-url` - Read replica 1 URL
- `db-read-replica-2-url` - Read replica 2 URL
- `mongodb-uri` - MongoDB connection URI
- `redis-host` - Redis host
- `redis-password` - Redis password
- `azure-servicebus-connection-string` - Azure Service Bus connection string

## Deployment

### Step 1: Set Environment Variables
```bash
export AZURE_CLIENT_ID="your-managed-identity-client-id"
export AZURE_TENANT_ID="your-azure-tenant-id"
```

### Step 2: Apply SecretStore
```bash
kubectl apply -f secret-store.yaml
```

### Step 3: Apply ExternalSecrets
```bash
kubectl apply -f auth-secrets.yaml
kubectl apply -f payment-secrets.yaml
kubectl apply -f notification-secrets.yaml
kubectl apply -f media-secrets.yaml
kubectl apply -f database-secrets.yaml
```

Or apply all at once:
```bash
kubectl apply -f .
```

### Step 4: Verify Secrets
```bash
# Check ExternalSecret status
kubectl get externalsecrets -n flamoral-prod

# Check created Kubernetes secrets
kubectl get secrets -n flamoral-prod

# Describe an ExternalSecret to see sync status
kubectl describe externalsecret flamoral-auth-secrets -n flamoral-prod
```

## Azure Key Vault Secret Naming Convention

All secrets in Azure Key Vault use **kebab-case** naming:
- Example: `jwt-access-secret`, `stripe-secret-key`, `azure-storage-key`

These are mapped to **SNAKE_CASE** environment variables in Kubernetes:
- Example: `JWT_ACCESS_SECRET`, `STRIPE_SECRET_KEY`, `AZURE_STORAGE_KEY`

## Populating Azure Key Vault

Before deploying, ensure all secrets are added to Azure Key Vault:

```bash
# Example: Add a secret to Azure Key Vault
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name jwt-access-secret \
  --value "your-secret-value"

# Example: Add from file
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name firebase-private-key \
  --file firebase-private-key.json
```

## Troubleshooting

### ExternalSecret not syncing
```bash
# Check ExternalSecret status
kubectl describe externalsecret flamoral-auth-secrets -n flamoral-prod

# Check External Secrets Operator logs
kubectl logs -n external-secrets-system -l app.kubernetes.io/name=external-secrets
```

### Access denied to Key Vault
1. Verify managed identity has correct permissions:
   ```bash
   az keyvault show --name flamoral-prod-kv
   az keyvault set-policy --name flamoral-prod-kv \
     --object-id <managed-identity-object-id> \
     --secret-permissions get list
   ```

2. Verify workload identity configuration:
   ```bash
   kubectl describe serviceaccount external-secrets-sa -n flamoral-prod
   ```

### Secret not found in Key Vault
```bash
# List all secrets in Key Vault
az keyvault secret list --vault-name flamoral-prod-kv

# Check specific secret
az keyvault secret show --vault-name flamoral-prod-kv --name jwt-access-secret
```

## Security Best Practices

1. **Least Privilege**: Grant only necessary permissions to managed identity
2. **Secret Rotation**: Implement regular secret rotation policies
3. **Audit Logging**: Enable Azure Key Vault logging
4. **Network Security**: Use private endpoints for Key Vault access
5. **RBAC**: Limit Kubernetes RBAC permissions for secret access

## Refresh Intervals

- **Auth secrets**: 6 hours
- **Database secrets**: 1 hour (more frequent due to critical nature)
- **Payment secrets**: 12 hours
- **Notification secrets**: 12 hours
- **Media secrets**: 12 hours

To force immediate refresh:
```bash
kubectl annotate externalsecret flamoral-auth-secrets \
  -n flamoral-prod \
  force-sync=$(date +%s) \
  --overwrite
```

## Using Secrets in Deployments

### Method 1: Environment Variables
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  template:
    spec:
      containers:
      - name: auth-service
        env:
        - name: JWT_ACCESS_SECRET
          valueFrom:
            secretKeyRef:
              name: flamoral-auth-secrets
              key: JWT_ACCESS_SECRET
```

### Method 2: Volume Mounts
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  template:
    spec:
      containers:
      - name: auth-service
        volumeMounts:
        - name: auth-secrets
          mountPath: "/etc/secrets"
          readOnly: true
      volumes:
      - name: auth-secrets
        secret:
          secretName: flamoral-auth-secrets
```

## References

- [External Secrets Operator Documentation](https://external-secrets.io/)
- [Azure Key Vault Provider](https://external-secrets.io/latest/provider/azure-key-vault/)
- [Azure Workload Identity](https://azure.github.io/azure-workload-identity/)
