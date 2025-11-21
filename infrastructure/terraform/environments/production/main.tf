# Production Environment Configuration for Dating App Platform

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
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  backend "s3" {
    bucket         = "dating-app-terraform-state-prod"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "dating-app-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "production"
      Project     = "dating-app-platform"
      ManagedBy   = "terraform"
      CostCenter  = "engineering"
    }
  }
}

locals {
  environment = "production"

  common_tags = {
    Environment = local.environment
    Project     = "dating-app-platform"
    ManagedBy   = "terraform"
  }
}

# VPC Module
module "vpc" {
  source = "../../modules/vpc"

  environment        = local.environment
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  enable_nat_gateway = true
  enable_flow_logs   = true

  common_tags = local.common_tags
}

# EKS Module
module "eks" {
  source = "../../modules/eks"

  environment                            = local.environment
  vpc_id                                 = module.vpc.vpc_id
  public_subnet_ids                      = module.vpc.public_subnet_ids
  private_subnet_ids                     = module.vpc.private_subnet_ids
  kubernetes_version                     = "1.28"
  enable_public_access                   = false
  cluster_endpoint_public_access_cidrs   = []
  cluster_enabled_log_types              = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  # Node Group Configuration
  instance_types   = ["t3.xlarge", "t3.2xlarge"]
  capacity_type    = "ON_DEMAND"
  desired_capacity = 6
  min_capacity     = 3
  max_capacity     = 15
  disk_size        = 100

  common_tags = local.common_tags
}

# RDS PostgreSQL
resource "aws_db_subnet_group" "main" {
  name       = "${local.environment}-dating-app-db-subnet-group"
  subnet_ids = module.vpc.database_subnet_ids

  tags = merge(
    local.common_tags,
    {
      Name = "${local.environment}-dating-app-db-subnet-group"
    }
  )
}

resource "aws_db_instance" "main" {
  identifier     = "${local.environment}-dating-app-db"
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = "db.r6g.2xlarge"

  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "dating_app_production"
  username = "datingapp_prod"
  password = var.db_password

  multi_az               = true
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]

  backup_retention_period = 30
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled    = true

  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${local.environment}-dating-app-db-final-snapshot"

  tags = merge(
    local.common_tags,
    {
      Name = "${local.environment}-dating-app-database"
    }
  )
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.environment}-dating-app-redis-subnet-group"
  subnet_ids = module.vpc.private_subnet_ids

  tags = local.common_tags
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${local.environment}-dating-app-redis"
  replication_group_description = "Redis cluster for Dating App"

  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.r6g.xlarge"
  num_cache_clusters   = 3
  parameter_group_name = "default.redis7"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token

  automatic_failover_enabled = true
  multi_az_enabled           = true

  snapshot_retention_limit = 7
  snapshot_window          = "03:00-05:00"
  maintenance_window       = "mon:05:00-mon:07:00"

  tags = merge(
    local.common_tags,
    {
      Name = "${local.environment}-dating-app-redis"
    }
  )
}

# Security Groups
resource "aws_security_group" "database" {
  name        = "${local.environment}-dating-app-database-sg"
  description = "Security group for RDS database"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.environment}-dating-app-database-sg"
    }
  )
}

resource "aws_security_group" "redis" {
  name        = "${local.environment}-dating-app-redis-sg"
  description = "Security group for Redis"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.environment}-dating-app-redis-sg"
    }
  )
}

# S3 Bucket for Media Storage
resource "aws_s3_bucket" "media" {
  bucket = "${local.environment}-dating-app-media"

  tags = merge(
    local.common_tags,
    {
      Name = "${local.environment}-dating-app-media"
    }
  )
}

resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "media" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Dating App Media CDN"
  default_root_object = "index.html"
  price_class         = "PriceClass_All"

  origin {
    domain_name = aws_s3_bucket.media.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.media.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.media.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.media.id}"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = local.common_tags
}

resource "aws_cloudfront_origin_access_identity" "media" {
  comment = "Dating App Media OAI"
}
