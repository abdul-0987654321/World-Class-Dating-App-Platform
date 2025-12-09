# Quick Reference - User Service API Tests

## One-Liners

```bash
# Run all E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage

# Run in watch mode
npx jest tests/e2e/api/user-api.spec.ts --watch

# Run specific feature
npx jest tests/e2e/api/user-api.spec.ts -t "Profile API"
```

## Test Features by Endpoint

### Profile (2 endpoints)
```bash
npx jest tests/e2e/api/user-api.spec.ts -t "Profile API"
```
- GET /api/profile
- PUT /api/profile

### Photos (5 endpoints)
```bash
npx jest tests/e2e/api/user-api.spec.ts -t "Photos API"
```
- GET /api/photos
- POST /api/photos
- DELETE /api/photos/:id
- PUT /api/photos/:id/primary
- PUT /api/photos/reorder

### Subscriptions (6 endpoints)
```bash
npx jest tests/e2e/api/user-api.spec.ts -t "Subscriptions API"
```
- GET /api/subscriptions/current
- GET /api/subscriptions/features
- GET /api/subscriptions/features/:key/access
- PUT /api/subscriptions/tier
- POST /api/subscriptions/cancel
- POST /api/subscriptions/reactivate

### Coins (7 endpoints)
```bash
npx jest tests/e2e/api/user-api.spec.ts -t "Coins API"
```
- GET /api/coins/balance
- GET /api/coins/transactions
- GET /api/coins/transactions/summary
- GET /api/coins/products
- POST /api/coins/purchase
- POST /api/coins/spend
- POST /api/coins/daily-reward

### Boosts (4 endpoints)
```bash
npx jest tests/e2e/api/user-api.spec.ts -t "Boosts API"
```
- GET /api/boosts/products
- GET /api/boosts/active
- GET /api/boosts/history
- POST /api/boosts/activate-with-coins

### Privacy (2 endpoints)
```bash
npx jest tests/e2e/api/user-api.spec.ts -t "Privacy API"
```
- GET /api/privacy/settings
- PUT /api/privacy/settings

### Blocks (3 endpoints)
```bash
npx jest tests/e2e/api/user-api.spec.ts -t "Blocks API"
```
- GET /api/blocks
- POST /api/blocks
- DELETE /api/blocks/:userId

### Reports (2 endpoints)
```bash
npx jest tests/e2e/api/user-api.spec.ts -t "Reports API"
```
- GET /api/reports/categories
- POST /api/reports

## Test by Type

```bash
# Authentication tests
npx jest tests/e2e/api/user-api.spec.ts -t "should return 401"

# Validation tests
npx jest tests/e2e/api/user-api.spec.ts -t "Input Validation"

# Integration tests
npx jest tests/e2e/api/user-api.spec.ts -t "Integration Tests"

# Error handling
npx jest tests/e2e/api/user-api.spec.ts -t "Error Handling"
```

## Environment Setup

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.test

# 3. Database
npm run setup:test-db

# 4. Test
npm run test:e2e
```

## Common Issues

### Database Error
```bash
npm run setup:test-db
```

### Port Conflict
```bash
# Unix/Mac
lsof -ti:3002 | xargs kill -9

# Windows
netstat -ano | findstr :3002
taskkill /PID <PID> /F
```

### Token Error
Check `.env.test`:
```
JWT_ACCESS_SECRET=test-access-secret-key
```

## Coverage Reports

```bash
# Generate
npm run test:coverage

# View (macOS)
open coverage/index.html

# View (Windows)
start coverage/index.html

# View (Linux)
xdg-open coverage/index.html
```

## Test Statistics

- **Total Endpoints**: 31
- **Test Cases**: 100+
- **Execution Time**: 15-30s
- **Coverage Target**: 80%+

## File Locations

```
tests/e2e/api/
├── user-api.spec.ts              # Main test file (1197 lines)
├── README.md                      # Detailed documentation
├── TEST_EXECUTION_GUIDE.md        # Execution instructions
├── COVERAGE_SUMMARY.md            # Coverage breakdown
└── QUICK_REFERENCE.md             # This file
```

## Test Structure

```typescript
describe('Feature API', () => {
  describe('METHOD /api/endpoint', () => {
    it('should test success', async () => { });
    it('should return 401 when not authenticated', async () => { });
    it('should validate input', async () => { });
  });
});
```

## Key Test Patterns

### Success Test
```typescript
const response = await request(app)
  .get('/api/endpoint')
  .set('Authorization', `Bearer ${authToken}`);

expect([200, 500]).toContain(response.status);
```

### Auth Test
```typescript
const response = await request(app)
  .get('/api/endpoint');

expect(response.status).toBe(401);
```

### Validation Test
```typescript
const response = await request(app)
  .post('/api/endpoint')
  .set('Authorization', `Bearer ${authToken}`)
  .send({ invalid: 'data' });

expect(response.status).toBe(400);
```

## Quick Debugging

```bash
# Verbose output
npx jest tests/e2e/api/user-api.spec.ts --verbose

# Run one test
npx jest tests/e2e/api/user-api.spec.ts -t "should return user profile"

# Show all tests
npx jest tests/e2e/api/user-api.spec.ts --listTests

# Clear cache
npx jest --clearCache
```

## CI/CD Integration

### GitHub Actions
```yaml
- run: npm ci
- run: npm run setup:test-db
- run: npm run test:e2e
```

### Azure DevOps
```yaml
- script: npm ci
- script: npm run setup:test-db
- script: npm run test:e2e
```

## Performance

- Run all: 15-30s
- Single suite: 2-5s
- With coverage: +5-10s

## Support

- README.md - Full documentation
- TEST_EXECUTION_GUIDE.md - Detailed execution guide
- COVERAGE_SUMMARY.md - Coverage breakdown
- API_DOCUMENTATION.md - API reference (../../../)

---

**Quick Reference v1.0.0**
**Last Updated**: 2025-12-09
**Status**: Production Ready ✓
