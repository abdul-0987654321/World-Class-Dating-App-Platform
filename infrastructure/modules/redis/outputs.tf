# Redis Outputs

output "redis_id" {
  description = "The ID of the Redis Cache"
  value       = azurerm_redis_cache.main.id
}

output "redis_name" {
  description = "The name of the Redis Cache"
  value       = azurerm_redis_cache.main.name
}

output "redis_hostname" {
  description = "The hostname of the Redis Cache"
  value       = azurerm_redis_cache.main.hostname
}

output "redis_port" {
  description = "The SSL port of the Redis Cache"
  value       = azurerm_redis_cache.main.ssl_port
}

output "redis_primary_key" {
  description = "The primary access key"
  value       = azurerm_redis_cache.main.primary_access_key
  sensitive   = true
}

output "redis_secondary_key" {
  description = "The secondary access key"
  value       = azurerm_redis_cache.main.secondary_access_key
  sensitive   = true
}

output "connection_string" {
  description = "Redis connection string"
  value       = "${azurerm_redis_cache.main.hostname}:${azurerm_redis_cache.main.ssl_port},password=${azurerm_redis_cache.main.primary_access_key},ssl=True,abortConnect=False"
  sensitive   = true
}

output "private_endpoint_id" {
  description = "The ID of the private endpoint (if enabled)"
  value       = var.enable_private_endpoint ? azurerm_private_endpoint.redis[0].id : null
}
