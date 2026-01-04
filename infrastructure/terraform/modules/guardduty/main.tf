################################################################################
# GuardDuty Module
# AWS-native threat detection service for continuous security monitoring
# Provides intelligent threat detection across AWS accounts
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
data "aws_region" "current" {}

################################################################################
# GuardDuty Detector
################################################################################

resource "aws_guardduty_detector" "main" {
  enable                       = var.enable_guardduty
  finding_publishing_frequency = var.finding_publishing_frequency

  datasources {
    # S3 Protection - Detects suspicious activities in S3 data events
    s3_logs {
      enable = var.enable_s3_protection
    }

    # Kubernetes Protection - Monitors EKS cluster audit logs
    kubernetes {
      audit_logs {
        enable = var.enable_eks_protection
      }
    }

    # Malware Protection - Scans EBS volumes for malware
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = var.enable_malware_protection
        }
      }
    }
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-guardduty"
  })
}

################################################################################
# GuardDuty EKS Runtime Monitoring (Runtime Protection for Containers)
################################################################################

resource "aws_guardduty_detector_feature" "eks_runtime_monitoring" {
  count = var.enable_eks_runtime_monitoring ? 1 : 0

  detector_id = aws_guardduty_detector.main.id
  name        = "EKS_RUNTIME_MONITORING"
  status      = "ENABLED"

  additional_configuration {
    name   = "EKS_ADDON_MANAGEMENT"
    status = var.auto_enable_eks_addon ? "ENABLED" : "DISABLED"
  }
}

################################################################################
# GuardDuty RDS Protection
################################################################################

resource "aws_guardduty_detector_feature" "rds_login_events" {
  count = var.enable_rds_protection ? 1 : 0

  detector_id = aws_guardduty_detector.main.id
  name        = "RDS_LOGIN_EVENTS"
  status      = "ENABLED"
}

################################################################################
# GuardDuty Lambda Protection
################################################################################

resource "aws_guardduty_detector_feature" "lambda_network_logs" {
  count = var.enable_lambda_protection ? 1 : 0

  detector_id = aws_guardduty_detector.main.id
  name        = "LAMBDA_NETWORK_LOGS"
  status      = "ENABLED"
}

################################################################################
# GuardDuty Publishing Destination (S3)
################################################################################

resource "aws_s3_bucket" "guardduty_findings" {
  count = var.create_findings_bucket ? 1 : 0

  bucket        = "${var.project_name}-${var.environment}-guardduty-findings-${data.aws_caller_identity.current.account_id}"
  force_destroy = var.force_destroy_findings_bucket

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-guardduty-findings"
    Purpose = "GuardDuty findings export"
  })
}

resource "aws_s3_bucket_versioning" "guardduty_findings" {
  count = var.create_findings_bucket ? 1 : 0

  bucket = aws_s3_bucket.guardduty_findings[0].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "guardduty_findings" {
  count = var.create_findings_bucket ? 1 : 0

  bucket = aws_s3_bucket.guardduty_findings[0].id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = var.kms_key_arn != null ? "aws:kms" : "AES256"
    }
    bucket_key_enabled = var.kms_key_arn != null
  }
}

resource "aws_s3_bucket_public_access_block" "guardduty_findings" {
  count = var.create_findings_bucket ? 1 : 0

  bucket = aws_s3_bucket.guardduty_findings[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "guardduty_findings" {
  count = var.create_findings_bucket ? 1 : 0

  bucket = aws_s3_bucket.guardduty_findings[0].id

  rule {
    id     = "findings-retention"
    status = "Enabled"

    transition {
      days          = var.findings_transition_to_ia_days
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = var.findings_transition_to_glacier_days
      storage_class = "GLACIER"
    }

    expiration {
      days = var.findings_expiration_days
    }
  }
}

resource "aws_s3_bucket_policy" "guardduty_findings" {
  count = var.create_findings_bucket ? 1 : 0

  bucket = aws_s3_bucket.guardduty_findings[0].id
  policy = data.aws_iam_policy_document.guardduty_bucket_policy[0].json
}

data "aws_iam_policy_document" "guardduty_bucket_policy" {
  count = var.create_findings_bucket ? 1 : 0

  statement {
    sid    = "AllowGuardDutyGetBucketLocation"
    effect = "Allow"
    actions = [
      "s3:GetBucketLocation"
    ]
    resources = [aws_s3_bucket.guardduty_findings[0].arn]
    principals {
      type        = "Service"
      identifiers = ["guardduty.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }

  statement {
    sid    = "AllowGuardDutyPutObject"
    effect = "Allow"
    actions = [
      "s3:PutObject"
    ]
    resources = ["${aws_s3_bucket.guardduty_findings[0].arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["guardduty.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }

  statement {
    sid     = "DenyNonSSLAccess"
    effect  = "Deny"
    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.guardduty_findings[0].arn,
      "${aws_s3_bucket.guardduty_findings[0].arn}/*"
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

# KMS key policy for GuardDuty
data "aws_iam_policy_document" "guardduty_kms" {
  count = var.kms_key_arn != null && var.create_findings_bucket ? 1 : 0

  statement {
    sid    = "AllowGuardDutyKMSAccess"
    effect = "Allow"
    actions = [
      "kms:GenerateDataKey",
      "kms:Encrypt"
    ]
    resources = [var.kms_key_arn]
    principals {
      type        = "Service"
      identifiers = ["guardduty.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_guardduty_publishing_destination" "s3" {
  count = var.create_findings_bucket && var.publish_to_s3 ? 1 : 0

  detector_id     = aws_guardduty_detector.main.id
  destination_arn = aws_s3_bucket.guardduty_findings[0].arn
  kms_key_arn     = var.kms_key_arn

  depends_on = [
    aws_s3_bucket_policy.guardduty_findings
  ]
}

################################################################################
# GuardDuty Filters (Suppress False Positives)
################################################################################

resource "aws_guardduty_filter" "main" {
  for_each = var.filters

  detector_id = aws_guardduty_detector.main.id
  name        = each.key
  action      = each.value.action
  rank        = each.value.rank
  description = each.value.description

  finding_criteria {
    dynamic "criterion" {
      for_each = each.value.criteria
      content {
        field                 = criterion.value.field
        equals                = lookup(criterion.value, "equals", null)
        not_equals            = lookup(criterion.value, "not_equals", null)
        greater_than          = lookup(criterion.value, "greater_than", null)
        greater_than_or_equal = lookup(criterion.value, "greater_than_or_equal", null)
        less_than             = lookup(criterion.value, "less_than", null)
        less_than_or_equal    = lookup(criterion.value, "less_than_or_equal", null)
      }
    }
  }

  tags = var.tags
}

################################################################################
# GuardDuty Threat Intelligence Set (Custom Threat Lists)
################################################################################

resource "aws_guardduty_threatintelset" "main" {
  for_each = var.threat_intel_sets

  detector_id = aws_guardduty_detector.main.id
  name        = each.key
  format      = each.value.format
  location    = each.value.location
  activate    = each.value.activate

  tags = var.tags
}

################################################################################
# GuardDuty IP Set (Trusted IPs)
################################################################################

resource "aws_guardduty_ipset" "trusted" {
  for_each = var.trusted_ip_sets

  detector_id = aws_guardduty_detector.main.id
  name        = each.key
  format      = each.value.format
  location    = each.value.location
  activate    = each.value.activate

  tags = var.tags
}

################################################################################
# CloudWatch Event Rule for High Severity Findings
################################################################################

resource "aws_cloudwatch_event_rule" "guardduty_findings" {
  count = var.create_finding_alerts ? 1 : 0

  name        = "${var.project_name}-${var.environment}-guardduty-findings"
  description = "Capture GuardDuty findings with severity >= ${var.alert_severity_threshold}"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      severity = [{
        numeric = [">=", var.alert_severity_threshold]
      }]
    }
  })

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "guardduty_sns" {
  count = var.create_finding_alerts && var.alert_sns_topic_arn != null ? 1 : 0

  rule      = aws_cloudwatch_event_rule.guardduty_findings[0].name
  target_id = "GuardDutyFindingsToSNS"
  arn       = var.alert_sns_topic_arn

  input_transformer {
    input_paths = {
      severity    = "$.detail.severity"
      finding     = "$.detail.type"
      description = "$.detail.description"
      region      = "$.region"
      account     = "$.account"
      time        = "$.time"
    }
    input_template = <<EOF
{
  "source": "GuardDuty",
  "severity": <severity>,
  "finding": "<finding>",
  "description": "<description>",
  "region": "<region>",
  "account": "<account>",
  "time": "<time>",
  "environment": "${var.environment}"
}
EOF
  }
}

resource "aws_sns_topic_policy" "guardduty_events" {
  count = var.create_finding_alerts && var.alert_sns_topic_arn != null ? 1 : 0

  arn = var.alert_sns_topic_arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEventBridgePublish"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = var.alert_sns_topic_arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_cloudwatch_event_rule.guardduty_findings[0].arn
          }
        }
      }
    ]
  })
}

################################################################################
# Organization Configuration (for multi-account setups)
################################################################################

resource "aws_guardduty_organization_admin_account" "main" {
  count = var.enable_organization_admin ? 1 : 0

  admin_account_id = var.delegated_admin_account_id != null ? var.delegated_admin_account_id : data.aws_caller_identity.current.account_id

  depends_on = [aws_guardduty_detector.main]
}

resource "aws_guardduty_organization_configuration" "main" {
  count = var.enable_organization_admin ? 1 : 0

  auto_enable_organization_members = var.auto_enable_organization_members
  detector_id                      = aws_guardduty_detector.main.id

  datasources {
    s3_logs {
      auto_enable = var.enable_s3_protection
    }
    kubernetes {
      audit_logs {
        enable = var.enable_eks_protection
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          auto_enable = var.enable_malware_protection
        }
      }
    }
  }

  depends_on = [aws_guardduty_organization_admin_account.main]
}
