# Testing Infrastructure Setup

This document describes the comprehensive testing infrastructure for the Dating Platform, including integration tests and E2E tests.

## Overview

The testing infrastructure consists of:

1. **Unit Tests** - Test individual functions and components in isolation
2. **Integration Tests** - Test service interactions with real dependencies
3. **E2E Tests** - Test complete user flows through the web application
4. **Load Tests** - Test system performance under load
5. **Security Tests** - Test security vulnerabilities

## Architecture

```
DatingPlatform/
├── docker-compose.test.yml          # Test dependencies (PostgreSQL, Redis, etc.)
├── backend/
│   └── tests/
│       ├── jest.config.integration.enhanced.js
│       ├── integration/
│       │   ├── helpers/             # Test utilities
│       │   │   ├── api-client.ts
│       │   │   ├── database.ts
│       │   │   ├── fixtures.ts
│       │   │   ├── test-container.ts
│       │   │   └── websocket-client.ts
│       │   ├── examples/            # Example tests
│       │   ├── global-setup.ts      # Setup test environment
│       │   ├── global-teardown.ts   # Cleanup test environment
│       │   └── README.md
│       └── e2e/                     # Backend E2E tests
├── apps/web-app/
│   ├── playwright.config.ts         # Playwright configuration
│   └── e2e/
│       ├── auth.setup.ts            # Authentication setup
│       ├── fixtures/
│       │   └── test-helpers.ts      # E2E helpers
│       ├── examples/
│       │   └── user-flow.spec.ts    # Example E2E tests
│       └── README.md
└── pipelines/
    └── templates/
        └── integration-tests.yml    # CI/CD pipeline template
```

## Test Infrastructure Components

### 1. Docker Compose Test Environment

**File:** `docker-compose.test.yml`

Provides isolated test dependencies:
- PostgreSQL (port 5433)
- Redis (port 6380)
- MongoDB (port 27018)
- RabbitMQ (ports 5673, 15673)
- Elasticsearch (port 9201)
- MinIO (S3-compatible storage)
- Mailhog (email testing)

**Usage:**
```bash
# Start test environment
npm run docker:test:up

# Stop test environment
npm run docker:test:down

# View logs
npm run docker:test:logs
```

### 2. Integration Test Helpers

#### API Client (`helpers/api-client.ts`)
HTTP client for testing REST APIs with authentication support:

```typescript
import { createApiClient } from '../helpers';

const client = createApiClient('http://localhost:4000');
client.authenticateAs({ id: 'user-id', email: 'user@example.com' });

const response = await client.get('/api/profile');
await client.post('/api/matches', data);
```

#### Database Helper (`helpers/database.ts`)
Database management utilities:

```typescript
import { getDatabaseHelper } from '../helpers';

const dbHelper = getDatabaseHelper();
await dbHelper.initializePostgres(config);
await dbHelper.clearAll();
await dbHelper.insert('users', userData);
```

#### WebSocket Client (`helpers/websocket-client.ts`)
Real-time testing utilities:

```typescript
import { createWebSocketClient } from '../helpers';

const client = createWebSocketClient({ url: 'http://localhost:3004' });
await client.connect();
const message = await client.waitForEvent('new_message');
```

#### Test Fixtures (`helpers/fixtures.ts`)
Generate realistic test data:

```typescript
import { createUserFixture, createMatchingScenario } from '../helpers';

const user = await createUserFixture();
const scenario = await createMatchingScenario(10); // 10 users
```

#### Test Container Manager (`helpers/test-container.ts`)
Manage test containers using Testcontainers library:

```typescript
import { getContainerManager } from '../helpers';

const manager = getContainerManager();
const { postgres, redis } = await manager.startAll();
await manager.cleanup();
```

### 3. E2E Test Infrastructure (Playwright)

#### Configuration (`apps/web-app/playwright.config.ts`)

Multi-browser E2E testing:
- Chromium, Firefox, WebKit
- Mobile viewports (Chrome, Safari)
- Visual regression tests
- Accessibility tests
- Smoke tests

#### Test Helpers (`apps/web-app/e2e/fixtures/test-helpers.ts`)

Reusable utilities for E2E tests:

```typescript
import { createTestHelpers } from '../fixtures/test-helpers';

const helpers = createTestHelpers(page);
await helpers.login('user@example.com', 'password');
await helpers.swipeRight();
await helpers.sendMessage('Hello!');
await helpers.waitForToast('Success');
```

### 4. CI/CD Pipeline Template

**File:** `pipelines/templates/integration-tests.yml`

Automated testing in Azure DevOps:

**Jobs:**
1. Backend Integration Tests
2. Backend E2E Tests
3. Web App E2E Tests (Playwright)
4. WebSocket Integration Tests
5. Test Summary

**Features:**
- Parallel test execution
- Docker Compose integration
- Test result publishing
- Coverage reporting
- Artifact storage (screenshots, videos)

## Running Tests

### Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run with Docker Compose
npm run test:integration:docker

# Run with coverage
npm run test:integration:coverage

# Watch mode
npm run test:integration:watch

# Specific service
npm run test:integration -- --testPathPattern=auth-service
```

### E2E Tests

```bash
# Run all E2E tests (Playwright)
npm run test:e2e

# Headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# UI mode (interactive)
npm run test:e2e:ui

# Specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Mobile
npm run test:e2e:mobile

# Smoke tests only
npm run test:e2e:smoke

# View report
npm run test:e2e:report
```

### Backend E2E Tests

```bash
# Run backend E2E tests
npm run test:backend:e2e

# With Docker
npm run test:backend:e2e:docker
```

### All Tests (CI)

```bash
# Run all tests
npm run test:ci

# With coverage
npm run test:ci:coverage
```

## Test Types and Strategies

### 1. Integration Tests

**Purpose:** Test service interactions with real dependencies

**Scope:**
- API endpoint testing
- Database operations
- Redis caching
- Message queue operations
- Service-to-service communication
- Authentication and authorization

**Tools:**
- Jest
- Supertest
- Testcontainers
- Docker Compose

**Example:**
```typescript
describe('User Registration', () => {
  it('should create user and send welcome email', async () => {
    const response = await apiClient.post('/auth/register', userData);
    expect(response.status).toBe(201);

    // Verify user in database
    const user = await dbHelper.raw('SELECT * FROM users WHERE email = ?', [userData.email]);
    expect(user.rows).toHaveLength(1);
  });
});
```

### 2. E2E Tests

**Purpose:** Test complete user journeys

**Scope:**
- User registration and login
- Profile creation
- Swiping and matching
- Messaging
- Subscription and payments
- Settings management

**Tools:**
- Playwright
- Custom test helpers

**Example:**
```typescript
test('complete user flow', async ({ page }) => {
  const helpers = createTestHelpers(page);

  await page.goto('/register');
  // Fill registration form
  await page.click('button[type="submit"]');

  await page.waitForURL('/welcome');
  await helpers.swipeRight();
  await helpers.sendMessage('Hi!');
});
```

### 3. WebSocket Tests

**Purpose:** Test real-time features

**Scope:**
- Message delivery
- Typing indicators
- Online status
- Match notifications
- Connection handling

**Example:**
```typescript
it('should deliver messages in real-time', async () => {
  const client1 = createWebSocketClient({ url: WS_URL });
  const client2 = createWebSocketClient({ url: WS_URL });

  await Promise.all([client1.connect(), client2.connect()]);

  const messagePromise = client2.waitForEvent('new_message');
  await client1.emitWithAck('send_message', { content: 'Hello!' });

  const message = await messagePromise;
  expect(message.content).toBe('Hello!');
});
```

## Test Environment Configuration

### Environment Variables

Create `.env.test` files:

**Backend:** `backend/tests/.env.test`
```env
TEST_DB_HOST=localhost
TEST_DB_PORT=5433
TEST_DB_NAME=flamoral_test
TEST_DB_USER=postgres
TEST_DB_PASSWORD=test_password

TEST_REDIS_HOST=localhost
TEST_REDIS_PORT=6380

AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
```

**Web App:** `apps/web-app/.env.test`
```env
BASE_URL=http://localhost:3000
API_GATEWAY_URL=http://localhost:4000
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=Password123!
```

### Test Modes

1. **Docker Compose Mode** (Default)
   - Uses docker-compose.test.yml
   - Shared containers across all tests
   - Fast startup after initial setup

2. **Testcontainers Mode**
   - Uses Testcontainers library
   - Isolated containers per test suite
   - Slower but more isolated

3. **Existing Services Mode**
   - Uses running services
   - Fastest execution
   - Requires manual setup

## Best Practices

### 1. Test Isolation

- Clear database before each test
- Use transactions when possible
- Reset Redis cache
- Clean up test data

### 2. Realistic Test Data

- Use fixtures for consistent data
- Generate realistic values
- Match production data patterns

### 3. Explicit Waits

```typescript
// Good
await page.waitForSelector('[data-testid="result"]');

// Bad
await page.waitForTimeout(5000);
```

### 4. Test Data IDs

```html
<button data-testid="submit-button">Submit</button>
```

```typescript
await page.click('[data-testid="submit-button"]');
```

### 5. Error Handling

```typescript
try {
  await riskyOperation();
} catch (error) {
  // Cleanup or log
} finally {
  await cleanup();
}
```

### 6. Parallel Execution

Integration tests run serially (maxWorkers: 1)
E2E tests can run in parallel on CI

### 7. Test Coverage

- Aim for 70%+ coverage for integration tests
- Focus on critical paths
- Test both success and failure cases
- Test edge cases

## Debugging

### View Test Logs

```bash
# Docker logs
docker-compose -f docker-compose.test.yml logs -f

# Specific service
docker-compose -f docker-compose.test.yml logs postgres-test
```

### Debug Tests

```bash
# Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Playwright debug
npm run test:e2e:debug
```

### Screenshots and Videos

- Automatically captured on failure
- Stored in `test-results/`
- Available in CI artifacts

### Trace Viewer (Playwright)

```bash
npx playwright show-trace trace.zip
```

## CI/CD Integration

### Azure DevOps Pipeline

```yaml
trigger:
  - main
  - develop

stages:
  - stage: Test
    jobs:
      - template: pipelines/templates/integration-tests.yml
        parameters:
          environment: 'test'
          runE2ETests: true
```

### Test Reports

- JUnit XML for test results
- Cobertura for code coverage
- HTML reports for Playwright
- JSON results for dashboards

### Artifacts

- Test results
- Coverage reports
- Screenshots
- Videos
- Trace files

## Performance Optimization

### Speed Up Tests

1. Use test database templates
2. Reuse containers
3. Minimize container restarts
4. Parallel execution where possible
5. Mock external APIs
6. Cache dependencies

### Resource Management

- Limit Docker memory usage
- Clean up containers
- Close database connections
- Stop background processes

## Troubleshooting

### Common Issues

**Port conflicts:**
```bash
lsof -i :5433  # Find process using port
npm run docker:test:down  # Stop containers
```

**Database connection timeouts:**
```bash
# Increase wait time in global-setup.ts
# Check service health
docker-compose -f docker-compose.test.yml ps
```

**Flaky tests:**
- Add explicit waits
- Check for race conditions
- Verify test isolation
- Review async/await usage

**Out of memory:**
```bash
# Increase Docker memory
# Reduce maxWorkers
# Clear test data more frequently
```

## Additional Resources

### Documentation
- [Jest](https://jestjs.io/)
- [Playwright](https://playwright.dev/)
- [Testcontainers](https://www.testcontainers.org/)
- [Docker Compose](https://docs.docker.com/compose/)

### Examples
- `backend/tests/integration/examples/`
- `apps/web-app/e2e/examples/`

### Support
- Review test README files
- Check CI/CD pipeline logs
- Consult team documentation
