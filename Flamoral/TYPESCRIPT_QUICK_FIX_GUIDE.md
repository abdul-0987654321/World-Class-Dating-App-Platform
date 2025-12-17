# TypeScript Quick Fix Guide

## TL;DR - Fix TypeScript Errors NOW

**Windows (Command Prompt/PowerShell)**:
```batch
cd C:\Users\citad\OneDrive\Documents\Dating\Flamoral
fix-typescript-now.bat
```

**Git Bash / WSL / Linux**:
```bash
cd /c/Users/citad/OneDrive/Documents/Dating/Flamoral
bash fix-all-typescript-errors.sh
```

---

## What's Wrong?

1. **Matching Service** - ✅ Already Fixed
   - Missing `eventName` properties in analytics tracking

2. **Payment Service** - ❌ Needs Fix
   - Missing `@flamoral/shared` dependency in package.json

---

## Quick Verification

Check if TypeScript compiles:

```bash
# Payment Service
cd backend/services/payment-service
npm run build

# Matching Service
cd backend/services/matching-service
npm run build
```

---

## Manual Fix (If Scripts Don't Work)

### Fix Payment Service

```bash
cd backend/services/payment-service
```

Edit `package.json` and add to dependencies:
```json
"@flamoral/shared": "file:../../shared"
```

Then run:
```bash
npm install
cd ../../shared
npm run build
cd ../services/payment-service
npm run build
```

---

## Verify All Services

```bash
bash verify-all-typescript.sh
```

This will build all services and show which ones have errors.

---

## Files Created

- `fix-typescript-now.bat` - Quick fix for Windows
- `fix-all-typescript-errors.sh` - Comprehensive fix for Bash
- `fix-all-typescript-errors.ps1` - Comprehensive fix for PowerShell
- `verify-all-typescript.sh` - Build verification script
- `TYPESCRIPT_ERRORS_COMPLETE_REPORT.md` - Full documentation

---

## What Gets Fixed?

### Matching Service (Already Fixed)
- ✅ Added `eventName` to analytics events
- ✅ Added `notifySuperLike()` method
- ✅ Added `premium` property to UserProfile

### Payment Service (Needs Fix)
- ⏳ Add `@flamoral/shared` dependency
- ⏳ Install dependencies
- ⏳ Rebuild service

---

## After Fixing

Run tests:
```bash
cd backend/services/payment-service
npm test

cd ../matching-service
npm test
```

---

## Need Help?

See `TYPESCRIPT_ERRORS_COMPLETE_REPORT.md` for full details.
