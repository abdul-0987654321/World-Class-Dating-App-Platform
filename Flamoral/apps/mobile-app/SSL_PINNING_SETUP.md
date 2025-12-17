# SSL Certificate Pinning Setup Guide

## Overview

This guide explains how to implement and maintain SSL certificate pinning for the Flamoral mobile app. Certificate pinning protects against man-in-the-middle (MITM) attacks by validating that the server's certificate matches a known, trusted certificate.

## Table of Contents

1. [Understanding Certificate Pinning](#understanding-certificate-pinning)
2. [Generating Pin Hashes](#generating-pin-hashes)
3. [Configuration](#configuration)
4. [Testing](#testing)
5. [Certificate Rotation](#certificate-rotation)
6. [Troubleshooting](#troubleshooting)
7. [Security Best Practices](#security-best-practices)

---

## Understanding Certificate Pinning

### What is Certificate Pinning?

Certificate pinning ensures your app only trusts specific SSL certificates or public keys. Instead of trusting any certificate signed by a trusted Certificate Authority (CA), your app validates against hardcoded certificate "pins."

### Public Key Pinning vs Certificate Pinning

We use **public key (SPKI) pinning** rather than certificate pinning because:

- **Certificate pinning**: Pins the entire certificate. Requires app update when certificate expires.
- **Public key pinning**: Pins only the public key. Allows certificate renewal without app updates as long as the same key pair is used.

### Pin Hash Format

Pins are SHA-256 hashes of the Subject Public Key Info (SPKI) in base64 format:
```
sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
```

---

## Generating Pin Hashes

### Prerequisites

- OpenSSL (comes pre-installed on macOS/Linux, available for Windows)
- Access to your domain's SSL certificate

### Method 1: Generate from Live Server (Recommended)

This method extracts the pin from the currently deployed certificate:

```bash
# Replace api.flamoral.com with your domain
openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

**Example output:**
```
sha256/47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=
```

### Method 2: Generate from Certificate File

If you have the certificate file (.crt, .pem):

```bash
# Extract public key and generate hash
openssl x509 -in certificate.crt -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

### Method 3: Generate from Private Key (For Backup Pins)

Generate the pin from your private key (useful for backup pins before deploying new certificate):

```bash
# Generate public key from private key
openssl rsa -in private.key -pubout -outform DER | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

### Method 4: Using SSL Labs (Online Tool)

1. Visit https://www.ssllabs.com/ssltest/
2. Enter your domain (e.g., api.flamoral.com)
3. Wait for the scan to complete
4. Look for "Public Key" section
5. Find the "Pin SHA256" value

---

## Configuration

### Step 1: Generate Pins for All Domains

Generate pins for each domain:

```bash
# Main API
openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64

# AI Services
openssl s_client -servername ai.flamoral.com -connect ai.flamoral.com:443 | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64

# WebSocket
openssl s_client -servername ws.flamoral.com -connect ws.flamoral.com:443 | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

### Step 2: Generate Backup Pins

**CRITICAL**: Always include backup pins for certificate rotation.

Option A: Pin to intermediate CA certificate
```bash
# Get intermediate CA certificate
openssl s_client -showcerts -servername api.flamoral.com -connect api.flamoral.com:443 </dev/null 2>/dev/null | \
  openssl x509 -outform PEM > intermediate.pem

# Generate pin from intermediate
openssl x509 -in intermediate.pem -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

Option B: Generate new key pair for future rotation
```bash
# Generate new private key (keep this SECURE and OFFLINE)
openssl genrsa -out backup_private.key 2048

# Generate pin from the backup key
openssl rsa -in backup_private.key -pubout -outform DER | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

### Step 3: Update Configuration Files

#### JavaScript/TypeScript Configuration

Edit `src/config/sslPinning.config.ts`:

```typescript
export const SSL_PIN_CONFIG: SSLPinConfig[] = [
  {
    hostname: 'api.flamoral.com',
    pins: [
      'sha256/YOUR_PRIMARY_PIN_HERE=',
      'sha256/YOUR_BACKUP_PIN_HERE=',
    ],
    includeSubdomains: false,
  },
  // ... other domains
];
```

#### Android Configuration

Edit `android/app/src/main/res/xml/network_security_config.xml`:

```xml
<domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="false">api.flamoral.com</domain>
    <pin-set expiration="2026-12-31">
        <pin digest="sha256">YOUR_PRIMARY_PIN_HERE=</pin>
        <pin digest="sha256">YOUR_BACKUP_PIN_HERE=</pin>
    </pin-set>
</domain-config>
```

### Step 4: Replace Placeholder Pins

Replace ALL placeholder pins (AAAA..., BBBB..., etc.) with actual pins:

**Before:**
```typescript
pins: [
  'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
]
```

**After:**
```typescript
pins: [
  'sha256/47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=',
  'sha256/8Rw90Ej3Ttt8RRkrg+WYDS9n7IS03bk5bjP/UXPtaY8=',
]
```

---

## Testing

### Test in Development

1. **Enable permissive mode** (in `sslPinning.config.ts`):
```typescript
export const SSL_PINNING_OPTIONS = {
  enabled: __DEV__ ? false : true,
  validationMode: __DEV__ ? 'permissive' : 'strict',
};
```

2. **Test with correct pins**:
   - Set `enabled: true`
   - App should connect successfully
   - Check logs for validation success

3. **Test with incorrect pins**:
   - Temporarily use a wrong pin
   - App should show SSL pinning error
   - Verify error handling works correctly

4. **Test on different networks**:
   - WiFi
   - Cellular
   - VPN (should fail in strict mode)
   - Corporate proxy (should fail in strict mode)

### Verify Pin Correctness

Use this script to verify your pins match the server:

```bash
#!/bin/bash
# verify-pins.sh

DOMAIN="api.flamoral.com"
EXPECTED_PIN="47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU="

ACTUAL_PIN=$(openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64)

if [ "sha256/$ACTUAL_PIN" = "$EXPECTED_PIN" ]; then
  echo "✓ Pin matches!"
else
  echo "✗ Pin mismatch!"
  echo "Expected: $EXPECTED_PIN"
  echo "Actual:   sha256/$ACTUAL_PIN"
fi
```

### Test Certificate Rotation

Before deploying a new certificate:

1. Generate pin for new certificate
2. Add new pin as backup pin
3. Deploy app update with both old and new pins
4. Wait for app adoption (e.g., 95% of users updated)
5. Deploy new certificate
6. Old pin continues to work for legacy apps
7. After deprecation period, release app with only new pin

---

## Certificate Rotation

### Planning Certificate Rotation

**Timeline** (for 1-year certificates):

- **Day 0**: Deploy new certificate
- **Day 60**: Generate backup pin for next certificate
- **Day 300**: Release app with backup pin added
- **Day 330**: Ensure 95%+ users have updated app
- **Day 365**: Deploy new certificate (matches backup pin)
- **Day 395**: Release app removing old pin (optional)

### Step-by-Step Rotation Process

#### 60 Days Before Expiration

1. **Generate new key pair**:
```bash
openssl genrsa -out new_private.key 2048
openssl rsa -in new_private.key -pubout -out new_public.key
```

2. **Generate pin from new key**:
```bash
openssl rsa -in new_private.key -pubout -outform DER | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

3. **Add as backup pin** in all configuration files

4. **Release app update** with both pins

#### 7 Days Before Expiration

1. **Verify app adoption**:
   - Check analytics for version distribution
   - Ensure >95% users on version with backup pin
   - If not, delay certificate rotation

2. **Prepare new certificate**:
```bash
# Create CSR with new private key
openssl req -new -key new_private.key -out request.csr
# Submit to your CA
```

#### On Certificate Expiration

1. **Deploy new certificate** to all servers
2. **Monitor for SSL errors**:
   - Check logs for pin validation failures
   - Should see no failures (backup pin matches)

3. **Verify deployment**:
```bash
# Check certificate is new
openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Verify pin matches
openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

#### 30 Days After Rotation (Optional)

1. **Remove old pin** from configuration
2. **Release app update** with only new pin
3. **Keep old pin for emergency rollback** (30 days)

### Emergency Certificate Replacement

If certificate is compromised and needs immediate replacement:

1. **Generate emergency certificate** with new key pair
2. **Release app update** with emergency pin (high priority)
3. **Consider forced update** mechanism
4. **Push update to stores** with expedited review request
5. **Deploy certificate** only after 70%+ adoption
6. **Notify users** to update immediately

---

## Troubleshooting

### Common Issues

#### 1. "Certificate Mismatch" Error in Production

**Symptoms**: App shows SSL pinning error on valid network

**Causes**:
- Pin doesn't match deployed certificate
- Certificate was rotated without updating pins
- Using intermediate CA cert instead of leaf cert

**Solutions**:
```bash
# Verify current certificate pin
openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64

# Compare with configured pins in app
# If mismatch, release hotfix with correct pin
```

#### 2. Pins Work for Some Users, Not Others

**Causes**:
- Using CDN with multiple certificates
- Load balancer using different certificates per region
- Certificate chain inconsistency

**Solutions**:
- Ensure all servers use same certificate
- Pin to intermediate CA certificate (less secure)
- Add pins for all possible certificates

#### 3. Android Build Fails

**Error**: `Resource xml/network_security_config not found`

**Solution**:
- Verify XML file exists at correct path
- Check AndroidManifest.xml references correct file
- Clean and rebuild project

#### 4. iOS App Crashes on SSL Error

**Cause**: TrustKit or native pinning module not configured

**Solution**:
- Verify TrustKit installation
- Check Info.plist configuration
- Review native module setup

### Debug Mode

Enable debug logging in development:

```typescript
// In SecureHttpClient.ts
private debugPin(hostname: string, pin: string) {
  if (__DEV__) {
    console.log(`[SSL Debug] Validating ${hostname}`);
    console.log(`[SSL Debug] Expected pin: ${pin}`);
    // Additional debug info
  }
}
```

### Testing Tools

#### 1. Charles Proxy / Burp Suite

Test if SSL pinning prevents MITM:
1. Install proxy certificate on device
2. Configure device to use proxy
3. App should fail to connect (pinning working)
4. If app connects, pinning is not working

#### 2. ADB Logcat (Android)

Monitor SSL errors:
```bash
adb logcat | grep -i "ssl\|certificate\|pin"
```

#### 3. Xcode Console (iOS)

Filter for security logs:
```
Security: NSURLSession
```

---

## Security Best Practices

### 1. Pin Storage

- **Never commit private keys** to version control
- **Store backup keys offline** in secure hardware (HSM)
- **Use separate keys** for different environments (staging/production)
- **Encrypt backup keys** with strong passphrase

### 2. Pin Management

- **Minimum 2 pins** per domain (primary + backup)
- **Maximum 3 pins** per domain (avoid key confusion)
- **Set expiration dates** in network_security_config.xml
- **Document all pins** with generation date and purpose

### 3. Monitoring

- **Log pin validation failures** to security monitoring service
- **Alert on unexpected failures** (may indicate attacks)
- **Track certificate expiration** dates
- **Monitor app version distribution** for rotation planning

### 4. Update Strategy

- **Staged rollout** for apps with pin changes
- **Canary deployment** (5% → 25% → 50% → 100%)
- **Monitor error rates** during rollout
- **Have rollback plan** ready

### 5. Development Workflow

```typescript
// Use environment-based configuration
const pins = __DEV__
  ? ['sha256/DEV_PIN=']
  : ['sha256/PROD_PIN=', 'sha256/BACKUP_PIN='];
```

### 6. Documentation

Maintain a pin registry:

| Domain | Current Pin | Backup Pin | Expiration | Generated | Updated |
|--------|-------------|------------|------------|-----------|---------|
| api.flamoral.com | sha256/ABC...= | sha256/XYZ...= | 2026-12-31 | 2025-01-01 | 2025-11-15 |
| ai.flamoral.com | sha256/DEF...= | sha256/UVW...= | 2026-12-31 | 2025-01-01 | 2025-11-15 |

---

## Additional Resources

### Certificate Pinning Standards

- [OWASP Certificate Pinning](https://owasp.org/www-community/controls/Certificate_and_Public_Key_Pinning)
- [RFC 7469: Public Key Pinning Extension for HTTP](https://tools.ietf.org/html/rfc7469)

### Tools

- [SSL Labs](https://www.ssllabs.com/ssltest/) - Test SSL configuration
- [Certificate Transparency](https://crt.sh/) - Monitor certificate issuance
- [OpenSSL Documentation](https://www.openssl.org/docs/)

### Libraries

- [react-native-ssl-pinning](https://github.com/MaxToyberman/react-native-ssl-pinning)
- [TrustKit (iOS)](https://github.com/datatheorem/TrustKit)
- [Android Network Security Config](https://developer.android.com/training/articles/security-config)

---

## Quick Reference

### Generate Pin from Live Server
```bash
openssl s_client -servername DOMAIN -connect DOMAIN:443 | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

### Verify Pin Matches Server
```bash
# Get current pin
CURRENT=$(openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64)

# Compare
echo "Current pin: sha256/$CURRENT"
echo "Expected pin: sha256/YOUR_PIN_HERE"
```

### Check Certificate Expiration
```bash
openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | \
  openssl x509 -noout -dates
```

---

## Support

For questions or issues with SSL pinning:

- Email: security@flamoral.com
- Internal Slack: #security-team
- Documentation: https://docs.flamoral.com/security/ssl-pinning

**Emergency Contact** (certificate compromise): +1-XXX-XXX-XXXX

---

Last Updated: 2025-12-11
Version: 1.0.0
