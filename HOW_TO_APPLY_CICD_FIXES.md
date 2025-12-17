# How to Apply CI/CD Pipeline Fixes

## Overview

This guide explains how to apply the CI/CD pipeline fixes to support all 16 backend services (including the 4 new services) and 6 AI services.

## Files Created

1. **CICD_FIXES_SUMMARY.md** - Comprehensive analysis and fix details
2. **build-acr-pipeline.PATCHED.yml** - Corrected build pipeline (READY TO USE)
3. This file - Instructions for applying fixes

## Quick Start - Apply Fixes Now

### Option 1: Use Pre-Patched File (Recommended)

```bash
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral/.github/workflows

# Backup original
cp build-acr-pipeline.yml build-acr-pipeline.yml.backup

# Apply patched version
cp build-acr-pipeline.PATCHED.yml build-acr-pipeline.yml

# Verify
git diff build-acr-pipeline.yml
```

### Option 2: Manual Edits

Follow the detailed instructions in `CICD_FIXES_SUMMARY.md` for each file.

---

## File-by-File Fix Instructions

### 1. build-acr-pipeline.yml ✅ DONE

**Status:** Patched file ready at `build-acr-pipeline.PATCHED.yml`

**To Apply:**
```bash
cp .github/workflows/build-acr-pipeline.PATCHED.yml .github/workflows/build-acr-pipeline.yml
```

**Changes Made:**
- ✅ Added AI services directory scanning
- ✅ Excluded `shared` and `ai-services` from top-level scan
- ✅ Added 4 new services to default list
- ✅ Updated Dockerfile detection for AI services (slash in service name)
- ✅ Added comments explaining fixes

---

### 2. unified-ci.yml

**Status:** Needs manual update

**Location:** `.github/workflows/unified-ci.yml`

**Required Changes:**

#### Change A: Update Backend Test Matrix (Line 125)

Find:
```yaml
matrix:
  service:
    - auth-service
    - user-service
    - messaging-service
    - matching-service
    - media-service
    - api-gateway
    - payment-service
    - notification-service
    - analytics-service
    - moderation-service
    - realtime-service
    - advertising-service
```

Replace with:
```yaml
matrix:
  service:
    - auth-service
    - user-service
    - messaging-service
    - matching-service
    - media-service
    - api-gateway
    - payment-service
    - notification-service
    - analytics-service
    - moderation-service
    - realtime-service
    - admin-service          # ADDED
    - policy-service          # ADDED
    - advertising-service
    - automation-service      # ADDED
    - workflow-engine         # ADDED
```

#### Change B: Update Docker Build Test Matrix (Line 402)

Find:
```yaml
matrix:
  service:
    - auth-service
    - user-service
    - messaging-service
    - matching-service
    - media-service
    - api-gateway
```

Replace with:
```yaml
matrix:
  service:
    - auth-service
    - user-service
    - messaging-service
    - matching-service
    - media-service
    - api-gateway
    - payment-service
    - notification-service
    - analytics-service
    - moderation-service
    - realtime-service
    - admin-service          # ADDED
    - policy-service          # ADDED
    - advertising-service    # ADDED
    - automation-service      # ADDED
    - workflow-engine         # ADDED
```

**Command to Apply:**
```bash
# Edit the file
nano .github/workflows/unified-ci.yml

# Or use sed (be careful!)
# See detailed commands in CICD_FIXES_SUMMARY.md
```

---

### 3. unified-cd-dev.yml

**Status:** Needs manual update

**Location:** `.github/workflows/unified-cd-dev.yml`

**Required Changes:**

#### Change: Expand Service Matrix (Line 46)

Find the existing matrix (lines 46-65) and ADD these entries:

```yaml
matrix:
  service:
    # ... existing services ...
    - name: moderation-service     # ADDED
      path: backend/services/moderation-service
    - name: realtime-service       # ADDED
      path: backend/services/realtime-service
    - name: admin-service          # ADDED
      path: backend/services/admin-service
    - name: policy-service          # ADDED
      path: backend/services/policy-service
    - name: advertising-service    # EXISTS - verify present
      path: backend/services/advertising-service
    - name: automation-service      # ADDED
      path: backend/services/automation-service
    - name: workflow-engine         # ADDED
      path: backend/services/workflow-engine
```

**Full Corrected Matrix:**
```yaml
strategy:
  fail-fast: false
  matrix:
    service:
      - name: api-gateway
        path: backend/services/api-gateway
      - name: user-service
        path: backend/services/user-service
      - name: auth-service
        path: backend/services/auth-service
      - name: matching-service
        path: backend/services/matching-service
      - name: messaging-service
        path: backend/services/messaging-service
      - name: media-service
        path: backend/services/media-service
      - name: notification-service
        path: backend/services/notification-service
      - name: payment-service
        path: backend/services/payment-service
      - name: analytics-service
        path: backend/services/analytics-service
      - name: moderation-service
        path: backend/services/moderation-service
      - name: realtime-service
        path: backend/services/realtime-service
      - name: admin-service
        path: backend/services/admin-service
      - name: policy-service
        path: backend/services/policy-service
      - name: advertising-service
        path: backend/services/advertising-service
      - name: automation-service
        path: backend/services/automation-service
      - name: workflow-engine
        path: backend/services/workflow-engine
```

---

### 4. unified-cd-staging.yml

**Status:** Needs manual update

**Location:** `.github/workflows/unified-cd-staging.yml`

**Required Changes:**

Same matrix update as `unified-cd-dev.yml` (Change above), but starting at line 69.

---

### 5. unified-cd-production.yml

**Status:** Needs manual update

**Location:** `.github/workflows/unified-cd-production.yml`

**Required Changes:**

Same matrix update as `unified-cd-dev.yml` (Change above), but starting at line 175.

---

## Automated Script to Apply All Fixes

Create this script as `apply-cicd-fixes.sh`:

```bash
#!/bin/bash

# CI/CD Fixes Application Script
# Run from repository root

set -e  # Exit on error

WORKFLOW_DIR=".github/workflows"
BACKUP_DIR=".github/workflows/backup-$(date +%Y%m%d-%H%M%S)"

echo "=== Flamoral CI/CD Pipeline Fixes ==="
echo

# Create backup
echo "Creating backup at $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"
cp "$WORKFLOW_DIR/build-acr-pipeline.yml" "$BACKUP_DIR/"
cp "$WORKFLOW_DIR/unified-ci.yml" "$BACKUP_DIR/"
cp "$WORKFLOW_DIR/unified-cd-dev.yml" "$BACKUP_DIR/"
cp "$WORKFLOW_DIR/unified-cd-staging.yml" "$BACKUP_DIR/"
cp "$WORKFLOW_DIR/unified-cd-production.yml" "$BACKUP_DIR/"
echo "✓ Backup created"
echo

# Apply build-acr-pipeline.yml fix
echo "Applying build-acr-pipeline.yml fixes..."
if [ -f "$WORKFLOW_DIR/build-acr-pipeline.PATCHED.yml" ]; then
    cp "$WORKFLOW_DIR/build-acr-pipeline.PATCHED.yml" "$WORKFLOW_DIR/build-acr-pipeline.yml"
    echo "✓ build-acr-pipeline.yml updated"
else
    echo "⚠ PATCHED file not found - skipping"
fi
echo

# unified-ci.yml
echo "=== unified-ci.yml requires manual update ==="
echo "Please edit $WORKFLOW_DIR/unified-ci.yml and add these services to the matrix:"
echo "  - admin-service"
echo "  - policy-service"
echo "  - automation-service"
echo "  - workflow-engine"
echo

# unified-cd-*.yml
echo "=== CD pipelines require manual update ==="
echo "Please edit these files and add the service matrix entries:"
echo "  - $WORKFLOW_DIR/unified-cd-dev.yml"
echo "  - $WORKFLOW_DIR/unified-cd-staging.yml"
echo "  - $WORKFLOW_DIR/unified-cd-production.yml"
echo

echo "=== Summary ==="
echo "✓ Automated: build-acr-pipeline.yml"
echo "⚠ Manual: unified-ci.yml (see CICD_FIXES_SUMMARY.md)"
echo "⚠ Manual: unified-cd-*.yml (see CICD_FIXES_SUMMARY.md)"
echo
echo "Backup location: $BACKUP_DIR"
echo
echo "Next steps:"
echo "1. Review changes: git diff $WORKFLOW_DIR/"
echo "2. Manual edit remaining files (see above)"
echo "3. Test: Push to feature branch and monitor workflows"
echo "4. Commit: git add .github/workflows/ && git commit -m 'fix: Update CI/CD for all services'"
```

**To use:**
```bash
chmod +x apply-cicd-fixes.sh
./apply-cicd-fixes.sh
```

---

## Verification Steps

After applying fixes:

### 1. Verify Service Discovery

```bash
# Test locally (requires Docker)
cd backend/services
for dir in */; do
    service=$(basename "$dir")
    if [ -f "$dir/Dockerfile" ]; then
        echo "✓ $service has Dockerfile"
    else
        echo "✗ $service missing Dockerfile"
    fi
done

# Check AI services
cd ai-services
for dir in */; do
    service=$(basename "$dir")
    if [ -f "$dir/Dockerfile" ]; then
        echo "✓ ai-services/$service has Dockerfile"
    else
        echo "✗ ai-services/$service missing Dockerfile"
    fi
done
```

### 2. Test Workflow Syntax

```bash
# Install GitHub CLI if not present
# brew install gh  # macOS
# apt install gh   # Linux

# Validate workflow syntax
gh workflow view "Build & ACR Pipeline"
gh workflow view "Unified CI Pipeline"
gh workflow view "CD - Development"
```

### 3. Trigger Test Run

```bash
# Create test branch
git checkout -b test/cicd-fixes

# Commit changes
git add .github/workflows/
git commit -m "fix: Add support for 4 new services + AI services

- Added policy-service, advertising-service, automation-service, workflow-engine
- Fixed service discovery to scan ai-services subdirectory
- Updated all CD pipelines with complete service matrices

Fixes #<issue-number>"

# Push and create PR
git push -u origin test/cicd-fixes
gh pr create --title "Fix: CI/CD support for all services" \
             --body "See CICD_FIXES_SUMMARY.md for details"
```

### 4. Monitor Workflow Runs

```bash
# Watch workflow execution
gh run watch

# View workflow logs
gh run view <run-id> --log

# Check specific job
gh run view <run-id> --job=<job-id>
```

---

## Rollback Procedure

If issues occur:

```bash
# Restore from backup
BACKUP_DIR=".github/workflows/backup-YYYYMMDD-HHMMSS"  # Use actual timestamp

cp "$BACKUP_DIR/build-acr-pipeline.yml" .github/workflows/
cp "$BACKUP_DIR/unified-ci.yml" .github/workflows/
cp "$BACKUP_DIR/unified-cd-dev.yml" .github/workflows/
cp "$BACKUP_DIR/unified-cd-staging.yml" .github/workflows/
cp "$BACKUP_DIR/unified-cd-production.yml" .github/workflows/

# Commit rollback
git add .github/workflows/
git commit -m "Revert CI/CD changes"
git push
```

---

## Common Issues & Solutions

### Issue: Service not discovered

**Solution:** Check Dockerfile exists:
```bash
ls -la backend/services/<service-name>/Dockerfile
```

### Issue: AI service not building

**Solution:** Verify path handling:
- Service name must be `ai-services/service-name`
- Dockerfile path: `backend/services/ai-services/service-name/Dockerfile`

### Issue: Matrix too large (workflow fails)

**Solution:** Split into batches or filter by changed services:
```yaml
# Add to workflow
on:
  push:
    paths:
      - 'backend/services/policy-service/**'  # Only build when changed
```

### Issue: ACR login fails

**Solution:** Verify secrets are set:
```bash
gh secret list
# Should show: AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID
```

---

## Support & Documentation

- **Detailed fixes:** See `CICD_FIXES_SUMMARY.md`
- **Service list:** Check `backend/services/` directory
- **GitHub Actions docs:** https://docs.github.com/en/actions
- **Azure Container Registry:** https://learn.microsoft.com/en-us/azure/container-registry/

---

## Checklist

Before committing:

- [ ] Backed up original workflow files
- [ ] Applied `build-acr-pipeline.yml` patch
- [ ] Updated `unified-ci.yml` matrix (both locations)
- [ ] Updated `unified-cd-dev.yml` matrix
- [ ] Updated `unified-cd-staging.yml` matrix
- [ ] Updated `unified-cd-production.yml` matrix
- [ ] Verified all services have Dockerfiles
- [ ] Tested workflow syntax locally
- [ ] Created test branch
- [ ] Committed with descriptive message
- [ ] Created PR for review
- [ ] Monitored first workflow run
- [ ] Documented any additional changes

---

**Last Updated:** 2025-12-16
**Author:** Claude (AI Assistant)
**Version:** 1.0
