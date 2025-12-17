# Notification Service - Scripts

This directory contains utility scripts for setting up, validating, and managing the notification service.

## Available Scripts

### 1. setup.sh / setup.bat
**Purpose:** First-time setup for the notification service

**Usage:**
```bash
# Linux/Mac
./scripts/setup.sh

# Windows
scripts\setup.bat
```

**What it does:**
- Creates `.env` file from `.env.example`
- Installs npm dependencies
- Runs configuration validation
- Displays next steps

**When to use:**
- First time setting up the service
- After cloning the repository
- When resetting the environment

---

### 2. validate-config.ts
**Purpose:** Validates notification service configuration

**Usage:**
```bash
npm run validate
```

**What it checks:**
- ✅ Environment variables are set
- ✅ Database configuration is valid
- ✅ Redis configuration is valid
- ✅ Email provider is configured (SendGrid/SES/SMTP)
- ✅ Push notification providers (Firebase/APNs) - optional
- ✅ SMS provider (Twilio) - optional
- ✅ Security settings (JWT secret, passwords)
- ✅ Queue configuration

**Exit codes:**
- `0` - Configuration is valid
- `1` - Configuration has errors

**When to use:**
- Before starting the service
- After changing configuration
- During deployment
- Troubleshooting configuration issues

---

## Quick Start

### New Installation

1. **Run setup script:**
   ```bash
   # Windows
   scripts\setup.bat

   # Linux/Mac
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

2. **Edit .env file:**
   ```bash
   # Open in your preferred editor
   code .env
   # or
   notepad .env
   ```

3. **Configure required services:**
   - Database credentials
   - Redis connection
   - At least one email provider
   - (Optional) Push notification providers
   - (Optional) SMS provider

4. **Validate configuration:**
   ```bash
   npm run validate
   ```

5. **Set up database:**
   ```bash
   # Create database
   createdb flamoral_notifications

   # Run migrations
   npm run migrate
   ```

6. **Start service:**
   ```bash
   npm run dev
   ```

---

## Configuration Examples

### Minimal Configuration (Development)
```bash
# .env
NODE_ENV=development
PORT=3012

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_notifications
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# SMTP (for development - use Mailhog or similar)
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM=noreply@flamoral.local

# JWT
JWT_SECRET=dev-secret-change-in-production
```

### Production Configuration
```bash
# .env
NODE_ENV=production
PORT=3012

# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=flamoral_notifications
DB_USER=your-db-user
DB_PASSWORD=your-secure-password

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# SendGrid (Production email)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@flamoral.com
EMAIL_FROM_NAME=Flamoral

# Firebase (Push - Android/Web)
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/firebase-service-account.json
FCM_ENABLED=true

# APNs (Push - iOS)
APNS_ENABLED=true
APNS_PRODUCTION=true
APNS_KEY_ID=XXXXXXXXXX
APNS_TEAM_ID=XXXXXXXXXX
APNS_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8
APNS_BUNDLE_ID=com.flamoral.app

# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+1234567890

# JWT
JWT_SECRET=your-very-secure-jwt-secret-min-32-chars

# Web App
WEB_APP_URL=https://flamoral.com
```

---

## Troubleshooting

### Script Permission Denied (Linux/Mac)
```bash
chmod +x scripts/setup.sh
```

### Validation Fails
1. Check `.env` file exists
2. Review error messages from validation script
3. Compare with `.env.example`
4. See `SERVICE_HEALTH_CHECK.md` for detailed configuration guide

### npm install Fails
1. Ensure Node.js version >= 20.0.0
2. Clear npm cache: `npm cache clean --force`
3. Delete `node_modules` and `package-lock.json`
4. Run `npm install` again

### Database Connection Issues
```bash
# Test PostgreSQL is running
pg_isready

# Test connection
psql -h localhost -U postgres -d flamoral_notifications

# Create database if needed
createdb flamoral_notifications
```

### Redis Connection Issues
```bash
# Test Redis is running
redis-cli ping
# Should return: PONG

# Start Redis (varies by OS)
# Linux: sudo systemctl start redis
# Mac: brew services start redis
# Windows: redis-server
```

---

## Related Documentation

- **SERVICE_HEALTH_CHECK.md** - Comprehensive health check and configuration guide
- **FIXES_APPLIED.md** - Summary of all fixes and improvements
- **README.md** - Main service documentation
- **EXAMPLES.md** - API usage examples

---

## Support

For issues or questions:
1. Check the validation output: `npm run validate`
2. Review `SERVICE_HEALTH_CHECK.md`
3. Check service logs
4. Verify all prerequisites are installed and running
