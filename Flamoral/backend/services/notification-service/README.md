# Notification Service

A comprehensive multi-channel notification service for the Flamoral dating platform.

## Features

- **Multi-Channel Support**
  - Push notifications (Firebase Cloud Messaging for Android/Web, APNs for iOS)
  - Email notifications (SendGrid)
  - SMS notifications (Twilio)
  - In-app notifications (Database)

- **Advanced Capabilities**
  - Async processing with Bull queue
  - Rate limiting per user
  - Template system for messages
  - User preference management
  - Quiet hours support with timezone awareness
  - Retry mechanism with exponential backoff
  - Scheduled notifications
  - Batch notification sending
  - Segmented user targeting
  - Device token management
  - Multi-device support per user
  - Automatic invalid token cleanup

- **Notification Types**
  - `new_match` - New match notifications
  - `new_message` - New message alerts
  - `new_like` - Someone liked you
  - `subscription_update` - Subscription changes
  - `payment_success` - Payment confirmations
  - `payment_failed` - Payment failures
  - `profile_boost_active` - Profile boost notifications
  - `verification_complete` - Profile verification complete

## API Endpoints

### Core Endpoints

- `POST /api/notifications/send` - Send notification
- `GET /api/notifications` - Get user's notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Preferences

- `GET /api/notifications/preferences` - Get preferences
- `PUT /api/notifications/preferences` - Update preferences

### Device Management

- `POST /api/devices/register` - Register device for push notifications
- `DELETE /api/devices/unregister` - Unregister device
- `PUT /api/devices/update` - Update device information
- `GET /api/devices` - Get user's registered devices
- `GET /api/devices/stats` - Get device statistics
- `DELETE /api/devices` - Delete all user devices

### Batch Notifications (Service-to-Service)

- `POST /api/batch/send` - Send to multiple users
- `POST /api/batch/segment` - Send to segmented users
- `GET /api/batch/job/:jobId` - Get batch job status
- `GET /api/batch/jobs` - Get batch job history
- `GET /api/batch/stats` - Get batch statistics

### Health & Monitoring

- `GET /health` - Service health check

## Documentation

- [Push Notifications Setup & Usage](./PUSH_NOTIFICATIONS.md) - Complete guide for FCM and APNs implementation
- `GET /` - Service information

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up database:
```bash
# Run migrations
npx knex migrate:latest
```

4. Start the service:
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Configuration

### Database (PostgreSQL)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_notifications
DB_USER=postgres
DB_PASSWORD=postgres
```

### Redis (Queue & Cache)
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### SendGrid (Email)
```env
SENDGRID_API_KEY=your-api-key
EMAIL_FROM=noreply@flamoral.com
```

### Twilio (SMS)
```env
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+1234567890
```

### Firebase (Push Notifications)
```env
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/firebase-service-account.json
```

## Usage Examples

### Send Notification

```javascript
POST /api/notifications/send
{
  "userId": "user-123",
  "type": "new_match",
  "channels": ["push", "email", "in_app"],
  "title": "It's a Match!",
  "body": "You and Sarah liked each other!",
  "imageUrl": "https://example.com/sarah.jpg",
  "actionUrl": "/chat/sarah-id",
  "priority": "high"
}
```

### Update Preferences

```javascript
PUT /api/notifications/preferences
{
  "pushEnabled": true,
  "pushNewMatch": true,
  "pushNewMessage": true,
  "emailEnabled": true,
  "quietHoursEnabled": true,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "08:00",
  "timezone": "America/New_York"
}
```

### Get Notifications

```javascript
GET /api/notifications?page=1&limit=20&unreadOnly=false
```

## Architecture

```
┌─────────────────┐
│   API Gateway   │
└────────┬────────┘
         │
┌────────▼────────┐
│  Notification   │
│   Controller    │
└────────┬────────┘
         │
┌────────▼────────┐
│  Notification   │
│    Service      │
└────────┬────────┘
         │
┌────────▼────────┐
│   Bull Queue    │
└────────┬────────┘
         │
    ┌────┴────┬────────┬────────┐
    │         │        │        │
┌───▼──┐  ┌──▼──┐  ┌──▼──┐  ┌──▼──┐
│ Push │  │Email│  │ SMS │  │In-App│
└──────┘  └─────┘  └─────┘  └──────┘
```

## Queue Processing

The service uses Bull for async job processing:

- Retry failed jobs with exponential backoff
- Process notifications in batches
- Priority-based processing
- Automatic cleanup of old jobs

## Rate Limiting

- API Rate Limit: 100 requests/minute
- Notification Rate Limit: 10 notifications/minute per user
- Strict Rate Limit: 5 requests/minute for sensitive operations

## Error Handling

- Automatic retries for failed notifications (max 3 attempts)
- Exponential backoff between retries
- Detailed error logging
- Graceful degradation if a channel fails

## Monitoring

- Health check endpoint with database and queue status
- Detailed logging with Winston
- Queue statistics and metrics
- Error tracking and reporting

## Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run with coverage
npm test -- --coverage
```

## Development

```bash
# Start in development mode with auto-reload
npm run dev

# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Build for production
npm run build
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure all external services (SendGrid, Twilio, Firebase)
3. Set up Redis for queue processing
4. Configure database with proper credentials
5. Set strong JWT secret
6. Enable rate limiting
7. Configure logging and monitoring

## Security

- JWT-based authentication
- Rate limiting on all endpoints
- Input validation
- SQL injection protection (parameterized queries)
- XSS protection
- CORS configuration

## License

Proprietary - Flamoral Dating Platform
