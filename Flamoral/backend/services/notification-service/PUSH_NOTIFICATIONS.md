# Push Notification Delivery System

Complete implementation of Firebase Cloud Messaging (FCM) and Apple Push Notification Service (APNs) for the Flamoral dating platform.

## Features

### 1. Multi-Platform Support
- **iOS**: Apple Push Notification Service (APNs)
- **Android**: Firebase Cloud Messaging (FCM)
- **Web**: Firebase Cloud Messaging (FCM)

### 2. Device Management
- Device token registration and management
- Platform-specific device tracking
- Automatic cleanup of invalid tokens
- Device activity tracking
- Multi-device support per user

### 3. Notification Preferences
- Per-notification-type preferences (matches, messages, likes, etc.)
- Quiet hours support with timezone awareness
- Push, email, and SMS preference management
- Critical notifications override (payments, security)

### 4. Delivery Features
- Retry logic with exponential backoff
- Batch notification sending
- Segmented notifications (by platform, activity, subscription)
- Priority-based delivery
- Deep linking support
- Rich notifications with images

### 5. Reliability
- Automatic invalid token cleanup
- Failed delivery tracking
- Delivery statistics and monitoring
- Job status tracking for batch operations

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# Firebase Cloud Messaging (Android/Web)
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/firebase-service-account.json
# OR
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# Apple Push Notification Service (iOS)
APNS_KEY_ID=your-apns-key-id
APNS_TEAM_ID=your-apple-team-id
APNS_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8
# OR
APNS_KEY=base64-encoded-key-content
APNS_BUNDLE_ID=com.flamoral.app

# Notification Settings
NOTIFICATION_MAX_RETRIES=3
NOTIFICATION_RETRY_DELAY=60000
NOTIFICATION_BATCH_SIZE=50
NOTIFICATION_CLEANUP_DAYS=90
```

### Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Generate a service account key:
   - Go to Project Settings > Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file securely
3. Set `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT`

### APNs Setup

1. Create an APNs Authentication Key:
   - Go to https://developer.apple.com/account/resources/authkeys/list
   - Click "+" to create a new key
   - Enable "Apple Push Notifications service (APNs)"
   - Download the `.p8` file
   - Note your Key ID and Team ID
2. Set the environment variables with your credentials

## API Endpoints

### Device Management

#### Register Device
```http
POST /api/devices/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "deviceToken": "device-fcm-or-apns-token",
  "platform": "ios|android|web",
  "deviceId": "unique-device-id",
  "deviceModel": "iPhone 14 Pro",
  "osVersion": "17.2",
  "appVersion": "1.0.0"
}
```

Response:
```json
{
  "success": true,
  "deviceId": "uuid",
  "isNew": true,
  "message": "Device registered successfully"
}
```

#### Unregister Device
```http
DELETE /api/devices/unregister
Authorization: Bearer <token>
Content-Type: application/json

{
  "deviceToken": "device-token"
}
```

#### Update Device Info
```http
PUT /api/devices/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "deviceToken": "device-token",
  "osVersion": "17.3",
  "appVersion": "1.1.0"
}
```

#### Get User Devices
```http
GET /api/devices?activeOnly=true
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "devices": [
    {
      "id": "uuid",
      "userId": "uuid",
      "deviceToken": "token",
      "platform": "ios",
      "deviceModel": "iPhone 14 Pro",
      "osVersion": "17.2",
      "appVersion": "1.0.0",
      "isActive": true,
      "lastActiveAt": "2025-01-26T10:00:00Z",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

#### Get Device Statistics
```http
GET /api/devices/stats
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "stats": {
    "total": 3,
    "active": 2,
    "inactive": 1,
    "byPlatform": {
      "ios": 1,
      "android": 1,
      "web": 0
    }
  }
}
```

### Batch Notifications

#### Send Batch Notification
```http
POST /api/batch/send
Authorization: Service <service-token>
Content-Type: application/json

{
  "userIds": ["uuid1", "uuid2", "uuid3"],
  "type": "new_match",
  "title": "New Match!",
  "body": "You have a new match!",
  "data": {
    "matchId": "uuid",
    "matchName": "John"
  },
  "imageUrl": "https://example.com/image.jpg",
  "deepLink": "/matches/uuid",
  "priority": "high",
  "respectQuietHours": true,
  "respectPreferences": true
}
```

Response:
```json
{
  "success": true,
  "jobId": "batch-job-uuid",
  "totalUsers": 3,
  "message": "Batch job created and processing started"
}
```

#### Send to Segment
```http
POST /api/batch/segment
Authorization: Service <service-token>
Content-Type: application/json

{
  "segment": {
    "type": "platform",
    "platform": "ios"
  },
  "payload": {
    "type": "promo",
    "title": "Special Offer!",
    "body": "Get 50% off Premium this week!",
    "priority": "normal"
  }
}
```

Segment types:
- `all`: All active users
- `platform`: Filter by platform (ios, android, web)
- `active`: Filter by last active date
- `custom`: Custom query filters

#### Get Batch Job Status
```http
GET /api/batch/job/:jobId
Authorization: Service <service-token>
```

Response:
```json
{
  "success": true,
  "job": {
    "id": "uuid",
    "status": "completed",
    "totalUsers": 1000,
    "sentCount": 950,
    "failedCount": 50,
    "createdAt": "2025-01-26T10:00:00Z",
    "startedAt": "2025-01-26T10:00:01Z",
    "completedAt": "2025-01-26T10:05:00Z"
  }
}
```

#### Get Batch Statistics
```http
GET /api/batch/stats
Authorization: Service <service-token>
```

Response:
```json
{
  "success": true,
  "stats": {
    "active": 2,
    "pending": 1,
    "processing": 1,
    "completed24h": 50,
    "totalSent24h": 45000,
    "averageSuccessRate": 95.5
  }
}
```

## Usage Examples

### Client-Side Integration

#### iOS (Swift)
```swift
import UserNotifications
import FirebaseMessaging

// Register for push notifications
func registerForPushNotifications() {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
        guard granted else { return }

        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
}

// Handle device token
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    // Get FCM token (if using FCM for iOS)
    Messaging.messaging().apnsToken = deviceToken

    Messaging.messaging().token { token, error in
        guard let token = token else { return }

        // Register with your backend
        registerDevice(token: token, platform: "ios")
    }
}

// Register with backend
func registerDevice(token: String, platform: String) {
    let url = URL(string: "https://api.flamoral.com/api/devices/register")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let body: [String: Any] = [
        "deviceToken": token,
        "platform": platform,
        "deviceModel": UIDevice.current.model,
        "osVersion": UIDevice.current.systemVersion,
        "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? ""
    ]

    request.httpBody = try? JSONSerialization.data(withJSONObject: body)

    URLSession.shared.dataTask(with: request).resume()
}
```

#### Android (Kotlin)
```kotlin
import com.google.firebase.messaging.FirebaseMessaging

// Request notification permission (Android 13+)
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQUEST_CODE)
}

// Get FCM token
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (!task.isSuccessful) {
        Log.w(TAG, "Fetching FCM token failed", task.exception)
        return@addOnCompleteListener
    }

    val token = task.result
    registerDevice(token, "android")
}

// Register with backend
fun registerDevice(token: String, platform: String) {
    val client = OkHttpClient()
    val json = JSONObject().apply {
        put("deviceToken", token)
        put("platform", platform)
        put("deviceModel", Build.MODEL)
        put("osVersion", Build.VERSION.RELEASE)
        put("appVersion", BuildConfig.VERSION_NAME)
    }

    val body = json.toString().toRequestBody("application/json".toMediaType())
    val request = Request.Builder()
        .url("https://api.flamoral.com/api/devices/register")
        .header("Authorization", "Bearer $authToken")
        .post(body)
        .build()

    client.newCall(request).enqueue(object : Callback {
        override fun onResponse(call: Call, response: Response) {
            // Handle success
        }

        override fun onFailure(call: Call, e: IOException) {
            // Handle error
        }
    })
}
```

#### Web (JavaScript)
```javascript
import { getMessaging, getToken } from 'firebase/messaging';

// Request notification permission
async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();

  if (permission === 'granted') {
    const messaging = getMessaging();
    const token = await getToken(messaging, {
      vapidKey: 'your-vapid-key'
    });

    await registerDevice(token, 'web');
  }
}

// Register with backend
async function registerDevice(token, platform) {
  const response = await fetch('https://api.flamoral.com/api/devices/register', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      deviceToken: token,
      platform: platform,
      deviceModel: navigator.userAgent,
      osVersion: navigator.platform,
      appVersion: '1.0.0'
    })
  });

  const data = await response.json();
  console.log('Device registered:', data);
}
```

### Server-Side Usage

#### Send to Single User
```typescript
import { pushNotificationDeliveryService, NotificationType } from './services/push-notification-delivery.service';

// Send notification to a user
const result = await pushNotificationDeliveryService.sendToUser('user-id', {
  type: NotificationType.NEW_MATCH,
  title: "It's a Match!",
  body: "You and Sarah liked each other!",
  imageUrl: "https://cdn.flamoral.com/users/sarah/photo.jpg",
  deepLink: "/chat/sarah-id",
  data: {
    matchId: "match-uuid",
    matchUserId: "sarah-id",
    matchUserName: "Sarah"
  },
  priority: "high"
});

console.log(`Sent to ${result.sent} devices, ${result.failed} failed`);
```

#### Send with Retry
```typescript
// Send with automatic retry on failure
const result = await pushNotificationDeliveryService.sendWithRetry('user-id', {
  type: NotificationType.PAYMENT_SUCCESS,
  title: "Payment Successful",
  body: "Your Premium subscription is now active!",
  priority: "high"
}, 3); // Max 3 retries
```

#### Batch Send
```typescript
import { batchNotificationService } from './services/batch-notification.service';

// Send to multiple users
const result = await batchNotificationService.sendBatch({
  userIds: ['user1', 'user2', 'user3'],
  type: NotificationType.PROMO,
  title: "Weekend Special!",
  body: "Get 50% off Premium this weekend only!",
  imageUrl: "https://cdn.flamoral.com/promos/weekend.jpg",
  priority: "normal",
  respectQuietHours: true,
  respectPreferences: true
});

console.log(`Batch job ${result.jobId} created for ${result.totalUsers} users`);
```

#### Segmented Send
```typescript
// Send to all iOS users
const result = await batchNotificationService.sendToSegment({
  segment: {
    type: 'platform',
    platform: 'ios'
  },
  payload: {
    type: NotificationType.REMINDER,
    title: "Come back!",
    body: "You have new likes waiting!",
    priority: "normal"
  }
});
```

## Notification Types

The system supports the following notification types:

- `NEW_MATCH`: New match notification
- `NEW_MESSAGE`: New chat message
- `NEW_LIKE`: Someone liked your profile
- `SUPER_LIKE`: Someone super liked you
- `PROFILE_VIEW`: Profile view notification
- `BOOST_ACTIVE`: Boost activated
- `BOOST_EXPIRING`: Boost expiring soon
- `PAYMENT_SUCCESS`: Payment successful
- `PAYMENT_FAILED`: Payment failed
- `SECURITY_ALERT`: Security alert
- `REMINDER`: Generic reminder
- `PROMO`: Promotional notification

## Notification Preferences

Users can control their notification preferences:

```typescript
// Update preferences
await notificationService.updatePreferences(userId, {
  pushEnabled: true,
  pushNewMatch: true,
  pushNewMessage: true,
  pushNewLike: true,
  pushSuperLike: true,
  pushProfileView: false,
  pushBoostExpiring: true,
  pushMarketing: false,

  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  timezone: "America/New_York"
});
```

## Monitoring and Maintenance

### Device Cleanup
```typescript
import { deviceManagementService } from './services/device-management.service';

// Clean up inactive devices (older than 90 days)
const result = await deviceManagementService.cleanupInactiveDevices(90);
console.log(`Deleted ${result.deleted} inactive devices`);
```

### Batch Job Cleanup
```typescript
import { batchNotificationService } from './services/batch-notification.service';

// Clean up old batch jobs (older than 30 days)
const result = await batchNotificationService.cleanupOldJobs(30);
console.log(`Deleted ${result.deleted} old batch jobs`);
```

### Statistics
```typescript
// Get device statistics
const deviceStats = await pushNotificationDeliveryService.getStats();
console.log(`Total: ${deviceStats.totalDevices}, Active: ${deviceStats.activeDevices}`);
console.log(`iOS: ${deviceStats.devicesByPlatform.ios}`);
console.log(`Android: ${deviceStats.devicesByPlatform.android}`);
console.log(`Web: ${deviceStats.devicesByPlatform.web}`);

// Get batch statistics
const batchStats = await batchNotificationService.getBatchStats();
console.log(`Active jobs: ${batchStats.stats.active}`);
console.log(`Completed in 24h: ${batchStats.stats.completed24h}`);
console.log(`Total sent in 24h: ${batchStats.stats.totalSent24h}`);
console.log(`Average success rate: ${batchStats.stats.averageSuccessRate}%`);
```

## Error Handling

The system automatically handles common errors:

1. **Invalid Tokens**: Automatically deactivated
2. **Unregistered Devices**: Cleaned up from database
3. **Network Errors**: Retried with exponential backoff
4. **Rate Limits**: Batch processing with delays
5. **Quiet Hours**: Notifications skipped during quiet hours

## Best Practices

1. **Always register devices**: Register device tokens on app launch
2. **Update tokens**: Re-register when tokens change
3. **Handle permissions**: Request permission before sending notifications
4. **Respect preferences**: Honor user notification preferences
5. **Use priorities**: Mark important notifications as high priority
6. **Include deep links**: Always provide actionable deep links
7. **Test both platforms**: Test on iOS and Android separately
8. **Monitor delivery**: Track delivery success rates
9. **Clean up regularly**: Run cleanup jobs periodically
10. **Handle errors gracefully**: Implement proper error handling

## Security

- Device tokens are stored securely in the database
- Service-to-service authentication required for batch operations
- User authentication required for device management
- Tokens are automatically cleaned up when invalid
- Rate limiting on all endpoints
- Input validation on all requests

## Performance

- Batch processing for large sends (50 devices per batch)
- Async processing with Bull queue
- Redis caching for preferences
- Database indexes on frequently queried fields
- Connection pooling for database
- Exponential backoff for retries

## Troubleshooting

### Notifications not received on iOS

1. Check APNs credentials are correct
2. Verify bundle ID matches your app
3. Ensure device token is valid
4. Check if production/sandbox environment matches
5. Verify push notification capability is enabled

### Notifications not received on Android

1. Check Firebase service account is configured
2. Verify FCM token is valid
3. Check notification channel is created
4. Ensure app has notification permission
5. Verify google-services.json is included

### Batch jobs stuck in processing

1. Check Redis connection
2. Verify Bull queue workers are running
3. Check database connection
4. Review error logs
5. Restart notification service

## Support

For issues or questions:
- Check the logs: `pm2 logs notification-service`
- Review error messages in database
- Check device registration status
- Verify credentials are correct
- Contact platform team for assistance
