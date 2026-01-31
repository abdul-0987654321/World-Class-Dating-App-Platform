# Development Guide

Detailed instructions for setting up and working with the Flamoral platform locally.

## Prerequisites

| Tool           | Version  | Notes                                    |
| -------------- | -------- | ---------------------------------------- |
| Node.js        | >= 20.0  | Use `nvm` or `fnm` to manage versions   |
| npm            | >= 10.0  | Ships with Node.js 20+                  |
| Docker Desktop | Latest   | Required for PostgreSQL, Redis, tests    |
| Git            | >= 2.40  | Required for conventional commit hooks   |

Verify your setup:

```bash
node --version    # v20.x.x
npm --version     # 10.x.x
docker --version  # Docker version 24+
```

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/oks-citadel/World-Class-Dating-App-Platform.git
cd World-Class-Dating-App-Platform

# 2. Install dependencies (all workspaces)
npm install

# 3. Copy environment files
cp .env.example .env

# 4. Start infrastructure services
docker-compose -f infrastructure/local-dev/docker-compose.dev.yml up -d

# 5. Run database migrations
cd backend && npm run migrate && cd ..

# 6. Start development
npm run dev:web        # Web app at http://localhost:5173
npm run dev:backend    # All backend services
```

Verify everything is running:

```bash
curl http://localhost:4000/health
```

## Project Structure

Flamoral is an npm workspaces monorepo:

```
flamoral-monorepo/
├── apps/
│   ├── web-app/              # React 18 + Vite + TypeScript
│   ├── mobile-app/           # React Native + Expo
│   └── branding/             # Brand assets
│
├── backend/
│   ├── services/             # 30 microservices
│   │   ├── api-gateway/      # Port 4000 -- entry point
│   │   ├── auth-service/     # Port 3001
│   │   ├── user-service/     # Port 3002
│   │   ├── matching-service/ # Port 3003
│   │   ├── messaging-service/# Port 5000
│   │   ├── payment-service/  # Port 3005
│   │   └── ...               # See README.md for full port map
│   ├── shared/               # Shared backend libraries
│   └── tests/                # Integration & E2E tests
│
├── packages/                 # Shared npm packages
│   ├── shared/
│   │   ├── types/            # @flamoral/types
│   │   ├── utils/            # @flamoral/utils
│   │   ├── constants/        # @flamoral/constants
│   │   ├── validators/       # @flamoral/validators
│   │   └── api-client/       # @flamoral/api-client
│   ├── socket-client/        # WebSocket client
│   ├── i18n/                 # Internationalization
│   └── video-sdk/            # Video call abstraction
│
├── infrastructure/
│   ├── terraform/            # AWS infrastructure as code
│   ├── docker/               # Dockerfiles
│   ├── local-dev/            # Local docker-compose files
│   └── load-testing/         # K6 performance tests
│
├── tests/                    # Root-level test orchestration
│   ├── e2e/                  # Playwright E2E, API E2E
│   ├── security/             # Security tests
│   └── load/                 # Load test scenarios
│
├── docs/                     # Documentation (50+ files)
├── docker-compose.yml        # Root compose file
└── package.json              # Monorepo root config
```

## Running Services

### Full Stack

```bash
# Start all infrastructure + backend + frontend
npm run setup:dev          # Install + start Docker services
npm run dev:backend        # All backend services
npm run dev:web            # Web app
```

### Individual Services

```bash
# Start a single backend service
cd backend/services/auth-service && npm run dev
cd backend/services/matching-service && npm run dev
cd backend/services/messaging-service && npm run dev
```

You will typically need at minimum: `api-gateway`, `auth-service`, and whichever service you are working on.

### Docker Only (Infrastructure)

```bash
npm run docker:dev:up      # Start PostgreSQL, Redis, LocalStack
npm run docker:dev:down    # Stop all containers
npm run docker:dev:rebuild # Rebuild and restart containers
```

## Database Setup

### PostgreSQL

Flamoral uses **PostgreSQL 15** as the primary database, started via Docker Compose.

```bash
# Default connection (from .env.example)
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=flamoral
# DB_USER=postgres
# DB_PASSWORD=postgres
```

### Migrations

Managed with **Knex.js**:

```bash
cd backend

# Apply all pending migrations
npm run migrate

# Rollback last migration batch
npm run migrate:rollback

# Create a new migration
npx knex migrate:make <migration_name>

# Seed the database
npm run seed
```

### Redis

Used for caching, sessions, and real-time pub/sub. Runs on port 6379 via Docker Compose.

```bash
# Verify Redis is running
docker exec -it flamoral-redis redis-cli ping
# Expected: PONG
```

## Environment Variables

All environment variables are documented in `.env.example` at the repo root. Key variables:

| Variable             | Default               | Description                 |
| -------------------- | --------------------- | --------------------------- |
| `NODE_ENV`           | `development`         | Runtime environment         |
| `WEB_URL`            | `http://localhost:5173`| Web app URL                |
| `API_URL`            | `http://localhost:4000`| API gateway URL            |
| `DB_HOST`            | `localhost`           | PostgreSQL host             |
| `DB_PORT`            | `5432`                | PostgreSQL port             |
| `DB_NAME`            | `flamoral`            | Database name               |
| `DB_USER`            | `postgres`            | Database user               |
| `DB_PASSWORD`        | `postgres`            | Database password           |
| `REDIS_HOST`         | `localhost`           | Redis host                  |
| `REDIS_PORT`         | `6379`                | Redis port                  |
| `JWT_ACCESS_SECRET`  | --                    | JWT signing secret (generate) |
| `JWT_REFRESH_SECRET` | --                    | Refresh token secret (generate) |
| `STRIPE_SECRET_KEY`  | `sk_test_...`         | Stripe test key             |

When adding a new environment variable:

1. Add it to the appropriate `.env.example` file with a placeholder value.
2. Document it in the service's README if service-specific.
3. Add validation in the service's config module.

## Testing

### Commands

```bash
# Unit tests
npm run test:backend                  # All backend unit tests
npm run test:backend -- --coverage    # With coverage report

# Integration tests (requires Docker)
npm run test:integration:docker       # Starts containers, runs tests, stops containers
npm run test:integration              # If containers already running

# E2E tests
npm run test:e2e                      # Playwright UI tests
npm run test:e2e:api                  # API E2E tests

# Targeted E2E
npm run test:e2e:api:auth             # Auth endpoints only
npm run test:e2e:api:payment          # Payment endpoints only
npm run test:e2e:api:matching         # Matching endpoints only

# Security tests
npm run test:security                 # All security tests
npm run test:security:owasp           # OWASP-focused tests

# Full CI suite
npm run test:ci
```

### Test Reports

```bash
npm run test:report:generate   # Generate Allure report
npm run test:report:open       # Open report in browser
npm run test:e2e:report        # Open Playwright report
```

Reports are written to:
- `backend/coverage/` -- Jest coverage
- `allure-results/` -- Allure test results
- `playwright-report/` -- Playwright HTML report

## Debugging

### VS Code

The project includes VS Code launch configurations. Common debug targets:

1. **Attach to Service** -- Attach the debugger to a running service started with `--inspect`.
2. **Debug Current Test** -- Run and debug the currently open test file.

To debug a backend service:

```bash
# Start with inspect flag
node --inspect backend/services/auth-service/dist/index.js
```

Then attach VS Code's debugger to port 9229.

### Service Logs

```bash
# Docker container logs
npm run docker:dev:up
docker-compose -f infrastructure/local-dev/docker-compose.dev.yml logs -f postgres
docker-compose -f infrastructure/local-dev/docker-compose.dev.yml logs -f redis

# Test environment logs
npm run docker:test:logs
```

### Useful Debug Environment Variables

```bash
DEBUG=knex:query          # Log all SQL queries
LOG_LEVEL=debug           # Verbose application logging
```

## Common Issues

### Port Conflicts

If a port is already in use:

```bash
# Find what is using the port (Linux/Mac)
lsof -i :4000

# On Windows
netstat -ano | findstr :4000
```

Common ports: 4000 (API Gateway), 5173 (Web App), 5432 (PostgreSQL), 6379 (Redis).

### Database Connection Refused

1. Verify Docker is running: `docker ps`
2. Check the PostgreSQL container: `docker-compose -f infrastructure/local-dev/docker-compose.dev.yml logs postgres`
3. Confirm `.env` values match the Docker Compose config.
4. Try restarting: `npm run docker:dev:rebuild`

### Redis Connection Refused

1. Verify the Redis container is running: `docker ps | grep redis`
2. Test connectivity: `docker exec -it flamoral-redis redis-cli ping`
3. Check that `REDIS_HOST` and `REDIS_PORT` in `.env` match Docker Compose.

### node_modules Issues

```bash
# Clean and reinstall
npm run clean
npm install

# If workspace linking is broken
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Build Errors in Shared Packages

Shared packages must be built before services that depend on them:

```bash
npm run build:shared
npm run build:backend-shared
```

### Docker Compose Fails to Start

```bash
# Remove old volumes and restart
docker-compose -f infrastructure/local-dev/docker-compose.dev.yml down -v
npm run docker:dev:up
```

## Further Reading

- [README.md](README.md) -- Project overview, full architecture, tech stack
- [CONTRIBUTING.md](CONTRIBUTING.md) -- Branch naming, commit messages, PR process
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) -- System design and AWS infrastructure
- [docs/API.md](docs/API.md) -- API reference
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) -- Extended troubleshooting guide
