# Flamoral Production - Resume from Hibernation
# Run: terraform apply -var-file=resume.tfvars

# ECS Services
ecs_web_app_desired_count     = 2
ecs_api_gateway_desired_count = 2
ecs_auth_service_desired_count = 2

# RDS Aurora
rds_aurora_instance_count = 2

# Load Balancer
create_alb = true

# VPC Endpoints
create_vpc_endpoints = true

# CloudFront
cloudfront_enabled = true

# ElastiCache
create_elasticache = true
