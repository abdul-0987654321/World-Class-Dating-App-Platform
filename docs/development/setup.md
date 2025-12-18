# Development Setup Guide - Flamoral Platform

Complete guide for setting up the Flamoral development environment.

**Last Updated:** 2025-12-18
**Target OS:** Windows, macOS, Linux

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Running Services](#running-services)
6. [Testing](#testing)
7. [Common Tasks](#common-tasks)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

Install the following tools before starting:

#### 1. Node.js 20 LTS

```bash
# macOS (using Homebrew)
brew install node@20

# Windows (using Chocolatey)
choco install nodejs-lts

# Linux (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v20.x.x
npm --version   # Should be 10.x.x
```

#### 2. Docker Desktop

Download and install Docker Desktop:
- **Windows/macOS**: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux**: [Docker Engine](https://docs.docker.com/engine/install/)

```bash
# Verify installation
docker --version
docker-compose --version
```

#### 3. Git

```bash
# macOS
brew install git

# Windows
choco install git

# Linux
sudo apt-get install git

# Verify
git --version
```

#### 4. PostgreSQL Client (optional, for database access)

```bash
# macOS
brew install postgresql@16

# Windows
choco install postgresql

# Linux
sudo apt-get install postgresql-client-16
```

---

## Local Development Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/flamoral.git
cd flamoral

# Checkout develop branch
git checkout develop
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install dependencies for all services (monorepo)
npm run install:all

# Verify installation
npm run verify
```

### 3. Install Development Tools

```bash
# Install global tools (optional but recommended)
npm install -g \
  typescript \
  ts-node \
  nodemon \
  pm2 \
  jest

# Verify TypeScript
tsc --version
```

---

## Database Setup

### Option 1: Docker Compose (Recommended for Local Development)

```bash
# Start all databases and services
cd infrastructure/local-dev
docker-compose up -d

# Services started:
# - PostgreSQL (port 5432)
# - MongoDB (port 27017)
# - Redis (port 6379)
# - RabbitMQ (port 5672, management UI: 15672)

# Check running containers
docker-compose ps

# View logs
docker-compose logs -f postgres
```

### Option 2: Local Installation

#### PostgreSQL

```bash
# macOS
brew install postgresql@16
brew services start postgresql@16

# Linux
sudo apt-get install postgresql-16
sudo systemctl start postgresql

# Create database and user
psql postgres
CREATE USER flamoral WITH PASSWORD 'flamoral123';
CREATE DATABASE flamoral OWNER flamoral;
GRANT ALL PRIVILEGES ON DATABASE flamoral TO flamoral;
\q
```

#### MongoDB

```bash
# macOS
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community

# Linux
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

#### Redis

```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis-server
```

### 3. Run Database Migrations

```bash
# Navigate to database directory
cd infrastructure/database

# Run migrations
npx knex migrate:latest --knexfile knexfile.ts

# Verify migrations
npx knex migrate:status --knexfile knexfile.ts

# Optional: Seed development data
npx knex seed:run --knexfile knexfile.ts
```

### 4. Verify Database Connections

```bash
# Test PostgreSQL
psql -h localhost -U flamoral -d flamoral -c "SELECT version();"

# Test MongoDB
mongosh --eval "db.runCommand({ connectionStatus: 1 })"

# Test Redis
redis-cli ping  # Should return PONG
```

---

## Environment Configuration

### 1. Copy Environment Template

```bash
# Copy example environment file
cp .env.example .env

# Copy service-specific environment files
cp backend/services/api-gateway/.env.example backend/services/api-gateway/.env
cp backend/services/auth-service/.env.example backend/services/auth-service/.env
# ... repeat for other services
```

### 2. Configure Environment Variables

Edit `.env` file in the project root:

```bash
# .env

# Environment
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://flamoral:flamoral123@localhost:5432/flamoral
MONGODB_URI=mongodb://localhost:27017/flamoral
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OAuth (get from providers)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@flamoral.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Azure (for production-like testing)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER_NAME=flamoral-media

# Frontend URL
FRONTEND_URL=http://localhost:8080
API_URL=http://localhost:3000

# Feature Flags
ENABLE_2FA=true
ENABLE_BIOMETRIC_AUTH=true
ENABLE_E2E_ENCRYPTION=true
```

### 3. Generate Secrets

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Running Services

### Option 1: Run All Services with PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start all services
npm run dev:all

# View service status
pm2 status

# View logs
pm2 logs
pm2 logs api-gateway
pm2 logs auth-service

# Stop all services
pm2 stop all

# Restart all services
pm2 restart all

# Delete all services
pm2 delete all
```

### Option 2: Run Individual Services

```bash
# Terminal 1: API Gateway
cd backend/services/api-gateway
npm run dev

# Terminal 2: Auth Service
cd backend/services/auth-service
npm run dev

# Terminal 3: User Service
cd backend/services/user-service
npm run dev

# Terminal 4: Messaging Service
cd backend/services/messaging-service
npm run dev

# Terminal 5: Frontend
cd apps/web-app
npm run dev
```

### Option 3: Docker Compose (Full Stack)

```bash
# Start all services (backend + frontend + databases)
cd infrastructure/local-dev
docker-compose --profile full up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Service URLs

Once services are running:

- **API Gateway**: http://localhost:3000
- **Auth Service**: http://localhost:3001
- **User Service**: http://localhost:3002
- **Matching Service**: http://localhost:3003
- **Messaging Service**: http://localhost:3004
- **Frontend (Web)**: http://localhost:8080
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)

---

## Testing

### Run All Tests

```bash
# Run all tests (unit + integration + E2E)
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Run Service-Specific Tests

```bash
# Auth Service tests
cd backend/services/auth-service
npm test

# User Service tests
cd backend/services/user-service
npm test

# Frontend tests
cd apps/web-app
npm test
```

### E2E Tests

```bash
# Start services first
npm run dev:all

# Run E2E tests (in another terminal)
npm run test:e2e

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed
```

### Load Testing

```bash
# Install k6
# macOS: brew install k6
# Linux: sudo snap install k6

# Run load test
cd tests/load
k6 run auth-load-test.js
```

---

## Common Tasks

### Create New Migration

```bash
cd infrastructure/database
npx knex migrate:make add_user_preferences --knexfile knexfile.ts

# Edit the generated migration file
# Then run: npx knex migrate:latest
```

### Create New Seed

```bash
cd infrastructure/database
npx knex seed:make 001_users --knexfile knexfile.ts

# Edit the generated seed file
# Then run: npx knex seed:run
```

### Build for Production

```bash
# Build all services
npm run build

# Build specific service
cd backend/services/api-gateway
npm run build

# Output will be in dist/ folder
```

### Format Code

```bash
# Format all code with Prettier
npm run format

# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Generate API Documentation

```bash
# Generate OpenAPI docs
npm run docs:api

# Open documentation
open docs/api/openapi.yaml
```

---

## Troubleshooting

### Issue: Port Already in Use

```bash
# Find process using port 3000
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Issue: Database Connection Failed

```bash
# Check if PostgreSQL is running
# macOS/Linux
ps aux | grep postgres

# Windows
sc query postgresql-x64-16

# Test connection
psql -h localhost -U flamoral -d flamoral

# Check Docker containers
docker-compose ps
docker-compose logs postgres
```

### Issue: Redis Connection Error

```bash
# Check if Redis is running
redis-cli ping

# If using Docker
docker-compose logs redis

# Restart Redis
# macOS: brew services restart redis
# Linux: sudo systemctl restart redis-server
# Docker: docker-compose restart redis
```

### Issue: Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force

# Rebuild native modules
npm rebuild
```

### Issue: TypeScript Errors

```bash
# Clean TypeScript build cache
rm -rf dist/ tsconfig.tsbuildinfo

# Rebuild
npm run build

# Check TypeScript version
tsc --version
```

### Issue: Docker Compose Won't Start

```bash
# Check Docker is running
docker info

# Remove old containers and volumes
docker-compose down -v

# Rebuild images
docker-compose build --no-cache

# Start fresh
docker-compose up -d
```

### Enable Debug Logging

```bash
# Set environment variable
export DEBUG=flamoral:*

# Or in .env
DEBUG=flamoral:*

# Run service
npm run dev
```

---

## Development Workflow

### Recommended Git Workflow

```bash
# Create feature branch
git checkout -b feature/user-profile-improvements

# Make changes and commit
git add .
git commit -m "feat(user): add profile completion percentage"

# Push to remote
git push origin feature/user-profile-improvements

# Create pull request on GitHub
```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

feat(auth): add biometric authentication
fix(matching): resolve swipe animation bug
docs(api): update authentication endpoints
refactor(user): simplify profile update logic
test(messaging): add E2E tests for chat
```

---

## IDE Setup

### VS Code (Recommended)

Install recommended extensions:
- ESLint
- Prettier
- TypeScript
- Docker
- GitLens
- Thunder Client (API testing)

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "eslint.validate": ["javascript", "typescript"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## Additional Resources

- [Architecture Overview](../architecture/overview.md)
- [API Documentation](../api/api-inventory.md)
- [Contributing Guidelines](./contributing.md)
- [Testing Guide](../testing/README.md)
- [Deployment Guide](../deployment/azure-deployment.md)

---

**Need Help?**
- Check [Troubleshooting](#troubleshooting) section
- Review [Architecture Overview](../architecture/overview.md)
- Ask in team Slack channel: #flamoral-dev
