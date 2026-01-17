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

  project_name = var.project
  environment  = var.environment
  vpc_id       = var.vpc_id
  subnet_ids   = var.public_subnet_ids
  vpc_cidr     = var.vpc_cidr

  enable_https    = false  # Certificate should be configured separately
  certificate_arn = null

  # Define default services for target groups
  services = {
    api-gateway = {
      port     = 4000
      priority = 100
      path_patterns = ["/api/*"]
      health_check = {
        path                = "/api/v1/health"
        matcher             = "200"
        interval            = 30
        timeout             = 5
        healthy_threshold   = 2
        unhealthy_threshold = 3
      }
    }
    user-service = {
      port     = 3002
      priority = 200
      path_patterns = ["/api/users/*"]
      health_check = {
        path                = "/health"
        matcher             = "200"
        interval            = 30
        timeout             = 5
        healthy_threshold   = 2
        unhealthy_threshold = 3
      }
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
