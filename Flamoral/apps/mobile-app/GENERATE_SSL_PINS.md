# SSL Certificate Pin Generation Guide for Flamoral

## Current Status

As of 2025-12-12, SSL certificate pins need to be generated for the following domains:

1. **api.flamoral.com** - Main API endpoint
2. **ai.flamoral.com** - AI services endpoint
3. **ws.flamoral.com** - WebSocket endpoint

## Prerequisites

- OpenSSL installed on your system
- Access to the domains (domains must be live with SSL certificates)
- Terminal/Command Line access

### Installing OpenSSL

**Windows:**
- OpenSSL comes with Git for Windows (Git Bash)
- Or download from: https://slproweb.com/products/Win32OpenSSL.html

**macOS:**
```bash
# Already installed, or use Homebrew
brew install openssl
```

**Linux:**
```bash
# Debian/Ubuntu
sudo apt-get install openssl

# RedHat/CentOS
sudo yum install openssl
```

---

## Step 1: Check Domain Accessibility

Before generating pins, verify each domain is accessible and has a valid SSL certificate:

```bash
# Test api.flamoral.com
curl -I https://api.flamoral.com

# Test ai.flamoral.com
curl -I https://ai.flamoral.com

# Test ws.flamoral.com
curl -I https://ws.flamoral.com
```

If any domain returns an error, it means the domain is not yet live or doesn't have an SSL certificate configured.

---

## Step 2: Generate Primary Pins

Run these commands to generate the primary certificate pins for each domain:

### For api.flamoral.com

```bash
openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

**Expected output format:** `abcdefgh1234567890ABCDEFGH1234567890abcd=`

Save this output as: **API_PRIMARY_PIN**

### For ai.flamoral.com

```bash
openssl s_client -servername ai.flamoral.com -connect ai.flamoral.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

Save this output as: **AI_PRIMARY_PIN**

### For ws.flamoral.com

```bash
openssl s_client -servername ws.flamoral.com -connect ws.flamoral.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

Save this output as: **WS_PRIMARY_PIN**

---

## Step 3: Generate Backup Pins

Backup pins are CRITICAL for certificate rotation. You have two options:

### Option A: Pin to Intermediate CA Certificate (Recommended)

This extracts the pin from the intermediate CA certificate in the chain:

```bash
# For api.flamoral.com
echo | openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 -showcerts 2>/dev/null | \
  sed -n '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/p' | \
  sed -n '2,/-----END CERTIFICATE-----/p' | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

Repeat for ai.flamoral.com and ws.flamoral.com by replacing the domain name.

Save outputs as: **API_BACKUP_PIN**, **AI_BACKUP_PIN**, **WS_BACKUP_PIN**

### Option B: Generate New Key Pair for Future Rotation

If you control the certificates and plan to rotate them:

```bash
# Generate a new private key (KEEP THIS SECURE!)
openssl genrsa -out backup_private_api.key 2048

# Generate the pin from this key
openssl rsa -in backup_private_api.key -pubout -outform DER | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

**IMPORTANT:** Store the private key in a secure location. You'll need it when rotating certificates.

---

## Step 4: Verify Certificate Information

Check certificate expiration dates to plan rotation:

```bash
# For each domain:
openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Shows:
# notBefore=...
# notAfter=...
```

---

## Step 5: Update Configuration Files

Once you have all the pins, update the following files:

### File 1: sslPinning.config.ts

Location: `apps/mobile-app/src/config/sslPinning.config.ts`

Replace placeholders:
- `AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=` with **API_PRIMARY_PIN**
- `BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=` with **API_BACKUP_PIN**
- `CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=` with **AI_PRIMARY_PIN**
- `DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD=` with **AI_BACKUP_PIN**
- `EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE=` with **WS_PRIMARY_PIN**
- `FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF=` with **WS_BACKUP_PIN**

### File 2: network_security_config.xml

Location: `apps/mobile-app/android/app/src/main/res/xml/network_security_config.xml`

Replace the same placeholders in the Android configuration.

---

## Step 6: Test the Configuration

### Test with Correct Pins

1. Build the app with the new pins
2. Run the app and verify it connects successfully
3. Check logs for SSL validation messages

### Test with Incorrect Pins (Optional)

1. Temporarily use a wrong pin in development build
2. App should fail to connect with SSL pinning error
3. Verify error handling works correctly
4. Restore correct pins

---

## Alternative: Use SSL Labs

If OpenSSL commands don't work, you can use SSL Labs online tool:

1. Visit: https://www.ssllabs.com/ssltest/
2. Enter domain: `api.flamoral.com`
3. Wait for scan to complete
4. Look for "Public Key Pinning" or "Public Key" section
5. Find the SHA256 hash in base64 format

Repeat for all three domains.

---

## If Domains Are Not Yet Live

If the domains don't have SSL certificates yet, you have two options:

### Option 1: Wait Until Domains Are Live

- Keep the placeholder pins (`AAAA...`, `BBBB...`, etc.)
- Set `SSL_PINNING_OPTIONS.enabled = false` in development
- Generate and update pins before production deployment

### Option 2: Use Let's Encrypt Staging

If you're using Let's Encrypt for certificates, you can generate pins from staging certificates:

```bash
# This won't work for production but can test the flow
openssl s_client -servername api-staging.flamoral.com -connect api-staging.flamoral.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

---

## Quick Verification Script

Save this as `verify-pins.sh` and run it to verify your pins are correct:

```bash
#!/bin/bash

# Configuration - UPDATE THESE WITH YOUR ACTUAL PINS
API_EXPECTED="sha256/YOUR_API_PIN_HERE="
AI_EXPECTED="sha256/YOUR_AI_PIN_HERE="
WS_EXPECTED="sha256/YOUR_WS_PIN_HERE="

# Function to get current pin
get_pin() {
    domain=$1
    pin=$(openssl s_client -servername $domain -connect $domain:443 2>/dev/null | \
        openssl x509 -pubkey -noout | \
        openssl pkey -pubin -outform der | \
        openssl dgst -sha256 -binary | \
        openssl enc -base64)
    echo "sha256/$pin"
}

# Verify api.flamoral.com
echo "Checking api.flamoral.com..."
API_CURRENT=$(get_pin "api.flamoral.com")
if [ "$API_CURRENT" = "$API_EXPECTED" ]; then
    echo "✓ API pin matches!"
else
    echo "✗ API pin mismatch!"
    echo "  Expected: $API_EXPECTED"
    echo "  Current:  $API_CURRENT"
fi

# Verify ai.flamoral.com
echo ""
echo "Checking ai.flamoral.com..."
AI_CURRENT=$(get_pin "ai.flamoral.com")
if [ "$AI_CURRENT" = "$AI_EXPECTED" ]; then
    echo "✓ AI pin matches!"
else
    echo "✗ AI pin mismatch!"
    echo "  Expected: $AI_EXPECTED"
    echo "  Current:  $AI_CURRENT"
fi

# Verify ws.flamoral.com
echo ""
echo "Checking ws.flamoral.com..."
WS_CURRENT=$(get_pin "ws.flamoral.com")
if [ "$WS_CURRENT" = "$WS_EXPECTED" ]; then
    echo "✓ WebSocket pin matches!"
else
    echo "✗ WebSocket pin mismatch!"
    echo "  Expected: $WS_EXPECTED"
    echo "  Current:  $WS_CURRENT"
fi
```

---

## Pin Registry Template

Document your pins for future reference:

| Domain | Primary Pin | Backup Pin | Certificate Expiry | Generated On | Last Updated |
|--------|-------------|------------|-------------------|--------------|--------------|
| api.flamoral.com | sha256/XXX...= | sha256/YYY...= | YYYY-MM-DD | 2025-12-12 | 2025-12-12 |
| ai.flamoral.com | sha256/XXX...= | sha256/YYY...= | YYYY-MM-DD | 2025-12-12 | 2025-12-12 |
| ws.flamoral.com | sha256/XXX...= | sha256/YYY...= | YYYY-MM-DD | 2025-12-12 | 2025-12-12 |

---

## Certificate Rotation Reminder

Set reminders for certificate rotation:

1. **60 days before expiry:** Generate new backup pins
2. **30 days before expiry:** Release app update with new backup pins
3. **At expiry:** Deploy new certificate
4. **After deployment:** Verify pins still work

---

## Troubleshooting

### "unable to connect" error

- Domain is not accessible or doesn't exist
- Check DNS resolution: `nslookup api.flamoral.com`
- Check if domain responds: `ping api.flamoral.com`

### "depth lookup: unable to get local issuer certificate" error

- Add `-showcerts` flag to see full certificate chain
- May indicate self-signed certificate

### Different pins on different machines

- Could be using CDN with different certificates
- Check if all regions use same certificate
- May need to pin to intermediate CA instead

### Empty output

- Connection timed out
- Firewall blocking port 443
- Domain doesn't have SSL configured

---

## Security Reminders

1. **NEVER commit private keys** to version control
2. **Store backup keys offline** in secure hardware (HSM or encrypted storage)
3. **Use environment-based configuration** (dev vs production pins)
4. **Monitor certificate expiration** dates
5. **Always include backup pins** for rotation

---

## Next Steps

1. ✅ Read this guide
2. ⬜ Check if domains are accessible
3. ⬜ Generate primary pins for all domains
4. ⬜ Generate backup pins for all domains
5. ⬜ Update sslPinning.config.ts
6. ⬜ Update network_security_config.xml
7. ⬜ Document pins in pin registry
8. ⬜ Test configuration
9. ⬜ Set certificate expiration reminders

---

## Support

For issues or questions:
- Review: `SSL_PINNING_SETUP.md` for detailed documentation
- Check: OpenSSL documentation at https://www.openssl.org/docs/
- Test: SSL Labs at https://www.ssllabs.com/ssltest/

Last Updated: 2025-12-12
