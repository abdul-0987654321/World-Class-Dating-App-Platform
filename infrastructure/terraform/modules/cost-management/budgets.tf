################################################################################
# AWS Budgets for Cost Management
# Provides monthly budget alerts and service-specific budget tracking
################################################################################

# ============================================================================
# MONTHLY OVERALL BUDGET
# ============================================================================

resource "aws_budgets_budget" "monthly_total" {
  count = var.create_budgets ? 1 : 0

  name              = "${var.project_name}-${var.environment}-monthly-total"
  budget_type       = "COST"
  limit_amount      = var.monthly_budget_limit
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = var.budget_start_date

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Environment$${var.environment}"]
  }

  # Alert at 50% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email_addresses
  }

  # Alert at 75% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 75
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email_addresses
  }

  # Alert at 90% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 90
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email_addresses
  }

  # Alert at 100% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email_addresses
  }

  # Forecasted alert at 100%
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.alert_email_addresses
  }

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-monthly-total"
    Purpose = "cost-management"
  })
}

# ============================================================================
# ECS/FARGATE BUDGET
# ============================================================================

resource "aws_budgets_budget" "ecs" {
  count = var.create_budgets && var.create_service_budgets ? 1 : 0

  name              = "${var.project_name}-${var.environment}-ecs-budget"
  budget_type       = "COST"
  limit_amount      = var.ecs_budget_limit
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = var.budget_start_date

  cost_filter {
    name   = "Service"
    values = ["Amazon Elastic Container Service"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email_addresses
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.alert_email_addresses
  }

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-ecs-budget"
    Purpose = "cost-management"
    Service = "ECS"
  })
}

# ============================================================================
# RDS/AURORA BUDGET
# ============================================================================

resource "aws_budgets_budget" "rds" {
  count = var.create_budgets && var.create_service_budgets ? 1 : 0

  name              = "${var.project_name}-${var.environment}-rds-budget"
  budget_type       = "COST"
  limit_amount      = var.rds_budget_limit
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = var.budget_start_date

  cost_filter {
    name   = "Service"
    values = ["Amazon Relational Database Service"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email_addresses
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.alert_email_addresses
  }

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-rds-budget"
    Purpose = "cost-management"
    Service = "RDS"
  })
}

# ============================================================================
# S3 BUDGET
# ============================================================================

resource "aws_budgets_budget" "s3" {
  count = var.create_budgets && var.create_service_budgets ? 1 : 0

  name              = "${var.project_name}-${var.environment}-s3-budget"
  budget_type       = "COST"
  limit_amount      = var.s3_budget_limit
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = var.budget_start_date

  cost_filter {
    name   = "Service"
    values = ["Amazon Simple Storage Service"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email_addresses
  }

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-s3-budget"
    Purpose = "cost-management"
    Service = "S3"
  })
}

# ============================================================================
# ELASTICACHE BUDGET
# ============================================================================

resource "aws_budgets_budget" "elasticache" {
  count = var.create_budgets && var.create_service_budgets ? 1 : 0

  name              = "${var.project_name}-${var.environment}-elasticache-budget"
  budget_type       = "COST"
  limit_amount      = var.elasticache_budget_limit
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = var.budget_start_date

  cost_filter {
    name   = "Service"
    values = ["Amazon ElastiCache"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email_addresses
  }

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-elasticache-budget"
    Purpose = "cost-management"
    Service = "ElastiCache"
  })
}

# ============================================================================
# DATA TRANSFER BUDGET
# ============================================================================

resource "aws_budgets_budget" "data_transfer" {
  count = var.create_budgets && var.create_service_budgets ? 1 : 0

  name              = "${var.project_name}-${var.environment}-data-transfer-budget"
  budget_type       = "COST"
  limit_amount      = var.data_transfer_budget_limit
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = var.budget_start_date

  cost_filter {
    name   = "Service"
    values = ["AWS Data Transfer"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email_addresses
  }

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-data-transfer-budget"
    Purpose = "cost-management"
    Service = "DataTransfer"
  })
}

# ============================================================================
# CLOUDWATCH BUDGET
# ============================================================================

resource "aws_budgets_budget" "cloudwatch" {
  count = var.create_budgets && var.create_service_budgets ? 1 : 0

  name              = "${var.project_name}-${var.environment}-cloudwatch-budget"
  budget_type       = "COST"
  limit_amount      = var.cloudwatch_budget_limit
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = var.budget_start_date

  cost_filter {
    name   = "Service"
    values = ["Amazon CloudWatch"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email_addresses
  }

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-cloudwatch-budget"
    Purpose = "cost-management"
    Service = "CloudWatch"
  })
}

# ============================================================================
# BUDGET ACTION FOR AUTOMATIC COST CONTROL (Optional)
# ============================================================================

data "aws_iam_policy_document" "budget_action_assume_role" {
  count = var.enable_budget_actions ? 1 : 0

  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"

    principals {
      type        = "Service"
      identifiers = ["budgets.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "budget_action" {
  count = var.enable_budget_actions ? 1 : 0

  name               = "${var.project_name}-${var.environment}-budget-action-role"
  assume_role_policy = data.aws_iam_policy_document.budget_action_assume_role[0].json

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-budget-action-role"
    Purpose = "cost-management"
  })
}

data "aws_iam_policy_document" "budget_action_policy" {
  count = var.enable_budget_actions ? 1 : 0

  # Allow stopping non-critical ECS services when budget exceeded
  statement {
    sid    = "ECSServiceControl"
    effect = "Allow"
    actions = [
      "ecs:UpdateService",
      "ecs:DescribeServices"
    ]
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/Environment"
      values   = [var.environment]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/CostOptimization"
      values   = ["enabled"]
    }
  }

  # Allow publishing to SNS for notifications
  statement {
    sid    = "SNSPublish"
    effect = "Allow"
    actions = [
      "sns:Publish"
    ]
    resources = [aws_sns_topic.cost_anomaly_alerts.arn]
  }
}

resource "aws_iam_role_policy" "budget_action" {
  count = var.enable_budget_actions ? 1 : 0

  name   = "${var.project_name}-${var.environment}-budget-action-policy"
  role   = aws_iam_role.budget_action[0].id
  policy = data.aws_iam_policy_document.budget_action_policy[0].json
}
