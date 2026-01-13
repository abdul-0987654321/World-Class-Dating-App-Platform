################################################################################
# ECS Module - Wrapper for ECS Cluster, ALB, ECR, and Services
# Provides a simplified interface for environment configurations
################################################################################

module "ecs_cluster" {
  source = "../ecs-cluster"

  project_name = var.project
  environment  = var.environment
  vpc_id       = var.vpc_id
  vpc_cidr     = "10.0.0.0/16"

  enable_container_insights = true
  enable_fargate_spot       = var.environment != "prod"
  enable_service_discovery  = true

  tags = {
    Module = "ecs-wrapper"
  }
}

module "alb" {
  source = "../ecs-alb"

  project_name      = var.project
  environment       = var.environment
  vpc_id            = var.vpc_id
  public_subnet_ids = var.public_subnet_ids

  enable_https    = false  # Certificate should be configured separately
  certificate_arn = null

  # Define default services for target groups
  services = {
    api-gateway = {
      port              = 3000
      health_check_path = "/health"
      priority          = 100
      path_pattern      = "/api/*"
    }
    user-service = {
      port              = 3002
      health_check_path = "/health"
      priority          = 200
      path_pattern      = "/api/users/*"
    }
  }

  tags = {
    Module = "ecs-wrapper"
  }
}

module "ecr" {
  source = "../ecr"

  project_name = var.project
  environment  = var.environment

  repositories = [
    "api-gateway",
    "user-service",
    "matching-service",
    "messaging-service",
    "notification-service",
    "moderation-service"
  ]

  tags = {
    Module = "ecs-wrapper"
  }
}
