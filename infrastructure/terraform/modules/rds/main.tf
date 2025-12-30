################################################################################
# RDS PostgreSQL/Aurora Module
# Provides database instances, parameter groups, and subnet groups
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
# Data Sources
################################################################################

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

################################################################################
# Random Password for Master User
################################################################################

resource "random_password" "master" {
  count = var.manage_master_user_password ? 0 : (var.master_password == null ? 1 : 0)

  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

################################################################################
# Aurora Cluster
################################################################################

resource "aws_rds_cluster" "aurora" {
  count = var.engine_mode == "aurora" ? 1 : 0

  cluster_identifier = "${var.project_name}-${var.environment}-aurora"

  engine         = var.engine
  engine_version = var.engine_version
  engine_mode    = "provisioned"

  database_name   = var.database_name
  master_username = var.master_username
  master_password = var.manage_master_user_password ? null : (var.master_password != null ? var.master_password : random_password.master[0].result)

  manage_master_user_password   = var.manage_master_user_password
  master_user_secret_kms_key_id = var.manage_master_user_password ? var.kms_key_arn : null

  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = [aws_security_group.rds.id]

  port = var.port

  storage_encrypted = true
  kms_key_id        = var.kms_key_arn

  backup_retention_period      = var.backup_retention_period
  preferred_backup_window      = var.preferred_backup_window
  preferred_maintenance_window = var.preferred_maintenance_window

  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports

  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.aurora[0].name

  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.project_name}-${var.environment}-aurora-final-${formatdate("YYYYMMDD-hhmmss", timestamp())}"

  copy_tags_to_snapshot = true

  dynamic "serverlessv2_scaling_configuration" {
    for_each = var.enable_serverless_v2 ? [1] : []
    content {
      min_capacity = var.serverless_min_capacity
      max_capacity = var.serverless_max_capacity
    }
  }

  iam_database_authentication_enabled = var.iam_database_authentication_enabled

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-aurora"
  })

  lifecycle {
    ignore_changes = [
      final_snapshot_identifier,
    ]
  }
}

################################################################################
# Aurora Cluster Instances
################################################################################

resource "aws_rds_cluster_instance" "aurora" {
  count = var.engine_mode == "aurora" ? var.instance_count : 0

  identifier         = "${var.project_name}-${var.environment}-aurora-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.aurora[0].id

  engine         = var.engine
  engine_version = var.engine_version

  instance_class = var.enable_serverless_v2 ? "db.serverless" : var.instance_class

  db_subnet_group_name = var.db_subnet_group_name

  db_parameter_group_name = aws_db_parameter_group.main.name

  publicly_accessible = false

  monitoring_interval = var.monitoring_interval
  monitoring_role_arn = var.monitoring_interval > 0 ? aws_iam_role.rds_enhanced_monitoring[0].arn : null

  performance_insights_enabled          = var.performance_insights_enabled
  performance_insights_kms_key_id       = var.performance_insights_enabled ? var.kms_key_arn : null
  performance_insights_retention_period = var.performance_insights_enabled ? var.performance_insights_retention_period : null

  auto_minor_version_upgrade = var.auto_minor_version_upgrade

  copy_tags_to_snapshot = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-aurora-${count.index + 1}"
  })
}

################################################################################
# RDS PostgreSQL Instance (Non-Aurora)
################################################################################

resource "aws_db_instance" "postgres" {
  count = var.engine_mode == "rds" ? 1 : 0

  identifier = "${var.project_name}-${var.environment}-postgres"

  engine         = "postgres"
  engine_version = var.engine_version

  instance_class        = var.instance_class
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = var.storage_type
  storage_encrypted     = true
  kms_key_id            = var.kms_key_arn

  db_name  = var.database_name
  username = var.master_username
  password = var.manage_master_user_password ? null : (var.master_password != null ? var.master_password : random_password.master[0].result)

  manage_master_user_password   = var.manage_master_user_password
  master_user_secret_kms_key_id = var.manage_master_user_password ? var.kms_key_arn : null

  port = var.port

  multi_az               = var.multi_az
  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = [aws_security_group.rds.id]

  parameter_group_name = aws_db_parameter_group.main.name

  publicly_accessible = false

  backup_retention_period  = var.backup_retention_period
  backup_window            = var.preferred_backup_window
  maintenance_window       = var.preferred_maintenance_window
  delete_automated_backups = var.delete_automated_backups

  monitoring_interval = var.monitoring_interval
  monitoring_role_arn = var.monitoring_interval > 0 ? aws_iam_role.rds_enhanced_monitoring[0].arn : null

  performance_insights_enabled          = var.performance_insights_enabled
  performance_insights_kms_key_id       = var.performance_insights_enabled ? var.kms_key_arn : null
  performance_insights_retention_period = var.performance_insights_enabled ? var.performance_insights_retention_period : null

  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports

  auto_minor_version_upgrade  = var.auto_minor_version_upgrade
  allow_major_version_upgrade = var.allow_major_version_upgrade

  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.project_name}-${var.environment}-postgres-final"

  copy_tags_to_snapshot = true

  iam_database_authentication_enabled = var.iam_database_authentication_enabled

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-postgres"
  })

  lifecycle {
    ignore_changes = [
      password,
    ]
  }
}

################################################################################
# Parameter Groups
################################################################################

resource "aws_rds_cluster_parameter_group" "aurora" {
  count = var.engine_mode == "aurora" ? 1 : 0

  name        = "${var.project_name}-${var.environment}-aurora-cluster-pg"
  family      = var.parameter_group_family
  description = "Aurora cluster parameter group for ${var.project_name} ${var.environment}"

  dynamic "parameter" {
    for_each = var.cluster_parameters
    content {
      name         = parameter.value.name
      value        = parameter.value.value
      apply_method = lookup(parameter.value, "apply_method", "immediate")
    }
  }

  tags = var.tags
}

resource "aws_db_parameter_group" "main" {
  name        = "${var.project_name}-${var.environment}-pg"
  family      = var.parameter_group_family
  description = "Database parameter group for ${var.project_name} ${var.environment}"

  dynamic "parameter" {
    for_each = var.db_parameters
    content {
      name         = parameter.value.name
      value        = parameter.value.value
      apply_method = lookup(parameter.value, "apply_method", "immediate")
    }
  }

  tags = var.tags
}

################################################################################
# Enhanced Monitoring IAM Role
################################################################################

resource "aws_iam_role" "rds_enhanced_monitoring" {
  count = var.monitoring_interval > 0 ? 1 : 0

  name = "${var.project_name}-${var.environment}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  count = var.monitoring_interval > 0 ? 1 : 0

  role       = aws_iam_role.rds_enhanced_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

################################################################################
# CloudWatch Alarms
################################################################################

resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-rds-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.cpu_utilization_threshold
  alarm_description   = "RDS CPU utilization is too high"

  dimensions = var.engine_mode == "aurora" ? {
    DBClusterIdentifier = aws_rds_cluster.aurora[0].cluster_identifier
    } : {
    DBInstanceIdentifier = aws_db_instance.postgres[0].identifier
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.ok_actions

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "freeable_memory" {
  count = var.create_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-rds-freeable-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.freeable_memory_threshold
  alarm_description   = "RDS freeable memory is too low"

  dimensions = var.engine_mode == "aurora" ? {
    DBClusterIdentifier = aws_rds_cluster.aurora[0].cluster_identifier
    } : {
    DBInstanceIdentifier = aws_db_instance.postgres[0].identifier
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.ok_actions

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "storage_space" {
  count = var.create_cloudwatch_alarms && var.engine_mode == "rds" ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-rds-storage-space"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.free_storage_space_threshold
  alarm_description   = "RDS free storage space is too low"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres[0].identifier
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.ok_actions

  tags = var.tags
}
