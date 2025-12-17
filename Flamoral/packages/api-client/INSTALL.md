# Installation Instructions

## Quick Install

Run these commands in the `packages/api-client` directory:

### Windows (PowerShell/CMD)
```cmd
cd src
copy client.ts client.ts.backup
copy client-new.ts client.ts
```

### Linux/Mac
```bash
cd src
cp client.ts client.ts.backup
cp client-new.ts client.ts
```

## Or Manually

1. Open `src/client.ts` in your editor
2. Delete all contents
3. Open `src/client-new.ts`
4. Copy all contents
5. Paste into `src/client.ts`
6. Save the file

## Verify Installation

Check that `src/client.ts` now includes:
- CSRF token handling methods (`getCsrfToken`, `refreshCsrfToken`)
- Retry logic (`setupRetryLogic`, `isRetryableError`)
- Token refresh (`onTokenRefresh`, `refreshSubscribers`)
- Enhanced config interface with `retries`, `retryDelay`, `refreshToken` options

## Next Steps

See `API_CLIENT_FIXES.md` for:
- Complete feature documentation
- Migration guide
- Backend requirements
- Usage examples
