# Azure Monitoring Module

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.prefix}-${var.env}-logs"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = var.log_analytics_sku
  retention_in_days   = var.log_retention_days

  daily_quota_gb = var.daily_quota_gb

  tags = var.tags
}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = "${var.prefix}-${var.env}-appinsights"
  location            = var.location
  resource_group_name = var.resource_group_name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"

  retention_in_days         = var.appinsights_retention_days
  daily_data_cap_in_gb      = var.appinsights_daily_cap_gb
  daily_data_cap_notifications_disabled = false
  sampling_percentage       = var.env == "prod" ? 100 : 50

  tags = var.tags
}

# Alert Action Group
resource "azurerm_monitor_action_group" "main" {
  name                = "${var.prefix}-${var.env}-action-group"
  resource_group_name = var.resource_group_name
  short_name          = "${var.env}-alerts"

  dynamic "email_receiver" {
    for_each = var.alert_email_receivers
    content {
      name                    = email_receiver.value.name
      email_address           = email_receiver.value.email
      use_common_alert_schema = true
    }
  }

  dynamic "webhook_receiver" {
    for_each = var.alert_webhook_receivers
    content {
      name                    = webhook_receiver.value.name
      service_uri             = webhook_receiver.value.uri
      use_common_alert_schema = true
    }
  }

  tags = var.tags
}

# Metric Alert - High CPU
resource "azurerm_monitor_metric_alert" "high_cpu" {
  count               = var.enable_alerts && length(var.alert_resource_scopes) > 0 ? 1 : 0
  name                = "${var.prefix}-${var.env}-high-cpu-alert"
  resource_group_name = var.resource_group_name
  scopes              = var.alert_resource_scopes
  description         = "Alert when CPU usage is too high"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.ContainerService/managedClusters"
    metric_name      = "node_cpu_usage_percentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 85
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }

  tags = var.tags
}

# Metric Alert - High Memory
resource "azurerm_monitor_metric_alert" "high_memory" {
  count               = var.enable_alerts && length(var.alert_resource_scopes) > 0 ? 1 : 0
  name                = "${var.prefix}-${var.env}-high-memory-alert"
  resource_group_name = var.resource_group_name
  scopes              = var.alert_resource_scopes
  description         = "Alert when memory usage is too high"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.ContainerService/managedClusters"
    metric_name      = "node_memory_working_set_percentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 85
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }

  tags = var.tags
}

# Query Alert - High Error Rate
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "high_error_rate" {
  count               = var.enable_alerts ? 1 : 0
  name                = "${var.prefix}-${var.env}-high-error-rate"
  resource_group_name = var.resource_group_name
  location            = var.location

  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  scopes               = [azurerm_application_insights.main.id]
  severity             = 1
  description          = "Alert when error rate exceeds threshold"

  criteria {
    query                   = <<-QUERY
      requests
      | where timestamp > ago(15m)
      | summarize
          total = count(),
          errors = countif(success == false)
      | extend error_rate = (errors * 100.0) / total
      | where error_rate > 5
    QUERY
    time_aggregation_method = "Count"
    threshold               = 1
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }

  tags = var.tags
}

# Query Alert - Slow Response Time
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "slow_response" {
  count               = var.enable_alerts ? 1 : 0
  name                = "${var.prefix}-${var.env}-slow-response"
  resource_group_name = var.resource_group_name
  location            = var.location

  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  scopes               = [azurerm_application_insights.main.id]
  severity             = 2
  description          = "Alert when response time is too slow"

  criteria {
    query                   = <<-QUERY
      requests
      | where timestamp > ago(15m)
      | summarize avg_duration = avg(duration)
      | where avg_duration > 2000
    QUERY
    time_aggregation_method = "Count"
    threshold               = 1
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 2
      number_of_evaluation_periods             = 2
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }

  tags = var.tags
}

# Random UUID for workbook name (Azure requires UUID format)
resource "random_uuid" "workbook_id" {}

# Workbook for Monitoring Dashboard
resource "azurerm_application_insights_workbook" "main" {
  name                = random_uuid.workbook_id.result
  resource_group_name = var.resource_group_name
  location            = var.location
  display_name        = "${var.prefix} ${var.env} Monitoring Dashboard"
  source_id           = azurerm_application_insights.main.id

  data_json = jsonencode({
    version = "Notebook/1.0"
    items = [
      {
        type = 1
        content = {
          json = "## Dating App Performance Dashboard"
        }
      },
      {
        type = 3
        content = {
          version = "KqlItem/1.0"
          query = "requests | summarize count() by bin(timestamp, 5m), resultCode | render timechart"
          size = 0
        }
      }
    ]
  })

  tags = var.tags
}
