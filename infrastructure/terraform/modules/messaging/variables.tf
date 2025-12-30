################################################################################
# SQS/SNS Messaging Variables
################################################################################

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

################################################################################
# SQS Queues
################################################################################

variable "queues" {
  description = "SQS queue configurations"
  type = map(object({
    purpose                     = string
    fifo                        = optional(bool, false)
    delay_seconds               = optional(number, 0)
    max_message_size            = optional(number, 262144) # 256KB
    message_retention_seconds   = optional(number, 345600) # 4 days
    receive_wait_time_seconds   = optional(number, 20)     # Long polling
    visibility_timeout_seconds  = optional(number, 30)
    enable_dlq                  = optional(bool, true)
    max_receive_count           = optional(number, 5)
    kms_key_arn                 = optional(string)
    content_based_deduplication = optional(bool, true)
    deduplication_scope         = optional(string, "queue")
    high_throughput             = optional(bool, false)
    alarm_threshold             = optional(number)
  }))
  default = {}
}

################################################################################
# SNS Topics
################################################################################

variable "topics" {
  description = "SNS topic configurations"
  type = map(object({
    purpose                     = string
    display_name                = optional(string)
    fifo                        = optional(bool, false)
    content_based_deduplication = optional(bool, true)
    kms_key_arn                 = optional(string)
    delivery_policy             = optional(any)
    policy                      = optional(any)
  }))
  default = {}
}

################################################################################
# Subscriptions
################################################################################

variable "sqs_subscriptions" {
  description = "SNS to SQS subscriptions"
  type = map(object({
    topic_key            = string
    queue_key            = string
    fifo                 = optional(bool, false)
    raw_message_delivery = optional(bool, true)
    filter_policy        = optional(any)
    filter_policy_scope  = optional(string, "MessageAttributes")
    enable_dlq           = optional(bool, false)
  }))
  default = {}
}

variable "lambda_subscriptions" {
  description = "SNS to Lambda subscriptions"
  type = map(object({
    topic_key           = string
    function_arn        = string
    filter_policy       = optional(any)
    filter_policy_scope = optional(string, "MessageAttributes")
  }))
  default = {}
}

variable "email_subscriptions" {
  description = "SNS to Email subscriptions"
  type = map(object({
    topic_key = string
    email     = string
  }))
  default = {}
}

################################################################################
# EventBridge
################################################################################

variable "event_rules" {
  description = "EventBridge rules"
  type = map(object({
    description         = string
    schedule_expression = optional(string)
    event_pattern       = optional(any)
    enabled             = optional(bool, true)
    target_type         = string # "sqs" or "sns"
    target_key          = string
    fifo                = optional(bool, false)
    message_group_id    = optional(string)
  }))
  default = {}
}

################################################################################
# Alarms
################################################################################

variable "alarm_actions" {
  description = "SNS topic ARNs for alarms"
  type        = list(string)
  default     = []
}

################################################################################
# EKS Integration
################################################################################

variable "create_eks_role" {
  description = "Create IAM role for EKS service account"
  type        = bool
  default     = true
}

variable "eks_oidc_provider_arn" {
  description = "EKS OIDC provider ARN"
  type        = string
  default     = null
}

variable "eks_oidc_provider_url" {
  description = "EKS OIDC provider URL"
  type        = string
  default     = null
}

################################################################################
# Tags
################################################################################

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
