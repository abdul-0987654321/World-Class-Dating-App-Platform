# Social Login Implementation Guide - Flamoral Dating Platform

## Overview

This document provides a comprehensive guide to the social login implementation for the Flamoral Dating Platform, supporting Google OAuth 2.0, Apple Sign In, and Facebook Login across web and mobile platforms.

## Features Implemented

### 1. Backend Services

#### Social Authentication Service
- **Location**: `backend/services/user-service/src/domain/services/social-auth.service.ts`
- **Features**:
  - Google OAuth 2.0 integration (web and mobile)
  - Apple Sign In integration (iOS required)
  - Facebook Login integration
  - Account linking and unlinking
  - Profile data import from social providers
  - Token refresh and session management
  - Automatic user creation for new social logins
  - Email-based account merging

#### Database Schema
- **Migration**: `backend/services/user-service/src/infrastructure/database/migrations/20231215000000_create_social_accounts.ts`
- **Table**: `social_accounts`
- **Fields**:
  - `id` (UUID, primary key)
  - `user_id` (UUID, foreign key to users table)
  - `provider` (enum: google, apple, facebook)
  - `provider_user_id` (string, unique per provider)
  - `provider_email` (string, optional)
  - `provider_name` (string, optional)
  - `provider_picture` (text, optional)
  - `access_token` (text, encrypted)
  - `refresh_token` (text, encrypted)
  - `token_expires_at` (timestamp)
  - `profile_data` (jsonb)
  - `is_primary` (boolean)
  - `created_at`, `updated_at` (timestamps)

### 2. API Endpoints

All endpoints are prefixed with `/api/auth/`

#### Public Endpoints (No Authentication Required)

1. **Google Login**
   - `POST /google`
   - Body: `{ code?, id_token?, access_token? }`
   - Returns: User data, tokens, `isNewUser`, `needsProfileSetup` flags

2. **Apple Sign In**
   - `POST /apple`
   - Body: `{ code, id_token, user? }`
   - Returns: User data, tokens, `isNewUser`, `needsProfileSetup` flags

3. **Facebook Login**
   - `POST /facebook`
   - Body: `{ access_token }`
   - Returns: User data, tokens, `isNewUser`, `needsProfileSetup` flags

#### Protected Endpoints (Authentication Required)

4. **Link Social Account**
   - `POST /social/link`
   - Headers: `Authorization: Bearer <token>`
   - Body: `{ provider, token }`
   - Returns: Success message

5. **Unlink Social Account**
   - `POST /social/unlink`
   - Headers: `Authorization: Bearer <token>`
   - Body: `{ provider }`
   - Returns: Success message

6. **Get Linked Accounts**
   - `GET /social/linked`
   - Headers: `Authorization: Bearer <token>`
   - Returns: Array of linked accounts

7. **Refresh Social Token**
   - `POST /social/refresh`
   - Headers: `Authorization: Bearer <token>`
   - Body: `{ provider }`
   - Returns: Success message

### 3. Mobile App (React Native)

#### Components
- **Location**: `apps/mobile-app/src/components/auth/SocialLoginButtons.tsx`
- **Features**:
  - Google Sign In button with @react-native-google-signin/google-signin
  - Apple Sign In button (iOS only) with @invertase/react-native-apple-authentication
  - Facebook Login button with react-native-fbsdk-next
  - Loading states and error handling
  - Responsive circular button design

#### Hooks
- **Location**: `apps/mobile-app/src/hooks/useSocialAuth.ts`
- **Methods**:
  - `loginWithGoogle(payload)`
  - `loginWithApple(payload)`
  - `loginWithFacebook(payload)`
  - `linkSocialAccount(provider, token)`
  - `unlinkSocialAccount(provider)`
  - `getLinkedAccounts()`

#### Integration
- Updated `LoginScreen.tsx` to include social login buttons
- Handles new user flow with profile setup navigation
- Automatic token storage and user data persistence

### 4. Web App (React)

#### Components
- **Location**: `apps/web-app/src/components/auth/SocialLoginButtons.tsx`
- **Features**:
  - Google OAuth with @react-oauth/google
  - Apple Sign In with react-apple-signin-auth
  - Facebook Login with Facebook SDK
  - Beautiful circular button design matching Flamoral branding
  - Loading spinners and error states

#### Settings Component
- **Location**: `apps/web-app/src/components/settings/LinkedAccountsSettings.tsx`
- **Features**:
  - Display all linked social accounts
  - Unlink accounts with confirmation
  - Primary account indicator
  - Last linked date display
  - Protection against unlinking the only login method

#### Hooks
- **Location**: `apps/web-app/src/hooks/useSocialAuth.ts`
- **Features**: Same methods as mobile app
- **Storage**: Uses localStorage for web tokens

#### Integration
- Updated `LoginPage.tsx` to include social login buttons
- Navigation to profile setup for new users
- Error handling with toast notifications

## Configuration

### Environment Variables

Add these to your `.env` files:

#### Backend (user-service)
```env
# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Apple Sign In
APPLE_CLIENT_ID=com.flamoral.dating
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8
APPLE_REDIRECT_URI=http://localhost:3000/auth/apple/callback

# Facebook Login
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URI=http://localhost:3000/auth/facebook/callback
```

#### Web App
```env
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
REACT_APP_APPLE_CLIENT_ID=com.flamoral.dating
REACT_APP_APPLE_REDIRECT_URI=http://localhost:3000/auth/apple/callback
REACT_APP_FACEBOOK_APP_ID=your-facebook-app-id
```

#### Mobile App
```env
GOOGLE_WEB_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
FACEBOOK_APP_ID=your-facebook-app-id
```

## Setup Instructions

### 1. Google OAuth 2.0 Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Configure OAuth consent screen
6. Create credentials for:
   - Web application (for web app)
   - iOS (for mobile app)
   - Android (for mobile app)
7. Add authorized redirect URIs
8. Copy Client IDs and Secret

### 2. Apple Sign In Setup

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Certificates, Identifiers & Profiles → Identifiers
3. Create a new App ID
4. Enable "Sign In with Apple" capability
5. Create a Service ID for web authentication
6. Configure domains and redirect URLs
7. Create a private key for Sign in with Apple
8. Download the .p8 key file
9. Note your Team ID, Key ID, and Client ID

**For iOS:**
- Add Sign In with Apple capability to your Xcode project
- Update `Info.plist` with your Client ID

### 3. Facebook Login Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add "Facebook Login" product
4. Configure OAuth Redirect URIs
5. Add platform (iOS/Android/Web)
6. Copy App ID and App Secret

**For iOS:**
- Add Facebook SDK to your project
- Update `Info.plist` with Facebook App ID

**For Android:**
- Add Facebook SDK to gradle
- Update `strings.xml` with Facebook App ID

### 4. Database Migration

Run the migration to create the `social_accounts` table:

```bash
cd backend/services/user-service
npm run migrate
```

### 5. Install Dependencies

#### Backend
```bash
cd backend/services/user-service
npm install axios
```

#### Web App
```bash
cd apps/web-app
npm install @react-oauth/google react-apple-signin-auth
```

#### Mobile App
```bash
cd apps/mobile-app
npm install @react-native-google-signin/google-signin
npm install @invertase/react-native-apple-authentication
npm install react-native-fbsdk-next
npx pod-install # For iOS
```

## Security Considerations

### Token Management
- Access tokens are stored securely (encrypted in database)
- Refresh tokens are used for long-term access
- Tokens expire and are automatically refreshed
- Users can revoke access by unlinking accounts

### Privacy
- Profile data import is optional
- Users can control which data is synced
- Social account emails are verified by providers
- Users must consent to data sharing

### Account Security
- Users must maintain at least one login method
- Cannot unlink the only social account without a password
- Account linking requires authentication
- Duplicate account prevention based on email

## User Flows

### New User Social Login
1. User clicks social login button
2. Redirected to provider's OAuth page
3. User authorizes app
4. Backend receives token/code
5. Backend verifies with provider
6. New user created with basic info
7. User redirected to profile setup
8. User completes profile
9. Access granted to app

### Existing User Social Login
1. User clicks social login button
2. Redirected to provider's OAuth page
3. User authorizes app
4. Backend receives token/code
5. Backend verifies with provider
6. Social account linked to existing user (by email)
7. User logged in immediately
8. Access granted to app

### Account Linking
1. User navigates to settings
2. Clicks "Link Account" for a provider
3. OAuth flow initiated
4. Backend verifies provider doesn't conflict
5. Social account linked to user
6. Success message displayed

### Account Unlinking
1. User navigates to settings
2. Clicks "Unlink" next to linked account
3. Backend verifies user has alternative login
4. Social account unlinked
5. Success message displayed

## Testing

### Test Accounts

Create test accounts for each provider:
- Google: Use a Google account for testing
- Apple: Use TestFlight or development build
- Facebook: Add test users in Facebook Developer portal

### Test Scenarios

1. **New user registration via social login**
   - Verify user creation
   - Check profile data import
   - Confirm email verification status

2. **Existing user login via social login**
   - Verify account linking by email
   - Check token storage
   - Confirm login success

3. **Account linking**
   - Link multiple providers to one account
   - Verify cannot link same provider twice
   - Check primary account handling

4. **Account unlinking**
   - Unlink non-primary accounts
   - Verify protection against unlinking only method
   - Check error handling

5. **Token refresh**
   - Test expired token handling
   - Verify automatic refresh
   - Check refresh failure scenarios

## Troubleshooting

### Common Issues

1. **Google Sign In: "Invalid Client ID"**
   - Verify Client ID matches Google Console
   - Check platform-specific IDs (web vs iOS vs Android)
   - Ensure OAuth consent screen is configured

2. **Apple Sign In: "Invalid Client"**
   - Verify Service ID configuration
   - Check redirect URI matches exactly
   - Ensure private key is valid and accessible

3. **Facebook Login: "App Not Setup"**
   - Verify App ID is correct
   - Check platform configuration in Facebook Dashboard
   - Ensure OAuth redirect URIs are whitelisted

4. **Token Verification Failed**
   - Check network connectivity
   - Verify provider API is accessible
   - Confirm tokens haven't expired

5. **Account Linking Failed: "Already Linked"**
   - Social account is already linked to another user
   - User should unlink from other account first

## API Response Examples

### Successful Google Login (New User)
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@gmail.com",
      "first_name": "John",
      "last_name": "Doe",
      "is_email_verified": true
    },
    "accessToken": "jwt-token-here",
    "refreshToken": "refresh-token-here",
    "isNewUser": true,
    "needsProfileSetup": true
  }
}
```

### Successful Account Linking
```json
{
  "success": true,
  "message": "google account linked successfully"
}
```

### Error Response
```json
{
  "success": false,
  "message": "This google account is already linked to another user"
}
```

## Performance Optimization

- Token verification is cached to reduce API calls
- Social account lookups use indexed queries
- Profile data is lazily loaded
- Refresh tokens minimize re-authentication

## Future Enhancements

1. **Additional Providers**
   - Twitter/X authentication
   - LinkedIn authentication
   - Microsoft account

2. **Enhanced Features**
   - Two-factor authentication with social accounts
   - Social graph import (friends who also use the app)
   - Cross-platform account sync
   - Social media profile photo import

3. **Analytics**
   - Track social login conversion rates
   - Monitor provider popularity
   - Analyze user preferences

## Support

For issues or questions:
1. Check this documentation
2. Review error logs in backend
3. Test with social provider's debugging tools
4. Contact development team

## License

Proprietary - Flamoral Dating Platform
© 2024 All Rights Reserved
