output "resource_group_name" {
  description = "Resource group name"
  value       = module.vnet.resource_group_name
}

output "aks_cluster_name" {
  description = "AKS cluster name"
  value       = module.aks.cluster_name
}

output "aks_cluster_fqdn" {
  description = "AKS cluster FQDN"
  value       = module.aks.cluster_fqdn
}

output "postgres_fqdn" {
  description = "PostgreSQL server FQDN"
  value       = azurerm_postgresql_flexible_server.main.fqdn
  sensitive   = true
}

output "redis_hostname" {
  description = "Redis hostname"
  value       = azurerm_redis_cache.main.hostname
  sensitive   = true
}

output "redis_primary_key" {
  description = "Redis primary key"
  value       = azurerm_redis_cache.main.primary_access_key
  sensitive   = true
}

output "storage_account_name" {
  description = "Media storage account name"
  value       = azurerm_storage_account.media.name
}

output "cdn_endpoint_hostname" {
  description = "CDN endpoint hostname"
  value       = azurerm_cdn_endpoint.media.host_name
}

output "key_vault_uri" {
  description = "Key Vault URI"
  value       = azurerm_key_vault.main.vault_uri
}

output "container_registry_login_server" {
  description = "Container registry login server"
  value       = azurerm_container_registry.main.login_server
}

output "application_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}
