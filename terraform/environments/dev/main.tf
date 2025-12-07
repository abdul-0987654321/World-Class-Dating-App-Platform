# Development Environment - Main Configuration
# DatingPlatform Infrastructure
#
# This configuration deploys all infrastructure components for the
# development environment with cost-optimized settings.

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
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true  # Allow cleanup in dev
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = false  # Allow cleanup in dev
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

# ====================
# Networking
# ====================
module "networking" {
  source = "../../modules/networking"

  vnet_name           = "vnet-${var.resource_name_prefix}-${var.environment}-${var.location}"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  environment         = var.environment

  address_space = ["10.0.0.0/16"]

  subnets = [
    {
      name             = "snet-app"
      address_prefixes = ["10.0.1.0/24"]
      delegation = {
        name         = "appservice-delegation"
        service_name = "Microsoft.Web/serverFarms"
        actions      = ["Microsoft.Network/virtualNetworks/subnets/action"]
      }
    },
    {
      name             = "snet-db"
      address_prefixes = ["10.0.2.0/24"]
      delegation       = null
    },
    {
      name             = "snet-cache"
      address_prefixes = ["10.0.3.0/24"]
      delegation       = null
    },
    {
      name             = "snet-mgmt"
      address_prefixes = ["10.0.4.0/24"]
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
  replication_type           = "LRS"  # Locally redundant for dev
  soft_delete_retention_days = 7      # Minimal retention for dev

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
  sku_name                  = "standard"
  enable_purge_protection   = false  # Allow cleanup in dev

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
  sku                 = "Basic"  # Cost-optimized for dev
  admin_enabled       = true     # Enable for dev convenience

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
