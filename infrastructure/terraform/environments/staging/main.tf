################################################################################
# Staging Environment Configuration
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
    key            = "staging/terraform.tfstate"
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
      enable_acl         = true  # Required for CloudFront logging
      use_kms_encryption = false # CloudFront logs require AES256 encryption
      lifecycle_rules = [{
        id              = "log-lifecycle"
        enabled         = true
        expiration_days = 180
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
  single_nat_gateway   = true # Cost optimization: Single NAT (saves ~$65/month, fits EIP quota)
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
  cluster_endpoint_public_access       = true
  cluster_endpoint_public_access_cidrs = var.allowed_cidr_blocks

  # Cost Optimization: Use smaller instances with scale-to-zero capability
  node_groups = {
    general = {
      instance_types             = ["t3.medium", "t3a.medium"] # Smaller instances
      capacity_type              = "SPOT"                      # Use Spot for staging too
      disk_size                  = 50                          # Reduced disk
      desired_size               = 0                           # Start at 0
      min_size                   = 0                           # Allow scale-to-zero
      max_size                   = 5                           # Reduced max
      max_unavailable_percentage = 50
      labels = {
        role = "general"
      }
      taints = []
    }
    spot = {
      instance_types             = ["t3.large", "t3a.large", "m5.large"]
      capacity_type              = "SPOT"
      disk_size                  = 50
      desired_size               = 0
      min_size                   = 0
      max_size                   = 5
      max_unavailable_percentage = 100
      labels = {
        role = "spot"
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

  # Cost Optimization: Use Serverless v2 instead of provisioned instances
  enable_serverless_v2    = true
  serverless_min_capacity = 0.5 # Minimum ACU (scales to zero-ish)
  serverless_max_capacity = 4   # Max ACU for staging

  database_name   = "flamoral"
  master_username = "dbadmin"

  backup_retention_period = 7     # Reduced from 14 days
  deletion_protection     = false # Allow deletion in staging
  skip_final_snapshot     = true

  eks_security_group_id = module.eks.node_security_group_id
  kms_key_arn           = module.eks.kms_key_arn

  create_cloudwatch_alarms = false # Disable alarms for staging
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

  # Cost Optimization: Smaller Redis instance
  engine_version     = "7.0"
  node_type          = "cache.t3.small" # ~$24/month vs ~$130/month for r6g.large
  num_cache_clusters = 1                # Single node for staging

  automatic_failover_enabled = false # Disabled for single node
  multi_az_enabled           = false # Cost optimization

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_arn                = module.eks.kms_key_arn

  eks_security_group_id = module.eks.node_security_group_id

  create_cloudwatch_alarms = false # Disable alarms for staging
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

  deletion_protection = "INACTIVE" # Allow deletion in staging

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
    image_tag_mutability       = "IMMUTABLE" # Immutable tags in staging
    keep_tagged_images         = 20
    untagged_image_expiry_days = 7
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
    stripe = {
      description      = "Stripe API keys"
      allow_eks_access = true
    }
    firebase = {
      description      = "Firebase credentials"
      allow_eks_access = true
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

  # Cost Optimization: Reduced logging and monitoring for staging
  log_groups = { for service in local.microservices : service => {
    retention_in_days = 7 # Reduced from 30 days
  } }

  create_dashboard       = false # Skip dashboard for staging
  eks_cluster_name       = module.eks.cluster_name
  rds_cluster_identifier = module.rds.aurora_cluster_id
  elasticache_cluster_id = module.elasticache.replication_group_id

  create_alarm_topic    = false # Disable alarms for staging
  alarm_email_endpoints = []

  enable_container_insights         = false # Disable for staging
  container_insights_retention_days = 7

  xray_sampling_rules = {
    default = {
      priority       = 1000
      reservoir_size = 5
      fixed_rate     = 0.1 # Sample 10% of requests in staging
    }
  }

  tags = local.common_tags
}
