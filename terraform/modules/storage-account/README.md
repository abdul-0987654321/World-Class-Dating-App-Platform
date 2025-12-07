# Storage Account Module

This module creates an Azure Storage Account with blob versioning, soft delete, and security best practices.

## Features

- Blob versioning enabled
- Soft delete with configurable retention period
- HTTPS-only traffic enforcement
- TLS 1.2 minimum version
- Public blob access disabled by default
- Environment-specific configurations

## Usage

```hcl
module "storage_account" {
  source = "./modules/storage-account"

  name                        = "stdatingplatformprod"
  resource_group_name         = module.resource_group.name
  location                    = "eastus"
  environment                 = "prod"
  account_tier                = "Standard"
  replication_type            = "GRS"
  soft_delete_retention_days  = 30
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| name | The name of the storage account | `string` | n/a | yes |
| resource_group_name | The name of the resource group | `string` | n/a | yes |
| location | The Azure region where the storage account will be created | `string` | n/a | yes |
| account_tier | The storage account tier (Standard or Premium) | `string` | `"Standard"` | no |
| replication_type | The type of replication (LRS, GRS, RAGRS, ZRS, GZRS, RAGZRS) | `string` | `"LRS"` | no |
| environment | The environment name (dev, test, prod) | `string` | n/a | yes |
| soft_delete_retention_days | Number of days to retain soft-deleted blobs | `number` | `7` | no |

## Outputs

| Name | Description |
|------|-------------|
| id | The ID of the storage account |
| primary_blob_endpoint | The primary blob endpoint of the storage account |
| primary_access_key | The primary access key for the storage account (sensitive) |

## Requirements

- Terraform >= 1.0
- azurerm provider >= 3.0
