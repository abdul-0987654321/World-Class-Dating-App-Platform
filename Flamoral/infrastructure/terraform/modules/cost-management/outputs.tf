# Outputs for Cost Management Module

output "budget_ids" {
  description = "Map of budget names to their resource IDs"
  value = {
    overall    = azurerm_consumption_budget_subscription.overall.id
    compute    = azurerm_consumption_budget_resource_group.compute.id
    storage    = azurerm_consumption_budget_resource_group.storage.id
    networking = azurerm_consumption_budget_resource_group.networking.id
    database   = azurerm_consumption_budget_resource_group.database.id
  }
}

output "budget_names" {
  description = "Map of budget names for reference"
  value = {
    overall    = azurerm_consumption_budget_subscription.overall.name
    compute    = azurerm_consumption_budget_resource_group.compute.name
    storage    = azurerm_consumption_budget_resource_group.storage.name
    networking = azurerm_consumption_budget_resource_group.networking.name
    database   = azurerm_consumption_budget_resource_group.database.name
  }
}

output "cost_anomaly_action_group_id" {
  description = "ID of the cost anomaly action group for metric alerts"
  value       = azurerm_monitor_action_group.cost_anomaly.id
}

output "cost_anomaly_action_group_name" {
  description = "Name of the cost anomaly action group"
  value       = azurerm_monitor_action_group.cost_anomaly.name
}

output "cost_export_storage_account_name" {
  description = "Name of the storage account for cost exports (null if disabled)"
  value       = var.enable_cost_export ? azurerm_storage_account.cost_export[0].name : null
}

output "cost_export_storage_account_id" {
  description = "ID of the storage account for cost exports (null if disabled)"
  value       = var.enable_cost_export ? azurerm_storage_account.cost_export[0].id : null
}

output "cost_export_container_name" {
  description = "Name of the container for cost exports (null if disabled)"
  value       = var.enable_cost_export ? azurerm_storage_container.cost_export[0].name : null
}

output "cost_tags" {
  description = "Standard cost allocation tags applied to all resources"
  value = merge(var.tags, {
    CostCenter   = var.cost_center
    BillingOwner = var.billing_owner
    Environment  = var.env
    Service      = "flamoral-platform"
    Team         = var.team
    ManagedBy    = "terraform"
  })
}

output "notification_emails" {
  description = "List of email addresses configured for budget alerts"
  value       = var.notification_emails
  sensitive   = true
}
