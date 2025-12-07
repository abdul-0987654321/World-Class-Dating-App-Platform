# Resource Group Module

This module creates an Azure Resource Group with lifecycle management and standardized tagging.

## Features

- Lifecycle management with prevent_destroy option
- Automatic environment and managed-by tags
- Ignores changes to CreatedDate tag
- Environment validation (dev, test, prod)

## Usage

```hcl
module "resource_group" {
  source = "./modules/resource-group"

  name        = "rg-datingplatform-prod-eastus"
  location    = "eastus"
  environment = "prod"

  tags = {
    Project     = "DatingPlatform"
    CostCenter  = "Engineering"
    Owner       = "Platform Team"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| name | The name of the resource group | `string` | n/a | yes |
| location | The Azure region where the resource group will be created | `string` | n/a | yes |
| environment | The environment name (dev, test, prod) | `string` | n/a | yes |
| tags | A mapping of tags to assign to the resource | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| id | The ID of the resource group |
| name | The name of the resource group |
| location | The location of the resource group |

## Requirements

- Terraform >= 1.0
- azurerm provider >= 3.0
