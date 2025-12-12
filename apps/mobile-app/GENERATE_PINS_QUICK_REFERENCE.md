# Quick Reference: Generate Certificate Pin Hashes

## TL;DR - Generate Pins Now

### For Your Live Server

Replace `api.flamoral.com` with your actual domain and run:

```bash
openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

**Output**: Base64-encoded SHA-256 hash
```
47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=
```

**Use in config**: Add `sha256/` prefix
```typescript
'sha256/47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='
```

---

## Generate Pins for All Flamoral Domains

### 1. Main API (api.flamoral.com)

```bash
openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

Copy the output and add to:
- `src/config/sslPinning.config.ts` (line 27)
- `android/app/src/main/res/xml/network_security_config.xml` (line 24)

### 2. AI Services (ai.flamoral.com)

```bash
openssl s_client -servername ai.flamoral.com -connect ai.flamoral.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

Copy the output and add to:
- `src/config/sslPinning.config.ts` (line 36)
- `android/app/src/main/res/xml/network_security_config.xml` (line 34)

### 3. WebSocket (ws.flamoral.com)

```bash
openssl s_client -servername ws.flamoral.com -connect ws.flamoral.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

Copy the output and add to:
- `src/config/sslPinning.config.ts` (line 45)
- `android/app/src/main/res/xml/network_security_config.xml` (line 44)

---

## Generate Backup Pins

### Option 1: Pin to Intermediate Certificate (Recommended)

```bash
# Get the full certificate chain
openssl s_client -showcerts -servername api.flamoral.com -connect api.flamoral.com:443 </dev/null 2>/dev/null

# Copy the intermediate certificate (second certificate in chain) to a file
# Then:
openssl x509 -in intermediate.crt -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

### Option 2: Generate New Key Pair (For Future Rotation)

```bash
# Generate new private key (KEEP THIS SECURE!)
openssl genrsa -out backup_private_key.pem 2048

# Generate pin from new private key
openssl rsa -in backup_private_key.pem -pubout -outform DER | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

**IMPORTANT**: Store `backup_private_key.pem` in a **secure offline location**. You'll need it when rotating certificates.

---

## All-in-One Script

Save this as `generate-all-pins.sh`:

```bash
#!/bin/bash

echo "Generating SSL pins for Flamoral domains..."
echo "==========================================="
echo ""

echo "1. api.flamoral.com:"
PIN_API=$(openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64)
echo "   sha256/$PIN_API"
echo ""

echo "2. ai.flamoral.com:"
PIN_AI=$(openssl s_client -servername ai.flamoral.com -connect ai.flamoral.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64)
echo "   sha256/$PIN_AI"
echo ""

echo "3. ws.flamoral.com:"
PIN_WS=$(openssl s_client -servername ws.flamoral.com -connect ws.flamoral.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64)
echo "   sha256/$PIN_WS"
echo ""

echo "==========================================="
echo "Copy these pins to your configuration files!"
echo ""
echo "TypeScript config:"
echo "  src/config/sslPinning.config.ts"
echo ""
echo "Android config:"
echo "  android/app/src/main/res/xml/network_security_config.xml"
```

Run it:
```bash
chmod +x generate-all-pins.sh
./generate-all-pins.sh
```

---

## Verify Pins Are Correct

After updating configs, verify your pins match:

```bash
#!/bin/bash

DOMAIN="api.flamoral.com"
EXPECTED_PIN="sha256/YOUR_PIN_HERE="

ACTUAL_PIN=$(openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64)

echo "Expected: $EXPECTED_PIN"
echo "Actual:   sha256/$ACTUAL_PIN"

if [ "sha256/$ACTUAL_PIN" = "$EXPECTED_PIN" ]; then
  echo "✓ Pin matches!"
else
  echo "✗ Pin mismatch! Update your config."
fi
```

---

## Windows Users

If you don't have OpenSSL on Windows:

### Option 1: Install OpenSSL for Windows
Download from: https://slproweb.com/products/Win32OpenSSL.html

### Option 2: Use Windows Subsystem for Linux (WSL)
```powershell
wsl
# Then run the bash commands above
```

### Option 3: Use Git Bash
OpenSSL comes with Git for Windows. Open Git Bash and run the commands.

### Option 4: Use Online Tool
Visit: https://www.ssllabs.com/ssltest/
1. Enter your domain
2. Wait for scan
3. Find "Public Key" section
4. Copy "Pin SHA256" value

---

## macOS/Linux Users

OpenSSL is pre-installed. Just run the commands in Terminal.

---

## Common Issues

### "unable to load certificate"
**Cause**: Server is not responding or domain doesn't exist
**Solution**: Verify domain is correct and accessible

### Empty output
**Cause**: Certificate chain issues or connection blocked
**Solution**:
```bash
# Add -showcerts to see what's happening
openssl s_client -showcerts -servername api.flamoral.com -connect api.flamoral.com:443
```

### "certificate verify failed"
**This is OK!** We just need the public key, not to verify the cert.

---

## After Generating Pins

### 1. Update TypeScript Config

Edit: `src/config/sslPinning.config.ts`

Find and replace:
```typescript
// OLD
pins: [
  'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
]

// NEW
pins: [
  'sha256/47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=', // Primary
  'sha256/8Rw90Ej3Ttt8RRkrg+WYDS9n7IS03bk5bjP/UXPtaY8=', // Backup
]
```

### 2. Update Android Config

Edit: `android/app/src/main/res/xml/network_security_config.xml`

Find and replace:
```xml
<!-- OLD -->
<pin digest="sha256">AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=</pin>
<pin digest="sha256">BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=</pin>

<!-- NEW -->
<pin digest="sha256">47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=</pin>
<pin digest="sha256">8Rw90Ej3Ttt8RRkrg+WYDS9n7IS03bk5bjP/UXPtaY8=</pin>
```

### 3. Test

```bash
npm run android
# or
npm run ios
```

App should connect successfully!

---

## Need Help?

- Full documentation: `SSL_PINNING_SETUP.md`
- Installation guide: `CERTIFICATE_PINNING_DEPENDENCIES.md`
- Implementation summary: `CERTIFICATE_PINNING_IMPLEMENTATION.md`

---

**Pro Tip**: Save your generated pins in a password manager for future reference!

---

Last Updated: 2025-12-11
