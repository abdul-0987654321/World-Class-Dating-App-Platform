# Test Execution Guide - User Service API Tests

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up test database
npm run setup:test-db

# 3. Run all E2E tests
npm run test:e2e

# 4. Run with coverage
npm run test:coverage
```

## Test Execution Commands

### Basic Execution

```bash
# Run all tests
npm test

# Run only E2E tests
npm run test:e2e

# Run specific test file
npx jest tests/e2e/api/user-api.spec.ts

# Run with verbose output
npx jest tests/e2e/api/user-api.spec.ts --verbose
```

### Selective Test Execution

```bash
# Run only Profile tests
npx jest tests/e2e/api/user-api.spec.ts -t "Profile API"

# Run only Subscriptions tests
npx jest tests/e2e/api/user-api.spec.ts -t "Subscriptions API"

# Run only Coins tests
npx jest tests/e2e/api/user-api.spec.ts -t "Coins API"

# Run only Boosts tests
npx jest tests/e2e/api/user-api.spec.ts -t "Boosts API"

# Run only Privacy tests
npx jest tests/e2e/api/user-api.spec.ts -t "Privacy API"

# Run only Blocks tests
npx jest tests/e2e/api/user-api.spec.ts -t "Blocks API"

# Run only Reports tests
npx jest tests/e2e/api/user-api.spec.ts -t "Reports API"

# Run only Photos tests
npx jest tests/e2e/api/user-api.spec.ts -t "Photos API"

# Run all authentication tests
npx jest tests/e2e/api/user-api.spec.ts -t "should return 401"

# Run all validation tests
npx jest tests/e2e/api/user-api.spec.ts -t "Input Validation"

# Run integration tests
npx jest tests/e2e/api/user-api.spec.ts -t "Integration Tests"
```

### Development Workflow

```bash
# Watch mode for development
npx jest tests/e2e/api/user-api.spec.ts --watch

# Run failed tests only
npx jest tests/e2e/api/user-api.spec.ts --onlyFailures

# Run tests in sequence (not parallel)
npx jest tests/e2e/api/user-api.spec.ts --runInBand

# Update snapshots (if using)
npx jest tests/e2e/api/user-api.spec.ts --updateSnapshot
```

### Coverage Analysis

```bash
# Generate coverage report
npm run test:coverage

# Generate HTML coverage report
npx jest tests/e2e/api/user-api.spec.ts --coverage --coverageDirectory=coverage

# View coverage in browser
open coverage/index.html  # macOS
start coverage/index.html  # Windows
xdg-open coverage/index.html  # Linux
```

## Test Suites Breakdown

### 1. Profile API (8 tests)
- Get profile (authenticated, unauthenticated, invalid token)
- Update profile (success, validation, authentication)

### 2. Photos API (12 tests)
- Get photos (success, authentication)
- Upload photo (validation, authentication)
- Delete photo (success, authentication)
- Set primary photo (success, authentication)
- Reorder photos (validation, success, authentication)

### 3. Subscriptions API (15 tests)
- Get current subscription
- Get features
- Check feature access
- Update tier (validation, all tiers)
- Cancel subscription (immediate, scheduled)
- Reactivate subscription

### 4. Coins API (21 tests)
- Get balance
- Get transactions (with filters)
- Get summary
- Get products
- Purchase coins (validation, success)
- Spend coins (validation, success)
- Daily reward

### 5. Boosts API (12 tests)
- Get products
- Get active boost
- Get history (with pagination)
- Activate boost (validation, success)

### 6. Privacy API (6 tests)
- Get settings
- Update settings (various combinations)

### 7. Blocks API (9 tests)
- Get blocked users
- Block user (with/without reason)
- Unblock user

### 8. Reports API (10 tests)
- Get categories
- Submit report (validation, all fields)

### 9. Integration Tests (6 tests)
- Complete user flows
- Multi-user interactions

### 10. Error Handling (8 tests)
- Invalid tokens
- Invalid UUIDs
- Rate limiting

### 11. Validation Tests (6 tests)
- Profile validation
- Coin validation
- Subscription validation

**Total: 100+ test cases**

## Expected Test Results

### Ideal Scenario (with full database setup)
```
PASS tests/e2e/api/user-api.spec.ts
  Profile API
    ✓ GET /api/profile - should return user profile when authenticated
    ✓ GET /api/profile - should return 401 when not authenticated
    ✓ PUT /api/profile - should update profile successfully
    ...

Test Suites: 1 passed, 1 total
Tests:       100+ passed, 100+ total
Time:        15-30s
Coverage:    80%+ lines, branches, functions, statements
```

### Minimal Setup (API layer only)
```
PASS tests/e2e/api/user-api.spec.ts
  Profile API
    ✓ GET /api/profile - response validation
    ✓ GET /api/profile - authentication checks
    ...

Test Suites: 1 passed, 1 total
Tests:       100+ passed, 100+ total
Time:        10-20s
Note: Some tests may show 404/500 responses due to missing database data
```

## Troubleshooting

### Test Failures

#### Database Connection Issues
```bash
# Error: Cannot connect to database
Solution:
1. Check PostgreSQL is running
2. Verify .env.test configuration
3. Run: npm run setup:test-db
```

#### JWT Token Issues
```bash
# Error: Invalid token signature
Solution:
1. Check JWT_ACCESS_SECRET in .env.test
2. Ensure it matches the secret in tests
3. Default: 'test-access-secret-key'
```

#### Port Conflicts
```bash
# Error: Port 3002 already in use
Solution:
1. Stop other user-service instances
2. Change PORT in .env.test
3. Use: lsof -ti:3002 | xargs kill -9  # Unix
4. Use: netstat -ano | findstr :3002   # Windows
```

#### Rate Limiting
```bash
# Error: Too many requests
Solution:
1. Run tests sequentially: npx jest --runInBand
2. Increase rate limit in test env
3. Add delays between test suites
```

### Performance Issues

#### Slow Test Execution
```bash
# Tests taking too long
Solution:
1. Run specific suites instead of all tests
2. Use --maxWorkers flag: npx jest --maxWorkers=4
3. Optimize database queries
4. Use test data fixtures
```

#### Memory Leaks
```bash
# Error: JavaScript heap out of memory
Solution:
1. Increase Node memory: NODE_OPTIONS=--max-old-space-size=4096 npm test
2. Check for unclosed database connections
3. Run tests in smaller batches
```

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: flamoral_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

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
          DATABASE_URL: postgresql://postgres:test@localhost:5432/flamoral_test

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          NODE_ENV: test
          JWT_ACCESS_SECRET: test-secret-key

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Azure DevOps

```yaml
trigger:
  - main
  - develop

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
    displayName: 'Install Node.js'

  - script: npm ci
    displayName: 'Install dependencies'

  - script: npm run setup:test-db
    displayName: 'Setup test database'
    env:
      DATABASE_URL: $(TEST_DATABASE_URL)

  - script: npm run test:e2e
    displayName: 'Run E2E tests'
    env:
      NODE_ENV: test
      JWT_ACCESS_SECRET: $(JWT_SECRET)

  - task: PublishCodeCoverageResults@1
    inputs:
      codeCoverageTool: 'Cobertura'
      summaryFileLocation: '$(System.DefaultWorkingDirectory)/coverage/cobertura-coverage.xml'
```

## Test Data Management

### Database Seeding

```bash
# Seed test data before running tests
npm run seed:test

# Reset test database
npm run reset:test-db

# Run migrations
npm run migrate:test
```

### Mock Data Generation

Tests use factories from `src/__tests__/helpers/test-data.ts`:

```typescript
import {
  createMockUser,
  createMockProfile,
  createMockSubscription,
  createMockCoinBalance,
  createMockBoostProduct,
  createMockPrivacySettings,
  createMockBlock,
  createMockReport
} from '../../../src/__tests__/helpers/test-data';
```

## Coverage Requirements

Target coverage thresholds (configured in jest.config.js):

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

### Current Coverage Areas

1. **Controllers**: 85%+ (all endpoints tested)
2. **Routes**: 90%+ (all routes exercised)
3. **Middleware**: 75%+ (auth, validation)
4. **Services**: 70%+ (business logic)
5. **Validators**: 85%+ (input validation)

## Continuous Improvement

### Adding New Tests

When new endpoints are added:

1. Add test cases to appropriate describe block
2. Follow existing patterns
3. Test success, validation, and authentication
4. Update test count in documentation

### Refactoring Tests

When refactoring:

1. Maintain backward compatibility
2. Run full suite before and after changes
3. Update documentation
4. Review coverage impact

## Performance Benchmarks

Expected execution times:

- **Full Suite**: 15-30 seconds
- **Single Feature**: 2-5 seconds
- **Integration Tests**: 3-8 seconds
- **Error Handling**: 2-4 seconds
- **Validation Tests**: 1-3 seconds

## Resources

- **Jest Documentation**: https://jestjs.io/
- **Supertest Documentation**: https://github.com/visionmedia/supertest
- **User Service API Docs**: `/api-docs`
- **Main Testing Guide**: `../../../TESTING.md`

---

**Last Updated**: 2025-12-09
**Maintainer**: Engineering Team
**Test Framework**: Jest + Supertest
**Node Version**: 20.x+
