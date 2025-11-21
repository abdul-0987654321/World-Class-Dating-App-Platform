# Staging Environment Variables

aws_region = "us-east-1"

# Network Configuration
vpc_cidr           = "10.2.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
enable_nat_gateway = true

# EKS Configuration
kubernetes_version = "1.28"
instance_types     = ["t3.large", "t3.xlarge"]
capacity_type      = "ON_DEMAND"
desired_capacity   = 3
min_capacity       = 2
max_capacity       = 8
disk_size          = 80

# RDS Configuration
db_instance_class          = "db.r6g.large"
db_allocated_storage       = 50
db_backup_retention_period = 14
db_multi_az                = true

# Redis Configuration
redis_node_type       = "cache.r6g.large"
redis_num_cache_nodes = 2

# Other Settings
enable_flow_logs = true
