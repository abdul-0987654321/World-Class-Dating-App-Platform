/**
 * AWS Budgets Terraform Module
 *
 * Provides cost monitoring and budget alerts for the Flamoral platform.
 * Enforces budget controls as required by production readiness.
 */

# ============================================================================
# MONTHLY BUDGET
# ============================================================================

resource "aws_budgets_budget" "monthly_cost" {
  name              = "${var.project_name}-${var.environment}-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.monthly_budget_amount
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
    subscriber_sns_topic_arns  = var.alert_sns_topic_arns
  }

  # Alert at 80% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email_addresses
    subscriber_sns_topic_arns  = var.alert_sns_topic_arns
  }

  # Alert at 100% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email_addresses
    subscriber_sns_topic_arns  = var.alert_sns_topic_arns
  }

  # Forecasted alert at 100%
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.alert_email_addresses
    subscriber_sns_topic_arns  = var.alert_sns_topic_arns
  }

  tags = var.tags
}

# ============================================================================
# SERVICE-SPECIFIC BUDGETS
# ============================================================================

# EKS Budget
resource "aws_budgets_budget" "ecs" {
  count = var.create_service_budgets ? 1 : 0

  name              = "${var.project_name}-${var.environment}-ecs-budget"
  budget_type       = "COST"
  limit_amount      = var.ecs_budget_amount
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = var.budget_start_date

  cost_filter {
    name   = "Service"
    values = ["Amazon Elastic Kubernetes Service"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email_addresses
    subscriber_sns_topic_arns  = var.alert_sns_topic_arns
  }

  tags = var.tags
}

# RDS Budget
resource "aws_budgets_budget" "rds" {
  count = var.create_service_budgets ? 1 : 0

  name              = "${var.project_name}-${var.environment}-rds-budget"
  budget_type       = "COST"
  limit_amount      = var.rds_budget_amount
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
    subscriber_sns_topic_arns  = var.alert_sns_topic_arns
  }

  tags = var.tags
}

# S3 Budget
resource "aws_budgets_budget" "s3" {
  count = var.create_service_budgets ? 1 : 0

  name              = "${var.project_name}-${var.environment}-s3-budget"
  budget_type       = "COST"
  limit_amount      = var.s3_budget_amount
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
    subscriber_sns_topic_arns  = var.alert_sns_topic_arns
  }

  tags = var.tags
}

# Data Transfer Budget
resource "aws_budgets_budget" "data_transfer" {
  count = var.create_service_budgets ? 1 : 0

  name              = "${var.project_name}-${var.environment}-data-transfer-budget"
  budget_type       = "COST"
  limit_amount      = var.data_transfer_budget_amount
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
    subscriber_sns_topic_arns  = var.alert_sns_topic_arns
  }

  tags = var.tags
}

# ============================================================================
# USAGE BUDGETS (Optional)
# ============================================================================

# EC2 Hours Budget
resource "aws_budgets_budget" "ec2_hours" {
  count = var.create_usage_budgets ? 1 : 0

  name              = "${var.project_name}-${var.environment}-ec2-hours-budget"
  budget_type       = "USAGE"
  limit_amount      = var.ec2_hours_limit
  limit_unit        = "Hrs"
  time_unit         = "MONTHLY"
  time_period_start = var.budget_start_date

  cost_filter {
    name   = "Service"
    values = ["Amazon Elastic Compute Cloud - Compute"]
  }

  cost_filter {
    name   = "UsageType"
    values = ["BoxUsage:*"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email_addresses
    subscriber_sns_topic_arns  = var.alert_sns_topic_arns
  }

  tags = var.tags
}

# ============================================================================
# BUDGET ACTIONS (Optional - Auto-remediation)
# ============================================================================

# IAM Policy for Budget Actions
data "aws_iam_policy_document" "budget_action" {
  count = var.enable_budget_actions ? 1 : 0

  statement {
    effect = "Allow"
    actions = [
      "ec2:StopInstances",
      "rds:StopDBInstance",
    ]
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/Environment"
      values   = [var.environment]
    }
  }
}

resource "aws_iam_role" "budget_action" {
  count = var.enable_budget_actions ? 1 : 0

  name = "${var.project_name}-${var.environment}-budget-action-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "budgets.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "budget_action" {
  count = var.enable_budget_actions ? 1 : 0

  name   = "${var.project_name}-${var.environment}-budget-action-policy"
  role   = aws_iam_role.budget_action[0].id
  policy = data.aws_iam_policy_document.budget_action[0].json
}
