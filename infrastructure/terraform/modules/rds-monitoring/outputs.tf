################################################################################
# RDS Monitoring Module Outputs
################################################################################

output "enhanced_monitoring_role_arn" {
  description = "ARN of the IAM role for RDS Enhanced Monitoring"
  value       = var.create_monitoring_role ? aws_iam_role.enhanced_monitoring[0].arn : null
}

output "enhanced_monitoring_role_name" {
  description = "Name of the IAM role for RDS Enhanced Monitoring"
  value       = var.create_monitoring_role ? aws_iam_role.enhanced_monitoring[0].name : null
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for RDS alerts"
  value       = var.create_sns_topic ? aws_sns_topic.rds_alerts[0].arn : var.existing_sns_topic_arn
}

output "sns_topic_name" {
  description = "Name of the SNS topic for RDS alerts"
  value       = var.create_sns_topic ? aws_sns_topic.rds_alerts[0].name : null
}

output "audit_log_group_arn" {
  description = "ARN of the CloudWatch log group for RDS audit logs"
  value       = var.enable_audit_log ? aws_cloudwatch_log_group.rds_audit[0].arn : null
}

output "error_log_group_arn" {
  description = "ARN of the CloudWatch log group for RDS error logs"
  value       = var.enable_error_log ? aws_cloudwatch_log_group.rds_error[0].arn : null
}

output "general_log_group_arn" {
  description = "ARN of the CloudWatch log group for RDS general logs"
  value       = var.enable_general_log ? aws_cloudwatch_log_group.rds_general[0].arn : null
}

output "slowquery_log_group_arn" {
  description = "ARN of the CloudWatch log group for RDS slow query logs"
  value       = var.enable_slowquery_log ? aws_cloudwatch_log_group.rds_slowquery[0].arn : null
}

output "all_log_group_arns" {
  description = "List of all CloudWatch log group ARNs"
  value = compact([
    var.enable_audit_log ? aws_cloudwatch_log_group.rds_audit[0].arn : "",
    var.enable_error_log ? aws_cloudwatch_log_group.rds_error[0].arn : "",
    var.enable_general_log ? aws_cloudwatch_log_group.rds_general[0].arn : "",
    var.enable_slowquery_log ? aws_cloudwatch_log_group.rds_slowquery[0].arn : ""
  ])
}

output "cpu_utilization_alarm_arn" {
  description = "ARN of the CPU utilization CloudWatch alarm"
  value       = var.create_cpu_alarm ? aws_cloudwatch_metric_alarm.cpu_utilization_high[0].arn : null
}

output "connection_count_alarm_arn" {
  description = "ARN of the connection count CloudWatch alarm"
  value       = var.create_connection_alarm ? aws_cloudwatch_metric_alarm.connection_count_high[0].arn : null
}

output "storage_alarm_arns" {
  description = "ARNs of storage-related CloudWatch alarms"
  value = var.create_storage_alarm ? [
    aws_cloudwatch_metric_alarm.volume_bytes_used_high[0].arn,
    aws_cloudwatch_metric_alarm.freeable_memory_low[0].arn,
    aws_cloudwatch_metric_alarm.free_local_storage_low[0].arn
  ] : []
}

output "replication_alarm_arns" {
  description = "ARNs of replication-related CloudWatch alarms"
  value = compact([
    var.create_replication_alarm ? aws_cloudwatch_metric_alarm.aurora_replica_lag_high[0].arn : "",
    var.create_replication_alarm && var.create_warning_alarms ? aws_cloudwatch_metric_alarm.aurora_replica_lag_warning[0].arn : "",
    var.create_replication_alarm && var.enable_binlog_replication_monitoring ? aws_cloudwatch_metric_alarm.aurora_binlog_replica_lag[0].arn : ""
  ])
}

output "deadlocks_alarm_arn" {
  description = "ARN of the deadlocks CloudWatch alarm"
  value       = var.create_deadlock_alarm ? aws_cloudwatch_metric_alarm.deadlocks[0].arn : null
}

output "latency_alarm_arns" {
  description = "ARNs of latency-related CloudWatch alarms"
  value = var.create_latency_alarm ? [
    aws_cloudwatch_metric_alarm.read_latency_high[0].arn,
    aws_cloudwatch_metric_alarm.write_latency_high[0].arn
  ] : []
}

output "disk_queue_alarm_arn" {
  description = "ARN of the disk queue depth CloudWatch alarm"
  value       = var.create_disk_queue_alarm ? aws_cloudwatch_metric_alarm.disk_queue_depth_high[0].arn : null
}

output "serverless_alarm_arns" {
  description = "ARNs of serverless v2 CloudWatch alarms"
  value = var.is_serverless_v2 && var.create_serverless_alarms ? [
    aws_cloudwatch_metric_alarm.serverless_capacity_high[0].arn,
    aws_cloudwatch_metric_alarm.acu_utilization_high[0].arn
  ] : []
}

output "composite_alarm_arn" {
  description = "ARN of the composite CloudWatch alarm"
  value       = var.create_composite_alarm ? aws_cloudwatch_composite_alarm.rds_critical[0].arn : null
}

output "all_alarm_arns" {
  description = "List of all CloudWatch alarm ARNs"
  value       = local.all_alarm_arns
}

output "dashboard_name" {
  description = "Name of the RDS monitoring dashboard"
  value       = var.create_dashboard ? aws_cloudwatch_dashboard.rds_monitoring[0].dashboard_name : null
}

output "dashboard_arn" {
  description = "ARN of the RDS monitoring dashboard"
  value       = var.create_dashboard ? aws_cloudwatch_dashboard.rds_monitoring[0].dashboard_arn : null
}

output "event_subscription_id" {
  description = "ID of the RDS event subscription"
  value       = var.create_event_subscription ? aws_db_event_subscription.critical_events[0].id : null
}

output "instance_event_subscription_id" {
  description = "ID of the RDS instance event subscription"
  value       = var.create_event_subscription && length(var.db_instance_identifiers) > 0 ? aws_db_event_subscription.instance_events[0].id : null
}
