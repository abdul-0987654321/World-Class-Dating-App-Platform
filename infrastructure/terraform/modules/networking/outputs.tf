################################################################################
# Networking Module Outputs
################################################################################

output "vpc_id" {
  description = "ID of the VPC"
  value       = local.vpc_id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = var.use_existing_vpc ? var.vpc_cidr : aws_vpc.main[0].cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = local.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = local.private_subnet_ids
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = local.database_subnet_ids
}

output "public_subnet_cidrs" {
  description = "CIDR blocks of the public subnets"
  value       = var.use_existing_vpc ? [] : aws_subnet.public[*].cidr_block
}

output "private_subnet_cidrs" {
  description = "CIDR blocks of the private subnets"
  value       = var.use_existing_vpc ? [] : aws_subnet.private[*].cidr_block
}

output "database_subnet_cidrs" {
  description = "CIDR blocks of the database subnets"
  value       = var.use_existing_vpc ? [] : aws_subnet.database[*].cidr_block
}

output "nat_gateway_ids" {
  description = "IDs of the NAT Gateways"
  value       = var.use_existing_vpc ? [] : aws_nat_gateway.main[*].id
}

output "nat_gateway_public_ips" {
  description = "Public IPs of the NAT Gateways"
  value       = var.use_existing_vpc ? [] : aws_eip.nat[*].public_ip
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = var.use_existing_vpc ? null : aws_internet_gateway.main[0].id
}

output "public_route_table_id" {
  description = "ID of the public route table"
  value       = var.use_existing_vpc ? null : aws_route_table.public[0].id
}

output "private_route_table_ids" {
  description = "IDs of the private route tables"
  value       = var.use_existing_vpc ? [] : aws_route_table.private[*].id
}

output "db_subnet_group_name" {
  description = "Name of the database subnet group"
  value       = var.use_existing_vpc ? null : aws_db_subnet_group.main[0].name
}

output "db_subnet_group_arn" {
  description = "ARN of the database subnet group"
  value       = var.use_existing_vpc ? null : aws_db_subnet_group.main[0].arn
}

output "elasticache_subnet_group_name" {
  description = "Name of the ElastiCache subnet group"
  value       = var.use_existing_vpc ? null : aws_elasticache_subnet_group.main[0].name
}

output "vpc_endpoints_security_group_id" {
  description = "ID of the VPC endpoints security group"
  value       = try(aws_security_group.vpc_endpoints[0].id, null)
}

output "availability_zones" {
  description = "List of availability zones used"
  value       = var.availability_zones
}
