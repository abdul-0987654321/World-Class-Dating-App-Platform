# Test Configuration Quick Reference

## Test Commands

### Run All Tests
```bash
npm test
```

### Run Specific Test Types
```bash
# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Contract tests
npm run test:contract

# Security tests
npm run test:security

# With coverage
npm run test:coverage
```

### Run Service-Specific Tests
```bash
cd backend/services/<service-name>
npm test
```

### Run Playwright E2E
```bash
npx playwright test
```

---

## Docker Compose Test Services

### Start Test Dependencies
```bash
docker-compose -f docker-compose.test.yml up -d
```

### Stop Test Dependencies
```bash
docker-compose -f docker-compose.test.yml down
```

### Test Service Ports
- **PostgreSQL:** localhost:5433
- **Redis:** localhost:6380
- **MongoDB:** localhost:27018
- **RabbitMQ:** localhost:5673
- **MinIO:** localhost:9000
- **MailHog SMTP:** localhost:1025
- **MailHog Web:** localhost:8025

---

## Module Path Mappings

### In Service Jest Configs:
```javascript
{
  '^@/(.*)$': '<rootDir>/src/$1',
  '^@flamoral/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
  '^@flamoral/utils$': '<rootDir>/../../../packages/shared/utils/src/index.ts',
  '^@flamoral/types$': '<rootDir>/../../../packages/shared/types/src/index.ts',
  '^@flamoral/constants$': '<rootDir>/../../../packages/shared/constants/src/index.ts',
  '^@flamoral/validators$': '<rootDir>/../../../packages/shared/validators/src/index.ts',
}
```

### In Backend Jest Configs:
```javascript
{
  '^@/(.*)$': '<rootDir>/services/$1/src/$1',
  '^@flamoral/shared$': '<rootDir>/../packages/shared/src/index.ts',
  '^@flamoral/utils$': '<rootDir>/../packages/shared/utils/src/index.ts',
  // etc.
}
```

---

## Test Environment Files

### Backend Level:
- `backend/.env.test` - Main test environment
- `backend/tests/.env.test` - Integration test specific

### Service Level:
- `backend/services/<service>/.env.test` - Service-specific test env

### Key Environment Variables:
```bash
NODE_ENV=test
LOG_LEVEL=error

# Database (Docker Compose test port)
DB_HOST=localhost
DB_PORT=5433
DB_NAME=flamoral_test
DB_USER=postgres
DB_PASSWORD=test_password
DATABASE_URL=postgresql://postgres:test_password@localhost:5433/flamoral_test

# Redis (Docker Compose test port)
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_DB=1
REDIS_URL=redis://localhost:6380/1
```

---

## Test File Structure

### Unit Tests:
```
backend/services/<service>/
  ├── src/
  │   └── __tests__/          # Inline unit tests
  │       ├── *.test.ts
  │       └── setup.ts
  └── tests/                   # Standalone unit tests
      ├── *.test.ts
      └── setup.ts
```

### Integration Tests:
```
backend/tests/integration/
  ├── *.test.ts
  └── setup.ts
```

### E2E Tests (Jest):
```
backend/tests/e2e/
  ├── *.test.ts
  └── setup.ts
```

### E2E Tests (Playwright):
```
backend/tests/e2e/
  ├── scenarios/
  │   └── *.spec.ts
  └── playwright.config.ts
```

---

## Coverage Thresholds

### Unit Tests:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

### Integration Tests:
- Branches: 60%
- Functions: 60%
- Lines: 60%
- Statements: 60%

---

## Test Timeouts

### Unit Tests:
- Default: 10000ms (10 seconds)

### Integration Tests:
- Default: 60000ms (60 seconds)

### E2E Tests:
- Jest: 120000ms (120 seconds)
- Playwright: 60000ms (60 seconds)

### Contract Tests:
- Default: 60000ms (60 seconds)

### Security Tests:
- Default: 30000ms (30 seconds)

---

## Common Issues & Solutions

### Module Not Found
**Problem:** Cannot find module '@flamoral/shared'
**Solution:** Check moduleNameMapper paths in jest.config.js

### Database Connection Error
**Problem:** Connection refused to PostgreSQL
**Solution:**
1. Start Docker Compose: `docker-compose -f docker-compose.test.yml up -d`
2. Verify port 5433 is correct in .env.test

### Test Timeout
**Problem:** Test exceeded timeout
**Solution:** Increase testTimeout in jest config or check for unresolved promises

### Coverage Not Met
**Problem:** Coverage threshold not met
**Solution:** Add tests or temporarily adjust thresholds in jest.config.js

---

## Debugging Tests

### Run Single Test File:
```bash
npx jest path/to/test.test.ts
```

### Run Tests in Watch Mode:
```bash
npm test -- --watch
```

### Run Tests with Verbose Output:
```bash
npm test -- --verbose
```

### Debug with Node Inspector:
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### View Coverage Report:
```bash
npm run test:coverage
open coverage/index.html
```

---

## CI/CD Integration

### GitHub Actions:
```yaml
- name: Run Tests
  run: |
    docker-compose -f docker-compose.test.yml up -d
    npm run test:coverage
    docker-compose -f docker-compose.test.yml down
```

### Azure DevOps:
```yaml
- script: |
    docker-compose -f docker-compose.test.yml up -d
    npm run test:coverage
    docker-compose -f docker-compose.test.yml down
  displayName: 'Run Tests'
```

---

## Files Reference

### Main Config Files:
- `/jest.config.js` - Root Jest config
- `/backend/jest.config.js` - Backend Jest config
- `/playwright.config.ts` - Root Playwright config

### Test Type Configs:
- `/backend/tests/jest.config.integration.js`
- `/backend/tests/jest.config.e2e.js`
- `/backend/tests/jest.config.contract.js`
- `/backend/tests/jest.config.security.js`

### Service Configs:
- `/backend/services/<service>/jest.config.js`
- `/backend/services/<service>/tests/setup.ts`

---

## Best Practices

1. **Always start Docker Compose** before running integration/E2E tests
2. **Use appropriate test types** - unit for logic, integration for workflows, E2E for user journeys
3. **Mock external services** in unit tests
4. **Use real services** in integration tests (via Docker Compose)
5. **Keep tests isolated** - each test should be independent
6. **Clean up resources** - close connections, clear mocks in afterEach
7. **Use meaningful test names** - describe what is being tested
8. **Follow AAA pattern** - Arrange, Act, Assert
9. **Maintain test coverage** - aim for thresholds across all services
10. **Run tests before commits** - use pre-commit hooks

---

**For full details, see TEST_CONFIGURATION_FIXES_COMPLETE.md**
