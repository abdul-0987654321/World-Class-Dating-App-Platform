################################################################################
# Production Environment Configuration - ECS Fargate
# Serverless container orchestration (replaces EKS)
################################################################################

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket         = "flamoral-terraform-state-992382449461"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

################################################################################
# Provider Configuration
################################################################################

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

################################################################################
# Local Variables
################################################################################

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    CostCenter  = var.cost_center
    Owner       = var.owner
  }

  # All microservices for the platform
  microservices = [
    "api-gateway",
    "auth-service",
    "user-service",
    "profile-service",
    "matching-service",
    "messaging-service",
    "notification-service",
    "payment-service",
    "subscription-service",
    "media-service",
    "moderation-service",
    "analytics-service",
    "recommendation-service",
    "search-service",
    "location-service",
    "verification-service",
    "report-service",
    "admin-service",
    "webhook-service",
    "scheduler-service",
    "worker-service",
    "email-service",
    "realtime-service",
    "workflow-engine",
    "automation-service",
    "advertising-service",
    "partnership-service"
  ]

  # Service configurations for ECS
  service_configs = {
    "api-gateway"          = { port = 3000, priority = 1, path = "/api/*", cpu = 256, memory = 512 }
    "auth-service"         = { port = 3001, priority = 10, path = "/api/auth/*", cpu = 256, memory = 512 }
    "user-service"         = { port = 3002, priority = 11, path = "/api/users/*", cpu = 256, memory = 512 }
    "profile-service"      = { port = 3003, priority = 12, path = "/api/profiles/*", cpu = 256, memory = 512 }
    "matching-service"     = { port = 3004, priority = 13, path = "/api/matching/*", cpu = 512, memory = 1024 }
    "messaging-service"    = { port = 3005, priority = 14, path = "/api/messages/*", cpu = 256, memory = 512 }
    "notification-service" = { port = 3006, priority = 15, path = "/api/notifications/*", cpu = 256, memory = 512 }
    "payment-service"      = { port = 3007, priority = 16, path = "/api/payments/*", cpu = 256, memory = 512 }
    "subscription-service" = { port = 3008, priority = 17, path = "/api/subscriptions/*", cpu = 256, memory = 512 }
    "media-service"        = { port = 3009, priority = 18, path = "/api/media/*", cpu = 512, memory = 1024 }
    "moderation-service"   = { port = 3010, priority = 19, path = "/api/moderation/*", cpu = 512, memory = 1024 }
    "analytics-service"    = { port = 3011, priority = 20, path = "/api/analytics/*", cpu = 256, memory = 512 }
    "recommendation-service" = { port = 3012, priority = 21, path = "/api/recommendations/*", cpu = 512, memory = 1024 }
    "search-service"       = { port = 3013, priority = 22, path = "/api/search/*", cpu = 256, memory = 512 }
    "location-service"     = { port = 3014, priority = 23, path = "/api/location/*", cpu = 256, memory = 512 }
    "verification-service" = { port = 3015, priority = 24, path = "/api/verification/*", cpu = 256, memory = 512 }
    "report-service"       = { port = 3016, priority = 25, path = "/api/reports/*", cpu = 256, memory = 512 }
    "admin-service"        = { port = 3017, priority = 26, path = "/api/admin/*", cpu = 256, memory = 512 }
    "webhook-service"      = { port = 3018, priority = 27, path = "/api/webhooks/*", cpu = 256, memory = 512 }
    "scheduler-service"    = { port = 3019, priority = 28, path = "/api/scheduler/*", cpu = 256, memory = 512 }
    "worker-service"       = { port = 3020, priority = 29, path = null, cpu = 256, memory = 512 }
    "email-service"        = { port = 3021, priority = 30, path = "/api/email/*", cpu = 256, memory = 512 }
    "realtime-service"     = { port = 3022, priority = 31, path = "/api/realtime/*", cpu = 256, memory = 512 }
    "workflow-engine"      = { port = 3023, priority = 32, path = "/api/workflows/*", cpu = 256, memory = 512 }
    "automation-service"   = { port = 3024, priority = 33, path = "/api/automation/*", cpu = 256, memory = 512 }
    "advertising-service"  = { port = 3025, priority = 34, path = "/api/advertising/*", cpu = 256, memory = 512 }
    "partnership-service"  = { port = 3026, priority = 35, path = "/api/partnerships/*", cpu = 256, memory = 512 }
  }

  # S3 bucket configurations
  s3_buckets = {
    media = {
      purpose            = "User media storage"
      versioning_enabled = true
      cors_rules = [{
        allowed_headers = ["*"]
        allowed_methods = ["GET", "PUT", "POST", "DELETE"]
        allowed_origins = var.allowed_origins
        expose_headers  = ["ETag"]
        max_age_seconds = 3600
      }]
      lifecycle_rules = [{
        id      = "media-lifecycle"
        enabled = true
        transitions = [
          { days = 90, storage_class = "STANDARD_IA" },
          { days = 365, storage_class = "GLACIER" }
        ]
      }]
    }
    backups = {
      purpose            = "Database and application backups"
      versioning_enabled = true
      lifecycle_rules = [{
        id      = "backup-lifecycle"
        enabled = true
        transitions = [
          { days = 30, storage_class = "STANDARD_IA" },
          { days = 90, storage_class = "GLACIER" }
        ]
        expiration_days = 365
      }]
    }
    logs = {
      purpose            = "Application and access logs"
      versioning_enabled = false
      lifecycle_rules = [{
        id              = "log-lifecycle"
        enabled         = true
        expiration_days = 90
      }]
    }
  }
}

################################################################################
# Networking Module
################################################################################

module "networking" {
  source = "../../modules/networking"

  project_name       = var.project_name
  environment        = var.environment
  aws_region         = var.aws_region
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  cluster_name       = "${var.project_name}-${var.environment}-ecs"

  enable_nat_gateway   = true
  single_nat_gateway   = false  # Multi-NAT for production HA
  enable_flow_logs     = true
  enable_vpc_endpoints = true

  tags = local.common_tags
}

################################################################################
# ECS Cluster Module (Replaces EKS)
################################################################################

module "ecs_cluster" {
  source = "../../modules/ecs-cluster"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.networking.vpc_id

  # Container Insights disabled for dev (cost optimization)
  enable_container_insights = true

  # Fargate Spot for cost savings in dev
  enable_fargate_spot = true
  fargate_base_count  = 2
  fargate_weight      = 2
  fargate_spot_weight = 1

  # Minimal log retention for dev
  log_retention_days = 30

  # Enable service discovery for internal communication
  enable_service_discovery = true

  tags = local.common_tags
}

################################################################################
# Security Group Rule: Allow ALB to ECS Tasks
# Created separately to avoid circular dependency
################################################################################

resource "aws_security_group_rule" "alb_to_ecs" {
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "tcp"
  source_security_group_id = module.ecs_alb.security_group_id
  security_group_id        = module.ecs_cluster.security_group_id
  description              = "Allow inbound from ALB to ECS tasks"
}

################################################################################
# Application Load Balancer for ECS (Replaces K8s Ingress)
################################################################################

module "ecs_alb" {
  source = "../../modules/ecs-alb"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.networking.vpc_id
  subnet_ids   = module.networking.public_subnet_ids

  internal                   = false
  enable_deletion_protection = true  # Protect production

  # HTTPS required for production
  enable_https    = true
  certificate_arn = var.acm_certificate_arn

  # Define services with path-based routing
  services = {
    for name, config in local.service_configs : name => {
      port     = config.port
      priority = config.priority
      path_patterns = config.path != null ? [config.path] : null
      host_headers  = null
      health_check = {
        path                = "/health"
        matcher             = "200"
        interval            = 30
        timeout             = 5
        healthy_threshold   = 2
        unhealthy_threshold = 3
      }
    } if config.path != null # Only create target groups for services with paths
  }

  # Enable alarms for production
  create_alarms = true
  alarm_actions = var.critical_alarm_actions

  tags = local.common_tags
}

################################################################################
# ECS IAM Roles (Replaces IRSA)
################################################################################

module "ecs_iam" {
  source = "../../modules/ecs-iam"

  project_name = var.project_name
  environment  = var.environment

  service_permissions = {
    "api-gateway" = {
      secrets        = ["${var.project_name}/${var.environment}/jwt"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
    }
    "auth-service" = {
      secrets            = ["${var.project_name}/${var.environment}/jwt", "${var.project_name}/${var.environment}/database"]
      ssm_parameters     = ["/${var.project_name}/${var.environment}/*"]
      cognito_user_pools = [module.cognito.user_pool_arn]
    }
    "user-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
      s3_buckets     = [module.s3.bucket_ids["media"]]
    }
    "profile-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
      s3_buckets     = [module.s3.bucket_ids["media"]]
    }
    "matching-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database", "${var.project_name}/${var.environment}/redis"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
      enable_bedrock = true
    }
    "messaging-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database", "${var.project_name}/${var.environment}/redis"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
    }
    "notification-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
      sns_topics     = ["${var.project_name}-${var.environment}-notifications"]
      enable_ses     = true
    }
    "payment-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database", "${var.project_name}/${var.environment}/stripe"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
    }
    "subscription-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database", "${var.project_name}/${var.environment}/stripe"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
    }
    "media-service" = {
      secrets            = ["${var.project_name}/${var.environment}/database"]
      ssm_parameters     = ["/${var.project_name}/${var.environment}/*"]
      s3_buckets         = [module.s3.bucket_ids["media"]]
      enable_rekognition = true
    }
    "moderation-service" = {
      secrets            = ["${var.project_name}/${var.environment}/database"]
      ssm_parameters     = ["/${var.project_name}/${var.environment}/*"]
      enable_rekognition = true
      enable_bedrock     = true
    }
    "analytics-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
    }
    "recommendation-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database", "${var.project_name}/${var.environment}/redis"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
      enable_bedrock = true
    }
    "search-service" = {
      secrets           = ["${var.project_name}/${var.environment}/database"]
      ssm_parameters    = ["/${var.project_name}/${var.environment}/*"]
      opensearch_domains = ["${var.project_name}-${var.environment}"]
    }
    "location-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database", "${var.project_name}/${var.environment}/redis"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
    }
    "verification-service" = {
      secrets            = ["${var.project_name}/${var.environment}/database"]
      ssm_parameters     = ["/${var.project_name}/${var.environment}/*"]
      s3_buckets         = [module.s3.bucket_ids["media"]]
      enable_rekognition = true
    }
    "report-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
    }
    "admin-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database", "${var.project_name}/${var.environment}/jwt"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
    }
    "webhook-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
      sqs_queues     = ["${var.project_name}-${var.environment}-webhooks"]
    }
    "scheduler-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database", "${var.project_name}/${var.environment}/redis"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
      sqs_queues     = ["${var.project_name}-${var.environment}-scheduler"]
    }
    "worker-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database", "${var.project_name}/${var.environment}/redis"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
      sqs_queues     = ["${var.project_name}-${var.environment}-jobs"]
    }
    "email-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
      enable_ses     = true
    }
    "realtime-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database", "${var.project_name}/${var.environment}/redis"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
    }
    "workflow-engine" = {
      secrets        = ["${var.project_name}/${var.environment}/database", "${var.project_name}/${var.environment}/redis"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
      sqs_queues     = ["${var.project_name}-${var.environment}-workflows"]
    }
    "automation-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database", "${var.project_name}/${var.environment}/redis"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
    }
    "advertising-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
    }
    "partnership-service" = {
      secrets        = ["${var.project_name}/${var.environment}/database"]
      ssm_parameters = ["/${var.project_name}/${var.environment}/*"]
    }
  }

  tags = local.common_tags
}

################################################################################
# RDS Module
################################################################################

module "rds" {
  source = "../../modules/rds"

  project_name         = var.project_name
  environment          = var.environment
  aws_region           = var.aws_region
  vpc_id               = module.networking.vpc_id
  db_subnet_group_name = module.networking.db_subnet_group_name

  engine_mode            = "aurora"
  engine                 = "aurora-postgresql"
  engine_version         = var.rds_engine_version
  parameter_group_family = "aurora-postgresql15"

  enable_serverless_v2    = true # Cost optimization for dev
  serverless_min_capacity = 2
  serverless_max_capacity = 16

  database_name   = "flamoral"
  master_username = "dbadmin"

  backup_retention_period = 35
  deletion_protection     = true   # Protect production
  skip_final_snapshot     = false

  # Use ECS security group instead of EKS node security group
  eks_security_group_id = module.ecs_cluster.security_group_id
  kms_key_arn           = module.ecs_cluster.kms_key_arn

  # Cost Optimization: Disable alarms for dev
  create_cloudwatch_alarms = false
  alarm_actions            = []

  tags = local.common_tags
}

################################################################################
# ElastiCache Module
################################################################################

module "elasticache" {
  source = "../../modules/elasticache"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.networking.vpc_id
  subnet_ids   = module.networking.database_subnet_ids

  # Cost Optimization: Smallest viable Redis for dev
  engine_version     = "7.0"
  node_type          = "cache.r6g.large"
  num_cache_clusters = 2

  automatic_failover_enabled = true
  multi_az_enabled           = true

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_arn                = module.ecs_cluster.kms_key_arn

  # Use ECS security group
  eks_security_group_id = module.ecs_cluster.security_group_id

  # Cost Optimization: Disable alarms for dev
  create_cloudwatch_alarms = false
  alarm_actions            = []

  tags = local.common_tags
}

################################################################################
# S3 Module
################################################################################

module "s3" {
  source = "../../modules/s3"

  project_name        = var.project_name
  environment         = var.environment
  default_kms_key_arn = module.ecs_cluster.kms_key_arn

  buckets = local.s3_buckets

  tags = local.common_tags
}

################################################################################
# Cognito Module
################################################################################

module "cognito" {
  source = "../../modules/cognito"

  project_name = var.project_name
  environment  = var.environment

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_minimum_length    = 12
  password_require_lowercase = true
  password_require_numbers   = true
  password_require_symbols   = true
  password_require_uppercase = true

  mfa_configuration = "OPTIONAL"

  user_pool_clients = {
    web = {
      generate_secret     = false
      explicit_auth_flows = ["ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_SRP_AUTH"]
      callback_urls       = var.cognito_callback_urls
      logout_urls         = var.cognito_logout_urls
    }
    mobile = {
      generate_secret     = false
      explicit_auth_flows = ["ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_SRP_AUTH"]
      callback_urls       = var.cognito_mobile_callback_urls
      logout_urls         = var.cognito_mobile_logout_urls
    }
  }

  create_identity_pool             = true
  allow_unauthenticated_identities = false

  deletion_protection = "ACTIVE"

  tags = local.common_tags
}

################################################################################
# ECR Module
################################################################################

module "ecr" {
  source = "../../modules/ecr"

  project_name        = var.project_name
  default_kms_key_arn = module.ecs_cluster.kms_key_arn

  # ECS task execution role needs pull access
  eks_node_role_arns = [module.ecs_cluster.task_execution_role_arn]

  repositories = { for service in local.microservices : service => {
    scan_on_push               = true
    image_tag_mutability       = "IMMUTABLE"
    keep_tagged_images         = 50
    untagged_image_expiry_days = 14
    allow_eks_pull             = true
  } }

  tags = local.common_tags
}

################################################################################
# Secrets Manager Module
################################################################################

module "secrets" {
  source = "../../modules/secrets"

  project_name = var.project_name
  environment  = var.environment

  default_kms_key_arn = module.ecs_cluster.kms_key_arn

  # Remove EKS OIDC references - ECS uses task roles directly
  eks_oidc_provider_arn = null
  eks_oidc_provider_url = null

  secrets = {
    database = {
      description              = "Database credentials"
      generate_random_password = true
      allow_eks_access         = false
    }
    redis = {
      description              = "Redis auth token"
      generate_random_password = true
      allow_eks_access         = false
    }
    jwt = {
      description              = "JWT signing keys"
      generate_random_password = true
      random_password_length   = 64
      allow_eks_access         = false
    }
    stripe = {
      description      = "Stripe API keys"
      allow_eks_access = false
    }
    firebase = {
      description      = "Firebase credentials"
      allow_eks_access = false
    }
  }

  create_external_secrets_role = false # Not needed for ECS

  tags = local.common_tags
}

################################################################################
# Monitoring Module
################################################################################

module "monitoring" {
  source = "../../modules/monitoring"

  project_name        = var.project_name
  environment         = var.environment
  default_kms_key_arn = module.ecs_cluster.kms_key_arn

  # Cost Optimization: Minimal logging and monitoring for dev
  log_groups = { for service in local.microservices : service => {
    retention_in_days = 30
  } }

  create_dashboard       = true
  eks_cluster_name       = null # No EKS cluster
  rds_cluster_identifier = module.rds.aurora_cluster_id
  elasticache_cluster_id = module.elasticache.replication_group_id

  create_alarm_topic    = true
  alarm_email_endpoints = []

  enable_container_insights         = true
  container_insights_retention_days = 30

  xray_sampling_rules = {
    default = {
      priority       = 1000
      reservoir_size = 10
      fixed_rate     = 0.01
    }
  }

  tags = local.common_tags
}

################################################################################
# Outputs
################################################################################

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs_cluster.cluster_name
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = module.ecs_cluster.cluster_arn
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.ecs_alb.alb_dns_name
}

output "service_discovery_namespace" {
  description = "Service discovery namespace"
  value       = module.ecs_cluster.service_discovery_namespace_name
}

output "rds_endpoint" {
  description = "RDS cluster endpoint"
  value       = module.rds.aurora_cluster_endpoint
  sensitive   = true
}

output "elasticache_endpoint" {
  description = "ElastiCache primary endpoint"
  value       = module.elasticache.primary_endpoint_address
  sensitive   = true
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "ecr_repository_urls" {
  description = "ECR repository URLs for all services"
  value       = module.ecr.repository_urls
}

output "target_group_arns" {
  description = "Map of service names to target group ARNs for ECS service deployment"
  value       = module.ecs_alb.target_group_arns
}

output "task_role_arns" {
  description = "Map of service names to task role ARNs"
  value       = module.ecs_iam.task_role_arns
}
