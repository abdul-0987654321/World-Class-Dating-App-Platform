################################################################################
# Development Environment Configuration
# Uses Terraform modules to provision AWS infrastructure
################################################################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
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
    key            = "dev/terraform.tfstate"
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

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
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

  # 22 Microservices from the Azure infrastructure
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
    "email-service"
  ]

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
  cluster_name       = "${var.project_name}-${var.environment}-eks"

  enable_nat_gateway   = true
  single_nat_gateway   = true # Cost optimization for dev
  enable_flow_logs     = true
  enable_vpc_endpoints = true

  tags = local.common_tags
}

################################################################################
# EKS Module
################################################################################

module "eks" {
  source = "../../modules/eks"

  cluster_name    = "${var.project_name}-${var.environment}-eks"
  cluster_version = var.eks_cluster_version
  vpc_id          = module.networking.vpc_id
  subnet_ids      = module.networking.private_subnet_ids
  node_subnet_ids = module.networking.private_subnet_ids

  cluster_endpoint_private_access      = true
  cluster_endpoint_public_access       = true # Allow for dev access
  cluster_endpoint_public_access_cidrs = var.allowed_cidr_blocks

  # Cost Optimization: Use smallest viable instances, scale-to-zero capable
  node_groups = {
    general = {
      instance_types             = ["t3.medium", "t3a.medium"] # Smaller instances, multiple types for Spot availability
      capacity_type              = "SPOT"                       # 60-90% cost savings vs On-Demand
      disk_size                  = 30                           # Reduced from 50GB
      desired_size               = 0                            # Start at 0, scale up when needed
      min_size                   = 0                            # Allow scale-to-zero
      max_size                   = 3                            # Reduced max for dev
      max_unavailable_percentage = 100                          # Allow full rollover for dev
      labels = {
        role = "general"
      }
      taints = []
    }
  }

  enable_cluster_autoscaler = true
  enable_aws_lb_controller  = true
  enable_external_dns       = true
  enable_ebs_csi_driver     = true

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
  serverless_min_capacity = 0.5
  serverless_max_capacity = 4

  database_name   = "flamoral"
  master_username = "dbadmin"

  backup_retention_period = 7
  deletion_protection     = false # Allow deletion in dev
  skip_final_snapshot     = true

  eks_security_group_id = module.eks.node_security_group_id
  kms_key_arn           = module.eks.kms_key_arn

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
  node_type          = "cache.t3.micro"  # Smallest instance (~$12/month vs $49/month for medium)
  num_cache_clusters = 1                  # Single node for dev (no replication)

  automatic_failover_enabled = false  # Disabled for single-node dev
  multi_az_enabled           = false  # Cost optimization for dev

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_arn                = module.eks.kms_key_arn

  eks_security_group_id = module.eks.node_security_group_id

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
  default_kms_key_arn = module.eks.kms_key_arn

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

  deletion_protection = "INACTIVE" # Allow deletion in dev

  tags = local.common_tags
}

################################################################################
# ECR Module
################################################################################

module "ecr" {
  source = "../../modules/ecr"

  project_name        = var.project_name
  default_kms_key_arn = module.eks.kms_key_arn
  eks_node_role_arns  = [module.eks.node_iam_role_arn]

  repositories = { for service in local.microservices : service => {
    scan_on_push               = true
    image_tag_mutability       = "MUTABLE"
    keep_tagged_images         = 10 # Keep fewer images in dev
    untagged_image_expiry_days = 3
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

  default_kms_key_arn   = module.eks.kms_key_arn
  eks_oidc_provider_arn = module.eks.oidc_provider_arn
  eks_oidc_provider_url = module.eks.oidc_provider_url

  secrets = {
    database = {
      description              = "Database credentials"
      generate_random_password = true
      allow_eks_access         = true
      eks_service_accounts = [
        { namespace = "default", name = "app" }
      ]
    }
    redis = {
      description              = "Redis auth token"
      generate_random_password = true
      allow_eks_access         = true
    }
    jwt = {
      description              = "JWT signing keys"
      generate_random_password = true
      random_password_length   = 64
      allow_eks_access         = true
    }
  }

  create_external_secrets_role = true

  tags = local.common_tags
}

################################################################################
# Monitoring Module
################################################################################

module "monitoring" {
  source = "../../modules/monitoring"

  project_name        = var.project_name
  environment         = var.environment
  default_kms_key_arn = module.eks.kms_key_arn

  # Cost Optimization: Minimal logging and monitoring for dev
  log_groups = { for service in local.microservices : service => {
    retention_in_days = 3  # Minimal retention for dev (reduces CloudWatch costs)
  } }

  create_dashboard       = false  # Skip dashboard for dev
  eks_cluster_name       = module.eks.cluster_name
  rds_cluster_identifier = module.rds.aurora_cluster_id
  elasticache_cluster_id = module.elasticache.replication_group_id

  create_alarm_topic    = false  # Skip alarms for dev
  alarm_email_endpoints = []

  enable_container_insights         = false  # Disable for dev (saves ~$2-5/day)
  container_insights_retention_days = 3

  xray_sampling_rules = {
    default = {
      priority       = 1000
      reservoir_size = 1
      fixed_rate     = 0.05 # Sample 5% of requests in dev
    }
  }

  tags = local.common_tags
}
