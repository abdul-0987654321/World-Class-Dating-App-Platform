# Quick Start Guide - Secret Scanning

## Overview

Automated secret scanning is now active on the Flamoral CI pipeline. This guide will get you started in 5 minutes.

## What You Need to Know

### Automatic Protection

Every pull request and push to main/develop is automatically scanned for:
- Payment provider keys (Stripe, Paystack, Flutterwave)
- Cloud credentials (Azure, AWS)
- Database passwords
- API keys and JWT secrets
- Private keys

### What Happens

**If secrets are detected:**
- PR is blocked automatically
- You get a comment with instructions
- Security team is notified
- You must fix before merging

**If no secrets:**
- PR check passes
- Workflow continues normally

## Quick Start (3 Steps)

### 1. Install Local Git Hooks (Optional but Recommended)

Catch secrets before pushing:

```bash
cd DatingPlatform
./scripts/install-git-hooks.sh
```

This will:
- Install Gitleaks pre-commit hook
- Scan files before each commit
- Block commits with secrets

### 2. Test Your Setup

Validate everything is working:

```bash
./scripts/validate-secret-scanning.sh
```

This will check:
- Configuration files exist
- Gitleaks is installed
- Patterns are working
- CI integration is correct

### 3. Review Documentation

Quick reference for developers:
```bash
cat docs/security/SECRET-SCANNING-GUIDE.md
```

Full documentation:
```bash
cat .github/workflows/README-SECRET-SCANNING.md
```

## Common Scenarios

### Scenario 1: You Need to Use an API Key

**DO THIS:**

```javascript
// .env (never commit this file)
STRIPE_SECRET_KEY=sk_live_actual_key_here

// Your code
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
```

**DON'T DO THIS:**

```javascript
// WRONG - Never hardcode secrets
const stripe = require('stripe')('sk_live_51Abc123...');
```

### Scenario 2: Creating Example Configuration

**DO THIS:**

```bash
# .env.example (safe to commit)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
DATABASE_PASSWORD=your_password_here
```

**DON'T DO THIS:**

```bash
# WRONG - Don't use real values in examples
STRIPE_SECRET_KEY=sk_live_51Abc123RealKey
DATABASE_PASSWORD=MyActualPassword123!
```

### Scenario 3: Secret Detected in Your PR

**Steps to Fix:**

1. **Don't panic!** This is working as designed.

2. **Remove the secret:**
   ```bash
   # If you haven't pushed yet
   git reset --soft HEAD~1
   # Edit files to remove secrets
   # Move to .env file instead
   ```

3. **Rotate the credential:**
   - Go to the service dashboard (Stripe, Azure, etc.)
   - Generate a new key
   - Update your local `.env` file

4. **Commit again:**
   ```bash
   git add .
   git commit -m "fix: use environment variables for secrets"
   git push
   ```

### Scenario 4: False Positive

If the scanner incorrectly flags something safe:

1. **Verify it's actually safe** (not a real secret)

2. **Add to allowlist** in `.gitleaks.toml`:
   ```toml
   [[rules]]
   id = "your-rule-id"
   [rules.allowlist]
   regexes = [
     '''your_safe_pattern_here'''
   ]
   ```

3. **Document why it's safe** in a comment

## File Structure

```
DatingPlatform/
├── .env                          # Real secrets (NEVER COMMIT)
├── .env.example                  # Placeholders (safe to commit)
├── .gitleaks.toml                # Scanner configuration
├── .trufflehogignore             # Exclusion patterns
├── .github/
│   └── workflows/
│       ├── secret-scan.yml       # Main workflow
│       ├── main-ci.yml           # Updated with secret scanning
│       └── unified-ci.yml        # Updated with secret scanning
├── docs/
│   └── security/
│       └── SECRET-SCANNING-GUIDE.md  # Developer guide
└── scripts/
    ├── install-git-hooks.sh      # Install pre-commit hook
    └── validate-secret-scanning.sh  # Test configuration
```

## Testing Locally

### Before Committing

```bash
# Scan staged changes
gitleaks protect --config=.gitleaks.toml --staged

# Scan all uncommitted changes
gitleaks protect --config=.gitleaks.toml
```

### Full Repository Scan

```bash
# Scan entire repository
gitleaks detect --config=.gitleaks.toml --verbose
```

### Install Gitleaks

If you don't have Gitleaks installed:

```bash
# macOS
brew install gitleaks

# Windows (Chocolatey)
choco install gitleaks

# Linux
wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.1/gitleaks_8.18.1_linux_x64.tar.gz
tar -xzf gitleaks_8.18.1_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/
```

## Cheat Sheet

| Task | Command |
|------|---------|
| Install hooks | `./scripts/install-git-hooks.sh` |
| Validate setup | `./scripts/validate-secret-scanning.sh` |
| Scan before commit | `gitleaks protect --staged` |
| Full repo scan | `gitleaks detect --config=.gitleaks.toml` |
| Generate JWT secret | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| Check .env in .gitignore | `git check-ignore .env` |

## What's Excluded

These are safe to commit:
- `.env.example`, `.env.sample`, `.env.template`
- Test fixtures in `tests/fixtures/`
- Documentation in `docs/`
- Files with placeholder patterns like `YOUR_KEY_HERE`

## Getting Help

1. **Quick reference**: `docs/security/SECRET-SCANNING-GUIDE.md`
2. **Full docs**: `.github/workflows/README-SECRET-SCANNING.md`
3. **Implementation summary**: `IMPLEMENTATION-SUMMARY-SECRET-SCANNING.md`
4. **Security team**: security@flamoral.com
5. **Create issue**: Tag with `security` label

## Next Steps

### For Developers

1. ✅ Install git hooks: `./scripts/install-git-hooks.sh`
2. ✅ Read quick guide: `docs/security/SECRET-SCANNING-GUIDE.md`
3. ✅ Test with a commit
4. ✅ Review your existing .env files

### For Team Leads

1. ✅ Run validation: `./scripts/validate-secret-scanning.sh`
2. ✅ Enable branch protection rules
3. ✅ Configure GitHub Secrets:
   - `SECURITY_TEAM_GITHUB_USERS`
   - `SECURITY_TEAM_EMAILS`
4. ✅ Schedule team training session

### For Security Team

1. ✅ Review `.gitleaks.toml` configuration
2. ✅ Set up notification channels
3. ✅ Create incident response procedures
4. ✅ Monitor Security tab for findings

## Important Reminders

- 🔒 **NEVER** commit `.env` files with real secrets
- 🔄 **ALWAYS** rotate credentials if accidentally committed
- 📝 **DOCUMENT** false positives in allowlist
- 🧪 **TEST** locally before pushing
- 🔐 **USE** Azure Key Vault for production secrets

## Status

✅ **Secret scanning is ACTIVE**
- Running on all PRs
- Running on pushes to main/develop
- Blocking PRs with detected secrets
- Notifying security team

## Questions?

Check the documentation or contact:
- **Security Team**: security@flamoral.com
- **GitHub Issues**: Tag `security` label
- **Emergency**: Follow incident response playbook

---

**Quick Start Updated**: 2024-12-12
**Status**: Production Ready ✅
