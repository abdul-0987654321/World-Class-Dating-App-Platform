# Development Environment - Outputs
# DatingPlatform Infrastructure

# ====================
# Resource Group
# ====================

output "resource_group_id" {
  description = "Resource Group ID"
  value       = module.resource_group.id
}

output "resource_group_name" {
  description = "Resource Group name"
  value       = module.resource_group.name
}

# ====================
# Networking
# ====================

output "vnet_id" {
  description = "Virtual Network ID"
  value       = module.networking.vnet_id
}

output "subnet_ids" {
  description = "Map of subnet names to IDs"
  value       = module.networking.subnet_ids
}

# ====================
# Storage Account
# ====================

output "storage_account_id" {
  description = "Storage Account ID"
  value       = module.storage_account.id
}

output "storage_account_endpoint" {
  description = "Storage Account primary blob endpoint"
  value       = module.storage_account.primary_blob_endpoint
}

output "storage_account_access_key" {
  description = "Storage Account primary access key"
  value       = module.storage_account.primary_access_key
  sensitive   = true
}

# ====================
# Key Vault
# ====================

output "key_vault_id" {
  description = "Key Vault ID"
  value       = module.key_vault.id
}

output "key_vault_uri" {
  description = "Key Vault URI"
  value       = module.key_vault.vault_uri
}

output "key_vault_name" {
  description = "Key Vault name"
  value       = module.key_vault.name
}

# ====================
# Container Registry
# ====================

output "acr_id" {
  description = "Azure Container Registry ID"
  value       = module.container_registry.id
}

output "acr_login_server" {
  description = "Azure Container Registry login server"
  value       = module.container_registry.login_server
}

output "acr_admin_username" {
  description = "Azure Container Registry admin username"
  value       = module.container_registry.admin_username
}

output "acr_admin_password" {
  description = "Azure Container Registry admin password"
  value       = module.container_registry.admin_password
  sensitive   = true
}

# ====================
# App Service
# ====================

output "app_service_id" {
  description = "App Service ID"
  value       = module.app_service.id
}

output "app_service_url" {
  description = "App Service default hostname URL"
  value       = "https://${module.app_service.default_hostname}"
}

output "app_service_identity_principal_id" {
  description = "App Service managed identity principal ID"
  value       = module.app_service.identity_principal_id
}

# ====================
# SQL Database
# ====================

output "sql_server_fqdn" {
  description = "SQL Server fully qualified domain name"
  value       = module.sql_database.server_fqdn
}

output "sql_database_id" {
  description = "SQL Database ID"
  value       = module.sql_database.database_id
}

output "sql_connection_string" {
  description = "SQL Database connection string"
  value       = module.sql_database.connection_string
  sensitive   = true
}

# ====================
# Monitoring
# ====================

output "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID"
  value       = module.monitoring.workspace_id
}

output "app_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = module.monitoring.instrumentation_key
  sensitive   = true
}

output "app_insights_connection_string" {
  description = "Application Insights connection string"
  value       = module.monitoring.app_insights_connection_string
  sensitive   = true
}

# ====================
# Summary
# ====================

output "environment_summary" {
  description = "Summary of deployed environment"
  value = {
    environment         = var.environment
    location            = var.location
    resource_group      = module.resource_group.name
    app_url             = "https://${module.app_service.default_hostname}"
    sql_server          = module.sql_database.server_fqdn
    acr_server          = module.container_registry.login_server
    key_vault           = module.key_vault.vault_uri
  }
}
