################################################################################
# Production Environment Configuration
# AWS-only infrastructure - No Azure providers allowed
################################################################################

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
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

  # Assume role for production (if using cross-account)
  dynamic "assume_role" {
    for_each = var.assume_role_arn != null ? [1] : []
    content {
      role_arn = var.assume_role_arn
    }
  }

  default_tags {
    tags = local.common_tags
  }
}

# Secondary region provider for disaster recovery
provider "aws" {
  alias  = "dr"
  region = var.dr_region

  dynamic "assume_role" {
    for_each = var.assume_role_arn != null ? [1] : []
    content {
      role_arn = var.assume_role_arn
    }
  }

  default_tags {
    tags = local.common_tags
  }
}

# us-east-1 provider for CloudFront/ACM
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

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

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
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
    "email-service"
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
        expiration_days = 730 # 2 years
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
        expiration_days = 365
      }]
    }
  }

  # Queue definitions for messaging
  queues = {
    matching = {
      purpose         = "Match processing queue"
      alarm_threshold = 1000
    }
    notification = {
      purpose         = "Push notification queue"
      alarm_threshold = 500
    }
    analytics = {
      purpose         = "Analytics events queue"
      alarm_threshold = 5000
    }
    moderation = {
      purpose         = "Content moderation queue"
      alarm_threshold = 200
    }
    media-processing = {
      purpose                    = "Media processing queue"
      visibility_timeout_seconds = 300
      alarm_threshold            = 100
    }
    email = {
      purpose         = "Email delivery queue"
      alarm_threshold = 500
    }
    sms = {
      purpose         = "SMS delivery queue"
      alarm_threshold = 200
    }
  }

  # Topic definitions for pub/sub
  topics = {
    user-events = {
      purpose      = "User lifecycle events"
      display_name = "User Events"
    }
    match-events = {
      purpose      = "Match and like events"
      display_name = "Match Events"
    }
    message-events = {
      purpose      = "Chat message events"
      display_name = "Message Events"
    }
    payment-events = {
      purpose      = "Payment and subscription events"
      display_name = "Payment Events"
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
  single_nat_gateway   = true  # Temporarily single NAT due to EIP quota limit (5 max, 4 used by dev/staging)
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
  cluster_endpoint_public_access       = false # Private only in production
  cluster_endpoint_public_access_cidrs = []

  # Cost Optimization Best Practices for Production:
  # 1. Use Savings Plans for predictable workloads (up to 72% savings)
  # 2. Use Spot for fault-tolerant workloads (up to 90% savings)
  # 3. Right-size instances based on actual usage metrics
  # 4. Scale to zero during off-peak hours (if applicable)
  node_groups = {
    system = {
      instance_types             = ["t3.large", "t3a.large"]  # Cost-effective for system workloads
      capacity_type              = "ON_DEMAND"                 # Keep On-Demand for reliability
      disk_size                  = 50                          # Reduced from 100GB
      desired_size               = 2                           # Reduced from 3
      min_size                   = 2                           # Minimum for HA
      max_size                   = 4
      max_unavailable_percentage = 50
      labels = {
        role = "system"
      }
      taints = [
        {
          key    = "CriticalAddonsOnly"
          value  = "true"
          effect = "PREFER_NO_SCHEDULE"
        }
      ]
    }
    application = {
      instance_types             = ["t3.xlarge", "t3a.xlarge", "m5.large"]  # Mix of cost-effective instances
      capacity_type              = "SPOT"                                    # Use Spot for app workloads
      disk_size                  = 50
      desired_size               = 2                                         # Start small, autoscale up
      min_size                   = 0                                         # Allow scale-to-zero
      max_size                   = 10
      max_unavailable_percentage = 50
      labels = {
        role = "application"
      }
      taints = []
    }
    spot = {
      instance_types             = ["m5.large", "m5a.large", "m6i.large", "m6a.large"]
      capacity_type              = "SPOT"
      disk_size                  = 50
      desired_size               = 0                           # Start at 0, scale on demand
      min_size                   = 0
      max_size                   = 10
      max_unavailable_percentage = 100
      labels = {
        role = "spot"
      }
      taints = [
        {
          key    = "spot"
          value  = "true"
          effect = "PREFER_NO_SCHEDULE"
        }
      ]
    }
    # GPU nodes commented out - enable only when needed for ML/AI workloads
    # Each g4dn.xlarge costs ~$380/month On-Demand
    # gpu = {
    #   instance_types             = ["g4dn.xlarge"]
    #   capacity_type              = "SPOT"  # Use Spot for GPU to save ~60%
    #   disk_size                  = 100
    #   desired_size               = 0
    #   min_size                   = 0
    #   max_size                   = 2
    #   max_unavailable_percentage = 100
    #   labels = {
    #     role             = "gpu"
    #     "nvidia.com/gpu" = "true"
    #   }
    #   taints = [
    #     {
    #       key    = "nvidia.com/gpu"
    #       value  = "true"
    #       effect = "NO_SCHEDULE"
    #     }
    #   ]
    # }
  }

  enable_cluster_autoscaler = true
  enable_aws_lb_controller  = true
  enable_external_dns       = true
  enable_ebs_csi_driver     = true

  tags = local.common_tags
}

################################################################################
# RDS Module (Aurora PostgreSQL)
# Cost Optimization: Aurora Serverless v2 scales automatically (0.5-16 ACU)
# This saves significant cost during low-traffic periods while scaling for peaks
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

  # Cost Optimization: Use Aurora Serverless v2 instead of provisioned instances
  # - Provisioned db.r6g.xlarge x 3: ~$1,200/month minimum
  # - Serverless v2 (0.5-16 ACU): ~$87/month at minimum, scales as needed
  enable_serverless_v2    = true
  serverless_min_capacity = 0.5   # Minimum ACU (cost savings during low traffic)
  serverless_max_capacity = 16    # Max ACU for production peaks

  # Fallback: If not using Serverless, use smaller provisioned instances
  # instance_class = "db.r6g.large"    # 50% cheaper than xlarge
  # instance_count = 2                  # 1 writer + 1 reader

  database_name   = "flamoral"
  master_username = "dbadmin"

  backup_retention_period      = 14        # Reduced from 35 (still sufficient for prod)
  deletion_protection          = true
  skip_final_snapshot          = false
  preferred_backup_window      = "03:00-04:00"
  preferred_maintenance_window = "sun:04:00-sun:05:00"

  # Performance Insights - keep enabled for prod troubleshooting
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  # Enhanced Monitoring - reduce interval to save costs
  monitoring_interval = 60

  eks_security_group_id = module.eks.node_security_group_id
  kms_key_arn           = module.eks.kms_key_arn

  create_cloudwatch_alarms = true
  alarm_actions            = [module.monitoring.sns_topic_arn]

  tags = local.common_tags
}

################################################################################
# ElastiCache Module (Redis)
# Cost Optimization: Right-sized for typical Flamoral app workload
################################################################################

module "elasticache" {
  source = "../../modules/elasticache"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.networking.vpc_id
  subnet_ids   = module.networking.database_subnet_ids

  # Cost Optimization: Right-size Redis for actual workload
  # - cache.r6g.xlarge x 3: ~$1,200/month
  # - cache.r6g.large x 2: ~$400/month (67% savings)
  # Can scale up if metrics show need for more capacity
  engine_version     = "7.0"
  node_type          = "cache.r6g.large"   # Reduced from xlarge (~$200/month each)
  num_cache_clusters = 2                    # Reduced from 3 (1 primary + 1 replica)

  automatic_failover_enabled = true         # Keep for HA
  multi_az_enabled           = true         # Keep for HA

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_arn                = module.eks.kms_key_arn

  snapshot_retention_limit = 3              # Reduced from 7 (save storage costs)
  snapshot_window          = "02:00-03:00"
  maintenance_window       = "sun:03:00-sun:04:00"

  eks_security_group_id = module.eks.node_security_group_id

  create_cloudwatch_alarms = true
  alarm_actions            = [module.monitoring.sns_topic_arn]

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

  mfa_configuration = "ON" # Required in production

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
  default_kms_key_arn = module.eks.kms_key_arn
  eks_node_role_arns  = [module.eks.node_iam_role_arn]

  repositories = { for service in local.microservices : service => {
    scan_on_push               = true
    image_tag_mutability       = "IMMUTABLE" # Enforce immutable tags in prod
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

  default_kms_key_arn   = module.eks.kms_key_arn
  eks_oidc_provider_arn = module.eks.oidc_provider_arn
  eks_oidc_provider_url = module.eks.oidc_provider_url

  secrets = {
    database = {
      description              = "Database credentials"
      generate_random_password = true
      random_password_length   = 32
      allow_eks_access         = true
      rotation_days            = 30
    }
    redis = {
      description              = "Redis auth token"
      generate_random_password = true
      random_password_length   = 64
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
    sendgrid = {
      description      = "SendGrid API key"
      allow_eks_access = true
    }
    twilio = {
      description      = "Twilio credentials"
      allow_eks_access = true
    }
    openai = {
      description      = "OpenAI API key"
      allow_eks_access = true
    }
  }

  create_external_secrets_role = true

  tags = local.common_tags
}

################################################################################
# Messaging Module (SQS/SNS)
################################################################################

module "messaging" {
  source = "../../modules/messaging"

  project_name = var.project_name
  environment  = var.environment

  queues = local.queues
  topics = local.topics

  # SNS to SQS subscriptions for fan-out
  sqs_subscriptions = {
    user-to-notification = {
      topic_key            = "user-events"
      queue_key            = "notification"
      raw_message_delivery = true
    }
    match-to-notification = {
      topic_key            = "match-events"
      queue_key            = "notification"
      raw_message_delivery = true
    }
    match-to-analytics = {
      topic_key            = "match-events"
      queue_key            = "analytics"
      raw_message_delivery = true
    }
  }

  create_eks_role       = true
  eks_oidc_provider_arn = module.eks.oidc_provider_arn
  eks_oidc_provider_url = module.eks.oidc_provider_url

  alarm_actions = [module.monitoring.sns_topic_arn]

  tags = local.common_tags
}

################################################################################
# Monitoring Module
# Cost Optimization: Reduced log retention while maintaining observability
################################################################################

module "monitoring" {
  source = "../../modules/monitoring"

  project_name        = var.project_name
  environment         = var.environment
  default_kms_key_arn = module.eks.kms_key_arn

  # Cost Optimization: Reduce log retention from 90 to 30 days
  # Archive to S3/Glacier for long-term storage if needed
  log_groups = { for service in local.microservices : service => {
    retention_in_days = 30    # Reduced from 90 (~67% savings on CloudWatch Logs)
  } }

  create_dashboard       = true
  eks_cluster_name       = module.eks.cluster_name
  rds_cluster_identifier = module.rds.aurora_cluster_id
  elasticache_cluster_id = module.elasticache.replication_group_id

  create_alarm_topic    = true
  alarm_email_endpoints = var.alarm_email_endpoints

  # Cost Optimization: Reduce Container Insights retention
  enable_container_insights         = true
  container_insights_retention_days = 14   # Reduced from 90 (~85% savings)

  xray_sampling_rules = {
    default = {
      priority       = 1000
      reservoir_size = 5      # Reduced from 10
      fixed_rate     = 0.005  # Sample 0.5% of requests (was 1%)
    }
    errors = {
      priority       = 100
      reservoir_size = 25     # Reduced from 50
      fixed_rate     = 1.0    # Keep 100% for errors (critical for debugging)
    }
  }

  tags = local.common_tags
}

################################################################################
# Route53 Module (DNS Management)
################################################################################

module "route53" {
  source = "../../modules/route53"

  project_name = var.project_name
  environment  = var.environment
  domain_name  = var.domain_name

  create_public_zone  = var.create_route53_zone
  create_private_zone = true
  vpc_id              = module.networking.vpc_id

  # CloudFront alias records will be created separately to avoid circular dependency
  # (ACM needs Route53 for validation, but Route53 alias needs CloudFront which needs ACM)
  create_www_record = false

  # Internal DNS records
  create_rds_record         = true
  rds_endpoint              = module.rds.endpoint
  create_elasticache_record = true
  elasticache_endpoint      = module.elasticache.primary_endpoint_address

  # Health checks (created after CloudFront is deployed)
  health_checks = {}

  alarm_actions = [module.monitoring.sns_topic_arn]

  # DNSSEC (optional - requires KMS key in us-east-1)
  enable_dnssec      = var.dnssec_kms_key_arn != null
  dnssec_kms_key_arn = var.dnssec_kms_key_arn

  tags = local.common_tags
}

################################################################################
# ACM Module (SSL/TLS Certificates)
# Note: For CloudFront, certificates MUST be in us-east-1
################################################################################

module "acm" {
  source = "../../modules/acm"

  providers = {
    aws = aws.us_east_1
  }

  project_name = var.project_name
  environment  = var.environment
  domain_name  = var.domain_name

  subject_alternative_names = [
    "*.${var.domain_name}",
    "www.${var.domain_name}",
    "api.${var.domain_name}"
  ]

  route53_zone_id        = module.route53.public_zone_id
  create_route53_records = true
  wait_for_validation    = true

  tags = local.common_tags
}

################################################################################
# CloudFront Module (CDN + WAF)
################################################################################

module "cloudfront" {
  source = "../../modules/cloudfront"

  project_name = var.project_name
  environment  = var.environment

  # Domain configuration
  domain_names        = var.domain_names
  acm_certificate_arn = module.acm.validated_certificate_arn

  # S3 origin for media files
  s3_origins = [
    {
      bucket_regional_domain_name = module.s3.bucket_regional_domain_names["media"]
      origin_id                   = "S3-media"
      path_pattern                = "/media/*"
      enable_origin_shield        = true
    }
  ]

  # ALB origin for API (via API Gateway or direct to ALB)
  alb_origins = [
    {
      domain_name = "api-internal.${var.domain_name}"
      origin_id   = "ALB-api"
      custom_headers = var.origin_verify_header != "" ? [
        {
          name  = "X-Origin-Verify"
          value = var.origin_verify_header
        }
      ] : []
    }
  ]

  default_origin_id     = "ALB-api"
  default_root_object   = ""
  price_class           = "PriceClass_All"
  origin_shield_region  = var.aws_region

  # WAF configuration
  enable_waf         = true
  enable_bot_control = true
  blocked_countries  = var.blocked_countries

  # Logging
  enable_logging = true
  logging_bucket = "${module.s3.bucket_domain_names["logs"]}"
  logging_prefix = "cloudfront/"

  # Custom error pages
  custom_error_responses = [
    {
      error_code            = 403
      response_code         = 403
      response_page_path    = "/error/403.html"
      error_caching_min_ttl = 60
    },
    {
      error_code            = 404
      response_code         = 404
      response_page_path    = "/error/404.html"
      error_caching_min_ttl = 60
    },
    {
      error_code            = 500
      response_code         = 500
      response_page_path    = "/error/500.html"
      error_caching_min_ttl = 10
    }
  ]

  tags = local.common_tags

  depends_on = [module.acm]
}

################################################################################
# Route53 CloudFront Alias Records
# Created separately to avoid circular dependency with ACM validation
################################################################################

resource "aws_route53_record" "cloudfront_root" {
  count = var.create_route53_zone ? 1 : 0

  zone_id = module.route53.public_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = module.cloudfront.distribution_domain_name
    zone_id                = module.cloudfront.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "cloudfront_www" {
  count = var.create_route53_zone ? 1 : 0

  zone_id = module.route53.public_zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.cloudfront.distribution_domain_name
    zone_id                = module.cloudfront.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "cloudfront_api" {
  count = var.create_route53_zone ? 1 : 0

  zone_id = module.route53.public_zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.cloudfront.distribution_domain_name
    zone_id                = module.cloudfront.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

################################################################################
# Route53 Health Checks (for CloudFront endpoints)
################################################################################

resource "aws_route53_health_check" "api" {
  count = var.create_route53_zone ? 1 : 0

  fqdn              = "api.${var.domain_name}"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30

  regions = ["us-east-1", "us-west-2", "eu-west-1"]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-api-health"
  })
}

resource "aws_cloudwatch_metric_alarm" "api_health" {
  count = var.create_route53_zone ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-api-health"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "Route53 health check failed for API"

  dimensions = {
    HealthCheckId = aws_route53_health_check.api[0].id
  }

  alarm_actions = [module.monitoring.sns_topic_arn]
  ok_actions    = [module.monitoring.sns_topic_arn]

  tags = local.common_tags
}

################################################################################
# SES Module (Email Infrastructure)
# AWS-Native email service - replaces SendGrid
################################################################################

module "ses" {
  source = "../../modules/ses"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  domain              = var.domain_name
  mail_from_subdomain = "mail"

  route53_zone_id            = module.route53.public_zone_id
  create_dns_records         = var.create_route53_zone
  create_verification_record = var.create_route53_zone

  dmarc_policy = "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${var.domain_name}"

  enable_reputation_metrics = true
  enable_cloudwatch_metrics = true

  # Bounce/complaint handling via SNS
  bounce_topic_arn    = module.messaging.topic_arns["user-events"]
  complaint_topic_arn = module.messaging.topic_arns["user-events"]

  allowed_from_addresses = [
    "noreply@${var.domain_name}",
    "support@${var.domain_name}",
    "hello@${var.domain_name}",
    "*@${var.domain_name}"
  ]

  tags = local.common_tags
}

################################################################################
# Budgets Module (Cost Control)
# Enforces budget alerts and cost monitoring
################################################################################

module "budgets" {
  source = "../../modules/budgets"

  project_name = var.project_name
  environment  = var.environment

  monthly_budget_amount = var.monthly_budget_limit
  budget_start_date     = "2024-01-01_00:00"

  alert_email_addresses = var.alarm_email_endpoints
  alert_sns_topic_arns  = [module.monitoring.sns_topic_arn]

  create_service_budgets = true
  eks_budget_amount      = var.eks_budget_limit
  rds_budget_amount      = var.rds_budget_limit
  s3_budget_amount       = var.s3_budget_limit

  enable_budget_actions = false # Enable after review

  tags = local.common_tags
}

################################################################################
# CI/CD Module (CodePipeline + CodeBuild + Nightly Builds)
# Includes EventBridge trigger for 9 PM nightly production builds
################################################################################

module "cicd" {
  source = "../../modules/cicd"

  project_name     = var.project_name
  environment      = var.environment
  eks_cluster_name = module.eks.cluster_name
  eks_cluster_arn  = module.eks.cluster_arn
  kms_key_arn      = module.eks.kms_key_arn

  github_repository       = var.github_repository
  github_branch           = var.github_branch
  codestar_connection_arn = var.codestar_connection_arn
  create_github_connection = var.codestar_connection_arn == ""

  # Build all microservices
  services = { for service in local.microservices : service => {
    enabled = true
  } }

  # Enable nightly builds at 9 PM UTC
  enable_nightly_build   = true
  nightly_build_schedule = "cron(0 21 * * ? *)"

  # Pipeline notifications
  create_notification_topic    = true
  notification_email_addresses = var.alarm_email_endpoints

  tags = local.common_tags
}
