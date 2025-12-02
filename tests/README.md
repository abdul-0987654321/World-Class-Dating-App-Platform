# Test Suite

Comprehensive test suite for the Dating App Platform.

## Quick Start

```bash
# Install dependencies
yarn install

# Run all tests
yarn test:all

# Run integration tests only
yarn test:backend

# Run E2E tests only
yarn test:e2e

# Run load tests
yarn test:load

# Run security tests
yarn test:security
```

## Test Structure

```
tests/
├── e2e/                          # End-to-end tests (Playwright)
│   ├── auth.spec.ts             # Authentication flows
│   ├── profile-setup.spec.ts    # Profile setup wizard
│   ├── discovery-swiping.spec.ts # Swiping functionality
│   ├── messaging.spec.ts        # Chat and messaging
│   ├── payment-subscription.spec.ts # Payment flows
│   └── fixtures/                # Test images and data
├── load/                        # Load tests (k6)
│   ├── k6-config.js            # Load test configuration
│   └── scenarios/
│       ├── auth-load.js        # Auth service load test
│       ├── matching-load.js    # Matching service load test
│       └── websocket-load.js   # WebSocket load test
└── security/                    # Security tests
    ├── owasp-tests.spec.ts     # OWASP Top 10 tests
    └── authentication-security.spec.ts # Auth security tests

backend/services/                # Integration tests
├── auth-service/__tests__/
├── user-service/__tests__/
├── matching-service/__tests__/
├── messaging-service/__tests__/
└── payment-service/__tests__/
```

## Test Coverage

- **Integration Tests**: 80% coverage target
- **E2E Tests**: Critical user journeys
- **Load Tests**: 100K concurrent users
- **Security Tests**: OWASP Top 10 + authentication

## Documentation

See [TESTING.md](../TESTING.md) for complete documentation.

## CI/CD

Tests run automatically on:
- Pull requests
- Pushes to main/develop
- Nightly builds (load tests)

## Test Commands

### Backend Integration Tests

```bash
# All services
cd backend && yarn test

# Specific service
yarn workspace @flamoral/auth-service test

# With coverage
yarn test --coverage

# Watch mode
yarn test --watch
```

### E2E Tests

```bash
# All E2E tests
npx playwright test

# Specific browser
npx playwright test --project=chromium

# Debug mode
npx playwright test --debug

# Headed mode
npx playwright test --headed
```

### Load Tests

```bash
# Auth service
k6 run tests/load/scenarios/auth-load.js

# Matching service
k6 run tests/load/scenarios/matching-load.js

# WebSocket
k6 run tests/load/scenarios/websocket-load.js

# Custom duration
k6 run --vus 1000 --duration 10m tests/load/scenarios/auth-load.js
```

### Security Tests

```bash
# OWASP tests
yarn test tests/security/owasp-tests.spec.ts

# Auth security
yarn test tests/security/authentication-security.spec.ts
```

## Environment Setup

### Test Environment Variables

Create `backend/.env.test`:

```env
NODE_ENV=test
DB_NAME=flamoral_test
REDIS_HOST=localhost
JWT_SECRET=test_secret
STRIPE_SECRET_KEY=sk_test_...
```

### Test Database

```bash
# Create test database
createdb flamoral_test

# Run migrations
yarn migrate:test

# Seed test data
yarn seed:test
```

## Contributing

When adding new features:

1. Write integration tests for new endpoints
2. Add E2E tests for new user flows
3. Update load tests if affecting performance
4. Add security tests for new auth/authz
5. Maintain 80% coverage minimum

## Test Reports

### Coverage Report

```bash
yarn test --coverage
open coverage/lcov-report/index.html
```

### Playwright Report

```bash
npx playwright test
npx playwright show-report
```

### k6 Report

```bash
k6 run --out json=results.json tests/load/scenarios/auth-load.js
```

## Troubleshooting

### Tests Failing

1. Check environment variables in `.env.test`
2. Ensure test database is running
3. Clear Jest cache: `yarn test --clearCache`
4. Reset test database: `yarn reset:test-db`

### Playwright Issues

1. Update browsers: `npx playwright install`
2. Increase timeouts in `playwright.config.ts`
3. Run in debug mode: `npx playwright test --debug`

### k6 Issues

1. Check service is accessible
2. Increase thresholds if needed
3. Use verbose mode: `k6 run --verbose`

## Performance Benchmarks

### Target Metrics

- API response time: p95 < 500ms
- WebSocket connection: < 1s
- Throughput: > 1000 req/s
- Error rate: < 1%
- Database queries: < 100ms

### Load Test Scenarios

1. **Steady Load**: 1K concurrent users, 5 minutes
2. **Ramp Up**: 0 → 50K users over 10 minutes
3. **Spike**: Sudden 5K user surge
4. **Stress**: Find breaking point (100K+ users)
5. **Soak**: 5K users for 2 hours

## Security Checklist

- [ ] All endpoints have authentication
- [ ] Authorization checks on all resources
- [ ] Input validation on all inputs
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Rate limiting implemented
- [ ] Security headers present
- [ ] Passwords hashed with bcrypt
- [ ] Sensitive data encrypted

## Support

For help with tests:
- Review [TESTING.md](../TESTING.md)
- Check test examples in codebase
- Open GitHub issue
- Contact development team

---

**Maintained by**: Development Team
**Last Updated**: 2025-12-02
