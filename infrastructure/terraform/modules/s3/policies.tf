################################################################################
# S3 Bucket Policies
# Defines bucket policies for access control
################################################################################

################################################################################
# Bucket Policies
################################################################################

resource "aws_s3_bucket_policy" "main" {
  for_each = { for k, v in var.buckets : k => v if v.attach_policy || v.require_ssl_requests || v.allow_cloudfront_access }

  bucket = aws_s3_bucket.main[each.key].id
  policy = data.aws_iam_policy_document.bucket_policy[each.key].json

  depends_on = [aws_s3_bucket_public_access_block.main]
}

data "aws_iam_policy_document" "bucket_policy" {
  for_each = { for k, v in var.buckets : k => v if v.attach_policy || v.require_ssl_requests || v.allow_cloudfront_access }

  # Require SSL/TLS for all requests
  dynamic "statement" {
    for_each = each.value.require_ssl_requests ? [1] : []
    content {
      sid     = "RequireSSL"
      effect  = "Deny"
      actions = ["s3:*"]
      resources = [
        aws_s3_bucket.main[each.key].arn,
        "${aws_s3_bucket.main[each.key].arn}/*"
      ]
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

  # CloudFront OAC access
  dynamic "statement" {
    for_each = each.value.allow_cloudfront_access && each.value.cloudfront_distribution_arn != null ? [1] : []
    content {
      sid       = "AllowCloudFrontServicePrincipal"
      effect    = "Allow"
      actions   = ["s3:GetObject"]
      resources = ["${aws_s3_bucket.main[each.key].arn}/*"]
      principals {
        type        = "Service"
        identifiers = ["cloudfront.amazonaws.com"]
      }
      condition {
        test     = "StringEquals"
        variable = "AWS:SourceArn"
        values   = [each.value.cloudfront_distribution_arn]
      }
    }
  }

  # Allow EKS service account access via IRSA
  dynamic "statement" {
    for_each = each.value.allow_eks_access && each.value.eks_oidc_provider_arn != null ? [1] : []
    content {
      sid     = "AllowEKSServiceAccountAccess"
      effect  = "Allow"
      actions = each.value.eks_access_actions
      resources = [
        aws_s3_bucket.main[each.key].arn,
        "${aws_s3_bucket.main[each.key].arn}/*"
      ]
      principals {
        type        = "Federated"
        identifiers = [each.value.eks_oidc_provider_arn]
      }
      condition {
        test     = "StringEquals"
        variable = "${replace(each.value.eks_oidc_provider_url, "https://", "")}:aud"
        values   = ["sts.amazonaws.com"]
      }
    }
  }

  # Allow specific IAM roles/users
  dynamic "statement" {
    for_each = length(each.value.allowed_principal_arns) > 0 ? [1] : []
    content {
      sid     = "AllowSpecificPrincipals"
      effect  = "Allow"
      actions = each.value.allowed_actions
      resources = [
        aws_s3_bucket.main[each.key].arn,
        "${aws_s3_bucket.main[each.key].arn}/*"
      ]
      principals {
        type        = "AWS"
        identifiers = each.value.allowed_principal_arns
      }
    }
  }

  # Deny unencrypted uploads
  dynamic "statement" {
    for_each = each.value.deny_unencrypted_uploads ? [1] : []
    content {
      sid       = "DenyUnencryptedUploads"
      effect    = "Deny"
      actions   = ["s3:PutObject"]
      resources = ["${aws_s3_bucket.main[each.key].arn}/*"]
      principals {
        type        = "*"
        identifiers = ["*"]
      }
      condition {
        test     = "Null"
        variable = "s3:x-amz-server-side-encryption"
        values   = ["true"]
      }
    }
  }

  # Deny non-KMS encrypted uploads (when KMS is required)
  dynamic "statement" {
    for_each = each.value.deny_non_kms_uploads && each.value.use_kms_encryption ? [1] : []
    content {
      sid       = "DenyNonKMSEncryption"
      effect    = "Deny"
      actions   = ["s3:PutObject"]
      resources = ["${aws_s3_bucket.main[each.key].arn}/*"]
      principals {
        type        = "*"
        identifiers = ["*"]
      }
      condition {
        test     = "StringNotEquals"
        variable = "s3:x-amz-server-side-encryption"
        values   = ["aws:kms"]
      }
    }
  }

  # VPC endpoint restriction
  dynamic "statement" {
    for_each = each.value.restrict_to_vpc_endpoint && each.value.vpc_endpoint_id != null ? [1] : []
    content {
      sid     = "RestrictToVPCEndpoint"
      effect  = "Deny"
      actions = ["s3:*"]
      resources = [
        aws_s3_bucket.main[each.key].arn,
        "${aws_s3_bucket.main[each.key].arn}/*"
      ]
      principals {
        type        = "*"
        identifiers = ["*"]
      }
      condition {
        test     = "StringNotEquals"
        variable = "aws:sourceVpce"
        values   = [each.value.vpc_endpoint_id]
      }
    }
  }

  # Custom policy statements
  dynamic "statement" {
    for_each = each.value.custom_policy_statements
    content {
      sid       = statement.value.sid
      effect    = statement.value.effect
      actions   = statement.value.actions
      resources = statement.value.resources

      principals {
        type        = statement.value.principal_type
        identifiers = statement.value.principal_identifiers
      }

      dynamic "condition" {
        for_each = statement.value.conditions
        content {
          test     = condition.value.test
          variable = condition.value.variable
          values   = condition.value.values
        }
      }
    }
  }
}

################################################################################
# IAM Policy for Application Access
################################################################################

resource "aws_iam_policy" "bucket_access" {
  for_each = { for k, v in var.buckets : k => v if v.create_access_policy }

  name        = "${var.project_name}-${var.environment}-${each.key}-bucket-access"
  description = "Policy for accessing ${each.key} S3 bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ListBucket"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = aws_s3_bucket.main[each.key].arn
      },
      {
        Sid      = "ObjectAccess"
        Effect   = "Allow"
        Action   = each.value.access_policy_actions
        Resource = "${aws_s3_bucket.main[each.key].arn}/*"
      },
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = each.value.use_kms_encryption ? (each.value.kms_key_arn != null ? each.value.kms_key_arn : var.default_kms_key_arn) : "*"
        Condition = each.value.use_kms_encryption ? null : {
          Bool = {
            "kms:GrantIsForAWSResource" = "true"
          }
        }
      }
    ]
  })

  tags = var.tags
}

################################################################################
# IRSA Policy for EKS Workloads
################################################################################

resource "aws_iam_policy" "eks_bucket_access" {
  for_each = { for k, v in var.buckets : k => v if v.create_eks_irsa_policy }

  name        = "${var.project_name}-${var.environment}-${each.key}-eks-bucket-access"
  description = "IRSA policy for EKS workloads to access ${each.key} S3 bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ListBucket"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = aws_s3_bucket.main[each.key].arn
      },
      {
        Sid      = "ObjectOperations"
        Effect   = "Allow"
        Action   = each.value.eks_irsa_policy_actions
        Resource = "${aws_s3_bucket.main[each.key].arn}/*"
      }
    ]
  })

  tags = var.tags
}
