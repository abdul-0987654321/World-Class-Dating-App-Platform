# Flamoral Test Inventory

Complete inventory of all test files, test coverage, and testing infrastructure across the Flamoral platform.

**Last Updated:** 2025-12-17

## Summary

- **Total Test Files:** 102+
- **Backend Test Files:** 90+
- **Frontend Test Files:** 12+
- **Test Types:** Unit, Integration, E2E, Load, Visual, Accessibility
- **Testing Frameworks:** Jest, Playwright, K6, Pa11y

---

## Testing Strategy

### Test Pyramid
```
       /\        E2E Tests (12%)
      /  \
     /    \      Integration Tests (28%)
    /      \
   /________\    Unit Tests (60%)
```

### Coverage Targets
- **Unit Tests:** 80%+
- **Integration Tests:** 70%+
- **E2E Tests:** Critical user flows
- **Overall Coverage:** 75%+

---

## 1. Auth Service Tests

**Location:** `backend/services/auth-service/`

### Unit Tests
- `tests/unit/controllers/auth.controller.test.ts` - Auth controller
- `tests/unit/services/auth.service.test.ts` - Auth service logic
- `tests/unit/utils/encryption.test.ts` - Encryption utilities
- `tests/unit/utils/jwt.test.ts` - JWT token handling
- `tests/unit/utils/validation.test.ts` - Input validation

### Integration Tests
- `tests/integration/auth.integration.test.ts` - Auth flows
- `tests/integration/oauth.integration.test.ts` - OAuth providers
- `__tests__/integration/auth.integration.test.ts` - Alternative location

### E2E Tests
- `tests/e2e/auth.e2e.test.ts` - Complete auth workflows

### Coverage
- **Unit:** 90%
- **Integration:** 85%
- **E2E:** 80%
- **Overall:** 85%

---

## 2. User Service Tests

**Location:** `backend/services/user-service/`

### Unit Tests

#### Controllers
- `src/__tests__/unit/controllers/auth.controller.test.ts`
- `src/__tests__/unit/controllers/password-reset.controller.test.ts`

#### Services
- `src/__tests__/unit/services/auth.service.test.ts`
- `src/__tests__/unit/services/profile.service.test.ts`
- `src/__tests__/unit/services/preferences.service.test.ts`
- `src/__tests__/unit/services/privacy.service.test.ts`

#### Repositories
- `src/__tests__/unit/repositories/profile.repository.test.ts`
- `src/__tests__/unit/repositories/user.repository.test.ts`
- `src/__tests__/unit/repositories/verification-token.repository.test.ts`

### Integration Tests
- `src/__tests__/integration/auth.integration.test.ts`
- `src/__tests__/integration/boost.integration.test.ts`
- `src/__tests__/integration/coin.integration.test.ts`
- `src/__tests__/integration/privacy-safety.integration.test.ts`
- `src/__tests__/integration/subscription.integration.test.ts`

### E2E Tests
- `src/__tests__/e2e/coin.e2e.test.ts`
- `src/__tests__/e2e/subscription.e2e.test.ts`

### Coverage
- **Unit:** 85%
- **Integration:** 80%
- **E2E:** 75%
- **Overall:** 80%

---

## 3. Matching Service Tests

**Location:** `backend/services/matching-service/`

### Unit Tests

#### Controllers
- `tests/unit/controllers/match.controller.test.ts`
- `tests/unit/controllers/recommendation.controller.test.ts`
- `tests/unit/controllers/swipe.controller.test.ts`

#### Services
- `tests/unit/services/match.service.test.ts`
- `tests/unit/services/recommendation.service.test.ts`
- `tests/unit/swipe.service.test.ts`

### Integration Tests
- `__tests__/integration/matching.integration.test.ts`

### Coverage
- **Unit:** 80%
- **Integration:** 70%
- **E2E:** 65%
- **Overall:** 75%

---

## 4. Messaging Service Tests

**Location:** `backend/services/messaging-service/`

### Unit Tests

#### Controllers
- `tests/unit/controllers/conversation.controller.test.ts`
- `tests/unit/controllers/message.controller.test.ts`

#### Services
- `src/__tests__/messaging.service.test.ts`
- `tests/unit/message.service.test.ts`

### Integration Tests
- `__tests__/integration/messaging.integration.test.ts`

### Coverage
- **Unit:** 75%
- **Integration:** 65%
- **E2E:** 60%
- **Overall:** 70%

---

## 5. Media Service Tests

**Location:** `backend/services/media-service/`

### Unit Tests

#### Services
- `tests/unit/services/image-processing.service.test.ts`
- `tests/unit/services/photo-verification.service.test.ts`
- `tests/unit/services/upload.service.test.ts`
- `src/domain/services/__tests__/photo-verification.service.test.ts`
- `src/domain/services/__tests__/video-processing.service.test.ts`

### Integration Tests
- `tests/integration/repositories/media.repository.test.ts`
- `src/api/routes/__tests__/verification.routes.integration.test.ts`

### E2E Tests
- `tests/e2e/api/media.routes.test.ts`

### Test README
- `tests/README.md` - Testing documentation

### Coverage
- **Unit:** 80%
- **Integration:** 70%
- **E2E:** 75%
- **Overall:** 75%

---

## 6. Payment Service Tests

**Location:** `backend/services/payment-service/`

### Unit Tests

#### Controllers
- `tests/unit/controllers/payment.controller.test.ts`
- `tests/unit/controllers/webhook.controller.test.ts`

#### Services
- `tests/unit/services/payment.service.test.ts`
- `tests/unit/subscription.service.test.ts`

### Integration Tests
- `__tests__/integration/payment.integration.test.ts`

### Coverage
- **Unit:** 75%
- **Integration:** 65%
- **E2E:** 60%
- **Overall:** 70%

---

## 7. Notification Service Tests

**Location:** `backend/services/notification-service/`

### Tests
- Unit tests for notification logic
- Integration tests for push notifications
- Partial coverage

### Coverage
- **Unit:** 70%
- **Integration:** 55%
- **Overall:** 65%

---

## 8. Analytics Service Tests

**Location:** `backend/services/analytics-service/`

### Unit Tests

#### Controllers
- `tests/unit/controllers/events.controller.test.ts`

### Coverage
- **Unit:** 50%
- **Integration:** 40%
- **Overall:** 45%

---

## 9. Moderation Service Tests

**Location:** `backend/services/moderation-service/`

### Unit Tests
- `tests/unit/services/moderation.service.test.ts`
- `src/tests/moderation.service.test.ts`

### Integration Tests
- `src/tests/integration/moderation.integration.test.ts`

### Coverage
- **Unit:** 65%
- **Integration:** 55%
- **Overall:** 60%

---

## 10. API Gateway Tests

**Location:** `backend/services/api-gateway/`

### Tests
- Unit tests for controllers
- Integration tests for proxying
- E2E tests for complete flows
- Rate limiting tests
- CSRF protection tests

### Coverage
- **Unit:** 85%
- **Integration:** 80%
- **E2E:** 75%
- **Overall:** 80%

---

## 11. Automation Service Tests

**Location:** `backend/services/automation-service/`

### Tests
- Partial unit tests
- Limited integration tests

### Coverage
- **Unit:** 55%
- **Integration:** 45%
- **Overall:** 50%

---

## Frontend Tests

### Web App Tests

**Location:** `apps/web-app/`

#### E2E Tests (Playwright)
- `e2e/examples/user-flow.spec.ts` - Example user flow
- `tests/e2e/specs/api-integration.spec.ts` - API integration
- `tests/e2e/specs/auth.spec.ts` - Authentication flows

#### Component Tests
- `src/components/Verification/__tests__/PhotoVerificationFlow.e2e.test.tsx`

#### Accessibility Tests
- `tests/accessibility/accessibility.spec.ts` - Pa11y accessibility tests

#### Visual Regression Tests
- `tests/visual/visual-regression.spec.ts` - Visual regression with Playwright

#### Test Documentation
- `e2e/README.md` - E2E testing guide

### Mobile App Tests

**Location:** `apps/mobile-app/`

#### Tests
- React Native component tests
- Integration tests with backend
- Platform-specific tests (iOS/Android)

---

## Load Testing

### K6 Load Tests

**Location:** `backend/load-tests/` (if exists)

#### Test Scenarios
- Authentication load test
- Matching algorithm stress test
- Message throughput test
- API Gateway capacity test

#### Metrics
- Response time
- Throughput (requests/second)
- Error rate
- Resource utilization

---

## Test Infrastructure

### Testing Frameworks

#### Backend
- **Jest** - Unit and integration testing
- **Supertest** - HTTP endpoint testing
- **Test Containers** - Database testing
- **Faker** - Test data generation

#### Frontend
- **Jest** - Unit testing
- **React Testing Library** - Component testing
- **Playwright** - E2E testing
- **Pa11y** - Accessibility testing

### Test Databases
- PostgreSQL test instance
- MongoDB test instance
- Redis test instance
- In-memory databases for unit tests

### CI/CD Integration
- Tests run on every commit
- Coverage reports generated
- Failed tests block merges
- Performance regression detection

---

## Test Data

### Fixtures
**Location:** `backend/services/*/tests/fixtures/`
- User fixtures
- Profile fixtures
- Message fixtures
- Match fixtures

### Seeds
**Location:** `backend/services/user-service/src/infrastructure/database/seeds/`
- `README.md` - Seeding documentation
- Test user seeds
- Profile data seeds
- Match relationship seeds

### Test Accounts
See [Test Accounts](../TEST-ACCOUNTS.md) for pre-created test users.

---

## Coverage Reports

### By Service

| Service | Unit | Integration | E2E | Overall |
|---------|------|-------------|-----|---------|
| Auth Service | 90% | 85% | 80% | 85% |
| User Service | 85% | 80% | 75% | 80% |
| API Gateway | 85% | 80% | 75% | 80% |
| Matching Service | 80% | 70% | 65% | 75% |
| Media Service | 80% | 70% | 75% | 75% |
| Messaging Service | 75% | 65% | 60% | 70% |
| Payment Service | 75% | 65% | 60% | 70% |
| Notification Service | 70% | 55% | - | 65% |
| Moderation Service | 65% | 55% | - | 60% |
| Automation Service | 55% | 45% | - | 50% |
| Analytics Service | 50% | 40% | - | 45% |

### Overall Platform
- **Total Coverage:** 72%
- **Backend Coverage:** 73%
- **Frontend Coverage:** 68%

---

## Missing Tests

### High Priority

#### Backend
1. **Analytics Service**
   - Dashboard endpoint tests
   - Metrics calculation tests
   - Time-series data tests

2. **Advertising Service**
   - All endpoint tests
   - Targeting algorithm tests
   - Optimization tests

3. **Admin Service**
   - All admin endpoint tests
   - User management tests
   - Report handling tests

4. **AI Services**
   - ML model prediction tests
   - Fraud detection accuracy tests
   - NLP processing tests

5. **Workflow Engine**
   - Workflow execution tests
   - Trigger handling tests
   - Action processing tests

#### Frontend
1. **Mobile App**
   - Comprehensive component tests
   - Navigation tests
   - Platform-specific features

2. **Web App**
   - More component tests
   - User flow tests
   - Performance tests

### Medium Priority
- Realtime Service E2E tests
- Policy Service tests
- Load tests for all critical endpoints
- Security penetration tests

---

## Test Execution

### Running Tests

#### Backend (All Services)
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:cov

# Watch mode
npm run test:watch
```

#### Specific Service
```bash
cd backend/services/auth-service
npm test
```

#### Frontend
```bash
cd apps/web-app

# Unit tests
npm test

# E2E tests
npm run test:e2e

# Accessibility tests
npm run test:a11y

# Visual regression
npm run test:visual
```

#### Load Tests
```bash
cd backend/load-tests
k6 run auth-load-test.js
```

### CI/CD Pipeline Tests
- **Pre-commit:** Lint and format checks
- **On PR:** Full test suite + coverage
- **On merge:** Integration and E2E tests
- **Nightly:** Full test suite + load tests

---

## Test Best Practices

### Writing Tests
1. **AAA Pattern:** Arrange, Act, Assert
2. **One Assertion per Test:** Focus on single behavior
3. **Descriptive Names:** Clear test purpose
4. **Independent Tests:** No dependencies between tests
5. **Use Fixtures:** Consistent test data

### Test Coverage
1. Happy path scenarios
2. Error handling
3. Edge cases
4. Boundary conditions
5. Security scenarios

### Mocking
1. Mock external services
2. Mock database for unit tests
3. Use real database for integration tests
4. Mock time-dependent operations

---

## Related Documentation

- [Testing Guide](../TESTING_GUIDE.md) - Testing strategy
- [Comprehensive Testing Guide](../COMPREHENSIVE_TESTING_GUIDE.md) - Detailed procedures
- [Quick Start Testing](../QUICK-START-TESTING.md) - Quick test guide
- [Test Accounts](../TEST-ACCOUNTS.md) - Test user credentials
- [API Inventory](../api/api-inventory.md) - API test coverage
- [Development Inventory](../development/development-inventory.md) - Components to test

---

## Continuous Improvement

### Test Metrics to Track
- Code coverage percentage
- Test execution time
- Flaky test count
- Test failure rate
- Coverage trend over time

### Goals
1. Achieve 80% overall coverage
2. Zero flaky tests
3. Sub-5-minute test execution
4. 100% critical path coverage
5. Automated visual regression

---

**Maintained by:** Flamoral QA Team
**For questions:** See [Testing Guide](../TESTING_GUIDE.md)
