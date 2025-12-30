################################################################################
# SQS/SNS Messaging Infrastructure
# Replaces Azure Service Bus
################################################################################

################################################################################
# SQS Queues
################################################################################

# Standard Queues
resource "aws_sqs_queue" "standard" {
  for_each = { for k, v in var.queues : k => v if !v.fifo }

  name                       = "${var.project_name}-${var.environment}-${each.key}"
  delay_seconds              = each.value.delay_seconds
  max_message_size           = each.value.max_message_size
  message_retention_seconds  = each.value.message_retention_seconds
  receive_wait_time_seconds  = each.value.receive_wait_time_seconds
  visibility_timeout_seconds = each.value.visibility_timeout_seconds

  # Encryption
  sqs_managed_sse_enabled = each.value.kms_key_arn == null
  kms_master_key_id       = each.value.kms_key_arn

  # Redrive policy (DLQ)
  redrive_policy = each.value.enable_dlq ? jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.key].arn
    maxReceiveCount     = each.value.max_receive_count
  }) : null

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-${each.key}"
    Purpose = each.value.purpose
  })
}

# FIFO Queues
resource "aws_sqs_queue" "fifo" {
  for_each = { for k, v in var.queues : k => v if v.fifo }

  name                        = "${var.project_name}-${var.environment}-${each.key}.fifo"
  fifo_queue                  = true
  content_based_deduplication = each.value.content_based_deduplication
  deduplication_scope         = each.value.deduplication_scope
  fifo_throughput_limit       = each.value.high_throughput ? "perMessageGroupId" : "perQueue"

  delay_seconds              = each.value.delay_seconds
  max_message_size           = each.value.max_message_size
  message_retention_seconds  = each.value.message_retention_seconds
  receive_wait_time_seconds  = each.value.receive_wait_time_seconds
  visibility_timeout_seconds = each.value.visibility_timeout_seconds

  # Encryption
  sqs_managed_sse_enabled = each.value.kms_key_arn == null
  kms_master_key_id       = each.value.kms_key_arn

  # Redrive policy (DLQ)
  redrive_policy = each.value.enable_dlq ? jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq_fifo[each.key].arn
    maxReceiveCount     = each.value.max_receive_count
  }) : null

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-${each.key}"
    Purpose = each.value.purpose
  })
}

# Dead Letter Queues (Standard)
resource "aws_sqs_queue" "dlq" {
  for_each = { for k, v in var.queues : k => v if !v.fifo && v.enable_dlq }

  name                      = "${var.project_name}-${var.environment}-${each.key}-dlq"
  message_retention_seconds = 1209600 # 14 days

  sqs_managed_sse_enabled = each.value.kms_key_arn == null
  kms_master_key_id       = each.value.kms_key_arn

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-${each.key}-dlq"
    Purpose = "Dead letter queue for ${each.key}"
  })
}

# Dead Letter Queues (FIFO)
resource "aws_sqs_queue" "dlq_fifo" {
  for_each = { for k, v in var.queues : k => v if v.fifo && v.enable_dlq }

  name                        = "${var.project_name}-${var.environment}-${each.key}-dlq.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  message_retention_seconds   = 1209600 # 14 days

  sqs_managed_sse_enabled = each.value.kms_key_arn == null
  kms_master_key_id       = each.value.kms_key_arn

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-${each.key}-dlq"
    Purpose = "Dead letter queue for ${each.key}"
  })
}

################################################################################
# SNS Topics
################################################################################

resource "aws_sns_topic" "main" {
  for_each = var.topics

  name         = each.value.fifo ? "${var.project_name}-${var.environment}-${each.key}.fifo" : "${var.project_name}-${var.environment}-${each.key}"
  fifo_topic   = each.value.fifo
  display_name = each.value.display_name

  # Encryption
  kms_master_key_id = each.value.kms_key_arn

  # Content-based deduplication for FIFO
  content_based_deduplication = each.value.fifo ? each.value.content_based_deduplication : null

  # Delivery policy
  delivery_policy = each.value.delivery_policy != null ? jsonencode(each.value.delivery_policy) : null

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-${each.key}"
    Purpose = each.value.purpose
  })
}

# SNS Topic Policies
resource "aws_sns_topic_policy" "main" {
  for_each = { for k, v in var.topics : k => v if v.policy != null }

  arn    = aws_sns_topic.main[each.key].arn
  policy = jsonencode(each.value.policy)
}

################################################################################
# SNS Subscriptions
################################################################################

# SQS Subscriptions
resource "aws_sns_topic_subscription" "sqs" {
  for_each = var.sqs_subscriptions

  topic_arn            = aws_sns_topic.main[each.value.topic_key].arn
  protocol             = "sqs"
  endpoint             = each.value.fifo ? aws_sqs_queue.fifo[each.value.queue_key].arn : aws_sqs_queue.standard[each.value.queue_key].arn
  raw_message_delivery = each.value.raw_message_delivery

  filter_policy       = each.value.filter_policy != null ? jsonencode(each.value.filter_policy) : null
  filter_policy_scope = each.value.filter_policy != null ? each.value.filter_policy_scope : null

  redrive_policy = each.value.enable_dlq ? jsonencode({
    deadLetterTargetArn = each.value.fifo ? aws_sqs_queue.dlq_fifo[each.value.queue_key].arn : aws_sqs_queue.dlq[each.value.queue_key].arn
  }) : null
}

# Allow SNS to send messages to SQS
resource "aws_sqs_queue_policy" "sns_to_sqs" {
  for_each = var.sqs_subscriptions

  queue_url = each.value.fifo ? aws_sqs_queue.fifo[each.value.queue_key].url : aws_sqs_queue.standard[each.value.queue_key].url

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowSNS"
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = each.value.fifo ? aws_sqs_queue.fifo[each.value.queue_key].arn : aws_sqs_queue.standard[each.value.queue_key].arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.main[each.value.topic_key].arn
          }
        }
      }
    ]
  })
}

# Lambda Subscriptions
resource "aws_sns_topic_subscription" "lambda" {
  for_each = var.lambda_subscriptions

  topic_arn = aws_sns_topic.main[each.value.topic_key].arn
  protocol  = "lambda"
  endpoint  = each.value.function_arn

  filter_policy       = each.value.filter_policy != null ? jsonencode(each.value.filter_policy) : null
  filter_policy_scope = each.value.filter_policy != null ? each.value.filter_policy_scope : null
}

# Email Subscriptions
resource "aws_sns_topic_subscription" "email" {
  for_each = var.email_subscriptions

  topic_arn = aws_sns_topic.main[each.value.topic_key].arn
  protocol  = "email"
  endpoint  = each.value.email
}

################################################################################
# EventBridge Integration (Optional)
################################################################################

resource "aws_cloudwatch_event_rule" "main" {
  for_each = var.event_rules

  name                = "${var.project_name}-${var.environment}-${each.key}"
  description         = each.value.description
  schedule_expression = each.value.schedule_expression
  event_pattern       = each.value.event_pattern != null ? jsonencode(each.value.event_pattern) : null
  state               = each.value.enabled ? "ENABLED" : "DISABLED"

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "sqs" {
  for_each = { for k, v in var.event_rules : k => v if v.target_type == "sqs" }

  rule      = aws_cloudwatch_event_rule.main[each.key].name
  target_id = "${each.key}-sqs"
  arn       = each.value.fifo ? aws_sqs_queue.fifo[each.value.target_key].arn : aws_sqs_queue.standard[each.value.target_key].arn

  dynamic "sqs_target" {
    for_each = each.value.message_group_id != null ? [1] : []
    content {
      message_group_id = each.value.message_group_id
    }
  }
}

resource "aws_cloudwatch_event_target" "sns" {
  for_each = { for k, v in var.event_rules : k => v if v.target_type == "sns" }

  rule      = aws_cloudwatch_event_rule.main[each.key].name
  target_id = "${each.key}-sns"
  arn       = aws_sns_topic.main[each.value.target_key].arn
}

################################################################################
# CloudWatch Alarms
################################################################################

# Queue depth alarm
resource "aws_cloudwatch_metric_alarm" "queue_depth" {
  for_each = { for k, v in var.queues : k => v if v.alarm_threshold != null }

  alarm_name          = "${var.project_name}-${var.environment}-${each.key}-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = each.value.alarm_threshold
  alarm_description   = "Queue depth exceeded threshold for ${each.key}"

  dimensions = {
    QueueName = each.value.fifo ? aws_sqs_queue.fifo[each.key].name : aws_sqs_queue.standard[each.key].name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = var.tags
}

# DLQ messages alarm
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  for_each = { for k, v in var.queues : k => v if v.enable_dlq }

  alarm_name          = "${var.project_name}-${var.environment}-${each.key}-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Messages in DLQ for ${each.key}"

  dimensions = {
    QueueName = each.value.fifo ? aws_sqs_queue.dlq_fifo[each.key].name : aws_sqs_queue.dlq[each.key].name
  }

  alarm_actions = var.alarm_actions

  tags = var.tags
}

################################################################################
# IAM Role for EKS Access
################################################################################

resource "aws_iam_role" "messaging" {
  count = var.create_eks_role ? 1 : 0

  name = "${var.project_name}-${var.environment}-messaging-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.eks_oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(var.eks_oidc_provider_url, "https://", "")}:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "${replace(var.eks_oidc_provider_url, "https://", "")}:sub" = "system:serviceaccount:*:*"
          }
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "messaging" {
  count = var.create_eks_role ? 1 : 0

  name = "${var.project_name}-${var.environment}-messaging-policy"
  role = aws_iam_role.messaging[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = concat(
          [for q in aws_sqs_queue.standard : q.arn],
          [for q in aws_sqs_queue.fifo : q.arn]
        )
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish",
          "sns:GetTopicAttributes"
        ]
        Resource = [for t in aws_sns_topic.main : t.arn]
      }
    ]
  })
}
