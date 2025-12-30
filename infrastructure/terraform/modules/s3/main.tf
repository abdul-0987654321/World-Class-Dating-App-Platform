################################################################################
# S3 Buckets Module
# Provides S3 buckets with encryption, versioning, and lifecycle rules
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
# S3 Buckets
################################################################################

resource "aws_s3_bucket" "main" {
  for_each = var.buckets

  bucket        = "${var.project_name}-${var.environment}-${each.key}-${data.aws_caller_identity.current.account_id}"
  force_destroy = each.value.force_destroy

  tags = merge(var.tags, each.value.tags, {
    Name    = "${var.project_name}-${var.environment}-${each.key}"
    Purpose = each.value.purpose
  })
}

################################################################################
# Bucket Versioning
################################################################################

resource "aws_s3_bucket_versioning" "main" {
  for_each = var.buckets

  bucket = aws_s3_bucket.main[each.key].id

  versioning_configuration {
    status = each.value.versioning_enabled ? "Enabled" : "Suspended"
  }
}

################################################################################
# Server-Side Encryption
################################################################################

resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  for_each = var.buckets

  bucket = aws_s3_bucket.main[each.key].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = each.value.use_kms_encryption ? "aws:kms" : "AES256"
      kms_master_key_id = each.value.use_kms_encryption ? (each.value.kms_key_arn != null ? each.value.kms_key_arn : var.default_kms_key_arn) : null
    }
    bucket_key_enabled = each.value.use_kms_encryption
  }
}

################################################################################
# Public Access Block
################################################################################

resource "aws_s3_bucket_public_access_block" "main" {
  for_each = var.buckets

  bucket = aws_s3_bucket.main[each.key].id

  block_public_acls       = each.value.block_public_access
  block_public_policy     = each.value.block_public_access
  ignore_public_acls      = each.value.block_public_access
  restrict_public_buckets = each.value.block_public_access
}

################################################################################
# Bucket Ownership Controls
################################################################################

resource "aws_s3_bucket_ownership_controls" "main" {
  for_each = var.buckets

  bucket = aws_s3_bucket.main[each.key].id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }

  depends_on = [aws_s3_bucket_public_access_block.main]
}

################################################################################
# Lifecycle Rules
################################################################################

resource "aws_s3_bucket_lifecycle_configuration" "main" {
  for_each = { for k, v in var.buckets : k => v if length(v.lifecycle_rules) > 0 }

  bucket = aws_s3_bucket.main[each.key].id

  dynamic "rule" {
    for_each = each.value.lifecycle_rules
    content {
      id     = rule.value.id
      status = rule.value.enabled ? "Enabled" : "Disabled"

      dynamic "filter" {
        for_each = rule.value.prefix != null || rule.value.tags != null ? [1] : []
        content {
          and {
            prefix = rule.value.prefix
            tags   = rule.value.tags
          }
        }
      }

      dynamic "expiration" {
        for_each = rule.value.expiration_days != null ? [1] : []
        content {
          days = rule.value.expiration_days
        }
      }

      dynamic "transition" {
        for_each = rule.value.transitions
        content {
          days          = transition.value.days
          storage_class = transition.value.storage_class
        }
      }

      dynamic "noncurrent_version_expiration" {
        for_each = rule.value.noncurrent_version_expiration_days != null ? [1] : []
        content {
          noncurrent_days = rule.value.noncurrent_version_expiration_days
        }
      }

      dynamic "noncurrent_version_transition" {
        for_each = rule.value.noncurrent_version_transitions
        content {
          noncurrent_days = noncurrent_version_transition.value.days
          storage_class   = noncurrent_version_transition.value.storage_class
        }
      }

      dynamic "abort_incomplete_multipart_upload" {
        for_each = rule.value.abort_incomplete_multipart_upload_days != null ? [1] : []
        content {
          days_after_initiation = rule.value.abort_incomplete_multipart_upload_days
        }
      }
    }
  }

  depends_on = [aws_s3_bucket_versioning.main]
}

################################################################################
# CORS Configuration
################################################################################

resource "aws_s3_bucket_cors_configuration" "main" {
  for_each = { for k, v in var.buckets : k => v if length(v.cors_rules) > 0 }

  bucket = aws_s3_bucket.main[each.key].id

  dynamic "cors_rule" {
    for_each = each.value.cors_rules
    content {
      allowed_headers = cors_rule.value.allowed_headers
      allowed_methods = cors_rule.value.allowed_methods
      allowed_origins = cors_rule.value.allowed_origins
      expose_headers  = cors_rule.value.expose_headers
      max_age_seconds = cors_rule.value.max_age_seconds
    }
  }
}

################################################################################
# Bucket Logging
################################################################################

resource "aws_s3_bucket_logging" "main" {
  for_each = { for k, v in var.buckets : k => v if v.logging_enabled && v.logging_target_bucket != null }

  bucket = aws_s3_bucket.main[each.key].id

  target_bucket = each.value.logging_target_bucket
  target_prefix = each.value.logging_target_prefix != null ? each.value.logging_target_prefix : "${each.key}/"
}

################################################################################
# Object Lock Configuration
################################################################################

resource "aws_s3_bucket_object_lock_configuration" "main" {
  for_each = { for k, v in var.buckets : k => v if v.object_lock_enabled }

  bucket = aws_s3_bucket.main[each.key].id

  rule {
    default_retention {
      mode = each.value.object_lock_mode
      days = each.value.object_lock_days
    }
  }
}

################################################################################
# Intelligent Tiering Configuration
################################################################################

resource "aws_s3_bucket_intelligent_tiering_configuration" "main" {
  for_each = { for k, v in var.buckets : k => v if v.intelligent_tiering_enabled }

  bucket = aws_s3_bucket.main[each.key].id
  name   = "${each.key}-intelligent-tiering"

  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = each.value.archive_access_tier_days
  }

  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = each.value.deep_archive_access_tier_days
  }
}

################################################################################
# Replication Configuration
################################################################################

resource "aws_s3_bucket_replication_configuration" "main" {
  for_each = { for k, v in var.buckets : k => v if v.replication_enabled }

  bucket = aws_s3_bucket.main[each.key].id
  role   = aws_iam_role.replication[each.key].arn

  rule {
    id     = "replication-rule"
    status = "Enabled"

    destination {
      bucket        = each.value.replication_destination_bucket_arn
      storage_class = each.value.replication_storage_class

      dynamic "encryption_configuration" {
        for_each = each.value.replication_destination_kms_key_arn != null ? [1] : []
        content {
          replica_kms_key_id = each.value.replication_destination_kms_key_arn
        }
      }
    }

    dynamic "source_selection_criteria" {
      for_each = each.value.use_kms_encryption ? [1] : []
      content {
        sse_kms_encrypted_objects {
          status = "Enabled"
        }
      }
    }
  }

  depends_on = [aws_s3_bucket_versioning.main]
}

resource "aws_iam_role" "replication" {
  for_each = { for k, v in var.buckets : k => v if v.replication_enabled }

  name = "${var.project_name}-${var.environment}-${each.key}-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "replication" {
  for_each = { for k, v in var.buckets : k => v if v.replication_enabled }

  name = "${var.project_name}-${var.environment}-${each.key}-replication-policy"
  role = aws_iam_role.replication[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Effect   = "Allow"
        Resource = aws_s3_bucket.main[each.key].arn
      },
      {
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Effect   = "Allow"
        Resource = "${aws_s3_bucket.main[each.key].arn}/*"
      },
      {
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Effect   = "Allow"
        Resource = "${each.value.replication_destination_bucket_arn}/*"
      }
    ]
  })
}

################################################################################
# Bucket Notification Configuration
################################################################################

resource "aws_s3_bucket_notification" "main" {
  for_each = { for k, v in var.buckets : k => v if length(v.event_notifications) > 0 }

  bucket = aws_s3_bucket.main[each.key].id

  dynamic "lambda_function" {
    for_each = [for n in each.value.event_notifications : n if n.type == "lambda"]
    content {
      lambda_function_arn = lambda_function.value.arn
      events              = lambda_function.value.events
      filter_prefix       = lambda_function.value.filter_prefix
      filter_suffix       = lambda_function.value.filter_suffix
    }
  }

  dynamic "topic" {
    for_each = [for n in each.value.event_notifications : n if n.type == "sns"]
    content {
      topic_arn     = topic.value.arn
      events        = topic.value.events
      filter_prefix = topic.value.filter_prefix
      filter_suffix = topic.value.filter_suffix
    }
  }

  dynamic "queue" {
    for_each = [for n in each.value.event_notifications : n if n.type == "sqs"]
    content {
      queue_arn     = queue.value.arn
      events        = queue.value.events
      filter_prefix = queue.value.filter_prefix
      filter_suffix = queue.value.filter_suffix
    }
  }
}
