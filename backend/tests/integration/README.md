# Integration Tests

This directory contains integration tests for the Dating Platform backend services.

## Overview

Integration tests verify that different components of the system work together correctly. Unlike unit tests that test individual functions in isolation, integration tests:

- Test interactions between services
- Use real databases and message queues (via containers)
- Verify API contracts and data flow
- Test authentication and authorization
- Validate business logic across service boundaries

## Directory Structure

```
integration/
├── helpers/                    # Test utilities and helpers
│   ├── api-client.ts          # HTTP API test client
│   ├── database.ts            # Database helper utilities
│   ├── fixtures.ts            # Test data generators
│   ├── test-container.ts      # Testcontainers management
│   ├── websocket-client.ts    # WebSocket test client
│   └── index.ts               # Centralized exports
├── examples/                   # Example test files
│   ├── api-integration.test.example.ts
│   └── websocket-integration.test.example.ts
├── auth-service/              # Auth service integration tests
├── user-service/              # User service integration tests
├── matching-service/          # Matching service integration tests
├── messaging-service/         # Messaging service integration tests
├── payment-service/           # Payment service integration tests
├── global-setup.ts            # Global test setup
├── global-teardown.ts         # Global test teardown
├── setup.ts                   # Test environment setup
└── README.md                  # This file
```

## Running Tests

### Prerequisites

1. **Docker & Docker Compose** (for test containers)
2. **Node.js 20+**
3. **Dependencies installed** (`npm install`)

### Run All Integration Tests

```bash
# From project root
npm run test:integration

# With Docker Compose
npm run test:integration:docker

# With coverage
npm run test:integration:coverage

# Watch mode
npm run test:integration:watch
```

### Run Specific Test Suites

```bash
# Run tests for a specific service
npm run test:integration -- --testPathPattern=auth-service

# Run specific test file
npm run test:integration -- integration/auth-service/login.test.ts
```

## Test Environment Setup

### Option 1: Docker Compose (Recommended)

The easiest way to run integration tests is using Docker Compose:

```bash
# Start test dependencies
npm run docker:test:up

# Run tests
npm run test:integration

# Stop test dependencies
npm run docker:test:down
```

### Option 2: Testcontainers

Tests can automatically start and stop containers using Testcontainers:

```bash
# Set environment variable
export USE_TESTCONTAINERS=true

# Run tests (containers will start/stop automatically)
npm run test:integration
```

### Option 3: Existing Services

Use existing services (development or staging):

```bash
# Set environment variable
export USE_DOCKER_COMPOSE=false
export USE_TESTCONTAINERS=false

# Configure connection details in .env.test
npm run test:integration
```

## Environment Variables

Create a `.env.test` file in the `backend/tests` directory:

```env
# Database
TEST_DB_HOST=localhost
TEST_DB_PORT=5433
TEST_DB_NAME=flamoral_test
TEST_DB_USER=postgres
TEST_DB_PASSWORD=test_password

# Redis
TEST_REDIS_HOST=localhost
TEST_REDIS_PORT=6380
TEST_REDIS_DB=1

# MongoDB
TEST_MONGO_HOST=localhost
TEST_MONGO_PORT=27018

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
MATCHING_SERVICE_URL=http://localhost:3003
MESSAGING_SERVICE_URL=http://localhost:3004
PAYMENT_SERVICE_URL=http://localhost:3005
MEDIA_SERVICE_URL=http://localhost:3006

# JWT Secrets
JWT_ACCESS_SECRET=test_access_secret_key
JWT_REFRESH_SECRET=test_refresh_secret_key

# Test Mode
NODE_ENV=test
```

## Writing Integration Tests

### Basic Structure

```typescript
import { createApiClient, getDatabaseHelper, createUserFixture } from '../helpers';

describe('Feature Integration Tests', () => {
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

  it('should test feature', async () => {
    // Arrange
    const user = await createUserFixture();
    await dbHelper.insert('users', user);

    // Act
    apiClient.authenticateAs({ id: user.id, email: user.email });
    const response = await apiClient.get('/api/profile');

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.email).toBe(user.email);
  });
});
```

### Using Test Helpers

#### API Client

```typescript
import { createApiClient } from '../helpers';

const client = createApiClient('http://localhost:4000');

// Authenticate
client.authenticateAs({ id: 'user-id', email: 'user@example.com' });

// Make requests
await client.get('/api/users/profile');
await client.post('/api/matches/swipe', { userId: '123', direction: 'right' });
await client.put('/api/users/profile', { bio: 'New bio' });
await client.delete('/api/matches/123');
```

#### Database Helper

```typescript
import { getDatabaseHelper } from '../helpers';

const dbHelper = getDatabaseHelper();

// Initialize connections
await dbHelper.initializePostgres(config);
await dbHelper.initializeRedis('redis://localhost:6380');

// Insert test data
await dbHelper.insert('users', userData);

// Clear databases
await dbHelper.clearAll();

// Run raw queries
await dbHelper.raw('SELECT * FROM users WHERE email = ?', ['test@example.com']);
```

#### WebSocket Client

```typescript
import { createWebSocketClient } from '../helpers';

const client = createWebSocketClient({
  url: 'http://localhost:3004',
  auth: { token: 'user-token' },
});

await client.connect();

// Send messages
client.emit('send_message', { content: 'Hello!' });

// Listen for events
const message = await client.waitForEvent('new_message', 5000);

// Cleanup
await client.cleanup();
```

#### Test Fixtures

```typescript
import { createUserFixture, createMatchFixture } from '../helpers';

// Generate test users
const user1 = await createUserFixture();
const user2 = await createUserFixture({ gender: 'female' });

// Generate matches
const match = createMatchFixture({
  user1Id: user1.id,
  user2Id: user2.id,
});

// Create complete scenarios
const scenario = await createMatchingScenario(5); // 5 users with matches
```

## Best Practices

### 1. Test Isolation

Each test should be independent and not rely on other tests:

```typescript
beforeEach(async () => {
  // Clear database before each test
  await dbHelper.clearAll();
});
```

### 2. Use Transactions (when possible)

```typescript
beforeEach(async () => {
  await dbHelper.getKnex().transaction(async (trx) => {
    // Test runs in transaction
    // Automatically rolled back after test
  });
});
```

### 3. Clean Up Resources

```typescript
afterAll(async () => {
  await dbHelper.cleanup();
  await redisClient.quit();
  await websocketClient.cleanup();
});
```

### 4. Use Realistic Test Data

```typescript
const user = await createUserFixture({
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  bio: 'Realistic bio that matches production data',
});
```

### 5. Test Both Success and Failure Cases

```typescript
describe('Authentication', () => {
  it('should login with valid credentials', async () => {
    // Test success case
  });

  it('should fail with invalid credentials', async () => {
    // Test failure case
    const response = await client.post('/auth/login', {
      email: 'wrong@example.com',
      password: 'wrong',
    });
    expect(response.status).toBe(401);
  });
});
```

### 6. Test Edge Cases

- Empty inputs
- Very long inputs
- Special characters
- Concurrent requests
- Rate limiting
- Timeouts

### 7. Verify Side Effects

```typescript
it('should create user and send welcome email', async () => {
  await client.post('/auth/register', userData);

  // Verify user in database
  const user = await dbHelper.raw('SELECT * FROM users WHERE email = ?', [userData.email]);
  expect(user.rows).toHaveLength(1);

  // Verify email sent (check email queue/mock)
  // ...
});
```

## Debugging Tests

### View Logs

```bash
# View Docker Compose logs
npm run docker:test:logs

# View specific service logs
docker-compose -f docker-compose.test.yml logs postgres-test
```

### Run Tests in Debug Mode

```bash
# Using Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Using VS Code
# Add breakpoint and press F5
```

### Increase Timeouts

```typescript
jest.setTimeout(60000); // 60 seconds

// Or for specific test
it('long running test', async () => {
  // test code
}, 60000);
```

## CI/CD Integration

Integration tests are automatically run in CI/CD pipeline:

```yaml
# Azure DevOps Pipeline
- template: templates/integration-tests.yml
  parameters:
    environment: 'test'
    runE2ETests: true
```

## Performance Considerations

### Parallel vs Serial Execution

Integration tests run serially by default (maxWorkers: 1) to avoid conflicts:

```javascript
// jest.config.integration.js
module.exports = {
  maxWorkers: 1, // Serial execution
};
```

### Test Speed Optimization

1. **Use test database templates** - Pre-seed databases and clone them
2. **Minimize container restarts** - Reuse containers across tests
3. **Parallel service tests** - Different services can run in parallel
4. **Mock external APIs** - Don't hit external services
5. **Use faster assertions** - Avoid polling when possible

## Troubleshooting

### Common Issues

**Port conflicts**
```bash
# Stop conflicting services
docker-compose down
npm run docker:test:down
```

**Database connection timeouts**
```bash
# Increase wait time in global-setup.ts
# Or manually check services
docker-compose -f docker-compose.test.yml ps
```

**Tests hanging**
```bash
# Check for open handles
npm run test:integration -- --detectOpenHandles
```

**Flaky tests**
- Add explicit waits
- Check for race conditions
- Verify test isolation
- Review async/await usage

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testcontainers](https://www.testcontainers.org/)
- [Supertest](https://github.com/visionmedia/supertest)
- [Socket.io Client](https://socket.io/docs/v4/client-api/)
