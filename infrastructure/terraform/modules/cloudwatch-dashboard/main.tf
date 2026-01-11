################################################################################
# CloudWatch Dashboard Module
# Creates comprehensive CloudWatch dashboards for infrastructure monitoring,
# API performance, business metrics, and cost tracking
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
  region      = data.aws_region.current.name
  account_id  = data.aws_caller_identity.current.account_id

  # Common tags for all resources
  common_tags = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    Module      = "cloudwatch-dashboard"
    ManagedBy   = "terraform"
  })

  # Operations Dashboard widgets - built conditionally
  ops_header_widgets = [
    {
      type   = "text"
      x      = 0
      y      = 0
      width  = 24
      height = 1
      properties = {
        markdown   = "# ${var.project_name} Operations Dashboard - ${upper(var.environment)}"
        background = "transparent"
      }
    }
  ]

  ops_eks_widgets = var.eks_cluster_name != null ? [
    {
      type   = "text"
      x      = 0
      y      = 1
      width  = 24
      height = 1
      properties = {
        markdown   = "## EKS Cluster Metrics"
        background = "transparent"
      }
    },
    {
      type   = "metric"
      x      = 0
      y      = 2
      width  = 8
      height = 6
      properties = {
        title   = "Pod CPU Utilization"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Average"
        metrics = [
          ["ContainerInsights", "pod_cpu_utilization", "ClusterName", var.eks_cluster_name],
          [".", "pod_cpu_utilization_over_pod_limit", ".", "."]
        ]
        yAxis = {
          left = {
            min   = 0
            max   = 100
            label = "Percent"
          }
        }
      }
    },
    {
      type   = "metric"
      x      = 8
      y      = 2
      width  = 8
      height = 6
      properties = {
        title   = "Pod Memory Utilization"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Average"
        metrics = [
          ["ContainerInsights", "pod_memory_utilization", "ClusterName", var.eks_cluster_name],
          [".", "pod_memory_utilization_over_pod_limit", ".", "."]
        ]
        yAxis = {
          left = {
            min   = 0
            max   = 100
            label = "Percent"
          }
        }
      }
    },
    {
      type   = "metric"
      x      = 16
      y      = 2
      width  = 8
      height = 6
      properties = {
        title   = "Cluster Node Count"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Average"
        metrics = [
          ["ContainerInsights", "cluster_node_count", "ClusterName", var.eks_cluster_name]
        ]
      }
    },
    {
      type   = "metric"
      x      = 0
      y      = 8
      width  = 8
      height = 6
      properties = {
        title   = "Pod Network Traffic"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Average"
        metrics = [
          ["ContainerInsights", "pod_network_rx_bytes", "ClusterName", var.eks_cluster_name, { label = "RX Bytes" }],
          [".", "pod_network_tx_bytes", ".", ".", { label = "TX Bytes" }]
        ]
        yAxis = {
          left = {
            label = "Bytes"
          }
        }
      }
    },
    {
      type   = "metric"
      x      = 8
      y      = 8
      width  = 8
      height = 6
      properties = {
        title   = "Running Pods"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Average"
        metrics = [
          ["ContainerInsights", "cluster_running_pod_count", "ClusterName", var.eks_cluster_name]
        ]
      }
    },
    {
      type   = "metric"
      x      = 16
      y      = 8
      width  = 8
      height = 6
      properties = {
        title   = "Failed Pods"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Sum"
        metrics = [
          ["ContainerInsights", "cluster_failed_pod_count", "ClusterName", var.eks_cluster_name]
        ]
      }
    }
  ] : []

  ops_rds_y_offset = var.eks_cluster_name != null ? 14 : 1
  ops_rds_widgets = var.rds_cluster_id != null ? [
    {
      type   = "text"
      x      = 0
      y      = local.ops_rds_y_offset
      width  = 24
      height = 1
      properties = {
        markdown   = "## RDS Aurora Metrics"
        background = "transparent"
      }
    },
    {
      type   = "metric"
      x      = 0
      y      = local.ops_rds_y_offset + 1
      width  = 6
      height = 6
      properties = {
        title   = "CPU Utilization"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Average"
        metrics = [
          ["AWS/RDS", "CPUUtilization", "DBClusterIdentifier", var.rds_cluster_id]
        ]
        yAxis = {
          left = {
            min   = 0
            max   = 100
            label = "Percent"
          }
        }
        annotations = {
          horizontal = [
            { label = "Critical", value = 90, color = "#ff0000" },
            { label = "Warning", value = 70, color = "#ff9900" }
          ]
        }
      }
    },
    {
      type   = "metric"
      x      = 6
      y      = local.ops_rds_y_offset + 1
      width  = 6
      height = 6
      properties = {
        title   = "Database Connections"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Average"
        metrics = [
          ["AWS/RDS", "DatabaseConnections", "DBClusterIdentifier", var.rds_cluster_id]
        ]
      }
    },
    {
      type   = "metric"
      x      = 12
      y      = local.ops_rds_y_offset + 1
      width  = 6
      height = 6
      properties = {
        title   = "Read/Write Latency"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Average"
        metrics = [
          ["AWS/RDS", "ReadLatency", "DBClusterIdentifier", var.rds_cluster_id, { label = "Read Latency" }],
          [".", "WriteLatency", ".", ".", { label = "Write Latency" }]
        ]
        yAxis = { left = { label = "Seconds" } }
      }
    },
    {
      type   = "metric"
      x      = 18
      y      = local.ops_rds_y_offset + 1
      width  = 6
      height = 6
      properties = {
        title   = "Freeable Memory"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Average"
        metrics = [
          ["AWS/RDS", "FreeableMemory", "DBClusterIdentifier", var.rds_cluster_id]
        ]
        yAxis = { left = { label = "Bytes" } }
      }
    },
    {
      type   = "metric"
      x      = 0
      y      = local.ops_rds_y_offset + 7
      width  = 6
      height = 6
      properties = {
        title   = "Read/Write IOPS"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Average"
        metrics = [
          ["AWS/RDS", "ReadIOPS", "DBClusterIdentifier", var.rds_cluster_id, { label = "Read IOPS" }],
          [".", "WriteIOPS", ".", ".", { label = "Write IOPS" }]
        ]
      }
    },
    {
      type   = "metric"
      x      = 6
      y      = local.ops_rds_y_offset + 7
      width  = 6
      height = 6
      properties = {
        title   = "Network Throughput"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Average"
        metrics = [
          ["AWS/RDS", "NetworkReceiveThroughput", "DBClusterIdentifier", var.rds_cluster_id, { label = "Receive" }],
          [".", "NetworkTransmitThroughput", ".", ".", { label = "Transmit" }]
        ]
        yAxis = { left = { label = "Bytes/Second" } }
      }
    },
    {
      type   = "metric"
      x      = 12
      y      = local.ops_rds_y_offset + 7
      width  = 6
      height = 6
      properties = {
        title   = "Buffer Cache Hit Ratio"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Average"
        metrics = [
          ["AWS/RDS", "BufferCacheHitRatio", "DBClusterIdentifier", var.rds_cluster_id]
        ]
        yAxis = { left = { min = 0, max = 100, label = "Percent" } }
      }
    },
    {
      type   = "metric"
      x      = 18
      y      = local.ops_rds_y_offset + 7
      width  = 6
      height = 6
      properties = {
        title   = "Deadlocks"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Sum"
        metrics = [
          ["AWS/RDS", "Deadlocks", "DBClusterIdentifier", var.rds_cluster_id]
        ]
      }
    }
  ] : []

  ops_elasticache_y_offset = local.ops_rds_y_offset + (var.rds_cluster_id != null ? 14 : 0)
  ops_elasticache_widgets = var.elasticache_cluster_id != null ? [
    {
      type   = "text"
      x      = 0
      y      = local.ops_elasticache_y_offset
      width  = 24
      height = 1
      properties = {
        markdown   = "## ElastiCache Redis Metrics"
        background = "transparent"
      }
    },
    {
      type   = "metric"
      x      = 0
      y      = local.ops_elasticache_y_offset + 1
      width  = 6
      height = 6
      properties = {
        title   = "CPU Utilization"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Average"
        metrics = [
          ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", var.elasticache_cluster_id],
          [".", "EngineCPUUtilization", ".", "."]
        ]
        yAxis = { left = { min = 0, max = 100, label = "Percent" } }
      }
    },
    {
      type   = "metric"
      x      = 6
      y      = local.ops_elasticache_y_offset + 1
      width  = 6
      height = 6
      properties = {
        title   = "Memory Usage"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Average"
        metrics = [
          ["AWS/ElastiCache", "DatabaseMemoryUsagePercentage", "CacheClusterId", var.elasticache_cluster_id],
          [".", "BytesUsedForCache", ".", "."]
        ]
      }
    },
    {
      type   = "metric"
      x      = 12
      y      = local.ops_elasticache_y_offset + 1
      width  = 6
      height = 6
      properties = {
        title   = "Cache Hit Rate"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Average"
        metrics = [
          ["AWS/ElastiCache", "CacheHitRate", "CacheClusterId", var.elasticache_cluster_id]
        ]
        yAxis = { left = { min = 0, max = 100, label = "Percent" } }
      }
    },
    {
      type   = "metric"
      x      = 18
      y      = local.ops_elasticache_y_offset + 1
      width  = 6
      height = 6
      properties = {
        title   = "Current Connections"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Average"
        metrics = [
          ["AWS/ElastiCache", "CurrConnections", "CacheClusterId", var.elasticache_cluster_id],
          [".", "NewConnections", ".", "."]
        ]
      }
    },
    {
      type   = "metric"
      x      = 0
      y      = local.ops_elasticache_y_offset + 7
      width  = 6
      height = 6
      properties = {
        title   = "Cache Hits/Misses"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Sum"
        metrics = [
          ["AWS/ElastiCache", "CacheHits", "CacheClusterId", var.elasticache_cluster_id, { label = "Hits" }],
          [".", "CacheMisses", ".", ".", { label = "Misses" }]
        ]
      }
    },
    {
      type   = "metric"
      x      = 6
      y      = local.ops_elasticache_y_offset + 7
      width  = 6
      height = 6
      properties = {
        title   = "Get/Set Commands"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Sum"
        metrics = [
          ["AWS/ElastiCache", "GetTypeCmds", "CacheClusterId", var.elasticache_cluster_id, { label = "GET" }],
          [".", "SetTypeCmds", ".", ".", { label = "SET" }]
        ]
      }
    },
    {
      type   = "metric"
      x      = 12
      y      = local.ops_elasticache_y_offset + 7
      width  = 6
      height = 6
      properties = {
        title   = "Evictions"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Sum"
        metrics = [
          ["AWS/ElastiCache", "Evictions", "CacheClusterId", var.elasticache_cluster_id]
        ]
      }
    },
    {
      type   = "metric"
      x      = 18
      y      = local.ops_elasticache_y_offset + 7
      width  = 6
      height = 6
      properties = {
        title   = "Replication Lag"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 300
        stat    = "Average"
        metrics = [
          ["AWS/ElastiCache", "ReplicationLag", "CacheClusterId", var.elasticache_cluster_id]
        ]
        yAxis = { left = { label = "Seconds" } }
      }
    }
  ] : []

  # API Performance Dashboard widgets
  api_header_widgets = [
    {
      type   = "text"
      x      = 0
      y      = 0
      width  = 24
      height = 1
      properties = {
        markdown   = "# ${var.project_name} API Performance Dashboard - ${upper(var.environment)}"
        background = "transparent"
      }
    }
  ]

  api_alb_widgets = var.alb_arn_suffix != null ? [
    {
      type   = "text"
      x      = 0
      y      = 1
      width  = 24
      height = 1
      properties = {
        markdown   = "## Application Load Balancer Metrics"
        background = "transparent"
      }
    },
    {
      type   = "metric"
      x      = 0
      y      = 2
      width  = 8
      height = 6
      properties = {
        title   = "Request Count"
        region  = local.region
        stacked = true
        view    = "timeSeries"
        period  = 60
        stat    = "Sum"
        metrics = [
          ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix, { label = "Total Requests" }]
        ]
      }
    },
    {
      type   = "metric"
      x      = 8
      y      = 2
      width  = 8
      height = 6
      properties = {
        title   = "Target Response Time"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 60
        stat    = "Average"
        metrics = [
          ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix, { label = "Avg Response Time" }],
          ["...", { stat = "p50", label = "p50" }],
          ["...", { stat = "p90", label = "p90" }],
          ["...", { stat = "p99", label = "p99" }]
        ]
        yAxis = { left = { label = "Seconds" } }
        annotations = {
          horizontal = [
            { label = "SLA Target", value = 0.5, color = "#2ca02c" },
            { label = "Warning", value = 1.0, color = "#ff9900" },
            { label = "Critical", value = 2.0, color = "#ff0000" }
          ]
        }
      }
    },
    {
      type   = "metric"
      x      = 16
      y      = 2
      width  = 8
      height = 6
      properties = {
        title   = "Active Connections"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 60
        stat    = "Sum"
        metrics = [
          ["AWS/ApplicationELB", "ActiveConnectionCount", "LoadBalancer", var.alb_arn_suffix],
          [".", "NewConnectionCount", ".", "."]
        ]
      }
    },
    {
      type   = "metric"
      x      = 0
      y      = 8
      width  = 6
      height = 6
      properties = {
        title   = "HTTP 2xx Responses"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 60
        stat    = "Sum"
        metrics = [
          ["AWS/ApplicationELB", "HTTPCode_Target_2XX_Count", "LoadBalancer", var.alb_arn_suffix, { color = "#2ca02c" }]
        ]
      }
    },
    {
      type   = "metric"
      x      = 6
      y      = 8
      width  = 6
      height = 6
      properties = {
        title   = "HTTP 3xx Responses"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 60
        stat    = "Sum"
        metrics = [
          ["AWS/ApplicationELB", "HTTPCode_Target_3XX_Count", "LoadBalancer", var.alb_arn_suffix, { color = "#1f77b4" }]
        ]
      }
    },
    {
      type   = "metric"
      x      = 12
      y      = 8
      width  = 6
      height = 6
      properties = {
        title   = "HTTP 4xx Errors (Client)"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 60
        stat    = "Sum"
        metrics = [
          ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", var.alb_arn_suffix, { color = "#ff9900", label = "Target 4XX" }],
          [".", "HTTPCode_ELB_4XX_Count", ".", ".", { color = "#d62728", label = "ELB 4XX" }]
        ]
      }
    },
    {
      type   = "metric"
      x      = 18
      y      = 8
      width  = 6
      height = 6
      properties = {
        title   = "HTTP 5xx Errors (Server)"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 60
        stat    = "Sum"
        metrics = [
          ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", var.alb_arn_suffix, { color = "#ff0000", label = "Target 5XX" }],
          [".", "HTTPCode_ELB_5XX_Count", ".", ".", { color = "#9467bd", label = "ELB 5XX" }]
        ]
      }
    },
    {
      type   = "metric"
      x      = 0
      y      = 14
      width  = 8
      height = 6
      properties = {
        title   = "Error Rate (%)"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 60
        metrics = [
          [{ expression = "(m1+m2)/(m3+0.0001)*100", label = "Error Rate %", id = "e1", color = "#ff0000" }],
          ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", var.alb_arn_suffix, { id = "m1", visible = false }],
          [".", "HTTPCode_ELB_5XX_Count", ".", ".", { id = "m2", visible = false }],
          [".", "RequestCount", ".", ".", { id = "m3", visible = false }]
        ]
        yAxis = { left = { min = 0, max = 10, label = "Percent" } }
        annotations = {
          horizontal = [
            { label = "Target", value = 0.1, color = "#2ca02c" },
            { label = "Warning", value = 1, color = "#ff9900" },
            { label = "Critical", value = 5, color = "#ff0000" }
          ]
        }
      }
    },
    {
      type   = "metric"
      x      = 8
      y      = 14
      width  = 8
      height = 6
      properties = {
        title   = "Healthy vs Unhealthy Hosts"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 60
        stat    = "Average"
        metrics = [
          ["AWS/ApplicationELB", "HealthyHostCount", "LoadBalancer", var.alb_arn_suffix, { color = "#2ca02c", label = "Healthy" }],
          [".", "UnHealthyHostCount", ".", ".", { color = "#ff0000", label = "Unhealthy" }]
        ]
      }
    },
    {
      type   = "metric"
      x      = 16
      y      = 14
      width  = 8
      height = 6
      properties = {
        title   = "Processed Bytes"
        region  = local.region
        stacked = true
        view    = "timeSeries"
        period  = 60
        stat    = "Sum"
        metrics = [
          ["AWS/ApplicationELB", "ProcessedBytes", "LoadBalancer", var.alb_arn_suffix]
        ]
        yAxis = { left = { label = "Bytes" } }
      }
    }
  ] : []

  api_gateway_y_offset = var.alb_arn_suffix != null ? 20 : 1
  api_gateway_widgets = var.api_gateway_id != null ? [
    {
      type   = "text"
      x      = 0
      y      = local.api_gateway_y_offset
      width  = 24
      height = 1
      properties = {
        markdown   = "## API Gateway Metrics"
        background = "transparent"
      }
    },
    {
      type   = "metric"
      x      = 0
      y      = local.api_gateway_y_offset + 1
      width  = 8
      height = 6
      properties = {
        title   = "API Requests"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 60
        stat    = "Sum"
        metrics = [
          ["AWS/ApiGateway", "Count", "ApiId", var.api_gateway_id]
        ]
      }
    },
    {
      type   = "metric"
      x      = 8
      y      = local.api_gateway_y_offset + 1
      width  = 8
      height = 6
      properties = {
        title   = "API Latency"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 60
        metrics = [
          ["AWS/ApiGateway", "Latency", "ApiId", var.api_gateway_id, { stat = "Average", label = "Average" }],
          ["...", { stat = "p50", label = "p50" }],
          ["...", { stat = "p90", label = "p90" }],
          ["...", { stat = "p99", label = "p99" }]
        ]
        yAxis = { left = { label = "Milliseconds" } }
      }
    },
    {
      type   = "metric"
      x      = 16
      y      = local.api_gateway_y_offset + 1
      width  = 8
      height = 6
      properties = {
        title   = "API Errors"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 60
        stat    = "Sum"
        metrics = [
          ["AWS/ApiGateway", "4XXError", "ApiId", var.api_gateway_id, { color = "#ff9900", label = "4XX Errors" }],
          [".", "5XXError", ".", ".", { color = "#ff0000", label = "5XX Errors" }]
        ]
      }
    }
  ] : []

  api_app_y_offset = local.api_gateway_y_offset + (var.api_gateway_id != null ? 8 : 0)
  api_app_widgets = [
    {
      type   = "text"
      x      = 0
      y      = local.api_app_y_offset
      width  = 24
      height = 1
      properties = {
        markdown   = "## Application Performance Metrics"
        background = "transparent"
      }
    },
    {
      type   = "metric"
      x      = 0
      y      = local.api_app_y_offset + 1
      width  = 8
      height = 6
      properties = {
        title   = "API Endpoint Latency by Service"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 60
        stat    = "Average"
        metrics = [
          ["${var.project_name}/${var.environment}", "api_latency_ms", "service", "user-service", { label = "User Service" }],
          ["...", "matching-service", { label = "Matching Service" }],
          ["...", "messaging-service", { label = "Messaging Service" }],
          ["...", "payment-service", { label = "Payment Service" }]
        ]
        yAxis = { left = { label = "Milliseconds" } }
      }
    },
    {
      type   = "metric"
      x      = 8
      y      = local.api_app_y_offset + 1
      width  = 8
      height = 6
      properties = {
        title   = "Request Rate by Service"
        region  = local.region
        stacked = true
        view    = "timeSeries"
        period  = 60
        stat    = "Sum"
        metrics = [
          ["${var.project_name}/${var.environment}", "request_count", "service", "user-service", { label = "User Service" }],
          ["...", "matching-service", { label = "Matching Service" }],
          ["...", "messaging-service", { label = "Messaging Service" }],
          ["...", "payment-service", { label = "Payment Service" }]
        ]
      }
    },
    {
      type   = "metric"
      x      = 16
      y      = local.api_app_y_offset + 1
      width  = 8
      height = 6
      properties = {
        title   = "Error Rate by Service"
        region  = local.region
        stacked = false
        view    = "timeSeries"
        period  = 60
        stat    = "Sum"
        metrics = [
          ["${var.project_name}/${var.environment}", "error_count", "service", "user-service", { label = "User Service" }],
          ["...", "matching-service", { label = "Matching Service" }],
          ["...", "messaging-service", { label = "Messaging Service" }],
          ["...", "payment-service", { label = "Payment Service" }]
        ]
      }
    }
  ]
}

################################################################################
# Main Operations Dashboard
# Monitors EKS, RDS, and ElastiCache infrastructure metrics
################################################################################

resource "aws_cloudwatch_dashboard" "operations" {
  dashboard_name = "${local.name_prefix}-operations"

  dashboard_body = jsonencode({
    widgets = flatten([
      local.ops_header_widgets,
      local.ops_eks_widgets,
      local.ops_rds_widgets,
      local.ops_elasticache_widgets
    ])
  })
}

################################################################################
# API Performance Dashboard
# Monitors latency, error rates, and request counts
################################################################################

resource "aws_cloudwatch_dashboard" "api_performance" {
  dashboard_name = "${local.name_prefix}-api-performance"

  dashboard_body = jsonencode({
    widgets = flatten([
      local.api_header_widgets,
      local.api_alb_widgets,
      local.api_gateway_widgets,
      local.api_app_widgets
    ])
  })
}

# NOTE: Duplicate api_performance inline resource removed (lines ~970-1408).
# The correct api_performance resource using locals is above at lines ~957-968.
# Continuing with the business_metrics dashboard below.

# CLEANUP MARKER - next valid content should be business_metrics header
################################################################################
# Business Metrics Dashboard
# Monitors user registrations, matches, messages, and engagement
################################################################################

resource "aws_cloudwatch_dashboard" "business_metrics" {
  dashboard_name = "${local.name_prefix}-business-metrics"

  dashboard_body = jsonencode({
    widgets = [
      # Header
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown   = "# ${var.project_name} Business Metrics Dashboard - ${upper(var.environment)}"
          background = "transparent"
        }
      },

      # User Acquisition Section
      {
        type   = "text"
        x      = 0
        y      = 1
        width  = 24
        height = 1
        properties = {
          markdown   = "## User Acquisition & Growth"
          background = "transparent"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 2
        width  = 6
        height = 6
        properties = {
          title   = "Daily New Registrations"
          region  = local.region
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Sum"
          metrics = [
            ["${var.project_name}/${var.environment}", "user_registrations", { label = "New Users", color = "#2ca02c" }]
          ]
        }
      },
      {
        type   = "metric"
        x      = 6
        y      = 2
        width  = 6
        height = 6
        properties = {
          title   = "Hourly Registrations"
          region  = local.region
          stacked = false
          view    = "timeSeries"
          period  = 3600
          stat    = "Sum"
          metrics = [
            ["${var.project_name}/${var.environment}", "user_registrations", { label = "Registrations/Hour" }]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 2
        width  = 6
        height = 6
        properties = {
          title   = "Email Verifications"
          region  = local.region
          stacked = false
          view    = "timeSeries"
          period  = 3600
          stat    = "Sum"
          metrics = [
            ["${var.project_name}/${var.environment}", "email_verifications", { label = "Verified", color = "#1f77b4" }],
            [".", "email_verification_failed", { label = "Failed", color = "#ff0000" }]
          ]
        }
      },
      {
        type   = "metric"
        x      = 18
        y      = 2
        width  = 6
        height = 6
        properties = {
          title   = "Profile Completions"
          region  = local.region
          stacked = false
          view    = "timeSeries"
          period  = 3600
          stat    = "Sum"
          metrics = [
            ["${var.project_name}/${var.environment}", "profile_completions", { label = "Completed Profiles" }]
          ]
        }
      },

      # Matching Section
      {
        type   = "text"
        x      = 0
        y      = 8
        width  = 24
        height = 1
        properties = {
          markdown   = "## Matching & Engagement"
          background = "transparent"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 9
        width  = 6
        height = 6
        properties = {
          title   = "Swipes"
          region  = local.region
          stacked = true
          view    = "timeSeries"
          period  = 3600
          stat    = "Sum"
          metrics = [
            ["${var.project_name}/${var.environment}", "swipe_right", { label = "Right (Like)", color = "#2ca02c" }],
            [".", "swipe_left", { label = "Left (Pass)", color = "#d62728" }],
            [".", "super_like", { label = "Super Like", color = "#1f77b4" }]
          ]
        }
      },
      {
        type   = "metric"
        x      = 6
        y      = 9
        width  = 6
        height = 6
        properties = {
          title   = "Matches Created"
          region  = local.region
          stacked = false
          view    = "timeSeries"
          period  = 3600
          stat    = "Sum"
          metrics = [
            ["${var.project_name}/${var.environment}", "matches_created", { label = "New Matches", color = "#ff69b4" }]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 9
        width  = 6
        height = 6
        properties = {
          title   = "Match Rate"
          region  = local.region
          stacked = false
          view    = "timeSeries"
          period  = 3600
          metrics = [
            [{
              expression = "m1/(m2+0.0001)*100"
              label      = "Match Rate %"
              id         = "e1"
              color      = "#9467bd"
            }],
            ["${var.project_name}/${var.environment}", "matches_created", { id = "m1", visible = false }],
            [".", "swipe_right", { id = "m2", visible = false }]
          ]
          yAxis = {
            left = {
              min   = 0
              max   = 100
              label = "Percent"
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 18
        y      = 9
        width  = 6
        height = 6
        properties = {
          title   = "Daily Active Users"
          region  = local.region
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["${var.project_name}/${var.environment}", "daily_active_users", { label = "DAU", color = "#17becf" }]
          ]
        }
      },

      # Messaging Section
      {
        type   = "text"
        x      = 0
        y      = 15
        width  = 24
        height = 1
        properties = {
          markdown   = "## Messaging Activity"
          background = "transparent"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 16
        width  = 6
        height = 6
        properties = {
          title   = "Messages Sent"
          region  = local.region
          stacked = false
          view    = "timeSeries"
          period  = 3600
          stat    = "Sum"
          metrics = [
            ["${var.project_name}/${var.environment}", "messages_sent", { label = "Messages/Hour", color = "#1f77b4" }]
          ]
        }
      },
      {
        type   = "metric"
        x      = 6
        y      = 16
        width  = 6
        height = 6
        properties = {
          title   = "Conversations Started"
          region  = local.region
          stacked = false
          view    = "timeSeries"
          period  = 3600
          stat    = "Sum"
          metrics = [
            ["${var.project_name}/${var.environment}", "conversations_started", { label = "New Conversations" }]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 16
        width  = 6
        height = 6
        properties = {
          title   = "Response Rate"
          region  = local.region
          stacked = false
          view    = "timeSeries"
          period  = 3600
          metrics = [
            [{
              expression = "m1/(m2+0.0001)*100"
              label      = "Response Rate %"
              id         = "e1"
              color      = "#2ca02c"
            }],
            ["${var.project_name}/${var.environment}", "message_replies", { id = "m1", visible = false }],
            [".", "first_messages_sent", { id = "m2", visible = false }]
          ]
          yAxis = {
            left = {
              min   = 0
              max   = 100
              label = "Percent"
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 18
        y      = 16
        width  = 6
        height = 6
        properties = {
          title   = "Video Calls"
          region  = local.region
          stacked = false
          view    = "timeSeries"
          period  = 3600
          stat    = "Sum"
          metrics = [
            ["${var.project_name}/${var.environment}", "video_calls_initiated", { label = "Initiated", color = "#1f77b4" }],
            [".", "video_calls_completed", { label = "Completed", color = "#2ca02c" }],
            [".", "video_calls_missed", { label = "Missed", color = "#ff9900" }]
          ]
        }
      },

      # Premium & Subscription Section
      {
        type   = "text"
        x      = 0
        y      = 22
        width  = 24
        height = 1
        properties = {
          markdown   = "## Premium & Subscriptions"
          background = "transparent"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 23
        width  = 6
        height = 6
        properties = {
          title   = "New Subscriptions"
          region  = local.region
          stacked = true
          view    = "timeSeries"
          period  = 86400
          stat    = "Sum"
          metrics = [
            ["${var.project_name}/${var.environment}", "subscription_plus", { label = "Plus", color = "#1f77b4" }],
            [".", "subscription_gold", { label = "Gold", color = "#ffd700" }],
            [".", "subscription_platinum", { label = "Platinum", color = "#e5e4e2" }]
          ]
        }
      },
      {
        type   = "metric"
        x      = 6
        y      = 23
        width  = 6
        height = 6
        properties = {
          title   = "Subscription Cancellations"
          region  = local.region
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Sum"
          metrics = [
            ["${var.project_name}/${var.environment}", "subscription_cancelled", { label = "Cancellations", color = "#d62728" }]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 23
        width  = 6
        height = 6
        properties = {
          title   = "Boost Purchases"
          region  = local.region
          stacked = false
          view    = "timeSeries"
          period  = 3600
          stat    = "Sum"
          metrics = [
            ["${var.project_name}/${var.environment}", "boost_purchased", { label = "Boosts", color = "#9467bd" }]
          ]
        }
      },
      {
        type   = "metric"
        x      = 18
        y      = 23
        width  = 6
        height = 6
        properties = {
          title   = "Conversion Rate"
          region  = local.region
          stacked = false
          view    = "timeSeries"
          period  = 86400
          metrics = [
            [{
              expression = "(m1+m2+m3)/(m4+0.0001)*100"
              label      = "Free to Paid %"
              id         = "e1"
              color      = "#2ca02c"
            }],
            ["${var.project_name}/${var.environment}", "subscription_plus", { id = "m1", visible = false }],
            [".", "subscription_gold", { id = "m2", visible = false }],
            [".", "subscription_platinum", { id = "m3", visible = false }],
            [".", "user_registrations", { id = "m4", visible = false }]
          ]
          yAxis = {
            left = {
              min   = 0
              max   = 20
              label = "Percent"
            }
          }
        }
      },

      # User Retention Section
      {
        type   = "text"
        x      = 0
        y      = 29
        width  = 24
        height = 1
        properties = {
          markdown   = "## User Retention & Churn"
          background = "transparent"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 30
        width  = 8
        height = 6
        properties = {
          title   = "User Sessions"
          region  = local.region
          stacked = false
          view    = "timeSeries"
          period  = 3600
          stat    = "Sum"
          metrics = [
            ["${var.project_name}/${var.environment}", "user_sessions", { label = "Sessions/Hour" }]
          ]
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 30
        width  = 8
        height = 6
        properties = {
          title   = "Avg Session Duration"
          region  = local.region
          stacked = false
          view    = "timeSeries"
          period  = 3600
          stat    = "Average"
          metrics = [
            ["${var.project_name}/${var.environment}", "session_duration_seconds", { label = "Duration (s)" }]
          ]
          yAxis = {
            left = {
              label = "Seconds"
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 30
        width  = 8
        height = 6
        properties = {
          title   = "Account Deletions"
          region  = local.region
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Sum"
          metrics = [
            ["${var.project_name}/${var.environment}", "account_deletions", { label = "Deletions", color = "#d62728" }],
            [".", "account_deactivations", { label = "Deactivations", color = "#ff9900" }]
          ]
        }
      }
    ]
  })
}

################################################################################
# Cost Dashboard
# Monitors daily and monthly AWS spending by service
################################################################################

resource "aws_cloudwatch_dashboard" "cost" {
  dashboard_name = "${local.name_prefix}-cost"

  dashboard_body = jsonencode({
    widgets = [
      # Header
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown   = "# ${var.project_name} Cost Dashboard - ${upper(var.environment)}"
          background = "transparent"
        }
      },

      # Overview Section
      {
        type   = "text"
        x      = 0
        y      = 1
        width  = 24
        height = 1
        properties = {
          markdown   = "## Cost Overview"
          background = "transparent"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 2
        width  = 8
        height = 6
        properties = {
          title   = "Daily Estimated Charges"
          region  = "us-east-1"
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "Currency", "USD", { label = "Total Daily Cost" }]
          ]
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 2
        width  = 8
        height = 6
        properties = {
          title   = "Month-to-Date Spend"
          region  = "us-east-1"
          stacked = false
          view    = "singleValue"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "Currency", "USD", { label = "MTD Spend" }]
          ]
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 2
        width  = 8
        height = 6
        properties = {
          title   = "Daily Cost Trend"
          region  = "us-east-1"
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            [{
              expression = "DIFF(m1)"
              label      = "Daily Delta"
              id         = "e1"
            }],
            ["AWS/Billing", "EstimatedCharges", "Currency", "USD", { id = "m1", visible = false }]
          ]
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },

      # Compute Costs Section
      {
        type   = "text"
        x      = 0
        y      = 8
        width  = 24
        height = 1
        properties = {
          markdown   = "## Compute Services"
          background = "transparent"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 9
        width  = 8
        height = 6
        properties = {
          title   = "EKS/EC2 Costs"
          region  = "us-east-1"
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonEKS", "Currency", "USD", { label = "EKS" }],
            ["...", "AmazonEC2", ".", ".", { label = "EC2" }]
          ]
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 9
        width  = 8
        height = 6
        properties = {
          title   = "Lambda Costs"
          region  = "us-east-1"
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AWSLambda", "Currency", "USD", { label = "Lambda" }]
          ]
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 9
        width  = 8
        height = 6
        properties = {
          title   = "Fargate Costs"
          region  = "us-east-1"
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonECS", "Currency", "USD", { label = "Fargate/ECS" }]
          ]
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },

      # Database Costs Section
      {
        type   = "text"
        x      = 0
        y      = 15
        width  = 24
        height = 1
        properties = {
          markdown   = "## Database Services"
          background = "transparent"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 16
        width  = 8
        height = 6
        properties = {
          title   = "RDS Costs"
          region  = "us-east-1"
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonRDS", "Currency", "USD", { label = "RDS" }]
          ]
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 16
        width  = 8
        height = 6
        properties = {
          title   = "ElastiCache Costs"
          region  = "us-east-1"
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonElastiCache", "Currency", "USD", { label = "ElastiCache" }]
          ]
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 16
        width  = 8
        height = 6
        properties = {
          title   = "DynamoDB Costs"
          region  = "us-east-1"
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonDynamoDB", "Currency", "USD", { label = "DynamoDB" }]
          ]
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },

      # Storage & Networking Section
      {
        type   = "text"
        x      = 0
        y      = 22
        width  = 24
        height = 1
        properties = {
          markdown   = "## Storage & Networking"
          background = "transparent"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 23
        width  = 6
        height = 6
        properties = {
          title   = "S3 Costs"
          region  = "us-east-1"
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonS3", "Currency", "USD", { label = "S3" }]
          ]
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 6
        y      = 23
        width  = 6
        height = 6
        properties = {
          title   = "CloudFront Costs"
          region  = "us-east-1"
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonCloudFront", "Currency", "USD", { label = "CloudFront" }]
          ]
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 23
        width  = 6
        height = 6
        properties = {
          title   = "Data Transfer Costs"
          region  = "us-east-1"
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AWSDataTransfer", "Currency", "USD", { label = "Data Transfer" }]
          ]
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 18
        y      = 23
        width  = 6
        height = 6
        properties = {
          title   = "VPC/NAT Costs"
          region  = "us-east-1"
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonVPC", "Currency", "USD", { label = "VPC" }]
          ]
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },

      # Additional Services Section
      {
        type   = "text"
        x      = 0
        y      = 29
        width  = 24
        height = 1
        properties = {
          markdown   = "## Additional Services"
          background = "transparent"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 30
        width  = 6
        height = 6
        properties = {
          title   = "Cognito Costs"
          region  = "us-east-1"
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonCognito", "Currency", "USD", { label = "Cognito" }]
          ]
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 6
        y      = 30
        width  = 6
        height = 6
        properties = {
          title   = "SES/SNS Costs"
          region  = "us-east-1"
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonSES", "Currency", "USD", { label = "SES" }],
            ["...", "AmazonSNS", ".", ".", { label = "SNS" }]
          ]
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 30
        width  = 6
        height = 6
        properties = {
          title   = "CloudWatch Costs"
          region  = "us-east-1"
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonCloudWatch", "Currency", "USD", { label = "CloudWatch" }]
          ]
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 18
        y      = 30
        width  = 6
        height = 6
        properties = {
          title   = "Secrets Manager/KMS Costs"
          region  = "us-east-1"
          stacked = false
          view    = "timeSeries"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AWSSecretsManager", "Currency", "USD", { label = "Secrets Manager" }],
            ["...", "AWSKMS", ".", ".", { label = "KMS" }]
          ]
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },

      # Cost Breakdown Pie Chart
      {
        type   = "text"
        x      = 0
        y      = 36
        width  = 24
        height = 1
        properties = {
          markdown   = "## Service Cost Breakdown"
          background = "transparent"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 37
        width  = 12
        height = 8
        properties = {
          title   = "Top Services by Cost"
          region  = "us-east-1"
          stacked = true
          view    = "timeSeries"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonEC2", "Currency", "USD", { label = "EC2" }],
            ["...", "AmazonRDS", ".", ".", { label = "RDS" }],
            ["...", "AmazonEKS", ".", ".", { label = "EKS" }],
            ["...", "AmazonS3", ".", ".", { label = "S3" }],
            ["...", "AmazonElastiCache", ".", ".", { label = "ElastiCache" }],
            ["...", "AmazonCloudFront", ".", ".", { label = "CloudFront" }],
            ["...", "AWSDataTransfer", ".", ".", { label = "Data Transfer" }],
            ["...", "AWSLambda", ".", ".", { label = "Lambda" }]
          ]
          yAxis = {
            left = {
              label = "USD"
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 37
        width  = 12
        height = 8
        properties = {
          title   = "Cost Summary (Single Values)"
          region  = "us-east-1"
          stacked = false
          view    = "bar"
          period  = 86400
          stat    = "Maximum"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "ServiceName", "AmazonEC2", "Currency", "USD", { label = "EC2" }],
            ["...", "AmazonRDS", ".", ".", { label = "RDS" }],
            ["...", "AmazonEKS", ".", ".", { label = "EKS" }],
            ["...", "AmazonS3", ".", ".", { label = "S3" }],
            ["...", "AmazonElastiCache", ".", ".", { label = "ElastiCache" }],
            ["...", "AmazonCloudFront", ".", ".", { label = "CloudFront" }]
          ]
        }
      }
    ]
  })
}
