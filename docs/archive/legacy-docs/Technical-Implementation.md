# Technical Implementation - Infrastructure as Code (Azure)

## 🏗️ Overview

This document details the complete Infrastructure as Code (IaC) implementation for the Flamoral dating platform using Microsoft Azure cloud services. We utilize Terraform for infrastructure provisioning and Azure DevOps for CI/CD pipelines.

**Cloud Provider:** Microsoft Azure  
**IaC Tool:** Terraform v1.6+  
**Configuration Management:** Ansible  
**Container Orchestration:** Azure Kubernetes Service (AKS)  
**Version Control:** Git/GitHub

---

## 📐 Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Azure Front Door                          │
│                    (Global Load Balancer & CDN)                  │
└────────────────┬───────────────────────┬────────────────────────┘
                 │                       │
        ┌────────▼────────┐     ┌───────▼────────┐
        │   Region: US     │     │  Region: EU    │
        │   East (Primary) │     │  West (DR)     │
        └────────┬─────────┘     └───────┬────────┘
                 │                       │
    ┌────────────▼────────────┐ ┌───────▼──────────┐
    │  Application Gateway     │ │ Application Gwy  │
    │  (WAF Enabled)          │ │  (WAF Enabled)   │
    └────────────┬────────────┘ └───────┬──────────┘
                 │                       │
    ┌────────────▼────────────┐ ┌───────▼──────────┐
    │   AKS Cluster            │ │  AKS Cluster     │
    │   - API Services         │ │  - API Services  │
    │   - Matching Engine      │ │  - Matching Eng  │
    │   - Messaging Service    │ │  - Messaging Svc │
    │   - Media Processing     │ │  - Media Proc    │
    └────────────┬────────────┘ └───────┬──────────┘
                 │                       │
    ┌────────────▼────────────┐ ┌───────▼──────────┐
    │  Data Layer              │ │  Data Layer      │
    │  - PostgreSQL            │ │  - PostgreSQL    │
    │  - Cosmos DB             │ │  - Cosmos DB     │
    │  - Redis Cache           │ │  - Redis Cache   │
    │  - Blob Storage          │ │  - Blob Storage  │
    └──────────────────────────┘ └──────────────────┘
```

---

## 🔧 Core Infrastructure Components

### 1. Resource Groups Organization

```hcl
# terraform/environments/production/main.tf

terraform {
  required_version = ">= 1.6.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.45"
    }
  }
  
  backend "azurerm" {
    resource_group_name  = "flamoral-tfstate-rg"
    storage_account_name = "flamoraltfstate"
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

# Resource Groups
resource "azurerm_resource_group" "core" {
  name     = "flamoral-core-${var.environment}-rg"
  location = var.primary_region
  
  tags = {
    Environment = var.environment
    Project     = "Flamoral"
    ManagedBy   = "Terraform"
    CostCenter  = "Engineering"
  }
}

resource "azurerm_resource_group" "networking" {
  name     = "flamoral-network-${var.environment}-rg"
  location = var.primary_region
  
  tags = {
    Environment = var.environment
    Project     = "Flamoral"
    ManagedBy   = "Terraform"
  }
}

resource "azurerm_resource_group" "data" {
  name     = "flamoral-data-${var.environment}-rg"
  location = var.primary_region
  
  tags = {
    Environment = var.environment
    Project     = "Flamoral"
    ManagedBy   = "Terraform"
  }
}

resource "azurerm_resource_group" "compute" {
  name     = "flamoral-compute-${var.environment}-rg"
  location = var.primary_region
  
  tags = {
    Environment = var.environment
    Project     = "Flamoral"
    ManagedBy   = "Terraform"
  }
}
```

### 2. Virtual Network Configuration

```hcl
# terraform/modules/networking/vnet.tf

resource "azurerm_virtual_network" "main" {
  name                = "flamoral-vnet-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = ["10.0.0.0/16"]
  
  tags = var.tags
}

# Subnets
resource "azurerm_subnet" "aks" {
  name                 = "aks-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
  
  service_endpoints = [
    "Microsoft.Sql",
    "Microsoft.Storage",
    "Microsoft.KeyVault"
  ]
}

resource "azurerm_subnet" "appgw" {
  name                 = "appgw-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/24"]
}

resource "azurerm_subnet" "database" {
  name                 = "database-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.3.0/24"]
  
  delegation {
    name = "postgresql-delegation"
    
    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

resource "azurerm_subnet" "private_endpoints" {
  name                 = "private-endpoints-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.4.0/24"]
  
  private_endpoint_network_policies_enabled = false
}

# Network Security Groups
resource "azurerm_network_security_group" "aks" {
  name                = "aks-nsg-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  
  security_rule {
    name                       = "allow-https-inbound"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "AzureFrontDoor.Backend"
    destination_address_prefix = "*"
  }
  
  security_rule {
    name                       = "allow-http-inbound"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "AzureFrontDoor.Backend"
    destination_address_prefix = "*"
  }
  
  tags = var.tags
}

resource "azurerm_subnet_network_security_group_association" "aks" {
  subnet_id                 = azurerm_subnet.aks.id
  network_security_group_id = azurerm_network_security_group.aks.id
}
```

### 3. Azure Kubernetes Service (AKS)

```hcl
# terraform/modules/aks/main.tf

resource "azurerm_kubernetes_cluster" "main" {
  name                = "flamoral-aks-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = "flamoral-${var.environment}"
  kubernetes_version  = "1.28.3"
  
  default_node_pool {
    name                = "system"
    node_count          = 3
    vm_size             = "Standard_D4s_v5"
    vnet_subnet_id      = var.aks_subnet_id
    enable_auto_scaling = true
    min_count           = 3
    max_count           = 10
    os_disk_size_gb     = 128
    os_disk_type        = "Managed"
    
    node_labels = {
      "nodepool" = "system"
    }
    
    tags = var.tags
  }
  
  identity {
    type = "SystemAssigned"
  }
  
  network_profile {
    network_plugin     = "azure"
    network_policy     = "calico"
    load_balancer_sku  = "standard"
    outbound_type      = "loadBalancer"
    service_cidr       = "10.1.0.0/16"
    dns_service_ip     = "10.1.0.10"
  }
  
  addon_profile {
    azure_policy {
      enabled = true
    }
    
    oms_agent {
      enabled                    = true
      log_analytics_workspace_id = var.log_analytics_workspace_id
    }
    
    azure_keyvault_secrets_provider {
      enabled = true
    }
  }
  
  auto_scaler_profile {
    balance_similar_node_groups      = true
    max_graceful_termination_sec     = 600
    scale_down_delay_after_add       = "10m"
    scale_down_unneeded              = "10m"
    scale_down_utilization_threshold = 0.5
  }
  
  tags = var.tags
}

# Additional Node Pool for Application Workloads
resource "azurerm_kubernetes_cluster_node_pool" "app" {
  name                  = "app"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = "Standard_D8s_v5"
  node_count            = 5
  enable_auto_scaling   = true
  min_count             = 3
  max_count             = 20
  vnet_subnet_id        = var.aks_subnet_id
  
  node_labels = {
    "nodepool" = "application"
    "workload" = "api"
  }
  
  node_taints = [
    "workload=api:NoSchedule"
  ]
  
  tags = var.tags
}

# GPU Node Pool for ML Workloads
resource "azurerm_kubernetes_cluster_node_pool" "ml" {
  name                  = "ml"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = "Standard_NC6s_v3"
  node_count            = 2
  enable_auto_scaling   = true
  min_count             = 1
  max_count             = 5
  vnet_subnet_id        = var.aks_subnet_id
  
  node_labels = {
    "nodepool" = "ml"
    "workload" = "matching-algorithm"
  }
  
  node_taints = [
    "workload=ml:NoSchedule"
  ]
  
  tags = var.tags
}
```

### 4. PostgreSQL Database

```hcl
# terraform/modules/database/postgresql.tf

resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "flamoral-postgres-${var.environment}"
  resource_group_name    = var.resource_group_name
  location               = var.location
  version                = "15"
  administrator_login    = var.db_admin_username
  administrator_password = var.db_admin_password
  
  storage_mb   = 524288  # 512 GB
  storage_tier = "P30"
  
  sku_name = "GP_Standard_D4s_v3"
  
  backup_retention_days        = 35
  geo_redundant_backup_enabled = true
  
  delegated_subnet_id = var.database_subnet_id
  private_dns_zone_id = azurerm_private_dns_zone.postgres.id
  
  high_availability {
    mode                      = "ZoneRedundant"
    standby_availability_zone = "2"
  }
  
  maintenance_window {
    day_of_week  = 0
    start_hour   = 3
    start_minute = 0
  }
  
  tags = var.tags
  
  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]
}

# Databases
resource "azurerm_postgresql_flexible_server_database" "users" {
  name      = "users_db"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_database" "matches" {
  name      = "matches_db"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_database" "messages" {
  name      = "messages_db"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Firewall Rules
resource "azurerm_postgresql_flexible_server_firewall_rule" "aks" {
  name             = "aks-cluster-access"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "10.0.1.0"
  end_ip_address   = "10.0.1.255"
}

# Private DNS Zone
resource "azurerm_private_dns_zone" "postgres" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = var.resource_group_name
  
  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "postgres-vnet-link"
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  resource_group_name   = var.resource_group_name
  virtual_network_id    = var.vnet_id
  
  tags = var.tags
}
```

### 5. Cosmos DB (NoSQL)

```hcl
# terraform/modules/database/cosmosdb.tf

resource "azurerm_cosmosdb_account" "main" {
  name                = "flamoral-cosmos-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"
  
  enable_automatic_failover = true
  enable_multiple_write_locations = true
  
  consistency_policy {
    consistency_level       = "Session"
    max_interval_in_seconds = 5
    max_staleness_prefix    = 100
  }
  
  geo_location {
    location          = var.location
    failover_priority = 0
    zone_redundant    = true
  }
  
  geo_location {
    location          = var.secondary_region
    failover_priority = 1
    zone_redundant    = true
  }
  
  capabilities {
    name = "EnableServerless"
  }
  
  backup {
    type                = "Continuous"
    interval_in_minutes = 240
    retention_in_hours  = 720
  }
  
  tags = var.tags
}

# Database for User Preferences
resource "azurerm_cosmosdb_sql_database" "preferences" {
  name                = "user_preferences"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
}

resource "azurerm_cosmosdb_sql_container" "preferences" {
  name                  = "preferences"
  resource_group_name   = var.resource_group_name
  account_name          = azurerm_cosmosdb_account.main.name
  database_name         = azurerm_cosmosdb_sql_database.preferences.name
  partition_key_path    = "/userId"
  partition_key_version = 2
  throughput            = 400
  
  indexing_policy {
    indexing_mode = "consistent"
    
    included_path {
      path = "/*"
    }
    
    excluded_path {
      path = "/\"_etag\"/?"
    }
  }
}

# Database for Activity Logs
resource "azurerm_cosmosdb_sql_database" "activity" {
  name                = "activity_logs"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
}

resource "azurerm_cosmosdb_sql_container" "activity" {
  name                  = "activities"
  resource_group_name   = var.resource_group_name
  account_name          = azurerm_cosmosdb_account.main.name
  database_name         = azurerm_cosmosdb_sql_database.activity.name
  partition_key_path    = "/userId"
  partition_key_version = 2
  
  autoscale_settings {
    max_throughput = 4000
  }
  
  default_ttl = 2592000  # 30 days
}
```

### 6. Redis Cache

```hcl
# terraform/modules/cache/redis.tf

resource "azurerm_redis_cache" "main" {
  name                = "flamoral-redis-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  capacity            = 3
  family              = "P"
  sku_name            = "Premium"
  
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"
  
  redis_configuration {
    maxmemory_reserved              = 615
    maxmemory_delta                 = 615
    maxmemory_policy                = "allkeys-lru"
    rdb_backup_enabled              = true
    rdb_backup_frequency            = 60
    rdb_backup_max_snapshot_count   = 1
    rdb_storage_connection_string   = var.storage_connection_string
  }
  
  redis_version = "6"
  
  patch_schedule {
    day_of_week    = "Sunday"
    start_hour_utc = 3
  }
  
  zones = ["1", "2", "3"]
  
  tags = var.tags
}

# Private Endpoint for Redis
resource "azurerm_private_endpoint" "redis" {
  name                = "redis-pe-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id
  
  private_service_connection {
    name                           = "redis-privateconnection"
    private_connection_resource_id = azurerm_redis_cache.main.id
    subresource_names              = ["redisCache"]
    is_manual_connection           = false
  }
  
  tags = var.tags
}
```

### 7. Blob Storage for Media

```hcl
# terraform/modules/storage/blob.tf

resource "azurerm_storage_account" "media" {
  name                     = "flamoralmedia${var.environment}"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "GZRS"  # Geo-zone-redundant
  account_kind             = "StorageV2"
  
  min_tls_version                 = "TLS1_2"
  enable_https_traffic_only       = true
  allow_nested_items_to_be_public = false
  
  blob_properties {
    versioning_enabled  = true
    change_feed_enabled = true
    
    delete_retention_policy {
      days = 30
    }
    
    container_delete_retention_policy {
      days = 30
    }
    
    cors_rule {
      allowed_headers    = ["*"]
      allowed_methods    = ["GET", "HEAD", "POST", "PUT"]
      allowed_origins    = ["https://*.flamoral.com"]
      exposed_headers    = ["*"]
      max_age_in_seconds = 3600
    }
  }
  
  network_rules {
    default_action             = "Deny"
    bypass                     = ["AzureServices"]
    virtual_network_subnet_ids = [var.aks_subnet_id]
  }
  
  tags = var.tags
}

# Containers
resource "azurerm_storage_container" "profile_photos" {
  name                  = "profile-photos"
  storage_account_name  = azurerm_storage_account.media.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "verification_photos" {
  name                  = "verification-photos"
  storage_account_name  = azurerm_storage_account.media.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "video_content" {
  name                  = "video-content"
  storage_account_name  = azurerm_storage_account.media.name
  container_access_type = "private"
}

# Lifecycle Management
resource "azurerm_storage_management_policy" "media" {
  storage_account_id = azurerm_storage_account.media.id
  
  rule {
    name    = "move-old-photos-to-cool"
    enabled = true
    
    filters {
      prefix_match = ["profile-photos/"]
      blob_types   = ["blockBlob"]
    }
    
    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than = 90
        tier_to_archive_after_days_since_modification_greater_than = 180
      }
    }
  }
}
```

### 8. Azure Front Door (CDN & Global Load Balancer)

```hcl
# terraform/modules/cdn/frontdoor.tf

resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = "flamoral-fd-${var.environment}"
  resource_group_name = var.resource_group_name
  sku_name            = "Premium_AzureFrontDoor"
  
  tags = var.tags
}

# Endpoint
resource "azurerm_cdn_frontdoor_endpoint" "main" {
  name                     = "flamoral-${var.environment}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  
  tags = var.tags
}

# Origin Group
resource "azurerm_cdn_frontdoor_origin_group" "api" {
  name                     = "api-origin-group"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  
  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
    additional_latency_in_milliseconds = 50
  }
  
  health_probe {
    path                = "/health"
    request_type        = "GET"
    protocol            = "Https"
    interval_in_seconds = 30
  }
}

# Origins
resource "azurerm_cdn_frontdoor_origin" "primary" {
  name                          = "primary-origin"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.api.id
  
  enabled                        = true
  host_name                      = var.primary_appgw_fqdn
  http_port                      = 80
  https_port                     = 443
  origin_host_header             = var.primary_appgw_fqdn
  priority                       = 1
  weight                         = 1000
  certificate_name_check_enabled = true
}

resource "azurerm_cdn_frontdoor_origin" "secondary" {
  name                          = "secondary-origin"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.api.id
  
  enabled                        = true
  host_name                      = var.secondary_appgw_fqdn
  http_port                      = 80
  https_port                     = 443
  origin_host_header             = var.secondary_appgw_fqdn
  priority                       = 2
  weight                         = 1000
  certificate_name_check_enabled = true
}

# Route
resource "azurerm_cdn_frontdoor_route" "api" {
  name                          = "api-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.api.id
  cdn_frontdoor_origin_ids      = [
    azurerm_cdn_frontdoor_origin.primary.id,
    azurerm_cdn_frontdoor_origin.secondary.id
  ]
  
  supported_protocols    = ["Http", "Https"]
  patterns_to_match      = ["/api/*"]
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  
  cache {
    query_string_caching_behavior = "IgnoreQueryString"
    compression_enabled           = true
    content_types_to_compress     = [
      "application/json",
      "text/html",
      "text/css",
      "text/javascript"
    ]
  }
}

# WAF Policy
resource "azurerm_cdn_frontdoor_firewall_policy" "main" {
  name                              = "flamoralwaf${var.environment}"
  resource_group_name               = var.resource_group_name
  sku_name                          = azurerm_cdn_frontdoor_profile.main.sku_name
  enabled                           = true
  mode                              = "Prevention"
  custom_block_response_status_code = 403
  
  managed_rule {
    type    = "Microsoft_DefaultRuleSet"
    version = "2.1"
    action  = "Block"
  }
  
  managed_rule {
    type    = "Microsoft_BotManagerRuleSet"
    version = "1.0"
    action  = "Block"
  }
  
  custom_rule {
    name                           = "RateLimitRule"
    enabled                        = true
    priority                       = 1
    rate_limit_duration_in_minutes = 1
    rate_limit_threshold           = 100
    type                           = "RateLimitRule"
    action                         = "Block"
    
    match_condition {
      match_variable     = "RemoteAddr"
      operator           = "IPMatch"
      negation_condition = false
      match_values       = ["0.0.0.0/0"]
    }
  }
  
  tags = var.tags
}
```

### 9. Application Gateway with WAF

```hcl
# terraform/modules/networking/appgw.tf

resource "azurerm_public_ip" "appgw" {
  name                = "appgw-pip-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = ["1", "2", "3"]
  
  tags = var.tags
}

resource "azurerm_application_gateway" "main" {
  name                = "flamoral-appgw-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  
  sku {
    name     = "WAF_v2"
    tier     = "WAF_v2"
    capacity = 2
  }
  
  autoscale_configuration {
    min_capacity = 2
    max_capacity = 10
  }
  
  gateway_ip_configuration {
    name      = "gateway-ip-config"
    subnet_id = var.appgw_subnet_id
  }
  
  frontend_port {
    name = "https-port"
    port = 443
  }
  
  frontend_port {
    name = "http-port"
    port = 80
  }
  
  frontend_ip_configuration {
    name                 = "frontend-ip-config"
    public_ip_address_id = azurerm_public_ip.appgw.id
  }
  
  backend_address_pool {
    name = "aks-backend-pool"
  }
  
  backend_http_settings {
    name                  = "backend-http-settings"
    cookie_based_affinity = "Disabled"
    port                  = 80
    protocol              = "Http"
    request_timeout       = 60
    
    probe_name = "health-probe"
  }
  
  probe {
    name                                      = "health-probe"
    protocol                                  = "Http"
    path                                      = "/health"
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true
  }
  
  http_listener {
    name                           = "https-listener"
    frontend_ip_configuration_name = "frontend-ip-config"
    frontend_port_name             = "https-port"
    protocol                       = "Https"
    ssl_certificate_name           = "ssl-cert"
  }
  
  http_listener {
    name                           = "http-listener"
    frontend_ip_configuration_name = "frontend-ip-config"
    frontend_port_name             = "http-port"
    protocol                       = "Http"
  }
  
  request_routing_rule {
    name                       = "https-routing-rule"
    rule_type                  = "Basic"
    http_listener_name         = "https-listener"
    backend_address_pool_name  = "aks-backend-pool"
    backend_http_settings_name = "backend-http-settings"
    priority                   = 100
  }
  
  request_routing_rule {
    name               = "http-to-https-redirect"
    rule_type          = "Basic"
    http_listener_name = "http-listener"
    redirect_configuration_name = "http-to-https"
    priority           = 110
  }
  
  redirect_configuration {
    name                 = "http-to-https"
    redirect_type        = "Permanent"
    target_listener_name = "https-listener"
    include_path         = true
    include_query_string = true
  }
  
  ssl_certificate {
    name     = "ssl-cert"
    data     = filebase64(var.ssl_certificate_path)
    password = var.ssl_certificate_password
  }
  
  waf_configuration {
    enabled          = true
    firewall_mode    = "Prevention"
    rule_set_type    = "OWASP"
    rule_set_version = "3.2"
    
    disabled_rule_group {
      rule_group_name = "REQUEST-942-APPLICATION-ATTACK-SQLI"
      rules           = []
    }
  }
  
  zones = ["1", "2", "3"]
  
  tags = var.tags
}
```

### 10. Key Vault

```hcl
# terraform/modules/security/keyvault.tf

data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "main" {
  name                        = "cs-kv-${var.environment}-${random_string.suffix.result}"
  location                    = var.location
  resource_group_name         = var.resource_group_name
  enabled_for_disk_encryption = true
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days  = 90
  purge_protection_enabled    = true
  sku_name                    = "premium"
  
  network_acls {
    bypass                     = "AzureServices"
    default_action             = "Deny"
    virtual_network_subnet_ids = [var.aks_subnet_id]
  }
  
  tags = var.tags
}

# Access Policies
resource "azurerm_key_vault_access_policy" "aks" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = var.aks_identity_object_id
  
  secret_permissions = [
    "Get",
    "List"
  ]
  
  certificate_permissions = [
    "Get",
    "List"
  ]
}

# Secrets
resource "azurerm_key_vault_secret" "db_password" {
  name         = "postgresql-admin-password"
  value        = var.db_admin_password
  key_vault_id = azurerm_key_vault.main.id
  
  content_type = "password"
  
  tags = var.tags
}

resource "azurerm_key_vault_secret" "redis_key" {
  name         = "redis-primary-key"
  value        = azurerm_redis_cache.main.primary_access_key
  key_vault_id = azurerm_key_vault.main.id
  
  content_type = "connection-string"
  
  tags = var.tags
}

resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "jwt-secret-key"
  value        = random_password.jwt_secret.result
  key_vault_id = azurerm_key_vault.main.id
  
  content_type = "api-key"
  
  tags = var.tags
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}
```

---

## 📊 Monitoring & Observability

### 11. Log Analytics & Application Insights

```hcl
# terraform/modules/monitoring/log_analytics.tf

resource "azurerm_log_analytics_workspace" "main" {
  name                = "flamoral-law-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 90
  
  tags = var.tags
}

resource "azurerm_application_insights" "main" {
  name                = "flamoral-ai-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"
  
  tags = var.tags
}

# Diagnostic Settings for AKS
resource "azurerm_monitor_diagnostic_setting" "aks" {
  name                       = "aks-diagnostics"
  target_resource_id         = var.aks_cluster_id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  
  enabled_log {
    category = "kube-apiserver"
  }
  
  enabled_log {
    category = "kube-controller-manager"
  }
  
  enabled_log {
    category = "kube-scheduler"
  }
  
  enabled_log {
    category = "kube-audit"
  }
  
  enabled_log {
    category = "cluster-autoscaler"
  }
  
  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# Alert Rules
resource "azurerm_monitor_metric_alert" "cpu_high" {
  name                = "aks-cpu-high-${var.environment}"
  resource_group_name = var.resource_group_name
  scopes              = [var.aks_cluster_id]
  description         = "Alert when CPU usage is high"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"
  
  criteria {
    metric_namespace = "Microsoft.ContainerService/managedClusters"
    metric_name      = "node_cpu_usage_percentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }
  
  action {
    action_group_id = azurerm_monitor_action_group.ops.id
  }
  
  tags = var.tags
}

resource "azurerm_monitor_action_group" "ops" {
  name                = "ops-action-group"
  resource_group_name = var.resource_group_name
  short_name          = "ops-ag"
  
  email_receiver {
    name                    = "ops-team"
    email_address           = "ops@flamoral.com"
    use_common_alert_schema = true
  }
  
  sms_receiver {
    name         = "oncall"
    country_code = "1"
    phone_number = "5555555555"
  }
  
  tags = var.tags
}
```

---

## 🚀 Deployment Process

### Terraform Workflow

```bash
# Initialize Terraform
terraform init -backend-config="environments/production/backend.hcl"

# Validate configuration
terraform validate

# Plan infrastructure changes
terraform plan -var-file="environments/production/terraform.tfvars" -out=tfplan

# Apply changes
terraform apply tfplan

# Destroy infrastructure (use with caution)
terraform destroy -var-file="environments/production/terraform.tfvars"
```

### Environment Variables File

```hcl
# environments/production/terraform.tfvars

environment      = "production"
primary_region   = "East US"
secondary_region = "West Europe"

# Database
db_admin_username = "csadmin"
# db_admin_password stored in Azure Key Vault

# AKS
kubernetes_version = "1.28.3"
aks_node_count    = 5

# Tags
tags = {
  Environment = "Production"
  Project     = "Flamoral"
  ManagedBy   = "Terraform"
  CostCenter  = "Engineering"
  Compliance  = "GDPR,CCPA"
}
```

### Backend Configuration

```hcl
# environments/production/backend.hcl

resource_group_name  = "flamoral-tfstate-rg"
storage_account_name = "flamoraltfstate"
container_name       = "tfstate"
key                  = "production.terraform.tfstate"
```

---

## 🔐 Security Best Practices

### 1. Network Security
- All databases in private subnets with no public access
- NSGs restricting traffic between tiers
- Private endpoints for Azure services
- WAF enabled on Application Gateway and Front Door

### 2. Identity & Access
- Managed identities for service-to-service authentication
- Azure AD integration for human access
- RBAC for granular permissions
- Key Vault for secrets management

### 3. Data Protection
- Encryption at rest for all storage services
- TLS 1.2+ for all communications
- Geo-redundant backups
- Soft delete enabled on critical resources

### 4. Compliance
- GDPR compliance through data residency controls
- Audit logging enabled on all services
- Regular security assessments with Azure Security Center
- Compliance reports automated through Azure Policy

---

## 📈 Scaling Strategy

### Horizontal Scaling
- AKS auto-scaling based on CPU/memory metrics
- Front Door distributes traffic globally
- Read replicas for PostgreSQL
- Multi-region Cosmos DB for low latency

### Vertical Scaling
- Scheduled scaling for predictable loads
- GPU nodes for ML workloads
- Premium storage tiers for high IOPS

---

## 💰 Cost Optimization

### Right-sizing
- Use Azure Advisor recommendations
- Reserved instances for predictable workloads
- Spot instances for batch processing

### Resource Management
- Auto-shutdown for non-production environments
- Lifecycle policies for blob storage
- Database scaling based on usage patterns

---

## 📝 Next Steps

1. Review and customize variables in `terraform.tfvars`
2. Set up Azure DevOps project and service connections
3. Configure service principals with appropriate permissions
4. Run Terraform plan to preview infrastructure
5. Apply infrastructure in stages (networking → data → compute)
6. Deploy Kubernetes manifests for applications
7. Configure monitoring dashboards and alerts
8. Perform security hardening and compliance checks

---

**Document Version:** 1.0.0  
**Last Updated:** November 14, 2025  
**Maintained By:** DevOps Team
