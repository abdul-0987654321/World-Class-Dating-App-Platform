# Testing Quick Start Guide

## Prerequisites

1. Docker Desktop installed and running
2. Node.js 20+ installed
3. Yarn package manager installed

## Quick Start - Run All Tests

```bash
# 1. Install dependencies
yarn install

# 2. Build shared packages
yarn build:packages

# 3. Start test infrastructure
yarn docker:test:up

# 4. Run backend tests
yarn test:backend

# 5. Run integration tests
yarn test:integration

# 6. Stop test infrastructure
yarn docker:test:down
```

## Test Commands

### Unit Tests
```bash
# All backend unit tests
yarn test:backend

# With coverage
yarn test:backend:coverage

# Specific service
cd backend/services/auth-service && npm test
```

### Integration Tests
```bash
# Integration tests with Docker
yarn test:integration:docker

# Integration tests (assumes services running)
yarn test:integration

# With coverage
yarn test:integration:coverage

# Watch mode
yarn test:integration:watch
```

### E2E Tests
```bash
# Backend E2E tests with Docker
yarn test:backend:e2e:docker

# Backend E2E tests only
yarn test:backend:e2e

# Playwright E2E tests
yarn test:e2e

# Playwright headed mode
yarn test:e2e:headed

# Playwright debug mode
yarn test:e2e:debug
```

### Security Tests
```bash
# All security tests
yarn test:security

# OWASP tests
yarn test:security:owasp

# Authentication security
yarn test:security:auth
```

### CI Tests
```bash
# Run all tests (CI pipeline)
yarn test:ci

# Run all tests with coverage
yarn test:ci:coverage
```

## Docker Compose Commands

### Start Test Services
```bash
# Start and wait for health checks
yarn docker:test:up

# Or manually
docker-compose -f docker-compose.test.yml up -d --wait
```

### View Logs
```bash
yarn docker:test:logs

# Or manually
docker-compose -f docker-compose.test.yml logs -f
```

### Stop Test Services
```bash
yarn docker:test:down

# Or manually
docker-compose -f docker-compose.test.yml down -v
```

### Check Service Status
```bash
docker-compose -f docker-compose.test.yml ps
```

## Test Infrastructure Services

| Service | Local Port | Container Port | Web UI |
|---------|-----------|----------------|--------|
| PostgreSQL | 5433 | 5432 | - |
| Redis | 6380 | 6379 | - |
| MongoDB | 27018 | 27017 | - |
| RabbitMQ | 5673 | 5672 | http://localhost:15673 |
| Elasticsearch | 9201 | 9200 | - |
| MinIO | 9000 | 9000 | http://localhost:9001 |
| MailHog SMTP | 1025 | 1025 | - |
| MailHog Web | 8025 | 8025 | http://localhost:8025 |

### Access Web UIs

- **RabbitMQ Management**: http://localhost:15673 (guest/guest)
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **MailHog**: http://localhost:8025

## Troubleshooting

### Tests Failing - Database Connection
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection
docker exec -it flamoral-postgres-test psql -U postgres -d flamoral_test

# Verify port
netstat -an | grep 5433
```

### Tests Failing - Redis Connection
```bash
# Check if Redis is running
docker ps | grep redis

# Test connection
docker exec -it flamoral-redis-test redis-cli ping

# Verify port
netstat -an | grep 6380
```

### Clean Start
```bash
# Stop everything
yarn docker:test:down

# Remove all volumes
docker-compose -f docker-compose.test.yml down -v

# Restart
yarn docker:test:up
```

### Port Already in Use
```bash
# Find process using port (Windows)
netstat -ano | findstr :5433

# Kill process (replace PID)
taskkill /PID <pid> /F

# Or change port in docker-compose.test.yml
```

### Tests Timeout
```bash
# Increase timeout in jest.config.js
testTimeout: 60000  # 60 seconds

# Or in individual test
jest.setTimeout(60000);
```

## Running Individual Tests

### Run Specific Test File
```bash
# Using Jest
npx jest path/to/test.test.ts

# With pattern
npx jest --testNamePattern="should create user"
```

### Run Tests in Watch Mode
```bash
# Backend tests
cd backend && npm test -- --watch

# Integration tests
yarn test:integration:watch
```

### Debug Tests in VS Code

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "${fileBasename}"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Environment Variables

### Test Environment Files
- `backend/.env.test` - Main backend test environment
- `backend/tests/.env.test` - Integration test environment
- Service-specific: `backend/services/*/. env.test`

### Override for Local Testing
Create `.env.test.local` (gitignored):
```bash
# Override specific variables
TEST_DB_PORT=5434
REDIS_PORT=6381
```

## Coverage Reports

### View Coverage
```bash
# Generate coverage
yarn test:backend:coverage

# Open HTML report
open backend/coverage/lcov-report/index.html
```

### Coverage Thresholds
Current thresholds (configurable in jest.config.js):
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Best Practices

1. **Always use Docker for integration/e2e tests**
   - Ensures consistent test environment
   - Prevents conflicts with development databases

2. **Run unit tests first**
   - Faster feedback
   - Catch issues early

3. **Clean up after tests**
   - Use `afterAll` and `afterEach` hooks
   - Prevent test pollution

4. **Use meaningful test names**
   ```typescript
   it('should create user with valid email and password', ...)
   ```

5. **Mock external services**
   - Use jest.mock() for external APIs
   - Use test doubles for third-party services

6. **Isolate tests**
   - Each test should be independent
   - Use factories for test data

## Common Test Patterns

### Test Data Factory
```typescript
export const createTestUser = async (overrides = {}) => {
  return {
    email: `test${Date.now()}@example.com`,
    password: 'Test123!',
    firstName: 'Test',
    lastName: 'User',
    ...overrides
  };
};
```

### Database Cleanup
```typescript
beforeEach(async () => {
  await db.query('TRUNCATE users CASCADE');
});
```

### API Testing
```typescript
import request from 'supertest';

it('should return 200 for health check', async () => {
  const response = await request(app).get('/health');
  expect(response.status).toBe(200);
});
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
