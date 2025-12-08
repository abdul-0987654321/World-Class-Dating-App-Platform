# E2E Testing with Playwright

This directory contains End-to-End (E2E) tests for the Dating Platform web application using Playwright.

## Structure

```
e2e/
├── auth.setup.ts              # Authentication setup for tests
├── fixtures/                  # Test fixtures and helpers
│   └── test-helpers.ts       # Reusable test utilities
├── examples/                  # Example test files
│   └── user-flow.spec.ts     # Complete user journey tests
└── README.md                  # This file
```

## Setup

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

### Environment Variables

Create a `.env.test` file in the web-app directory:

```env
# Base URL for the application
BASE_URL=http://localhost:3000

# Test user credentials (for authenticated tests)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=Password123!

# API endpoints
API_GATEWAY_URL=http://localhost:4000
```

## Running Tests

### All Tests
```bash
npm run test:e2e
```

### Headed Mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Specific Test File
```bash
npx playwright test e2e/examples/user-flow.spec.ts
```

### UI Mode (interactive)
```bash
npx playwright test --ui
```

## Test Types

### 1. Setup Tests (`*.setup.ts`)
- Run before all other tests
- Establish authentication state
- Create test data

### 2. Smoke Tests (`*.smoke.ts`)
- Critical path tests
- Fast execution
- Run on every deployment

### 3. Feature Tests (`*.spec.ts`)
- Comprehensive feature testing
- Cover all user flows
- Run in CI/CD pipeline

### 4. Visual Tests (`tests/visual/`)
- Screenshot comparison
- Visual regression testing
- Detect UI changes

### 5. Accessibility Tests (`tests/accessibility/`)
- WCAG compliance
- Keyboard navigation
- Screen reader support

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/path');
    await page.click('[data-testid="button"]');
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

### Using Test Helpers

```typescript
import { createTestHelpers } from '../fixtures/test-helpers';

test('example with helpers', async ({ page }) => {
  const helpers = createTestHelpers(page);

  await helpers.login('user@example.com', 'password');
  await helpers.sendMessage('Hello!');
  await helpers.waitForToast('Message sent');
});
```

### Authenticated Tests

```typescript
test.describe('Authenticated Feature', () => {
  // Use stored authentication state
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('should access protected page', async ({ page }) => {
    await page.goto('/dashboard');
    // Test continues with authenticated user
  });
});
```

## Best Practices

### 1. Use Data Test IDs
```html
<button data-testid="submit-button">Submit</button>
```
```typescript
await page.click('[data-testid="submit-button"]');
```

### 2. Wait for Network Idle
```typescript
await page.goto('/path', { waitUntil: 'networkidle' });
```

### 3. Handle Asynchronous Updates
```typescript
await expect(page.locator('[data-testid="result"]')).toBeVisible({ timeout: 5000 });
```

### 4. Use Page Object Model
```typescript
class LoginPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.fill('[name="email"]', email);
    await this.page.fill('[name="password"]', password);
    await this.page.click('button[type="submit"]');
  }
}
```

### 5. Clean Up After Tests
```typescript
test.afterEach(async ({ page }) => {
  // Clean up test data
  await helpers.clearSession();
});
```

## Debugging

### View Test Report
```bash
npx playwright show-report
```

### Screenshot on Failure
Screenshots are automatically captured on test failure and saved to `test-results/`

### Video Recording
Videos are recorded for failed tests and saved to `test-results/`

### Trace Viewer
```bash
npx playwright show-trace trace.zip
```

## CI/CD Integration

Tests are automatically run in CI/CD pipeline with:
- Retries on failure (2 retries)
- Parallel execution (1 worker in CI)
- JUnit XML reports
- JSON results for dashboards
- GitHub Actions annotations

## Performance

### Optimize Test Speed
1. Run tests in parallel (locally)
2. Use `test.describe.configure({ mode: 'parallel' })`
3. Reuse authentication state
4. Mock external API calls
5. Use `waitUntil: 'domcontentloaded'` when appropriate

### Test Timeout Configuration
```typescript
test.setTimeout(60000); // 60 seconds
```

## Accessibility Testing

### Install axe-core
```bash
npm install -D @axe-core/playwright
```

### Run Accessibility Tests
```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test('should be accessible', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  await checkA11y(page);
});
```

## Visual Regression

### Take Screenshots
```typescript
await expect(page).toHaveScreenshot('homepage.png');
```

### Update Snapshots
```bash
npx playwright test --update-snapshots
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Stop existing dev server
   - Change BASE_URL in config

2. **Timeout errors**
   - Increase timeout in config
   - Check network conditions
   - Verify service availability

3. **Flaky tests**
   - Add explicit waits
   - Use `waitForLoadState`
   - Avoid hard-coded delays

4. **Authentication failures**
   - Re-run setup tests
   - Check `.auth/user.json` exists
   - Verify test credentials

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Examples](https://github.com/microsoft/playwright/tree/main/examples)
