# =============================================================================
# Flamoral Dating Platform - Shared ACR Module Outputs
# =============================================================================

output "acr_id" {
  description = "ACR resource ID"
  value       = azurerm_container_registry.main.id
}

output "acr_name" {
  description = "ACR name"
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

output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.shared.name
}

output "resource_group_id" {
  description = "Resource group ID"
  value       = azurerm_resource_group.shared.id
}
