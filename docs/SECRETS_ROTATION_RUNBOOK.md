# Secrets Rotation Runbook

## Security Incident - Exposed Secrets

**Incident Date:** 2026-01-20
**Severity:** HIGH
**Status:** Requires Immediate Action

This runbook documents the secrets exposed during a security audit and provides step-by-step instructions for rotating them across all environments.

---

## Table of Contents

1. [Exposed Secrets Summary](#exposed-secrets-summary)
2. [Immediate Actions Required](#immediate-actions-required)
3. [Railway Secrets Rotation](#railway-secrets-rotation)
4. [Vercel Secrets Rotation](#vercel-secrets-rotation)
5. [Verification Steps](#verification-steps)
6. [Prevention Measures](#prevention-measures)
7. [Post-Incident Checklist](#post-incident-checklist)

---

## Exposed Secrets Summary

The following secrets were identified as exposed during the security audit:

| Secret | Location | Purpose | Risk Level |
|--------|----------|---------|------------|
| `JWT_ACCESS_SECRET` | `.env.railway` | Signs JWT access tokens for API authorization (15-min lifetime) | **CRITICAL** |
| `JWT_REFRESH_SECRET` | `.env.railway` | Signs JWT refresh tokens for session renewal (7-day lifetime) | **CRITICAL** |
| `INTERNAL_SERVICE_KEY` | `.env.railway` | Authenticates service-to-service communication between microservices | **HIGH** |
| Vercel OIDC Token | `.env.vercel` | Vercel deployment authentication and CI/CD pipeline access | **HIGH** |

### Impact Assessment

- **JWT Secrets:** If compromised, attackers could forge valid authentication tokens, impersonate any user, and gain unauthorized access to the platform.
- **Internal Service Key:** If compromised, attackers could bypass internal security controls and access internal APIs directly.
- **Vercel OIDC Token:** If compromised, attackers could deploy malicious code to production or access deployment configurations.

---

## Immediate Actions Required

Before starting rotation, complete these immediate actions:

- [ ] Confirm all exposed files have been removed from version control history
- [ ] Verify `.gitignore` is properly configured (see [Prevention Measures](#prevention-measures))
- [ ] Alert the security team and stakeholders
- [ ] Prepare for potential service disruption during rotation
- [ ] Schedule maintenance window if possible

---

## Railway Secrets Rotation

### Prerequisites

- Railway CLI installed: `npm install -g @railway/cli`
- Railway account with appropriate permissions
- Access to the production Railway project

### Step 1: Generate New JWT Secrets

Generate cryptographically secure random secrets:

```bash
# Generate new JWT_ACCESS_SECRET (256-bit / 64 hex characters)
openssl rand -hex 32

# Generate new JWT_REFRESH_SECRET (256-bit / 64 hex characters)
openssl rand -hex 32

# Generate new INTERNAL_SERVICE_KEY (256-bit / 64 hex characters)
openssl rand -hex 32
```

**Important:** Store these values securely in a password manager. Never share via unencrypted channels.

### Step 2: Authenticate with Railway CLI

```bash
# Login to Railway
railway login

# Link to the project
railway link
```

### Step 3: Update Secrets in Railway Dashboard

**Option A: Via Railway Dashboard (Recommended)**

1. Navigate to [Railway Dashboard](https://railway.app/dashboard)
2. Select the **Flamoral** project
3. Click on the appropriate service (e.g., `api-gateway`, `auth-service`)
4. Go to **Variables** tab
5. Update each secret:
   - Click on `JWT_ACCESS_SECRET` -> Edit -> Paste new value -> Save
   - Click on `JWT_REFRESH_SECRET` -> Edit -> Paste new value -> Save
   - Click on `INTERNAL_SERVICE_KEY` -> Edit -> Paste new value -> Save
6. Repeat for each service that uses these secrets

**Option B: Via Railway CLI**

```bash
# Set environment variables for the linked service
railway variables set JWT_ACCESS_SECRET=<new_access_secret>
railway variables set JWT_REFRESH_SECRET=<new_refresh_secret>
railway variables set INTERNAL_SERVICE_KEY=<new_service_key>
```

### Step 4: Trigger Redeployment

After updating secrets, redeploy all affected services:

```bash
# Via CLI - trigger redeploy
railway up

# Or via Dashboard:
# 1. Go to each service
# 2. Click "Deploy" or "Redeploy"
```

### Step 5: Invalidate Existing Sessions

Since JWT secrets have changed, all existing tokens will become invalid. Users will need to re-authenticate.

**Important:** If you need to avoid mass logout, implement a graceful migration:

1. Temporarily support both old and new secrets
2. Set a short grace period (e.g., 15 minutes for access tokens)
3. After grace period, remove old secret support

---

## Vercel Secrets Rotation

### Prerequisites

- Vercel CLI installed: `npm install -g vercel`
- Vercel account with appropriate permissions
- Access to the Flamoral Vercel project

### Step 1: Revoke Existing OIDC Token

1. Navigate to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your avatar -> **Settings**
3. Go to **Tokens** section
4. Find the compromised token
5. Click **Revoke** to invalidate it immediately

### Step 2: Generate New OIDC Token

**Via Vercel Dashboard:**

1. Go to **Settings** -> **Tokens**
2. Click **Create Token**
3. Configure the token:
   - **Name:** `flamoral-deployment-token` (descriptive name)
   - **Scope:** Select appropriate scope (Full Access or specific project)
   - **Expiration:** Set an expiration date (recommended: 90 days)
4. Click **Create**
5. Copy the token immediately (it won't be shown again)

**Via Vercel CLI:**

```bash
# Login to Vercel
vercel login

# Create a new token (this opens browser)
# Navigate to Settings -> Tokens in the opened page
```

### Step 3: Update CI/CD Configurations

Update the new token in all CI/CD systems that use it:

**GitHub Actions:**

1. Go to your GitHub repository -> **Settings** -> **Secrets and variables** -> **Actions**
2. Find `VERCEL_TOKEN` (or similar)
3. Click **Update** and paste the new token

**Other CI/CD Systems:**

Update the token in:
- GitLab CI/CD Variables
- CircleCI Environment Variables
- Jenkins Credentials
- Azure DevOps Service Connections

### Step 4: Update Local Development (if applicable)

If developers use the Vercel token locally:

```bash
# Re-authenticate with Vercel
vercel logout
vercel login

# Or update the token in local environment
# (but prefer using `vercel login` instead of storing tokens)
```

### Step 5: Verify Deployments

Trigger a test deployment to verify the new token works:

```bash
# From the project root
vercel --prod
```

---

## Verification Steps

After completing rotation, verify all systems are functioning correctly.

### Authentication System Verification

```bash
# 1. Test user registration
curl -X POST https://api.flamoral.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

# 2. Test user login
curl -X POST https://api.flamoral.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

# 3. Test token refresh
curl -X POST https://api.flamoral.com/api/auth/refresh \
  -H "Cookie: refreshToken=<token>"

# 4. Test protected endpoint with new access token
curl -X GET https://api.flamoral.com/api/users/me \
  -H "Authorization: Bearer <access_token>"
```

### Service-to-Service Communication Verification

```bash
# Test internal API call (from within the network)
curl -X GET http://internal-service/health \
  -H "X-Internal-Key: <new_internal_service_key>"
```

### Vercel Deployment Verification

```bash
# Trigger a preview deployment
vercel

# Check deployment status
vercel ls

# Verify production deployment
vercel --prod
```

### Monitoring Checklist

- [ ] Check application logs for authentication errors
- [ ] Monitor error rates in observability platform (Datadog, New Relic, etc.)
- [ ] Verify no 401/403 errors spike after rotation
- [ ] Confirm service health checks are passing
- [ ] Test end-to-end user flows in staging environment first

---

## Prevention Measures

### Gitignore Updates Implemented

The following patterns have been added/verified in `.gitignore` to prevent future exposure:

```gitignore
# Environment variables - EXCLUDE ALL .env FILES
# Only .env.example files should be committed
.env
.env.*
!.env.example
!.env.*.example
!.env.*.template

# Specific exclusions for safety
.env.local
.env.development
.env.development.local
.env.staging
.env.staging.local
.env.production
.env.production.local
.env.test
.env.test.local

# Vercel CLI generated files (contain tokens)
.env.vercel
**/.env.vercel

# Railway local overrides
.env.railway.local
**/.env.railway.local

# Backend service environments
backend/.env
backend/.env.*
!backend/.env.example
backend/services/**/.env
backend/services/**/.env.*
backend/services/**/.env.*.local
!backend/services/**/.env.example
!backend/services/**/.env.*.example
backend/tests/.env.test
```

### Additional Security Measures

1. **Pre-commit Hooks**
   ```bash
   # Install detect-secrets
   pip install detect-secrets

   # Initialize baseline
   detect-secrets scan > .secrets.baseline

   # Add to pre-commit config (.pre-commit-config.yaml)
   ```

2. **GitHub Secret Scanning**
   - Enable GitHub secret scanning in repository settings
   - Configure push protection to block commits containing secrets

3. **Secrets Management Best Practices**
   - Use Railway/Vercel environment variables, never commit secrets
   - Implement secret rotation schedule (every 90 days)
   - Use short-lived tokens where possible
   - Enable audit logging for secret access

4. **Regular Audits**
   - Run `git log --all --full-history -- "*.env*"` to check for env files in history
   - Use tools like `trufflehog` or `gitleaks` for secret scanning
   - Schedule quarterly security reviews

---

## Post-Incident Checklist

Complete this checklist after rotation is finished:

### Immediate (Within 24 Hours)

- [ ] All exposed secrets have been rotated
- [ ] Old secrets are no longer valid
- [ ] All services are functioning with new secrets
- [ ] No authentication errors in logs
- [ ] CI/CD pipelines are working

### Short-term (Within 1 Week)

- [ ] Security incident report documented
- [ ] Root cause analysis completed
- [ ] Git history cleaned if secrets were committed
- [ ] All team members notified of incident
- [ ] Prevention measures implemented and tested

### Long-term (Within 1 Month)

- [ ] Secret rotation schedule established
- [ ] Automated secret scanning in CI/CD
- [ ] Security training for team on secret handling
- [ ] Documentation updated with lessons learned
- [ ] Consider implementing secrets management solution (HashiCorp Vault, AWS Secrets Manager)

---

## Emergency Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| Security Lead | security@flamoral.com | Incident coordination |
| DevOps Lead | devops@flamoral.com | Infrastructure changes |
| On-Call Engineer | PagerDuty | Immediate response |

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-01-20 | 1.0 | Security Team | Initial runbook creation |

---

**Remember:** Security is everyone's responsibility. When in doubt, rotate the secret.
