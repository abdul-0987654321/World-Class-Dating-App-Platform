# Monitoring Module

This module creates Azure Log Analytics Workspace and Application Insights for comprehensive monitoring and observability.

## Features

- Log Analytics Workspace with PerGB2018 pricing tier
- Application Insights integrated with Log Analytics
- Configurable log retention period (30-730 days)
- Web application type configured for Application Insights

## Usage

```hcl
module "monitoring" {
  source = "./modules/monitoring"

  workspace_name      = "log-datingplatform-prod"
  app_insights_name   = "appi-datingplatform-prod"
  resource_group_name = module.resource_group.name
  location            = "eastus"
  environment         = "prod"
  retention_days      = 90
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| workspace_name | The name of the Log Analytics Workspace | `string` | n/a | yes |
| app_insights_name | The name of the Application Insights instance | `string` | n/a | yes |
| resource_group_name | The name of the resource group | `string` | n/a | yes |
| location | The Azure region where the monitoring resources will be created | `string` | n/a | yes |
| retention_days | The number of days to retain logs in the workspace | `number` | `30` | no |
| environment | The environment name (dev, test, prod) | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| workspace_id | The ID of the Log Analytics Workspace |
| instrumentation_key | The instrumentation key for Application Insights (sensitive) |
| app_insights_connection_string | The connection string for Application Insights (sensitive) |

## Requirements

- Terraform >= 1.0
- azurerm provider >= 3.0

## Notes

- The Log Analytics Workspace uses the PerGB2018 pricing tier
- Application Insights is workspace-based for better integration
- Retention days must be between 30 and 730 days
- Use the instrumentation key or connection string in your applications for telemetry
