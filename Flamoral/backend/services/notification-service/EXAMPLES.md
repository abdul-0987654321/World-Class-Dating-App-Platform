# Notification Service - Usage Examples

## Table of Contents
- [Sending Notifications](#sending-notifications)
- [Managing User Notifications](#managing-user-notifications)
- [Notification Preferences](#notification-preferences)
- [Integration Examples](#integration-examples)

## Sending Notifications

### Send a New Match Notification

```javascript
// Using the unified notification service
POST /api/notifications/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-123",
  "type": "new_match",
  "channels": ["push", "email", "in_app"],
  "title": "It's a Match! 🎉",
  "body": "You and Sarah liked each other!",
  "imageUrl": "https://cdn.flamoral.com/users/sarah/profile.jpg",
  "actionUrl": "/chat/sarah-user-id",
  "data": {
    "matchUserId": "sarah-user-id",
    "matchUserName": "Sarah"
  },
  "priority": "high"
}
```

### Send a New Message Notification

```javascript
POST /api/notifications/send
Authorization: Bearer <token>

{
  "userId": "recipient-user-id",
  "type": "new_message",
  "channels": ["push", "in_app"],
  "title": "John",
  "body": "Hey! How's your day going?",
  "imageUrl": "https://cdn.flamoral.com/users/john/avatar.jpg",
  "actionUrl": "/chat/john-user-id",
  "data": {
    "senderId": "john-user-id",
    "senderName": "John",
    "messageId": "msg-789"
  },
  "priority": "high"
}
```

### Send a Payment Success Notification

```javascript
POST /api/notifications/send
Authorization: Bearer <token>

{
  "userId": "user-123",
  "type": "payment_success",
  "channels": ["email", "in_app"],
  "title": "Payment Successful",
  "body": "Your payment of $29.99 for Premium Plus has been processed successfully.",
  "data": {
    "amount": 29.99,
    "plan": "Premium Plus",
    "transactionId": "txn_abc123"
  },
  "priority": "high"
}
```

### Send a Scheduled Notification

```javascript
POST /api/notifications/send
Authorization: Bearer <token>

{
  "userId": "user-123",
  "type": "reminder",
  "channels": ["push"],
  "title": "Don't forget to check your matches!",
  "body": "You have 5 new potential matches waiting for you.",
  "scheduledAt": "2025-12-02T10:00:00Z",
  "priority": "normal"
}
```

### Send Profile Boost Notification

```javascript
POST /api/notifications/send
Authorization: Bearer <token>

{
  "userId": "user-123",
  "type": "profile_boost_active",
  "channels": ["push", "in_app"],
  "title": "Profile Boost Active! 🚀",
  "body": "Your profile is boosted for the next 30 minutes!",
  "data": {
    "durationMinutes": 30,
    "boostId": "boost-456"
  },
  "priority": "high"
}
```

## Managing User Notifications

### Get All Notifications

```javascript
GET /api/notifications?page=1&limit=20
Authorization: Bearer <token>

Response:
{
  "success": true,
  "notifications": [
    {
      "id": "notif-123",
      "userId": "user-123",
      "type": "push",
      "category": "new_match",
      "title": "It's a Match! 🎉",
      "body": "You and Sarah liked each other!",
      "imageUrl": "https://cdn.flamoral.com/users/sarah/profile.jpg",
      "actionUrl": "/chat/sarah-user-id",
      "data": {
        "matchUserId": "sarah-user-id",
        "matchUserName": "Sarah"
      },
      "status": "sent",
      "readAt": null,
      "createdAt": "2025-12-01T10:30:00Z"
    }
  ],
  "total": 45,
  "unreadCount": 12,
  "page": 1,
  "limit": 20
}
```

### Get Only Unread Notifications

```javascript
GET /api/notifications?unreadOnly=true&limit=10
Authorization: Bearer <token>
```

### Get Unread Count

```javascript
GET /api/notifications/unread-count
Authorization: Bearer <token>

Response:
{
  "success": true,
  "count": 12
}
```

### Mark Notification as Read

```javascript
PUT /api/notifications/notif-123/read
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Notification marked as read"
}
```

### Mark All Notifications as Read

```javascript
PUT /api/notifications/read-all
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "All notifications marked as read",
  "count": 12
}
```

### Delete a Notification

```javascript
DELETE /api/notifications/notif-123
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Notification deleted"
}
```

## Notification Preferences

### Get User Preferences

```javascript
GET /api/notifications/preferences
Authorization: Bearer <token>

Response:
{
  "success": true,
  "preferences": {
    "userId": "user-123",
    "pushEnabled": true,
    "pushNewMatch": true,
    "pushNewMessage": true,
    "pushNewLike": true,
    "pushSuperLike": true,
    "pushProfileView": false,
    "pushBoostExpiring": true,
    "pushMarketing": false,
    "emailEnabled": true,
    "emailNewMatch": true,
    "emailNewMessage": false,
    "emailWeeklyDigest": true,
    "emailPromotions": false,
    "emailProductUpdates": true,
    "smsEnabled": false,
    "smsVerification": true,
    "smsSecurityAlerts": true,
    "quietHoursEnabled": true,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "08:00",
    "timezone": "America/New_York"
  }
}
```

### Update Preferences

```javascript
PUT /api/notifications/preferences
Authorization: Bearer <token>

{
  "pushNewMessage": false,
  "emailWeeklyDigest": false,
  "quietHoursEnabled": true,
  "quietHoursStart": "23:00",
  "quietHoursEnd": "07:00",
  "timezone": "America/Los_Angeles"
}

Response:
{
  "success": true,
  "message": "Preferences updated successfully",
  "preferences": { ... }
}
```

### Disable All Push Notifications

```javascript
PUT /api/notifications/preferences
Authorization: Bearer <token>

{
  "pushEnabled": false
}
```

### Enable Quiet Hours

```javascript
PUT /api/notifications/preferences
Authorization: Bearer <token>

{
  "quietHoursEnabled": true,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "08:00",
  "timezone": "America/New_York"
}
```

## Integration Examples

### From Matching Service (When Users Match)

```javascript
// In your matching service
const axios = require('axios');

async function notifyUsersOfMatch(user1Id, user2Id, user1Data, user2Data) {
  const notificationServiceUrl = 'http://notification-service:3008';

  // Notify user 1
  await axios.post(
    `${notificationServiceUrl}/api/notifications/send`,
    {
      userId: user1Id,
      type: 'new_match',
      channels: ['push', 'email', 'in_app'],
      title: "It's a Match! 🎉",
      body: `You and ${user2Data.name} liked each other!`,
      imageUrl: user2Data.photoUrl,
      actionUrl: `/chat/${user2Id}`,
      data: {
        matchUserId: user2Id,
        matchUserName: user2Data.name
      },
      priority: 'high'
    },
    {
      headers: {
        'Authorization': `Bearer ${serviceToken}`
      }
    }
  );

  // Notify user 2
  await axios.post(
    `${notificationServiceUrl}/api/notifications/send`,
    {
      userId: user2Id,
      type: 'new_match',
      channels: ['push', 'email', 'in_app'],
      title: "It's a Match! 🎉",
      body: `You and ${user1Data.name} liked each other!`,
      imageUrl: user1Data.photoUrl,
      actionUrl: `/chat/${user1Id}`,
      data: {
        matchUserId: user1Id,
        matchUserName: user1Data.name
      },
      priority: 'high'
    },
    {
      headers: {
        'Authorization': `Bearer ${serviceToken}`
      }
    }
  );
}
```

### From Chat Service (New Message)

```javascript
// In your chat service
async function notifyNewMessage(recipientId, senderId, senderName, messageText, senderPhoto) {
  const notificationServiceUrl = 'http://notification-service:3008';

  await axios.post(
    `${notificationServiceUrl}/api/notifications/send`,
    {
      userId: recipientId,
      type: 'new_message',
      channels: ['push', 'in_app'],
      title: senderName,
      body: messageText.substring(0, 100), // Preview
      imageUrl: senderPhoto,
      actionUrl: `/chat/${senderId}`,
      data: {
        senderId,
        senderName
      },
      priority: 'high'
    },
    {
      headers: {
        'Authorization': `Bearer ${serviceToken}`
      }
    }
  );
}
```

### From Payment Service

```javascript
// Payment successful
async function notifyPaymentSuccess(userId, amount, planName, transactionId) {
  await axios.post(
    `${notificationServiceUrl}/api/notifications/send`,
    {
      userId,
      type: 'payment_success',
      channels: ['email', 'in_app'],
      title: 'Payment Successful',
      body: `Your payment of $${amount} for ${planName} has been processed successfully.`,
      data: {
        amount,
        plan: planName,
        transactionId
      },
      priority: 'high'
    },
    {
      headers: {
        'Authorization': `Bearer ${serviceToken}`
      }
    }
  );
}

// Payment failed
async function notifyPaymentFailed(userId, reason) {
  await axios.post(
    `${notificationServiceUrl}/api/notifications/send`,
    {
      userId,
      type: 'payment_failed',
      channels: ['email', 'in_app'],
      title: 'Payment Failed',
      body: `Your payment could not be processed: ${reason}`,
      data: { reason },
      priority: 'urgent'
    },
    {
      headers: {
        'Authorization': `Bearer ${serviceToken}`
      }
    }
  );
}
```

### Using the Convenience Methods (Internal Service Calls)

```javascript
// From within the notification service or other microservices
import { notificationService } from './services/notification.service';

// New match
await notificationService.notifyNewMatch(
  userId,
  matchUserId,
  matchUserName,
  matchUserPhoto
);

// New message
await notificationService.notifyNewMessage(
  userId,
  senderId,
  senderName,
  messagePreview,
  senderPhoto
);

// New like
await notificationService.notifyNewLike(userId);

// Payment success
await notificationService.notifyPaymentSuccess(userId, amount, plan);

// Payment failed
await notificationService.notifyPaymentFailed(userId, reason);

// Profile boost active
await notificationService.notifyProfileBoostActive(userId, durationMinutes);

// Verification complete
await notificationService.notifyVerificationComplete(userId);
```

## Error Handling

```javascript
try {
  const response = await axios.post(
    `${notificationServiceUrl}/api/notifications/send`,
    notificationData,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  if (response.data.success) {
    console.log('Notification sent:', response.data.notificationId);
  } else {
    console.error('Failed to send notification:', response.data.error);
  }
} catch (error) {
  if (error.response) {
    // Server responded with error
    console.error('Error response:', error.response.data);
  } else if (error.request) {
    // Request made but no response
    console.error('No response from notification service');
  } else {
    // Error setting up request
    console.error('Error:', error.message);
  }
}
```

## Rate Limiting

Be aware of rate limits:

- **API Rate Limit**: 100 requests per minute
- **Notification Rate Limit**: 10 notifications per minute per user
- **Strict Operations**: 5 requests per minute

If you hit the rate limit, you'll receive a 429 response:

```javascript
{
  "success": false,
  "error": "Too many requests",
  "retryAfter": 45  // seconds until rate limit resets
}
```

## Best Practices

1. **Use appropriate channels**:
   - `push` + `in_app` for time-sensitive notifications (matches, messages)
   - `email` + `in_app` for important updates (payments, subscriptions)
   - `sms` only for critical security alerts

2. **Set correct priority**:
   - `urgent` - Security alerts, payment failures
   - `high` - Matches, messages, payments
   - `normal` - Likes, profile views
   - `low` - Marketing, reminders

3. **Respect user preferences**:
   - Always check if the notification type is enabled
   - Honor quiet hours
   - Don't spam users

4. **Handle errors gracefully**:
   - Implement retry logic
   - Log failures for debugging
   - Don't block main operations on notification failures

5. **Use scheduled notifications wisely**:
   - For reminders and time-based campaigns
   - Respect user timezones
   - Don't schedule too far in advance
