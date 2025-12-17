# Quick Start - Security Configuration

**TL;DR:** Secrets are no longer committed to git. Use Azure Key Vault for production, local `.env` files for development.

---

## For Developers (Local Development)

### First Time Setup

1. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

2. **Create local .env file from template:**
   ```bash
   # Copy the template
   cp infrastructure/config/.env.development.template infrastructure/config/.env.development

   # Edit with your local values
   nano infrastructure/config/.env.development
   ```

3. **Get development credentials:**
   - Database: Use local PostgreSQL/MongoDB
   - Redis: Use local Redis
   - JWT secrets: Generate locally (not production values)
   - API keys: Use development/test keys

4. **Never commit .env files:**
   ```bash
   # This should fail (files are ignored)
   git add infrastructure/config/.env.development
   # ✓ Should see: "The following paths are ignored..."
   ```

### When You See "Missing environment variables" Error

1. Check if `.env` file exists in the service directory
2. Copy from `.env.example` if missing
3. Fill in required values
4. Restart the service

### Common Commands

```bash
# Check what .env files are tracked (should be none)
git ls-files | grep "\.env"
# ✓ Should only show .example and .template files

# Test if .env is ignored
echo "TEST=1" > test.env
git add test.env
# ✓ Should be ignored
rm test.env
```

---

## For DevOps (Production Deployment)

### Production Checklist

1. **Never use .env files in production**
   - All secrets in Azure Key Vault
   - See `AZURE_KEY_VAULT_SETUP.md`

2. **Setup Key Vault:**
   ```bash
   # Create Key Vault
   az keyvault create --name flamoral-prod-kv --resource-group flamoral-prod-rg

   # Store secrets
   az keyvault secret set --vault-name flamoral-prod-kv --name DB-PASSWORD --value "..."
   ```

3. **Configure Kubernetes:**
   - Use CSI driver to mount secrets
   - Use Managed Identity for authentication
   - See `AZURE_KEY_VAULT_SETUP.md` for details

4. **Verify deployment:**
   ```bash
   # Check pods are running
   kubectl get pods -n flamoral-prod

   # Check secrets loaded
   kubectl logs -n flamoral-prod deployment/auth-service | grep "Loaded secrets"
   ```

---

## For Team Leads

### Post-Merge Actions

After merging the security fixes:

1. **Notify team:**
   - `.env` files no longer committed
   - Everyone needs to create local `.env` from templates
   - Production uses Azure Key Vault

2. **Coordinate git cleanup:**
   - See `GIT_CLEANUP_INSTRUCTIONS.md`
   - May require force push (coordinate timing)

3. **Rotate production secrets:**
   - Change all secrets as a precaution
   - Update in Azure Key Vault
   - Restart services

### Admin Account Setup

All admins must:
1. Verify email address ✓
2. Enable 2FA (TOTP recommended) ✓
3. Store backup codes securely ✓

See `SECURITY_CONFIGURATION.md` → "Admin Account Security"

---

## For Security Team

### Verification Steps

1. **Check .gitignore:**
   ```bash
   cat .gitignore | grep -A 30 "Environment variables"
   ```

2. **Verify no secrets in git:**
   ```bash
   git log --all --full-history --source -- '*/.env' '*/.env.*'
   ```

3. **Check Key Vault access:**
   ```bash
   az keyvault secret list --vault-name flamoral-prod-kv
   ```

4. **Test email verification:**
   - Register new user
   - Verify cannot login without email verification

5. **Test 2FA:**
   - Enable TOTP for test admin
   - Verify required for admin access

### Security Monitoring

Monitor these:
- Failed login attempts
- Unverified email login attempts
- Key Vault access logs
- 2FA enrollment rate
- Secret rotation schedule

See `SECURITY_CONFIGURATION.md` → "Monitoring & Logging"

---

## Emergency Procedures

### If Secrets Were Exposed

1. **Immediately:**
   - Rotate all secrets in Key Vault
   - Invalidate all sessions
   - Document incident

2. **Contact:**
   - Security Team: security@flamoral.com
   - DevOps Team: devops@flamoral.com

See `SECURITY_CONFIGURATION.md` → "Emergency Procedures"

---

## Documentation Reference

| Document | Purpose |
|----------|---------|
| `SECURITY_AUDIT_FIXES.md` | Complete overview of all changes |
| `SECURITY_CONFIGURATION.md` | Comprehensive security guide (email, 2FA, admin) |
| `AZURE_KEY_VAULT_SETUP.md` | Step-by-step Key Vault setup |
| `GIT_CLEANUP_INSTRUCTIONS.md` | Remove .env files from git |
| `QUICK_START_SECURITY.md` | This document |

---

## Quick Commands

```bash
# Create local .env for development
cp infrastructure/config/.env.development.template infrastructure/config/.env.development

# Check git ignore status
git check-ignore -v infrastructure/config/.env.development

# Generate strong secret
openssl rand -base64 64

# Azure Key Vault - Store secret
az keyvault secret set --vault-name flamoral-prod-kv --name SECRET-NAME --value "VALUE"

# Azure Key Vault - Get secret
az keyvault secret show --vault-name flamoral-prod-kv --name SECRET-NAME --query value -o tsv

# Kubernetes - Check secrets
kubectl get secrets -n flamoral-prod

# Kubernetes - Restart service
kubectl rollout restart deployment/auth-service -n flamoral-prod
```

---

## Common Issues

### "JWT_ACCESS_SECRET is required" Error

**Cause:** Missing environment variable

**Fix:**
```bash
# Development: Add to .env file
echo "JWT_ACCESS_SECRET=$(openssl rand -base64 64)" >> infrastructure/config/.env.development

# Production: Add to Key Vault
az keyvault secret set --vault-name flamoral-prod-kv --name JWT-ACCESS-SECRET --value "$(openssl rand -base64 64)"
```

### "Email verification required" Error

**Cause:** Production environment requires verified email

**Fix:**
1. User must verify email via link sent during registration
2. Or set `NODE_ENV=development` for testing

### "Cannot commit .env file" (Good!)

**Cause:** .gitignore is working correctly

**Fix:** No fix needed! This is the desired behavior. Use templates instead.

---

## Need Help?

- **General Questions:** See `SECURITY_CONFIGURATION.md`
- **Key Vault Issues:** See `AZURE_KEY_VAULT_SETUP.md`
- **Git Issues:** See `GIT_CLEANUP_INSTRUCTIONS.md`
- **Support:** devops@flamoral.com

---

Last Updated: 2025-12-17
