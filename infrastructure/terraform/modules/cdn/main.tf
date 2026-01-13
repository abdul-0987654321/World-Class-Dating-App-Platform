################################################################################
# CDN Module - Wrapper for CloudFront
# Provides a simplified interface for environment configurations
################################################################################

module "cloudfront" {
  source = "../cloudfront"

  project_name = var.project
  environment  = var.environment

  # Domain configuration
  domain_names        = var.domain_name != "" ? ["api.${var.domain_name}"] : []
  acm_certificate_arn = null  # Should be configured separately

  # Origins
  default_origin_id = "alb"
  alb_origins = [
    {
      domain_name = var.alb_dns_name
      origin_id   = "alb"
    }
  ]

  # WAF
  enable_waf = var.environment == "prod"

  # Logging
  enable_logging = var.environment == "prod"

  tags = {
    Module = "cdn-wrapper"
  }
}
