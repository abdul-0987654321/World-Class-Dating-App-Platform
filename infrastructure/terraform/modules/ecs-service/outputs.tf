################################################################################
# ECS Fargate Service Module - Outputs
################################################################################

output "service_id" {
  description = "ECS service ID"
  value       = aws_ecs_service.main.id
}

output "service_arn" {
  description = "ECS service ARN"
  value       = aws_ecs_service.main.id
}

output "service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.main.name
}

output "task_definition_arn" {
  description = "Task definition ARN"
  value       = aws_ecs_task_definition.main.arn
}

output "task_definition_family" {
  description = "Task definition family"
  value       = aws_ecs_task_definition.main.family
}

output "task_definition_revision" {
  description = "Task definition revision"
  value       = aws_ecs_task_definition.main.revision
}

output "log_group_name" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.service.name
}

output "log_group_arn" {
  description = "CloudWatch log group ARN"
  value       = aws_cloudwatch_log_group.service.arn
}

output "service_discovery_arn" {
  description = "Service discovery service ARN"
  value       = var.service_discovery_namespace_id != null ? aws_service_discovery_service.main[0].arn : null
}

output "service_discovery_id" {
  description = "Service discovery service ID"
  value       = var.service_discovery_namespace_id != null ? aws_service_discovery_service.main[0].id : null
}

output "autoscaling_target_resource_id" {
  description = "Auto-scaling target resource ID"
  value       = var.enable_autoscaling ? aws_appautoscaling_target.main[0].resource_id : null
}
