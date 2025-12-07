# Key Vault Module

This module creates an Azure Key Vault with soft delete, optional purge protection, and network rules.

## Features

- Soft delete with 90-day retention period
- Optional purge protection (recommended for production)
- Network ACLs with environment-specific defaults
- Enabled for deployment, disk encryption, and template deployment
- Azure Services bypass for network ACLs

## Usage

```hcl
data "azurerm_client_config" "current" {}

module "key_vault" {
  source = "./modules/key-vault"

  name                     = "kv-datingplatform-prod"
  resource_group_name      = module.resource_group.name
  location                 = "eastus"
  tenant_id                = data.azurerm_client_config.current.tenant_id
  environment              = "prod"
  sku_name                 = "standard"
  enable_purge_protection  = true
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| name | The name of the Key Vault | `string` | n/a | yes |
| resource_group_name | The name of the resource group | `string` | n/a | yes |
| location | The Azure region where the Key Vault will be created | `string` | n/a | yes |
| tenant_id | The Azure Active Directory tenant ID | `string` | n/a | yes |
| sku_name | The SKU name for the Key Vault (standard or premium) | `string` | `"standard"` | no |
| environment | The environment name (dev, test, prod) | `string` | n/a | yes |
| enable_purge_protection | Enable purge protection for the Key Vault (recommended for production) | `bool` | `false` | no |

## Outputs

| Name | Description |
|------|-------------|
| id | The ID of the Key Vault |
| vault_uri | The URI of the Key Vault |
| name | The name of the Key Vault |

## Requirements

- Terraform >= 1.0
- azurerm provider >= 3.0

## Notes

- Network ACL default action is "Deny" for production and "Allow" for dev/test
- Purge protection should be enabled for production environments
- Soft delete retention is fixed at 90 days
