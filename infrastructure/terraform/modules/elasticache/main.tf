################################################################################
# ElastiCache Redis Module
# Provides Redis replication groups for caching and session storage
################################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

################################################################################
# Random Auth Token
################################################################################

resource "random_password" "auth_token" {
  count = var.transit_encryption_enabled && var.auth_token == null ? 1 : 0

  length           = 64
  special          = false
  override_special = "!&#$^<>-"
}

################################################################################
# ElastiCache Subnet Group
################################################################################

resource "aws_elasticache_subnet_group" "main" {
  count = var.create_subnet_group ? 1 : 0

  name        = "${var.project_name}-${var.environment}-redis-subnet-group"
  description = "ElastiCache subnet group for ${var.project_name} ${var.environment}"
  subnet_ids  = var.subnet_ids

  tags = var.tags
}

################################################################################
# ElastiCache Parameter Group
################################################################################

resource "aws_elasticache_parameter_group" "main" {
  name        = "${var.project_name}-${var.environment}-redis-params"
  family      = var.parameter_group_family
  description = "ElastiCache parameter group for ${var.project_name} ${var.environment}"

  dynamic "parameter" {
    for_each = var.parameters
    content {
      name  = parameter.value.name
      value = parameter.value.value
    }
  }

  tags = var.tags
}

################################################################################
# Security Group
################################################################################

resource "aws_security_group" "redis" {
  name_prefix = "${var.project_name}-${var.environment}-redis-"
  description = "Security group for ElastiCache Redis ${var.project_name} ${var.environment}"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group_rule" "redis_ingress_ecs" {
  count = var.create_ecs_security_group_rule ? 1 : 0

  type                     = "ingress"
  from_port                = var.port
  to_port                  = var.port
  protocol                 = "tcp"
  source_security_group_id = var.ecs_security_group_id
  security_group_id        = aws_security_group.redis.id
  description              = "Allow Redis access from ECS tasks"
}

resource "aws_security_group_rule" "redis_ingress_cidr" {
  count = length(var.allowed_cidr_blocks) > 0 ? 1 : 0

  type              = "ingress"
  from_port         = var.port
  to_port           = var.port
  protocol          = "tcp"
  cidr_blocks       = var.allowed_cidr_blocks
  security_group_id = aws_security_group.redis.id
  description       = "Allow Redis access from specified CIDR blocks"
}

resource "aws_security_group_rule" "redis_ingress_additional_sgs" {
  count = length(var.additional_security_group_ids)

  type                     = "ingress"
  from_port                = var.port
  to_port                  = var.port
  protocol                 = "tcp"
  source_security_group_id = var.additional_security_group_ids[count.index]
  security_group_id        = aws_security_group.redis.id
  description              = "Allow Redis access from additional security group"
}

resource "aws_security_group_rule" "redis_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = [var.vpc_cidr]
  security_group_id = aws_security_group.redis.id
  description       = "Allow outbound traffic within VPC only - SECURITY HARDENED"
}

################################################################################
# ElastiCache Replication Group
################################################################################

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.project_name}-${var.environment}-redis"
  description          = "Redis replication group for ${var.project_name} ${var.environment}"

  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  port                 = var.port
  parameter_group_name = aws_elasticache_parameter_group.main.name

  subnet_group_name  = var.create_subnet_group ? aws_elasticache_subnet_group.main[0].name : var.subnet_group_name
  security_group_ids = [aws_security_group.redis.id]

  num_cache_clusters = var.cluster_mode_enabled ? null : var.num_cache_clusters

  dynamic "log_delivery_configuration" {
    for_each = var.enable_slow_log ? [1] : []
    content {
      destination      = aws_cloudwatch_log_group.redis_slow_log[0].name
      destination_type = "cloudwatch-logs"
      log_format       = "json"
      log_type         = "slow-log"
    }
  }

  dynamic "log_delivery_configuration" {
    for_each = var.enable_engine_log ? [1] : []
    content {
      destination      = aws_cloudwatch_log_group.redis_engine_log[0].name
      destination_type = "cloudwatch-logs"
      log_format       = "json"
      log_type         = "engine-log"
    }
  }

  # Cluster mode configuration
  num_node_groups         = var.cluster_mode_enabled ? var.num_node_groups : null
  replicas_per_node_group = var.cluster_mode_enabled ? var.replicas_per_node_group : null

  automatic_failover_enabled = var.automatic_failover_enabled
  multi_az_enabled           = var.multi_az_enabled

  at_rest_encryption_enabled = var.at_rest_encryption_enabled
  kms_key_id                 = var.at_rest_encryption_enabled ? var.kms_key_arn : null
  transit_encryption_enabled = var.transit_encryption_enabled
  auth_token                 = var.transit_encryption_enabled ? (var.auth_token != null ? var.auth_token : random_password.auth_token[0].result) : null

  snapshot_retention_limit = var.snapshot_retention_limit
  snapshot_window          = var.snapshot_window
  maintenance_window       = var.maintenance_window

  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  apply_immediately          = var.apply_immediately

  notification_topic_arn = var.notification_topic_arn

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis"
  })
}

################################################################################
# CloudWatch Log Groups
################################################################################

resource "aws_cloudwatch_log_group" "redis_slow_log" {
  count = var.enable_slow_log ? 1 : 0

  name              = "/aws/elasticache/${var.project_name}-${var.environment}/redis/slow-log"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "redis_engine_log" {
  count = var.enable_engine_log ? 1 : 0

  name              = "/aws/elasticache/${var.project_name}-${var.environment}/redis/engine-log"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = var.tags
}

################################################################################
# CloudWatch Alarms
################################################################################

resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-redis-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = var.cpu_utilization_threshold
  alarm_description   = "Redis CPU utilization is too high"

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.ok_actions

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "memory_usage" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-redis-memory-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = var.memory_usage_threshold
  alarm_description   = "Redis memory usage is too high"

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.ok_actions

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "evictions" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-redis-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Sum"
  threshold           = var.evictions_threshold
  alarm_description   = "Redis evictions are occurring"

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.id
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.ok_actions

  tags = var.tags
}

################################################################################
# Secrets Manager for Auth Token
################################################################################

resource "aws_secretsmanager_secret" "redis_auth_token" {
  count = var.transit_encryption_enabled && var.store_auth_token_in_secrets_manager ? 1 : 0

  name        = "${var.project_name}/${var.environment}/elasticache/redis-auth-token"
  description = "Auth token for ElastiCache Redis ${var.project_name} ${var.environment}"
  kms_key_id  = var.kms_key_arn

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  count = var.transit_encryption_enabled && var.store_auth_token_in_secrets_manager ? 1 : 0

  secret_id = aws_secretsmanager_secret.redis_auth_token[0].id
  secret_string = jsonencode({
    auth_token        = var.auth_token != null ? var.auth_token : random_password.auth_token[0].result
    primary_endpoint  = aws_elasticache_replication_group.main.primary_endpoint_address
    reader_endpoint   = aws_elasticache_replication_group.main.reader_endpoint_address
    port              = var.port
    connection_string = "rediss://:${var.auth_token != null ? var.auth_token : random_password.auth_token[0].result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:${var.port}"
  })
}
