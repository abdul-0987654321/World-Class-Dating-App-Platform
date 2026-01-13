################################################################################
# Cache Module - Wrapper for ElastiCache
# Provides a simplified interface for environment configurations
################################################################################

module "elasticache" {
  source = "../elasticache"

  project_name = var.project
  environment  = var.environment
  vpc_id       = var.vpc_id
  vpc_cidr     = "10.0.0.0/16"  # Default VPC CIDR
  subnet_ids   = var.private_subnet_ids

  # Environment-specific sizing
  node_type          = var.environment == "prod" ? "cache.r6g.large" : "cache.t3.small"
  num_cache_clusters = var.environment == "prod" ? 2 : 1

  # HA settings based on environment
  automatic_failover_enabled = var.environment == "prod"
  multi_az_enabled          = var.environment == "prod"

  # Security
  ecs_security_group_id = var.redis_security_group_id

  tags = {
    Module = "cache-wrapper"
  }
}
