################################################################################
# ElastiCache Module Outputs
################################################################################

output "replication_group_id" {
  description = "ID of the ElastiCache replication group"
  value       = aws_elasticache_replication_group.main.id
}

output "replication_group_arn" {
  description = "ARN of the ElastiCache replication group"
  value       = aws_elasticache_replication_group.main.arn
}

output "primary_endpoint_address" {
  description = "Primary endpoint address"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "reader_endpoint_address" {
  description = "Reader endpoint address"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}

output "configuration_endpoint_address" {
  description = "Configuration endpoint address (cluster mode only)"
  value       = try(aws_elasticache_replication_group.main.configuration_endpoint_address, null)
}

output "port" {
  description = "Redis port"
  value       = var.port
}

output "connection_string" {
  description = "Redis connection string"
  value       = var.transit_encryption_enabled ? "rediss://${aws_elasticache_replication_group.main.primary_endpoint_address}:${var.port}" : "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:${var.port}"
  sensitive   = true
}

output "reader_connection_string" {
  description = "Redis reader connection string"
  value       = var.transit_encryption_enabled ? "rediss://${aws_elasticache_replication_group.main.reader_endpoint_address}:${var.port}" : "redis://${aws_elasticache_replication_group.main.reader_endpoint_address}:${var.port}"
  sensitive   = true
}

output "security_group_id" {
  description = "ID of the Redis security group"
  value       = aws_security_group.redis.id
}

output "security_group_arn" {
  description = "ARN of the Redis security group"
  value       = aws_security_group.redis.arn
}

output "subnet_group_name" {
  description = "Name of the ElastiCache subnet group"
  value       = var.create_subnet_group ? aws_elasticache_subnet_group.main[0].name : var.subnet_group_name
}

output "parameter_group_name" {
  description = "Name of the ElastiCache parameter group"
  value       = aws_elasticache_parameter_group.main.name
}

output "auth_token_secret_arn" {
  description = "ARN of the Secrets Manager secret containing auth token"
  value       = try(aws_secretsmanager_secret.redis_auth_token[0].arn, null)
}

output "member_clusters" {
  description = "List of member cluster identifiers"
  value       = aws_elasticache_replication_group.main.member_clusters
}

output "engine_version_actual" {
  description = "Actual engine version"
  value       = aws_elasticache_replication_group.main.engine_version_actual
}

output "cluster_enabled" {
  description = "Whether cluster mode is enabled"
  value       = var.cluster_mode_enabled
}
