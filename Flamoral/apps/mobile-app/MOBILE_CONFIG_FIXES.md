# Mobile App Configuration Fixes

## Summary
This document outlines all necessary configuration fixes for the Flamoral mobile app to ensure proper functionality.

## Issues Identified and Fixes Required

### 1. Environment Variable Handling ✓ (IN PROGRESS)

**Issue**: The current env.ts implementation doesn't actually read environment variables - it only returns default values.

**Fix**:
- Add `react-native-config` to package.json dependencies
- Update `src/config/env.ts` to import and use react-native-config
- Install: `npm install react-native-config --save`

**Updated env.ts pattern**:
```typescript
import Config from 'react-native-config';

const getEnvVar = (key: string, defaultValue: string = ''): string => {
  return Config[key] || defaultValue;
};
```

### 2. Android Package/Application ID Mismatch

**Issue**: Inconsistency between app.json (com.flamoral) and build.gradle (com.flamoral.app)

**Current State**:
- `app.json`: package: "com.flamoral"
- `android/app/build.gradle`: applicationId "com.flamoral.app"
- `AndroidManifest.xml`: package="com.flamoral.app"

**Fix** (Choose one approach):

**Option A - Use com.flamoral everywhere** (RECOMMENDED):
```gradle
// android/app/build.gradle
namespace "com.flamoral"
defaultConfig {
    applicationId "com.flamoral"
}
```

```xml
<!-- AndroidManifest.xml -->
<manifest package="com.flamoral">
```

**Option B - Use com.flamoral.app everywhere**:
```json
// app.json
"android": {
  "package": "com.flamoral.app"
}
```

### 3. API Configuration Improvements

**Issue**: API config uses process.env which doesn't work in React Native

**Fix**: Update `src/services/api/config.ts`:
```typescript
import { ENV } from '@config/env';

export const API_CONFIG = {
  BASE_URL: ENV.API_BASE_URL,
  AI_SERVICES: {
    FRAUD_DETECTION: ENV.FRAUD_DETECTION_URL,
    NLP_SERVICE: ENV.NLP_SERVICE_URL,
    PHOTO_ANALYSIS: ENV.PHOTO_ANALYSIS_URL,
    RECOMMENDATION: ENV.RECOMMENDATION_URL,
  },
  // ... rest of config
};
```

### 4. TypeScript Declaration for react-native-config

**Fix**: Create `src/types/react-native-config.d.ts`:
```typescript
declare module 'react-native-config' {
  export interface NativeConfig {
    API_BASE_URL?: string;
    WEBSOCKET_URL?: string;
    GRAPHQL_URL?: string;
    // ... all other env vars
    [key: string]: string | undefined;
  }

  export const Config: NativeConfig;
  export default Config;
}
```

### 5. Android Manifest Deep Link Configuration

**Issue**: Deep link host shows "flamoral.app" but should be "flamoral.com"

**Current**:
```xml
<data android:scheme="https"
      android:host="flamoral.app" />
```

**Fix**:
```xml
<data android:scheme="https"
      android:host="flamoral.com" />
```

### 6. Android Location Permission for API 33+

**Issue**: Missing granular location permissions for Android 13+

**Fix**: Add to AndroidManifest.xml:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### 7. Remove usesCleartextTraffic in Production

**Issue**: Security concern - allows unencrypted HTTP traffic

**Current**:
```xml
android:usesCleartextTraffic="true"
```

**Fix** for production:
```xml
android:usesCleartextTraffic="false"
```

Or use network security config for more control.

### 8. App.json Configuration Updates

**Recommendations**:
- Remove unnecessary Expo-specific fields if not using Expo
- Ensure bundle IDs match across all configs
- Add scheme for deep linking

**Updated app.json**:
```json
{
  "name": "Flamoral",
  "displayName": "Flamoral",
  "version": "1.0.0",
  "build": "1",
  "slug": "flamoral",
  "description": "Where Passion Meets Connection",
  "orientation": "portrait",
  "platforms": ["ios", "android"],
  "ios": {
    "bundleIdentifier": "com.flamoral",
    "buildNumber": "1",
    "supportsTablet": false
  },
  "android": {
    "package": "com.flamoral",
    "versionCode": 1
  },
  "scheme": "flamoral"
}
```

### 9. Babel Config for react-native-config

**Fix**: Add to babel.config.js plugins:
```javascript
plugins: [
  // ... existing plugins
  'react-native-config/plugin',
  // ... rest
]
```

### 10. iOS Info.plist for Deep Linking

**Issue**: Need to ensure URL schemes are configured

**Fix**: Verify Info.plist contains:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>flamoral</string>
    </array>
  </dict>
</array>
```

## Installation Steps

1. **Install react-native-config**:
```bash
npm install react-native-config --save
```

2. **Link native dependencies** (if not auto-linked):
```bash
cd ios && pod install && cd ..
```

3. **Update environment files**:
- Ensure `.env` file exists in root
- Add `.env.development`, `.env.staging`, `.env.production` as needed

4. **Update Android native code**:
- Fix applicationId in build.gradle
- Update AndroidManifest.xml package
- Fix deep link host

5. **Update TypeScript types**:
- Add react-native-config type declarations

6. **Clean and rebuild**:
```bash
# Clean
npm run clean

# iOS
cd ios && pod install && cd ..
npm run ios

# Android
npm run android
```

## Testing Checklist

- [ ] Environment variables load correctly
- [ ] API endpoints resolve properly
- [ ] Deep links work (flamoral://... and https://flamoral.com/...)
- [ ] Android build succeeds
- [ ] iOS build succeeds
- [ ] TypeScript compilation passes
- [ ] Location permissions work
- [ ] Push notifications configured
- [ ] SSL/HTTPS connections work

## Priority Fixes

### High Priority:
1. Add react-native-config package
2. Fix Android applicationId mismatch
3. Update API config to use ENV
4. Fix deep link configuration

### Medium Priority:
5. Add TypeScript declarations
6. Update babel config
7. Clean up app.json

### Low Priority:
8. Remove usesCleartextTraffic (before production)
9. Add network security config
10. Optimize iOS Info.plist

## Notes

- All environment variables are baked in at build time in React Native
- Different .env files can be used for different build variants
- Deep link testing requires physical devices or specific emulator setup
- SSL pinning configuration is already in place but disabled in debug mode
