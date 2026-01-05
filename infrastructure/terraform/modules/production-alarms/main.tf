################################################################################
# Production CloudWatch Alarms Module
# Comprehensive alarms for production-ready monitoring
# Created for AWS production deployment readiness
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

################################################################################
# Local Variables
################################################################################

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = merge(var.tags, {
    Module      = "production-alarms"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  })
}

################################################################################
# SNS Topics for Alert Routing
################################################################################

resource "aws_sns_topic" "critical_alerts" {
  count = var.create_sns_topics ? 1 : 0

  name              = "${local.name_prefix}-critical-alerts"
  kms_master_key_id = var.kms_key_arn
  display_name      = "${var.project_name} Critical Alerts"

  tags = merge(local.common_tags, {
    Severity = "critical"
  })
}

resource "aws_sns_topic" "warning_alerts" {
  count = var.create_sns_topics ? 1 : 0

  name              = "${local.name_prefix}-warning-alerts"
  kms_master_key_id = var.kms_key_arn
  display_name      = "${var.project_name} Warning Alerts"

  tags = merge(local.common_tags, {
    Severity = "warning"
  })
}

resource "aws_sns_topic" "info_alerts" {
  count = var.create_sns_topics ? 1 : 0

  name              = "${local.name_prefix}-info-alerts"
  kms_master_key_id = var.kms_key_arn
  display_name      = "${var.project_name} Info Alerts"

  tags = merge(local.common_tags, {
    Severity = "info"
  })
}

# SNS Topic Policies
resource "aws_sns_topic_policy" "critical_alerts" {
  count = var.create_sns_topics ? 1 : 0

  arn = aws_sns_topic.critical_alerts[0].arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudWatchAlarms"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.critical_alerts[0].arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:cloudwatch:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:alarm:*"
          }
        }
      },
      {
        Sid    = "AllowEventBridge"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.critical_alerts[0].arn
      }
    ]
  })
}

# Email Subscriptions
resource "aws_sns_topic_subscription" "critical_email" {
  for_each = var.create_sns_topics ? toset(var.critical_alert_emails) : []

  topic_arn = aws_sns_topic.critical_alerts[0].arn
  protocol  = "email"
  endpoint  = each.value
}

resource "aws_sns_topic_subscription" "warning_email" {
  for_each = var.create_sns_topics ? toset(var.warning_alert_emails) : []

  topic_arn = aws_sns_topic.warning_alerts[0].arn
  protocol  = "email"
  endpoint  = each.value
}

################################################################################
# EKS Cluster Alarms
################################################################################

resource "aws_cloudwatch_metric_alarm" "eks_cluster_failed_pods" {
  count = var.eks_cluster_name != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-eks-failed-pods"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "cluster_failed_pod_count"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 5
  alarm_description   = "EKS cluster has more than 5 failed pods"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.eks_cluster_name
  }

  alarm_actions = var.critical_alarm_actions
  ok_actions    = var.critical_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "critical"
    Service  = "eks"
  })
}

resource "aws_cloudwatch_metric_alarm" "eks_node_cpu_high" {
  count = var.eks_cluster_name != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-eks-node-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "node_cpu_utilization"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "EKS node CPU utilization is above 80%"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.eks_cluster_name
  }

  alarm_actions = var.warning_alarm_actions
  ok_actions    = var.warning_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "warning"
    Service  = "eks"
  })
}

resource "aws_cloudwatch_metric_alarm" "eks_node_memory_high" {
  count = var.eks_cluster_name != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-eks-node-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "node_memory_utilization"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "EKS node memory utilization is above 80%"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.eks_cluster_name
  }

  alarm_actions = var.warning_alarm_actions
  ok_actions    = var.warning_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "warning"
    Service  = "eks"
  })
}

resource "aws_cloudwatch_metric_alarm" "eks_pending_pods" {
  count = var.eks_cluster_name != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-eks-pending-pods"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "cluster_pending_pod_count"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 10
  alarm_description   = "EKS cluster has more than 10 pending pods - may indicate resource constraints"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.eks_cluster_name
  }

  alarm_actions = var.warning_alarm_actions
  ok_actions    = var.warning_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "warning"
    Service  = "eks"
  })
}

################################################################################
# RDS Aurora Alarms
################################################################################

resource "aws_cloudwatch_metric_alarm" "rds_cpu_critical" {
  count = var.rds_cluster_identifier != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-cpu-critical"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "RDS CPU utilization is critically high (>90%)"
  treat_missing_data  = "breaching"

  dimensions = {
    DBClusterIdentifier = var.rds_cluster_identifier
  }

  alarm_actions = var.critical_alarm_actions
  ok_actions    = var.critical_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "critical"
    Service  = "rds"
  })
}

resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  count = var.rds_cluster_identifier != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.rds_max_connections * 0.8 # 80% of max connections
  alarm_description   = "RDS database connections approaching limit"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.rds_cluster_identifier
  }

  alarm_actions = var.warning_alarm_actions
  ok_actions    = var.warning_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "warning"
    Service  = "rds"
  })
}

resource "aws_cloudwatch_metric_alarm" "rds_deadlocks" {
  count = var.rds_cluster_identifier != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-deadlocks"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Deadlocks"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "RDS experiencing deadlocks - investigate immediately"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.rds_cluster_identifier
  }

  alarm_actions = var.critical_alarm_actions
  ok_actions    = var.critical_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "critical"
    Service  = "rds"
  })
}

resource "aws_cloudwatch_metric_alarm" "rds_read_latency" {
  count = var.rds_cluster_identifier != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-read-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReadLatency"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 0.02 # 20ms
  alarm_description   = "RDS read latency is high (>20ms)"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.rds_cluster_identifier
  }

  alarm_actions = var.warning_alarm_actions
  ok_actions    = var.warning_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "warning"
    Service  = "rds"
  })
}

resource "aws_cloudwatch_metric_alarm" "rds_write_latency" {
  count = var.rds_cluster_identifier != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-write-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "WriteLatency"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 0.05 # 50ms
  alarm_description   = "RDS write latency is high (>50ms)"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.rds_cluster_identifier
  }

  alarm_actions = var.warning_alarm_actions
  ok_actions    = var.warning_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "warning"
    Service  = "rds"
  })
}

resource "aws_cloudwatch_metric_alarm" "rds_replication_lag" {
  count = var.rds_cluster_identifier != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "AuroraReplicaLag"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 100 # 100ms
  alarm_description   = "Aurora replica lag is high - may impact read consistency"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.rds_cluster_identifier
  }

  alarm_actions = var.warning_alarm_actions
  ok_actions    = var.warning_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "warning"
    Service  = "rds"
  })
}

################################################################################
# ElastiCache Redis Alarms
################################################################################

resource "aws_cloudwatch_metric_alarm" "elasticache_cpu_high" {
  count = var.elasticache_replication_group_id != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-elasticache-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "EngineCPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "ElastiCache CPU utilization is high"
  treat_missing_data  = "notBreaching"

  dimensions = {
    CacheClusterId = var.elasticache_replication_group_id
  }

  alarm_actions = var.warning_alarm_actions
  ok_actions    = var.warning_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "warning"
    Service  = "elasticache"
  })
}

resource "aws_cloudwatch_metric_alarm" "elasticache_memory_high" {
  count = var.elasticache_replication_group_id != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-elasticache-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "ElastiCache memory usage is high (>85%)"
  treat_missing_data  = "notBreaching"

  dimensions = {
    CacheClusterId = var.elasticache_replication_group_id
  }

  alarm_actions = var.critical_alarm_actions
  ok_actions    = var.critical_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "critical"
    Service  = "elasticache"
  })
}

resource "aws_cloudwatch_metric_alarm" "elasticache_evictions" {
  count = var.elasticache_replication_group_id != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-elasticache-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Sum"
  threshold           = 1000
  alarm_description   = "ElastiCache experiencing high evictions - may need more memory"
  treat_missing_data  = "notBreaching"

  dimensions = {
    CacheClusterId = var.elasticache_replication_group_id
  }

  alarm_actions = var.warning_alarm_actions
  ok_actions    = var.warning_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "warning"
    Service  = "elasticache"
  })
}

resource "aws_cloudwatch_metric_alarm" "elasticache_replication_lag" {
  count = var.elasticache_replication_group_id != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-elasticache-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ReplicationLag"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Maximum"
  threshold           = 1 # 1 second
  alarm_description   = "ElastiCache replication lag is high"
  treat_missing_data  = "notBreaching"

  dimensions = {
    CacheClusterId = var.elasticache_replication_group_id
  }

  alarm_actions = var.warning_alarm_actions
  ok_actions    = var.warning_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "warning"
    Service  = "elasticache"
  })
}

################################################################################
# ALB/API Alarms
################################################################################

resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  count = var.alb_arn_suffix != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 50
  alarm_description   = "ALB is returning high number of 5XX errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = var.critical_alarm_actions
  ok_actions    = var.critical_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "critical"
    Service  = "alb"
  })
}

resource "aws_cloudwatch_metric_alarm" "alb_target_5xx_errors" {
  count = var.alb_arn_suffix != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-alb-target-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "ALB targets returning high number of 5XX errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = var.critical_alarm_actions
  ok_actions    = var.critical_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "critical"
    Service  = "alb"
  })
}

resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_hosts" {
  count = var.alb_arn_suffix != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-alb-unhealthy-hosts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Maximum"
  threshold           = 1
  alarm_description   = "ALB has unhealthy target hosts"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = var.warning_alarm_actions
  ok_actions    = var.warning_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "warning"
    Service  = "alb"
  })
}

resource "aws_cloudwatch_metric_alarm" "alb_latency_high" {
  count = var.alb_arn_suffix != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-alb-latency-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  extended_statistic  = "p99"
  threshold           = 2 # 2 seconds p99
  alarm_description   = "ALB p99 latency is high (>2s)"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = var.warning_alarm_actions
  ok_actions    = var.warning_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "warning"
    Service  = "alb"
  })
}

################################################################################
# WAF Alarms
################################################################################

resource "aws_cloudwatch_metric_alarm" "waf_blocked_requests_high" {
  count = var.waf_web_acl_name != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-waf-blocked-requests-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = 1000
  alarm_description   = "WAF is blocking an unusually high number of requests - possible attack"
  treat_missing_data  = "notBreaching"

  dimensions = {
    WebACL = var.waf_web_acl_name
    Region = data.aws_region.current.name
    Rule   = "ALL"
  }

  alarm_actions = var.critical_alarm_actions
  ok_actions    = var.critical_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "critical"
    Service  = "waf"
  })
}

resource "aws_cloudwatch_metric_alarm" "waf_rate_limited_requests" {
  count = var.waf_web_acl_name != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-waf-rate-limited"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = 500
  alarm_description   = "WAF rate limiting is triggering frequently"
  treat_missing_data  = "notBreaching"

  dimensions = {
    WebACL = var.waf_web_acl_name
    Region = data.aws_region.current.name
    Rule   = "RateLimitRule"
  }

  alarm_actions = var.warning_alarm_actions
  ok_actions    = var.warning_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "warning"
    Service  = "waf"
  })
}

################################################################################
# SQS Queue Alarms
################################################################################

resource "aws_cloudwatch_metric_alarm" "sqs_queue_depth" {
  for_each = var.sqs_queues

  alarm_name          = "${local.name_prefix}-sqs-${each.key}-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = each.value.depth_threshold
  alarm_description   = "SQS queue ${each.key} has high message backlog"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = each.value.queue_name
  }

  alarm_actions = var.warning_alarm_actions
  ok_actions    = var.warning_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "warning"
    Service  = "sqs"
    Queue    = each.key
  })
}

resource "aws_cloudwatch_metric_alarm" "sqs_dlq_messages" {
  for_each = var.sqs_dlq_queues

  alarm_name          = "${local.name_prefix}-sqs-dlq-${each.key}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Dead letter queue ${each.key} has messages - processing failures"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = each.value.queue_name
  }

  alarm_actions = var.critical_alarm_actions
  ok_actions    = var.critical_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "critical"
    Service  = "sqs"
    Queue    = each.key
    Type     = "dlq"
  })
}

################################################################################
# Composite Alarms for Critical Services
################################################################################

resource "aws_cloudwatch_composite_alarm" "database_health" {
  count = var.rds_cluster_identifier != null ? 1 : 0

  alarm_name        = "${local.name_prefix}-database-health-composite"
  alarm_description = "Composite alarm for overall database health"

  alarm_rule = <<-EOF
    ALARM(${aws_cloudwatch_metric_alarm.rds_cpu_critical[0].alarm_name}) OR
    ALARM(${aws_cloudwatch_metric_alarm.rds_deadlocks[0].alarm_name}) OR
    ALARM(${aws_cloudwatch_metric_alarm.rds_connections_high[0].alarm_name})
  EOF

  alarm_actions = var.critical_alarm_actions
  ok_actions    = var.critical_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "critical"
    Service  = "composite"
    Type     = "database-health"
  })
}

resource "aws_cloudwatch_composite_alarm" "application_health" {
  count = var.alb_arn_suffix != null && var.eks_cluster_name != null ? 1 : 0

  alarm_name        = "${local.name_prefix}-application-health-composite"
  alarm_description = "Composite alarm for overall application health"

  alarm_rule = <<-EOF
    ALARM(${aws_cloudwatch_metric_alarm.alb_5xx_errors[0].alarm_name}) OR
    ALARM(${aws_cloudwatch_metric_alarm.alb_target_5xx_errors[0].alarm_name}) OR
    ALARM(${aws_cloudwatch_metric_alarm.eks_cluster_failed_pods[0].alarm_name})
  EOF

  alarm_actions = var.critical_alarm_actions
  ok_actions    = var.critical_alarm_actions

  tags = merge(local.common_tags, {
    Severity = "critical"
    Service  = "composite"
    Type     = "application-health"
  })
}

################################################################################
# Cost Anomaly Detection
################################################################################

resource "aws_ce_anomaly_monitor" "cost" {
  count = var.enable_cost_anomaly_detection ? 1 : 0

  name              = "${local.name_prefix}-cost-anomaly-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"

  tags = local.common_tags
}

resource "aws_ce_anomaly_subscription" "cost" {
  count = var.enable_cost_anomaly_detection ? 1 : 0

  name      = "${local.name_prefix}-cost-anomaly-subscription"
  frequency = "DAILY"

  monitor_arn_list = [aws_ce_anomaly_monitor.cost[0].arn]

  subscriber {
    type    = "EMAIL"
    address = var.cost_anomaly_email
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_PERCENTAGE"
      values        = ["10"] # Alert if anomaly is 10% or more
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }

  tags = local.common_tags
}
