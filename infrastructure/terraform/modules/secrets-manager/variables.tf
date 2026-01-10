################################################################################
# Secrets Manager Module Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}

################################################################################
# Secrets Configuration
################################################################################

variable "secrets" {
  description = "Map of secrets to create"
  type = map(object({
    description             = optional(string)
    recovery_window_in_days = optional(number)
    secret_string           = optional(string)
    secret_binary           = optional(string)
    rotation_enabled        = optional(bool, false)
    rotation_lambda_arn     = optional(string)
    rotation_days           = optional(number)
    rotation_schedule       = optional(string)
    tags                    = optional(map(string), {})
    additional_principals   = optional(list(string), [])
  }))
  default = {}
}

variable "default_recovery_window_days" {
  description = "Default recovery window in days for secrets"
  type        = number
  default     = 30
}

variable "default_rotation_days" {
  description = "Default rotation period in days"
  type        = number
  default     = 30
}

variable "force_overwrite_replica_secret" {
  description = "Force overwrite replica secret during recovery"
  type        = bool
  default     = false
}

variable "create_secret_policy" {
  description = "Create resource policy for secrets"
  type        = bool
  default     = true
}

################################################################################
# KMS Configuration
################################################################################

variable "create_kms_key" {
  description = "Create a new KMS key for secrets encryption"
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "ARN of existing KMS key (if not creating a new one)"
  type        = string
  default     = null
}

variable "kms_deletion_window_days" {
  description = "KMS key deletion window in days"
  type        = number
  default     = 30
}

variable "enable_kms_key_rotation" {
  description = "Enable automatic KMS key rotation"
  type        = bool
  default     = true
}

variable "kms_multi_region" {
  description = "Create multi-region KMS key"
  type        = bool
  default     = false
}

################################################################################
# EKS IRSA Configuration
################################################################################

variable "eks_cluster_oidc_arn" {
  description = "ARN of the EKS cluster OIDC provider"
  type        = string
  default     = ""
}

variable "eks_namespace" {
  description = "Kubernetes namespace for service account"
  type        = string
  default     = "default"
}

variable "eks_service_account_name" {
  description = "Kubernetes service account name"
  type        = string
  default     = "secrets-access"
}

################################################################################
# Rotation Lambda Configuration
################################################################################

variable "create_rotation_lambda" {
  description = "Create Lambda function for secret rotation"
  type        = bool
  default     = false
}

variable "rotation_lambda_filename" {
  description = "Path to Lambda deployment package"
  type        = string
  default     = null
}

variable "rotation_lambda_source_code_hash" {
  description = "Base64-encoded SHA256 hash of the Lambda deployment package"
  type        = string
  default     = null
}

variable "rotation_lambda_handler" {
  description = "Lambda function handler"
  type        = string
  default     = "index.handler"
}

variable "rotation_lambda_runtime" {
  description = "Lambda function runtime"
  type        = string
  default     = "python3.11"
}

variable "rotation_lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30
}

variable "rotation_lambda_memory_size" {
  description = "Lambda function memory size in MB"
  type        = number
  default     = 128
}

variable "rotation_lambda_subnet_ids" {
  description = "List of subnet IDs for Lambda VPC configuration"
  type        = list(string)
  default     = []
}

variable "rotation_lambda_security_group_ids" {
  description = "List of security group IDs for Lambda VPC configuration"
  type        = list(string)
  default     = []
}

variable "rotation_lambda_env_vars" {
  description = "Additional environment variables for rotation Lambda"
  type        = map(string)
  default     = {}
}
