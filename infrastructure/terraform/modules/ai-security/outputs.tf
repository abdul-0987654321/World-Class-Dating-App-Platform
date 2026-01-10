################################################################################
# AI Security Module - Outputs
################################################################################

output "ssm_parameter_prefix" {
  description = "SSM parameter prefix for AI services"
  value       = "/${var.project_name}/${var.environment}/ai"
}

output "ai_service_parameter_arns" {
  description = "ARNs of the AI service enabled parameters"
  value = {
    for service in local.ai_services :
    service => aws_ssm_parameter.ai_service_enabled[service].arn
  }
}

output "ai_service_parameter_names" {
  description = "Names of the AI service enabled parameters"
  value = {
    for service in local.ai_services :
    service => aws_ssm_parameter.ai_service_enabled[service].name
  }
}

output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group for kill switch events"
  value       = aws_cloudwatch_log_group.ai_kill_switch.name
}

output "cloudwatch_log_group_arn" {
  description = "ARN of the CloudWatch log group for kill switch events"
  value       = aws_cloudwatch_log_group.ai_kill_switch.arn
}

output "iam_policy_read_arn" {
  description = "ARN of the IAM policy for reading AI kill switch parameters"
  value       = aws_iam_policy.ai_kill_switch_read.arn
}

output "iam_policy_write_arn" {
  description = "ARN of the IAM policy for writing AI kill switch parameters"
  value       = aws_iam_policy.ai_kill_switch_write.arn
}

output "ai_services" {
  description = "List of AI services managed by this module"
  value       = local.ai_services
}

output "alarm_arns" {
  description = "ARNs of the CloudWatch alarms for AI service monitoring"
  value = merge(
    {
      for service in local.ai_services :
      "${service}_disabled" => aws_cloudwatch_metric_alarm.ai_service_disabled[service].arn
    },
    {
      for service in local.ai_services :
      "${service}_circuit_breaker_open" => aws_cloudwatch_metric_alarm.circuit_breaker_open[service].arn
    }
  )
}
