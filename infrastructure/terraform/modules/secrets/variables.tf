################################################################################
# Secrets Manager Module Variables
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
  description = "Default KMS key ARN for secret encryption"
  type        = string
  default     = null
}

################################################################################
# EKS Integration
################################################################################

variable "eks_oidc_provider_arn" {
  description = "ARN of EKS OIDC provider for IRSA"
  type        = string
  default     = null
}

variable "eks_oidc_provider_url" {
  description = "URL of EKS OIDC provider for IRSA"
  type        = string
  default     = null
}

################################################################################
# Secrets Configuration
################################################################################

variable "secrets" {
  description = "Map of secret configurations"
  type = map(object({
    description             = optional(string, "Managed by Terraform")
    kms_key_arn             = optional(string, null)
    recovery_window_in_days = optional(number, 30)

    # Secret value (mutually exclusive with generate_random_password)
    secret_string = optional(string, null)
    secret_binary = optional(string, null)

    # Random password generation
    generate_random_password         = optional(bool, false)
    random_password_length           = optional(number, 32)
    random_password_special          = optional(bool, true)
    random_password_override_special = optional(string, "!#$%&*()-_=+[]{}<>:?")
    random_password_min_lower        = optional(number, 1)
    random_password_min_upper        = optional(number, 1)
    random_password_min_numeric      = optional(number, 1)
    random_password_min_special      = optional(number, 1)
    additional_secret_data           = optional(map(string), {})

    # Rotation
    rotation_enabled             = optional(bool, false)
    rotation_lambda_arn          = optional(string, null)
    rotation_days                = optional(number, 30)
    rotation_schedule_expression = optional(string, null)

    # Replication
    replica_regions = optional(list(object({
      region     = string
      kms_key_id = optional(string, null)
    })), [])
    force_overwrite_replica_secret = optional(bool, false)

    # Policy
    attach_policy               = optional(bool, true)
    require_ssl                 = optional(bool, true)
    read_access_principal_arns  = optional(list(string), [])
    write_access_principal_arns = optional(list(string), [])
    cross_account_ids           = optional(list(string), [])

    # EKS access
    allow_eks_access = optional(bool, false)
    eks_service_accounts = optional(list(object({
      namespace = string
      name      = string
    })), [])

    # IAM policy
    create_access_policy = optional(bool, false)

    # Additional tags
    tags = optional(map(string), {})
  }))
  default = {}
}

################################################################################
# External Secrets Operator
################################################################################

variable "create_external_secrets_role" {
  description = "Create IAM role for External Secrets Operator"
  type        = bool
  default     = false
}

variable "eks_oidc_available" {
  description = "Set to true only when EKS OIDC provider is available (after initial EKS deployment)"
  type        = bool
  default     = false
}

variable "external_secrets_namespace" {
  description = "Kubernetes namespace for External Secrets Operator"
  type        = string
  default     = "external-secrets"
}

variable "external_secrets_service_account" {
  description = "Service account name for External Secrets Operator"
  type        = string
  default     = "external-secrets"
}

variable "external_secrets_secret_arns" {
  description = "List of secret ARNs that External Secrets can access (defaults to project secrets)"
  type        = list(string)
  default     = null
}

################################################################################
# Tags
################################################################################

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
