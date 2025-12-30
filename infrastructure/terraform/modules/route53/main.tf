################################################################################
# Route53 DNS Management
# Replaces Azure DNS
################################################################################

# Public Hosted Zone
resource "aws_route53_zone" "public" {
  count = var.create_public_zone ? 1 : 0

  name    = var.domain_name
  comment = "${var.project_name} ${var.environment} public zone"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-public"
  })
}

# Private Hosted Zone (for internal DNS)
resource "aws_route53_zone" "private" {
  count = var.create_private_zone ? 1 : 0

  name    = var.private_domain_name != null ? var.private_domain_name : "internal.${var.domain_name}"
  comment = "${var.project_name} ${var.environment} private zone"

  vpc {
    vpc_id = var.vpc_id
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-private"
  })
}

################################################################################
# DNS Records
################################################################################

# CloudFront Alias Record (root domain)
resource "aws_route53_record" "cloudfront_root" {
  count = var.create_public_zone && var.cloudfront_distribution_domain_name != null ? 1 : 0

  zone_id = aws_route53_zone.public[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_distribution_domain_name
    zone_id                = var.cloudfront_distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

# CloudFront Alias Record (www subdomain)
resource "aws_route53_record" "cloudfront_www" {
  count = var.create_public_zone && var.cloudfront_distribution_domain_name != null && var.create_www_record ? 1 : 0

  zone_id = aws_route53_zone.public[0].zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.cloudfront_distribution_domain_name
    zone_id                = var.cloudfront_distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

# API subdomain (CloudFront or ALB)
resource "aws_route53_record" "api" {
  count = var.create_public_zone && var.api_domain_name != null ? 1 : 0

  zone_id = aws_route53_zone.public[0].zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.api_domain_name
    zone_id                = var.api_hosted_zone_id
    evaluate_target_health = true
  }
}

# ALB Record (for direct ALB access if needed)
resource "aws_route53_record" "alb" {
  count = var.create_public_zone && var.alb_dns_name != null ? 1 : 0

  zone_id = aws_route53_zone.public[0].zone_id
  name    = var.alb_subdomain != null ? "${var.alb_subdomain}.${var.domain_name}" : "lb.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Custom DNS Records
resource "aws_route53_record" "custom" {
  for_each = var.custom_records

  zone_id = var.custom_records[each.key].private ? aws_route53_zone.private[0].zone_id : aws_route53_zone.public[0].zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = each.value.ttl
  records = each.value.records
}

# Alias Records
resource "aws_route53_record" "alias" {
  for_each = var.alias_records

  zone_id = var.alias_records[each.key].private ? aws_route53_zone.private[0].zone_id : aws_route53_zone.public[0].zone_id
  name    = each.value.name
  type    = each.value.type

  alias {
    name                   = each.value.alias_target
    zone_id                = each.value.alias_zone_id
    evaluate_target_health = each.value.evaluate_target_health
  }
}

################################################################################
# ACM Certificate Validation Records
################################################################################

resource "aws_route53_record" "acm_validation" {
  for_each = var.acm_validation_records

  zone_id = aws_route53_zone.public[0].zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 300
  records = [each.value.record]

  allow_overwrite = true
}

################################################################################
# Private Zone Records
################################################################################

# RDS Endpoint (private)
resource "aws_route53_record" "rds" {
  count = var.create_private_zone && var.create_rds_record ? 1 : 0

  zone_id = aws_route53_zone.private[0].zone_id
  name    = "db.${var.private_domain_name != null ? var.private_domain_name : "internal.${var.domain_name}"}"
  type    = "CNAME"
  ttl     = 300
  records = [var.rds_endpoint]
}

# ElastiCache Endpoint (private)
resource "aws_route53_record" "elasticache" {
  count = var.create_private_zone && var.create_elasticache_record ? 1 : 0

  zone_id = aws_route53_zone.private[0].zone_id
  name    = "redis.${var.private_domain_name != null ? var.private_domain_name : "internal.${var.domain_name}"}"
  type    = "CNAME"
  ttl     = 300
  records = [var.elasticache_endpoint]
}

################################################################################
# Health Checks
################################################################################

resource "aws_route53_health_check" "main" {
  for_each = var.health_checks

  fqdn              = each.value.fqdn
  port              = each.value.port
  type              = each.value.type
  resource_path     = each.value.resource_path
  failure_threshold = each.value.failure_threshold
  request_interval  = each.value.request_interval

  regions = each.value.regions

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-${each.key}"
  })
}

# CloudWatch Alarm for Health Check
resource "aws_cloudwatch_metric_alarm" "health_check" {
  for_each = { for k, v in var.health_checks : k => v if v.create_alarm }

  alarm_name          = "${var.project_name}-${var.environment}-${each.key}-health"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "Route53 health check failed for ${each.key}"

  dimensions = {
    HealthCheckId = aws_route53_health_check.main[each.key].id
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = var.tags
}

################################################################################
# DNSSEC (Optional)
################################################################################

resource "aws_route53_key_signing_key" "main" {
  count = var.enable_dnssec && var.create_public_zone ? 1 : 0

  hosted_zone_id             = aws_route53_zone.public[0].id
  key_management_service_arn = var.dnssec_kms_key_arn
  name                       = "${var.project_name}-${var.environment}-ksk"
}

resource "aws_route53_hosted_zone_dnssec" "main" {
  count = var.enable_dnssec && var.create_public_zone ? 1 : 0

  hosted_zone_id = aws_route53_key_signing_key.main[0].hosted_zone_id

  depends_on = [aws_route53_key_signing_key.main]
}

################################################################################
# Query Logging
################################################################################

resource "aws_route53_query_log" "main" {
  count = var.enable_query_logging && var.create_public_zone ? 1 : 0

  cloudwatch_log_group_arn = var.query_log_group_arn
  zone_id                  = aws_route53_zone.public[0].zone_id

  depends_on = [aws_cloudwatch_log_resource_policy.route53]
}

resource "aws_cloudwatch_log_resource_policy" "route53" {
  count = var.enable_query_logging && var.create_public_zone ? 1 : 0

  policy_name = "${var.project_name}-${var.environment}-route53-query-logging"
  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Route53QueryLogging"
        Effect = "Allow"
        Principal = {
          Service = "route53.amazonaws.com"
        }
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${var.query_log_group_arn}:*"
      }
    ]
  })
}
