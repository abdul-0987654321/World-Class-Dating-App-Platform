################################################################################
# ECS Fargate Cluster Module - Outputs
################################################################################

output "cluster_id" {
  description = "ECS cluster ID"
  value       = aws_ecs_cluster.main.id
}

output "cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

output "cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "task_execution_role_name" {
  description = "Name of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution.name
}

output "default_task_role_arn" {
  description = "ARN of the default ECS task role"
  value       = aws_iam_role.ecs_task_default.arn
}

output "default_task_role_name" {
  description = "Name of the default ECS task role"
  value       = aws_iam_role.ecs_task_default.name
}

output "security_group_id" {
  description = "Security group ID for ECS tasks"
  value       = aws_security_group.ecs_tasks.id
}

output "security_group_arn" {
  description = "Security group ARN for ECS tasks"
  value       = aws_security_group.ecs_tasks.arn
}

output "service_discovery_namespace_id" {
  description = "Service discovery namespace ID"
  value       = var.enable_service_discovery ? aws_service_discovery_private_dns_namespace.main[0].id : null
}

output "service_discovery_namespace_arn" {
  description = "Service discovery namespace ARN"
  value       = var.enable_service_discovery ? aws_service_discovery_private_dns_namespace.main[0].arn : null
}

output "service_discovery_namespace_name" {
  description = "Service discovery namespace name"
  value       = var.enable_service_discovery ? aws_service_discovery_private_dns_namespace.main[0].name : null
}

output "cluster_log_group_name" {
  description = "CloudWatch log group name for ECS cluster"
  value       = aws_cloudwatch_log_group.ecs_cluster.name
}

output "cluster_log_group_arn" {
  description = "CloudWatch log group ARN for ECS cluster"
  value       = aws_cloudwatch_log_group.ecs_cluster.arn
}

output "kms_key_arn" {
  description = "KMS key ARN used for encryption"
  value       = local.kms_key_arn
}

output "kms_key_id" {
  description = "KMS key ID used for encryption"
  value       = var.kms_key_arn == null && var.create_kms_key ? aws_kms_key.main[0].key_id : null
}
