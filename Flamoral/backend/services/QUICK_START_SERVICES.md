# Quick Start Guide - Backend Services

This guide helps you quickly start and verify all backend services for the Flamoral dating platform.

## Prerequisites

1. Node.js (v18 or higher)
2. PostgreSQL (v14 or higher)
3. Redis (v6 or higher)
4. npm or yarn package manager

## Setup Steps

### 1. Install Dependencies

For each service, navigate to its directory and install dependencies:

```bash
# Example for auth-service
cd auth-service
npm install

# Repeat for all services:
# user-service, matching-service, messaging-service, moderation-service,
# payment-service, media-service, analytics-service, notification-service,
# advertising-service, workflow-engine, api-gateway
```

### 2. Environment Configuration

Copy the example environment file and configure for each service:

```bash
# From the services directory
cp .env.example .env

# Edit .env with your specific configurations
```

### 3. Required Environment Variables

Minimum required variables in `.env`:

```bash
# Node Environment
NODE_ENV=development

# Service Ports (use the specific port for each service)
PORT=3001  # Change per service (see port table below)

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_dev
DB_USER=postgres
DB_PASSWORD=your-db-password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Service Authentication
SERVICE_API_KEY=your-secret-service-key-here

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:4000,http://localhost:5173,http://localhost:5174

# Auth Service Only
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=7d
```

## Service Port Reference

| Service | Port | Command to Start |
|---------|------|------------------|
| API Gateway | 4000 | `npm run start:dev` |
| Auth Service | 3001 | `npm run start:dev` |
| User Service | 3001 | `npm run start:dev` |
| Matching Service | 3002 | `npm run start:dev` |
| Messaging Service | 3003 | `npm run start:dev` |
| Moderation Service | 3004 | `npm run start:dev` |
| Payment Service | 3005 | `npm run start:dev` |
| Media Service | 3006 | `npm run start:dev` |
| Analytics Service | 3007 | `npm run start:dev` |
| Notification Service | 3008 | `npm run start:dev` |
| Advertising Service | 3010 | `npm run start:dev` |
| Workflow Engine | 3011 | `npm run start:dev` |

## Starting Services

### Option 1: Start Individual Service

```bash
cd <service-directory>
npm run start:dev
```

### Option 2: Start All Services (Using Script)

Create a script to start all services:

```bash
#!/bin/bash
# start-all-services.sh

echo "Starting all Flamoral backend services..."

# Start each service in background
cd api-gateway && npm run start:dev &
cd ../auth-service && npm run start:dev &
cd ../user-service && npm run start:dev &
cd ../matching-service && npm run start:dev &
cd ../messaging-service && npm run start:dev &
cd ../moderation-service && npm run start:dev &
cd ../payment-service && npm run start:dev &
cd ../media-service && npm run start:dev &
cd ../analytics-service && npm run start:dev &
cd ../notification-service && npm run start:dev &
cd ../advertising-service && npm run start:dev &
cd ../workflow-engine && npm run start:dev &

echo "All services started!"
```

### Option 3: Using Docker Compose (Recommended for Production)

Create a `docker-compose.yml` in the services directory:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: flamoral_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your-db-password
    ports:
      - "5432:5432"

  redis:
    image: redis:6
    ports:
      - "6379:6379"

  api-gateway:
    build: ./api-gateway
    ports:
      - "4000:4000"
    environment:
      - PORT=4000
      - NODE_ENV=development
    depends_on:
      - postgres
      - redis

  auth-service:
    build: ./auth-service
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - NODE_ENV=development
    depends_on:
      - postgres
      - redis

  # Add other services similarly...
```

Then start with:
```bash
docker-compose up -d
```

## Verifying Services

### 1. Check Health Endpoints

```bash
# Check if services are running
curl http://localhost:4000/health  # API Gateway
curl http://localhost:3001/health  # Auth/User Service
curl http://localhost:3002/health  # Matching Service
curl http://localhost:3003/health  # Messaging Service
curl http://localhost:3004/health  # Moderation Service
curl http://localhost:3005/health  # Payment Service
curl http://localhost:3006/health  # Media Service
curl http://localhost:3007/health  # Analytics Service
curl http://localhost:3008/health  # Notification Service
curl http://localhost:3010/health  # Advertising Service
curl http://localhost:3011/health  # Workflow Engine
```

Expected response (when healthy):
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  },
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

### 2. Check Swagger Documentation

Visit these URLs in your browser:

- API Gateway: http://localhost:4000/api/docs
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

### 3. Check Service Logs

Look for these success messages in console:

```
🚀 [Service Name] running on: http://localhost:[PORT]
📚 API Documentation: http://localhost:[PORT]/api/docs
🔒 Environment: development
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :[PORT]  # macOS/Linux
netstat -ano | findstr :[PORT]  # Windows

# Kill the process
kill -9 [PID]  # macOS/Linux
taskkill /PID [PID] /F  # Windows
```

### Database Connection Issues

1. Verify PostgreSQL is running:
```bash
pg_isready -h localhost -p 5432
```

2. Check credentials in `.env` file
3. Ensure database exists:
```bash
psql -U postgres -c "CREATE DATABASE flamoral_dev;"
```

### Redis Connection Issues

1. Verify Redis is running:
```bash
redis-cli ping
```

Expected response: `PONG`

2. Check Redis configuration in `.env`

### Missing Dependencies

```bash
# Reinstall dependencies
cd <service-directory>
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Compilation Errors

```bash
# Check TypeScript version
npx tsc --version

# Rebuild
npm run build
```

## Service Dependencies

Some services depend on others. Recommended startup order:

1. Database & Redis (Infrastructure)
2. Auth Service (Authentication provider)
3. User Service (Core user management)
4. Other services (can start in any order)
5. API Gateway (Entry point - start last)

## Development Workflow

### Watch Mode (Recommended)

```bash
npm run start:dev
```

This will:
- Watch for file changes
- Auto-restart on changes
- Show detailed logs

### Production Mode

```bash
npm run build
npm run start:prod
```

### Debug Mode

```bash
npm run start:debug
```

Then attach debugger on port 9229.

## Testing Services

### Run Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Manual API Testing

Use tools like:
- Postman
- Insomnia
- curl
- HTTPie

Example curl request:
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

## Monitoring

### View Logs

```bash
# Development
npm run start:dev

# Production with PM2
pm2 logs [service-name]

# Docker
docker logs [container-name]
```

### Performance Monitoring

Each service exposes metrics that can be scraped by Prometheus/Grafana.

## Security Checklist

Before deploying to production:

- [ ] Change all default secrets in `.env`
- [ ] Enable HTTPS/TLS
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Enable authentication on all endpoints
- [ ] Configure proper database access controls
- [ ] Set up firewall rules
- [ ] Enable logging and monitoring
- [ ] Regular security updates

## Next Steps

1. Complete App Module setup for each service
2. Implement business logic (controllers, services)
3. Add database migrations
4. Write comprehensive tests
5. Set up CI/CD pipeline
6. Configure production environment
7. Deploy to cloud infrastructure

## Support

For issues or questions:
- Check the main SERVICE_CONFIGURATION_SUMMARY.md
- Review individual service README files
- Check logs for specific error messages
- Verify all environment variables are set correctly

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
