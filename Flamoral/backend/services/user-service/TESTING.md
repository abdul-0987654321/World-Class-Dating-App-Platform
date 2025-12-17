# Testing Guide

A comprehensive guide to running tests for the Flamoral User Service.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Test Environment
```bash
# Copy the example environment file
cp .env.test.example .env.test

# Edit .env.test with your test database credentials
```

### 3. Setup Test Database
```bash
# This will create the test database, run migrations, and seed data
npm run setup:test-db
```

### 4. Run Tests
```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:e2e           # E2E tests with real database

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Database Management

### Initial Setup
```bash
# Setup test database (first time)
npm run setup:test-db
```

### Reset Database
```bash
# Reset to clean state (rollback + migrate + seed)
npm run reset:test-db
```

### Manual Database Operations
```bash
# Run migrations only
npm run migrate:test

# Run seeds only
npm run seed:test
```

## Test Types

### Unit Tests (`npm run test:unit`)

- **What**: Tests individual functions/classes in isolation
- **Speed**: ⚡ Very Fast
- **Database**: ❌ No database required
- **Use When**: Testing business logic, utilities, services

**Example**:
```typescript
// src/__tests__/unit/services/coin.service.test.ts
describe('CoinService', () => {
  it('should calculate balance correctly', () => {
    // Test logic
  });
});
```

### Integration Tests (`npm run test:integration`)

- **What**: Tests API endpoints with mocked services
- **Speed**: ⚡ Fast
- **Database**: ❌ Mocked, no real database
- **Use When**: Testing API contracts, request/response validation

**Example**:
```typescript
// src/__tests__/integration/coin.integration.test.ts
describe('Coin API', () => {
  it('GET /api/coins/balance should return 200', async () => {
    const response = await request(app).get('/api/coins/balance');
    expect(response.status).toBe(200);
  });
});
```

### E2E Tests (`npm run test:e2e`)

- **What**: Tests complete user flows with real database
- **Speed**: 🐌 Slower (uses real database)
- **Database**: ✅ Real test database required
- **Use When**: Testing critical flows, database integrity

**Example**:
```typescript
// src/__tests__/e2e/coin.e2e.test.ts
describe('Coin Purchase Flow', () => {
  it('should purchase coins and persist to database', async () => {
    const response = await request(app)
      .post('/api/coins/purchase')
      .send({ productSku: 'COIN_PACK_SMALL' });

    // Verify in database
    const balance = await db('coin_balances').where({ user_id }).first();
    expect(balance.balance).toBe(100);
  });
});
```

## Test Coverage

View coverage report:
```bash
npm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html
```

**Coverage Goals**:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

## Writing Tests

### Using Test Fixtures

```typescript
import { createMockUser, createMockCoinBalance } from '../helpers/test-data';

const user = createMockUser({ email: 'test@example.com' });
const balance = createMockCoinBalance(user.id, { balance: 500 });
```

### Database Helpers (E2E Tests)

```typescript
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanTables,
  createTestUserWithProfile,
} from '../helpers/db-helpers';

describe('E2E Test', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanTables('users', 'coin_balances');
  });

  it('should work', async () => {
    const testUser = await createTestUserWithProfile();
    // Your test
  });
});
```

## Debugging Tests

### Run Single Test File
```bash
npm test -- coin.service.test.ts
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="should purchase coins"
```

### Debug with Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Increase Timeout
```typescript
// In test file
jest.setTimeout(30000); // 30 seconds

// Or for specific test
it('slow test', async () => {
  // ...
}, 30000);
```

## Common Issues

### Issue: "Test database is not accessible"

**Solution**:
1. Ensure PostgreSQL is running
2. Check credentials in `.env.test`
3. Run `npm run setup:test-db`

### Issue: "Migration failed"

**Solution**:
```bash
npm run reset:test-db
```

### Issue: "Tests timing out"

**Solution**:
1. Increase timeout in `jest.config.js`
2. Check for unresolved promises
3. Ensure database connections are closed

### Issue: "Port already in use"

**Solution**:
1. Change test port in `.env.test`
2. Kill existing process: `lsof -ti:3001 | xargs kill -9`

### Issue: "Mock not working"

**Solution**:
1. Ensure mocks are cleared: `jest.clearAllMocks()`
2. Check mock is before imports: `jest.mock()` must be at top level
3. Reset mocks in `beforeEach`

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: flamoral_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Setup test database
        run: npm run setup:test-db
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/flamoral_test

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Test Organization

```
__tests__/
├── unit/                    # Fast, isolated tests
│   └── services/
│       ├── coin.service.test.ts
│       ├── subscription.service.test.ts
│       └── boost.service.test.ts
│
├── integration/            # API endpoint tests (mocked services)
│   ├── coin.integration.test.ts
│   ├── subscription.integration.test.ts
│   ├── boost.integration.test.ts
│   └── privacy-safety.integration.test.ts
│
├── e2e/                    # Full stack tests (real database)
│   ├── coin.e2e.test.ts
│   └── subscription.e2e.test.ts
│
└── helpers/                # Test utilities
    ├── test-data.ts        # Mock data factories
    ├── db-mock.ts          # Database mocks
    └── db-helpers.ts       # Database utilities
```

## Best Practices

### ✅ DO

- Use factories for test data
- Clean up after each test
- Test both success and failure cases
- Verify database state in E2E tests
- Use descriptive test names
- Mock external services
- Keep tests independent

### ❌ DON'T

- Share state between tests
- Use production database
- Hardcode test data
- Skip cleanup
- Test implementation details
- Ignore failing tests
- Create tests that depend on execution order

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
- [Test README](./src/__tests__/README.md) - Detailed testing documentation

## Support

For issues or questions:
1. Check [Common Issues](#common-issues)
2. Review [Test README](./src/__tests__/README.md)
3. Contact the development team
