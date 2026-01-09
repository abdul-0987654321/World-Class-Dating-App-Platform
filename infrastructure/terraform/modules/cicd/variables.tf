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

variable "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
}

variable "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
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

################################################################################
# Nightly Build Configuration
################################################################################

variable "enable_nightly_build" {
  description = "Enable nightly scheduled builds"
  type        = bool
  default     = false
}

variable "nightly_build_schedule" {
  description = "Cron expression for nightly build (default: 9 PM UTC daily)"
  type        = string
  default     = "cron(0 21 * * ? *)"
}

variable "create_notification_topic" {
  description = "Create SNS topic for pipeline notifications"
  type        = bool
  default     = false
}

variable "notification_email_addresses" {
  description = "Email addresses to subscribe to pipeline notifications"
  type        = list(string)
  default     = []
}
