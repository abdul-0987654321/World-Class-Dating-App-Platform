# Flamoral Mobile App Configuration Guide

## Overview
This guide covers all configuration aspects of the Flamoral mobile app for iOS and Android.

## Environment Configuration

### Environment Files
The mobile app uses `.env` files for environment-specific configuration:

- `.env` - Development environment (local)
- `.env.staging` - Staging environment
- `.env.production` - Production environment

### Setting Up Environment Variables

1. Copy the example file:
```bash
cp .env.example .env
```

2. Update the values in `.env` for your local development environment

3. For production builds, use `.env.production.example` as a template

### Key Environment Variables

#### API Endpoints
```bash
API_BASE_URL=https://api.flamoral.com
WEBSOCKET_URL=wss://api.flamoral.com
GRAPHQL_URL=https://api.flamoral.com/graphql
MESSAGING_SERVICE_URL=https://messaging.flamoral.com
```

#### App Configuration
```bash
APP_NAME=Flamoral
APP_VERSION=1.0.0
APP_ENV=production
BUNDLE_ID=com.flamoral
```

#### Deep Linking
```bash
DEEP_LINK_SCHEME=flamoral
UNIVERSAL_LINK_DOMAIN=flamoral.app
```

## Deep Linking Configuration

### Custom URL Scheme
The app responds to `flamoral://` URLs:
- `flamoral://chat/123` - Opens chat with match ID 123
- `flamoral://events/456` - Opens event details
- `flamoral://subscription` - Opens subscription screen

### Universal Links
The app supports universal links for seamless web-to-app transitions:
- `https://flamoral.app/*`
- `https://www.flamoral.app/*`

### iOS Configuration
Deep linking is configured in `ios/FlavoralApp/Info.plist`:
- URL Schemes: `flamoral`
- Associated Domains: `applinks:flamoral.app`

### Android Configuration
Deep linking is configured in `android/app/src/main/AndroidManifest.xml`:
- Intent filters for `flamoral://` scheme
- Intent filters for HTTPS with `flamoral.app` host
- Auto-verify enabled for App Links

## Build Configuration

### iOS Build

#### Development Build
```bash
npm run ios
# or
npm run ios:dev
```

#### Production Build
```bash
npm run ios:prod
# or
cd ios && xcodebuild -workspace FlavoralApp.xcworkspace -scheme FlavoralApp -configuration Release archive
```

#### Install Dependencies
```bash
npm run pod-install
```

### Android Build

#### Development Build
```bash
npm run android
# or
npm run android:dev
```

#### Production Build (APK)
```bash
npm run android:build
```

#### Production Build (App Bundle)
```bash
npm run android:bundle
```

#### Signing Configuration
Create a `gradle.properties` file in `android/` with:
```properties
FLAMORAL_UPLOAD_STORE_FILE=release.keystore
FLAMORAL_UPLOAD_STORE_PASSWORD=your_keystore_password
FLAMORAL_UPLOAD_KEY_ALIAS=flamoral
FLAMORAL_UPLOAD_KEY_PASSWORD=your_key_password
```

## Package Name / Bundle Identifier

### iOS
- Bundle Identifier: `com.flamoral`
- Configured in Xcode project settings

### Android
- Application ID: `com.flamoral`
- Debug builds: `com.flamoral.debug`
- Configured in `android/app/build.gradle`

## API Client Configuration

The API client is configured in `src/api/client.ts`:
- Base URL from environment variables
- Automatic token injection
- Error handling and retry logic
- 30-second timeout (configurable)

## SSL Certificate Pinning

SSL pinning is configured in `src/config/sslPinning.config.ts`:

### Security Features
- Public key (SPKI) pinning
- Multiple pins for rotation support
- Development mode bypass
- Certificate transparency checks

### Generating SSL Pins
```bash
openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 | \
  openssl x509 -pubkey -noout | \
  openssl rsa -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

### Configuration
Update `SSL_PIN_CONFIG` in `sslPinning.config.ts` with your actual pins:
```typescript
{
  hostname: 'api.flamoral.com',
  pins: [
    'sha256/YOUR_PRIMARY_PIN_HERE=',
    'sha256/YOUR_BACKUP_PIN_HERE=',
  ],
}
```

## Push Notifications

### Firebase Configuration

#### iOS
1. Add `GoogleService-Info.plist` to `ios/FlavoralApp/`
2. Configure in Firebase Console
3. Upload APNs certificates

#### Android
1. Add `google-services.json` to `android/app/`
2. Configure in Firebase Console

### Notification Channels (Android)
Configured in `src/config/notification.config.ts`:
- Messages channel (high priority)
- Matches channel (high priority)
- Video calls channel (high priority)
- Social activity channel (default priority)

## Navigation Configuration

Navigation is set up using React Navigation v6:
- Stack Navigator for auth flow
- Tab Navigator for main app
- Deep linking support
- Type-safe navigation

Configuration files:
- `src/navigation/RootNavigator.tsx` - Root navigator
- `src/navigation/AuthNavigator.tsx` - Auth screens
- `src/navigation/MainNavigator.tsx` - Main app screens
- `src/navigation/linking.ts` - Deep linking configuration

## Testing

### Unit Tests
```bash
npm test
```

### E2E Tests (Detox)
```bash
# iOS
detox build --configuration ios.sim.debug
detox test --configuration ios.sim.debug

# Android
detox build --configuration android.emu.debug
detox test --configuration android.emu.debug
```

## Troubleshooting

### Clean Build
```bash
npm run clean:all
npm install
npm run pod-install
```

### Reset Metro Cache
```bash
npm run start:reset
```

### Android Build Issues
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### iOS Build Issues
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

## Production Checklist

### Before Release
- [ ] Update version in `package.json`
- [ ] Update version in `app.json`
- [ ] Update iOS version in Xcode
- [ ] Update Android versionCode and versionName
- [ ] Generate production SSL pins
- [ ] Configure Firebase for production
- [ ] Set up production API endpoints
- [ ] Test deep linking thoroughly
- [ ] Test push notifications
- [ ] Enable SSL pinning
- [ ] Disable debug features
- [ ] Generate signed builds
- [ ] Test on physical devices

### Security Hardening
- [ ] Enable SSL certificate pinning
- [ ] Enable root/jailbreak detection
- [ ] Remove development logs
- [ ] Obfuscate code (ProGuard/R8)
- [ ] Review permissions
- [ ] Test with production API

## Additional Resources

- [React Native Documentation](https://reactnative.dev/)
- [React Navigation Documentation](https://reactnavigation.org/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Detox E2E Testing](https://wix.github.io/Detox/)

## Support

For issues or questions, contact the development team or refer to the main project documentation.
