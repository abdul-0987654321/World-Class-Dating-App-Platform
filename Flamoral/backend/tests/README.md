# Flamoral Testing Guide

This document provides an overview of the testing infrastructure and configuration for the Flamoral backend services.

## Table of Contents

- [Test Structure](#test-structure)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Configuration Files](#configuration-files)
- [Writing Tests](#writing-tests)
- [Mocking](#mocking)
- [Coverage](#coverage)
- [CI/CD Integration](#cicd-integration)

## Test Structure

The Flamoral backend uses a multi-layered testing approach:

```
backend/
├── services/                    # Microservices
│   ├── auth-service/
│   │   ├── tests/              # Service-level tests
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── setup.ts
│   │   └── jest.config.js
│   └── user-service/
│       ├── src/__tests__/      # Component tests
│       └── jest.config.js
└── tests/                       # Cross-service tests
    ├── e2e/                    # End-to-end tests
    ├── integration/            # Integration tests
    ├── security/               # Security tests
    ├── contract/               # Contract tests
    └── jest.config.*.js        # Test configurations
```

## Test Types

### 1. Unit Tests
- **Location**: `services/*/tests/unit/` or `services/*/src/__tests__/unit/`
- **Purpose**: Test individual functions, classes, and components in isolation
- **Run**: `yarn workspace <service-name> test`
- **Configuration**: Service-level `jest.config.js`

### 2. Integration Tests
- **Location**: `tests/integration/` or `services/*/tests/integration/`
- **Purpose**: Test interactions between multiple components/services
- **Run**: `yarn test:integration`
- **Configuration**: `tests/jest.config.integration.js` or `tests/jest.config.integration.enhanced.js`

### 3. E2E Tests
- **Location**: `tests/e2e/`
- **Purpose**: Test complete user flows across all services
- **Run**: `yarn test:backend:e2e`
- **Configuration**: `tests/jest.config.e2e.js`

### 4. Security Tests
- **Location**: `tests/security/`
- **Purpose**: Test security vulnerabilities, authentication, authorization
- **Run**: `yarn test:security`
- **Configuration**: `tests/jest.config.security.js`

### 5. Contract Tests
- **Location**: `tests/contract/`
- **Purpose**: Verify API contracts between services
- **Run**: `jest --config tests/jest.config.contract.js`
- **Configuration**: `tests/jest.config.contract.js`

## Running Tests

### All Tests
```bash
yarn test:all
```

### Backend Unit Tests
```bash
yarn test:backend
```

### Backend Unit Tests with Coverage
```bash
yarn test:backend:coverage
```

### Integration Tests
```bash
yarn test:integration
```

### Integration Tests with Docker
```bash
yarn test:integration:docker
```

### E2E Tests
```bash
yarn test:backend:e2e
```

### E2E Tests with Docker
```bash
yarn test:backend:e2e:docker
```

### Security Tests
```bash
yarn test:security
```

### Watch Mode
```bash
yarn test:integration:watch
```

### Service-Specific Tests
```bash
cd backend/services/auth-service
yarn test
```

## Configuration Files

### Root Configuration
- **`jest.config.js`**: Root-level configuration for the monorepo

### Backend Configurations
- **`backend/jest.config.js`**: Main backend configuration
- **`backend/tsconfig.base.json`**: Base TypeScript configuration for all services
- **`backend/tsconfig.json`**: Backend TypeScript configuration

### Test Type Configurations
- **`tests/jest.config.integration.js`**: Standard integration tests
- **`tests/jest.config.integration.enhanced.js`**: Enhanced integration tests with Testcontainers
- **`tests/jest.config.e2e.js`**: End-to-end tests
- **`tests/jest.config.security.js`**: Security tests
- **`tests/jest.config.contract.js`**: Contract tests

### Service Configurations
Each service has its own `jest.config.js` with service-specific settings.

## Writing Tests

### Test File Naming
- Unit tests: `*.test.ts` or `*.spec.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`

### Example Unit Test
```typescript
import { AuthService } from '../services/auth.service';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  it('should hash password correctly', async () => {
    const password = 'testPassword123';
    const hashed = await authService.hashPassword(password);

    expect(hashed).toBeDefined();
    expect(hashed).not.toBe(password);
  });
});
```

### Example Integration Test
```typescript
import request from 'supertest';
import { app } from '../app';

describe('Auth API Integration', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test123!@#',
        firstName: 'Test',
        lastName: 'User'
      });

    expect(response.status).toBe(201);
    expect(response.body.data.user).toBeDefined();
  });
});
```

## Mocking

### Mock @flamoral/shared
The shared module is automatically mocked in setup files:

```typescript
jest.mock('@flamoral/shared', () => ({
  createLogger: (serviceName: string) => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  }),
}));
```

### Mock Database
```typescript
jest.mock('../infrastructure/database/connection', () => ({
  __esModule: true,
  default: jest.fn(),
}));
```

### Mock External Services
```typescript
jest.mock('../services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));
```

## Coverage

### Coverage Thresholds
Most services aim for:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

### Viewing Coverage
```bash
yarn test:backend:coverage
# Open backend/coverage/index.html in browser
```

### Coverage Exclusions
The following are excluded from coverage:
- `.d.ts` files (type declarations)
- `index.ts` files (barrel exports)
- `.interface.ts` and `.type.ts` files
- `migrations/` directories
- `types/` directories
- Test files themselves

## CI/CD Integration

### GitHub Actions
Tests run automatically on:
- Pull requests
- Pushes to main/develop branches

### Test Commands in CI
```bash
# Run all tests with coverage
yarn test:ci:coverage

# Run integration tests with Docker
yarn test:integration:docker

# Run E2E tests with Docker
yarn test:backend:e2e:docker
```

## Environment Variables

### Test Environment
All tests use `.env.test` files for configuration. Never commit real credentials.

### Required Variables
```bash
NODE_ENV=test
JWT_ACCESS_SECRET=test-jwt-access-secret-key-for-testing-min-32-chars
JWT_REFRESH_SECRET=test-jwt-refresh-secret-key-for-testing-min-32-chars
DATABASE_URL=postgresql://test:test@localhost:5432/flamoral_test
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Troubleshooting

### Tests Hanging
- Check for open database connections
- Ensure `forceExit: true` in Jest config
- Use `--detectOpenHandles` flag

### Import Errors
- Verify `moduleNameMapper` in Jest config
- Check `tsconfig.json` paths alignment
- Ensure all dependencies are installed

### TypeScript Errors
- Run `yarn typecheck` to verify TypeScript configuration
- Check `tsconfig.json` extends correct base config
- Verify `skipLibCheck: true` in test config

### Database Connection Issues
- Ensure test database is running
- Check DATABASE_URL format
- Verify database migrations are run

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up after tests (afterEach/afterAll)
3. **Mocking**: Mock external dependencies
4. **Naming**: Use descriptive test names
5. **Assertions**: One logical assertion per test
6. **Coverage**: Aim for meaningful coverage, not just high percentages
7. **Speed**: Keep unit tests fast (<1s each)
8. **Documentation**: Comment complex test scenarios

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
- [Testing Best Practices](https://testingjavascript.com/)
