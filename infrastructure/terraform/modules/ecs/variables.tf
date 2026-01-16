################################################################################
# ECS Module Variables
################################################################################

variable "project" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block for restricting traffic"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for ALB"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "Security group ID for ALB"
  type        = string
  default     = null
}

variable "ecs_security_group_id" {
  description = "Security group ID for ECS tasks"
  type        = string
  default     = null
}

variable "database_url_secret_arn" {
  description = "ARN of the database URL secret"
  type        = string
  default     = null
}

variable "redis_url_secret_arn" {
  description = "ARN of the Redis URL secret"
  type        = string
  default     = null
}

variable "jwt_secret_arn" {
  description = "ARN of the JWT secret"
  type        = string
  default     = null
}

variable "stripe_secret_arn" {
  description = "ARN of the Stripe secret"
  type        = string
  default     = null
}
