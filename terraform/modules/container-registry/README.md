# Container Registry Module

This module creates an Azure Container Registry with environment-specific configurations, content trust for production, and retention policies.

## Features

- Environment-specific SKU support
- Content trust enabled for production
- Retention policies (30 days for prod, 7 days for dev/test)
- Optional admin user access
- Automatic tagging

## Usage

```hcl
module "container_registry" {
  source = "./modules/container-registry"

  name                = "acrdatingplatformprod"
  resource_group_name = module.resource_group.name
  location            = "eastus"
  environment         = "prod"
  sku                 = "Premium"
  admin_enabled       = false
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| name | The name of the Container Registry | `string` | n/a | yes |
| resource_group_name | The name of the resource group | `string` | n/a | yes |
| location | The Azure region where the Container Registry will be created | `string` | n/a | yes |
| sku | The SKU name for the Container Registry (Basic, Standard, Premium) | `string` | `"Basic"` | no |
| admin_enabled | Enable admin user for the Container Registry | `bool` | `false` | no |
| environment | The environment name (dev, test, prod) | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| id | The ID of the Container Registry |
| login_server | The login server URL of the Container Registry |
| admin_username | The admin username for the Container Registry |
| admin_password | The admin password for the Container Registry (sensitive) |

## Requirements

- Terraform >= 1.0
- azurerm provider >= 3.0

## Notes

- Content trust is automatically enabled for production environments
- Premium SKU is required for content trust and geo-replication
- Admin access should be disabled in production; use managed identities instead
