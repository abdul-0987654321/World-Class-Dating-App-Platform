# External Secrets Deployment Guide

This guide provides step-by-step instructions for deploying Azure Key Vault integration for the Flamoral Dating Platform production environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)
6. [Rollback](#rollback)

---

## Prerequisites

### Required Tools

- **kubectl** (v1.24+) - [Installation Guide](https://kubernetes.io/docs/tasks/tools/)
- **helm** (v3.0+) - [Installation Guide](https://helm.sh/docs/intro/install/)
- **Azure CLI** (v2.40+) - [Installation Guide](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
- **jq** - For JSON parsing (optional but recommended)

### Required Access

- **AKS Cluster**: Admin access to the production AKS cluster
- **Azure Key Vault**: Read access to `flamoral-prod-kv`
- **Azure Subscription**: Permissions to create/manage managed identities

### Environment Variables

Set the following environment variables before deployment:

```bash
export AZURE_CLIENT_ID="your-managed-identity-client-id"
export AZURE_TENANT_ID="your-azure-tenant-id"
```

To find these values:

```bash
# Get tenant ID
az account show --query tenantId -o tsv

# Get managed identity client ID
az identity show --name flamoral-prod-identity --resource-group flamoral-prod-rg --query clientId -o tsv
```

---

## Quick Start

### Option 1: Automated Deployment (Recommended)

```bash
# Navigate to the directory
cd infrastructure/kubernetes/production/external-secrets/

# Set environment variables
export AZURE_CLIENT_ID="your-client-id"
export AZURE_TENANT_ID="your-tenant-id"

# Run deployment script
./deploy.sh
```

For PowerShell (Windows):

```powershell
# Navigate to the directory
cd infrastructure/kubernetes/production/external-secrets/

# Set environment variables
$env:AZURE_CLIENT_ID = "your-client-id"
$env:AZURE_TENANT_ID = "your-tenant-id"

# Run deployment script
./deploy.ps1
```

### Option 2: Kustomize Deployment

```bash
# Set environment variables first
export AZURE_CLIENT_ID="your-client-id"
export AZURE_TENANT_ID="your-tenant-id"

# Deploy using kustomize
kubectl apply -k infrastructure/kubernetes/production/external-secrets/
```

---

## Detailed Setup

### Step 1: Prepare Azure Key Vault

#### 1.1 Verify Key Vault Exists

```bash
az keyvault show --name flamoral-prod-kv
```

#### 1.2 Populate Secrets

Before deploying, ensure all required secrets are in the Key Vault. See [keyvault-secrets-reference.md](keyvault-secrets-reference.md) for the complete list.

Quick check for required secrets:

```bash
# Check if critical secrets exist
az keyvault secret list --vault-name flamoral-prod-kv --query "[].name" -o table
```

#### 1.3 Grant Key Vault Access to Managed Identity

```bash
# Get the managed identity object ID
IDENTITY_OBJECT_ID=$(az identity show \
  --name flamoral-prod-identity \
  --resource-group flamoral-prod-rg \
  --query principalId -o tsv)

# Grant 'Get' and 'List' permissions
az keyvault set-policy \
  --name flamoral-prod-kv \
  --object-id $IDENTITY_OBJECT_ID \
  --secret-permissions get list
```

### Step 2: Install External Secrets Operator

```bash
# Add Helm repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install External Secrets Operator
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace \
  --wait

# Verify installation
kubectl get pods -n external-secrets-system
```

### Step 3: Configure Azure Workload Identity

#### 3.1 Enable Workload Identity on AKS (if not already enabled)

```bash
az aks update \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks \
  --enable-oidc-issuer \
  --enable-workload-identity
```

#### 3.2 Get OIDC Issuer URL

```bash
OIDC_ISSUER=$(az aks show \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks \
  --query "oidcIssuerProfile.issuerUrl" -o tsv)

echo "OIDC Issuer: $OIDC_ISSUER"
```

#### 3.3 Create Federated Identity Credential

```bash
az identity federated-credential create \
  --name flamoral-external-secrets-federated \
  --identity-name flamoral-prod-identity \
  --resource-group flamoral-prod-rg \
  --issuer $OIDC_ISSUER \
  --subject "system:serviceaccount:flamoral:external-secrets-sa"
```

### Step 4: Create Namespace

```bash
kubectl create namespace flamoral
```

Or if it already exists, verify:

```bash
kubectl get namespace flamoral
```

### Step 5: Deploy SecretStore

```bash
# Navigate to the directory
cd infrastructure/kubernetes/production/external-secrets/

# Replace environment variables and apply
envsubst < secret-store.yaml | kubectl apply -f -

# Verify SecretStore
kubectl get secretstore -n flamoral
kubectl describe secretstore azure-keyvault-store -n flamoral
```

### Step 6: Deploy ExternalSecrets

```bash
# Apply all ExternalSecret resources
kubectl apply -f auth-secrets.yaml
kubectl apply -f payment-secrets.yaml
kubectl apply -f notification-secrets.yaml
kubectl apply -f media-secrets.yaml
kubectl apply -f database-secrets.yaml

# Verify ExternalSecrets
kubectl get externalsecrets -n flamoral
```

### Step 7: Verify Secret Synchronization

```bash
# Check ExternalSecret status
kubectl get externalsecrets -n flamoral

# Expected output:
# NAME                        STORE                   REFRESH INTERVAL   STATUS         READY
# flamoral-auth-secrets       azure-keyvault-store    6h                 SecretSynced   True
# flamoral-payment-secrets    azure-keyvault-store    12h                SecretSynced   True
# ...

# Check created Kubernetes secrets
kubectl get secrets -n flamoral

# Describe a secret (shows keys but not values)
kubectl describe secret flamoral-auth-secrets -n flamoral
```

---

## Verification

### Automated Validation

Run the validation script:

```bash
./validate.sh
```

This script checks:
- Namespace existence
- External Secrets Operator status
- SecretStore configuration
- ExternalSecret sync status
- Kubernetes secrets creation
- Azure Key Vault access

### Manual Verification

#### 1. Check External Secrets Operator Logs

```bash
kubectl logs -n external-secrets-system \
  -l app.kubernetes.io/name=external-secrets \
  --tail=50
```

Look for successful secret synchronization messages.

#### 2. Check ExternalSecret Details

```bash
kubectl describe externalsecret flamoral-auth-secrets -n flamoral
```

Look for:
- `Status: Ready: True`
- `Reason: SecretSynced`
- Recent successful sync timestamp

#### 3. Verify Secret Keys

```bash
# List all keys in a secret (without showing values)
kubectl get secret flamoral-auth-secrets -n flamoral -o jsonpath='{.data}' | jq -r 'keys[]'

# Expected output for auth-secrets:
# APPLE_PRIVATE_KEY
# FACEBOOK_APP_SECRET
# GOOGLE_CLIENT_SECRET
# JWT_ACCESS_SECRET
# JWT_REFRESH_SECRET
# JWT_SECRET
# SERVICE_API_KEY
# SESSION_SECRET
```

#### 4. Test Secret in a Pod

Create a test pod to verify secrets are accessible:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: secret-test
  namespace: flamoral
spec:
  containers:
  - name: test
    image: busybox
    command: ['sh', '-c', 'echo "JWT_SECRET: \$JWT_SECRET" && sleep 3600']
    env:
    - name: JWT_SECRET
      valueFrom:
        secretKeyRef:
          name: flamoral-auth-secrets
          key: JWT_SECRET
  restartPolicy: Never
EOF

# Wait for pod to start
kubectl wait --for=condition=Ready pod/secret-test -n flamoral --timeout=60s

# Check logs (will show only that the variable is set, not the actual value)
kubectl logs secret-test -n flamoral

# Clean up
kubectl delete pod secret-test -n flamoral
```

---

## Troubleshooting

### Issue: ExternalSecret not syncing

**Symptoms**: ExternalSecret shows `Ready: False`

**Solutions**:

1. Check ExternalSecret events:
   ```bash
   kubectl describe externalsecret flamoral-auth-secrets -n flamoral
   ```

2. Check External Secrets Operator logs:
   ```bash
   kubectl logs -n external-secrets-system \
     -l app.kubernetes.io/name=external-secrets \
     --tail=100
   ```

3. Verify SecretStore is ready:
   ```bash
   kubectl get secretstore -n flamoral
   ```

### Issue: "Access denied" to Key Vault

**Symptoms**: Logs show authentication errors

**Solutions**:

1. Verify managed identity has Key Vault permissions:
   ```bash
   az keyvault show-policy --name flamoral-prod-kv
   ```

2. Check federated credential:
   ```bash
   az identity federated-credential list \
     --identity-name flamoral-prod-identity \
     --resource-group flamoral-prod-rg
   ```

3. Verify service account annotations:
   ```bash
   kubectl describe serviceaccount external-secrets-sa -n flamoral
   ```

### Issue: Secret not found in Key Vault

**Symptoms**: Error message indicates secret doesn't exist

**Solutions**:

1. List secrets in Key Vault:
   ```bash
   az keyvault secret list --vault-name flamoral-prod-kv --query "[].name" -o table
   ```

2. Check exact secret name (case-sensitive):
   ```bash
   az keyvault secret show --vault-name flamoral-prod-kv --name jwt-access-secret
   ```

3. Verify the `remoteRef.key` in ExternalSecret matches the Key Vault secret name

### Issue: Workload Identity not working

**Symptoms**: Authentication fails with "failed to get credential"

**Solutions**:

1. Verify OIDC issuer is enabled:
   ```bash
   az aks show --resource-group flamoral-prod-rg --name flamoral-prod-aks \
     --query "oidcIssuerProfile.issuerUrl"
   ```

2. Recreate federated credential with correct subject:
   ```bash
   az identity federated-credential delete \
     --name flamoral-external-secrets-federated \
     --identity-name flamoral-prod-identity \
     --resource-group flamoral-prod-rg

   # Recreate with correct subject
   az identity federated-credential create \
     --name flamoral-external-secrets-federated \
     --identity-name flamoral-prod-identity \
     --resource-group flamoral-prod-rg \
     --issuer $OIDC_ISSUER \
     --subject "system:serviceaccount:flamoral:external-secrets-sa"
   ```

### Issue: Secrets not updating after Key Vault change

**Symptoms**: Old values still in Kubernetes secret after updating Key Vault

**Solutions**:

1. Force immediate refresh:
   ```bash
   kubectl annotate externalsecret flamoral-auth-secrets \
     -n flamoral \
     force-sync=$(date +%s) \
     --overwrite
   ```

2. Check refresh interval (may need to wait):
   ```bash
   kubectl get externalsecret flamoral-auth-secrets -n flamoral -o jsonpath='{.spec.refreshInterval}'
   ```

3. Restart External Secrets Operator:
   ```bash
   kubectl rollout restart deployment external-secrets -n external-secrets-system
   ```

---

## Rollback

If you need to rollback the External Secrets configuration:

### Step 1: Delete ExternalSecrets

```bash
kubectl delete externalsecret --all -n flamoral
```

This will:
- Delete ExternalSecret resources
- **Keep** the Kubernetes secrets (they won't be updated anymore)

### Step 2: (Optional) Delete SecretStore

```bash
kubectl delete secretstore azure-keyvault-store -n flamoral
```

### Step 3: (Optional) Uninstall External Secrets Operator

```bash
helm uninstall external-secrets -n external-secrets-system
```

### Step 4: Revert to Manual Secrets

If you need to manage secrets manually:

```bash
# Create secrets from a file (NEVER commit this file!)
kubectl create secret generic flamoral-auth-secrets \
  --from-env-file=.env.production.secrets \
  --namespace=flamoral \
  --dry-run=client -o yaml | kubectl apply -f -
```

---

## Best Practices

1. **Secret Rotation**: Implement regular secret rotation in Azure Key Vault
2. **Monitoring**: Set up alerts for ExternalSecret sync failures
3. **Access Control**: Use least privilege for Key Vault access
4. **Audit Logging**: Enable and monitor Key Vault audit logs
5. **Backup**: Regularly backup Key Vault contents
6. **Testing**: Always test in staging before production
7. **Documentation**: Keep this guide updated with environment changes

---

## Additional Resources

- [External Secrets Operator Documentation](https://external-secrets.io/)
- [Azure Workload Identity Documentation](https://azure.github.io/azure-workload-identity/)
- [Azure Key Vault Best Practices](https://docs.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [Kubernetes Secrets Best Practices](https://kubernetes.io/docs/concepts/security/secrets-good-practices/)

---

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review External Secrets Operator logs
3. Consult the [README.md](README.md) for additional details
4. Contact the DevOps team

---

**Last Updated**: 2025-12-13
**Version**: 1.0.0
