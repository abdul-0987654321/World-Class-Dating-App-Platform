################################################################################
# S3 Module Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "default_kms_key_arn" {
  description = "Default KMS key ARN for bucket encryption"
  type        = string
  default     = null
}

variable "buckets" {
  description = "Map of S3 bucket configurations"
  type = map(object({
    purpose            = string
    force_destroy      = optional(bool, false)
    versioning_enabled = optional(bool, true)

    # Encryption
    use_kms_encryption = optional(bool, true)
    kms_key_arn        = optional(string, null)

    # Public access
    block_public_access = optional(bool, true)

    # Lifecycle rules
    lifecycle_rules = optional(list(object({
      id                                     = string
      enabled                                = bool
      prefix                                 = optional(string, null)
      tags                                   = optional(map(string), null)
      expiration_days                        = optional(number, null)
      noncurrent_version_expiration_days     = optional(number, null)
      abort_incomplete_multipart_upload_days = optional(number, 7)
      transitions = optional(list(object({
        days          = number
        storage_class = string
      })), [])
      noncurrent_version_transitions = optional(list(object({
        days          = number
        storage_class = string
      })), [])
    })), [])

    # CORS
    cors_rules = optional(list(object({
      allowed_headers = list(string)
      allowed_methods = list(string)
      allowed_origins = list(string)
      expose_headers  = optional(list(string), [])
      max_age_seconds = optional(number, 3600)
    })), [])

    # Logging
    logging_enabled       = optional(bool, false)
    logging_target_bucket = optional(string, null)
    logging_target_prefix = optional(string, null)

    # Object Lock
    object_lock_enabled = optional(bool, false)
    object_lock_mode    = optional(string, "GOVERNANCE")
    object_lock_days    = optional(number, 30)

    # Intelligent Tiering
    intelligent_tiering_enabled   = optional(bool, false)
    archive_access_tier_days      = optional(number, 90)
    deep_archive_access_tier_days = optional(number, 180)

    # Replication
    replication_enabled                 = optional(bool, false)
    replication_destination_bucket_arn  = optional(string, null)
    replication_destination_kms_key_arn = optional(string, null)
    replication_storage_class           = optional(string, "STANDARD")

    # Event notifications
    event_notifications = optional(list(object({
      type          = string # lambda, sns, sqs
      arn           = string
      events        = list(string)
      filter_prefix = optional(string, null)
      filter_suffix = optional(string, null)
    })), [])

    # Policy options
    attach_policy            = optional(bool, false)
    require_ssl_requests     = optional(bool, true)
    deny_unencrypted_uploads = optional(bool, true)
    deny_non_kms_uploads     = optional(bool, false)

    # CloudFront access
    allow_cloudfront_access     = optional(bool, false)
    cloudfront_distribution_arn = optional(string, null)

    # EKS access
    allow_eks_access      = optional(bool, false)
    eks_oidc_provider_arn = optional(string, null)
    eks_oidc_provider_url = optional(string, null)
    eks_access_actions    = optional(list(string), ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"])

    # VPC restriction
    restrict_to_vpc_endpoint = optional(bool, false)
    vpc_endpoint_id          = optional(string, null)

    # Custom principals
    allowed_principal_arns = optional(list(string), [])
    allowed_actions        = optional(list(string), ["s3:GetObject"])

    # Custom policy statements
    custom_policy_statements = optional(list(object({
      sid                   = string
      effect                = string
      actions               = list(string)
      resources             = list(string)
      principal_type        = string
      principal_identifiers = list(string)
      conditions = optional(list(object({
        test     = string
        variable = string
        values   = list(string)
      })), [])
    })), [])

    # IAM policies
    create_access_policy    = optional(bool, false)
    access_policy_actions   = optional(list(string), ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"])
    create_eks_irsa_policy  = optional(bool, false)
    eks_irsa_policy_actions = optional(list(string), ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"])

    # Additional tags
    tags = optional(map(string), {})
  }))
  default = {}
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
