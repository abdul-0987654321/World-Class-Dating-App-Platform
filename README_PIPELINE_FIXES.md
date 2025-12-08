# Azure DevOps Pipeline Fixes - Documentation Index

This directory contains comprehensive documentation and automated scripts to fix Azure DevOps CI pipeline errors affecting the `advertising-service` and `realtime-service`.

## Start Here

### 🚀 Quick Start (Recommended)
**File**: [QUICK_FIX_GUIDE.md](./QUICK_FIX_GUIDE.md)
- One-page quick reference
- TL;DR section
- Fast fix commands
- Verification steps

### 📋 Executive Summary
**File**: [PIPELINE_FIX_SUMMARY.md](./PIPELINE_FIX_SUMMARY.md)
- Complete overview
- Problem analysis
- Risk assessment
- Timeline and checklist
- Success criteria

## Documentation

### 📖 Detailed Analysis
**File**: [PIPELINE_FIXES.md](./PIPELINE_FIXES.md)
- Root cause analysis
- Current vs required configurations
- Implementation steps
- Expected results
- Technical details

### 📝 Manual Fix Instructions
**File**: [MANUAL_FIX_INSTRUCTIONS.md](./MANUAL_FIX_INSTRUCTIONS.md)
- Step-by-step manual fix guide
- What to change and where
- Verification procedures
- Troubleshooting section
- Before/after comparison

## Automated Fix Scripts

### 🤖 Complete Fix Script
**File**: [apply-pipeline-fixes.sh](./apply-pipeline-fixes.sh)
- Fixes both advertising-service and CI pipeline
- Creates backups automatically
- Validates all changes
- Provides detailed output

**Usage**:
```bash
chmod +x apply-pipeline-fixes.sh
./apply-pipeline-fixes.sh
```

### 📦 Package.json Fix Only
**File**: [fix-advertising-service.sh](./fix-advertising-service.sh)
- Fixes only advertising-service package.json
- Adds ESLint dependencies
- Standalone script

**Usage**:
```bash
chmod +x fix-advertising-service.sh
./fix-advertising-service.sh
```

## Issues Fixed

### Issue #1: advertising-service
- **Error**: `Bash exited with code '127'`
- **Message**: `/bin/bash: line 2: eslint: command not found`
- **Cause**: Missing ESLint dependencies in package.json
- **Fix**: Add `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint`

### Issue #2: realtime-service
- **Error**: `Bash exited with code '2'`
- **Message**: `npm: command not found`, `package.json: No such file or directory`
- **Cause**: Go service incorrectly included in Node.js build job
- **Fix**: Remove from BuildNodeServices, create BuildGoServices job

## Files Modified

The fixes modify these files:

1. **backend/services/advertising-service/package.json**
   - Adds ESLint and TypeScript ESLint dependencies
   - No runtime changes (devDependencies only)

2. **pipelines/ci-pipeline.yml**
   - Removes realtime-service from BuildNodeServices matrix
   - Adds new BuildGoServices job for Go-based services
   - No changes to deployment or Docker stages

## Quick Reference

### Apply Automated Fix
```bash
cd /path/to/DatingPlatform
chmod +x apply-pipeline-fixes.sh
./apply-pipeline-fixes.sh
```

### Verify Locally
```bash
# Test advertising-service
cd backend/services/advertising-service
npm install && npm run lint && npm run build

# Test realtime-service
cd ../realtime-service
go mod download && go build -v ./... && go test -v ./...
```

### Commit and Push
```bash
git add backend/services/advertising-service/package.json
git add pipelines/ci-pipeline.yml
git commit -m "Fix CI pipeline errors for backend services"
git push
```

## Documentation Structure

```
DatingPlatform/
├── README_PIPELINE_FIXES.md           ← You are here (index)
├── QUICK_FIX_GUIDE.md                 ← Quick reference
├── PIPELINE_FIX_SUMMARY.md            ← Executive summary
├── PIPELINE_FIXES.md                  ← Detailed analysis
├── MANUAL_FIX_INSTRUCTIONS.md         ← Manual fix guide
├── apply-pipeline-fixes.sh            ← Automated fix script
├── fix-advertising-service.sh         ← Package.json fix script
└── backend/services/
    ├── advertising-service/
    │   └── package.json               ← File to modify
    └── realtime-service/
        └── (Go service files)
```

## Recommended Workflow

1. **Read** [QUICK_FIX_GUIDE.md](./QUICK_FIX_GUIDE.md) for overview
2. **Review** [PIPELINE_FIX_SUMMARY.md](./PIPELINE_FIX_SUMMARY.md) for details
3. **Choose** fix method:
   - Automated: Run `apply-pipeline-fixes.sh`
   - Manual: Follow [MANUAL_FIX_INSTRUCTIONS.md](./MANUAL_FIX_INSTRUCTIONS.md)
4. **Verify** locally before committing
5. **Commit** and push changes
6. **Monitor** Azure DevOps pipeline
7. **Confirm** all jobs pass

## Support & Troubleshooting

- **General issues**: See [MANUAL_FIX_INSTRUCTIONS.md](./MANUAL_FIX_INSTRUCTIONS.md) → Troubleshooting section
- **Technical details**: See [PIPELINE_FIXES.md](./PIPELINE_FIXES.md) → Additional Notes
- **Risk assessment**: See [PIPELINE_FIX_SUMMARY.md](./PIPELINE_FIX_SUMMARY.md) → Risk Assessment

## Validation

After applying fixes, the pipeline should show:

✅ advertising-service - Lint (exit code 0)
✅ advertising-service - Build (exit code 0)
✅ realtime-service - Build (Go) (exit code 0)
✅ realtime-service - Test (Go) (exit code 0)

## Rollback

If needed, backups are created:
- `backend/services/advertising-service/package.json.bak`
- `pipelines/ci-pipeline.yml.bak`

Or use git:
```bash
git checkout backend/services/advertising-service/package.json
git checkout pipelines/ci-pipeline.yml
```

## Additional Context

- **Organization**: citadelcloudmanagement
- **Project**: DatingPlatform
- **Pipeline URL**: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build
- **Date**: December 7, 2025

---

**Status**: ✅ Ready to apply fixes
**Risk Level**: 🟢 Low
**Time to Fix**: ~5 minutes (automated) or ~10 minutes (manual)
