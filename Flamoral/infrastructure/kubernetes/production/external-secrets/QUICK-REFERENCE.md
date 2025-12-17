# External Secrets Quick Reference

Quick commands for common operations with External Secrets.

## Environment Setup

```bash
export AZURE_CLIENT_ID="your-managed-identity-client-id"
export AZURE_TENANT_ID="your-azure-tenant-id"
export NAMESPACE="flamoral"
export KEY_VAULT_NAME="flamoral-prod-kv"
```

---

## Deployment

### Deploy Everything
```bash
# Option 1: Automated script
./deploy.sh

# Option 2: Kustomize
kubectl apply -k .

# Option 3: Manual
kubectl apply -f secret-store.yaml
kubectl apply -f auth-secrets.yaml
kubectl apply -f payment-secrets.yaml
kubectl apply -f notification-secrets.yaml
kubectl apply -f media-secrets.yaml
kubectl apply -f database-secrets.yaml
```

### Deploy Single ExternalSecret
```bash
kubectl apply -f auth-secrets.yaml
```

---

## Verification

### Quick Status Check
```bash
# All ExternalSecrets
kubectl get externalsecrets -n flamoral

# All Kubernetes Secrets
kubectl get secrets -n flamoral | grep flamoral

# Run validation script
./validate.sh
```

### Detailed Status
```bash
# Describe specific ExternalSecret
kubectl describe externalsecret flamoral-auth-secrets -n flamoral

# Check SecretStore
kubectl get secretstore -n flamoral
kubectl describe secretstore azure-keyvault-store -n flamoral

# View External Secrets Operator logs
kubectl logs -n external-secrets-system \
  -l app.kubernetes.io/name=external-secrets \
  --tail=50 -f
```

---

## Troubleshooting

### Force Secret Refresh
```bash
# Force immediate sync
kubectl annotate externalsecret flamoral-auth-secrets \
  -n flamoral \
  force-sync=$(date +%s) \
  --overwrite
```

### Check Why Secret Not Syncing
```bash
# 1. Check ExternalSecret status
kubectl describe externalsecret flamoral-auth-secrets -n flamoral

# 2. Check operator logs for errors
kubectl logs -n external-secrets-system \
  -l app.kubernetes.io/name=external-secrets \
  --tail=100 | grep -i error

# 3. Verify Key Vault access
az keyvault show --name flamoral-prod-kv

# 4. Check service account
kubectl describe serviceaccount external-secrets-sa -n flamoral
```

### Restart External Secrets Operator
```bash
kubectl rollout restart deployment external-secrets -n external-secrets-system
```

---

## Azure Key Vault Operations

### List Secrets
```bash
# All secrets
az keyvault secret list --vault-name flamoral-prod-kv --output table

# Count secrets
az keyvault secret list --vault-name flamoral-prod-kv --query "length(@)"
```

### Add/Update Secret
```bash
# From command line
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name jwt-access-secret \
  --value "$(openssl rand -base64 32)"

# From file
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name firebase-private-key \
  --file firebase-service-account.json
```

### View Secret (Metadata Only)
```bash
az keyvault secret show \
  --vault-name flamoral-prod-kv \
  --name jwt-access-secret \
  --query "{name:name, enabled:attributes.enabled, updated:attributes.updated}"
```

### Check Permissions
```bash
# View Key Vault access policies
az keyvault show --name flamoral-prod-kv --query "properties.accessPolicies"

# Grant permissions to managed identity
az keyvault set-policy \
  --name flamoral-prod-kv \
  --object-id <managed-identity-object-id> \
  --secret-permissions get list
```

---

## Kubernetes Secrets Operations

### View Secret Keys (Not Values)
```bash
# List all keys in a secret
kubectl get secret flamoral-auth-secrets -n flamoral \
  -o jsonpath='{.data}' | jq -r 'keys[]'

# Count keys
kubectl get secret flamoral-auth-secrets -n flamoral \
  -o jsonpath='{.data}' | jq -r 'keys | length'
```

### View Secret Value (Use Carefully!)
```bash
# Decode specific key
kubectl get secret flamoral-auth-secrets -n flamoral \
  -o jsonpath='{.data.JWT_SECRET}' | base64 -d

# View all keys and values (CAREFUL IN PRODUCTION!)
kubectl get secret flamoral-auth-secrets -n flamoral -o json | \
  jq -r '.data | to_entries[] | "\(.key): \(.value | @base64d)"'
```

### Test Secret in Pod
```bash
# Create test pod
kubectl run secret-test --rm -it --restart=Never \
  --image=busybox -n flamoral \
  --overrides='
{
  "spec": {
    "containers": [{
      "name": "secret-test",
      "image": "busybox",
      "command": ["sh"],
      "env": [{
        "name": "JWT_SECRET",
        "valueFrom": {
          "secretKeyRef": {
            "name": "flamoral-auth-secrets",
            "key": "JWT_SECRET"
          }
        }
      }]
    }]
  }
}' -- sh -c 'echo "Secret exists: ${JWT_SECRET:+YES}"'
```

---

## Monitoring

### Watch ExternalSecret Status
```bash
watch -n 5 'kubectl get externalsecrets -n flamoral'
```

### Monitor Operator Logs
```bash
kubectl logs -n external-secrets-system \
  -l app.kubernetes.io/name=external-secrets \
  -f
```

### Check Sync Timestamps
```bash
kubectl get externalsecrets -n flamoral \
  -o custom-columns=NAME:.metadata.name,STATUS:.status.conditions[0].status,LAST-SYNC:.status.refreshTime
```

---

## Maintenance

### Update ExternalSecret Configuration
```bash
# Edit the YAML file
vim auth-secrets.yaml

# Apply changes
kubectl apply -f auth-secrets.yaml

# Force immediate sync after update
kubectl annotate externalsecret flamoral-auth-secrets \
  -n flamoral \
  force-sync=$(date +%s) \
  --overwrite
```

### Rotate Secret
```bash
# 1. Update in Key Vault
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name jwt-access-secret \
  --value "new-secret-value"

# 2. Force refresh (or wait for automatic refresh)
kubectl annotate externalsecret flamoral-auth-secrets \
  -n flamoral \
  force-sync=$(date +%s) \
  --overwrite

# 3. Verify update
kubectl get secret flamoral-auth-secrets -n flamoral \
  -o jsonpath='{.metadata.annotations.reconcile\.external-secrets\.io/data-hash}'
```

### Cleanup
```bash
# Delete specific ExternalSecret
kubectl delete externalsecret flamoral-auth-secrets -n flamoral

# Delete all ExternalSecrets
kubectl delete externalsecrets --all -n flamoral

# Delete SecretStore
kubectl delete secretstore azure-keyvault-store -n flamoral

# Uninstall External Secrets Operator
helm uninstall external-secrets -n external-secrets-system
```

---

## Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Secret not syncing | `kubectl annotate externalsecret <name> -n flamoral force-sync=$(date +%s) --overwrite` |
| Operator not responding | `kubectl rollout restart deployment external-secrets -n external-secrets-system` |
| Access denied to Key Vault | `az keyvault set-policy --name flamoral-prod-kv --object-id <id> --secret-permissions get list` |
| Secret not found in KV | `az keyvault secret list --vault-name flamoral-prod-kv --query "[?name=='<secret>']"` |
| Workload identity error | Check federated credential: `az identity federated-credential list --identity-name <name> --resource-group <rg>` |

---

## Useful Aliases

Add these to your `~/.bashrc` or `~/.zshrc`:

```bash
# External Secrets aliases
alias k='kubectl'
alias kgse='kubectl get secretstore -n flamoral'
alias kges='kubectl get externalsecrets -n flamoral'
alias kgs='kubectl get secrets -n flamoral'
alias kdse='kubectl describe secretstore -n flamoral'
alias kdes='kubectl describe externalsecret -n flamoral'
alias kds='kubectl describe secret -n flamoral'
alias kles='kubectl logs -n external-secrets-system -l app.kubernetes.io/name=external-secrets -f'

# Force sync alias
alias sync-secret='kubectl annotate externalsecret -n flamoral force-sync=$(date +%s) --overwrite'

# Key Vault aliases
alias kvlist='az keyvault secret list --vault-name flamoral-prod-kv --output table'
alias kvget='az keyvault secret show --vault-name flamoral-prod-kv --name'
alias kvset='az keyvault secret set --vault-name flamoral-prod-kv --name'
```

---

## Emergency Procedures

### Secrets Completely Broken
```bash
# 1. Check if operator is running
kubectl get pods -n external-secrets-system

# 2. If operator crashed, restart it
kubectl rollout restart deployment external-secrets -n external-secrets-system

# 3. If still broken, check logs
kubectl logs -n external-secrets-system -l app.kubernetes.io/name=external-secrets --tail=200

# 4. Last resort: recreate secrets manually
kubectl create secret generic flamoral-auth-secrets \
  --from-literal=JWT_SECRET="backup-value" \
  --namespace=flamoral \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Key Vault Compromised
```bash
# 1. Immediately rotate all secrets in Key Vault
# 2. Force refresh all ExternalSecrets
for es in $(kubectl get externalsecrets -n flamoral -o name); do
  kubectl annotate $es -n flamoral force-sync=$(date +%s) --overwrite
done

# 3. Restart all applications to pick up new secrets
kubectl rollout restart deployment -n flamoral
```

---

## Health Checks

### Pre-Deployment
```bash
# Check all prerequisites
./validate.sh --pre-check

# Or manually:
kubectl cluster-info
az keyvault show --name flamoral-prod-kv
helm list -n external-secrets-system
```

### Post-Deployment
```bash
# Run validation
./validate.sh

# Check all components
kubectl get all -n external-secrets-system
kubectl get secretstore,externalsecret,secret -n flamoral
```

---

## Documentation Links

- [Full Deployment Guide](DEPLOYMENT-GUIDE.md)
- [Key Vault Secrets Reference](keyvault-secrets-reference.md)
- [Detailed README](README.md)
- [External Secrets Docs](https://external-secrets.io/)

---

**Last Updated**: 2025-12-13
