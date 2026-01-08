################################################################################
# ECS Fargate Cluster Module
# Serverless container orchestration - replaces EKS
# Cost-optimized with Fargate Spot support
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
  kms_key_arn = var.kms_key_arn != null ? var.kms_key_arn : (var.create_kms_key ? aws_kms_key.main[0].arn : null)

  common_tags = merge(var.tags, {
    Module      = "ecs-cluster"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  })
}

################################################################################
# KMS Key for Encryption
################################################################################

resource "aws_kms_key" "main" {
  count = var.kms_key_arn == null && var.create_kms_key ? 1 : 0

  description             = "KMS key for ${local.name_prefix} ECS cluster encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow CloudWatch Logs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${data.aws_region.current.name}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt*",
          "kms:Decrypt*",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:Describe*"
        ]
        Resource = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:*"
          }
        }
      },
      {
        Sid    = "Allow ECS Tasks"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow Secrets Manager"
        Effect = "Allow"
        Principal = {
          Service = "secretsmanager.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-kms-key"
  })
}

resource "aws_kms_alias" "main" {
  count = var.kms_key_arn == null && var.create_kms_key ? 1 : 0

  name          = "alias/${local.name_prefix}-ecs"
  target_key_id = aws_kms_key.main[0].key_id
}

################################################################################
# ECS Cluster
################################################################################

resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = var.enable_container_insights ? "enabled" : "disabled"
  }

  configuration {
    execute_command_configuration {
      kms_key_id = local.kms_key_arn
      logging    = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = local.kms_key_arn != null
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs_exec.name
      }
    }
  }

  tags = local.common_tags
}

################################################################################
# Cluster Capacity Providers (Fargate + Fargate Spot)
################################################################################

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = var.fargate_base_count
    weight            = var.fargate_weight
    capacity_provider = "FARGATE"
  }

  dynamic "default_capacity_provider_strategy" {
    for_each = var.enable_fargate_spot ? [1] : []
    content {
      weight            = var.fargate_spot_weight
      capacity_provider = "FARGATE_SPOT"
    }
  }
}

################################################################################
# CloudWatch Log Groups
################################################################################

resource "aws_cloudwatch_log_group" "ecs_exec" {
  name              = "/ecs/${local.name_prefix}/exec-logs"
  retention_in_days = var.log_retention_days
  kms_key_id        = local.kms_key_arn

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-ecs-exec-logs"
  })

  depends_on = [aws_kms_key.main]
}

resource "aws_cloudwatch_log_group" "ecs_cluster" {
  name              = "/ecs/${local.name_prefix}/cluster"
  retention_in_days = var.log_retention_days
  kms_key_id        = local.kms_key_arn

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-ecs-cluster-logs"
  })

  depends_on = [aws_kms_key.main]
}

################################################################################
# Service Discovery Namespace (for internal service communication)
################################################################################

resource "aws_service_discovery_private_dns_namespace" "main" {
  count = var.enable_service_discovery ? 1 : 0

  name        = "${var.environment}.${var.project_name}.local"
  description = "Service discovery namespace for ${local.name_prefix}"
  vpc         = var.vpc_id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-service-discovery"
  })
}

################################################################################
# IAM Role for ECS Task Execution
################################################################################

resource "aws_iam_role" "ecs_task_execution" {
  name = "${local.name_prefix}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional policy for Secrets Manager and SSM Parameter Store
resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name = "${local.name_prefix}-ecs-task-execution-secrets"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}/${var.environment}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ]
        Resource = [
          "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = local.kms_key_arn != null ? [local.kms_key_arn] : []
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${data.aws_region.current.name}.amazonaws.com"
          }
        }
      }
    ]
  })
}

################################################################################
# Default Task Role (services can override with their own)
################################################################################

resource "aws_iam_role" "ecs_task_default" {
  name = "${local.name_prefix}-ecs-task-default"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# Basic permissions for default task role
resource "aws_iam_role_policy" "ecs_task_default" {
  name = "${local.name_prefix}-ecs-task-default-policy"
  role = aws_iam_role.ecs_task_default.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.ecs_cluster.arn}:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ]
        Resource = [
          "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ]
        Resource = "*"
      }
    ]
  })
}

################################################################################
# Security Group for ECS Tasks
################################################################################

resource "aws_security_group" "ecs_tasks" {
  name        = "${local.name_prefix}-ecs-tasks"
  description = "Security group for ECS Fargate tasks"
  vpc_id      = var.vpc_id

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-ecs-tasks-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Allow inbound from ALB
resource "aws_security_group_rule" "ecs_tasks_from_alb" {
  count = var.alb_security_group_id != null ? 1 : 0

  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "tcp"
  source_security_group_id = var.alb_security_group_id
  security_group_id        = aws_security_group.ecs_tasks.id
  description              = "Allow inbound from ALB"
}

# Allow inter-service communication within ECS tasks
resource "aws_security_group_rule" "ecs_tasks_self" {
  type              = "ingress"
  from_port         = 0
  to_port           = 65535
  protocol          = "tcp"
  self              = true
  security_group_id = aws_security_group.ecs_tasks.id
  description       = "Allow inter-service communication"
}
