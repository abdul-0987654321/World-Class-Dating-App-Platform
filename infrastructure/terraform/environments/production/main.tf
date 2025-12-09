# Azure Production Environment Configuration for Dating App Platform

terraform {
  required_version = ">= 1.5.0"

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
  }

  backend "azurerm" {
    resource_group_name  = "dating-app-terraform-state"
    storage_account_name = "datingappterraformstate"
    container_name       = "tfstate"
    key                  = "production.terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
    }
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }
}

locals {
  environment = "production"
  location    = "East US"

  common_tags = {
    Environment = local.environment
    Project     = "dating-app-platform"
    ManagedBy   = "terraform"
    CostCenter  = "engineering"
  }
}

# Virtual Network Module
module "vnet" {
  source = "../../modules/azure-vnet"

  environment               = local.environment
  location                  = local.location
  vnet_address_space        = "10.0.0.0/16"
  enable_nat_gateway        = true
  enable_bastion            = false
  enable_network_monitoring = true

  common_tags = local.common_tags
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.environment}-dating-app-logs"
  location            = local.location
  resource_group_name = module.vnet.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 90

  tags = local.common_tags
}

# Container Registry
resource "azurerm_container_registry" "main" {
  name                = "${local.environment}datingappacr"
  resource_group_name = module.vnet.resource_group_name
  location            = local.location
  sku                 = "Premium"
  admin_enabled       = false

  georeplications {
    location = "West US 2"
    tags     = local.common_tags
  }

  network_rule_set {
    default_action = "Deny"

    ip_rule {
      action   = "Allow"
      ip_range = "0.0.0.0/0" # Update with your IP ranges
    }
  }

  tags = local.common_tags
}

# AKS Module
module "aks" {
  source = "../../modules/azure-aks"

  environment            = local.environment
  location               = local.location
  resource_group_name    = module.vnet.resource_group_name
  aks_subnet_id          = module.vnet.aks_subnet_id
  vnet_id                = module.vnet.vnet_id
  kubernetes_version     = "1.28.3"

  # System Node Pool
  system_node_size      = "Standard_D4s_v3"
  system_node_count     = 3
  system_node_min_count = 3
  system_node_max_count = 5
  system_node_disk_size = 128

  # User Node Pool
  user_node_size        = "Standard_D8s_v3"
  user_node_count       = 5
  user_node_min_count   = 3
  user_node_max_count   = 15
  user_node_disk_size   = 256

  # Spot Instances
  enable_spot_instances = false

  # Monitoring
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  container_registry_id      = azurerm_container_registry.main.id

  common_tags = local.common_tags
}

# Azure Database for PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "main" {
  name                = "${local.environment}-dating-app-postgres"
  resource_group_name = module.vnet.resource_group_name
  location            = local.location

  administrator_login    = "datingappadmin"
  administrator_password = var.postgres_admin_password

  sku_name   = "GP_Standard_D8s_v3"
  version    = "15"
  storage_mb = 262144 # 256 GB

  backup_retention_days        = 35
  geo_redundant_backup_enabled = true
  auto_grow_enabled            = true

  high_availability {
    mode                      = "ZoneRedundant"
    standby_availability_zone = "2"
  }

  delegated_subnet_id = module.vnet.database_subnet_id
  private_dns_zone_id = module.vnet.postgres_private_dns_zone_id

  maintenance_window {
    day_of_week  = 0
    start_hour   = 2
    start_minute = 0
  }

  tags = local.common_tags

  depends_on = [module.vnet]
}

# PostgreSQL Configuration
resource "azurerm_postgresql_flexible_server_configuration" "max_connections" {
  name      = "max_connections"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "500"
}

resource "azurerm_postgresql_flexible_server_configuration" "shared_buffers" {
  name      = "shared_buffers"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "524288" # 4GB
}

# PostgreSQL Database
resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = "dating_app_production"
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "UTF8"
}

# Azure Cache for Redis
resource "azurerm_redis_cache" "main" {
  name                = "${local.environment}-dating-app-redis"
  resource_group_name = module.vnet.resource_group_name
  location            = local.location
  capacity            = 3
  family              = "P"
  sku_name            = "Premium"

  enable_non_ssl_port           = false
  minimum_tls_version           = "1.2"
  public_network_access_enabled = false
  subnet_id                     = module.vnet.redis_subnet_id

  redis_configuration {
    enable_authentication           = true
    maxmemory_reserved              = 2
    maxmemory_delta                 = 2
    maxmemory_policy                = "allkeys-lru"
    rdb_backup_enabled              = true
    rdb_backup_frequency            = 60
    rdb_backup_max_snapshot_count   = 1
    rdb_storage_connection_string   = azurerm_storage_account.backup.primary_blob_connection_string
  }

  patch_schedule {
    day_of_week    = "Sunday"
    start_hour_utc = 2
  }

  tags = local.common_tags
}

# Storage Account for Media
resource "azurerm_storage_account" "media" {
  name                     = "${local.environment}datingappmedia"
  resource_group_name      = module.vnet.resource_group_name
  location                 = local.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
  account_kind             = "StorageV2"

  blob_properties {
    versioning_enabled  = true
    change_feed_enabled = true

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }
  }

  network_rules {
    default_action = "Deny"
    bypass         = ["AzureServices"]
    virtual_network_subnet_ids = [
      module.vnet.aks_subnet_id
    ]
  }

  tags = local.common_tags
}

# Storage Container for User Photos
resource "azurerm_storage_container" "photos" {
  name                  = "user-photos"
  storage_account_name  = azurerm_storage_account.media.name
  container_access_type = "private"
}

# Storage Container for Videos
resource "azurerm_storage_container" "videos" {
  name                  = "user-videos"
  storage_account_name  = azurerm_storage_account.media.name
  container_access_type = "private"
}

# Storage Account for Backups
resource "azurerm_storage_account" "backup" {
  name                     = "${local.environment}datingappbackup"
  resource_group_name      = module.vnet.resource_group_name
  location                 = local.location
  account_tier             = "Standard"
  account_replication_type = "GRS"

  tags = local.common_tags
}

# CDN Profile
resource "azurerm_cdn_profile" "main" {
  name                = "${local.environment}-dating-app-cdn"
  resource_group_name = module.vnet.resource_group_name
  location            = "Global"
  sku                 = "Standard_Microsoft"

  tags = local.common_tags
}

# CDN Endpoint
resource "azurerm_cdn_endpoint" "media" {
  name                = "${local.environment}-dating-app-media"
  profile_name        = azurerm_cdn_profile.main.name
  resource_group_name = module.vnet.resource_group_name
  location            = "Global"

  origin {
    name      = "media-origin"
    host_name = azurerm_storage_account.media.primary_blob_host
  }

  is_http_allowed        = false
  is_https_allowed       = true
  querystring_caching_behaviour = "IgnoreQueryString"

  optimization_type = "GeneralWebDelivery"

  tags = local.common_tags
}

# Key Vault
resource "azurerm_key_vault" "main" {
  name                       = "${local.environment}-dating-kv"
  resource_group_name        = module.vnet.resource_group_name
  location                   = local.location
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "premium"
  soft_delete_retention_days = 90
  purge_protection_enabled   = true

  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
    virtual_network_subnet_ids = [
      module.vnet.aks_subnet_id
    ]
  }

  tags = local.common_tags
}

# Key Vault Access Policy for AKS
resource "azurerm_key_vault_access_policy" "aks" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = module.aks.kubelet_identity_object_id

  secret_permissions = [
    "Get",
    "List"
  ]
}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = "${local.environment}-dating-app-insights"
  resource_group_name = module.vnet.resource_group_name
  location            = local.location
  application_type    = "web"
  workspace_id        = azurerm_log_analytics_workspace.main.id
  retention_in_days   = 90

  tags = local.common_tags
}

# Azure Front Door (Optional - Premium CDN)
resource "azurerm_frontdoor" "main" {
  name                = "${local.environment}-dating-app-fd"
  resource_group_name = module.vnet.resource_group_name

  backend_pool_load_balancing {
    name = "LoadBalancingSettings"
  }

  backend_pool_health_probe {
    name         = "HealthProbeSettings"
    protocol     = "Https"
    probe_method = "GET"
  }

  frontend_endpoint {
    name      = "DefaultFrontendEndpoint"
    host_name = "${local.environment}-dating-app-fd.azurefd.net"
  }

  backend_pool {
    name = "BackendPool"
    backend {
      host_header = "api.flamoral.com"
      address     = "api.flamoral.com"
      http_port   = 80
      https_port  = 443
    }

    load_balancing_name = "LoadBalancingSettings"
    health_probe_name   = "HealthProbeSettings"
  }

  routing_rule {
    name               = "DefaultRoutingRule"
    accepted_protocols = ["Https"]
    patterns_to_match  = ["/*"]
    frontend_endpoints = ["DefaultFrontendEndpoint"]

    forwarding_configuration {
      forwarding_protocol = "HttpsOnly"
      backend_pool_name   = "BackendPool"
    }
  }

  tags = local.common_tags
}

# Data Sources
data "azurerm_client_config" "current" {}
