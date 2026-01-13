################################################################################
# Cache Module Variables
################################################################################

variable "project" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "redis_security_group_id" {
  description = "Security group ID for Redis access"
  type        = string
  default     = null
}
