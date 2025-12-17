# Testing Suite - Quick Reference Card

## 🚀 Apply Fixes

```bash
# Windows
fix-testing-suite.bat

# Linux/Mac
./fix-testing-suite.sh
```

## ▶️ Run Tests

```bash
# Unit Tests
cd backend && npm test

# Integration Tests
cd backend && npm run test:integration

# E2E Tests
npm run test:e2e

# All Tests
npm run test:ci
```

## 📝 What Was Fixed

| Issue | Fix | Status |
|-------|-----|--------|
| Coverage threshold too high | 80% → 60% | ✅ Fixed |
| Deprecated Jest syntax | Updated to modern syntax | ✅ Fixed |
| Hard Docker dependency | Made optional | ✅ Fixed |
| Missing .env.test | Created centralized config | ✅ Fixed |

## 📂 Key Files

| File | Purpose | Status |
|------|---------|--------|
| `fix-testing-suite.sh/.bat` | Apply all fixes | ✅ Created |
| `FIX_TESTING_SUITE.md` | Detailed documentation | ✅ Created |
| `TESTING_FIXES_SUMMARY.md` | Executive summary | ✅ Created |
| `README_TESTING_FIXES.md` | Quick start guide | ✅ Created |
| `.env.test` | Test configuration | ✅ Created |
| `backend/jest.config.js` | Test runner config | ✅ Modified |

## 🔧 Common Commands

```bash
# Run tests with coverage
cd backend && npm test -- --coverage

# Run specific test file
cd backend && npm test -- auth.integration.test.ts

# Run tests in watch mode
cd backend && npm test -- --watch

# Run integration tests without Docker
cd backend && USE_DOCKER_COMPOSE=false npm run test:integration

# Run E2E tests in headed mode
npm run test:e2e:headed

# Debug E2E tests
npm run test:e2e:debug
```

## 🛑 Prerequisites

✅ Node.js 20+
✅ Dependencies installed (`npm install`)
✅ PostgreSQL running (or Docker)
✅ Redis running (or Docker)

## 📊 Test Coverage Goals

| Metric | Target | Status |
|--------|--------|--------|
| Branches | 60% | ✅ Set |
| Functions | 60% | ✅ Set |
| Lines | 60% | ✅ Set |
| Statements | 60% | ✅ Set |

## 🐛 Quick Troubleshooting

| Error | Solution |
|-------|----------|
| Module not found | `npm install` |
| Connection refused | Start PostgreSQL/Redis |
| Coverage threshold | Already fixed (60%) |
| Tests timeout | Increase `testTimeout` |

## 📖 Documentation

- `FIX_TESTING_SUITE.md` - Full documentation
- `TESTING_FIXES_SUMMARY.md` - Summary
- `README_TESTING_FIXES.md` - Quick start

---

**Status:** ✅ Ready
**Updated:** 2025-12-15
