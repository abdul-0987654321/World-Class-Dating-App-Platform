################################################################################
# Lambda@Edge Module Outputs
################################################################################

output "lambda_edge_role_arn" {
  description = "ARN of the Lambda@Edge IAM role"
  value       = aws_iam_role.lambda_edge_role.arn
}

output "lambda_edge_role_name" {
  description = "Name of the Lambda@Edge IAM role"
  value       = aws_iam_role.lambda_edge_role.name
}

output "request_transform_function_arn" {
  description = "ARN of the request transform Lambda function"
  value       = aws_lambda_function.request_transform.arn
}

output "request_transform_function_name" {
  description = "Name of the request transform Lambda function"
  value       = aws_lambda_function.request_transform.function_name
}

output "request_transform_qualified_arn" {
  description = "Qualified ARN of the request transform Lambda function (for CloudFront)"
  value       = aws_lambda_function.request_transform.qualified_arn
}

output "request_transform_version" {
  description = "Version of the request transform Lambda function"
  value       = aws_lambda_function.request_transform.version
}

output "auth_edge_function_arn" {
  description = "ARN of the auth edge Lambda function"
  value       = var.enable_auth_edge ? aws_lambda_function.auth_edge[0].arn : null
}

output "auth_edge_function_name" {
  description = "Name of the auth edge Lambda function"
  value       = var.enable_auth_edge ? aws_lambda_function.auth_edge[0].function_name : null
}

output "auth_edge_qualified_arn" {
  description = "Qualified ARN of the auth edge Lambda function (for CloudFront)"
  value       = var.enable_auth_edge ? aws_lambda_function.auth_edge[0].qualified_arn : null
}

output "ab_testing_function_arn" {
  description = "ARN of the A/B testing Lambda function"
  value       = var.enable_ab_testing ? aws_lambda_function.ab_testing[0].arn : null
}

output "ab_testing_function_name" {
  description = "Name of the A/B testing Lambda function"
  value       = var.enable_ab_testing ? aws_lambda_function.ab_testing[0].function_name : null
}

output "ab_testing_qualified_arn" {
  description = "Qualified ARN of the A/B testing Lambda function (for CloudFront)"
  value       = var.enable_ab_testing ? aws_lambda_function.ab_testing[0].qualified_arn : null
}

output "origin_request_function_arn" {
  description = "ARN of the origin request Lambda function"
  value       = var.origin_request_handler_code != "" ? aws_lambda_function.origin_request[0].arn : null
}

output "origin_request_qualified_arn" {
  description = "Qualified ARN of the origin request Lambda function (for CloudFront)"
  value       = var.origin_request_handler_code != "" ? aws_lambda_function.origin_request[0].qualified_arn : null
}

output "response_headers_function_arn" {
  description = "ARN of the response headers Lambda function"
  value       = aws_lambda_function.response_headers.arn
}

output "response_headers_function_name" {
  description = "Name of the response headers Lambda function"
  value       = aws_lambda_function.response_headers.function_name
}

output "response_headers_qualified_arn" {
  description = "Qualified ARN of the response headers Lambda function (for CloudFront)"
  value       = aws_lambda_function.response_headers.qualified_arn
}

output "response_headers_version" {
  description = "Version of the response headers Lambda function"
  value       = aws_lambda_function.response_headers.version
}

output "cloudwatch_log_group_arns" {
  description = "ARNs of CloudWatch log groups for Lambda@Edge functions"
  value = compact([
    aws_cloudwatch_log_group.request_transform.arn,
    var.enable_auth_edge ? aws_cloudwatch_log_group.auth_edge[0].arn : "",
    var.enable_ab_testing ? aws_cloudwatch_log_group.ab_testing[0].arn : "",
    var.origin_request_handler_code != "" ? aws_cloudwatch_log_group.origin_request[0].arn : "",
    aws_cloudwatch_log_group.response_headers.arn
  ])
}

output "lambda_associations" {
  description = "Map of Lambda function associations for CloudFront distribution"
  value = {
    viewer_request = {
      lambda_arn   = aws_lambda_function.request_transform.qualified_arn
      event_type   = "viewer-request"
      include_body = false
    }
    viewer_response = {
      lambda_arn   = aws_lambda_function.response_headers.qualified_arn
      event_type   = "viewer-response"
      include_body = false
    }
    origin_request = var.origin_request_handler_code != "" ? {
      lambda_arn   = aws_lambda_function.origin_request[0].qualified_arn
      event_type   = "origin-request"
      include_body = false
    } : null
  }
}
