# SSL Certificate Pinning - Quick Reference Card

## Current Status (2025-12-12)

### Domains Requiring SSL Pins
- api.flamoral.com
- ai.flamoral.com
- ws.flamoral.com

### Current Pin Status
⚠️ **PLACEHOLDER PINS IN USE** - Real pins needed before production deployment

---

## Quick Commands

### Generate Primary Pin
```bash
openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

### Verify Pin Matches Server
```bash
# Get current pin
CURRENT=$(openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | openssl enc -base64)

# Compare with expected
echo "Current: sha256/$CURRENT"
echo "Expected: sha256/YOUR_PIN_HERE"
```

### Check Certificate Expiry
```bash
openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | \
  openssl x509 -noout -dates
```

---

## Automated Scripts

### Windows (PowerShell)
```powershell
cd apps/mobile-app/scripts
.\generate-ssl-pins.ps1
```

### macOS/Linux/Git Bash
```bash
cd apps/mobile-app/scripts
./generate-ssl-pins.sh
```

**Output:** `ssl-pins-output.txt` with all pins and configuration

---

## Files to Update

### 1. TypeScript Config
**File:** `apps/mobile-app/src/config/sslPinning.config.ts`

**Find:** `SSL_PIN_CONFIG` array

**Replace:**
```typescript
{
  hostname: 'api.flamoral.com',
  pins: [
    'sha256/YOUR_PRIMARY_PIN=',
    'sha256/YOUR_BACKUP_PIN=',
  ],
  includeSubdomains: false,
}
```

### 2. Android XML
**File:** `apps/mobile-app/android/app/src/main/res/xml/network_security_config.xml`

**Find:** `<domain-config>` for each domain

**Replace:**
```xml
<pin digest="sha256">YOUR_PRIMARY_PIN=</pin>
<pin digest="sha256">YOUR_BACKUP_PIN=</pin>
```

---

## Placeholder Mapping

| Placeholder | Domain | Type |
|-------------|--------|------|
| AAAA...= | api.flamoral.com | Primary |
| BBBB...= | api.flamoral.com | Backup |
| CCCC...= | ai.flamoral.com | Primary |
| DDDD...= | ai.flamoral.com | Backup |
| EEEE...= | ws.flamoral.com | Primary |
| FFFF...= | ws.flamoral.com | Backup |

---

## Before Production Checklist

- [ ] All domains have SSL certificates installed
- [ ] Primary pins generated for all 3 domains
- [ ] Backup pins generated for all 3 domains
- [ ] `sslPinning.config.ts` updated with real pins
- [ ] `network_security_config.xml` updated with real pins
- [ ] Pins documented in pin registry
- [ ] Certificate expiration dates noted
- [ ] Calendar reminders set for rotation (60 days before)
- [ ] Tested in staging environment
- [ ] Verified pin matches with `openssl` command
- [ ] `SSL_PINNING_OPTIONS.enabled` set to `true` for production

---

## Certificate Rotation Timeline

| Time | Action |
|------|--------|
| T-60 days | Generate new backup pins |
| T-30 days | Deploy app with both old + new pins |
| T-0 days | Deploy new certificate |
| T+30 days | Remove old pins (optional) |

---

## Emergency Contacts

**Certificate Issues:** security@flamoral.com
**Internal Slack:** #security-team
**Documentation:** See `SSL_PINNING_SETUP.md`

---

## Common Errors

### "Certificate Mismatch"
- Pin doesn't match certificate
- Run pin generation again
- Deploy hotfix with correct pin

### "Domain Not Accessible"
- Domain doesn't exist
- No SSL certificate installed
- Firewall blocking port 443

### "Empty Pin Generated"
- Connection timeout
- Invalid certificate
- OpenSSL error

**Solution:** Run manual command to debug

---

## Pin Format

**Correct Format:**
```
sha256/AbCd1234567890EFGHIJKLMNOPQRSTUV1234567890w=
```

**Length:** Exactly 44 characters after `sha256/`
**Encoding:** Base64
**Algorithm:** SHA-256 of SPKI (Subject Public Key Info)

---

## Testing Pin Validation

### Test 1: Valid Pins
1. Configure with correct pins
2. Build app
3. Should connect successfully
4. Check logs for "SSL pin validated"

### Test 2: Invalid Pins
1. Use wrong pin in dev build
2. Should fail to connect
3. Check error: "Certificate pinning failed"
4. Restore correct pins

### Test 3: Proxy/MITM
1. Configure device to use proxy
2. App should refuse connection
3. Indicates pinning is working

---

## Security Reminders

✅ **DO:**
- Always include backup pins
- Store backup keys offline
- Test before production
- Monitor expiration dates

❌ **DON'T:**
- Commit private keys to git
- Remove all pins at once
- Skip backup pins
- Ignore expiration warnings

---

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| OpenSSL not found | Install Git for Windows or OpenSSL |
| Domain unreachable | Check DNS, SSL cert, firewall |
| Script fails | Run commands manually |
| Pin mismatch in app | Regenerate and redeploy |
| Certificate expired | Follow rotation procedure |

---

## Key Dates

**Setup Date:** 2025-12-12
**Next Review:** When domains go live
**Production Deploy:** After real pins generated

---

## Version

**Quick Reference:** v1.0.0
**Last Updated:** 2025-12-12
**For:** Flamoral Mobile App SSL Pinning

---

**Print this page and keep it handy during SSL pin setup and rotation!**
