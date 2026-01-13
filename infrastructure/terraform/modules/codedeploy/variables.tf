################################################################################
# CodeDeploy Module Variables
################################################################################

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

################################################################################
# ECS Configuration
################################################################################

variable "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
}

variable "ecs_service_name" {
  description = "Name of the ECS service"
  type        = string
}

################################################################################
# Load Balancer Configuration
################################################################################

variable "prod_listener_arn" {
  description = "ARN of the production ALB listener (port 443)"
  type        = string
}

variable "test_listener_arn" {
  description = "ARN of the test ALB listener (port 8443) for blue/green validation"
  type        = string
  default     = null
}

variable "blue_target_group_name" {
  description = "Name of the blue target group"
  type        = string
}

variable "green_target_group_name" {
  description = "Name of the green target group"
  type        = string
}

################################################################################
# Deployment Configuration
################################################################################

variable "deployment_config_name" {
  description = "Deployment configuration name"
  type        = string
  default     = "CodeDeployDefault.ECSCanary10Percent5Minutes"

  validation {
    condition = contains([
      "CodeDeployDefault.ECSLinear10PercentEvery1Minutes",
      "CodeDeployDefault.ECSLinear10PercentEvery3Minutes",
      "CodeDeployDefault.ECSCanary10Percent5Minutes",
      "CodeDeployDefault.ECSCanary10Percent15Minutes",
      "CodeDeployDefault.ECSAllAtOnce"
    ], var.deployment_config_name) || can(regex("^flamoral-", var.deployment_config_name))
    error_message = "Must be a valid CodeDeploy ECS deployment configuration."
  }
}

variable "deployment_ready_wait_time_in_minutes" {
  description = "Minutes to wait for deployment validation before continuing (0 = auto continue)"
  type        = number
  default     = 0
}

variable "termination_wait_time_in_minutes" {
  description = "Minutes to wait before terminating blue instances after successful deployment"
  type        = number
  default     = 5
}

################################################################################
# Rollback Configuration
################################################################################

variable "rollback_alarm_names" {
  description = "List of CloudWatch alarm names that trigger automatic rollback"
  type        = list(string)
  default     = []
}

################################################################################
# Notifications
################################################################################

variable "create_notification_topic" {
  description = "Whether to create an SNS topic for deployment notifications"
  type        = bool
  default     = false
}

variable "notification_topic_arn" {
  description = "ARN of existing SNS topic for notifications (if not creating new)"
  type        = string
  default     = null
}

variable "notification_emails" {
  description = "Email addresses to notify about deployments"
  type        = list(string)
  default     = []
}

################################################################################
# Custom Deployment Configurations
################################################################################

variable "create_custom_deployment_config" {
  description = "Whether to create custom deployment configurations"
  type        = bool
  default     = false
}
