# Front Door Outputs

output "frontdoor_id" {
  description = "The ID of the Front Door profile"
  value       = azurerm_cdn_frontdoor_profile.main.id
}

output "frontdoor_name" {
  description = "The name of the Front Door profile"
  value       = azurerm_cdn_frontdoor_profile.main.name
}

output "endpoint_hostname" {
  description = "The hostname of the Front Door endpoint"
  value       = azurerm_cdn_frontdoor_endpoint.main.host_name
}

output "endpoint_url" {
  description = "The URL of the Front Door endpoint"
  value       = "https://${azurerm_cdn_frontdoor_endpoint.main.host_name}"
}

output "waf_policy_id" {
  description = "The ID of the WAF policy"
  value       = azurerm_cdn_frontdoor_firewall_policy.main.id
}
