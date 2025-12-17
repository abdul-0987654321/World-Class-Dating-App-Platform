# TOTP/2FA Security Setup Guide

## Quick Start Guide

This guide will help you set up the secure TOTP/2FA encryption system.

## Step 1: Generate Encryption Keys

Generate secure encryption keys using OpenSSL:

```bash
# Generate master key (save this securely!)
openssl rand -base64 48

# Generate salt (save this securely!)
openssl rand -base64 48
```

Example output:
```
Master Key: Xk2p8vQ9mN4rL7wE1tY6uI8oP3aS5dF9gH2jK4lZ7xC6vB0nM1qW5eR8tY3uI6oP
Salt: Q9wE8rT5yU2iO1pA4sD7fG3hJ8kL9zX0cV1bN4mM2qW3eR6tY9uI8oP7aS5dF4gH
```

## Step 2: Update Environment Variables

Add the following to your `.env` file:

```bash
# TOTP/2FA Encryption (REQUIRED)
TOTP_ENCRYPTION_MASTER_KEY=Xk2p8vQ9mN4rL7wE1tY6uI8oP3aS5dF9gH2jK4lZ7xC6vB0nM1qW5eR8tY3uI6oP
TOTP_ENCRYPTION_KEY_SALT=Q9wE8rT5yU2iO1pA4sD7fG3hJ8kL9zX0cV1bN4mM2qW3eR6tY9uI8oP7aS5dF4gH
TOTP_ENCRYPTION_KEY_VERSION=1
```

**IMPORTANT:**
- Never commit these keys to version control
- Store them securely (use AWS Secrets Manager, HashiCorp Vault, etc.)
- Keep a backup in a secure location
- Different keys for each environment (dev, staging, production)

## Step 3: Install Dependencies

```bash
cd backend/services/user-service
npm install
```

## Step 4: Run Database Migrations

```bash
# Run all migrations including 2FA table creation
npm run migrate
```

This will:
1. Create `user_two_factor_auth` table with encrypted secret storage
2. Create `user_backup_codes` table
3. Create `user_verification_codes` table
4. Create `encryption_key_rotations` audit table
5. Encrypt any existing TOTP secrets

## Step 5: Verify Setup

Check that encryption is working:

```bash
npm run rotate-key verify
```

Expected output:
```
=== Verifying Encryption ===

Checking all TOTP secrets can be decrypted...

Total Records:   X
Valid:           X (100.00%)
Invalid:         0

SUCCESS: All TOTP secrets can be decrypted correctly!
```

## Step 6: Start Application

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

Check logs for successful initialization:
```
TOTP encryption key initialized
User Service running on port 3002
```

## Testing the Implementation

### Test 1: Generate TOTP Secret

```bash
curl -X POST http://localhost:3002/api/auth/2fa/totp/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "secret": "ABCDEFGH...",
    "qrCodeUrl": "otpauth://totp/Flamoral:user@example.com?secret=ABCDEFGH..."
  }
}
```

### Test 2: Verify Database Encryption

Connect to database and check:

```sql
SELECT
  user_id,
  method,
  LEFT(secret_encrypted, 50) as encrypted_preview,
  encryption_key_version
FROM user_two_factor_auth
WHERE method = '2fa_totp'
LIMIT 5;
```

The `secret_encrypted` column should contain encrypted data in format:
```
1:base64iv:base64tag:base64ciphertext
```

### Test 3: Verify Backup Codes

```bash
curl -X POST http://localhost:3002/api/auth/2fa/enable \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "2fa_totp",
    "verificationCode": "123456"
  }'
```

Check that backup codes are returned and properly formatted:
```json
{
  "success": true,
  "data": {
    "backupCodes": [
      "ABCD-EFGH-IJKL-MNOP",
      "1234-5678-9ABC-DEF0",
      ...
    ]
  }
}
```

## Environment-Specific Configuration

### Development

```bash
# .env.development
TOTP_ENCRYPTION_MASTER_KEY=dev-key-not-for-production-use-only-32-chars-minimum
TOTP_ENCRYPTION_KEY_SALT=dev-salt-not-for-production-use-only-32-chars-minimum
TOTP_ENCRYPTION_KEY_VERSION=1
```

### Staging

```bash
# .env.staging
TOTP_ENCRYPTION_MASTER_KEY=<staging-specific-key>
TOTP_ENCRYPTION_KEY_SALT=<staging-specific-salt>
TOTP_ENCRYPTION_KEY_VERSION=1
```

### Production

Use secret management service (recommended):

```bash
# AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id prod/totp-encryption-keys

# HashiCorp Vault
vault kv get secret/prod/totp-encryption

# Set in environment
export TOTP_ENCRYPTION_MASTER_KEY=$(aws secretsmanager get-secret-value ...)
export TOTP_ENCRYPTION_KEY_SALT=$(aws secretsmanager get-secret-value ...)
export TOTP_ENCRYPTION_KEY_VERSION=1
```

## Migrating Existing Data

If you have existing TOTP secrets in plaintext:

### Option 1: Automatic Migration (Recommended)

The migration script will run automatically when you run:
```bash
npm run migrate
```

### Option 2: Manual Verification

Check for unmigrated secrets:
```sql
SELECT COUNT(*)
FROM user_two_factor_auth
WHERE method = '2fa_totp'
  AND (secret IS NOT NULL AND secret_encrypted IS NULL);
```

If count > 0, manually trigger migration:
```bash
# The migration should have already run, but you can check logs
npm run migrate
```

## Key Rotation Setup

### When to Rotate

- Every 90 days (recommended)
- After security incident
- After personnel changes
- As required by security policy

### Rotation Process

1. **Generate new keys:**
   ```bash
   openssl rand -base64 48  # New master key
   openssl rand -base64 48  # New salt
   ```

2. **Update environment with BOTH old and new keys:**
   ```bash
   # Old keys (keep temporarily)
   TOTP_ENCRYPTION_MASTER_KEY_OLD=<current-key>
   TOTP_ENCRYPTION_KEY_SALT_OLD=<current-salt>
   TOTP_ENCRYPTION_KEY_VERSION_OLD=1

   # New keys
   TOTP_ENCRYPTION_MASTER_KEY=<new-key>
   TOTP_ENCRYPTION_KEY_SALT=<new-salt>
   TOTP_ENCRYPTION_KEY_VERSION=2
   ```

3. **Run rotation:**
   ```bash
   npm run rotate-key start
   ```

4. **Verify:**
   ```bash
   npm run rotate-key verify
   ```

5. **Remove old keys from environment**

6. **Restart application**

## Troubleshooting

### Error: "Encryption key not initialized"

**Cause:** Environment variables not set

**Solution:**
```bash
# Check if variables are set
echo $TOTP_ENCRYPTION_MASTER_KEY
echo $TOTP_ENCRYPTION_KEY_SALT

# If empty, set them in .env file and restart
```

### Error: "Failed to decrypt data"

**Cause:** Wrong encryption key or corrupted data

**Solution:**
```bash
# Verify correct key is being used
npm run rotate-key verify

# Check encryption key version in database matches environment
```

### Error: "Master key must be at least 32 characters"

**Cause:** Key too short

**Solution:**
```bash
# Generate new key with sufficient length
openssl rand -base64 48
```

### Database Migration Fails

**Cause:** Various reasons

**Solution:**
```bash
# Check migration status
npm run migrate:status

# Rollback if needed
npm run migrate:rollback

# Try again
npm run migrate
```

## Security Checklist

- [ ] Generated strong encryption keys (48+ characters)
- [ ] Stored keys securely (not in version control)
- [ ] Different keys for each environment
- [ ] Set up key rotation schedule (90 days)
- [ ] Configured monitoring and alerts
- [ ] Tested 2FA enrollment and verification
- [ ] Verified backup codes work
- [ ] Documented key management procedures
- [ ] Set up database backups
- [ ] Configured access controls
- [ ] Set up audit logging
- [ ] Tested disaster recovery procedures

## Monitoring Setup

### Key Metrics to Monitor

1. **Encryption Operations**
   - Success/failure rate
   - Performance metrics

2. **2FA Usage**
   - Active users with 2FA
   - Verification attempts
   - Backup code usage

3. **Key Rotation**
   - Last rotation date
   - Next scheduled rotation
   - Rotation success/failure

### Sample Monitoring Queries

```sql
-- Check encryption key versions in use
SELECT
  encryption_key_version,
  COUNT(*) as count
FROM user_two_factor_auth
WHERE method = '2fa_totp'
GROUP BY encryption_key_version;

-- Check 2FA adoption rate
SELECT
  COUNT(DISTINCT user_id) FILTER (WHERE is_enabled = true) as enabled_users,
  COUNT(DISTINCT user_id) as total_users,
  (COUNT(DISTINCT user_id) FILTER (WHERE is_enabled = true)::float /
   COUNT(DISTINCT user_id) * 100)::numeric(5,2) as adoption_rate_percent
FROM user_two_factor_auth;

-- Check backup code usage
SELECT
  user_id,
  COUNT(*) as total_codes,
  COUNT(*) FILTER (WHERE is_used = true) as used_codes,
  COUNT(*) FILTER (WHERE is_used = false) as remaining_codes
FROM user_backup_codes
GROUP BY user_id
HAVING COUNT(*) FILTER (WHERE is_used = false) < 3
ORDER BY remaining_codes;

-- Recent key rotations
SELECT
  old_key_version,
  new_key_version,
  records_migrated,
  status,
  started_at,
  completed_at
FROM encryption_key_rotations
ORDER BY started_at DESC
LIMIT 10;
```

## Support

For issues or questions:
- Documentation: See TOTP_SECURITY_FIXES.md
- Security issues: security@flamoral.com
- General support: support@flamoral.com

## Next Steps

1. Set up automated key rotation reminders
2. Configure monitoring and alerts
3. Document key management procedures
4. Train team on security practices
5. Schedule regular security audits
6. Test disaster recovery procedures

## Additional Resources

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)
- [RFC 6238 - TOTP](https://tools.ietf.org/html/rfc6238)
- [AES-GCM Specification](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
