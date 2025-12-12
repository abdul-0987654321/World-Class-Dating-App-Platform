# Comprehensive Backup Infrastructure Module for Flamoral Dating Platform

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# ============================================================================
# Storage Account for Backups
# ============================================================================

resource "azurerm_storage_account" "backup" {
  name                     = "${var.prefix}${var.env}backup"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "RAGRS" # Read-Access Geo-Redundant Storage
  account_kind             = "StorageV2"
  access_tier              = "Cool"

  min_tls_version                 = "TLS1_2"
  enable_https_traffic_only       = true
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = true

  # Soft delete for blobs
  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }

    # Point-in-time restore
    restore_policy {
      days = 30
    }
  }

  # Network security
  network_rules {
    default_action             = "Deny"
    bypass                     = ["AzureServices"]
    ip_rules                   = var.allowed_ip_addresses
    virtual_network_subnet_ids = var.allowed_subnet_ids
  }

  # Immutable storage with legal hold
  immutability_policy {
    allow_protected_append_writes = true
    state                         = "Unlocked"
    period_since_creation_in_days = 30
  }

  tags = merge(var.tags, {
    Purpose = "Disaster Recovery Backups"
  })
}

# Secondary region backup storage
resource "azurerm_storage_account" "backup_secondary" {
  count                    = var.enable_cross_region_replication ? 1 : 0
  name                     = "${var.prefix}${var.env}backupdr"
  resource_group_name      = var.resource_group_name
  location                 = var.secondary_location
  account_tier             = "Standard"
  account_replication_type = "GRS"
  account_kind             = "StorageV2"
  access_tier              = "Cool"

  min_tls_version                 = "TLS1_2"
  enable_https_traffic_only       = true
  allow_nested_items_to_be_public = false

  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 30
    }
  }

  tags = merge(var.tags, {
    Purpose = "DR Secondary Region Backups"
  })
}

# ============================================================================
# Backup Containers
# ============================================================================

resource "azurerm_storage_container" "postgres_backups" {
  name                  = "postgresql-backups"
  storage_account_name  = azurerm_storage_account.backup.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "cosmos_backups" {
  name                  = "cosmos-backups"
  storage_account_name  = azurerm_storage_account.backup.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "redis_backups" {
  name                  = "redis-backups"
  storage_account_name  = azurerm_storage_account.backup.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "k8s_backups" {
  name                  = "kubernetes-backups"
  storage_account_name  = azurerm_storage_account.backup.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "config_backups" {
  name                  = "configuration-backups"
  storage_account_name  = azurerm_storage_account.backup.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "secrets_backups" {
  name                  = "secrets-backups"
  storage_account_name  = azurerm_storage_account.backup.name
  container_access_type = "private"
}

# ============================================================================
# Backup Lifecycle Management
# ============================================================================

resource "azurerm_storage_management_policy" "backup_lifecycle" {
  storage_account_id = azurerm_storage_account.backup.id

  rule {
    name    = "retain30Days"
    enabled = true

    filters {
      prefix_match = ["postgresql-backups/", "cosmos-backups/", "redis-backups/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 7
        tier_to_archive_after_days_since_modification_greater_than = 30
        delete_after_days_since_modification_greater_than          = 90
      }

      snapshot {
        delete_after_days_since_creation_greater_than = 30
      }
    }
  }

  rule {
    name    = "retainK8sBackups"
    enabled = true

    filters {
      prefix_match = ["kubernetes-backups/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        delete_after_days_since_modification_greater_than = 30
      }
    }
  }

  rule {
    name    = "archiveConfigs"
    enabled = true

    filters {
      prefix_match = ["configuration-backups/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_archive_after_days_since_modification_greater_than = 90
        delete_after_days_since_modification_greater_than          = 365
      }
    }
  }
}

# ============================================================================
# Recovery Services Vault
# ============================================================================

resource "azurerm_recovery_services_vault" "main" {
  name                = "${var.prefix}-${var.env}-recovery-vault"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "Standard"

  soft_delete_enabled = true
  storage_mode_type   = "GeoRedundant"

  tags = var.tags
}

# ============================================================================
# PostgreSQL Backup Configuration
# ============================================================================

resource "azurerm_postgresql_flexible_server_configuration" "backup_retention" {
  name      = "backup_retention_days"
  server_id = var.postgres_server_id
  value     = "30"
}

resource "azurerm_postgresql_flexible_server_configuration" "geo_redundant_backup" {
  count     = var.env == "prod" ? 1 : 0
  name      = "geo_redundant_backup"
  server_id = var.postgres_server_id
  value     = "on"
}

# Enable WAL archiving for point-in-time recovery
resource "azurerm_postgresql_flexible_server_configuration" "wal_level" {
  name      = "wal_level"
  server_id = var.postgres_server_id
  value     = "replica"
}

resource "azurerm_postgresql_flexible_server_configuration" "archive_mode" {
  name      = "archive_mode"
  server_id = var.postgres_server_id
  value     = "on"
}

resource "azurerm_postgresql_flexible_server_configuration" "max_wal_senders" {
  name      = "max_wal_senders"
  server_id = var.postgres_server_id
  value     = "10"
}

resource "azurerm_postgresql_flexible_server_configuration" "wal_keep_size" {
  name      = "wal_keep_size"
  server_id = var.postgres_server_id
  value     = "1024" # 1GB in MB
}

# ============================================================================
# Backup Automation User-Assigned Identity
# ============================================================================

resource "azurerm_user_assigned_identity" "backup_automation" {
  name                = "${var.prefix}-${var.env}-backup-identity"
  resource_group_name = var.resource_group_name
  location            = var.location

  tags = var.tags
}

# Grant permissions to backup storage
resource "azurerm_role_assignment" "backup_storage_contributor" {
  scope                = azurerm_storage_account.backup.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.backup_automation.principal_id
}

# Grant permissions to Key Vault for secrets backup
resource "azurerm_role_assignment" "backup_keyvault_reader" {
  count                = var.keyvault_id != "" ? 1 : 0
  scope                = var.keyvault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.backup_automation.principal_id
}

# ============================================================================
# Backup Monitoring and Alerts
# ============================================================================

resource "azurerm_monitor_action_group" "backup_alerts" {
  name                = "${var.prefix}-${var.env}-backup-alerts"
  resource_group_name = var.resource_group_name
  short_name          = "BkpAlert"

  email_receiver {
    name                    = "DevOps Team"
    email_address           = var.alert_email
    use_common_alert_schema = true
  }

  webhook_receiver {
    name                    = "Slack Webhook"
    service_uri             = var.slack_webhook_url
    use_common_alert_schema = true
  }

  tags = var.tags
}

# Alert for failed backups
resource "azurerm_monitor_metric_alert" "backup_failure" {
  name                = "${var.prefix}-${var.env}-backup-failure-alert"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_storage_account.backup.id]
  description         = "Alert when backup operations fail"
  severity            = 1
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.Storage/storageAccounts"
    metric_name      = "Transactions"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 10

    dimension {
      name     = "ResponseType"
      operator = "Include"
      values   = ["ServerError", "ClientError"]
    }
  }

  action {
    action_group_id = azurerm_monitor_action_group.backup_alerts.id
  }

  tags = var.tags
}

# Alert for backup storage capacity
resource "azurerm_monitor_metric_alert" "backup_storage_capacity" {
  name                = "${var.prefix}-${var.env}-backup-storage-alert"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_storage_account.backup.id]
  description         = "Alert when backup storage is running low"
  severity            = 2
  frequency           = "PT1H"
  window_size         = "PT1H"

  criteria {
    metric_namespace = "Microsoft.Storage/storageAccounts"
    metric_name      = "UsedCapacity"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 900000000000 # 900GB threshold
  }

  action {
    action_group_id = azurerm_monitor_action_group.backup_alerts.id
  }

  tags = var.tags
}

# ============================================================================
# Automation Account for Scheduled Backups
# ============================================================================

resource "azurerm_automation_account" "backup" {
  name                = "${var.prefix}-${var.env}-backup-automation"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku_name            = "Basic"

  identity {
    type = "UserAssigned"
    identity_ids = [
      azurerm_user_assigned_identity.backup_automation.id
    ]
  }

  tags = var.tags
}

# Hourly database backup schedule
resource "azurerm_automation_schedule" "hourly_db_backup" {
  name                    = "hourly-database-backup"
  resource_group_name     = var.resource_group_name
  automation_account_name = azurerm_automation_account.backup.name
  frequency               = "Hour"
  interval                = 1
  timezone                = "UTC"
  description             = "Hourly PostgreSQL backup schedule"
}

# Daily full backup schedule
resource "azurerm_automation_schedule" "daily_full_backup" {
  name                    = "daily-full-backup"
  resource_group_name     = var.resource_group_name
  automation_account_name = azurerm_automation_account.backup.name
  frequency               = "Day"
  interval                = 1
  timezone                = "UTC"
  start_time              = "${formatdate("YYYY-MM-DD", timestamp())}T02:00:00Z"
  description             = "Daily full system backup at 2 AM UTC"
}

# Weekly comprehensive backup
resource "azurerm_automation_schedule" "weekly_backup" {
  name                    = "weekly-comprehensive-backup"
  resource_group_name     = var.resource_group_name
  automation_account_name = azurerm_automation_account.backup.name
  frequency               = "Week"
  interval                = 1
  timezone                = "UTC"
  week_days               = ["Sunday"]
  start_time              = "${formatdate("YYYY-MM-DD", timestamp())}T01:00:00Z"
  description             = "Weekly comprehensive backup every Sunday"
}

# ============================================================================
# Diagnostic Settings for Backup Monitoring
# ============================================================================

resource "azurerm_monitor_diagnostic_setting" "backup_storage" {
  name                       = "${var.prefix}-${var.env}-backup-diagnostics"
  target_resource_id         = azurerm_storage_account.backup.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "StorageRead"
  }

  enabled_log {
    category = "StorageWrite"
  }

  enabled_log {
    category = "StorageDelete"
  }

  metric {
    category = "Transaction"
    enabled  = true
  }

  metric {
    category = "Capacity"
    enabled  = true
  }
}

# ============================================================================
# Private Endpoint for Backup Storage (Production)
# ============================================================================

resource "azurerm_private_endpoint" "backup_storage" {
  count               = var.enable_private_endpoint ? 1 : 0
  name                = "${var.prefix}-${var.env}-backup-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.prefix}-${var.env}-backup-psc"
    private_connection_resource_id = azurerm_storage_account.backup.id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }

  tags = var.tags
}

# ============================================================================
# Backup Encryption
# ============================================================================

# Customer-managed key for backup encryption (Production)
resource "azurerm_key_vault_key" "backup_encryption" {
  count        = var.enable_cmk_encryption ? 1 : 0
  name         = "${var.prefix}-${var.env}-backup-key"
  key_vault_id = var.keyvault_id
  key_type     = "RSA"
  key_size     = 4096

  key_opts = [
    "decrypt",
    "encrypt",
    "sign",
    "unwrapKey",
    "verify",
    "wrapKey",
  ]

  tags = var.tags
}

# Grant storage account access to encryption key
resource "azurerm_role_assignment" "backup_storage_key_access" {
  count                = var.enable_cmk_encryption ? 1 : 0
  scope                = azurerm_key_vault_key.backup_encryption[0].key_vault_id
  role_definition_name = "Key Vault Crypto Service Encryption User"
  principal_id         = azurerm_storage_account.backup.identity[0].principal_id
}
