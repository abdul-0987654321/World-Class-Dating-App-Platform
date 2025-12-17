# OAuth Testing Checklist - Flamoral Dating Platform

**Date:** 2025-12-12
**Status:** Pre-Launch Required Testing

---

## Overview

This checklist covers manual verification of OAuth flows for Google, Apple, and Facebook authentication.
Complete all items before production launch.

---

## Prerequisites

### 1. OAuth Provider Configuration

| Provider | Console URL | Required |
|----------|-------------|----------|
| Google | https://console.cloud.google.com/apis/credentials | Client ID, Client Secret |
| Apple | https://developer.apple.com/account/resources/identifiers | Service ID, Key ID, Team ID, Private Key |
| Facebook | https://developers.facebook.com/apps | App ID, App Secret |

### 2. Production URLs Configured

- [ ] Google Callback: `https://api.flamoral.app/auth/google/callback`
- [ ] Apple Callback: `https://api.flamoral.app/auth/apple/callback`
- [ ] Facebook Callback: `https://api.flamoral.app/auth/facebook/callback`

### 3. Secrets in Azure Key Vault

```bash
# Verify secrets are set
az keyvault secret show --vault-name flamoral-prod-kv --name GOOGLE-CLIENT-SECRET
az keyvault secret show --vault-name flamoral-prod-kv --name APPLE-PRIVATE-KEY
az keyvault secret show --vault-name flamoral-prod-kv --name FACEBOOK-APP-SECRET
```

---

## Google OAuth Testing

### Web Flow

- [ ] **Step 1:** Navigate to login page
- [ ] **Step 2:** Click "Continue with Google"
- [ ] **Step 3:** Verify redirect to Google consent screen
- [ ] **Step 4:** Select/enter Google account
- [ ] **Step 5:** Grant permissions
- [ ] **Step 6:** Verify redirect back to app
- [ ] **Step 7:** Verify user is logged in
- [ ] **Step 8:** Verify user profile populated from Google (name, email, photo)

### Mobile Flow (React Native)

- [ ] **Step 1:** Launch app on iOS device
- [ ] **Step 2:** Tap "Continue with Google"
- [ ] **Step 3:** Verify native Google Sign-In dialog appears
- [ ] **Step 4:** Complete authentication
- [ ] **Step 5:** Verify return to app with authenticated session
- [ ] **Repeat on Android device**

### Error Cases

- [ ] **Cancel:** User cancels at consent screen - verify graceful handling
- [ ] **Deny:** User denies permissions - verify error message displayed
- [ ] **Invalid:** Test with expired/invalid state token - verify security rejection

---

## Apple Sign-In Testing

### Web Flow

- [ ] **Step 1:** Navigate to login page
- [ ] **Step 2:** Click "Continue with Apple"
- [ ] **Step 3:** Verify redirect to Apple authentication
- [ ] **Step 4:** Enter Apple ID credentials
- [ ] **Step 5:** Complete 2FA if required
- [ ] **Step 6:** Choose to share or hide email
- [ ] **Step 7:** Verify redirect back to app
- [ ] **Step 8:** Verify user is logged in

### Mobile Flow (iOS Required)

- [ ] **Step 1:** Launch app on iOS device
- [ ] **Step 2:** Tap "Continue with Apple"
- [ ] **Step 3:** Verify native Apple Sign-In sheet appears
- [ ] **Step 4:** Use Face ID/Touch ID or password
- [ ] **Step 5:** Verify return to app with authenticated session
- [ ] **Step 6:** Test "Hide My Email" relay address handling

### Special Cases

- [ ] **Private Email:** User chooses "Hide My Email" - verify relay email works
- [ ] **First Name Only:** User provides only first name - verify handling
- [ ] **No Name:** User provides no name - verify fallback handling

---

## Facebook OAuth Testing

### Web Flow

- [ ] **Step 1:** Navigate to login page
- [ ] **Step 2:** Click "Continue with Facebook"
- [ ] **Step 3:** Verify redirect to Facebook login
- [ ] **Step 4:** Enter Facebook credentials or select account
- [ ] **Step 5:** Review and accept permissions
- [ ] **Step 6:** Verify redirect back to app
- [ ] **Step 7:** Verify user is logged in
- [ ] **Step 8:** Verify profile data imported (name, photo)

### Mobile Flow

- [ ] **Step 1:** Launch app on device
- [ ] **Step 2:** Tap "Continue with Facebook"
- [ ] **Step 3:** Verify redirect to Facebook app or web login
- [ ] **Step 4:** Complete authentication
- [ ] **Step 5:** Verify return to app with authenticated session
- [ ] **Test on iOS**
- [ ] **Test on Android**

### Error Cases

- [ ] **Cancel:** User cancels login - verify graceful handling
- [ ] **Expired Token:** Test with expired access token - verify refresh or re-auth

---

## Cross-Provider Testing

### Account Linking

- [ ] **Test 1:** Register with email, then try to link Google - verify behavior
- [ ] **Test 2:** Register with Google, then try to link Facebook - verify behavior
- [ ] **Test 3:** Same email across providers - verify no duplicate accounts

### Session Management

- [ ] **Test 1:** Login with OAuth, logout, login with same OAuth - verify works
- [ ] **Test 2:** Login with OAuth on Web, verify mobile session
- [ ] **Test 3:** Revoke OAuth permissions in provider console - verify app handles gracefully

---

## Security Verification

### CSRF Protection

- [ ] Verify state parameter is used and validated
- [ ] Test replay attack - reuse old state token - should fail
- [ ] Verify callback URL whitelist is enforced

### Token Storage

- [ ] OAuth tokens are NOT stored in localStorage (security fix verified)
- [ ] Tokens are stored in httpOnly cookies
- [ ] Access tokens have appropriate expiry

### Data Privacy

- [ ] Only requested scopes are accessed (email, profile)
- [ ] No sensitive data logged
- [ ] User can disconnect OAuth provider from settings

---

## Browser Compatibility

Test on each browser:

| Browser | Google | Apple | Facebook |
|---------|--------|-------|----------|
| Chrome | [ ] | [ ] | [ ] |
| Firefox | [ ] | [ ] | [ ] |
| Safari | [ ] | [ ] | [ ] |
| Edge | [ ] | [ ] | [ ] |
| Mobile Safari | [ ] | [ ] | [ ] |
| Chrome Mobile | [ ] | [ ] | [ ] |

---

## Test Results

### Summary

| Provider | Web | iOS | Android | Status |
|----------|-----|-----|---------|--------|
| Google | [ ] Pass | [ ] Pass | [ ] Pass | |
| Apple | [ ] Pass | [ ] Pass | N/A | |
| Facebook | [ ] Pass | [ ] Pass | [ ] Pass | |

### Issues Found

| # | Provider | Platform | Description | Severity | Status |
|---|----------|----------|-------------|----------|--------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

---

## Sign-Off

| Role | Name | Date | Approved |
|------|------|------|----------|
| QA Tester | | | [ ] |
| Backend Lead | | | [ ] |
| Product Manager | | | [ ] |

---

## Automation Script

Run automated OAuth endpoint tests:

```bash
# From project root
cd DatingPlatform

# Run OAuth API tests
npm run test:api -- --grep "OAuth"

# Or manually test endpoints
curl -X POST https://api.flamoral.app/api/auth/oauth/google/test
curl -X POST https://api.flamoral.app/api/auth/oauth/apple/test
curl -X POST https://api.flamoral.app/api/auth/oauth/facebook/test
```
