################################################################################
# Production Alarms Module - Outputs
################################################################################

output "critical_alerts_topic_arn" {
  description = "ARN of the critical alerts SNS topic"
  value       = var.create_sns_topics ? aws_sns_topic.critical_alerts[0].arn : null
}

output "warning_alerts_topic_arn" {
  description = "ARN of the warning alerts SNS topic"
  value       = var.create_sns_topics ? aws_sns_topic.warning_alerts[0].arn : null
}

output "info_alerts_topic_arn" {
  description = "ARN of the info alerts SNS topic"
  value       = var.create_sns_topics ? aws_sns_topic.info_alerts[0].arn : null
}

output "eks_alarm_names" {
  description = "Names of EKS-related alarms"
  value = var.eks_cluster_name != null ? [
    aws_cloudwatch_metric_alarm.eks_cluster_failed_pods[0].alarm_name,
    aws_cloudwatch_metric_alarm.eks_node_cpu_high[0].alarm_name,
    aws_cloudwatch_metric_alarm.eks_node_memory_high[0].alarm_name,
    aws_cloudwatch_metric_alarm.eks_pending_pods[0].alarm_name
  ] : []
}

output "rds_alarm_names" {
  description = "Names of RDS-related alarms"
  value = var.rds_cluster_identifier != null ? [
    aws_cloudwatch_metric_alarm.rds_cpu_critical[0].alarm_name,
    aws_cloudwatch_metric_alarm.rds_connections_high[0].alarm_name,
    aws_cloudwatch_metric_alarm.rds_deadlocks[0].alarm_name,
    aws_cloudwatch_metric_alarm.rds_read_latency[0].alarm_name,
    aws_cloudwatch_metric_alarm.rds_write_latency[0].alarm_name,
    aws_cloudwatch_metric_alarm.rds_replication_lag[0].alarm_name
  ] : []
}

output "elasticache_alarm_names" {
  description = "Names of ElastiCache-related alarms"
  value = var.elasticache_replication_group_id != null ? [
    aws_cloudwatch_metric_alarm.elasticache_cpu_high[0].alarm_name,
    aws_cloudwatch_metric_alarm.elasticache_memory_high[0].alarm_name,
    aws_cloudwatch_metric_alarm.elasticache_evictions[0].alarm_name,
    aws_cloudwatch_metric_alarm.elasticache_replication_lag[0].alarm_name
  ] : []
}

output "alb_alarm_names" {
  description = "Names of ALB-related alarms"
  value = var.alb_arn_suffix != null ? [
    aws_cloudwatch_metric_alarm.alb_5xx_errors[0].alarm_name,
    aws_cloudwatch_metric_alarm.alb_target_5xx_errors[0].alarm_name,
    aws_cloudwatch_metric_alarm.alb_unhealthy_hosts[0].alarm_name,
    aws_cloudwatch_metric_alarm.alb_latency_high[0].alarm_name
  ] : []
}

output "waf_alarm_names" {
  description = "Names of WAF-related alarms"
  value = var.waf_web_acl_name != null ? [
    aws_cloudwatch_metric_alarm.waf_blocked_requests_high[0].alarm_name,
    aws_cloudwatch_metric_alarm.waf_rate_limited_requests[0].alarm_name
  ] : []
}

output "composite_alarm_names" {
  description = "Names of composite alarms"
  value = concat(
    var.rds_cluster_identifier != null ? [aws_cloudwatch_composite_alarm.database_health[0].alarm_name] : [],
    var.alb_arn_suffix != null && var.eks_cluster_name != null ? [aws_cloudwatch_composite_alarm.application_health[0].alarm_name] : []
  )
}

output "cost_anomaly_monitor_arn" {
  description = "ARN of the cost anomaly monitor"
  value       = var.enable_cost_anomaly_detection ? aws_ce_anomaly_monitor.cost[0].arn : null
}
