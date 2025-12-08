# Quick Fix Guide - Azure DevOps Pipeline Errors

## TL;DR

**Problem**: advertising-service and realtime-service failing in Azure DevOps CI pipeline

**Quick Fix**:
```bash
cd DatingPlatform
chmod +x apply-pipeline-fixes.sh
./apply-pipeline-fixes.sh
git add backend/services/advertising-service/package.json pipelines/ci-pipeline.yml
git commit -m "Fix CI pipeline errors for backend services"
git push
```

---

## What's Wrong?

| Service | Error | Why |
|---------|-------|-----|
| advertising-service | `eslint: command not found` | Missing ESLint in package.json devDependencies |
| realtime-service | `npm: command not found` | Go service being built as Node.js service |

---

## The Fixes

### Fix #1: Add ESLint to advertising-service

**File**: `backend/services/advertising-service/package.json`

Add to devDependencies:
```json
"@types/jest": "^29.5.11",
"@typescript-eslint/eslint-plugin": "^6.15.0",
"@typescript-eslint/parser": "^6.15.0",
"eslint": "^8.56.0"
```

### Fix #2: Create Go build job for realtime-service

**File**: `pipelines/ci-pipeline.yml`

1. Remove `RealtimeService` from `BuildNodeServices` matrix (lines 185-187)
2. Add new `BuildGoServices` job (before `BuildAIServices`)

---

## Test Before Pushing

```bash
# Test advertising-service
cd backend/services/advertising-service
npm install
npm run lint && npm run build

# Test realtime-service
cd ../realtime-service
go build -v ./... && go test -v ./...
```

---

## Files Created

1. **PIPELINE_FIX_SUMMARY.md** - Complete overview
2. **PIPELINE_FIXES.md** - Detailed technical analysis
3. **MANUAL_FIX_INSTRUCTIONS.md** - Step-by-step manual guide
4. **apply-pipeline-fixes.sh** - Automated fix script
5. **fix-advertising-service.sh** - Package.json fix script
6. **QUICK_FIX_GUIDE.md** - This file

---

## Need Help?

- **Automated fix**: Use `apply-pipeline-fixes.sh`
- **Manual fix**: See `MANUAL_FIX_INSTRUCTIONS.md`
- **Technical details**: See `PIPELINE_FIXES.md`
- **Overview**: See `PIPELINE_FIX_SUMMARY.md`
