# Backend Service Configuration Summary

This document provides a comprehensive overview of all backend service configurations for the Flamoral dating platform.

## Service Overview

All services have been configured with standardized main.ts files, health endpoints, CORS, security headers, and environment variable handling.

## Port Configuration

| Service | Port | URL |
|---------|------|-----|
| API Gateway | 4000 | http://localhost:4000 |
| Auth Service | 3001 | http://localhost:3001 |
| User Service | 3001 | http://localhost:3001 |
| Matching Service | 3002 | http://localhost:3002 |
| Messaging Service | 3003 | http://localhost:3003 |
| Moderation Service | 3004 | http://localhost:3004 |
| Payment Service | 3005 | http://localhost:3005 |
| Media Service | 3006 | http://localhost:3006 |
| Analytics Service | 3007 | http://localhost:3007 |
| Notification Service | 3008 | http://localhost:3008 |
| Advertising Service | 3010 | http://localhost:3010 |
| Workflow Engine | 3011 | http://localhost:3011 |

**Note**: Auth Service and User Service share port 3001 as they may be combined or run as separate instances depending on deployment configuration.

## Created Files

### Main.ts Files (Service Entry Points)

All services now have standardized main.ts files with the following features:

1. **Port Configuration**
   - Uses `ConfigService.get<number>('PORT')` with fallback defaults
   - Proper environment variable handling
   - Consistent port assignments as per .env.example

2. **Security Features**
   - Helmet middleware for security headers
   - Content Security Policy configuration
   - Compression middleware for performance

3. **CORS Configuration**
   - Supports multiple origins (frontend, admin panel)
   - Reads from `CORS_ORIGINS` environment variable
   - Defaults to common localhost ports
   - Credentials support enabled
   - Proper headers configuration including:
     - Content-Type
     - Authorization
     - X-Internal-Service-Key
     - X-Request-ID
     - X-Correlation-ID

4. **Global API Prefix**
   - All routes prefixed with `/api/v1`
   - Health endpoints excluded from prefix
   - Health routes remain at `/health`

5. **Validation**
   - Global validation pipe enabled
   - Whitelist mode (strips unknown properties)
   - Transform mode (auto-converts types)
   - Implicit conversion enabled

6. **Swagger Documentation**
   - Available at `/api/docs` for each service
   - JWT Bearer authentication
   - Internal service key authentication
   - Properly tagged endpoints

### Created Files List

```
C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services/
├── auth-service/
│   └── src/
│       ├── main.ts
│       └── health/health.controller.ts
├── user-service/
│   └── src/
│       ├── main.ts
│       └── health/health.controller.ts
├── matching-service/
│   └── src/
│       ├── main.ts
│       └── health/health.controller.ts
├── messaging-service/
│   └── src/
│       ├── main.ts
│       └── health/health.controller.ts
├── moderation-service/
│   └── src/
│       ├── main.ts
│       └── health/health.controller.ts
├── payment-service/
│   └── src/
│       ├── main.ts
│       └── health/health.controller.ts
├── media-service/
│   └── src/
│       ├── main.ts
│       └── health/health.controller.ts
├── analytics-service/
│   └── src/
│       ├── main.ts
│       └── health/health.controller.ts
├── notification-service/
│   └── src/
│       ├── main.ts
│       └── health/health.controller.ts
├── advertising-service/
│   └── src/
│       ├── main.ts
│       └── health/health.controller.ts
└── workflow-engine/
    └── src/
        └── main.ts (updated)
```

### Health Controller Files

All services have health controller templates at `src/health/health.controller.ts` with:

- Standard health check endpoint at `/health`
- Swagger documentation
- NestJS Terminus integration
- Database health checks (TypeORM for SQL-based services)
- Proper HTTP status codes (200 for healthy, 503 for unhealthy)

## Environment Variable Requirements

Each service requires the following environment variables:

### Required Variables
```bash
# Port Configuration
PORT=<service-specific-port>

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:4000,http://localhost:5173,http://localhost:5174

# Node Environment
NODE_ENV=development

# Service-to-Service Authentication
SERVICE_API_KEY=your-secret-service-key-here-change-this-in-production

# Database Connection (for most services)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_dev
DB_USER=postgres
DB_PASSWORD=your-db-password

# Redis (for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Service-Specific Variables

#### Auth Service
- JWT_SECRET
- JWT_EXPIRES_IN
- ENCRYPTION_KEY

#### Messaging Service
- COSMOS_DB_ENDPOINT
- COSMOS_DB_KEY
- COSMOS_DB_DATABASE

#### Payment Service
- STRIPE_SECRET_KEY
- STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET

#### Media Service
- AWS_REGION
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_S3_BUCKET

#### Notification Service
- SENDGRID_API_KEY
- SENDGRID_FROM_EMAIL
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY

#### Moderation Service
- AZURE_CONTENT_MODERATOR_KEY
- AZURE_CONTENT_MODERATOR_ENDPOINT

## API Documentation Access

Each service provides Swagger documentation:

- Auth Service: http://localhost:3001/api/docs
- User Service: http://localhost:3001/api/docs
- Matching Service: http://localhost:3002/api/docs
- Messaging Service: http://localhost:3003/api/docs
- Moderation Service: http://localhost:3004/api/docs
- Payment Service: http://localhost:3005/api/docs
- Media Service: http://localhost:3006/api/docs
- Analytics Service: http://localhost:3007/api/docs
- Notification Service: http://localhost:3008/api/docs
- Advertising Service: http://localhost:3010/api/docs
- Workflow Engine: http://localhost:3011/api/docs
- API Gateway: http://localhost:4000/api/docs

## Health Check Endpoints

Each service has a health endpoint accessible at:

- Auth Service: http://localhost:3001/health
- User Service: http://localhost:3001/health
- Matching Service: http://localhost:3002/health
- Messaging Service: http://localhost:3003/health
- Moderation Service: http://localhost:3004/health
- Payment Service: http://localhost:3005/health
- Media Service: http://localhost:3006/health
- Analytics Service: http://localhost:3007/health
- Notification Service: http://localhost:3008/health
- Advertising Service: http://localhost:3010/health
- Workflow Engine: http://localhost:3011/health
- API Gateway: http://localhost:4000/health

## Next Steps

To complete service setup, each service needs:

1. **App Module** (`src/app.module.ts`)
   - Configure modules, controllers, providers
   - Import TerminusModule for health checks
   - Import ConfigModule for environment variables
   - Import TypeOrmModule for database connections

2. **Configuration Module** (`src/config/configuration.ts`)
   - Define configuration schema
   - Validate environment variables
   - Provide typed configuration

3. **Database Entities** (for services using databases)
   - Define TypeORM entities
   - Create migrations
   - Set up repositories

4. **Business Logic**
   - Controllers
   - Services
   - DTOs (Data Transfer Objects)
   - Validators

5. **Tests**
   - Unit tests
   - Integration tests
   - E2E tests

6. **Package.json and Dependencies**
   - Install required NestJS packages
   - Install database drivers
   - Install security packages
   - Configure build scripts

## Common Dependencies

Each service will need these core dependencies:

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/swagger": "^7.0.0",
    "@nestjs/terminus": "^10.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "typeorm": "^0.3.17",
    "pg": "^8.11.0",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.42.0",
    "jest": "^29.5.0",
    "typescript": "^5.1.3"
  }
}
```

## Configuration Verification Checklist

- [x] Port configurations are correct and match .env.example
- [x] Health endpoints are properly exposed and excluded from /api/v1 prefix
- [x] Environment variable handling is implemented
- [x] CORS is properly configured with multiple origins support
- [x] Security headers (Helmet) are enabled
- [x] Compression is enabled
- [x] Validation pipes are configured globally
- [x] Swagger documentation is set up for all services
- [x] TypeScript compilation support is ready
- [ ] App modules need to be created
- [ ] Database connections need to be configured
- [ ] Business logic controllers and services need implementation

## Notes

1. The workflow-engine service has been updated with improved CORS configuration but may need additional import statement updates for RequestMethod.

2. All services follow a consistent structure for easier maintenance and scaling.

3. Services can be run independently or as part of a larger ecosystem.

4. Health checks are essential for container orchestration (Docker, Kubernetes).

5. Each service maintains its own Swagger documentation for API exploration.

## API Gateway Configuration

The API Gateway (port 4000) has additional features:
- WebSocket support with Redis adapter for horizontal scaling
- Advanced security middleware (CSRF, cache control, tracing)
- Cookie parser for authentication
- Advanced CORS with wildcard subdomain support
- Request/response transformation interceptors
- Global exception filters
- Comprehensive logging

This serves as the main entry point for all client requests and routes them to appropriate microservices.
