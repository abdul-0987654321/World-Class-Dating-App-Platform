################################################################################
# AWS WAF v2 Web ACL Module
# Provides comprehensive web application firewall protection
################################################################################

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
  }
}

################################################################################
# Local Variables
################################################################################

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = merge(var.tags, {
    Module      = "waf"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  })
}

################################################################################
# S3 Bucket for WAF Logs
################################################################################

resource "aws_s3_bucket" "waf_logs" {
  count = var.enable_logging ? 1 : 0

  bucket = "aws-waf-logs-${local.name_prefix}-${data.aws_caller_identity.current.account_id}"

  tags = merge(local.common_tags, {
    Name    = "aws-waf-logs-${local.name_prefix}"
    Purpose = "WAF logging"
  })
}

resource "aws_s3_bucket_versioning" "waf_logs" {
  count = var.enable_logging ? 1 : 0

  bucket = aws_s3_bucket.waf_logs[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "waf_logs" {
  count = var.enable_logging ? 1 : 0

  bucket = aws_s3_bucket.waf_logs[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.log_bucket_kms_key_arn != "" ? "aws:kms" : "AES256"
      kms_master_key_id = var.log_bucket_kms_key_arn != "" ? var.log_bucket_kms_key_arn : null
    }
    bucket_key_enabled = var.log_bucket_kms_key_arn != "" ? true : false
  }
}

resource "aws_s3_bucket_public_access_block" "waf_logs" {
  count = var.enable_logging ? 1 : 0

  bucket = aws_s3_bucket.waf_logs[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "waf_logs" {
  count = var.enable_logging ? 1 : 0

  bucket = aws_s3_bucket.waf_logs[0].id

  rule {
    id     = "log-expiration"
    status = "Enabled"

    transition {
      days          = var.log_retention_days > 30 ? 30 : var.log_retention_days
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = var.log_retention_days > 90 ? 90 : var.log_retention_days
      storage_class = "GLACIER"
    }

    expiration {
      days = var.log_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

################################################################################
# IP Sets
################################################################################

resource "aws_wafv2_ip_set" "allowed_ips" {
  count = length(var.allowed_ips) > 0 ? 1 : 0

  name               = "${local.name_prefix}-allowed-ips"
  description        = "Allowed IP addresses that bypass WAF rules"
  scope              = var.scope
  ip_address_version = "IPV4"
  addresses          = var.allowed_ips

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-allowed-ips"
  })
}

resource "aws_wafv2_ip_set" "blocked_ips" {
  count = length(var.blocked_ips) > 0 ? 1 : 0

  name               = "${local.name_prefix}-blocked-ips"
  description        = "Blocked IP addresses"
  scope              = var.scope
  ip_address_version = "IPV4"
  addresses          = var.blocked_ips

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-blocked-ips"
  })
}

################################################################################
# WAF Web ACL
################################################################################

resource "aws_wafv2_web_acl" "main" {
  name        = "${local.name_prefix}-web-acl"
  description = "WAF Web ACL for ${var.project_name} ${var.environment} environment"
  scope       = var.scope

  default_action {
    allow {}
  }

  # Rule 1: Allow whitelisted IPs (highest priority)
  dynamic "rule" {
    for_each = length(var.allowed_ips) > 0 ? [1] : []

    content {
      name     = "AllowWhitelistedIPs"
      priority = 0

      override_action {
        none {}
      }

      statement {
        ip_set_reference_statement {
          arn = aws_wafv2_ip_set.allowed_ips[0].arn
        }
      }

      action {
        allow {}
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${local.name_prefix}-allowed-ips"
        sampled_requests_enabled   = true
      }
    }
  }

  # Rule 2: Block blacklisted IPs
  dynamic "rule" {
    for_each = length(var.blocked_ips) > 0 ? [1] : []

    content {
      name     = "BlockBlacklistedIPs"
      priority = 1

      statement {
        ip_set_reference_statement {
          arn = aws_wafv2_ip_set.blocked_ips[0].arn
        }
      }

      action {
        block {}
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${local.name_prefix}-blocked-ips"
        sampled_requests_enabled   = true
      }
    }
  }

  # Rule 3: Geo-blocking for restricted countries
  dynamic "rule" {
    for_each = length(var.blocked_countries) > 0 ? [1] : []

    content {
      name     = "BlockRestrictedCountries"
      priority = 2

      statement {
        geo_match_statement {
          country_codes = var.blocked_countries
        }
      }

      action {
        block {
          custom_response {
            response_code            = 403
            custom_response_body_key = "geo-blocked"
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${local.name_prefix}-geo-block"
        sampled_requests_enabled   = true
      }
    }
  }

  # Rule 4: Rate-based rule to prevent DDoS
  dynamic "rule" {
    for_each = var.enable_rate_limiting ? [1] : []

    content {
      name     = "RateLimitRule"
      priority = 3

      statement {
        rate_based_statement {
          limit              = var.rate_limit
          aggregate_key_type = "IP"
        }
      }

      action {
        block {
          custom_response {
            response_code            = 429
            custom_response_body_key = "rate-limited"
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${local.name_prefix}-rate-limit"
        sampled_requests_enabled   = true
      }
    }
  }

  # Rule 5: AWS Managed Rules - Common Rule Set
  dynamic "rule" {
    for_each = var.enable_common_rules ? [1] : []

    content {
      name     = "AWSManagedRulesCommonRuleSet"
      priority = 10

      override_action {
        none {}
      }

      statement {
        managed_rule_group_statement {
          name        = "AWSManagedRulesCommonRuleSet"
          vendor_name = "AWS"

          dynamic "rule_action_override" {
            for_each = var.common_rules_excluded_rules

            content {
              name = rule_action_override.value
              action_to_use {
                count {}
              }
            }
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${local.name_prefix}-common-rules"
        sampled_requests_enabled   = true
      }
    }
  }

  # Rule 6: AWS Managed Rules - Known Bad Inputs Rule Set
  dynamic "rule" {
    for_each = var.enable_known_bad_inputs_rules ? [1] : []

    content {
      name     = "AWSManagedRulesKnownBadInputsRuleSet"
      priority = 20

      override_action {
        none {}
      }

      statement {
        managed_rule_group_statement {
          name        = "AWSManagedRulesKnownBadInputsRuleSet"
          vendor_name = "AWS"

          dynamic "rule_action_override" {
            for_each = var.known_bad_inputs_excluded_rules

            content {
              name = rule_action_override.value
              action_to_use {
                count {}
              }
            }
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${local.name_prefix}-known-bad-inputs"
        sampled_requests_enabled   = true
      }
    }
  }

  # Rule 7: AWS Managed Rules - SQL Injection Rule Set
  dynamic "rule" {
    for_each = var.enable_sqli_rules ? [1] : []

    content {
      name     = "AWSManagedRulesSQLiRuleSet"
      priority = 30

      override_action {
        none {}
      }

      statement {
        managed_rule_group_statement {
          name        = "AWSManagedRulesSQLiRuleSet"
          vendor_name = "AWS"

          dynamic "rule_action_override" {
            for_each = var.sqli_excluded_rules

            content {
              name = rule_action_override.value
              action_to_use {
                count {}
              }
            }
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${local.name_prefix}-sqli-rules"
        sampled_requests_enabled   = true
      }
    }
  }

  # Custom response bodies
  custom_response_body {
    key          = "geo-blocked"
    content      = "{\"error\": \"Access denied from your region\"}"
    content_type = "APPLICATION_JSON"
  }

  custom_response_body {
    key          = "rate-limited"
    content      = "{\"error\": \"Too many requests. Please try again later.\"}"
    content_type = "APPLICATION_JSON"
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-web-acl"
    sampled_requests_enabled   = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-web-acl"
  })
}

################################################################################
# CloudWatch Log Group for WAF
################################################################################

resource "aws_cloudwatch_log_group" "waf" {
  count = var.enable_logging ? 1 : 0

  name              = "aws-waf-logs-${local.name_prefix}"
  retention_in_days = var.cloudwatch_log_retention_days

  tags = merge(local.common_tags, {
    Name = "aws-waf-logs-${local.name_prefix}"
  })
}

################################################################################
# WAF Logging Configuration
################################################################################

resource "aws_wafv2_web_acl_logging_configuration" "main" {
  count = var.enable_logging ? 1 : 0

  log_destination_configs = [aws_cloudwatch_log_group.waf[0].arn]
  resource_arn            = aws_wafv2_web_acl.main.arn

  dynamic "redacted_fields" {
    for_each = var.redacted_fields

    content {
      dynamic "single_header" {
        for_each = redacted_fields.value.type == "single_header" ? [1] : []

        content {
          name = redacted_fields.value.name
        }
      }
    }
  }

  logging_filter {
    default_behavior = "KEEP"

    filter {
      behavior    = "DROP"
      requirement = "MEETS_ANY"

      condition {
        action_condition {
          action = "ALLOW"
        }
      }
    }
  }
}

################################################################################
# Data Sources
################################################################################

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}
