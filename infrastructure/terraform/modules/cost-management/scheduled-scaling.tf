################################################################################
# Scheduled Scaling for Cost Optimization
# Reduces capacity during off-peak hours to save costs
################################################################################

# ============================================================================
# LOCALS
# ============================================================================

locals {
  # Default scheduled scaling windows (UTC times)
  default_scale_down_schedule = "cron(0 2 * * ? *)"   # 2 AM UTC (off-peak)
  default_scale_up_schedule   = "cron(0 12 * * ? *)"  # 12 PM UTC (peak)

  # Weekend schedule (optional further cost savings)
  weekend_scale_down_schedule = "cron(0 0 ? * SAT *)"  # Saturday midnight
  weekend_scale_up_schedule   = "cron(0 6 ? * MON *)"  # Monday 6 AM
}

# ============================================================================
# IAM ROLE FOR SCHEDULED SCALING LAMBDA
# ============================================================================

data "aws_iam_policy_document" "scheduled_scaling_assume_role" {
  count = var.enable_scheduled_scaling ? 1 : 0

  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "scheduled_scaling_lambda" {
  count = var.enable_scheduled_scaling ? 1 : 0

  name               = "${var.project_name}-${var.environment}-scheduled-scaling-role"
  assume_role_policy = data.aws_iam_policy_document.scheduled_scaling_assume_role[0].json

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-scheduled-scaling-role"
    Purpose = "cost-management"
  })
}

data "aws_iam_policy_document" "scheduled_scaling_policy" {
  count = var.enable_scheduled_scaling ? 1 : 0

  # ECS Service Scaling
  statement {
    sid    = "ECSServiceAccess"
    effect = "Allow"
    actions = [
      "ecs:UpdateService",
      "ecs:DescribeServices",
      "ecs:ListServices",
      "ecs:DescribeClusters",
      "ecs:ListClusters"
    ]
    resources = ["*"]
  }

  # Application Auto Scaling
  statement {
    sid    = "ApplicationAutoScaling"
    effect = "Allow"
    actions = [
      "application-autoscaling:RegisterScalableTarget",
      "application-autoscaling:DeregisterScalableTarget",
      "application-autoscaling:PutScalingPolicy",
      "application-autoscaling:DeleteScalingPolicy",
      "application-autoscaling:DescribeScalableTargets",
      "application-autoscaling:DescribeScalingPolicies"
    ]
    resources = ["*"]
  }

  # Aurora Serverless Scaling
  statement {
    sid    = "RDSScaling"
    effect = "Allow"
    actions = [
      "rds:ModifyDBCluster",
      "rds:DescribeDBClusters"
    ]
    resources = ["*"]
  }

  # CloudWatch Logs
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

  # SNS for notifications
  statement {
    sid    = "SNSPublish"
    effect = "Allow"
    actions = [
      "sns:Publish"
    ]
    resources = [aws_sns_topic.cost_anomaly_alerts.arn]
  }
}

resource "aws_iam_role_policy" "scheduled_scaling" {
  count = var.enable_scheduled_scaling ? 1 : 0

  name   = "${var.project_name}-${var.environment}-scheduled-scaling-policy"
  role   = aws_iam_role.scheduled_scaling_lambda[0].id
  policy = data.aws_iam_policy_document.scheduled_scaling_policy[0].json
}

# ============================================================================
# LAMBDA FUNCTION FOR SCHEDULED SCALING
# ============================================================================

data "archive_file" "scheduled_scaling_lambda" {
  count = var.enable_scheduled_scaling ? 1 : 0

  type        = "zip"
  output_path = "${path.module}/lambda/scheduled_scaling.zip"

  source {
    content  = <<-PYTHON
import boto3
import json
import os
from datetime import datetime

def handler(event, context):
    """
    Lambda function to scale ECS services and Aurora based on schedule.
    Triggered by EventBridge rules for cost optimization.
    """
    ecs_client = boto3.client('ecs')
    rds_client = boto3.client('rds')
    sns_client = boto3.client('sns')

    environment = os.environ['ENVIRONMENT']
    project_name = os.environ['PROJECT_NAME']
    cluster_name = os.environ.get('ECS_CLUSTER_NAME', f'{project_name}-{environment}-cluster')
    sns_topic_arn = os.environ['SNS_TOPIC_ARN']
    action = event.get('action', 'scale_down')

    results = {
        'action': action,
        'timestamp': datetime.utcnow().isoformat(),
        'services_modified': [],
        'aurora_modified': False,
        'errors': []
    }

    # Define scaling configurations
    scale_configs = {
        'scale_down': {
            'non_critical_desired': 0,
            'critical_desired': 1,
            'aurora_min_capacity': 0.5,
            'aurora_max_capacity': 2
        },
        'scale_up': {
            'non_critical_desired': 1,
            'critical_desired': 2,
            'aurora_min_capacity': 2,
            'aurora_max_capacity': 16
        }
    }

    config = scale_configs.get(action, scale_configs['scale_down'])

    # Non-critical services that can be scaled to 0
    non_critical_services = [
        'analytics-service',
        'recommendation-service',
        'report-service',
        'advertising-service',
        'partnership-service',
        'worker-service',
        'scheduler-service',
        'automation-service',
        'webhook-service'
    ]

    # Critical services that need at least 1 task
    critical_services = [
        'api-gateway',
        'auth-service',
        'user-service',
        'payment-service',
        'subscription-service',
        'realtime-service',
        'messaging-service'
    ]

    try:
        # List all services in the cluster
        paginator = ecs_client.get_paginator('list_services')
        for page in paginator.paginate(cluster=cluster_name):
            for service_arn in page['serviceArns']:
                service_name = service_arn.split('/')[-1]

                try:
                    if service_name in non_critical_services:
                        desired_count = config['non_critical_desired']
                    elif service_name in critical_services:
                        desired_count = config['critical_desired']
                    else:
                        # Default behavior for other services
                        desired_count = config['non_critical_desired']

                    ecs_client.update_service(
                        cluster=cluster_name,
                        service=service_name,
                        desiredCount=desired_count
                    )
                    results['services_modified'].append({
                        'service': service_name,
                        'desired_count': desired_count
                    })
                except Exception as e:
                    results['errors'].append(f"Error scaling {service_name}: {str(e)}")

    except Exception as e:
        results['errors'].append(f"Error listing ECS services: {str(e)}")

    # Scale Aurora Serverless (if applicable)
    aurora_cluster_id = os.environ.get('AURORA_CLUSTER_ID')
    if aurora_cluster_id:
        try:
            rds_client.modify_db_cluster(
                DBClusterIdentifier=aurora_cluster_id,
                ServerlessV2ScalingConfiguration={
                    'MinCapacity': config['aurora_min_capacity'],
                    'MaxCapacity': config['aurora_max_capacity']
                },
                ApplyImmediately=True
            )
            results['aurora_modified'] = True
            results['aurora_config'] = {
                'min_capacity': config['aurora_min_capacity'],
                'max_capacity': config['aurora_max_capacity']
            }
        except Exception as e:
            results['errors'].append(f"Error scaling Aurora: {str(e)}")

    # Send notification
    message = f"""
Scheduled Scaling Complete - {project_name} ({environment})
Action: {action.upper()}
Time: {results['timestamp']}

ECS Services Modified: {len(results['services_modified'])}
Aurora Modified: {results['aurora_modified']}

{'Errors: ' + ', '.join(results['errors']) if results['errors'] else 'No errors'}

This action was taken to optimize costs during {'off-peak' if action == 'scale_down' else 'peak'} hours.
"""

    try:
        sns_client.publish(
            TopicArn=sns_topic_arn,
            Subject=f"[{environment.upper()}] Scheduled Scaling: {action.upper()}",
            Message=message
        )
    except Exception as e:
        results['errors'].append(f"Error sending notification: {str(e)}")

    return {
        'statusCode': 200,
        'body': json.dumps(results)
    }
PYTHON
    filename = "index.py"
  }
}

resource "aws_lambda_function" "scheduled_scaling" {
  count = var.enable_scheduled_scaling ? 1 : 0

  function_name = "${var.project_name}-${var.environment}-scheduled-scaling"
  description   = "Scales ECS services and Aurora for cost optimization during off-peak hours"
  runtime       = "python3.11"
  handler       = "index.handler"
  timeout       = 300
  memory_size   = 256

  role = aws_iam_role.scheduled_scaling_lambda[0].arn

  filename         = data.archive_file.scheduled_scaling_lambda[0].output_path
  source_code_hash = data.archive_file.scheduled_scaling_lambda[0].output_base64sha256

  environment {
    variables = {
      ENVIRONMENT      = var.environment
      PROJECT_NAME     = var.project_name
      SNS_TOPIC_ARN    = aws_sns_topic.cost_anomaly_alerts.arn
      ECS_CLUSTER_NAME = var.ecs_cluster_name
      AURORA_CLUSTER_ID = var.aurora_cluster_id
    }
  }

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-scheduled-scaling"
    Purpose = "cost-management"
  })
}

# ============================================================================
# CLOUDWATCH LOG GROUP FOR LAMBDA
# ============================================================================

resource "aws_cloudwatch_log_group" "scheduled_scaling" {
  count = var.enable_scheduled_scaling ? 1 : 0

  name              = "/aws/lambda/${var.project_name}-${var.environment}-scheduled-scaling"
  retention_in_days = 7

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-scheduled-scaling-logs"
    Purpose = "cost-management"
  })
}

# ============================================================================
# EVENTBRIDGE RULES FOR SCHEDULED SCALING
# ============================================================================

# Scale Down Rule (Off-peak hours)
resource "aws_cloudwatch_event_rule" "scale_down" {
  count = var.enable_scheduled_scaling ? 1 : 0

  name                = "${var.project_name}-${var.environment}-scale-down"
  description         = "Triggers scaling down during off-peak hours for cost optimization"
  schedule_expression = var.scale_down_schedule

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-scale-down"
    Purpose = "cost-management"
  })
}

resource "aws_cloudwatch_event_target" "scale_down" {
  count = var.enable_scheduled_scaling ? 1 : 0

  rule      = aws_cloudwatch_event_rule.scale_down[0].name
  target_id = "ScaleDownLambda"
  arn       = aws_lambda_function.scheduled_scaling[0].arn

  input = jsonencode({
    action = "scale_down"
  })
}

resource "aws_lambda_permission" "scale_down" {
  count = var.enable_scheduled_scaling ? 1 : 0

  statement_id  = "AllowEventBridgeScaleDown"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduled_scaling[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.scale_down[0].arn
}

# Scale Up Rule (Peak hours)
resource "aws_cloudwatch_event_rule" "scale_up" {
  count = var.enable_scheduled_scaling ? 1 : 0

  name                = "${var.project_name}-${var.environment}-scale-up"
  description         = "Triggers scaling up during peak hours"
  schedule_expression = var.scale_up_schedule

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-scale-up"
    Purpose = "cost-management"
  })
}

resource "aws_cloudwatch_event_target" "scale_up" {
  count = var.enable_scheduled_scaling ? 1 : 0

  rule      = aws_cloudwatch_event_rule.scale_up[0].name
  target_id = "ScaleUpLambda"
  arn       = aws_lambda_function.scheduled_scaling[0].arn

  input = jsonencode({
    action = "scale_up"
  })
}

resource "aws_lambda_permission" "scale_up" {
  count = var.enable_scheduled_scaling ? 1 : 0

  statement_id  = "AllowEventBridgeScaleUp"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduled_scaling[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.scale_up[0].arn
}

# Weekend Scale Down Rule (Optional)
resource "aws_cloudwatch_event_rule" "weekend_scale_down" {
  count = var.enable_scheduled_scaling && var.enable_weekend_scaling ? 1 : 0

  name                = "${var.project_name}-${var.environment}-weekend-scale-down"
  description         = "Triggers minimal scaling during weekends for cost optimization"
  schedule_expression = var.weekend_scale_down_schedule

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-weekend-scale-down"
    Purpose = "cost-management"
  })
}

resource "aws_cloudwatch_event_target" "weekend_scale_down" {
  count = var.enable_scheduled_scaling && var.enable_weekend_scaling ? 1 : 0

  rule      = aws_cloudwatch_event_rule.weekend_scale_down[0].name
  target_id = "WeekendScaleDownLambda"
  arn       = aws_lambda_function.scheduled_scaling[0].arn

  input = jsonencode({
    action = "scale_down"
  })
}

resource "aws_lambda_permission" "weekend_scale_down" {
  count = var.enable_scheduled_scaling && var.enable_weekend_scaling ? 1 : 0

  statement_id  = "AllowEventBridgeWeekendScaleDown"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduled_scaling[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.weekend_scale_down[0].arn
}

# Weekend Scale Up Rule (Monday morning)
resource "aws_cloudwatch_event_rule" "weekend_scale_up" {
  count = var.enable_scheduled_scaling && var.enable_weekend_scaling ? 1 : 0

  name                = "${var.project_name}-${var.environment}-weekend-scale-up"
  description         = "Triggers scale up on Monday morning after weekend"
  schedule_expression = var.weekend_scale_up_schedule

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-weekend-scale-up"
    Purpose = "cost-management"
  })
}

resource "aws_cloudwatch_event_target" "weekend_scale_up" {
  count = var.enable_scheduled_scaling && var.enable_weekend_scaling ? 1 : 0

  rule      = aws_cloudwatch_event_rule.weekend_scale_up[0].name
  target_id = "WeekendScaleUpLambda"
  arn       = aws_lambda_function.scheduled_scaling[0].arn

  input = jsonencode({
    action = "scale_up"
  })
}

resource "aws_lambda_permission" "weekend_scale_up" {
  count = var.enable_scheduled_scaling && var.enable_weekend_scaling ? 1 : 0

  statement_id  = "AllowEventBridgeWeekendScaleUp"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduled_scaling[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.weekend_scale_up[0].arn
}
