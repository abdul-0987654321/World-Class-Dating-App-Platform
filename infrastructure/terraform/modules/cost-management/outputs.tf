################################################################################
# Cost Management Module Outputs
################################################################################

# ============================================================================
# Anomaly Monitor Outputs
# ============================================================================

output "anomaly_monitor_arn" {
  description = "ARN of the main service anomaly detection monitor"
  value       = aws_ce_anomaly_monitor.service_monitor.arn
}

output "anomaly_monitor_id" {
  description = "ID of the main service anomaly detection monitor"
  value       = aws_ce_anomaly_monitor.service_monitor.id
}

output "custom_service_monitor_arns" {
  description = "Map of custom service monitor ARNs"
  value       = { for k, v in aws_ce_anomaly_monitor.custom_service_monitors : k => v.arn }
}

output "linked_account_monitor_arn" {
  description = "ARN of the linked account anomaly detection monitor (if enabled)"
  value       = var.enable_linked_account_monitor ? aws_ce_anomaly_monitor.linked_account_monitor[0].arn : null
}

# ============================================================================
# Subscription Outputs
# ============================================================================

output "subscription_arn" {
  description = "ARN of the cost anomaly subscription"
  value       = aws_ce_anomaly_subscription.main.arn
}

output "subscription_id" {
  description = "ID of the cost anomaly subscription"
  value       = aws_ce_anomaly_subscription.main.id
}

output "absolute_threshold_subscription_arn" {
  description = "ARN of the absolute threshold anomaly subscription (if enabled)"
  value       = var.anomaly_absolute_threshold > 0 ? aws_ce_anomaly_subscription.absolute_threshold[0].arn : null
}

# ============================================================================
# SNS Topic Outputs
# ============================================================================

output "sns_topic_arn" {
  description = "ARN of the SNS topic for cost anomaly alerts"
  value       = aws_sns_topic.cost_anomaly_alerts.arn
}

output "sns_topic_name" {
  description = "Name of the SNS topic for cost anomaly alerts"
  value       = aws_sns_topic.cost_anomaly_alerts.name
}

# ============================================================================
# Cost Allocation Tag Outputs
# ============================================================================

output "cost_allocation_tags" {
  description = "List of activated cost allocation tag keys"
  value = concat(
    ["Environment", "Project", "Service", "Team", "CostCenter"],
    var.custom_cost_allocation_tags
  )
}

# ============================================================================
# Dashboard Outputs
# ============================================================================

output "cost_dashboard_arn" {
  description = "ARN of the cost optimization CloudWatch dashboard (if created)"
  value       = var.create_cost_dashboard ? aws_cloudwatch_dashboard.cost_optimization[0].dashboard_arn : null
}

output "cost_dashboard_name" {
  description = "Name of the cost optimization CloudWatch dashboard (if created)"
  value       = var.create_cost_dashboard ? aws_cloudwatch_dashboard.cost_optimization[0].dashboard_name : null
}

# ============================================================================
# Lambda Outputs (Savings Plans Notifications)
# ============================================================================

output "savings_plans_lambda_arn" {
  description = "ARN of the Savings Plans recommendations Lambda function (if enabled)"
  value       = var.enable_savings_plans_notifications ? aws_lambda_function.savings_plans_recommendations[0].arn : null
}

output "savings_plans_lambda_name" {
  description = "Name of the Savings Plans recommendations Lambda function (if enabled)"
  value       = var.enable_savings_plans_notifications ? aws_lambda_function.savings_plans_recommendations[0].function_name : null
}

# ============================================================================
# Cost Category Outputs
# ============================================================================

output "environment_cost_category_arn" {
  description = "ARN of the environment cost category (if created)"
  value       = var.create_cost_categories ? aws_ce_cost_category.environment[0].arn : null
}

output "service_cost_category_arn" {
  description = "ARN of the service cost category (if created)"
  value       = var.create_cost_categories ? aws_ce_cost_category.service[0].arn : null
}

# ============================================================================
# Summary Output
# ============================================================================

output "cost_management_summary" {
  description = "Summary of cost management resources created"
  value = {
    anomaly_monitors = {
      service_monitor = aws_ce_anomaly_monitor.service_monitor.arn
      custom_monitors = [for k, v in aws_ce_anomaly_monitor.custom_service_monitors : v.arn]
      linked_account  = var.enable_linked_account_monitor ? aws_ce_anomaly_monitor.linked_account_monitor[0].arn : null
    }
    subscriptions = {
      percentage_threshold = aws_ce_anomaly_subscription.main.arn
      absolute_threshold   = var.anomaly_absolute_threshold > 0 ? aws_ce_anomaly_subscription.absolute_threshold[0].arn : null
    }
    notifications = {
      sns_topic     = aws_sns_topic.cost_anomaly_alerts.arn
      email_targets = var.alert_email_addresses
    }
    dashboard            = var.create_cost_dashboard ? aws_cloudwatch_dashboard.cost_optimization[0].dashboard_arn : null
    savings_plans_lambda = var.enable_savings_plans_notifications ? aws_lambda_function.savings_plans_recommendations[0].arn : null
    cost_categories = {
      environment = var.create_cost_categories ? aws_ce_cost_category.environment[0].arn : null
      service     = var.create_cost_categories ? aws_ce_cost_category.service[0].arn : null
    }
  }
}
