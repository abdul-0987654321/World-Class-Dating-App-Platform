# Infrastructure Outputs

output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "aks_cluster_name" {
  description = "Name of the AKS cluster"
  value       = module.aks.aks_name
}

output "aks_cluster_fqdn" {
  description = "FQDN of the AKS cluster"
  value       = module.aks.aks_fqdn
}

output "postgres_fqdn" {
  description = "PostgreSQL server FQDN"
  value       = module.postgres.postgres_fqdn
  sensitive   = true
}

output "redis_hostname" {
  description = "Redis cache hostname"
  value       = module.redis.redis_hostname
  sensitive   = true
}

output "storage_account_name" {
  description = "Storage account name"
  value       = module.storage.storage_account_name
}

output "cdn_endpoint_url" {
  description = "CDN endpoint URL"
  value       = module.storage.cdn_endpoint_url
}

output "keyvault_uri" {
  description = "Key Vault URI"
  value       = module.keyvault.keyvault_uri
}

output "signalr_hostname" {
  description = "SignalR service hostname"
  value       = module.signalr.signalr_hostname
  sensitive   = true
}

output "cosmosdb_endpoint" {
  description = "CosmosDB endpoint"
  value       = module.cosmosdb.cosmosdb_endpoint
  sensitive   = true
}

output "frontdoor_endpoint" {
  description = "Front Door endpoint URL"
  value       = module.frontdoor.endpoint_url
}

output "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID"
  value       = module.monitor.log_analytics_workspace_id
}

output "application_insights_key" {
  description = "Application Insights instrumentation key"
  value       = module.monitor.appinsights_instrumentation_key
  sensitive   = true
}

# Connection Strings (Sensitive)
output "postgres_connection_string" {
  description = "PostgreSQL connection string"
  value       = module.postgres.connection_string
  sensitive   = true
}

output "redis_connection_string" {
  description = "Redis connection string"
  value       = module.redis.connection_string
  sensitive   = true
}

output "signalr_connection_string" {
  description = "SignalR connection string"
  value       = module.signalr.signalr_primary_connection_string
  sensitive   = true
}

output "cosmosdb_connection_string" {
  description = "CosmosDB connection string"
  value       = module.cosmosdb.cosmosdb_connection_strings
  sensitive   = true
}

output "storage_connection_string" {
  description = "Storage account connection string"
  value       = module.storage.primary_connection_string
  sensitive   = true
}

# DNS Outputs
output "dns_zone_name_servers" {
  description = "DNS zone name servers"
  value       = var.enable_dns_zone ? module.dns[0].name_servers : []
}

output "dns_zone_name" {
  description = "DNS zone name"
  value       = var.enable_dns_zone ? module.dns[0].dns_zone_name : ""
}

output "dns_root_domain" {
  description = "Root domain FQDN"
  value       = var.enable_dns_zone ? module.dns[0].root_domain_fqdn : ""
}

output "dns_www_fqdn" {
  description = "WWW subdomain FQDN"
  value       = var.enable_dns_zone ? module.dns[0].www_fqdn : ""
}

output "dns_api_fqdn" {
  description = "API subdomain FQDN"
  value       = var.enable_dns_zone ? module.dns[0].api_fqdn : ""
}

output "dns_admin_fqdn" {
  description = "Admin subdomain FQDN"
  value       = var.enable_dns_zone ? module.dns[0].admin_fqdn : ""
}
