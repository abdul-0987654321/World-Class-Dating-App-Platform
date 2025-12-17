# Social Login Quick Start Guide

## Prerequisites

- Node.js 20+
- PostgreSQL database
- Google Cloud account
- Apple Developer account (for iOS)
- Facebook Developer account

## Quick Installation

### 1. Backend Setup (5 minutes)

```bash
# Navigate to user service
cd backend/services/user-service

# Install dependencies (axios already included)
npm install

# Run database migration
npm run migrate

# Update .env file with social provider credentials
cp .env.example .env
nano .env  # Add your Google, Apple, and Facebook credentials
```

### 2. Mobile App Setup (10 minutes)

```bash
cd apps/mobile-app

# Install dependencies
npm install @react-native-google-signin/google-signin
npm install @invertase/react-native-apple-authentication
npm install react-native-fbsdk-next

# For iOS
cd ios && pod install && cd ..
```

**iOS Configuration:**

1. Add to `Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>fb{FACEBOOK_APP_ID}</string>
      <string>com.googleusercontent.apps.{REVERSED_CLIENT_ID}</string>
    </array>
  </dict>
</array>

<key>FacebookAppID</key>
<string>{FACEBOOK_APP_ID}</string>
<key>FacebookDisplayName</key>
<string>Flamoral</string>
```

2. Enable Sign In with Apple in Xcode:
   - Select your target → Signing & Capabilities
   - Click + Capability → Sign In with Apple

**Android Configuration:**

1. Add to `android/app/build.gradle`:
```gradle
dependencies {
    implementation 'com.facebook.android:facebook-android-sdk:latest.release'
}
```

2. Add to `android/app/src/main/res/values/strings.xml`:
```xml
<string name="facebook_app_id">{FACEBOOK_APP_ID}</string>
<string name="fb_login_protocol_scheme">fb{FACEBOOK_APP_ID}</string>
```

3. Get SHA-1 fingerprint and add to Google Console:
```bash
cd android && ./gradlew signingReport
```

### 3. Web App Setup (5 minutes)

```bash
cd apps/web-app

# Install dependencies
npm install @react-oauth/google react-apple-signin-auth

# Update .env file
cp .env.example .env
nano .env  # Add your social provider client IDs
```

## Provider Configuration

### Google OAuth 2.0 (Required)

1. **Google Cloud Console** (https://console.cloud.google.com)
   - Create project: "Flamoral Dating"
   - Enable APIs: Google+ API, Google People API
   - Create OAuth 2.0 credentials

2. **Web Client ID:**
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/auth/google/callback`

3. **iOS Client ID:**
   - Application type: iOS
   - Bundle ID: `com.flamoral.dating` (your app's bundle ID)

4. **Android Client ID:**
   - Application type: Android
   - Package name: `com.flamoral.dating`
   - SHA-1 certificate fingerprint: (from your keystore)

5. **Add to .env files:**
```env
# Backend
GOOGLE_CLIENT_ID={WEB_CLIENT_ID}
GOOGLE_CLIENT_SECRET={CLIENT_SECRET}

# Web App
REACT_APP_GOOGLE_CLIENT_ID={WEB_CLIENT_ID}

# Mobile App
GOOGLE_WEB_CLIENT_ID={WEB_CLIENT_ID}
GOOGLE_IOS_CLIENT_ID={IOS_CLIENT_ID}
```

### Apple Sign In (Required for iOS)

1. **Apple Developer Portal** (https://developer.apple.com)
   - Certificates, Identifiers & Profiles
   - Create App ID: `com.flamoral.dating`
   - Enable "Sign In with Apple" capability

2. **Create Service ID** (for web):
   - Identifier: `com.flamoral.dating.service`
   - Configure domains: `localhost` (for dev)
   - Return URLs: `http://localhost:3000/auth/apple/callback`

3. **Create Sign In with Apple Key:**
   - Keys → Create new key
   - Enable "Sign In with Apple"
   - Download .p8 file
   - Save Key ID

4. **Add to .env files:**
```env
# Backend
APPLE_CLIENT_ID=com.flamoral.dating.service
APPLE_TEAM_ID={YOUR_TEAM_ID}
APPLE_KEY_ID={YOUR_KEY_ID}
APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8

# Web App
REACT_APP_APPLE_CLIENT_ID=com.flamoral.dating.service
```

### Facebook Login (Optional but Recommended)

1. **Facebook Developers** (https://developers.facebook.com)
   - Create app: "Flamoral Dating"
   - Add Facebook Login product
   - Settings → Basic: Copy App ID and App Secret

2. **Configure OAuth Redirect URIs:**
   - Facebook Login → Settings
   - Valid OAuth Redirect URIs:
     - `http://localhost:3000/auth/facebook/callback`
     - `fbconnect://success`

3. **Add Platforms:**
   - iOS:
     - Bundle ID: `com.flamoral.dating`
     - iPhone/iPad App Store ID: (when available)
   - Android:
     - Package Name: `com.flamoral.dating`
     - Key Hashes: (from your keystore)

4. **Add to .env files:**
```env
# Backend
FACEBOOK_APP_ID={APP_ID}
FACEBOOK_APP_SECRET={APP_SECRET}

# Web App
REACT_APP_FACEBOOK_APP_ID={APP_ID}

# Mobile App
FACEBOOK_APP_ID={APP_ID}
```

## Testing

### 1. Start Backend
```bash
cd backend/services/user-service
npm run dev
```

### 2. Test Web App
```bash
cd apps/web-app
npm start
# Navigate to http://localhost:3000/login
# Try each social login button
```

### 3. Test Mobile App
```bash
cd apps/mobile-app
npm run ios  # or npm run android
```

## Verification Checklist

- [ ] Backend migration completed
- [ ] All environment variables set
- [ ] Google OAuth configured for web and mobile
- [ ] Apple Sign In configured (iOS only)
- [ ] Facebook Login configured
- [ ] Social login buttons appear on login screen
- [ ] Can create new account with Google
- [ ] Can create new account with Apple (iOS)
- [ ] Can create new account with Facebook
- [ ] Can link social accounts in settings
- [ ] Can unlink social accounts
- [ ] Profile data imported correctly

## Common Issues

### "Invalid Client" Error
- **Cause**: Client ID mismatch
- **Fix**: Verify client IDs in .env match provider console

### "Redirect URI Mismatch"
- **Cause**: Redirect URI not whitelisted
- **Fix**: Add exact URL to provider's allowed redirect URIs

### "Email Already Exists"
- **Cause**: User already registered with that email
- **Fix**: Social account will auto-link to existing user

### iOS Build Fails
- **Cause**: Missing pod dependencies
- **Fix**: Run `cd ios && pod install`

### Android Build Fails
- **Cause**: Missing SDK configuration
- **Fix**: Sync Gradle, check package names match

## Next Steps

1. **Production Setup:**
   - Update redirect URIs to production domain
   - Enable production mode in provider consoles
   - Configure SSL/HTTPS
   - Update CORS settings

2. **Enhanced Features:**
   - Add profile photo import from social accounts
   - Implement friend suggestions from social graphs
   - Add social sharing capabilities

3. **Security:**
   - Enable two-factor authentication
   - Implement rate limiting
   - Add suspicious login detection
   - Regular token rotation

## API Endpoints Summary

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/auth/google` | POST | No | Google login/register |
| `/api/auth/apple` | POST | No | Apple login/register |
| `/api/auth/facebook` | POST | No | Facebook login/register |
| `/api/auth/social/link` | POST | Yes | Link social account |
| `/api/auth/social/unlink` | POST | Yes | Unlink social account |
| `/api/auth/social/linked` | GET | Yes | Get linked accounts |
| `/api/auth/social/refresh` | POST | Yes | Refresh provider token |

## Support Resources

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [Project Documentation](./SOCIAL_LOGIN_IMPLEMENTATION.md)

## Need Help?

Check the detailed implementation guide: `SOCIAL_LOGIN_IMPLEMENTATION.md`
