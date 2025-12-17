# Key Vault Outputs

output "keyvault_id" {
  description = "The ID of the Key Vault"
  value       = azurerm_key_vault.main.id
}

output "keyvault_name" {
  description = "The name of the Key Vault"
  value       = azurerm_key_vault.main.name
}

output "keyvault_uri" {
  description = "The URI of the Key Vault"
  value       = azurerm_key_vault.main.vault_uri
}

output "jwt_secret_name" {
  description = "Name of the JWT secret in Key Vault"
  value       = azurerm_key_vault_secret.jwt_secret.name
}

output "jwt_secret_version" {
  description = "Version of the JWT secret"
  value       = azurerm_key_vault_secret.jwt_secret.version
}

output "private_endpoint_id" {
  description = "The ID of the private endpoint (if enabled)"
  value       = var.enable_private_endpoint ? azurerm_private_endpoint.keyvault[0].id : null
}
