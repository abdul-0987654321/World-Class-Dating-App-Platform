# API Gateway Service

The API Gateway is the main entry point for all client requests to the dating app platform. It provides routing, authentication, rate limiting, and other cross-cutting concerns for the microservices architecture.

## Features

### Core Functionality
- **Request Routing**: Routes requests to appropriate backend microservices
- **JWT Authentication**: Validates JWT tokens for protected endpoints
- **Rate Limiting**: Redis-based rate limiting per user and IP address
- **Request/Response Transformation**: Standardizes API responses
- **Service Discovery**: Dynamic service registration and health checking
- **Distributed Tracing**: Correlation IDs for request tracking across services
- **Circuit Breaker**: Prevents cascading failures with automatic circuit breaking
- **CORS Configuration**: Cross-origin resource sharing support
- **API Documentation**: Swagger/OpenAPI documentation

### Security Features
- Helmet.js for security headers
- JWT-based authentication
- Rate limiting (per user and per IP)
- Internal service key authentication
- Request validation
- CORS protection

### Monitoring & Observability
- Request/response logging
- Distributed tracing with correlation IDs
- Circuit breaker metrics
- Health check endpoints
- Service status monitoring

## Architecture

### Microservices Integration

The API Gateway routes requests to the following services:

- **Auth Service** (port 3001): User authentication and authorization
- **User Service** (port 3002): User profile management
- **Matching Service** (port 3003): Profile discovery and matching
- **Messaging Service** (port 3004): Real-time messaging
- **Media Service** (port 3006): Image and video processing
- **Payment Service** (port 3007): Subscriptions and payments
- **Notification Service** (port 3008): Push and email notifications
- **Moderation Service** (port 3009): Content moderation
- **Analytics Service** (port 3010): User and platform analytics

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your configuration
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options. Key variables:

```bash
# Server
PORT=4000
NODE_ENV=development

# Redis (required for rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_ACCESS_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-secret-here

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
# ... other services
```

## Running the Service

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

## API Documentation

Once running, access the Swagger documentation at:

```
http://localhost:4000/api/docs
```

## API Endpoints

### Health Checks

```
GET /health              - Overall health status
GET /health/ready        - Readiness probe
GET /health/live         - Liveness probe
GET /health/services     - Individual service health
GET /health/circuits     - Circuit breaker status
```

### Authentication

```
POST   /api/v1/api/auth/register          - Register new user
POST   /api/v1/api/auth/login             - Login user
POST   /api/v1/api/auth/logout            - Logout user
POST   /api/v1/api/auth/refresh-token     - Refresh access token
POST   /api/v1/api/auth/forgot-password   - Request password reset
POST   /api/v1/api/auth/reset-password    - Reset password
GET    /api/v1/api/auth/me                - Get current user
```

### User Management

```
GET    /api/v1/api/users/me               - Get current user profile
PUT    /api/v1/api/users/me               - Update profile
POST   /api/v1/api/users/me/photos        - Upload photo
DELETE /api/v1/api/users/me/photos/:id    - Delete photo
GET    /api/v1/api/users/me/preferences   - Get preferences
PUT    /api/v1/api/users/me/preferences   - Update preferences
```

### Matching & Discovery

```
GET    /api/v1/api/discovery/recommendations  - Get recommendations
POST   /api/v1/api/discovery/search           - Search profiles
GET    /api/v1/api/discovery/nearby           - Get nearby users
POST   /api/v1/api/likes                      - Like a profile
GET    /api/v1/api/matches                    - Get matches
DELETE /api/v1/api/matches/:id                - Unmatch
```

### Messaging

```
GET    /api/v1/api/conversations              - Get conversations
POST   /api/v1/api/conversations              - Create conversation
GET    /api/v1/api/conversations/:id          - Get conversation
GET    /api/v1/api/conversations/:id/messages - Get messages
POST   /api/v1/api/messages                   - Send message
DELETE /api/v1/api/messages/:id               - Delete message
```

### Payments & Subscriptions

```
GET    /api/v1/api/subscriptions/plans        - Get subscription plans
POST   /api/v1/api/subscriptions              - Create subscription
GET    /api/v1/api/subscriptions/me           - Get current subscription
DELETE /api/v1/api/subscriptions/me           - Cancel subscription
GET    /api/v1/api/payment-methods            - Get payment methods
POST   /api/v1/api/payment-methods            - Add payment method
```

### Notifications

```
GET    /api/v1/api/notifications              - Get notifications
PUT    /api/v1/api/notifications/:id/read     - Mark as read
DELETE /api/v1/api/notifications/:id          - Delete notification
POST   /api/v1/api/notifications/push/register - Register push token
```

### Media

```
POST   /api/v1/api/media/upload/image         - Upload image
POST   /api/v1/api/media/upload/video         - Upload video
GET    /api/v1/api/media/:id                  - Get media
DELETE /api/v1/api/media/:id                  - Delete media
GET    /api/v1/api/media/:id/url              - Get signed URL
```

## Rate Limiting

The API Gateway implements multi-tier rate limiting:

### Global Limits
- 100 requests per minute (default)
- Configurable via `THROTTLE_LIMIT` and `THROTTLE_TTL`

### User-Based Limits
- 1000 requests per 15 minutes (authenticated users)
- Block for 5 minutes after exceeding

### IP-Based Limits
- 500 requests per 15 minutes (per IP address)
- Block for 10 minutes after exceeding

### Auth Endpoint Limits
- 5 requests per 15 minutes (login, register, etc.)
- Block for 1 hour after exceeding (prevents brute force)

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200000
```

## Circuit Breaker

The gateway implements circuit breaker pattern to prevent cascading failures:

### States
- **CLOSED**: Normal operation, requests flow through
- **OPEN**: Service is failing, requests fail fast
- **HALF_OPEN**: Testing if service has recovered

### Configuration
```bash
CIRCUIT_FAILURE_THRESHOLD=5     # Failures before opening
CIRCUIT_SUCCESS_THRESHOLD=2     # Successes to close from half-open
CIRCUIT_TIMEOUT=60000          # Time before attempting half-open
```

### Monitoring
Check circuit status at `/health/circuits`

## Distributed Tracing

All requests are traced with correlation IDs:

### Headers
- `X-Request-ID`: Unique ID for this request
- `X-Correlation-ID`: ID for tracking across services
- `X-Span-ID`: ID for this service span
- `X-Parent-Span-ID`: Parent service span ID

These headers are automatically forwarded to all downstream services.

## Error Handling

Standard error response format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/endpoint"
}
```

## Response Format

Standard success response format:

```json
{
  "success": true,
  "data": { },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/endpoint",
  "requestId": "uuid-here",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

## Development

### Project Structure

```
src/
├── config/              # Configuration files
├── controllers/         # Route controllers
│   ├── auth.controller.ts
│   ├── user.controller.ts
│   ├── matching.controller.ts
│   └── ...
├── guards/              # Authentication & authorization guards
│   ├── jwt-auth.guard.ts
│   └── redis-throttler.guard.ts
├── interceptors/        # Request/response interceptors
│   ├── logging.interceptor.ts
│   └── transform.interceptor.ts
├── middleware/          # Custom middleware
│   ├── tracing.middleware.ts
│   └── rate-limiter.middleware.ts
├── services/            # Business logic services
│   ├── proxy.service.ts
│   └── circuit-breaker.service.ts
├── filters/             # Exception filters
├── decorators/          # Custom decorators
├── health/              # Health check endpoints
└── main.ts              # Application entry point
```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Linting

```bash
# Run ESLint
npm run lint

# Format code
npm run format
```

## Production Deployment

### Docker

```bash
# Build image
docker build -t dating-app/api-gateway .

# Run container
docker run -p 4000:4000 \
  -e NODE_ENV=production \
  -e REDIS_HOST=redis \
  dating-app/api-gateway
```

### Docker Compose

```yaml
version: '3.8'
services:
  api-gateway:
    build: .
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
    depends_on:
      - redis
```

### Environment Considerations

- Set strong JWT secrets
- Configure proper CORS origins
- Use Redis for rate limiting
- Enable distributed tracing
- Set appropriate rate limits
- Configure circuit breaker thresholds

## Monitoring

### Metrics Endpoints

- `/health` - Overall health
- `/health/services` - Service health with metrics
- `/health/circuits` - Circuit breaker status

### Logging

Structured JSON logging with context:

```json
{
  "level": "info",
  "message": "[uuid] GET /api/v1/endpoint 200 - 45ms",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "context": "HTTP"
}
```

## Troubleshooting

### Common Issues

1. **Rate Limit Errors**
   - Check Redis connection
   - Verify rate limit configuration
   - Check X-RateLimit headers

2. **Circuit Breaker Open**
   - Check downstream service health
   - Review service logs
   - Check `/health/circuits` endpoint

3. **Authentication Failures**
   - Verify JWT secrets match auth service
   - Check token expiration
   - Validate token format

## Contributing

1. Follow NestJS best practices
2. Write tests for new features
3. Update API documentation
4. Follow TypeScript style guide

## License

Proprietary - Flamoral Dating App Platform
