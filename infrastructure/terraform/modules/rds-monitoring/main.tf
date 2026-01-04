################################################################################
# RDS Aurora Monitoring Module
# Provides enhanced monitoring, Performance Insights, CloudWatch alarms,
# log exports, and event subscriptions for RDS Aurora clusters
################################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

################################################################################
# Data Sources
################################################################################

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_partition" "current" {}

################################################################################
# Enhanced Monitoring IAM Role
################################################################################

resource "aws_iam_role" "enhanced_monitoring" {
  count = var.create_monitoring_role ? 1 : 0

  name        = "${var.project_name}-${var.environment}-rds-enhanced-monitoring"
  description = "IAM role for RDS Enhanced Monitoring for ${var.db_cluster_identifier}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowRDSMonitoringAssume"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
          ArnLike = {
            "aws:SourceArn" = "arn:${data.aws_partition.current.partition}:rds:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:db:*"
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-rds-enhanced-monitoring"
    Purpose = "RDS Enhanced Monitoring"
  })
}

resource "aws_iam_role_policy_attachment" "enhanced_monitoring" {
  count = var.create_monitoring_role ? 1 : 0

  role       = aws_iam_role.enhanced_monitoring[0].name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

################################################################################
# CloudWatch Log Groups for RDS Logs
################################################################################

resource "aws_cloudwatch_log_group" "rds_audit" {
  count = var.enable_audit_log ? 1 : 0

  name              = "/aws/rds/cluster/${var.db_cluster_identifier}/audit"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = merge(var.tags, {
    Name    = "${var.db_cluster_identifier}-audit-logs"
    LogType = "audit"
  })
}

resource "aws_cloudwatch_log_group" "rds_error" {
  count = var.enable_error_log ? 1 : 0

  name              = "/aws/rds/cluster/${var.db_cluster_identifier}/error"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = merge(var.tags, {
    Name    = "${var.db_cluster_identifier}-error-logs"
    LogType = "error"
  })
}

resource "aws_cloudwatch_log_group" "rds_general" {
  count = var.enable_general_log ? 1 : 0

  name              = "/aws/rds/cluster/${var.db_cluster_identifier}/general"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = merge(var.tags, {
    Name    = "${var.db_cluster_identifier}-general-logs"
    LogType = "general"
  })
}

resource "aws_cloudwatch_log_group" "rds_slowquery" {
  count = var.enable_slowquery_log ? 1 : 0

  name              = "/aws/rds/cluster/${var.db_cluster_identifier}/slowquery"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = merge(var.tags, {
    Name    = "${var.db_cluster_identifier}-slowquery-logs"
    LogType = "slowquery"
  })
}

################################################################################
# SNS Topic for RDS Notifications
################################################################################

resource "aws_sns_topic" "rds_alerts" {
  count = var.create_sns_topic ? 1 : 0

  name              = "${var.project_name}-${var.environment}-rds-alerts"
  display_name      = "RDS Aurora Alerts - ${var.db_cluster_identifier}"
  kms_master_key_id = var.kms_key_arn

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-rds-alerts"
    Purpose = "RDS Monitoring Alerts"
  })
}

resource "aws_sns_topic_policy" "rds_alerts" {
  count = var.create_sns_topic ? 1 : 0

  arn = aws_sns_topic.rds_alerts[0].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowRDSEventPublish"
        Effect = "Allow"
        Principal = {
          Service = "events.rds.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.rds_alerts[0].arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:${data.aws_partition.current.partition}:rds:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
          }
        }
      },
      {
        Sid    = "AllowCloudWatchAlarmsPublish"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.rds_alerts[0].arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:${data.aws_partition.current.partition}:cloudwatch:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:alarm:*"
          }
        }
      }
    ]
  })
}

resource "aws_sns_topic_subscription" "email" {
  for_each = var.create_sns_topic ? toset(var.notification_email_addresses) : toset([])

  topic_arn = aws_sns_topic.rds_alerts[0].arn
  protocol  = "email"
  endpoint  = each.value
}

resource "aws_sns_topic_subscription" "sms" {
  for_each = var.create_sns_topic ? toset(var.notification_sms_numbers) : toset([])

  topic_arn = aws_sns_topic.rds_alerts[0].arn
  protocol  = "sms"
  endpoint  = each.value
}

resource "aws_sns_topic_subscription" "lambda" {
  for_each = var.create_sns_topic ? toset(var.notification_lambda_arns) : toset([])

  topic_arn = aws_sns_topic.rds_alerts[0].arn
  protocol  = "lambda"
  endpoint  = each.value
}

################################################################################
# RDS Event Subscription for Critical Events
################################################################################

resource "aws_db_event_subscription" "critical_events" {
  count = var.create_event_subscription ? 1 : 0

  name        = "${var.project_name}-${var.environment}-rds-critical-events"
  sns_topic   = local.sns_topic_arn
  source_type = "db-cluster"
  source_ids  = [var.db_cluster_identifier]

  event_categories = var.event_categories

  enabled = true

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-rds-critical-events"
    Purpose = "RDS Critical Event Notifications"
  })
}

resource "aws_db_event_subscription" "instance_events" {
  count = var.create_event_subscription && length(var.db_instance_identifiers) > 0 ? 1 : 0

  name        = "${var.project_name}-${var.environment}-rds-instance-events"
  sns_topic   = local.sns_topic_arn
  source_type = "db-instance"
  source_ids  = var.db_instance_identifiers

  event_categories = var.instance_event_categories

  enabled = true

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-rds-instance-events"
    Purpose = "RDS Instance Event Notifications"
  })
}

################################################################################
# CloudWatch Alarms - CPU Utilization
################################################################################

resource "aws_cloudwatch_metric_alarm" "cpu_utilization_high" {
  count = var.create_cpu_alarm ? 1 : 0

  alarm_name          = "${var.db_cluster_identifier}-cpu-utilization-high"
  alarm_description   = "RDS Aurora cluster CPU utilization is above ${var.alarm_thresholds.cpu_utilization_high}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.alarm_thresholds.cpu_utilization_high
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.db_cluster_identifier
  }

  alarm_actions             = local.alarm_actions
  ok_actions                = local.ok_actions
  insufficient_data_actions = var.insufficient_data_actions

  tags = merge(var.tags, {
    Name     = "${var.db_cluster_identifier}-cpu-utilization-high"
    Severity = "critical"
    Metric   = "CPUUtilization"
  })
}

resource "aws_cloudwatch_metric_alarm" "cpu_utilization_warning" {
  count = var.create_cpu_alarm && var.create_warning_alarms ? 1 : 0

  alarm_name          = "${var.db_cluster_identifier}-cpu-utilization-warning"
  alarm_description   = "RDS Aurora cluster CPU utilization is above ${var.alarm_thresholds.cpu_utilization_warning}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.alarm_thresholds.cpu_utilization_warning
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.db_cluster_identifier
  }

  alarm_actions = local.alarm_actions
  ok_actions    = local.ok_actions

  tags = merge(var.tags, {
    Name     = "${var.db_cluster_identifier}-cpu-utilization-warning"
    Severity = "warning"
    Metric   = "CPUUtilization"
  })
}

################################################################################
# CloudWatch Alarms - Database Connections
################################################################################

resource "aws_cloudwatch_metric_alarm" "connection_count_high" {
  count = var.create_connection_alarm ? 1 : 0

  alarm_name          = "${var.db_cluster_identifier}-connection-count-high"
  alarm_description   = "RDS Aurora cluster database connections exceed ${var.alarm_thresholds.connection_count_high}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.alarm_thresholds.connection_count_high
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.db_cluster_identifier
  }

  alarm_actions             = local.alarm_actions
  ok_actions                = local.ok_actions
  insufficient_data_actions = var.insufficient_data_actions

  tags = merge(var.tags, {
    Name     = "${var.db_cluster_identifier}-connection-count-high"
    Severity = "critical"
    Metric   = "DatabaseConnections"
  })
}

resource "aws_cloudwatch_metric_alarm" "connection_count_warning" {
  count = var.create_connection_alarm && var.create_warning_alarms ? 1 : 0

  alarm_name          = "${var.db_cluster_identifier}-connection-count-warning"
  alarm_description   = "RDS Aurora cluster database connections exceed ${var.alarm_thresholds.connection_count_warning}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.alarm_thresholds.connection_count_warning
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.db_cluster_identifier
  }

  alarm_actions = local.alarm_actions
  ok_actions    = local.ok_actions

  tags = merge(var.tags, {
    Name     = "${var.db_cluster_identifier}-connection-count-warning"
    Severity = "warning"
    Metric   = "DatabaseConnections"
  })
}

################################################################################
# CloudWatch Alarms - Storage
################################################################################

resource "aws_cloudwatch_metric_alarm" "volume_bytes_used_high" {
  count = var.create_storage_alarm ? 1 : 0

  alarm_name          = "${var.db_cluster_identifier}-volume-bytes-used-high"
  alarm_description   = "RDS Aurora cluster storage usage exceeds ${var.alarm_thresholds.volume_bytes_used_high / 1073741824} GB"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "VolumeBytesUsed"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.alarm_thresholds.volume_bytes_used_high
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.db_cluster_identifier
  }

  alarm_actions             = local.alarm_actions
  ok_actions                = local.ok_actions
  insufficient_data_actions = var.insufficient_data_actions

  tags = merge(var.tags, {
    Name     = "${var.db_cluster_identifier}-volume-bytes-used-high"
    Severity = "critical"
    Metric   = "VolumeBytesUsed"
  })
}

resource "aws_cloudwatch_metric_alarm" "freeable_memory_low" {
  count = var.create_storage_alarm ? 1 : 0

  alarm_name          = "${var.db_cluster_identifier}-freeable-memory-low"
  alarm_description   = "RDS Aurora cluster freeable memory is below ${var.alarm_thresholds.freeable_memory_low / 1048576} MB"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.alarm_thresholds.freeable_memory_low
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.db_cluster_identifier
  }

  alarm_actions             = local.alarm_actions
  ok_actions                = local.ok_actions
  insufficient_data_actions = var.insufficient_data_actions

  tags = merge(var.tags, {
    Name     = "${var.db_cluster_identifier}-freeable-memory-low"
    Severity = "critical"
    Metric   = "FreeableMemory"
  })
}

resource "aws_cloudwatch_metric_alarm" "free_local_storage_low" {
  count = var.create_storage_alarm ? 1 : 0

  alarm_name          = "${var.db_cluster_identifier}-free-local-storage-low"
  alarm_description   = "RDS Aurora cluster free local storage is below ${var.alarm_thresholds.free_local_storage_low / 1073741824} GB"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "FreeLocalStorage"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.alarm_thresholds.free_local_storage_low
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.db_cluster_identifier
  }

  alarm_actions             = local.alarm_actions
  ok_actions                = local.ok_actions
  insufficient_data_actions = var.insufficient_data_actions

  tags = merge(var.tags, {
    Name     = "${var.db_cluster_identifier}-free-local-storage-low"
    Severity = "warning"
    Metric   = "FreeLocalStorage"
  })
}

################################################################################
# CloudWatch Alarms - Replication Lag
################################################################################

resource "aws_cloudwatch_metric_alarm" "aurora_replica_lag_high" {
  count = var.create_replication_alarm ? 1 : 0

  alarm_name          = "${var.db_cluster_identifier}-replica-lag-high"
  alarm_description   = "RDS Aurora replica lag exceeds ${var.alarm_thresholds.replica_lag_high} milliseconds"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "AuroraReplicaLag"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Maximum"
  threshold           = var.alarm_thresholds.replica_lag_high
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.db_cluster_identifier
  }

  alarm_actions             = local.alarm_actions
  ok_actions                = local.ok_actions
  insufficient_data_actions = var.insufficient_data_actions

  tags = merge(var.tags, {
    Name     = "${var.db_cluster_identifier}-replica-lag-high"
    Severity = "critical"
    Metric   = "AuroraReplicaLag"
  })
}

resource "aws_cloudwatch_metric_alarm" "aurora_replica_lag_warning" {
  count = var.create_replication_alarm && var.create_warning_alarms ? 1 : 0

  alarm_name          = "${var.db_cluster_identifier}-replica-lag-warning"
  alarm_description   = "RDS Aurora replica lag exceeds ${var.alarm_thresholds.replica_lag_warning} milliseconds"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "AuroraReplicaLag"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Maximum"
  threshold           = var.alarm_thresholds.replica_lag_warning
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.db_cluster_identifier
  }

  alarm_actions = local.alarm_actions
  ok_actions    = local.ok_actions

  tags = merge(var.tags, {
    Name     = "${var.db_cluster_identifier}-replica-lag-warning"
    Severity = "warning"
    Metric   = "AuroraReplicaLag"
  })
}

resource "aws_cloudwatch_metric_alarm" "aurora_binlog_replica_lag" {
  count = var.create_replication_alarm && var.enable_binlog_replication_monitoring ? 1 : 0

  alarm_name          = "${var.db_cluster_identifier}-binlog-replica-lag-high"
  alarm_description   = "RDS Aurora binlog replica lag exceeds ${var.alarm_thresholds.binlog_replica_lag_high} seconds"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "AuroraBinlogReplicaLag"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Maximum"
  threshold           = var.alarm_thresholds.binlog_replica_lag_high
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.db_cluster_identifier
  }

  alarm_actions             = local.alarm_actions
  ok_actions                = local.ok_actions
  insufficient_data_actions = var.insufficient_data_actions

  tags = merge(var.tags, {
    Name     = "${var.db_cluster_identifier}-binlog-replica-lag-high"
    Severity = "critical"
    Metric   = "AuroraBinlogReplicaLag"
  })
}

################################################################################
# CloudWatch Alarms - Additional Metrics
################################################################################

resource "aws_cloudwatch_metric_alarm" "deadlocks" {
  count = var.create_deadlock_alarm ? 1 : 0

  alarm_name          = "${var.db_cluster_identifier}-deadlocks"
  alarm_description   = "RDS Aurora cluster deadlocks detected - count exceeds ${var.alarm_thresholds.deadlocks_threshold}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "Deadlocks"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Sum"
  threshold           = var.alarm_thresholds.deadlocks_threshold
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.db_cluster_identifier
  }

  alarm_actions             = local.alarm_actions
  ok_actions                = local.ok_actions
  insufficient_data_actions = var.insufficient_data_actions

  tags = merge(var.tags, {
    Name     = "${var.db_cluster_identifier}-deadlocks"
    Severity = "critical"
    Metric   = "Deadlocks"
  })
}

resource "aws_cloudwatch_metric_alarm" "read_latency_high" {
  count = var.create_latency_alarm ? 1 : 0

  alarm_name          = "${var.db_cluster_identifier}-read-latency-high"
  alarm_description   = "RDS Aurora cluster read latency exceeds ${var.alarm_thresholds.read_latency_high} seconds"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "ReadLatency"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.alarm_thresholds.read_latency_high
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.db_cluster_identifier
  }

  alarm_actions             = local.alarm_actions
  ok_actions                = local.ok_actions
  insufficient_data_actions = var.insufficient_data_actions

  tags = merge(var.tags, {
    Name     = "${var.db_cluster_identifier}-read-latency-high"
    Severity = "warning"
    Metric   = "ReadLatency"
  })
}

resource "aws_cloudwatch_metric_alarm" "write_latency_high" {
  count = var.create_latency_alarm ? 1 : 0

  alarm_name          = "${var.db_cluster_identifier}-write-latency-high"
  alarm_description   = "RDS Aurora cluster write latency exceeds ${var.alarm_thresholds.write_latency_high} seconds"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "WriteLatency"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.alarm_thresholds.write_latency_high
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.db_cluster_identifier
  }

  alarm_actions             = local.alarm_actions
  ok_actions                = local.ok_actions
  insufficient_data_actions = var.insufficient_data_actions

  tags = merge(var.tags, {
    Name     = "${var.db_cluster_identifier}-write-latency-high"
    Severity = "warning"
    Metric   = "WriteLatency"
  })
}

resource "aws_cloudwatch_metric_alarm" "disk_queue_depth_high" {
  count = var.create_disk_queue_alarm ? 1 : 0

  alarm_name          = "${var.db_cluster_identifier}-disk-queue-depth-high"
  alarm_description   = "RDS Aurora cluster disk queue depth exceeds ${var.alarm_thresholds.disk_queue_depth_high}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "DiskQueueDepth"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.alarm_thresholds.disk_queue_depth_high
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.db_cluster_identifier
  }

  alarm_actions             = local.alarm_actions
  ok_actions                = local.ok_actions
  insufficient_data_actions = var.insufficient_data_actions

  tags = merge(var.tags, {
    Name     = "${var.db_cluster_identifier}-disk-queue-depth-high"
    Severity = "warning"
    Metric   = "DiskQueueDepth"
  })
}

################################################################################
# CloudWatch Alarms - Serverless v2 Specific
################################################################################

resource "aws_cloudwatch_metric_alarm" "serverless_capacity_high" {
  count = var.is_serverless_v2 && var.create_serverless_alarms ? 1 : 0

  alarm_name          = "${var.db_cluster_identifier}-serverless-capacity-high"
  alarm_description   = "RDS Aurora Serverless v2 ACU capacity is near maximum (${var.alarm_thresholds.serverless_capacity_high}%)"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "ServerlessDatabaseCapacity"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.alarm_thresholds.serverless_max_capacity * (var.alarm_thresholds.serverless_capacity_high / 100)
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.db_cluster_identifier
  }

  alarm_actions             = local.alarm_actions
  ok_actions                = local.ok_actions
  insufficient_data_actions = var.insufficient_data_actions

  tags = merge(var.tags, {
    Name     = "${var.db_cluster_identifier}-serverless-capacity-high"
    Severity = "warning"
    Metric   = "ServerlessDatabaseCapacity"
  })
}

resource "aws_cloudwatch_metric_alarm" "acu_utilization_high" {
  count = var.is_serverless_v2 && var.create_serverless_alarms ? 1 : 0

  alarm_name          = "${var.db_cluster_identifier}-acu-utilization-high"
  alarm_description   = "RDS Aurora Serverless v2 ACU utilization exceeds ${var.alarm_thresholds.acu_utilization_high}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "ACUUtilization"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.alarm_thresholds.acu_utilization_high
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.db_cluster_identifier
  }

  alarm_actions             = local.alarm_actions
  ok_actions                = local.ok_actions
  insufficient_data_actions = var.insufficient_data_actions

  tags = merge(var.tags, {
    Name     = "${var.db_cluster_identifier}-acu-utilization-high"
    Severity = "critical"
    Metric   = "ACUUtilization"
  })
}

################################################################################
# Composite Alarms
################################################################################

resource "aws_cloudwatch_composite_alarm" "rds_critical" {
  count = var.create_composite_alarm ? 1 : 0

  alarm_name        = "${var.db_cluster_identifier}-critical-composite"
  alarm_description = "Composite alarm for critical RDS Aurora issues"

  alarm_rule = join(" OR ", compact([
    var.create_cpu_alarm ? "ALARM(${aws_cloudwatch_metric_alarm.cpu_utilization_high[0].alarm_name})" : "",
    var.create_connection_alarm ? "ALARM(${aws_cloudwatch_metric_alarm.connection_count_high[0].alarm_name})" : "",
    var.create_replication_alarm ? "ALARM(${aws_cloudwatch_metric_alarm.aurora_replica_lag_high[0].alarm_name})" : "",
    var.create_storage_alarm ? "ALARM(${aws_cloudwatch_metric_alarm.freeable_memory_low[0].alarm_name})" : "",
  ]))

  alarm_actions = local.alarm_actions
  ok_actions    = local.ok_actions

  tags = merge(var.tags, {
    Name     = "${var.db_cluster_identifier}-critical-composite"
    Severity = "critical"
    Type     = "composite"
  })

  depends_on = [
    aws_cloudwatch_metric_alarm.cpu_utilization_high,
    aws_cloudwatch_metric_alarm.connection_count_high,
    aws_cloudwatch_metric_alarm.aurora_replica_lag_high,
    aws_cloudwatch_metric_alarm.freeable_memory_low,
  ]
}

################################################################################
# CloudWatch Dashboard for RDS Monitoring
################################################################################

resource "aws_cloudwatch_dashboard" "rds_monitoring" {
  count = var.create_dashboard ? 1 : 0

  dashboard_name = "${var.db_cluster_identifier}-monitoring"
  dashboard_body = jsonencode({
    widgets = [
      # Header
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# RDS Aurora Monitoring - ${var.db_cluster_identifier}"
        }
      },
      # CPU & Memory
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "CPU Utilization"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBClusterIdentifier", var.db_cluster_identifier, { stat = "Average", period = 60 }]
          ]
          view = "timeSeries"
          annotations = {
            horizontal = [
              { label = "Critical", value = var.alarm_thresholds.cpu_utilization_high, color = "#ff0000" },
              { label = "Warning", value = var.alarm_thresholds.cpu_utilization_warning, color = "#ff9900" }
            ]
          }
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "Freeable Memory"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/RDS", "FreeableMemory", "DBClusterIdentifier", var.db_cluster_identifier, { stat = "Average", period = 60 }]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "Database Connections"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBClusterIdentifier", var.db_cluster_identifier, { stat = "Average", period = 60 }]
          ]
          view = "timeSeries"
          annotations = {
            horizontal = [
              { label = "Critical", value = var.alarm_thresholds.connection_count_high, color = "#ff0000" }
            ]
          }
        }
      },
      # Storage & I/O
      {
        type   = "metric"
        x      = 0
        y      = 7
        width  = 8
        height = 6
        properties = {
          title  = "Volume Bytes Used"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/RDS", "VolumeBytesUsed", "DBClusterIdentifier", var.db_cluster_identifier, { stat = "Average", period = 300 }]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 7
        width  = 8
        height = 6
        properties = {
          title  = "Read/Write IOPS"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/RDS", "ReadIOPS", "DBClusterIdentifier", var.db_cluster_identifier, { stat = "Average", period = 60 }],
            ["AWS/RDS", "WriteIOPS", "DBClusterIdentifier", var.db_cluster_identifier, { stat = "Average", period = 60 }]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 7
        width  = 8
        height = 6
        properties = {
          title  = "Read/Write Latency"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/RDS", "ReadLatency", "DBClusterIdentifier", var.db_cluster_identifier, { stat = "Average", period = 60 }],
            ["AWS/RDS", "WriteLatency", "DBClusterIdentifier", var.db_cluster_identifier, { stat = "Average", period = 60 }]
          ]
          view = "timeSeries"
        }
      },
      # Replication & Network
      {
        type   = "metric"
        x      = 0
        y      = 13
        width  = 8
        height = 6
        properties = {
          title  = "Aurora Replica Lag"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/RDS", "AuroraReplicaLag", "DBClusterIdentifier", var.db_cluster_identifier, { stat = "Maximum", period = 60 }]
          ]
          view = "timeSeries"
          annotations = {
            horizontal = [
              { label = "Critical", value = var.alarm_thresholds.replica_lag_high, color = "#ff0000" }
            ]
          }
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 13
        width  = 8
        height = 6
        properties = {
          title  = "Network Throughput"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/RDS", "NetworkReceiveThroughput", "DBClusterIdentifier", var.db_cluster_identifier, { stat = "Average", period = 60 }],
            ["AWS/RDS", "NetworkTransmitThroughput", "DBClusterIdentifier", var.db_cluster_identifier, { stat = "Average", period = 60 }]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 13
        width  = 8
        height = 6
        properties = {
          title  = "Deadlocks & Buffer Cache Hit Ratio"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/RDS", "Deadlocks", "DBClusterIdentifier", var.db_cluster_identifier, { stat = "Sum", period = 300 }],
            ["AWS/RDS", "BufferCacheHitRatio", "DBClusterIdentifier", var.db_cluster_identifier, { stat = "Average", period = 300 }]
          ]
          view = "timeSeries"
        }
      }
    ]
  })
}

################################################################################
# Local Variables
################################################################################

locals {
  sns_topic_arn = var.create_sns_topic ? aws_sns_topic.rds_alerts[0].arn : var.existing_sns_topic_arn
  alarm_actions = var.alarm_actions != null ? var.alarm_actions : (local.sns_topic_arn != null ? [local.sns_topic_arn] : [])
  ok_actions    = var.ok_actions != null ? var.ok_actions : (local.sns_topic_arn != null ? [local.sns_topic_arn] : [])

  # Collect all alarm ARNs for output
  all_alarm_arns = compact(concat(
    var.create_cpu_alarm ? [aws_cloudwatch_metric_alarm.cpu_utilization_high[0].arn] : [],
    var.create_cpu_alarm && var.create_warning_alarms ? [aws_cloudwatch_metric_alarm.cpu_utilization_warning[0].arn] : [],
    var.create_connection_alarm ? [aws_cloudwatch_metric_alarm.connection_count_high[0].arn] : [],
    var.create_connection_alarm && var.create_warning_alarms ? [aws_cloudwatch_metric_alarm.connection_count_warning[0].arn] : [],
    var.create_storage_alarm ? [aws_cloudwatch_metric_alarm.volume_bytes_used_high[0].arn] : [],
    var.create_storage_alarm ? [aws_cloudwatch_metric_alarm.freeable_memory_low[0].arn] : [],
    var.create_storage_alarm ? [aws_cloudwatch_metric_alarm.free_local_storage_low[0].arn] : [],
    var.create_replication_alarm ? [aws_cloudwatch_metric_alarm.aurora_replica_lag_high[0].arn] : [],
    var.create_replication_alarm && var.create_warning_alarms ? [aws_cloudwatch_metric_alarm.aurora_replica_lag_warning[0].arn] : [],
    var.create_replication_alarm && var.enable_binlog_replication_monitoring ? [aws_cloudwatch_metric_alarm.aurora_binlog_replica_lag[0].arn] : [],
    var.create_deadlock_alarm ? [aws_cloudwatch_metric_alarm.deadlocks[0].arn] : [],
    var.create_latency_alarm ? [aws_cloudwatch_metric_alarm.read_latency_high[0].arn] : [],
    var.create_latency_alarm ? [aws_cloudwatch_metric_alarm.write_latency_high[0].arn] : [],
    var.create_disk_queue_alarm ? [aws_cloudwatch_metric_alarm.disk_queue_depth_high[0].arn] : [],
    var.is_serverless_v2 && var.create_serverless_alarms ? [aws_cloudwatch_metric_alarm.serverless_capacity_high[0].arn] : [],
    var.is_serverless_v2 && var.create_serverless_alarms ? [aws_cloudwatch_metric_alarm.acu_utilization_high[0].arn] : [],
  ))
}
