# Environment Configuration - Quick Reference Guide

**Last Updated:** December 16, 2025

## Service Port Assignments

| Service | Port | Environment Variable |
|---------|------|---------------------|
| auth-service | 3001 | PORT=3001 |
| user-service | 3002 | PORT=3002 |
| messaging-service | 3004 | PORT=3004 |
| payment-service | 3005 | PORT=3005 |
| media-service | 3006 | PORT=3006 |
| analytics-service | 3007 | PORT=3007 |
| moderation-service | 3008 | PORT=3008 |
| matching-service | 3009 | PORT=3009 |
| admin-service | 3010 | PORT=3010 |
| advertising-service | 3011 | PORT=3011 |
| notification-service | 3012 | PORT=3012 |
| workflow-engine | 3013 | PORT=3013 |
| automation-service | 3014 | PORT=3014 |
| **api-gateway** | **4000** | PORT=4000 |
| AI service (Python) | 8000 | PORT=8000 |
| realtime-service (Go) | 8081 | PORT=8081 |

## Standard Variable Patterns

### Database (PostgreSQL)
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_{service_name}
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### Redis
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0  # See Redis DB assignments below
REDIS_URL=redis://localhost:6379
```

### JWT
```bash
JWT_ACCESS_SECRET=your-jwt-access-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key-min-32-chars
JWT_ACCESS_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=30d
```

### Service Authentication
```bash
SERVICE_API_KEY=your-internal-service-api-key-min-32-chars
```

### CORS
```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://flamoral.com,https://www.flamoral.com,https://admin.flamoral.com
```

### Timeouts
```bash
REQUEST_TIMEOUT_MS=30000  # 30 seconds (default)
REQUEST_TIMEOUT_MS=60000  # 60 seconds (media uploads)
REQUEST_TIMEOUT_MS=45000  # 45 seconds (payments)
```

## Redis Database Assignments

| Service | REDIS_DB | REDIS_URL |
|---------|----------|-----------|
| auth-service | 0 | redis://localhost:6379 |
| user-service | 0 | redis://localhost:6379 |
| matching-service | 1 | redis://localhost:6379/1 |
| messaging-service | 2 | redis://localhost:6379/2 |
| media-service | 3 | redis://localhost:6379/3 |
| analytics-service | 6 | redis://localhost:6379/6 |
| payment-service | 7 | redis://localhost:6379/7 |
| moderation-service | 8 | redis://localhost:6379/8 |
| notification-service | 0 | redis://localhost:6379 |
| admin-service | 0 | redis://localhost:6379 |
| api-gateway | 0 | redis://localhost:6379 |

**Why different databases?** Isolates data to prevent key collisions and enables independent cache clearing.

## Service URLs (Development)

```bash
# Authentication & Users
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002

# Core Features
MATCHING_SERVICE_URL=http://localhost:3009
MESSAGING_SERVICE_URL=http://localhost:3004

# Content & Media
MEDIA_SERVICE_URL=http://localhost:3006
MODERATION_SERVICE_URL=http://localhost:3008

# Business & Admin
PAYMENT_SERVICE_URL=http://localhost:3005
ADMIN_SERVICE_URL=http://localhost:3010
ADVERTISING_SERVICE_URL=http://localhost:3011

# Platform Services
ANALYTICS_SERVICE_URL=http://localhost:3007
NOTIFICATION_SERVICE_URL=http://localhost:3012
WORKFLOW_ENGINE_URL=http://localhost:3013
AUTOMATION_SERVICE_URL=http://localhost:3014

# Gateway & Realtime
API_GATEWAY_URL=http://localhost:4000
REALTIME_SERVICE_URL=http://localhost:8081
AI_SERVICE_URL=http://localhost:8000
```

## Common Service Dependencies

### Auth Service Needs
- USER_SERVICE_URL
- NOTIFICATION_SERVICE_URL
- ANALYTICS_SERVICE_URL

### User Service Needs
- AUTH_SERVICE_URL
- MODERATION_SERVICE_URL
- NOTIFICATION_SERVICE_URL
- ANALYTICS_SERVICE_URL

### Matching Service Needs
- USER_SERVICE_URL
- AUTH_SERVICE_URL
- NOTIFICATION_SERVICE_URL
- ANALYTICS_SERVICE_URL

### Messaging Service Needs
- USER_SERVICE_URL
- MATCHING_SERVICE_URL
- NOTIFICATION_SERVICE_URL
- AUTH_SERVICE_URL

### Media Service Needs
- USER_SERVICE_URL
- MODERATION_SERVICE_URL
- ANALYTICS_SERVICE_URL

### Payment Service Needs
- USER_SERVICE_URL
- AUTH_SERVICE_URL
- NOTIFICATION_SERVICE_URL
- ANALYTICS_SERVICE_URL

## Environment-Specific Settings

### Development (.env.dev.example)
```bash
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_DEBUG_LOGGING=true
ENABLE_GRAPHQL_PLAYGROUND=true
ENABLE_API_DOCS=true
```

### Staging (.env.staging.example)
```bash
NODE_ENV=staging
LOG_LEVEL=info
ENABLE_DEBUG_LOGGING=false
ENABLE_GRAPHQL_PLAYGROUND=true  # For testing
ENABLE_API_DOCS=true
```

### Production (.env.prod.example)
```bash
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_DEBUG_LOGGING=false
ENABLE_GRAPHQL_PLAYGROUND=false
ENABLE_API_DOCS=false
ENABLE_VERBOSE_ERRORS=false
```

## Azure Configuration

### Storage
```bash
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account
AZURE_STORAGE_ACCOUNT_KEY=*** # Azure Key Vault
AZURE_STORAGE_CONNECTION_STRING=*** # Azure Key Vault
AZURE_STORAGE_CONTAINER_PHOTOS=photos
AZURE_STORAGE_CONTAINER_VIDEOS=videos
AZURE_CDN_URL=https://cdn.flamoral.com
```

### Cognitive Services
```bash
AZURE_FACE_API_KEY=*** # Azure Key Vault
AZURE_FACE_ENDPOINT=https://eastus.api.cognitive.microsoft.com
AZURE_CV_API_KEY=*** # Azure Key Vault
AZURE_CV_ENDPOINT=https://eastus.api.cognitive.microsoft.com
AZURE_CONTENT_MODERATOR_KEY=*** # Azure Key Vault
AZURE_CONTENT_MODERATOR_ENDPOINT=https://eastus.api.cognitive.microsoft.com
```

### Key Vault
```bash
KEY_VAULT_NAME=flamoral-{env}-kv
KEY_VAULT_URI=https://flamoral-{env}-kv.vault.azure.net/
```

## Third-Party Service Configuration

### Stripe (Payments)
```bash
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... in production
STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_API_VERSION=2024-12-18.acacia
```

### SendGrid (Email)
```bash
SENDGRID_API_KEY=SG.***
EMAIL_FROM=noreply@flamoral.com
EMAIL_FROM_NAME=Flamoral
```

### Twilio (SMS)
```bash
TWILIO_ACCOUNT_SID=ACxxxxx...
TWILIO_AUTH_TOKEN=***
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VERIFY_SERVICE_SID=VAxxxxx...
```

### Firebase (Push Notifications)
```bash
FIREBASE_PROJECT_ID=flamoral-{env}
FIREBASE_PRIVATE_KEY=*** # Azure Key Vault
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@flamoral-{env}.iam.gserviceaccount.com
```

### Agora (Video Calls)
```bash
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=*** # Azure Key Vault
```

## Security Best Practices

### 1. Never Commit Secrets
- ✅ Use .env.example files (no real secrets)
- ✅ Add .env to .gitignore
- ❌ Never commit .env files with real values

### 2. Secret Generation
```bash
# JWT secrets (64 characters minimum)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# SERVICE_API_KEY (32 characters minimum)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -base64 64
```

### 3. Production Secret Management
- Store ALL secrets in Azure Key Vault
- Use Managed Identity for access
- Rotate secrets regularly
- Never use default values

### 4. Secret Naming Convention (Azure Key Vault)
```
flamoral-{environment}-{service}-{secret-name}

Examples:
flamoral-prod-auth-jwt-access-secret
flamoral-prod-payment-stripe-secret-key
flamoral-prod-media-azure-storage-key
```

## Quick Troubleshooting

### Service Can't Connect to Database
```bash
# Check:
1. DB_HOST is correct (localhost for local, FQDN for Azure)
2. DB_PORT=5432
3. DB_NAME exists
4. DB_USER has permissions
5. If Azure: DB_SSL=true
```

### Service Can't Connect to Redis
```bash
# Check:
1. REDIS_HOST is correct
2. REDIS_PORT=6379 (or 6380 for Azure with TLS)
3. REDIS_PASSWORD set if required
4. REDIS_URL matches individual vars
5. If Azure: Use rediss:// (TLS)
```

### Service-to-Service Communication Fails
```bash
# Check:
1. Service URLs use correct ports
2. SERVICE_API_KEY matches across services
3. Target service is running
4. Network allows communication
5. Timeout is sufficient (REQUEST_TIMEOUT_MS)
```

### JWT Authentication Fails
```bash
# Check:
1. JWT_ACCESS_SECRET same across all services
2. JWT_REFRESH_SECRET same across all services
3. Token not expired (check JWT_ACCESS_EXPIRES_IN)
4. JWT_ISSUER and JWT_AUDIENCE match (if used)
```

## Files Overview

| File | Purpose | Status |
|------|---------|--------|
| backend/services/{service}/.env.example | Service-specific config template | ✅ 11 fixed |
| .env.example | Root project config template | ⚠️ Needs update |
| .env.dev.example | Development environment | ✅ Good |
| .env.staging.example | Staging environment | ⚠️ Needs update |
| .env.prod.example | Production environment | ✅ Good |
| infrastructure/config/.env.development | Infra dev config | ✅ Fixed |
| infrastructure/config/.env.staging | Infra staging config | ⚠️ Review needed |
| infrastructure/config/.env.production | Infra prod config | ⚠️ Review needed |

## Getting Started

### 1. For New Services
```bash
# Copy the template from ENV_CONFIGURATION_FIXES_SUMMARY.md
# Customize:
- SERVICE_NAME
- PORT
- DB_NAME
- REDIS_DB (use next available number)
- Service-specific configs
```

### 2. For Existing Services
```bash
# Update to match standardization:
1. Check database variables (DB_* not POSTGRES_*)
2. Add REDIS_URL
3. Add JWT_REFRESH_SECRET if missing
4. Add SERVICE_API_KEY
5. Update service URLs to correct ports
6. Change CORS_ORIGIN to CORS_ORIGINS
7. Add REQUEST_TIMEOUT_MS
```

### 3. For Local Development
```bash
# Copy .env.example to .env
cp .env.dev.example .env

# Fill in required secrets:
- Database passwords
- JWT secrets (generate with crypto.randomBytes)
- SERVICE_API_KEY (generate with crypto.randomBytes)
- Third-party API keys (Stripe, SendGrid, etc.)
```

## Related Documentation

- **ENV_CONFIGURATION_FIXES_SUMMARY.md** - Complete standardization guide with templates
- **ENV_FIXES_COMPLETE_REPORT.md** - Detailed report of all changes made
- **ENV_QUICK_REFERENCE.md** - This file (quick lookup)

## Contact

For questions about environment configuration:
- Check the detailed documentation files above
- Review service-specific .env.example files
- Consult the Azure Key Vault for production secrets

---

**Remember:** NEVER commit .env files with real secrets! Always use .env.example templates.
