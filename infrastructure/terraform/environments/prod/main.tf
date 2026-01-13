# Flamoral Infrastructure - Terraform

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
    key            = "prod/terraform.tfstate"
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
# Variables
# ============================================================================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "domain_name" {
  description = "Domain name"
  type        = string
  default     = "flamoral.com"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# ============================================================================
# Modules
# ============================================================================

module "network" {
  source = "../../modules/network"

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

module "database" {
  source = "../../modules/database"

  project            = "flamoral"
  environment        = var.environment
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  database_security_group_id = module.network.database_security_group_id

  db_username = "flamoral_admin"

  depends_on = [module.network]
}

module "cache" {
  source = "../../modules/cache"

  project            = "flamoral"
  environment        = var.environment
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  redis_security_group_id = module.network.redis_security_group_id

  depends_on = [module.network]
}

module "ecs" {
  source = "../../modules/ecs"

  project            = "flamoral"
  environment        = var.environment
  aws_region         = var.aws_region
  vpc_id             = module.network.vpc_id
  public_subnet_ids  = module.network.public_subnet_ids
  private_subnet_ids = module.network.private_subnet_ids
  alb_security_group_id    = module.network.alb_security_group_id
  ecs_security_group_id    = module.network.ecs_tasks_security_group_id

  database_url_secret_arn = module.secrets.database_url_secret_arn
  redis_url_secret_arn    = module.secrets.redis_url_secret_arn
  jwt_secret_arn          = module.secrets.jwt_secret_arn
  stripe_secret_arn       = module.secrets.stripe_secret_arn

  depends_on = [module.network, module.database, module.cache, module.secrets]
}

module "cdn" {
  source = "../../modules/cdn"

  project     = "flamoral"
  environment = var.environment
  domain_name = var.domain_name
  alb_dns_name = module.ecs.alb_dns_name
}

module "monitoring" {
  source = "../../modules/monitoring"

  project        = "flamoral"
  environment    = var.environment
  cluster_name   = module.ecs.cluster_name
  alb_arn_suffix = module.ecs.alb_arn_suffix
  db_cluster_id  = module.database.cluster_id
  redis_cluster_id = module.cache.cluster_id
  alert_emails   = ["alerts@flamoral.com"]
}

# ============================================================================
# Outputs
# ============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.network.vpc_id
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.ecs.alb_dns_name
}

output "cloudfront_domain" {
  description = "CloudFront domain"
  value       = module.cdn.cloudfront_domain
}

output "database_endpoint" {
  description = "Database endpoint"
  value       = module.database.cluster_endpoint
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
