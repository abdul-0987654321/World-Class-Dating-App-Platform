################################################################################
# Application Load Balancer Module for ECS Fargate
# Replaces Kubernetes Ingress Controller
# Supports path-based and host-based routing
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
    Module      = "ecs-alb"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  })
}

################################################################################
# Application Load Balancer
################################################################################

resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = var.internal
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.subnet_ids

  enable_deletion_protection = var.enable_deletion_protection
  enable_http2               = true
  idle_timeout               = var.idle_timeout
  drop_invalid_header_fields = true

  dynamic "access_logs" {
    for_each = var.access_logs_bucket != null ? [1] : []
    content {
      bucket  = var.access_logs_bucket
      prefix  = "${local.name_prefix}-alb"
      enabled = true
    }
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb"
  })
}

################################################################################
# Security Group for ALB
################################################################################

resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = var.vpc_id

  # HTTPS from anywhere (or specified CIDRs)
  dynamic "ingress" {
    for_each = var.enable_https ? [1] : []
    content {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = var.allowed_cidr_blocks
      description = "HTTPS from allowed sources"
    }
  }

  # HTTP (for redirect or if HTTPS is disabled)
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
    description = "HTTP from allowed sources"
  }

  # SECURITY HARDENED: ALB egress restricted to VPC only (ECS tasks)
  # ALB only needs to communicate with backend ECS tasks within the VPC
  egress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Allow outbound to ECS tasks within VPC only - SECURITY HARDENED"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

################################################################################
# HTTPS Listener (Default)
################################################################################

resource "aws_lb_listener" "https" {
  count = var.enable_https && var.certificate_arn != null ? 1 : 0

  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = var.ssl_policy
  certificate_arn   = var.certificate_arn

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "application/json"
      message_body = jsonencode({
        error   = "Not Found"
        message = "The requested service is not available"
      })
      status_code = "404"
    }
  }

  tags = local.common_tags
}

################################################################################
# HTTP Listener (Redirect to HTTPS or serve directly)
################################################################################

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = var.enable_https && var.certificate_arn != null ? "redirect" : "fixed-response"

    dynamic "redirect" {
      for_each = var.enable_https && var.certificate_arn != null ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }

    dynamic "fixed_response" {
      for_each = var.enable_https && var.certificate_arn != null ? [] : [1]
      content {
        content_type = "application/json"
        message_body = jsonencode({
          error   = "Not Found"
          message = "The requested service is not available"
        })
        status_code = "404"
      }
    }
  }

  tags = local.common_tags
}

################################################################################
# Target Groups for Services
# Each service gets its own target group
################################################################################

resource "aws_lb_target_group" "services" {
  for_each = var.services

  name                 = substr("${local.name_prefix}-${each.key}", 0, 32)
  port                 = each.value.port
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "ip"
  deregistration_delay = var.deregistration_delay

  health_check {
    enabled             = true
    healthy_threshold   = each.value.health_check.healthy_threshold
    unhealthy_threshold = each.value.health_check.unhealthy_threshold
    timeout             = each.value.health_check.timeout
    interval            = each.value.health_check.interval
    matcher             = each.value.health_check.matcher
    path                = each.value.health_check.path
    port                = "traffic-port"
    protocol            = "HTTP"
  }

  stickiness {
    type            = "lb_cookie"
    cookie_duration = var.stickiness_duration
    enabled         = var.enable_stickiness
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-${each.key}-tg"
    Service = each.key
  })

  lifecycle {
    create_before_destroy = true
  }
}

################################################################################
# Listener Rules for Path-Based Routing
################################################################################

resource "aws_lb_listener_rule" "services" {
  for_each = var.services

  listener_arn = var.enable_https && var.certificate_arn != null ? aws_lb_listener.https[0].arn : aws_lb_listener.http.arn
  priority     = each.value.priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services[each.key].arn
  }

  # Path-based routing
  dynamic "condition" {
    for_each = each.value.path_patterns != null ? [1] : []
    content {
      path_pattern {
        values = each.value.path_patterns
      }
    }
  }

  # Host-based routing (optional)
  dynamic "condition" {
    for_each = each.value.host_headers != null ? [1] : []
    content {
      host_header {
        values = each.value.host_headers
      }
    }
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-${each.key}-rule"
    Service = each.key
  })
}

################################################################################
# WAF Integration (Optional)
################################################################################

resource "aws_wafv2_web_acl_association" "main" {
  count = var.waf_acl_arn != null ? 1 : 0

  resource_arn = aws_lb.main.arn
  web_acl_arn  = var.waf_acl_arn
}

################################################################################
# CloudWatch Alarms
################################################################################

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  count = var.create_alarms ? 1 : 0

  alarm_name          = "${local.name_prefix}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 50
  alarm_description   = "ALB is returning 5XX errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "alb_target_5xx" {
  count = var.create_alarms ? 1 : 0

  alarm_name          = "${local.name_prefix}-alb-target-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "ALB targets are returning 5XX errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "alb_latency" {
  count = var.create_alarms ? 1 : 0

  alarm_name          = "${local.name_prefix}-alb-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  extended_statistic  = "p99"
  threshold           = 2
  alarm_description   = "ALB p99 latency is high"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "unhealthy_hosts" {
  for_each = var.create_alarms ? var.services : {}

  alarm_name          = "${local.name_prefix}-${each.key}-unhealthy-hosts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "Service ${each.key} has unhealthy hosts"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.services[each.key].arn_suffix
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = merge(local.common_tags, {
    Service = each.key
  })
}
