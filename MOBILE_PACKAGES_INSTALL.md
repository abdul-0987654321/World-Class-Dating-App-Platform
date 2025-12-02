# Mobile App Packages Installation Guide

## Required Packages for Video & Voice Features

This document lists all the packages that need to be installed for the video and voice features to work in the React Native mobile app.

---

## Installation Commands

Run these commands in the mobile app directory:

```bash
cd apps/mobile-app
```

### 1. Camera and Video Recording

```bash
npm install react-native-vision-camera
```

**Version**: ^3.0.0 or later

**What it does**:
- Native camera access
- Video recording
- Front/back camera switching
- High-quality video capture

**Configuration Required**:

**iOS** (`ios/YourApp/Info.plist`):
```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to record your profile video</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access to record audio with your video</string>
```

**Android** (`android/app/src/main/AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

### 2. Audio Recording and Playback

```bash
npm install react-native-audio-recorder-player
```

**Version**: ^3.6.0 or later

**What it does**:
- Audio recording
- Audio playback
- Recording duration tracking
- Amplitude/metering for waveform
- Pause/resume functionality

**Configuration Required**:

**iOS** (`ios/YourApp/Info.plist`):
```xml
<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access to record voice notes</string>
```

**Android** (`android/app/src/main/AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### 3. Permissions Management (Already Installed)

```bash
npm install react-native-permissions
```

**Version**: ^4.0.3 or later (should already be in package.json)

**What it does**:
- Request runtime permissions
- Check permission status
- Handle permission denials

### 4. Vector Icons (Already Installed)

```bash
npm install react-native-vector-icons
```

**Version**: ^10.0.2 or later (should already be in package.json)

**What it does**:
- Material Community Icons
- UI icons for buttons and controls

### 5. File System Access (Optional, but Recommended)

```bash
npm install react-native-fs
```

**Version**: ^2.20.0 or later

**What it does**:
- Access device file system
- Save recorded files
- Read file metadata

---

## iOS Setup

After installing packages, run:

```bash
cd ios
pod install
cd ..
```

### Update Info.plist

Add all required permissions to `ios/YourApp/Info.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- Existing keys... -->

  <!-- Camera Permission -->
  <key>NSCameraUsageDescription</key>
  <string>Flamoral needs access to your camera to record profile videos and video prompts.</string>

  <!-- Microphone Permission -->
  <key>NSMicrophoneUsageDescription</key>
  <string>Flamoral needs access to your microphone to record audio with videos and voice notes.</string>

  <!-- Photo Library (if saving videos to library) -->
  <key>NSPhotoLibraryUsageDescription</key>
  <string>Flamoral needs access to your photo library to save videos.</string>

  <key>NSPhotoLibraryAddUsageDescription</key>
  <string>Flamoral needs permission to save videos to your photo library.</string>
</dict>
</plist>
```

---

## Android Setup

### Update AndroidManifest.xml

Add all required permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
  package="com.flamoral">

  <!-- Permissions -->
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.RECORD_AUDIO" />
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

  <!-- Camera features -->
  <uses-feature android:name="android.hardware.camera" android:required="false" />
  <uses-feature android:name="android.hardware.camera.front" android:required="false" />
  <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

  <!-- Microphone feature -->
  <uses-feature android:name="android.hardware.microphone" android:required="false" />

  <application
    android:name=".MainApplication"
    android:label="@string/app_name"
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:allowBackup="false"
    android:theme="@style/AppTheme">
    <!-- Existing configuration... -->
  </application>

</manifest>
```

### Update build.gradle (if needed)

If you encounter issues, you may need to update `android/app/build.gradle`:

```gradle
android {
    compileSdkVersion 33 // or higher

    defaultConfig {
        minSdkVersion 24 // At least 24 for camera2 API
        targetSdkVersion 33 // or higher
    }
}
```

---

## Post-Installation Steps

### 1. Rebuild the App

**iOS**:
```bash
cd ios
pod install
cd ..
npx react-native run-ios
```

**Android**:
```bash
npx react-native run-android
```

### 2. Clean Build (if issues occur)

**iOS**:
```bash
cd ios
rm -rf Pods
rm -rf build
pod install
cd ..
npx react-native run-ios
```

**Android**:
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### 3. Update Code

After installing packages, **uncomment** the production code in:

- `apps/mobile-app/src/components/media/VideoRecorder.tsx`
- `apps/mobile-app/src/components/media/VoiceRecorder.tsx`
- `apps/mobile-app/src/components/media/VoicePlayer.tsx`

Look for comments like:
```typescript
// Uncomment when react-native-vision-camera is installed:
// import { Camera, useCameraDevices } from 'react-native-vision-camera';
```

---

## Updated package.json

After installation, your `apps/mobile-app/package.json` should include:

```json
{
  "name": "@flamoral/mobile",
  "version": "1.0.0",
  "dependencies": {
    "@react-native-async-storage/async-storage": "^1.21.0",
    "@react-native-community/geolocation": "^3.2.1",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "@reduxjs/toolkit": "^2.0.1",
    "react": "18.2.0",
    "react-native": "0.73.0",
    "react-native-audio-recorder-player": "^3.6.0",
    "react-native-fast-image": "^8.6.3",
    "react-native-fs": "^2.20.0",
    "react-native-gesture-handler": "^2.14.0",
    "react-native-image-picker": "^7.1.0",
    "react-native-permissions": "^4.0.3",
    "react-native-reanimated": "^3.6.0",
    "react-native-safe-area-context": "^4.8.0",
    "react-native-screens": "^3.29.0",
    "react-native-vector-icons": "^10.0.2",
    "react-native-vision-camera": "^3.0.0",
    "react-redux": "^9.0.2",
    "redux-persist": "^6.0.0",
    "socket.io-client": "^4.7.2"
  }
}
```

---

## Verification

### Test Camera Access

```typescript
import { Camera } from 'react-native-vision-camera';

async function checkCameraPermission() {
  const cameraPermission = await Camera.getCameraPermissionStatus();
  const microphonePermission = await Camera.getMicrophonePermissionStatus();

  console.log('Camera:', cameraPermission);
  console.log('Microphone:', microphonePermission);

  if (cameraPermission !== 'granted') {
    await Camera.requestCameraPermission();
  }

  if (microphonePermission !== 'granted') {
    await Camera.requestMicrophonePermission();
  }
}
```

### Test Audio Recording

```typescript
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

const audioRecorderPlayer = new AudioRecorderPlayer();

async function testRecording() {
  const result = await audioRecorderPlayer.startRecorder();
  console.log('Recording started:', result);

  setTimeout(async () => {
    const result = await audioRecorderPlayer.stopRecorder();
    console.log('Recording stopped:', result);
  }, 3000);
}
```

---

## Troubleshooting

### Issue: "Camera not found" or "undefined"
**Solution**:
- Ensure `react-native-vision-camera` is installed
- Run `pod install` on iOS
- Rebuild the app completely
- Check that permissions are granted

### Issue: "Microphone permission denied"
**Solution**:
- Check Info.plist (iOS) or AndroidManifest.xml (Android) has permission declarations
- Request permissions at runtime
- Check device settings

### Issue: Build fails after installing packages
**Solution**:
```bash
# Clean everything
cd ios
rm -rf Pods Podfile.lock build
pod install
cd ..

cd android
./gradlew clean
cd ..

# Rebuild
npx react-native run-ios
# or
npx react-native run-android
```

### Issue: "Duplicate symbols" or linking errors
**Solution**:
- Check for duplicate packages in package.json
- Run `npm dedupe`
- Clear watchman: `watchman watch-del-all`
- Clear metro cache: `npx react-native start --reset-cache`

---

## Testing Checklist

After installation, test these features:

- [ ] Open camera
- [ ] Switch between front/back camera
- [ ] Record video (at least 5 seconds)
- [ ] Preview recorded video
- [ ] Upload video
- [ ] Record voice note
- [ ] Preview voice note
- [ ] Upload voice note
- [ ] Play uploaded video
- [ ] Play uploaded voice note
- [ ] Handle permission denials gracefully
- [ ] Test on both iOS and Android

---

## Additional Resources

### Documentation
- [react-native-vision-camera docs](https://react-native-vision-camera.com/)
- [react-native-audio-recorder-player docs](https://github.com/hyochan/react-native-audio-recorder-player)
- [react-native-permissions docs](https://github.com/zoontek/react-native-permissions)

### Example Implementations
- See `apps/mobile-app/src/components/media/VideoRecorder.tsx` for camera usage
- See `apps/mobile-app/src/components/media/VoiceRecorder.tsx` for audio usage

---

## Quick Command Summary

```bash
# Install all packages
cd apps/mobile-app
npm install react-native-vision-camera
npm install react-native-audio-recorder-player
npm install react-native-fs

# iOS setup
cd ios
pod install
cd ..

# Rebuild
npx react-native run-ios
# or
npx react-native run-android
```

---

**Last Updated**: January 1, 2025
**Version**: 1.0.0
