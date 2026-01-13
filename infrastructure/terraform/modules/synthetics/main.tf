################################################################################
# CloudWatch Synthetics Module for Browser Verification
# Automated canary tests for public pages (Support, Privacy, Terms)
################################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
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

  common_tags = merge(var.tags, {
    Module      = "synthetics"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  })

  # Default pages to monitor
  default_pages = [
    {
      name = "home"
      url  = "https://${var.domain}"
      path = "/"
    },
    {
      name = "support"
      url  = "https://${var.domain}/support"
      path = "/support"
    },
    {
      name = "privacy"
      url  = "https://${var.domain}/privacy"
      path = "/privacy"
    },
    {
      name = "terms"
      url  = "https://${var.domain}/terms"
      path = "/terms"
    }
  ]

  pages_to_monitor = length(var.custom_pages) > 0 ? var.custom_pages : local.default_pages
}

################################################################################
# S3 Bucket for Canary Artifacts
################################################################################

resource "aws_s3_bucket" "synthetics" {
  bucket = "${local.name_prefix}-synthetics-artifacts"

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-synthetics-artifacts"
    Purpose = "CloudWatch Synthetics canary artifacts"
  })
}

resource "aws_s3_bucket_versioning" "synthetics" {
  bucket = aws_s3_bucket.synthetics.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "synthetics" {
  bucket = aws_s3_bucket.synthetics.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.kms_key_arn != null ? "aws:kms" : "AES256"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = var.kms_key_arn != null
  }
}

resource "aws_s3_bucket_public_access_block" "synthetics" {
  bucket = aws_s3_bucket.synthetics.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "synthetics" {
  bucket = aws_s3_bucket.synthetics.id

  rule {
    id     = "cleanup-old-artifacts"
    status = "Enabled"

    filter {
      prefix = ""
    }

    expiration {
      days = var.artifact_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

################################################################################
# IAM Role for Synthetics Canaries
################################################################################

resource "aws_iam_role" "synthetics" {
  name = "${local.name_prefix}-synthetics-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-synthetics-role"
  })
}

resource "aws_iam_role_policy_attachment" "synthetics_execution" {
  role       = aws_iam_role.synthetics.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "synthetics_s3" {
  name = "${local.name_prefix}-synthetics-s3"
  role = aws_iam_role.synthetics.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:GetBucketLocation"
        ]
        Resource = [
          aws_s3_bucket.synthetics.arn,
          "${aws_s3_bucket.synthetics.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:CreateLogGroup"
        ]
        Resource = [
          "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/cwsyn-*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListAllMyBuckets"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "cloudwatch:namespace" = "CloudWatchSynthetics"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments"
        ]
        Resource = "*"
      }
    ]
  })
}

################################################################################
# Canary Script (Inline)
################################################################################

locals {
  canary_script = <<-EOF
const { URL } = require('url');
const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const PAGES = ${jsonencode([for p in local.pages_to_monitor : { name = p.name, url = p.url }])};

const recordDomMetrics = async (page, pageName) => {
  // Record page load time
  const performanceMetrics = await page.evaluate(() => {
    const timing = performance.timing;
    return {
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      loadComplete: timing.loadEventEnd - timing.navigationStart,
    };
  });

  log.info('Performance metrics for ' + pageName + ':', performanceMetrics);
  return performanceMetrics;
};

exports.handler = async () => {
  const page = await synthetics.getPage();

  // Configure viewport
  await page.setViewport({ width: 1920, height: 1080 });

  for (const pageConfig of PAGES) {
    log.info('Checking page: ' + pageConfig.name + ' at ' + pageConfig.url);

    try {
      const response = await page.goto(pageConfig.url, {
        waitUntil: ['load', 'networkidle0'],
        timeout: 30000
      });

      // Check HTTP status
      const status = response.status();
      if (status < 200 || status >= 400) {
        throw new Error(pageConfig.name + ' returned HTTP ' + status);
      }
      log.info(pageConfig.name + ' HTTP status: ' + status);

      // Check page title exists
      const title = await page.title();
      if (!title || title.length === 0) {
        throw new Error(pageConfig.name + ' has no title');
      }
      log.info(pageConfig.name + ' title: ' + title);

      // Record metrics
      await recordDomMetrics(page, pageConfig.name);

      // Take screenshot
      await synthetics.takeScreenshot(pageConfig.name, 'loaded');

      // Check for JS errors
      page.on('pageerror', error => {
        log.error('JS error on ' + pageConfig.name + ': ' + error.message);
      });

      log.info(pageConfig.name + ': PASSED');
    } catch (error) {
      log.error(pageConfig.name + ' FAILED: ' + error.message);
      await synthetics.takeScreenshot(pageConfig.name, 'failed');
      throw error;
    }
  }

  return 'All pages verified successfully';
};
EOF
}

################################################################################
# S3 Object for Canary Script
################################################################################

resource "aws_s3_object" "canary_script" {
  bucket  = aws_s3_bucket.synthetics.id
  key     = "canary-scripts/nodejs/node_modules/pageLoadBlueprint.js"
  content = local.canary_script

  tags = local.common_tags
}

################################################################################
# CloudWatch Synthetics Canary - Public Pages
################################################################################

resource "aws_synthetics_canary" "public_pages" {
  name                 = "${local.name_prefix}-pages"
  artifact_s3_location = "s3://${aws_s3_bucket.synthetics.id}/canary-artifacts/"
  execution_role_arn   = aws_iam_role.synthetics.arn
  handler              = "pageLoadBlueprint.handler"
  runtime_version      = var.runtime_version
  start_canary         = var.start_canary

  schedule {
    expression = var.schedule_expression
  }

  run_config {
    timeout_in_seconds    = var.timeout_seconds
    memory_in_mb          = var.memory_mb
    active_tracing        = var.enable_xray
  }

  # Use inline script
  zip_file = data.archive_file.canary_code.output_base64sha256 != "" ? data.archive_file.canary_code.output_path : null

  success_retention_period = var.success_retention_days
  failure_retention_period = var.failure_retention_days

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.security_group_ids
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-pages-canary"
    Purpose = "Public page verification"
  })

  depends_on = [
    aws_s3_object.canary_script,
    aws_iam_role_policy.synthetics_s3
  ]
}

################################################################################
# Archive for Canary Code
################################################################################

resource "local_file" "canary_script" {
  content  = local.canary_script
  filename = "${path.module}/canary-code/nodejs/node_modules/pageLoadBlueprint.js"
}

data "archive_file" "canary_code" {
  type        = "zip"
  output_path = "${path.module}/canary-code.zip"
  source_dir  = "${path.module}/canary-code"

  depends_on = [local_file.canary_script]
}

################################################################################
# CloudWatch Alarms for Canary
################################################################################

resource "aws_cloudwatch_metric_alarm" "canary_success_rate" {
  count = var.create_alarms ? 1 : 0

  alarm_name          = "${local.name_prefix}-canary-success-rate"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "SuccessPercent"
  namespace           = "CloudWatchSynthetics"
  period              = 300
  statistic           = "Average"
  threshold           = 100
  alarm_description   = "Canary success rate dropped below 100%"
  treat_missing_data  = "breaching"

  dimensions = {
    CanaryName = aws_synthetics_canary.public_pages.name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "canary_failed" {
  count = var.create_alarms ? 1 : 0

  alarm_name          = "${local.name_prefix}-canary-failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Failed"
  namespace           = "CloudWatchSynthetics"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Canary run failed"
  treat_missing_data  = "notBreaching"

  dimensions = {
    CanaryName = aws_synthetics_canary.public_pages.name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "canary_duration" {
  count = var.create_alarms ? 1 : 0

  alarm_name          = "${local.name_prefix}-canary-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "CloudWatchSynthetics"
  period              = 300
  statistic           = "Average"
  threshold           = var.duration_alarm_threshold_ms
  alarm_description   = "Canary duration exceeded threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    CanaryName = aws_synthetics_canary.public_pages.name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = local.common_tags
}

################################################################################
# API Health Check Canary (Optional)
################################################################################

resource "aws_synthetics_canary" "api_health" {
  count = var.create_api_health_canary ? 1 : 0

  name                 = "${local.name_prefix}-api-health"
  artifact_s3_location = "s3://${aws_s3_bucket.synthetics.id}/api-health/"
  execution_role_arn   = aws_iam_role.synthetics.arn
  handler              = "apiCanaryBlueprint.handler"
  runtime_version      = var.runtime_version
  start_canary         = var.start_canary

  schedule {
    expression = "rate(1 minute)"
  }

  run_config {
    timeout_in_seconds = 60
    memory_in_mb       = 960
    active_tracing     = var.enable_xray
  }

  zip_file = data.archive_file.api_canary_code[0].output_path

  success_retention_period = var.success_retention_days
  failure_retention_period = var.failure_retention_days

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-api-health-canary"
    Purpose = "API health verification"
  })
}

locals {
  api_canary_script = <<-EOF
const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');
const https = require('https');

const API_ENDPOINT = '${var.api_health_endpoint}';

exports.handler = async () => {
  log.info('Checking API health at: ' + API_ENDPOINT);

  return new Promise((resolve, reject) => {
    const req = https.get(API_ENDPOINT, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error('API health check failed with status: ' + res.statusCode));
        return;
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        log.info('API health check passed');
        resolve('API healthy');
      });
    });

    req.on('error', (error) => {
      log.error('API health check error: ' + error.message);
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('API health check timeout'));
    });
  });
};
EOF
}

resource "local_file" "api_canary_script" {
  count = var.create_api_health_canary ? 1 : 0

  content  = local.api_canary_script
  filename = "${path.module}/api-canary-code/nodejs/node_modules/apiCanaryBlueprint.js"
}

data "archive_file" "api_canary_code" {
  count = var.create_api_health_canary ? 1 : 0

  type        = "zip"
  output_path = "${path.module}/api-canary-code.zip"
  source_dir  = "${path.module}/api-canary-code"

  depends_on = [local_file.api_canary_script]
}
