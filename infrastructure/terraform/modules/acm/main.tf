################################################################################
# ACM Certificate Module
# Manages SSL/TLS certificates for CloudFront and ALB
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
# Primary Certificate (for CloudFront - must be in us-east-1)
################################################################################

resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  options {
    certificate_transparency_logging_preference = var.certificate_transparency_logging ? "ENABLED" : "DISABLED"
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-certificate"
  })
}

################################################################################
# DNS Validation Records
################################################################################

resource "aws_route53_record" "validation" {
  for_each = var.create_route53_records ? {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}

################################################################################
# Certificate Validation
################################################################################

resource "aws_acm_certificate_validation" "main" {
  count = var.wait_for_validation ? 1 : 0

  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = var.create_route53_records ? [for record in aws_route53_record.validation : record.fqdn] : var.validation_record_fqdns

  timeouts {
    create = var.validation_timeout
  }
}

################################################################################
# Regional Certificate (for ALB - in specified region)
################################################################################

resource "aws_acm_certificate" "regional" {
  count = var.create_regional_certificate ? 1 : 0

  provider = aws

  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  options {
    certificate_transparency_logging_preference = var.certificate_transparency_logging ? "ENABLED" : "DISABLED"
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-regional-certificate"
  })
}

resource "aws_route53_record" "regional_validation" {
  for_each = var.create_regional_certificate && var.create_route53_records ? {
    for dvo in aws_acm_certificate.regional[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}

resource "aws_acm_certificate_validation" "regional" {
  count = var.create_regional_certificate && var.wait_for_validation ? 1 : 0

  certificate_arn         = aws_acm_certificate.regional[0].arn
  validation_record_fqdns = var.create_route53_records ? [for record in aws_route53_record.regional_validation : record.fqdn] : var.validation_record_fqdns

  timeouts {
    create = var.validation_timeout
  }
}
