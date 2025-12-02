# Test Commands Cheatsheet

Quick reference for common testing commands in the Flamoral platform.

---

## Quick Commands

### Run All Tests
```bash
npm test                      # Run all tests
npm run test:coverage        # Run with coverage report
npm run test:watch           # Watch mode
```

### Run by Type
```bash
npm run test:unit            # Unit tests only
npm run test:integration     # Integration tests only
npm run test:e2e             # E2E tests only
```

### Run by Service
```bash
cd backend/services/auth-service && npm test
cd backend/services/matching-service && npm test
cd backend/services/messaging-service && npm test
cd backend/services/payment-service && npm test
cd backend/services/user-service && npm test
```

---

## Coverage Commands

```bash
# Generate coverage
npm run test:coverage

# View HTML report
open coverage/index.html              # macOS
start coverage/index.html             # Windows
xdg-open coverage/index.html          # Linux

# Coverage summary
npm test -- --coverage --coverageReporters=text

# Coverage for specific service
cd backend/services/auth-service
npm test -- --coverage
```

---

## E2E Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (headed mode)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Specific browser
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit

# View last report
npm run test:e2e:report
```

---

## Specific Test Commands

```bash
# Run specific file
npm test -- auth.service.test.ts

# Run specific test suite
npm test -- --testNamePattern="login"

# Run tests matching pattern
npm test -- --testPathPattern=auth

# Run single test
npm test -- -t "should register user successfully"
```

---

## Debug Commands

```bash
# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Debug specific test
node --inspect-brk node_modules/.bin/jest auth.service.test.ts

# Verbose output
npm test -- --verbose

# Show full error traces
npm test -- --no-coverage --detectOpenHandles
```

---

## Watch Mode Commands

```bash
# Watch all tests
npm test -- --watch

# Watch specific file
npm test -- auth.service.test.ts --watch

# Update snapshots
# Press 'u' in watch mode
# Or:
npm test -- -u
```

---

## CI/CD Commands

```bash
# Run in CI mode (no watch, coverage enforced)
CI=true npm test

# Generate coverage for CI
npm run test:coverage -- --ci

# Run with coverage threshold check
npm test -- --coverage --coverageThreshold='{"global":{"branches":80}}'
```

---

## Performance Commands

```bash
# Run tests in parallel (default)
npm test

# Run tests serially (for debugging)
npm test -- --runInBand

# Limit workers
npm test -- --maxWorkers=2

# Silent mode (faster)
npm test -- --silent
```

---

## Cache Commands

```bash
# Clear Jest cache
npm test -- --clearCache

# No cache
npm test -- --no-cache
```

---

## Common Flags

```bash
--coverage              # Generate coverage report
--watch                 # Watch for changes
--verbose               # Detailed output
--silent                # Minimal output
--runInBand            # Run serially
--maxWorkers=N         # Limit parallel workers
--testPathPattern      # Filter by file path
--testNamePattern      # Filter by test name
-u, --updateSnapshot   # Update snapshots
--clearCache           # Clear Jest cache
--detectOpenHandles    # Detect async operations
--forceExit            # Force exit after tests
--bail                 # Exit on first failure
```

---

## Load Testing Commands

```bash
# Auth load test
npm run test:load:auth

# Matching load test
npm run test:load:matching

# WebSocket load test
npm run test:load:websocket

# All load tests
npm run test:load:all
```

---

## Service-Specific Commands

### Auth Service
```bash
cd backend/services/auth-service

npm test                              # All tests
npm run test:unit                     # Unit tests
npm run test:integration              # Integration tests
npm test -- auth.service.test.ts      # Specific file
npm test -- --coverage                # With coverage
```

### Matching Service
```bash
cd backend/services/matching-service

npm test
npm run test:unit
npm test -- swipe.service.test.ts
```

### Messaging Service
```bash
cd backend/services/messaging-service

npm test
npm run test:unit
npm test -- message.service.test.ts
```

### Payment Service
```bash
cd backend/services/payment-service

npm test
npm run test:unit
npm test -- subscription.service.test.ts
```

---

## Mobile App Tests

```bash
cd apps/mobile

# iOS
npm run test:ios

# Android
npm run test:android

# Component tests
npm run test:components

# Integration tests
npm run test:integration
```

---

## Docker Test Commands

```bash
# Run tests in Docker
docker-compose run --rm test npm test

# With coverage
docker-compose run --rm test npm run test:coverage

# Specific service
docker-compose run --rm test npm test -- auth.service.test.ts
```

---

## Git Hooks

```bash
# Run pre-commit tests
npm run pre-commit

# Run pre-push tests
npm run pre-push

# Skip hooks (not recommended)
git commit --no-verify
```

---

## Coverage Reports

```bash
# Text summary
npm test -- --coverage --coverageReporters=text

# HTML report
npm test -- --coverage --coverageReporters=html

# JSON report
npm test -- --coverage --coverageReporters=json

# LCOV report (for CI)
npm test -- --coverage --coverageReporters=lcov

# All reporters
npm run test:coverage
```

---

## Useful Combinations

```bash
# Fast test run (no coverage, serial)
npm test -- --runInBand --no-coverage

# Full test with coverage and verbose output
npm test -- --coverage --verbose

# Debug failing test
node --inspect-brk node_modules/.bin/jest --runInBand -t "test name"

# Update snapshots and run specific file
npm test -- auth.service.test.ts -u

# Run only changed files
npm test -- --onlyChanged

# Continuous testing during development
npm test -- --watch --coverage
```

---

## Environment Variables

```bash
# Set NODE_ENV
NODE_ENV=test npm test

# Custom test database
DATABASE_URL=postgresql://localhost:5432/test_db npm test

# Debug mode
DEBUG=* npm test

# Skip integration tests
SKIP_INTEGRATION=true npm test

# Use mock services
USE_MOCKS=true npm test
```

---

## Quick Troubleshooting

```bash
# Clear everything and restart
npm run test:clean
npm install
npm test -- --clearCache

# Check for open handles
npm test -- --detectOpenHandles --forceExit

# Verbose debugging
DEBUG=* npm test -- --verbose --no-coverage

# Find which test is hanging
npm test -- --runInBand --verbose
```

---

## Aliases (Add to .bashrc or .zshrc)

```bash
# Test aliases
alias t='npm test'
alias tw='npm test -- --watch'
alias tc='npm run test:coverage'
alias te2e='npm run test:e2e'

# Service test aliases
alias tauth='cd backend/services/auth-service && npm test'
alias tmatch='cd backend/services/matching-service && npm test'
alias tmsg='cd backend/services/messaging-service && npm test'
alias tpay='cd backend/services/payment-service && npm test'
```

---

## VS Code Tasks (tasks.json)

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Run Tests",
      "type": "npm",
      "script": "test",
      "problemMatcher": [],
      "group": {
        "kind": "test",
        "isDefault": true
      }
    },
    {
      "label": "Run Tests with Coverage",
      "type": "npm",
      "script": "test:coverage",
      "problemMatcher": []
    },
    {
      "label": "Run E2E Tests",
      "type": "npm",
      "script": "test:e2e",
      "problemMatcher": []
    }
  ]
}
```

---

**Tip:** Pin this file for quick reference during development!

**Last Updated:** December 2, 2025
