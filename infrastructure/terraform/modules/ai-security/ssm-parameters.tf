################################################################################
# AI Security SSM Parameters
# Manages SSM parameters for AI kill switch functionality
################################################################################

locals {
  # AI-enabled services that can be controlled via kill switch
  ai_services = [
    "matching",
    "moderation",
    "recommendation",
    "media",
    "verification"
  ]

  # Common tags for all resources
  common_tags = merge(var.tags, {
    Module      = "ai-security"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  })
}

################################################################################
# SSM Parameters for AI Kill Switch - Enable/Disable flags
################################################################################

resource "aws_ssm_parameter" "ai_service_enabled" {
  for_each = toset(local.ai_services)

  name        = "/${var.project_name}/${var.environment}/ai/${each.key}/enabled"
  description = "AI enabled flag for ${each.key} service. Set to 'false' to disable AI features."
  type        = "String"
  value       = var.ai_services_default_enabled ? "true" : "false"
  tier        = "Standard"

  tags = merge(local.common_tags, {
    Name       = "${var.project_name}-${var.environment}-ai-${each.key}-enabled"
    AIService  = each.key
    Purpose    = "kill-switch"
  })

  lifecycle {
    # Ignore changes to value - these will be updated by the admin service
    ignore_changes = [value]
  }
}

################################################################################
# SSM Parameters for AI Kill Switch - Disable reason storage
################################################################################

resource "aws_ssm_parameter" "ai_service_disabled_reason" {
  for_each = toset(local.ai_services)

  name        = "/${var.project_name}/${var.environment}/ai/${each.key}/disabled_reason"
  description = "Reason for AI disable on ${each.key} service (JSON format)"
  type        = "String"
  value       = jsonencode({
    reason    = "Initial state"
    timestamp = timestamp()
  })
  tier        = "Standard"

  tags = merge(local.common_tags, {
    Name       = "${var.project_name}-${var.environment}-ai-${each.key}-disabled-reason"
    AIService  = each.key
    Purpose    = "kill-switch-audit"
  })

  lifecycle {
    # Ignore changes to value - these will be updated by the admin service
    ignore_changes = [value]
  }
}

################################################################################
# SSM Parameters for Circuit Breaker Configuration
################################################################################

resource "aws_ssm_parameter" "circuit_breaker_config" {
  for_each = toset(local.ai_services)

  name        = "/${var.project_name}/${var.environment}/ai/${each.key}/circuit-breaker/config"
  description = "Circuit breaker configuration for ${each.key} AI service"
  type        = "String"
  value       = jsonencode({
    failure_threshold      = var.circuit_breaker_failure_threshold
    failure_rate_threshold = var.circuit_breaker_failure_rate_threshold
    reset_timeout_ms       = var.circuit_breaker_reset_timeout_ms
    success_threshold      = var.circuit_breaker_success_threshold
    sliding_window_size    = var.circuit_breaker_sliding_window_size
    request_timeout_ms     = var.circuit_breaker_request_timeout_ms
  })
  tier        = "Standard"

  tags = merge(local.common_tags, {
    Name       = "${var.project_name}-${var.environment}-ai-${each.key}-circuit-breaker-config"
    AIService  = each.key
    Purpose    = "circuit-breaker"
  })
}

################################################################################
# CloudWatch Log Group for Kill Switch Events
################################################################################

resource "aws_cloudwatch_log_group" "ai_kill_switch" {
  name              = "/flamoral/${var.environment}/ai-kill-switch"
  retention_in_days = var.log_retention_days

  tags = merge(local.common_tags, {
    Name    = "${var.project_name}-${var.environment}-ai-kill-switch-logs"
    Purpose = "kill-switch-audit"
  })
}

################################################################################
# CloudWatch Alarms for Kill Switch Events
################################################################################

resource "aws_cloudwatch_metric_alarm" "ai_service_disabled" {
  for_each = toset(local.ai_services)

  alarm_name          = "${var.project_name}-${var.environment}-ai-${each.key}-disabled"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "AIServiceDisabled"
  namespace           = "Flamoral/${var.environment}/AIKillSwitch"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when AI is disabled for ${each.key} service"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ServiceName = each.key
    Environment = var.environment
  }

  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
  ok_actions    = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  tags = merge(local.common_tags, {
    Name       = "${var.project_name}-${var.environment}-ai-${each.key}-disabled-alarm"
    AIService  = each.key
    Purpose    = "monitoring"
  })
}

################################################################################
# CloudWatch Alarms for Circuit Breaker
################################################################################

resource "aws_cloudwatch_metric_alarm" "circuit_breaker_open" {
  for_each = toset(local.ai_services)

  alarm_name          = "${var.project_name}-${var.environment}-circuit-breaker-${each.key}-open"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "State_OPEN"
  namespace           = "Flamoral/${var.environment}/CircuitBreaker"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when circuit breaker opens for ${each.key} AI service"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ServiceName = each.key
    Environment = var.environment
  }

  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
  ok_actions    = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  tags = merge(local.common_tags, {
    Name       = "${var.project_name}-${var.environment}-circuit-breaker-${each.key}-open-alarm"
    AIService  = each.key
    Purpose    = "monitoring"
  })
}

################################################################################
# IAM Policy for AI Kill Switch Access
################################################################################

resource "aws_iam_policy" "ai_kill_switch_read" {
  name        = "${var.project_name}-${var.environment}-ai-kill-switch-read"
  description = "Allows reading AI kill switch parameters"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadAIParameters"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = [
          "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/ai/*"
        ]
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_policy" "ai_kill_switch_write" {
  name        = "${var.project_name}-${var.environment}-ai-kill-switch-write"
  description = "Allows reading and writing AI kill switch parameters"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadWriteAIParameters"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
          "ssm:PutParameter"
        ]
        Resource = [
          "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/ai/*"
        ]
      },
      {
        Sid    = "WriteCloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = [
          "${aws_cloudwatch_log_group.ai_kill_switch.arn}:*"
        ]
      },
      {
        Sid    = "WriteCloudWatchMetrics"
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "cloudwatch:namespace" = [
              "Flamoral/${var.environment}/AIKillSwitch",
              "Flamoral/${var.environment}/CircuitBreaker"
            ]
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

################################################################################
# Data Sources
################################################################################

data "aws_region" "current" {}

data "aws_caller_identity" "current" {}
