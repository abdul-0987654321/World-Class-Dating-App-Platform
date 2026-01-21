# Flamoral Dating Platform - Test Conventions

**Version:** 1.0.0
**Last Updated:** 2026-01-19
**Purpose:** Standardize testing practices across the Flamoral codebase

---

## Table of Contents

1. [File Naming Conventions](#file-naming-conventions)
2. [Test Structure](#test-structure)
3. [Assertion Style](#assertion-style)
4. [Mock and Stub Guidelines](#mock-and-stub-guidelines)
5. [Coverage Requirements](#coverage-requirements)
6. [Test Categories](#test-categories)
7. [Code Examples](#code-examples)

---

## File Naming Conventions

### General Rules

| Test Type | File Pattern | Example |
|-----------|--------------|---------|
| E2E Tests (Playwright) | `*.spec.ts` | `auth-flow.spec.ts` |
| Unit Tests (Jest) | `*.test.ts` | `auth.service.test.ts` |
| API E2E Tests | `*.e2e.spec.ts` | `user-api.e2e.spec.ts` |
| Integration Tests | `*.integration.test.ts` | `auth.integration.test.ts` |
| Load Tests (k6) | `*-load.js` | `auth-load.js` |
| Security Tests | `*-security.spec.ts` | `authentication-security.spec.ts` |
| Contract Tests | `*.contract.test.ts` | `user-service.contract.test.ts` |

### Directory Structure

```
project-root/
├── tests/
│   ├── e2e/                          # Playwright E2E tests
│   │   ├── auth-flow.spec.ts
│   │   ├── discovery-flow.spec.ts
│   │   ├── messaging-flow.spec.ts
│   │   └── api/                      # API-specific E2E tests
│   │       └── auth.e2e.spec.ts
│   ├── integration/                   # Cross-service integration tests
│   │   ├── auth-service.test.ts
│   │   └── matching-service.test.ts
│   ├── load/                          # Performance/load tests
│   │   ├── k6-config.js
│   │   └── scenarios/
│   │       ├── auth-load.js
│   │       └── matching-load.js
│   ├── security/                      # Security tests
│   │   └── authentication-security.spec.ts
│   ├── contract/                      # Pact contract tests
│   ├── chaos/                         # Chaos engineering tests
│   ├── visual/                        # Visual regression tests
│   └── performance/                   # Benchmark tests
│
├── backend/
│   └── services/
│       └── auth-service/
│           └── __tests__/             # Service-specific tests
│               ├── unit/
│               │   └── auth.service.test.ts
│               └── e2e/
│                   └── auth-api.spec.ts
│
└── apps/
    └── web-app/
        └── tests/
            └── e2e/
                ├── page-objects/      # Page object classes
                │   ├── LoginPage.ts
                │   └── DiscoverPage.ts
                └── auth.spec.ts
```

### Naming Guidelines

1. **Use kebab-case** for file names: `auth-flow.spec.ts`, not `authFlow.spec.ts`
2. **Be descriptive**: `user-registration-validation.spec.ts`, not `reg.spec.ts`
3. **Include feature area**: `payment-subscription.spec.ts`
4. **Suffix indicates test type**: `.spec.ts` (E2E), `.test.ts` (unit)

---

## Test Structure

### Describe/It Patterns

#### Standard Structure

```typescript
describe('Feature or Module Name', () => {
  // Setup that applies to all tests in this block
  beforeAll(async () => {
    // One-time setup (e.g., database seeding)
  });

  afterAll(async () => {
    // One-time cleanup
  });

  beforeEach(async () => {
    // Setup before each test
  });

  afterEach(async () => {
    // Cleanup after each test
  });

  describe('Sub-feature or Method', () => {
    it('should [expected behavior] when [condition]', async () => {
      // Arrange
      // Act
      // Assert
    });

    it('should [another behavior]', async () => {
      // ...
    });
  });
});
```

#### Playwright E2E Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete registration successfully', async ({ page }) => {
    // Test implementation
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Test implementation
  });
});
```

#### Jest Unit Test Structure

```typescript
import { AuthService } from '../auth.service';
import { mockUser, mockRepository } from '../__mocks__';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(mockRepository);
  });

  describe('login', () => {
    it('should return access token for valid credentials', async () => {
      // Arrange
      const credentials = { email: 'test@example.com', password: 'password' };

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(result.accessToken).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      // Arrange
      const credentials = { email: 'test@example.com', password: 'wrong' };

      // Act & Assert
      await expect(authService.login(credentials))
        .rejects
        .toThrow('Invalid credentials');
    });
  });
});
```

### Test Naming Conventions

#### Format: `should [expected behavior] when [condition]`

```typescript
// Good examples
it('should return 401 when token is expired', ...);
it('should display validation error when email format is invalid', ...);
it('should redirect to dashboard when login is successful', ...);
it('should increment counter when button is clicked', ...);

// Bad examples
it('test login', ...);           // Too vague
it('works', ...);                // Not descriptive
it('login test 1', ...);         // No meaningful description
```

#### Alternative Formats (Acceptable)

```typescript
// Given-When-Then format
it('given valid credentials, when user logs in, then redirect to dashboard', ...);

// Behavior format
it('prevents duplicate registrations', ...);
it('validates email format', ...);
```

### Arrange-Act-Assert (AAA) Pattern

Always structure tests with clear AAA sections:

```typescript
it('should calculate total with discount', async () => {
  // Arrange - Set up test data and prerequisites
  const cart = new ShoppingCart();
  cart.addItem({ id: 1, price: 100, quantity: 2 });
  const discount = { type: 'percentage', value: 10 };

  // Act - Execute the code under test
  const total = cart.calculateTotal(discount);

  // Assert - Verify the expected outcome
  expect(total).toBe(180); // 200 - 10% = 180
});
```

---

## Assertion Style

### Playwright Assertions

```typescript
// Element visibility
await expect(page.getByTestId('submit-button')).toBeVisible();
await expect(page.getByTestId('error-message')).not.toBeVisible();

// Text content
await expect(page.getByTestId('greeting')).toHaveText('Welcome, John');
await expect(page.getByTestId('title')).toContainText('Dashboard');

// URL assertions
await expect(page).toHaveURL(/.*dashboard/);
await expect(page).toHaveURL('https://flamoral.com/dashboard');

// Form values
await expect(page.getByTestId('email-input')).toHaveValue('test@example.com');

// Element state
await expect(page.getByTestId('submit-button')).toBeEnabled();
await expect(page.getByTestId('checkbox')).toBeChecked();

// Count assertions
await expect(page.getByRole('listitem')).toHaveCount(5);

// Attribute assertions
await expect(page.getByTestId('link')).toHaveAttribute('href', '/profile');

// CSS assertions
await expect(page.getByTestId('error')).toHaveCSS('color', 'rgb(255, 0, 0)');
```

### Jest Assertions

```typescript
// Equality
expect(result).toBe(expected);           // Strict equality (===)
expect(result).toEqual(expected);        // Deep equality for objects/arrays
expect(result).toStrictEqual(expected);  // Deep equality + type checking

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeGreaterThanOrEqual(3);
expect(value).toBeLessThan(5);
expect(value).toBeCloseTo(0.3, 5);       // Floating point

// Strings
expect(string).toMatch(/pattern/);
expect(string).toContain('substring');

// Arrays/Iterables
expect(array).toContain(item);
expect(array).toContainEqual({ name: 'item' });
expect(array).toHaveLength(3);

// Objects
expect(object).toHaveProperty('key');
expect(object).toHaveProperty('nested.key', 'value');
expect(object).toMatchObject({ partial: 'match' });

// Exceptions
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(Error);
expect(() => fn()).toThrow('error message');
await expect(asyncFn()).rejects.toThrow();

// Async
await expect(promise).resolves.toBe(expected);
await expect(promise).rejects.toThrow();

// Snapshots
expect(component).toMatchSnapshot();
expect(data).toMatchInlineSnapshot();
```

### Assertion Best Practices

#### 1. One Logical Assertion Per Test

```typescript
// Good - Single focus
it('should return user email', async () => {
  const user = await userService.findById(1);
  expect(user.email).toBe('test@example.com');
});

it('should return user name', async () => {
  const user = await userService.findById(1);
  expect(user.name).toBe('John Doe');
});

// Acceptable - Related assertions
it('should return complete user data', async () => {
  const user = await userService.findById(1);
  expect(user).toMatchObject({
    email: 'test@example.com',
    name: 'John Doe',
    status: 'active'
  });
});
```

#### 2. Avoid Assertion in Loops

```typescript
// Bad
users.forEach(user => {
  expect(user.isActive).toBe(true);
});

// Good
expect(users.every(u => u.isActive)).toBe(true);
// Or
expect(users).toSatisfyAll(user => user.isActive === true);
```

#### 3. Custom Matchers for Domain Logic

```typescript
// Define custom matcher
expect.extend({
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    return {
      pass,
      message: () => `expected ${received} to be a valid email`
    };
  }
});

// Usage
expect(user.email).toBeValidEmail();
```

---

## Mock and Stub Guidelines

### When to Mock

| Mock | Don't Mock |
|------|------------|
| External APIs | Core business logic |
| Database (unit tests) | Simple utility functions |
| File system | Pure functions |
| Network requests | Value objects |
| Time/dates | Data transformations |
| Random values | |

### Jest Mocking Patterns

#### Module Mocking

```typescript
// Mock entire module
jest.mock('../services/email.service');

// Mock with implementation
jest.mock('../services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ sent: true })
}));

// Partial mock
jest.mock('../services/user.service', () => ({
  ...jest.requireActual('../services/user.service'),
  findById: jest.fn()
}));
```

#### Function Mocking

```typescript
// Create mock function
const mockCallback = jest.fn();
const mockAsync = jest.fn().mockResolvedValue({ data: 'test' });

// Mock implementation
mockCallback.mockImplementation((x) => x * 2);

// Mock return value
mockCallback.mockReturnValue(42);
mockCallback.mockReturnValueOnce(1).mockReturnValueOnce(2);

// Verify calls
expect(mockCallback).toHaveBeenCalled();
expect(mockCallback).toHaveBeenCalledTimes(2);
expect(mockCallback).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockCallback).toHaveBeenLastCalledWith('lastArg');
```

#### Class Mocking

```typescript
// Mock class
jest.mock('../services/PaymentService');
const MockedPaymentService = PaymentService as jest.MockedClass<typeof PaymentService>;

// Setup mock methods
MockedPaymentService.prototype.processPayment = jest.fn().mockResolvedValue({
  success: true,
  transactionId: 'tx_123'
});
```

### Playwright Mocking

#### API Mocking

```typescript
// Mock API response
await page.route('**/api/users/*', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 1, name: 'Test User' })
  });
});

// Mock with delay
await page.route('**/api/slow', route => {
  setTimeout(() => route.fulfill({ body: 'delayed' }), 3000);
});

// Mock error response
await page.route('**/api/error', route => {
  route.fulfill({ status: 500, body: 'Internal Server Error' });
});

// Abort request
await page.route('**/analytics/**', route => route.abort());
```

#### Network Interception

```typescript
// Listen to requests
page.on('request', request => {
  console.log('>>', request.method(), request.url());
});

page.on('response', response => {
  console.log('<<', response.status(), response.url());
});
```

### Mock Best Practices

#### 1. Reset Mocks Between Tests

```typescript
beforeEach(() => {
  jest.clearAllMocks();  // Clear call history
  // or
  jest.resetAllMocks();  // Clear + reset implementations
  // or
  jest.restoreAllMocks(); // Restore original implementations
});
```

#### 2. Use Realistic Mock Data

```typescript
// Bad - Minimal/unrealistic data
const mockUser = { id: 1 };

// Good - Realistic data
const mockUser = {
  id: 'usr_abc123',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  subscriptionTier: 'premium',
  createdAt: new Date('2024-01-15'),
  isVerified: true
};
```

#### 3. Factory Functions for Test Data

```typescript
// factories/user.factory.ts
export const createTestUser = (overrides = {}) => ({
  id: `usr_${Date.now()}`,
  email: `test${Date.now()}@example.com`,
  firstName: 'Test',
  lastName: 'User',
  subscriptionTier: 'free',
  isVerified: false,
  createdAt: new Date(),
  ...overrides
});

// Usage
const premiumUser = createTestUser({ subscriptionTier: 'premium' });
const verifiedUser = createTestUser({ isVerified: true });
```

---

## Coverage Requirements

### Minimum Coverage Thresholds

| Metric | Minimum | Target |
|--------|---------|--------|
| Statements | 70% | 80% |
| Branches | 65% | 75% |
| Functions | 70% | 80% |
| Lines | 70% | 80% |

### Jest Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 65,
      functions: 70,
      lines: 70
    },
    // Stricter requirements for critical paths
    './src/services/auth/**/*.ts': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    },
    './src/services/payment/**/*.ts': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    }
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts',
    '!src/main.ts'
  ]
};
```

### Coverage Exclusions

Legitimate exclusions:
- Type definition files (`*.d.ts`)
- Configuration files
- Index/barrel files
- Generated code
- Test utilities

Use coverage comments sparingly:

```typescript
// Only for code that genuinely cannot be tested
/* istanbul ignore next */
if (process.env.NODE_ENV === 'development') {
  enableDevTools();
}
```

### Running Coverage Reports

```bash
# Generate coverage report
yarn test --coverage

# View HTML report
open coverage/lcov-report/index.html

# CI coverage check
yarn test --coverage --coverageReporters=lcov --coverageReporters=text
```

---

## Test Categories

### Category Tags

Use tags to organize and filter tests:

```typescript
// Playwright tags
test('critical user flow @smoke @critical', async ({ page }) => {
  // ...
});

test('edge case handling @regression', async ({ page }) => {
  // ...
});

// Run specific tags
// npx playwright test --grep @smoke
// npx playwright test --grep-invert @slow
```

### Test Priority Levels

| Priority | Description | Run Frequency |
|----------|-------------|---------------|
| @smoke | Critical path tests | Every commit |
| @critical | Core functionality | Every PR |
| @regression | Full test suite | Nightly/weekly |
| @slow | Long-running tests | Nightly |
| @flaky | Known unstable tests | Manual only |

### Skipping and Focusing Tests

```typescript
// Skip test
test.skip('broken test', async () => { });

// Skip conditionally
test.skip(process.platform === 'win32', 'Windows-specific issue');

// Focus test (for debugging - remove before commit)
test.only('debug this test', async () => { });

// Fixme - known broken, should be fixed
test.fixme('needs implementation', async () => { });
```

---

## Code Examples

### Complete E2E Test Example

```typescript
// tests/e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './page-objects/LoginPage';
import { createTestUser } from './factories/user.factory';

test.describe('Authentication Flow @smoke', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Arrange
    const user = createTestUser();
    await seedTestUser(user); // API call to create user

    // Act
    await loginPage.login(user.email, user.password);

    // Assert
    await loginPage.expectSuccessfulLogin();
    await expect(page.getByTestId('user-menu')).toBeVisible();
  });

  test('should show error for invalid password', async () => {
    // Arrange
    const user = createTestUser();
    await seedTestUser(user);

    // Act
    await loginPage.login(user.email, 'wrongpassword');

    // Assert
    await loginPage.expectErrorMessage('Invalid credentials');
    await expect(loginPage.page).toHaveURL(/.*login/);
  });

  test('should redirect to requested page after login', async ({ page }) => {
    // Arrange
    const user = createTestUser();
    await seedTestUser(user);

    // Try to access protected route
    await page.goto('/profile');
    await expect(page).toHaveURL(/.*login.*redirect/);

    // Act
    await loginPage.login(user.email, user.password);

    // Assert - should redirect to originally requested page
    await expect(page).toHaveURL(/.*profile/);
  });
});
```

### Complete Unit Test Example

```typescript
// backend/services/auth-service/__tests__/auth.service.test.ts
import { AuthService } from '../auth.service';
import { UserRepository } from '../repositories/user.repository';
import { JwtService } from '../jwt.service';
import { createTestUser } from '../__mocks__/factories';
import * as bcrypt from 'bcrypt';

jest.mock('../repositories/user.repository');
jest.mock('../jwt.service');
jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockJwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    mockJwtService = new JwtService() as jest.Mocked<JwtService>;
    authService = new AuthService(mockUserRepository, mockJwtService);

    jest.clearAllMocks();
  });

  describe('login', () => {
    const validCredentials = {
      email: 'test@example.com',
      password: 'ValidPassword123!'
    };

    it('should return tokens for valid credentials', async () => {
      // Arrange
      const user = createTestUser({ email: validCredentials.email });
      mockUserRepository.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.generateAccessToken.mockReturnValue('access_token');
      mockJwtService.generateRefreshToken.mockReturnValue('refresh_token');

      // Act
      const result = await authService.login(validCredentials);

      // Assert
      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        user: expect.objectContaining({ email: validCredentials.email })
      });
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validCredentials.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(validCredentials.password, user.passwordHash);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(validCredentials))
        .rejects
        .toThrow('Invalid credentials');

      expect(mockJwtService.generateAccessToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      // Arrange
      const user = createTestUser({ email: validCredentials.email });
      mockUserRepository.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(validCredentials))
        .rejects
        .toThrow('Invalid credentials');
    });

    it('should increment failed login attempts on failure', async () => {
      // Arrange
      const user = createTestUser({ email: validCredentials.email, failedLoginAttempts: 0 });
      mockUserRepository.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      try {
        await authService.login(validCredentials);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(mockUserRepository.incrementFailedAttempts).toHaveBeenCalledWith(user.id);
    });
  });
});
```

### Complete Integration Test Example

```typescript
// tests/integration/auth-service.test.ts
import request from 'supertest';
import { app } from '../../backend/services/auth-service/app';
import { db } from '../../backend/shared/database';
import { createTestUser } from './factories/user.factory';

describe('Auth Service Integration', () => {
  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    await db('users').truncate();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('POST /api/auth/register', () => {
    it('should create new user and return tokens', async () => {
      // Arrange
      const newUser = {
        email: 'new@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-15'
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect('Content-Type', /json/)
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName
        }
      });

      // Verify user in database
      const dbUser = await db('users').where({ email: newUser.email }).first();
      expect(dbUser).toBeDefined();
      expect(dbUser.password_hash).not.toBe(newUser.password); // Should be hashed
    });

    it('should return 400 for duplicate email', async () => {
      // Arrange
      const existingUser = createTestUser();
      await db('users').insert(existingUser);

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: existingUser.email,
          password: 'NewPassword123!',
          firstName: 'Jane',
          lastName: 'Doe'
        })
        .expect(400);

      // Assert
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user and return tokens', async () => {
      // Arrange
      const password = 'TestPassword123!';
      const user = await createAndSeedUser({ password });

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password })
        .expect(200);

      // Assert
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });
  });
});
```

---

## Summary Checklist

### Before Writing Tests

- [ ] Identified test type needed (unit, integration, E2E)
- [ ] Created test file with correct naming convention
- [ ] Set up necessary mocks/fixtures

### While Writing Tests

- [ ] Used AAA pattern (Arrange-Act-Assert)
- [ ] Named tests descriptively (`should...when...`)
- [ ] Used appropriate assertion methods
- [ ] Avoided hardcoded waits
- [ ] Used stable selectors (test IDs)

### Before Committing

- [ ] All tests pass locally
- [ ] Coverage thresholds met
- [ ] No `.only` or `.skip` left in code
- [ ] Mocks reset between tests
- [ ] No flaky tests introduced

---

**Document maintained by:** QA Engineering Team
**Last reviewed:** 2026-01-19
