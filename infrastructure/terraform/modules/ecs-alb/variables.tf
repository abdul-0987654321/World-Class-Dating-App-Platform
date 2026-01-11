################################################################################
# Application Load Balancer Module - Variables
# For ECS Fargate services with path-based routing
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

################################################################################
# VPC Configuration
################################################################################

variable "vpc_id" {
  description = "VPC ID where the ALB will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the ALB (should be public subnets for internet-facing ALB)"
  type        = list(string)
}

variable "vpc_cidr" {
  description = "VPC CIDR block for restricting egress traffic"
  type        = string
}

################################################################################
# ALB Configuration
################################################################################

variable "internal" {
  description = "Whether the ALB is internal (true) or internet-facing (false)"
  type        = bool
  default     = false
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for the ALB"
  type        = bool
  default     = false
}

variable "idle_timeout" {
  description = "Idle timeout for the ALB in seconds"
  type        = number
  default     = 60
}

variable "access_logs_bucket" {
  description = "S3 bucket for ALB access logs (null to disable)"
  type        = string
  default     = null
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the ALB"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

################################################################################
# SSL/TLS Configuration
################################################################################

variable "enable_https" {
  description = "Enable HTTPS listener"
  type        = bool
  default     = true
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS"
  type        = string
  default     = null
}

variable "ssl_policy" {
  description = "SSL policy for HTTPS listener"
  type        = string
  default     = "ELBSecurityPolicy-TLS13-1-2-2021-06"
}

################################################################################
# Target Group Configuration
################################################################################

variable "deregistration_delay" {
  description = "Deregistration delay in seconds for target groups"
  type        = number
  default     = 30
}

variable "enable_stickiness" {
  description = "Enable session stickiness"
  type        = bool
  default     = false
}

variable "stickiness_duration" {
  description = "Stickiness cookie duration in seconds"
  type        = number
  default     = 86400
}

################################################################################
# Service Definitions
# Map of services with their routing and health check configuration
################################################################################

variable "services" {
  description = "Map of services to create target groups and routing rules for"
  type = map(object({
    port          = number
    priority      = number
    path_patterns = optional(list(string))
    host_headers  = optional(list(string))
    health_check = object({
      path                = string
      matcher             = string
      interval            = number
      timeout             = number
      healthy_threshold   = number
      unhealthy_threshold = number
    })
  }))
  default = {}
}

################################################################################
# WAF Configuration
################################################################################

variable "waf_acl_arn" {
  description = "ARN of the WAF Web ACL to associate with the ALB"
  type        = string
  default     = null
}

################################################################################
# Alerting Configuration
################################################################################

variable "create_alarms" {
  description = "Create CloudWatch alarms for the ALB"
  type        = bool
  default     = true
}

variable "alarm_actions" {
  description = "List of ARNs to notify on alarm"
  type        = list(string)
  default     = []
}
