# Test Inventory

## Test Pyramid

```
              ┌─────────────┐
              │    E2E      │ ~10% of tests
              │   Tests     │ Slow, expensive, high confidence
              ├─────────────┤
              │ Integration │ ~20% of tests
              │   Tests     │ Medium speed, test boundaries
         ┌────┴─────────────┴────┐
         │      Unit Tests       │ ~70% of tests
         │    Fast, isolated     │ Test logic in isolation
         └───────────────────────┘
```

## Test Categories

### Unit Tests

| Service | Path | Coverage Target | Command |
|---------|------|-----------------|---------|
| Auth | `backend/services/auth-service/src/**/*.test.ts` | 80% | `npm test` |
| Profile | `backend/services/user-service/src/**/*.test.ts` | 80% | `npm test` |
| Discovery | `backend/services/matching-service/src/**/*.test.ts` | 80% | `npm test` |
| Messaging | `backend/services/messaging-service/src/**/*.test.ts` | 80% | `npm test` |
| Payment | `backend/services/payment-service/src/**/*.test.ts` | 85% | `npm test` |
| Media | `backend/services/media-service/src/**/*.test.ts` | 75% | `npm test` |
| Verification | `backend/services/verification-service/src/**/*.test.ts` | 80% | `npm test` |
| Frontend | `apps/web-app/src/**/*.test.tsx` | 70% | `npm test` |

### Integration Tests

| Test Suite | Description | Dependencies |
|------------|-------------|--------------|
| Auth Flow | Registration, login, refresh, logout | PostgreSQL, Redis |
| Profile CRUD | Create, read, update profiles | PostgreSQL, Redis |
| Discovery Flow | Feed generation, like/pass | PostgreSQL, Redis |
| Messaging Flow | Send, receive, WebSocket | PostgreSQL, Redis |
| Payment Flow | Subscribe, webhook handling | PostgreSQL, Stripe test mode |
| Verification Flow | Start, upload, complete | PostgreSQL, mock provider |

### E2E Tests

| Test Suite | Scenarios | Browser |
|------------|-----------|---------|
| Critical Path | Register -> Profile -> Discovery -> Match -> Chat | Chromium |
| Subscription | Free limits -> Upgrade -> Premium features | Chromium |
| Verification | Start -> Upload -> Status check | Chromium |
| Safety | Report user -> Block -> Verify enforcement | Chromium |

## Critical Path Tests

These tests MUST pass before any deployment:

### 1. Authentication
```
- [ ] User can register with valid data
- [ ] Registration fails for under 18
- [ ] User can login with correct credentials
- [ ] Login fails with wrong password
- [ ] Token refresh works
- [ ] Logout invalidates session
```

### 2. Profile
```
- [ ] User can view own profile
- [ ] User can update profile
- [ ] Profile version is created on update
- [ ] User can upload photo
- [ ] Photo count enforced by tier
- [ ] User can delete photo
```

### 3. Discovery
```
- [ ] Feed returns candidates for eligible user
- [ ] Feed respects preferences
- [ ] Liked users don't reappear
- [ ] Passed users don't reappear
- [ ] Daily like cap enforced (server-side)
```

### 4. Matching
```
- [ ] Mutual like creates match
- [ ] Match notification sent
- [ ] Match appears in list
- [ ] Unmatch removes from list
- [ ] Conversation created on match
```

### 5. Messaging
```
- [ ] User can send text message
- [ ] Message delivered in real-time
- [ ] Message persisted correctly
- [ ] Idempotency key prevents duplicates
- [ ] Only matched users can message
```

### 6. Payments
```
- [ ] Subscription plans load
- [ ] User can subscribe (test mode)
- [ ] Entitlements update after subscription
- [ ] Webhook updates subscription status
- [ ] Premium features accessible after upgrade
- [ ] Free features still work after downgrade
```

### 7. Verification
```
- [ ] User can start verification
- [ ] User can upload document
- [ ] Status updates correctly
- [ ] Verified badge appears when approved
```

## Test Data Management

### Test Users

| Type | Email Pattern | Password | Purpose |
|------|---------------|----------|---------|
| Free | `test-free-*@flamoral.test` | `TestPass123!` | Free tier testing |
| Plus | `test-plus-*@flamoral.test` | `TestPass123!` | Plus tier testing |
| Premium | `test-premium-*@flamoral.test` | `TestPass123!` | Premium testing |
| Moderator | `test-mod-*@flamoral.test` | `TestPass123!` | Moderation testing |
| Admin | `test-admin-*@flamoral.test` | `TestPass123!` | Admin testing |

### Test Database

```bash
# Reset test database
npm run db:test:reset

# Seed test data
npm run db:test:seed

# Clean up after tests
npm run db:test:cleanup
```

## Running Tests

### All Tests

```bash
# Backend unit tests
cd backend && npm test

# Frontend unit tests
cd apps/web-app && npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests (CI)
npm run test:all
```

### Specific Service

```bash
# Auth service only
cd backend/services/auth-service && npm test

# With coverage
cd backend/services/auth-service && npm run test:coverage

# Watch mode
cd backend/services/auth-service && npm run test:watch
```

### E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run with UI
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

## Coverage Requirements

| Service | Minimum Coverage | Critical Files |
|---------|------------------|----------------|
| Auth | 80% | auth.service.ts, token.service.ts |
| Profile | 75% | profile.service.ts, photo.service.ts |
| Discovery | 75% | discovery.service.ts, ranking.service.ts |
| Messaging | 80% | message.service.ts, websocket.gateway.ts |
| Payment | 85% | subscription.service.ts, webhook.controller.ts |
| All | 75% overall | - |

## Test Fixtures

### User Fixture

```typescript
export const createTestUser = async (overrides?: Partial<User>): Promise<User> => {
  return await userFactory.create({
    email: `test-${uuid()}@flamoral.test`,
    password: 'TestPass123!',
    dob: subYears(new Date(), 25),
    country: 'US',
    ...overrides,
  });
};
```

### Match Fixture

```typescript
export const createTestMatch = async (userA: User, userB: User): Promise<Match> => {
  await likeFactory.create({ actor: userA, target: userB });
  await likeFactory.create({ actor: userB, target: userA });
  return await matchRepository.findByUsers(userA.id, userB.id);
};
```

## Mocking Strategy

### External Services

| Service | Mock Strategy |
|---------|---------------|
| Stripe | Use Stripe test mode + mock webhooks |
| Twilio | Mock client, record calls |
| SendGrid | Mock client, verify payloads |
| Onfido | Mock API responses |
| Firebase | Mock FCM client |

### Internal Services

| Service | Mock Strategy |
|---------|---------------|
| Database | In-memory SQLite or test PostgreSQL |
| Redis | Redis mock or test Redis |
| Queue | In-memory queue |
| File Storage | Memory-based mock |

## CI/CD Test Pipeline

```yaml
stages:
  - lint:
      - eslint
      - prettier
      - tsc

  - unit-tests:
      parallel:
        - auth-service
        - user-service
        - matching-service
        - messaging-service
        - payment-service
        - media-service
        - verification-service
        - web-app

  - integration-tests:
      requires:
        - PostgreSQL
        - Redis
      tests:
        - auth-flow
        - profile-flow
        - discovery-flow
        - messaging-flow
        - payment-flow

  - e2e-tests:
      requires:
        - Full staging environment
      tests:
        - critical-path
        - subscription-flow
        - verification-flow

  - deploy:
      if: all tests pass
```

## Test Reporting

### Coverage Report

```bash
# Generate coverage report
npm run test:coverage

# Upload to coverage service
npm run coverage:upload
```

### Test Results

```bash
# Generate JUnit report
npm run test:ci

# Generate HTML report
npm run test:report
```

### Flaky Test Tracking

Tests that fail intermittently are tracked and addressed:
- Retry count > 1 indicates potential flakiness
- Flaky tests marked and tracked in issue tracker
- Flaky tests must be fixed within 1 sprint
