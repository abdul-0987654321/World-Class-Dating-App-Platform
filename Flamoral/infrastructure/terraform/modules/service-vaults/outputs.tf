# =============================================================================
# Service-Specific Key Vaults Module - Outputs
# =============================================================================

output "vault_ids" {
  description = "Map of service names to Key Vault IDs"
  value = {
    for k, v in azurerm_key_vault.service : k => v.id
  }
}

output "vault_uris" {
  description = "Map of service names to Key Vault URIs"
  value = {
    for k, v in azurerm_key_vault.service : k => v.vault_uri
  }
}

output "vault_names" {
  description = "Map of service names to Key Vault names"
  value = {
    for k, v in azurerm_key_vault.service : k => v.name
  }
}

output "auth_vault_uri" {
  description = "Auth service Key Vault URI"
  value       = try(azurerm_key_vault.service["auth"].vault_uri, null)
}

output "payment_vault_uri" {
  description = "Payment service Key Vault URI"
  value       = try(azurerm_key_vault.service["payment"].vault_uri, null)
}

output "data_vault_uri" {
  description = "Data services Key Vault URI"
  value       = try(azurerm_key_vault.service["data"].vault_uri, null)
}

output "external_vault_uri" {
  description = "External services Key Vault URI"
  value       = try(azurerm_key_vault.service["external"].vault_uri, null)
}

output "infra_vault_uri" {
  description = "Infrastructure Key Vault URI"
  value       = try(azurerm_key_vault.service["infra"].vault_uri, null)
}

# For Kubernetes CSI Secret Store Provider
output "csi_secret_provider_config" {
  description = "Configuration for Azure Key Vault CSI Secret Store Provider"
  value = {
    for k, v in azurerm_key_vault.service : k => {
      keyvaultName      = v.name
      tenantId          = data.azurerm_client_config.current.tenant_id
      objects           = local.service_vaults[k].secrets
      usePodIdentity    = "false"
      useVMManagedIdentity = "true"
    }
  }
}

# Secret references for environment variables
output "secret_references" {
  description = "Map of secret names to their Key Vault references for Kubernetes"
  value = {
    for vault_key, vault_config in local.service_vaults : vault_key => {
      for secret in vault_config.secrets : secret => {
        vault_name     = try(azurerm_key_vault.service[vault_key].name, "")
        secret_name    = secret
        vault_uri      = try(azurerm_key_vault.service[vault_key].vault_uri, "")
        reference_uri  = try("${azurerm_key_vault.service[vault_key].vault_uri}secrets/${secret}", "")
      } if contains(keys(azurerm_key_vault.service), vault_key)
    }
  }
}
