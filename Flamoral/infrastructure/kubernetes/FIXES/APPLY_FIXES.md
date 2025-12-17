# How to Apply Kubernetes Configuration Fixes

## Overview
This directory contains fixed versions of Kubernetes configuration files for flamoral.com.
Apply these fixes to resolve critical deployment issues.

---

## Quick Fix Instructions

### Fix 1: Database Secrets Configuration (CRITICAL)

**Problem:** Deployments reference `POSTGRES_*` keys but External Secrets only creates `DB_*` keys.

**Solution:**
```bash
# Backup the original file
cp production/external-secrets/database-secrets.yaml production/external-secrets/database-secrets.yaml.backup

# Apply the fix
cp FIXES/database-secrets-fix.yaml production/external-secrets/database-secrets.yaml

# Apply to cluster
kubectl apply -f production/external-secrets/database-secrets.yaml

# Verify the secret was updated
kubectl get externalsecret flamoral-database-secrets -n flamoral
kubectl describe secret flamoral-database-secrets -n flamoral
```

**What Changed:**
- Added `DB_SSL: "true"` key
- Added `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` keys
- These keys use the same values as `DB_*` keys but with different naming for compatibility

---

### Fix 2: Ingress Port Configuration (CRITICAL)

**Problem:** Ingress routes to `api-gateway:80` but the service listens on port `4000`.

**Solution:**
```bash
# Backup the original file
cp deploy/ingress.yaml deploy/ingress.yaml.backup

# Apply the fix
cp FIXES/ingress-fix.yaml deploy/ingress.yaml

# Apply to cluster
kubectl apply -f deploy/ingress.yaml

# Verify the ingress was updated
kubectl get ingress flamoral-ingress -n flamoral
kubectl describe ingress flamoral-ingress -n flamoral
```

**What Changed:**
- Changed api-gateway port from `80` to `4000` (line 48)

---

## Verification Steps

### 1. Verify External Secrets Synchronization

```bash
# Check if External Secrets are healthy
kubectl get externalsecrets -n flamoral

# Expected output:
# NAME                        STORE                  REFRESH INTERVAL   STATUS   READY
# flamoral-database-secrets   azure-keyvault-store   1h                 SecretSynced   True

# Check the created secret
kubectl get secret flamoral-database-secrets -n flamoral -o jsonpath='{.data}' | jq 'keys'

# Should include both DB_* and POSTGRES_* keys
```

### 2. Verify Services Can Start

```bash
# Check pod status
kubectl get pods -n flamoral

# All pods should be Running or Ready
# If pods are CrashLoopBackOff, check logs:
kubectl logs <pod-name> -n flamoral

# Common errors to look for:
# - "Secret key POSTGRES_HOST not found" = Fix 1 not applied
# - Database connection errors = Check Azure Key Vault values
```

### 3. Verify Ingress Routing

```bash
# Check ingress configuration
kubectl describe ingress flamoral-ingress -n flamoral

# Test API Gateway endpoint
curl -v https://api.flamoral.com/health

# Should return 200 OK (after cert-manager issues certificate)
```

### 4. Verify Database Connectivity

```bash
# Get a shell in a pod
kubectl exec -it <auth-service-pod> -n flamoral -- sh

# Test database connection (inside pod)
# This will fail if DB_* or POSTGRES_* keys are missing
env | grep -E "DB_|POSTGRES_"

# Should show both sets of variables
```

---

## Azure Key Vault Configuration

Ensure your Azure Key Vault contains these secrets with **exactly** these names:

### Required Database Secrets

```bash
# Key Vault Secret Name → Value Format
db-host=flamoral-prod-postgres.postgres.database.azure.com
db-name=flamoral
db-user=flamoraladmin
db-password=<your-actual-password>
```

**IMPORTANT NOTES:**
- `db-user` should be `flamoraladmin` WITHOUT the `@hostname` suffix
- `db-name` should be `flamoral` NOT `flamoral_prod`
- Azure PostgreSQL will automatically append the `@hostname` during connection

### Required Redis Secrets

```bash
redis-host=flamoral-prod-redis.redis.cache.windows.net
redis-password=<your-actual-password>
```

### Verify Key Vault Secrets

```bash
# List all secrets in Key Vault
az keyvault secret list --vault-name flamoral-prod-kv --query "[].name" -o table

# Check a specific secret value (be careful with this in production)
az keyvault secret show --vault-name flamoral-prod-kv --name db-host --query "value" -o tsv
```

---

## Rollback Instructions

If you need to rollback the changes:

### Rollback Fix 1 (Database Secrets)

```bash
# Restore from backup
cp production/external-secrets/database-secrets.yaml.backup production/external-secrets/database-secrets.yaml

# Re-apply
kubectl apply -f production/external-secrets/database-secrets.yaml
```

### Rollback Fix 2 (Ingress)

```bash
# Restore from backup
cp deploy/ingress.yaml.backup deploy/ingress.yaml

# Re-apply
kubectl apply -f deploy/ingress.yaml
```

---

## Troubleshooting

### Issue: External Secret shows "SecretSyncedError"

**Possible Causes:**
1. Azure Key Vault secret doesn't exist
2. Managed Identity doesn't have access to Key Vault
3. SecretStore not configured correctly

**Solution:**
```bash
# Check ExternalSecret status
kubectl describe externalsecret flamoral-database-secrets -n flamoral

# Check SecretStore
kubectl describe secretstore azure-keyvault-store -n flamoral

# Verify Managed Identity has Key Vault permissions
az keyvault set-policy --name flamoral-prod-kv \
  --object-id <managed-identity-object-id> \
  --secret-permissions get list
```

### Issue: Pods stuck in CrashLoopBackOff

**Possible Causes:**
1. Database connection fails
2. Required environment variables missing
3. Health check failing

**Solution:**
```bash
# Check pod logs
kubectl logs <pod-name> -n flamoral --previous

# Check events
kubectl describe pod <pod-name> -n flamoral

# Common errors:
# "Cannot connect to database" = Check db-host, db-user, db-password in Key Vault
# "Secret key not found" = Fix 1 not applied correctly
# "Health check failed" = Service doesn't implement /health endpoint
```

### Issue: Ingress returns 502 Bad Gateway

**Possible Causes:**
1. Service port mismatch (Fix 2 not applied)
2. Pods not ready
3. Service not found

**Solution:**
```bash
# Verify service exists and has endpoints
kubectl get svc api-gateway -n flamoral
kubectl get endpoints api-gateway -n flamoral

# Should show pod IPs on port 4000

# Check ingress backend
kubectl describe ingress flamoral-ingress -n flamoral

# Verify port is 4000, not 80
```

---

## Success Criteria

After applying all fixes, you should see:

1. All ExternalSecrets showing `STATUS: SecretSynced` and `READY: True`
2. All pods in `Running` state with `READY: 1/1` or higher
3. All services have endpoints
4. Ingress shows correct backends
5. Health endpoints return 200 OK:
   - `curl https://api.flamoral.com/health`
6. No database connection errors in logs

---

## Additional Files in This Directory

- `database-secrets-fix.yaml` - Fixed version of database secrets configuration
- `ingress-fix.yaml` - Fixed version of ingress configuration
- `APPLY_FIXES.md` - This file

---

## Support

If you encounter issues not covered here, check:

1. `KUBERNETES_CONFIGURATION_FIXES.md` in parent directory for detailed analysis
2. Kubernetes events: `kubectl get events -n flamoral --sort-by='.lastTimestamp'`
3. Pod logs: `kubectl logs <pod-name> -n flamoral`
4. External Secrets Operator logs: `kubectl logs -n external-secrets-system -l app.kubernetes.io/name=external-secrets`

---

**Last Updated:** 2025-12-15
**Applies To:** Flamoral Kubernetes Infrastructure v1.0
