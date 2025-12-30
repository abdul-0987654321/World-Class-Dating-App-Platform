################################################################################
# ECR Module Outputs
################################################################################

output "repositories" {
  description = "Map of repository names to repository attributes"
  value = {
    for k, v in aws_ecr_repository.main : k => {
      arn            = v.arn
      name           = v.name
      registry_id    = v.registry_id
      repository_url = v.repository_url
    }
  }
}

output "repository_arns" {
  description = "Map of repository names to ARNs"
  value       = { for k, v in aws_ecr_repository.main : k => v.arn }
}

output "repository_urls" {
  description = "Map of repository names to URLs"
  value       = { for k, v in aws_ecr_repository.main : k => v.repository_url }
}

output "repository_names" {
  description = "Map of repository keys to full repository names"
  value       = { for k, v in aws_ecr_repository.main : k => v.name }
}

output "registry_id" {
  description = "ECR registry ID"
  value       = data.aws_caller_identity.current.account_id
}

output "registry_url" {
  description = "ECR registry URL"
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com"
}

output "docker_login_command" {
  description = "AWS CLI command to authenticate Docker to ECR"
  value       = "aws ecr get-login-password --region ${data.aws_region.current.name} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com"
}

output "repository_image_uri_template" {
  description = "Template for constructing image URIs"
  value = {
    for k, v in aws_ecr_repository.main : k => "${v.repository_url}:{{TAG}}"
  }
}
