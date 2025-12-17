# SSL Pin Generation Scripts

This directory contains scripts to automate SSL certificate pin generation for the Flamoral mobile app.

## Quick Start

### Windows Users

```powershell
# Run PowerShell script
.\generate-ssl-pins.ps1
```

### macOS/Linux Users

```bash
# Make script executable
chmod +x generate-ssl-pins.sh

# Run script
./generate-ssl-pins.sh
```

### Git Bash (Windows)

```bash
# Run bash script in Git Bash
bash generate-ssl-pins.sh
```

## What These Scripts Do

1. Check if OpenSSL is installed
2. Test connectivity to all Flamoral domains:
   - api.flamoral.com
   - ai.flamoral.com
   - ws.flamoral.com
3. Extract SSL certificate information
4. Generate SHA-256 pins for public keys (SPKI)
5. Create backup pins from certificate chain
6. Check certificate expiration dates
7. Generate ready-to-use configuration snippets
8. Create a comprehensive output file with all information

## Output

After running the script, you'll get:

- **ssl-pins-output.txt** - Complete report including:
  - All generated pins
  - Certificate expiration dates
  - Certificate issuers
  - Ready-to-paste configuration for TypeScript
  - Ready-to-paste configuration for Android XML
  - Pin registry table for documentation

## Prerequisites

### Windows

**Option 1: Git for Windows (Recommended)**
- Download: https://git-scm.com/download/win
- Includes OpenSSL in Git Bash
- Use PowerShell script or Bash script in Git Bash

**Option 2: OpenSSL for Windows**
- Download: https://slproweb.com/products/Win32OpenSSL.html
- Install "Win64 OpenSSL" (not Light version)
- Add to PATH or use full path in script

### macOS

OpenSSL is pre-installed. If you need to update:

```bash
brew install openssl
```

### Linux

```bash
# Debian/Ubuntu
sudo apt-get install openssl

# RedHat/CentOS/Fedora
sudo yum install openssl

# Arch
sudo pacman -S openssl
```

## Script Details

### generate-ssl-pins.sh

**Platform:** macOS, Linux, Git Bash (Windows)
**Language:** Bash
**Requirements:** OpenSSL, Bash 4.0+

**Features:**
- Color-coded output
- Error handling
- Timeout protection
- Detailed logging
- Automatic intermediate CA pin extraction

### generate-ssl-pins.ps1

**Platform:** Windows PowerShell
**Language:** PowerShell
**Requirements:** OpenSSL, PowerShell 5.0+

**Features:**
- Native Windows support
- Automatic OpenSSL detection
- Color-coded output
- Opens results in Notepad when complete
- Error handling

## Manual Pin Generation

If the scripts don't work or you prefer manual generation:

### Primary Pin (from live server)

```bash
openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

### Backup Pin (from intermediate CA)

```bash
echo | openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 -showcerts 2>/dev/null | \
  sed -n '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/p' | \
  sed -n '2,/-----END CERTIFICATE-----/p' | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

### Backup Pin (from future key pair)

```bash
# 1. Generate new private key (KEEP SECURE!)
openssl genrsa -out backup_private.key 2048

# 2. Generate pin from key
openssl rsa -in backup_private.key -pubout -outform DER | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64

# 3. Store private key in secure offline storage
```

## Troubleshooting

### "OpenSSL not found"

**Windows:**
1. Install Git for Windows: https://git-scm.com/download/win
2. Or install OpenSSL: https://slproweb.com/products/Win32OpenSSL.html
3. Restart terminal after installation

**macOS/Linux:**
```bash
# Verify OpenSSL installation
which openssl
openssl version

# If not found, install using package manager
```

### "Domain not accessible"

Possible causes:
1. Domain doesn't exist yet
2. Domain doesn't have SSL certificate
3. Firewall blocking port 443
4. DNS resolution failure

**Solutions:**
```bash
# Test DNS resolution
nslookup api.flamoral.com

# Test connectivity
curl -I https://api.flamoral.com

# Test SSL specifically
openssl s_client -connect api.flamoral.com:443
```

### "Permission denied" when running script

**macOS/Linux:**
```bash
# Make script executable
chmod +x generate-ssl-pins.sh

# Run script
./generate-ssl-pins.sh
```

**Windows PowerShell:**
```powershell
# If execution policy prevents running
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then run script
.\generate-ssl-pins.ps1
```

### Empty or invalid pin generated

1. Check if domain has valid SSL certificate:
   ```bash
   openssl s_client -connect api.flamoral.com:443 -showcerts
   ```

2. Verify certificate chain is complete

3. Check for corporate proxy or VPN interference

## When to Run These Scripts

### Initial Setup
- Before deploying mobile app to production
- After domains get SSL certificates

### Regular Maintenance
- 60 days before certificate expiration
- When renewing SSL certificates
- After changing certificate authorities

### Emergency Situations
- After certificate compromise
- After emergency certificate replacement
- When certificate rotation fails

## Configuration File Updates

After generating pins, update these files:

### 1. TypeScript Configuration

**File:** `apps/mobile-app/src/config/sslPinning.config.ts`

**Update:** Replace placeholders in `SSL_PIN_CONFIG` array

### 2. Android XML Configuration

**File:** `apps/mobile-app/android/app/src/main/res/xml/network_security_config.xml`

**Update:** Replace `<pin digest="sha256">` values in each `<domain-config>`

### 3. iOS Configuration (if applicable)

If using TrustKit for iOS, update `Info.plist` or native configuration.

## Security Best Practices

### DO

- ✅ Generate backup pins before deploying to production
- ✅ Store backup private keys in secure offline storage (HSM)
- ✅ Document all pins with generation dates
- ✅ Set calendar reminders for certificate rotation
- ✅ Test pin validation in staging environment
- ✅ Monitor certificate expiration dates
- ✅ Use environment-based configuration (dev vs prod)

### DON'T

- ❌ Commit private keys to version control
- ❌ Remove all pins at once during rotation
- ❌ Deploy without backup pins
- ❌ Ignore certificate expiration warnings
- ❌ Skip testing pin updates before production
- ❌ Use same pins for dev and production
- ❌ Deploy new certificate before app update (when rotating)

## Certificate Rotation Workflow

1. **60 days before expiry:**
   - Generate new key pair for next certificate
   - Generate backup pin from new key
   - Add backup pin to configuration
   - Deploy app update with both pins

2. **30 days before expiry:**
   - Verify >95% users have updated app
   - Prepare new certificate with new key

3. **At expiry:**
   - Deploy new certificate
   - Monitor for SSL errors
   - Verify app still connects

4. **30 days after rotation:**
   - Remove old pin (optional)
   - Keep old key for emergency rollback

## Files in This Directory

- **generate-ssl-pins.sh** - Bash script for macOS/Linux/Git Bash
- **generate-ssl-pins.ps1** - PowerShell script for Windows
- **README-SSL-PINS.md** - This file
- **ssl-pins-output.txt** - Generated output (created after running script)

## Additional Resources

- **Main Guide:** `../SSL_PINNING_SETUP.md` - Comprehensive setup guide
- **Quick Guide:** `../GENERATE_SSL_PINS.md` - Step-by-step instructions
- **OWASP:** https://owasp.org/www-community/controls/Certificate_and_Public_Key_Pinning
- **SSL Labs:** https://www.ssllabs.com/ssltest/
- **OpenSSL Docs:** https://www.openssl.org/docs/

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review `SSL_PINNING_SETUP.md` for detailed documentation
3. Test OpenSSL commands manually
4. Contact security team if certificate-related issues

## Version History

- **1.0.0** (2025-12-12) - Initial release
  - Bash script for Unix-like systems
  - PowerShell script for Windows
  - Automated pin generation
  - Configuration snippet generation

## License

Internal use only - Flamoral Mobile App
