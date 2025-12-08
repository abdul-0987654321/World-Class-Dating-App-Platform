/**
 * DNS Zone Module - Outputs
 */

output "dns_zone_id" {
  description = "The ID of the DNS zone"
  value       = azurerm_dns_zone.main.id
}

output "dns_zone_name" {
  description = "The name of the DNS zone"
  value       = azurerm_dns_zone.main.name
}

output "name_servers" {
  description = "The name servers for the DNS zone (use these to configure at registrar)"
  value       = azurerm_dns_zone.main.name_servers
}

output "dns_zone_resource_group" {
  description = "The resource group containing the DNS zone"
  value       = var.resource_group_name
}
