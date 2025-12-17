# Environment Variables Documentation

This document provides comprehensive documentation for all environment variables used in the Flamoral Dating Platform.

## Table of Contents

1. [Environment Settings](#environment-settings)
2. [Service Configuration](#service-configuration)
3. [Database Configuration](#database-configuration)
4. [Cache Configuration](#cache-configuration)
5. [Message Queue](#message-queue)
6. [Authentication & Security](#authentication--security)
7. [OAuth Providers](#oauth-providers)
8. [Payment Gateway](#payment-gateway)
9. [Email & SMS Services](#email--sms-services)
10. [Azure Services](#azure-services)
11. [Video/Voice Calling](#videovoice-calling)
12. [Push Notifications](#push-notifications)
13. [Error Tracking & Monitoring](#error-tracking--monitoring)
14. [AI/ML Services](#aiml-services)
15. [Geolocation Services](#geolocation-services)
16. [Feature Flags](#feature-flags)
17. [Business Rules](#business-rules)

---

## Environment Settings

### NODE_ENV
- **Type:** String
- **Required:** Yes
- **Values:** `development`, `staging`, `production`
- **Default:** `development`
- **Description:** Node.js environment mode. Affects error handling, logging verbosity, and performance optimizations.

### ENVIRONMENT
- **Type:** String
- **Required:** Yes
- **Values:** `development`, `staging`, `production`
- **Default:** `development`
- **Description:** Application environment identifier used for configuration selection.

### DEBUG
- **Type:** Boolean
- **Required:** No
- **Default:** `false` (production), `true` (development)
- **Description:** Enables debug logging and verbose error messages.

### LOG_LEVEL
- **Type:** String
- **Required:** Yes
- **Values:** `error`, `warn`, `info`, `debug`
- **Default:** `info`
- **Description:** Minimum log level to output.

### LOG_FORMAT
- **Type:** String
- **Required:** No
- **Values:** `json`, `pretty`
- **Default:** `json`
- **Description:** Log output format. Use `json` for production, `pretty` for development.

---

## Service Configuration

### PORT
- **Type:** Number
- **Required:** Yes
- **Default:** `3000`
- **Description:** Port number on which the service listens.

### HOST
- **Type:** String
- **Required:** No
- **Default:** `0.0.0.0`
- **Description:** Host address to bind the service to.

### SERVICE_NAME
- **Type:** String
- **Required:** Yes
- **Example:** `user-service`
- **Description:** Unique identifier for the service instance.

### API_VERSION
- **Type:** String
- **Required:** No
- **Default:** `v1`
- **Description:** API version prefix for endpoints.

---

## Database Configuration

### PostgreSQL

#### DB_HOST
- **Type:** String
- **Required:** Yes
- **Example:** `localhost` (dev), `flamoral-prod-postgres.postgres.database.azure.com` (prod)
- **Description:** PostgreSQL server hostname.

#### DB_PORT
- **Type:** Number
- **Required:** Yes
- **Default:** `5432`
- **Description:** PostgreSQL server port.

#### DB_NAME
- **Type:** String
- **Required:** Yes
- **Example:** `flamoral_dev`, `flamoral_prod`
- **Description:** Database name.

#### DB_USER
- **Type:** String
- **Required:** Yes
- **Example:** `postgres`, `flamoral_admin`
- **Description:** Database username.

#### DB_PASSWORD
- **Type:** String (Secret)
- **Required:** Yes
- **Security:** **CRITICAL - Store in Azure Key Vault**
- **Description:** Database password.

#### DATABASE_URL
- **Type:** String (Secret)
- **Required:** Yes
- **Format:** `postgresql://user:password@host:port/database?ssl=true`
- **Security:** **CRITICAL - Store in Azure Key Vault**
- **Description:** Complete PostgreSQL connection string.

#### DB_POOL_MIN
- **Type:** Number
- **Required:** No
- **Default:** `2` (dev), `10` (prod)
- **Description:** Minimum number of connections in the pool.

#### DB_POOL_MAX
- **Type:** Number
- **Required:** No
- **Default:** `10` (dev), `50` (prod)
- **Description:** Maximum number of connections in the pool.

#### DB_SSL
- **Type:** Boolean
- **Required:** No
- **Default:** `false` (dev), `true` (prod/staging)
- **Description:** Enable SSL/TLS for database connections.

### MongoDB

#### MONGODB_URI
- **Type:** String (Secret)
- **Required:** Yes (for services using MongoDB)
- **Format:** `mongodb://username:password@host:port/database`
- **Security:** **CRITICAL - Store in Azure Key Vault**
- **Description:** MongoDB connection string.

#### MONGODB_DB
- **Type:** String
- **Required:** Yes
- **Example:** `flamoral_dev`
- **Description:** MongoDB database name.

#### MONGODB_MAX_POOL_SIZE
- **Type:** Number
- **Required:** No
- **Default:** `10` (dev), `50` (prod)
- **Description:** Maximum connection pool size.

---

## Cache Configuration

### REDIS_HOST
- **Type:** String
- **Required:** Yes
- **Example:** `localhost`, `flamoral-prod-redis.redis.cache.windows.net`
- **Description:** Redis server hostname.

### REDIS_PORT
- **Type:** Number
- **Required:** Yes
- **Default:** `6379` (local), `6380` (Azure with SSL)
- **Description:** Redis server port.

### REDIS_PASSWORD
- **Type:** String (Secret)
- **Required:** Yes (production)
- **Security:** **Store in Azure Key Vault**
- **Description:** Redis authentication password.

### REDIS_URL
- **Type:** String (Secret)
- **Required:** No
- **Format:** `redis://[:password@]host:port` or `rediss://` for SSL
- **Security:** **Store in Azure Key Vault**
- **Description:** Complete Redis connection string.

### REDIS_TLS
- **Type:** Boolean
- **Required:** No
- **Default:** `false` (dev), `true` (prod/staging)
- **Description:** Enable TLS for Redis connections.

### REDIS_TTL
- **Type:** Number
- **Required:** No
- **Default:** `3600` (seconds)
- **Description:** Default time-to-live for cached items.

---

## Message Queue

### Azure Service Bus

#### AZURE_SERVICE_BUS_CONNECTION_STRING
- **Type:** String (Secret)
- **Required:** Yes (staging/production)
- **Security:** **CRITICAL - Store in Azure Key Vault**
- **Description:** Azure Service Bus connection string.

### RabbitMQ (Development)

#### RABBITMQ_URL
- **Type:** String
- **Required:** Yes (development)
- **Default:** `amqp://guest:guest@localhost:5672`
- **Description:** RabbitMQ connection URL.

### Queue Names

#### QUEUE_MATCHING
- **Type:** String
- **Default:** `matching_queue`
- **Description:** Queue for matching algorithm jobs.

#### QUEUE_NOTIFICATIONS
- **Type:** String
- **Default:** `notification_queue`
- **Description:** Queue for notification delivery.

#### QUEUE_ANALYTICS
- **Type:** String
- **Default:** `analytics_queue`
- **Description:** Queue for analytics events.

---

## Authentication & Security

### JWT Configuration

#### JWT_SECRET
- **Type:** String (Secret)
- **Required:** Yes
- **Min Length:** 64 characters
- **Security:** **CRITICAL - Store in Azure Key Vault**
- **Description:** Secret key for JWT signing. Use cryptographically secure random string.
- **Generation:** `openssl rand -base64 48 | tr -d "=+/" | cut -c1-64`

#### JWT_ACCESS_SECRET
- **Type:** String (Secret)
- **Required:** Yes
- **Min Length:** 64 characters
- **Security:** **CRITICAL - Store in Azure Key Vault**
- **Description:** Secret key for JWT access token signing.

#### JWT_REFRESH_SECRET
- **Type:** String (Secret)
- **Required:** Yes
- **Min Length:** 64 characters
- **Security:** **CRITICAL - Store in Azure Key Vault**
- **Description:** Secret key for JWT refresh token signing.

#### JWT_ACCESS_EXPIRES_IN
- **Type:** String
- **Required:** No
- **Default:** `15m`
- **Format:** Time string (e.g., `15m`, `1h`, `7d`)
- **Description:** Access token expiration time.

#### JWT_REFRESH_EXPIRES_IN
- **Type:** String
- **Required:** No
- **Default:** `7d`
- **Format:** Time string
- **Description:** Refresh token expiration time.

#### JWT_ALGORITHM
- **Type:** String
- **Required:** No
- **Default:** `HS256`
- **Values:** `HS256`, `HS384`, `HS512`, `RS256`
- **Description:** JWT signing algorithm.

### Service-to-Service Authentication

#### SERVICE_API_KEY
- **Type:** String (Secret)
- **Required:** Yes
- **Min Length:** 64 characters
- **Security:** **CRITICAL - Store in Azure Key Vault, Must be identical across all services**
- **Description:** API key for service-to-service authentication.

#### SESSION_SECRET
- **Type:** String (Secret)
- **Required:** Yes
- **Min Length:** 32 characters
- **Security:** **CRITICAL - Store in Azure Key Vault**
- **Description:** Secret for session cookie encryption.

### Password Security

#### BCRYPT_ROUNDS
- **Type:** Number
- **Required:** No
- **Default:** `10` (dev), `12` (prod)
- **Range:** 10-14
- **Description:** Number of salt rounds for bcrypt hashing. Higher = more secure but slower.

#### PASSWORD_MIN_LENGTH
- **Type:** Number
- **Required:** No
- **Default:** `8`
- **Description:** Minimum password length requirement.

#### MAX_LOGIN_ATTEMPTS
- **Type:** Number
- **Required:** No
- **Default:** `5`
- **Description:** Maximum failed login attempts before account lockout.

#### ACCOUNT_LOCKOUT_DURATION
- **Type:** Number
- **Required:** No
- **Default:** `1800000` (30 minutes in milliseconds)
- **Description:** Duration of account lockout after max failed attempts.

---

## OAuth Providers

### Google OAuth

#### GOOGLE_CLIENT_ID
- **Type:** String
- **Required:** Yes (if Google login enabled)
- **Format:** `*.apps.googleusercontent.com`
- **Description:** Google OAuth 2.0 client ID.

#### GOOGLE_CLIENT_SECRET
- **Type:** String (Secret)
- **Required:** Yes (if Google login enabled)
- **Security:** **Store in Azure Key Vault**
- **Description:** Google OAuth 2.0 client secret.

#### GOOGLE_CALLBACK_URL
- **Type:** String
- **Required:** Yes
- **Example:** `https://api.flamoral.app/auth/google/callback`
- **Description:** OAuth callback URL registered with Google.

### Facebook OAuth

#### FACEBOOK_APP_ID
- **Type:** String
- **Required:** Yes (if Facebook login enabled)
- **Description:** Facebook App ID.

#### FACEBOOK_APP_SECRET
- **Type:** String (Secret)
- **Required:** Yes (if Facebook login enabled)
- **Security:** **Store in Azure Key Vault**
- **Description:** Facebook App Secret.

#### FACEBOOK_CALLBACK_URL
- **Type:** String
- **Required:** Yes
- **Example:** `https://api.flamoral.app/auth/facebook/callback`
- **Description:** OAuth callback URL registered with Facebook.

### Apple OAuth

#### APPLE_CLIENT_ID
- **Type:** String
- **Required:** Yes (if Apple login enabled)
- **Example:** `com.flamoral.app`
- **Description:** Apple Services ID (identifier).

#### APPLE_TEAM_ID
- **Type:** String
- **Required:** Yes
- **Description:** Apple Developer Team ID.

#### APPLE_KEY_ID
- **Type:** String
- **Required:** Yes
- **Description:** Apple private key ID.

#### APPLE_PRIVATE_KEY
- **Type:** String (Secret)
- **Required:** Yes
- **Security:** **CRITICAL - Store in Azure Key Vault**
- **Description:** Apple private key for Sign in with Apple.

---

## Payment Gateway

### Stripe

#### STRIPE_SECRET_KEY
- **Type:** String (Secret)
- **Required:** Yes
- **Format:** `sk_test_*` (test) or `sk_live_*` (production)
- **Security:** **CRITICAL - Store in Azure Key Vault**
- **Description:** Stripe secret API key. Use test keys in development/staging.

#### STRIPE_PUBLISHABLE_KEY
- **Type:** String
- **Required:** Yes
- **Format:** `pk_test_*` (test) or `pk_live_*` (production)
- **Description:** Stripe publishable key (safe to expose in frontend).

#### STRIPE_WEBHOOK_SECRET
- **Type:** String (Secret)
- **Required:** Yes
- **Format:** `whsec_*`
- **Security:** **CRITICAL - Store in Azure Key Vault**
- **Description:** Stripe webhook signing secret for verifying webhook events.

#### STRIPE_API_VERSION
- **Type:** String
- **Required:** No
- **Default:** `2024-12-18.acacia`
- **Description:** Stripe API version to use.

---

## Email & SMS Services

### SendGrid (Email)

#### SENDGRID_API_KEY
- **Type:** String (Secret)
- **Required:** Yes
- **Format:** `SG.*`
- **Security:** **Store in Azure Key Vault**
- **Description:** SendGrid API key for sending emails.

#### SENDGRID_FROM_EMAIL
- **Type:** String
- **Required:** Yes
- **Format:** Valid email address
- **Example:** `noreply@flamoral.com`
- **Description:** Default sender email address.

#### SENDGRID_FROM_NAME
- **Type:** String
- **Required:** No
- **Default:** `Flamoral`
- **Description:** Default sender name.

### Twilio (SMS)

#### TWILIO_ACCOUNT_SID
- **Type:** String
- **Required:** Yes
- **Format:** `AC*`
- **Description:** Twilio Account SID.

#### TWILIO_AUTH_TOKEN
- **Type:** String (Secret)
- **Required:** Yes
- **Security:** **Store in Azure Key Vault**
- **Description:** Twilio Auth Token.

#### TWILIO_PHONE_NUMBER
- **Type:** String
- **Required:** Yes
- **Format:** E.164 format (e.g., `+1234567890`)
- **Description:** Twilio phone number for sending SMS.

#### TWILIO_VERIFY_SERVICE_SID
- **Type:** String
- **Required:** Yes (if using Twilio Verify)
- **Format:** `VA*`
- **Description:** Twilio Verify service SID for OTP verification.

---

## Azure Services

### Azure Storage

#### AZURE_STORAGE_ACCOUNT
- **Type:** String
- **Required:** Yes
- **Example:** `flamoralprodst`
- **Description:** Azure Storage account name.

#### AZURE_STORAGE_KEY
- **Type:** String (Secret)
- **Required:** Yes
- **Security:** **CRITICAL - Store in Azure Key Vault**
- **Description:** Azure Storage account access key.

#### AZURE_STORAGE_CONNECTION_STRING
- **Type:** String (Secret)
- **Required:** Yes
- **Security:** **CRITICAL - Store in Azure Key Vault**
- **Description:** Complete Azure Storage connection string.

#### AZURE_STORAGE_CONTAINER_PHOTOS
- **Type:** String
- **Required:** No
- **Default:** `photos`
- **Description:** Blob container name for photo storage.

#### AZURE_STORAGE_CONTAINER_VIDEOS
- **Type:** String
- **Required:** No
- **Default:** `videos`
- **Description:** Blob container name for video storage.

#### AZURE_STORAGE_CDN_ENDPOINT
- **Type:** String
- **Required:** No (production recommended)
- **Example:** `https://cdn.flamoral.app`
- **Description:** Azure CDN endpoint for serving media.

### Azure Cognitive Services

#### AZURE_FACE_API_KEY
- **Type:** String (Secret)
- **Required:** Yes (if face verification enabled)
- **Security:** **Store in Azure Key Vault**
- **Description:** Azure Face API key for photo verification.

#### AZURE_FACE_API_ENDPOINT
- **Type:** String
- **Required:** Yes
- **Example:** `https://eastus.api.cognitive.microsoft.com`
- **Description:** Azure Face API endpoint URL.

#### AZURE_CONTENT_MODERATOR_KEY
- **Type:** String (Secret)
- **Required:** Yes (if content moderation enabled)
- **Security:** **Store in Azure Key Vault**
- **Description:** Azure Content Moderator API key.

#### AZURE_CONTENT_MODERATOR_ENDPOINT
- **Type:** String
- **Required:** Yes
- **Example:** `https://eastus.api.cognitive.microsoft.com`
- **Description:** Azure Content Moderator endpoint URL.

### Azure Application Insights

#### APPLICATION_INSIGHTS_CONNECTION_STRING
- **Type:** String (Secret)
- **Required:** Yes (production)
- **Security:** **Store in Azure Key Vault**
- **Description:** Application Insights connection string for telemetry.

---

## Video/Voice Calling

### Agora

#### AGORA_APP_ID
- **Type:** String
- **Required:** Yes (if video calls enabled)
- **Description:** Agora App ID.

#### AGORA_APP_CERTIFICATE
- **Type:** String (Secret)
- **Required:** Yes
- **Security:** **CRITICAL - Store in Azure Key Vault**
- **Description:** Agora App Certificate for generating tokens.

#### AGORA_CUSTOMER_KEY
- **Type:** String (Secret)
- **Required:** Yes
- **Security:** **Store in Azure Key Vault**
- **Description:** Agora RESTful API customer key.

#### AGORA_CUSTOMER_SECRET
- **Type:** String (Secret)
- **Required:** Yes
- **Security:** **Store in Azure Key Vault**
- **Description:** Agora RESTful API customer secret.

---

## Push Notifications

### Firebase

#### FIREBASE_PROJECT_ID
- **Type:** String
- **Required:** Yes (if push notifications enabled)
- **Example:** `flamoral-production`
- **Description:** Firebase project ID.

#### FIREBASE_PRIVATE_KEY
- **Type:** String (Secret)
- **Required:** Yes
- **Security:** **CRITICAL - Store in Azure Key Vault**
- **Description:** Firebase service account private key (JSON format).

#### FIREBASE_CLIENT_EMAIL
- **Type:** String
- **Required:** Yes
- **Format:** Email address
- **Example:** `firebase-adminsdk@flamoral-production.iam.gserviceaccount.com`
- **Description:** Firebase service account email.

#### FIREBASE_DATABASE_URL
- **Type:** String
- **Required:** No
- **Example:** `https://flamoral-production.firebaseio.com`
- **Description:** Firebase Realtime Database URL (if used).

---

## Error Tracking & Monitoring

### Sentry

#### SENTRY_DSN
- **Type:** String (Secret)
- **Required:** Yes (production recommended)
- **Format:** `https://*@sentry.io/*`
- **Security:** **Store in Azure Key Vault**
- **Description:** Sentry Data Source Name for error tracking.

#### SENTRY_ENVIRONMENT
- **Type:** String
- **Required:** Yes
- **Values:** `development`, `staging`, `production`
- **Description:** Environment identifier for Sentry.

#### SENTRY_TRACES_SAMPLE_RATE
- **Type:** Number
- **Required:** No
- **Default:** `1.0` (dev), `0.1` (prod)
- **Range:** 0.0 to 1.0
- **Description:** Percentage of transactions to trace (1.0 = 100%).

### Analytics

#### MIXPANEL_TOKEN
- **Type:** String (Secret)
- **Required:** Yes (if analytics enabled)
- **Security:** **Store in Azure Key Vault**
- **Description:** Mixpanel project token.

#### GOOGLE_ANALYTICS_ID
- **Type:** String
- **Required:** No
- **Format:** `UA-XXXXXXXXX-X`
- **Description:** Google Analytics tracking ID.

---

## AI/ML Services

### OpenAI

#### OPENAI_API_KEY
- **Type:** String (Secret)
- **Required:** Yes (if AI features enabled)
- **Format:** `sk-*`
- **Security:** **CRITICAL - Store in Azure Key Vault**
- **Description:** OpenAI API key for GPT models.

#### OPENAI_MODEL
- **Type:** String
- **Required:** No
- **Default:** `gpt-4`
- **Values:** `gpt-3.5-turbo`, `gpt-4`, `gpt-4-turbo`
- **Description:** OpenAI model to use.

#### OPENAI_MAX_TOKENS
- **Type:** Number
- **Required:** No
- **Default:** `2000`
- **Description:** Maximum tokens for OpenAI completions.

### Custom AI Model

#### AI_MODEL_ENDPOINT
- **Type:** String
- **Required:** Yes (if custom AI enabled)
- **Example:** `https://ai.flamoral.app`
- **Description:** Custom AI model endpoint URL.

#### AI_MODEL_API_KEY
- **Type:** String (Secret)
- **Required:** Yes
- **Security:** **Store in Azure Key Vault**
- **Description:** API key for custom AI model.

---

## Geolocation Services

### Google Maps

#### GOOGLE_MAPS_API_KEY
- **Type:** String (Secret)
- **Required:** Yes
- **Security:** **Store in Azure Key Vault**
- **Description:** Google Maps API key for geocoding and maps.

### Mapbox

#### MAPBOX_ACCESS_TOKEN
- **Type:** String (Secret)
- **Required:** Yes (alternative to Google Maps)
- **Security:** **Store in Azure Key Vault**
- **Description:** Mapbox access token.

### Configuration

#### DEFAULT_LOCATION_RADIUS_KM
- **Type:** Number
- **Required:** No
- **Default:** `50`
- **Description:** Default search radius for location-based matching (in kilometers).

---

## Feature Flags

### FEATURE_AI_MATCHING
- **Type:** Boolean
- **Default:** `true`
- **Description:** Enable AI-powered matching algorithm.

### FEATURE_VIDEO_CALLS
- **Type:** Boolean
- **Default:** `true`
- **Description:** Enable video calling feature.

### FEATURE_TRAVEL_MODE
- **Type:** Boolean
- **Default:** `true`
- **Description:** Enable travel mode for location-based matching.

### FEATURE_DATING_COACH
- **Type:** Boolean
- **Default:** `true`
- **Description:** Enable AI dating coach feature.

### FEATURE_GAMIFICATION
- **Type:** Boolean
- **Default:** `true`
- **Description:** Enable gamification features (badges, achievements).

### FEATURE_SOCIAL_FEED
- **Type:** Boolean
- **Default:** `true`
- **Description:** Enable social feed feature.

### FEATURE_STORIES
- **Type:** Boolean
- **Default:** `true`
- **Description:** Enable stories feature.

### FEATURE_BETA_FEATURES
- **Type:** Boolean
- **Default:** `false` (production), `true` (dev/staging)
- **Description:** Enable experimental beta features.

---

## Business Rules

### MIN_AGE
- **Type:** Number
- **Required:** Yes
- **Default:** `18`
- **Description:** Minimum age requirement for users.

### MAX_AGE
- **Type:** Number
- **Required:** Yes
- **Default:** `100`
- **Description:** Maximum age for user profiles.

### FREE_LIKES_PER_DAY
- **Type:** Number
- **Required:** No
- **Default:** `10`
- **Description:** Number of likes free users get per day.

### FREE_SUPER_LIKES_PER_DAY
- **Type:** Number
- **Required:** No
- **Default:** `1`
- **Description:** Number of super likes free users get per day.

### MATCH_EXPIRY_DAYS
- **Type:** Number
- **Required:** No
- **Default:** `30`
- **Description:** Number of days before unused matches expire.

### MESSAGE_RETENTION_DAYS
- **Type:** Number
- **Required:** No
- **Default:** `365`
- **Description:** Number of days to retain message history.

---

## Security Best Practices

1. **Never commit secrets to version control**
   - Use `.env.example` files with placeholder values
   - Add `.env*` to `.gitignore` (except `.env.example`)

2. **Use Azure Key Vault for all secrets in staging/production**
   - Store all sensitive values marked with "Store in Azure Key Vault"
   - Use managed identity for Key Vault access
   - Rotate secrets regularly using provided scripts

3. **Generate cryptographically secure secrets**
   ```bash
   # Generate 64-character secret
   openssl rand -base64 48 | tr -d "=+/" | cut -c1-64
   ```

4. **Environment-specific values**
   - Development: Use test/sandbox credentials
   - Staging: Mirror production config with test payment keys
   - Production: Use live credentials, strict security settings

5. **Secret rotation schedule**
   - JWT secrets: Every 90 days
   - Service API keys: Every 90 days
   - Database passwords: Every 180 days
   - External API keys: As required by provider

---

## Validation

Use the provided validation script to check your environment configuration:

```bash
./scripts/validate-env.sh <environment>
```

This will verify:
- All required variables are set
- Secret values are not using placeholder/example values
- Format validation for URLs, emails, etc.
- Service connectivity tests

---

## Additional Resources

- [Azure Key Vault Setup Guide](../scripts/azure-keyvault-setup.sh)
- [Environment Sync Script](../scripts/azure-keyvault-sync.sh)
- [Secret Rotation Script](../scripts/azure-keyvault-rotate.sh)
- [Kubernetes ConfigMaps](../kubernetes/configmaps/)
- [Kubernetes Secrets](../kubernetes/secrets/)

---

**Last Updated:** 2025-12-11
