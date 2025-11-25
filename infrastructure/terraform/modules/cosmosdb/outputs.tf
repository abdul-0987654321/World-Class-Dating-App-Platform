# CosmosDB Outputs

output "cosmosdb_id" {
  description = "The ID of the CosmosDB account"
  value       = azurerm_cosmosdb_account.main.id
}

output "cosmosdb_name" {
  description = "The name of the CosmosDB account"
  value       = azurerm_cosmosdb_account.main.name
}

output "cosmosdb_endpoint" {
  description = "The endpoint of the CosmosDB account"
  value       = azurerm_cosmosdb_account.main.endpoint
}

output "cosmosdb_primary_key" {
  description = "The primary key"
  value       = azurerm_cosmosdb_account.main.primary_key
  sensitive   = true
}

output "cosmosdb_secondary_key" {
  description = "The secondary key"
  value       = azurerm_cosmosdb_account.main.secondary_key
  sensitive   = true
}

output "cosmosdb_connection_strings" {
  description = "Connection strings"
  value       = azurerm_cosmosdb_account.main.connection_strings
  sensitive   = true
}

output "database_name" {
  description = "The name of the SQL database"
  value       = azurerm_cosmosdb_sql_database.activities.name
}

output "container_names" {
  description = "Container names"
  value = {
    user_events = azurerm_cosmosdb_sql_container.user_events.name
    matches     = azurerm_cosmosdb_sql_container.matches.name
    feed        = azurerm_cosmosdb_sql_container.feed.name
  }
}

output "private_endpoint_id" {
  description = "The ID of the private endpoint (if enabled)"
  value       = var.enable_private_endpoint ? azurerm_private_endpoint.cosmos[0].id : null
}
