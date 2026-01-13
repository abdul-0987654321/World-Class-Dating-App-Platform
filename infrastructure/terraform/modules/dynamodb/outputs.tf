################################################################################
# DynamoDB Module Outputs
################################################################################

# Swipes Table
output "swipes_table_name" {
  description = "Name of the swipes DynamoDB table"
  value       = aws_dynamodb_table.swipes.name
}

output "swipes_table_arn" {
  description = "ARN of the swipes DynamoDB table"
  value       = aws_dynamodb_table.swipes.arn
}

output "swipes_table_id" {
  description = "ID of the swipes DynamoDB table"
  value       = aws_dynamodb_table.swipes.id
}

output "swipes_stream_arn" {
  description = "ARN of the swipes table DynamoDB Stream"
  value       = var.enable_streams ? aws_dynamodb_table.swipes.stream_arn : null
}

# Matches Table
output "matches_table_name" {
  description = "Name of the matches DynamoDB table"
  value       = aws_dynamodb_table.matches.name
}

output "matches_table_arn" {
  description = "ARN of the matches DynamoDB table"
  value       = aws_dynamodb_table.matches.arn
}

output "matches_table_id" {
  description = "ID of the matches DynamoDB table"
  value       = aws_dynamodb_table.matches.id
}

output "matches_stream_arn" {
  description = "ARN of the matches table DynamoDB Stream"
  value       = var.enable_streams ? aws_dynamodb_table.matches.stream_arn : null
}

# Messages Table
output "messages_table_name" {
  description = "Name of the messages DynamoDB table"
  value       = aws_dynamodb_table.messages.name
}

output "messages_table_arn" {
  description = "ARN of the messages DynamoDB table"
  value       = aws_dynamodb_table.messages.arn
}

output "messages_table_id" {
  description = "ID of the messages DynamoDB table"
  value       = aws_dynamodb_table.messages.id
}

output "messages_stream_arn" {
  description = "ARN of the messages table DynamoDB Stream"
  value       = var.enable_streams ? aws_dynamodb_table.messages.stream_arn : null
}

# All Table ARNs (for IAM policies)
output "all_table_arns" {
  description = "List of all DynamoDB table ARNs"
  value = [
    aws_dynamodb_table.swipes.arn,
    aws_dynamodb_table.matches.arn,
    aws_dynamodb_table.messages.arn
  ]
}

# All Table Names
output "all_table_names" {
  description = "Map of all DynamoDB table names"
  value = {
    swipes   = aws_dynamodb_table.swipes.name
    matches  = aws_dynamodb_table.matches.name
    messages = aws_dynamodb_table.messages.name
  }
}

# GSI ARNs (for IAM policies)
output "all_gsi_arns" {
  description = "List of all GSI ARNs for IAM policies"
  value = [
    "${aws_dynamodb_table.swipes.arn}/index/*",
    "${aws_dynamodb_table.matches.arn}/index/*",
    "${aws_dynamodb_table.messages.arn}/index/*"
  ]
}
