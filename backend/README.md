# Flamoral Unified Backend

This is the consolidated backend for the Flamoral Dating Platform, combining all microservices into a single, unified application.

## Architecture

The backend provides three types of servers running on different ports:

- **REST API** (Port 3000): Traditional RESTful endpoints
- **GraphQL** (Port 4000): GraphQL API for flexible data queries
- **WebSocket** (Port 5000): Real-time communication for chat and notifications

> **Note:** Port 4000 is the API Gateway (main entry point for external clients). Ports 3000-3022 are internal service ports used for inter-service communication.

## Structure

```
backend-unified/
├── src/
│   ├── api/              # API layer
│   │   ├── rest/         # REST endpoints
│   │   ├── graphql/      # GraphQL schema & resolvers
│   │   └── websocket/    # WebSocket handlers
│   ├── services/         # Business logic
│   ├── repositories/     # Data access layer
│   ├── middleware/       # Express middleware
│   ├── config/           # Configuration
│   ├── utils/            # Utilities
│   ├── validators/       # Input validation
│   ├── types/            # TypeScript types
│   ├── app.ts            # Express app setup
│   └── server.ts         # Server entry point
├── migrations/           # Database migrations
├── tests/                # Test suites
├── Dockerfile            # Production build
├── Dockerfile.dev        # Development build
└── package.json
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL 15+
- MongoDB 7+
- Redis 7+
- RabbitMQ 3.12+

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

### Database Migrations

```bash
# Run migrations
npm run migrate

# Rollback migrations
npm run migrate:rollback

# Seed database
npm run seed
```

## Docker

### Build Image

```bash
docker build -t flamoral-backend .
```

### Run Container

```bash
docker run -p 3000:3000 -p 4000:4000 -p 5000:5000 --env-file .env flamoral-backend
```

## API Documentation

Once the server is running, access the Swagger documentation at:

```
http://localhost:3000/api-docs
```

GraphQL Playground is available at:

```
http://localhost:4000/graphql
```

## Health Check

```bash
curl http://localhost:3000/health
```

## Services Consolidated

This unified backend consolidates the following microservices:

1. **User Service** → `/services/user`
2. **Matching Service** → `/services/matching`
3. **Messaging Service** → `/services/messaging`
4. **Media Service** → `/services/media`
5. **Moderation Service** → `/services/moderation`
6. **Notification Service** → `/services/notification`
7. **Payment Service** → `/services/payment`
8. **Analytics Service** → `/services/analytics`
9. **API Gateway** → `/api/*`

## External Integrations

All external service integrations:

- **AWS S3** - File storage (photos, media)
- **AWS SES** - Email delivery
- **AWS SNS** - SMS and push notifications
- **AWS Rekognition** - Content moderation
- **Stripe** - Payments and subscriptions
- **Agora** - Video/Voice calls
- **CloudWatch** - Logging and monitoring
