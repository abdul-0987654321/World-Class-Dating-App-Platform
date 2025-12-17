# Azure Cost Management Module
# Implements budgets, alerts, cost exports, and tagging policies

terraform {
  required_version = ">= 1.4"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

# Data source to get subscription
data "azurerm_subscription" "current" {}

# Data source to get resource group
data "azurerm_resource_group" "main" {
  name = var.resource_group_name
}

locals {
  # Cost allocation tags
  cost_tags = merge(var.tags, {
    CostCenter   = var.cost_center
    BillingOwner = var.billing_owner
    Environment  = var.env
    Service      = "flamoral-platform"
    Team         = var.team
    ManagedBy    = "terraform"
  })

  # Budget notification email list
  notification_emails = var.notification_emails

  # Common alert thresholds
  alert_thresholds = {
    warning  = 50
    alert    = 75
    critical = 90
    exceeded = 100
  }
}

# ========================================
# CONSUMPTION BUDGETS
# ========================================

# Overall subscription budget
resource "azurerm_consumption_budget_subscription" "overall" {
  name            = "${var.prefix}-overall-budget-${var.env}"
  subscription_id = data.azurerm_subscription.current.id

  amount     = var.overall_monthly_budget
  time_grain = "Monthly"

  time_period {
    start_date = formatdate("YYYY-MM-01'T'00:00:00Z", timestamp())
    end_date   = timeadd(formatdate("YYYY-MM-01'T'00:00:00Z", timestamp()), "8760h") # 1 year
  }

  # Alert at 50%, 75%, 90%, 100%
  notification {
    enabled        = true
    threshold      = local.alert_thresholds.warning
    operator       = "EqualTo"
    threshold_type = "Actual"

    contact_emails = local.notification_emails
  }

  notification {
    enabled        = true
    threshold      = local.alert_thresholds.alert
    operator       = "EqualTo"
    threshold_type = "Actual"

    contact_emails = local.notification_emails
  }

  notification {
    enabled        = true
    threshold      = local.alert_thresholds.critical
    operator       = "EqualTo"
    threshold_type = "Actual"

    contact_emails = local.notification_emails
  }

  notification {
    enabled        = true
    threshold      = local.alert_thresholds.exceeded
    operator       = "EqualTo"
    threshold_type = "Actual"

    contact_emails = local.notification_emails
  }

  # Forecasted spending alert at 100%
  notification {
    enabled        = true
    threshold      = 100
    operator       = "GreaterThan"
    threshold_type = "Forecasted"

    contact_emails = local.notification_emails
  }
}

# Compute (AKS) budget
resource "azurerm_consumption_budget_resource_group" "compute" {
  name              = "${var.prefix}-compute-budget-${var.env}"
  resource_group_id = data.azurerm_resource_group.main.id

  amount     = var.compute_monthly_budget
  time_grain = "Monthly"

  time_period {
    start_date = formatdate("YYYY-MM-01'T'00:00:00Z", timestamp())
    end_date   = timeadd(formatdate("YYYY-MM-01'T'00:00:00Z", timestamp()), "8760h")
  }

  filter {
    dimension {
      name = "ResourceType"
      values = [
        "microsoft.containerservice/managedclusters",
        "microsoft.compute/virtualmachines",
        "microsoft.compute/virtualmachinescalesets"
      ]
    }
  }

  notification {
    enabled        = true
    threshold      = 50
    operator       = "EqualTo"
    threshold_type = "Actual"
    contact_emails = local.notification_emails
  }

  notification {
    enabled        = true
    threshold      = 75
    operator       = "EqualTo"
    threshold_type = "Actual"
    contact_emails = local.notification_emails
  }

  notification {
    enabled        = true
    threshold      = 90
    operator       = "EqualTo"
    threshold_type = "Actual"
    contact_emails = local.notification_emails
  }

  notification {
    enabled        = true
    threshold      = 100
    operator       = "EqualTo"
    threshold_type = "Actual"
    contact_emails = local.notification_emails
  }
}

# Storage budget
resource "azurerm_consumption_budget_resource_group" "storage" {
  name              = "${var.prefix}-storage-budget-${var.env}"
  resource_group_id = data.azurerm_resource_group.main.id

  amount     = var.storage_monthly_budget
  time_grain = "Monthly"

  time_period {
    start_date = formatdate("YYYY-MM-01'T'00:00:00Z", timestamp())
    end_date   = timeadd(formatdate("YYYY-MM-01'T'00:00:00Z", timestamp()), "8760h")
  }

  filter {
    dimension {
      name = "ResourceType"
      values = [
        "microsoft.storage/storageaccounts",
        "microsoft.documentdb/databaseaccounts"
      ]
    }
  }

  notification {
    enabled        = true
    threshold      = 50
    operator       = "EqualTo"
    threshold_type = "Actual"
    contact_emails = local.notification_emails
  }

  notification {
    enabled        = true
    threshold      = 75
    operator       = "EqualTo"
    threshold_type = "Actual"
    contact_emails = local.notification_emails
  }

  notification {
    enabled        = true
    threshold      = 90
    operator       = "EqualTo"
    threshold_type = "Actual"
    contact_emails = local.notification_emails
  }

  notification {
    enabled        = true
    threshold      = 100
    operator       = "EqualTo"
    threshold_type = "Actual"
    contact_emails = local.notification_emails
  }
}

# Networking budget (Front Door, bandwidth, etc.)
resource "azurerm_consumption_budget_resource_group" "networking" {
  name              = "${var.prefix}-networking-budget-${var.env}"
  resource_group_id = data.azurerm_resource_group.main.id

  amount     = var.networking_monthly_budget
  time_grain = "Monthly"

  time_period {
    start_date = formatdate("YYYY-MM-01'T'00:00:00Z", timestamp())
    end_date   = timeadd(formatdate("YYYY-MM-01'T'00:00:00Z", timestamp()), "8760h")
  }

  filter {
    dimension {
      name = "ResourceType"
      values = [
        "microsoft.network/frontdoors",
        "microsoft.cdn/profiles",
        "microsoft.network/publicipaddresses",
        "microsoft.network/virtualnetworks",
        "microsoft.network/loadbalancers"
      ]
    }
  }

  notification {
    enabled        = true
    threshold      = 50
    operator       = "EqualTo"
    threshold_type = "Actual"
    contact_emails = local.notification_emails
  }

  notification {
    enabled        = true
    threshold      = 75
    operator       = "EqualTo"
    threshold_type = "Actual"
    contact_emails = local.notification_emails
  }

  notification {
    enabled        = true
    threshold      = 90
    operator       = "EqualTo"
    threshold_type = "Actual"
    contact_emails = local.notification_emails
  }

  notification {
    enabled        = true
    threshold      = 100
    operator       = "EqualTo"
    threshold_type = "Actual"
    contact_emails = local.notification_emails
  }
}

# Database budget
resource "azurerm_consumption_budget_resource_group" "database" {
  name              = "${var.prefix}-database-budget-${var.env}"
  resource_group_id = data.azurerm_resource_group.main.id

  amount     = var.database_monthly_budget
  time_grain = "Monthly"

  time_period {
    start_date = formatdate("YYYY-MM-01'T'00:00:00Z", timestamp())
    end_date   = timeadd(formatdate("YYYY-MM-01'T'00:00:00Z", timestamp()), "8760h")
  }

  filter {
    dimension {
      name = "ResourceType"
      values = [
        "microsoft.dbforpostgresql/flexibleservers",
        "microsoft.dbforpostgresql/servers",
        "microsoft.cache/redis",
        "microsoft.signalrservice/signalr"
      ]
    }
  }

  notification {
    enabled        = true
    threshold      = 50
    operator       = "EqualTo"
    threshold_type = "Actual"
    contact_emails = local.notification_emails
  }

  notification {
    enabled        = true
    threshold      = 75
    operator       = "EqualTo"
    threshold_type = "Actual"
    contact_emails = local.notification_emails
  }

  notification {
    enabled        = true
    threshold      = 90
    operator       = "EqualTo"
    threshold_type = "Actual"
    contact_emails = local.notification_emails
  }

  notification {
    enabled        = true
    threshold      = 100
    operator       = "EqualTo"
    threshold_type = "Actual"
    contact_emails = local.notification_emails
  }
}

# ========================================
# COST ANOMALY ALERTS (using Azure Monitor)
# ========================================

# Action group for cost anomaly notifications
resource "azurerm_monitor_action_group" "cost_anomaly" {
  name                = "${var.prefix}-cost-anomaly-${var.env}"
  resource_group_name = var.resource_group_name
  short_name          = "cost-alert"

  dynamic "email_receiver" {
    for_each = local.notification_emails
    content {
      name          = "notify-${replace(email_receiver.value, "@", "-at-")}"
      email_address = email_receiver.value
    }
  }

  tags = local.cost_tags
}

# Metric alert for unusual spending (this would need Azure Cost Management Connector)
# Note: Azure doesn't provide native anomaly detection via Terraform
# This is a placeholder for custom implementation via Azure Functions or Logic Apps

# ========================================
# COST EXPORT CONFIGURATION
# ========================================

# Storage account for cost exports
resource "azurerm_storage_account" "cost_export" {
  count = var.enable_cost_export ? 1 : 0

  name                     = "${var.prefix}costexp${var.env}"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  # Enable blob versioning for audit trail
  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 90
    }
  }

  tags = local.cost_tags
}

# Container for cost export data
resource "azurerm_storage_container" "cost_export" {
  count = var.enable_cost_export ? 1 : 0

  name                  = "cost-exports"
  storage_account_name  = azurerm_storage_account.cost_export[0].name
  container_access_type = "private"
}

# Note: Azure Cost Export must be configured via Azure Portal or Azure CLI
# Terraform doesn't currently support azurerm_cost_management_export for subscription-level exports
# See scripts/setup-cost-export.sh for automation

# ========================================
# TAGGING POLICY (Resource Tags)
# ========================================

# Resource group tags that should be inherited by all resources
resource "azurerm_resource_group_policy_assignment" "require_tags" {
  count = var.enforce_tagging_policy ? 1 : 0

  name                 = "${var.prefix}-require-tags-${var.env}"
  resource_group_id    = data.azurerm_resource_group.main.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/96670d01-0a4d-4649-9c89-2d3abc0a5025"

  parameters = jsonencode({
    tagNames = {
      value = [
        "Environment",
        "Service",
        "Team",
        "CostCenter"
      ]
    }
  })
}

# ========================================
# COST OPTIMIZATION ALERTS
# ========================================

# Alert for idle resources (requires Azure Advisor)
# Azure Advisor recommendations are automatically generated
# See scripts/check-cost-recommendations.sh for automation

# Reserved instances analysis
# This requires manual review or custom scripts
# See COST_MANAGEMENT_GUIDE.md for RI calculator

# ========================================
# OUTPUTS
# ========================================

# Budget IDs for reference
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

# Action group ID
output "cost_anomaly_action_group_id" {
  description = "ID of the cost anomaly action group"
  value       = azurerm_monitor_action_group.cost_anomaly.id
}

# Cost export storage account (if enabled)
output "cost_export_storage_account_name" {
  description = "Name of the storage account for cost exports"
  value       = var.enable_cost_export ? azurerm_storage_account.cost_export[0].name : null
}

output "cost_export_container_name" {
  description = "Name of the container for cost exports"
  value       = var.enable_cost_export ? azurerm_storage_container.cost_export[0].name : null
}

# Cost allocation tags
output "cost_tags" {
  description = "Standard cost allocation tags"
  value       = local.cost_tags
}
