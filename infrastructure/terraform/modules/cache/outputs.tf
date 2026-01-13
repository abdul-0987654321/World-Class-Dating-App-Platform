################################################################################
# Cache Module Outputs
################################################################################

output "cluster_id" {
  description = "ID of the ElastiCache cluster"
  value       = module.elasticache.replication_group_id
}

output "primary_endpoint" {
  description = "Primary endpoint address"
  value       = module.elasticache.primary_endpoint_address
}

output "reader_endpoint" {
  description = "Reader endpoint address"
  value       = module.elasticache.reader_endpoint_address
}

output "port" {
  description = "Redis port"
  value       = module.elasticache.port
}

output "connection_string" {
  description = "Redis connection string"
  value       = module.elasticache.connection_string
  sensitive   = true
}

output "security_group_id" {
  description = "ID of the Redis security group"
  value       = module.elasticache.security_group_id
}
