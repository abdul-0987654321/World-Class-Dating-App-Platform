# Quick Implementation Guide - Token Storage Security Fixes

## Overview
This guide provides step-by-step instructions to implement the secure token storage fixes for both web and mobile applications.

---

## Prerequisites

### Web App
- Node.js >= 18
- Backend already has `cookie-parser` installed
- CORS configured to allow credentials

### Mobile App
- React Native 0.73.0
- iOS: Xcode with latest CocoaPods
- Android: Android Studio with SDK 33+

---

## Web Application Implementation

### Step 1: Update Backend (API Gateway)

1. **Navigate to backend directory**:
   ```bash
   cd DatingPlatform/backend/services/api-gateway
   ```

2. **Backup and replace auth controller**:
   ```bash
   # Backup original
   cp src/controllers/auth.controller.ts src/controllers/auth.controller.backup.ts

   # Replace with secure version
   cp src/controllers/auth.controller.secure.ts src/controllers/auth.controller.ts
   ```

3. **Verify cookie-parser is installed** (already done):
   ```bash
   # Check main.ts for: app.use(cookieParser());
   grep "cookieParser" src/main.ts
   ```

4. **Build and test**:
   ```bash
   npm run build
   npm run start:dev  # Test locally first
   ```

### Step 2: Update Frontend (Web App)

1. **Navigate to web app directory**:
   ```bash
   cd DatingPlatform/apps/web-app
   ```

2. **Backup and replace API client**:
   ```bash
   # Backup
   cp src/services/api.client.ts src/services/api.client.backup.ts

   # Replace
   cp src/services/api.client.new.ts src/services/api.client.ts
   ```

3. **Backup and replace auth service**:
   ```bash
   # Backup
   cp src/services/auth.service.ts src/services/auth.service.backup.ts

   # Replace
   cp src/services/auth.service.secure.ts src/services/auth.service.ts
   ```

4. **Backup and replace App component**:
   ```bash
   # Backup
   cp src/App.tsx src/App.backup.tsx

   # Replace
   cp src/App.secure.tsx src/App.tsx
   ```

5. **Test locally**:
   ```bash
   npm run dev
   # Open browser, test login/logout
   # Check DevTools → Application → Cookies for httpOnly cookies
   ```

6. **Build for production**:
   ```bash
   npm run build
   ```

### Step 3: Deploy Web App

1. **Update environment variables**:
   ```env
   # Backend .env
   NODE_ENV=production
   CORS_ORIGINS=https://yourdomain.com
   CORS_CREDENTIALS=true
   ```

2. **Deploy**:
   ```bash
   # Deploy backend first
   # Then deploy frontend
   ```

3. **Verify**:
   - Login and check cookies in browser DevTools
   - Verify no tokens in localStorage
   - Test token refresh by waiting 15+ minutes

---

## Mobile Application Implementation

### Step 1: Install Dependencies

1. **Navigate to mobile app**:
   ```bash
   cd DatingPlatform/apps/mobile-app
   ```

2. **Install packages**:
   ```bash
   npm install react-native-keychain@^8.2.0
   npm install expo-local-authentication@^13.8.0
   ```

3. **Update iOS pods**:
   ```bash
   cd ios
   pod install
   cd ..
   ```

### Step 2: Configure Permissions

#### iOS (Info.plist)
Add to `apps/mobile-app/ios/YourApp/Info.plist`:
```xml
<key>NSFaceIDUsageDescription</key>
<string>Flamoral uses Face ID to securely protect your account and personal data</string>
```

#### Android (AndroidManifest.xml)
Add to `apps/mobile-app/android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
```

### Step 3: Add Storage Service

Files are already created at:
- `apps/mobile-app/src/services/storage/SecureTokenStorage.ts`
- `apps/mobile-app/src/services/storage/index.ts`

No action needed - they're ready to use!

### Step 4: Update Auth Hook

```bash
# Backup
cp src/hooks/useAuth.tsx src/hooks/useAuth.backup.tsx

# Replace
cp src/hooks/useAuth.secure.tsx src/hooks/useAuth.tsx
```

### Step 5: Update HTTP Client

```bash
# Backup
cp src/services/api/httpClient.ts src/services/api/httpClient.backup.ts

# Replace
cp src/services/api/httpClient.new.secure.ts src/services/api/httpClient.ts
```

### Step 6: Build and Test

#### Test on iOS:
```bash
npm run ios

# Test:
# 1. Login - should prompt for Face ID/Touch ID
# 2. Close app and reopen - should prompt for biometric
# 3. Logout - should clear secure storage
# 4. Check AsyncStorage is empty of tokens
```

#### Test on Android:
```bash
npm run android

# Test:
# 1. Login - should prompt for fingerprint/face unlock
# 2. Close app and reopen - should prompt for biometric
# 3. Logout - should clear secure storage
# 4. Check keystore has no tokens after logout
```

### Step 7: Build for Production

#### iOS:
```bash
cd ios
xcodebuild -workspace YourApp.xcworkspace \
  -scheme YourApp \
  -configuration Release \
  -archivePath ./build/YourApp.xcarchive \
  archive
```

#### Android:
```bash
cd android
./gradlew assembleRelease
```

---

## Verification Steps

### Web App Verification

1. **Open DevTools**:
   - Application → Cookies
   - Should see `accessToken` and `refreshToken` cookies
   - Both should have `HttpOnly` flag

2. **Check localStorage**:
   - Should NOT contain `authToken`, `accessToken`, or `refreshToken`

3. **Network Tab**:
   - API requests should have `Cookie` header
   - Login response should NOT contain tokens in body

4. **Test Refresh**:
   - Wait 15+ minutes or modify token expiry
   - Make an API call
   - Should automatically refresh without user action

### Mobile App Verification

1. **iOS Keychain**:
   ```bash
   # On simulator/device with dev tools
   # Check Keychain Access app for entry: com.flamoral.auth
   ```

2. **Android Keystore**:
   ```bash
   # Use Android Debug Bridge
   adb shell
   # Check keystore entries (requires root or special tools)
   ```

3. **AsyncStorage Check**:
   ```typescript
   // Temporary debug code
   import AsyncStorage from '@react-native-async-storage/async-storage';

   AsyncStorage.getAllKeys().then(keys => {
     console.log('AsyncStorage keys:', keys);
     // Should NOT contain 'accessToken' or 'refreshToken'
   });
   ```

4. **Biometric Test**:
   - Login → Should prompt for biometric
   - Background app → Foreground → Should prompt again (if configured)
   - Logout → Try to access token → Should return null

---

## Rollback Procedure

### If Issues Occur:

#### Web App:
```bash
# Backend
cp src/controllers/auth.controller.backup.ts src/controllers/auth.controller.ts
npm run build && npm run start

# Frontend
cp src/services/api.client.backup.ts src/services/api.client.ts
cp src/services/auth.service.backup.ts src/services/auth.service.ts
cp src/App.backup.tsx src/App.tsx
npm run build
```

#### Mobile App:
```bash
# Restore backups
cp src/hooks/useAuth.backup.tsx src/hooks/useAuth.tsx
cp src/services/api/httpClient.backup.ts src/services/api/httpClient.ts

# Remove new packages (if causing issues)
npm uninstall react-native-keychain expo-local-authentication

# Rebuild
npm run ios  # or npm run android
```

---

## Troubleshooting

### Web App Issues

**Problem**: CORS errors with cookies
- **Solution**: Ensure `CORS_CREDENTIALS=true` and `credentials: 'include'` in fetch

**Problem**: Cookies not set
- **Solution**: Check `secure` flag - should be `false` for localhost, `true` for production

**Problem**: Token refresh fails
- **Solution**: Check refresh token cookie path is `/api/auth/refresh-token`

### Mobile App Issues

**Problem**: Biometric not working
- **Solution**: Check device has biometric enrolled, permissions granted

**Problem**: Keychain errors on iOS
- **Solution**: Reset simulator, check entitlements in Xcode

**Problem**: Keystore errors on Android
- **Solution**: Clear app data, check API level >= 23 (Android 6.0+)

---

## Timeline

Estimated implementation time:
- **Web App**: 2-3 hours (including testing)
- **Mobile App**: 3-4 hours (including testing and platform-specific setup)
- **Total**: 1 business day

---

## Support

For implementation help:
- **Technical Lead**: Check with your team lead
- **Security Questions**: security@flamoral.com
- **Emergency**: Refer to main documentation

---

## Completion Checklist

### Web App
- [ ] Backend auth controller updated
- [ ] Frontend API client updated
- [ ] Auth service updated
- [ ] App.tsx updated
- [ ] Local testing passed
- [ ] Production deployed
- [ ] Post-deployment verification done

### Mobile App
- [ ] Dependencies installed
- [ ] iOS permissions configured
- [ ] Android permissions configured
- [ ] Storage service added
- [ ] Auth hook updated
- [ ] HTTP client updated
- [ ] iOS build tested
- [ ] Android build tested
- [ ] Production build created

---

## Post-Implementation

After successful deployment:
1. Monitor error logs for auth failures
2. Check user login success rates
3. Gather feedback on biometric UX (mobile)
4. Update security documentation
5. Schedule security audit

**Estimated User Impact**: All users will need to re-login once after update.

**Communication**: Send email/in-app notification about security improvements.
