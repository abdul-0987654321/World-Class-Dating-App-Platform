# OAuth Setup Guide for Flamoral Dating Platform

This guide explains how to configure OAuth authentication for Google, Facebook, and Apple sign-in.

## Overview

OAuth endpoints have been implemented in both the auth-service and api-gateway:

### Available Endpoints

- `POST /api/auth/oauth/google` - Google OAuth authentication
- `POST /api/auth/oauth/facebook` - Facebook OAuth authentication
- `POST /api/auth/oauth/apple` - Apple OAuth authentication

## Configuration Steps

### 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable Google+ API
4. Go to "Credentials" > "Create Credentials" > "OAuth 2.0 Client ID"
5. Configure OAuth consent screen
6. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs:
     - `https://api.flamoral.com/api/auth/oauth/google/callback`
     - `http://localhost:4000/api/auth/oauth/google/callback` (for local development)

7. Copy the Client ID and Client Secret

### 2. Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select existing app
3. Add "Facebook Login" product
4. Configure OAuth redirect URIs:
   - Valid OAuth Redirect URIs:
     - `https://api.flamoral.com/api/auth/oauth/facebook/callback`
     - `http://localhost:4000/api/auth/oauth/facebook/callback` (for local development)

5. Go to Settings > Basic
6. Copy the App ID and App Secret

### 3. Apple OAuth Setup

1. Go to [Apple Developer Account](https://developer.apple.com/account/)
2. Go to "Certificates, Identifiers & Profiles"
3. Create a new App ID or use existing one
4. Enable "Sign in with Apple" capability
5. Create a new Service ID:
   - Identifier: `com.flamoral.app`
   - Enable "Sign in with Apple"
   - Configure domains and redirect URIs:
     - Domains: `flamoral.com`, `api.flamoral.com`
     - Return URLs: `https://api.flamoral.com/api/auth/oauth/apple/callback`

6. Create a Key for Sign in with Apple:
   - Download the .p8 file
   - Note the Key ID and Team ID

## Kubernetes Secret Configuration

### Update the OAuth secrets in Kubernetes:

```bash
kubectl create secret generic flamoral-oauth-secrets \
  --from-literal=GOOGLE_CLIENT_ID='your-google-client-id.apps.googleusercontent.com' \
  --from-literal=GOOGLE_CLIENT_SECRET='your-google-client-secret' \
  --from-literal=FACEBOOK_APP_ID='your-facebook-app-id' \
  --from-literal=FACEBOOK_APP_SECRET='your-facebook-app-secret' \
  --from-literal=APPLE_CLIENT_ID='com.flamoral.app' \
  --from-literal=APPLE_TEAM_ID='your-apple-team-id' \
  --from-literal=APPLE_KEY_ID='your-apple-key-id' \
  --namespace flamoral \
  --dry-run=client -o yaml | kubectl apply -f -
```

Or use the YAML file:

```bash
# Update the values in infrastructure/kubernetes/oauth-secrets.yaml first
kubectl apply -f infrastructure/kubernetes/oauth-secrets.yaml
```

### Update deployment to use OAuth secrets:

The auth-service deployment needs to be updated to include OAuth environment variables from the secrets.

## Client-Side Integration

### Google OAuth Flow

```javascript
// 1. Client obtains Google access token using Google Sign-In SDK
// 2. Send token to backend

const response = await fetch('/api/auth/oauth/google', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    accessToken: googleAccessToken,
  }),
});

const data = await response.json();
// data contains: { user, accessToken, refreshToken, isNewUser }
```

### Facebook OAuth Flow

```javascript
// 1. Client obtains Facebook access token using Facebook SDK
// 2. Send token to backend

const response = await fetch('/api/auth/oauth/facebook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    accessToken: facebookAccessToken,
  }),
});

const data = await response.json();
```

### Apple OAuth Flow

```javascript
// 1. Client obtains Apple ID token using AppleID SDK
// 2. Send token to backend

const response = await fetch('/api/auth/oauth/apple', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    idToken: appleIdToken,
    user: appleUserInfo, // Optional, only provided on first sign-in
  }),
});

const data = await response.json();
```

## Response Format

All OAuth endpoints return the same response format:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "is_email_verified": true
    },
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "isNewUser": false
  }
}
```

## Security Considerations

1. **Token Validation**: All OAuth tokens are validated against the respective provider's API
2. **Email Verification**: OAuth-authenticated users have their email automatically verified
3. **Account Linking**: If a user signs up with email/password and later uses OAuth with the same email, the accounts are automatically linked
4. **Provider Tracking**: OAuth provider information is stored in Redis for account management
5. **HTTPS Only**: OAuth callbacks must use HTTPS in production

## Testing OAuth Locally

For local development, you can test OAuth flows:

1. Update `.env` in auth-service:
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
APPLE_CLIENT_ID=com.flamoral.app
```

2. Start the services:
```bash
cd backend/services/auth-service
npm run dev

cd backend/services/api-gateway
npm run dev
```

3. Test with curl or Postman:
```bash
curl -X POST http://localhost:4000/api/auth/oauth/google \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "google-access-token-here"}'
```

## Troubleshooting

### Google OAuth Issues

- **Error: Invalid token**
  - Verify the access token is valid and not expired
  - Check that the token was obtained using the correct client ID
  - Ensure Google+ API is enabled

### Facebook OAuth Issues

- **Error: Email permission not granted**
  - Ensure your app requests the `email` permission
  - User must grant email access during OAuth flow

### Apple OAuth Issues

- **Error: Invalid ID token**
  - Verify the ID token signature
  - Check that the token was issued for your Service ID
  - Ensure the token hasn't expired

### General Issues

- Check auth-service logs:
  ```bash
  kubectl logs -n flamoral -l app=auth-service --tail=100
  ```

- Check api-gateway logs:
  ```bash
  kubectl logs -n flamoral -l app=api-gateway --tail=100
  ```

- Verify secrets are properly configured:
  ```bash
  kubectl get secrets -n flamoral
  kubectl describe secret flamoral-oauth-secrets -n flamoral
  ```

## Deployment

After configuration, rebuild and deploy:

```bash
# Build auth-service
cd backend/services/auth-service
npm run build
docker build -t your-registry/flamoral-auth-service:latest .
docker push your-registry/flamoral-auth-service:latest

# Build api-gateway
cd backend/services/api-gateway
npm run build
docker build -t your-registry/flamoral-api-gateway:latest .
docker push your-registry/flamoral-api-gateway:latest

# Deploy to Kubernetes
kubectl rollout restart deployment/auth-service -n flamoral
kubectl rollout restart deployment/api-gateway -n flamoral
```

## Next Steps

1. Configure OAuth providers (Google, Facebook, Apple)
2. Update Kubernetes secrets with real credentials
3. Test OAuth flows in development
4. Update client applications to use OAuth endpoints
5. Deploy to production

For questions or issues, please refer to the main README or contact the development team.
