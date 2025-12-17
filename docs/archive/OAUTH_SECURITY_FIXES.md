# OAuth Security Fixes - Flamoral Dating Platform

## Overview
This document details the critical security fixes applied to the OAuth token verification system for Google OAuth, Apple Sign In, and Facebook Login.

## Security Vulnerabilities Fixed

### 1. Google OAuth - CRITICAL VULNERABILITY FIXED
**Previous Issue**: Used HTTP endpoint (`https://oauth2.googleapis.com/tokeninfo`) for token verification, which is vulnerable to token forgery attacks.

**Security Fix**:
- Implemented proper JWT verification using `google-auth-library`
- Tokens are now verified using Google's public keys with cryptographic signature verification
- Added comprehensive validation checks:
  - Token signature verification
  - Audience validation (ensures token is for our app)
  - Issuer validation (ensures token is from Google)
  - Expiration check
  - Nonce validation for replay attack prevention

**File**: `src/domain/services/social-auth.service.ts` - `verifyGoogleToken()` method

### 2. Apple Sign In - CRITICAL VULNERABILITY FIXED
**Previous Issue**: Token was manually decoded without signature verification, making it vulnerable to token forgery.

**Security Fix**:
- Implemented proper JWT signature verification using `jose` library
- Tokens are verified using Apple's public keys from JWKS endpoint
- Added comprehensive validation checks:
  - JWT signature verification using Apple's public keys
  - Issuer validation (https://appleid.apple.com)
  - Audience validation (ensures token is for our app)
  - Expiration check
  - Authentication time validation
  - Nonce validation for replay attack prevention
  - Private email relay detection

**File**: `src/domain/services/social-auth.service.ts` - `verifyAppleToken()` method

### 3. Facebook Login - CRITICAL VULNERABILITY FIXED
**Previous Issue**: Direct API calls without app secret proof, vulnerable to token hijacking.

**Security Fix**:
- Implemented app secret proof using HMAC-SHA256
- Added token verification via Facebook's debug endpoint
- Added comprehensive validation checks:
  - Token validity verification
  - App ID validation (ensures token is for our app)
  - Token expiration check
  - Scope validation
  - User ID cross-verification
  - App secret proof in all API calls

**File**: `src/domain/services/social-auth.service.ts` - `verifyFacebookToken()` method

### 4. CSRF Protection - NEW FEATURE
**Security Enhancement**: Added state parameter validation across all OAuth flows.

**Implementation**:
- Generated cryptographically secure random state tokens
- State tokens stored server-side with timestamps
- State validation with 5-minute expiration
- One-time use (state deleted after validation)
- Prevents Cross-Site Request Forgery attacks

**Files**:
- `src/domain/services/social-auth.service.ts` - `generateState()`, `validateState()`, `cleanupExpiredStates()` methods
- All login methods now validate state parameter

### 5. Nonce Validation - NEW FEATURE
**Security Enhancement**: Added nonce validation for OpenID Connect flows.

**Implementation**:
- Nonce storage integrated with state parameter
- Nonce validation in token verification
- Prevents replay attacks
- Protects against token substitution

**Files**: `src/domain/services/social-auth.service.ts` - All verification methods

### 6. Enhanced Error Handling
**Security Enhancement**: Comprehensive error handling for all token verification failures.

**Implementation**:
- Specific error messages for different failure types
- Detailed logging for security events
- Prevents information leakage
- Clear error categorization:
  - Expired tokens
  - Invalid signatures
  - Audience mismatches
  - Replay attacks
  - Token tampering

### 7. Token Expiration Checks
**Security Enhancement**: Multiple layers of token expiration validation.

**Implementation**:
- Primary expiration check during JWT verification
- Secondary expiration checks for added security
- Facebook token expiration from debug endpoint
- Auth time validation for Apple tokens

## Dependencies Added

```json
{
  "google-auth-library": "^9.x.x",
  "jwks-rsa": "^3.x.x",
  "jose": "^5.x.x"
}
```

## Environment Variables Required

Ensure the following environment variables are properly configured:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_google_redirect_uri

# Apple Sign In
APPLE_CLIENT_ID=your_apple_client_id

# Facebook Login
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
```

## API Changes

### Request Payload Updates

All OAuth endpoints now support optional state and nonce parameters:

#### Google Login
```json
{
  "code": "optional_auth_code",
  "id_token": "google_id_token",
  "access_token": "optional_access_token",
  "state": "csrf_protection_state",
  "nonce": "replay_protection_nonce"
}
```

#### Apple Sign In
```json
{
  "code": "apple_auth_code",
  "id_token": "apple_id_token",
  "state": "csrf_protection_state",
  "nonce": "replay_protection_nonce",
  "user": {
    "name": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "email": "user@example.com"
  }
}
```

#### Facebook Login
```json
{
  "access_token": "facebook_access_token",
  "state": "csrf_protection_state"
}
```

### New Public Method

```typescript
generateState(nonce?: string): string
```
Generates a secure state token for CSRF protection. Can include an optional nonce for additional replay protection.

## Security Best Practices Implemented

1. **Cryptographic Verification**: All tokens are verified using proper cryptographic signatures
2. **Public Key Infrastructure**: Uses provider's public keys from JWKS endpoints
3. **Defense in Depth**: Multiple layers of validation (signature, audience, issuer, expiration)
4. **CSRF Protection**: State parameter validation prevents cross-site request forgery
5. **Replay Protection**: Nonce validation prevents token replay attacks
6. **Time-based Security**: Token expiration and auth time validation
7. **Secure Secret Management**: App secret proof for Facebook, client secrets for Google
8. **Input Validation**: Comprehensive validation of all input parameters
9. **Error Handling**: Secure error messages that don't leak sensitive information
10. **Logging**: Security events logged for audit trails

## Testing Recommendations

### Manual Testing
1. Test with valid tokens from each provider
2. Test with expired tokens
3. Test with tokens from different apps
4. Test with tampered tokens
5. Test state parameter validation
6. Test nonce validation
7. Test without state/nonce (should still work for backward compatibility)

### Automated Testing
Create integration tests for:
- Token verification with valid tokens
- Token rejection with invalid signatures
- Expired token handling
- CSRF attack prevention
- Replay attack prevention
- Error handling scenarios

## Migration Guide

### For Frontend Developers

1. **State Parameter**:
   - Call backend endpoint to generate state before initiating OAuth flow
   - Include state in OAuth redirect URI
   - Send state back with token to backend

2. **Nonce Parameter** (optional but recommended):
   - Generate nonce on frontend
   - Send to backend with state generation request
   - Include in OAuth flow
   - Send back with token

Example flow:
```javascript
// 1. Get state from backend
const { state } = await fetch('/api/auth/generate-state', {
  method: 'POST',
  body: JSON.stringify({ nonce: generateNonce() })
});

// 2. Initiate OAuth with state
window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?
  client_id=${CLIENT_ID}&
  redirect_uri=${REDIRECT_URI}&
  state=${state}&
  nonce=${nonce}&
  ...`;

// 3. On callback, send token with state
await fetch('/api/auth/google', {
  method: 'POST',
  body: JSON.stringify({
    id_token: idToken,
    state: state,
    nonce: nonce
  })
});
```

## Performance Considerations

1. **JWKS Caching**: The `jose` library automatically caches public keys
2. **State Cleanup**: Automatic cleanup runs every 60 seconds
3. **Network Calls**: Facebook verification makes 2 API calls (debug + user info)
4. **Memory Usage**: State store is in-memory (consider Redis for production scale)

## Production Recommendations

1. **State Storage**: Replace in-memory state store with Redis or database
2. **Rate Limiting**: Add rate limiting on OAuth endpoints
3. **Monitoring**: Monitor failed authentication attempts
4. **Alerts**: Set up alerts for suspicious patterns
5. **Key Rotation**: Implement key rotation procedures
6. **Backup Authentication**: Ensure email/password login works if OAuth fails

## Security Audit Compliance

All critical vulnerabilities identified in the security audit have been addressed:

- [x] Google OAuth proper JWT verification
- [x] Apple Sign In JWT signature verification
- [x] Facebook Login app secret proof
- [x] State parameter validation (CSRF protection)
- [x] Nonce validation (replay protection)
- [x] Proper error handling
- [x] Token expiration checks

## References

- [Google Identity Platform - Verify ID Tokens](https://developers.google.com/identity/sign-in/web/backend-auth)
- [Apple Sign In - Verify Tokens](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api/verifying_a_user)
- [Facebook Login - Access Token Security](https://developers.facebook.com/docs/facebook-login/security)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/rfc6819)
- [OpenID Connect Core Specification](https://openid.net/specs/openid-connect-core-1_0.html)

## Support

For questions or issues regarding these security fixes, contact the security team.

Last Updated: 2025-12-11
Security Level: CRITICAL
Status: DEPLOYED
