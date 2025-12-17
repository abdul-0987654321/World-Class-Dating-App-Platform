# Secret Scanning Quick Reference - Flamoral Developers

## What Gets Scanned?

Every pull request and push to main/develop is automatically scanned for:

### Payment Provider Keys
- ✅ Stripe (live/test keys, webhooks)
- ✅ Paystack (secret/public keys)
- ✅ Flutterwave (secret/public/encryption keys)

### Cloud Provider Credentials
- ✅ Azure Storage (connection strings, account keys)
- ✅ Azure Service Bus (connection strings)
- ✅ Azure Cosmos DB (keys)
- ✅ AWS (access keys, secret keys)

### Database Credentials
- ✅ PostgreSQL connection strings
- ✅ MongoDB connection strings
- ✅ Redis connection strings

### Application Secrets
- ✅ JWT secrets
- ✅ API keys
- ✅ Service-to-service authentication tokens

### Third-Party Services
- ✅ SendGrid API keys
- ✅ Twilio (API keys, account SIDs)
- ✅ Slack webhook URLs

### Private Keys
- ✅ RSA private keys
- ✅ OpenSSH private keys
- ✅ PGP private keys

## What Happens When Secrets Are Detected?

### On Pull Requests
1. 🚫 **PR is automatically blocked**
2. 🏷️ **Labels added**: `security-blocked`, `secrets-detected`
3. 💬 **Comment posted** with remediation steps
4. 📊 **SARIF report** uploaded to Security tab
5. 🔔 **Security team notified**

### On Push to Main/Develop
1. ⚠️ **Security issue created** (high priority)
2. 📧 **Team notified**
3. 📊 **Alert in Security tab**
4. 🔍 **Incident response triggered**

## How to Avoid Secret Leaks

### ✅ DO THIS

```javascript
// Use environment variables
const stripeKey = process.env.STRIPE_SECRET_KEY;
const dbPassword = process.env.DB_PASSWORD;

// Load from .env file (never committed)
require('dotenv').config();
```

```bash
# In .env (added to .gitignore)
STRIPE_SECRET_KEY=sk_live_actual_secret_key
DATABASE_PASSWORD=actual_password
```

```bash
# In .env.example (committed)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
DATABASE_PASSWORD=your_password_here
```

### ❌ DON'T DO THIS

```javascript
// NEVER hardcode secrets
const stripeKey = 'sk_live_51Abc123xyz789...';
const dbPassword = 'MyP@ssw0rd123!';

// NEVER commit real values in config files
const config = {
  stripe: {
    secret: 'sk_live_real_key_here'  // BAD!
  }
};
```

## What Files Are Safe?

These files are excluded from scanning:

- ✅ `.env.example`, `.env.sample`, `.env.template`
- ✅ Test fixtures in `tests/fixtures/`, `__tests__/fixtures/`
- ✅ Documentation in `docs/`
- ✅ `node_modules/`
- ✅ Build artifacts (`dist/`, `build/`, `coverage/`)

## Using .env Files Correctly

### Structure

```
project/
├── .env                    # Real secrets (in .gitignore) ❌ NEVER COMMIT
├── .env.example            # Placeholders (committed) ✅ OK TO COMMIT
├── .env.local              # Local overrides (in .gitignore) ❌ NEVER COMMIT
└── .env.test               # Test values (can commit if clearly fake) ⚠️ BE CAREFUL
```

### .env (NOT committed)

```bash
# Real production/development secrets
STRIPE_SECRET_KEY=sk_live_51Abc123RealKeyHere
DATABASE_PASSWORD=ActualSecurePassword123!
JWT_SECRET=veryLongRandomSecretKeyHere12345
```

### .env.example (committed)

```bash
# Placeholders for documentation
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
DATABASE_PASSWORD=your_password_here
JWT_SECRET=your-jwt-secret-key-min-32-chars
```

## Testing Locally Before Pushing

### Install Gitleaks

```bash
# macOS
brew install gitleaks

# Windows (chocolatey)
choco install gitleaks

# Linux
wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.1/gitleaks_8.18.1_linux_x64.tar.gz
tar -xzf gitleaks_8.18.1_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/
```

### Scan Before Commit

```bash
# Scan staged changes
gitleaks protect --config=.gitleaks.toml --verbose --staged

# Scan uncommitted changes
gitleaks protect --config=.gitleaks.toml --verbose

# Scan entire repository
gitleaks detect --config=.gitleaks.toml --verbose
```

### Pre-commit Hook (Recommended)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "Running Gitleaks secret scan..."
gitleaks protect --config=.gitleaks.toml --verbose --staged --redact

if [ $? -eq 1 ]; then
    echo "⚠️  WARNING: Gitleaks has detected secrets!"
    echo "❌ Commit blocked. Please remove secrets before committing."
    exit 1
fi

echo "✅ No secrets detected. Proceeding with commit."
exit 0
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

## What to Do If Secrets Are Detected

### 1. Remove the Secret from Code

```bash
# If you haven't pushed yet
git reset --soft HEAD~1

# Edit files to remove secrets
# Move secrets to .env file
```

### 2. Rotate the Compromised Credential

#### Stripe
1. Go to https://dashboard.stripe.com/apikeys
2. Click "Reveal test key" or "Reveal live key"
3. Click "Roll key" to generate new one
4. Update `.env` file with new key

#### Azure Storage
```bash
az storage account keys renew \
  --account-name <account-name> \
  --key primary
```

#### Database Password
```sql
-- PostgreSQL
ALTER USER flamoral_user WITH PASSWORD 'new_secure_password';
```

#### JWT Secret
```bash
# Generate new secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Update .env file
```

### 3. Update Environment Variables

```bash
# .env file
STRIPE_SECRET_KEY=new_rotated_key_here
DATABASE_PASSWORD=new_password_here
```

### 4. Verify and Commit

```bash
# Scan locally
gitleaks protect --config=.gitleaks.toml --verbose --staged

# Commit if clean
git add .
git commit -m "fix: remove hardcoded secrets, use env vars"
```

## False Positives

If the scanner incorrectly flags something safe:

### 1. Verify It's Actually Safe

```javascript
// This might trigger false positive but is safe
const testKey = 'sk_test_4eC39HqLyjWDarjtT1zdp7dc';  // Stripe's official test key
```

### 2. Add to Allowlist

Edit `.gitleaks.toml`:

```toml
[[rules]]
id = "stripe-test-secret-key"
[rules.allowlist]
regexes = [
  '''sk_test_4eC39HqLyjWDarjtT1zdp7dc'''  # Official Stripe test key
]
```

### 3. Document Why It's Safe

```javascript
// Safe: This is Stripe's official public test key from their documentation
// See: https://stripe.com/docs/testing#cards
const STRIPE_TEST_KEY = 'sk_test_4eC39HqLyjWDarjtT1zdp7dc';
```

## Common Patterns to Avoid

### Connection Strings

```javascript
// ❌ BAD - Exposes password
const dbUrl = 'postgresql://user:MyPassword123@db.example.com:5432/mydb';

// ✅ GOOD - Uses environment variable
const dbUrl = process.env.DATABASE_URL;
```

### API Keys in Frontend

```javascript
// ❌ BAD - Secret key in frontend (NEVER!)
const stripe = Stripe('sk_live_secret_key');

// ✅ GOOD - Public key only
const stripe = Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
```

### Config Files

```javascript
// ❌ BAD - config.js with secrets
export default {
  stripe: {
    secretKey: 'sk_live_abc123'
  }
};

// ✅ GOOD - config.js with env vars
export default {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY
  }
};
```

### Test Files

```javascript
// ❌ BAD - Realistic test credentials
const testCreds = {
  apiKey: 'sk_test_51Abc123xyz789',
  password: 'P@ssw0rd123!'
};

// ✅ GOOD - Clearly fake test credentials
const testCreds = {
  apiKey: 'test_api_key_for_testing_only',
  password: 'test_password'
};
```

## Secret Management Best Practices

### Development
- Use `.env` files (never committed)
- Use different keys for dev/staging/prod
- Rotate keys regularly
- Use test mode keys when possible

### Production
- Use Azure Key Vault for all secrets
- Enable automatic rotation
- Use managed identities when possible
- Audit secret access regularly

### CI/CD
- Use GitHub Secrets for workflows
- Never log secrets
- Mask secrets in output
- Use separate service accounts

## Cheat Sheet

| Scenario | Solution |
|----------|----------|
| Need to store API key | Use `.env` file, add to `.gitignore` |
| Need to share config | Commit `.env.example` with placeholders |
| Local testing | Create `.env.local`, add to `.gitignore` |
| CI/CD secrets | Use GitHub Secrets |
| Production secrets | Use Azure Key Vault |
| Accidentally committed secret | Remove + rotate immediately |
| False positive | Add to `.gitleaks.toml` allowlist |
| Want to test locally | Run `gitleaks protect --staged` |

## Quick Commands

```bash
# Scan before commit
gitleaks protect --staged

# Scan specific file
gitleaks detect --config=.gitleaks.toml --source /path/to/file

# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Check if .env is in .gitignore
git check-ignore .env

# Remove file from git history (if accidentally committed)
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all
```

## Need Help?

1. **Check workflow logs**: Actions → Secret Leak Detection
2. **Review SARIF report**: Security → Code scanning
3. **Read full docs**: `.github/workflows/README-SECRET-SCANNING.md`
4. **Contact security team**: security@flamoral.com
5. **Create issue**: Tag with `security` label

## Remember

- 🔒 **NEVER** commit real secrets to git
- 🔄 **ALWAYS** rotate compromised credentials
- 📝 **DOCUMENT** why exceptions are safe
- 🧪 **TEST** locally before pushing
- 🔐 **USE** proper secret management (Azure Key Vault, GitHub Secrets)

---

**Last Updated**: 2025-12-12
**Maintained By**: Flamoral Security Team
