# Cost Management Terraform Module

This module implements comprehensive cost monitoring, budgets, and alerts for Azure resources in the Flamoral dating platform.

## Features

- **Multi-level Budgets**: Subscription and resource group level budgets with customizable thresholds
- **Cost Allocation Tags**: Enforced tagging strategy for cost tracking
- **Budget Alerts**: Email notifications at 50%, 75%, 90%, and 100% thresholds
- **Cost Export**: Daily cost data export to storage for analysis
- **Action Groups**: Azure Monitor integration for anomaly detection
- **Tagging Policy**: Automated tag enforcement via Azure Policy

## Budgets Created

### 1. Overall Subscription Budget
- Tracks total subscription spending
- Alerts at 50%, 75%, 90%, 100% (actual) and 100% (forecasted)

### 2. Compute Budget
- Monitors AKS clusters, VMs, and VM scale sets
- Separate tracking for compute-intensive workloads

### 3. Storage Budget
- Tracks Storage Accounts and CosmosDB
- Monitors data storage and throughput costs

### 4. Networking Budget
- Monitors Front Door, CDN, Public IPs, VNets, Load Balancers
- Tracks bandwidth and routing costs

### 5. Database Budget
- Monitors PostgreSQL, Redis, SignalR
- Tracks database and caching costs

## Usage

```hcl
module "cost_management" {
  source = "./modules/cost-management"

  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  prefix              = var.prefix
  env                 = var.environment

  # Budget amounts (USD/month)
  overall_monthly_budget    = 2500
  compute_monthly_budget    = 600
  storage_monthly_budget    = 200
  networking_monthly_budget = 400
  database_monthly_budget   = 800

  # Notification configuration
  notification_emails = [
    "devops@flamoral.com",
    "finance@flamoral.com"
  ]

  # Cost allocation
  cost_center    = "engineering"
  billing_owner  = "platform-team"
  team           = "platform"

  # Feature flags
  enable_cost_export      = true
  enforce_tagging_policy  = true

  tags = var.tags
}
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

## Required Tags

All resources must include:
- `Environment`: dev, staging, prod
- `Service`: Service name (e.g., flamoral-platform)
- `Team`: Team responsible (e.g., platform)
- `CostCenter`: Cost center code (e.g., engineering)
- `BillingOwner`: Person/team accountable
- `ManagedBy`: terraform

## Cost Export

When enabled, cost data is exported daily to a storage account:
- Container: `cost-exports`
- Format: CSV
- Schedule: Daily (configurable)
- Retention: 365 days (configurable)

### Accessing Cost Data

```bash
# List cost export files
az storage blob list \
  --account-name <storage_account_name> \
  --container-name cost-exports \
  --output table

# Download latest export
az storage blob download \
  --account-name <storage_account_name> \
  --container-name cost-exports \
  --name "latest-export.csv" \
  --file "./cost-export.csv"
```

## Integration with Power BI

Cost export data can be consumed by Power BI:

1. Connect to Azure Storage
2. Use the cost-exports container
3. Set up incremental refresh
4. Create dashboards from the CSV data

See `COST_MANAGEMENT_GUIDE.md` for detailed Power BI setup instructions.

## Azure Advisor Integration

Run the cost recommendations script to check for optimization opportunities:

```bash
cd ../../scripts
./check-cost-recommendations.sh
```

## Outputs

- `budget_ids`: Map of all budget resource IDs
- `budget_names`: Map of all budget names
- `cost_anomaly_action_group_id`: Action group for alerts
- `cost_export_storage_account_name`: Storage account for cost exports
- `cost_export_container_name`: Container name for exports
- `cost_tags`: Standard tags applied to resources

## Alert Notifications

Email notifications are sent when:
- Budget reaches 50% (warning)
- Budget reaches 75% (alert)
- Budget reaches 90% (critical)
- Budget reaches 100% (exceeded)
- Forecasted spending exceeds 100%

## Manual Configuration Required

Some Azure Cost Management features are not available via Terraform:

1. **Cost Export Schedule**: Must be configured via Portal or CLI
   ```bash
   # See scripts/setup-cost-export.sh
   ```

2. **Cost Anomaly Detection**: Requires Azure Cost Management Connector
   - Configure in Azure Portal > Cost Management > Anomaly Detection

3. **Azure Advisor**: Recommendations are automatic but should be reviewed regularly
   ```bash
   # See scripts/check-cost-recommendations.sh
   ```

## Maintenance

### Update Budgets
```bash
terraform apply -var="overall_monthly_budget=3000"
```

### Add Notification Emails
```bash
terraform apply -var='notification_emails=["new@email.com","old@email.com"]'
```

### Disable Cost Export
```bash
terraform apply -var="enable_cost_export=false"
```

## Troubleshooting

### "Budget already exists"
Budgets are scoped to subscription/resource group. Ensure unique names per environment.

### "Insufficient permissions"
Required roles:
- Cost Management Contributor
- Monitoring Contributor
- Resource Policy Contributor (for tagging policy)

### "No cost data available"
Cost data has a 24-48 hour delay. Wait for data to populate in Azure Cost Management.

## Related Documentation

- `COST_MANAGEMENT_GUIDE.md`: Comprehensive cost optimization guide
- `scripts/check-cost-recommendations.sh`: Azure Advisor automation
- `infrastructure/azure/budget-alerts.json`: Alternative JSON configuration
- `infrastructure/azure/cost-tags-policy.json`: Azure Policy definition

## References

- [Azure Cost Management](https://docs.microsoft.com/azure/cost-management-billing/)
- [Terraform AzureRM Provider - Budget](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/consumption_budget_subscription)
- [Azure Advisor](https://docs.microsoft.com/azure/advisor/)
