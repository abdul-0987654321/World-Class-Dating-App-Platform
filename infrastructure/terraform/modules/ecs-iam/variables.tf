################################################################################
# ECS IAM Module - Variables
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
# Service Permissions
# Define the AWS resources each service needs access to
################################################################################

variable "service_permissions" {
  description = "Map of service names to their required AWS permissions"
  type = map(object({
    # S3 buckets the service can access
    s3_buckets = optional(list(string), [])

    # DynamoDB tables the service can access
    dynamodb_tables = optional(list(string), [])

    # SQS queues the service can send/receive from
    sqs_queues = optional(list(string), [])

    # SNS topics the service can publish to
    sns_topics = optional(list(string), [])

    # Secrets Manager secrets the service can read
    secrets = optional(list(string), [])

    # SSM Parameter Store paths the service can read (with leading /)
    ssm_parameters = optional(list(string), [])

    # Cognito user pool ARNs the service can manage
    cognito_user_pools = optional(list(string), [])

    # OpenSearch domains the service can access
    opensearch_domains = optional(list(string), [])

    # Enable SES email sending
    enable_ses = optional(bool, false)

    # Enable Bedrock AI model access
    enable_bedrock = optional(bool, false)

    # Enable Rekognition for image analysis
    enable_rekognition = optional(bool, false)

    # Enable X-Ray tracing
    enable_xray = optional(bool, false)

    # Custom IAM policy JSON (for service-specific permissions)
    custom_policy = optional(string, null)
  }))
  default = {}
}
