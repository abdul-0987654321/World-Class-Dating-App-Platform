################################################################################
# ECS IAM Module - Outputs
################################################################################

output "task_role_arns" {
  description = "Map of service names to their task role ARNs"
  value       = { for k, v in aws_iam_role.service_task : k => v.arn }
}

output "task_role_names" {
  description = "Map of service names to their task role names"
  value       = { for k, v in aws_iam_role.service_task : k => v.name }
}

output "task_role_ids" {
  description = "Map of service names to their task role IDs"
  value       = { for k, v in aws_iam_role.service_task : k => v.id }
}
