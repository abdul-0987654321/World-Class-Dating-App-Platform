# Flamoral Dating Platform - Comprehensive Testing Suite

Complete testing suite covering all aspects of the Flamoral Dating Platform including E2E tests, integration tests, load tests, security tests, contract tests, performance benchmarks, chaos engineering, accessibility, and visual regression testing.

## Table of Contents

- [Overview](#overview)
- [Test Categories](#test-categories)
- [Installation](#installation)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Best Practices](#best-practices)

## Overview

This testing suite ensures the Flamoral Dating Platform meets high standards for:
- **Functionality** - E2E and integration tests
- **Performance** - Load tests and benchmarks
- **Security** - OWASP ZAP scans
- **Accessibility** - WCAG 2.1 AA compliance
- **Visual Consistency** - Visual regression tests
- **Reliability** - Chaos engineering tests
- **Service Contracts** - Pact contract testing

## Test Categories

### 1. End-to-End Tests (Cypress)

**Location:** `apps/web-app/cypress/`

**Test Files:**
- `auth.cy.ts` - Authentication, login, registration, password reset
- `discovery.cy.ts` - Discovery page, swiping, matching
- `messaging.cy.ts` - Conversations, real-time messaging
- `profile.cy.ts` - Profile management, photos, settings
- `subscription.cy.ts` - Payment flows, subscriptions
- `accessibility.cy.ts` - WCAG compliance

**Commands:**
```bash
cd apps/web-app
npm run test:e2e              # Open test runner
npx cypress run               # Run headless
npx cypress run --spec "cypress/e2e/auth.cy.ts"
```

### 2. Mobile E2E Tests (Detox)

**Location:** `apps/mobile-app/e2e/`

**Test Files:**
- `authentication.e2e.ts` - Login, registration, social auth
- `discovery.e2e.ts` - Discovery features, swiping
- `messaging.e2e.ts` - Chat, notifications
- `profile-management.e2e.ts` - Profile CRUD operations
- `registration.e2e.ts` - User onboarding flow

**Commands:**
```bash
cd apps/mobile-app

# iOS
npm run test:e2e:ios
detox test --configuration ios.sim.debug

# Android
npm run test:e2e:android
detox test --configuration android.emu.debug
```

### 3. Integration Tests (Jest)

**Location:** `tests/integration/`

**Test Coverage:**
- Auth Service - Login, registration, token management
- User Service - Profile CRUD, preferences
- Matching Service - Discovery algorithm, swipes
- Messaging Service - Conversations, messages
- Payment Service - Subscriptions, payments
- Media Service - Photo uploads

**Commands:**
```bash
cd tests/integration
npm test
npm test auth-service.test.ts
npm run test:coverage
```

### 4. Load Testing

#### k6 Tests
**Location:** `tests/load/k6-load-test.js`

**Scenarios:**
- Authentication flow
- Profile operations
- Discovery and swiping
- Messaging
- Search and filtering

**Thresholds:**
- P95 < 500ms
- P99 < 1000ms
- Error rate < 1%

**Commands:**
```bash
k6 run tests/load/k6-load-test.js
k6 run --env API_URL=https://staging.flamoral.com tests/load/k6-load-test.js
k6 cloud tests/load/k6-load-test.js
```

#### Artillery Tests
**Location:** `tests/load/artillery-config.yml`

**Commands:**
```bash
artillery run tests/load/artillery-config.yml
artillery run --output report.json tests/load/artillery-config.yml
artillery report report.json
```

### 5. Security Testing (OWASP ZAP)

**Location:** `tests/security/`

**Security Checks:**
- SQL Injection
- XSS (Cross-Site Scripting)
- CSRF protection
- Authentication bypass
- API security
- Session management
- Data encryption

**Commands:**
```bash
# Start ZAP daemon
zap.sh -daemon -port 8080 -config api.key=flamoral-zap-api-key

# Run security scan
python tests/security/zap-baseline-scan.py

# View reports
open tests/security/security-reports/zap-report.html
```

### 6. Contract Testing (Pact)

**Location:** `tests/contract/`

**Service Contracts:**
- WebApp ↔ User Service
- WebApp ↔ Matching Service
- WebApp ↔ Messaging Service
- MobileApp ↔ Payment Service

**Commands:**
```bash
cd tests/contract
npm test
npm run pact:publish
npm run pact:verify
```

### 7. Performance Benchmarks

**Location:** `tests/performance/`

**Benchmark Tests:**
- User profile retrieval
- Discovery profile loading
- Swipe processing
- Message sending
- Search and filtering
- Cache performance
- Memory leak detection

**Commands:**
```bash
cd tests/performance
npm run benchmark
node --expose-gc benchmark.ts  # With memory profiling
```

### 8. Chaos Engineering

**Location:** `tests/chaos/`

**Chaos Scenarios:**
- Network latency injection
- Service failures
- Database connection issues
- Traffic spikes
- Memory exhaustion
- Cascading failures
- Data corruption
- WebSocket failures

**Commands:**
```bash
cd tests/chaos
npm run chaos
npm run chaos:network-latency
npm run chaos:service-failure
```

### 9. Accessibility Testing

**Location:** `apps/web-app/cypress/e2e/accessibility.cy.ts`

**Coverage:**
- WCAG 2.1 Level AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast
- Form accessibility
- ARIA attributes
- Focus management
- Motion preferences

**Commands:**
```bash
cd apps/web-app
npm run test:a11y
npm run test:a11y:report
```

### 10. Visual Regression Testing (BackstopJS)

**Location:** `tests/visual/`

**Test Coverage:**
- All major pages (30+ scenarios)
- Responsive design (phone, tablet, desktop)
- Dark mode
- Loading states
- Empty states
- Error states

**Commands:**
```bash
cd tests/visual

# Create reference screenshots
npm run backstop:reference

# Run visual regression test
npm run backstop:test

# Approve changes
npm run backstop:approve

# Open report
npm run backstop:report
```

## Installation

### Prerequisites
```bash
# Required
Node.js 18+
Docker & Docker Compose
Python 3.8+

# Platform specific
# iOS testing
Xcode
iOS Simulator

# Android testing
Android Studio
Android Emulator
Java 11+
```

### Setup

```bash
# Root dependencies
npm install

# Web app
cd apps/web-app
npm install

# Mobile app
cd apps/mobile-app
npm install
npx detox build --configuration ios.sim.debug

# Global tools
npm install -g k6 artillery backstopjs

# Python dependencies
pip install zaproxy python-owasp-zap-v2.4
```

## Running All Tests

```bash
# Complete test suite
npm run test:all

# By category
npm run test:e2e
npm run test:integration
npm run test:load
npm run test:security
npm run test:contract
npm run test:performance
npm run test:chaos
npm run test:a11y
npm run test:visual
```

## Environment Configuration

Create `.env.test`:

```env
# API Endpoints
API_BASE_URL=http://localhost:3000/api/v1
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
MATCHING_SERVICE_URL=http://localhost:3003
MESSAGING_SERVICE_URL=http://localhost:3004
PAYMENT_SERVICE_URL=http://localhost:3005
MEDIA_SERVICE_URL=http://localhost:3006

# Test Credentials
TEST_USER_EMAIL=test@flamoral.com
TEST_USER_PASSWORD=TestPass123!
TEST_PREMIUM_EMAIL=premium@flamoral.com
TEST_PREMIUM_PASSWORD=Premium123!

# Security
ZAP_API_KEY=flamoral-zap-api-key

# Contract Testing
PACT_BROKER_BASE_URL=https://pact-broker.flamoral.com
PACT_BROKER_TOKEN=your-token-here
```

## Test Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Unit Tests | 80% | - |
| Integration Tests | 70% | - |
| E2E Critical Paths | 100% | - |
| API Endpoints | 100% | - |
| WCAG 2.1 AA | 100% | - |
| Security (High/Critical) | 0 vulnerabilities | - |

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Merges to main
- Nightly builds
- Pre-release

**GitHub Actions Workflows:**
- `.github/workflows/e2e-tests.yml`
- `.github/workflows/integration-tests.yml`
- `.github/workflows/security-scan.yml`
- `.github/workflows/visual-regression.yml`

## Best Practices

### Writing Tests

1. **Isolation** - Each test is independent
2. **Data Management** - Use test-specific data, cleanup after
3. **Assertions** - Be specific and meaningful
4. **Performance** - Keep tests fast (<5s each)
5. **Flakiness** - Avoid time-dependent assertions
6. **Documentation** - Comment complex test logic

### Test Data

```javascript
// Good
const testUser = {
  email: `test-${Date.now()}@flamoral.com`,
  password: 'SecurePass123!',
};

// Bad - reuses same data
const testUser = {
  email: 'test@example.com',
  password: 'password',
};
```

### Assertions

```javascript
// Good - specific
expect(response.status).toBe(200);
expect(response.data).toHaveProperty('token');
expect(response.data.user.email).toBe(testUser.email);

// Bad - vague
expect(response).toBeTruthy();
```

## Debugging

### Cypress
```bash
# Interactive mode
npx cypress open

# With Chrome DevTools
npx cypress open --browser chrome

# Verbose logging
DEBUG=cypress:* npx cypress run
```

### Detox
```bash
# Verbose logs
detox test --configuration ios.sim.debug --loglevel verbose

# Screenshots
detox test --take-screenshots all

# Record video
detox test --record-videos all
```

### Integration Tests
```bash
# Node debugger
NODE_ENV=test node --inspect-brk node_modules/.bin/jest

# Specific test
npm test -- --testNamePattern="should login successfully"
```

## Common Issues

### Cypress

**Issue:** Tests timing out
```bash
# Increase timeout in cypress.config.ts
defaultCommandTimeout: 10000,
```

**Issue:** Element not found
```javascript
// Use proper waits
cy.wait('@apiCall');
cy.get('[data-testid="element"]', { timeout: 10000 });
```

### Detox

**Issue:** Build fails
```bash
# Clean and rebuild
cd ios && pod deintegrate && pod install
detox clean-framework-cache && detox build-framework-cache
```

**Issue:** Tests flaky
```javascript
// Use proper waitFor
await waitFor(element(by.id('element')))
  .toBeVisible()
  .withTimeout(5000);
```

## Test Reports

Reports are generated in:
- **Cypress:** `apps/web-app/cypress/reports/`
- **Detox:** `apps/mobile-app/e2e/test-results/`
- **Jest:** `tests/integration/coverage/`
- **k6:** `tests/load/results/`
- **ZAP:** `tests/security/security-reports/`
- **BackstopJS:** `tests/visual/backstop_data/html_report/`

## Contributing

When adding features:

1. Write E2E tests for user flows
2. Add integration tests for APIs
3. Update contract tests if needed
4. Run accessibility tests
5. Run visual regression tests
6. Update test documentation

## Support

- GitHub Issues
- Internal QA team
- Documentation wiki

## License

MIT License
