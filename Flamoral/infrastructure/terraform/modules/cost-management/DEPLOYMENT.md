# Cost Management Module - Deployment Guide

## Prerequisites

1. **Azure CLI** installed and configured
   ```bash
   az --version
   az login
   az account set --subscription "Dating-Prod"
   ```

2. **Terraform** v1.4 or higher
   ```bash
   terraform --version
   ```

3. **Required Azure Permissions**
   - Cost Management Contributor
   - Monitoring Contributor
   - Resource Policy Contributor (for tagging policy)

4. **Notification Email Addresses**
   - Prepare list of emails for budget alerts
   - Verify emails can receive Azure notifications

## Deployment Steps

### Step 1: Review Configuration

Edit `terraform.tfvars` for your environment:

```hcl
# Production example
enable_cost_management = true
cost_notification_emails = [
  "devops@flamoral.com",
  "finance@flamoral.com"
]

overall_monthly_budget    = 2500
compute_monthly_budget    = 600
storage_monthly_budget    = 200
networking_monthly_budget = 400
database_monthly_budget   = 800

cost_center   = "engineering"
billing_owner = "platform-team"
team_name     = "platform"
```

### Step 2: Initialize Terraform

```bash
cd infrastructure/terraform/environments/prod
terraform init
```

### Step 3: Plan Deployment

```bash
terraform plan -target=module.cost_management
```

Review the plan to ensure:
- 5 budgets will be created (overall, compute, storage, networking, database)
- 1 action group for cost alerts
- 1 storage account for cost exports (if enabled)
- 1 policy assignment for tag enforcement (if enabled)

### Step 4: Deploy Cost Management

```bash
terraform apply -target=module.cost_management
```

Confirm with `yes` when prompted.

### Step 5: Verify Deployment

```bash
# List budgets
az consumption budget list --subscription <subscription-id> --output table

# Verify action group
az monitor action-group list --resource-group flamoral-prod-rg --output table

# Check storage account (if cost export enabled)
az storage account list --resource-group flamoral-prod-rg --query "[?contains(name,'costexp')]" --output table
```

### Step 6: Configure Cost Export (Manual)

Azure Cost Export must be configured via Portal or CLI (not available in Terraform):

```bash
# Get storage account details
STORAGE_ACCOUNT=$(terraform output -json cost_management.cost_export_storage_account_name | jq -r)
CONTAINER_NAME=$(terraform output -json cost_management.cost_export_container_name | jq -r)

# Configure cost export via Azure Portal
# Navigate to: Cost Management > Exports > Add
# - Name: flamoral-prod-daily-export
# - Type: Daily export of month-to-date costs
# - Storage account: $STORAGE_ACCOUNT
# - Container: $CONTAINER_NAME
# - Format: CSV
```

Or use Azure CLI:

```bash
az costmanagement export create \
  --name flamoral-prod-daily-export \
  --type ActualCost \
  --scope "/subscriptions/<subscription-id>" \
  --storage-account-id "/subscriptions/<subscription-id>/resourceGroups/flamoral-prod-rg/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT" \
  --storage-container "$CONTAINER_NAME" \
  --timeframe MonthToDate \
  --schedule-status Active \
  --schedule-recurrence Daily
```

### Step 7: Deploy Tagging Policy (Optional)

```bash
# Create policy definition
az policy definition create \
  --name flamoral-cost-tags \
  --mode Indexed \
  --rules infrastructure/azure/cost-tags-policy.json \
  --params '{"effect":{"type":"String","allowedValues":["Audit","Deny"],"defaultValue":"Audit"}}'

# Assign to production resource group
az policy assignment create \
  --name flamoral-cost-tags-prod \
  --policy flamoral-cost-tags \
  --scope /subscriptions/<subscription-id>/resourceGroups/flamoral-prod-rg \
  --params '{"effect":{"value":"Deny"}}'
```

### Step 8: Test Budget Alerts

```bash
# View budget details
az consumption budget show \
  --budget-name flamoral-prod-overall-budget \
  --subscription <subscription-id>

# Verify notification configuration
az consumption budget show \
  --budget-name flamoral-prod-overall-budget \
  --subscription <subscription-id> \
  --query "notifications" \
  --output json
```

### Step 9: Generate Initial Cost Report

```bash
cd ../../../scripts
./check-cost-recommendations.sh -o markdown -f initial-cost-report.md
```

## Environment-Specific Configurations

### Production

```hcl
overall_monthly_budget    = 2500
compute_monthly_budget    = 600
storage_monthly_budget    = 200
networking_monthly_budget = 400
database_monthly_budget   = 800
```

### Staging

```hcl
overall_monthly_budget    = 500
compute_monthly_budget    = 150
storage_monthly_budget    = 50
networking_monthly_budget = 100
database_monthly_budget   = 150
```

### Development

```hcl
overall_monthly_budget    = 200
compute_monthly_budget    = 50
storage_monthly_budget    = 25
networking_monthly_budget = 50
database_monthly_budget   = 50
```

## Post-Deployment Tasks

### Week 1: Monitoring Setup

- [ ] Verify budget alert emails are received
- [ ] Test notification channels (email, Slack if configured)
- [ ] Review initial cost baseline
- [ ] Configure Power BI dashboard (optional)

### Week 2: Tag Compliance

- [ ] Audit existing resources for tag compliance
- [ ] Apply required tags to non-compliant resources
- [ ] Enable deny mode for tagging policy (production)

### Month 1: Optimization

- [ ] Run weekly cost recommendation reports
- [ ] Identify unused resources
- [ ] Evaluate reserved instance opportunities
- [ ] Set up automated shutdown for non-production (optional)

### Ongoing

- [ ] Daily cost review (automated via script)
- [ ] Weekly Advisor recommendations review
- [ ] Monthly budget vs. actual analysis
- [ ] Quarterly reserved instance review

## Troubleshooting

### Issue: Budget alerts not received

**Solution:**
1. Check email addresses in budget configuration
2. Verify emails are not blocked/spam filtered
3. Check Azure Service Health for notification issues
4. Test with action group test notification

```bash
az monitor action-group test-notifications create \
  --action-group-name flamoral-cost-anomaly-prod \
  --resource-group flamoral-prod-rg \
  --notification-type Email \
  --receivers devops@flamoral.com
```

### Issue: Permission denied errors

**Solution:**
Ensure your account has required roles:

```bash
# Check current role assignments
az role assignment list --assignee <your-user-id> --output table

# Assign Cost Management Contributor role
az role assignment create \
  --role "Cost Management Contributor" \
  --assignee <your-user-id> \
  --scope /subscriptions/<subscription-id>

# Assign Monitoring Contributor role
az role assignment create \
  --role "Monitoring Contributor" \
  --assignee <your-user-id> \
  --scope /subscriptions/<subscription-id>
```

### Issue: Budgets not appearing in Azure Portal

**Solution:**
- Budgets have 24-48 hour delay before showing cost data
- Ensure subscription has cost data (incurred charges)
- Check budget scope matches your subscription ID

### Issue: Cost export not working

**Solution:**
1. Verify storage account permissions
2. Check export schedule configuration
3. Review Azure Cost Management service health
4. Ensure storage account is not behind firewall

```bash
# Check storage account network rules
az storage account show \
  --name $STORAGE_ACCOUNT \
  --resource-group flamoral-prod-rg \
  --query "networkRuleSet.defaultAction"

# Allow Azure services
az storage account update \
  --name $STORAGE_ACCOUNT \
  --resource-group flamoral-prod-rg \
  --bypass AzureServices \
  --default-action Allow
```

## Cleanup / Removal

To remove cost management resources:

```bash
# Destroy cost management module only
terraform destroy -target=module.cost_management

# Or disable via variable
# In terraform.tfvars:
enable_cost_management = false

terraform apply
```

**Warning:** This will remove all budgets and alerts!

## Integration with CI/CD

### Azure DevOps Pipeline

```yaml
trigger:
  - main

schedules:
  - cron: "0 8 * * 1"  # Every Monday at 8 AM
    displayName: Weekly Cost Review
    branches:
      include:
        - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: AzureCLI@2
    displayName: 'Generate Cost Report'
    inputs:
      azureSubscription: 'Dating-Prod'
      scriptType: 'bash'
      scriptLocation: 'scriptPath'
      scriptPath: 'scripts/check-cost-recommendations.sh'
      arguments: '-o markdown -f weekly-cost-report.md'

  - task: PublishBuildArtifacts@1
    displayName: 'Publish Cost Report'
    inputs:
      PathtoPublish: 'weekly-cost-report.md'
      ArtifactName: 'cost-reports'
```

### GitHub Actions

```yaml
name: Weekly Cost Review

on:
  schedule:
    - cron: '0 8 * * 1'  # Every Monday at 8 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  cost-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Generate Cost Report
        run: |
          chmod +x scripts/check-cost-recommendations.sh
          ./scripts/check-cost-recommendations.sh -o markdown -f weekly-cost-report.md

      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: cost-report
          path: weekly-cost-report.md
```

## Support

For issues or questions:
- **Documentation:** `COST_MANAGEMENT_GUIDE.md`
- **Module README:** `infrastructure/terraform/modules/cost-management/README.md`
- **Support Email:** devops@flamoral.com
- **Azure Support:** https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade

## References

- [Azure Cost Management Documentation](https://docs.microsoft.com/azure/cost-management-billing/)
- [Terraform AzureRM Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure Budgets API](https://docs.microsoft.com/rest/api/consumption/budgets)
- [Azure Advisor](https://docs.microsoft.com/azure/advisor/)
