# =============================================================================
# DNS Module Integration
# =============================================================================
# Add this to your main.tf to enable DNS management
# =============================================================================

# DNS Module
module "dns" {
  source = "./modules/dns"

  resource_group_name = azurerm_resource_group.main.name
  domain_name         = var.domain_name
  target_ip           = var.dns_target_ip
  ttl                 = var.dns_ttl
  verification_txt    = var.dns_verification_txt

  tags = merge(var.tags, {
    ManagedBy = "terraform"
    Purpose   = "DNS Management"
  })

  depends_on = [azurerm_resource_group.main]
}

# Output DNS information
output "dns_zone_id" {
  description = "ID of the DNS zone"
  value       = module.dns.dns_zone_id
}

output "dns_zone_name" {
  description = "Name of the DNS zone"
  value       = module.dns.dns_zone_name
}

output "name_servers" {
  description = "Azure DNS name servers - update these at your domain registrar"
  value       = module.dns.name_servers
}

output "dns_records" {
  description = "DNS records configuration"
  value = {
    root  = module.dns.root_domain_fqdn
    www   = module.dns.www_fqdn
    api   = module.dns.api_fqdn
    admin = module.dns.admin_fqdn
  }
}

output "dns_target_ip" {
  description = "Target IP address for all DNS records"
  value       = module.dns.target_ip
}
