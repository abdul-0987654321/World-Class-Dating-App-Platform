# Backup Module Outputs

output "backup_storage_account_name" {
  description = "Backup storage account name"
  value       = azurerm_storage_account.backup.name
}

output "backup_storage_account_id" {
  description = "Backup storage account ID"
  value       = azurerm_storage_account.backup.id
}

output "backup_storage_primary_endpoint" {
  description = "Primary blob endpoint for backups"
  value       = azurerm_storage_account.backup.primary_blob_endpoint
}

output "backup_storage_connection_string" {
  description = "Backup storage connection string"
  value       = azurerm_storage_account.backup.primary_connection_string
  sensitive   = true
}

output "secondary_backup_storage_name" {
  description = "Secondary region backup storage account name"
  value       = var.enable_cross_region_replication ? azurerm_storage_account.backup_secondary[0].name : null
}

output "recovery_vault_id" {
  description = "Recovery Services Vault ID"
  value       = azurerm_recovery_services_vault.main.id
}

output "backup_identity_id" {
  description = "User-assigned identity ID for backup automation"
  value       = azurerm_user_assigned_identity.backup_automation.id
}

output "backup_identity_principal_id" {
  description = "Principal ID of backup automation identity"
  value       = azurerm_user_assigned_identity.backup_automation.principal_id
}

output "backup_identity_client_id" {
  description = "Client ID of backup automation identity"
  value       = azurerm_user_assigned_identity.backup_automation.client_id
}

output "automation_account_id" {
  description = "Automation account ID for backup schedules"
  value       = azurerm_automation_account.backup.id
}

output "postgres_backup_container" {
  description = "PostgreSQL backup container name"
  value       = azurerm_storage_container.postgres_backups.name
}

output "cosmos_backup_container" {
  description = "Cosmos DB backup container name"
  value       = azurerm_storage_container.cosmos_backups.name
}

output "k8s_backup_container" {
  description = "Kubernetes backup container name"
  value       = azurerm_storage_container.k8s_backups.name
}

output "alert_action_group_id" {
  description = "Action group ID for backup alerts"
  value       = azurerm_monitor_action_group.backup_alerts.id
}
