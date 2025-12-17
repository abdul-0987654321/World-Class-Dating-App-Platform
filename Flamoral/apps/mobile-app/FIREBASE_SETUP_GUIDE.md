# Firebase Setup Guide for Flamoral Mobile App

## Overview

This guide will walk you through setting up Firebase for the Flamoral mobile app, including Cloud Messaging for push notifications, Analytics, and Crashlytics.

## Prerequisites

- Firebase account (Google account)
- Xcode 14+ (for iOS)
- Android Studio (for Android)
- Access to Apple Developer account (for iOS push notifications)
- Access to Google Play Console (for Android)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: **Flamoral**
4. Enable Google Analytics (recommended)
5. Select or create a Google Analytics account
6. Click "Create project"

## Step 2: Add iOS App

### 2.1 Register iOS App

1. In Firebase console, click "Add app" and select iOS
2. Enter iOS bundle ID: `com.flamoral`
3. Enter App nickname: **Flamoral iOS**
4. Enter App Store ID (if available)
5. Click "Register app"

### 2.2 Download GoogleService-Info.plist

1. Download `GoogleService-Info.plist`
2. Move file to `apps/mobile-app/ios/FlavoralApp/`
3. Open Xcode workspace: `ios/FlavoralApp.xcworkspace`
4. Drag `GoogleService-Info.plist` into the project
5. Ensure "Copy items if needed" is checked
6. Ensure it's added to the FlavoralApp target

### 2.3 Configure iOS in Xcode

#### Enable Required Capabilities

1. Open project in Xcode
2. Select the target "FlavoralApp"
3. Go to "Signing & Capabilities"
4. Add these capabilities:
   - **Push Notifications**
   - **Background Modes** (enable "Remote notifications")

#### Install Firebase SDK

The Firebase SDK is already added to `package.json`. Run:

```bash
cd ios
pod install
cd ..
```

### 2.4 Upload APNs Certificate

#### Option A: APNs Authentication Key (Recommended)

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Select "Keys"
4. Click "+" to create a new key
5. Enter key name: **Flamoral APNs Key**
6. Enable "Apple Push Notifications service (APNs)"
7. Click "Continue" and "Register"
8. Download the `.p8` file (save it securely!)
9. Note the Key ID

Upload to Firebase:
1. Go to Firebase Console > Project Settings > Cloud Messaging
2. Under "Apple app configuration" section
3. Upload APNs Authentication Key (.p8 file)
4. Enter Key ID
5. Enter Team ID (from Apple Developer account)
6. Click "Upload"

#### Option B: APNs Certificate (Legacy)

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Create a new certificate
4. Select "Apple Push Notification service SSL"
5. Select your App ID (`com.flamoral`)
6. Generate Certificate Signing Request (CSR) from Keychain Access
7. Upload CSR and download certificate
8. Double-click to install in Keychain
9. Export as `.p12` file

Upload to Firebase:
1. Go to Firebase Console > Project Settings > Cloud Messaging
2. Under "Apple app configuration" section
3. Upload APNs certificate (.p12 file)
4. Enter certificate password
5. Click "Upload"

## Step 3: Add Android App

### 3.1 Register Android App

1. In Firebase console, click "Add app" and select Android
2. Enter Android package name: `com.flamoral.app`
3. Enter App nickname: **Flamoral Android**
4. Enter SHA-1 (optional but recommended for App Check)
   ```bash
   cd android
   ./gradlew signingReport
   # Copy SHA-1 from debug or release
   ```
5. Click "Register app"

### 3.2 Download google-services.json

1. Download `google-services.json`
2. Move file to `apps/mobile-app/android/app/`

### 3.3 Configure Android Build Files

#### Project-level build.gradle

File: `android/build.gradle`

```gradle
buildscript {
    ext {
        buildToolsVersion = "34.0.0"
        minSdkVersion = 23
        compileSdkVersion = 34
        targetSdkVersion = 34
        ndkVersion = "25.1.8937393"
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.1.0")
        classpath("com.google.gms:google-services:4.4.0")  // Add this
    }
}
```

#### App-level build.gradle

File: `android/app/build.gradle`

Add at the bottom:
```gradle
apply plugin: 'com.google.gms.google-services'
```

Add Firebase dependencies:
```gradle
dependencies {
    // Firebase
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
    implementation 'com.google.firebase:firebase-analytics'
    implementation 'com.google.firebase:firebase-crashlytics'

    // Existing dependencies...
}
```

### 3.4 Update AndroidManifest.xml

The manifest is already configured, but verify these entries exist:

```xml
<!-- Firebase Cloud Messaging -->
<service
    android:name="com.google.firebase.messaging.FirebaseMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>

<!-- Default notification channel -->
<meta-data
    android:name="com.google.firebase.messaging.default_notification_channel_id"
    android:value="default" />
```

## Step 4: Enable Cloud Messaging

### 4.1 Enable FCM API

1. Go to Firebase Console > Project Settings
2. Select "Cloud Messaging" tab
3. Note the Server Key and Sender ID

### 4.2 Configure Server Key

The backend will need the Firebase Server Key to send notifications:

1. Go to Firebase Console > Project Settings > Cloud Messaging
2. Under "Project credentials" section
3. Copy "Server key"
4. Add to backend environment variables:
   ```env
   FIREBASE_SERVER_KEY=your_server_key_here
   ```

## Step 5: Configure Analytics (Optional but Recommended)

### 5.1 Enable Google Analytics

Already enabled during project creation.

### 5.2 Configure Events

Add custom events in your code:

```typescript
import analytics from '@react-native-firebase/analytics';

// Log events
await analytics().logEvent('profile_view', {
  user_id: userId,
  profile_id: profileId,
});

await analytics().logEvent('match_created', {
  user_id: userId,
  matched_user_id: matchedUserId,
});
```

### 5.3 Set User Properties

```typescript
await analytics().setUserId(userId);
await analytics().setUserProperty('subscription_tier', 'premium');
```

## Step 6: Configure Crashlytics (Recommended)

### 6.1 Enable Crashlytics

1. Go to Firebase Console
2. Navigate to Crashlytics
3. Click "Enable Crashlytics"

### 6.2 iOS Configuration

Add to `ios/Podfile`:
```ruby
pod 'Firebase/Crashlytics'
```

Run:
```bash
cd ios
pod install
cd ..
```

### 6.3 Android Configuration

Already configured in build.gradle from Step 3.3.

### 6.4 Test Crashlytics

```typescript
import crashlytics from '@react-native-firebase/crashlytics';

// Force a crash to test
crashlytics().crash();

// Log errors
crashlytics().recordError(error);

// Log custom messages
crashlytics().log('User performed action');
```

## Step 7: Test Firebase Integration

### 7.1 Test on iOS

1. Run the app:
   ```bash
   npm run ios
   ```

2. Check Xcode console for Firebase initialization:
   ```
   [Firebase/Core][I-COR000001] Configuring the default app.
   ```

3. Test push notification:
   - Go to Firebase Console > Cloud Messaging
   - Select "Send your first message"
   - Enter notification title and text
   - Click "Send test message"
   - Enter your FCM token (logged in app console)
   - Click "Test"

### 7.2 Test on Android

1. Run the app:
   ```bash
   npm run android
   ```

2. Check Logcat for Firebase initialization:
   ```
   D/FirebaseApp: Initialized Firebase
   ```

3. Test push notification same as iOS steps above

## Step 8: Configure Notification Channels (Android)

Already implemented in `src/services/notifications/NotificationService.ts`:

```typescript
const channels = [
  {
    id: 'default',
    name: 'General Notifications',
    importance: AndroidImportance.HIGH,
  },
  {
    id: 'messages',
    name: 'Messages',
    importance: AndroidImportance.HIGH,
  },
  {
    id: 'matches',
    name: 'Matches',
    importance: AndroidImportance.HIGH,
  },
  {
    id: 'calls',
    name: 'Video Calls',
    importance: AndroidImportance.HIGH,
  },
  {
    id: 'social',
    name: 'Likes & Views',
    importance: AndroidImportance.DEFAULT,
  },
];
```

## Step 9: Environment-Specific Configuration

### Development Environment

Use separate Firebase projects for dev/staging/prod:

1. Create `GoogleService-Info-Dev.plist` for development
2. Create `google-services-dev.json` for development
3. Use build schemes (iOS) and product flavors (Android) to switch configs

### iOS Build Schemes

In Xcode:
1. Product > Scheme > Manage Schemes
2. Duplicate scheme for "Development"
3. Add Run Script phase to copy correct plist:
   ```bash
   if [ "${CONFIGURATION}" == "Debug" ]; then
     cp "${PROJECT_DIR}/FlavoralApp/GoogleService-Info-Dev.plist" "${PROJECT_DIR}/FlavoralApp/GoogleService-Info.plist"
   fi
   ```

### Android Product Flavors

In `android/app/build.gradle`:
```gradle
flavorDimensions "environment"
productFlavors {
    development {
        dimension "environment"
        applicationIdSuffix ".dev"
    }
    production {
        dimension "environment"
    }
}
```

Create folders:
- `android/app/src/development/` with `google-services.json`
- `android/app/src/production/` with `google-services.json`

## Step 10: Backend Integration

### 10.1 Send Notifications from Backend

Backend should use Firebase Admin SDK:

```typescript
import admin from 'firebase-admin';

// Initialize
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Send notification
await admin.messaging().send({
  token: deviceToken,
  notification: {
    title: 'New Match!',
    body: 'You matched with Sarah!',
  },
  data: {
    type: 'new_match',
    matchId: '123',
    userId: '456',
  },
  apns: {
    payload: {
      aps: {
        sound: 'match_sound.wav',
        badge: 1,
      },
    },
  },
  android: {
    priority: 'high',
    notification: {
      channelId: 'matches',
      sound: 'match_sound',
    },
  },
});
```

### 10.2 Verify Tokens

Backend should verify device tokens are valid and remove invalid ones.

## Step 11: Testing Checklist

- [ ] iOS app receives foreground notifications
- [ ] iOS app receives background notifications
- [ ] iOS app receives notifications when quit
- [ ] iOS badge count updates correctly
- [ ] iOS notification sound plays
- [ ] Android app receives foreground notifications
- [ ] Android app receives background notifications
- [ ] Android app receives notifications when quit
- [ ] Android notification channels work
- [ ] Android notification sound plays
- [ ] Deep links work from notifications (both platforms)
- [ ] Analytics events are logged
- [ ] Crashlytics reports crashes
- [ ] Token refresh is handled correctly

## Troubleshooting

### Issue: Notifications not received on iOS

**Solutions:**
- Verify APNs certificate/key is uploaded to Firebase
- Check that Push Notifications capability is enabled in Xcode
- Verify device token is being registered with backend
- Test with Firebase Console's "Send test message"
- Check that app is not in Do Not Disturb mode

### Issue: Notifications not received on Android

**Solutions:**
- Verify `google-services.json` is in correct location
- Check that Firebase dependencies are added
- Verify notification channels are created
- Test with Firebase Console's "Send test message"
- Check device battery optimization settings

### Issue: Firebase not initializing

**Solutions:**
- Verify GoogleService-Info.plist (iOS) is in project
- Verify google-services.json (Android) is in app folder
- Clean and rebuild project
- Check bundle identifier/package name matches Firebase console

### Issue: Token not registering

**Solutions:**
- Check internet connection
- Verify permissions are granted
- Check Firebase initialization logs
- Restart app

## Production Checklist

Before going to production:

- [ ] Create production Firebase project (separate from dev)
- [ ] Upload production APNs certificate
- [ ] Configure production `google-services.json`
- [ ] Enable App Check for security
- [ ] Set up Firebase alerts for errors
- [ ] Configure data retention policies (GDPR compliance)
- [ ] Set up monitoring dashboards
- [ ] Test notification delivery rates
- [ ] Verify analytics data collection
- [ ] Configure Crashlytics properly
- [ ] Set up budget alerts for Firebase usage

## Security Best Practices

1. **Never commit Firebase config files to public repos**
   - Add to `.gitignore`:
     ```
     ios/GoogleService-Info.plist
     android/app/google-services.json
     ```

2. **Use App Check** to prevent unauthorized access

3. **Implement token rotation** for security

4. **Use Firebase Security Rules** for Firestore/Storage if used

5. **Monitor for suspicious activity** in Firebase Console

## Monitoring & Analytics

### Set Up Dashboards

1. Go to Firebase Console > Analytics
2. Create custom dashboards for:
   - Daily Active Users (DAU)
   - Push notification engagement
   - Crash-free users percentage
   - Key user flows

### Set Up Alerts

1. Go to Firebase Console > Alerts
2. Set up alerts for:
   - Crash rate increase
   - Notification delivery failures
   - Performance degradation

## Cost Management

Firebase has generous free tier, but monitor usage:

- Cloud Messaging: Free
- Analytics: Free
- Crashlytics: Free
- Cloud Functions: Pay as you go
- Firestore/Storage: Pay as you go

Set up budget alerts in Google Cloud Console.

## Support Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Firebase](https://rnfirebase.io/)
- [Firebase Support](https://firebase.google.com/support)
- [Stack Overflow - Firebase](https://stackoverflow.com/questions/tagged/firebase)

## Next Steps

After completing Firebase setup:

1. Test all notification scenarios
2. Verify analytics tracking
3. Test crash reporting
4. Configure backend to send notifications
5. Set up monitoring and alerts
6. Document team processes for Firebase access

Your Firebase integration is now complete! 🎉
