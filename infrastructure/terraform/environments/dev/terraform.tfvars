# Development Environment Variables

aws_region = "us-east-1"

# Network Configuration
vpc_cidr           = "10.1.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]
enable_nat_gateway = false # Save costs in dev

# EKS Configuration
kubernetes_version = "1.28"
instance_types     = ["t3.medium"]
capacity_type      = "SPOT" # Use spot instances to save costs
desired_capacity   = 2
min_capacity       = 1
max_capacity       = 4
disk_size          = 50

# RDS Configuration
db_instance_class          = "db.t3.small"
db_allocated_storage       = 20
db_backup_retention_period = 7
db_multi_az                = false

# Redis Configuration
redis_node_type       = "cache.t3.micro"
redis_num_cache_nodes = 1

# Other Settings
enable_flow_logs = false
