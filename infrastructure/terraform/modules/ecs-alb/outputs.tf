################################################################################
# Application Load Balancer Module - Outputs
################################################################################

output "alb_id" {
  description = "ALB ID"
  value       = aws_lb.main.id
}

output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.main.arn
}

output "alb_arn_suffix" {
  description = "ALB ARN suffix for CloudWatch metrics"
  value       = aws_lb.main.arn_suffix
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB hosted zone ID for Route53 alias records"
  value       = aws_lb.main.zone_id
}

output "security_group_id" {
  description = "Security group ID for the ALB"
  value       = aws_security_group.alb.id
}

output "security_group_arn" {
  description = "Security group ARN for the ALB"
  value       = aws_security_group.alb.arn
}

output "https_listener_arn" {
  description = "HTTPS listener ARN"
  value       = var.enable_https && var.certificate_arn != null ? aws_lb_listener.https[0].arn : null
}

output "http_listener_arn" {
  description = "HTTP listener ARN"
  value       = aws_lb_listener.http.arn
}

output "target_group_arns" {
  description = "Map of service names to target group ARNs"
  value       = { for k, v in aws_lb_target_group.services : k => v.arn }
}

output "target_group_arn_suffixes" {
  description = "Map of service names to target group ARN suffixes"
  value       = { for k, v in aws_lb_target_group.services : k => v.arn_suffix }
}

output "target_group_names" {
  description = "Map of service names to target group names"
  value       = { for k, v in aws_lb_target_group.services : k => v.name }
}
