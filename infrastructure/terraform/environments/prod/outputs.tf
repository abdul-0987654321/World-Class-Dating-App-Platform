# =============================================================================
# Flamoral Dating Platform - Production Environment Outputs
# =============================================================================

output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.prod.name
}

output "resource_group_id" {
  description = "Resource group ID"
  value       = azurerm_resource_group.prod.id
}

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

output "aks_cluster_name" {
  description = "AKS cluster name"
  value       = azurerm_kubernetes_cluster.main.name
}

output "aks_cluster_id" {
  description = "AKS cluster ID"
  value       = azurerm_kubernetes_cluster.main.id
}

output "aks_cluster_fqdn" {
  description = "AKS cluster FQDN (public)"
  value       = azurerm_kubernetes_cluster.main.fqdn
}

output "aks_kube_config" {
  description = "AKS kubeconfig"
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive   = true
}

output "aks_kubelet_identity" {
  description = "AKS kubelet identity object ID"
  value       = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

output "postgres_server_name" {
  description = "PostgreSQL server name"
  value       = azurerm_postgresql_flexible_server.main.name
}

output "postgres_fqdn" {
  description = "PostgreSQL FQDN"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "redis_hostname" {
  description = "Redis hostname"
  value       = azurerm_redis_cache.main.hostname
}

output "redis_port" {
  description = "Redis SSL port"
  value       = azurerm_redis_cache.main.ssl_port
}

output "storage_account_name" {
  description = "Storage account name"
  value       = azurerm_storage_account.main.name
}

output "storage_primary_endpoint" {
  description = "Storage primary blob endpoint"
  value       = azurerm_storage_account.main.primary_blob_endpoint
}

output "key_vault_name" {
  description = "Key Vault name"
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "Key Vault URI"
  value       = azurerm_key_vault.main.vault_uri
}

output "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID"
  value       = azurerm_log_analytics_workspace.main.id
}

output "app_insights_connection_string" {
  description = "Application Insights connection string"
  value       = azurerm_application_insights.main.connection_string
  sensitive   = true
}

output "signalr_hostname" {
  description = "SignalR hostname"
  value       = azurerm_signalr_service.main.hostname
}

output "signalr_connection_string" {
  description = "SignalR connection string"
  value       = azurerm_signalr_service.main.primary_connection_string
  sensitive   = true
}

# Production-specific outputs
output "dns_zone_name_servers" {
  description = "Azure DNS Zone name servers (configure these in GoDaddy)"
  value       = azurerm_dns_zone.main.name_servers
}

output "dns_zone_name" {
  description = "DNS Zone name"
  value       = azurerm_dns_zone.main.name
}

output "ingress_public_ip" {
  description = "Public IP address for ingress"
  value       = azurerm_public_ip.ingress.ip_address
}

output "ingress_public_fqdn" {
  description = "Public FQDN for ingress"
  value       = azurerm_public_ip.ingress.fqdn
}

output "cdn_endpoint_hostname" {
  description = "CDN endpoint hostname"
  value       = azurerm_cdn_endpoint.media.fqdn
}

output "cdn_endpoint_url" {
  description = "CDN endpoint URL"
  value       = "https://${azurerm_cdn_endpoint.media.fqdn}"
}

output "front_door_endpoint" {
  description = "Azure Front Door endpoint"
  value       = azurerm_cdn_frontdoor_endpoint.main.host_name
}

output "environment" {
  description = "Environment name"
  value       = "production"
}

output "access_level" {
  description = "Access level for this environment"
  value       = "public"
}

output "domain" {
  description = "Domain name"
  value       = var.domain_name
}

# GoDaddy DNS Configuration Instructions
output "godaddy_dns_instructions" {
  description = "Instructions for configuring GoDaddy DNS"
  value       = <<-EOT
    =============================================================================
    GoDaddy DNS Configuration for flamoral.com
    =============================================================================

    Option 1: Point GoDaddy nameservers to Azure DNS (Recommended)
    ---------------------------------------------------------------
    1. Log in to your GoDaddy account
    2. Go to Domain Settings for flamoral.com
    3. Under Nameservers, click "Change"
    4. Select "Enter my own nameservers (advanced)"
    5. Enter the following Azure DNS nameservers:
       ${join("\n       ", azurerm_dns_zone.main.name_servers)}
    6. Save changes

    Option 2: Create records directly in GoDaddy
    ---------------------------------------------
    Create the following A records in GoDaddy:
    - Type: A, Name: @, Value: ${azurerm_public_ip.ingress.ip_address}
    - Type: A, Name: www, Value: ${azurerm_public_ip.ingress.ip_address}
    - Type: A, Name: api, Value: ${azurerm_public_ip.ingress.ip_address}
    - Type: CNAME, Name: cdn, Value: ${azurerm_cdn_endpoint.media.fqdn}

    Note: DNS propagation may take up to 48 hours.
    =============================================================================
  EOT
}
