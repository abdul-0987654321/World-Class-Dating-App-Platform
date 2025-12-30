################################################################################
# Monitoring Module Outputs
################################################################################

output "log_groups" {
  description = "Map of log group names to attributes"
  value = {
    for k, v in aws_cloudwatch_log_group.main : k => {
      arn  = v.arn
      name = v.name
    }
  }
}

output "log_group_arns" {
  description = "Map of log group names to ARNs"
  value       = { for k, v in aws_cloudwatch_log_group.main : k => v.arn }
}

output "log_group_names" {
  description = "Map of log group keys to names"
  value       = { for k, v in aws_cloudwatch_log_group.main : k => v.name }
}

output "alarm_arns" {
  description = "Map of alarm names to ARNs"
  value       = { for k, v in aws_cloudwatch_metric_alarm.main : k => v.arn }
}

output "alarm_names" {
  description = "List of alarm names"
  value       = [for k, v in aws_cloudwatch_metric_alarm.main : v.alarm_name]
}

output "composite_alarm_arns" {
  description = "Map of composite alarm names to ARNs"
  value       = { for k, v in aws_cloudwatch_composite_alarm.main : k => v.arn }
}

output "dashboard_arn" {
  description = "ARN of the CloudWatch dashboard"
  value       = try(aws_cloudwatch_dashboard.main[0].dashboard_arn, null)
}

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = try(aws_cloudwatch_dashboard.main[0].dashboard_name, null)
}

output "sns_topic_arn" {
  description = "ARN of the alarms SNS topic"
  value       = try(aws_sns_topic.alarms[0].arn, null)
}

output "sns_topic_name" {
  description = "Name of the alarms SNS topic"
  value       = try(aws_sns_topic.alarms[0].name, null)
}

output "xray_sampling_rule_arns" {
  description = "Map of X-Ray sampling rule names to ARNs"
  value       = { for k, v in aws_xray_sampling_rule.main : k => v.arn }
}

output "xray_group_arns" {
  description = "Map of X-Ray group names to ARNs"
  value       = { for k, v in aws_xray_group.main : k => v.arn }
}

output "container_insights_log_group_arn" {
  description = "ARN of Container Insights log group"
  value       = try(aws_cloudwatch_log_group.container_insights[0].arn, null)
}

output "resource_group_arn" {
  description = "ARN of the resource group"
  value       = try(aws_resourcegroups_group.main[0].arn, null)
}
