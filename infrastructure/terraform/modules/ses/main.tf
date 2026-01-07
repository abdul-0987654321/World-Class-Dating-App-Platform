/**
 * AWS SES (Simple Email Service) Terraform Module
 *
 * Provides email sending infrastructure for the Flamoral dating platform.
 * Includes domain verification, DKIM, SPF, DMARC, and email templates.
 */

# ============================================================================
# DOMAIN IDENTITY
# ============================================================================

resource "aws_ses_domain_identity" "main" {
  domain = var.domain
}

resource "aws_ses_domain_identity_verification" "main" {
  count  = var.create_verification_record ? 1 : 0
  domain = aws_ses_domain_identity.main.id

  depends_on = [aws_route53_record.ses_verification]
}

# ============================================================================
# DKIM CONFIGURATION
# ============================================================================

resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

# ============================================================================
# MAIL FROM DOMAIN
# ============================================================================

resource "aws_ses_domain_mail_from" "main" {
  count = var.mail_from_subdomain != "" ? 1 : 0

  domain           = aws_ses_domain_identity.main.domain
  mail_from_domain = "${var.mail_from_subdomain}.${aws_ses_domain_identity.main.domain}"
}

# ============================================================================
# DNS RECORDS (Route53)
# ============================================================================

# SES Verification Record
resource "aws_route53_record" "ses_verification" {
  count = var.create_dns_records ? 1 : 0

  zone_id = var.route53_zone_id
  name    = "_amazonses.${var.domain}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.main.verification_token]
}

# DKIM Records
resource "aws_route53_record" "dkim" {
  count = var.create_dns_records ? 3 : 0

  zone_id = var.route53_zone_id
  name    = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}._domainkey.${var.domain}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.main.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# SPF Record for Mail From domain
resource "aws_route53_record" "spf_mail_from" {
  count = var.create_dns_records && var.mail_from_subdomain != "" ? 1 : 0

  zone_id = var.route53_zone_id
  name    = "${var.mail_from_subdomain}.${var.domain}"
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}

# MX Record for Mail From domain
resource "aws_route53_record" "mx_mail_from" {
  count = var.create_dns_records && var.mail_from_subdomain != "" ? 1 : 0

  zone_id = var.route53_zone_id
  name    = "${var.mail_from_subdomain}.${var.domain}"
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${var.aws_region}.amazonses.com"]
}

# DMARC Record
resource "aws_route53_record" "dmarc" {
  count = var.create_dns_records && var.dmarc_policy != "" ? 1 : 0

  zone_id = var.route53_zone_id
  name    = "_dmarc.${var.domain}"
  type    = "TXT"
  ttl     = 600
  records = [var.dmarc_policy]
}

# ============================================================================
# CONFIGURATION SET
# ============================================================================

resource "aws_ses_configuration_set" "main" {
  name = "${var.project_name}-${var.environment}-emails"

  reputation_metrics_enabled = var.enable_reputation_metrics

  delivery_options {
    tls_policy = "Require"
  }

  dynamic "tracking_options" {
    for_each = var.custom_redirect_domain != "" ? [1] : []
    content {
      custom_redirect_domain = var.custom_redirect_domain
    }
  }
}

# ============================================================================
# EVENT DESTINATIONS (CloudWatch, SNS, SQS)
# ============================================================================

# CloudWatch destination for email metrics
resource "aws_ses_event_destination" "cloudwatch" {
  count = var.enable_cloudwatch_metrics ? 1 : 0

  name                   = "cloudwatch-metrics"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled                = true
  matching_types         = ["send", "reject", "bounce", "complaint", "delivery", "open", "click"]

  cloudwatch_destination {
    default_value  = "default"
    dimension_name = "ses:source-ip"
    value_source   = "messageTag"
  }
}

# SNS destination for bounce/complaint handling
resource "aws_ses_event_destination" "sns_bounces" {
  count = var.bounce_topic_arn != "" ? 1 : 0

  name                   = "bounce-notifications"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled                = true
  matching_types         = ["bounce", "complaint"]

  sns_destination {
    topic_arn = var.bounce_topic_arn
  }
}

# ============================================================================
# IDENTITY NOTIFICATIONS
# ============================================================================

resource "aws_ses_identity_notification_topic" "bounce" {
  count = var.bounce_topic_arn != "" ? 1 : 0

  topic_arn                = var.bounce_topic_arn
  notification_type        = "Bounce"
  identity                 = aws_ses_domain_identity.main.domain
  include_original_headers = true
}

resource "aws_ses_identity_notification_topic" "complaint" {
  count = var.complaint_topic_arn != "" ? 1 : 0

  topic_arn                = var.complaint_topic_arn != "" ? var.complaint_topic_arn : var.bounce_topic_arn
  notification_type        = "Complaint"
  identity                 = aws_ses_domain_identity.main.domain
  include_original_headers = true
}

resource "aws_ses_identity_notification_topic" "delivery" {
  count = var.delivery_topic_arn != "" ? 1 : 0

  topic_arn                = var.delivery_topic_arn
  notification_type        = "Delivery"
  identity                 = aws_ses_domain_identity.main.domain
  include_original_headers = false
}

# ============================================================================
# EMAIL TEMPLATES
# ============================================================================

resource "aws_ses_template" "templates" {
  for_each = var.email_templates

  name    = "${var.project_name}-${var.environment}-${each.key}"
  subject = each.value.subject
  html    = each.value.html
  text    = each.value.text
}

# ============================================================================
# IAM POLICY FOR SES ACCESS
# ============================================================================

data "aws_iam_policy_document" "ses_send" {
  statement {
    sid    = "AllowSESSend"
    effect = "Allow"

    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail",
      "ses:SendTemplatedEmail",
      "ses:SendBulkTemplatedEmail",
    ]

    resources = [
      aws_ses_domain_identity.main.arn,
      "${aws_ses_domain_identity.main.arn}/*",
    ]

    condition {
      test     = "StringEquals"
      variable = "ses:FromAddress"
      values   = var.allowed_from_addresses
    }
  }

  statement {
    sid    = "AllowSESConfigurationSet"
    effect = "Allow"

    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail",
    ]

    resources = [
      aws_ses_configuration_set.main.arn,
    ]
  }
}

resource "aws_iam_policy" "ses_send" {
  name        = "${var.project_name}-${var.environment}-ses-send"
  description = "Policy to allow sending emails via SES"
  policy      = data.aws_iam_policy_document.ses_send.json

  tags = var.tags
}

# ============================================================================
# RECEIPT RULE SET (Optional - for receiving emails)
# ============================================================================

resource "aws_ses_receipt_rule_set" "main" {
  count = var.enable_email_receiving ? 1 : 0

  rule_set_name = "${var.project_name}-${var.environment}-rules"
}

resource "aws_ses_active_receipt_rule_set" "main" {
  count = var.enable_email_receiving ? 1 : 0

  rule_set_name = aws_ses_receipt_rule_set.main[0].rule_set_name
}
