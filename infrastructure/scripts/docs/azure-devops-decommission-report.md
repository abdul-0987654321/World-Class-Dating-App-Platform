# Azure DevOps Decommissioning Report

**Date:** 2024-12-10
**Organization:** citadelcloudmanagement
**Project:** DatingPlatform
**Status:** READY FOR DECOMMISSIONING

---

## Executive Summary

This document outlines the complete decommissioning of Azure DevOps CI/CD pipelines following successful migration to GitHub Actions.

---

## 1. Pipelines to Decommission

### Build Pipelines

| Pipeline ID | Name | YAML Path | Replacement |
|-------------|------|-----------|-------------|
| 23 | Flamoral-Dev-Pipeline | pipelines/flamoral-dev-pipeline.yml | unified-cd-dev.yml |
| 24 | Flamoral-Test-Pipeline | pipelines/flamoral-test-pipeline.yml | unified-cd-staging.yml |
| 25 | Flamoral-Prod-Pipeline | pipelines/flamoral-prod-pipeline.yml | unified-cd-production.yml |
| 26 | Flamoral-Self-Healing-Agent | pipelines/flamoral-self-healing-agent.yml | self-healing-agent.yml |

### Archived Pipelines (Already Disabled)

| Pipeline | Path | Status |
|----------|------|--------|
| ci-pipeline | pipelines/archived/ci-pipeline.yml | Archived |
| cd-pipeline | pipelines/archived/cd-pipeline.yml | Archived |
| cd-pipeline-canary | pipelines/archived/cd-pipeline-canary.yml | Archived |
| security-pipeline | pipelines/archived/security-pipeline.yml | Archived |
| infrastructure-pipeline | pipelines/archived/infrastructure-pipeline.yml | Archived |
| azure-pipelines-infra | pipelines/archived/azure-pipelines-infra.yml | Archived |
| azure-pipelines-bootstrap | pipelines/archived/azure-pipelines-bootstrap.yml | Archived |
| azure-pipelines-tests | pipelines/archived/azure-pipelines-tests.yml | Archived |
| unified-pipeline | pipelines/archived/unified-pipeline.yml | Archived |

---

## 2. Variable Groups to Remove

| Group ID | Name | Variables |
|----------|------|-----------|
| 14 | flamoral-shared-vars | Common shared variables |
| 15 | flamoral-terraform-vars | Terraform state configuration |
| 16 | flamoral-dev-vars | Development environment vars |
| 17 | flamoral-staging-vars | Staging environment vars |
| 18 | flamoral-prod-vars | Production environment vars |

### Variable Migration Status

All variables have been migrated to:
- GitHub Repository Secrets
- GitHub Environment Secrets
- Azure Key Vault (for sensitive values)

---

## 3. Service Connections to Remove

| Connection | Type | Usage |
|------------|------|-------|
| Azure-Flamoral-Dev | Azure Resource Manager | Dev environment deployment |
| Azure-Flamoral-Staging | Azure Resource Manager | Staging deployment |
| Azure-Flamoral-Prod | Azure Resource Manager | Production deployment |
| GitHub-Flamoral | GitHub | Repository access |
| ACR-Flamoral | Docker Registry | Container registry |

### Migration Status

Service connections have been replaced with:
- GitHub Actions OIDC authentication
- Azure managed identities
- GitHub-native repository access

---

## 4. Agent Pools Status

| Pool | Type | Status |
|------|------|--------|
| Azure Pipelines | Microsoft-hosted | No longer needed |
| Default | Self-hosted | Check for other uses before removing |

---

## 5. Decommissioning Script

```powershell
# Azure DevOps Decommissioning Script
# Run this AFTER verifying GitHub Actions are fully operational

$PAT = "YOUR_PAT_TOKEN"
$Organization = "citadelcloudmanagement"
$Project = "DatingPlatform"

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$PAT"))
    "Content-Type" = "application/json"
}

$baseUrl = "https://dev.azure.com/$Organization/$Project"

Write-Host "=== Azure DevOps Decommissioning ===" -ForegroundColor Cyan

# Step 1: Disable all pipelines
Write-Host "`nStep 1: Disabling pipelines..." -ForegroundColor Yellow
$pipelineIds = @(23, 24, 25, 26)
foreach ($id in $pipelineIds) {
    $body = @{ queueStatus = "disabled" } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$baseUrl/_apis/build/definitions/$id`?api-version=7.1" -Method Patch -Headers $headers -Body $body
        Write-Host "  Disabled pipeline ID: $id" -ForegroundColor Green
    } catch {
        Write-Host "  Failed to disable pipeline ID: $id - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 2: Delete pipeline definitions (uncomment when ready)
Write-Host "`nStep 2: Pipeline deletion (uncomment in script to execute)..." -ForegroundColor Yellow
# foreach ($id in $pipelineIds) {
#     try {
#         Invoke-RestMethod -Uri "$baseUrl/_apis/build/definitions/$id`?api-version=7.1" -Method Delete -Headers $headers
#         Write-Host "  Deleted pipeline ID: $id" -ForegroundColor Green
#     } catch {
#         Write-Host "  Failed to delete pipeline ID: $id - $($_.Exception.Message)" -ForegroundColor Red
#     }
# }

# Step 3: List variable groups (manual review required)
Write-Host "`nStep 3: Variable groups to review..." -ForegroundColor Yellow
$vgs = Invoke-RestMethod -Uri "$baseUrl/_apis/distributedtask/variablegroups?api-version=7.1" -Headers $headers
$vgs.value | ForEach-Object {
    Write-Host "  Variable Group: $($_.name) (ID: $($_.id))" -ForegroundColor Cyan
}

# Step 4: List service connections (manual review required)
Write-Host "`nStep 4: Service connections to review..." -ForegroundColor Yellow
$connections = Invoke-RestMethod -Uri "$baseUrl/_apis/serviceendpoint/endpoints?api-version=7.1" -Headers $headers
$connections.value | ForEach-Object {
    Write-Host "  Service Connection: $($_.name) (Type: $($_.type))" -ForegroundColor Cyan
}

Write-Host "`n=== Decommissioning Summary ===" -ForegroundColor Cyan
Write-Host "Pipelines disabled: $($pipelineIds.Count)"
Write-Host "Variable groups to remove: $($vgs.count)"
Write-Host "Service connections to remove: $($connections.count)"
Write-Host "`nMANUAL STEPS REQUIRED:" -ForegroundColor Yellow
Write-Host "1. Verify GitHub Actions are fully operational"
Write-Host "2. Run production deployment through GitHub Actions"
Write-Host "3. Delete variable groups through Azure DevOps UI"
Write-Host "4. Delete service connections through Azure DevOps UI"
Write-Host "5. Archive or delete the Azure DevOps project"
```

---

## 6. Rollback Plan

In case GitHub Actions experience issues, the following rollback steps apply:

1. Re-enable Azure DevOps pipelines using the same script (change queueStatus to "enabled")
2. Variable groups and service connections should NOT be deleted until GitHub Actions are verified for at least 2 weeks
3. Keep Azure DevOps agent pools active for 30 days after migration

---

## 7. Verification Checklist

Before executing decommissioning:

- [ ] GitHub Actions CI workflow runs successfully
- [ ] GitHub Actions deploys to dev environment
- [ ] GitHub Actions deploys to staging environment
- [ ] GitHub Actions deploys to production environment
- [ ] Self-healing agent is operational
- [ ] Secret rotation completes successfully
- [ ] Drift detection works correctly
- [ ] All team members have GitHub access
- [ ] Documentation is updated

---

## 8. Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Migration Complete | Done | Complete |
| Parallel Running | 2 weeks | Pending |
| Azure DevOps Disabled | Day 15 | Pending |
| Azure DevOps Archived | Day 30 | Pending |
| Azure DevOps Deleted | Day 60 | Pending |

---

## 9. Responsible Parties

| Action | Owner | Approver |
|--------|-------|----------|
| Disable pipelines | DevOps Engineer | Tech Lead |
| Delete variable groups | DevOps Engineer | Security Lead |
| Remove service connections | DevOps Engineer | Platform Lead |
| Archive project | Platform Lead | CTO |

---

## 10. Post-Decommissioning Actions

1. Update all documentation to reference GitHub Actions
2. Remove Azure DevOps references from README files
3. Archive pipelines/ folder in repository (or delete)
4. Update onboarding documentation
5. Remove Azure DevOps from team tooling list

---

*This report was generated as part of the Azure DevOps to GitHub Actions migration.*
*Migration orchestrated by Autonomous Multi-Agent Orchestrator.*
