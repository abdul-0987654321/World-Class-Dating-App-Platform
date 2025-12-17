# =============================================================================
# DNS Module Outputs
# =============================================================================

output "dns_zone_id" {
  description = "ID of the DNS zone"
  value       = azurerm_dns_zone.main.id
}

output "dns_zone_name" {
  description = "Name of the DNS zone"
  value       = azurerm_dns_zone.main.name
}

output "name_servers" {
  description = "List of Azure DNS name servers for the zone"
  value       = azurerm_dns_zone.main.name_servers
}

output "root_domain_fqdn" {
  description = "FQDN of the root domain A record"
  value       = azurerm_dns_a_record.root.fqdn
}

output "www_fqdn" {
  description = "FQDN of the www subdomain CNAME record"
  value       = azurerm_dns_cname_record.www.fqdn
}

output "api_fqdn" {
  description = "FQDN of the api subdomain CNAME record"
  value       = azurerm_dns_cname_record.api.fqdn
}

output "admin_fqdn" {
  description = "FQDN of the admin subdomain CNAME record"
  value       = azurerm_dns_cname_record.admin.fqdn
}

output "target_ip" {
  description = "Target IP address for all A records"
  value       = var.target_ip
}
