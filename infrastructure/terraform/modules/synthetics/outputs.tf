################################################################################
# Synthetics Module Outputs
################################################################################

output "canary_name" {
  description = "Name of the public pages canary"
  value       = aws_synthetics_canary.public_pages.name
}

output "canary_arn" {
  description = "ARN of the public pages canary"
  value       = aws_synthetics_canary.public_pages.arn
}

output "canary_id" {
  description = "ID of the public pages canary"
  value       = aws_synthetics_canary.public_pages.id
}

output "canary_status" {
  description = "Status of the canary"
  value       = aws_synthetics_canary.public_pages.status
}

output "artifacts_bucket_name" {
  description = "S3 bucket name for canary artifacts"
  value       = aws_s3_bucket.synthetics.id
}

output "artifacts_bucket_arn" {
  description = "S3 bucket ARN for canary artifacts"
  value       = aws_s3_bucket.synthetics.arn
}

output "execution_role_arn" {
  description = "ARN of the canary execution role"
  value       = aws_iam_role.synthetics.arn
}

output "execution_role_name" {
  description = "Name of the canary execution role"
  value       = aws_iam_role.synthetics.name
}

output "api_health_canary_name" {
  description = "Name of the API health canary (if created)"
  value       = var.create_api_health_canary ? aws_synthetics_canary.api_health[0].name : null
}

output "api_health_canary_arn" {
  description = "ARN of the API health canary (if created)"
  value       = var.create_api_health_canary ? aws_synthetics_canary.api_health[0].arn : null
}

output "alarm_names" {
  description = "List of CloudWatch alarm names"
  value = var.create_alarms ? [
    aws_cloudwatch_metric_alarm.canary_success_rate[0].alarm_name,
    aws_cloudwatch_metric_alarm.canary_failed[0].alarm_name,
    aws_cloudwatch_metric_alarm.canary_duration[0].alarm_name
  ] : []
}

output "monitored_pages" {
  description = "List of pages being monitored"
  value = [for p in local.pages_to_monitor : {
    name = p.name
    url  = p.url
  }]
}
