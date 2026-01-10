################################################################################
# AI Security Terraform Module
#
# This module provides infrastructure for AI security controls:
# - SSM Parameters for AI kill switch
# - CloudWatch Log Groups for audit logging
# - CloudWatch Alarms for monitoring
# - IAM Policies for access control
#
# Usage:
#   module "ai_security" {
#     source = "./modules/ai-security"
#
#     project_name = "flamoral"
#     environment  = "prod"
#
#     alarm_sns_topic_arn = aws_sns_topic.alerts.arn
#   }
################################################################################

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0.0"
    }
  }
}
