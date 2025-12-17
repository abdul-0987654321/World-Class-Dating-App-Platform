# Secret Scanning Workflow - Flamoral Dating Platform

## Overview

The Flamoral CI pipeline includes comprehensive automated secret leak detection to prevent accidental exposure of sensitive credentials, API keys, and secrets in the codebase. This document explains the secret scanning implementation, configuration, and best practices.

## Components

### 1. Secret Scanning Workflow (`secret-scan.yml`)

A dedicated GitHub Actions workflow that runs on all PRs and pushes to main/develop branches.

**Features:**
- Multi-layer secret detection (Gitleaks + TruffleHog)
- Custom Flamoral-specific pattern detection
- Automatic PR blocking when secrets are detected
- Security issue creation for detected leaks
- SARIF report generation for GitHub Security tab

**Triggers:**
- Pull requests to main/develop/staging/release branches
- Pushes to main/develop branches
- Manual workflow dispatch

### 2. Gitleaks Configuration (`.gitleaks.toml`)

Custom configuration file defining:
- Payment provider key patterns (Stripe, Paystack, Flutterwave)
- Cloud provider credentials (Azure Storage, Service Bus, Cosmos DB)
- Database connection strings (PostgreSQL, MongoDB, Redis)
- JWT secrets and API keys
- Third-party service credentials (SendGrid, Twilio, Slack)
- Private key detection

**Key Features:**
- Custom rules for Flamoral-specific secrets
- Allowlist for known safe patterns (.env.example files)
- Path exclusions for test files with fake credentials
- Entropy-based detection for high-entropy secrets

### 3. TruffleHog Ignore Patterns (`.trufflehogignore`)

Specifies paths and patterns excluded from TruffleHog scanning:
- Example/template files
- Test fixtures
- Node modules
- Build artifacts
- Documentation files

## Integration with Main CI Pipeline

Secret scanning is integrated into both `main-ci.yml` and `unified-ci.yml`:

1. **Runs as a dedicated job**: `secret-scanning` job runs independently
2. **Blocks builds**: Docker builds depend on successful secret scanning
3. **Required check**: CI summary fails if secrets are detected
4. **SARIF upload**: Results uploaded to GitHub Security tab

## Detected Secret Types

### Critical Severity

1. **Stripe Live Keys**
   - Pattern: `sk_live_[0-9a-zA-Z]{24,}`
   - Impact: Direct access to production payment processing

2. **Stripe Restricted Keys**
   - Pattern: `rk_live_[0-9a-zA-Z]{24,}`
   - Impact: Limited access to Stripe resources

3. **Paystack Secret Keys**
   - Pattern: `sk_live_[0-9a-zA-Z]{40,}`
   - Impact: Production payment access

4. **Flutterwave Secret Keys**
   - Pattern: `FLWSECK-[0-9a-f]{32}-X`
   - Impact: Production payment access

5. **Azure Storage Account Keys**
   - Pattern: `[A-Za-z0-9+/]{88}==`
   - Impact: Full storage access

6. **AWS Access Keys**
   - Pattern: `(AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}`
   - Impact: AWS resource access

7. **Private Keys (RSA/OpenSSH/PGP)**
   - Pattern: Various BEGIN/END markers
   - Impact: Authentication bypass

### High Severity

1. **Stripe Webhook Secrets**
   - Pattern: `whsec_[0-9a-zA-Z]{32,}`
   - Impact: Webhook verification bypass

2. **Azure Service Bus Connection Strings**
   - Pattern: Contains SharedAccessKey
   - Impact: Message queue access

3. **Database Connection Strings**
   - Patterns: PostgreSQL, MongoDB, Redis URLs with passwords
   - Impact: Database access

4. **JWT Secrets (High Entropy)**
   - Pattern: jwt_secret with 32+ char values
   - Impact: Token forgery

5. **SendGrid API Keys**
   - Pattern: `SG.[a-zA-Z0-9_-]{22}.[a-zA-Z0-9_-]{43}`
   - Impact: Email sending abuse

6. **Twilio API Keys**
   - Pattern: `SK[a-z0-9]{32}`
   - Impact: SMS/voice service abuse

### Medium Severity

1. **Stripe Test Keys**
   - Pattern: `sk_test_[0-9a-zA-Z]{24,}`
   - Impact: Test environment access

2. **Paystack Public Keys**
   - Pattern: `pk_live_[0-9a-zA-Z]{40,}`
   - Impact: Limited client-side exposure

3. **Azure App Insights Keys**
   - Pattern: UUID format
   - Impact: Telemetry data access

4. **Twilio Account SIDs**
   - Pattern: `AC[a-z0-9]{32}`
   - Impact: Account information exposure

## Allowlist Patterns

### Files Always Excluded

```toml
**/.env.example
**/.env.sample
**/.env.template
**/tests/fixtures/**
**/node_modules/**
**/docs/**
```

### Safe Placeholder Patterns

```toml
YOUR_.*_HERE
PLACEHOLDER
REPLACE_ME
test:test@localhost
postgres:postgres@localhost
00000000-0000-0000-0000-000000000000
```

## Workflow Behavior

### On Pull Request

1. **Scan Execution**
   - Gitleaks scans diff between PR base and head
   - TruffleHog performs additional verification
   - Custom pattern detection checks payment keys

2. **If Secrets Found**
   - PR is automatically blocked
   - Labels applied: `security-blocked`, `secrets-detected`
   - Comment posted with remediation instructions
   - Security issue created
   - SARIF report uploaded to Security tab

3. **If No Secrets**
   - PR check passes
   - Success comment posted
   - Pipeline continues

### On Push to Main/Develop

1. **Full Scan**
   - Scans commits since last push
   - Creates security issues if secrets found
   - Notifies security team

2. **Blocking**
   - Does not block push (already committed)
   - Creates high-priority alerts for remediation

## Response Procedures

### When Secrets Are Detected

1. **Immediate Actions**
   ```bash
   # DO NOT commit real secrets
   # Remove detected secrets from code
   git reset --soft HEAD~1
   # Edit files to remove secrets
   # Use environment variables instead
   ```

2. **Rotate Compromised Credentials**
   - Stripe: Regenerate API keys in dashboard
   - Azure: Rotate storage account keys
   - Database: Change passwords
   - JWT: Generate new secrets

3. **Use Proper Secret Management**
   - Environment variables (`.env` files, not committed)
   - Azure Key Vault for production
   - GitHub Secrets for CI/CD
   - Kubernetes Secrets for deployments

4. **Update Code**
   ```javascript
   // BAD - Hardcoded secret
   const stripeKey = 'sk_live_abc123xyz...';

   // GOOD - Environment variable
   const stripeKey = process.env.STRIPE_SECRET_KEY;
   ```

5. **Add to Allowlist (False Positives Only)**
   ```toml
   # In .gitleaks.toml
   [rules.allowlist]
   regexes = [
     '''your_safe_pattern_here'''
   ]
   ```

### False Positive Handling

If a detection is a false positive:

1. **Verify it's actually safe**
   - Ensure it's not a real secret
   - Confirm it's a placeholder or test value

2. **Add to allowlist**
   - Edit `.gitleaks.toml`
   - Add pattern to appropriate section
   - Document why it's safe

3. **Example allowlist entry**
   ```toml
   [[rules]]
   id = "your-custom-rule"
   [rules.allowlist]
   regexes = [
     '''your_safe_pattern'''
   ]
   paths = [
     '''.*/tests/.*'''
   ]
   ```

## Testing the Configuration

### Local Testing with Gitleaks

```bash
# Install Gitleaks
brew install gitleaks  # macOS
# or download from https://github.com/gitleaks/gitleaks/releases

# Scan entire repository
gitleaks detect --config=.gitleaks.toml --verbose

# Scan uncommitted changes
gitleaks protect --config=.gitleaks.toml --verbose --staged

# Scan specific commit range
gitleaks detect --config=.gitleaks.toml --log-opts="HEAD~10..HEAD"
```

### Local Testing with TruffleHog

```bash
# Install TruffleHog
pip install trufflehog

# Scan repository
trufflehog filesystem . --only-verified

# Scan with custom exclusions
trufflehog filesystem . --exclude-paths=.trufflehogignore
```

## GitHub Branch Protection Rules

To enforce secret scanning, configure branch protection:

1. **Go to**: Repository Settings → Branches → Branch protection rules
2. **Protect**: `main`, `develop`, `staging`
3. **Enable**:
   - Require status checks to pass before merging
   - Require branches to be up to date before merging
4. **Select required checks**:
   - `Secret Leak Detection`
   - `Gitleaks Secret Scan`
   - `Block PR on Secret Detection`

## Monitoring and Reporting

### GitHub Security Tab

1. Navigate to: Repository → Security → Code scanning
2. View: Gitleaks SARIF reports
3. Filter: By severity, tool, status
4. Track: Remediation progress

### Security Issues

Automatically created issues include:
- Commit hash and author
- Detection timestamp
- Remediation checklist
- Links to workflow runs
- Labels: `security`, `critical`, `secret-leak`

### Workflow Logs

Detailed logs available in:
- Actions → Secret Leak Detection workflow
- Individual job logs
- SARIF report artifacts

## Best Practices

### For Developers

1. **Never commit secrets** to the repository
2. **Use `.env` files** (added to `.gitignore`)
3. **Use environment variables** in code
4. **Review diffs** before committing
5. **Run local scans** before pushing

### For .env.example Files

```bash
# GOOD - Placeholder
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here

# GOOD - Generic example
DATABASE_PASSWORD=your_password_here

# BAD - Real value
STRIPE_SECRET_KEY=sk_live_51Abc123...

# BAD - Realistic fake value
DATABASE_PASSWORD=P@ssw0rd123!
```

### For Test Files

```javascript
// GOOD - Clearly fake
const testApiKey = 'test_api_key_for_testing_only';

// GOOD - Mock
jest.mock('stripe', () => ({
  Stripe: jest.fn(() => ({
    apiKey: 'sk_test_mock_key'
  }))
}));

// BAD - Real-looking test key
const testKey = 'sk_test_4eC39HqLyjWDarjtT1zdp7dc';
```

## Troubleshooting

### Workflow Fails with "Secrets detected"

**Cause**: Gitleaks found potential secrets
**Solution**:
1. Check workflow logs for detected patterns
2. Review SARIF report in Security tab
3. Remove secrets from code
4. Rotate any exposed credentials

### False Positives

**Cause**: Legitimate code matches secret patterns
**Solution**:
1. Verify it's truly not a secret
2. Add to `.gitleaks.toml` allowlist
3. Document the exception
4. Re-run workflow

### Workflow Doesn't Run

**Cause**: Missing workflow file or configuration
**Solution**:
1. Verify `.github/workflows/secret-scan.yml` exists
2. Check workflow permissions
3. Ensure branch protection rules are set
4. Review GitHub Actions settings

### Performance Issues

**Cause**: Large repository or many commits
**Solution**:
1. Use diff-based scanning for PRs
2. Adjust `maxFileSize` in `.gitleaks.toml`
3. Exclude large binary files
4. Use shallow clones when possible

## Maintenance

### Regular Updates

1. **Update Gitleaks version**
   ```yaml
   # In secret-scan.yml
   env:
     GITLEAKS_VERSION: 'v8.18.1'  # Update as needed
   ```

2. **Review and update rules**
   - Add new secret patterns as services are added
   - Remove rules for deprecated services
   - Adjust allowlists based on false positives

3. **Test configuration changes**
   ```bash
   # Test locally before committing
   gitleaks detect --config=.gitleaks.toml --verbose
   ```

### Metrics to Track

- Number of secrets detected per month
- False positive rate
- Average remediation time
- Services with most detections

## Additional Resources

- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [TruffleHog Documentation](https://github.com/trufflesecurity/trufflehog)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [OWASP Secret Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Azure Key Vault Best Practices](https://docs.microsoft.com/en-us/azure/key-vault/general/best-practices)

## Support

For questions or issues:
1. Check this documentation first
2. Review workflow logs and SARIF reports
3. Contact the security team
4. Create an issue in the repository

## Security Contacts

- **Security Team**: [security@flamoral.com](mailto:security@flamoral.com)
- **On-Call**: Check incident response playbook
- **GitHub**: @security-team tag in issues
