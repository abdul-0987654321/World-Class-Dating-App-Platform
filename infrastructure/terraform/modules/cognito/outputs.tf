################################################################################
# Cognito Module Outputs
################################################################################

################################################################################
# User Pool Outputs
################################################################################

output "user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.arn
}

output "user_pool_endpoint" {
  description = "Endpoint of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.endpoint
}

output "user_pool_domain" {
  description = "Domain of the Cognito User Pool"
  value       = aws_cognito_user_pool_domain.main.domain
}

output "user_pool_domain_cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN of the user pool domain"
  value       = aws_cognito_user_pool_domain.main.cloudfront_distribution_arn
}

output "user_pool_domain_s3_bucket" {
  description = "S3 bucket of the user pool domain"
  value       = aws_cognito_user_pool_domain.main.s3_bucket
}

output "user_pool_creation_date" {
  description = "Creation date of the user pool"
  value       = aws_cognito_user_pool.main.creation_date
}

output "user_pool_last_modified_date" {
  description = "Last modified date of the user pool"
  value       = aws_cognito_user_pool.main.last_modified_date
}

################################################################################
# User Pool Client Outputs
################################################################################

output "user_pool_client_ids" {
  description = "Map of user pool client names to IDs"
  value       = { for k, v in aws_cognito_user_pool_client.main : k => v.id }
}

output "user_pool_client_secrets" {
  description = "Map of user pool client names to secrets"
  value       = { for k, v in aws_cognito_user_pool_client.main : k => v.client_secret }
  sensitive   = true
}

output "user_pool_clients" {
  description = "Map of user pool client details"
  value = {
    for k, v in aws_cognito_user_pool_client.main : k => {
      id            = v.id
      name          = v.name
      client_secret = v.client_secret
    }
  }
  sensitive = true
}

################################################################################
# Resource Server Outputs
################################################################################

output "resource_server_identifiers" {
  description = "Map of resource server names to identifiers"
  value       = { for k, v in aws_cognito_resource_server.main : k => v.identifier }
}

output "resource_server_scope_identifiers" {
  description = "Map of resource server names to scope identifiers"
  value       = { for k, v in aws_cognito_resource_server.main : k => v.scope_identifiers }
}

################################################################################
# User Group Outputs
################################################################################

output "user_group_names" {
  description = "List of user group names"
  value       = [for k, v in aws_cognito_user_group.main : k]
}

################################################################################
# Identity Pool Outputs
################################################################################

output "identity_pool_id" {
  description = "ID of the Cognito Identity Pool"
  value       = try(aws_cognito_identity_pool.main[0].id, null)
}

output "identity_pool_arn" {
  description = "ARN of the Cognito Identity Pool"
  value       = try(aws_cognito_identity_pool.main[0].arn, null)
}

################################################################################
# IAM Role Outputs
################################################################################

output "authenticated_role_arn" {
  description = "ARN of the authenticated IAM role"
  value       = try(aws_iam_role.cognito_authenticated[0].arn, null)
}

output "unauthenticated_role_arn" {
  description = "ARN of the unauthenticated IAM role"
  value       = try(aws_iam_role.cognito_unauthenticated[0].arn, null)
}

output "sms_role_arn" {
  description = "ARN of the SMS IAM role"
  value       = try(aws_iam_role.cognito_sms[0].arn, null)
}

################################################################################
# OAuth Configuration
################################################################################

output "oauth_domain" {
  description = "Full OAuth domain URL"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
}

output "oauth_authorization_endpoint" {
  description = "OAuth authorization endpoint"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${data.aws_region.current.name}.amazoncognito.com/oauth2/authorize"
}

output "oauth_token_endpoint" {
  description = "OAuth token endpoint"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${data.aws_region.current.name}.amazoncognito.com/oauth2/token"
}

output "oauth_userinfo_endpoint" {
  description = "OAuth userinfo endpoint"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${data.aws_region.current.name}.amazoncognito.com/oauth2/userInfo"
}

output "jwks_uri" {
  description = "JWKS URI for token validation"
  value       = "https://cognito-idp.${data.aws_region.current.name}.amazonaws.com/${aws_cognito_user_pool.main.id}/.well-known/jwks.json"
}
