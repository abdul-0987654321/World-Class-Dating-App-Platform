################################################################################
# DynamoDB Module for Flamoral Dating Platform
# Tables: swipes, matches, messages
# Optimized for dating app access patterns with GSIs
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

  common_tags = merge(var.tags, {
    Module      = "dynamodb"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  })
}

################################################################################
# Swipes Table
# Purpose: Record like/dislike/superlike/block decisions
# Primary Key: pk (U#<fromUserId>), sk (TS#<epochMillis>#TO#<toUserId>)
# GSI1: Who liked me - gsi1pk (TO#<toUserId>), gsi1sk (TS#<epochMillis>#FROM#<fromUserId>)
################################################################################

resource "aws_dynamodb_table" "swipes" {
  name         = "${local.name_prefix}-swipes"
  billing_mode = var.billing_mode

  # On-demand capacity or provisioned
  dynamic "provisioned_throughput" {
    for_each = var.billing_mode == "PROVISIONED" ? [1] : []
    content {
      read_capacity  = var.swipes_read_capacity
      write_capacity = var.swipes_write_capacity
    }
  }

  hash_key  = "pk"
  range_key = "sk"

  # Primary key attributes
  attribute {
    name = "pk"  # U#<fromUserId>
    type = "S"
  }

  attribute {
    name = "sk"  # TS#<epochMillis>#TO#<toUserId>
    type = "S"
  }

  # GSI1 attributes (Who liked me)
  attribute {
    name = "gsi1pk"  # TO#<toUserId>
    type = "S"
  }

  attribute {
    name = "gsi1sk"  # TS#<epochMillis>#FROM#<fromUserId>
    type = "S"
  }

  # GSI1: Query who liked a specific user
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "gsi1pk"
    range_key       = "gsi1sk"
    projection_type = "ALL"

    dynamic "provisioned_throughput" {
      for_each = var.billing_mode == "PROVISIONED" ? [1] : []
      content {
        read_capacity  = var.swipes_gsi_read_capacity
        write_capacity = var.swipes_gsi_write_capacity
      }
    }
  }

  # Enable TTL for automatic cleanup (90 days for non-matches)
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  # Point-in-time recovery for data protection
  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  # Server-side encryption with KMS
  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  # Stream for change data capture (optional)
  dynamic "stream_specification" {
    for_each = var.enable_streams ? [1] : []
    content {
      stream_enabled   = true
      stream_view_type = "NEW_AND_OLD_IMAGES"
    }
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-swipes"
    Purpose = "User swipe decisions (like/pass/superlike/block)"
  })
}

################################################################################
# Matches Table
# Purpose: Fast match list retrieval and match details
# Primary Key: pk (U#<userId>), sk (LM#<lastMessageAt>#M#<matchId>)
# GSI1: By matchId - gsi1pk (M#<matchId>), gsi1sk (U#<userId>)
################################################################################

resource "aws_dynamodb_table" "matches" {
  name         = "${local.name_prefix}-matches"
  billing_mode = var.billing_mode

  dynamic "provisioned_throughput" {
    for_each = var.billing_mode == "PROVISIONED" ? [1] : []
    content {
      read_capacity  = var.matches_read_capacity
      write_capacity = var.matches_write_capacity
    }
  }

  hash_key  = "pk"
  range_key = "sk"

  # Primary key attributes
  attribute {
    name = "pk"  # U#<userId>
    type = "S"
  }

  attribute {
    name = "sk"  # LM#<lastMessageAt>#M#<matchId>
    type = "S"
  }

  # GSI1 attributes (By matchId)
  attribute {
    name = "gsi1pk"  # M#<matchId>
    type = "S"
  }

  attribute {
    name = "gsi1sk"  # U#<userId>
    type = "S"
  }

  # GSI1: Load both sides of a match
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "gsi1pk"
    range_key       = "gsi1sk"
    projection_type = "ALL"

    dynamic "provisioned_throughput" {
      for_each = var.billing_mode == "PROVISIONED" ? [1] : []
      content {
        read_capacity  = var.matches_gsi_read_capacity
        write_capacity = var.matches_gsi_write_capacity
      }
    }
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  # Server-side encryption
  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  # Stream for change data capture
  dynamic "stream_specification" {
    for_each = var.enable_streams ? [1] : []
    content {
      stream_enabled   = true
      stream_view_type = "NEW_AND_OLD_IMAGES"
    }
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-matches"
    Purpose = "User matches and match metadata"
  })
}

################################################################################
# Messages Table
# Purpose: Chat message storage and pagination
# Primary Key: pk (M#<matchId>), sk (TS#<epochMillis>#MSG#<messageId>)
################################################################################

resource "aws_dynamodb_table" "messages" {
  name         = "${local.name_prefix}-messages"
  billing_mode = var.billing_mode

  dynamic "provisioned_throughput" {
    for_each = var.billing_mode == "PROVISIONED" ? [1] : []
    content {
      read_capacity  = var.messages_read_capacity
      write_capacity = var.messages_write_capacity
    }
  }

  hash_key  = "pk"
  range_key = "sk"

  # Primary key attributes
  attribute {
    name = "pk"  # M#<matchId>
    type = "S"
  }

  attribute {
    name = "sk"  # TS#<epochMillis>#MSG#<messageId>
    type = "S"
  }

  # GSI1 attributes (optional - for querying by sender)
  attribute {
    name = "gsi1pk"  # SENDER#<userId>
    type = "S"
  }

  attribute {
    name = "gsi1sk"  # TS#<epochMillis>
    type = "S"
  }

  # GSI1: Query messages by sender (optional)
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "gsi1pk"
    range_key       = "gsi1sk"
    projection_type = "ALL"

    dynamic "provisioned_throughput" {
      for_each = var.billing_mode == "PROVISIONED" ? [1] : []
      content {
        read_capacity  = var.messages_gsi_read_capacity
        write_capacity = var.messages_gsi_write_capacity
      }
    }
  }

  # Enable TTL for message retention
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  # Server-side encryption
  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  # Stream for real-time message delivery
  dynamic "stream_specification" {
    for_each = var.enable_streams ? [1] : []
    content {
      stream_enabled   = true
      stream_view_type = "NEW_AND_OLD_IMAGES"
    }
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-messages"
    Purpose = "Chat messages between matched users"
  })
}

################################################################################
# Auto Scaling (for PROVISIONED mode)
################################################################################

# Swipes Table Read Scaling
resource "aws_appautoscaling_target" "swipes_read" {
  count = var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  max_capacity       = var.swipes_max_read_capacity
  min_capacity       = var.swipes_read_capacity
  resource_id        = "table/${aws_dynamodb_table.swipes.name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "swipes_read" {
  count = var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  name               = "${local.name_prefix}-swipes-read-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.swipes_read[0].resource_id
  scalable_dimension = aws_appautoscaling_target.swipes_read[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.swipes_read[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value = var.autoscaling_target_utilization
  }
}

# Swipes Table Write Scaling
resource "aws_appautoscaling_target" "swipes_write" {
  count = var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  max_capacity       = var.swipes_max_write_capacity
  min_capacity       = var.swipes_write_capacity
  resource_id        = "table/${aws_dynamodb_table.swipes.name}"
  scalable_dimension = "dynamodb:table:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "swipes_write" {
  count = var.billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  name               = "${local.name_prefix}-swipes-write-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.swipes_write[0].resource_id
  scalable_dimension = aws_appautoscaling_target.swipes_write[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.swipes_write[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }
    target_value = var.autoscaling_target_utilization
  }
}

################################################################################
# CloudWatch Alarms
################################################################################

resource "aws_cloudwatch_metric_alarm" "swipes_throttled_requests" {
  count = var.create_alarms ? 1 : 0

  alarm_name          = "${local.name_prefix}-swipes-throttled"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Swipes table throttled requests detected"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.swipes.name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "matches_throttled_requests" {
  count = var.create_alarms ? 1 : 0

  alarm_name          = "${local.name_prefix}-matches-throttled"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Matches table throttled requests detected"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.matches.name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "messages_throttled_requests" {
  count = var.create_alarms ? 1 : 0

  alarm_name          = "${local.name_prefix}-messages-throttled"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Messages table throttled requests detected"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.messages.name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}
