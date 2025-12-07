# App Service Module

This module creates an Azure App Service (Linux) with a service plan, managed identity, and environment-specific configurations.

## Features

- Linux-based App Service with Docker support
- System-assigned managed identity
- Always-on enabled for production environments
- HTTPS-only enforcement
- HTTP/2 enabled
- TLS 1.2 minimum version
- FTPS disabled for security
- Configurable app settings

## Usage

```hcl
module "app_service" {
  source = "./modules/app-service"

  name                = "app-datingplatform-api-prod"
  resource_group_name = module.resource_group.name
  location            = "eastus"
  environment         = "prod"
  sku_name            = "P1v2"

  app_settings = {
    "ASPNETCORE_ENVIRONMENT"      = "Production"
    "ApplicationInsights__InstrumentationKey" = module.monitoring.instrumentation_key
    "DatabaseConnectionString"    = module.sql_database.connection_string
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| name | The name of the App Service | `string` | n/a | yes |
| resource_group_name | The name of the resource group | `string` | n/a | yes |
| location | The Azure region where the App Service will be created | `string` | n/a | yes |
| sku_name | The SKU for the App Service Plan (e.g., B1, P1v2, P2v2) | `string` | `"B1"` | no |
| app_settings | A map of app settings to configure for the App Service | `map(string)` | `{}` | no |
| environment | The environment name (dev, test, prod) | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| id | The ID of the App Service |
| default_hostname | The default hostname of the App Service |
| identity_principal_id | The Principal ID of the managed identity |

## Requirements

- Terraform >= 1.0
- azurerm provider >= 3.0

## Notes

- Always-on is enabled only for production environments to save costs in dev/test
- The default Docker image is nginx:latest; update the application_stack configuration for your specific container
- Use the managed identity principal ID to grant access to other Azure resources
