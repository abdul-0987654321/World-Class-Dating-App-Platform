# Notification Service - Quick Start Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 6+
- SendGrid account (for email)
- Twilio account (for SMS)
- Firebase project (for push notifications)

## Installation Steps

### 1. Install Dependencies

```bash
cd backend/services/notification-service
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server
PORT=3006
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_notifications
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# SendGrid (Email)
SENDGRID_API_KEY=SG.your_api_key
EMAIL_FROM=noreply@flamoral.com

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890

# Firebase (Push)
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/firebase-service-account.json

# JWT
JWT_SECRET=your_secret_key_here
```

### 3. Setup Database

Create the database:

```bash
createdb flamoral_notifications
```

Run migrations:

```bash
npx knex migrate:latest
```

### 4. Start Services

Make sure Redis is running:

```bash
redis-server
```

Start the notification service:

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm run build
npm start
```

## Verify Installation

### 1. Check Health Endpoint

```bash
curl http://localhost:3006/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "notification-service",
  "timestamp": "2025-12-01T...",
  "database": "connected",
  "queue": {
    "status": "operational",
    "stats": { ... }
  }
}
```

### 2. Check Service Info

```bash
curl http://localhost:3006/
```

## Quick Test

### 1. Get a Test JWT Token

For testing, you can use a test token. In production, get this from your auth service.

```javascript
// Generate test token (for development only)
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { id: 'test-user-123', email: 'test@example.com' },
  'your_secret_key_here',
  { expiresIn: '1h' }
);
console.log(token);
```

### 2. Send Test Notification

```bash
curl -X POST http://localhost:3006/api/notifications/send \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "type": "new_match",
    "channels": ["in_app"],
    "title": "Test Notification",
    "body": "This is a test notification",
    "priority": "normal"
  }'
```

### 3. Get Notifications

```bash
curl http://localhost:3006/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Get Preferences

```bash
curl http://localhost:3006/api/notifications/preferences \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Common Issues & Solutions

### Issue: "Database connection failed"

**Solution**:
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in `.env`
- Create database if it doesn't exist: `createdb flamoral_notifications`

### Issue: "Redis connection error"

**Solution**:
- Check Redis is running: `redis-cli ping` (should return "PONG")
- Start Redis: `redis-server`
- Verify host/port in `.env`

### Issue: "Firebase not initialized"

**Solution**:
- Verify `FIREBASE_SERVICE_ACCOUNT_PATH` points to valid JSON file
- Or set `FIREBASE_SERVICE_ACCOUNT` with JSON string
- Service will work without Firebase (push notifications disabled)

### Issue: "SendGrid/Twilio errors"

**Solution**:
- Verify API keys are correct
- Check account is active and not suspended
- Service will work without these (email/SMS disabled)

### Issue: "JWT token invalid"

**Solution**:
- Ensure `JWT_SECRET` matches across all services
- Token must not be expired
- Include "Bearer " prefix in Authorization header

## Development Workflow

### Run in Development Mode

```bash
npm run dev
```

This starts the service with:
- Auto-reload on file changes
- Debug logging enabled
- Detailed error messages

### Run Tests

```bash
npm test
```

### Lint Code

```bash
npm run lint
npm run lint:fix
```

### Build for Production

```bash
npm run build
```

## Integration with Other Services

### From Matching Service

```javascript
const axios = require('axios');

await axios.post('http://notification-service:3008/api/notifications/send', {
  userId: 'user-123',
  type: 'new_match',
  channels: ['push', 'email', 'in_app'],
  title: "It's a Match!",
  body: "You and Sarah liked each other!",
  priority: 'high'
}, {
  headers: { 'Authorization': `Bearer ${serviceToken}` }
});
```

### From Chat Service

```javascript
await axios.post('http://notification-service:3008/api/notifications/send', {
  userId: 'recipient-id',
  type: 'new_message',
  channels: ['push', 'in_app'],
  title: 'John',
  body: 'Hey! How are you?',
  priority: 'high'
}, {
  headers: { 'Authorization': `Bearer ${serviceToken}` }
});
```

## Monitoring

### Check Queue Status

```bash
curl http://localhost:3006/health
```

### View Logs

```bash
# Development (console)
tail -f logs/combined.log

# Errors only
tail -f logs/error.log
```

### Redis Queue Monitoring

```bash
redis-cli
> KEYS notification:*
> LLEN notification:waiting
> LLEN notification:active
```

## Next Steps

1. **Configure External Services**:
   - Set up SendGrid account and get API key
   - Set up Twilio account for SMS
   - Create Firebase project for push notifications

2. **Customize Templates**:
   - Update notification templates in database
   - Add custom variables
   - Create HTML email templates

3. **Set Up Monitoring**:
   - Configure log aggregation
   - Set up error tracking (Sentry, etc.)
   - Create dashboard for queue metrics

4. **Scale for Production**:
   - Use managed PostgreSQL (AWS RDS, etc.)
   - Use managed Redis (ElastiCache, etc.)
   - Add multiple queue workers
   - Set up load balancing

## Support & Documentation

- **Full Documentation**: See `README.md`
- **API Examples**: See `EXAMPLES.md`
- **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`

## Troubleshooting Commands

```bash
# Check if service is running
curl http://localhost:3006/health

# Check database connection
psql -h localhost -U postgres -d flamoral_notifications -c "SELECT 1;"

# Check Redis connection
redis-cli ping

# View recent logs
tail -n 100 logs/combined.log

# Check queue stats
redis-cli KEYS "bull:notifications:*"

# Clear failed jobs
redis-cli DEL "bull:notifications:failed"
```

---

**Service is now ready to use!**

For detailed API documentation and examples, see `EXAMPLES.md`.
