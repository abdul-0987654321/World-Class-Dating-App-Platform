################################################################################
# ECS Module Outputs
################################################################################

output "cluster_id" {
  description = "ECS cluster ID"
  value       = module.ecs_cluster.cluster_id
}

output "cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs_cluster.cluster_name
}

output "cluster_arn" {
  description = "ECS cluster ARN"
  value       = module.ecs_cluster.cluster_arn
}

output "alb_id" {
  description = "ALB ID"
  value       = module.alb.alb_id
}

output "alb_arn" {
  description = "ALB ARN"
  value       = module.alb.alb_arn
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.alb.alb_dns_name
}

output "alb_arn_suffix" {
  description = "ALB ARN suffix for CloudWatch metrics"
  value       = module.alb.alb_arn_suffix
}

output "alb_zone_id" {
  description = "ALB hosted zone ID"
  value       = module.alb.alb_zone_id
}

output "ecr_repository_urls" {
  description = "Map of ECR repository URLs"
  value       = module.ecr.repository_urls
}

output "task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = module.ecs_cluster.task_execution_role_arn
}

output "security_group_id" {
  description = "Security group ID for ECS tasks"
  value       = module.ecs_cluster.security_group_id
}

output "service_discovery_namespace_id" {
  description = "Service discovery namespace ID"
  value       = module.ecs_cluster.service_discovery_namespace_id
}
