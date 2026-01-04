################################################################################
# X-Ray Tracing Module
# Provides AWS X-Ray sampling rules, groups, and IAM policies for distributed
# tracing across EKS-based microservices
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
# Local Variables
################################################################################

locals {
  # Generate sampling rules for each service
  service_sampling_rules = {
    for service in var.service_names : service => {
      priority       = 1000 + index(var.service_names, service)
      reservoir_size = var.reservoir_size
      fixed_rate     = var.sampling_rate
      url_path       = "*"
      host           = "*"
      http_method    = "*"
      service_type   = "*"
      service_name   = service
      resource_arn   = "*"
      attributes     = {}
    }
  }

  # Combine default rules with service-specific rules
  all_sampling_rules = merge(
    local.service_sampling_rules,
    var.additional_sampling_rules
  )

  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  partition  = data.aws_partition.current.partition
}

################################################################################
# X-Ray Encryption Configuration
################################################################################

resource "aws_xray_encryption_config" "main" {
  type   = var.kms_key_arn != null ? "KMS" : "NONE"
  key_id = var.kms_key_arn
}

################################################################################
# X-Ray Sampling Rules
################################################################################

# Default sampling rule for all services (catch-all)
resource "aws_xray_sampling_rule" "default" {
  rule_name      = "${var.project_name}-${var.environment}-default"
  priority       = 10000
  version        = 1
  reservoir_size = var.default_reservoir_size
  fixed_rate     = var.default_sampling_rate
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"

  attributes = {}

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-default-sampling"
    Type = "default"
  })
}

# Health check endpoints - low sampling rate
resource "aws_xray_sampling_rule" "health_checks" {
  rule_name      = "${var.project_name}-${var.environment}-health-checks"
  priority       = 1
  version        = 1
  reservoir_size = 0
  fixed_rate     = var.health_check_sampling_rate
  url_path       = "/health*"
  host           = "*"
  http_method    = "GET"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"

  attributes = {}

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-health-check-sampling"
    Type = "health-check"
  })
}

# Readiness check endpoints - low sampling rate
resource "aws_xray_sampling_rule" "readiness_checks" {
  rule_name      = "${var.project_name}-${var.environment}-readiness-checks"
  priority       = 2
  version        = 1
  reservoir_size = 0
  fixed_rate     = var.health_check_sampling_rate
  url_path       = "/ready*"
  host           = "*"
  http_method    = "GET"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"

  attributes = {}

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-readiness-check-sampling"
    Type = "readiness-check"
  })
}

# Error traces - high priority sampling
resource "aws_xray_sampling_rule" "errors" {
  rule_name      = "${var.project_name}-${var.environment}-errors"
  priority       = 5
  version        = 1
  reservoir_size = var.error_reservoir_size
  fixed_rate     = var.error_sampling_rate
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"

  attributes = {
    "http.status_code" = "5*"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-error-sampling"
    Type = "error"
  })
}

# Service-specific sampling rules
resource "aws_xray_sampling_rule" "services" {
  for_each = local.all_sampling_rules

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

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-${each.key}-sampling"
    Service = each.key
  })
}

################################################################################
# X-Ray Groups
################################################################################

# Main application group
resource "aws_xray_group" "main" {
  group_name        = "${var.project_name}-${var.environment}"
  filter_expression = "service(id(name: \"${var.project_name}-*\", type: \"AWS::EKS::Container\"))"

  insights_configuration {
    insights_enabled      = var.enable_insights
    notifications_enabled = var.enable_insights_notifications
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-xray-group"
  })
}

# Error traces group
resource "aws_xray_group" "errors" {
  group_name        = "${var.project_name}-${var.environment}-errors"
  filter_expression = "fault = true OR error = true"

  insights_configuration {
    insights_enabled      = var.enable_insights
    notifications_enabled = var.enable_insights_notifications
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-errors-group"
    Type = "errors"
  })
}

# Slow requests group
resource "aws_xray_group" "slow_requests" {
  group_name        = "${var.project_name}-${var.environment}-slow-requests"
  filter_expression = "responsetime > ${var.slow_request_threshold_ms / 1000}"

  insights_configuration {
    insights_enabled      = var.enable_insights
    notifications_enabled = var.enable_insights_notifications
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-slow-requests-group"
    Type = "performance"
  })
}

# Service-specific groups
resource "aws_xray_group" "services" {
  for_each = toset(var.service_names)

  group_name        = "${var.project_name}-${var.environment}-${each.value}"
  filter_expression = "service(id(name: \"${each.value}\"))"

  insights_configuration {
    insights_enabled      = var.enable_insights
    notifications_enabled = var.enable_insights_notifications
  }

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-${each.value}-group"
    Service = each.value
  })
}

################################################################################
# CloudWatch Log Group for X-Ray
################################################################################

resource "aws_cloudwatch_log_group" "xray" {
  name              = "/aws/xray/${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-xray-logs"
    Purpose = "X-Ray trace data"
  })
}

################################################################################
# IAM Policy for EKS Pods to Send X-Ray Traces
################################################################################

resource "aws_iam_policy" "xray_write" {
  name        = "${var.project_name}-${var.environment}-xray-write"
  description = "IAM policy for EKS pods to send traces to AWS X-Ray"
  path        = "/"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "XRayWriteAccess"
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets",
          "xray:GetSamplingStatisticSummaries"
        ]
        Resource = "*"
      },
      {
        Sid    = "XRayEncryptedWrites"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.kms_key_arn != null ? [var.kms_key_arn] : []
        Condition = var.kms_key_arn != null ? {
          StringEquals = {
            "kms:ViaService" = "xray.${local.region}.amazonaws.com"
          }
        } : {}
      }
    ]
  })

  tags = var.tags
}

# Read-only policy for debugging and viewing traces
resource "aws_iam_policy" "xray_read" {
  name        = "${var.project_name}-${var.environment}-xray-read"
  description = "IAM policy for read-only access to AWS X-Ray traces"
  path        = "/"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "XRayReadAccess"
        Effect = "Allow"
        Action = [
          "xray:GetServiceGraph",
          "xray:GetTraceGraph",
          "xray:GetTraceSummaries",
          "xray:GetGroups",
          "xray:GetGroup",
          "xray:ListTagsForResource",
          "xray:GetTimeSeriesServiceStatistics",
          "xray:GetInsightSummaries",
          "xray:GetInsight",
          "xray:GetInsightEvents",
          "xray:GetInsightImpactGraph",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets",
          "xray:GetSamplingStatisticSummaries",
          "xray:BatchGetTraces",
          "xray:GetEncryptionConfig"
        ]
        Resource = "*"
      }
    ]
  })

  tags = var.tags
}

# Full access policy for X-Ray management
resource "aws_iam_policy" "xray_full_access" {
  name        = "${var.project_name}-${var.environment}-xray-full-access"
  description = "IAM policy for full access to AWS X-Ray"
  path        = "/"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "XRayFullAccess"
        Effect = "Allow"
        Action = [
          "xray:*"
        ]
        Resource = "*"
      },
      {
        Sid    = "XRayKMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey"
        ]
        Resource = var.kms_key_arn != null ? [var.kms_key_arn] : []
        Condition = var.kms_key_arn != null ? {
          StringEquals = {
            "kms:ViaService" = "xray.${local.region}.amazonaws.com"
          }
        } : {}
      }
    ]
  })

  tags = var.tags
}

################################################################################
# IAM Role for EKS IRSA (IAM Roles for Service Accounts)
################################################################################

resource "aws_iam_role" "xray_daemon" {
  count = var.create_xray_daemon_role ? 1 : 0

  name        = "${var.project_name}-${var.environment}-xray-daemon"
  description = "IAM role for X-Ray daemon running in EKS"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.eks_oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(var.eks_oidc_provider_arn, "arn:${local.partition}:iam::${local.account_id}:oidc-provider/", "")}:sub" = "system:serviceaccount:${var.xray_daemon_namespace}:${var.xray_daemon_service_account}"
            "${replace(var.eks_oidc_provider_arn, "arn:${local.partition}:iam::${local.account_id}:oidc-provider/", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-xray-daemon-role"
  })
}

resource "aws_iam_role_policy_attachment" "xray_daemon" {
  count = var.create_xray_daemon_role ? 1 : 0

  role       = aws_iam_role.xray_daemon[0].name
  policy_arn = aws_iam_policy.xray_write.arn
}

################################################################################
# CloudWatch Alarms for X-Ray Insights
################################################################################

resource "aws_cloudwatch_metric_alarm" "xray_throttled_traces" {
  count = var.create_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-xray-throttled-traces"
  alarm_description   = "Alert when X-Ray traces are being throttled"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TracesProcessed"
  namespace           = "AWS/XRay"
  period              = 300
  statistic           = "Sum"
  threshold           = var.throttle_alarm_threshold
  treat_missing_data  = "notBreaching"

  alarm_actions = var.alarm_actions
  ok_actions    = var.ok_actions

  tags = merge(var.tags, {
    Name     = "${var.project_name}-${var.environment}-xray-throttled-traces"
    Severity = "warning"
  })
}

resource "aws_cloudwatch_metric_alarm" "xray_error_rate" {
  count = var.create_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-xray-error-rate"
  alarm_description   = "Alert when the error rate in X-Ray traces exceeds threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  threshold           = var.error_rate_threshold

  metric_query {
    id          = "e1"
    expression  = "m1/m2*100"
    label       = "Error Rate"
    return_data = true
  }

  metric_query {
    id = "m1"
    metric {
      metric_name = "ErrorRate"
      namespace   = "AWS/XRay"
      period      = 300
      stat        = "Sum"
      dimensions = {
        GroupName = aws_xray_group.main.group_name
      }
    }
  }

  metric_query {
    id = "m2"
    metric {
      metric_name = "TracesProcessed"
      namespace   = "AWS/XRay"
      period      = 300
      stat        = "Sum"
      dimensions = {
        GroupName = aws_xray_group.main.group_name
      }
    }
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.ok_actions

  tags = merge(var.tags, {
    Name     = "${var.project_name}-${var.environment}-xray-error-rate"
    Severity = "critical"
  })
}
