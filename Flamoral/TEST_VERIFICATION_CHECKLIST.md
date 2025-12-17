# Test Configuration Verification Checklist

Use this checklist to verify that all test configuration fixes are working correctly.

## Pre-Flight Checks

### Environment Setup
- [ ] Docker Desktop is installed and running
- [ ] Node.js 20+ is installed
  ```bash
  node --version  # Should show v20.x.x or higher
  ```
- [ ] Yarn is installed
  ```bash
  yarn --version  # Should show 1.22.x or higher
  ```

### Project Setup
- [ ] All dependencies are installed
  ```bash
  yarn install
  ```
- [ ] Shared packages are built
  ```bash
  yarn build:packages
  ```

## Jest Configuration Verification

### Main Backend Config
- [ ] `backend/jest.config.js` exists
- [ ] Contains `@flamoral/shared` module mapper
- [ ] Coverage threshold is set to 70%
- [ ] Transform config includes TypeScript

**Verify:**
```bash
cd backend
cat jest.config.js | grep "@flamoral/shared"
```

### Integration Test Config
- [ ] `backend/tests/jest.config.integration.js` exists
- [ ] Contains comprehensive module mappers
- [ ] Setup file points to `integration/setup.ts`
- [ ] Test timeout is 30000ms or higher

**Verify:**
```bash
cd backend/tests
cat jest.config.integration.js | grep "setupFilesAfterEnv"
```

### E2E Test Config
- [ ] `backend/tests/jest.config.e2e.js` exists
- [ ] Setup file points to `e2e/jest-setup.ts`
- [ ] Test timeout is 60000ms
- [ ] maxWorkers is set to 1

**Verify:**
```bash
cd backend/tests
cat jest.config.e2e.js | grep "jest-setup"
```

### Service-Level Configs
- [ ] Auth service Jest config has module mappers
- [ ] User service Jest config has module mappers
- [ ] Payment service Jest config has module mappers
- [ ] Matching service Jest config has module mappers
- [ ] Messaging service Jest config has module mappers
- [ ] Media service Jest config has module mappers
- [ ] Analytics service Jest config has module mappers
- [ ] Moderation service Jest config has module mappers

**Verify:**
```bash
cd backend/services/auth-service
cat jest.config.js | grep "@flamoral/shared"
```

## Test Setup File Verification

### Main Setup File
- [ ] `backend/tests/setup.ts` exists
- [ ] Contains JWT environment variables
- [ ] Contains @flamoral/shared mock
- [ ] Has proper cleanup in afterAll

**Verify:**
```bash
cd backend/tests
cat setup.ts | grep "JWT_ACCESS_SECRET"
cat setup.ts | grep "@flamoral/shared"
```

### E2E Jest Setup
- [ ] `backend/tests/e2e/jest-setup.ts` exists
- [ ] Does NOT contain Playwright imports
- [ ] Contains database connection utilities
- [ ] Has proper cleanup in afterAll

**Verify:**
```bash
cd backend/tests/e2e
ls -la | grep "jest-setup.ts"
cat jest-setup.ts | grep "Pool"
```

## Environment Variable Verification

### Backend .env.test
- [ ] `backend/.env.test` exists
- [ ] PostgreSQL port is 5433
- [ ] Redis port is 6380
- [ ] MongoDB port is 27018
- [ ] RabbitMQ port is 5673
- [ ] Contains JWT secrets (min 32 chars)

**Verify:**
```bash
cd backend
cat .env.test | grep "DB_PORT=5433"
cat .env.test | grep "REDIS_PORT=6380"
cat .env.test | grep "JWT_ACCESS_SECRET"
```

### Integration Test .env.test
- [ ] `backend/tests/.env.test` exists
- [ ] Contains TEST_DB_HOST
- [ ] Contains TEST_REDIS_HOST
- [ ] Contains database aliases (DB_HOST, etc.)
- [ ] USE_DOCKER_COMPOSE is true

**Verify:**
```bash
cd backend/tests
cat .env.test | grep "TEST_DB_PORT=5433"
cat .env.test | grep "USE_DOCKER_COMPOSE=true"
```

## Docker Compose Verification

### Docker Compose File
- [ ] `docker-compose.test.yml` exists
- [ ] Contains postgres-test service
- [ ] Contains redis-test service
- [ ] Contains mongodb-test service
- [ ] Contains rabbitmq-test service
- [ ] Contains elasticsearch-test service
- [ ] Contains minio-test service
- [ ] Contains mailhog service

**Verify:**
```bash
cat docker-compose.test.yml | grep "postgres-test"
cat docker-compose.test.yml | grep "5433:5432"
```

### Start Docker Services
- [ ] All services start successfully
  ```bash
  yarn docker:test:up
  ```
- [ ] All services are healthy
  ```bash
  docker-compose -f docker-compose.test.yml ps
  ```
- [ ] PostgreSQL is accessible on port 5433
  ```bash
  docker exec -it flamoral-postgres-test psql -U postgres -d flamoral_test -c "SELECT 1"
  ```
- [ ] Redis is accessible on port 6380
  ```bash
  docker exec -it flamoral-redis-test redis-cli ping
  ```

## Test Execution Verification

### Unit Tests
- [ ] Backend unit tests run without errors
  ```bash
  yarn test:backend
  ```
- [ ] No module resolution errors
- [ ] No environment variable errors
- [ ] Mocks are working correctly

### Integration Tests
- [ ] Integration tests run without errors
  ```bash
  yarn test:integration
  ```
- [ ] Can connect to test database
- [ ] Can connect to test Redis
- [ ] Tests clean up properly

### E2E Tests
- [ ] E2E tests run without errors
  ```bash
  yarn test:backend:e2e
  ```
- [ ] Database connections work
- [ ] No Playwright import errors in Jest tests

### Coverage Reports
- [ ] Coverage reports generate successfully
  ```bash
  yarn test:backend:coverage
  ```
- [ ] Coverage thresholds are met (70%)
- [ ] HTML report is created

## Service-Specific Test Verification

### Auth Service
- [ ] Auth service tests run
  ```bash
  cd backend/services/auth-service && npm test
  ```
- [ ] JWT mocks work correctly
- [ ] No module resolution errors

### User Service
- [ ] User service tests run
  ```bash
  cd backend/services/user-service && npm test
  ```
- [ ] Database mocks work correctly

### Payment Service
- [ ] Payment service tests run
  ```bash
  cd backend/services/payment-service && npm test
  ```
- [ ] Stripe mocks work correctly

### Matching Service
- [ ] Matching service tests run
  ```bash
  cd backend/services/matching-service && npm test
  ```

### Messaging Service
- [ ] Messaging service tests run
  ```bash
  cd backend/services/messaging-service && npm test
  ```

### Media Service
- [ ] Media service tests run
  ```bash
  cd backend/services/media-service && npm test
  ```
- [ ] Azure storage mocks work

### Analytics Service
- [ ] Analytics service tests run
  ```bash
  cd backend/services/analytics-service && npm test
  ```

### Moderation Service
- [ ] Moderation service tests run
  ```bash
  cd backend/services/moderation-service && npm test
  ```

## Cleanup Verification

### After Tests
- [ ] No open handles warnings
- [ ] No memory leaks
- [ ] All connections closed properly
- [ ] Docker containers still healthy

### Stop Services
- [ ] Services stop cleanly
  ```bash
  yarn docker:test:down
  ```
- [ ] All containers removed
- [ ] Volumes removed (when using -v flag)

## Documentation Verification

### Documentation Files
- [ ] `TEST_CONFIGURATION_FIXES.md` exists
- [ ] `TESTING_QUICK_START.md` exists
- [ ] `TEST_FIXES_SUMMARY.md` exists
- [ ] `TEST_VERIFICATION_CHECKLIST.md` exists (this file)

### Documentation Accuracy
- [ ] All port numbers match Docker Compose
- [ ] All commands work as documented
- [ ] Troubleshooting steps are accurate

## Issue Checklist

If you encounter issues, check:

### Module Resolution Errors
- [ ] Check jest.config.js has correct module mappers
- [ ] Verify @flamoral/shared path is correct
- [ ] Ensure shared packages are built

### Database Connection Errors
- [ ] Verify Docker containers are running
- [ ] Check port numbers in .env.test
- [ ] Verify PostgreSQL is healthy
- [ ] Check DATABASE_URL format

### Redis Connection Errors
- [ ] Verify Redis container is running
- [ ] Check Redis port (6380)
- [ ] Test with redis-cli

### Environment Variable Errors
- [ ] Verify .env.test files exist
- [ ] Check JWT_ACCESS_SECRET is set
- [ ] Verify all required variables are present

### Mock Errors
- [ ] Check @flamoral/shared mock in setup files
- [ ] Verify jest.mock() syntax is correct
- [ ] Ensure mocks are before imports

### Timeout Errors
- [ ] Increase testTimeout in jest.config.js
- [ ] Check if services are slow to start
- [ ] Verify health checks pass

## Final Verification

### All Systems Go
- [ ] All Jest configs verified
- [ ] All setup files verified
- [ ] All environment files verified
- [ ] Docker Compose services running
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Coverage reports generated
- [ ] Documentation complete

### Sign-Off
- [ ] Tests run successfully in local environment
- [ ] Tests run successfully in CI/CD (if applicable)
- [ ] All team members can run tests
- [ ] Documentation is clear and accurate

## Quick Test Run

Run this sequence to verify everything works:

```bash
# 1. Start services
yarn docker:test:up

# 2. Wait for health checks (30 seconds)
sleep 30

# 3. Verify services
docker-compose -f docker-compose.test.yml ps

# 4. Run tests
yarn test:backend

# 5. Run integration tests
yarn test:integration

# 6. Check coverage
yarn test:backend:coverage

# 7. Stop services
yarn docker:test:down
```

**Expected Result:** All tests pass ✅

## Status

- [ ] All checks passed
- [ ] Ready for development
- [ ] Ready for CI/CD integration

---

**Verification Date:** _____________

**Verified By:** _____________

**Notes:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
