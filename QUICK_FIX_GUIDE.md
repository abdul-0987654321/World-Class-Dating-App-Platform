# Quick Fix Guide - Flamoral Dating Platform

## Current Status: 2 Critical Issues Blocking All Pipelines

**Last Updated:** December 8, 2025

---

## Issue #1: CI Pipeline - @flamoral/shared Package Not Found

### The Problem
All 11 Node.js microservices are failing with:
```
npm error 404 Not Found - GET https://registry.npmjs.org/@flamoral%2fshared - Not found
```

### Root Cause
Services depend on `@flamoral/shared` which is a **local workspace package**, not published to npm.

### FIX APPLIED
Updated `pipelines/templates/node-build.yml` to:
1. Build `backend/shared` first
2. Copy it to service's `node_modules/@flamoral/shared`
3. Then run npm install

**Action Required:** Commit and push the changes, then re-run CI pipeline.

---

## Issue #2: Infrastructure Pipeline - Terraform Backend Missing

### The Problem
Terraform init fails with:
```
Error: Resource group 'flamoral-terraform-state-rg' could not be found.
```

### Root Cause
The Azure resources for Terraform state storage don't exist yet.

### FIX: Run Bootstrap (Choose One Method)

#### Option A: Run Bootstrap Pipeline in Azure DevOps
1. Go to: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build
2. Find: `Bootstrap - Create Terraform Backend`
3. Click "Run pipeline"
4. Wait for completion

#### Option B: Run PowerShell Script Locally
```powershell
cd DatingPlatform/scripts
.\bootstrap-terraform-backend.ps1
```

#### Option C: Run Bash Script Locally
```bash
cd DatingPlatform/scripts
chmod +x bootstrap-terraform-backend.sh
./bootstrap-terraform-backend.sh
```

#### Option D: Manual Azure CLI Commands
```bash
# Login to Azure
az login

# Create resource group
az group create --name flamoral-terraform-state-rg --location eastus

# Create storage account
az storage account create \
  --name flamoraltfstate \
  --resource-group flamoral-terraform-state-rg \
  --location eastus \
  --sku Standard_LRS \
  --https-only true \
  --allow-blob-public-access false

# Create container
STORAGE_KEY=$(az storage account keys list \
  --resource-group flamoral-terraform-state-rg \
  --account-name flamoraltfstate \
  --query '[0].value' -o tsv)

az storage container create \
  --name tfstate \
  --account-name flamoraltfstate \
  --account-key $STORAGE_KEY
```

---

## Quick Start - Apply All Fixes

```bash
# 1. Commit the pipeline fix
cd DatingPlatform
git add pipelines/templates/node-build.yml scripts/bootstrap-terraform-backend.sh scripts/bootstrap-terraform-backend.ps1
git commit -m "fix(pipelines): Fix @flamoral/shared resolution and add bootstrap scripts"
git push

# 2. Bootstrap Terraform backend (run one of these)
# Option A: Via Azure CLI
az login
./scripts/bootstrap-terraform-backend.sh

# Option B: Via PowerShell
.\scripts\bootstrap-terraform-backend.ps1

# 3. Trigger pipelines in Azure DevOps
# Go to: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build
# Run CI pipeline first, then Infrastructure pipeline
```

---

## After Applying Fixes

### Expected Pipeline Order
1. **Bootstrap Pipeline** → Creates Terraform backend storage (one-time)
2. **CI Pipeline** → Builds all services (should now pass)
3. **Security Pipeline** → Already passing
4. **Infrastructure Pipeline** → Deploys Azure resources (after bootstrap)
5. **CD Pipeline** → Deploys to AKS (after CI passes)

### Verification Steps
1. Check CI builds are green
2. Check Infrastructure pipeline can run terraform init
3. Verify AKS cluster is created
4. Verify services deploy successfully

---

## Files Changed/Created

| File | Status | Description |
|------|--------|-------------|
| `pipelines/templates/node-build.yml` | Modified | Fixed @flamoral/shared resolution |
| `scripts/bootstrap-terraform-backend.ps1` | Created | Bootstrap script (PowerShell) |
| `scripts/bootstrap-terraform-backend.sh` | Created | Bootstrap script (Bash) |
| `PLATFORM_SCAN_REPORT.md` | Created | Full analysis report |
| `QUICK_FIX_GUIDE.md` | Modified | This guide |

---

## Need Help?

1. Check detailed report: `PLATFORM_SCAN_REPORT.md`
2. Review pipeline logs in Azure DevOps
3. Verify Azure service connection has correct permissions
4. Ensure Variable Group `datingplatform-terraform-common` exists with:
   - `tfStateResourceGroup`
   - `tfStateStorageAccount`
   - `tfStateContainer`
   - `ARM_CLIENT_ID`
   - `ARM_CLIENT_SECRET`
   - `ARM_SUBSCRIPTION_ID`
   - `ARM_TENANT_ID`
