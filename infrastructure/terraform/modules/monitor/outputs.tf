# Monitoring Outputs

output "log_analytics_workspace_id" {
  description = "The ID of the Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.main.id
}

output "log_analytics_workspace_name" {
  description = "The name of the Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.main.name
}

output "log_analytics_primary_key" {
  description = "Primary shared key for Log Analytics"
  value       = azurerm_log_analytics_workspace.main.primary_shared_key
  sensitive   = true
}

output "log_analytics_workspace_key" {
  description = "Workspace key for Log Analytics"
  value       = azurerm_log_analytics_workspace.main.workspace_id
}

output "appinsights_id" {
  description = "The ID of Application Insights"
  value       = azurerm_application_insights.main.id
}

output "appinsights_name" {
  description = "The name of Application Insights"
  value       = azurerm_application_insights.main.name
}

output "appinsights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}

output "appinsights_connection_string" {
  description = "Application Insights connection string"
  value       = azurerm_application_insights.main.connection_string
  sensitive   = true
}

output "action_group_id" {
  description = "The ID of the action group"
  value       = azurerm_monitor_action_group.main.id
}
