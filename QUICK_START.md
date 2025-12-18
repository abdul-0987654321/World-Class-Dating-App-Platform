# Quick Start: Remove Mock Modes

## TL;DR

Remove mock/demo modes from 16 files in the Flamoral dating platform.

## Fastest Method (Recommended)

```bash
cd C:/Users/citad/OneDrive/Documents/Dating
python remove_mocks.py
```

That's it! The script will:
- Clean all 16 files
- Create backups (*.bak)
- Show progress
- Report results

## Files Created for You

1. **remove_mocks.py** - Automated cleaning script
2. **REMOVE_MOCK_MODES_GUIDE.md** - Detailed manual guide
3. **FILES_TO_CLEAN.md** - Complete list of affected files
4. **MOCK_REMOVAL_SUMMARY.md** - Full project documentation
5. **auth.service.ts.CLEANED** - Example of cleaned file
6. **QUICK_START.md** - This file

## What Gets Changed

### Before
```typescript
private isMock = !import.meta.env.VITE_API_URL;

async someMethod() {
  if (this.isMock) {
    return mockData;
  }
  return await apiClient.get('/api/endpoint');
}
```

### After
```typescript
private ensureApiConfigured(): void {
  if (!import.meta.env.VITE_API_URL) {
    throw new Error('API URL is not configured.');
  }
}

async someMethod() {
  this.ensureApiConfigured();
  return await apiClient.get('/api/endpoint');
}
```

## Verification

```bash
# Should return 0
grep -r "isMock" apps/web-app/src/services/ | wc -l

# Should return 0
grep -r "mockApi" apps/web-app/src/services/ | wc -l

# Should return 0
grep -r "getMock" apps/web-app/src/services/ | wc -l
```

## If Something Goes Wrong

### Restore single file
```bash
cp apps/web-app/src/services/some.service.ts.bak apps/web-app/src/services/some.service.ts
```

### Restore all files
```bash
find . -name "*.bak" | while read f; do cp "$f" "${f%.bak}"; done
```

## Files Affected

**16 total files:**
- 15 frontend service files (apps/web-app/src/services/*.ts)
- 1 backend config file (backend/package.json)

**174+ mock patterns to remove**

## Next Steps After Running Script

1. Review changes: `git diff`
2. Run tests: `npm test`
3. Test locally:
   - Without API: Should show error
   - With API: Should work normally
4. Commit: `git commit -m "refactor: Remove mock modes from services"`

## Need Help?

- Read the guide: `REMOVE_MOCK_MODES_GUIDE.md`
- Check example: `auth.service.ts.CLEANED`
- See full docs: `MOCK_REMOVAL_SUMMARY.md`
