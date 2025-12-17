# Flamoral Mobile App - Quick Start Guide

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Xcode 14+ (for iOS development)
- Android Studio (for Android development)
- CocoaPods (for iOS dependencies)

## Initial Setup

### 1. Install Dependencies

```bash
cd apps/mobile-app
npm install
```

### 2. Set Up Environment

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Update API_BASE_URL, etc.
```

### 3. iOS Setup

```bash
# Install iOS pods
npm run pod-install

# For updates
npm run pod-install:update
```

### 4. Firebase Setup

**iOS:**
- Add `GoogleService-Info.plist` to `ios/FlavoralApp/`

**Android:**
- Add `google-services.json` to `android/app/`

## Running the App

### Development Mode

**iOS:**
```bash
npm run ios
# or for specific simulator
npm run ios -- --simulator="iPhone 15 Pro"
```

**Android:**
```bash
npm run android
# Make sure Android emulator is running first
```

### With Environment Variables

**Development:**
```bash
npm run ios:dev
npm run android:dev
```

**Staging:**
```bash
npm run ios:staging
npm run android:staging
```

**Production:**
```bash
npm run ios:prod
npm run android:prod
```

## Building for Release

### iOS

```bash
# Production build
npm run ios:build

# Or open Xcode
open ios/FlavoralApp.xcworkspace
# Product > Archive
```

### Android

**APK Build:**
```bash
npm run android:build
# Output: android/app/build/outputs/apk/release/app-release.apk
```

**App Bundle (for Play Store):**
```bash
npm run android:bundle
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

## Common Commands

### Metro Bundler

```bash
# Start Metro
npm start

# Start with cache reset
npm run start:reset
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Code Quality

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Cleaning

```bash
# Clean build folders
npm run clean

# Deep clean (iOS + Android)
npm run clean:deep

# Nuclear option (includes node_modules)
npm run clean:all
npm install
npm run pod-install
```

## Troubleshooting

### Metro Bundler Issues

```bash
# Clear cache and restart
npm run start:reset
```

### iOS Build Issues

```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

### Android Build Issues

```bash
cd android
./gradlew clean
cd ..
npm run android
```

### General Issues

```bash
# Complete reset
npm run clean:all
npm install
npm run pod-install
npm run start:reset
```

## Deep Linking Testing

### Custom Scheme (iOS)
```bash
xcrun simctl openurl booted "flamoral://chat/123"
```

### Custom Scheme (Android)
```bash
adb shell am start -W -a android.intent.action.VIEW -d "flamoral://chat/123"
```

### Universal Links (iOS)
```bash
xcrun simctl openurl booted "https://flamoral.app/chat/123"
```

### Universal Links (Android)
```bash
adb shell am start -W -a android.intent.action.VIEW -d "https://flamoral.app/chat/123"
```

## Environment Variables

### Required Variables

```bash
# API Configuration
API_BASE_URL=https://api.flamoral.com
WEBSOCKET_URL=wss://api.flamoral.com
MESSAGING_SERVICE_URL=https://messaging.flamoral.com

# App Configuration
APP_NAME=Flamoral
BUNDLE_ID=com.flamoral

# Deep Linking
DEEP_LINK_SCHEME=flamoral
UNIVERSAL_LINK_DOMAIN=flamoral.app
```

### Optional Variables

See `.env.production.example` for complete list of available environment variables.

## Project Structure

```
apps/mobile-app/
├── android/           # Android native code
├── ios/              # iOS native code
├── src/
│   ├── api/          # API client
│   ├── components/   # React components
│   ├── config/       # Configuration
│   ├── hooks/        # Custom hooks
│   ├── navigation/   # Navigation setup
│   ├── screens/      # Screen components
│   ├── services/     # Business logic
│   ├── store/        # Redux store
│   ├── types/        # TypeScript types
│   └── utils/        # Utility functions
├── .env.example      # Environment template
├── app.json          # App configuration
├── package.json      # Dependencies
└── tsconfig.json     # TypeScript config
```

## Next Steps

1. **Configure Environment**
   - Update `.env` with your API endpoints
   - Add Firebase configuration files

2. **Run Development Build**
   ```bash
   npm run ios    # or npm run android
   ```

3. **Test Deep Linking**
   - Use the deep link testing commands above

4. **Build for Production**
   - Follow the "Building for Release" section
   - Test on physical devices

## Documentation

- [Mobile App Config Guide](./MOBILE_APP_CONFIG_GUIDE.md) - Detailed configuration
- [Fixes Summary](./MOBILE_APP_FIXES_SUMMARY.md) - All applied fixes
- [React Native Docs](https://reactnative.dev/) - Official documentation

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the configuration guides
- Contact the development team

---

**Ready to start?** Run `npm install` and then `npm run ios` or `npm run android`!
