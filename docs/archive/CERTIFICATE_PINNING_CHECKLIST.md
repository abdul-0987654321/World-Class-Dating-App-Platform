# Certificate Pinning Implementation Checklist

Use this checklist to ensure proper implementation and deployment of SSL certificate pinning.

---

## Pre-Implementation

- [ ] Review security requirements and compliance needs
- [ ] Identify all backend domains that need pinning
- [ ] Verify access to server certificates or live servers
- [ ] Install OpenSSL for pin generation
- [ ] Backup existing configuration files
- [ ] Review certificate expiration dates
- [ ] Plan certificate rotation schedule

---

## Installation

### Dependencies

- [ ] Install `react-native-ssl-pinning` npm package
  ```bash
  npm install react-native-ssl-pinning
  ```

### iOS Setup

- [ ] Run `pod install` in ios directory
- [ ] Backup original `Info.plist`
- [ ] Replace `Info.plist` with `Info_UPDATED.plist`
- [ ] Verify `NSAllowsArbitraryLoads` is set to `false`
- [ ] Verify `NSExceptionMinimumTLSVersion` is `TLSv1.2`
- [ ] Keep localhost exception for development

### Android Setup

- [ ] Backup original `AndroidManifest.xml`
- [ ] Replace `AndroidManifest.xml` with `AndroidManifest_UPDATED.xml`
- [ ] Verify `usesCleartextTraffic` is set to `false`
- [ ] Verify `networkSecurityConfig` reference is added
- [ ] Confirm `network_security_config.xml` exists in `res/xml/`
- [ ] Verify cleartext traffic is disabled in network config

---

## Pin Generation

### Primary Pins

- [ ] Generate pin for `api.flamoral.com`
  ```bash
  openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 | \
    openssl x509 -pubkey -noout | \
    openssl pkey -pubin -outform der | \
    openssl dgst -sha256 -binary | \
    openssl enc -base64
  ```

- [ ] Generate pin for `ai.flamoral.com`
- [ ] Generate pin for `ws.flamoral.com`
- [ ] Generate pins for any additional domains
- [ ] Document all generated pins securely

### Backup Pins

- [ ] Generate backup pin from intermediate certificate, OR
- [ ] Generate backup pin from new key pair
- [ ] Securely store backup private key offline
- [ ] Document backup pin generation method
- [ ] Add backup pins to all configurations

---

## Configuration Updates

### TypeScript Configuration

File: `src/config/sslPinning.config.ts`

- [ ] Replace `AAAA...` placeholder for `api.flamoral.com` primary pin
- [ ] Replace `BBBB...` placeholder for `api.flamoral.com` backup pin
- [ ] Replace `CCCC...` placeholder for `ai.flamoral.com` primary pin
- [ ] Replace `DDDD...` placeholder for `ai.flamoral.com` backup pin
- [ ] Replace `EEEE...` placeholder for `ws.flamoral.com` primary pin
- [ ] Replace `FFFF...` placeholder for `ws.flamoral.com` backup pin
- [ ] Verify all pins start with `sha256/`
- [ ] Verify all pins end with `=`
- [ ] Verify `enabled` is set correctly for environment
- [ ] Verify `validationMode` is `strict` for production

### Android Configuration

File: `android/app/src/main/res/xml/network_security_config.xml`

- [ ] Replace placeholder pins for `api.flamoral.com`
- [ ] Replace placeholder pins for `ai.flamoral.com`
- [ ] Replace placeholder pins for `ws.flamoral.com`
- [ ] Update pin expiration dates (format: YYYY-MM-DD)
- [ ] Verify `cleartextTrafficPermitted="false"` for production
- [ ] Verify localhost exception exists for development
- [ ] Verify pin format matches: `<pin digest="sha256">BASE64=</pin>`

### iOS Configuration (Optional - if using TrustKit)

File: `ios/TrustKitConfig.plist`

- [ ] Create TrustKit configuration if using native pinning
- [ ] Add pins for all domains
- [ ] Set `TSKEnforcePinning` to `true`
- [ ] Verify pin hashes match other configurations

---

## Code Integration

### HTTP Client Updates

- [ ] Import `SecureHttpClient` in services
- [ ] Update API calls to use secure client, OR
- [ ] Switch to `httpClient.secure.ts` for all requests
- [ ] Verify all network requests go through secure client
- [ ] Test that pinning doesn't break existing functionality

### Error Handling

- [ ] Import `SSLPinningErrorHandler` component
- [ ] Add error state management for SSL errors
- [ ] Display SSL errors to users with appropriate UI
- [ ] Implement retry logic for transient failures
- [ ] Add logging for SSL pinning failures
- [ ] Configure security event reporting

---

## Testing

### Development Testing

- [ ] Test app launches successfully
- [ ] Test API requests work with pinning disabled
- [ ] Enable pinning in development
- [ ] Verify successful connections with correct pins
- [ ] Test with incorrect pin (should fail)
- [ ] Verify error handler displays properly
- [ ] Test retry functionality
- [ ] Check console logs for pin validation messages

### Network Testing

- [ ] Test on WiFi network
- [ ] Test on cellular network
- [ ] Test on different WiFi networks
- [ ] Verify localhost development still works
- [ ] Test with VPN (should fail with strict pinning)
- [ ] Test with corporate proxy (should fail with strict pinning)

### Security Testing

- [ ] Install Charles Proxy certificate on test device
- [ ] Configure device to use Charles Proxy
- [ ] Launch app
- [ ] Verify app FAILS to connect (pinning working)
- [ ] Check logs show SSL pinning error
- [ ] Verify error message is user-friendly
- [ ] Test same with Burp Suite or similar tool

### Platform Testing

#### iOS
- [ ] Test on iOS Simulator
- [ ] Test on physical iOS device
- [ ] Verify App Transport Security enforced
- [ ] Check Xcode console for security logs
- [ ] Test on iOS 13+
- [ ] Test on latest iOS version

#### Android
- [ ] Test on Android Emulator
- [ ] Test on physical Android device
- [ ] Verify Network Security Config enforced
- [ ] Check Logcat for security logs
- [ ] Test on Android 7.0+ (API 24+)
- [ ] Test on latest Android version

### Pin Verification

- [ ] Verify each pin matches current server certificate
  ```bash
  # Run verification script
  ./verify-pins.sh
  ```
- [ ] Document pin verification results
- [ ] Verify backup pins are valid
- [ ] Test that backup pins work if primary fails

---

## Pre-Production

### Staging Environment

- [ ] Deploy to staging environment
- [ ] Test all features end-to-end
- [ ] Verify no SSL errors in logs
- [ ] Test with staging certificates
- [ ] Verify error handling works correctly
- [ ] Load test with pinning enabled
- [ ] Monitor performance impact

### Security Review

- [ ] Review all pin configurations
- [ ] Verify no hardcoded secrets in code
- [ ] Ensure backup pins are properly secured
- [ ] Review error messages (no sensitive info exposed)
- [ ] Verify logging doesn't expose sensitive data
- [ ] Check that pins can't be easily bypassed
- [ ] Conduct penetration testing

### Documentation

- [ ] Update internal security documentation
- [ ] Document certificate rotation procedures
- [ ] Create runbook for SSL issues
- [ ] Document emergency rollback procedures
- [ ] Update deployment documentation
- [ ] Create monitoring dashboards

---

## Production Deployment

### Pre-Deployment

- [ ] Final verification all pins are correct
- [ ] Verify certificate expiration dates (>60 days)
- [ ] Ensure backup pins are in place
- [ ] Test app builds successfully for both platforms
- [ ] Review release notes mentioning security improvements
- [ ] Prepare rollback plan
- [ ] Set up monitoring alerts

### Deployment

- [ ] Deploy to app stores (staged rollout recommended)
- [ ] Start with 5% rollout
- [ ] Monitor error rates for 24 hours
- [ ] Increase to 25% if no issues
- [ ] Monitor for 48 hours
- [ ] Increase to 50%
- [ ] Monitor for 72 hours
- [ ] Complete 100% rollout
- [ ] Monitor continuously

### Post-Deployment

- [ ] Monitor SSL error rates in analytics
- [ ] Check user reviews for connectivity issues
- [ ] Verify no spike in support tickets
- [ ] Monitor app crash rates
- [ ] Check security event logs
- [ ] Validate pinning is working (proxy tests)
- [ ] Document any issues and resolutions

---

## Monitoring Setup

### Metrics to Track

- [ ] SSL pin validation success rate
- [ ] SSL pin validation failure rate by error type
- [ ] Certificate expiration dates
- [ ] App version distribution
- [ ] Network request success rate
- [ ] Time to first successful request

### Alerts to Configure

- [ ] Alert on SSL pin validation failures >1%
- [ ] Alert on certificate expiration <60 days
- [ ] Alert on certificate expiration <30 days
- [ ] Alert on certificate expiration <7 days
- [ ] Alert on spike in SSL errors
- [ ] Alert on low app version adoption (<95%)

### Logging

- [ ] Enable SSL pinning event logging
- [ ] Log to security monitoring service
- [ ] Include: timestamp, error type, domain, app version
- [ ] Exclude: sensitive user data, tokens
- [ ] Set up log aggregation
- [ ] Create security event dashboard

---

## Maintenance

### Weekly

- [ ] Review SSL error logs
- [ ] Check for unusual patterns
- [ ] Verify monitoring is working

### Monthly

- [ ] Review certificate expiration dates
- [ ] Check app version distribution
- [ ] Review backup pin validity
- [ ] Test certificate rotation procedure (dry run)
- [ ] Update documentation if needed

### Quarterly

- [ ] Full security audit
- [ ] Review and update pins if needed
- [ ] Test emergency procedures
- [ ] Update disaster recovery plans
- [ ] Review compliance requirements

### 60 Days Before Certificate Expiration

- [ ] Generate new backup pins
- [ ] Update configurations with new backup pins
- [ ] Release app update
- [ ] Monitor app adoption
- [ ] Prepare for certificate rotation

---

## Certificate Rotation

See detailed procedures in `SSL_PINNING_SETUP.md`, but key checkpoints:

- [ ] T-60 days: Generate backup pins
- [ ] T-60 days: Release app with backup pins
- [ ] T-30 days: Verify >80% app adoption
- [ ] T-7 days: Verify >95% app adoption
- [ ] T-7 days: Prepare new certificate
- [ ] T-0 days: Deploy new certificate
- [ ] T+1 day: Verify no SSL errors
- [ ] T+30 days: Remove old pins (optional)

---

## Emergency Procedures

### Certificate Compromised

- [ ] Generate new certificate immediately
- [ ] Generate pins for new certificate
- [ ] Release emergency app update
- [ ] Request expedited app store review
- [ ] Deploy new certificate after 70% adoption
- [ ] Notify users to update
- [ ] Monitor security logs

### Pinning Causing Outages

- [ ] Verify pins are correct first
- [ ] Check certificate hasn't changed unexpectedly
- [ ] If pins are wrong: Release hotfix ASAP
- [ ] If issue is elsewhere: Consider temporary disable
- [ ] Release fix in `permissive` mode
- [ ] Investigate root cause
- [ ] Re-enable strict mode after fix

### Rollback Required

- [ ] Release version with pinning disabled
- [ ] Request expedited review
- [ ] Push to 100% of users
- [ ] Investigate root cause
- [ ] Fix and test thoroughly
- [ ] Re-enable in next release

---

## Compliance Verification

- [ ] OWASP Mobile Top 10 compliance verified
- [ ] PCI DSS requirements met (if applicable)
- [ ] GDPR security requirements met
- [ ] SOC 2 controls satisfied
- [ ] App Store security requirements met
- [ ] Google Play security requirements met
- [ ] Internal security policies satisfied
- [ ] Audit trail documented

---

## Sign-Off

Before marking complete:

- [ ] Security team approval
- [ ] Development team sign-off
- [ ] QA team verification
- [ ] DevOps team confirmation
- [ ] Product owner acceptance
- [ ] Documentation complete
- [ ] Training completed (if needed)
- [ ] Runbooks created

---

## Final Checklist Summary

**Critical Items** (MUST be complete before production):

1. [ ] All placeholder pins replaced with real pins
2. [ ] Backup pins generated and configured
3. [ ] Android cleartext traffic disabled
4. [ ] iOS arbitrary loads disabled
5. [ ] Tested with MITM proxy (should fail)
6. [ ] Error handling tested and working
7. [ ] Monitoring and alerts configured
8. [ ] Certificate rotation schedule documented
9. [ ] Emergency procedures documented
10. [ ] All tests passed

**Recommended Items** (Should be complete):

1. [ ] Staged rollout plan prepared
2. [ ] Rollback procedures tested
3. [ ] Security audit completed
4. [ ] Penetration testing completed
5. [ ] User communication prepared

---

## Resources

- **Setup Guide**: `SSL_PINNING_SETUP.md`
- **Quick Reference**: `GENERATE_PINS_QUICK_REFERENCE.md`
- **Dependencies**: `CERTIFICATE_PINNING_DEPENDENCIES.md`
- **Implementation Summary**: `CERTIFICATE_PINNING_IMPLEMENTATION.md`

---

**Status**: [ ] Not Started  [ ] In Progress  [ ] Complete

**Completion Date**: ___________

**Completed By**: ___________

**Reviewed By**: ___________

**Approved By**: ___________

---

Last Updated: 2025-12-11
