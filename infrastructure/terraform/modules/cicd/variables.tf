################################################################################
# CI/CD Module Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "eks_cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "eks_cluster_arn" {
  description = "ARN of the EKS cluster"
  type        = string
}

variable "kms_key_arn" {
  description = "ARN of the KMS key for encryption"
  type        = string
}

variable "codestar_connection_arn" {
  description = "ARN of the CodeStar connection to GitHub"
  type        = string
  default     = ""
}

variable "create_github_connection" {
  description = "Whether to create a new GitHub connection"
  type        = bool
  default     = true
}

variable "github_repository" {
  description = "GitHub repository in format owner/repo"
  type        = string
}

variable "github_branch" {
  description = "GitHub branch to build from"
  type        = string
  default     = "main"
}

variable "services" {
  description = "Map of services to build"
  type = map(object({
    dockerfile_path = optional(string)
    buildspec_path  = optional(string)
    enabled         = optional(bool, true)
  }))
  default = {}
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
