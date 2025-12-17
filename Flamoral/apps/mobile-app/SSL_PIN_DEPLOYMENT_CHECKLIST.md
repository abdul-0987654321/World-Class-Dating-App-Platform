# SSL Certificate Pinning - Deployment Checklist

## Pre-Deployment Checklist

### Phase 1: Domain & Certificate Verification

- [ ] **Verify all domains are live and accessible**
  ```bash
  curl -I https://api.flamoral.com
  curl -I https://ai.flamoral.com
  curl -I https://ws.flamoral.com
  ```

- [ ] **Verify SSL certificates are properly installed**
  ```bash
  openssl s_client -connect api.flamoral.com:443 -servername api.flamoral.com
  ```

- [ ] **Check certificate validity period**
  - Current date is within certificate validity
  - Certificate not expired or expiring soon
  - Note expiration dates for rotation planning

- [ ] **Verify certificate chain is complete**
  - Leaf certificate present
  - Intermediate CA certificates present
  - Root CA certificate accessible

- [ ] **Test from different networks**
  - WiFi network
  - Cellular network
  - VPN (if applicable)
  - Different geographic locations

---

### Phase 2: Pin Generation

- [ ] **Install/verify OpenSSL**
  ```bash
  openssl version
  ```

- [ ] **Generate primary pins for all domains**

  **api.flamoral.com:**
  ```bash
  openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | \
    openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | \
    openssl dgst -sha256 -binary | openssl enc -base64
  ```

  Primary Pin: `sha256/_________________=`

  **ai.flamoral.com:**
  ```bash
  openssl s_client -servername ai.flamoral.com -connect ai.flamoral.com:443 2>/dev/null | \
    openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | \
    openssl dgst -sha256 -binary | openssl enc -base64
  ```

  Primary Pin: `sha256/_________________=`

  **ws.flamoral.com:**
  ```bash
  openssl s_client -servername ws.flamoral.com -connect ws.flamoral.com:443 2>/dev/null | \
    openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | \
    openssl dgst -sha256 -binary | openssl enc -base64
  ```

  Primary Pin: `sha256/_________________=`

- [ ] **Generate backup pins** (Choose one method)

  **Method A: From Intermediate CA**
  ```bash
  echo | openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 -showcerts 2>/dev/null | \
    sed -n '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/p' | \
    sed -n '2,/-----END CERTIFICATE-----/p' | \
    openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | \
    openssl dgst -sha256 -binary | openssl enc -base64
  ```

  **Method B: From Future Key Pair** (Recommended)
  ```bash
  openssl genrsa -out backup_api_key.key 2048
  openssl rsa -in backup_api_key.key -pubout -outform DER | \
    openssl dgst -sha256 -binary | openssl enc -base64
  ```

  **Backup key storage location:** ___________________

  Backup Pins:
  - api.flamoral.com: `sha256/_________________=`
  - ai.flamoral.com: `sha256/_________________=`
  - ws.flamoral.com: `sha256/_________________=`

- [ ] **Document certificate expiration dates**
  - api.flamoral.com: ___________________
  - ai.flamoral.com: ___________________
  - ws.flamoral.com: ___________________

- [ ] **Run automated generation script (optional)**
  ```bash
  ./scripts/generate-ssl-pins.sh
  # or
  .\scripts\generate-ssl-pins.ps1
  ```

---

### Phase 3: Configuration Updates

- [ ] **Update TypeScript configuration**

  **File:** `apps/mobile-app/src/config/sslPinning.config.ts`

  - [ ] Replace `AAAA...=` with api.flamoral.com primary pin
  - [ ] Replace `BBBB...=` with api.flamoral.com backup pin
  - [ ] Replace `CCCC...=` with ai.flamoral.com primary pin
  - [ ] Replace `DDDD...=` with ai.flamoral.com backup pin
  - [ ] Replace `EEEE...=` with ws.flamoral.com primary pin
  - [ ] Replace `FFFF...=` with ws.flamoral.com backup pin

- [ ] **Update Android XML configuration**

  **File:** `apps/mobile-app/android/app/src/main/res/xml/network_security_config.xml`

  - [ ] Update api.flamoral.com pins
  - [ ] Update ai.flamoral.com pins
  - [ ] Update ws.flamoral.com pins
  - [ ] Update expiration dates (set to 1 year from now)

- [ ] **Update iOS configuration (if applicable)**

  - [ ] Update TrustKit configuration
  - [ ] Update Info.plist if needed
  - [ ] Update native module configuration

- [ ] **Verify no placeholder pins remain**
  ```bash
  # Search for placeholders
  grep -r "AAAA\|BBBB\|CCCC\|DDDD\|EEEE\|FFFF" apps/mobile-app/src/config/
  grep -r "AAAA\|BBBB\|CCCC\|DDDD\|EEEE\|FFFF" apps/mobile-app/android/
  ```

---

### Phase 4: Documentation

- [ ] **Create pin registry entry**

  | Domain | Primary Pin | Backup Pin | Expiry | Generated | Updated By |
  |--------|-------------|------------|--------|-----------|------------|
  | api.flamoral.com | sha256/...= | sha256/...= | YYYY-MM-DD | 2025-12-12 | _______ |
  | ai.flamoral.com | sha256/...= | sha256/...= | YYYY-MM-DD | 2025-12-12 | _______ |
  | ws.flamoral.com | sha256/...= | sha256/...= | YYYY-MM-DD | 2025-12-12 | _______ |

- [ ] **Document backup key storage location**
  - Location: ___________________
  - Access: ___________________
  - Backup: ___________________

- [ ] **Set calendar reminders for certificate rotation**
  - 60 days before expiry: Generate new backup pins
  - 30 days before expiry: Deploy app with new pins
  - At expiry: Deploy new certificates

- [ ] **Update internal security documentation**
  - Document current pins
  - Document rotation procedure
  - Document emergency contacts

---

### Phase 5: Testing - Development

- [ ] **Test with correct pins in development**

  **Steps:**
  1. Build development version with real pins
  2. Set `SSL_PINNING_OPTIONS.enabled = true` temporarily
  3. Run app and attempt to connect to APIs
  4. Verify successful connections
  5. Check logs for "SSL pin validated" messages

- [ ] **Test with incorrect pins (negative test)**

  **Steps:**
  1. Temporarily use a wrong pin in dev build
  2. Attempt to connect to API
  3. Should receive "Certificate pinning failed" error
  4. Verify error handling displays user-friendly message
  5. Restore correct pins

- [ ] **Test on different devices**
  - [ ] Android device
  - [ ] Android emulator
  - [ ] iOS device (if applicable)
  - [ ] iOS simulator (if applicable)

- [ ] **Test on different networks**
  - [ ] WiFi
  - [ ] Cellular data
  - [ ] VPN connection (should fail in strict mode)
  - [ ] Corporate proxy (should fail in strict mode)

---

### Phase 6: Testing - Staging

- [ ] **Deploy to staging environment**
  - [ ] Build staging version
  - [ ] `SSL_PINNING_OPTIONS.enabled = true`
  - [ ] `SSL_PINNING_OPTIONS.validationMode = 'strict'`

- [ ] **Functional testing**
  - [ ] User login/authentication
  - [ ] API data fetching
  - [ ] AI service calls
  - [ ] WebSocket connections
  - [ ] Image uploads
  - [ ] Push notifications

- [ ] **Performance testing**
  - [ ] Measure connection latency
  - [ ] Check for SSL handshake delays
  - [ ] Monitor battery impact
  - [ ] Check memory usage

- [ ] **Error handling testing**
  - [ ] Test with airplane mode
  - [ ] Test with poor connectivity
  - [ ] Test with timeout scenarios
  - [ ] Verify error messages are user-friendly

- [ ] **Verify pins using manual OpenSSL check**
  ```bash
  # For each domain, verify current pin matches configured pin
  ./scripts/verify-pins.sh
  ```

---

### Phase 7: Security Validation

- [ ] **Test MITM protection**

  **Using Charles Proxy or Burp Suite:**
  1. Install proxy certificate on device
  2. Configure device to use proxy
  3. Attempt to intercept HTTPS traffic
  4. App should refuse to connect
  5. Verify pinning error is logged

- [ ] **Verify certificate transparency**
  - Check certificate at https://crt.sh/
  - Verify certificate is logged
  - Check for unauthorized certificates

- [ ] **Review security logs**
  - No pin validation failures (in normal operation)
  - No unexpected SSL errors
  - Proper error reporting for invalid pins

- [ ] **Code review**
  - Review SSL pinning implementation
  - Verify no hardcoded bypass mechanisms
  - Check error handling is secure
  - Verify logging doesn't expose sensitive data

---

### Phase 8: Pre-Production Final Checks

- [ ] **Build production version**
  - [ ] `SSL_PINNING_OPTIONS.enabled = true`
  - [ ] `SSL_PINNING_OPTIONS.validationMode = 'strict'`
  - [ ] All debug logging disabled
  - [ ] No test/development endpoints

- [ ] **Final pin verification**
  ```bash
  # Verify each pin one more time
  for domain in api.flamoral.com ai.flamoral.com ws.flamoral.com; do
    echo "Checking $domain..."
    openssl s_client -servername $domain -connect $domain:443 2>/dev/null | \
      openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | \
      openssl dgst -sha256 -binary | openssl enc -base64
  done
  ```

- [ ] **Verify backup pins are valid**
  - [ ] Backup keys stored securely
  - [ ] Backup pins documented
  - [ ] Access to backup keys verified

- [ ] **Test production build on real devices**
  - [ ] Test on minimum supported Android version
  - [ ] Test on latest Android version
  - [ ] Test on minimum supported iOS version (if applicable)
  - [ ] Test on latest iOS version (if applicable)

- [ ] **Performance validation**
  - [ ] App startup time acceptable
  - [ ] API response times normal
  - [ ] No memory leaks
  - [ ] Battery usage normal

---

### Phase 9: Deployment

- [ ] **Submit to app stores**
  - [ ] Build release version
  - [ ] Test signed APK/IPA
  - [ ] Submit to Google Play
  - [ ] Submit to Apple App Store (if applicable)

- [ ] **Staged rollout plan**
  - [ ] 5% rollout for first 24 hours
  - [ ] Monitor error rates
  - [ ] 25% rollout after validation
  - [ ] 50% rollout after validation
  - [ ] 100% rollout after validation

- [ ] **Monitoring setup**
  - [ ] SSL error monitoring enabled
  - [ ] Pin validation failure alerts configured
  - [ ] Certificate expiration monitoring enabled
  - [ ] Analytics tracking for connection success rates

---

### Phase 10: Post-Deployment

- [ ] **Monitor for 48 hours**
  - [ ] Check error rates
  - [ ] Monitor SSL validation failures
  - [ ] Check user reports
  - [ ] Verify connectivity across regions

- [ ] **Validate metrics**
  - [ ] Connection success rate > 99%
  - [ ] SSL pin validation failures < 0.1%
  - [ ] No increase in crash rate
  - [ ] No increase in API timeout rate

- [ ] **Review user feedback**
  - [ ] Check app store reviews
  - [ ] Monitor support tickets
  - [ ] Check social media mentions
  - [ ] Review in-app feedback

- [ ] **Update documentation**
  - [ ] Update deployment date in docs
  - [ ] Document any issues encountered
  - [ ] Update troubleshooting guide if needed
  - [ ] Share learnings with team

---

## Emergency Rollback Plan

If critical issues are discovered after deployment:

- [ ] **Identify the issue**
  - Pin mismatch?
  - Certificate problem?
  - Configuration error?

- [ ] **Immediate actions**
  - [ ] Halt staged rollout
  - [ ] Notify stakeholders
  - [ ] Assess impact scope

- [ ] **Rollback options**

  **Option 1: App rollback**
  - Rollback to previous app version
  - Fix pins in new version
  - Resubmit to stores

  **Option 2: Server-side fix**
  - If possible, update certificate to match pins
  - Less disruptive than app rollback

  **Option 3: Emergency app update**
  - Fix pins quickly
  - Request expedited review
  - Deploy hotfix ASAP

- [ ] **Communication plan**
  - [ ] Notify users via in-app message
  - [ ] Post on social media
  - [ ] Send push notification if needed
  - [ ] Update app store description

---

## Sign-off

### Development Team
- **Name:** _________________
- **Date:** _________________
- **Signature:** _________________

### Security Team
- **Name:** _________________
- **Date:** _________________
- **Signature:** _________________

### QA Team
- **Name:** _________________
- **Date:** _________________
- **Signature:** _________________

### Product Manager
- **Name:** _________________
- **Date:** _________________
- **Signature:** _________________

---

## Notes

Use this space to document any issues, learnings, or special considerations:

```
_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________
```

---

**Last Updated:** 2025-12-12
**Version:** 1.0.0
**For:** Flamoral Mobile App - SSL Certificate Pinning Deployment
