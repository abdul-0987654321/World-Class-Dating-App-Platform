################################################################################
# Monitoring Module
# Provides CloudWatch log groups, dashboards, alarms, and X-Ray configuration
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
# CloudWatch Log Groups
################################################################################

resource "aws_cloudwatch_log_group" "main" {
  for_each = var.log_groups

  name              = each.value.name_prefix != null ? "${each.value.name_prefix}/${each.key}" : "/aws/${var.project_name}/${var.environment}/${each.key}"
  retention_in_days = each.value.retention_in_days
  kms_key_id        = each.value.kms_key_arn != null ? each.value.kms_key_arn : var.default_kms_key_arn

  tags = merge(var.tags, each.value.tags, {
    Name    = "${var.project_name}-${var.environment}-${each.key}"
    Service = each.key
  })
}

################################################################################
# CloudWatch Log Metric Filters
################################################################################

resource "aws_cloudwatch_log_metric_filter" "main" {
  for_each = var.metric_filters

  name           = "${var.project_name}-${var.environment}-${each.key}"
  pattern        = each.value.pattern
  log_group_name = each.value.log_group_name != null ? each.value.log_group_name : aws_cloudwatch_log_group.main[each.value.log_group_key].name

  metric_transformation {
    name          = each.value.metric_name
    namespace     = each.value.metric_namespace != null ? each.value.metric_namespace : "${var.project_name}/${var.environment}"
    value         = each.value.metric_value
    default_value = each.value.default_value
    unit          = each.value.unit
    dimensions    = each.value.dimensions
  }
}

################################################################################
# CloudWatch Alarms
################################################################################

resource "aws_cloudwatch_metric_alarm" "main" {
  for_each = var.alarms

  alarm_name          = "${var.project_name}-${var.environment}-${each.key}"
  alarm_description   = each.value.description
  comparison_operator = each.value.comparison_operator
  evaluation_periods  = each.value.evaluation_periods
  metric_name         = each.value.metric_name
  namespace           = each.value.namespace
  period              = each.value.period
  statistic           = each.value.statistic
  threshold           = each.value.threshold
  treat_missing_data  = each.value.treat_missing_data

  dimensions = each.value.dimensions

  alarm_actions             = each.value.alarm_actions != null ? each.value.alarm_actions : var.default_alarm_actions
  ok_actions                = each.value.ok_actions != null ? each.value.ok_actions : var.default_ok_actions
  insufficient_data_actions = each.value.insufficient_data_actions

  tags = merge(var.tags, {
    Name     = "${var.project_name}-${var.environment}-${each.key}"
    Severity = each.value.severity
  })
}

################################################################################
# Composite Alarms
################################################################################

resource "aws_cloudwatch_composite_alarm" "main" {
  for_each = var.composite_alarms

  alarm_name        = "${var.project_name}-${var.environment}-${each.key}"
  alarm_description = each.value.description
  alarm_rule        = each.value.alarm_rule

  alarm_actions             = each.value.alarm_actions != null ? each.value.alarm_actions : var.default_alarm_actions
  ok_actions                = each.value.ok_actions != null ? each.value.ok_actions : var.default_ok_actions
  insufficient_data_actions = each.value.insufficient_data_actions

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-${each.key}"
  })

  depends_on = [aws_cloudwatch_metric_alarm.main]
}

################################################################################
# CloudWatch Dashboard
################################################################################

resource "aws_cloudwatch_dashboard" "main" {
  count = var.create_dashboard ? 1 : 0

  dashboard_name = "${var.project_name}-${var.environment}-dashboard"
  dashboard_body = var.dashboard_body != null ? var.dashboard_body : jsonencode({
    widgets = concat(
      # Service Health Overview
      [
        {
          type   = "text"
          x      = 0
          y      = 0
          width  = 24
          height = 1
          properties = {
            markdown = "# ${var.project_name} - ${var.environment} Environment Dashboard"
          }
        }
      ],
      # EKS Cluster Metrics
      var.eks_cluster_name != null ? [
        {
          type   = "metric"
          x      = 0
          y      = 1
          width  = 8
          height = 6
          properties = {
            title  = "EKS Cluster CPU Utilization"
            region = data.aws_region.current.name
            metrics = [
              ["ContainerInsights", "pod_cpu_utilization", "ClusterName", var.eks_cluster_name, { stat = "Average" }]
            ]
            period = 300
            view   = "timeSeries"
          }
        },
        {
          type   = "metric"
          x      = 8
          y      = 1
          width  = 8
          height = 6
          properties = {
            title  = "EKS Cluster Memory Utilization"
            region = data.aws_region.current.name
            metrics = [
              ["ContainerInsights", "pod_memory_utilization", "ClusterName", var.eks_cluster_name, { stat = "Average" }]
            ]
            period = 300
            view   = "timeSeries"
          }
        },
        {
          type   = "metric"
          x      = 16
          y      = 1
          width  = 8
          height = 6
          properties = {
            title  = "EKS Cluster Network"
            region = data.aws_region.current.name
            metrics = [
              ["ContainerInsights", "pod_network_rx_bytes", "ClusterName", var.eks_cluster_name, { stat = "Average" }],
              ["ContainerInsights", "pod_network_tx_bytes", "ClusterName", var.eks_cluster_name, { stat = "Average" }]
            ]
            period = 300
            view   = "timeSeries"
          }
        }
      ] : [],
      # RDS Metrics
      var.rds_cluster_identifier != null ? [
        {
          type   = "metric"
          x      = 0
          y      = 7
          width  = 8
          height = 6
          properties = {
            title  = "RDS CPU Utilization"
            region = data.aws_region.current.name
            metrics = [
              ["AWS/RDS", "CPUUtilization", "DBClusterIdentifier", var.rds_cluster_identifier, { stat = "Average" }]
            ]
            period = 300
            view   = "timeSeries"
          }
        },
        {
          type   = "metric"
          x      = 8
          y      = 7
          width  = 8
          height = 6
          properties = {
            title  = "RDS Database Connections"
            region = data.aws_region.current.name
            metrics = [
              ["AWS/RDS", "DatabaseConnections", "DBClusterIdentifier", var.rds_cluster_identifier, { stat = "Average" }]
            ]
            period = 300
            view   = "timeSeries"
          }
        },
        {
          type   = "metric"
          x      = 16
          y      = 7
          width  = 8
          height = 6
          properties = {
            title  = "RDS Read/Write Latency"
            region = data.aws_region.current.name
            metrics = [
              ["AWS/RDS", "ReadLatency", "DBClusterIdentifier", var.rds_cluster_identifier, { stat = "Average" }],
              ["AWS/RDS", "WriteLatency", "DBClusterIdentifier", var.rds_cluster_identifier, { stat = "Average" }]
            ]
            period = 300
            view   = "timeSeries"
          }
        }
      ] : [],
      # ElastiCache Metrics
      var.elasticache_cluster_id != null ? [
        {
          type   = "metric"
          x      = 0
          y      = 13
          width  = 8
          height = 6
          properties = {
            title  = "ElastiCache CPU Utilization"
            region = data.aws_region.current.name
            metrics = [
              ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", var.elasticache_cluster_id, { stat = "Average" }]
            ]
            period = 300
            view   = "timeSeries"
          }
        },
        {
          type   = "metric"
          x      = 8
          y      = 13
          width  = 8
          height = 6
          properties = {
            title  = "ElastiCache Memory Usage"
            region = data.aws_region.current.name
            metrics = [
              ["AWS/ElastiCache", "DatabaseMemoryUsagePercentage", "CacheClusterId", var.elasticache_cluster_id, { stat = "Average" }]
            ]
            period = 300
            view   = "timeSeries"
          }
        },
        {
          type   = "metric"
          x      = 16
          y      = 13
          width  = 8
          height = 6
          properties = {
            title  = "ElastiCache Cache Hits/Misses"
            region = data.aws_region.current.name
            metrics = [
              ["AWS/ElastiCache", "CacheHits", "CacheClusterId", var.elasticache_cluster_id, { stat = "Sum" }],
              ["AWS/ElastiCache", "CacheMisses", "CacheClusterId", var.elasticache_cluster_id, { stat = "Sum" }]
            ]
            period = 300
            view   = "timeSeries"
          }
        }
      ] : [],
      # Custom widgets
      var.additional_dashboard_widgets
    )
  })
}

################################################################################
# SNS Topics for Alarms
################################################################################

resource "aws_sns_topic" "alarms" {
  count = var.create_alarm_topic ? 1 : 0

  name              = "${var.project_name}-${var.environment}-alarms"
  kms_master_key_id = var.default_kms_key_arn
  display_name      = "${var.project_name} ${var.environment} Alarms"

  tags = var.tags
}

resource "aws_sns_topic_policy" "alarms" {
  count = var.create_alarm_topic ? 1 : 0

  arn = aws_sns_topic.alarms[0].arn
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
        Resource = aws_sns_topic.alarms[0].arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:cloudwatch:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:alarm:*"
          }
        }
      }
    ]
  })
}

resource "aws_sns_topic_subscription" "email" {
  for_each = var.create_alarm_topic ? toset(var.alarm_email_endpoints) : []

  topic_arn = aws_sns_topic.alarms[0].arn
  protocol  = "email"
  endpoint  = each.value
}

################################################################################
# X-Ray Sampling Rules
################################################################################

resource "aws_xray_sampling_rule" "main" {
  for_each = var.xray_sampling_rules

  rule_name      = "${var.project_name}-${var.environment}-${each.key}"
  priority       = each.value.priority
  version        = 1
  reservoir_size = each.value.reservoir_size
  fixed_rate     = each.value.fixed_rate
  url_path       = each.value.url_path
  host           = each.value.host
  http_method    = each.value.http_method
  service_type   = each.value.service_type
  service_name   = each.value.service_name
  resource_arn   = each.value.resource_arn

  attributes = each.value.attributes

  tags = var.tags
}

################################################################################
# X-Ray Groups
################################################################################

resource "aws_xray_group" "main" {
  for_each = var.xray_groups

  group_name        = "${var.project_name}-${var.environment}-${each.key}"
  filter_expression = each.value.filter_expression

  insights_configuration {
    insights_enabled      = each.value.insights_enabled
    notifications_enabled = each.value.notifications_enabled
  }

  tags = var.tags
}

################################################################################
# Container Insights
################################################################################

resource "aws_cloudwatch_log_group" "container_insights" {
  count = var.enable_container_insights && var.eks_cluster_name != null ? 1 : 0

  name              = "/aws/containerinsights/${var.eks_cluster_name}/performance"
  retention_in_days = var.container_insights_retention_days
  kms_key_id        = var.default_kms_key_arn

  tags = var.tags
}

################################################################################
# Application Insights
################################################################################

resource "aws_applicationinsights_application" "main" {
  count = var.enable_application_insights ? 1 : 0

  resource_group_name = aws_resourcegroups_group.main[0].name
  auto_config_enabled = var.application_insights_auto_config

  tags = var.tags
}

resource "aws_resourcegroups_group" "main" {
  count = var.enable_application_insights ? 1 : 0

  name        = "${var.project_name}-${var.environment}-resource-group"
  description = "Resource group for ${var.project_name} ${var.environment}"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      TagFilters = [
        {
          Key    = "Project"
          Values = [var.project_name]
        },
        {
          Key    = "Environment"
          Values = [var.environment]
        }
      ]
    })
  }

  tags = var.tags
}

################################################################################
# CloudWatch Anomaly Detection
################################################################################

resource "aws_cloudwatch_metric_alarm" "anomaly" {
  for_each = var.anomaly_detection_alarms

  alarm_name          = "${var.project_name}-${var.environment}-${each.key}-anomaly"
  alarm_description   = each.value.description
  comparison_operator = "LessThanLowerOrGreaterThanUpperThreshold"
  evaluation_periods  = each.value.evaluation_periods
  threshold_metric_id = "ad1"

  metric_query {
    id          = "m1"
    return_data = true

    metric {
      metric_name = each.value.metric_name
      namespace   = each.value.namespace
      period      = each.value.period
      stat        = each.value.statistic
      dimensions  = each.value.dimensions
    }
  }

  metric_query {
    id          = "ad1"
    expression  = "ANOMALY_DETECTION_BAND(m1, ${each.value.band_width})"
    label       = "Anomaly Detection Band"
    return_data = true
  }

  alarm_actions = each.value.alarm_actions != null ? each.value.alarm_actions : var.default_alarm_actions
  ok_actions    = each.value.ok_actions != null ? each.value.ok_actions : var.default_ok_actions

  tags = merge(var.tags, {
    Name     = "${var.project_name}-${var.environment}-${each.key}-anomaly"
    Severity = each.value.severity
  })
}
