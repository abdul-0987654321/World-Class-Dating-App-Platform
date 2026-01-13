################################################################################
# DynamoDB Module Variables
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
# Billing Configuration
################################################################################

variable "billing_mode" {
  description = "DynamoDB billing mode (PAY_PER_REQUEST or PROVISIONED)"
  type        = string
  default     = "PAY_PER_REQUEST"

  validation {
    condition     = contains(["PAY_PER_REQUEST", "PROVISIONED"], var.billing_mode)
    error_message = "Billing mode must be PAY_PER_REQUEST or PROVISIONED."
  }
}

################################################################################
# Provisioned Capacity (used when billing_mode = PROVISIONED)
################################################################################

# Swipes Table
variable "swipes_read_capacity" {
  description = "Swipes table read capacity units"
  type        = number
  default     = 5
}

variable "swipes_write_capacity" {
  description = "Swipes table write capacity units"
  type        = number
  default     = 5
}

variable "swipes_max_read_capacity" {
  description = "Swipes table max read capacity for autoscaling"
  type        = number
  default     = 100
}

variable "swipes_max_write_capacity" {
  description = "Swipes table max write capacity for autoscaling"
  type        = number
  default     = 100
}

variable "swipes_gsi_read_capacity" {
  description = "Swipes GSI read capacity units"
  type        = number
  default     = 5
}

variable "swipes_gsi_write_capacity" {
  description = "Swipes GSI write capacity units"
  type        = number
  default     = 5
}

# Matches Table
variable "matches_read_capacity" {
  description = "Matches table read capacity units"
  type        = number
  default     = 5
}

variable "matches_write_capacity" {
  description = "Matches table write capacity units"
  type        = number
  default     = 5
}

variable "matches_max_read_capacity" {
  description = "Matches table max read capacity for autoscaling"
  type        = number
  default     = 100
}

variable "matches_max_write_capacity" {
  description = "Matches table max write capacity for autoscaling"
  type        = number
  default     = 100
}

variable "matches_gsi_read_capacity" {
  description = "Matches GSI read capacity units"
  type        = number
  default     = 5
}

variable "matches_gsi_write_capacity" {
  description = "Matches GSI write capacity units"
  type        = number
  default     = 5
}

# Messages Table
variable "messages_read_capacity" {
  description = "Messages table read capacity units"
  type        = number
  default     = 10
}

variable "messages_write_capacity" {
  description = "Messages table write capacity units"
  type        = number
  default     = 10
}

variable "messages_max_read_capacity" {
  description = "Messages table max read capacity for autoscaling"
  type        = number
  default     = 200
}

variable "messages_max_write_capacity" {
  description = "Messages table max write capacity for autoscaling"
  type        = number
  default     = 200
}

variable "messages_gsi_read_capacity" {
  description = "Messages GSI read capacity units"
  type        = number
  default     = 5
}

variable "messages_gsi_write_capacity" {
  description = "Messages GSI write capacity units"
  type        = number
  default     = 5
}

################################################################################
# Autoscaling Configuration
################################################################################

variable "enable_autoscaling" {
  description = "Enable autoscaling for provisioned tables"
  type        = bool
  default     = true
}

variable "autoscaling_target_utilization" {
  description = "Target utilization for autoscaling (percentage)"
  type        = number
  default     = 70
}

################################################################################
# Data Protection
################################################################################

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for all tables"
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "KMS key ARN for server-side encryption (null = AWS managed key)"
  type        = string
  default     = null
}

variable "enable_streams" {
  description = "Enable DynamoDB Streams for change data capture"
  type        = bool
  default     = false
}

################################################################################
# Monitoring
################################################################################

variable "create_alarms" {
  description = "Whether to create CloudWatch alarms"
  type        = bool
  default     = true
}

variable "alarm_actions" {
  description = "List of ARNs to notify when alarms trigger"
  type        = list(string)
  default     = []
}
