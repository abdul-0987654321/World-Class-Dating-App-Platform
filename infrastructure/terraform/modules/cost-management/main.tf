/**
 * AWS Cost Explorer and Anomaly Detection Terraform Module
 *
 * Provides cost monitoring, anomaly detection, and optimization recommendations
 * for the Flamoral platform. Includes:
 * - Cost anomaly detection monitors
 * - SNS alert subscriptions
 * - Savings Plans recommendations
 * - Reserved Instance recommendations
 * - Cost allocation tags
 */

# ============================================================================
# DATA SOURCES
# ============================================================================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ============================================================================
# SNS TOPIC FOR COST ANOMALY ALERTS
# ============================================================================

resource "aws_sns_topic" "cost_anomaly_alerts" {
  name = "${var.project_name}-${var.environment}-cost-anomaly-alerts"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-cost-anomaly-alerts"
    Environment = var.environment
    Purpose     = "cost-management"
  })
}

resource "aws_sns_topic_policy" "cost_anomaly_alerts" {
  arn = aws_sns_topic.cost_anomaly_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "CostAnomalyAlertPolicy"
    Statement = [
      {
        Sid    = "AllowCostExplorerPublish"
        Effect = "Allow"
        Principal = {
          Service = "costalerts.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.cost_anomaly_alerts.arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# Email subscriptions for cost anomaly alerts
resource "aws_sns_topic_subscription" "cost_anomaly_email" {
  count = length(var.alert_email_addresses)

  topic_arn = aws_sns_topic.cost_anomaly_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email_addresses[count.index]
}

# ============================================================================
# COST ANOMALY DETECTION - SERVICE MONITOR
# ============================================================================

resource "aws_ce_anomaly_monitor" "service_monitor" {
  name              = "${var.project_name}-${var.environment}-service-anomaly-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-service-anomaly-monitor"
    Environment = var.environment
    Purpose     = "cost-management"
  })
}

# ============================================================================
# COST ANOMALY DETECTION - CUSTOM MONITORS FOR SPECIFIC SERVICES
# ============================================================================

resource "aws_ce_anomaly_monitor" "custom_service_monitors" {
  for_each = toset(var.monitored_services)

  name         = "${var.project_name}-${var.environment}-${lower(replace(each.value, " ", "-"))}-monitor"
  monitor_type = "CUSTOM"

  monitor_specification = jsonencode({
    And = null
    Or  = null
    Not = null
    Dimensions = {
      Key          = "SERVICE"
      Values       = [each.value]
      MatchOptions = null
    }
    Tags           = null
    CostCategories = null
  })

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-${lower(replace(each.value, " ", "-"))}-monitor"
    Environment = var.environment
    Purpose     = "cost-management"
    Service     = each.value
  })
}

# ============================================================================
# COST ANOMALY DETECTION - LINKED ACCOUNT MONITOR
# ============================================================================

resource "aws_ce_anomaly_monitor" "linked_account_monitor" {
  count = var.enable_linked_account_monitor ? 1 : 0

  name              = "${var.project_name}-${var.environment}-linked-account-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "LINKED_ACCOUNT"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-linked-account-monitor"
    Environment = var.environment
    Purpose     = "cost-management"
  })
}

# ============================================================================
# COST ANOMALY SUBSCRIPTION
# ============================================================================

resource "aws_ce_anomaly_subscription" "main" {
  name = "${var.project_name}-${var.environment}-anomaly-subscription"

  # Include all monitor ARNs
  monitor_arn_list = concat(
    [aws_ce_anomaly_monitor.service_monitor.arn],
    [for monitor in aws_ce_anomaly_monitor.custom_service_monitors : monitor.arn],
    var.enable_linked_account_monitor ? [aws_ce_anomaly_monitor.linked_account_monitor[0].arn] : []
  )

  frequency = var.anomaly_notification_frequency

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_PERCENTAGE"
      values        = [tostring(var.anomaly_threshold_percentage)]
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }

  subscriber {
    type    = "SNS"
    address = aws_sns_topic.cost_anomaly_alerts.arn
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-anomaly-subscription"
    Environment = var.environment
    Purpose     = "cost-management"
  })

  depends_on = [aws_sns_topic_policy.cost_anomaly_alerts]
}

# ============================================================================
# COST ANOMALY SUBSCRIPTION - ABSOLUTE THRESHOLD
# ============================================================================

resource "aws_ce_anomaly_subscription" "absolute_threshold" {
  count = var.anomaly_absolute_threshold > 0 ? 1 : 0

  name = "${var.project_name}-${var.environment}-anomaly-absolute-subscription"

  monitor_arn_list = concat(
    [aws_ce_anomaly_monitor.service_monitor.arn],
    [for monitor in aws_ce_anomaly_monitor.custom_service_monitors : monitor.arn]
  )

  frequency = var.anomaly_notification_frequency

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = [tostring(var.anomaly_absolute_threshold)]
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }

  subscriber {
    type    = "SNS"
    address = aws_sns_topic.cost_anomaly_alerts.arn
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-anomaly-absolute-subscription"
    Environment = var.environment
    Purpose     = "cost-management"
  })

  depends_on = [aws_sns_topic_policy.cost_anomaly_alerts]
}

# ============================================================================
# COST ALLOCATION TAGS
# ============================================================================

resource "aws_ce_cost_allocation_tag" "environment" {
  tag_key = "Environment"
  status  = "Active"
}

resource "aws_ce_cost_allocation_tag" "project" {
  tag_key = "Project"
  status  = "Active"
}

resource "aws_ce_cost_allocation_tag" "service" {
  tag_key = "Service"
  status  = "Active"
}

resource "aws_ce_cost_allocation_tag" "team" {
  tag_key = "Team"
  status  = "Active"
}

resource "aws_ce_cost_allocation_tag" "cost_center" {
  tag_key = "CostCenter"
  status  = "Active"
}

# Custom cost allocation tags
resource "aws_ce_cost_allocation_tag" "custom" {
  for_each = toset(var.custom_cost_allocation_tags)

  tag_key = each.value
  status  = "Active"
}

# ============================================================================
# SAVINGS PLANS RECOMMENDATIONS (via CloudWatch Dashboard)
# ============================================================================

resource "aws_cloudwatch_dashboard" "cost_optimization" {
  count = var.create_cost_dashboard ? 1 : 0

  dashboard_name = "${var.project_name}-${var.environment}-cost-optimization"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 2
        properties = {
          markdown = "# Cost Optimization Dashboard\n\nThis dashboard provides insights into cost optimization opportunities including Savings Plans and Reserved Instance recommendations.\n\n**Note:** For detailed Savings Plans recommendations, visit the [AWS Cost Explorer Console](https://console.aws.amazon.com/cost-management/home#/savings-plans/recommendations)."
        }
      },
      {
        type   = "text"
        x      = 0
        y      = 2
        width  = 12
        height = 4
        properties = {
          markdown = "## Savings Plans Recommendations\n\nTo view and purchase Savings Plans:\n1. Go to [Savings Plans Recommendations](https://console.aws.amazon.com/cost-management/home#/savings-plans/recommendations)\n2. Review Compute Savings Plans (most flexible)\n3. Review EC2 Instance Savings Plans (best savings)\n4. Consider 1-year or 3-year terms based on commitment level"
        }
      },
      {
        type   = "text"
        x      = 12
        y      = 2
        width  = 12
        height = 4
        properties = {
          markdown = "## Reserved Instance Recommendations\n\nTo view and purchase Reserved Instances:\n1. Go to [RI Recommendations](https://console.aws.amazon.com/cost-management/home#/reservations/recommendations)\n2. Review EC2, RDS, ElastiCache, and Elasticsearch RIs\n3. Consider Standard vs Convertible RIs\n4. Review utilization and coverage reports"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "Estimated Monthly Costs by Service"
          region = data.aws_region.current.name
          view   = "timeSeries"
          stat   = "Sum"
          period = 86400
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonEC2", "Currency", "USD"],
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonRDS", "Currency", "USD"],
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonS3", "Currency", "USD"],
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonEKS", "Currency", "USD"],
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonElastiCache", "Currency", "USD"]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "Total Estimated Charges"
          region = data.aws_region.current.name
          view   = "timeSeries"
          stat   = "Maximum"
          period = 86400
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "Currency", "USD"]
          ]
        }
      },
      {
        type   = "text"
        x      = 0
        y      = 12
        width  = 24
        height = 3
        properties = {
          markdown = "## Cost Optimization Best Practices\n\n| Strategy | Potential Savings | Effort |\n|----------|-------------------|--------|\n| Savings Plans (Compute) | Up to 66% | Low |\n| Reserved Instances | Up to 72% | Medium |\n| Right-sizing | 20-40% | Medium |\n| Spot Instances | Up to 90% | High |\n| S3 Intelligent Tiering | 20-40% | Low |"
        }
      },
      {
        type   = "text"
        x      = 0
        y      = 15
        width  = 24
        height = 3
        properties = {
          markdown = "## Anomaly Detection Status\n\nCost anomalies are monitored automatically. Alerts are sent when:\n- Impact exceeds ${var.anomaly_threshold_percentage}% of normal spending\n${var.anomaly_absolute_threshold > 0 ? "- Absolute impact exceeds $${var.anomaly_absolute_threshold}\n" : ""}\nNotifications are sent to: ${join(", ", var.alert_email_addresses)}"
        }
      }
    ]
  })
}

# ============================================================================
# LAMBDA FOR SAVINGS PLANS RECOMMENDATIONS (Optional)
# ============================================================================

data "aws_iam_policy_document" "savings_plans_lambda_assume_role" {
  count = var.enable_savings_plans_notifications ? 1 : 0

  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "savings_plans_lambda_policy" {
  count = var.enable_savings_plans_notifications ? 1 : 0

  statement {
    sid    = "CostExplorerAccess"
    effect = "Allow"
    actions = [
      "ce:GetSavingsPlansPurchaseRecommendation",
      "ce:GetReservationPurchaseRecommendation",
      "ce:GetRightsizingRecommendation",
      "ce:GetCostAndUsage",
      "ce:GetCostForecast"
    ]
    resources = ["*"]
  }

  statement {
    sid    = "SNSPublish"
    effect = "Allow"
    actions = [
      "sns:Publish"
    ]
    resources = [aws_sns_topic.cost_anomaly_alerts.arn]
  }

  statement {
    sid    = "CloudWatchLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"]
  }
}

resource "aws_iam_role" "savings_plans_lambda" {
  count = var.enable_savings_plans_notifications ? 1 : 0

  name               = "${var.project_name}-${var.environment}-savings-plans-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.savings_plans_lambda_assume_role[0].json

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-savings-plans-lambda-role"
    Environment = var.environment
    Purpose     = "cost-management"
  })
}

resource "aws_iam_role_policy" "savings_plans_lambda" {
  count = var.enable_savings_plans_notifications ? 1 : 0

  name   = "${var.project_name}-${var.environment}-savings-plans-lambda-policy"
  role   = aws_iam_role.savings_plans_lambda[0].id
  policy = data.aws_iam_policy_document.savings_plans_lambda_policy[0].json
}

resource "aws_lambda_function" "savings_plans_recommendations" {
  count = var.enable_savings_plans_notifications ? 1 : 0

  function_name = "${var.project_name}-${var.environment}-savings-plans-recommendations"
  description   = "Fetches Savings Plans and RI recommendations and sends notifications"
  runtime       = "python3.11"
  handler       = "index.handler"
  timeout       = 60
  memory_size   = 256

  role = aws_iam_role.savings_plans_lambda[0].arn

  filename         = data.archive_file.savings_plans_lambda[0].output_path
  source_code_hash = data.archive_file.savings_plans_lambda[0].output_base64sha256

  environment {
    variables = {
      SNS_TOPIC_ARN         = aws_sns_topic.cost_anomaly_alerts.arn
      ENVIRONMENT           = var.environment
      PROJECT_NAME          = var.project_name
      MIN_SAVINGS_THRESHOLD = tostring(var.min_savings_threshold)
    }
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-savings-plans-recommendations"
    Environment = var.environment
    Purpose     = "cost-management"
  })
}

data "archive_file" "savings_plans_lambda" {
  count = var.enable_savings_plans_notifications ? 1 : 0

  type        = "zip"
  output_path = "${path.module}/lambda/savings_plans_recommendations.zip"

  source {
    content  = <<-PYTHON
import boto3
import json
import os
from datetime import datetime, timedelta

def handler(event, context):
    """
    Lambda function to fetch Savings Plans and Reserved Instance recommendations
    and send notifications via SNS.
    """
    ce_client = boto3.client('ce')
    sns_client = boto3.client('sns')

    sns_topic_arn = os.environ['SNS_TOPIC_ARN']
    environment = os.environ['ENVIRONMENT']
    project_name = os.environ['PROJECT_NAME']
    min_savings = float(os.environ.get('MIN_SAVINGS_THRESHOLD', '100'))

    recommendations = []

    # Get Savings Plans recommendations
    try:
        sp_response = ce_client.get_savings_plans_purchase_recommendation(
            SavingsPlansType='COMPUTE_SP',
            TermInYears='ONE_YEAR',
            PaymentOption='NO_UPFRONT',
            LookbackPeriodInDays='THIRTY_DAYS'
        )

        if sp_response.get('SavingsPlansPurchaseRecommendation'):
            sp_rec = sp_response['SavingsPlansPurchaseRecommendation']
            estimated_savings = float(sp_rec.get('EstimatedMonthlySavingsAmount', '0'))

            if estimated_savings >= min_savings:
                recommendations.append({
                    'type': 'Savings Plans (Compute)',
                    'estimated_monthly_savings': f"$${estimated_savings:.2f}",
                    'estimated_savings_percentage': sp_rec.get('EstimatedSavingsPercentage', 'N/A'),
                    'recommended_commitment': f"$${sp_rec.get('HourlyCommitmentToPurchase', 'N/A')}/hour"
                })
    except Exception as e:
        print(f"Error fetching Savings Plans recommendations: {e}")

    # Get EC2 Reserved Instance recommendations
    try:
        ri_response = ce_client.get_reservation_purchase_recommendation(
            Service='Amazon Elastic Compute Cloud - Compute',
            TermInYears='ONE_YEAR',
            PaymentOption='NO_UPFRONT',
            LookbackPeriodInDays='THIRTY_DAYS'
        )

        for rec in ri_response.get('Recommendations', []):
            for detail in rec.get('RecommendationDetails', []):
                savings = float(detail.get('EstimatedMonthlySavingsAmount', '0'))
                if savings >= min_savings:
                    recommendations.append({
                        'type': 'EC2 Reserved Instance',
                        'instance_type': detail.get('InstanceDetails', {}).get('EC2InstanceDetails', {}).get('InstanceType', 'N/A'),
                        'estimated_monthly_savings': f"$${savings:.2f}",
                        'recommended_quantity': detail.get('RecommendedNumberOfInstancesToPurchase', 'N/A')
                    })
    except Exception as e:
        print(f"Error fetching RI recommendations: {e}")

    # Get Right-sizing recommendations
    try:
        rs_response = ce_client.get_rightsizing_recommendation(
            Service='AmazonEC2'
        )

        rightsizing_savings = 0
        rightsizing_count = 0

        for rec in rs_response.get('RightsizingRecommendations', []):
            savings = float(rec.get('ModifyRecommendationDetail', {}).get('TargetInstances', [{}])[0].get('EstimatedMonthlySavings', '0') or '0')
            rightsizing_savings += savings
            rightsizing_count += 1

        if rightsizing_savings >= min_savings:
            recommendations.append({
                'type': 'Right-sizing',
                'instance_count': rightsizing_count,
                'total_estimated_monthly_savings': f"$${rightsizing_savings:.2f}"
            })
    except Exception as e:
        print(f"Error fetching right-sizing recommendations: {e}")

    # Send notification if there are recommendations
    if recommendations:
        message = f"""
Cost Optimization Recommendations for {project_name} ({environment})
Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}

The following cost optimization opportunities have been identified:

"""
        for i, rec in enumerate(recommendations, 1):
            message += f"{i}. {rec['type']}\n"
            for key, value in rec.items():
                if key != 'type':
                    message += f"   - {key.replace('_', ' ').title()}: {value}\n"
            message += "\n"

        message += """
To take action on these recommendations, visit:
- Savings Plans: https://console.aws.amazon.com/cost-management/home#/savings-plans/recommendations
- Reserved Instances: https://console.aws.amazon.com/cost-management/home#/reservations/recommendations
- Right-sizing: https://console.aws.amazon.com/cost-management/home#/rightsizing
"""

        sns_client.publish(
            TopicArn=sns_topic_arn,
            Subject=f"[{environment.upper()}] Cost Optimization Recommendations - {project_name}",
            Message=message
        )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Recommendations sent successfully',
                'recommendations_count': len(recommendations)
            })
        }

    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'No significant recommendations found',
            'recommendations_count': 0
        })
    }
PYTHON
    filename = "index.py"
  }
}

# CloudWatch Event Rule to trigger Lambda weekly
resource "aws_cloudwatch_event_rule" "savings_plans_schedule" {
  count = var.enable_savings_plans_notifications ? 1 : 0

  name                = "${var.project_name}-${var.environment}-savings-plans-schedule"
  description         = "Triggers Savings Plans recommendations Lambda weekly"
  schedule_expression = var.savings_plans_notification_schedule

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-savings-plans-schedule"
    Environment = var.environment
    Purpose     = "cost-management"
  })
}

resource "aws_cloudwatch_event_target" "savings_plans_lambda" {
  count = var.enable_savings_plans_notifications ? 1 : 0

  rule      = aws_cloudwatch_event_rule.savings_plans_schedule[0].name
  target_id = "SavingsPlansLambda"
  arn       = aws_lambda_function.savings_plans_recommendations[0].arn
}

resource "aws_lambda_permission" "savings_plans_eventbridge" {
  count = var.enable_savings_plans_notifications ? 1 : 0

  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.savings_plans_recommendations[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.savings_plans_schedule[0].arn
}

# ============================================================================
# COST CATEGORY (Optional - for advanced cost allocation)
# ============================================================================

resource "aws_ce_cost_category" "environment" {
  count = var.create_cost_categories ? 1 : 0

  name = "${var.project_name}-environment-category"

  rule_version = "CostCategoryExpression.v1"

  rule {
    value = "Production"
    rule {
      tags {
        key           = "Environment"
        values        = ["prod", "production"]
        match_options = ["EQUALS"]
      }
    }
  }

  rule {
    value = "Staging"
    rule {
      tags {
        key           = "Environment"
        values        = ["staging", "stage"]
        match_options = ["EQUALS"]
      }
    }
  }

  rule {
    value = "Development"
    rule {
      tags {
        key           = "Environment"
        values        = ["dev", "development"]
        match_options = ["EQUALS"]
      }
    }
  }

  rule {
    value = "Other"
    type  = "REGULAR"
    rule {
      tags {
        key           = "Environment"
        values        = ["prod", "production", "staging", "stage", "dev", "development"]
        match_options = ["ABSENT"]
      }
    }
  }

  tags = merge(var.tags, {
    Name    = "${var.project_name}-environment-category"
    Purpose = "cost-management"
  })
}

resource "aws_ce_cost_category" "service" {
  count = var.create_cost_categories ? 1 : 0

  name = "${var.project_name}-service-category"

  rule_version = "CostCategoryExpression.v1"

  rule {
    value = "User Service"
    rule {
      tags {
        key           = "Service"
        values        = ["user-service"]
        match_options = ["EQUALS"]
      }
    }
  }

  rule {
    value = "Messaging Service"
    rule {
      tags {
        key           = "Service"
        values        = ["messaging-service"]
        match_options = ["EQUALS"]
      }
    }
  }

  rule {
    value = "Matching Service"
    rule {
      tags {
        key           = "Service"
        values        = ["matching-service"]
        match_options = ["EQUALS"]
      }
    }
  }

  rule {
    value = "Payment Service"
    rule {
      tags {
        key           = "Service"
        values        = ["payment-service"]
        match_options = ["EQUALS"]
      }
    }
  }

  rule {
    value = "Infrastructure"
    rule {
      dimension {
        key           = "SERVICE"
        values        = ["Amazon Elastic Kubernetes Service", "Amazon EC2", "Amazon VPC"]
        match_options = ["EQUALS"]
      }
    }
  }

  rule {
    value = "Database"
    rule {
      dimension {
        key           = "SERVICE"
        values        = ["Amazon Relational Database Service", "Amazon ElastiCache", "Amazon DynamoDB"]
        match_options = ["EQUALS"]
      }
    }
  }

  rule {
    value = "Other"
    type  = "REGULAR"
    rule {
      dimension {
        key           = "SERVICE"
        values        = ["*"]
        match_options = ["EQUALS"]
      }
    }
  }

  tags = merge(var.tags, {
    Name    = "${var.project_name}-service-category"
    Purpose = "cost-management"
  })
}
