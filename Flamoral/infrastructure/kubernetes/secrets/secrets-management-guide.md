# Secrets Management Guide for Flamoral Platform

## Overview
This guide covers secure secrets management for the Flamoral dating platform using Azure Key Vault, Kubernetes Secrets, and External Secrets Operator.

---

## Architecture

```
┌─────────────────────┐
│   Azure Key Vault   │  ← Centralized secret storage
└──────────┬──────────┘
           │
           │ (Azure Pod Identity / Workload Identity)
           │
┌──────────▼──────────────────────┐
│ External Secrets Operator (ESO) │  ← Syncs secrets to K8s
└──────────┬──────────────────────┘
           │
           │ Creates/Updates
           │
┌──────────▼──────────┐
│ Kubernetes Secrets  │  ← Used by pods
└──────────┬──────────┘
           │
           │ Mounted as env vars or volumes
           │
┌──────────▼──────────┐
│   Application Pods  │
└─────────────────────┘
```

---

## Setup Instructions

### 1. Install External Secrets Operator

```bash
# Add Helm repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install External Secrets Operator
helm install external-secrets \
  external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace \
  --set installCRDs=true
```

### 2. Configure Azure Key Vault Access

**Option A: Using Managed Identity (Recommended for AKS)**
```bash
# Enable Azure AD Workload Identity on AKS
az aks update \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks \
  --enable-oidc-issuer \
  --enable-workload-identity

# Create Managed Identity
az identity create \
  --name flamoral-keyvault-identity \
  --resource-group flamoral-prod-rg

# Get identity details
IDENTITY_CLIENT_ID=$(az identity show \
  --name flamoral-keyvault-identity \
  --resource-group flamoral-prod-rg \
  --query clientId -o tsv)

# Grant Key Vault access to Managed Identity
az keyvault set-policy \
  --name flamoral-prod-kv \
  --object-id $IDENTITY_CLIENT_ID \
  --secret-permissions get list
```

**Option B: Using Service Principal**
```bash
# Create Service Principal
az ad sp create-for-rbac \
  --name flamoral-keyvault-sp \
  --role Reader \
  --scopes /subscriptions/{subscription-id}/resourceGroups/flamoral-prod-rg

# Grant Key Vault access
az keyvault set-policy \
  --name flamoral-prod-kv \
  --spn {service-principal-app-id} \
  --secret-permissions get list
```

### 3. Create SecretStore

**For Production:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-keyvault
  namespace: dating-app
spec:
  provider:
    azurekv:
      vaultUrl: "https://flamoral-prod-kv.vault.azure.net"
      authType: ManagedIdentity
      identityId: "YOUR_MANAGED_IDENTITY_CLIENT_ID"
      tenantId: "ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"
```

**For Development (using Service Principal):**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-keyvault
  namespace: dating-app
spec:
  provider:
    azurekv:
      vaultUrl: "https://flamoral-dev-kv.vault.azure.net"
      authType: ServicePrincipal
      tenantId: "ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"
      authSecretRef:
        clientId:
          name: azure-sp-credentials
          key: client-id
        clientSecret:
          name: azure-sp-credentials
          key: client-secret
---
apiVersion: v1
kind: Secret
metadata:
  name: azure-sp-credentials
  namespace: dating-app
type: Opaque
stringData:
  client-id: "YOUR_CLIENT_ID"
  client-secret: "YOUR_CLIENT_SECRET"
```

### 4. Create ExternalSecret Resources

**Database Credentials:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: dating-app
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-keyvault
    kind: SecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
    - secretKey: DB_USER
      remoteRef:
        key: db-username
    - secretKey: DB_PASSWORD
      remoteRef:
        key: db-password
    - secretKey: DB_HOST
      remoteRef:
        key: db-host
    - secretKey: DB_NAME
      remoteRef:
        key: db-name
    - secretKey: DB_CONNECTION_STRING
      remoteRef:
        key: postgres-connection-string
```

**Application Secrets:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: dating-app
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-keyvault
    kind: SecretStore
  target:
    name: flamoral-app-secrets
    creationPolicy: Owner
  data:
    # Authentication
    - secretKey: JWT_SECRET
      remoteRef:
        key: jwt-secret
    - secretKey: JWT_REFRESH_SECRET
      remoteRef:
        key: jwt-refresh-secret
    - secretKey: ENCRYPTION_KEY
      remoteRef:
        key: encryption-key

    # Redis
    - secretKey: REDIS_PASSWORD
      remoteRef:
        key: redis-password

    # Azure Storage
    - secretKey: AZURE_STORAGE_CONNECTION_STRING
      remoteRef:
        key: azure-storage-connection-string

    # Email Service
    - secretKey: SENDGRID_API_KEY
      remoteRef:
        key: sendgrid-api-key

    # Payment Service
    - secretKey: STRIPE_SECRET_KEY
      remoteRef:
        key: stripe-secret-key
    - secretKey: STRIPE_WEBHOOK_SECRET
      remoteRef:
        key: stripe-webhook-secret

    # SMS Service
    - secretKey: TWILIO_ACCOUNT_SID
      remoteRef:
        key: twilio-account-sid
    - secretKey: TWILIO_AUTH_TOKEN
      remoteRef:
        key: twilio-auth-token

    # OAuth Providers
    - secretKey: GOOGLE_CLIENT_ID
      remoteRef:
        key: google-oauth-client-id
    - secretKey: GOOGLE_CLIENT_SECRET
      remoteRef:
        key: google-oauth-client-secret
    - secretKey: FACEBOOK_APP_ID
      remoteRef:
        key: facebook-app-id
    - secretKey: FACEBOOK_APP_SECRET
      remoteRef:
        key: facebook-app-secret

    # Firebase
    - secretKey: FIREBASE_PRIVATE_KEY
      remoteRef:
        key: firebase-private-key
```

---

## Using Secrets in Deployments

### Method 1: Environment Variables from Secret
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  template:
    spec:
      containers:
      - name: api-gateway
        image: flamoral/api-gateway:latest
        envFrom:
          # Load all secrets as environment variables
          - secretRef:
              name: flamoral-app-secrets
          - secretRef:
              name: database-credentials
        env:
          # Or load specific secret keys
          - name: JWT_SECRET
            valueFrom:
              secretKeyRef:
                name: flamoral-app-secrets
                key: JWT_SECRET
```

### Method 2: Mount Secrets as Files
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  template:
    spec:
      containers:
      - name: api-gateway
        image: flamoral/api-gateway:latest
        volumeMounts:
          - name: secrets
            mountPath: /app/secrets
            readOnly: true
      volumes:
        - name: secrets
          secret:
            secretName: flamoral-app-secrets
```

---

## Secret Rotation

### Automatic Rotation with External Secrets
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
spec:
  refreshInterval: 15m  # Refresh every 15 minutes
  secretStoreRef:
    name: azure-keyvault
  # ... rest of configuration
```

### Manual Rotation Steps
1. **Update secret in Azure Key Vault**
   ```bash
   az keyvault secret set \
     --vault-name flamoral-prod-kv \
     --name jwt-secret \
     --value "new-secret-value"
   ```

2. **Force immediate sync (optional)**
   ```bash
   kubectl annotate externalsecret app-secrets \
     force-sync=$(date +%s) \
     --overwrite
   ```

3. **Restart pods to pick up new secrets**
   ```bash
   kubectl rollout restart deployment/api-gateway -n dating-app
   ```

---

## Secrets Backup and Disaster Recovery

### Backup Azure Key Vault
```bash
# Backup all secrets
az keyvault secret list --vault-name flamoral-prod-kv \
  --query "[].id" -o tsv | while read secret_id; do
    secret_name=$(basename $secret_id)
    az keyvault secret backup \
      --vault-name flamoral-prod-kv \
      --name $secret_name \
      --file "${secret_name}.backup"
done
```

### Restore from Backup
```bash
az keyvault secret restore \
  --vault-name flamoral-prod-kv \
  --file jwt-secret.backup
```

---

## Security Best Practices

### 1. Never Commit Secrets to Git
```bash
# Add to .gitignore
*.env
*.secret
*.backup
secrets/
```

### 2. Use RBAC for Secret Access
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-gateway-sa
  namespace: dating-app
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: dating-app
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["flamoral-app-secrets", "database-credentials"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: api-gateway-secret-reader
  namespace: dating-app
subjects:
- kind: ServiceAccount
  name: api-gateway-sa
roleRef:
  kind: Role
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

### 3. Encrypt Secrets at Rest
```bash
# Enable encryption at rest on AKS (Azure manages this automatically)
# For additional security, use Azure Disk Encryption
```

### 4. Audit Secret Access
```bash
# Enable diagnostic logs on Key Vault
az monitor diagnostic-settings create \
  --name keyvault-audit \
  --resource $(az keyvault show --name flamoral-prod-kv --query id -o tsv) \
  --workspace $(az monitor log-analytics workspace show --resource-group flamoral-prod-rg --workspace-name flamoral-logs --query id -o tsv) \
  --logs '[{"category": "AuditEvent", "enabled": true}]'
```

### 5. Regular Secret Rotation
- JWT secrets: Every 90 days
- Database passwords: Every 60 days
- API keys: Every 180 days or when compromised

---

## Troubleshooting

### External Secret not syncing
```bash
# Check ExternalSecret status
kubectl describe externalsecret app-secrets -n dating-app

# Check External Secrets Operator logs
kubectl logs -n external-secrets-system deployment/external-secrets -f

# Verify SecretStore connection
kubectl get secretstore -n dating-app
kubectl describe secretstore azure-keyvault -n dating-app
```

### Secret not accessible by pods
```bash
# Check if secret exists
kubectl get secret flamoral-app-secrets -n dating-app

# View secret (base64 encoded)
kubectl get secret flamoral-app-secrets -n dating-app -o yaml

# Check pod's service account permissions
kubectl auth can-i get secrets --as=system:serviceaccount:dating-app:api-gateway-sa -n dating-app
```

### Key Vault access issues
```bash
# Check Managed Identity assignment
az role assignment list \
  --assignee $IDENTITY_CLIENT_ID \
  --scope /subscriptions/{subscription-id}/resourceGroups/flamoral-prod-rg

# Check Key Vault access policies
az keyvault show --name flamoral-prod-kv \
  --query properties.accessPolicies
```

---

## Required Secrets Checklist

- [ ] Database credentials (PostgreSQL)
- [ ] Redis password
- [ ] JWT secrets (access + refresh)
- [ ] Encryption key
- [ ] Azure Storage connection string
- [ ] SendGrid API key
- [ ] Stripe secret key and webhook secret
- [ ] Twilio credentials
- [ ] Google OAuth credentials
- [ ] Facebook OAuth credentials
- [ ] Firebase service account key
- [ ] Session secret
- [ ] Cookie secret
- [ ] Azure SignalR connection string
- [ ] CosmosDB connection string
- [ ] Application Insights instrumentation key
