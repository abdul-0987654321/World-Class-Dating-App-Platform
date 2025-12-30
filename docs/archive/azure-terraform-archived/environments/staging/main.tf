# =============================================================================
# Flamoral Dating Platform - Staging Environment
# Main Infrastructure Configuration
# =============================================================================
# Environment: Staging
# Resource Group: flamoral-staging-rg
# Location: westus2
# Subscription: ba233460-2dbe-4603-a594-68f93ec9deb3
# =============================================================================
# All resources are tagged with "staging" pattern for identification
# =============================================================================

# =============================================================================
# Data Sources
# =============================================================================
data "azurerm_client_config" "current" {}

data "azuread_service_principal" "terraform_sp" {
  client_id = var.terraform_sp_client_id
}

# =============================================================================
# Local Values - Staging Environment Naming Pattern
# =============================================================================
locals {
  # Common naming prefix for staging environment
  name_prefix = "flamoral-staging"

  # Environment-specific tags applied to all resources
  common_tags = merge(var.tags, {
    Environment      = "staging"
    ManagedBy        = "Terraform"
    ServicePrincipal = var.terraform_sp_name
    ResourceGroup    = var.resource_group_name
    CreatedBy        = "terraform-datingapp-sp"
  })
}

# =============================================================================
# Resource Group - flamoral-staging-rg
# =============================================================================
resource "azurerm_resource_group" "staging" {
  name     = var.resource_group_name
  location = var.location

  tags = local.common_tags
}

# =============================================================================
# Random String for Unique Resource Naming
# =============================================================================
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# =============================================================================
# Virtual Network Configuration
# =============================================================================
resource "azurerm_virtual_network" "main" {
  name                = "${local.name_prefix}-vnet"
  location            = azurerm_resource_group.staging.location
  resource_group_name = azurerm_resource_group.staging.name
  address_space       = var.vnet_address_space

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# AKS Subnet - Hosts Kubernetes cluster nodes
# -----------------------------------------------------------------------------
resource "azurerm_subnet" "aks" {
  name                 = "aks-subnet"
  resource_group_name  = azurerm_resource_group.staging.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.aks_subnet_prefix]

  service_endpoints = [
    "Microsoft.Storage",
    "Microsoft.Sql",
    "Microsoft.KeyVault",
    "Microsoft.ContainerRegistry"
  ]
}

# -----------------------------------------------------------------------------
# Database Subnet - PostgreSQL Flexible Server
# -----------------------------------------------------------------------------
resource "azurerm_subnet" "database" {
  name                 = "database-subnet"
  resource_group_name  = azurerm_resource_group.staging.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.db_subnet_prefix]

  delegation {
    name = "postgresql-delegation"
    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action"
      ]
    }
  }

  service_endpoints = ["Microsoft.Storage"]
}

# -----------------------------------------------------------------------------
# Redis Subnet - Azure Cache for Redis
# -----------------------------------------------------------------------------
resource "azurerm_subnet" "redis" {
  name                 = "redis-subnet"
  resource_group_name  = azurerm_resource_group.staging.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.redis_subnet_prefix]

  service_endpoints = ["Microsoft.Storage"]
}

# -----------------------------------------------------------------------------
# Private Endpoints Subnet - Secure connectivity
# -----------------------------------------------------------------------------
resource "azurerm_subnet" "private_endpoints" {
  name                 = "private-endpoints-subnet"
  resource_group_name  = azurerm_resource_group.staging.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.private_endpoints_subnet_prefix]

  private_endpoint_network_policies_enabled = true
}

# =============================================================================
# Network Security Groups
# =============================================================================
resource "azurerm_network_security_group" "aks" {
  name                = "${local.name_prefix}-aks-nsg"
  location            = azurerm_resource_group.staging.location
  resource_group_name = azurerm_resource_group.staging.name

  # Allow HTTPS traffic
  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  # Allow HTTP traffic (for redirect to HTTPS)
  security_rule {
    name                       = "AllowHTTP"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = local.common_tags
}

resource "azurerm_subnet_network_security_group_association" "aks" {
  subnet_id                 = azurerm_subnet.aks.id
  network_security_group_id = azurerm_network_security_group.aks.id
}

# =============================================================================
# Azure Container Registry (ACR)
# =============================================================================
resource "azurerm_container_registry" "main" {
  name                = "flamoralstg${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.staging.name
  location            = azurerm_resource_group.staging.location
  sku                 = var.acr_sku
  admin_enabled       = true

  tags = local.common_tags
}

# =============================================================================
# Azure Kubernetes Service (AKS)
# =============================================================================
resource "azurerm_kubernetes_cluster" "main" {
  name                = "${local.name_prefix}-aks"
  location            = azurerm_resource_group.staging.location
  resource_group_name = azurerm_resource_group.staging.name
  dns_prefix          = local.name_prefix
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                = "system"
    node_count          = var.system_node_count
    vm_size             = var.system_node_size
    os_disk_size_gb     = var.system_node_disk_size
    vnet_subnet_id      = azurerm_subnet.aks.id
    enable_auto_scaling = true
    min_count           = var.system_node_min_count
    max_count           = var.system_node_max_count

    upgrade_settings {
      max_surge = "10%"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    network_policy    = "calico"
    load_balancer_sku = "standard"
    service_cidr      = "10.200.0.0/16"
    dns_service_ip    = "10.200.0.10"
  }

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# AKS User Node Pool - Application workloads
# -----------------------------------------------------------------------------
resource "azurerm_kubernetes_cluster_node_pool" "user" {
  name                  = "user"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = var.user_node_size
  node_count            = var.user_node_count
  os_disk_size_gb       = var.user_node_disk_size
  vnet_subnet_id        = azurerm_subnet.aks.id
  enable_auto_scaling   = true
  min_count             = var.user_node_min_count
  max_count             = var.user_node_max_count
  mode                  = "User"

  node_labels = {
    "workload"    = "user"
    "environment" = "staging"
  }

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# ACR Pull Role Assignment for AKS
# -----------------------------------------------------------------------------
resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

# =============================================================================
# PostgreSQL Flexible Server
# =============================================================================
resource "azurerm_private_dns_zone" "postgres" {
  name                = "${local.name_prefix}.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.staging.name

  tags = local.common_tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "postgres-vnet-link"
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  resource_group_name   = azurerm_resource_group.staging.name
  virtual_network_id    = azurerm_virtual_network.main.id
}

resource "random_password" "postgres" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "${local.name_prefix}-postgres"
  resource_group_name    = azurerm_resource_group.staging.name
  location               = azurerm_resource_group.staging.location
  version                = var.postgres_version
  delegated_subnet_id    = azurerm_subnet.database.id
  private_dns_zone_id    = azurerm_private_dns_zone.postgres.id
  administrator_login    = "flamoraladmin"
  administrator_password = random_password.postgres.result
  zone                   = "1"

  storage_mb = var.postgres_storage_mb

  sku_name = var.postgres_sku_name

  backup_retention_days        = var.postgres_backup_retention_days
  geo_redundant_backup_enabled = var.postgres_geo_redundant_backup

  tags = local.common_tags

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]
}

# -----------------------------------------------------------------------------
# PostgreSQL Databases
# -----------------------------------------------------------------------------
resource "azurerm_postgresql_flexible_server_database" "flamoral" {
  name      = "flamoral"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_database" "flamoral_analytics" {
  name      = "flamoral_analytics"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# =============================================================================
# Redis Cache
# =============================================================================
resource "azurerm_redis_cache" "main" {
  name                = "${local.name_prefix}-redis"
  location            = azurerm_resource_group.staging.location
  resource_group_name = azurerm_resource_group.staging.name
  capacity            = var.redis_capacity
  family              = var.redis_family
  sku_name            = var.redis_sku_name
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  redis_configuration {
    maxmemory_policy = "volatile-lru"
  }

  tags = local.common_tags
}

# =============================================================================
# Storage Account
# =============================================================================
resource "azurerm_storage_account" "main" {
  name                     = "flamoralstg${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.staging.name
  location                 = azurerm_resource_group.staging.location
  account_tier             = "Standard"
  account_replication_type = var.storage_replication_type
  min_tls_version          = "TLS1_2"

  blob_properties {
    cors_rule {
      allowed_headers    = ["*"]
      allowed_methods    = ["GET", "HEAD", "PUT", "POST", "DELETE"]
      allowed_origins    = ["https://staging.flamoral.com", "https://*.flamoral.com"]
      exposed_headers    = ["*"]
      max_age_in_seconds = 3600
    }
  }

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Storage Containers
# -----------------------------------------------------------------------------
resource "azurerm_storage_container" "media" {
  name                  = "media"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "blob"
}

resource "azurerm_storage_container" "profiles" {
  name                  = "profiles"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "blob"
}

resource "azurerm_storage_container" "videos" {
  name                  = "videos"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "blob"
}

resource "azurerm_storage_container" "stories" {
  name                  = "stories"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "blob"
}

# =============================================================================
# Key Vault
# =============================================================================
resource "azurerm_key_vault" "main" {
  name                       = "${local.name_prefix}-kv-${random_string.suffix.result}"
  location                   = azurerm_resource_group.staging.location
  resource_group_name        = azurerm_resource_group.staging.name
  tenant_id                  = var.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = false
  enable_rbac_authorization  = true

  network_acls {
    bypass         = "AzureServices"
    default_action = "Allow"
  }

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Key Vault Role Assignments
# -----------------------------------------------------------------------------
resource "azurerm_role_assignment" "kv_terraform_sp" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azuread_service_principal.terraform_sp.object_id
}

resource "azurerm_role_assignment" "kv_aks" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

# -----------------------------------------------------------------------------
# Store Secrets in Key Vault
# -----------------------------------------------------------------------------
resource "azurerm_key_vault_secret" "postgres_password" {
  name         = "postgres-password"
  value        = random_password.postgres.result
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_role_assignment.kv_terraform_sp]
}

resource "azurerm_key_vault_secret" "redis_connection" {
  name         = "redis-connection-string"
  value        = azurerm_redis_cache.main.primary_connection_string
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_role_assignment.kv_terraform_sp]
}

resource "azurerm_key_vault_secret" "storage_connection" {
  name         = "storage-connection-string"
  value        = azurerm_storage_account.main.primary_connection_string
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_role_assignment.kv_terraform_sp]
}

# =============================================================================
# Log Analytics Workspace
# =============================================================================
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.name_prefix}-logs"
  location            = azurerm_resource_group.staging.location
  resource_group_name = azurerm_resource_group.staging.name
  sku                 = "PerGB2018"
  retention_in_days   = var.log_analytics_retention_days

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Application Insights
# -----------------------------------------------------------------------------
resource "azurerm_application_insights" "main" {
  name                = "${local.name_prefix}-appinsights"
  location            = azurerm_resource_group.staging.location
  resource_group_name = azurerm_resource_group.staging.name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"

  tags = local.common_tags
}

# =============================================================================
# SignalR Service
# =============================================================================
resource "azurerm_signalr_service" "main" {
  name                = "${local.name_prefix}-signalr"
  location            = azurerm_resource_group.staging.location
  resource_group_name = azurerm_resource_group.staging.name

  sku {
    name     = var.signalr_sku
    capacity = var.signalr_capacity
  }

  cors {
    allowed_origins = ["https://staging.flamoral.com", "https://*.flamoral.com"]
  }

  connectivity_logs_enabled = true
  messaging_logs_enabled    = true

  tags = local.common_tags
}

# =============================================================================
# Azure CDN Profile and Endpoint
# =============================================================================
resource "azurerm_cdn_profile" "main" {
  name                = "${local.name_prefix}-cdn"
  location            = "global"
  resource_group_name = azurerm_resource_group.staging.name
  sku                 = "Standard_Microsoft"

  tags = local.common_tags
}

resource "azurerm_cdn_endpoint" "media" {
  name                = "${local.name_prefix}-media"
  profile_name        = azurerm_cdn_profile.main.name
  location            = "global"
  resource_group_name = azurerm_resource_group.staging.name

  origin {
    name      = "storage-origin"
    host_name = azurerm_storage_account.main.primary_blob_host
  }

  is_http_allowed  = false
  is_https_allowed = true

  tags = local.common_tags
}
