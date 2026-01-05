################################################################################
# Security Hub Module
# AWS-native security posture management and compliance monitoring
# Aggregates security findings and provides security standards compliance
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
data "aws_partition" "current" {}

################################################################################
# Security Hub
################################################################################

resource "aws_securityhub_account" "main" {
  count = var.enable_security_hub ? 1 : 0

  enable_default_standards  = var.enable_default_standards
  control_finding_generator = var.control_finding_generator
  auto_enable_controls      = var.auto_enable_controls
}

################################################################################
# AWS Foundational Security Best Practices Standard
################################################################################

resource "aws_securityhub_standards_subscription" "aws_foundational" {
  count = var.enable_security_hub && var.enable_aws_foundational_standard ? 1 : 0

  standards_arn = "arn:${data.aws_partition.current.partition}:securityhub:${data.aws_region.current.name}::standards/aws-foundational-security-best-practices/v/1.0.0"

  depends_on = [aws_securityhub_account.main]
}

################################################################################
# CIS AWS Foundations Benchmark
################################################################################

resource "aws_securityhub_standards_subscription" "cis_benchmark" {
  count = var.enable_security_hub && var.enable_cis_benchmark ? 1 : 0

  standards_arn = "arn:${data.aws_partition.current.partition}:securityhub:::ruleset/cis-aws-foundations-benchmark/v/${var.cis_benchmark_version}"

  depends_on = [aws_securityhub_account.main]
}

################################################################################
# CIS AWS Foundations Benchmark v1.4.0
################################################################################

resource "aws_securityhub_standards_subscription" "cis_benchmark_v14" {
  count = var.enable_security_hub && var.enable_cis_benchmark_v14 ? 1 : 0

  standards_arn = "arn:${data.aws_partition.current.partition}:securityhub:${data.aws_region.current.name}::standards/cis-aws-foundations-benchmark/v/1.4.0"

  depends_on = [aws_securityhub_account.main]
}

################################################################################
# PCI DSS Standard
################################################################################

resource "aws_securityhub_standards_subscription" "pci_dss" {
  count = var.enable_security_hub && var.enable_pci_dss_standard ? 1 : 0

  standards_arn = "arn:${data.aws_partition.current.partition}:securityhub:${data.aws_region.current.name}::standards/pci-dss/v/3.2.1"

  depends_on = [aws_securityhub_account.main]
}

################################################################################
# NIST 800-53 Standard
################################################################################

resource "aws_securityhub_standards_subscription" "nist" {
  count = var.enable_security_hub && var.enable_nist_standard ? 1 : 0

  standards_arn = "arn:${data.aws_partition.current.partition}:securityhub:${data.aws_region.current.name}::standards/nist-800-53/v/5.0.0"

  depends_on = [aws_securityhub_account.main]
}

################################################################################
# Disable Specific Controls (for known acceptable deviations)
################################################################################

resource "aws_securityhub_standards_control" "disabled_controls" {
  for_each = var.enable_security_hub ? var.disabled_controls : {}

  standards_control_arn = each.value.control_arn
  control_status        = "DISABLED"
  disabled_reason       = each.value.reason

  depends_on = [
    aws_securityhub_standards_subscription.aws_foundational,
    aws_securityhub_standards_subscription.cis_benchmark,
    aws_securityhub_standards_subscription.cis_benchmark_v14,
    aws_securityhub_standards_subscription.pci_dss,
    aws_securityhub_standards_subscription.nist
  ]
}

################################################################################
# Security Hub Product Integrations
################################################################################

resource "aws_securityhub_product_subscription" "guardduty" {
  count = var.enable_security_hub && var.enable_guardduty_integration ? 1 : 0

  product_arn = "arn:${data.aws_partition.current.partition}:securityhub:${data.aws_region.current.name}::product/aws/guardduty"

  depends_on = [aws_securityhub_account.main]
}

resource "aws_securityhub_product_subscription" "inspector" {
  count = var.enable_security_hub && var.enable_inspector_integration ? 1 : 0

  product_arn = "arn:${data.aws_partition.current.partition}:securityhub:${data.aws_region.current.name}::product/aws/inspector"

  depends_on = [aws_securityhub_account.main]
}

resource "aws_securityhub_product_subscription" "macie" {
  count = var.enable_security_hub && var.enable_macie_integration ? 1 : 0

  product_arn = "arn:${data.aws_partition.current.partition}:securityhub:${data.aws_region.current.name}::product/aws/macie"

  depends_on = [aws_securityhub_account.main]
}

resource "aws_securityhub_product_subscription" "access_analyzer" {
  count = var.enable_security_hub && var.enable_access_analyzer_integration ? 1 : 0

  product_arn = "arn:${data.aws_partition.current.partition}:securityhub:${data.aws_region.current.name}::product/aws/access-analyzer"

  depends_on = [aws_securityhub_account.main]
}

resource "aws_securityhub_product_subscription" "config" {
  count = var.enable_security_hub && var.enable_config_integration ? 1 : 0

  product_arn = "arn:${data.aws_partition.current.partition}:securityhub:${data.aws_region.current.name}::product/aws/config"

  depends_on = [aws_securityhub_account.main]
}

resource "aws_securityhub_product_subscription" "firewall_manager" {
  count = var.enable_security_hub && var.enable_firewall_manager_integration ? 1 : 0

  product_arn = "arn:${data.aws_partition.current.partition}:securityhub:${data.aws_region.current.name}::product/aws/firewall-manager"

  depends_on = [aws_securityhub_account.main]
}

resource "aws_securityhub_product_subscription" "health" {
  count = var.enable_security_hub && var.enable_health_integration ? 1 : 0

  product_arn = "arn:${data.aws_partition.current.partition}:securityhub:${data.aws_region.current.name}::product/aws/health"

  depends_on = [aws_securityhub_account.main]
}

################################################################################
# Security Hub Insights (Custom Security Views)
################################################################################

resource "aws_securityhub_insight" "main" {
  for_each = var.enable_security_hub ? var.insights : {}

  name = "${var.project_name}-${var.environment}-${each.key}"

  filters {
    dynamic "aws_account_id" {
      for_each = lookup(each.value.filters, "aws_account_id", null) != null ? [each.value.filters.aws_account_id] : []
      content {
        comparison = aws_account_id.value.comparison
        value      = aws_account_id.value.value
      }
    }

    dynamic "severity_label" {
      for_each = lookup(each.value.filters, "severity_label", null) != null ? each.value.filters.severity_label : []
      content {
        comparison = severity_label.value.comparison
        value      = severity_label.value.value
      }
    }

    dynamic "workflow_status" {
      for_each = lookup(each.value.filters, "workflow_status", null) != null ? each.value.filters.workflow_status : []
      content {
        comparison = workflow_status.value.comparison
        value      = workflow_status.value.value
      }
    }

    dynamic "record_state" {
      for_each = lookup(each.value.filters, "record_state", null) != null ? each.value.filters.record_state : []
      content {
        comparison = record_state.value.comparison
        value      = record_state.value.value
      }
    }

    dynamic "resource_type" {
      for_each = lookup(each.value.filters, "resource_type", null) != null ? each.value.filters.resource_type : []
      content {
        comparison = resource_type.value.comparison
        value      = resource_type.value.value
      }
    }

    dynamic "type" {
      for_each = lookup(each.value.filters, "type", null) != null ? each.value.filters.type : []
      content {
        comparison = type.value.comparison
        value      = type.value.value
      }
    }

    dynamic "product_name" {
      for_each = lookup(each.value.filters, "product_name", null) != null ? each.value.filters.product_name : []
      content {
        comparison = product_name.value.comparison
        value      = product_name.value.value
      }
    }
  }

  group_by_attribute = each.value.group_by_attribute

  depends_on = [aws_securityhub_account.main]
}

################################################################################
# Security Hub Automation Rules
################################################################################

resource "aws_securityhub_automation_rule" "main" {
  for_each = var.enable_security_hub ? var.automation_rules : {}

  rule_name   = "${var.project_name}-${var.environment}-${each.key}"
  description = each.value.description
  rule_order  = each.value.rule_order
  is_terminal = each.value.is_terminal
  rule_status = each.value.enabled ? "ENABLED" : "DISABLED"

  criteria {
    dynamic "severity_label" {
      for_each = lookup(each.value.criteria, "severity_label", null) != null ? each.value.criteria.severity_label : []
      content {
        comparison = severity_label.value.comparison
        value      = severity_label.value.value
      }
    }

    dynamic "product_name" {
      for_each = lookup(each.value.criteria, "product_name", null) != null ? each.value.criteria.product_name : []
      content {
        comparison = product_name.value.comparison
        value      = product_name.value.value
      }
    }

    dynamic "resource_type" {
      for_each = lookup(each.value.criteria, "resource_type", null) != null ? each.value.criteria.resource_type : []
      content {
        comparison = resource_type.value.comparison
        value      = resource_type.value.value
      }
    }
  }

  actions {
    finding_fields_update {
      severity {
        label   = lookup(each.value.actions, "severity_label", null)
        product = lookup(each.value.actions, "severity_product", null)
      }
      workflow {
        status = lookup(each.value.actions, "workflow_status", null)
      }
      note {
        text       = lookup(each.value.actions, "note_text", null)
        updated_by = lookup(each.value.actions, "note_updated_by", "automation")
      }
    }
  }

  depends_on = [aws_securityhub_account.main]
}

################################################################################
# CloudWatch Event Rule for Critical Findings
################################################################################

resource "aws_cloudwatch_event_rule" "security_hub_findings" {
  count = var.enable_security_hub && var.create_finding_alerts ? 1 : 0

  name        = "${var.project_name}-${var.environment}-security-hub-findings"
  description = "Capture Security Hub findings with CRITICAL or HIGH severity"

  event_pattern = jsonencode({
    source      = ["aws.securityhub"]
    detail-type = ["Security Hub Findings - Imported"]
    detail = {
      findings = {
        Severity = {
          Label = var.alert_severity_labels
        }
        Workflow = {
          Status = ["NEW"]
        }
      }
    }
  })

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "security_hub_sns" {
  count = var.enable_security_hub && var.create_finding_alerts && var.alert_sns_topic_arn != null ? 1 : 0

  rule      = aws_cloudwatch_event_rule.security_hub_findings[0].name
  target_id = "SecurityHubFindingsToSNS"
  arn       = var.alert_sns_topic_arn

  input_transformer {
    input_paths = {
      severity    = "$.detail.findings[0].Severity.Label"
      title       = "$.detail.findings[0].Title"
      description = "$.detail.findings[0].Description"
      resource    = "$.detail.findings[0].Resources[0].Id"
      standard    = "$.detail.findings[0].ProductFields.StandardsArn"
      account     = "$.account"
      region      = "$.region"
    }
    input_template = <<EOF
{
  "source": "Security Hub",
  "severity": "<severity>",
  "title": "<title>",
  "description": "<description>",
  "resource": "<resource>",
  "standard": "<standard>",
  "account": "<account>",
  "region": "<region>",
  "environment": "${var.environment}"
}
EOF
  }
}

################################################################################
# Organization Configuration (for multi-account setups)
################################################################################

resource "aws_securityhub_organization_admin_account" "main" {
  count = var.enable_organization_admin ? 1 : 0

  admin_account_id = var.delegated_admin_account_id != null ? var.delegated_admin_account_id : data.aws_caller_identity.current.account_id

  depends_on = [aws_securityhub_account.main]
}

resource "aws_securityhub_organization_configuration" "main" {
  count = var.enable_organization_admin ? 1 : 0

  auto_enable           = var.auto_enable_organization_members
  auto_enable_standards = var.auto_enable_standards

  organization_configuration {
    configuration_type = var.organization_configuration_type
  }

  depends_on = [aws_securityhub_organization_admin_account.main]
}

################################################################################
# Finding Aggregator (for cross-region aggregation)
################################################################################

resource "aws_securityhub_finding_aggregator" "main" {
  count = var.enable_security_hub && var.enable_finding_aggregator ? 1 : 0

  linking_mode = var.finding_aggregator_linking_mode

  dynamic "specified_regions" {
    for_each = var.finding_aggregator_linking_mode == "SPECIFIED_REGIONS" ? [1] : []
    content {
      # Regions to aggregate from - not directly supported, handled via linking_mode
    }
  }

  depends_on = [aws_securityhub_account.main]
}

################################################################################
# Action Targets (for custom actions in console)
################################################################################

resource "aws_securityhub_action_target" "main" {
  for_each = var.enable_security_hub ? var.action_targets : {}

  name        = each.key
  identifier  = each.value.identifier
  description = each.value.description

  depends_on = [aws_securityhub_account.main]
}
