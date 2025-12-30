# =============================================================================
# Flamoral Dating Platform - Dating-dev Environment Outputs
# =============================================================================

# =============================================================================
# Resource Group
# =============================================================================
output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.dating_dev.name
}

output "resource_group_id" {
  description = "ID of the resource group"
  value       = azurerm_resource_group.dating_dev.id
}

output "resource_group_location" {
  description = "Location of the resource group"
  value       = azurerm_resource_group.dating_dev.location
}

# =============================================================================
# Network
# =============================================================================
output "vnet_id" {
  description = "Virtual Network ID"
  value       = azurerm_virtual_network.main.id
}

output "vnet_name" {
  description = "Virtual Network name"
  value       = azurerm_virtual_network.main.name
}

output "aks_subnet_id" {
  description = "AKS Subnet ID"
  value       = azurerm_subnet.aks.id
}

output "database_subnet_id" {
  description = "Database Subnet ID"
  value       = azurerm_subnet.database.id
}

# =============================================================================
# AKS
# =============================================================================
output "aks_cluster_name" {
  description = "AKS cluster name"
  value       = azurerm_kubernetes_cluster.main.name
}

output "aks_cluster_id" {
  description = "AKS cluster ID"
  value       = azurerm_kubernetes_cluster.main.id
}

output "aks_fqdn" {
  description = "AKS cluster FQDN"
  value       = azurerm_kubernetes_cluster.main.fqdn
}

output "aks_kube_config" {
  description = "AKS kubeconfig (sensitive)"
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive   = true
}

output "aks_kubelet_identity" {
  description = "AKS kubelet identity object ID"
  value       = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

# =============================================================================
# Container Registry
# =============================================================================
output "acr_name" {
  description = "Azure Container Registry name"
  value       = azurerm_container_registry.main.name
}

output "acr_login_server" {
  description = "ACR login server URL"
  value       = azurerm_container_registry.main.login_server
}

output "acr_admin_username" {
  description = "ACR admin username"
  value       = azurerm_container_registry.main.admin_username
  sensitive   = true
}

output "acr_admin_password" {
  description = "ACR admin password"
  value       = azurerm_container_registry.main.admin_password
  sensitive   = true
}

# =============================================================================
# PostgreSQL
# =============================================================================
output "postgres_server_name" {
  description = "PostgreSQL server name"
  value       = azurerm_postgresql_flexible_server.main.name
}

output "postgres_fqdn" {
  description = "PostgreSQL server FQDN"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "postgres_admin_login" {
  description = "PostgreSQL admin login"
  value       = azurerm_postgresql_flexible_server.main.administrator_login
}

output "postgres_connection_string" {
  description = "PostgreSQL connection string"
  value       = "postgresql://${azurerm_postgresql_flexible_server.main.administrator_login}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/flamoral?sslmode=require"
  sensitive   = true
}

# =============================================================================
# Redis
# =============================================================================
output "redis_hostname" {
  description = "Redis cache hostname"
  value       = azurerm_redis_cache.main.hostname
}

output "redis_port" {
  description = "Redis cache SSL port"
  value       = azurerm_redis_cache.main.ssl_port
}

output "redis_connection_string" {
  description = "Redis connection string"
  value       = azurerm_redis_cache.main.primary_connection_string
  sensitive   = true
}

# =============================================================================
# Storage
# =============================================================================
output "storage_account_name" {
  description = "Storage account name"
  value       = azurerm_storage_account.main.name
}

output "storage_account_primary_endpoint" {
  description = "Storage account primary blob endpoint"
  value       = azurerm_storage_account.main.primary_blob_endpoint
}

output "storage_account_connection_string" {
  description = "Storage account connection string"
  value       = azurerm_storage_account.main.primary_connection_string
  sensitive   = true
}

# =============================================================================
# Key Vault
# =============================================================================
output "key_vault_name" {
  description = "Key Vault name"
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "Key Vault URI"
  value       = azurerm_key_vault.main.vault_uri
}

# =============================================================================
# Monitoring
# =============================================================================
output "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID"
  value       = azurerm_log_analytics_workspace.main.id
}

output "app_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}

output "app_insights_connection_string" {
  description = "Application Insights connection string"
  value       = azurerm_application_insights.main.connection_string
  sensitive   = true
}

# =============================================================================
# SignalR
# =============================================================================
output "signalr_hostname" {
  description = "SignalR service hostname"
  value       = azurerm_signalr_service.main.hostname
}

output "signalr_connection_string" {
  description = "SignalR connection string"
  value       = azurerm_signalr_service.main.primary_connection_string
  sensitive   = true
}

# =============================================================================
# CDN
# =============================================================================
output "cdn_endpoint_hostname" {
  description = "CDN endpoint hostname"
  value       = azurerm_cdn_endpoint.media.fqdn
}

output "cdn_endpoint_url" {
  description = "CDN endpoint URL"
  value       = "https://${azurerm_cdn_endpoint.media.fqdn}"
}

# =============================================================================
# Service Principal Info
# =============================================================================
output "terraform_sp_client_id" {
  description = "Terraform Service Principal Client ID"
  value       = var.terraform_sp_client_id
}

output "terraform_sp_name" {
  description = "Terraform Service Principal Name"
  value       = var.terraform_sp_name
}
