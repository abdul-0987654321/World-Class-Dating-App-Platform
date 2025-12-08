# Production Environment - Main Configuration
# DatingPlatform Infrastructure
#
# This configuration deploys all infrastructure components for the
# production environment with maximum security and reliability.

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6.0"
    }
  }
}

provider "azurerm" {
  skip_provider_registration = true  # Service principal doesn't need to register providers

  features {
    key_vault {
      purge_soft_delete_on_destroy    = false  # Never purge in production
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = true  # Protect production
    }
  }
}

# Random suffix for globally unique names
resource "random_string" "suffix" {
  length  = 4
  special = false
  upper   = false
}

# ====================
# Resource Group
# ====================
module "resource_group" {
  source = "../../modules/resource-group"

  name        = "rg-${var.resource_name_prefix}-${var.environment}-${var.location}"
  location    = var.location
  environment = var.environment

  tags = local.common_tags
}

# Resource Lock for Production
resource "azurerm_management_lock" "resource_group_lock" {
  name       = "production-delete-lock"
  scope      = module.resource_group.id
  lock_level = "CanNotDelete"
  notes      = "Production resource group - deletion protected"
}

# ====================
# Networking
# ====================
module "networking" {
  source = "../../modules/networking"

  vnet_name           = "vnet-${var.resource_name_prefix}-${var.environment}-${var.location}"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  environment         = var.environment

  address_space = ["10.2.0.0/16"]

  subnets = [
    {
      name             = "snet-app"
      address_prefixes = ["10.2.1.0/24"]
      delegation = {
        name         = "appservice-delegation"
        service_name = "Microsoft.Web/serverFarms"
        actions      = ["Microsoft.Network/virtualNetworks/subnets/action"]
      }
    },
    {
      name             = "snet-db"
      address_prefixes = ["10.2.2.0/24"]
      delegation       = null
    },
    {
      name             = "snet-cache"
      address_prefixes = ["10.2.3.0/24"]
      delegation       = null
    },
    {
      name             = "snet-mgmt"
      address_prefixes = ["10.2.4.0/24"]
      delegation       = null
    },
    {
      name             = "snet-private-endpoints"
      address_prefixes = ["10.2.5.0/24"]
      delegation       = null
    }
  ]

  tags = local.common_tags
}

# ====================
# Storage Account
# ====================
module "storage_account" {
  source = "../../modules/storage-account"

  name                       = "st${var.resource_name_prefix}${var.environment}${random_string.suffix.result}"
  resource_group_name        = module.resource_group.name
  location                   = module.resource_group.location
  environment                = var.environment
  account_tier               = "Standard"
  replication_type           = "RAGRS"  # Read-access geo-redundant for production
  soft_delete_retention_days = 30       # Maximum retention

  tags = local.common_tags
}

# ====================
# Key Vault
# ====================
module "key_vault" {
  source = "../../modules/key-vault"

  name                      = "kv-${var.resource_name_prefix}-${var.environment}-${random_string.suffix.result}"
  resource_group_name       = module.resource_group.name
  location                  = module.resource_group.location
  tenant_id                 = var.tenant_id
  environment               = var.environment
  sku_name                  = "premium"  # Premium for production HSM support
  enable_purge_protection   = true       # Required for production

  tags = local.common_tags
}

# ====================
# Container Registry
# ====================
module "container_registry" {
  source = "../../modules/container-registry"

  name                = "acr${var.resource_name_prefix}${var.environment}${random_string.suffix.result}"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  environment         = var.environment
  sku                 = "Premium"  # Premium for geo-replication and content trust
  admin_enabled       = false      # Use managed identity in production

  tags = local.common_tags
}

# ====================
# App Service
# ====================
module "app_service" {
  source = "../../modules/app-service"

  name                = "app-${var.resource_name_prefix}-${var.environment}"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  environment         = var.environment
  sku_name            = var.app_service_sku

  app_settings = {
    ENVIRONMENT                    = var.environment
    WEBSITE_NODE_DEFAULT_VERSION   = "~18"
    APPINSIGHTS_INSTRUMENTATIONKEY = module.monitoring.instrumentation_key
    KEY_VAULT_URI                  = module.key_vault.vault_uri
    STORAGE_ACCOUNT_ENDPOINT       = module.storage_account.primary_blob_endpoint
    WEBSITE_HTTPLOGGING_RETENTION_DAYS = "90"
  }

  tags = local.common_tags
}

# ====================
# SQL Database
# ====================
module "sql_database" {
  source = "../../modules/sql-database"

  server_name             = "sql-${var.resource_name_prefix}-${var.environment}-${random_string.suffix.result}"
  database_name           = "sqldb-${var.resource_name_prefix}-${var.environment}"
  resource_group_name     = module.resource_group.name
  location                = module.resource_group.location
  environment             = var.environment
  sku_name                = var.sql_sku
  max_size_gb             = var.sql_max_size_gb
  administrator_login     = var.sql_admin_username
  administrator_password  = var.sql_admin_password

  tags = local.common_tags
}

# ====================
# Monitoring
# ====================
module "monitoring" {
  source = "../../modules/monitoring"

  workspace_name      = "log-${var.resource_name_prefix}-${var.environment}-${var.location}"
  app_insights_name   = "appi-${var.resource_name_prefix}-${var.environment}-${var.location}"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  environment         = var.environment
  retention_days      = var.log_retention_days

  tags = local.common_tags
}

# ====================
# DNS Zone (flamoral.com)
# ====================
module "dns_zone" {
  source = "../../modules/dns-zone"

  domain_name         = "flamoral.com"
  resource_group_name = module.resource_group.name

  # AKS public IP will be populated after AKS deployment
  aks_public_ip = var.aks_ingress_ip

  create_environment_records = true
  dev_cname_target          = "flamoral-dev.azurewebsites.net"
  test_cname_target         = "flamoral-test.azurewebsites.net"
  staging_cname_target      = "flamoral-staging.azurewebsites.net"

  enable_email_records = true

  tags = local.common_tags
}

# ====================
# Lifecycle Protection
# ====================
# Prevent accidental destruction of critical resources
resource "azurerm_management_lock" "key_vault_lock" {
  name       = "keyvault-delete-lock"
  scope      = module.key_vault.id
  lock_level = "CanNotDelete"
  notes      = "Production Key Vault - deletion protected"

  depends_on = [module.key_vault]
}

resource "azurerm_management_lock" "sql_lock" {
  name       = "sql-delete-lock"
  scope      = module.sql_database.database_id
  lock_level = "CanNotDelete"
  notes      = "Production SQL Database - deletion protected"

  depends_on = [module.sql_database]
}
