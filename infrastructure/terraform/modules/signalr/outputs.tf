# SignalR Outputs

output "signalr_id" {
  description = "The ID of the SignalR service"
  value       = azurerm_signalr_service.main.id
}

output "signalr_name" {
  description = "The name of the SignalR service"
  value       = azurerm_signalr_service.main.name
}

output "signalr_hostname" {
  description = "The hostname of the SignalR service"
  value       = azurerm_signalr_service.main.hostname
}

output "signalr_primary_key" {
  description = "The primary access key"
  value       = azurerm_signalr_service.main.primary_access_key
  sensitive   = true
}

output "signalr_secondary_key" {
  description = "The secondary access key"
  value       = azurerm_signalr_service.main.secondary_access_key
  sensitive   = true
}

output "signalr_primary_connection_string" {
  description = "Primary connection string"
  value       = azurerm_signalr_service.main.primary_connection_string
  sensitive   = true
}

output "signalr_secondary_connection_string" {
  description = "Secondary connection string"
  value       = azurerm_signalr_service.main.secondary_connection_string
  sensitive   = true
}

output "private_endpoint_id" {
  description = "The ID of the private endpoint (if enabled)"
  value       = var.enable_private_endpoint ? azurerm_private_endpoint.signalr[0].id : null
}
