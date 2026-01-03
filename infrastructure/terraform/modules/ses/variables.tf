/**
 * AWS SES Module Variables
 */

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "domain" {
  description = "Domain for SES identity (e.g., flamoral.com)"
  type        = string
}

variable "mail_from_subdomain" {
  description = "Subdomain for MAIL FROM (e.g., 'mail' for mail.flamoral.com)"
  type        = string
  default     = "mail"
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for DNS records"
  type        = string
  default     = ""
}

variable "create_dns_records" {
  description = "Whether to create Route53 DNS records"
  type        = bool
  default     = false
}

variable "create_verification_record" {
  description = "Whether to wait for domain verification"
  type        = bool
  default     = true
}

variable "dmarc_policy" {
  description = "DMARC policy record value"
  type        = string
  default     = "v=DMARC1; p=quarantine; rua=mailto:dmarc@flamoral.com"
}

variable "enable_reputation_metrics" {
  description = "Enable SES reputation metrics"
  type        = bool
  default     = true
}

variable "enable_cloudwatch_metrics" {
  description = "Enable CloudWatch metrics for email events"
  type        = bool
  default     = true
}

variable "custom_redirect_domain" {
  description = "Custom domain for click/open tracking"
  type        = string
  default     = ""
}

variable "bounce_topic_arn" {
  description = "SNS topic ARN for bounce notifications"
  type        = string
  default     = ""
}

variable "complaint_topic_arn" {
  description = "SNS topic ARN for complaint notifications"
  type        = string
  default     = ""
}

variable "delivery_topic_arn" {
  description = "SNS topic ARN for delivery notifications"
  type        = string
  default     = ""
}

variable "allowed_from_addresses" {
  description = "List of allowed from addresses"
  type        = list(string)
  default     = ["*@flamoral.com"]
}

variable "enable_email_receiving" {
  description = "Enable email receiving capabilities"
  type        = bool
  default     = false
}

variable "email_templates" {
  description = "Map of email templates to create"
  type = map(object({
    subject = string
    html    = string
    text    = string
  }))
  default = {}
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
