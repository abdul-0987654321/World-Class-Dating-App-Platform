# CI Pipeline Build Error Fix

## Problem Summary
The CI pipeline for the web app is failing with:
- Process returned non-zero exit code: 2
- Build Frontend Applications errors
- Cache npm dependencies post-job failures

## Root Cause
The web app CI jobs were trying to use npm cache with `package-lock.json`, but:
1. The project is a Yarn workspace monorepo
2. The web-app doesn't have a `package-lock.json` file (intentionally)
3. The CI was removing `node_modules` and `package-lock.json` before install
4. This caused the GitHub Actions npm cache step to fail

## Solution
Replace the problematic "Clean node_modules and lock file" step with proper node_modules caching in all three frontend jobs:
- `frontend-lint`
- `frontend-build`
- `frontend-tests`

## Files Modified

### 1. `.github/workflows/ci.yml`

Replace all three instances of:
```yaml
      - name: Clean node_modules and lock file (fix Rollup optional deps issue)
        working-directory: apps/web-app
        run: |
          rm -rf node_modules package-lock.json || true
```

With:
```yaml
      - name: Cache npm dependencies
        uses: actions/cache@v3
        with:
          path: apps/web-app/node_modules
          key: ${{ runner.os }}-web-app-${{ hashFiles('apps/web-app/package.json') }}
          restore-keys: |
            ${{ runner.os }}-web-app-
```

## Manual Fix Instructions

### Option 1: Apply the Patch (Recommended)
```bash
cd C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform
git apply ../Dating\ Platform/ci-pipeline-fix.patch
```

### Option 2: Manual Edit
Edit `.github/workflows/ci.yml` and make the following changes:

1. **Line 146-149** (frontend-lint job):
   - Delete lines 146-149
   - Add the new cache step

2. **Line 177-180** (frontend-build job):
   - Delete lines 177-180
   - Add the new cache step

3. **Line 213-216** (frontend-tests job):
   - Delete lines 213-216
   - Add the new cache step

### Option 3: Use Search and Replace
1. Open `.github/workflows/ci.yml` in your editor
2. Search for: `Clean node_modules and lock file (fix Rollup optional deps issue)`
3. Replace each occurrence (3 total) with the cache configuration shown above

## Verification

After applying the fix, verify:

1. Check the file changes:
```bash
git diff .github/workflows/ci.yml
```

2. The three frontend jobs should now have:
   - No "Clean node_modules and lock file" step
   - A new "Cache npm dependencies" step before "Install dependencies"

3. Commit and push:
```bash
git add .github/workflows/ci.yml
git commit -m "Fix CI pipeline: Replace clean step with proper node_modules caching

- Remove problematic package-lock.json deletion
- Add GitHub Actions cache for node_modules
- Cache key based on package.json hash
- Fixes 'Post-job: Cache npm dependencies' errors"
git push
```

## Expected Outcome

After this fix:
- CI pipeline will no longer try to cache non-existent package-lock.json
- node_modules will be properly cached between runs
- Build times will be faster due to caching
- No more "Process returned non-zero exit code: 2" errors
- "Post-job: Cache npm dependencies" step will succeed

## Additional Notes

- The web-app uses `npm install` (not `npm ci`) because it's part of a Yarn workspace
- This is intentional and correct for this monorepo structure
- The node_modules caching will still provide performance benefits
- The cache key includes the package.json hash, so it will invalidate when dependencies change

## Testing

To test locally before pushing:
```bash
cd apps/web-app
npm install
npm run lint
npm run type-check
npm run build
```

All commands should complete successfully.
