# Flamoral Dating Platform - Azure Cost Control

This directory contains scripts and documentation for managing Azure costs across the Flamoral Dating Platform environments.

## Quick Start

```powershell
# Run from this directory
cd infrastructure/cost-control/scripts

# Generate inventory report
.\inventory-resources.ps1

# Generate cost analysis report
.\generate-cost-report.ps1

# Shutdown non-prod resources (dry run first)
.\shutdown-nonprod.ps1 -DryRun

# Apply production locks
.\apply-production-locks.ps1
```

## Directory Structure

```
cost-control/
├── README.md               # This file
├── cost-report.md          # Generated cost analysis report
└── scripts/
    ├── inventory-resources.ps1      # Resource inventory scanner
    ├── shutdown-nonprod.ps1         # Non-prod resource shutdown
    ├── startup-nonprod.ps1          # Non-prod resource startup
    ├── setup-budgets.ps1            # Azure Budget configuration
    ├── apply-production-locks.ps1   # Production resource protection
    └── generate-cost-report.ps1     # Cost analysis generator
```

## Scripts Overview

### inventory-resources.ps1
Scans all resource groups and generates a JSON inventory of resources with estimated costs.

```powershell
.\inventory-resources.ps1 -OutputPath ".\my-inventory.json"
```

### shutdown-nonprod.ps1
Safely stops/deallocates all non-production resources to minimize costs.

**Features:**
- Deallocates VMs
- Scales AKS node pools to zero
- Stops PostgreSQL/MySQL flexible servers
- Stops App Services

```powershell
# Dry run (no changes)
.\shutdown-nonprod.ps1 -DryRun

# Execute shutdown
.\shutdown-nonprod.ps1

# Force execution even if production check fails
.\shutdown-nonprod.ps1 -Force
```

### startup-nonprod.ps1
Restarts non-production resources with explicit approval required.

```powershell
# Start all non-prod
.\startup-nonprod.ps1

# Start only dev environment
.\startup-nonprod.ps1 -Environment dev

# Skip confirmation prompt
.\startup-nonprod.ps1 -SkipConfirmation
```

### setup-budgets.ps1
Configures Azure Budgets with alert thresholds.

**Configured Budgets:**
| Budget | Amount | Alerts |
|--------|--------|--------|
| Production | $1,500/mo | 50%, 75%, 90%, 100% |
| Development | $100/mo | 50%, 80%, 100% |
| Staging | $200/mo | 50%, 80%, 100% |
| Subscription Total | $2,500/mo | 50%, 75%, 90%, 100%, 110% |

```powershell
.\setup-budgets.ps1 -NotificationEmail "alerts@flamoral.com"
```

### apply-production-locks.ps1
Applies resource locks to production resource groups.

```powershell
# Apply CanNotDelete locks
.\apply-production-locks.ps1

# Apply ReadOnly locks (more restrictive)
.\apply-production-locks.ps1 -LockLevel ReadOnly

# Remove locks (use with caution)
.\apply-production-locks.ps1 -RemoveLocks
```

### generate-cost-report.ps1
Generates a comprehensive Markdown cost analysis report.

```powershell
.\generate-cost-report.ps1 -OutputPath "..\cost-report.md"
```

## Environment Classification

| Environment | Resource Groups | Protected | Shutdown Allowed |
|-------------|-----------------|-----------|------------------|
| Production | flamoral-prod-rg | Yes | NO |
| Shared | flamoral-shared-rg, flamoral-tfstate-rg | Yes | NO |
| Development | flamoral-dev-rg | No | Yes |
| Staging | flamoral-staging-rg | No | Yes |

## Current Cost Summary

| Environment | Monthly Cost | Notes |
|-------------|-------------|-------|
| Production | ~$1,300 | Front Door, Redis, SignalR, Storage |
| Shared | ~$480 | Premium ACR, TF State Storage |
| Development | ~$5 | Basic ACR only |
| Staging | ~$5 | Basic ACR only |
| **Total** | **~$1,790** | |

### Key Production Resources (Protected)
- Azure Front Door Premium: ~$325/mo
- Redis Cache Premium P1: ~$411/mo
- SignalR Premium P1: ~$100/mo
- ACR Premium (shared): ~$450/mo
- Log Analytics: ~$30/mo
- Storage (GRS): ~$15/mo
- Key Vaults (10x): ~$10/mo
- Public IP (Standard): ~$4/mo

### Not Yet Deployed
- AKS Cluster: Would add ~$400-600/mo
- PostgreSQL Flexible Server: Would add ~$300-500/mo

## Cost Optimization Recommendations

1. **Non-prod Shutdown** - Stop dev/staging resources when not in use
2. **Right-sizing** - Consider downgrading Premium ACR if not using all features
3. **Reserved Instances** - For long-running production resources
4. **Auto-scale policies** - For AKS when deployed

## Safety Guardrails

1. **Production resources are NEVER modified** by shutdown scripts
2. **Resource locks** prevent accidental deletion of critical resources
3. **Startup requires explicit approval** (type 'START' to confirm)
4. **Dry run mode** available on all modification scripts
5. **All actions are logged** to JSON files

## Automation Integration

### Azure DevOps Pipeline
Add to your pipeline for scheduled shutdown:

```yaml
schedules:
  - cron: "0 22 * * 1-5"  # 10 PM weekdays
    displayName: "Nightly non-prod shutdown"
    branches:
      include:
        - main

steps:
  - task: AzurePowerShell@5
    inputs:
      azureSubscription: 'your-service-connection'
      ScriptType: 'FilePath'
      ScriptPath: 'infrastructure/cost-control/scripts/shutdown-nonprod.ps1'
      azurePowerShellVersion: 'LatestVersion'
```

### GitHub Actions
```yaml
on:
  schedule:
    - cron: '0 22 * * 1-5'  # 10 PM UTC weekdays

jobs:
  shutdown:
    runs-on: ubuntu-latest
    steps:
      - uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - run: |
          pwsh infrastructure/cost-control/scripts/shutdown-nonprod.ps1
```

## Troubleshooting

### "Resource group not found"
Ensure you're logged into the correct Azure subscription:
```powershell
az account show
az account set --subscription "Dating-Prod"
```

### "Lock prevents operation"
Production resources are protected. Remove locks first:
```powershell
.\apply-production-locks.ps1 -RemoveLocks
# ... perform operation ...
.\apply-production-locks.ps1
```

### "Insufficient permissions"
Ensure your account has Contributor role on the subscription or resource groups.
