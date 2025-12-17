# WebSocket Environment Variables Reference

This document provides a quick reference for all WebSocket-related environment variables across services.

## API Gateway

### Required Variables

```env
# JWT Authentication
JWT_SECRET=your-jwt-secret-change-in-production
JWT_ACCESS_SECRET=your-jwt-access-secret-change-in-production

# CORS
ALLOWED_ORIGINS=https://flamoral.com,https://www.flamoral.com,https://admin.flamoral.com,http://localhost:5173,http://localhost:5174
```

### Optional Variables (WebSocket)

```env
# Redis (for Socket.IO horizontal scaling)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
REDIS_DB=0

# Port
PORT=4000
```

### Defaults

If not set, the following defaults are used:
- `REDIS_HOST`: `localhost`
- `REDIS_PORT`: `6379`
- `REDIS_TLS`: `false`
- `REDIS_DB`: `0`
- `PORT`: `4000`

## Messaging Service

### Required Variables

```env
# CORS
ALLOWED_ORIGINS=https://flamoral.com,https://www.flamoral.com,http://localhost:5173

# Cosmos DB (for message storage)
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key
COSMOS_DATABASE_NAME=flamoral-messaging
```

### Optional Variables

```env
# Redis (for online status caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Port
PORT=3004

# User Service (for fetching contacts)
USER_SERVICE_URL=http://localhost:3002
```

### Defaults

- `ALLOWED_ORIGINS`: Default development origins
- `PORT`: `3004`
- `USER_SERVICE_URL`: `http://user-service:3001`

## User Service

### Required Variables

```env
# JWT Authentication
JWT_ACCESS_SECRET=your-jwt-access-secret-change-in-production
# Or
JWT_SECRET=your-jwt-secret-change-in-production

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://flamoral.com
```

### Optional Variables

```env
# Port
PORT=3002
```

### Defaults

- `CORS_ORIGINS`: `*` (allow all) if not set
- `JWT_ACCESS_SECRET`: Falls back to `JWT_SECRET` if not set
- `PORT`: `3001`

## Automation Service

### Required Variables

```env
# JWT Authentication
JWT_ACCESS_SECRET=your-jwt-access-secret

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_automation
DB_USER=postgres
DB_PASSWORD=your-db-password

# CORS
CORS_ORIGINS=http://localhost:5173,https://flamoral.com
```

### Optional Variables

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=7

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=flamoral_events

# Port
PORT=3014

# Feature Flags
ENABLE_AUTO_DM_FLOWS=true
ENABLE_ICEBREAKER_SUGGESTIONS=true
ENABLE_GHOSTING_DETECTION=true
ENABLE_SCHEDULED_MESSAGES=true
ENABLE_AI_REPLY_ASSISTANT=true

# OpenAI
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4-turbo-preview
```

### Defaults

- `REDIS_DB`: `7` (different from other services to avoid conflicts)
- `PORT`: `3014`
- Feature flags default to `false` if not set

## WebSocket Configuration Options

These are configured in code but can be overridden via environment variables in some services:

### Connection Settings

```env
# Ping timeout (milliseconds) - how long to wait for pong before considering connection dead
WEBSOCKET_PING_TIMEOUT=60000

# Ping interval (milliseconds) - how often to send ping
WEBSOCKET_PING_INTERVAL=25000

# Upgrade timeout (milliseconds) - how long to wait for WebSocket upgrade
WEBSOCKET_UPGRADE_TIMEOUT=10000

# Max HTTP buffer size (bytes)
WEBSOCKET_MAX_BUFFER_SIZE=1000000
```

Current defaults (hardcoded):
- `pingTimeout`: `60000` (60 seconds)
- `pingInterval`: `25000` (25 seconds)
- `upgradeTimeout`: `10000` (10 seconds)
- `maxHttpBufferSize`: `1e6` (1MB)

### Transport Settings

- `transports`: `['websocket', 'polling']` (both enabled)
- `allowEIO3`: `true` (backward compatibility with Socket.IO v2/v3)
- `allowUpgrades`: `true` (allow upgrade from polling to WebSocket)

## CORS Configuration

### Allowed Origins

All services should use the same CORS origins. Configure via `ALLOWED_ORIGINS` or `CORS_ORIGINS`:

**Development**:
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000,http://localhost:5173,http://localhost:5174
```

**Production**:
```env
ALLOWED_ORIGINS=https://flamoral.com,https://www.flamoral.com,https://admin.flamoral.com,https://app.flamoral.com,https://*.flamoral.com
```

**Both**:
```env
ALLOWED_ORIGINS=https://flamoral.com,https://www.flamoral.com,https://admin.flamoral.com,http://localhost:5173,http://localhost:5174
```

### CORS Methods

Default (hardcoded):
- HTTP: `['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']`
- WebSocket: `['GET', 'POST']`

### CORS Headers

Default allowed headers:
- `Content-Type`
- `Authorization`
- `X-Requested-With`
- `X-Request-ID`
- `X-Correlation-ID`
- `X-CSRF-Token`
- `x-csrf-token`
- `X-API-Key`
- `X-Device-ID`
- `X-Platform`

## Example .env Files

### Development (api-gateway)

```env
# Service
NODE_ENV=development
PORT=4000

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000

# JWT
JWT_SECRET=dev-secret-change-in-production
JWT_ACCESS_SECRET=dev-access-secret-change-in-production

# Redis (optional for development)
# REDIS_HOST=localhost
# REDIS_PORT=6379
```

### Production (api-gateway)

```env
# Service
NODE_ENV=production
PORT=4000

# CORS
ALLOWED_ORIGINS=https://flamoral.com,https://www.flamoral.com,https://admin.flamoral.com,https://app.flamoral.com,https://*.flamoral.com

# JWT
JWT_SECRET=${JWT_SECRET_FROM_AZURE_KEY_VAULT}
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET_FROM_AZURE_KEY_VAULT}

# Redis (required for horizontal scaling)
REDIS_HOST=${AZURE_REDIS_HOST}
REDIS_PORT=6380
REDIS_PASSWORD=${AZURE_REDIS_PASSWORD}
REDIS_TLS=true
REDIS_DB=0
```

### Development (messaging-service)

```env
# Service
NODE_ENV=development
PORT=3004

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000

# Cosmos DB
COSMOS_ENDPOINT=https://flamoral-dev.documents.azure.com:443/
COSMOS_KEY=${COSMOS_DEV_KEY}
COSMOS_DATABASE_NAME=flamoral-messaging-dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# User Service
USER_SERVICE_URL=http://localhost:3002
```

### Production (messaging-service)

```env
# Service
NODE_ENV=production
PORT=3004

# CORS
ALLOWED_ORIGINS=https://flamoral.com,https://www.flamoral.com,https://*.flamoral.com

# Cosmos DB
COSMOS_ENDPOINT=${AZURE_COSMOS_ENDPOINT}
COSMOS_KEY=${AZURE_COSMOS_KEY}
COSMOS_DATABASE_NAME=flamoral-messaging

# Redis
REDIS_HOST=${AZURE_REDIS_HOST}
REDIS_PORT=6380
REDIS_PASSWORD=${AZURE_REDIS_PASSWORD}

# User Service
USER_SERVICE_URL=http://user-service:3002
```

## Validation

### Required Variables Check

Each service validates required environment variables on startup:

**API Gateway**:
- `JWT_SECRET` or `JWT_ACCESS_SECRET`

**Messaging Service**:
- `COSMOS_ENDPOINT` (warns if missing)
- `COSMOS_KEY` (warns if missing)

**User Service**:
- `JWT_ACCESS_SECRET` or `JWT_SECRET`

**Automation Service**:
- `JWT_ACCESS_SECRET`
- `DB_HOST`
- `DB_PASSWORD`

### Environment-Specific Requirements

**Development**:
- Can run without Redis
- Can use default JWT secrets (not recommended)
- CORS can be permissive

**Production**:
- **MUST** use Redis for API Gateway (horizontal scaling)
- **MUST** use secure JWT secrets from Key Vault
- **MUST** use restrictive CORS origins
- **MUST** use TLS for Redis (`REDIS_TLS=true`)
- **SHOULD** use managed Cosmos DB
- **SHOULD** enable all monitoring

## Security Notes

1. **Never commit .env files** - Add to `.gitignore`
2. **Use Azure Key Vault in production** - Store secrets securely
3. **Rotate secrets regularly** - Implement secret rotation policy
4. **Use different secrets per environment** - Dev/Staging/Prod should have different secrets
5. **Limit CORS origins** - Only allow trusted domains
6. **Enable TLS for Redis in production** - Encrypt Redis traffic
7. **Use strong JWT secrets** - Minimum 32 characters, random

## Troubleshooting

### WebSocket Connection Fails

Check:
1. `JWT_SECRET` / `JWT_ACCESS_SECRET` is set and matches auth service
2. `ALLOWED_ORIGINS` / `CORS_ORIGINS` includes the client origin
3. Redis is running (if used)
4. Port is not blocked by firewall

### Redis Connection Fails

Check:
1. `REDIS_HOST` is correct
2. `REDIS_PORT` is correct (6379 for local, 6380 for Azure with TLS)
3. `REDIS_PASSWORD` is set (if required)
4. `REDIS_TLS` is `true` for Azure Redis
5. Network connectivity to Redis server

### Authentication Fails

Check:
1. JWT secret matches between auth service and WebSocket service
2. Token is not expired
3. Token payload includes `userId` or `id` field

## Environment Variable Precedence

1. System environment variables (highest priority)
2. `.env.local` file
3. `.env.{NODE_ENV}` file (e.g., `.env.production`)
4. `.env` file
5. Default values in code (lowest priority)

## Best Practices

1. **Use `.env.example` files** - Document all required variables
2. **Validate on startup** - Fail fast if required variables are missing
3. **Use sensible defaults** - For non-security-critical variables
4. **Document defaults** - In code comments and documentation
5. **Use type conversion** - Convert string env vars to appropriate types
6. **Group related variables** - Use prefixes (e.g., `REDIS_*`, `JWT_*`)
7. **Keep secrets out of logs** - Redact sensitive values in logging
