################################################################################
# ECR Module Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "default_kms_key_arn" {
  description = "Default KMS key ARN for repository encryption"
  type        = string
  default     = null
}

variable "eks_node_role_arns" {
  description = "List of EKS node role ARNs for pull access"
  type        = list(string)
  default     = null
}

variable "repositories" {
  description = "Map of ECR repository configurations"
  type = map(object({
    image_tag_mutability = optional(string, "MUTABLE")
    encryption_type      = optional(string, "KMS")
    kms_key_arn          = optional(string, null)
    scan_on_push         = optional(bool, true)
    force_delete         = optional(bool, false)

    # Lifecycle configuration
    keep_tagged_images         = optional(number, 30)
    tag_prefixes               = optional(list(string), ["v", "release", "prod", "staging", "dev"])
    untagged_image_expiry_days = optional(number, 7)
    lifecycle_rules = optional(list(object({
      rulePriority = number
      description  = string
      selection = object({
        tagStatus     = optional(string, null)
        tagPrefixList = optional(list(string), null)
        countType     = string
        countUnit     = optional(string, null)
        countNumber   = number
      })
      action = object({
        type = string
      })
    })), [])

    # Repository policy
    attach_policy              = optional(bool, true)
    allow_eks_pull             = optional(bool, true)
    allow_lambda_access        = optional(bool, false)
    pull_access_principal_arns = optional(list(string), [])
    push_access_principal_arns = optional(list(string), [])
    cross_account_ids          = optional(list(string), [])

    # Additional tags
    tags = optional(map(string), {})
  }))
  default = {}
}

################################################################################
# Replication Configuration
################################################################################

variable "enable_replication" {
  description = "Enable ECR replication"
  type        = bool
  default     = false
}

variable "replication_destinations" {
  description = "List of replication destinations"
  type = list(object({
    region      = string
    registry_id = optional(string, null)
  }))
  default = []
}

variable "replication_repository_filters" {
  description = "Repository filters for replication"
  type = list(object({
    filter      = string
    filter_type = string
  }))
  default = []
}

variable "replication_source_accounts" {
  description = "List of source account IDs for cross-account replication"
  type        = list(string)
  default     = []
}

################################################################################
# Pull Through Cache
################################################################################

variable "pull_through_cache_rules" {
  description = "Map of pull-through cache rule configurations"
  type = map(object({
    ecr_repository_prefix = string
    upstream_registry_url = string
    credential_arn        = optional(string, null)
  }))
  default = {}
}

################################################################################
# Scanning Configuration
################################################################################

variable "enable_enhanced_scanning" {
  description = "Enable enhanced scanning"
  type        = bool
  default     = false
}

variable "scanning_rules" {
  description = "List of scanning rules for enhanced scanning"
  type = list(object({
    scan_frequency = string
    filter         = string
    filter_type    = string
  }))
  default = [
    {
      scan_frequency = "CONTINUOUS_SCAN"
      filter         = "*"
      filter_type    = "WILDCARD"
    }
  ]
}

################################################################################
# Registry Policy
################################################################################

variable "attach_registry_policy" {
  description = "Attach a registry-level policy"
  type        = bool
  default     = false
}

variable "additional_registry_policy_statements" {
  description = "Additional registry policy statements"
  type        = list(any)
  default     = []
}

################################################################################
# Tags
################################################################################

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
