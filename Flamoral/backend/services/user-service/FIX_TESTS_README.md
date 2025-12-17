# Fix User Service Tests - Quick Start

## Problem
3 test files are missing the `/// <reference types="jest" />` directive at the top, causing TypeScript compilation errors.

## Solution
Run one of the provided fix scripts based on your platform.

---

## Option 1: Node.js (Cross-platform) ⭐ RECOMMENDED

```bash
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services/user-service
node fix-jest-refs.js
```

---

## Option 2: PowerShell (Windows)

```powershell
cd C:\Users\citad\OneDrive\Documents\Dating\Flamoral\backend\services\user-service
.\fix-jest-refs.ps1
```

---

## Option 3: Bash (Linux/Mac)

```bash
cd /path/to/Flamoral/backend/services/user-service
chmod +x fix-jest-refs.sh
./fix-jest-refs.sh
```

---

## Option 4: Manual Fix

If scripts don't work, manually add this line to the top of each file:

```typescript
/// <reference types="jest" />
```

**Files to fix:**
1. `src/__tests__/unit/services/verification.service.test.ts`
2. `tests/unit/profile.service.test.ts`
3. `tests/e2e/api/user-api.spec.ts`

---

## After Running Fix

Run tests to verify:

```bash
# All tests
npm test -- --testTimeout=60000

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (requires test database)
npm run test:e2e -- --runInBand

# Specific test file
npm test -- --testPathPattern="verification.service" --testTimeout=60000
```

---

## What Gets Fixed

The scripts add `/// <reference types="jest" />` to:

1. **verification.service.test.ts** - Unit tests for email verification service
2. **profile.service.test.ts** - Unit tests for profile management
3. **user-api.spec.ts** - E2E tests for all 31 API endpoints

---

## Expected Results

✅ **Before fix**: TypeScript errors about `jest`, `describe`, `it`, `expect` not being defined

✅ **After fix**: All TypeScript errors resolved, tests can run properly

---

## Troubleshooting

### Scripts Won't Run?
- **Node.js script**: Make sure Node.js is installed: `node --version`
- **PowerShell script**: Run from PowerShell, not CMD
- **Bash script**: Make sure it's executable: `chmod +x fix-jest-refs.sh`

### Still Getting Errors?
1. Check that @types/jest is installed:
   ```bash
   npm install --save-dev @types/jest
   ```

2. Verify jest.config.js exists in the project root

3. Check that files were actually modified:
   ```bash
   head -1 src/__tests__/unit/services/verification.service.test.ts
   ```
   Should show: `/// <reference types="jest" />`

### Tests Timeout?
Increase timeout:
```bash
npm test -- --testTimeout=120000
```

### Database Errors (E2E tests)?
E2E tests require a PostgreSQL test database. Either:
- Set up the test database
- Skip E2E tests for now
- Run only unit tests: `npm run test:unit`

---

## More Information

See these files for detailed analysis:
- **TEST_ANALYSIS_REPORT.md** - Complete analysis of all 19 test files
- **TEST_FIXES_INSTRUCTIONS.md** - Detailed fix instructions and troubleshooting

---

## Quick Verification

After running the fix, verify it worked:

```bash
# Should show the jest reference at line 1
head -1 src/__tests__/unit/services/verification.service.test.ts

# Should output: /// <reference types="jest" />
```

Then run tests:

```bash
npm test -- --testPathPattern="verification.service" --testTimeout=60000
```

Should see tests running without TypeScript errors!

---

## Summary

- **Issue**: 3 files missing jest type reference
- **Fix Time**: ~30 seconds
- **Difficulty**: Very Easy
- **Impact**: Fixes all TypeScript compilation errors in tests
- **Risk**: None - just adding a type reference directive

Run the script, run the tests, you're done! 🎉
