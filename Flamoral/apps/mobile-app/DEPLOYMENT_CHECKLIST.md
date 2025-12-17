# Flamoral Mobile App - Deployment Checklist

## Pre-Deployment Tasks

### 1. Install Dependencies (Required)
- [ ] Run `install-dependencies.bat` (Windows) or `install-dependencies.sh` (Mac/Linux)
- [ ] OR manually run: `npm install @react-native-firebase/app@^18.7.0 @react-native-firebase/messaging@^18.7.0 expo-local-authentication@^13.8.0 react-native-keychain@^8.1.2 react-native-config@^1.5.1 babel-plugin-module-resolver@^5.0.0`
- [ ] iOS only: `cd ios && pod install`

### 2. Update Domain References (Required)
- [ ] Update `ios/FlavoralApp/Info.plist` line 81-82: Change `flamoral.app` to `flamoral.com`
- [ ] Update `android/app/src/main/AndroidManifest.xml` line 43: Change `flamoral.app` to `flamoral.com`
- [ ] Update `src/services/notifications/DeepLinkHandler.ts` line 268: Change prefix to `https://flamoral.com`
- [ ] Update `src/config/notification.config.ts` line 8: Change prefix to `https://flamoral.com`

### 3. Add Firebase Configuration (Required for Push Notifications)
- [ ] Download `google-services.json` from Firebase Console
- [ ] Place at `android/app/google-services.json`
- [ ] Download `GoogleService-Info.plist` from Firebase Console
- [ ] Place at `ios/FlavoralApp/GoogleService-Info.plist`

### 4. Update Babel Configuration (Required for Environment Variables)
- [ ] Edit `babel.config.js`
- [ ] Add `module:react-native-dotenv` plugin (see SETUP_INSTRUCTIONS.md for details)

### 5. Setup Deep Link Verification (Required for Universal Links)
- [ ] Create `https://flamoral.com/.well-known/assetlinks.json` for Android
- [ ] Create `https://flamoral.com/.well-known/apple-app-site-association` for iOS
- [ ] Get Android signing certificate fingerprint: `cd android && ./gradlew signingReport`
- [ ] Add Apple Team ID to apple-app-site-association

### 6. Generate SSL Pins (Optional - Production Only)
- [ ] Generate pin for api.flamoral.com
- [ ] Update `src/config/sslPinning.config.ts` with real pins
- [ ] Test certificate pinning in staging environment

## Testing Checklist

### Basic Functionality
- [ ] App launches successfully
- [ ] No build errors
- [ ] No runtime errors on startup

### API Connection
- [ ] App connects to https://api.flamoral.com
- [ ] Login works
- [ ] Data fetching works
- [ ] File uploads work

### Authentication
- [ ] Login persists after app restart
- [ ] Token refresh works automatically
- [ ] Biometric authentication works (if device supports)
- [ ] Logout clears all data

### Deep Linking
- [ ] `flamoral://` URLs open the app
- [ ] `https://flamoral.com/...` URLs open the app
- [ ] Deep links navigate to correct screens
- [ ] Test routes: chat, profile, match, settings

### Push Notifications
- [ ] Foreground notifications appear
- [ ] Background notifications appear
- [ ] Tapping notification opens correct screen
- [ ] Notification sounds/vibration work

### WebSocket
- [ ] Real-time messages work
- [ ] Typing indicators work
- [ ] Read receipts work
- [ ] Presence status updates

## Build Checklist

### Android Build
- [ ] Clean build: `cd android && ./gradlew clean`
- [ ] Debug build works: `npm run android`
- [ ] Release build works: `cd android && ./gradlew assembleRelease`
- [ ] APK installs on device
- [ ] APK works correctly

### iOS Build
- [ ] Clean build: `cd ios && xcodebuild clean`
- [ ] Debug build works: `npm run ios`
- [ ] Archive builds successfully
- [ ] IPA can be uploaded to TestFlight

## Pre-Production Checklist

### Security
- [ ] SSL certificate pinning enabled
- [ ] Root/jailbreak detection enabled
- [ ] Debug mode disabled
- [ ] Console logs removed in production build
- [ ] API keys secured (not hardcoded)

### Performance
- [ ] App starts in < 3 seconds
- [ ] No memory leaks
- [ ] Images optimized and compressed
- [ ] Offline mode works

### Legal & Compliance
- [ ] Privacy policy accessible
- [ ] Terms of service accessible
- [ ] Age verification implemented
- [ ] COPPA compliance verified
- [ ] GDPR compliance verified (if applicable)

## Store Submission Checklist

### Google Play Store
- [ ] App signing key generated
- [ ] App bundle created (.aab)
- [ ] Screenshots prepared (all required sizes)
- [ ] App description written
- [ ] Privacy policy URL provided
- [ ] Age rating completed
- [ ] Content rating questionnaire completed
- [ ] Pricing and distribution set

### Apple App Store
- [ ] Distribution certificate created
- [ ] App ID registered
- [ ] Provisioning profile created
- [ ] Archive uploaded to App Store Connect
- [ ] Screenshots prepared (all required sizes)
- [ ] App description written
- [ ] Privacy policy URL provided
- [ ] Age rating set
- [ ] Export compliance completed

## Post-Deployment Checklist

### Monitoring
- [ ] Firebase Analytics configured
- [ ] Crash reporting enabled (Sentry/Firebase Crashlytics)
- [ ] Performance monitoring enabled
- [ ] User analytics tracking works

### Updates
- [ ] Version numbering documented
- [ ] Release notes prepared
- [ ] Rollback plan documented
- [ ] Update notifications configured

## Quick Reference

### Installation Commands
```bash
# Install dependencies
npm install @react-native-firebase/app@^18.7.0 @react-native-firebase/messaging@^18.7.0 expo-local-authentication@^13.8.0 react-native-keychain@^8.1.2 react-native-config@^1.5.1 babel-plugin-module-resolver@^5.0.0

# iOS pod install
cd ios && pod install && cd ..

# Android build
cd android && ./gradlew assembleRelease

# iOS build
cd ios && xcodebuild -workspace FlavoralApp.xcworkspace -scheme FlavoralApp -configuration Release
```

### Files to Update
1. `ios/FlavoralApp/Info.plist` - Change domain
2. `android/app/src/main/AndroidManifest.xml` - Change domain
3. `src/services/notifications/DeepLinkHandler.ts` - Change prefix
4. `src/config/notification.config.ts` - Change prefix
5. `babel.config.js` - Add dotenv plugin

### External Files Needed
1. `android/app/google-services.json`
2. `ios/FlavoralApp/GoogleService-Info.plist`
3. `https://flamoral.com/.well-known/assetlinks.json`
4. `https://flamoral.com/.well-known/apple-app-site-association`

## Status

Current Status: **96% Complete**

Remaining Tasks:
1. Install dependencies (5 minutes)
2. Update domain references (10 minutes)
3. Add Firebase files (5 minutes)
4. Update Babel config (5 minutes)
5. Setup .well-known files (10 minutes)

**Total Time Required: ~35 minutes**

## Support

- Detailed Documentation: `MOBILE_APP_FIXES.md`
- Setup Instructions: `SETUP_INSTRUCTIONS.md`
- Configuration Summary: `CONFIGURATION_COMPLETE.md`
- This Checklist: `DEPLOYMENT_CHECKLIST.md`
