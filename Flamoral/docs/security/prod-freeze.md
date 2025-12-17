# Production Freeze Policy - Flamoral

Last Updated: 2025-12-12

## Overview

Production deployments are **FROZEN by default**. This document defines the controls, unlock procedures, and compliance requirements for production releases.

---

## Current Freeze Status

| Control | Status | Enforced By |
|---------|--------|-------------|
| GitHub Environment Protection | ACTIVE | GitHub |
| Azure DevOps Manual Approval | ACTIVE | Azure DevOps |
| Pipeline Deployment Flag | ACTIVE | Variable `PROD_DEPLOY_ENABLED=false` |
| Resource Group Lock | RECOMMENDED | Azure ARM |

---

## Freeze Controls

### 1. GitHub Environment Protection

**Location:** Repository Settings > Environments > `production`

**Required Reviewers:**
- Platform Owner
- Engineering Lead

**Protection Rules:**
- Wait timer: 0 minutes (immediate after approval)
- Prevent self-review: Enabled
- Required reviewers: 2

### 2. Azure DevOps Manual Approval

**Location:** Pipeline YAML (azure-pipelines-cd.yml)

**Configuration:**
```yaml
- stage: ProductionApproval
  dependsOn: StagingDeployment
  jobs:
  - job: ManualValidation
    pool: server
    timeoutInMinutes: 4320  # 3 days
    steps:
    - task: ManualValidation@0
      inputs:
        notifyUsers: |
          devops@flamoral.com
          engineering-leads@flamoral.com
        instructions: |
          PRODUCTION DEPLOYMENT APPROVAL REQUIRED

          Verify:
          - [ ] All staging tests passed
          - [ ] Performance metrics acceptable
          - [ ] No critical bugs reported
          - [ ] Database migrations reviewed
          - [ ] Rollback plan documented
```

### 3. Pipeline Deployment Flag

**Variable Group:** `flamoral-prod-vars`

**Variable:**
```
PROD_DEPLOY_ENABLED=false
```

**Pipeline Check:**
```yaml
- script: |
    if [ "$PROD_DEPLOY_ENABLED" != "true" ]; then
      echo "##vso[task.logissue type=error]Production deployment is FROZEN"
      echo "Set PROD_DEPLOY_ENABLED=true to unlock"
      exit 1
    fi
  displayName: 'Check Production Freeze'
```

### 4. Azure Resource Lock (Recommended)

```bash
# Apply CanNotDelete lock to production resource group
az lock create \
  --name "prod-no-delete" \
  --resource-group flamoral-prod-rg \
  --lock-type CanNotDelete \
  --notes "Prevent accidental resource deletion"
```

---

## Unlock Procedure

### Pre-Requisites

1. **Deployment Ticket** - Create issue/ticket documenting:
   - What is being deployed
   - Why it needs production deployment
   - Risk assessment
   - Rollback plan

2. **Approval Chain:**
   - Engineering Lead approval
   - Platform Owner approval
   - Security review (for security-related changes)

### Steps to Unlock

1. **Set Variable Flag**
   ```bash
   # Azure DevOps
   # Navigate to: Pipelines > Library > flamoral-prod-vars
   # Set: PROD_DEPLOY_ENABLED = true
   ```

2. **Trigger Deployment**
   ```bash
   # Option A: Manual trigger via Azure DevOps UI
   # Navigate to: Pipelines > [Pipeline Name] > Run pipeline

   # Option B: GitHub workflow dispatch
   gh workflow run unified-cd-production.yml
   ```

3. **Approve in Environment**
   - Reviewers will receive notification
   - Both reviewers must approve
   - Deployment proceeds after approval

4. **Re-Freeze After Deployment**
   ```bash
   # IMMEDIATELY after successful deployment:
   # Set: PROD_DEPLOY_ENABLED = false
   ```

---

## Emergency Hotfix Procedure

For critical production issues requiring immediate deployment:

1. **Declare Emergency**
   - Notify: Platform Owner, Engineering Lead, On-Call
   - Document: Issue severity and impact

2. **Fast-Track Approval**
   - Single approver sufficient for P0/P1 issues
   - Document waiver reason in deployment ticket

3. **Deploy Fix**
   - Use same unlock procedure
   - Skip non-essential staging tests if time-critical

4. **Post-Incident**
   - Re-freeze immediately
   - Conduct incident review within 24 hours
   - Document lessons learned

---

## Audit Trail

All production deployments are logged:

| Source | Location |
|--------|----------|
| Azure DevOps | Pipeline run history |
| GitHub Actions | Workflow run logs |
| Azure Activity Log | Resource group activity |
| Key Vault Audit | Diagnostic logs in Log Analytics |

**Query for recent deployments:**
```kusto
AzureActivity
| where ResourceGroup == "flamoral-prod-rg"
| where OperationNameValue contains "deploy"
| project TimeGenerated, Caller, OperationNameValue, ActivityStatus
| order by TimeGenerated desc
| take 50
```

---

## Compliance Requirements

| Requirement | Control |
|-------------|---------|
| Change Management | Deployment ticket required |
| Separation of Duties | Deployer cannot self-approve |
| Audit Logging | All actions logged |
| Rollback Capability | Blue-green deployment |
| Documentation | All changes documented |

---

## Contact for Production Access

| Role | Contact |
|------|---------|
| Platform Owner | [Owner contact] |
| Engineering Lead | engineering-leads@flamoral.com |
| DevOps On-Call | devops@flamoral.com |
| Security Team | security@flamoral.com |

---

## Related Documents

- [Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md)
- [Rollback Procedures](../deployment/ROLLBACK_PROCEDURES.md)
- [CI/CD Pipeline Guide](../deployment/CICD_PIPELINE_GUIDE.md)
