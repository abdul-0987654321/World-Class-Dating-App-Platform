# Azure Redis Cache Module

resource "azurerm_redis_cache" "main" {
  name                = "${var.prefix}-${var.env}-redis"
  location            = var.location
  resource_group_name = var.resource_group_name
  capacity            = var.capacity
  family              = var.family
  sku_name            = var.sku_name
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  # subnet_id is only supported for Premium SKU (VNet injection)
  subnet_id = var.sku_name == "Premium" ? var.subnet_id : null

  redis_configuration {
    enable_authentication           = true
    maxmemory_reserved              = var.maxmemory_reserved
    maxmemory_delta                 = var.maxmemory_delta
    maxmemory_policy                = "allkeys-lru"
    notify_keyspace_events          = "Ex"
    # RDB backup is disabled for non-prod environments
    # Note: rdb_storage_connection_string removed due to Terraform sensitive value bug in conditionals
  }

  patch_schedule {
    day_of_week    = "Sunday"
    start_hour_utc = 2
  }

  tags = var.tags
}

# Private endpoint for Redis (optional)
resource "azurerm_private_endpoint" "redis" {
  count               = var.enable_private_endpoint ? 1 : 0
  name                = "${var.prefix}-${var.env}-redis-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.prefix}-${var.env}-redis-psc"
    private_connection_resource_id = azurerm_redis_cache.main.id
    is_manual_connection           = false
    subresource_names              = ["redisCache"]
  }

  tags = var.tags
}

# Firewall rules removed - Redis access is controlled via:
# 1. VNet injection for Premium SKU (subnet_id)
# 2. Private endpoints for Standard/Premium SKU
# 3. Service endpoints on AKS subnet
# Public firewall rules (0.0.0.0) are overly permissive and removed for security
