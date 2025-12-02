# Testing Documentation

This document provides comprehensive information about the testing infrastructure for the Dating App platform.

## Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Overview

Our testing strategy follows a comprehensive approach with multiple layers:

1. **Unit Tests** - Test individual functions and components
2. **Integration Tests** - Test service interactions and APIs (80% coverage target)
3. **E2E Tests** - Test complete user workflows using Playwright
4. **Load Tests** - Stress test with k6 (100K concurrent users)
5. **Security Tests** - OWASP Top 10 vulnerability checks

### Test Stack

- **Unit/Integration**: Jest + Supertest
- **E2E**: Playwright
- **Load Testing**: k6
- **Coverage**: Jest Coverage Reports
- **CI/CD**: GitHub Actions / Azure Pipelines

## Test Types

### 1. Integration Tests

Located in: `backend/services/{service-name}/__tests__/integration/`

Integration tests verify that different parts of the system work together correctly.

**Coverage Target**: 80%

#### Available Integration Tests

- **Auth Service** (`auth.integration.test.ts`)
  - User registration flow
  - Login/logout
  - Token refresh
  - Password reset
  - Email verification
  - Security validations

- **User Service** (`user.integration.test.ts`)
  - Profile management
  - Photo upload/deletion
  - Preferences
  - Blocking/reporting
  - Account deletion

- **Matching Service** (`matching.integration.test.ts`)
  - Recommendations algorithm
  - Swiping mechanics
  - Match creation
  - Search functionality
  - Compatibility scoring

- **Messaging Service** (`messaging.integration.test.ts`)
  - Real-time messaging
  - WebSocket connections
  - Message encryption
  - Conversation management
  - Typing indicators

- **Payment Service** (`payment.integration.test.ts`)
  - Subscription management
  - Stripe integration
  - Coin purchases
  - Profile boosts
  - Transaction history
  - Refund processing

### 2. E2E Tests

Located in: `tests/e2e/`

E2E tests simulate real user interactions across the entire application.

#### Test Suites

- **Authentication Flow** (`auth.spec.ts`)
  - Registration with validation
  - Login/logout
  - Password recovery
  - Session management

- **Profile Setup** (`profile-setup.spec.ts`)
  - Profile information completion
  - Photo uploads
  - Preference configuration
  - Validation checks

- **Discovery & Swiping** (`discovery-swiping.spec.ts`)
  - Profile card display
  - Swipe gestures
  - Filters
  - Match notifications
  - Super likes

- **Messaging** (`messaging.spec.ts`)
  - Match list view
  - Send/receive messages
  - Message types (text, emoji, GIF)
  - Conversation management
  - Report/unmatch

- **Payment & Subscription** (`payment-subscription.spec.ts`)
  - View subscription plans
  - Payment processing
  - Coin purchases
  - Transaction history
  - Subscription cancellation

### 3. Load Tests

Located in: `tests/load/`

Load tests verify system performance under stress.

#### Test Scenarios

- **Authentication Load** (`scenarios/auth-load.js`)
  - 100K+ concurrent registrations
  - Login throughput
  - Token refresh performance
  - Rate limiting validation

- **Matching Load** (`scenarios/matching-load.js`)
  - Recommendation generation at scale
  - High-volume swiping
  - Concurrent match creation
  - Search performance

- **WebSocket Load** (`scenarios/websocket-load.js`)
  - 10K+ concurrent WebSocket connections
  - Message delivery rate
  - Connection stability
  - Real-time performance

#### Load Test Thresholds

```javascript
{
  http_req_failed: ['rate<0.01'],      // < 1% error rate
  http_req_duration: ['p(95)<500'],     // 95% under 500ms
  ws_connecting: ['p(95)<1000'],        // WebSocket connection < 1s
  http_reqs: ['rate>1000'],             // > 1000 req/s throughput
}
```

### 4. Security Tests

Located in: `tests/security/`

Security tests validate protection against common vulnerabilities.

#### OWASP Top 10 Coverage

- **A01: Broken Access Control**
  - Horizontal/vertical privilege escalation
  - IDOR protection
  - Authorization checks

- **A02: Cryptographic Failures**
  - Password hashing
  - Data encryption
  - Secure token generation

- **A03: Injection**
  - SQL injection prevention
  - XSS protection
  - Command injection checks

- **A04: Insecure Design**
  - Rate limiting
  - Account lockout
  - CAPTCHA implementation

- **A05: Security Misconfiguration**
  - Security headers
  - Error handling
  - CORS configuration

- **A06: Vulnerable Components**
  - Dependency auditing

- **A07: Authentication Failures**
  - Strong password enforcement
  - Session management
  - Token invalidation

- **A08: Data Integrity Failures**
  - File upload validation
  - CSP headers

- **A09: Logging & Monitoring**
  - Security event logging
  - Suspicious activity detection

- **A10: SSRF**
  - URL validation
  - Internal network protection

## Setup

### Prerequisites

```bash
# Install dependencies
yarn install

# Install Playwright browsers
npx playwright install

# Install k6 (macOS)
brew install k6

# Install k6 (Windows)
choco install k6

# Install k6 (Linux)
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Environment Configuration

Copy the test environment file:

```bash
cp backend/.env.test.example backend/.env.test
```

Configure test database and services in `.env.test`.

## Running Tests

### Integration Tests

```bash
# Run all integration tests
cd backend
yarn test

# Run tests for specific service
yarn workspace @flamoral/auth-service test

# Run with coverage
yarn test --coverage

# Run in watch mode
yarn test --watch

# Run specific test file
yarn test auth.integration.test.ts
```

### E2E Tests

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test auth.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Run on specific browser
npx playwright test --project=chromium

# Generate HTML report
npx playwright show-report
```

### Load Tests

```bash
# Run authentication load test
k6 run tests/load/scenarios/auth-load.js

# Run matching load test
k6 run tests/load/scenarios/matching-load.js

# Run WebSocket load test
k6 run tests/load/scenarios/websocket-load.js

# Run with custom VUs
k6 run --vus 1000 --duration 5m tests/load/scenarios/auth-load.js

# Run with environment variables
k6 run -e BASE_URL=https://api.example.com tests/load/scenarios/auth-load.js

# Output results to file
k6 run --out json=results.json tests/load/scenarios/auth-load.js

# Run with k6 Cloud (requires account)
k6 cloud tests/load/scenarios/auth-load.js
```

### Security Tests

```bash
# Run OWASP tests
yarn test tests/security/owasp-tests.spec.ts

# Run authentication security tests
yarn test tests/security/authentication-security.spec.ts

# Run all security tests
yarn test tests/security/
```

## Test Coverage

### Viewing Coverage Reports

```bash
# Generate coverage report
yarn test --coverage

# Open HTML coverage report
open coverage/lcov-report/index.html
```

### Coverage Targets

- **Overall**: 80% minimum
- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Coverage Thresholds

Configured in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/test.yml`:

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: yarn install
      - run: yarn test --coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: yarn install
      - run: npx playwright install
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  load-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: grafana/setup-k6-action@v1
      - run: k6 run tests/load/scenarios/auth-load.js

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: yarn install
      - run: yarn test tests/security/
```

## Best Practices

### Writing Tests

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **One assertion per test**: Keep tests focused
3. **Use descriptive names**: Test names should describe what they test
4. **Clean up after tests**: Use `afterEach` and `afterAll`
5. **Mock external dependencies**: Don't rely on external services
6. **Test edge cases**: Not just happy paths
7. **Keep tests independent**: Tests should not depend on each other
8. **Use fixtures**: Store test data in fixtures
9. **Avoid test interdependence**: Each test should be runnable in isolation

### Test Organization

```
tests/
├── e2e/
│   ├── auth.spec.ts
│   ├── profile-setup.spec.ts
│   └── fixtures/
│       └── test-photo.jpg
├── load/
│   ├── k6-config.js
│   └── scenarios/
│       ├── auth-load.js
│       └── matching-load.js
└── security/
    ├── owasp-tests.spec.ts
    └── authentication-security.spec.ts

backend/services/
└── auth-service/
    └── __tests__/
        └── integration/
            └── auth.integration.test.ts
```

### Test Data Management

1. **Use factories**: Create test data programmatically
2. **Seed test database**: Use migrations for consistent state
3. **Clean up**: Remove test data after tests
4. **Avoid hardcoding**: Use environment variables
5. **Anonymize production data**: Never use real user data

### Performance Testing

1. **Set realistic thresholds**: Based on requirements
2. **Monitor trends**: Track performance over time
3. **Test different scenarios**: Spike, soak, stress tests
4. **Identify bottlenecks**: Use profiling tools
5. **Test at scale**: Simulate production load

### Security Testing

1. **Test authentication**: All auth flows
2. **Test authorization**: Access control checks
3. **Test input validation**: XSS, SQL injection
4. **Test rate limiting**: Prevent abuse
5. **Regular audits**: Keep dependencies updated

## Troubleshooting

### Common Issues

#### Tests Failing Locally

```bash
# Clear Jest cache
yarn test --clearCache

# Reset test database
yarn reset:test-db

# Check environment variables
cat backend/.env.test
```

#### Playwright Tests Timeout

```bash
# Increase timeout in playwright.config.ts
timeout: 60000

# Run in debug mode
npx playwright test --debug
```

#### k6 Connection Issues

```bash
# Check service is running
curl http://localhost:3000/health

# Use verbose mode
k6 run --verbose tests/load/scenarios/auth-load.js
```

## Continuous Improvement

1. **Review coverage reports**: Identify gaps
2. **Update tests with code changes**: Keep tests current
3. **Add tests for bugs**: Prevent regressions
4. **Refactor tests**: Keep them maintainable
5. **Document complex tests**: Add comments

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [k6 Documentation](https://k6.io/docs/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Testing Best Practices](https://testingjavascript.com/)

## Support

For questions or issues with tests:

1. Check this documentation
2. Review test examples in codebase
3. Check CI/CD logs
4. Open an issue on GitHub
5. Contact the development team

---

**Last Updated**: 2025-12-02
**Maintained By**: Development Team
