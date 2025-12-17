# Testing Infrastructure

This directory contains all test files, fixtures, and utilities for the user-service.

## Directory Structure

```
__tests__/
├── unit/                    # Unit tests (services, utilities)
│   └── services/           # Service layer unit tests
├── integration/            # Integration tests (API endpoints with mocked services)
├── e2e/                    # End-to-end tests (full stack with real database)
├── helpers/                # Test utilities and fixtures
│   ├── test-data.ts       # Mock data factories
│   ├── db-mock.ts         # Database mocking utilities
│   └── db-helpers.ts      # Real database helper utilities
├── setup.ts               # Global test setup
└── README.md              # This file
```

## Test Types

### 1. Unit Tests (`unit/`)

Unit tests focus on testing individual functions and classes in isolation with all dependencies mocked.

**Location**: `src/__tests__/unit/`

**Example**:
```typescript
import { CoinService } from '../../../domain/services/coin.service';

describe('CoinService', () => {
  let coinService: CoinService;
  let mockRepository: jest.Mocked<CoinRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    coinService = new CoinService(mockRepository);
  });

  it('should return balance', async () => {
    mockRepository.findByUserId.mockResolvedValue({ balance: 500 });
    const result = await coinService.getBalance('user-123');
    expect(result.balance).toBe(500);
  });
});
```

**Run unit tests**:
```bash
npm run test:unit
```

### 2. Integration Tests (`integration/`)

Integration tests verify API endpoints with mocked services and authentication. These tests do NOT use a real database.

**Location**: `src/__tests__/integration/`

**Example**:
```typescript
import request from 'supertest';
import express from 'express';
import coinRoutes from '../../api/routes/coin.routes';

describe('Coin API Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/coins', coinRoutes);
  });

  it('should return coin balance', async () => {
    const response = await request(app)
      .get('/api/coins/balance')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
  });
});
```

**Run integration tests**:
```bash
npm run test:integration
```

### 3. E2E Tests (`e2e/`)

End-to-end tests verify complete user flows with a real test database. These tests provide the highest confidence but are slower.

**Location**: `src/__tests__/e2e/`

**Example**:
```typescript
import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/db-helpers';

describe('Coin API E2E Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should purchase coins and persist to database', async () => {
    const response = await request(app)
      .post('/api/coins/purchase')
      .send({ productSku: 'COIN_PACK_SMALL', stripePaymentId: 'pi_123' })
      .expect(200);

    expect(response.body.data.balance).toBe(100);

    // Verify in database
    const balance = await getTestDb()('coin_balances')
      .where({ user_id: testUser.id })
      .first();

    expect(balance.balance).toBe(100);
  });
});
```

**Run E2E tests**:
```bash
npm run test:e2e
```

## Test Fixtures and Utilities

### `helpers/test-data.ts`

Factory functions for creating mock test data. Use these for consistent test data across all tests.

**Available Factories**:

**User & Auth**:
- `createMockUser(overrides?)` - Create mock user entity
- `createMockProfile(userId, overrides?)` - Create mock profile
- `createMockCreateUserDto(overrides?)` - Create user creation DTO
- `createMockVerificationToken(userId, type)` - Create verification token
- `mockJwtPayload(userId?)` - Create JWT payload

**Subscriptions**:
- `createMockSubscription(userId, overrides?)` - Create subscription
- `createMockSubscriptionFeature(overrides?)` - Create subscription feature
- `createMockSubscriptionWithFeatures(userId, tier)` - Create subscription with features

**Coins**:
- `createMockCoinBalance(userId, overrides?)` - Create coin balance
- `createMockCoinTransaction(userId, overrides?)` - Create coin transaction
- `createMockCoinProduct(overrides?)` - Create coin product

**Boosts**:
- `createMockBoostProduct(overrides?)` - Create boost product
- `createMockBoostInstance(userId, overrides?)` - Create boost instance

**Privacy & Safety**:
- `createMockPrivacySettings(userId, overrides?)` - Create privacy settings
- `createMockBlock(userId, blockedId, overrides?)` - Create block
- `createMockReport(userId, reportedId, overrides?)` - Create report
- `createMockReportCategory(overrides?)` - Create report category

**Batch Helpers**:
- `createMultipleMockUsers(count)` - Create multiple users
- `createMultipleMockCoinTransactions(userId, count)` - Create multiple transactions

**Example Usage**:
```typescript
import { createMockUser, createMockCoinBalance } from '../helpers/test-data';

const user = createMockUser({ email: 'custom@example.com' });
const balance = createMockCoinBalance(user.id, { balance: 500 });
```

### `helpers/db-mock.ts`

Mock Knex query builder for unit tests that need to mock database interactions.

**Available Mocks**:
- `createMockQueryBuilder()` - Create a mock query builder
- `createMockKnex()` - Create a mock Knex instance
- `mockDatabase(tableName, mockData)` - Create complete database mock

**Example Usage**:
```typescript
import { createMockKnex, mockDatabase } from '../helpers/db-mock';

const { mockKnex, mockQueryBuilder } = createMockKnex();

mockQueryBuilder.first.mockResolvedValue({ id: '123', balance: 500 });

// Use in repository tests
const repository = new CoinRepository(mockKnex);
```

### `helpers/db-helpers.ts`

Real database utilities for E2E tests. Provides functions to setup, teardown, and manipulate the test database.

**Database Management**:
- `getTestDb()` - Get test database connection
- `closeTestDb()` - Close database connection
- `runMigrations()` - Run all migrations
- `rollbackMigrations()` - Rollback all migrations
- `runSeeds()` - Run seed files
- `resetDatabase()` - Full reset (rollback + migrate + seed)

**Test Database Setup**:
- `setupTestDatabase()` - Setup for E2E tests (call in `beforeAll`)
- `teardownTestDatabase()` - Cleanup after E2E tests (call in `afterAll`)

**Data Manipulation**:
- `cleanDatabase()` - Clean all tables
- `cleanTables(...tables)` - Clean specific tables
- `insertTestData(table, data)` - Insert test data
- `findRecords(table, where)` - Find records
- `findRecord(table, where)` - Find single record
- `updateRecords(table, where, updates)` - Update records
- `deleteRecords(table, where)` - Delete records
- `countRecords(table, where?)` - Count records

**Helpers**:
- `createTestUserWithProfile(userData?)` - Create complete user with all relations
- `beginTransaction()` - Start database transaction
- `executeRawQuery(sql, bindings?)` - Execute raw SQL
- `waitFor(ms)` - Wait utility for async operations

**Example Usage**:
```typescript
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanTables,
  createTestUserWithProfile,
  getTestDb,
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

  it('should work with real database', async () => {
    const testUser = await createTestUserWithProfile();

    // Your test here

    const db = getTestDb();
    const balance = await db('coin_balances')
      .where({ user_id: testUser.user.id })
      .first();

    expect(balance).toBeDefined();
  });
});
```

## Test Database Setup

### Prerequisites

1. PostgreSQL must be running
2. You need a test database user with CREATE DATABASE privileges

### Environment Variables

Create a `.env.test` file:

```env
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/flamoral_test

DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_test
DB_USER=test
DB_PASSWORD=test

JWT_ACCESS_SECRET=test-access-secret-key
JWT_REFRESH_SECRET=test-refresh-secret-key
```

### Setup Test Database

Run the setup script to create and initialize the test database:

```bash
npm run setup:test-db
```

This script will:
1. Create the `flamoral_test` database (if it doesn't exist)
2. Run all migrations
3. Run seed files to populate reference data

### Reset Test Database

To reset the test database to a clean state:

```bash
npm run reset:test-db
```

This will:
1. Rollback all migrations
2. Run migrations again
3. Run seed files

## NPM Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e --runInBand",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "setup:test-db": "ts-node scripts/setup-test-db.ts",
    "reset:test-db": "ts-node scripts/reset-test-db.ts"
  }
}
```

## Best Practices

### 1. Test Isolation

Each test should be independent and not rely on other tests:

```typescript
beforeEach(async () => {
  await cleanTables('users', 'subscriptions');
  testUser = await createTestUserWithProfile();
});
```

### 2. Use Factories

Always use factory functions for consistent test data:

```typescript
// ✅ Good
const user = createMockUser({ email: 'test@example.com' });

// ❌ Bad
const user = {
  id: 'some-id',
  email: 'test@example.com',
  // ... missing required fields
};
```

### 3. Cleanup After Tests

Always cleanup resources:

```typescript
afterAll(async () => {
  await teardownTestDatabase();
});

afterEach(async () => {
  await cleanTables('test_table');
});
```

### 4. Test Both Success and Failure Cases

```typescript
it('should succeed with valid data', async () => {
  // Test happy path
});

it('should fail with invalid data', async () => {
  // Test error handling
});
```

### 5. Verify Database State (E2E Tests)

In E2E tests, verify that changes persisted to the database:

```typescript
const response = await request(app)
  .post('/api/coins/purchase')
  .send(data);

// Verify response
expect(response.status).toBe(200);

// Verify in database
const db = getTestDb();
const balance = await db('coin_balances').where({ user_id }).first();
expect(balance.balance).toBe(100);
```

### 6. Use Descriptive Test Names

```typescript
// ✅ Good
it('should reject purchasing coins with invalid product SKU', async () => {

// ❌ Bad
it('should work', async () => {
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Types
```bash
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:e2e           # E2E tests only
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test -- subscription.service.test.ts
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="should purchase coins"
```

## Coverage Goals

Maintain these coverage thresholds:

- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

## Troubleshooting

### Test Database Connection Issues

If you see "Test database is not accessible":

1. Check PostgreSQL is running
2. Verify credentials in `.env.test`
3. Ensure test database exists: `npm run setup:test-db`

### Migration Issues

If migrations fail:

1. Reset test database: `npm run reset:test-db`
2. Check migration files for errors
3. Verify database schema

### Test Timeout Issues

Increase timeout in `jest.config.js` or individual test:

```typescript
jest.setTimeout(30000); // 30 seconds

// Or for specific test
it('slow test', async () => {
  // ...
}, 30000);
```

### Port Already in Use

If tests fail with port conflicts, ensure you're using a different port for tests or stop other instances.

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Knex Documentation](https://knexjs.org/)
- [Testing Best Practices](https://testingjavascript.com/)
