################################################################################
# AWS CodeDeploy Module for ECS Blue/Green Deployments
# Provides canary deployment with automatic rollback
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
    Module      = "codedeploy"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  })
}

################################################################################
# CodeDeploy Application
################################################################################

resource "aws_codedeploy_app" "ecs" {
  name             = "${local.name_prefix}-ecs"
  compute_platform = "ECS"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-ecs-codedeploy"
  })
}

################################################################################
# IAM Role for CodeDeploy
################################################################################

resource "aws_iam_role" "codedeploy" {
  name = "${local.name_prefix}-codedeploy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codedeploy.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-codedeploy-role"
  })
}

resource "aws_iam_role_policy_attachment" "codedeploy_ecs" {
  role       = aws_iam_role.codedeploy.name
  policy_arn = "arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS"
}

# Additional permissions for SNS notifications
resource "aws_iam_role_policy" "codedeploy_sns" {
  count = var.notification_topic_arn != null ? 1 : 0

  name = "${local.name_prefix}-codedeploy-sns"
  role = aws_iam_role.codedeploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sns:Publish"]
      Resource = [var.notification_topic_arn]
    }]
  })
}

################################################################################
# CodeDeploy Deployment Group
################################################################################

resource "aws_codedeploy_deployment_group" "ecs" {
  app_name               = aws_codedeploy_app.ecs.name
  deployment_group_name  = "${local.name_prefix}-dg"
  service_role_arn       = aws_iam_role.codedeploy.arn
  deployment_config_name = var.deployment_config_name

  # ECS Service Configuration
  ecs_service {
    cluster_name = var.ecs_cluster_name
    service_name = var.ecs_service_name
  }

  # Load Balancer Configuration for Blue/Green
  load_balancer_info {
    target_group_pair_info {
      prod_traffic_route {
        listener_arns = [var.prod_listener_arn]
      }

      dynamic "test_traffic_route" {
        for_each = var.test_listener_arn != null ? [1] : []
        content {
          listener_arns = [var.test_listener_arn]
        }
      }

      target_group {
        name = var.blue_target_group_name
      }

      target_group {
        name = var.green_target_group_name
      }
    }
  }

  # Automatic Rollback Configuration
  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE", "DEPLOYMENT_STOP_ON_ALARM"]
  }

  # Alarm Configuration for Auto-Rollback
  dynamic "alarm_configuration" {
    for_each = length(var.rollback_alarm_names) > 0 ? [1] : []
    content {
      enabled                   = true
      alarms                    = var.rollback_alarm_names
      ignore_poll_alarm_failure = false
    }
  }

  # Blue/Green Deployment Configuration
  blue_green_deployment_config {
    deployment_ready_option {
      action_on_timeout    = var.deployment_ready_wait_time_in_minutes > 0 ? "STOP_DEPLOYMENT" : "CONTINUE_DEPLOYMENT"
      wait_time_in_minutes = var.deployment_ready_wait_time_in_minutes
    }

    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = var.termination_wait_time_in_minutes
    }
  }

  # Deployment Style
  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-deployment-group"
  })
}

################################################################################
# SNS Topic for Deployment Notifications (Optional)
################################################################################

resource "aws_sns_topic" "deployment_notifications" {
  count = var.create_notification_topic ? 1 : 0

  name = "${local.name_prefix}-deployment-notifications"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-deployment-notifications"
  })
}

resource "aws_sns_topic_subscription" "deployment_email" {
  for_each = var.create_notification_topic ? toset(var.notification_emails) : toset([])

  topic_arn = aws_sns_topic.deployment_notifications[0].arn
  protocol  = "email"
  endpoint  = each.value
}

################################################################################
# CodeDeploy Trigger for Notifications
################################################################################

resource "aws_codedeploy_deployment_group" "trigger" {
  count = var.create_notification_topic && length(var.notification_emails) > 0 ? 0 : 0

  # This is handled within the main deployment group
  # Keeping for reference - triggers are deprecated in favor of SNS topics
  app_name              = aws_codedeploy_app.ecs.name
  deployment_group_name = "${local.name_prefix}-dg-trigger"
  service_role_arn      = aws_iam_role.codedeploy.arn

  ecs_service {
    cluster_name = var.ecs_cluster_name
    service_name = var.ecs_service_name
  }

  load_balancer_info {
    target_group_pair_info {
      prod_traffic_route {
        listener_arns = [var.prod_listener_arn]
      }

      target_group {
        name = var.blue_target_group_name
      }

      target_group {
        name = var.green_target_group_name
      }
    }
  }

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  tags = local.common_tags
}

################################################################################
# Custom Deployment Configurations
################################################################################

resource "aws_codedeploy_deployment_config" "canary_10_percent_5_minutes" {
  count = var.create_custom_deployment_config ? 1 : 0

  deployment_config_name = "${local.name_prefix}-canary-10-5"
  compute_platform       = "ECS"

  traffic_routing_config {
    type = "TimeBasedCanary"

    time_based_canary {
      interval   = 5
      percentage = 10
    }
  }
}

resource "aws_codedeploy_deployment_config" "canary_25_percent_5_minutes" {
  count = var.create_custom_deployment_config ? 1 : 0

  deployment_config_name = "${local.name_prefix}-canary-25-5"
  compute_platform       = "ECS"

  traffic_routing_config {
    type = "TimeBasedCanary"

    time_based_canary {
      interval   = 5
      percentage = 25
    }
  }
}

resource "aws_codedeploy_deployment_config" "linear_10_percent_1_minute" {
  count = var.create_custom_deployment_config ? 1 : 0

  deployment_config_name = "${local.name_prefix}-linear-10-1"
  compute_platform       = "ECS"

  traffic_routing_config {
    type = "TimeBasedLinear"

    time_based_linear {
      interval   = 1
      percentage = 10
    }
  }
}
