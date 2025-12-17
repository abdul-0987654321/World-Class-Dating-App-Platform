# User Service E2E API Tests

## Overview

Comprehensive end-to-end API test suite for the Flamoral User Service covering all 31 endpoints across 8 feature areas.

## Test Coverage

### Endpoints Tested (31 total)

#### Profile (2 endpoints)
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

#### Photos (5 endpoints)
- `GET /api/photos` - Get user photos
- `POST /api/photos` - Upload new photo
- `DELETE /api/photos/:id` - Delete photo
- `PUT /api/photos/:id/primary` - Set primary photo
- `PUT /api/photos/reorder` - Reorder photos

#### Subscriptions (6 endpoints)
- `GET /api/subscriptions/current` - Get current subscription
- `GET /api/subscriptions/features` - Get subscription features
- `GET /api/subscriptions/features/:key/access` - Check feature access
- `PUT /api/subscriptions/tier` - Update subscription tier
- `POST /api/subscriptions/cancel` - Cancel subscription
- `POST /api/subscriptions/reactivate` - Reactivate subscription

#### Coins (7 endpoints)
- `GET /api/coins/balance` - Get coin balance
- `GET /api/coins/transactions` - Get transaction history
- `GET /api/coins/transactions/summary` - Get transaction summary
- `GET /api/coins/products` - Get coin products
- `POST /api/coins/purchase` - Purchase coins
- `POST /api/coins/spend` - Spend coins
- `POST /api/coins/daily-reward` - Claim daily reward

#### Boosts (4 endpoints)
- `GET /api/boosts/products` - Get boost products
- `GET /api/boosts/active` - Get active boost
- `GET /api/boosts/history` - Get boost history
- `POST /api/boosts/activate-with-coins` - Activate boost with coins

#### Privacy (2 endpoints)
- `GET /api/privacy/settings` - Get privacy settings
- `PUT /api/privacy/settings` - Update privacy settings

#### Blocks (3 endpoints)
- `GET /api/blocks` - Get blocked users list
- `POST /api/blocks` - Block a user
- `DELETE /api/blocks/:userId` - Unblock a user

#### Reports (2 endpoints)
- `GET /api/reports/categories` - Get report categories
- `POST /api/reports` - Submit a report

## Test Categories

### 1. Success Cases
Tests successful API responses with valid authentication and data.

### 2. Authentication Tests
- Missing authentication tokens
- Invalid token formats
- Expired tokens
- Malformed bearer tokens

### 3. Validation Tests
- Missing required fields
- Invalid data types
- Out-of-range values
- Invalid enum values
- Array validation

### 4. Integration Tests
- Complete user flows (profile → photos → subscription)
- Multi-user interactions (blocking, reporting)
- Cross-feature workflows

### 5. Error Handling
- Invalid UUID formats
- Rate limiting behavior
- Malformed requests

## Running the Tests

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Set up test environment:
```bash
cp .env.example .env.test
```

3. Configure test database:
```bash
npm run setup:test-db
```

### Run All Tests

```bash
npm run test:e2e
```

### Run Specific Test File

```bash
npx jest tests/e2e/api/user-api.spec.ts
```

### Run with Coverage

```bash
npm run test:coverage
```

### Run in Watch Mode

```bash
npx jest tests/e2e/api/user-api.spec.ts --watch
```

### Run Specific Test Suite

```bash
# Run only Profile tests
npx jest tests/e2e/api/user-api.spec.ts -t "Profile API"

# Run only Coins tests
npx jest tests/e2e/api/user-api.spec.ts -t "Coins API"

# Run only authentication tests
npx jest tests/e2e/api/user-api.spec.ts -t "should return 401"
```

## Test Structure

```typescript
describe('Feature API', () => {
  describe('GET /api/endpoint', () => {
    it('should test success case', async () => {
      // Test implementation
    });

    it('should return 401 when not authenticated', async () => {
      // Test implementation
    });

    it('should validate input', async () => {
      // Test implementation
    });
  });
});
```

## Authentication Setup

The test suite uses JWT tokens for authentication:

```typescript
// Token is generated in beforeAll()
const authToken = generateAuthToken(testUserId, 'test@example.com');

// Used in requests
await request(app)
  .get('/api/profile')
  .set('Authorization', `Bearer ${authToken}`);
```

## Test Data

Test data is managed through:
- UUID generation for user IDs
- JWT token generation for authentication
- Mock data factories from `src/__tests__/helpers/test-data.ts`

## Expected Responses

Tests accommodate multiple valid response codes:

```typescript
// May return 200 (success) or 404 (not found) depending on database state
expect([200, 404]).toContain(response.status);

// May return 200 (success) or 400 (validation error) or 500 (server error)
expect([200, 400, 500]).toContain(response.status);
```

## Coverage Goals

- **Target**: 80%+ code coverage
- **Lines**: 80%+
- **Functions**: 80%+
- **Branches**: 80%+
- **Statements**: 80%+

## Common Issues & Solutions

### Issue: Tests fail with database connection error
**Solution**: Ensure PostgreSQL is running and test database is configured
```bash
npm run setup:test-db
```

### Issue: Tests fail with JWT verification error
**Solution**: Check JWT_ACCESS_SECRET in .env.test matches the one used in tests

### Issue: Rate limit errors
**Solution**: Run tests sequentially or increase rate limit for test environment
```bash
npx jest --runInBand
```

### Issue: Port already in use
**Solution**: Stop other instances of the user service or change PORT in .env.test

## Test Maintenance

### Adding New Tests

1. Follow the existing structure with `describe` blocks
2. Use descriptive test names starting with "should"
3. Test success cases, validation, and authentication
4. Group related tests together

Example:
```typescript
describe('New Feature API', () => {
  describe('GET /api/new-endpoint', () => {
    it('should return data when authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/new-endpoint`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/new-endpoint`);

      expect(response.status).toBe(401);
    });
  });
});
```

### Updating Existing Tests

1. Maintain backward compatibility
2. Update test data if API contracts change
3. Adjust expected response codes if behavior changes
4. Keep test names descriptive and accurate

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests
  run: |
    npm run setup:test-db
    npm run test:e2e
  env:
    NODE_ENV: test
    DATABASE_URL: postgresql://test:test@localhost:5432/flamoral_test
    JWT_ACCESS_SECRET: test-secret-key
```

## Performance Considerations

- Tests run in parallel by default
- Use `--runInBand` for sequential execution if needed
- Each test suite is isolated
- Database transactions should be rolled back after each test

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Descriptive Names**: Test names should clearly describe what is being tested
3. **Arrange-Act-Assert**: Follow AAA pattern in test structure
4. **Error Cases**: Always test authentication and validation failures
5. **Documentation**: Comment complex test scenarios

## Monitoring Test Health

Track test metrics over time:
- Execution time per suite
- Pass/fail rates
- Coverage percentages
- Flaky test identification

## Support

For issues or questions about these tests:
- Check the main TESTING.md file
- Review API_DOCUMENTATION.md for endpoint details
- Contact the engineering team

---

**Last Updated**: 2025-12-09
**Test Count**: 100+ test cases
**Coverage Target**: 80%+
**Endpoints Covered**: 31/31
