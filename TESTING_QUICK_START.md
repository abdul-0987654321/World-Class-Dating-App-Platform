# Testing Quick Start Guide

Quick reference for running tests in the Dating Platform.

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm or yarn

## Installation

```bash
# Install all dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install
```

## Test Commands Cheat Sheet

### Unit Tests

```bash
# Backend unit tests
npm run test:backend

# With coverage
npm run test:backend:coverage

# Watch mode
npm run test:watch
```

### Integration Tests

```bash
# All integration tests (with Docker)
npm run test:integration:docker

# Without Docker (uses existing services)
npm run test:integration

# With coverage
npm run test:integration:coverage

# Watch mode
npm run test:integration:watch

# Specific service
npm run test:integration -- --testPathPattern=auth-service
```

### E2E Tests

#### Web App (Playwright)

```bash
# All E2E tests
npm run test:e2e

# Specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Mobile viewports
npm run test:e2e:mobile

# Headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Interactive UI mode
npm run test:e2e:ui

# Smoke tests only
npm run test:e2e:smoke

# View report
npm run test:e2e:report
```

#### Backend E2E

```bash
# Backend E2E tests
npm run test:backend:e2e

# With Docker
npm run test:backend:e2e:docker
```

### Docker Management

```bash
# Start test dependencies
npm run docker:test:up

# Stop test dependencies
npm run docker:test:down

# View logs
npm run docker:test:logs
```

### Load Tests

```bash
# All load tests
npm run test:load:all

# Specific scenarios
npm run test:load:auth
npm run test:load:matching
npm run test:load:websocket
```

### Security Tests

```bash
# All security tests
npm run test:security

# OWASP tests
npm run test:security:owasp

# Authentication security
npm run test:security:auth
```

### CI Tests

```bash
# Run all CI tests
npm run test:ci

# With coverage
npm run test:ci:coverage
```

## Common Workflows

### Local Development

```bash
# 1. Start test environment
npm run docker:test:up

# 2. Run integration tests in watch mode
npm run test:integration:watch

# 3. When done
npm run docker:test:down
```

### Pre-Commit

```bash
# Run all tests
npm run test:all
```

### Before Push

```bash
# Run CI tests locally
npm run test:ci
```

### Debug Failing Test

```bash
# Integration test
npm run test:integration -- --testNamePattern="test name"

# E2E test
npm run test:e2e:debug -- user-flow.spec.ts
```

## Environment Setup

### 1. Start Test Services

```bash
npm run docker:test:up
```

This starts:
- PostgreSQL (port 5433)
- Redis (port 6380)
- MongoDB (port 27018)
- RabbitMQ (ports 5673, 15673)
- Elasticsearch (port 9201)
- MinIO (port 9000)
- Mailhog (port 8025)

### 2. Verify Services

```bash
# Check all services are running
docker-compose -f docker-compose.test.yml ps

# Check PostgreSQL
docker exec flamoral-postgres-test pg_isready -U postgres

# Check Redis
docker exec flamoral-redis-test redis-cli ping
```

### 3. Run Tests

```bash
npm run test:integration
```

### 4. Cleanup

```bash
npm run docker:test:down
```

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process using port 5433
lsof -i :5433
kill -9 <PID>

# Or stop all test containers
npm run docker:test:down
```

### Test Timeout

```bash
# Increase timeout in test file
jest.setTimeout(60000); // 60 seconds

# Or in config
// jest.config.js
testTimeout: 60000
```

### Docker Issues

```bash
# Clean up Docker
docker system prune -a

# Rebuild test containers
docker-compose -f docker-compose.test.yml up -d --force-recreate
```

### Database Connection Failed

```bash
# Check if PostgreSQL is ready
docker-compose -f docker-compose.test.yml logs postgres-test

# Restart service
docker-compose -f docker-compose.test.yml restart postgres-test
```

### Flaky Tests

```bash
# Run test multiple times
for i in {1..10}; do npm run test:integration -- --testNamePattern="test name"; done

# Check for race conditions
npm run test:integration -- --detectOpenHandles
```

## Test File Locations

```
backend/tests/
├── integration/          # Integration tests
│   ├── auth-service/
│   ├── user-service/
│   ├── matching-service/
│   └── messaging-service/
├── e2e/                 # Backend E2E tests
│   └── scenarios/
└── unit/                # Unit tests

apps/web-app/
├── e2e/                 # Web app E2E tests
│   ├── examples/
│   └── fixtures/
└── tests/               # Component tests

tests/
├── load/                # Load tests
│   └── scenarios/
├── security/            # Security tests
└── performance/         # Performance tests
```

## Writing New Tests

### Integration Test Template

```typescript
// backend/tests/integration/my-feature/my-test.test.ts
import { createApiClient, getDatabaseHelper } from '../helpers';

describe('My Feature Integration Tests', () => {
  let apiClient: ReturnType<typeof createApiClient>;
  let dbHelper: ReturnType<typeof getDatabaseHelper>;

  beforeAll(async () => {
    apiClient = createApiClient('http://localhost:4000');
    dbHelper = getDatabaseHelper();
    await dbHelper.initializePostgres(/* config */);
  });

  afterAll(async () => {
    await dbHelper.cleanup();
  });

  beforeEach(async () => {
    await dbHelper.clearAll();
  });

  it('should test something', async () => {
    // Test code
  });
});
```

### E2E Test Template

```typescript
// apps/web-app/e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';
import { createTestHelpers } from './fixtures/test-helpers';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    const helpers = createTestHelpers(page);

    await page.goto('/path');
    await helpers.waitForLoadingComplete();

    // Test code
  });
});
```

## Best Practices

### ✅ Do

- Write descriptive test names
- Use data-testid attributes
- Clear database before each test
- Use fixtures for test data
- Add explicit waits
- Test both success and failure
- Clean up resources

### ❌ Don't

- Use hard-coded delays
- Test implementation details
- Share state between tests
- Skip cleanup
- Use production data
- Hardcode credentials
- Ignore flaky tests

## Resources

- [Full Testing Documentation](./TESTING_INFRASTRUCTURE.md)
- [Integration Tests README](./backend/tests/integration/README.md)
- [E2E Tests README](./apps/web-app/e2e/README.md)
- [Playwright Docs](https://playwright.dev)
- [Jest Docs](https://jestjs.io)

## Getting Help

1. Check test logs: `npm run docker:test:logs`
2. Review test reports: `npm run test:e2e:report`
3. Debug tests: `npm run test:e2e:debug`
4. Check CI logs in Azure DevOps or GitHub Actions
