# SQL Database Module

This module creates an Azure SQL Server and Database with threat detection, vulnerability assessment, and environment-specific configurations.

## Features

- SQL Server v12.0 with configurable administrator credentials
- TLS 1.2 minimum version
- Zone redundancy for production environments
- Threat detection enabled for test and prod environments
- Vulnerability assessment with recurring scans (test/prod)
- Automatic security alert retention (90 days for prod, 30 days for test)

## Usage

```hcl
module "sql_database" {
  source = "./modules/sql-database"

  server_name                 = "sql-datingplatform-prod"
  database_name               = "DatingPlatformDB"
  resource_group_name         = module.resource_group.name
  location                    = "eastus"
  environment                 = "prod"
  sku_name                    = "P1"
  max_size_gb                 = 250
  administrator_login         = "sqladmin"
  administrator_password      = "ComplexP@ssw0rd!"
  storage_endpoint            = module.storage_account.primary_blob_endpoint
  storage_account_access_key  = module.storage_account.primary_access_key
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| server_name | The name of the SQL Server | `string` | n/a | yes |
| database_name | The name of the SQL Database | `string` | n/a | yes |
| resource_group_name | The name of the resource group | `string` | n/a | yes |
| location | The Azure region where the SQL Server will be created | `string` | n/a | yes |
| sku_name | The SKU name for the database (e.g., Basic, S0, P1) | `string` | `"Basic"` | no |
| max_size_gb | The maximum size of the database in gigabytes | `number` | `2` | no |
| environment | The environment name (dev, test, prod) | `string` | n/a | yes |
| administrator_login | The administrator login for the SQL Server | `string` | n/a | yes |
| administrator_password | The administrator password for the SQL Server | `string` | n/a | yes |
| storage_endpoint | Storage endpoint for vulnerability assessment (required for test/prod) | `string` | `""` | no |
| storage_account_access_key | Storage account access key for vulnerability assessment (required for test/prod) | `string` | `""` | no |

## Outputs

| Name | Description |
|------|-------------|
| server_fqdn | The fully qualified domain name of the SQL Server |
| database_id | The ID of the SQL Database |
| connection_string | The connection string for the SQL Database (sensitive) |

## Requirements

- Terraform >= 1.0
- azurerm provider >= 3.0

## Notes

- Threat detection is only enabled for test and prod environments to reduce costs
- Vulnerability assessment requires a storage account for scan results
- Administrator credentials should be stored in Azure Key Vault
- Zone redundancy is automatically enabled for production databases
