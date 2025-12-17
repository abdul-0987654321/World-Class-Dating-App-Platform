# OAuth Security - Quick Reference Guide
## Flamoral Dating Platform

### For Frontend Developers

#### Recommended OAuth Flow (with CSRF Protection)

```javascript
// Step 1: Generate state parameter from backend
async function initiateOAuthFlow(provider) {
  // Generate a nonce (optional but recommended)
  const nonce = generateRandomString(32);

  // Get state from backend
  const response = await fetch('/api/auth/oauth/generate-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nonce })
  });

  const { state, expiresIn } = await response.json();

  // Store nonce for later verification (if used)
  sessionStorage.setItem('oauth_nonce', nonce);

  // Initiate OAuth flow with state
  if (provider === 'google') {
    initiateGoogleOAuth(state, nonce);
  } else if (provider === 'apple') {
    initiateAppleSignIn(state, nonce);
  } else if (provider === 'facebook') {
    initiateFacebookLogin(state);
  }
}

// Step 2: Handle OAuth callback
async function handleOAuthCallback(provider, tokenData) {
  const nonce = sessionStorage.getItem('oauth_nonce');

  const response = await fetch(`/api/auth/${provider}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...tokenData,
      nonce
    })
  });

  // Clean up
  sessionStorage.removeItem('oauth_nonce');

  return response.json();
}

function generateRandomString(length) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
```

#### Google OAuth Integration

```javascript
async function initiateGoogleOAuth(state, nonce) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state: state,
    nonce: nonce,
    prompt: 'select_account'
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// Handle Google callback
async function handleGoogleCallback(code, state) {
  const nonce = sessionStorage.getItem('oauth_nonce');

  const response = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      state,
      nonce
    })
  });

  return response.json();
}
```

#### Apple Sign In Integration

```html
<!-- Include Apple Sign In SDK -->
<script src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"></script>

<script>
async function initiateAppleSignIn(state, nonce) {
  await AppleID.auth.init({
    clientId: APPLE_CLIENT_ID,
    scope: 'name email',
    redirectURI: REDIRECT_URI,
    state: state,
    nonce: nonce,
    usePopup: true
  });

  try {
    const data = await AppleID.auth.signIn();
    await handleAppleCallback(data.authorization.code, data.authorization.id_token, state);
  } catch (error) {
    console.error('Apple Sign In error:', error);
  }
}

async function handleAppleCallback(code, idToken, state) {
  const nonce = sessionStorage.getItem('oauth_nonce');

  const response = await fetch('/api/auth/apple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      id_token: idToken,
      state,
      nonce
    })
  });

  return response.json();
}
</script>
```

#### Facebook Login Integration

```html
<!-- Include Facebook SDK -->
<script async defer crossorigin="anonymous"
  src="https://connect.facebook.net/en_US/sdk.js"></script>

<script>
window.fbAsyncInit = function() {
  FB.init({
    appId: FACEBOOK_APP_ID,
    cookie: true,
    xfbml: true,
    version: 'v18.0'
  });
};

async function initiateFacebookLogin(state) {
  FB.login(async function(response) {
    if (response.authResponse) {
      await handleFacebookCallback(response.authResponse.accessToken, state);
    }
  }, {scope: 'email,public_profile'});
}

async function handleFacebookCallback(accessToken, state) {
  const response = await fetch('/api/auth/facebook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: accessToken,
      state
    })
  });

  return response.json();
}
</script>
```

---

### For Backend Developers

#### Generate State (CSRF Protection)

```typescript
// Generate state with optional nonce
const state = socialAuthService.generateState(nonce);
// Returns: 64-character hex string
// Expires: 5 minutes
// Usage: One-time only
```

#### Verify Google Token

```typescript
// Automatic verification in loginWithGoogle
const result = await socialAuthService.loginWithGoogle({
  id_token: 'google_id_token',
  state: 'csrf_state',
  nonce: 'replay_nonce'
});

// Verification includes:
// - JWT signature verification using Google's public keys
// - Audience validation (ensures token is for our app)
// - Issuer validation (ensures token is from Google)
// - Expiration check
// - Nonce validation (if provided)
```

#### Verify Apple Token

```typescript
// Automatic verification in loginWithApple
const result = await socialAuthService.loginWithApple({
  code: 'apple_code',
  id_token: 'apple_id_token',
  state: 'csrf_state',
  nonce: 'replay_nonce'
});

// Verification includes:
// - JWT signature verification using Apple's JWKS
// - Issuer validation (https://appleid.apple.com)
// - Audience validation
// - Expiration check
// - Auth time validation
// - Nonce validation (if provided)
```

#### Verify Facebook Token

```typescript
// Automatic verification in loginWithFacebook
const result = await socialAuthService.loginWithFacebook({
  access_token: 'facebook_token',
  state: 'csrf_state'
});

// Verification includes:
// - App secret proof generation
// - Token validity check via debug endpoint
// - App ID validation
// - Expiration check
// - User ID cross-verification
```

---

### API Endpoints

#### Generate OAuth State
```
POST /api/auth/oauth/generate-state

Request:
{
  "nonce": "optional_nonce_string"
}

Response:
{
  "success": true,
  "data": {
    "state": "64_char_hex_string",
    "expiresIn": 300
  }
}
```

#### Google Login
```
POST /api/auth/google

Request:
{
  "code": "google_auth_code",        // OR
  "id_token": "google_id_token",
  "access_token": "google_access_token",
  "state": "csrf_protection_state",  // Optional
  "nonce": "replay_protection_nonce" // Optional
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "isNewUser": false,
    "needsProfileSetup": false
  }
}
```

#### Apple Sign In
```
POST /api/auth/apple

Request:
{
  "code": "apple_auth_code",
  "id_token": "apple_id_token",
  "state": "csrf_protection_state",  // Optional
  "nonce": "replay_protection_nonce", // Optional
  "user": {                           // Optional, first login only
    "name": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "email": "user@example.com"
  }
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "isNewUser": false,
    "needsProfileSetup": false
  }
}
```

#### Facebook Login
```
POST /api/auth/facebook

Request:
{
  "access_token": "facebook_access_token",
  "state": "csrf_protection_state"  // Optional
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "isNewUser": false,
    "needsProfileSetup": false
  }
}
```

---

### Error Handling

#### Common Error Responses

```javascript
// Expired token
{
  "success": false,
  "message": "Google token has expired"
}

// Invalid signature (token forgery attempt)
{
  "success": false,
  "message": "Invalid Apple token signature - token may be forged"
}

// CSRF attack attempt
{
  "success": false,
  "message": "Invalid state parameter - possible CSRF attack"
}

// Replay attack attempt
{
  "success": false,
  "message": "Invalid nonce - possible replay attack"
}

// Token tampering
{
  "success": false,
  "message": "User ID mismatch - possible token tampering"
}
```

#### Frontend Error Handling

```javascript
try {
  const result = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token, state, nonce })
  });

  const data = await result.json();

  if (!data.success) {
    if (data.message.includes('expired')) {
      // Token expired - prompt user to re-authenticate
      alert('Session expired. Please sign in again.');
      initiateOAuthFlow('google');
    } else if (data.message.includes('CSRF') || data.message.includes('state')) {
      // CSRF attack detected - log and alert security
      console.error('CSRF attack detected');
      alert('Security error. Please try again.');
    } else if (data.message.includes('nonce') || data.message.includes('replay')) {
      // Replay attack detected
      console.error('Replay attack detected');
      alert('Security error. Please try again.');
    } else {
      // General error
      alert('Authentication failed. Please try again.');
    }
  }
} catch (error) {
  console.error('OAuth error:', error);
  alert('Network error. Please check your connection.');
}
```

---

### Security Best Practices

#### DO ✅
- Always use state parameter for CSRF protection
- Use nonce for additional replay protection
- Validate all responses from OAuth providers
- Handle errors gracefully without exposing details
- Use HTTPS for all OAuth redirects
- Store state/nonce in sessionStorage (not localStorage)
- Clear state/nonce after successful authentication
- Implement proper token expiration handling
- Monitor for suspicious authentication patterns

#### DON'T ❌
- Don't skip state parameter validation
- Don't reuse state tokens
- Don't expose OAuth secrets in frontend code
- Don't store tokens in localStorage (use httpOnly cookies)
- Don't ignore token expiration errors
- Don't use predictable state values
- Don't trust token data without verification
- Don't log sensitive token data

---

### Testing OAuth Flows

#### Test Cases

1. **Valid Authentication**
   - Generate state
   - Complete OAuth flow
   - Verify successful login

2. **Expired Token**
   - Use old token
   - Verify rejection
   - Check error message

3. **Invalid State**
   - Use wrong state
   - Verify CSRF protection
   - Check security log

4. **Replay Attack**
   - Reuse same token/nonce
   - Verify rejection
   - Check security log

5. **Token Tampering**
   - Modify token
   - Verify signature validation
   - Check security log

---

### Environment Variables

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback

# Apple Sign In
APPLE_CLIENT_ID=com.yourcompany.yourapp
# Apple uses team ID and key ID for verification

# Facebook Login
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here
```

---

### Monitoring & Debugging

#### Log Messages to Watch For

```
INFO: New user created via Google OAuth: user@example.com
INFO: Social account linked: google for user abc123
WARN: Apple token authentication time is old
ERROR: Invalid state: state not found
ERROR: Invalid state: state has expired
ERROR: Invalid nonce - possible replay attack
ERROR: Invalid Google token signature - token may be forged
ERROR: User ID mismatch - possible token tampering
```

#### Debugging Tips

1. Check backend logs for specific error messages
2. Verify environment variables are set correctly
3. Confirm OAuth redirect URIs match exactly
4. Test state generation and validation
5. Verify token expiration times
6. Check network requests for errors
7. Validate OAuth provider configurations

---

### Support Resources

- **Documentation**: See `OAUTH_SECURITY_FIXES.md` for detailed implementation
- **Summary**: See `SECURITY_AUDIT_REMEDIATION_SUMMARY.md` for overview
- **Google Docs**: https://developers.google.com/identity/sign-in/web/backend-auth
- **Apple Docs**: https://developer.apple.com/documentation/sign_in_with_apple
- **Facebook Docs**: https://developers.facebook.com/docs/facebook-login

---

*Last Updated: December 11, 2025*
*Version: 1.0*
