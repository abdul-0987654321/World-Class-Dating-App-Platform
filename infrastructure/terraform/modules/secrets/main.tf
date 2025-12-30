################################################################################
# Secrets Manager Module
# Provides secrets management for application credentials and configurations
################################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
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
# Secrets
################################################################################

resource "aws_secretsmanager_secret" "main" {
  for_each = var.secrets

  name        = "${var.project_name}/${var.environment}/${each.key}"
  description = each.value.description

  kms_key_id = each.value.kms_key_arn != null ? each.value.kms_key_arn : var.default_kms_key_arn

  recovery_window_in_days = each.value.recovery_window_in_days

  force_overwrite_replica_secret = each.value.force_overwrite_replica_secret

  dynamic "replica" {
    for_each = each.value.replica_regions
    content {
      region     = replica.value.region
      kms_key_id = replica.value.kms_key_id
    }
  }

  tags = merge(var.tags, each.value.tags, {
    Name = "${var.project_name}-${var.environment}-${each.key}"
  })
}

################################################################################
# Secret Versions
################################################################################

resource "aws_secretsmanager_secret_version" "main" {
  for_each = { for k, v in var.secrets : k => v if v.secret_string != null || v.secret_binary != null }

  secret_id     = aws_secretsmanager_secret.main[each.key].id
  secret_string = each.value.secret_string
  secret_binary = each.value.secret_binary

  lifecycle {
    ignore_changes = [
      secret_string,
      secret_binary,
    ]
  }
}

################################################################################
# Randomly Generated Secrets
################################################################################

resource "random_password" "main" {
  for_each = { for k, v in var.secrets : k => v if v.generate_random_password }

  length           = each.value.random_password_length
  special          = each.value.random_password_special
  override_special = each.value.random_password_override_special
  min_lower        = each.value.random_password_min_lower
  min_upper        = each.value.random_password_min_upper
  min_numeric      = each.value.random_password_min_numeric
  min_special      = each.value.random_password_min_special
}

resource "aws_secretsmanager_secret_version" "random" {
  for_each = { for k, v in var.secrets : k => v if v.generate_random_password }

  secret_id = aws_secretsmanager_secret.main[each.key].id
  secret_string = jsonencode(merge(
    each.value.additional_secret_data,
    {
      password = random_password.main[each.key].result
    }
  ))

  lifecycle {
    ignore_changes = [
      secret_string,
    ]
  }
}

################################################################################
# Secret Rotation
################################################################################

resource "aws_secretsmanager_secret_rotation" "main" {
  for_each = { for k, v in var.secrets : k => v if v.rotation_enabled }

  secret_id           = aws_secretsmanager_secret.main[each.key].id
  rotation_lambda_arn = each.value.rotation_lambda_arn

  rotation_rules {
    automatically_after_days = each.value.rotation_days
    schedule_expression      = each.value.rotation_schedule_expression
  }
}

################################################################################
# Secret Policy
################################################################################

resource "aws_secretsmanager_secret_policy" "main" {
  for_each = { for k, v in var.secrets : k => v if v.attach_policy }

  secret_arn = aws_secretsmanager_secret.main[each.key].arn
  policy     = data.aws_iam_policy_document.secret_policy[each.key].json
}

data "aws_iam_policy_document" "secret_policy" {
  for_each = { for k, v in var.secrets : k => v if v.attach_policy }

  # Allow account root access (required for a valid policy)
  statement {
    sid    = "AllowAccountRoot"
    effect = "Allow"
    actions = [
      "secretsmanager:*"
    ]
    resources = [aws_secretsmanager_secret.main[each.key].arn]
    principals {
      type        = "AWS"
      identifiers = ["arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
  }

  # Note: EKS workload access is granted through IAM roles (IRSA) attached to service accounts
  # not through resource-based policies, as Secrets Manager policies don't support OIDC conditions

  # Allow access from specific IAM roles
  dynamic "statement" {
    for_each = length(each.value.read_access_principal_arns) > 0 ? [1] : []
    content {
      sid    = "AllowReadAccess"
      effect = "Allow"
      actions = [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ]
      resources = [aws_secretsmanager_secret.main[each.key].arn]
      principals {
        type        = "AWS"
        identifiers = each.value.read_access_principal_arns
      }
    }
  }

  # Allow write access from specific IAM roles
  dynamic "statement" {
    for_each = length(each.value.write_access_principal_arns) > 0 ? [1] : []
    content {
      sid    = "AllowWriteAccess"
      effect = "Allow"
      actions = [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:PutSecretValue",
        "secretsmanager:UpdateSecret"
      ]
      resources = [aws_secretsmanager_secret.main[each.key].arn]
      principals {
        type        = "AWS"
        identifiers = each.value.write_access_principal_arns
      }
    }
  }

  # Deny non-SSL access
  dynamic "statement" {
    for_each = each.value.require_ssl ? [1] : []
    content {
      sid     = "RequireSSL"
      effect  = "Deny"
      actions = ["secretsmanager:*"]
      resources = [aws_secretsmanager_secret.main[each.key].arn]
      principals {
        type        = "*"
        identifiers = ["*"]
      }
      condition {
        test     = "Bool"
        variable = "aws:SecureTransport"
        values   = ["false"]
      }
    }
  }

  # Cross-account access
  dynamic "statement" {
    for_each = length(each.value.cross_account_ids) > 0 ? [1] : []
    content {
      sid    = "AllowCrossAccountAccess"
      effect = "Allow"
      actions = [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ]
      resources = [aws_secretsmanager_secret.main[each.key].arn]
      principals {
        type        = "AWS"
        identifiers = [for id in each.value.cross_account_ids : "arn:${data.aws_partition.current.partition}:iam::${id}:root"]
      }
    }
  }
}

################################################################################
# IAM Policy for Secret Access
################################################################################

resource "aws_iam_policy" "secret_access" {
  for_each = { for k, v in var.secrets : k => v if v.create_access_policy }

  name        = "${var.project_name}-${var.environment}-${each.key}-secret-access"
  description = "Policy for accessing ${each.key} secret"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "GetSecret"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = aws_secretsmanager_secret.main[each.key].arn
      },
      {
        Sid    = "KMSDecrypt"
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = each.value.kms_key_arn != null ? each.value.kms_key_arn : var.default_kms_key_arn
      }
    ]
  })

  tags = var.tags
}

################################################################################
# External Secrets Operator IAM Role (IRSA)
################################################################################

resource "aws_iam_role" "external_secrets" {
  count = var.create_external_secrets_role && var.eks_oidc_available ? 1 : 0

  name = "${var.project_name}-${var.environment}-external-secrets-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.eks_oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(var.eks_oidc_provider_url, "https://", "")}:sub" = "system:serviceaccount:${var.external_secrets_namespace}:${var.external_secrets_service_account}"
            "${replace(var.eks_oidc_provider_url, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "external_secrets" {
  count = var.create_external_secrets_role && var.eks_oidc_available ? 1 : 0

  name = "${var.project_name}-${var.environment}-external-secrets-policy"
  role = aws_iam_role.external_secrets[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "GetSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:ListSecrets"
        ]
        Resource = var.external_secrets_secret_arns != null ? var.external_secrets_secret_arns : ["arn:${data.aws_partition.current.partition}:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}/${var.environment}/*"]
      },
      {
        Sid    = "KMSDecrypt"
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = var.default_kms_key_arn != null ? [var.default_kms_key_arn] : ["*"]
      }
    ]
  })
}
