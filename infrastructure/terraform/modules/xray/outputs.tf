################################################################################
# X-Ray Module Outputs
################################################################################

output "default_sampling_rule_arn" {
  description = "ARN of the default sampling rule"
  value       = aws_xray_sampling_rule.default.arn
}

output "default_sampling_rule_name" {
  description = "Name of the default sampling rule"
  value       = aws_xray_sampling_rule.default.rule_name
}

output "health_checks_sampling_rule_arn" {
  description = "ARN of the health checks sampling rule"
  value       = aws_xray_sampling_rule.health_checks.arn
}

output "readiness_checks_sampling_rule_arn" {
  description = "ARN of the readiness checks sampling rule"
  value       = aws_xray_sampling_rule.readiness_checks.arn
}

output "errors_sampling_rule_arn" {
  description = "ARN of the errors sampling rule"
  value       = aws_xray_sampling_rule.errors.arn
}

output "service_sampling_rule_arns" {
  description = "Map of service names to their sampling rule ARNs"
  value       = { for k, v in aws_xray_sampling_rule.services : k => v.arn }
}

output "main_group_arn" {
  description = "ARN of the main X-Ray group"
  value       = aws_xray_group.main.arn
}

output "main_group_name" {
  description = "Name of the main X-Ray group"
  value       = aws_xray_group.main.group_name
}

output "errors_group_arn" {
  description = "ARN of the errors X-Ray group"
  value       = aws_xray_group.errors.arn
}

output "errors_group_name" {
  description = "Name of the errors X-Ray group"
  value       = aws_xray_group.errors.group_name
}

output "slow_requests_group_arn" {
  description = "ARN of the slow requests X-Ray group"
  value       = aws_xray_group.slow_requests.arn
}

output "slow_requests_group_name" {
  description = "Name of the slow requests X-Ray group"
  value       = aws_xray_group.slow_requests.group_name
}

output "service_group_arns" {
  description = "Map of service names to their X-Ray group ARNs"
  value       = { for k, v in aws_xray_group.services : k => v.arn }
}

output "service_group_names" {
  description = "Map of service names to their X-Ray group names"
  value       = { for k, v in aws_xray_group.services : k => v.group_name }
}

output "cloudwatch_log_group_arn" {
  description = "ARN of the CloudWatch log group for X-Ray"
  value       = aws_cloudwatch_log_group.xray.arn
}

output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group for X-Ray"
  value       = aws_cloudwatch_log_group.xray.name
}

output "xray_write_policy_arn" {
  description = "ARN of the IAM policy for X-Ray write access"
  value       = aws_iam_policy.xray_write.arn
}

output "xray_read_policy_arn" {
  description = "ARN of the IAM policy for X-Ray read access"
  value       = aws_iam_policy.xray_read.arn
}

output "xray_full_access_policy_arn" {
  description = "ARN of the IAM policy for full X-Ray access"
  value       = aws_iam_policy.xray_full_access.arn
}

output "xray_daemon_role_arn" {
  description = "ARN of the IAM role for X-Ray daemon (IRSA)"
  value       = var.create_xray_daemon_role ? aws_iam_role.xray_daemon[0].arn : null
}

output "xray_daemon_role_name" {
  description = "Name of the IAM role for X-Ray daemon (IRSA)"
  value       = var.create_xray_daemon_role ? aws_iam_role.xray_daemon[0].name : null
}

output "throttled_traces_alarm_arn" {
  description = "ARN of the throttled traces CloudWatch alarm"
  value       = var.create_alarms ? aws_cloudwatch_metric_alarm.xray_throttled_traces[0].arn : null
}

output "error_rate_alarm_arn" {
  description = "ARN of the error rate CloudWatch alarm"
  value       = var.create_alarms ? aws_cloudwatch_metric_alarm.xray_error_rate[0].arn : null
}

output "encryption_config_type" {
  description = "Type of X-Ray encryption configuration"
  value       = aws_xray_encryption_config.main.type
}
