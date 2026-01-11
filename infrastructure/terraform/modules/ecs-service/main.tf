################################################################################
# ECS Fargate Service Module
# Reusable module for deploying containerized microservices
# Supports auto-scaling, service discovery, and ALB integration
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
  name_prefix  = "${var.project_name}-${var.environment}"
  service_name = "${local.name_prefix}-${var.service_name}"

  common_tags = merge(var.tags, {
    Module      = "ecs-service"
    Environment = var.environment
    Project     = var.project_name
    Service     = var.service_name
    ManagedBy   = "terraform"
  })

  # Container definition
  container_definition = {
    name      = var.service_name
    image     = "${var.ecr_repository_url}:${var.image_tag}"
    essential = true

    portMappings = [
      {
        containerPort = var.container_port
        hostPort      = var.container_port
        protocol      = "tcp"
      }
    ]

    environment = [
      for k, v in var.environment_variables : {
        name  = k
        value = v
      }
    ]

    secrets = [
      for k, v in var.secrets : {
        name      = k
        valueFrom = v
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.service.name
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = var.service_name
      }
    }

    healthCheck = var.container_health_check != null ? {
      command     = var.container_health_check.command
      interval    = var.container_health_check.interval
      timeout     = var.container_health_check.timeout
      retries     = var.container_health_check.retries
      startPeriod = var.container_health_check.start_period
    } : null

    # SECURITY: Container hardening settings
    # No privileged mode - containers run without elevated privileges
    privileged = false

    # SECURITY: Read-only root filesystem - prevents container modifications
    # Applications should write to mounted volumes only (e.g., /tmp, /var/log)
    readonlyRootFilesystem = var.readonly_root_filesystem

    linuxParameters = {
      initProcessEnabled = true
      # SECURITY: Drop all Linux capabilities by default (least privilege)
      capabilities = {
        drop = ["ALL"]
        add  = var.container_capabilities
      }
    }

    # SECURITY: Run container as non-root user when specified
    user = var.container_user

    stopTimeout = var.stop_timeout
  }
}

################################################################################
# CloudWatch Log Group
################################################################################

resource "aws_cloudwatch_log_group" "service" {
  name              = "/ecs/${local.name_prefix}/${var.service_name}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name = "${local.service_name}-logs"
  })
}

################################################################################
# ECS Task Definition
################################################################################

resource "aws_ecs_task_definition" "main" {
  family                   = local.service_name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.task_execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([local.container_definition])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = var.cpu_architecture
  }

  tags = local.common_tags
}

################################################################################
# ECS Service
################################################################################

resource "aws_ecs_service" "main" {
  name            = var.service_name
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.main.arn
  desired_count   = var.desired_count

  # Fargate launch type with capacity provider strategy
  capacity_provider_strategy {
    capacity_provider = var.use_fargate_spot ? "FARGATE_SPOT" : "FARGATE"
    weight            = var.use_fargate_spot ? 0 : 1
    base              = var.use_fargate_spot ? 0 : var.desired_count
  }

  dynamic "capacity_provider_strategy" {
    for_each = var.use_fargate_spot ? [1] : []
    content {
      capacity_provider = "FARGATE_SPOT"
      weight            = 1
      base              = 0
    }
  }

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = var.assign_public_ip
  }

  # Load balancer configuration
  dynamic "load_balancer" {
    for_each = var.target_group_arn != null ? [1] : []
    content {
      target_group_arn = var.target_group_arn
      container_name   = var.service_name
      container_port   = var.container_port
    }
  }

  # Service discovery
  dynamic "service_registries" {
    for_each = var.service_discovery_arn != null ? [1] : []
    content {
      registry_arn   = var.service_discovery_arn
      container_name = var.service_name
      container_port = var.container_port
    }
  }

  # Deployment configuration
  deployment_minimum_healthy_percent = var.deployment_minimum_healthy_percent
  deployment_maximum_percent         = var.deployment_maximum_percent
  health_check_grace_period_seconds  = var.target_group_arn != null ? var.health_check_grace_period : null

  deployment_circuit_breaker {
    enable   = var.enable_circuit_breaker
    rollback = var.enable_circuit_breaker_rollback
  }

  # Platform version
  platform_version = var.platform_version

  # Propagate tags from service to tasks
  propagate_tags = "SERVICE"

  # Enable ECS Exec for debugging
  enable_execute_command = var.enable_execute_command

  tags = local.common_tags

  lifecycle {
    ignore_changes = [
      desired_count,   # Managed by auto-scaling
      task_definition, # Updated by CI/CD
    ]
  }

  depends_on = [
    aws_cloudwatch_log_group.service
  ]
}

################################################################################
# Service Discovery Registration
################################################################################

resource "aws_service_discovery_service" "main" {
  count = var.service_discovery_namespace_id != null ? 1 : 0

  name = var.service_name

  dns_config {
    namespace_id = var.service_discovery_namespace_id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = local.common_tags
}

################################################################################
# Auto Scaling
################################################################################

resource "aws_appautoscaling_target" "main" {
  count = var.enable_autoscaling ? 1 : 0

  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${var.cluster_name}/${aws_ecs_service.main.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# CPU-based scaling
resource "aws_appautoscaling_policy" "cpu" {
  count = var.enable_autoscaling ? 1 : 0

  name               = "${local.service_name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.main[0].resource_id
  scalable_dimension = aws_appautoscaling_target.main[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.main[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.cpu_target_value
    scale_in_cooldown  = var.scale_in_cooldown
    scale_out_cooldown = var.scale_out_cooldown
  }
}

# Memory-based scaling
resource "aws_appautoscaling_policy" "memory" {
  count = var.enable_autoscaling && var.enable_memory_scaling ? 1 : 0

  name               = "${local.service_name}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.main[0].resource_id
  scalable_dimension = aws_appautoscaling_target.main[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.main[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.memory_target_value
    scale_in_cooldown  = var.scale_in_cooldown
    scale_out_cooldown = var.scale_out_cooldown
  }
}

# Request count scaling (for ALB-integrated services)
resource "aws_appautoscaling_policy" "requests" {
  count = var.enable_autoscaling && var.enable_request_scaling && var.alb_arn_suffix != null ? 1 : 0

  name               = "${local.service_name}-request-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.main[0].resource_id
  scalable_dimension = aws_appautoscaling_target.main[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.main[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${var.alb_arn_suffix}/${var.target_group_arn_suffix}"
    }
    target_value       = var.request_count_target
    scale_in_cooldown  = var.scale_in_cooldown
    scale_out_cooldown = var.scale_out_cooldown
  }
}

################################################################################
# CloudWatch Alarms
################################################################################

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  count = var.create_alarms ? 1 : 0

  alarm_name          = "${local.service_name}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "ECS service ${var.service_name} CPU utilization is high"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = aws_ecs_service.main.name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "memory_high" {
  count = var.create_alarms ? 1 : 0

  alarm_name          = "${local.service_name}-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "ECS service ${var.service_name} memory utilization is high"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = aws_ecs_service.main.name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "running_task_count" {
  count = var.create_alarms ? 1 : 0

  alarm_name          = "${local.service_name}-running-tasks-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Average"
  threshold           = var.min_capacity
  alarm_description   = "ECS service ${var.service_name} has fewer running tasks than minimum"
  treat_missing_data  = "breaching"

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = aws_ecs_service.main.name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}
