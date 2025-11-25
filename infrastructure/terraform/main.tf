# Main Terraform Configuration for Dating App Platform

terraform {
  required_version = ">= 1.4"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }

  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "${var.prefix}-${var.env}-rg"
  location = var.location

  tags = merge(var.tags, {
    Environment = var.env
  })
}

# Network Module
module "network" {
  source = "./modules/network"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  prefix              = var.prefix
  env                 = var.env

  vnet_address_space      = var.vnet_address_space
  aks_subnet_prefix       = var.aks_subnet_prefix
  db_subnet_prefix        = var.db_subnet_prefix
  redis_subnet_prefix     = var.redis_subnet_prefix
  enable_ddos_protection  = var.enable_ddos_protection

  tags = var.tags
}

# AKS Module
module "aks" {
  source = "./modules/aks"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  prefix              = var.prefix
  env                 = var.env

  vnet_subnet_id      = module.network.aks_subnet_id
  node_count          = var.aks_node_count
  node_vm_size        = var.aks_node_vm_size
  kubernetes_version  = var.kubernetes_version

  tags = var.tags

  depends_on = [module.network]
}

# PostgreSQL Module
module "postgres" {
  source = "./modules/postgres"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  prefix              = var.prefix
  env                 = var.env

  sku_name               = var.postgres_sku
  storage_mb             = var.postgres_storage_mb
  postgres_version       = var.postgres_version
  subnet_id              = module.network.db_subnet_id
  enable_private_endpoint = var.enable_private_endpoints

  tags = var.tags

  depends_on = [module.network]
}

# Redis Module
module "redis" {
  source = "./modules/redis"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  prefix              = var.prefix
  env                 = var.env

  sku_name  = var.redis_sku
  family    = var.redis_family
  capacity  = var.redis_capacity
  subnet_id = module.network.redis_subnet_id

  tags = var.tags

  depends_on = [module.network]
}

# Storage Module
module "storage" {
  source = "./modules/storage_blob"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  prefix              = var.prefix
  env                 = var.env

  enable_cdn = true

  tags = var.tags
}

# KeyVault Module
module "keyvault" {
  source = "./modules/keyvault"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  prefix              = var.prefix
  env                 = var.env
  tenant_id           = var.tenant_id

  aks_identity_principal_id = module.aks.kubelet_identity_object_id

  tags = var.tags

  depends_on = [module.aks]
}

# SignalR Module
module "signalr" {
  source = "./modules/signalr"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  prefix              = var.prefix
  env                 = var.env

  sku_name  = var.signalr_sku
  capacity  = var.signalr_capacity

  tags = var.tags
}

# CosmosDB Module
module "cosmosdb" {
  source = "./modules/cosmosdb"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  prefix              = var.prefix
  env                 = var.env

  consistency_level = var.cosmosdb_consistency_level
  throughput        = var.cosmosdb_throughput

  tags = var.tags
}

# Monitoring Module
module "monitor" {
  source = "./modules/monitor"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  prefix              = var.prefix
  env                 = var.env

  aks_id              = module.aks.aks_id
  log_retention_days  = var.log_retention_days

  tags = var.tags

  depends_on = [module.aks]
}

# Front Door Module
module "frontdoor" {
  source = "./modules/frontdoor"

  resource_group_name = azurerm_resource_group.main.name
  prefix              = var.prefix
  env                 = var.env

  backend_address = module.aks.aks_fqdn
  enable_waf      = var.enable_waf

  tags = var.tags

  depends_on = [module.aks]
}
