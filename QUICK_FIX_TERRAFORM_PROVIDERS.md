# Quick Fix: Terraform Provider Errors

## Run This Now

### Windows (PowerShell):
```powershell
cd C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform
.\fix-terraform-providers.ps1
```

### Linux/Mac (Bash):
```bash
cd /path/to/DatingPlatform
chmod +x fix-terraform-providers.sh
./fix-terraform-providers.sh
```

## What Was Fixed

### 1. Pipeline File Updated
**File:** `pipelines/azure-pipelines-infra.yml`

Changed the validation stage to properly run `terraform init` WITH backend configuration (removed `-backend=false` flag).

This ensures all provider plugins are downloaded before running `terraform validate`.

### 2. Provider Requirements to Add
**Files to update (use scripts above):**
- `terraform/environments/dev/main.tf`
- `terraform/environments/test/main.tf`
- `terraform/environments/prod/main.tf`

**Add these providers:**
```hcl
helm = {
  source  = "hashicorp/helm"
  version = "~> 2.12"
}
kubernetes = {
  source  = "hashicorp/kubernetes"
  version = "~> 2.24"
}
```

## Verification

Test locally:
```bash
cd terraform/environments/dev
terraform init
terraform validate
```

Should output: `Success! The configuration is valid.`

## Commit Changes

```bash
git add pipelines/azure-pipelines-infra.yml
git add terraform/environments/*/main.tf
git commit -m "Fix: Add missing Terraform providers and update pipeline validation"
git push
```

## More Details

See `TERRAFORM_PROVIDER_FIX.md` for complete documentation.
