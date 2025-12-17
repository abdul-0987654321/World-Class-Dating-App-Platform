# =============================================================================
# Flamoral Dating Platform - Production Environment
# Main Infrastructure Configuration
# =============================================================================
# Environment: Production
# Resource Group: flamoral-prod-rg
# Location: westus2
# Access: PUBLIC - flamoral.com domain integration
# =============================================================================

# =============================================================================
# Data Sources
# =============================================================================
data "azurerm_client_config" "current" {}

data "azuread_service_principal" "terraform_sp" {
  client_id = var.terraform_sp_client_id
}

# Reference shared ACR
data "azurerm_container_registry" "shared" {
  name                = var.shared_acr_name
  resource_group_name = var.shared_resource_group_name
}

# =============================================================================
# Local Values - Production Environment Naming Pattern
# =============================================================================
locals {
  name_prefix = "flamoral-prod"

  common_tags = merge(var.tags, {
    Environment      = "production"
    ManagedBy        = "Terraform"
    ServicePrincipal = var.terraform_sp_name
    ResourceGroup    = var.resource_group_name
    AccessLevel      = "public"
    Domain           = "flamoral.com"
  })
}

# =============================================================================
# Resource Group - flamoral-prod-rg
# =============================================================================
resource "azurerm_resource_group" "prod" {
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
  location            = azurerm_resource_group.prod.location
  resource_group_name = azurerm_resource_group.prod.name
  address_space       = var.vnet_address_space

  tags = local.common_tags
}

# AKS Subnet
resource "azurerm_subnet" "aks" {
  name                 = "aks-subnet"
  resource_group_name  = azurerm_resource_group.prod.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.aks_subnet_prefix]

  service_endpoints = [
    "Microsoft.Storage",
    "Microsoft.Sql",
    "Microsoft.KeyVault",
    "Microsoft.ContainerRegistry"
  ]
}

# Database Subnet
resource "azurerm_subnet" "database" {
  name                 = "database-subnet"
  resource_group_name  = azurerm_resource_group.prod.name
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

# Redis Subnet
resource "azurerm_subnet" "redis" {
  name                 = "redis-subnet"
  resource_group_name  = azurerm_resource_group.prod.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.redis_subnet_prefix]

  service_endpoints = ["Microsoft.Storage"]
}

# Private Endpoints Subnet
resource "azurerm_subnet" "private_endpoints" {
  name                 = "private-endpoints-subnet"
  resource_group_name  = azurerm_resource_group.prod.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.private_endpoints_subnet_prefix]

  private_endpoint_network_policies_enabled = true
}

# Application Gateway Subnet (for WAF)
resource "azurerm_subnet" "appgw" {
  name                 = "appgw-subnet"
  resource_group_name  = azurerm_resource_group.prod.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.appgw_subnet_prefix]
}

# =============================================================================
# Network Security Groups - PUBLIC ACCESS
# =============================================================================
resource "azurerm_network_security_group" "aks" {
  name                = "${local.name_prefix}-aks-nsg"
  location            = azurerm_resource_group.prod.location
  resource_group_name = azurerm_resource_group.prod.name

  # Allow HTTPS from anywhere
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

  # Allow HTTP (for redirect to HTTPS)
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
# Azure DNS Zone for flamoral.com
# =============================================================================
resource "azurerm_dns_zone" "main" {
  name                = var.domain_name
  resource_group_name = azurerm_resource_group.prod.name

  tags = local.common_tags
}

# DNS Records will be created after ingress IP is available
resource "azurerm_dns_a_record" "root" {
  name                = "@"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.prod.name
  ttl                 = 300
  records             = var.ingress_public_ip != "" ? [var.ingress_public_ip] : ["0.0.0.0"]

  tags = local.common_tags
}

resource "azurerm_dns_a_record" "www" {
  name                = "www"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.prod.name
  ttl                 = 300
  records             = var.ingress_public_ip != "" ? [var.ingress_public_ip] : ["0.0.0.0"]

  tags = local.common_tags
}

resource "azurerm_dns_a_record" "api" {
  name                = "api"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.prod.name
  ttl                 = 300
  records             = var.ingress_public_ip != "" ? [var.ingress_public_ip] : ["0.0.0.0"]

  tags = local.common_tags
}

# DISABLED: CDN endpoint no longer available, using Front Door instead
# resource "azurerm_dns_cname_record" "cdn" {
#   name                = "cdn"
#   zone_name           = azurerm_dns_zone.main.name
#   resource_group_name = azurerm_resource_group.prod.name
#   ttl                 = 300
#   record              = azurerm_cdn_endpoint.media.fqdn
#   tags = local.common_tags
# }

# =============================================================================
# Public IP for Ingress
# =============================================================================
resource "azurerm_public_ip" "ingress" {
  name                = "${local.name_prefix}-ingress-pip"
  location            = azurerm_resource_group.prod.location
  resource_group_name = azurerm_resource_group.prod.name
  allocation_method   = "Static"
  sku                 = "Standard"
  domain_name_label   = "flamoral"

  tags = local.common_tags
}

# =============================================================================
# Azure Kubernetes Service (AKS) - PUBLIC CLUSTER
# =============================================================================
resource "azurerm_kubernetes_cluster" "main" {
  name                = "${local.name_prefix}-aks"
  location            = azurerm_resource_group.prod.location
  resource_group_name = azurerm_resource_group.prod.name
  dns_prefix          = local.name_prefix
  kubernetes_version  = var.kubernetes_version

  # PUBLIC CLUSTER
  private_cluster_enabled = false

  default_node_pool {
    name                = "system"
    node_count          = var.system_node_count
    vm_size             = var.system_node_size
    os_disk_size_gb     = var.system_node_disk_size
    vnet_subnet_id      = azurerm_subnet.aks.id
    enable_auto_scaling = true
    min_count           = var.system_node_min_count
    max_count           = var.system_node_max_count
    zones               = ["2"]

    upgrade_settings {
      max_surge = "33%"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    network_policy    = "calico"
    load_balancer_sku = "standard"
    service_cidr      = "10.100.0.0/16"
    dns_service_ip    = "10.100.0.10"
    outbound_type     = "loadBalancer"
  }

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }

  # Auto-upgrade for security patches
  automatic_channel_upgrade = "patch"

  # Azure Policy for governance
  azure_policy_enabled = true

  # Microsoft Defender for security
  microsoft_defender {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }

  tags = local.common_tags
}

# AKS User Node Pool - Zone redundant
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
  zones               = ["2"]

  node_labels = {
    "workload"    = "user"
    "environment" = "production"
  }

  tags = local.common_tags
}

# ACR Pull Role for AKS
resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = data.azurerm_container_registry.shared.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

# =============================================================================
# PostgreSQL Flexible Server - High Availability
# =============================================================================
resource "azurerm_private_dns_zone" "postgres" {
  name                = "${local.name_prefix}.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.prod.name

  tags = local.common_tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "postgres-vnet-link"
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  resource_group_name   = azurerm_resource_group.prod.name
  virtual_network_id    = azurerm_virtual_network.main.id
}

resource "random_password" "postgres" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "${local.name_prefix}-postgres"
  resource_group_name    = azurerm_resource_group.prod.name
  location               = azurerm_resource_group.prod.location
  version                = var.postgres_version
  delegated_subnet_id    = azurerm_subnet.database.id
  private_dns_zone_id    = azurerm_private_dns_zone.postgres.id
  public_network_access_enabled = false
  administrator_login    = "flamoraladmin"
  administrator_password = random_password.postgres.result
  zone                   = "1"

  storage_mb = var.postgres_storage_mb
  sku_name   = var.postgres_sku_name

  # High Availability for Production

  backup_retention_days        = var.postgres_backup_retention_days
  geo_redundant_backup_enabled = var.postgres_geo_redundant_backup

  tags = local.common_tags

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]
}

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
# Redis Cache - Premium with Zone Redundancy
# =============================================================================
resource "azurerm_redis_cache" "main" {
  name                = "${local.name_prefix}-redis"
  location            = azurerm_resource_group.prod.location
  resource_group_name = azurerm_resource_group.prod.name
  capacity            = var.redis_capacity
  family              = var.redis_family
  sku_name            = var.redis_sku_name
  non_ssl_port_enabled = false
  minimum_tls_version = "1.2"
  zones               = ["2"]

  redis_configuration {
    maxmemory_policy       = "volatile-lru"
    maxmemory_reserved     = 125
    maxfragmentationmemory_reserved = 125
  }

  tags = local.common_tags
}

# =============================================================================
# Storage Account - GRS for Production
# =============================================================================
resource "azurerm_storage_account" "main" {
  name                     = "flamoralprod${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.prod.name
  location                 = azurerm_resource_group.prod.location
  account_tier             = "Standard"
  account_replication_type = var.storage_replication_type
  min_tls_version          = "TLS1_2"

  blob_properties {
    cors_rule {
      allowed_headers    = ["*"]
      allowed_methods    = ["GET", "HEAD", "PUT", "POST", "DELETE"]
      allowed_origins    = ["https://flamoral.com", "https://www.flamoral.com", "https://api.flamoral.com"]
      exposed_headers    = ["*"]
      max_age_in_seconds = 3600
    }

    versioning_enabled = true

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }
  }

  tags = local.common_tags
}

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
# Key Vault - Premium for Production
# =============================================================================
resource "azurerm_key_vault" "main" {
  name                       = "${local.name_prefix}-kv-${random_string.suffix.result}"
  location                   = azurerm_resource_group.prod.location
  resource_group_name        = azurerm_resource_group.prod.name
  tenant_id                  = var.tenant_id
  sku_name                   = "premium"
  soft_delete_retention_days = 90
  purge_protection_enabled   = true
  enable_rbac_authorization  = true

  network_acls {
    bypass         = "AzureServices"
    default_action = "Deny"
    virtual_network_subnet_ids = [azurerm_subnet.aks.id]
  }

  tags = local.common_tags
}

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
# Log Analytics Workspace - Extended Retention
# =============================================================================
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.name_prefix}-logs"
  location            = azurerm_resource_group.prod.location
  resource_group_name = azurerm_resource_group.prod.name
  sku                 = "PerGB2018"
  retention_in_days   = var.log_analytics_retention_days

  tags = local.common_tags
}

resource "azurerm_application_insights" "main" {
  name                = "${local.name_prefix}-appinsights"
  location            = azurerm_resource_group.prod.location
  resource_group_name = azurerm_resource_group.prod.name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"

  tags = local.common_tags
}

# =============================================================================
# SignalR Service - Premium for Production
# =============================================================================
resource "azurerm_signalr_service" "main" {
  name                = "${local.name_prefix}-signalr"
  location            = azurerm_resource_group.prod.location
  resource_group_name = azurerm_resource_group.prod.name

  sku {
    name     = var.signalr_sku
    capacity = var.signalr_capacity
  }

  cors {
    allowed_origins = ["https://flamoral.com", "https://www.flamoral.com"]
  }

  connectivity_logs_enabled = true
  messaging_logs_enabled    = true

  tags = local.common_tags
}

# =============================================================================
# Azure CDN Profile with Custom Domain
# DISABLED: Azure CDN from Microsoft (classic) no longer supports new profile creation
# Using Azure Front Door instead for CDN/WAF functionality
# =============================================================================
# resource "azurerm_cdn_profile" "main" {
#   name                = "${local.name_prefix}-cdn"
#   location            = "global"
#   resource_group_name = azurerm_resource_group.prod.name
#   sku                 = "Standard_Microsoft"
#   tags = local.common_tags
# }

# resource "azurerm_cdn_endpoint" "media" {
#   name                = "${local.name_prefix}-media"
#   profile_name        = azurerm_cdn_profile.main.name
#   location            = "global"
#   resource_group_name = azurerm_resource_group.prod.name
#   origin {
#     name      = "storage-origin"
#     host_name = azurerm_storage_account.main.primary_blob_host
#   }
#   is_http_allowed  = false
#   is_https_allowed = true
#   optimization_type = "GeneralMediaStreaming"
#   delivery_rule {
#     name  = "EnforceHTTPS"
#     order = 1
#     request_scheme_condition {
#       operator     = "Equal"
#       match_values = ["HTTP"]
#     }
#     url_redirect_action {
#       redirect_type = "Found"
#       protocol      = "Https"
#     }
#   }
#   tags = local.common_tags
# }

# =============================================================================
# Azure Front Door (WAF) - Production Grade
# =============================================================================
resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = "${local.name_prefix}-afd"
  resource_group_name = azurerm_resource_group.prod.name
  sku_name            = "Premium_AzureFrontDoor"

  tags = local.common_tags
}

resource "azurerm_cdn_frontdoor_endpoint" "main" {
  name                     = "flamoral-prod"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  tags = local.common_tags
}

resource "azurerm_cdn_frontdoor_origin_group" "main" {
  name                     = "flamoral-origin-group"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  session_affinity_enabled = true

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
  }

  health_probe {
    path                = "/health/live"
    request_type        = "HEAD"
    protocol            = "Https"
    interval_in_seconds = 30
  }
}

resource "azurerm_cdn_frontdoor_origin" "main" {
  name                          = "flamoral-aks-origin"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.main.id
  enabled                       = true

  certificate_name_check_enabled = true

  host_name          = azurerm_public_ip.ingress.fqdn
  http_port          = 80
  https_port         = 443
  origin_host_header = var.domain_name
  priority           = 1
  weight             = 1000
}

# WAF Policy
resource "azurerm_cdn_frontdoor_firewall_policy" "main" {
  name                              = "flamoralprodwaf"
  resource_group_name               = azurerm_resource_group.prod.name
  sku_name                          = azurerm_cdn_frontdoor_profile.main.sku_name
  enabled                           = true
  mode                              = "Prevention"
  redirect_url                      = "https://flamoral.com/blocked"
  custom_block_response_status_code = 403
  custom_block_response_body        = base64encode("Access Denied")

  managed_rule {
    type    = "DefaultRuleSet"
    version = "1.0"
    action  = "Block"
  }

  managed_rule {
    type    = "Microsoft_BotManagerRuleSet"
    version = "1.0"
    action  = "Block"
  }

  tags = local.common_tags
}

resource "azurerm_cdn_frontdoor_security_policy" "main" {
  name                     = "flamoral-security-policy"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  security_policies {
    firewall {
      cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.main.id

      association {
        domain {
          cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_endpoint.main.id
        }
        patterns_to_match = ["/*"]
      }
    }
  }
}

# =============================================================================
# Service-Specific Key Vaults - Vault-per-App-per-Environment Architecture
# =============================================================================
# This module creates category-specific vaults for enhanced security isolation:
# - auth: JWT, OAuth, sessions
# - payment: Stripe, IAP credentials (Premium SKU for PCI compliance)
# - data: Database, Redis connections
# - external: Third-party API keys (SendGrid, Twilio, etc.)
# - infra: Infrastructure secrets, certificates
# =============================================================================
module "service_vaults" {
  source = "../../modules/service-vaults"

  resource_group_name = azurerm_resource_group.prod.name
  location            = azurerm_resource_group.prod.location
  prefix              = "flamoral"
  env                 = "prod"

  # Use premium SKU for production (required for payment vault PCI compliance)
  sku_name = "premium"

  # Security settings for production
  soft_delete_retention_days = 90
  enable_purge_protection    = true

  # Network security - restrict to AKS subnet
  allowed_subnet_ids = [azurerm_subnet.aks.id]

  # Grant AKS kubelet identity access to vaults
  aks_kubelet_identity_object_id = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id

  # Monitoring and alerting
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  # Private endpoints for production security (disabled initially, enable after testing)
  enable_private_endpoint     = false
  private_endpoint_subnet_id  = azurerm_subnet.private_endpoints.id

  tags = local.common_tags

  depends_on = [
    azurerm_kubernetes_cluster.main,
    azurerm_log_analytics_workspace.main
  ]
}
