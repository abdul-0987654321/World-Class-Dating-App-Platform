# Testing Guide - Flamoral Dating Platform

Complete guide for running, writing, and maintaining tests in the Flamoral dating platform.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Types](#test-types)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Coverage](#test-coverage)
6. [CI/CD Integration](#cicd-integration)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure you have the required environment
node --version  # Should be >= 20.0.0
npm --version
```

### Run All Tests

```bash
# From project root
npm test

# With coverage
npm run test:coverage
```

---

## Test Types

### 1. Unit Tests

Test individual functions and classes in isolation.

**Location:** `*/tests/unit/`

**Example:**
```typescript
describe('AuthService', () => {
  it('should hash password before storing', async () => {
    const password = 'TestPassword123!';
    const hashed = await hashPassword(password);
    expect(hashed).not.toBe(password);
  });
});
```

**Run:**
```bash
npm run test:unit
```

### 2. Integration Tests

Test multiple components working together.

**Location:** `*/tests/integration/`

**Example:**
```typescript
describe('Auth API', () => {
  it('should register user and return tokens', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', ... });

    expect(response.status).toBe(201);
    expect(response.body.data.accessToken).toBeDefined();
  });
});
```

**Run:**
```bash
npm run test:integration
```

### 3. E2E Tests

Test complete user journeys.

**Location:** `tests/e2e/`

**Example:**
```typescript
test('user can register and make first swipe', async ({ page }) => {
  await page.goto('/signup');
  await page.fill('input[name="email"]', 'test@example.com');
  // ... complete registration
  await page.click('button.like-button');
  await expect(page.locator('.next-profile')).toBeVisible();
});
```

**Run:**
```bash
npm run test:e2e
npm run test:e2e:headed  # With browser UI
npm run test:e2e:debug   # Debug mode
```

---

## Running Tests

### By Service

```bash
# Auth Service
cd backend/services/auth-service
npm test

# Matching Service
cd backend/services/matching-service
npm test

# Messaging Service
cd backend/services/messaging-service
npm test

# Payment Service
cd backend/services/payment-service
npm test

# User Service
cd backend/services/user-service
npm test
```

### By Test Type

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Specific test file
npm test -- auth.service.test.ts

# Specific test suite
npm test -- --testNamePattern="login"
```

### With Coverage

```bash
# All tests with coverage
npm run test:coverage

# Specific service with coverage
cd backend/services/auth-service
npm test -- --coverage

# Generate HTML coverage report
npm run test:coverage
open coverage/index.html  # macOS
start coverage/index.html # Windows
```

### Watch Mode

```bash
# Watch mode for development
npm test -- --watch

# Watch specific file
npm test -- auth.service.test.ts --watch
```

---

## Writing Tests

### Test Structure

Use the AAA (Arrange-Act-Assert) pattern:

```typescript
describe('Feature Name', () => {
  describe('Method Name', () => {
    it('should do something when condition', async () => {
      // Arrange - Set up test data and mocks
      const mockUser = createMockUser({ email: 'test@example.com' });
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      // Act - Execute the function being tested
      const result = await authService.login({ email: 'test@example.com', password: 'Pass123!' });

      // Assert - Verify the result
      expect(result).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(userRepository.findById).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
```

### Using Factories

```typescript
import { createMockUser, createMockToken } from '../mocks/factories';

// Create single user
const user = createMockUser({ email: 'custom@example.com' });

// Create multiple users
const users = createMockUsers(5);

// Create with overrides
const premiumUser = createMockUser({ isPremium: true });
```

### Mocking Dependencies

```typescript
// Mock at module level
jest.mock('../../src/repositories/user.repository');

// Mock implementation
(userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

// Mock rejection
(userRepository.create as jest.Mock).mockRejectedValue(new Error('Database error'));

// Mock multiple calls
(stripeClient.charges.create as jest.Mock)
  .mockResolvedValueOnce({ id: 'charge-1' })
  .mockResolvedValueOnce({ id: 'charge-2' });
```

### Testing Async Code

```typescript
// Using async/await
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

// Testing promises
it('should handle promises', () => {
  return asyncFunction().then(result => {
    expect(result).toBeDefined();
  });
});

// Testing rejections
it('should handle errors', async () => {
  await expect(failingFunction()).rejects.toThrow('Error message');
});
```

### Testing Error Cases

```typescript
it('should throw error for invalid input', async () => {
  await expect(
    authService.register({ email: 'invalid-email' })
  ).rejects.toThrow('Invalid email format');
});

it('should handle database errors', async () => {
  (userRepository.create as jest.Mock).mockRejectedValue(
    new Error('Database connection failed')
  );

  await expect(authService.register(validData)).rejects.toThrow();
});
```

---

## Test Coverage

### Coverage Thresholds

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  // Critical services require higher coverage
  './src/domain/services/': {
    branches: 85,
    functions: 90,
    lines: 90,
    statements: 90,
  },
}
```

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# View summary in terminal
npm test -- --coverage --coverageReporters=text
```

### Coverage by Service

| Service | Target | Current Status |
|---------|--------|----------------|
| Auth | 85%+ | ✅ 88% |
| Matching | 85%+ | ⏳ 90% (unit only) |
| Messaging | 80%+ | ⏳ 85% (unit only) |
| Payment | 85%+ | ⏳ 85% (unit only) |
| User | 80%+ | ⏳ Pending |

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          REDIS_URL: ${{ secrets.TEST_REDIS_URL }}

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests on staged files
npm test -- --findRelatedTests --passWithNoTests
```

### PR Requirements

- All tests must pass
- Coverage must not decrease
- Minimum 80% coverage for new code
- No console errors or warnings

---

## Troubleshooting

### Common Issues

#### 1. Tests Timeout

```typescript
// Increase timeout for specific test
it('should handle long operation', async () => {
  // ...
}, 10000); // 10 seconds

// Or globally in jest.config.js
testTimeout: 10000
```

#### 2. Mock Not Working

```typescript
// Ensure mock is before import
jest.mock('../../src/repositories/user.repository');
import userRepository from '../../src/repositories/user.repository';

// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

#### 3. Database Connection Issues

```bash
# Use test database
export NODE_ENV=test
export DATABASE_URL=postgresql://localhost:5432/test_db

# Or use in-memory database for integration tests
```

#### 4. Tests Pass Locally But Fail in CI

```bash
# Check for:
# - Environment variables
# - Database/Redis connections
# - File paths (use absolute paths)
# - Timezone differences
# - Race conditions
```

#### 5. Flaky Tests

```typescript
// Use waitFor for async UI updates
await waitFor(() => {
  expect(element).toBeVisible();
});

// Add proper cleanup
afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});
```

### Debug Mode

```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Or use VS Code debugger
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

---

## Best Practices

### 1. Test Naming

```typescript
// ✅ Good - Descriptive and clear
it('should return 401 when user provides invalid credentials', async () => {});

// ❌ Bad - Vague
it('login test', async () => {});
```

### 2. Test Independence

```typescript
// ✅ Good - Each test is independent
beforeEach(() => {
  // Setup fresh state
  resetFactoryCounters();
  jest.clearAllMocks();
});

// ❌ Bad - Tests depend on execution order
let userId;
it('creates user', () => { userId = ...; });
it('gets user', () => { getUser(userId); }); // Depends on previous test
```

### 3. Don't Test Implementation Details

```typescript
// ✅ Good - Test behavior
it('should create user and send welcome email', async () => {
  await authService.register(userData);
  expect(emailService.sendWelcomeEmail).toHaveBeenCalled();
});

// ❌ Bad - Test implementation
it('should call hashPassword with bcrypt', async () => {
  // Testing how it works, not what it does
});
```

### 4. Use Meaningful Assertions

```typescript
// ✅ Good - Specific assertions
expect(response.body.data.user).toMatchObject({
  email: 'test@example.com',
  isEmailVerified: false,
});

// ❌ Bad - Generic assertion
expect(response.body).toBeDefined();
```

### 5. Test Edge Cases

```typescript
describe('age validation', () => {
  it('should accept users exactly 18 years old', async () => {});
  it('should reject users 17 years and 364 days old', async () => {});
  it('should handle leap year birthdates', async () => {});
  it('should handle invalid date formats', async () => {});
});
```

---

## Resources

### Documentation
- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Supertest](https://github.com/visionmedia/supertest)

### Internal Resources
- [TEST_COVERAGE_REPORT.md](./TEST_COVERAGE_REPORT.md) - Detailed coverage report
- [TESTING_IMPLEMENTATION_SUMMARY.md](./TESTING_IMPLEMENTATION_SUMMARY.md) - Implementation details

### Getting Help
- Slack: #testing
- Wiki: [Testing Best Practices](https://wiki.flamoral.com/testing)
- Team: testing-team@flamoral.com

---

## Continuous Improvement

### Weekly
- Review failed tests
- Update test data
- Refactor brittle tests

### Monthly
- Analyze coverage trends
- Identify untested code paths
- Review test performance
- Update documentation

### Quarterly
- Major refactoring
- Tool evaluation
- Process improvements
- Team training sessions

---

**Last Updated:** December 2, 2025
**Maintained By:** Engineering Team
**Questions?** Contact testing-team@flamoral.com
