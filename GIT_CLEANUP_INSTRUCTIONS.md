# Git Cleanup Instructions - Remove .env Files from Version Control

## CRITICAL: Security Fix Required

This document provides instructions for removing sensitive `.env` files from version control as part of the security audit remediation.

## Problem

Several `.env` files containing actual credentials were committed to the repository:

1. `infrastructure/config/.env.development`
2. `infrastructure/config/.env.production`
3. `infrastructure/config/.env.staging`
4. `apps/web-app/.env.development`
5. `apps/web-app/.env.production`
6. `apps/web-app/.env.test`
7. `backend/.env.test`
8. `backend/tests/.env.test`

These files contain sensitive information including:
- Database passwords
- JWT secrets
- API keys
- OAuth credentials
- Service tokens

## Solution

The `.gitignore` file has been updated to prevent future commits of `.env` files. However, these files need to be removed from git history.

## Instructions

### Step 1: Remove Files from Git Tracking (Preserve Local Files)

Run these commands from the repository root:

```bash
# Navigate to repository root
cd "C:\Users\citad\OneDrive\Documents\Dating"

# Remove files from git tracking but keep local copies
git rm --cached infrastructure/config/.env.development
git rm --cached infrastructure/config/.env.production
git rm --cached infrastructure/config/.env.staging
git rm --cached apps/web-app/.env.development
git rm --cached apps/web-app/.env.production
git rm --cached apps/web-app/.env.test
git rm --cached backend/.env.test
git rm --cached backend/tests/.env.test
```

If any files are not tracked (error message "did not match any files"), that's okay - it means they're already not in git.

### Step 2: Commit the Changes

```bash
# Stage the .gitignore changes
git add .gitignore

# Commit the removal
git commit -m "Security fix: Remove .env files from version control

- Updated .gitignore to exclude ALL .env files
- Removed sensitive .env files from tracking
- All secrets must now be stored in Azure Key Vault
- See SECURITY_CONFIGURATION.md and AZURE_KEY_VAULT_SETUP.md

BREAKING CHANGE: Environment variables must be configured from Key Vault or local .env files (not committed)"
```

### Step 3: Push Changes

```bash
# Push to your branch
git push origin <your-branch-name>

# Or if you're on main/master (after review)
git push origin main
```

### Step 4: Notify Team Members

**IMPORTANT:** After merging to main, all team members must:

1. Pull the latest changes:
   ```bash
   git pull origin main
   ```

2. Create their own local `.env` files from templates:
   ```bash
   # Copy development templates
   cp infrastructure/config/.env.development.template infrastructure/config/.env.development
   cp apps/web-app/.env.example apps/web-app/.env.development

   # Edit files to add actual values for local development
   # DO NOT commit these files
   ```

3. For production/staging, use Azure Key Vault (see `AZURE_KEY_VAULT_SETUP.md`)

### Step 5: (Optional) Remove from Git History

**WARNING:** This rewrites git history and requires force push. Only do this if:
- You have approval from team lead
- You've coordinated with all team members
- You understand the implications

If you need to completely remove these files from git history:

```bash
# Install git-filter-repo (if not already installed)
# Windows: pip install git-filter-repo
# Mac: brew install git-filter-repo
# Linux: apt-get install git-filter-repo

# Backup your repository first!
cd ..
cp -r Dating Dating-backup

# Remove files from all history
cd Dating
git filter-repo --path infrastructure/config/.env.development --invert-paths
git filter-repo --path infrastructure/config/.env.production --invert-paths
git filter-repo --path infrastructure/config/.env.staging --invert-paths
git filter-repo --path apps/web-app/.env.development --invert-paths
git filter-repo --path apps/web-app/.env.production --invert-paths
git filter-repo --path apps/web-app/.env.test --invert-paths
git filter-repo --path backend/.env.test --invert-paths
git filter-repo --path backend/tests/.env.test --invert-paths

# Force push (coordinate with team!)
git push origin --force --all
git push origin --force --tags
```

**After force push, all team members must:**
```bash
# Backup any local work
git stash

# Re-clone the repository
cd ..
rm -rf Dating
git clone <repository-url>
cd Dating

# Restore local work if needed
```

## Verification

After completing the steps, verify:

1. **Check git status:**
   ```bash
   git status
   # Should show .gitignore modified
   # Should NOT show any .env files
   ```

2. **Verify .gitignore:**
   ```bash
   cat .gitignore | grep -A 20 "Environment variables"
   # Should show comprehensive .env exclusions
   ```

3. **Test that .env files are ignored:**
   ```bash
   # Try to add a .env file
   echo "TEST=value" > test.env
   git add test.env
   # Should get: "The following paths are ignored by one of your .gitignore files"
   rm test.env
   ```

4. **Check tracked files:**
   ```bash
   git ls-files | grep "\.env"
   # Should only show .env.example and .env.*.template files
   ```

## What to Do Instead

### For Development

Create local `.env` files from templates:

```bash
# These files are in .gitignore and won't be committed
cp infrastructure/config/.env.development.template infrastructure/config/.env.development
cp apps/web-app/.env.example apps/web-app/.env.development

# Edit with your local values
nano infrastructure/config/.env.development
```

### For Production/Staging

**NEVER** create actual `.env` files for production. Instead:

1. Store all secrets in Azure Key Vault
2. Use Managed Identity for authentication
3. Mount secrets in Kubernetes using CSI driver
4. See `AZURE_KEY_VAULT_SETUP.md` for detailed instructions

## Emergency: If Secrets Were Exposed

If any of these files were pushed to a public repository or accessed by unauthorized parties:

1. **Immediately rotate all secrets:**
   - Database passwords
   - JWT secrets
   - API keys
   - OAuth credentials
   - Service tokens

2. **Update Azure Key Vault:**
   ```bash
   # Example: Rotate JWT secret
   NEW_SECRET=$(openssl rand -base64 64)
   az keyvault secret set \
     --vault-name flamoral-prod-kv \
     --name JWT-ACCESS-SECRET \
     --value "$NEW_SECRET"
   ```

3. **Invalidate all active sessions:**
   - Force logout all users
   - Clear Redis cache
   - Restart services

4. **Document the incident:**
   - What was exposed
   - When it was exposed
   - Who had access
   - What actions were taken

5. **Notify security team:**
   - Email: security@flamoral.com
   - Include incident timeline
   - Follow incident response procedures

## Questions?

Contact:
- DevOps Team: devops@flamoral.com
- Security Team: security@flamoral.com
- Project Lead: [Add contact info]

## Related Documentation

- `SECURITY_CONFIGURATION.md` - Complete security setup guide
- `AZURE_KEY_VAULT_SETUP.md` - Azure Key Vault configuration
- `.gitignore` - Updated git ignore rules
- `infrastructure/config/.env.*.template` - Environment templates

---

Last Updated: 2025-12-17
Version: 1.0
