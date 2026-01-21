# Flamoral QA Runbook

**Last Updated:** 2026-01-19

---

## 1. Local Development Testing

### Prerequisites
```bash
- Node.js 20.x
- Yarn 1.22+
- Docker Desktop
- Playwright browsers
```

### Setup
```bash
# Install dependencies
yarn install

# Install Playwright browsers
npx playwright install

# Copy test environment
cp .env.test.example .env.test

# Start test services
yarn docker:test:up
```

### Environment Variables (.env.test)
```env
NODE_ENV=test
BASE_URL=http://localhost:3000
API_GATEWAY_URL=http://localhost:4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flamoral_test
REDIS_URL=redis://localhost:6379
TEST_USER_EMAIL=test@flamoral.com
TEST_USER_PASSWORD=TestPassword123!
```

---

## 2. Test Commands

### Smoke Tests (Fast)
```bash
yarn test:smoke           # All smoke tests (~5 min)
yarn test:smoke:api       # API smoke (~2 min)
yarn test:smoke:ui        # UI smoke (~3 min)
```

### Unit Tests
```bash
yarn test:unit            # All unit tests
yarn test:unit --coverage # With coverage
yarn test:unit:watch      # Watch mode
```

### API Tests
```bash
yarn test:e2e:api         # All API E2E
yarn test:e2e:api:auth    # Auth endpoints
yarn test:e2e:api:payment # Payment endpoints
```

### UI Tests (Playwright)
```bash
yarn test:e2e             # All E2E tests
yarn test:e2e:headed      # See browser
yarn test:e2e:debug       # Debug mode
yarn test:e2e:ui          # Interactive UI
yarn test:e2e:chromium    # Chrome only
yarn test:e2e:mobile      # Mobile viewports
```

### Integration Tests
```bash
yarn test:integration        # All integration
yarn test:integration:docker # With Docker
```

### Load Tests
```bash
yarn test:load:auth       # Auth load test
yarn test:load:matching   # Matching load
yarn test:load:all        # All load tests
```

### Full Regression
```bash
yarn test:regression      # Complete suite
yarn test:regression:api  # API regression
yarn test:regression:ui   # UI regression
```

### Reports
```bash
yarn test:report:generate # Generate Allure
yarn test:report          # Open report
```

---

## 3. CI/CD Integration

### PR Quality Gates
| Check | Duration | Blocking |
|-------|----------|----------|
| Lint + TypeScript | ~2 min | Yes |
| Unit Tests | ~3 min | Yes |
| API Smoke | ~2 min | Yes |
| UI Smoke | ~3 min | Yes |

### View Test Results
1. GitHub Actions tab
2. PR Checks section
3. Download artifacts
4. View PR comment summary

### Allure Reports
Nightly reports published to:
```
https://[github-pages-url]/allure-report/
```

### Re-run Failed Tests
```bash
npx playwright test --last-failed
npx playwright test path/to/test.spec.ts
```

---

## 4. Debugging Failed Tests

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Timeout waiting for selector | Element not rendered | Check selector, add wait |
| Net::ERR_CONNECTION_REFUSED | Service not running | Start Docker |
| 401 Unauthorized | Token expired | Refresh test auth |

### View Artifacts
```bash
# Screenshots
test-results/[test-name]/screenshot.png

# Videos
test-results/[test-name]/video.webm

# Traces
npx playwright show-trace test-results/*/trace.zip
```

### Debug Mode
```bash
# Playwright debug
PWDEBUG=1 npx playwright test auth.spec.ts

# Verbose logging
DEBUG=pw:api npx playwright test
```

---

## 5. Writing New Tests

### File Naming
```
*.spec.ts  → E2E tests (Playwright)
*.test.ts  → Unit/Integration (Jest)
```

### Test Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should do something', async ({ page }) => {
    await page.fill('[data-testid="email"]', 'test@test.com');
    await page.click('[data-testid="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });
});
```

### Best Practices
1. Use data-testid selectors
2. No arbitrary sleeps
3. Independent tests
4. Clean up after tests
5. Descriptive test names

---

## 6. Test Data Management

### Test Users
| Role | Email | Password |
|------|-------|----------|
| User | test@flamoral.com | TestPassword123! |
| Premium | premium@flamoral.com | PremiumPass123! |
| Admin | admin@flamoral.com | AdminPassword123! |

### Database Reset
```bash
yarn docker:test:down && yarn docker:test:up
yarn test:reset
```

---

## Quick Start

```bash
# Setup
yarn install
yarn docker:test:up

# Run tests
yarn test:smoke

# View results
yarn test:report
```
