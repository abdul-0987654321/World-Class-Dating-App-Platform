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

  subnet_id = var.subnet_id

  redis_configuration {
    enable_authentication           = true
    maxmemory_reserved              = var.maxmemory_reserved
    maxmemory_delta                 = var.maxmemory_delta
    maxmemory_policy                = "allkeys-lru"
    notify_keyspace_events          = "Ex"
    rdb_backup_enabled              = var.env == "prod" ? true : false
    rdb_backup_frequency            = var.env == "prod" ? 60 : null
    rdb_backup_max_snapshot_count   = var.env == "prod" ? 1 : null
    rdb_storage_connection_string   = var.env == "prod" ? var.backup_storage_connection_string : null
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

# Firewall rules for Redis
resource "azurerm_redis_firewall_rule" "allow_azure" {
  name                = "AllowAzureServices"
  redis_cache_name    = azurerm_redis_cache.main.name
  resource_group_name = var.resource_group_name
  start_ip            = "0.0.0.0"
  end_ip              = "0.0.0.0"
}
