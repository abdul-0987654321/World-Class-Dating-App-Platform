# Push Notification Integration - Complete Setup Guide

This guide covers the complete setup for push notifications in the Flamoral dating app, including Firebase Cloud Messaging (FCM) for Android/Web and Apple Push Notification Service (APNs) for iOS.

## Table of Contents
- [Overview](#overview)
- [Backend Setup](#backend-setup)
- [Mobile App Setup](#mobile-app-setup)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Overview

### Features Implemented
- ✅ Firebase Cloud Messaging (FCM) for Android and Web
- ✅ Apple Push Notification Service (APNs) for iOS
- ✅ Multi-device support
- ✅ Notification templates with i18n (multiple languages)
- ✅ Quiet hours with timezone awareness
- ✅ Deep linking from notifications
- ✅ Badge count management
- ✅ Foreground and background notification handling
- ✅ Notification history
- ✅ Rich notifications with images
- ✅ 10 notification types (matches, messages, likes, etc.)

### Notification Types
1. **NEW_MATCH** - When two users match
2. **NEW_MESSAGE** - New chat message
3. **SUPER_LIKE** - Someone super liked you
4. **PROFILE_VIEW** - Someone viewed your profile
5. **MATCH_EXPIRING** - Match about to expire
6. **DAILY_PICKS** - Daily recommended profiles
7. **BOOST_ACTIVATED** - Profile boost started
8. **SUBSCRIPTION_EXPIRING** - Premium subscription ending soon
9. **VIDEO_CALL_INCOMING** - Incoming video call
10. **ACHIEVEMENT_UNLOCKED** - Gamification achievement

## Backend Setup

### 1. Firebase Setup

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Add Android and iOS apps to your project

#### Get Service Account Key
1. In Firebase Console, go to **Project Settings** > **Service Accounts**
2. Click **Generate New Private Key**
3. Save the JSON file as `firebase-service-account.json`
4. Place it in `backend/services/notification-service/config/`

#### Configure FCM
1. In Firebase Console, go to **Cloud Messaging**
2. Note your **Server Key** and **Sender ID**
3. For Android: Download `google-services.json`
4. For iOS: Download `GoogleService-Info.plist`

### 2. Apple APNs Setup

#### Generate APNs Authentication Key (JWT - Recommended)
1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Click **+** to create a new key
3. Select **Apple Push Notifications service (APNs)**
4. Download the `.p8` file (e.g., `AuthKey_XXXXXXXXXX.p8`)
5. Note your **Key ID** and **Team ID**
6. Place the `.p8` file in `backend/services/notification-service/config/`

#### Alternative: Certificate-based Authentication (Legacy)
If you prefer certificates over JWT:
1. Create a Certificate Signing Request (CSR) on your Mac
2. Upload to Apple Developer Portal
3. Download the APNs certificate
4. Convert to `.pem` format
5. Place in config directory

### 3. Backend Environment Variables

Create/update `.env` file in `backend/services/notification-service/`:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json

# FCM
FCM_ENABLED=true
FCM_SERVER_KEY=your-fcm-server-key
FCM_SENDER_ID=your-sender-id

# APNs
APNS_ENABLED=true
APNS_PRODUCTION=false  # Set to true for production
APNS_KEY_ID=your-apns-key-id
APNS_TEAM_ID=your-team-id
APNS_KEY_PATH=./config/AuthKey_XXXXXXXXXX.p8
APNS_BUNDLE_ID=com.flamoral.app

# Notification Settings
DEFAULT_NOTIFICATION_LANGUAGE=en
NOTIFICATION_BATCH_SIZE=500
```

### 4. Database Migration

Run the notification service migrations:

```bash
cd backend/services/notification-service
npm run migrate
```

This creates the following tables:
- `notifications` - Notification history
- `notification_preferences` - User preferences
- `notification_templates` - Template system
- `user_devices` - Device token management

### 5. Start Notification Service

```bash
cd backend/services/notification-service
npm install
npm run dev
```

The service will be available at `http://localhost:3008`

## Mobile App Setup

### 1. Install Dependencies

```bash
cd apps/mobile-app
npm install
```

Required packages:
- `@react-native-firebase/app`
- `@react-native-firebase/messaging`
- `@notifee/react-native`
- `@react-native-async-storage/async-storage`

### 2. iOS Setup

#### Install Pods
```bash
cd ios
pod install
cd ..
```

#### Configure Xcode
1. Open `ios/FlavoralApp.xcworkspace` in Xcode
2. Add `GoogleService-Info.plist` to the project
3. Enable **Push Notifications** capability
4. Enable **Background Modes**: Remote notifications
5. Set your bundle identifier to match APNs certificate

#### Update AppDelegate
The notification handling is already configured in the app.

### 3. Android Setup

#### Add Google Services
1. Place `google-services.json` in `android/app/`

#### Update build.gradle
Add to `android/build.gradle`:
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

Add to `android/app/build.gradle`:
```gradle
apply plugin: 'com.google.gms.google-services'
```

#### Notification Icons
Place notification icons in `android/app/src/main/res/`:
- `drawable/ic_notification.png` (white icon for notification tray)
- `values/colors.xml` with notification color

### 4. Initialize in App

Update `App.tsx`:

```tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { NotificationProvider } from './src/services/notifications/NotificationHandler';
import { navigationRef } from './src/navigation/NavigationService';
import deepLinkHandler from './src/services/notifications/DeepLinkHandler';
import notificationService from './src/services/notifications/NotificationService';

function App() {
  useEffect(() => {
    // Initialize notification service
    notificationService.initialize();

    // Initialize deep link handler
    deepLinkHandler.initialize();

    return () => {
      deepLinkHandler.cleanup();
    };
  }, []);

  return (
    <NotificationProvider>
      <NavigationContainer ref={navigationRef}>
        {/* Your app screens */}
      </NavigationContainer>
    </NotificationProvider>
  );
}

export default App;
```

### 5. Request Permissions

In your settings or onboarding screen:

```tsx
import { useNotifications } from '../services/notifications/NotificationHandler';

function SettingsScreen() {
  const { hasPermission, requestPermissions } = useNotifications();

  const handleEnableNotifications = async () => {
    const granted = await requestPermissions();
    if (granted) {
      console.log('Notifications enabled!');
    }
  };

  return (
    <Button
      title="Enable Notifications"
      onPress={handleEnableNotifications}
      disabled={hasPermission}
    />
  );
}
```

## Testing

### 1. Test Device Registration

Start the mobile app and check backend logs for device registration:

```
Device token registered with backend
FCM Token: fXXXXXXXXXXXXXXXXXXX...
```

### 2. Send Test Notification

Using the backend API:

```bash
curl -X POST http://localhost:3008/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "user-123",
    "type": "new_match",
    "channels": ["push"],
    "title": "Test Match",
    "body": "You matched with Test User!",
    "priority": "high"
  }'
```

### 3. Test Notification Types

Test each notification type:

```javascript
// New Match
POST /api/notifications/send
{
  "userId": "user-123",
  "type": "new_match",
  "channels": ["push", "in_app"],
  "title": "It's a Match!",
  "body": "You and Sarah liked each other!",
  "imageUrl": "https://...",
  "data": {
    "matchUserId": "user-456",
    "matchUserName": "Sarah"
  }
}

// New Message
POST /api/notifications/send
{
  "userId": "user-123",
  "type": "new_message",
  "channels": ["push"],
  "title": "Sarah",
  "body": "Hey! How are you?",
  "data": {
    "senderId": "user-456",
    "chatId": "chat-789"
  }
}
```

### 4. Test Quiet Hours

Set quiet hours for a user:

```bash
curl -X PUT http://localhost:3008/api/notifications/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "quietHoursEnabled": true,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "08:00",
    "timezone": "America/New_York"
  }'
```

### 5. Test Deep Links

Send a notification with deep link:

```json
{
  "userId": "user-123",
  "type": "new_match",
  "channels": ["push"],
  "title": "New Match",
  "body": "Check out your match!",
  "actionUrl": "/chat/user-456"
}
```

When tapped, should navigate to chat screen with user-456.

## API Endpoints

### Device Management
- `POST /api/devices/register` - Register device token
- `DELETE /api/devices/unregister` - Unregister device
- `GET /api/devices` - Get user's devices
- `PUT /api/devices/ping` - Update device last active

### Notifications
- `POST /api/notifications/send` - Send notification
- `GET /api/notifications` - Get notification history
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/mark-all-read` - Mark all as read
- `GET /api/notifications/unread-count` - Get unread count

### Preferences
- `GET /api/notifications/preferences` - Get user preferences
- `PUT /api/notifications/preferences` - Update preferences

## Troubleshooting

### iOS Not Receiving Notifications

1. **Check APNs Configuration**
   - Verify Key ID, Team ID, and Bundle ID are correct
   - Ensure `.p8` file is readable
   - Check production vs development setting

2. **Check Device Token**
   - Ensure token starts with correct characters for environment
   - Verify device is registered in backend

3. **Check Capabilities**
   - Push Notifications enabled in Xcode
   - Background Modes > Remote notifications enabled

### Android Not Receiving Notifications

1. **Check FCM Configuration**
   - Verify `google-services.json` is in correct location
   - Check package name matches Firebase project
   - Ensure FCM is enabled in Firebase Console

2. **Check Notification Channels**
   - Channels are created on app start
   - Check Android notification settings

3. **Check Device Token**
   - Token should start with specific prefix for FCM
   - Verify registration in backend logs

### Notifications Not Appearing in Foreground

- Check `NotificationService.ts` foreground handler
- Verify Notifee is properly configured
- Check notification channel importance (Android)

### Deep Links Not Working

- Verify URL scheme in AndroidManifest.xml and Info.plist
- Check deep link parsing in `DeepLinkHandler.ts`
- Test with `adb shell am start -a android.intent.action.VIEW -d "flamoral://chat/user-123"`

### Badge Count Issues (iOS)

- Badge updates require active APNs connection
- Check `updateBadgeCount()` calls
- Verify unread count API is working

## Production Checklist

- [ ] Set `APNS_PRODUCTION=true` for iOS
- [ ] Use production FCM server key
- [ ] Set appropriate quiet hours defaults
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging
- [ ] Test notification delivery rates
- [ ] Implement retry logic for failed notifications
- [ ] Set up analytics for notification engagement
- [ ] Configure notification templates for all languages
- [ ] Test with different timezones
- [ ] Verify deep links work for all notification types
- [ ] Test multi-device scenarios
- [ ] Set up alerts for high failure rates

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications)
- [React Native Firebase](https://rnfirebase.io/)
- [Notifee Documentation](https://notifee.app/)

## Support

For issues or questions, please refer to:
- Backend: `backend/services/notification-service/`
- Mobile: `apps/mobile-app/src/services/notifications/`
- API Documentation: `http://localhost:3008/api-docs`
