# Azure CosmosDB Module

resource "azurerm_cosmosdb_account" "main" {
  name                = "${var.prefix}-${var.env}-cosmos"
  location            = var.location
  resource_group_name = var.resource_group_name
  offer_type          = "Standard"
  kind                = var.cosmos_kind

  consistency_policy {
    consistency_level       = var.consistency_level
    max_interval_in_seconds = var.consistency_level == "BoundedStaleness" ? 300 : null
    max_staleness_prefix    = var.consistency_level == "BoundedStaleness" ? 100000 : null
  }

  # Primary region
  geo_location {
    location          = var.location
    failover_priority = 0
    zone_redundant    = var.env == "prod" ? true : false
  }

  # Secondary region for production
  dynamic "geo_location" {
    for_each = var.env == "prod" && var.secondary_location != "" ? [1] : []
    content {
      location          = var.secondary_location
      failover_priority = 1
      zone_redundant    = true
    }
  }

  capabilities {
    name = "EnableServerless"
  }

  automatic_failover_enabled = var.env == "prod" ? true : false
  multiple_write_locations_enabled = var.env == "prod" ? true : false

  public_network_access_enabled     = var.enable_public_access
  is_virtual_network_filter_enabled = true
  virtual_network_rule {
    id = var.aks_subnet_id
  }

  ip_range_filter = join(",", var.allowed_ip_addresses)

  backup {
    type                = var.backup_type
    interval_in_minutes = var.backup_type == "Periodic" ? var.backup_interval_minutes : null
    retention_in_hours  = var.backup_type == "Periodic" ? var.backup_retention_hours : null
    storage_redundancy  = var.backup_type == "Periodic" ? "Geo" : null
  }

  tags = var.tags
}

# SQL Database for user activities
resource "azurerm_cosmosdb_sql_database" "activities" {
  name                = "activities"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
}

# SQL Container for user events
resource "azurerm_cosmosdb_sql_container" "user_events" {
  name                  = "user_events"
  resource_group_name   = var.resource_group_name
  account_name          = azurerm_cosmosdb_account.main.name
  database_name         = azurerm_cosmosdb_sql_database.activities.name
  partition_key_path    = "/userId"
  partition_key_version = 2

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }

  default_ttl = 2592000  # 30 days

  unique_key {
    paths = ["/userId", "/eventId"]
  }
}

# SQL Container for matches
resource "azurerm_cosmosdb_sql_container" "matches" {
  name                  = "matches"
  resource_group_name   = var.resource_group_name
  account_name          = azurerm_cosmosdb_account.main.name
  database_name         = azurerm_cosmosdb_sql_database.activities.name
  partition_key_path    = "/userId"
  partition_key_version = 2

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }
  }

  default_ttl = -1  # No expiration
}

# SQL Container for real-time feed
resource "azurerm_cosmosdb_sql_container" "feed" {
  name                  = "feed"
  resource_group_name   = var.resource_group_name
  account_name          = azurerm_cosmosdb_account.main.name
  database_name         = azurerm_cosmosdb_sql_database.activities.name
  partition_key_path    = "/userId"
  partition_key_version = 2

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/timestamp/?"
    }

    included_path {
      path = "/userId/?"
    }

    excluded_path {
      path = "/*"
    }
  }

  default_ttl = 604800  # 7 days
}

# Private Endpoint for CosmosDB
resource "azurerm_private_endpoint" "cosmos" {
  count               = var.enable_private_endpoint ? 1 : 0
  name                = "${var.prefix}-${var.env}-cosmos-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.prefix}-${var.env}-cosmos-psc"
    private_connection_resource_id = azurerm_cosmosdb_account.main.id
    is_manual_connection           = false
    subresource_names              = ["Sql"]
  }

  tags = var.tags
}

# Diagnostic Settings
resource "azurerm_monitor_diagnostic_setting" "cosmos" {
  count                      = var.log_analytics_workspace_id != "" ? 1 : 0
  name                       = "${var.prefix}-${var.env}-cosmos-diagnostics"
  target_resource_id         = azurerm_cosmosdb_account.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "DataPlaneRequests"
  }

  enabled_log {
    category = "QueryRuntimeStatistics"
  }

  enabled_log {
    category = "PartitionKeyStatistics"
  }

  metric {
    category = "Requests"
    enabled  = true
  }
}
