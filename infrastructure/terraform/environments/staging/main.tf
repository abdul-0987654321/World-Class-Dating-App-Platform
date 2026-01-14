# Flamoral Infrastructure - Terraform (Staging)

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "flamoral-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "flamoral-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Flamoral"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ============================================================================
# Modules
# ============================================================================

module "networking" {
  source = "../../modules/networking"

  project            = "flamoral"
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}

module "secrets" {
  source = "../../modules/secrets"

  project     = "flamoral"
  environment = var.environment
}

module "rds" {
  source = "../../modules/rds"

  project_name         = "flamoral"
  environment          = var.environment
  aws_region           = var.aws_region
  vpc_id               = module.networking.vpc_id
  vpc_cidr             = var.vpc_cidr
  db_subnet_group_name = module.networking.db_subnet_group_name

  master_username      = "flamoral_admin"
  kms_key_arn          = null

  # Staging-specific: use smaller instance
  engine_mode          = "rds"
  engine               = "postgres"
  instance_class       = "db.t3.medium"
  deletion_protection  = false
  skip_final_snapshot  = true

  depends_on = [module.networking]
}

module "cache" {
  source = "../../modules/cache"

  project            = "flamoral"
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids

  depends_on = [module.networking]
}

module "ecs" {
  source = "../../modules/ecs"

  project            = "flamoral"
  environment        = var.environment
  aws_region         = var.aws_region
  vpc_id             = module.networking.vpc_id
  public_subnet_ids  = module.networking.public_subnet_ids
  private_subnet_ids = module.networking.private_subnet_ids

  database_url_secret_arn = module.secrets.database_url_secret_arn
  redis_url_secret_arn    = module.secrets.redis_url_secret_arn
  jwt_secret_arn          = module.secrets.jwt_secret_arn
  stripe_secret_arn       = module.secrets.stripe_secret_arn

  depends_on = [module.networking, module.rds, module.cache, module.secrets]
}

module "monitoring" {
  source = "../../modules/monitoring"

  project        = "flamoral"
  environment    = var.environment
  cluster_name   = module.ecs.cluster_name
  alb_arn_suffix = module.ecs.alb_arn_suffix
  db_cluster_id  = module.rds.aurora_cluster_id
  redis_cluster_id = module.cache.cluster_id
  alert_emails   = ["alerts-staging@flamoral.com"]
}

# ============================================================================
# Outputs
# ============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.ecs.alb_dns_name
}

output "database_endpoint" {
  description = "Database endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.cache.primary_endpoint
  sensitive   = true
}

output "ecr_repositories" {
  description = "ECR repository URLs"
  value       = module.ecs.ecr_repository_urls
}
