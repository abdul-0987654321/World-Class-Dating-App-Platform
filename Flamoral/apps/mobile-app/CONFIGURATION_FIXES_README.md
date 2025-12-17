# Mobile App Configuration Fixes - Complete Guide

## Overview
This guide documents all configuration fixes applied to the Flamoral mobile app to ensure proper functionality across iOS and Android platforms.

## Quick Start

### Option 1: Automated Setup (Recommended)
```bash
# On macOS/Linux
chmod +x setup-mobile-config.sh
./setup-mobile-config.sh

# On Windows
setup-mobile-config.bat
```

### Option 2: Manual Setup
Follow the sections below to apply fixes manually.

---

## Issues Fixed

### 1. Environment Variable Handling ✓

**Problem**: The app wasn't reading environment variables from .env file

**Solution**:
- Added `react-native-config` package for native environment variable support
- Created TypeScript declarations in `src/types/react-native-config.d.ts`
- Updated `src/config/env.ts` to use react-native-config

**Files Modified**:
- `package.json` - Added react-native-config dependency
- `src/config/env.ts` - Imports Config from react-native-config
- `src/types/react-native-config.d.ts` - New file for TypeScript support
- `babel.config.js` - Added react-native-dotenv plugin

**Installation**:
```bash
npm install react-native-config --save
npm install -D react-native-dotenv
cd ios && pod install && cd ..
```

---

### 2. Android Package ID Mismatch ✓

**Problem**: Inconsistent package names
- app.json: `com.flamoral`
- build.gradle: `com.flamoral.app`
- AndroidManifest.xml: `com.flamoral.app`

**Solution**: Standardized to `com.flamoral` everywhere

**Files Modified**:
- `android/app/build.gradle` - Changed namespace and applicationId to "com.flamoral"
- `android/app/src/main/AndroidManifest.xml` - Changed package to "com.flamoral"

**Action Required**:
Update any Java/Kotlin files that reference `com.flamoral.app` to `com.flamoral`

---

### 3. API Configuration ✓

**Problem**: Using `process.env` which doesn't work in React Native

**Solution**: Updated to use ENV from config module

**Files Modified**:
- `src/services/api/config.ts` - Now imports and uses ENV instead of process.env

**Changes**:
```typescript
// Before
BASE_URL: process.env.API_BASE_URL || 'https://api.flamoral.com'

// After
import { ENV } from '@config/env';
BASE_URL: ENV.API_BASE_URL
```

---

### 4. Deep Linking Configuration ✓

**Problem**: Android manifest had wrong deep link host (flamoral.app instead of flamoral.com)

**Solution**: Updated AndroidManifest.xml

**Files Modified**:
- `android/app/src/main/AndroidManifest.xml` - Changed host to "flamoral.com"
- `app.json` - Added associatedDomains for iOS

**Deep Link Formats Now Supported**:
- `flamoral://` (custom scheme)
- `https://flamoral.com/...` (universal links)

---

### 5. Android Permissions ✓

**Problem**: Missing granular location permissions for Android 13+

**Solution**: Added proper permissions to AndroidManifest.xml

**Permissions Added**:
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `READ_MEDIA_IMAGES`

---

### 6. Security Configuration ✓

**Problem**: `usesCleartextTraffic="true"` allows insecure HTTP connections

**Solution**: Changed to `false` for production builds

**Action Required**:
Ensure all API endpoints use HTTPS

---

### 7. iOS Configuration ✓

**Problem**: Missing required permissions and URL types

**Solution**: Enhanced app.json with iOS-specific config

**Added**:
- Background modes for push notifications and VoIP
- CFBundleURLTypes for deep linking
- Associated domains for universal links
- All required usage descriptions

---

## File Structure

### New Files Created:
```
mobile-app/
├── src/
│   └── types/
│       └── react-native-config.d.ts          # TypeScript declarations
├── android/
│   └── app/
│       ├── build.gradle.fixed                # Fixed Android build config
│       └── src/
│           └── main/
│               └── AndroidManifest.xml.fixed # Fixed Android manifest
├── src/
│   └── services/
│       └── api/
│           └── config.fixed.ts               # Fixed API config
├── babel.config.js.fixed                     # Fixed Babel config
├── app.json.fixed                            # Fixed app metadata
├── setup-mobile-config.sh                    # Linux/Mac setup script
├── setup-mobile-config.bat                   # Windows setup script
├── MOBILE_CONFIG_FIXES.md                    # Detailed fix documentation
└── CONFIGURATION_FIXES_README.md             # This file
```

### Backup Files (Created by Setup Script):
```
├── babel.config.js.backup
├── app.json.backup
├── android/app/build.gradle.backup
├── android/app/src/main/AndroidManifest.xml.backup
└── src/services/api/config.ts.backup
```

---

## Environment Variables

### Required .env Variables:
```bash
# API Configuration
API_BASE_URL=https://api.flamoral.com
WEBSOCKET_URL=wss://api.flamoral.com
GRAPHQL_URL=https://api.flamoral.com/graphql

# AI Services
FRAUD_DETECTION_URL=https://api.flamoral.com/ai/fraud
NLP_SERVICE_URL=https://api.flamoral.com/ai/nlp
PHOTO_ANALYSIS_URL=https://api.flamoral.com/ai/photos
RECOMMENDATION_URL=https://api.flamoral.com/ai/recommendations

# Messaging
EXPO_PUBLIC_MESSAGING_SERVICE_URL=https://api.flamoral.com/messaging

# App Config
APP_NAME=Flamoral
APP_VERSION=1.0.0
APP_ENV=production

# Feature Flags (true/false)
ENABLE_VIDEO_CALLS=true
ENABLE_VOICE_CALLS=true
ENABLE_EVENTS=true
# ... etc
```

### Environment-Specific Files:
- `.env` - Default (production)
- `.env.development` - Development
- `.env.staging` - Staging
- `.env.production` - Production

To use different environments:
```bash
# Development
ENVFILE=.env.development react-native run-android

# Staging
ENVFILE=.env.staging react-native run-ios
```

---

## Build Instructions

### Clean Build

**Android**:
```bash
cd android
./gradlew clean
cd ..
rm -rf android/app/build
npm run android
```

**iOS**:
```bash
cd ios
xcodebuild clean
pod install
cd ..
rm -rf ios/build
npm run ios
```

### Production Build

**Android APK**:
```bash
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

**Android Bundle**:
```bash
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

**iOS**:
```bash
cd ios
xcodebuild -workspace FlavoralApp.xcworkspace -scheme FlavoralApp -configuration Release
```

---

## Testing

### Test Environment Variables:
```typescript
import { ENV } from '@config/env';

console.log('API Base URL:', ENV.API_BASE_URL);
console.log('Video Calls Enabled:', ENV.ENABLE_VIDEO_CALLS);
```

### Test Deep Links:

**Android**:
```bash
adb shell am start -W -a android.intent.action.VIEW -d "flamoral://profile/123" com.flamoral
adb shell am start -W -a android.intent.action.VIEW -d "https://flamoral.com/match/456" com.flamoral
```

**iOS** (Simulator):
```bash
xcrun simctl openurl booted "flamoral://profile/123"
xcrun simctl openurl booted "https://flamoral.com/match/456"
```

### Test API Connectivity:
```typescript
import { httpClient } from '@services/api/httpClient';

// Should use environment variable
const response = await httpClient.get('/api/v1/health');
console.log('API Response:', response);
```

---

## Troubleshooting

### Issue: Environment variables not loading

**Solution**:
1. Verify .env file exists in project root
2. Restart Metro bundler: `npm start -- --reset-cache`
3. Rebuild native apps
4. Check babel.config.js has react-native-dotenv plugin

### Issue: Android build fails with package name error

**Solution**:
1. Search for `com.flamoral.app` in all Java/Kotlin files
2. Replace with `com.flamoral`
3. Clean build: `cd android && ./gradlew clean`

### Issue: Deep links not working

**Solution**:
1. Verify AndroidManifest.xml has correct intent filters
2. For iOS, check Info.plist has CFBundleURLTypes
3. Test with adb/xcrun commands first
4. Check autoVerify is set for universal links

### Issue: Type errors for Config

**Solution**:
1. Verify src/types/react-native-config.d.ts exists
2. Check tsconfig.json includes src/types
3. Restart TypeScript server in IDE

---

## Verification Checklist

After applying all fixes, verify:

- [ ] `npm install` completes without errors
- [ ] `npm run typecheck` passes
- [ ] `.env` file exists and has correct values
- [ ] Android app builds successfully
- [ ] iOS app builds successfully
- [ ] Environment variables load in app
- [ ] API calls use correct endpoints
- [ ] Deep links work on both platforms
- [ ] Location permissions work
- [ ] Push notifications configured
- [ ] No console warnings about missing config

---

## Additional Resources

### Documentation:
- [React Native Config](https://github.com/luggit/react-native-config)
- [React Native Deep Linking](https://reactnative.dev/docs/linking)
- [Android App Links](https://developer.android.com/training/app-links)
- [iOS Universal Links](https://developer.apple.com/ios/universal-links/)

### Support:
- File issues in project repository
- Contact: support@flamoral.com
- Slack: #mobile-dev

---

## Changelog

### 2025-12-15
- Initial configuration fixes applied
- Added react-native-config support
- Fixed Android package ID mismatch
- Updated deep linking configuration
- Added TypeScript declarations
- Created setup scripts
- Enhanced iOS permissions
- Improved API configuration

---

## Notes

1. **Environment Variables**: All environment variables are baked in at build time. Changes require a rebuild.

2. **Package Name**: Using `com.flamoral` consistently. If you need to change this, update ALL references.

3. **Deep Links**: Both custom scheme (`flamoral://`) and universal links (`https://flamoral.com/`) are configured.

4. **Security**: SSL pinning is configured but disabled in debug mode. Enable for production.

5. **Permissions**: Request permissions at runtime using react-native-permissions.

6. **TypeScript**: All configuration files are now type-safe with proper TypeScript support.

---

**Last Updated**: December 15, 2025
**Version**: 1.0.0
**Status**: ✓ Complete
