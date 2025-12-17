# Kubernetes Configuration Fixes - Quick Start Guide

## What's in This Directory?

This directory contains **CRITICAL FIXES** for Kubernetes deployment issues found in the Flamoral infrastructure.

---

## Files in This Directory

1. **`APPLY_FIXES.md`** - Step-by-step instructions to apply the fixes
2. **`AZURE_KEY_VAULT_SECRETS_CHECKLIST.md`** - Complete list of all Azure Key Vault secrets needed
3. **`database-secrets-fix.yaml`** - Fixed version of database secrets configuration
4. **`ingress-fix.yaml`** - Fixed version of ingress configuration
5. **`README.md`** - This file

---

## Critical Issues Fixed

### 1. Database Secret Keys Mismatch
**Problem:** Deployments fail because they reference `POSTGRES_*` keys, but External Secrets only creates `DB_*` keys.

**Impact:** All services that connect to PostgreSQL will crash on startup.

**Fix:** Updated `database-secrets-fix.yaml` to include both `DB_*` and `POSTGRES_*` keys.

### 2. Ingress Port Mismatch
**Problem:** Ingress routes to `api-gateway:80` but the service listens on port `4000`.

**Impact:** API requests return 502 Bad Gateway errors.

**Fix:** Updated `ingress-fix.yaml` to route to port `4000`.

---

## Quick Start

### Step 1: Apply Database Secrets Fix

```bash
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/kubernetes

# Backup original
cp production/external-secrets/database-secrets.yaml production/external-secrets/database-secrets.yaml.backup

# Apply fix
cp FIXES/database-secrets-fix.yaml production/external-secrets/database-secrets.yaml

# Deploy to cluster
kubectl apply -f production/external-secrets/database-secrets.yaml
```

### Step 2: Apply Ingress Fix

```bash
# Backup original
cp deploy/ingress.yaml deploy/ingress.yaml.backup

# Apply fix
cp FIXES/ingress-fix.yaml deploy/ingress.yaml

# Deploy to cluster
kubectl apply -f deploy/ingress.yaml
```

### Step 3: Configure Azure Key Vault Secrets

See `AZURE_KEY_VAULT_SECRETS_CHECKLIST.md` for the complete list of required secrets.

**Minimum required secrets to start:**
```bash
az keyvault secret set --vault-name flamoral-prod-kv --name db-host --value "flamoral-prod-postgres.postgres.database.azure.com"
az keyvault secret set --vault-name flamoral-prod-kv --name db-name --value "flamoral"
az keyvault secret set --vault-name flamoral-prod-kv --name db-user --value "flamoraladmin"
az keyvault secret set --vault-name flamoral-prod-kv --name db-password --value "<your-password>"
az keyvault secret set --vault-name flamoral-prod-kv --name redis-host --value "flamoral-prod-redis.redis.cache.windows.net"
az keyvault secret set --vault-name flamoral-prod-kv --name redis-password --value "<your-redis-key>"
```

### Step 4: Verify Deployment

```bash
# Check External Secrets sync
kubectl get externalsecrets -n flamoral

# Check pods are running
kubectl get pods -n flamoral

# Check ingress
kubectl get ingress -n flamoral

# Test API endpoint
curl -v https://api.flamoral.com/health
```

---

## Detailed Documentation

For detailed analysis of all issues found and complete fix instructions, see:

**`../KUBERNETES_CONFIGURATION_FIXES.md`** - Comprehensive analysis and documentation

---

## What Was Wrong?

### Issue Summary

| Issue | Severity | Impact | Status |
|-------|----------|--------|--------|
| Database secret key mismatch | CRITICAL | All services crash | FIXED |
| Ingress port mismatch | CRITICAL | 502 Bad Gateway | FIXED |
| Missing DB_SSL key | HIGH | SSL config fails | FIXED |
| Database user format | MEDIUM | Connection errors | DOCUMENTED |
| ConfigMap inconsistencies | LOW | Potential issues | DOCUMENTED |

### What Was Correct?

The following configurations were verified as correct and do NOT need changes:

- Resource limits (CPU/Memory)
- Health check configurations
- Service port mappings (in services/all-services.yaml)
- Security contexts
- Pod anti-affinity rules
- Namespace configurations
- Service discovery URLs
- TLS/SSL settings
- HPA configurations

---

## Rollback Instructions

If something goes wrong, restore from backups:

```bash
# Rollback database secrets
cp production/external-secrets/database-secrets.yaml.backup production/external-secrets/database-secrets.yaml
kubectl apply -f production/external-secrets/database-secrets.yaml

# Rollback ingress
cp deploy/ingress.yaml.backup deploy/ingress.yaml
kubectl apply -f deploy/ingress.yaml
```

---

## Support & Troubleshooting

### Common Errors After Applying Fixes

**Error:** `ExternalSecret shows "SecretSyncedError"`
- **Solution:** Check Azure Key Vault secrets exist with exact names
- **Check:** `az keyvault secret list --vault-name flamoral-prod-kv`

**Error:** `Pods in CrashLoopBackOff`
- **Solution:** Check pod logs for specific error
- **Check:** `kubectl logs <pod-name> -n flamoral --previous`

**Error:** `502 Bad Gateway from ingress`
- **Solution:** Verify ingress fix applied and pods are ready
- **Check:** `kubectl describe ingress flamoral-ingress -n flamoral`

**Error:** `Database connection failed`
- **Solution:** Verify db-user is `flamoraladmin` (no @hostname)
- **Check:** `az keyvault secret show --vault-name flamoral-prod-kv --name db-user`

### Getting Help

1. Check logs: `kubectl logs <pod-name> -n flamoral`
2. Check events: `kubectl get events -n flamoral --sort-by='.lastTimestamp'`
3. Check secret sync: `kubectl describe externalsecret flamoral-database-secrets -n flamoral`
4. Review detailed docs: `APPLY_FIXES.md`

---

## Files Modified

### Original Files That Need Updates

1. `production/external-secrets/database-secrets.yaml` → Replaced by `database-secrets-fix.yaml`
2. `deploy/ingress.yaml` → Replaced by `ingress-fix.yaml`

### Files That Are Correct (No Changes Needed)

- `production/services/all-services.yaml` ✓
- `production/deployments/*.yaml` ✓
- `production/ingress.yaml` ✓
- `configmaps/production-configmap.yaml` ✓
- `production/autoscaling/*.yaml` ✓
- `production/network-policies.yaml` ✓
- `security/*.yaml` ✓

---

## Next Steps After Applying Fixes

1. **Monitor pod startup:** `watch kubectl get pods -n flamoral`
2. **Check all services are healthy:** `kubectl get svc -n flamoral`
3. **Verify TLS certificates issued:** `kubectl get certificate -n flamoral`
4. **Test all endpoints:**
   - https://flamoral.com
   - https://api.flamoral.com/health
   - https://admin.flamoral.com
5. **Configure remaining Azure Key Vault secrets** (see checklist)
6. **Set up monitoring and alerting**
7. **Configure CI/CD pipelines**

---

## Security Notes

- **Never commit secrets to Git**
- **All secrets must be in Azure Key Vault**
- **Use Managed Identity for Key Vault access**
- **Rotate secrets regularly (see checklist for schedule)**
- **Review Key Vault access policies quarterly**

---

**Created:** 2025-12-15
**Last Updated:** 2025-12-15
**Version:** 1.0
**Status:** Ready for Production Deployment
