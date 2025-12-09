# Quick Fix for CI Pipeline Errors

## The Problem
CI build failing with exit code 2 on frontend jobs due to cache configuration issues.

## The Root Cause
The CI jobs were cleaning `node_modules` and `package-lock.json` before each run, which conflicts with npm caching and causes the "Post-job: Cache npm dependencies" step to fail.

## The Solution
In `.github/workflows/ci.yml`, replace the "Clean node_modules" step with proper caching in 3 locations:

### Find (3 occurrences):
```yaml
      - name: Clean node_modules and lock file (fix Rollup optional deps issue)
        working-directory: apps/web-app
        run: |
          rm -rf node_modules package-lock.json || true
```

### Replace with:
```yaml
      - name: Cache npm dependencies
        uses: actions/cache@v3
        with:
          path: apps/web-app/node_modules
          key: ${{ runner.os }}-web-app-${{ hashFiles('apps/web-app/package.json') }}
          restore-keys: |
            ${{ runner.os }}-web-app-
```

## Quick Fix Command
```bash
# Apply the patch file
cd C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform
git apply CI-FIX-INSTRUCTIONS.md

# Or edit manually in your code editor
# Search for "Clean node_modules" and replace all 3 occurrences
```

## Files To Edit
- `.github/workflows/ci.yml` (lines ~146, ~177, ~213)

## Affected Jobs
- `frontend-lint`
- `frontend-build`
- `frontend-tests`

## Test After Fix
```bash
git diff .github/workflows/ci.yml  # Verify changes
git add .github/workflows/ci.yml
git commit -m "Fix CI: Replace clean step with node_modules caching"
git push
```

See `CI-FIX-INSTRUCTIONS.md` for detailed explanation and instructions.
