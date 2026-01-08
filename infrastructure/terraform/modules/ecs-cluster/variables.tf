################################################################################
# ECS Fargate Cluster Module - Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where ECS cluster will be deployed"
  type        = string
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

################################################################################
# Cluster Configuration
################################################################################

variable "enable_container_insights" {
  description = "Enable CloudWatch Container Insights for the cluster"
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption (if null, a new key will be created)"
  type        = string
  default     = null
}

variable "create_kms_key" {
  description = "Create a new KMS key for the cluster if kms_key_arn is not provided"
  type        = bool
  default     = true
}

################################################################################
# Capacity Provider Configuration
################################################################################

variable "enable_fargate_spot" {
  description = "Enable Fargate Spot capacity provider for cost optimization"
  type        = bool
  default     = true
}

variable "fargate_base_count" {
  description = "Base count for Fargate (on-demand) capacity provider"
  type        = number
  default     = 1
}

variable "fargate_weight" {
  description = "Weight for Fargate (on-demand) capacity provider"
  type        = number
  default     = 1
}

variable "fargate_spot_weight" {
  description = "Weight for Fargate Spot capacity provider"
  type        = number
  default     = 2
}

################################################################################
# Logging Configuration
################################################################################

variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 30
}

################################################################################
# Service Discovery
################################################################################

variable "enable_service_discovery" {
  description = "Enable AWS Cloud Map service discovery"
  type        = bool
  default     = true
}

################################################################################
# Security
################################################################################

# Note: ALB security group rule should be created in environment config
# to avoid circular dependency between ECS cluster and ALB modules
