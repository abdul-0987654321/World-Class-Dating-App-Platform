################################################################################
# ECR Module
# Provides ECR repositories for container images
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
data "aws_partition" "current" {}
data "aws_region" "current" {}

################################################################################
# ECR Repositories
################################################################################

resource "aws_ecr_repository" "main" {
  for_each = var.repositories

  name                 = "${var.project_name}/${each.key}"
  image_tag_mutability = each.value.image_tag_mutability

  encryption_configuration {
    encryption_type = each.value.encryption_type
    kms_key         = each.value.encryption_type == "KMS" ? (each.value.kms_key_arn != null ? each.value.kms_key_arn : var.default_kms_key_arn) : null
  }

  image_scanning_configuration {
    scan_on_push = each.value.scan_on_push
  }

  force_delete = each.value.force_delete

  tags = merge(var.tags, each.value.tags, {
    Name    = "${var.project_name}-${each.key}"
    Service = each.key
  })
}

################################################################################
# Lifecycle Policies
################################################################################

resource "aws_ecr_lifecycle_policy" "main" {
  for_each = var.repositories

  repository = aws_ecr_repository.main[each.key].name

  policy = jsonencode({
    rules = concat(
      # Keep tagged images based on configuration
      each.value.keep_tagged_images > 0 ? [
        {
          rulePriority = 1
          description  = "Keep last ${each.value.keep_tagged_images} tagged images"
          selection = {
            tagStatus     = "tagged"
            tagPrefixList = each.value.tag_prefixes
            countType     = "imageCountMoreThan"
            countNumber   = each.value.keep_tagged_images
          }
          action = {
            type = "expire"
          }
        }
      ] : [],
      # Remove untagged images after specified days
      [
        {
          rulePriority = 10
          description  = "Remove untagged images after ${each.value.untagged_image_expiry_days} days"
          selection = {
            tagStatus   = "untagged"
            countType   = "sinceImagePushed"
            countUnit   = "days"
            countNumber = each.value.untagged_image_expiry_days
          }
          action = {
            type = "expire"
          }
        }
      ],
      # Additional custom lifecycle rules
      each.value.lifecycle_rules
    )
  })
}

################################################################################
# Repository Policies
################################################################################

resource "aws_ecr_repository_policy" "main" {
  for_each = { for k, v in var.repositories : k => v if v.attach_policy }

  repository = aws_ecr_repository.main[each.key].name
  policy     = data.aws_iam_policy_document.repository_policy[each.key].json
}

data "aws_iam_policy_document" "repository_policy" {
  for_each = { for k, v in var.repositories : k => v if v.attach_policy }

  # Allow pull from EKS nodes
  dynamic "statement" {
    for_each = each.value.allow_eks_pull && var.eks_node_role_arns != null ? [1] : []
    content {
      sid    = "AllowEKSPull"
      effect = "Allow"
      actions = [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:BatchCheckLayerAvailability"
      ]
      principals {
        type        = "AWS"
        identifiers = var.eks_node_role_arns
      }
    }
  }

  # Allow pull from specific IAM roles
  dynamic "statement" {
    for_each = length(each.value.pull_access_principal_arns) > 0 ? [1] : []
    content {
      sid    = "AllowPull"
      effect = "Allow"
      actions = [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:BatchCheckLayerAvailability"
      ]
      principals {
        type        = "AWS"
        identifiers = each.value.pull_access_principal_arns
      }
    }
  }

  # Allow push from specific IAM roles
  dynamic "statement" {
    for_each = length(each.value.push_access_principal_arns) > 0 ? [1] : []
    content {
      sid    = "AllowPush"
      effect = "Allow"
      actions = [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:BatchCheckLayerAvailability",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ]
      principals {
        type        = "AWS"
        identifiers = each.value.push_access_principal_arns
      }
    }
  }

  # Allow cross-account access
  dynamic "statement" {
    for_each = length(each.value.cross_account_ids) > 0 ? [1] : []
    content {
      sid    = "AllowCrossAccountPull"
      effect = "Allow"
      actions = [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:BatchCheckLayerAvailability"
      ]
      principals {
        type        = "AWS"
        identifiers = [for id in each.value.cross_account_ids : "arn:${data.aws_partition.current.partition}:iam::${id}:root"]
      }
    }
  }

  # Allow Lambda access
  dynamic "statement" {
    for_each = each.value.allow_lambda_access ? [1] : []
    content {
      sid    = "AllowLambdaPull"
      effect = "Allow"
      actions = [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:BatchCheckLayerAvailability"
      ]
      principals {
        type        = "Service"
        identifiers = ["lambda.amazonaws.com"]
      }
      condition {
        test     = "StringLike"
        variable = "aws:sourceArn"
        values   = ["arn:${data.aws_partition.current.partition}:lambda:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:function:*"]
      }
    }
  }
}

################################################################################
# Replication Configuration (for disaster recovery)
################################################################################

resource "aws_ecr_replication_configuration" "main" {
  count = var.enable_replication && length(var.replication_destinations) > 0 ? 1 : 0

  replication_configuration {
    rule {
      dynamic "destination" {
        for_each = var.replication_destinations
        content {
          region      = destination.value.region
          registry_id = destination.value.registry_id != null ? destination.value.registry_id : data.aws_caller_identity.current.account_id
        }
      }

      dynamic "repository_filter" {
        for_each = var.replication_repository_filters
        content {
          filter      = repository_filter.value.filter
          filter_type = repository_filter.value.filter_type
        }
      }
    }
  }
}

################################################################################
# Pull Through Cache Rules
################################################################################

resource "aws_ecr_pull_through_cache_rule" "main" {
  for_each = var.pull_through_cache_rules

  ecr_repository_prefix = each.value.ecr_repository_prefix
  upstream_registry_url = each.value.upstream_registry_url
  credential_arn        = each.value.credential_arn
}

################################################################################
# Registry Scanning Configuration
################################################################################

resource "aws_ecr_registry_scanning_configuration" "main" {
  count = var.enable_enhanced_scanning ? 1 : 0

  scan_type = "ENHANCED"

  dynamic "rule" {
    for_each = var.scanning_rules
    content {
      scan_frequency = rule.value.scan_frequency

      repository_filter {
        filter      = rule.value.filter
        filter_type = rule.value.filter_type
      }
    }
  }
}

################################################################################
# Registry Policy
################################################################################

resource "aws_ecr_registry_policy" "main" {
  count = var.attach_registry_policy ? 1 : 0

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      # Cross-account replication
      length(var.replication_source_accounts) > 0 ? [
        {
          Sid    = "AllowCrossAccountReplication"
          Effect = "Allow"
          Principal = {
            AWS = [for id in var.replication_source_accounts : "arn:${data.aws_partition.current.partition}:iam::${id}:root"]
          }
          Action = [
            "ecr:CreateRepository",
            "ecr:ReplicateImage"
          ]
          Resource = "arn:${data.aws_partition.current.partition}:ecr:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:repository/*"
        }
      ] : [],
      var.additional_registry_policy_statements
    )
  })
}
