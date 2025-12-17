# Environment Configuration - Quick Start Guide

**For Developers New to Flamoral Platform**

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- Docker Desktop running
- Git configured

### Step 1: Clone and Setup (1 minute)

```bash
# Clone repository
git clone https://github.com/your-org/flamoral.git
cd flamoral

# Install dependencies
npm install
```

### Step 2: Start Local Infrastructure (2 minutes)

```bash
# Start PostgreSQL, Redis, MongoDB
docker-compose up -d

# Verify services are running
docker ps
```

You should see:
- ✅ PostgreSQL on port 5432
- ✅ Redis on port 6379
- ✅ MongoDB on port 27017

### Step 3: Configure Environment (2 minutes)

```bash
# Copy root environment file
cp .env.example .env

# Generate secure secrets
node scripts/generate-dev-secrets.js

# Or manually:
# JWT_ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
# JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
```

**Minimal .env configuration:**
```bash
# Required for local development
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_dev
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Secrets (auto-generated)
JWT_ACCESS_SECRET=<generated-by-script>
JWT_REFRESH_SECRET=<generated-by-script>
SERVICE_API_KEY=<generated-by-script>
```

### Step 4: Start Services

```bash
# Option A: Start all services
npm run dev

# Option B: Start specific service
npm run dev:auth-service
npm run dev:user-service
npm run dev:payment-service
```

### Step 5: Verify Setup

```bash
# Check health endpoints
curl http://localhost:3001/health  # Auth service
curl http://localhost:3002/health  # User service
curl http://localhost:3005/health  # Payment service
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-15T10:30:00.000Z",
  "uptime": 123.45
}
```

## ✅ You're Ready!

Your development environment is now configured. You can:
- Make API calls to `http://localhost:3000`
- Access database at `localhost:5432`
- View logs in terminal

## 📚 Next Steps

1. **Read Full Documentation**
   - [ENVIRONMENT_SECURITY.md](./ENVIRONMENT_SECURITY.md) - Complete security guide
   - [ENV_CHECKLIST.md](./infrastructure/config/ENV_CHECKLIST.md) - Deployment checklist

2. **Configure Third-Party Services (Optional)**
   - [Stripe Test Mode](#stripe-configuration)
   - [SendGrid Email](#email-configuration)
   - [Twilio SMS](#sms-configuration)

3. **Run Tests**
   ```bash
   npm test
   npm run test:integration
   ```

## 🔧 Common Configurations

### Stripe Configuration

For payment testing:

1. Sign up at https://dashboard.stripe.com
2. Get test API keys
3. Add to `.env`:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

4. Test webhooks locally:
   ```bash
   stripe listen --forward-to localhost:3005/api/webhooks/stripe
   ```

### Email Configuration

For development, emails are logged to console by default.

To test real emails:
1. Sign up at https://sendgrid.com (free tier)
2. Generate API key
3. Add to `.env`:
   ```bash
   SENDGRID_API_KEY=SG.your_api_key
   SENDGRID_FROM_EMAIL=dev@yourdomain.com
   ```

### SMS Configuration

For development, SMS are logged to console by default.

To test real SMS:
1. Sign up at https://www.twilio.com (trial account)
2. Get credentials
3. Add to `.env`:
   ```bash
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=your_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

## 🐛 Troubleshooting

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection
psql -h localhost -U postgres -d flamoral_dev

# Reset database
npm run db:reset
```

### Redis Connection Failed

```bash
# Check if Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
# Expected: PONG

# Restart Redis
docker restart flamoral-redis
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### JWT Errors

```bash
# Verify secrets are set
echo $JWT_ACCESS_SECRET | wc -c
# Should be 64+ characters

# Regenerate secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 🔒 Security Reminders

### ✅ DO
- Use the provided `.env.example` files as templates
- Generate unique secrets for your local environment
- Keep your `.env` file private (never commit)
- Use test mode for payment providers

### ❌ DON'T
- Commit `.env` files to Git
- Share your `.env` file with others
- Use production credentials in development
- Copy secrets from production to development

## 🎯 Development Workflow

### Daily Workflow

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install new dependencies
npm install

# 3. Run database migrations
npm run migrate

# 4. Start services
npm run dev

# 5. Make changes and test
npm test

# 6. Commit changes
git add .
git commit -m "Your message"
git push
```

### Working on Specific Service

```bash
# Navigate to service directory
cd backend/services/user-service

# Install dependencies
npm install

# Copy service .env
cp .env.example .env

# Edit configuration
nano .env

# Start service
npm run dev
```

### Running Tests

```bash
# All tests
npm test

# Specific service tests
npm run test:auth-service
npm run test:user-service
npm run test:payment-service

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

## 📊 Monitoring & Logs

### View Logs

```bash
# All services
npm run logs

# Specific service
npm run logs:auth-service

# Docker logs
docker logs flamoral-postgres
docker logs flamoral-redis

# Follow logs
docker logs -f flamoral-postgres
```

### Database Management

```bash
# Run migrations
npm run migrate

# Rollback migration
npm run migrate:rollback

# Seed database
npm run seed

# Reset database
npm run db:reset

# Open database CLI
npm run db:cli
```

### Redis Management

```bash
# Open Redis CLI
redis-cli

# View all keys
redis-cli KEYS "*"

# Clear all data
redis-cli FLUSHALL

# Monitor commands
redis-cli MONITOR
```

## 🌐 API Testing

### Using cURL

```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

### Using Postman

1. Import collection: `docs/postman/Flamoral.postman_collection.json`
2. Import environment: `docs/postman/Development.postman_environment.json`
3. Update `base_url` to `http://localhost:3000`
4. Run requests

### Using REST Client (VS Code)

```http
### Health Check
GET http://localhost:3000/health

### Register
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test123!",
  "name": "Test User"
}

### Login
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test123!"
}
```

## 🔗 Useful Commands

### Docker

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose up -d --build

# Clean up
docker-compose down -v  # Removes volumes
```

### Database

```bash
# Create database
npm run db:create

# Drop database
npm run db:drop

# Run migrations
npm run migrate

# Create migration
npm run migrate:make <name>

# Seed data
npm run seed
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run type-check
```

## 📖 Documentation

- **Main Docs:** `/docs` directory
- **API Docs:** http://localhost:3000/api/docs (when running)
- **GraphQL Playground:** http://localhost:4000/graphql
- **Architecture:** `/docs/architecture/README.md`
- **API Reference:** `/docs/api/README.md`

## 💬 Getting Help

### Internal Resources
- **Team Wiki:** https://wiki.flamoral.com
- **Slack Channel:** #flamoral-development
- **Stand-ups:** Daily at 10:00 AM

### External Resources
- **Node.js Docs:** https://nodejs.org/docs
- **TypeScript Handbook:** https://www.typescriptlang.org/docs
- **Docker Docs:** https://docs.docker.com
- **Kubernetes Docs:** https://kubernetes.io/docs

### Ask Questions
- Create issue in GitHub
- Ask in #flamoral-help Slack channel
- Email: dev@flamoral.com

## 🎓 Learning Resources

### Recommended Reading
1. [ENVIRONMENT_SECURITY.md](./ENVIRONMENT_SECURITY.md) - Security practices
2. [Contributing Guide](./CONTRIBUTING.md) - Code standards
3. [Architecture Overview](./docs/architecture/README.md) - System design

### Tutorials
- Authentication Flow: `/docs/tutorials/authentication.md`
- Payment Processing: `/docs/tutorials/payments.md`
- WebSocket Setup: `/docs/tutorials/websockets.md`

---

## ✨ You're All Set!

Happy coding! If you encounter any issues, check:
1. This quick start guide
2. [ENVIRONMENT_SECURITY.md](./ENVIRONMENT_SECURITY.md)
3. Troubleshooting section above
4. Ask in #flamoral-development

**Welcome to the Flamoral team! 🚀**
