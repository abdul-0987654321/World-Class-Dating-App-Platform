################################################################################
# ECS IAM Module
# Service-specific IAM roles for ECS Fargate tasks
# Replaces Kubernetes IRSA (IAM Roles for Service Accounts)
################################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

################################################################################
# Data Sources
################################################################################

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

################################################################################
# Local Variables
################################################################################

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  account_id  = data.aws_caller_identity.current.account_id
  region      = data.aws_region.current.name

  common_tags = merge(var.tags, {
    Module      = "ecs-iam"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  })
}

################################################################################
# Service-Specific Task Roles
# Each service gets its own IAM role with least-privilege permissions
################################################################################

resource "aws_iam_role" "service_task" {
  for_each = var.service_permissions

  name = "${local.name_prefix}-${each.key}-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:ecs:${local.region}:${local.account_id}:*"
          }
          StringEquals = {
            "aws:SourceAccount" = local.account_id
          }
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-${each.key}-task-role"
    Service = each.key
  })
}

################################################################################
# S3 Access Policy
################################################################################

resource "aws_iam_role_policy" "s3_access" {
  for_each = { for k, v in var.service_permissions : k => v if length(v.s3_buckets) > 0 }

  name = "${each.key}-s3-access"
  role = aws_iam_role.service_task[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3BucketAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = flatten([
          for bucket in each.value.s3_buckets : [
            "arn:aws:s3:::${bucket}",
            "arn:aws:s3:::${bucket}/*"
          ]
        ])
      }
    ]
  })
}

################################################################################
# DynamoDB Access Policy
################################################################################

resource "aws_iam_role_policy" "dynamodb_access" {
  for_each = { for k, v in var.service_permissions : k => v if length(v.dynamodb_tables) > 0 }

  name = "${each.key}-dynamodb-access"
  role = aws_iam_role.service_task[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBTableAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          for table in each.value.dynamodb_tables :
          "arn:aws:dynamodb:${local.region}:${local.account_id}:table/${table}"
        ]
      },
      {
        Sid    = "DynamoDBIndexAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          for table in each.value.dynamodb_tables :
          "arn:aws:dynamodb:${local.region}:${local.account_id}:table/${table}/index/*"
        ]
      }
    ]
  })
}

################################################################################
# SQS Access Policy
################################################################################

resource "aws_iam_role_policy" "sqs_access" {
  for_each = { for k, v in var.service_permissions : k => v if length(v.sqs_queues) > 0 }

  name = "${each.key}-sqs-access"
  role = aws_iam_role.service_task[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SQSQueueAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = [
          for queue in each.value.sqs_queues :
          "arn:aws:sqs:${local.region}:${local.account_id}:${queue}"
        ]
      }
    ]
  })
}

################################################################################
# SNS Access Policy
################################################################################

resource "aws_iam_role_policy" "sns_access" {
  for_each = { for k, v in var.service_permissions : k => v if length(v.sns_topics) > 0 }

  name = "${each.key}-sns-access"
  role = aws_iam_role.service_task[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SNSTopicAccess"
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = [
          for topic in each.value.sns_topics :
          "arn:aws:sns:${local.region}:${local.account_id}:${topic}"
        ]
      }
    ]
  })
}

################################################################################
# Secrets Manager Access Policy
################################################################################

resource "aws_iam_role_policy" "secrets_access" {
  for_each = { for k, v in var.service_permissions : k => v if length(v.secrets) > 0 }

  name = "${each.key}-secrets-access"
  role = aws_iam_role.service_task[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SecretsManagerAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          for secret in each.value.secrets :
          "arn:aws:secretsmanager:${local.region}:${local.account_id}:secret:${secret}*"
        ]
      }
    ]
  })
}

################################################################################
# SSM Parameter Store Access Policy
################################################################################

resource "aws_iam_role_policy" "ssm_access" {
  for_each = { for k, v in var.service_permissions : k => v if length(v.ssm_parameters) > 0 }

  name = "${each.key}-ssm-access"
  role = aws_iam_role.service_task[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SSMParameterAccess"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = [
          for param in each.value.ssm_parameters :
          "arn:aws:ssm:${local.region}:${local.account_id}:parameter${param}"
        ]
      }
    ]
  })
}

################################################################################
# SES Access Policy (for email services)
################################################################################

resource "aws_iam_role_policy" "ses_access" {
  for_each = { for k, v in var.service_permissions : k => v if v.enable_ses }

  name = "${each.key}-ses-access"
  role = aws_iam_role.service_task[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SESAccess"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
          "ses:SendBulkTemplatedEmail"
        ]
        Resource = "*"
      }
    ]
  })
}

################################################################################
# Cognito Access Policy (for auth services)
################################################################################

resource "aws_iam_role_policy" "cognito_access" {
  for_each = { for k, v in var.service_permissions : k => v if length(v.cognito_user_pools) > 0 }

  name = "${each.key}-cognito-access"
  role = aws_iam_role.service_task[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CognitoAccess"
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminDeleteUser",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AdminConfirmSignUp",
          "cognito-idp:AdminInitiateAuth",
          "cognito-idp:AdminRespondToAuthChallenge"
        ]
        Resource = each.value.cognito_user_pools
      }
    ]
  })
}

################################################################################
# Bedrock Access Policy (for AI services)
################################################################################

resource "aws_iam_role_policy" "bedrock_access" {
  for_each = { for k, v in var.service_permissions : k => v if v.enable_bedrock }

  name = "${each.key}-bedrock-access"
  role = aws_iam_role.service_task[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "BedrockAccess"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "arn:aws:bedrock:${local.region}::foundation-model/*"
      }
    ]
  })
}

################################################################################
# Elasticsearch/OpenSearch Access Policy (for search services)
################################################################################

resource "aws_iam_role_policy" "opensearch_access" {
  for_each = { for k, v in var.service_permissions : k => v if length(v.opensearch_domains) > 0 }

  name = "${each.key}-opensearch-access"
  role = aws_iam_role.service_task[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "OpenSearchAccess"
        Effect = "Allow"
        Action = [
          "es:ESHttpGet",
          "es:ESHttpPost",
          "es:ESHttpPut",
          "es:ESHttpDelete",
          "es:ESHttpHead"
        ]
        Resource = [
          for domain in each.value.opensearch_domains :
          "arn:aws:es:${local.region}:${local.account_id}:domain/${domain}/*"
        ]
      }
    ]
  })
}

################################################################################
# Rekognition Access Policy (for media/moderation services)
################################################################################

resource "aws_iam_role_policy" "rekognition_access" {
  for_each = { for k, v in var.service_permissions : k => v if v.enable_rekognition }

  name = "${each.key}-rekognition-access"
  role = aws_iam_role.service_task[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "RekognitionAccess"
        Effect = "Allow"
        Action = [
          "rekognition:DetectFaces",
          "rekognition:DetectLabels",
          "rekognition:DetectModerationLabels",
          "rekognition:CompareFaces",
          "rekognition:IndexFaces",
          "rekognition:SearchFaces",
          "rekognition:SearchFacesByImage"
        ]
        Resource = "*"
      }
    ]
  })
}

################################################################################
# CloudWatch Logs Access (for all services)
################################################################################

resource "aws_iam_role_policy" "cloudwatch_logs" {
  for_each = var.service_permissions

  name = "${each.key}-cloudwatch-logs"
  role = aws_iam_role.service_task[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudWatchLogsAccess"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${local.region}:${local.account_id}:log-group:/ecs/${local.name_prefix}/${each.key}:*"
      }
    ]
  })
}

################################################################################
# X-Ray Tracing Access (optional)
################################################################################

resource "aws_iam_role_policy" "xray_access" {
  for_each = { for k, v in var.service_permissions : k => v if v.enable_xray }

  name = "${each.key}-xray-access"
  role = aws_iam_role.service_task[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "XRayAccess"
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets",
          "xray:GetSamplingStatisticSummaries"
        ]
        Resource = "*"
      }
    ]
  })
}

################################################################################
# Custom Policy Attachment
################################################################################

resource "aws_iam_role_policy" "custom" {
  for_each = { for k, v in var.service_permissions : k => v if v.custom_policy != null }

  name   = "${each.key}-custom-policy"
  role   = aws_iam_role.service_task[each.key].id
  policy = each.value.custom_policy
}
