package terraform.security

import future.keywords.in
import future.keywords.every

# Deny public access to storage accounts
deny[msg] {
    resource := input.resource.azurerm_storage_account[name]
    resource.allow_blob_public_access == true
    msg := sprintf("Storage account '%s' allows public blob access", [name])
}

# Deny unencrypted storage
deny[msg] {
    resource := input.resource.azurerm_storage_account[name]
    not resource.enable_https_traffic_only
    msg := sprintf("Storage account '%s' does not enforce HTTPS", [name])
}

# Require Key Vault soft delete
deny[msg] {
    resource := input.resource.azurerm_key_vault[name]
    not resource.soft_delete_retention_days
    msg := sprintf("Key Vault '%s' does not have soft delete enabled", [name])
}

# Deny public AKS API server
deny[msg] {
    resource := input.resource.azurerm_kubernetes_cluster[name]
    resource.api_server_access_profile[_].authorized_ip_ranges == null
    msg := sprintf("AKS cluster '%s' API server is publicly accessible", [name])
}

# Require AKS network policy
deny[msg] {
    resource := input.resource.azurerm_kubernetes_cluster[name]
    not resource.network_profile[_].network_policy
    msg := sprintf("AKS cluster '%s' does not have network policy enabled", [name])
}

# Require RBAC on AKS
deny[msg] {
    resource := input.resource.azurerm_kubernetes_cluster[name]
    not resource.role_based_access_control_enabled
    msg := sprintf("AKS cluster '%s' does not have RBAC enabled", [name])
}

# Deny PostgreSQL with public access
deny[msg] {
    resource := input.resource.azurerm_postgresql_flexible_server[name]
    resource.public_network_access_enabled == true
    msg := sprintf("PostgreSQL server '%s' has public network access enabled", [name])
}

# Require PostgreSQL SSL
deny[msg] {
    resource := input.resource.azurerm_postgresql_flexible_server[name]
    not resource.ssl_enforcement_enabled
    msg := sprintf("PostgreSQL server '%s' does not enforce SSL", [name])
}

# Require minimum TLS version
deny[msg] {
    resource := input.resource.azurerm_postgresql_flexible_server[name]
    resource.ssl_minimal_tls_version_enforced != "TLS1_2"
    msg := sprintf("PostgreSQL server '%s' does not enforce TLS 1.2 minimum", [name])
}

# Deny unencrypted Redis
deny[msg] {
    resource := input.resource.azurerm_redis_cache[name]
    not resource.enable_non_ssl_port == false
    msg := sprintf("Redis cache '%s' has non-SSL port enabled", [name])
}

# Require Front Door WAF
deny[msg] {
    resource := input.resource.azurerm_frontdoor[name]
    not resource.frontend_endpoint[_].web_application_firewall_policy_link_id
    msg := sprintf("Front Door '%s' does not have WAF policy attached", [name])
}

# Require NSG on subnets
deny[msg] {
    resource := input.resource.azurerm_subnet[name]
    not resource.network_security_group_id
    name != "AzureBastionSubnet"
    name != "GatewaySubnet"
    msg := sprintf("Subnet '%s' does not have NSG attached", [name])
}

# Deny overly permissive NSG rules
deny[msg] {
    resource := input.resource.azurerm_network_security_rule[name]
    resource.access == "Allow"
    resource.direction == "Inbound"
    resource.source_address_prefix == "*"
    resource.destination_port_range == "*"
    msg := sprintf("NSG rule '%s' is overly permissive (allows all inbound)", [name])
}

# Require diagnostics on Key Vault
warn[msg] {
    resource := input.resource.azurerm_key_vault[name]
    not has_diagnostic_setting(name)
    msg := sprintf("Key Vault '%s' does not have diagnostic settings", [name])
}

# Helper function
has_diagnostic_setting(resource_name) {
    input.resource.azurerm_monitor_diagnostic_setting[_].target_resource_id == resource_name
}
