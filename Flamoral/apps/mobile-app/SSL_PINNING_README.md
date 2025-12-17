# SSL Certificate Pinning Documentation Index

**Last Updated:** 2025-12-12
**Status:** Ready for pin generation (domains pending)
**Project:** Flamoral Mobile App

---

## Quick Navigation

### 🚀 Get Started Quickly

1. **Read First:** [SSL_PINNING_STATUS_REPORT.md](./SSL_PINNING_STATUS_REPORT.md) - Current status and overview
2. **Quick Reference:** [SSL_PIN_QUICK_REFERENCE.md](./SSL_PIN_QUICK_REFERENCE.md) - Commands and quick guide
3. **Generate Pins:** [GENERATE_SSL_PINS.md](./GENERATE_SSL_PINS.md) - Step-by-step generation guide

### 📚 Complete Documentation

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [SSL_PINNING_STATUS_REPORT.md](./SSL_PINNING_STATUS_REPORT.md) | Current status, blockers, and next steps | Start here for overview |
| [SSL_PINNING_SETUP.md](./SSL_PINNING_SETUP.md) | Comprehensive 580-line guide | Deep dive into SSL pinning |
| [GENERATE_SSL_PINS.md](./GENERATE_SSL_PINS.md) | Pin generation instructions | When domains go live |
| [SSL_PIN_QUICK_REFERENCE.md](./SSL_PIN_QUICK_REFERENCE.md) | Quick command reference | Quick lookups during work |
| [SSL_PIN_DEPLOYMENT_CHECKLIST.md](./SSL_PIN_DEPLOYMENT_CHECKLIST.md) | Complete deployment checklist | Before production deployment |
| [scripts/README-SSL-PINS.md](./scripts/README-SSL-PINS.md) | Script documentation | Using automated scripts |

---

## Current Status

### ⚠️ DOMAINS NOT YET ACCESSIBLE

The following domains need SSL certificates before pins can be generated:

- **api.flamoral.com** - Main API endpoint
- **ai.flamoral.com** - AI services endpoint
- **ws.flamoral.com** - WebSocket endpoint

### ✅ What's Ready

- SSL pinning infrastructure implemented
- Configuration files with placeholder pins
- Comprehensive documentation (7 guides)
- Automated generation scripts (Bash + PowerShell)
- Deployment checklist
- Error handling and security features

### 🔲 What's Needed

- Real SSL certificate pins (blocked by domains not being live)
- Backup pins generation
- Production testing
- Final configuration updates

---

## File Structure

```
apps/mobile-app/
├── SSL_PINNING_README.md              ← You are here (index)
├── SSL_PINNING_STATUS_REPORT.md       ← Status overview
├── SSL_PINNING_SETUP.md               ← Comprehensive guide (580 lines)
├── GENERATE_SSL_PINS.md               ← Generation instructions
├── SSL_PIN_QUICK_REFERENCE.md         ← Quick reference card
├── SSL_PIN_DEPLOYMENT_CHECKLIST.md    ← Deployment checklist
│
├── src/config/
│   └── sslPinning.config.ts           ← TypeScript configuration
│
├── android/app/src/main/res/xml/
│   └── network_security_config.xml    ← Android XML configuration
│
└── scripts/
    ├── README-SSL-PINS.md             ← Script documentation
    ├── generate-ssl-pins.sh           ← Bash script (Unix/macOS/Git Bash)
    ├── generate-ssl-pins.ps1          ← PowerShell script (Windows)
    └── ssl-pins-output.txt            ← Generated output (after running script)
```

---

## How to Use This Documentation

### Scenario 1: Just Getting Started

1. Read [SSL_PINNING_STATUS_REPORT.md](./SSL_PINNING_STATUS_REPORT.md)
2. Understand current blockers
3. Wait for domains to go live
4. Proceed to Scenario 2

### Scenario 2: Domains Are Now Live

1. Check [GENERATE_SSL_PINS.md](./GENERATE_SSL_PINS.md)
2. Run automated script:
   ```bash
   # Windows
   .\scripts\generate-ssl-pins.ps1

   # macOS/Linux/Git Bash
   ./scripts/generate-ssl-pins.sh
   ```
3. Review generated `scripts/ssl-pins-output.txt`
4. Update configuration files with real pins
5. Proceed to Scenario 3

### Scenario 3: Ready to Deploy

1. Follow [SSL_PIN_DEPLOYMENT_CHECKLIST.md](./SSL_PIN_DEPLOYMENT_CHECKLIST.md)
2. Complete all testing phases
3. Deploy to staging
4. Deploy to production with staged rollout

### Scenario 4: Certificate Rotation

1. Review certificate rotation section in [SSL_PINNING_SETUP.md](./SSL_PINNING_SETUP.md)
2. Generate backup pins 60 days before expiry
3. Deploy app update with new pins
4. Deploy new certificate after app adoption

### Scenario 5: Quick Command Lookup

1. Open [SSL_PIN_QUICK_REFERENCE.md](./SSL_PIN_QUICK_REFERENCE.md)
2. Find the command you need
3. Execute and verify

### Scenario 6: Troubleshooting

1. Check "Troubleshooting" section in [SSL_PINNING_SETUP.md](./SSL_PINNING_SETUP.md)
2. Review [scripts/README-SSL-PINS.md](./scripts/README-SSL-PINS.md) for script issues
3. Verify pins manually using OpenSSL commands

---

## Quick Commands

### Check if Domains Are Ready

```bash
# Test all three domains
curl -I https://api.flamoral.com
curl -I https://ai.flamoral.com
curl -I https://ws.flamoral.com
```

### Generate Pins (Automated)

```bash
# Windows PowerShell
cd apps/mobile-app/scripts
.\generate-ssl-pins.ps1

# macOS/Linux/Git Bash
cd apps/mobile-app/scripts
chmod +x generate-ssl-pins.sh
./generate-ssl-pins.sh
```

### Generate Pin Manually

```bash
openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

### Verify Pin Matches

```bash
# Get current pin from server
CURRENT=$(openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | openssl enc -base64)

# Compare
echo "Current: sha256/$CURRENT"
echo "Expected: sha256/YOUR_PIN_HERE"
```

---

## Configuration Files to Update

Once pins are generated, update these files:

### 1. TypeScript Config

**File:** `apps/mobile-app/src/config/sslPinning.config.ts`

**Action:** Replace placeholders (AAAA..., BBBB..., etc.) with real pins

### 2. Android XML

**File:** `apps/mobile-app/android/app/src/main/res/xml/network_security_config.xml`

**Action:** Replace `<pin digest="sha256">` values with real pins

---

## Placeholder Pin Mapping

| Placeholder | Domain | Type | Status |
|-------------|--------|------|--------|
| `AAAA...=` | api.flamoral.com | Primary | ⚠️ Needs replacement |
| `BBBB...=` | api.flamoral.com | Backup | ⚠️ Needs replacement |
| `CCCC...=` | ai.flamoral.com | Primary | ⚠️ Needs replacement |
| `DDDD...=` | ai.flamoral.com | Backup | ⚠️ Needs replacement |
| `EEEE...=` | ws.flamoral.com | Primary | ⚠️ Needs replacement |
| `FFFF...=` | ws.flamoral.com | Backup | ⚠️ Needs replacement |

---

## Key Concepts

### What is SSL Pinning?

SSL certificate pinning validates that the server's certificate matches a known, trusted certificate. Instead of trusting any certificate signed by a Certificate Authority, the app only trusts specific certificates.

### Why Public Key Pinning (SPKI)?

We pin the **public key** (SPKI - Subject Public Key Info) instead of the full certificate because:

- Allows certificate renewal without app updates
- Only need to change app when rotating the key pair
- More flexible for certificate management

### What are Backup Pins?

Backup pins allow certificate rotation without breaking older app versions:

- Always include 2+ pins per domain
- Primary pin = current certificate
- Backup pin = future certificate or intermediate CA
- Deploy app with backup pin before rotating certificate

---

## Timeline

### Current Phase: Waiting for Domains

**Estimated Time:** Unknown (waiting for SSL certificate installation)

### Next Phase: Pin Generation

**Estimated Time:** 2-4 hours
- Run automated scripts
- Verify pins
- Update configuration files

### Next Phase: Testing

**Estimated Time:** 2-3 days
- Development testing
- Staging deployment
- Security validation

### Next Phase: Production Deployment

**Estimated Time:** 3-5 days
- Build production version
- Staged rollout (5% → 25% → 50% → 100%)
- Monitoring and validation

**Total Time to Production:** ~1 week after domains are live

---

## Security Reminders

### ✅ DO

- Generate backup pins for certificate rotation
- Store backup private keys in secure offline storage (HSM)
- Test thoroughly in staging before production
- Monitor certificate expiration dates
- Use environment-based configuration (dev vs prod)
- Document all pins with generation dates

### ❌ DON'T

- Commit private keys to version control
- Remove all pins at once during rotation
- Deploy new certificate before app update (when rotating)
- Skip backup pins
- Ignore certificate expiration warnings
- Use same pins for development and production

---

## Support Resources

### Documentation

All documentation is in `apps/mobile-app/`:
- Status reports and guides (root directory)
- Script documentation (`scripts/` directory)

### Scripts

Automated pin generation:
- `scripts/generate-ssl-pins.sh` (Bash)
- `scripts/generate-ssl-pins.ps1` (PowerShell)

### External Resources

- **OWASP:** https://owasp.org/www-community/controls/Certificate_and_Public_Key_Pinning
- **SSL Labs:** https://www.ssllabs.com/ssltest/
- **OpenSSL:** https://www.openssl.org/docs/
- **Certificate Transparency:** https://crt.sh/

---

## Next Steps

### Immediate (When Domains Go Live)

1. ✅ Verify domains are accessible with SSL certificates
2. ✅ Run automated pin generation script
3. ✅ Review generated pins in `ssl-pins-output.txt`
4. ✅ Update `sslPinning.config.ts` with real pins
5. ✅ Update `network_security_config.xml` with real pins
6. ✅ Generate backup pins
7. ✅ Test in development environment

### Short-term (Before Production)

1. ✅ Complete deployment checklist
2. ✅ Test in staging environment
3. ✅ Security validation (MITM testing)
4. ✅ Performance validation
5. ✅ Document certificate expiration dates
6. ✅ Set calendar reminders for rotation

### Long-term (After Deployment)

1. ✅ Monitor SSL error rates
2. ✅ Track certificate expiration
3. ✅ Plan certificate rotation (60 days before expiry)
4. ✅ Regular security audits
5. ✅ Update documentation as needed

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-12 | Initial SSL pinning infrastructure and documentation |

---

## Checklist Before Production

Quick checklist to ensure you're ready:

- [ ] All domains have valid SSL certificates
- [ ] Real pins generated (not placeholders)
- [ ] Backup pins generated and keys stored securely
- [ ] `sslPinning.config.ts` updated with real pins
- [ ] `network_security_config.xml` updated with real pins
- [ ] SSL pinning enabled in production build
- [ ] Tested in staging environment
- [ ] MITM protection verified
- [ ] Certificate expiration dates documented
- [ ] Deployment checklist completed
- [ ] Monitoring and alerting configured

---

## Quick Links

- **Configuration:** [src/config/sslPinning.config.ts](./src/config/sslPinning.config.ts)
- **Android XML:** [android/app/src/main/res/xml/network_security_config.xml](./android/app/src/main/res/xml/network_security_config.xml)
- **Scripts:** [scripts/](./scripts/)
- **Status:** [SSL_PINNING_STATUS_REPORT.md](./SSL_PINNING_STATUS_REPORT.md)

---

**For questions or issues, review the comprehensive documentation or contact the security team.**

**Remember:** SSL certificate pinning is a critical security feature. Take time to understand it fully before deploying to production.
