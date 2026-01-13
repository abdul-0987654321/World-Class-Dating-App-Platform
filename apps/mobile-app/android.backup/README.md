# Flamoral Android App

## Quick Start

### Development Build

```bash
# Install dependencies
cd ../..
npm install

# Start Metro bundler
npm start

# In another terminal, run Android
cd apps/mobile-app
npx react-native run-android
```

### Release Build

```bash
# Build signed AAB for Play Store
cd android
./gradlew bundleRelease

# Output: app/build/outputs/bundle/release/app-release.aab
```

### Using Fastlane

```bash
cd android

# Build release bundle
fastlane build_bundle

# Deploy to Play Store internal track
fastlane deploy_internal
```

## Project Structure

```
android/
├── app/
│   ├── build.gradle              # App-level build config
│   ├── proguard-rules.pro        # Code obfuscation rules
│   └── src/main/
│       ├── AndroidManifest.xml   # App manifest
│       ├── java/                 # Java/Kotlin source
│       └── res/                  # Resources
│
├── fastlane/
│   ├── Fastfile                  # Deployment automation
│   ├── Appfile                   # Fastlane config
│   └── metadata/                 # Play Store metadata
│
├── build.gradle                  # Root build config
├── gradle.properties             # Gradle settings
└── settings.gradle              # Project settings
```

## Configuration Files

### Build Configuration
- **build.gradle** - Root and app-level build configuration
- **gradle.properties** - Build properties and optimization settings
- **proguard-rules.pro** - Code obfuscation and optimization rules

### Signing
- **release.keystore** - Release signing key (DO NOT commit!)
- **keystore.properties** - Signing credentials (DO NOT commit!)
- See [SIGNING_CONFIGURATION.md](SIGNING_CONFIGURATION.md)

### Deployment
- **fastlane/** - Automated build and deployment
- See [fastlane/README.md](fastlane/README.md)

## Important Links

### Documentation
- [Play Store Preparation](../play-store/PLAY_STORE_PREPARATION.md)
- [Submission Checklist](../play-store/SUBMISSION_CHECKLIST.md)
- [Signing Configuration](SIGNING_CONFIGURATION.md)
- [Fastlane Guide](fastlane/README.md)

### External
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Android Developer](https://developer.android.com/)
- [Google Play Console](https://play.google.com/console)

## Environment Variables

### For Release Builds

```bash
export FLAMORAL_UPLOAD_STORE_FILE="/path/to/release.keystore"
export FLAMORAL_UPLOAD_STORE_PASSWORD="your_keystore_password"
export FLAMORAL_UPLOAD_KEY_ALIAS="flamoral-release"
export FLAMORAL_UPLOAD_KEY_PASSWORD="your_key_password"
```

### For Fastlane

```bash
export SUPPLY_JSON_KEY="/path/to/service-account.json"
```

## Common Commands

```bash
# Clean build
./gradlew clean

# Build debug
./gradlew assembleDebug

# Build release
./gradlew assembleRelease

# Build release bundle (for Play Store)
./gradlew bundleRelease

# Install debug on device
./gradlew installDebug

# Run tests
./gradlew test

# Run lint
./gradlew lint
```

## Gradle Tasks

```bash
# List all tasks
./gradlew tasks

# List all build variants
./gradlew tasks --all | grep assemble
```

## Version Management

Edit `app/build.gradle`:

```gradle
defaultConfig {
    versionCode 1      // Increment for each release
    versionName "1.0.0" // User-facing version
}
```

## Troubleshooting

### Build fails with "SDK location not found"

Create `local.properties`:
```properties
sdk.dir=/path/to/Android/sdk
```

### Signing errors

Verify keystore configuration:
```bash
keytool -list -v -keystore release.keystore
```

### Metro bundler issues

```bash
# Clear cache
npx react-native start --reset-cache
```

### Gradle daemon issues

```bash
./gradlew --stop
./gradlew clean
```

## Support

- **Email:** developer@flamoral.com
- **Issues:** GitHub Issues
- **Documentation:** See `/docs` directory

---

**Package Name:** com.flamoral.app
**Min SDK:** 23 (Android 6.0)
**Target SDK:** 34 (Android 14)
