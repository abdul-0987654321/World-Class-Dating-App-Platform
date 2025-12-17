# TypeScript Quick Fix Guide

## Problem
TypeScript can't find `@flamoral/shared` module across backend services.

## Solution
Run the fix script to update all `tsconfig.json` files.

### Windows (PowerShell)
```powershell
cd C:\Users\citad\OneDrive\Documents\Dating\Flamoral\backend\services
.\fix-tsconfig-paths.ps1
```

### Linux/Mac (Bash)
```bash
cd backend/services
chmod +x fix-tsconfig-paths.sh
./fix-tsconfig-paths.sh
```

## What It Fixes

Changes this:
```json
"paths": {
  "@flamoral/types": ["../../../packages/shared/types/src"],
  "@flamoral/constants": ["../../../packages/shared/constants/src"],
  "@flamoral/utils": ["../../../packages/shared/utils/src"],
  "@flamoral/validators": ["../../../packages/shared/validators/src"],
  "@flamoral/shared": ["../../../packages/shared/src"]
}
```

To this:
```json
"paths": {
  "@flamoral/shared": ["../shared"],
  "@/*": ["./src/*"]
}
```

## Verify It Works

```bash
cd backend/services/api-gateway
npx tsc --noEmit
```

Should complete without module resolution errors.

## Services Fixed

- ✅ api-gateway
- ✅ auth-service
- ✅ user-service
- ✅ matching-service
- ✅ messaging-service
- ✅ payment-service
- ✅ media-service
- ✅ notification-service
- ✅ moderation-service
- ✅ analytics-service
- ✅ admin-service
- ✅ advertising-service
- ✅ automation-service
- ✅ workflow-engine
- ✅ realtime-service
- ✅ policy-service
- ✅ ai-services

## Manual Fix (If Needed)

Edit `tsconfig.json` in each service:

1. Find the `"paths"` section
2. Replace with:
```json
"paths": {
  "@flamoral/shared": ["../shared"],
  "@/*": ["./src/*"]
}
```
3. Save and test: `npx tsc --noEmit`

## Common Errors Fixed

### Before
```
error TS2307: Cannot find module '@flamoral/shared'
```

### After
```
No errors - compilation successful
```

## Need Help?

See full documentation: `TYPESCRIPT_FIXES_COMPLETE.md`
