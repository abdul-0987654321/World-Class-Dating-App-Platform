# Storage Outputs

output "storage_account_id" {
  description = "The ID of the storage account"
  value       = azurerm_storage_account.main.id
}

output "storage_account_name" {
  description = "The name of the storage account"
  value       = azurerm_storage_account.main.name
}

output "primary_blob_endpoint" {
  description = "Primary blob endpoint"
  value       = azurerm_storage_account.main.primary_blob_endpoint
}

output "primary_blob_host" {
  description = "Primary blob host"
  value       = azurerm_storage_account.main.primary_blob_host
}

output "primary_access_key" {
  description = "Primary access key"
  value       = azurerm_storage_account.main.primary_access_key
  sensitive   = true
}

output "secondary_access_key" {
  description = "Secondary access key"
  value       = azurerm_storage_account.main.secondary_access_key
  sensitive   = true
}

output "primary_connection_string" {
  description = "Primary connection string"
  value       = azurerm_storage_account.main.primary_connection_string
  sensitive   = true
}

output "container_names" {
  description = "List of container names"
  value = {
    photos        = azurerm_storage_container.photos.name
    videos        = azurerm_storage_container.videos.name
    avatars       = azurerm_storage_container.avatars.name
    thumbnails    = azurerm_storage_container.thumbnails.name
    verification  = azurerm_storage_container.verification.name
  }
}

output "cdn_endpoint_hostname" {
  description = "CDN endpoint hostname"
  value       = var.enable_cdn ? azurerm_cdn_endpoint.main[0].host_name : null
}

output "cdn_endpoint_url" {
  description = "CDN endpoint URL"
  value       = var.enable_cdn ? "https://${azurerm_cdn_endpoint.main[0].host_name}" : null
}

output "private_endpoint_id" {
  description = "The ID of the private endpoint (if enabled)"
  value       = var.enable_private_endpoint ? azurerm_private_endpoint.blob[0].id : null
}
