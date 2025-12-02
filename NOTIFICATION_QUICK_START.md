# Push Notifications - Quick Start Guide

## 5-Minute Setup

### Backend Setup

1. **Install Dependencies** (already in package.json):
```bash
cd backend/services/notification-service
npm install
```

2. **Configure Firebase:**
   - Download `firebase-service-account.json` from Firebase Console
   - Place in `backend/services/notification-service/config/`

3. **Configure APNs:**
   - Download `AuthKey_XXXXXXXXXX.p8` from Apple Developer
   - Place in `backend/services/notification-service/config/`

4. **Update .env:**
```env
# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json

# APNs
APNS_KEY_ID=ABC123XYZ
APNS_TEAM_ID=DEF456UVW
APNS_KEY_PATH=./config/AuthKey_ABC123XYZ.p8
APNS_BUNDLE_ID=com.flamoral.app
```

5. **Start Service:**
```bash
npm run dev
```

### Mobile App Setup

1. **Install Dependencies:**
```bash
cd apps/mobile-app
npm install
```

Required packages:
- @react-native-firebase/app
- @react-native-firebase/messaging
- @notifee/react-native
- @react-native-async-storage/async-storage

2. **iOS Setup:**
```bash
cd ios && pod install && cd ..
```
- Add `GoogleService-Info.plist` to `ios/FlavoralApp/`
- Enable Push Notifications in Xcode capabilities

3. **Android Setup:**
- Add `google-services.json` to `android/app/`

4. **Initialize in App.tsx:**
```typescript
import notificationService from './src/services/notifications/NotificationService';
import deepLinkHandler from './src/services/notifications/DeepLinkHandler';

useEffect(() => {
  notificationService.initialize();
  deepLinkHandler.initialize();
}, []);
```

## Send Your First Notification

### Via API:
```bash
curl -X POST http://localhost:3008/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "user-123",
    "type": "new_match",
    "channels": ["push"],
    "title": "Its a Match!",
    "body": "You and Sarah liked each other!",
    "priority": "high"
  }'
```

### Via Code:
```typescript
import { notificationService } from './services/notification.service';

await notificationService.notifyNewMatch(
  'user-123',
  'user-456',
  'Sarah',
  'https://example.com/photo.jpg'
);
```

## Test Notifications

### 1. Register Device
Open mobile app → Device auto-registers on launch

### 2. Check Backend Logs
Look for: `Device token registered with backend`

### 3. Send Test
Use the API call above with a valid user ID

### 4. Verify Receipt
- iOS: Check notification center
- Android: Check notification tray

## Common Issues

### Not Receiving Notifications?

**iOS:**
- Check Xcode: Push Notifications capability enabled?
- Verify: Bundle ID matches APNs certificate
- Test: Device token registered in backend?

**Android:**
- Check: `google-services.json` in correct location?
- Verify: Package name matches Firebase project
- Test: FCM enabled in Firebase Console?

### Deep Links Not Working?

**iOS:**
- Add URL scheme to Info.plist ✓ (already done)
- Configure associated domains

**Android:**
- Verify intent filters in AndroidManifest.xml ✓ (already done)
- Test: `adb shell am start -a android.intent.action.VIEW -d "flamoral://chat/user-123"`

## Quick Reference

### Notification Types
```typescript
new_match           // High priority, matches channel
new_message         // High priority, messages channel
super_like          // Normal priority, social channel
profile_view        // Normal priority, social channel
video_call_incoming // Urgent priority, calls channel
daily_picks         // Normal priority, engagement channel
```

### Priority Levels
- **urgent** - Bypasses quiet hours (calls, security)
- **high** - Important (matches, messages)
- **normal** - Standard (likes, views)

### API Endpoints
```
POST   /api/devices/register              Register device
POST   /api/notifications/send            Send notification
GET    /api/notifications                 Get history
PUT    /api/notifications/:id/read        Mark as read
GET    /api/notifications/preferences     Get settings
PUT    /api/notifications/preferences     Update settings
```

### File Locations

**Backend:**
```
backend/services/notification-service/
  src/providers/fcm.provider.ts          FCM implementation
  src/providers/apns.provider.ts         APNs implementation
  src/services/notification-template.service.ts
  src/services/quiet-hours.service.ts
  config/                                 Keys go here
```

**Mobile:**
```
apps/mobile-app/
  src/services/notifications/NotificationService.ts
  src/services/notifications/DeepLinkHandler.ts
  src/screens/NotificationHistoryScreen.tsx
  android/app/google-services.json       Android config
  ios/FlavoralApp/GoogleService-Info.plist  iOS config
```

## Environment Variables Checklist

Backend `.env`:
- [x] FIREBASE_PROJECT_ID
- [x] FIREBASE_SERVICE_ACCOUNT_PATH
- [x] APNS_KEY_ID
- [x] APNS_TEAM_ID
- [x] APNS_KEY_PATH
- [x] APNS_BUNDLE_ID
- [x] DB_HOST, DB_PORT, DB_NAME
- [x] REDIS_HOST, REDIS_PORT

## Full Documentation

For complete details, see:
- **Setup Guide:** `PUSH_NOTIFICATION_SETUP.md`
- **Implementation Summary:** `NOTIFICATION_IMPLEMENTATION_SUMMARY.md`
- **Service README:** `backend/services/notification-service/README.md`

## Need Help?

1. Check logs: `backend/services/notification-service/logs/`
2. Test endpoints: Use Postman/curl
3. Verify config: Double-check .env variables
4. Review docs: See files above

## Production Checklist

Before going live:
- [ ] Set `APNS_PRODUCTION=true`
- [ ] Use production Firebase project
- [ ] Test all notification types
- [ ] Verify deep links work
- [ ] Test quiet hours
- [ ] Monitor delivery rates
- [ ] Set up error alerting

## Quick Commands

```bash
# Start backend
cd backend/services/notification-service && npm run dev

# Start mobile (iOS)
cd apps/mobile-app && npx react-native run-ios

# Start mobile (Android)
cd apps/mobile-app && npx react-native run-android

# Test notification
curl -X POST http://localhost:3008/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","type":"new_match","channels":["push"],"title":"Test","body":"Testing"}'
```

---

**Ready to go!** Follow the 5-minute setup above and start sending notifications.
