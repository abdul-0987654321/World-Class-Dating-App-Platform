# Flamoral Dating Platform - Test Troubleshooting Guide

**Version:** 1.0.0
**Last Updated:** 2026-01-19
**Purpose:** Solutions for common test failures and issues

---

## Table of Contents

1. [Common Test Failures and Fixes](#common-test-failures-and-fixes)
2. [Docker Networking Issues](#docker-networking-issues)
3. [Flaky Test Mitigation](#flaky-test-mitigation)
4. [CI-Specific Problems](#ci-specific-problems)
5. [Database Issues](#database-issues)
6. [Browser and Playwright Issues](#browser-and-playwright-issues)
7. [Performance Test Issues](#performance-test-issues)
8. [Quick Reference Commands](#quick-reference-commands)

---

## Common Test Failures and Fixes

### 1. Timeout Errors

#### Symptom
```
Error: locator.click: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for locator('button[type="submit"]')
============================================================
```

#### Causes
- Element not rendered yet
- Element hidden or covered by another element
- Wrong selector
- Slow network or application response
- Animation blocking interaction

#### Solutions

**Increase timeout for specific action:**
```typescript
// Playwright
await page.click('button', { timeout: 60000 });

// Jest
jest.setTimeout(30000);
```

**Wait for element explicitly:**
```typescript
// Wait for element to be visible
await page.waitForSelector('button[type="submit"]', { state: 'visible' });

// Wait for network to be idle
await page.waitForLoadState('networkidle');

// Wait for specific condition
await page.waitForFunction(() => {
  return document.querySelector('.loading') === null;
});
```

**Use more reliable selectors:**
```typescript
// Instead of CSS class
await page.click('.btn-primary');

// Use test ID
await page.getByTestId('submit-button').click();

// Or role-based
await page.getByRole('button', { name: 'Submit' }).click();
```

---

### 2. Element Not Found

#### Symptom
```
Error: locator.click: Error: strict mode violation:
getByRole('button') resolved to 5 elements
```

#### Causes
- Selector matches multiple elements
- Element dynamically generated
- Element in iframe or shadow DOM

#### Solutions

**Make selector more specific:**
```typescript
// Instead of
await page.getByRole('button').click();

// Use
await page.getByRole('button', { name: 'Submit' }).click();
// or
await page.getByTestId('submit-button').click();
// or
await page.locator('form button[type="submit"]').click();
```

**Handle dynamic elements:**
```typescript
// Wait for element count to stabilize
await expect(page.locator('.list-item')).toHaveCount(5);

// Then interact
await page.locator('.list-item').first().click();
```

**Handle iframes:**
```typescript
const frame = page.frameLocator('iframe#payment');
await frame.getByRole('button', { name: 'Pay' }).click();
```

---

### 3. Network/API Errors

#### Symptom
```
Error: net::ERR_CONNECTION_REFUSED at http://localhost:3000/api/users
```

#### Causes
- Backend service not running
- Wrong port or URL
- Docker network misconfiguration
- CORS issues

#### Solutions

**Verify services are running:**
```bash
# Check Docker containers
docker ps

# Check specific port
netstat -an | grep 3000
# or on Windows
netstat -an | findstr 3000

# Test API directly
curl http://localhost:3000/health
```

**Check environment variables:**
```bash
# Verify BASE_URL is set correctly
echo $BASE_URL

# In test file
console.log('Using API URL:', process.env.BASE_URL);
```

**Mock API for isolation:**
```typescript
await page.route('**/api/users', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ users: [] })
  });
});
```

---

### 4. Authentication Failures

#### Symptom
```
Error: Expected status 200, received 401 Unauthorized
```

#### Causes
- Token expired during test
- Missing or incorrect auth headers
- Session not persisted
- CSRF token missing

#### Solutions

**Ensure token is fresh:**
```typescript
test.beforeEach(async ({ page }) => {
  // Get fresh token
  const token = await getAuthToken();

  // Set in storage
  await page.evaluate((t) => {
    localStorage.setItem('accessToken', t);
  }, token);
});
```

**Check request headers:**
```typescript
page.on('request', request => {
  if (request.url().includes('/api/')) {
    console.log('Auth header:', request.headers()['authorization']);
  }
});
```

**Handle CSRF:**
```typescript
// Get CSRF token first
const csrfToken = await page.evaluate(() => {
  return document.querySelector('meta[name="csrf-token"]')?.content;
});

// Include in request
await page.route('**/api/**', route => {
  route.continue({
    headers: {
      ...route.request().headers(),
      'X-CSRF-Token': csrfToken
    }
  });
});
```

---

### 5. Database State Issues

#### Symptom
```
Error: duplicate key value violates unique constraint "users_email_key"
```

#### Causes
- Test data not cleaned up
- Parallel tests sharing data
- Missing transaction rollback
- Seed data conflicts

#### Solutions

**Use unique test data:**
```typescript
// Generate unique email per test
const testEmail = `test_${Date.now()}_${Math.random().toString(36)}@example.com`;
```

**Clean up in afterEach:**
```typescript
afterEach(async () => {
  await db('users').where('email', 'like', 'test_%').delete();
});
```

**Use transactions:**
```typescript
beforeEach(async () => {
  await db.raw('BEGIN');
});

afterEach(async () => {
  await db.raw('ROLLBACK');
});
```

**Reset database between runs:**
```bash
# Full reset
yarn docker:test:down
yarn docker:test:up
yarn migrate:test
yarn seed:test
```

---

### 6. Assertion Failures

#### Symptom
```
expect(received).toBe(expected)
Expected: "Welcome, John Doe"
Received: "Welcome, John Doe "  // Note trailing space
```

#### Causes
- Whitespace differences
- Case sensitivity
- Date/time formatting
- Floating point precision

#### Solutions

**Handle whitespace:**
```typescript
// Trim strings
expect(text.trim()).toBe('Welcome, John Doe');

// Use regex
expect(text).toMatch(/Welcome, John Doe/);

// Use toContain for partial match
expect(text).toContain('Welcome');
```

**Handle dates:**
```typescript
// Compare timestamps instead of formatted strings
expect(new Date(result.date).getTime())
  .toBeCloseTo(new Date(expected.date).getTime(), -3); // Within seconds

// Or use date-fns/moment for comparison
expect(isSameDay(result.date, expected.date)).toBe(true);
```

**Handle floating points:**
```typescript
expect(result).toBeCloseTo(0.3, 5); // 5 decimal places
```

---

## Docker Networking Issues

### Container Cannot Connect to Host

#### Symptom
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```

#### Cause
Container trying to reach host machine services using localhost.

#### Solution

**On Linux:**
```yaml
# docker-compose.yml
services:
  test-runner:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

**In test config:**
```typescript
const BASE_URL = process.env.CI
  ? 'http://host.docker.internal:3000'
  : 'http://localhost:3000';
```

---

### Containers Cannot Communicate

#### Symptom
```
Error: getaddrinfo ENOTFOUND auth-service
```

#### Cause
Services not on same Docker network.

#### Solution

**Ensure shared network:**
```yaml
# docker-compose.yml
services:
  api-gateway:
    networks:
      - flamoral-test-network

  auth-service:
    networks:
      - flamoral-test-network

networks:
  flamoral-test-network:
    driver: bridge
```

**Use container names, not localhost:**
```env
AUTH_SERVICE_URL=http://auth-service:3001
# Not: http://localhost:3001
```

---

### Port Conflicts

#### Symptom
```
Error: Bind for 0.0.0.0:5432 failed: port is already allocated
```

#### Cause
Another service using the same port.

#### Solution

**Use different ports for test containers:**
```yaml
# docker-compose.test.yml
services:
  postgres-test:
    ports:
      - "5433:5432"  # Different host port
```

**Find and stop conflicting service:**
```bash
# Find what's using port
lsof -i :5432
# or on Windows
netstat -ano | findstr 5432

# Stop conflicting container
docker stop flamoral-postgres
```

---

### DNS Resolution Failures

#### Symptom
```
Error: getaddrinfo EAI_AGAIN redis-test
```

#### Cause
DNS resolution intermittent in Docker.

#### Solution

**Use IP addresses in CI:**
```yaml
services:
  redis-test:
    networks:
      flamoral-test-network:
        ipv4_address: 172.28.1.10
```

**Add retry logic:**
```typescript
async function connectWithRetry(url: string, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await connect(url);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

---

## Flaky Test Mitigation

### Identifying Flaky Tests

#### Symptoms
- Test passes locally, fails in CI
- Test fails intermittently (same code, different results)
- Test depends on timing

#### Detection Commands
```bash
# Run test multiple times
for i in {1..10}; do yarn test:e2e auth.spec.ts; done

# Playwright specific - repeat test
npx playwright test auth.spec.ts --repeat-each=10

# Check for test.only accidentally committed
grep -r "test.only\|it.only\|describe.only" tests/
```

---

### Common Flaky Test Patterns

#### 1. Race Conditions

**Problem:**
```typescript
// BAD - Race condition
await page.click('button');
const text = await page.textContent('.result'); // May not be updated yet
```

**Solution:**
```typescript
// GOOD - Wait for expected state
await page.click('button');
await expect(page.locator('.result')).toHaveText('Success');
```

#### 2. Hardcoded Waits

**Problem:**
```typescript
// BAD - Arbitrary wait
await page.click('submit');
await page.waitForTimeout(3000);
await expect(page.locator('.success')).toBeVisible();
```

**Solution:**
```typescript
// GOOD - Wait for condition
await page.click('submit');
await expect(page.locator('.success')).toBeVisible({ timeout: 10000 });
```

#### 3. Test Order Dependencies

**Problem:**
```typescript
// Test B depends on Test A's side effects
test('A: creates user', async () => { /* creates user */ });
test('B: logs in user', async () => { /* assumes user exists */ });
```

**Solution:**
```typescript
// Each test is independent
test('login with valid credentials', async () => {
  // Create own test user
  const user = await createTestUser();
  await loginPage.login(user.email, user.password);
});
```

#### 4. Time-Dependent Tests

**Problem:**
```typescript
// BAD - Depends on current time
const subscription = await getSubscription();
expect(subscription.expiresAt > new Date()).toBe(true);
```

**Solution:**
```typescript
// GOOD - Mock time
jest.useFakeTimers();
jest.setSystemTime(new Date('2024-01-15'));

const subscription = await getSubscription();
expect(subscription.expiresAt).toEqual(new Date('2024-02-15'));

jest.useRealTimers();
```

---

### Flaky Test Remediation

#### Add Retries (Temporary)
```typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
});

// For specific test
test('flaky test', async ({ page }) => {
  test.info().annotations.push({ type: 'flaky', description: 'Known flaky - JIRA-123' });
  // ...
});
```

#### Quarantine Flaky Tests
```typescript
// Tag flaky tests
test.skip('known flaky test @flaky', async () => {
  // TODO: Fix race condition in profile update
});
```

#### Monitor Flaky Tests
```bash
# Track flaky test rate in CI
# Add to CI pipeline
npx playwright test --reporter=json > results.json
node scripts/analyze-flaky-tests.js results.json
```

---

## CI-Specific Problems

### Memory Issues

#### Symptom
```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```

#### Solutions

**Increase Node memory:**
```yaml
# GitHub Actions
- name: Run tests
  env:
    NODE_OPTIONS: "--max-old-space-size=4096"
  run: yarn test
```

**Run tests sequentially:**
```bash
# Reduce parallelism
npx playwright test --workers=1
```

---

### Browser Installation Issues

#### Symptom
```
Error: browserType.launch: Executable doesn't exist at /home/runner/.cache/ms-playwright/chromium-1234/chrome-linux/chrome
```

#### Solutions

**Install browsers in CI:**
```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps chromium
```

**Use official container:**
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.40.0-jammy
```

---

### Different Behavior in CI

#### Symptom
Test passes locally but fails in CI with different results.

#### Common Causes and Solutions

| Cause | Local | CI | Solution |
|-------|-------|-----|----------|
| Timezone | Your TZ | UTC | Use UTC in tests |
| Screen size | Your resolution | 1280x720 | Set explicit viewport |
| Font rendering | System fonts | Linux fonts | Use visual regression tolerance |
| Network speed | Fast | Variable | Increase timeouts |
| Parallelism | Multiple workers | Single worker | Run with --workers=1 locally |

**Replicate CI environment locally:**
```bash
# Run with CI settings
CI=true npx playwright test --workers=1

# Or use Docker
docker run -it --rm \
  -v $(pwd):/app \
  -w /app \
  mcr.microsoft.com/playwright:v1.40.0-jammy \
  npx playwright test
```

---

### GitHub Actions Specific

#### Artifact Upload Failures

```yaml
- name: Upload test results
  uses: actions/upload-artifact@v4
  if: always()  # Upload even on failure
  with:
    name: test-results
    path: |
      test-results/
      playwright-report/
    retention-days: 7
```

#### Cache Issues

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
```

---

## Database Issues

### Connection Pool Exhausted

#### Symptom
```
Error: TimeoutError: Knex: Timeout acquiring a connection
```

#### Solutions

**Increase pool size:**
```typescript
// knex config
pool: {
  min: 2,
  max: 20
}
```

**Close connections in tests:**
```typescript
afterAll(async () => {
  await db.destroy();
});
```

---

### Migration Failures

#### Symptom
```
Error: migration "20240115_create_users" has already been run
```

#### Solutions

```bash
# Check migration status
yarn knex migrate:status

# Rollback and re-run
yarn knex migrate:rollback --all
yarn knex migrate:latest

# Force unlock
yarn knex migrate:unlock
```

---

### Test Data Pollution

#### Symptom
Tests pass in isolation but fail when run together.

#### Solutions

**Use transactions:**
```typescript
describe('User Service', () => {
  let trx: Knex.Transaction;

  beforeEach(async () => {
    trx = await db.transaction();
  });

  afterEach(async () => {
    await trx.rollback();
  });

  it('creates user', async () => {
    const user = await userService.create(userData, trx);
    expect(user).toBeDefined();
  });
});
```

**Unique identifiers:**
```typescript
const testId = `test_${process.pid}_${Date.now()}`;
const email = `${testId}@example.com`;
```

---

## Browser and Playwright Issues

### Screenshot Comparison Failures

#### Symptom
```
Error: Screenshot comparison failed:
  Expected image to match but found 0.5% difference
```

#### Solutions

**Increase threshold:**
```typescript
await expect(page).toHaveScreenshot('homepage.png', {
  maxDiffPixelRatio: 0.02  // Allow 2% difference
});
```

**Update baseline:**
```bash
npx playwright test --update-snapshots
```

---

### Browser Crashes

#### Symptom
```
Error: browserType.launch: Process closed with signal SIGKILL
```

#### Solutions

**Reduce resource usage:**
```typescript
// playwright.config.ts
use: {
  launchOptions: {
    args: [
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-sandbox'
    ]
  }
}
```

**Increase shared memory in Docker:**
```yaml
services:
  test-runner:
    shm_size: '2gb'
```

---

### Video Recording Issues

#### Symptom
Videos not generated or corrupted.

#### Solutions

```typescript
// playwright.config.ts
use: {
  video: {
    mode: 'retain-on-failure',
    size: { width: 1280, height: 720 }
  }
}
```

---

## Performance Test Issues

### k6 Connection Errors

#### Symptom
```
WARN[0001] Request Failed: dial tcp 127.0.0.1:3000: connect: connection refused
```

#### Solutions

**Wait for service readiness:**
```bash
# In CI, wait for health check
until curl -s http://localhost:3000/health; do sleep 1; done

# Then run load test
k6 run tests/load/scenarios/auth-load.js
```

**Use correct URL:**
```javascript
// k6 test
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
```

---

### Unrealistic Results

#### Symptom
Getting 100K req/s on localhost (too good to be true).

#### Causes
- Hitting mock/stub instead of real service
- Connection keep-alive inflating numbers
- Test running against cache

#### Solutions

**Verify target:**
```javascript
export function setup() {
  const res = http.get(`${BASE_URL}/health`);
  console.log('Health check:', res.status);
  if (res.status !== 200) {
    throw new Error('Service not ready');
  }
}
```

**Disable caching:**
```javascript
const res = http.get(`${BASE_URL}/api/users`, {
  headers: { 'Cache-Control': 'no-cache' }
});
```

---

## Quick Reference Commands

### Reset Everything

```bash
# Nuclear option - reset all test infrastructure
docker-compose -f infrastructure/local-dev/docker-compose.test.yml down -v
docker system prune -f
yarn docker:test:up
yarn migrate:test
yarn seed:test
```

### Debug Specific Test

```bash
# Playwright debug mode
npx playwright test auth.spec.ts --debug

# Jest verbose
yarn test auth.test.ts --verbose

# With full trace
DEBUG=* yarn test
```

### Check Service Health

```bash
# All services
docker-compose -f infrastructure/local-dev/docker-compose.test.yml ps

# Specific service logs
docker logs flamoral-postgres-test --tail 50

# Health endpoints
curl http://localhost:3000/health
curl http://localhost:3001/health
```

### Clear Caches

```bash
# Jest cache
yarn test --clearCache

# Playwright cache
rm -rf .playwright

# Node modules (last resort)
rm -rf node_modules && yarn install
```

### Run Tests in Isolation

```bash
# Single test file
npx playwright test tests/e2e/auth.spec.ts

# Single test by name
npx playwright test -g "should login successfully"

# Single browser
npx playwright test --project=chromium
```

---

## Getting Help

### Before Asking for Help

1. Check this troubleshooting guide
2. Search existing GitHub issues
3. Review test output and logs carefully
4. Try to reproduce in isolation
5. Check if issue is environment-specific

### When Reporting Issues

Include:
- [ ] Full error message and stack trace
- [ ] Test file and line number
- [ ] Local vs CI environment
- [ ] Steps to reproduce
- [ ] What you've already tried
- [ ] Relevant logs from `docker logs` or CI

### Useful Log Files

```bash
# Playwright traces
test-results/*/trace.zip

# Docker logs
docker-compose logs > docker-logs.txt

# CI artifacts
gh run download <run-id>
```

---

**Document maintained by:** QA Engineering Team
**Last reviewed:** 2026-01-19
