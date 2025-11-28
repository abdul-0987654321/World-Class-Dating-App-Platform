# React Native Project Initialization Guide

## Current Status

The Flamoral mobile app has:
- ✅ React Native project structure
- ✅ TypeScript configuration
- ✅ Navigation setup (React Navigation)
- ✅ Redux store with persistence
- ✅ Shared package dependencies
- ✅ Privacy Policy and Terms of Service
- ❌ Native iOS project files (not yet initialized)
- ❌ Native Android project files (not yet initialized)

## Why Native Projects Are Empty

The `ios/` and `android/` directories exist but are empty because we're using a monorepo structure. React Native's default `npx react-native init` creates everything at the root, but we need to initialize properly within our workspace.

## Option 1: Initialize with React Native CLI (Recommended)

### Prerequisites
```bash
# Install React Native CLI globally
npm install -g react-native-cli

# For iOS (macOS only)
brew install cocoapods
xcode-select --install

# For Android
# Install Android Studio with SDK
# Set ANDROID_HOME environment variable
```

### Initialize Native Projects

From the `apps/mobile` directory:

```bash
cd apps/mobile

# This will create iOS and Android native projects
npx react-native init Flamoral --directory . --skip-install

# The --skip-install flag prevents npm install since we use yarn workspaces
```

### iOS Setup

```bash
cd ios
pod install
cd ..

# Run on iOS simulator
npx react-native run-ios

# Or specific device
npx react-native run-ios --device "iPhone 15 Pro"
```

### Android Setup

```bash
# Run on Android emulator
npx react-native run-android

# Or specific device
npx react-native run-android --device
```

## Option 2: Copy from Template Project

If `react-native init` causes issues in monorepo:

1. Create a temporary project outside the monorepo:
```bash
cd /tmp
npx react-native@0.73.0 init TempProject
```

2. Copy native folders:
```bash
cp -r /tmp/TempProject/ios /path/to/apps/mobile/
cp -r /tmp/TempProject/android /path/to/apps/mobile/
```

3. Update configurations (see below)

## Required Configuration Updates

### iOS: Info.plist

Add to `ios/Flamoral/Info.plist`:

```xml
<!-- Age Restriction -->
<key>LSMinimumSystemVersion</key>
<string>13.0</string>

<!-- Required Permissions -->
<key>NSCameraUsageDescription</key>
<string>Take photos to add to your profile and verify your identity</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Choose photos from your library to add to your profile</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>We use your location to show you potential matches nearby</string>

<key>NSUserNotificationsUsageDescription</key>
<string>Get notified when you have new matches and messages</string>

<!-- App Transport Security -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>
```

### Android: build.gradle

Update `android/app/build.gradle`:

```gradle
android {
    compileSdkVersion 34  // Android 14 - REQUIRED
    buildToolsVersion "34.0.0"

    defaultConfig {
        applicationId "com.flamoral"
        minSdkVersion 23      // Android 6.0
        targetSdkVersion 34   // Android 14 - REQUIRED
        versionCode 1
        versionName "1.0.0"
    }
}
```

### Android: AndroidManifest.xml

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Required Permissions -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<application
    android:name=".MainApplication"
    android:label="@string/app_name"
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:allowBackup="false"
    android:theme="@style/AppTheme"
    android:usesCleartextTraffic="false">

    <!-- Main Activity -->
    <activity
        android:name=".MainActivity"
        android:label="@string/app_name"
        android:configChanges="keyboard|keyboardHidden|orientation|screenSize|uiMode"
        android:launchMode="singleTask"
        android:windowSoftInputMode="adjustResize"
        android:exported="true">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
    </activity>
</application>
```

## App Icons and Splash Screens

### iOS
Place icons in `ios/Flamoral/Images.xcassets/AppIcon.appiconset/`

Required sizes:
- 1024x1024 (App Store)
- 180x180 (iPhone)
- 167x167 (iPad Pro)
- 152x152 (iPad)
- 120x120 (iPhone)
- 87x87 (iPhone)
- 80x80 (iPad)
- 76x76 (iPad)
- 60x60 (iPhone)
- 58x58 (iPhone)
- 40x40 (iPhone/iPad)
- 29x29 (iPhone/iPad)
- 20x20 (iPhone/iPad)

### Android
Place icons in:
- `android/app/src/main/res/mipmap-xxxhdpi/` (192x192)
- `android/app/src/main/res/mipmap-xxhdpi/` (144x144)
- `android/app/src/main/res/mipmap-xhdpi/` (96x96)
- `android/app/src/main/res/mipmap-hdpi/` (72x72)
- `android/app/src/main/res/mipmap-mdpi/` (48x48)

## Build for Production

### iOS Production Build

```bash
cd ios

# Archive build
xcodebuild -workspace Flamoral.xcworkspace \
  -scheme Flamoral \
  -configuration Release \
  -archivePath Flamoral.xcarchive \
  archive

# Upload to App Store Connect
# Use Xcode Organizer or Transporter app
```

### Android Production Build

```bash
cd android

# Generate release AAB
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

## Troubleshooting

### iOS Pod Install Fails
```bash
cd ios
pod repo update
pod install --repo-update
```

### Android Gradle Issues
```bash
cd android
./gradlew clean
./gradlew --stop
```

### Metro Bundler Issues
```bash
npx react-native start --reset-cache
```

### Linking Native Modules
Most packages auto-link with React Native 0.60+. If manual linking needed:
```bash
cd ios && pod install
```

## Next Steps After Initialization

1. **Update App Icons**: Add proper app icons for both platforms
2. **Configure Signing**: Set up code signing for iOS and Android
3. **Test on Devices**: Run on physical devices, not just simulators
4. **Setup CI/CD**: Configure automated builds
5. **App Store Preparation**: Screenshots, descriptions, metadata
6. **Submit for Review**: Follow STORE_COMPLIANCE.md checklist

## Resources

- [React Native Docs](https://reactnative.dev/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Android Design Guidelines](https://developer.android.com/design)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)

---

**Note**: Native project initialization should be done by a developer with iOS/Android development experience to ensure proper configuration.
