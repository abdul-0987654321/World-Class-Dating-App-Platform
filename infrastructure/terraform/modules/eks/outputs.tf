################################################################################
# EKS Module Outputs
################################################################################

output "cluster_id" {
  description = "ID of the EKS cluster"
  value       = aws_eks_cluster.main.id
}

output "cluster_arn" {
  description = "ARN of the EKS cluster"
  value       = aws_eks_cluster.main.arn
}

output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  description = "Endpoint for the EKS cluster API server"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data for the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

output "cluster_version" {
  description = "Kubernetes version of the cluster"
  value       = aws_eks_cluster.main.version
}

output "cluster_platform_version" {
  description = "Platform version of the EKS cluster"
  value       = aws_eks_cluster.main.platform_version
}

output "cluster_status" {
  description = "Status of the EKS cluster"
  value       = aws_eks_cluster.main.status
}

output "cluster_security_group_id" {
  description = "ID of the cluster security group"
  value       = aws_security_group.cluster.id
}

output "node_security_group_id" {
  description = "ID of the node security group"
  value       = aws_security_group.node.id
}

output "cluster_iam_role_arn" {
  description = "ARN of the cluster IAM role"
  value       = aws_iam_role.cluster.arn
}

output "cluster_iam_role_name" {
  description = "Name of the cluster IAM role"
  value       = aws_iam_role.cluster.name
}

output "node_iam_role_arn" {
  description = "ARN of the node IAM role"
  value       = aws_iam_role.node.arn
}

output "node_iam_role_name" {
  description = "Name of the node IAM role"
  value       = aws_iam_role.node.name
}

output "node_instance_profile_arn" {
  description = "ARN of the node instance profile"
  value       = aws_iam_instance_profile.node.arn
}

output "oidc_provider_arn" {
  description = "ARN of the OIDC provider"
  value       = aws_iam_openid_connect_provider.cluster.arn
}

output "oidc_provider_url" {
  description = "URL of the OIDC provider"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

output "cluster_autoscaler_role_arn" {
  description = "ARN of the Cluster Autoscaler IAM role"
  value       = try(aws_iam_role.cluster_autoscaler[0].arn, null)
}

output "aws_lb_controller_role_arn" {
  description = "ARN of the AWS Load Balancer Controller IAM role"
  value       = try(aws_iam_role.aws_lb_controller[0].arn, null)
}

output "external_dns_role_arn" {
  description = "ARN of the External DNS IAM role"
  value       = try(aws_iam_role.external_dns[0].arn, null)
}

output "ebs_csi_role_arn" {
  description = "ARN of the EBS CSI Driver IAM role"
  value       = try(aws_iam_role.ebs_csi[0].arn, null)
}

output "vpc_cni_role_arn" {
  description = "ARN of the VPC CNI IAM role"
  value       = aws_iam_role.vpc_cni.arn
}

output "kms_key_arn" {
  description = "ARN of the KMS key for EKS encryption"
  value       = try(aws_kms_key.eks[0].arn, var.kms_key_arn)
}

output "kms_key_id" {
  description = "ID of the KMS key for EKS encryption"
  value       = try(aws_kms_key.eks[0].key_id, null)
}

output "node_groups" {
  description = "Map of node group names to their attributes"
  value = {
    for k, v in aws_eks_node_group.main : k => {
      arn           = v.arn
      status        = v.status
      capacity_type = v.capacity_type
      scaling_config = {
        desired_size = v.scaling_config[0].desired_size
        min_size     = v.scaling_config[0].min_size
        max_size     = v.scaling_config[0].max_size
      }
    }
  }
}

output "cluster_log_group_name" {
  description = "Name of the CloudWatch log group for cluster logs"
  value       = aws_cloudwatch_log_group.cluster.name
}

output "cluster_log_group_arn" {
  description = "ARN of the CloudWatch log group for cluster logs"
  value       = aws_cloudwatch_log_group.cluster.arn
}

################################################################################
# Kubeconfig Helper
################################################################################

output "kubeconfig_command" {
  description = "AWS CLI command to update kubeconfig"
  value       = "aws eks update-kubeconfig --name ${aws_eks_cluster.main.name} --region $AWS_REGION"
}
