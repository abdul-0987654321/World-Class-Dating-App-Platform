################################################################################
# CodeDeploy Module Outputs
################################################################################

output "app_name" {
  description = "Name of the CodeDeploy application"
  value       = aws_codedeploy_app.ecs.name
}

output "app_id" {
  description = "ID of the CodeDeploy application"
  value       = aws_codedeploy_app.ecs.id
}

output "deployment_group_name" {
  description = "Name of the CodeDeploy deployment group"
  value       = aws_codedeploy_deployment_group.ecs.deployment_group_name
}

output "deployment_group_id" {
  description = "ID of the CodeDeploy deployment group"
  value       = aws_codedeploy_deployment_group.ecs.id
}

output "codedeploy_role_arn" {
  description = "ARN of the CodeDeploy IAM role"
  value       = aws_iam_role.codedeploy.arn
}

output "codedeploy_role_name" {
  description = "Name of the CodeDeploy IAM role"
  value       = aws_iam_role.codedeploy.name
}

output "notification_topic_arn" {
  description = "ARN of the deployment notifications SNS topic"
  value       = var.create_notification_topic ? aws_sns_topic.deployment_notifications[0].arn : null
}

output "custom_deployment_configs" {
  description = "Custom deployment configuration names"
  value = var.create_custom_deployment_config ? {
    canary_10_5  = aws_codedeploy_deployment_config.canary_10_percent_5_minutes[0].id
    canary_25_5  = aws_codedeploy_deployment_config.canary_25_percent_5_minutes[0].id
    linear_10_1  = aws_codedeploy_deployment_config.linear_10_percent_1_minute[0].id
  } : {}
}
