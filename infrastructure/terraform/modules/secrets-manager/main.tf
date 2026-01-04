################################################################################
# AWS Secrets Manager Terraform Module
# Manages secrets for database credentials, API keys, JWT tokens, etc.
################################################################################

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = merge(var.tags, {
    Module      = "secrets-manager"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  })

  # Flatten secret configurations for iteration
  secrets_list = [
    for name, config in var.secrets : {
      name                    = name
      description             = lookup(config, "description", "Secret for ${name}")
      recovery_window_in_days = lookup(config, "recovery_window_in_days", var.default_recovery_window_days)
      secret_string           = lookup(config, "secret_string", null)
      secret_binary           = lookup(config, "secret_binary", null)
      rotation_enabled        = lookup(config, "rotation_enabled", false)
      rotation_lambda_arn     = lookup(config, "rotation_lambda_arn", null)
      rotation_days           = lookup(config, "rotation_days", var.default_rotation_days)
      tags                    = lookup(config, "tags", {})
    }
  ]
}

################################################################################
# KMS Key for Secrets Encryption
################################################################################

resource "aws_kms_key" "secrets" {
  count = var.create_kms_key ? 1 : 0

  description             = "KMS key for ${local.name_prefix} secrets encryption"
  deletion_window_in_days = var.kms_deletion_window_days
  enable_key_rotation     = var.enable_kms_key_rotation
  multi_region            = var.kms_multi_region

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "${local.name_prefix}-secrets-key-policy"
    Statement = [
      {
        Sid    = "EnableRootAccountPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowSecretsManagerAccess"
        Effect = "Allow"
        Principal = {
          Service = "secretsmanager.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      {
        Sid    = "AllowEKSPodAccess"
        Effect = "Allow"
        Principal = {
          AWS = var.eks_cluster_oidc_arn != "" ? aws_iam_role.secrets_access[0].arn : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-secrets-kms-key"
  })
}

resource "aws_kms_alias" "secrets" {
  count = var.create_kms_key ? 1 : 0

  name          = "alias/${local.name_prefix}-secrets"
  target_key_id = aws_kms_key.secrets[0].key_id
}

################################################################################
# Data Sources
################################################################################

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

################################################################################
# Secrets Manager Secrets
################################################################################

resource "aws_secretsmanager_secret" "this" {
  for_each = var.secrets

  name        = "${local.name_prefix}/${each.key}"
  description = lookup(each.value, "description", "Secret for ${each.key}")

  kms_key_id = var.create_kms_key ? aws_kms_key.secrets[0].arn : var.kms_key_arn

  recovery_window_in_days = lookup(each.value, "recovery_window_in_days", var.default_recovery_window_days)

  # Force overwrite on name collision during recovery period
  force_overwrite_replica_secret = var.force_overwrite_replica_secret

  tags = merge(local.common_tags, lookup(each.value, "tags", {}), {
    Name       = "${local.name_prefix}/${each.key}"
    SecretType = each.key
  })
}

################################################################################
# Secret Versions (Initial Values)
################################################################################

resource "aws_secretsmanager_secret_version" "this" {
  for_each = {
    for name, config in var.secrets : name => config
    if lookup(config, "secret_string", null) != null || lookup(config, "secret_binary", null) != null
  }

  secret_id     = aws_secretsmanager_secret.this[each.key].id
  secret_string = lookup(each.value, "secret_string", null)
  secret_binary = lookup(each.value, "secret_binary", null)

  lifecycle {
    ignore_changes = [
      secret_string,
      secret_binary
    ]
  }
}

################################################################################
# Secret Rotation Configuration
################################################################################

resource "aws_secretsmanager_secret_rotation" "this" {
  for_each = {
    for name, config in var.secrets : name => config
    if lookup(config, "rotation_enabled", false) && lookup(config, "rotation_lambda_arn", null) != null
  }

  secret_id           = aws_secretsmanager_secret.this[each.key].id
  rotation_lambda_arn = each.value.rotation_lambda_arn

  rotation_rules {
    automatically_after_days = lookup(each.value, "rotation_days", var.default_rotation_days)
    schedule_expression      = lookup(each.value, "rotation_schedule", null)
  }
}

################################################################################
# Resource Policy for Secret Access
################################################################################

resource "aws_secretsmanager_secret_policy" "this" {
  for_each = var.create_secret_policy ? var.secrets : {}

  secret_arn = aws_secretsmanager_secret.this[each.key].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      # Allow EKS pods via IRSA
      var.eks_cluster_oidc_arn != "" ? [
        {
          Sid    = "AllowEKSPodAccess"
          Effect = "Allow"
          Principal = {
            AWS = aws_iam_role.secrets_access[0].arn
          }
          Action = [
            "secretsmanager:GetSecretValue",
            "secretsmanager:DescribeSecret"
          ]
          Resource = "*"
        }
      ] : [],
      # Allow Lambda rotation function
      lookup(each.value, "rotation_enabled", false) && lookup(each.value, "rotation_lambda_arn", null) != null ? [
        {
          Sid    = "AllowRotationLambda"
          Effect = "Allow"
          Principal = {
            Service = "lambda.amazonaws.com"
          }
          Action = [
            "secretsmanager:GetSecretValue",
            "secretsmanager:PutSecretValue",
            "secretsmanager:UpdateSecretVersionStage",
            "secretsmanager:DescribeSecret"
          ]
          Resource = "*"
          Condition = {
            ArnEquals = {
              "aws:SourceArn" = each.value.rotation_lambda_arn
            }
          }
        }
      ] : [],
      # Additional principals from configuration
      [
        for principal in lookup(each.value, "additional_principals", []) : {
          Sid    = "AllowAdditionalPrincipal${replace(principal, "/[^a-zA-Z0-9]/", "")}"
          Effect = "Allow"
          Principal = {
            AWS = principal
          }
          Action = [
            "secretsmanager:GetSecretValue",
            "secretsmanager:DescribeSecret"
          ]
          Resource = "*"
        }
      ]
    )
  })
}

################################################################################
# IAM Role for EKS Pod Access (IRSA)
################################################################################

resource "aws_iam_role" "secrets_access" {
  count = var.eks_cluster_oidc_arn != "" ? 1 : 0

  name = "${local.name_prefix}-secrets-access-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.eks_cluster_oidc_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringLike = {
            "${replace(var.eks_cluster_oidc_arn, "/^arn:aws:iam::[0-9]+:oidc-provider\\//", "")}:sub" = "system:serviceaccount:${var.eks_namespace}:${var.eks_service_account_name}"
          }
          StringEquals = {
            "${replace(var.eks_cluster_oidc_arn, "/^arn:aws:iam::[0-9]+:oidc-provider\\//", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-secrets-access-role"
  })
}

resource "aws_iam_role_policy" "secrets_access" {
  count = var.eks_cluster_oidc_arn != "" ? 1 : 0

  name = "${local.name_prefix}-secrets-access-policy"
  role = aws_iam_role.secrets_access[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "GetSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:ListSecretVersionIds"
        ]
        Resource = [
          for name, secret in aws_secretsmanager_secret.this : secret.arn
        ]
      },
      {
        Sid    = "ListSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:ListSecrets"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "secretsmanager:ResourceTag/Project" = var.project_name
          }
        }
      },
      {
        Sid    = "DecryptSecrets"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = var.create_kms_key ? [aws_kms_key.secrets[0].arn] : [var.kms_key_arn]
      }
    ]
  })
}

################################################################################
# Optional: Lambda Function for Secret Rotation
################################################################################

resource "aws_lambda_function" "rotation" {
  count = var.create_rotation_lambda ? 1 : 0

  function_name = "${local.name_prefix}-secret-rotation"
  description   = "Lambda function for rotating secrets in Secrets Manager"

  filename         = var.rotation_lambda_filename
  source_code_hash = var.rotation_lambda_source_code_hash
  handler          = var.rotation_lambda_handler
  runtime          = var.rotation_lambda_runtime
  timeout          = var.rotation_lambda_timeout
  memory_size      = var.rotation_lambda_memory_size

  role = aws_iam_role.rotation_lambda[0].arn

  vpc_config {
    subnet_ids         = var.rotation_lambda_subnet_ids
    security_group_ids = var.rotation_lambda_security_group_ids
  }

  environment {
    variables = merge(
      {
        SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.${data.aws_region.current.name}.amazonaws.com"
      },
      var.rotation_lambda_env_vars
    )
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-secret-rotation"
  })
}

resource "aws_iam_role" "rotation_lambda" {
  count = var.create_rotation_lambda ? 1 : 0

  name = "${local.name_prefix}-rotation-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "rotation_lambda" {
  count = var.create_rotation_lambda ? 1 : 0

  name = "${local.name_prefix}-rotation-lambda-policy"
  role = aws_iam_role.rotation_lambda[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SecretsManagerAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage",
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetRandomPassword"
        ]
        Resource = [
          for name, secret in aws_secretsmanager_secret.this : secret.arn
        ]
      },
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.create_kms_key ? [aws_kms_key.secrets[0].arn] : [var.kms_key_arn]
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
      },
      {
        Sid    = "VPCAccess"
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DeleteNetworkInterface",
          "ec2:DescribeNetworkInterfaces"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_lambda_permission" "secretsmanager" {
  count = var.create_rotation_lambda ? 1 : 0

  statement_id  = "AllowSecretsManagerInvocation"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rotation[0].function_name
  principal     = "secretsmanager.amazonaws.com"
}
