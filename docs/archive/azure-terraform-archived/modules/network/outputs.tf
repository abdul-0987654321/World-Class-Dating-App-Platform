# Network Module Outputs

output "vnet_id" {
  description = "Virtual Network ID"
  value       = azurerm_virtual_network.main.id
}

output "vnet_name" {
  description = "Virtual Network name"
  value       = azurerm_virtual_network.main.name
}

output "aks_subnet_id" {
  description = "AKS subnet ID"
  value       = azurerm_subnet.aks.id
}

output "db_subnet_id" {
  description = "Database subnet ID"
  value       = azurerm_subnet.db.id
}

output "redis_subnet_id" {
  description = "Redis subnet ID"
  value       = azurerm_subnet.redis.id
}

output "aks_nsg_id" {
  description = "AKS NSG ID"
  value       = azurerm_network_security_group.aks.id
}

output "db_nsg_id" {
  description = "Database NSG ID"
  value       = azurerm_network_security_group.db.id
}

output "redis_nsg_id" {
  description = "Redis NSG ID"
  value       = azurerm_network_security_group.redis.id
}
