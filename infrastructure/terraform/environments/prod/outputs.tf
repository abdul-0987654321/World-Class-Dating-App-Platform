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

# =============================================================================
# Identity Module Outputs - Azure AD B2C
# =============================================================================

# App Registration Outputs
output "identity_web_app_client_id" {
  description = "Web application client ID for frontend configuration"
  value       = module.identity.web_app_client_id
}

output "identity_backend_api_client_id" {
  description = "Backend API client ID"
  value       = module.identity.backend_api_client_id
}

output "identity_backend_api_identifier_uri" {
  description = "Backend API identifier URI for token validation"
  value       = module.identity.backend_api_identifier_uri
}

output "identity_automation_client_id" {
  description = "Automation app client ID for group-sync operations"
  value       = module.identity.automation_app_client_id
}

# Security Group IDs - for CI/CD pipelines
output "identity_group_ids" {
  description = "Map of security group names to Object IDs (use in CI/CD)"
  value       = module.identity.group_ids
}

output "identity_group_id_free" {
  description = "Object ID of the saas-free security group"
  value       = module.identity.group_id_free
}

output "identity_group_id_standard" {
  description = "Object ID of the saas-standard security group"
  value       = module.identity.group_id_standard
}

output "identity_group_id_premium" {
  description = "Object ID of the saas-premium security group"
  value       = module.identity.group_id_premium
}

output "identity_group_id_verified" {
  description = "Object ID of the saas-verified security group"
  value       = module.identity.group_id_verified
}

output "identity_group_id_moderator" {
  description = "Object ID of the saas-moderator security group"
  value       = module.identity.group_id_moderator
}

output "identity_group_id_operator" {
  description = "Object ID of the saas-operator security group"
  value       = module.identity.group_id_operator
}

output "identity_group_id_admin" {
  description = "Object ID of the saas-admin security group"
  value       = module.identity.group_id_admin
}

output "identity_group_id_banned" {
  description = "Object ID of the banned security group"
  value       = module.identity.group_id_banned
}

# Security Group Names
output "identity_group_names" {
  description = "Map of security group roles to display names"
  value       = module.identity.group_names
}

# App Role IDs
output "identity_role_ids" {
  description = "Application role IDs for authorization"
  value       = module.identity.role_ids
}

# Scope IDs
output "identity_scope_ids" {
  description = "OAuth2 scope IDs"
  value       = module.identity.scope_ids
}

# B2C Configuration
output "identity_b2c_issuer_url" {
  description = "B2C Token Issuer URL for token validation"
  value       = module.identity.b2c_issuer_url
}

output "identity_b2c_jwks_uri" {
  description = "B2C JWKS URI for token signature verification"
  value       = module.identity.b2c_jwks_uri
}

output "identity_b2c_authority" {
  description = "B2C Authority URL for MSAL configuration"
  value       = module.identity.b2c_authority
}

# CI/CD Pipeline Configuration
output "identity_cicd_config" {
  description = "JSON configuration for CI/CD pipelines"
  value       = module.identity.cicd_config
}

# Summary
output "identity_summary" {
  description = "Human-readable summary of identity resources"
  value       = module.identity.identity_summary
}
