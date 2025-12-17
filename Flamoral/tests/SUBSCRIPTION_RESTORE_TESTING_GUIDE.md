# Subscription Restore Testing Guide - Flamoral Dating Platform

**Date:** 2025-12-12
**Status:** Pre-Launch Required Testing

---

## Overview

This guide covers testing the subscription restore functionality on iOS (App Store) and Android (Google Play).
Restore allows users to recover their premium subscriptions when:
- Reinstalling the app
- Switching to a new device
- Logging in on multiple devices

---

## Prerequisites

### iOS Testing Setup

1. **TestFlight Build:** Ensure latest build is available on TestFlight
2. **Sandbox Account:** Create Apple Sandbox tester account
   - Settings > App Store > Sandbox Account (on test device)
   - Or via App Store Connect > Users and Access > Sandbox Testers
3. **Test Products:** Verify test products configured in App Store Connect
   - `com.flamoral.subscription.basic.monthly`
   - `com.flamoral.subscription.plus.monthly`
   - `com.flamoral.subscription.premium.monthly`

### Android Testing Setup

1. **Internal Testing Track:** Upload latest AAB to internal testing
2. **License Tester:** Add test account as license tester
   - Google Play Console > Setup > License testing
3. **Test Products:** Verify products in Google Play Console
   - `com.flamoral.subscription.basic.monthly`
   - `com.flamoral.subscription.plus.monthly`
   - `com.flamoral.subscription.premium.monthly`

---

## iOS Restore Testing

### Scenario 1: Fresh Install Restore

**Objective:** User reinstalls app and restores existing subscription

1. **Setup:**
   - [ ] Install app on iOS device
   - [ ] Log in with test account
   - [ ] Purchase subscription via sandbox account
   - [ ] Verify premium features unlocked
   - [ ] Note user ID and subscription details

2. **Delete and Reinstall:**
   - [ ] Delete app from device
   - [ ] Reinstall from TestFlight
   - [ ] Log in with SAME account

3. **Restore:**
   - [ ] Navigate to Settings > Subscription
   - [ ] Tap "Restore Purchases"
   - [ ] Verify loading indicator shown
   - [ ] Verify success message displayed
   - [ ] Verify premium tier restored correctly
   - [ ] Verify premium features accessible
   - [ ] Verify subscription end date correct

### Scenario 2: New Device Restore

**Objective:** User signs in on new device and restores subscription

1. **Setup:**
   - [ ] Have active subscription on Device A
   - [ ] Get second iOS device (Device B)
   - [ ] Install app on Device B
   - [ ] Sign in with same Apple ID and app account

2. **Restore:**
   - [ ] Tap "Restore Purchases" on Device B
   - [ ] Verify subscription restored
   - [ ] Verify same tier as Device A
   - [ ] Verify premium features work

### Scenario 3: Different User Same Device

**Objective:** Verify subscriptions don't transfer between different app users

1. **Setup:**
   - [ ] User A has active subscription
   - [ ] Log out User A from app

2. **Test:**
   - [ ] Log in as User B (different app account, same Apple ID)
   - [ ] Tap "Restore Purchases"
   - [ ] Verify User B does NOT get User A's subscription
   - [ ] (Subscriptions are tied to both Apple ID AND app user)

### Scenario 4: Expired Subscription

**Objective:** Verify expired subscriptions are handled correctly

1. **Setup (using Sandbox accelerated time):**
   - [ ] Purchase subscription
   - [ ] Wait for sandbox expiration (monthly = 5 minutes in sandbox)
   - [ ] Do not renew

2. **Test:**
   - [ ] Tap "Restore Purchases"
   - [ ] Verify subscription shows as expired
   - [ ] Verify premium features disabled
   - [ ] Verify option to resubscribe shown

---

## Android Restore Testing

### Scenario 1: Fresh Install Restore

**Objective:** User reinstalls app and restores existing subscription

1. **Setup:**
   - [ ] Install app from internal testing track
   - [ ] Log in with test account
   - [ ] Purchase subscription using license tester account
   - [ ] Verify premium features unlocked

2. **Delete and Reinstall:**
   - [ ] Uninstall app
   - [ ] Reinstall from Play Store (internal track)
   - [ ] Log in with SAME account

3. **Restore:**
   - [ ] Navigate to Settings > Subscription
   - [ ] Tap "Restore Purchases"
   - [ ] Verify loading indicator
   - [ ] Verify success message
   - [ ] Verify premium tier correct
   - [ ] Verify features accessible

### Scenario 2: Google Play Billing Library Integration

**Objective:** Verify native restore flow works

1. **Test:**
   - [ ] Call Google Play Billing queryPurchases
   - [ ] Verify active subscriptions returned
   - [ ] Verify purchase tokens valid
   - [ ] Verify server-side verification works

### Scenario 3: Cross-Device (Same Google Account)

**Objective:** Subscription restores across Android devices

1. **Setup:**
   - [ ] Device A: Purchase subscription
   - [ ] Device B: Same Google account

2. **Test:**
   - [ ] Install app on Device B
   - [ ] Log in with same app account
   - [ ] Tap "Restore Purchases"
   - [ ] Verify subscription restored on Device B

---

## API Endpoint Testing

### REST API Tests

```bash
# Test iOS receipt validation
curl -X POST https://api.flamoral.app/api/iap/validate-receipt \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "receipt": "<base64_receipt_data>",
    "platform": "ios"
  }'

# Expected response
{
  "success": true,
  "subscription": {
    "tier": "premium",
    "expiresAt": "2025-01-12T00:00:00Z",
    "autoRenewing": true
  }
}

# Test Android purchase token validation
curl -X POST https://api.flamoral.app/api/iap/validate-receipt \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "purchaseToken": "<google_play_token>",
    "productId": "com.flamoral.subscription.premium.monthly",
    "platform": "android"
  }'

# Test restore endpoint
curl -X POST https://api.flamoral.app/api/subscriptions/restore \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "receipt": "<base64_receipt>"
  }'
```

---

## Error Handling Tests

### iOS Errors

| Error | Handling | Verified |
|-------|----------|----------|
| No purchases to restore | "No active subscriptions found" message | [ ] |
| Network error during restore | Retry option shown | [ ] |
| Invalid receipt | Generic error, logged server-side | [ ] |
| Receipt verification timeout | Retry or contact support | [ ] |

### Android Errors

| Error | Handling | Verified |
|-------|----------|----------|
| BillingClient disconnected | Auto-reconnect, retry | [ ] |
| Item not owned | "No active subscriptions found" | [ ] |
| Developer error | Log and show generic error | [ ] |
| Service unavailable | Retry later message | [ ] |

---

## Test Results

### iOS Results

| Scenario | Device | OS Version | Result | Notes |
|----------|--------|------------|--------|-------|
| Fresh Install Restore | | iOS 17.x | [ ] Pass | |
| New Device Restore | | iOS 17.x | [ ] Pass | |
| Different User | | iOS 17.x | [ ] Pass | |
| Expired Subscription | | iOS 17.x | [ ] Pass | |

### Android Results

| Scenario | Device | OS Version | Result | Notes |
|----------|--------|------------|--------|-------|
| Fresh Install Restore | | Android 14 | [ ] Pass | |
| Cross-Device | | Android 14 | [ ] Pass | |
| Billing Integration | | Android 14 | [ ] Pass | |

---

## Common Issues & Solutions

### Issue 1: Restore returns no subscriptions (iOS)
**Cause:** Sandbox account not properly configured
**Solution:**
1. Sign out of sandbox account on device
2. Delete app
3. Sign in with sandbox account BEFORE opening app
4. Reinstall and try again

### Issue 2: Receipt validation fails (iOS)
**Cause:** Using production receipt URL for sandbox
**Solution:** Check environment detection - sandbox receipts must use sandbox URL

### Issue 3: Token validation fails (Android)
**Cause:** Service account doesn't have Google Play Developer API access
**Solution:** Verify service account has "View financial data" permission

### Issue 4: Subscription tier mismatch
**Cause:** Product ID mapping incorrect
**Solution:** Verify product ID -> tier mapping in backend config

---

## Sign-Off

| Role | Name | Date | Approved |
|------|------|------|----------|
| iOS Developer | | | [ ] |
| Android Developer | | | [ ] |
| QA Tester | | | [ ] |
| Product Manager | | | [ ] |

---

## Automated Test Commands

```bash
# Run mobile E2E subscription tests
cd DatingPlatform/apps/mobile

# iOS (requires running simulator with sandbox account)
npm run test:e2e:ios -- --grep "subscription restore"

# Android (requires running emulator with license tester)
npm run test:e2e:android -- --grep "subscription restore"

# Backend IAP validation tests
cd DatingPlatform/backend/services/payment-service
npm run test -- --grep "IAP"
```

---

## Post-Testing Cleanup

1. [ ] Cancel all sandbox/test subscriptions
2. [ ] Document any issues found
3. [ ] Update API documentation if needed
4. [ ] Verify production IAP configuration matches tested config
