################################################################################
# CloudFront Distribution with WAF
# Replaces Azure Front Door + WAF
################################################################################

# Origin Access Control for S3
resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "${var.project_name}-${var.environment}-s3-oac"
  description                       = "OAC for S3 media bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} ${var.environment} distribution"
  default_root_object = var.default_root_object
  price_class         = var.price_class
  aliases             = var.domain_names
  web_acl_id          = var.enable_waf ? aws_wafv2_web_acl.main[0].arn : null

  # S3 Origin for media
  dynamic "origin" {
    for_each = var.s3_origins
    content {
      domain_name              = origin.value.bucket_regional_domain_name
      origin_id                = origin.value.origin_id
      origin_access_control_id = aws_cloudfront_origin_access_control.s3.id

      dynamic "origin_shield" {
        for_each = origin.value.enable_origin_shield ? [1] : []
        content {
          enabled              = true
          origin_shield_region = var.origin_shield_region
        }
      }
    }
  }

  # ALB/API Origin
  dynamic "origin" {
    for_each = var.alb_origins
    content {
      domain_name = origin.value.domain_name
      origin_id   = origin.value.origin_id

      custom_origin_config {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
        origin_read_timeout    = 60
      }

      dynamic "custom_header" {
        for_each = origin.value.custom_headers
        content {
          name  = custom_header.value.name
          value = custom_header.value.value
        }
      }
    }
  }

  # Default cache behavior (API)
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = var.default_origin_id

    cache_policy_id          = var.api_cache_policy_id != null ? var.api_cache_policy_id : aws_cloudfront_cache_policy.api[0].id
    origin_request_policy_id = var.api_origin_request_policy_id != null ? var.api_origin_request_policy_id : aws_cloudfront_origin_request_policy.api[0].id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    dynamic "function_association" {
      for_each = var.default_function_associations
      content {
        event_type   = function_association.value.event_type
        function_arn = function_association.value.function_arn
      }
    }
  }

  # Media cache behavior (S3)
  dynamic "ordered_cache_behavior" {
    for_each = var.s3_origins
    content {
      path_pattern     = ordered_cache_behavior.value.path_pattern
      allowed_methods  = ["GET", "HEAD", "OPTIONS"]
      cached_methods   = ["GET", "HEAD", "OPTIONS"]
      target_origin_id = ordered_cache_behavior.value.origin_id

      cache_policy_id          = var.media_cache_policy_id != null ? var.media_cache_policy_id : aws_cloudfront_cache_policy.media[0].id
      origin_request_policy_id = data.aws_cloudfront_origin_request_policy.cors_s3.id

      viewer_protocol_policy = "redirect-to-https"
      compress               = true
    }
  }

  # Custom error responses
  dynamic "custom_error_response" {
    for_each = var.custom_error_responses
    content {
      error_code            = custom_error_response.value.error_code
      response_code         = custom_error_response.value.response_code
      response_page_path    = custom_error_response.value.response_page_path
      error_caching_min_ttl = custom_error_response.value.error_caching_min_ttl
    }
  }

  # Geo restrictions
  restrictions {
    geo_restriction {
      restriction_type = var.geo_restriction_type
      locations        = var.geo_restriction_locations
    }
  }

  # TLS certificate
  viewer_certificate {
    acm_certificate_arn            = var.acm_certificate_arn
    ssl_support_method             = var.acm_certificate_arn != null ? "sni-only" : null
    minimum_protocol_version       = "TLSv1.2_2021"
    cloudfront_default_certificate = var.acm_certificate_arn == null
  }

  # Logging
  dynamic "logging_config" {
    for_each = var.enable_logging ? [1] : []
    content {
      include_cookies = false
      bucket          = var.logging_bucket
      prefix          = var.logging_prefix
    }
  }

  tags = var.tags
}

# API Cache Policy
resource "aws_cloudfront_cache_policy" "api" {
  count = var.api_cache_policy_id == null ? 1 : 0

  name        = "${var.project_name}-${var.environment}-api-cache"
  comment     = "Cache policy for API responses"
  default_ttl = 0
  max_ttl     = 0
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Authorization", "Accept", "Accept-Language"]
      }
    }
    query_strings_config {
      query_string_behavior = "all"
    }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# Media Cache Policy
resource "aws_cloudfront_cache_policy" "media" {
  count = var.media_cache_policy_id == null ? 1 : 0

  name        = "${var.project_name}-${var.environment}-media-cache"
  comment     = "Cache policy for media files"
  default_ttl = 86400    # 1 day
  max_ttl     = 31536000 # 1 year
  min_ttl     = 3600     # 1 hour

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# API Origin Request Policy
resource "aws_cloudfront_origin_request_policy" "api" {
  count = var.api_origin_request_policy_id == null ? 1 : 0

  name    = "${var.project_name}-${var.environment}-api-origin"
  comment = "Origin request policy for API"

  cookies_config {
    cookie_behavior = "all"
  }
  headers_config {
    header_behavior = "whitelist"
    headers {
      items = [
        "Accept",
        "Accept-Language",
        "Authorization",
        "Content-Type",
        "Origin",
        "Referer",
        "User-Agent",
        "X-Forwarded-For",
        "X-Request-Id"
      ]
    }
  }
  query_strings_config {
    query_string_behavior = "all"
  }
}

# CORS S3 Origin Request Policy (managed)
data "aws_cloudfront_origin_request_policy" "cors_s3" {
  name = "Managed-CORS-S3Origin"
}

################################################################################
# WAF Web ACL
################################################################################

resource "aws_wafv2_web_acl" "main" {
  count = var.enable_waf ? 1 : 0

  name        = "${var.project_name}-${var.environment}-waf"
  description = "WAF for ${var.project_name} ${var.environment}"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # AWS Managed Rules - Common Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - SQL Injection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLiRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Rate limit - Auth endpoints (100 req/5min per IP)
  rule {
    name     = "RateLimitAuth"
    priority = 10

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 100
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            positional_constraint = "STARTS_WITH"
            search_string         = "/api/auth/"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitAuth"
      sampled_requests_enabled   = true
    }
  }

  # Rate limit - General API (1000 req/5min per IP)
  rule {
    name     = "RateLimitAPI"
    priority = 11

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            positional_constraint = "STARTS_WITH"
            search_string         = "/api/"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitAPI"
      sampled_requests_enabled   = true
    }
  }

  # Block suspicious user agents
  rule {
    name     = "BlockSuspiciousUserAgents"
    priority = 20

    action {
      block {}
    }

    statement {
      regex_pattern_set_reference_statement {
        arn = aws_wafv2_regex_pattern_set.suspicious_user_agents[0].arn
        field_to_match {
          single_header {
            name = "user-agent"
          }
        }
        text_transformation {
          priority = 0
          type     = "LOWERCASE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "BlockSuspiciousUserAgents"
      sampled_requests_enabled   = true
    }
  }

  # Geo blocking (optional)
  dynamic "rule" {
    for_each = length(var.blocked_countries) > 0 ? [1] : []
    content {
      name     = "GeoBlocking"
      priority = 30

      action {
        block {}
      }

      statement {
        geo_match_statement {
          country_codes = var.blocked_countries
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "GeoBlocking"
        sampled_requests_enabled   = true
      }
    }
  }

  # Block large payloads (> 10MB)
  rule {
    name     = "BlockLargePayloads"
    priority = 40

    action {
      block {}
    }

    statement {
      size_constraint_statement {
        comparison_operator = "GT"
        size                = 10485760 # 10MB
        field_to_match {
          body {
            oversize_handling = "MATCH"
          }
        }
        text_transformation {
          priority = 0
          type     = "NONE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "BlockLargePayloads"
      sampled_requests_enabled   = true
    }
  }

  # AWS Bot Control (optional)
  dynamic "rule" {
    for_each = var.enable_bot_control ? [1] : []
    content {
      name     = "AWSManagedRulesBotControlRuleSet"
      priority = 50

      override_action {
        none {}
      }

      statement {
        managed_rule_group_statement {
          name        = "AWSManagedRulesBotControlRuleSet"
          vendor_name = "AWS"

          managed_rule_group_configs {
            aws_managed_rules_bot_control_rule_set {
              inspection_level = "COMMON"
            }
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "AWSManagedRulesBotControlRuleSet"
        sampled_requests_enabled   = true
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-${var.environment}-waf"
    sampled_requests_enabled   = true
  }

  tags = var.tags
}

# Suspicious User Agents Pattern Set
resource "aws_wafv2_regex_pattern_set" "suspicious_user_agents" {
  count = var.enable_waf ? 1 : 0

  name        = "${var.project_name}-${var.environment}-suspicious-ua"
  description = "Suspicious user agent patterns"
  scope       = "CLOUDFRONT"

  regular_expression {
    regex_string = "sqlmap|nikto|nmap|masscan|zgrab|gobuster|dirbuster|wpscan|nuclei"
  }

  tags = var.tags
}

# WAF Logging
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  count = var.enable_waf && var.waf_logging_enabled ? 1 : 0

  log_destination_configs = [var.waf_log_destination_arn]
  resource_arn            = aws_wafv2_web_acl.main[0].arn

  dynamic "logging_filter" {
    for_each = var.waf_logging_filter != null ? [var.waf_logging_filter] : []
    content {
      default_behavior = logging_filter.value.default_behavior

      dynamic "filter" {
        for_each = logging_filter.value.filters
        content {
          behavior    = filter.value.behavior
          requirement = filter.value.requirement

          dynamic "condition" {
            for_each = filter.value.conditions
            content {
              dynamic "action_condition" {
                for_each = condition.value.action_condition != null ? [condition.value.action_condition] : []
                content {
                  action = action_condition.value.action
                }
              }
            }
          }
        }
      }
    }
  }
}
