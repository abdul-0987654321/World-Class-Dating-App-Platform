# Flamoral Production - Hibernation Mode
# Set these variables to hibernate the environment
# Run: terraform apply -var-file=hibernation.tfvars

# ECS Services
ecs_web_app_desired_count     = 0
ecs_api_gateway_desired_count = 0
ecs_auth_service_desired_count = 0

# RDS Aurora
rds_aurora_instance_count = 0

# Load Balancer
create_alb = false

# VPC Endpoints
create_vpc_endpoints = false

# CloudFront
cloudfront_enabled = false

# ElastiCache
create_elasticache = false
