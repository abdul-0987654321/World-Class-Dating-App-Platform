# Pipeline Migration Notes

## Overview

This document outlines the migration from the scattered pipeline structure to the new consolidated Azure DevOps pipeline system.

## New Pipeline Structure

All pipelines are now consolidated in the `/pipelines` directory:

| Pipeline | File | Purpose |
|----------|------|---------|
| CI Pipeline | `pipelines/ci-pipeline.yml` | Build, test, and create Docker images |
| CD Pipeline | `pipelines/cd-pipeline.yml` | Deploy to Dev → Test → Production |
| Infrastructure | `pipelines/infrastructure-pipeline.yml` | Terraform infrastructure management |
| Security | `pipelines/security-pipeline.yml` | Security and vulnerability scanning |

## Deprecated Pipelines (To Be Removed)

### Root Level Files
- `/azure-pipelines.yml` - **DEPRECATED** - Replaced by `pipelines/ci-pipeline.yml` and `pipelines/cd-pipeline.yml`
- `/azure-pipelines-infrastructure.yml` - **DEPRECATED** - Replaced by `pipelines/infrastructure-pipeline.yml`

### .azuredevops Directory
- `/.azuredevops/pipelines/azure-pipelines-ci.yml` - **DEPRECATED**
- `/.azuredevops/pipelines/azure-pipelines-cd.yml` - **DEPRECATED**
- `/.azuredevops/pipelines/azure-pipelines-infra.yml` - **DEPRECATED**
- `/.azuredevops/pipelines/azure-pipelines-terraform.yml` - **DEPRECATED**
- `/.azuredevops/pipelines/ci-backend.yml` - **DEPRECATED**
- `/.azuredevops/pipelines/ci-frontend.yml` - **DEPRECATED**
- `/.azuredevops/templates/docker-build-template.yml` - **DEPRECATED**
- `/.azuredevops/templates/helm-deploy-template.yml` - **DEPRECATED**
- `/.azuredevops/templates/test-template.yml` - **DEPRECATED**

### azure-pipelines Directory
- `/azure-pipelines/ci/build-all-services.yml` - **DEPRECATED**
- `/azure-pipelines/ci/docker-build.yml` - **DEPRECATED**
- `/azure-pipelines/ci/test-all-services.yml` - **DEPRECATED**
- `/azure-pipelines/cd/deploy-dev.yml` - **DEPRECATED**
- `/azure-pipelines/cd/deploy-test.yml` - **DEPRECATED**
- `/azure-pipelines/cd/deploy-prod.yml` - **DEPRECATED**
- `/azure-pipelines/terraform/*` - **DEPRECATED**
- `/azure-pipelines/templates/*` - **DEPRECATED**
- `/azure-pipelines/prod-pipeline.yml` - **DEPRECATED**
- `/azure-pipelines/test-pipeline.yml` - **DEPRECATED**

### infrastructure/pipelines Directory
- `/infrastructure/pipelines/azure-pipelines-terraform.yml` - **DEPRECATED**
- `/infrastructure/pipelines/templates/*` - **DEPRECATED**
- `/infrastructure/pipelines/variable-groups-template.yml` - **DEPRECATED**

### GitHub Actions (If Migrating Fully to Azure DevOps)
The `.github/workflows/` directory contains GitHub Actions workflows that may be:
- **Kept** if you want to maintain GitHub Actions alongside Azure DevOps
- **Removed** if fully migrating to Azure DevOps

## Migration Steps

### Phase 1: Setup New Pipelines
1. Create the new pipelines in Azure DevOps
2. Configure service connections
3. Create variable groups
4. Set up environment approval gates

### Phase 2: Testing
1. Run new CI pipeline and verify builds
2. Test CD pipeline deployment to Dev
3. Verify infrastructure pipeline with plan-only
4. Run security pipeline

### Phase 3: Transition
1. Disable old pipelines (don't delete yet)
2. Monitor new pipelines for 1-2 weeks
3. Fix any issues discovered

### Phase 4: Cleanup
1. Delete old Azure DevOps pipelines
2. Remove deprecated YAML files from repository
3. Update any documentation references

## Files to Keep

These files are part of the new system and should NOT be removed:

```
/pipelines/
├── README.md
├── ci-pipeline.yml
├── cd-pipeline.yml
├── infrastructure-pipeline.yml
├── security-pipeline.yml
├── setup-azure-devops.sh
├── MIGRATION-NOTES.md
└── templates/
    ├── variables-common.yml
    ├── variables-dev.yml
    ├── variables-test.yml
    ├── variables-prod.yml
    ├── node-build.yml
    ├── docker-build-push.yml
    ├── helm-deploy.yml
    └── terraform-steps.yml
```

## Rollback Plan

If issues are discovered with new pipelines:
1. Re-enable old pipelines in Azure DevOps
2. Old YAML files remain in repository until Phase 4
3. Update pipeline triggers if needed

## Azure Resources Not Affected

This migration does NOT affect any running Azure resources:
- AKS clusters remain unchanged
- Container images in ACR are preserved
- Databases and other services continue running
- Terraform state is unchanged
- Existing deployments continue to function

## Contact

For questions about this migration:
- DevOps Team: devops@flamoral.com
- Infrastructure Team: infrastructure-team@flamoral.com
