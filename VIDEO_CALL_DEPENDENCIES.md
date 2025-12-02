# Video Calling Dependencies

## Required NPM Packages

### Backend (User Service)

```json
{
  "dependencies": {
    "agora-access-token": "^2.0.4"
  }
}
```

**Installation:**
```bash
cd backend/services/user-service
npm install agora-access-token
```

### React Native Mobile App

```json
{
  "dependencies": {
    "react-native-agora": "^4.2.6",
    "react-native-incall-manager": "^4.1.0",
    "socket.io-client": "^4.7.2"
  }
}
```

**Installation:**
```bash
cd apps/mobile-app
npm install react-native-agora react-native-incall-manager
```

**Additional Setup for React Native:**

#### iOS
```bash
cd ios
pod install
```

Add to `ios/Podfile`:
```ruby
# Uncomment the next line to define a global platform for your project
platform :ios, '12.0'

target 'YourApp' do
  # ... other pods

  pod 'AgoraRtcEngine_iOS', '~> 4.2.6'
end
```

Add permissions to `ios/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>$(PRODUCT_NAME) needs access to your camera for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>$(PRODUCT_NAME) needs access to your microphone for calls</string>
```

#### Android

Add to `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        // Minimum SDK version for Agora
        minSdkVersion 24
    }
}
```

Add permissions to `android/app/src/main/AndroidManifest.xml`:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Agora Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />

    <!-- Optional but recommended -->
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" />
    <uses-feature android:name="android.hardware.camera.autofocus" />
</manifest>
```

Add to `android/build.gradle`:
```gradle
allprojects {
    repositories {
        // ... other repositories
        maven { url 'https://jitpack.io' }
    }
}
```

### Web App

```json
{
  "dependencies": {
    "agora-rtc-sdk-ng": "^4.20.0",
    "socket.io-client": "^4.7.2"
  }
}
```

**Installation:**
```bash
cd apps/web-app
npm install agora-rtc-sdk-ng
```

## Agora SDK Versions

| Platform | Package | Version | SDK Type |
|----------|---------|---------|----------|
| Backend | agora-access-token | 2.0.4 | Token Generator |
| React Native | react-native-agora | 4.2.6 | RTC Native |
| Web | agora-rtc-sdk-ng | 4.20.0 | RTC Web |

## Additional Utilities

### React Native Call Manager

**react-native-incall-manager** provides:
- Audio routing control
- Proximity sensor management
- Screen wake lock
- Call audio session management

### Socket.IO Client

**socket.io-client** provides:
- Real-time signaling
- Call event notifications
- Connection management

## Peer Dependencies

### React Native

The following peer dependencies are usually already installed in a React Native project:

```json
{
  "peerDependencies": {
    "react": ">=16.8.0",
    "react-native": ">=0.60.0"
  }
}
```

### Web App

```json
{
  "peerDependencies": {
    "react": ">=16.8.0",
    "react-dom": ">=16.8.0"
  }
}
```

## Optional Dependencies

### Video Processing (Future Enhancement)

```json
{
  "dependencies": {
    "@tensorflow/tfjs": "^4.11.0",
    "@tensorflow-models/body-segmentation": "^1.0.2"
  }
}
```

For features like:
- Virtual backgrounds
- Beauty filters
- Background blur

### Recording (Future Enhancement)

```json
{
  "dependencies": {
    "agora-recording-sdk": "^3.8.0"
  }
}
```

For server-side call recording.

## Environment Setup

### Agora Account Setup

1. Sign up at https://console.agora.io/
2. Create a new project
3. Get your App ID and App Certificate
4. Enable the following features:
   - RTC (Real-Time Communication)
   - Token authentication (recommended)

### Environment Variables

Add to your `.env` file:

```env
# Agora Configuration
AGORA_APP_ID=your_app_id_here
AGORA_APP_CERTIFICATE=your_app_certificate_here

# Token expiration time (seconds)
AGORA_TOKEN_EXPIRATION=3600
```

## Testing Tools

### Agora Developer Tools

1. **Agora Web Demo**: https://webdemo.agora.io/
   - Test your App ID and tokens
   - Verify channel connectivity

2. **Agora Analytics Console**: https://console.agora.io/analytics
   - Monitor call quality
   - Track usage statistics
   - Debug connection issues

3. **Agora Sample Projects**:
   - React Native: https://github.com/AgoraIO-Community/Agora-RN-Quickstart
   - Web: https://github.com/AgoraIO/API-Examples-Web

## SDK Documentation

- **Agora React Native**: https://docs.agora.io/en/video-calling/get-started/get-started-sdk?platform=react-native
- **Agora Web**: https://docs.agora.io/en/video-calling/get-started/get-started-sdk?platform=web
- **Agora Token Generator**: https://docs.agora.io/en/video-calling/develop/authentication-workflow

## Compatibility

### React Native

| Platform | Minimum Version |
|----------|----------------|
| iOS | 12.0+ |
| Android | API 24+ (Android 7.0) |
| React Native | 0.60.0+ |

### Web

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 58+ |
| Firefox | 56+ |
| Safari | 11+ |
| Edge | 79+ |

### Mobile Web

| Platform | Support |
|----------|---------|
| iOS Safari | 11+ |
| Chrome Android | 74+ |

## Build Configuration

### React Native Metro Config

Add to `metro.config.js`:

```javascript
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'],
  },
};
```

### Web Vite Config

Add to `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['agora-rtc-sdk-ng'],
  },
  server: {
    https: true, // Required for camera/microphone access
  },
});
```

## Installation Script

Create `install-video-deps.sh`:

```bash
#!/bin/bash

echo "Installing video calling dependencies..."

# Backend
echo "Installing backend dependencies..."
cd backend/services/user-service
npm install agora-access-token

# Mobile App
echo "Installing mobile app dependencies..."
cd ../../../apps/mobile-app
npm install react-native-agora react-native-incall-manager
cd ios && pod install && cd ..

# Web App
echo "Installing web app dependencies..."
cd ../web-app
npm install agora-rtc-sdk-ng

echo "Installation complete!"
```

Run with:
```bash
chmod +x install-video-deps.sh
./install-video-deps.sh
```

## Troubleshooting

### Common Issues

**1. Module not found: agora-rtc-sdk-ng**
```bash
npm install agora-rtc-sdk-ng --legacy-peer-deps
```

**2. iOS pod install fails**
```bash
cd ios
pod deintegrate
pod install --repo-update
```

**3. Android build fails**
```bash
cd android
./gradlew clean
cd ..
react-native run-android
```

**4. TypeScript errors**
```bash
npm install @types/react-native-agora --save-dev
```

## License Information

- **Agora SDK**: Free tier available (10,000 minutes/month)
- Check pricing: https://www.agora.io/en/pricing/

## Support Resources

- Agora Developer Portal: https://docs.agora.io/
- Community Forum: https://www.agora.io/en/community/
- GitHub Issues: https://github.com/AgoraIO-Community/
- Stack Overflow: Tag `agora`
