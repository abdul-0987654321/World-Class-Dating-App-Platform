# Infrastructure Design Documentation
## DatingPlatform (Flamoral) - Azure Infrastructure

**Version:** 1.0
**Last Updated:** 2025-12-08
**Managed By:** Terraform
**Azure Subscription:** ebd1613e-fea0-4b6d-8918-7e4de6a71c44

---

## Table of Contents

1. [Overview](#overview)
2. [Azure Resource Naming Conventions](#azure-resource-naming-conventions)
3. [Terraform Module Architecture](#terraform-module-architecture)
4. [Environment Configurations](#environment-configurations)
5. [Network Topology](#network-topology)
6. [Security Groups and Network Rules](#security-groups-and-network-rules)
7. [Key Vault Secrets Management](#key-vault-secrets-management)
8. [Container Registry Setup](#container-registry-setup)
9. [AKS Cluster Configuration](#aks-cluster-configuration)
10. [Storage and Database Configuration](#storage-and-database-configuration)
11. [Monitoring and Observability](#monitoring-and-observability)
12. [State Management](#state-management)
13. [Deployment Workflow](#deployment-workflow)

---

## Overview

The DatingPlatform infrastructure is built on Microsoft Azure using Infrastructure as Code (IaC) principles with Terraform. The infrastructure is organized into reusable modules and deployed across three distinct environments: Development (dev), Test (test), and Production (prod).

### Key Characteristics

- **Multi-Environment**: Separate configurations for dev, test, and production
- **Modular Design**: Reusable Terraform modules for each Azure service
- **Security-First**: Environment-specific security controls with production hardening
- **Cost-Optimized**: SKU tiers matched to environment requirements
- **High Availability**: Production environment includes geo-replication and redundancy
- **Compliance Ready**: Built-in monitoring, auditing, and threat detection

### Primary Regions

- **Primary Region**: West US 2 (`westus2`)
- **Secondary Region**: East US 2 (`eastus2`) - for production geo-replication

---

## Azure Resource Naming Conventions

The infrastructure follows Microsoft's recommended naming conventions with consistent patterns across all resources.

### Naming Pattern Structure

```
{resource_type_prefix}-{project_name}-{environment}-{region/suffix}
```

### Resource Prefixes by Type

| Resource Type | Prefix | Example | Pattern |
|--------------|--------|---------|---------|
| Resource Group | `rg` | `rg-datingplatform-prod-westus2` | `rg-{project}-{env}-{region}` |
| Virtual Network | `vnet` | `vnet-datingplatform-prod-westus2` | `vnet-{project}-{env}-{region}` |
| Subnet | `snet` | `snet-app` | `snet-{purpose}` |
| Network Security Group | `nsg` | `nsg-snet-app` | `nsg-{subnet_name}` |
| Storage Account | `st` | `stdatingplatformprodabcd` | `st{project}{env}{suffix}` (no hyphens) |
| Key Vault | `kv` | `kv-datingplatform-prod-abcd` | `kv-{project}-{env}-{suffix}` |
| Container Registry | `acr` | `acrdatingplatformprodabcd` | `acr{project}{env}{suffix}` (no hyphens) |
| App Service Plan | `asp` | `asp-datingplatform-prod-westus2` | `asp-{project}-{env}-{region}` |
| App Service | `app` | `app-datingplatform-prod` | `app-{project}-{env}` |
| SQL Server | `sql` | `sql-datingplatform-prod-abcd` | `sql-{project}-{env}-{suffix}` |
| SQL Database | `sqldb` | `sqldb-datingplatform-prod` | `sqldb-{project}-{env}` |
| Log Analytics | `log` | `log-datingplatform-prod-westus2` | `log-{project}-{env}-{region}` |
| Application Insights | `appi` | `appi-datingplatform-prod-westus2` | `appi-{project}-{env}-{region}` |

### Naming Rules

1. **Globally Unique Resources**: Storage accounts, Key Vaults, and Container Registries append a random 4-character suffix for global uniqueness
2. **No Hyphens**: Storage accounts and Container Registries cannot contain hyphens
3. **Lowercase Only**: All names use lowercase to avoid case-sensitivity issues
4. **Maximum Length**: Names respect Azure's length limits (e.g., 24 chars for storage accounts)
5. **Region Abbreviations**: Full region names used for clarity (e.g., `westus2` vs `wus2`)

### Tags Applied to All Resources

```hcl
{
  Environment  = "dev|test|prod"
  Project      = "DatingPlatform"
  ManagedBy    = "Terraform"
  CostCenter   = "Engineering"
  Owner        = "DevOps"
  Repository   = "https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform"
}
```

---

## Terraform Module Architecture

The infrastructure is organized into reusable modules located in `terraform/modules/`. Each module encapsulates a specific Azure service with standardized inputs and outputs.

### Module Directory Structure

```
terraform/
├── modules/
│   ├── resource-group/       # Azure Resource Group
│   ├── networking/            # VNet, Subnets, NSGs
│   ├── storage-account/       # Azure Storage Account
│   ├── key-vault/             # Azure Key Vault
│   ├── container-registry/    # Azure Container Registry (ACR)
│   ├── app-service/           # Azure App Service & Plan
│   ├── sql-database/          # Azure SQL Server & Database
│   └── monitoring/            # Log Analytics & Application Insights
├── environments/
│   ├── dev/                   # Development environment
│   ├── test/                  # Test environment
│   └── prod/                  # Production environment
└── shared/
    ├── locals.tf              # Shared local values and configurations
    ├── provider.tf            # Azure provider configuration
    └── versions.tf            # Terraform and provider version constraints
```

### Module Descriptions

#### 1. Resource Group Module
**Location**: `terraform/modules/resource-group/`

Creates an Azure Resource Group with lifecycle management and standardized tagging.

**Features**:
- Environment validation (dev, test, prod)
- Automatic environment and managed-by tags
- Lifecycle management with configurable prevent_destroy

**Key Resources**:
- `azurerm_resource_group`

---

#### 2. Networking Module
**Location**: `terraform/modules/networking/`

Creates Virtual Network infrastructure with multiple subnets and Network Security Groups.

**Features**:
- Virtual Network with configurable address space
- Multiple subnets with individual CIDR blocks
- Network Security Group for each subnet
- Automatic NSG-subnet associations
- Support for subnet delegations (App Service, Container Instances)

**Key Resources**:
- `azurerm_virtual_network`
- `azurerm_subnet` (multiple)
- `azurerm_network_security_group` (per subnet)
- `azurerm_subnet_network_security_group_association`

**Subnet Architecture**:
- **App Subnet** (`snet-app`): Delegated to App Service
- **Database Subnet** (`snet-db`): For database private endpoints
- **Cache Subnet** (`snet-cache`): For Redis cache
- **Management Subnet** (`snet-mgmt`): For administrative resources
- **Private Endpoints Subnet** (`snet-private-endpoints`): Production only

---

#### 3. Storage Account Module
**Location**: `terraform/modules/storage-account/`

Creates Azure Storage Account with blob versioning, soft delete, and security best practices.

**Features**:
- Blob versioning enabled
- Soft delete with configurable retention (7-30 days)
- HTTPS-only traffic enforcement
- TLS 1.2 minimum version
- Public blob access disabled
- Environment-specific replication (LRS, GRS, RAGRS)

**Key Resources**:
- `azurerm_storage_account`

**Security Configurations**:
- `enable_https_traffic_only = true`
- `min_tls_version = "TLS1_2"`
- `allow_nested_items_to_be_public = false`

---

#### 4. Key Vault Module
**Location**: `terraform/modules/key-vault/`

Creates Azure Key Vault with soft delete, optional purge protection, and network rules.

**Features**:
- Soft delete with 90-day retention period
- Optional purge protection (enabled for production)
- Network ACLs with environment-specific defaults
- Enabled for deployment, disk encryption, and template deployment
- Azure Services bypass for network ACLs

**Key Resources**:
- `azurerm_key_vault`

**Network Security**:
- **Dev/Test**: Default action = "Allow" (open access for development)
- **Production**: Default action = "Deny" (restricted access)

**SKU Tiers**:
- **Dev/Test**: Standard
- **Production**: Premium (HSM-backed keys)

---

#### 5. Container Registry Module
**Location**: `terraform/modules/container-registry/`

Creates Azure Container Registry with environment-specific configurations and content trust.

**Features**:
- Environment-specific SKU support (Basic, Standard, Premium)
- Content trust enabled for production
- Retention policies (30 days prod, 7 days dev/test)
- Optional admin user access
- Geo-replication support (Premium SKU)

**Key Resources**:
- `azurerm_container_registry`

**SKU Capabilities**:
- **Basic**: Single region, no replication
- **Standard**: Webhooks support
- **Premium**: Geo-replication, content trust, private endpoints

---

#### 6. App Service Module
**Location**: `terraform/modules/app-service/`

Creates Azure App Service with Linux-based container support and managed identity.

**Features**:
- Linux-based App Service with Docker support
- System-assigned managed identity
- Always-on enabled for production
- HTTPS-only enforcement
- HTTP/2 enabled
- TLS 1.2 minimum version
- FTPS disabled for security
- Configurable app settings

**Key Resources**:
- `azurerm_service_plan`
- `azurerm_linux_web_app`

**Environment Configurations**:
- **Dev**: Always-on disabled (cost savings)
- **Prod**: Always-on enabled (high availability)

---

#### 7. SQL Database Module
**Location**: `terraform/modules/sql-database/`

Creates Azure SQL Server and Database with threat detection and vulnerability assessment.

**Features**:
- SQL Server v12.0 with configurable credentials
- TLS 1.2 minimum version
- Zone redundancy for production
- Threat detection (test/prod only)
- Vulnerability assessment with recurring scans (test/prod)
- Security alert retention (90 days prod, 30 days test)

**Key Resources**:
- `azurerm_mssql_server`
- `azurerm_mssql_database`
- `azurerm_mssql_server_security_alert_policy` (test/prod)
- `azurerm_mssql_server_vulnerability_assessment` (test/prod)

**Security Features**:
- Threat detection enabled for test and prod
- Vulnerability assessment scans with email notifications
- Storage account required for scan results

---

#### 8. Monitoring Module
**Location**: `terraform/modules/monitoring/`

Creates Log Analytics Workspace and Application Insights for observability.

**Features**:
- Log Analytics Workspace with PerGB2018 pricing tier
- Application Insights integrated with Log Analytics
- Configurable log retention (30-730 days)
- Web application type configured

**Key Resources**:
- `azurerm_log_analytics_workspace`
- `azurerm_application_insights`

**Retention Policies**:
- **Dev**: 30 days
- **Test**: 60 days
- **Production**: 90 days

---

## Environment Configurations

The infrastructure supports three environments with distinct configurations optimized for their use case.

### Development Environment (dev)

**Purpose**: Cost-optimized environment for active development and testing

**Configuration File**: `terraform/environments/dev/terraform.tfvars`

| Resource | Configuration | Value |
|----------|--------------|-------|
| **Network** | VNet CIDR | `10.0.0.0/16` |
| | App Subnet | `10.0.1.0/24` |
| | DB Subnet | `10.0.2.0/24` |
| | Cache Subnet | `10.0.3.0/24` |
| | Mgmt Subnet | `10.0.4.0/24` |
| **App Service** | SKU | `B1` (Basic) |
| **SQL Database** | SKU | `Basic` |
| | Max Size | 2 GB |
| **Container Registry** | SKU | `Basic` |
| | Admin Enabled | `true` |
| **Storage Account** | Replication | `LRS` (Locally Redundant) |
| | Soft Delete Retention | 7 days |
| **Key Vault** | SKU | `standard` |
| | Purge Protection | `false` |
| | Network ACL | `Allow` (permissive) |
| **Monitoring** | Log Retention | 30 days |

**Special Features**:
- Auto-shutdown enabled for cost savings
- Purge soft delete enabled for easy cleanup
- Admin user enabled for Container Registry
- No resource deletion locks

---

### Test Environment (test)

**Purpose**: Balanced environment for QA, integration testing, and performance testing

**Configuration File**: `terraform/environments/test/terraform.tfvars`

| Resource | Configuration | Value |
|----------|--------------|-------|
| **Network** | VNet CIDR | `10.1.0.0/16` |
| | App Subnet | `10.1.1.0/24` |
| | DB Subnet | `10.1.2.0/24` |
| | Cache Subnet | `10.1.3.0/24` |
| | Mgmt Subnet | `10.1.4.0/24` |
| **App Service** | SKU | `S1` (Standard) |
| **SQL Database** | SKU | `S0` (Standard) |
| | Max Size | 10 GB |
| **Container Registry** | SKU | `Standard` |
| | Admin Enabled | `true` |
| **Storage Account** | Replication | `GRS` (Geo-Redundant) |
| | Soft Delete Retention | 14 days |
| **Key Vault** | SKU | `standard` |
| | Purge Protection | `false` |
| | Network ACL | `Allow` |
| **Monitoring** | Log Retention | 60 days |

**Special Features**:
- Geo-redundant storage for data resilience
- Threat detection enabled for SQL
- Vulnerability assessment enabled
- Resource group deletion prevention

---

### Production Environment (prod)

**Purpose**: Production-ready environment with maximum security, reliability, and performance

**Configuration File**: `terraform/environments/prod/terraform.tfvars`

| Resource | Configuration | Value |
|----------|--------------|-------|
| **Network** | VNet CIDR | `10.2.0.0/16` |
| | App Subnet | `10.2.1.0/24` |
| | DB Subnet | `10.2.2.0/24` |
| | Cache Subnet | `10.2.3.0/24` |
| | Mgmt Subnet | `10.2.4.0/24` |
| | Private Endpoints | `10.2.5.0/24` |
| **App Service** | SKU | `P1v3` (Premium v3) |
| | Always On | `true` |
| **SQL Database** | SKU | `S3` (Standard) |
| | Max Size | 100 GB |
| | Zone Redundant | `true` |
| **Container Registry** | SKU | `Premium` |
| | Admin Enabled | `false` (use managed identity) |
| | Content Trust | `enabled` |
| | Retention | 30 days |
| **Storage Account** | Replication | `RAGRS` (Read-Access Geo-Redundant) |
| | Soft Delete Retention | 30 days |
| **Key Vault** | SKU | `premium` (HSM-backed) |
| | Purge Protection | `true` |
| | Network ACL | `Deny` (restricted) |
| **Monitoring** | Log Retention | 90 days |

**Security Features**:
- Management locks on Resource Group, Key Vault, and SQL Database
- Network ACL default deny on Key Vault
- Premium Key Vault with HSM support
- Content trust enabled for Container Registry
- Zone redundancy for SQL Database
- Threat detection and vulnerability assessment enabled
- Always-on enabled for App Service

**High Availability**:
- Geo-replication enabled where supported
- Zone redundancy for critical databases
- Premium SKUs for auto-scaling and SLA guarantees

---

## Network Topology

### Overview

Each environment has an isolated Virtual Network (VNet) with a non-overlapping CIDR block to enable potential VNet peering or VPN connections between environments.

### Network Segmentation

```
┌─────────────────────────────────────────────────────────────┐
│                    Virtual Network (VNet)                    │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  App Subnet (snet-app)                                 │  │
│  │  - Delegated to Microsoft.Web/serverFarms             │  │
│  │  - App Services deployed here                         │  │
│  │  - NSG: nsg-snet-app                                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Database Subnet (snet-db)                            │  │
│  │  - Private endpoints for SQL Database                 │  │
│  │  - NSG: nsg-snet-db                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Cache Subnet (snet-cache)                            │  │
│  │  - Redis Cache (future)                               │  │
│  │  - NSG: nsg-snet-cache                                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Management Subnet (snet-mgmt)                        │  │
│  │  - Jump boxes, DevOps agents                          │  │
│  │  - NSG: nsg-snet-mgmt                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Private Endpoints Subnet (snet-private-endpoints)    │  │
│  │  - Production only                                     │  │
│  │  - Private endpoints for PaaS services                │  │
│  │  - NSG: nsg-snet-private-endpoints                    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Environment-Specific CIDR Blocks

| Environment | VNet CIDR | App Subnet | DB Subnet | Cache Subnet | Mgmt Subnet | Private Endpoints |
|------------|-----------|------------|-----------|--------------|-------------|-------------------|
| **Dev** | 10.0.0.0/16 | 10.0.1.0/24 | 10.0.2.0/24 | 10.0.3.0/24 | 10.0.4.0/24 | N/A |
| **Test** | 10.1.0.0/16 | 10.1.1.0/24 | 10.1.2.0/24 | 10.1.3.0/24 | 10.1.4.0/24 | N/A |
| **Prod** | 10.2.0.0/16 | 10.2.1.0/24 | 10.2.2.0/24 | 10.2.3.0/24 | 10.2.4.0/24 | 10.2.5.0/24 |

### Network Features

1. **Subnet Delegation**:
   - App Subnet is delegated to `Microsoft.Web/serverFarms` for App Service VNet integration
   - Enables secure communication between App Service and other Azure resources

2. **Network Security Groups**:
   - Each subnet has its own NSG
   - NSGs are automatically associated with their respective subnets
   - Custom rules can be added based on security requirements

3. **Service Endpoints**:
   - Can be configured for secure access to Azure Storage, SQL, and Key Vault
   - Traffic stays on Microsoft backbone network

4. **Private Endpoints** (Production):
   - Dedicated subnet for private endpoint connections
   - Provides private IP addresses for PaaS services
   - Eliminates public internet exposure

---

## Security Groups and Network Rules

### Network Security Group Architecture

Each subnet has a dedicated Network Security Group (NSG) that controls inbound and outbound traffic.

### Default NSG Configuration

The Terraform modules create NSGs with baseline rules. Additional rules should be added based on application requirements.

#### Recommended Rules for App Subnet (snet-app)

```hcl
# Allow HTTPS from Internet
Priority: 100
Direction: Inbound
Source: Internet
Destination: App Subnet
Port: 443
Protocol: TCP
Action: Allow

# Allow HTTP for redirect to HTTPS
Priority: 110
Direction: Inbound
Source: Internet
Destination: App Subnet
Port: 80
Protocol: TCP
Action: Allow

# Allow App Service Management
Priority: 120
Direction: Inbound
Source: GatewayManager
Destination: App Subnet
Port: Any
Protocol: Any
Action: Allow

# Allow Load Balancer Health Probes
Priority: 130
Direction: Inbound
Source: AzureLoadBalancer
Destination: App Subnet
Port: Any
Protocol: Any
Action: Allow

# Deny all other inbound
Priority: 4096
Direction: Inbound
Source: Any
Destination: Any
Port: Any
Protocol: Any
Action: Deny
```

#### Recommended Rules for Database Subnet (snet-db)

```hcl
# Allow SQL from App Subnet
Priority: 100
Direction: Inbound
Source: App Subnet CIDR
Destination: Database Subnet
Port: 1433
Protocol: TCP
Action: Allow

# Allow SQL from Management Subnet
Priority: 110
Direction: Inbound
Source: Management Subnet CIDR
Destination: Database Subnet
Port: 1433
Protocol: TCP
Action: Allow

# Deny all other inbound
Priority: 4096
Direction: Inbound
Source: Any
Destination: Any
Port: Any
Protocol: Any
Action: Deny
```

#### Recommended Rules for Management Subnet (snet-mgmt)

```hcl
# Allow RDP from corporate network
Priority: 100
Direction: Inbound
Source: Corporate_IP_Range
Destination: Management Subnet
Port: 3389
Protocol: TCP
Action: Allow

# Allow SSH from corporate network
Priority: 110
Direction: Inbound
Source: Corporate_IP_Range
Destination: Management Subnet
Port: 22
Protocol: TCP
Action: Allow

# Deny all other inbound
Priority: 4096
Direction: Inbound
Source: Any
Destination: Any
Port: Any
Protocol: Any
Action: Deny
```

### Application Security Groups (ASGs)

For more granular security, Application Security Groups can be created to group resources by function:

- `asg-web-servers`: Web application servers
- `asg-api-servers`: API backend servers
- `asg-database-servers`: Database servers
- `asg-jump-boxes`: Management/bastion hosts

---

## Key Vault Secrets Management

### Key Vault Architecture

Azure Key Vault stores all sensitive configuration data including:
- Database connection strings
- API keys and secrets
- SSL certificates
- Service principal credentials
- Storage account keys

### Access Control

#### Authentication Methods

1. **Development/Test**:
   - Azure AD authentication
   - Individual developer access via Azure AD groups
   - Network ACL: Allow all

2. **Production**:
   - Managed Identity (preferred)
   - Service Principal with limited permissions
   - Network ACL: Deny by default, allow specific VNets

#### RBAC Roles

| Role | Permissions | Used By |
|------|------------|---------|
| Key Vault Administrator | Full management access | DevOps team |
| Key Vault Secrets User | Read secrets | App Service (via Managed Identity) |
| Key Vault Crypto User | Encryption/decryption operations | Applications requiring encryption |
| Key Vault Certificates Officer | Manage certificates | Certificate automation |

### Secrets Organization

#### Naming Convention for Secrets

```
{environment}-{service}-{secret-type}-{name}
```

Examples:
- `prod-sql-connection-string`
- `prod-storage-account-key`
- `prod-api-jwt-secret`
- `prod-sendgrid-api-key`

#### Secret Categories

1. **Database Secrets**:
   - SQL connection strings
   - Administrator passwords
   - Read-only user credentials

2. **Storage Secrets**:
   - Storage account connection strings
   - SAS tokens
   - Access keys

3. **Application Secrets**:
   - JWT signing keys
   - API keys for external services
   - OAuth client secrets

4. **Certificate Secrets**:
   - SSL/TLS certificates
   - Client certificates for service-to-service authentication

### Key Vault Features by Environment

| Feature | Dev | Test | Prod |
|---------|-----|------|------|
| Soft Delete Retention | 90 days | 90 days | 90 days |
| Purge Protection | Disabled | Disabled | **Enabled** |
| Network ACL Default | Allow | Allow | **Deny** |
| SKU | Standard | Standard | **Premium** (HSM) |
| Managed Identity Access | Yes | Yes | Yes |
| Private Endpoint | No | No | **Yes** |
| Diagnostic Logging | Basic | Enhanced | Full |

### Best Practices

1. **Use Managed Identities**: App Services use system-assigned managed identities to access Key Vault
2. **Rotate Secrets Regularly**: Implement secret rotation policies (90 days recommended)
3. **Audit Access**: Enable diagnostic logging to Log Analytics
4. **Least Privilege**: Grant minimum required permissions
5. **Use References**: App Services reference secrets via `@Microsoft.KeyVault(SecretUri=...)`

### Example: App Service Key Vault Integration

```hcl
# In App Service app_settings:
{
  "ConnectionStrings__DefaultConnection" = "@Microsoft.KeyVault(SecretUri=https://kv-datingplatform-prod-abcd.vault.azure.net/secrets/prod-sql-connection-string)"
  "JwtSettings__SecretKey" = "@Microsoft.KeyVault(SecretUri=https://kv-datingplatform-prod-abcd.vault.azure.net/secrets/prod-api-jwt-secret)"
}
```

---

## Container Registry Setup

### Azure Container Registry (ACR) Configuration

ACR stores Docker container images for the DatingPlatform application.

### SKU Comparison

| Feature | Basic | Standard | Premium |
|---------|-------|----------|---------|
| **Storage (GB)** | 10 | 100 | 500 |
| **Webhooks** | 2 | 10 | 500 |
| **Geo-replication** | No | No | **Yes** |
| **Content Trust** | No | No | **Yes** |
| **Private Endpoints** | No | No | **Yes** |
| **Customer-managed Keys** | No | No | **Yes** |
| **Zone Redundancy** | No | No | **Yes** |
| **Throughput** | Basic | Medium | High |

### Environment Configurations

#### Development
- **SKU**: Basic
- **Admin User**: Enabled (for developer convenience)
- **Replication**: None
- **Retention**: 7 days (untagged images)

#### Test
- **SKU**: Standard
- **Admin User**: Enabled
- **Replication**: None
- **Retention**: 7 days

#### Production
- **SKU**: Premium
- **Admin User**: Disabled (use managed identity)
- **Content Trust**: Enabled
- **Replication**: Geo-replicated to secondary region
- **Retention**: 30 days
- **Private Endpoint**: Enabled

### Repository Organization

```
acrdatingplatformprod.azurecr.io/
├── dating-api/
│   ├── v1.0.0
│   ├── v1.0.1
│   └── latest
├── dating-web/
│   ├── v1.0.0
│   └── latest
├── dating-admin/
│   └── latest
└── dating-worker/
    └── latest
```

### Image Tagging Strategy

1. **Semantic Versioning**: `v{major}.{minor}.{patch}`
   - Example: `v1.0.0`, `v1.0.1`, `v2.0.0`

2. **Environment Tags**:
   - `dev`: Development builds
   - `test`: Test/QA builds
   - `latest`: Latest stable release
   - `prod-{date}`: Production releases with date stamp

3. **Commit-based Tags**: `sha-{git-commit-hash}`
   - Example: `sha-a1b2c3d4`

### Authentication

#### Development/Test
```bash
# Using admin credentials
az acr login --name acrdatingplatformdev
```

#### Production
```bash
# Using managed identity (from App Service)
# No explicit login required - automatic authentication

# For CI/CD pipelines - use Service Principal
az login --service-principal -u $CLIENT_ID -p $CLIENT_SECRET --tenant $TENANT_ID
az acr login --name acrdatingplatformprod
```

### Content Trust (Production Only)

Content trust ensures image integrity using Docker Content Trust (DCT).

**Enabling Content Trust**:
```bash
export DOCKER_CONTENT_TRUST=1
export DOCKER_CONTENT_TRUST_SERVER=https://acrdatingplatformprod.azurecr.io
```

**Signing Images**:
```bash
# Build and push signed image
docker build -t acrdatingplatformprod.azurecr.io/dating-api:v1.0.0 .
docker push acrdatingplatformprod.azurecr.io/dating-api:v1.0.0
```

### Geo-Replication (Production)

Production ACR is replicated to the secondary region for high availability:

- **Primary**: West US 2
- **Secondary**: East US 2

**Benefits**:
- Reduced latency for image pulls
- High availability during regional outages
- Automated synchronization

---

## AKS Cluster Configuration

### Azure Kubernetes Service (AKS) Overview

While the current deployment uses App Service, the infrastructure includes an AKS module for future container orchestration needs.

**Module Location**: `infrastructure/terraform/modules/aks-cluster/`

### AKS Cluster Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   AKS Cluster                                │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  System Node Pool                                     │   │
│  │  - VM Size: Standard_D4s_v3                          │   │
│  │  - Node Count: 3-5 (auto-scaling)                   │   │
│  │  - Role: Kubernetes system components                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  User Node Pool                                       │   │
│  │  - VM Size: Standard_D8s_v3                          │   │
│  │  - Node Count: 3-10 (auto-scaling)                  │   │
│  │  - Role: Application workloads                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Spot Node Pool (Optional)                           │   │
│  │  - VM Size: Standard_D4s_v3                          │   │
│  │  - Node Count: 0-5 (auto-scaling)                   │   │
│  │  - Role: Batch/non-critical workloads               │   │
│  │  - Cost: Up to 90% savings                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Node Pool Configuration

#### System Node Pool
- **Purpose**: Kubernetes system components (CoreDNS, metrics-server, etc.)
- **VM Size**: `Standard_D4s_v3` (4 vCPU, 16 GB RAM)
- **Node Count**: 3 (initial), auto-scaling 3-5
- **Max Pods**: 110 per node
- **OS Disk**: 128 GB Managed Disk

#### User Node Pool
- **Purpose**: Application workloads (API, web, workers)
- **VM Size**: `Standard_D8s_v3` (8 vCPU, 32 GB RAM)
- **Node Count**: 3 (initial), auto-scaling 3-10
- **Max Pods**: 110 per node
- **OS Disk**: 256 GB Managed Disk
- **Labels**: `workload=application`, `role=user`

#### Spot Node Pool (Cost Optimization)
- **Purpose**: Non-critical batch workloads
- **VM Size**: `Standard_D4s_v3`
- **Node Count**: 0 (initial), auto-scaling 0-5
- **Eviction Policy**: Delete
- **Spot Max Price**: -1 (pay up to on-demand price)
- **Labels**: `workload=batch`, `role=spot`
- **Taints**: `kubernetes.azure.com/scalesetpriority=spot:NoSchedule`

### Network Configuration

```yaml
Network Plugin: Azure CNI
Network Policy: Azure Network Policy
DNS Service IP: 10.250.0.10
Service CIDR: 10.250.0.0/16
Load Balancer SKU: Standard
Outbound Type: Load Balancer
```

**Benefits of Azure CNI**:
- Pods get IP addresses from VNet subnet
- Direct connectivity to on-premises networks
- Better integration with Azure services

### Security Features

#### Azure AD Integration
- **Managed Azure AD**: Enabled
- **Azure RBAC**: Enabled for Kubernetes authorization
- **Admin Groups**: Configurable Azure AD groups for cluster administrators

#### RBAC Roles
- **AKS Cluster Admin**: Full cluster access
- **AKS Cluster User**: Read-only cluster access
- **Azure Kubernetes Service RBAC Admin**: Kubernetes RBAC admin
- **Azure Kubernetes Service RBAC Writer**: Kubernetes resource write access

#### Secrets Management
- **CSI Secrets Driver**: Enabled
- **Key Vault Integration**: Secrets automatically synced from Key Vault
- **Secret Rotation**: Enabled (2-minute interval)

### Monitoring and Diagnostics

#### Azure Monitor Integration
- **Container Insights**: Enabled
- **Log Analytics Workspace**: Integrated
- **Metrics Collection**: CPU, memory, disk, network

#### Diagnostic Logs
- `kube-apiserver`: API server logs
- `kube-controller-manager`: Controller manager logs
- `kube-scheduler`: Scheduler logs
- `kube-audit`: Audit logs
- `cluster-autoscaler`: Autoscaler logs

### Auto-Scaling

#### Cluster Autoscaler Profile
```yaml
balance_similar_node_groups: true
expander: random
max_graceful_termination_sec: 600
max_node_provisioning_time: 15m
scale_down_delay_after_add: 10m
scale_down_unneeded: 10m
scale_down_utilization_threshold: 0.5
```

#### Horizontal Pod Autoscaler (HPA)
- Based on CPU/memory metrics
- Custom metrics via KEDA (optional)

### Maintenance Window
- **Day**: Sunday
- **Hours**: 2:00 AM - 5:00 AM (3-hour window)
- **Purpose**: Automated updates and patches

### ACR Integration
- **AcrPull Role**: Automatically assigned to AKS kubelet identity
- **Authentication**: Managed identity (no credentials needed)
- **Image Pull**: Seamless access to private container images

### Ingress Configuration

For HTTP(S) routing, deploy NGINX Ingress Controller or Azure Application Gateway Ingress Controller (AGIC).

**Recommended**: Application Gateway Ingress Controller for production
- WAF capabilities
- SSL termination
- URL-based routing
- Azure integration

---

## Storage and Database Configuration

### Azure Storage Account

#### Purpose
- Blob storage for user-uploaded media (photos, videos)
- Static website hosting (optional)
- Backup storage for database vulnerability assessments
- Terraform state file storage (separate account)

#### Storage Account Configuration

| Feature | Dev | Test | Prod |
|---------|-----|------|------|
| **Account Tier** | Standard | Standard | Standard |
| **Replication** | LRS | GRS | RAGRS |
| **HTTPS Only** | Enabled | Enabled | Enabled |
| **TLS Version** | 1.2+ | 1.2+ | 1.2+ |
| **Blob Versioning** | Enabled | Enabled | Enabled |
| **Soft Delete (Blobs)** | 7 days | 14 days | 30 days |
| **Soft Delete (Containers)** | 7 days | 14 days | 30 days |
| **Public Access** | Disabled | Disabled | Disabled |
| **Network Rules** | Allow all | Allow VNet | Allow VNet only |

#### Container Structure
```
stdatingplatformprod/
├── user-photos/
│   ├── {userId}/
│   │   ├── profile/
│   │   └── gallery/
├── user-videos/
│   └── {userId}/
├── backups/
│   ├── sql/
│   └── config/
└── vulnerability-assessment/
    └── scans/
```

#### Access Control
- **Managed Identity**: App Service accesses storage via managed identity
- **SAS Tokens**: Time-limited tokens for client-side uploads
- **Private Endpoints**: Production storage uses private endpoints
- **Firewall**: Production storage restricts access to VNet

---

### Azure SQL Database

#### SQL Server Configuration

| Feature | Dev | Test | Prod |
|---------|-----|------|------|
| **Version** | 12.0 | 12.0 | 12.0 |
| **TLS Version** | 1.2+ | 1.2+ | 1.2+ |
| **Public Access** | Allowed | Allowed | Firewall-restricted |
| **Azure AD Authentication** | Enabled | Enabled | Enabled |
| **Threat Detection** | Disabled | Enabled | Enabled |
| **Vulnerability Assessment** | Disabled | Enabled | Enabled |

#### SQL Database Configuration

| Feature | Dev | Test | Prod |
|---------|-----|------|------|
| **SKU** | Basic | S0 (Standard) | S3 (Standard) |
| **Max Size** | 2 GB | 10 GB | 100 GB |
| **Zone Redundancy** | Disabled | Disabled | **Enabled** |
| **Backup Retention** | 7 days | 14 days | 30 days |
| **Geo-Replication** | No | No | Optional |
| **Read Replicas** | No | No | Optional |

#### Database Schema

**Primary Database**: `sqldb-datingplatform-{env}`

**Core Tables**:
- `Users`: User profiles and authentication
- `Matches`: User matches and interactions
- `Messages`: Chat messages
- `Profiles`: Extended profile information
- `Photos`: Photo metadata
- `Subscriptions`: Premium subscriptions
- `Payments`: Payment transactions

#### Connection Strings

Stored in Key Vault:
```
Server=tcp:sql-datingplatform-prod-abcd.database.windows.net,1433;
Initial Catalog=sqldb-datingplatform-prod;
Persist Security Info=False;
User ID={admin_user};
Password={admin_password};
MultipleActiveResultSets=False;
Encrypt=True;
TrustServerCertificate=False;
Connection Timeout=30;
```

#### Firewall Rules

**Development/Test**:
- Allow Azure Services: Enabled
- Allow specific developer IPs

**Production**:
- Allow Azure Services: Enabled (for App Service)
- Allow VNet integration subnet
- Deny all other public access
- Use private endpoint (recommended)

#### Threat Detection Alerts

**Enabled for Test/Production**:
- SQL Injection attempts
- Anomalous client login
- Access from unusual location
- Access from potentially harmful application
- Brute force SQL credentials

**Alert Recipients**:
- Database administrators
- Security team
- DevOps on-call

#### Vulnerability Assessment

**Scan Frequency**: Weekly (Sunday 2:00 AM)
**Scan Results**: Stored in Storage Account
**Email Notifications**: Enabled
**Baseline**: Configured for each environment

**Common Vulnerabilities Checked**:
- Transparent Data Encryption (TDE) status
- Auditing configuration
- SQL authentication vs Azure AD
- Firewall rules configuration
- Encryption in transit

---

## Monitoring and Observability

### Azure Monitor Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Application Insights                       │
│  - Application Performance Monitoring (APM)                  │
│  - Distributed Tracing                                       │
│  - Application Map                                           │
│  - Live Metrics Stream                                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Integrated with
                   │
┌──────────────────▼──────────────────────────────────────────┐
│               Log Analytics Workspace                        │
│  - Centralized log aggregation                              │
│  - KQL query engine                                         │
│  - Custom dashboards                                        │
│  - Alert rules                                              │
└─────────────────────────────────────────────────────────────┘
```

### Log Analytics Workspace

#### Configuration

| Feature | Dev | Test | Prod |
|---------|-----|------|------|
| **Pricing Tier** | PerGB2018 | PerGB2018 | PerGB2018 |
| **Retention** | 30 days | 60 days | 90 days |
| **Daily Cap** | 1 GB | 5 GB | No limit |
| **Data Export** | Disabled | Disabled | Enabled |

#### Data Sources

1. **Application Logs**:
   - App Service application logs
   - App Service platform logs
   - App Service HTTP logs

2. **Infrastructure Logs**:
   - AKS cluster logs (if deployed)
   - SQL Database audit logs
   - Key Vault access logs
   - Storage Account logs

3. **Metrics**:
   - App Service metrics
   - SQL Database performance metrics
   - Storage Account metrics
   - Network metrics

#### Common Queries

**Failed Requests**:
```kql
AppRequests
| where Success == false
| where TimeGenerated > ago(1h)
| summarize Count = count() by ResultCode, Name
| order by Count desc
```

**Slow Queries**:
```kql
AppDependencies
| where Type == "SQL"
| where Duration > 1000
| project TimeGenerated, Name, Target, Duration, Success
| order by Duration desc
```

**Application Exceptions**:
```kql
AppExceptions
| where TimeGenerated > ago(24h)
| summarize Count = count() by Type, OuterMessage
| order by Count desc
```

---

### Application Insights

#### Features Enabled

1. **Application Performance Monitoring**:
   - Request rates and response times
   - Failure rates
   - Dependency tracking (SQL, Redis, HTTP)

2. **Distributed Tracing**:
   - End-to-end transaction tracking
   - Cross-service correlation
   - Performance bottleneck identification

3. **Live Metrics**:
   - Real-time request/response monitoring
   - Live failure tracking
   - Server metrics (CPU, memory)

4. **Application Map**:
   - Visual representation of application architecture
   - Dependency health status
   - Performance metrics per component

5. **Availability Tests**:
   - URL ping tests
   - Multi-step web tests
   - Custom availability tests

#### Instrumentation Key

Stored in Key Vault and injected into App Service via app settings:
```
APPINSIGHTS_INSTRUMENTATIONKEY = @Microsoft.KeyVault(SecretUri=...)
```

#### Telemetry Types

1. **Requests**: HTTP requests to the application
2. **Dependencies**: Calls to external services (SQL, Redis, APIs)
3. **Exceptions**: Unhandled exceptions and errors
4. **Traces**: Custom log messages
5. **Events**: Custom business events (user registration, matches, etc.)
6. **Metrics**: Custom metrics (active users, matches per day, etc.)

---

### Alerting

#### Alert Rules

**Critical Alerts** (Production):
1. **High Error Rate**:
   - Condition: Error rate > 5% for 5 minutes
   - Action: Email + SMS to on-call engineer

2. **App Service Down**:
   - Condition: HTTP 5xx responses > 10 in 5 minutes
   - Action: Email + SMS + PagerDuty

3. **Database CPU High**:
   - Condition: SQL Database CPU > 80% for 10 minutes
   - Action: Email to DBA team

4. **Storage Quota Warning**:
   - Condition: Storage usage > 80%
   - Action: Email to ops team

**Warning Alerts**:
1. **Slow Response Time**:
   - Condition: Average response time > 2 seconds for 10 minutes
   - Action: Email to dev team

2. **High Memory Usage**:
   - Condition: App Service memory > 80% for 15 minutes
   - Action: Email to ops team

#### Action Groups

- **Critical**: Email, SMS, PagerDuty
- **Warning**: Email only
- **Info**: Log Analytics only

---

### Dashboards

#### Azure Dashboard Components

1. **Application Health**:
   - Request rate
   - Response time
   - Error rate
   - Availability percentage

2. **Infrastructure Health**:
   - CPU usage
   - Memory usage
   - Network throughput
   - Disk IOPS

3. **Business Metrics**:
   - Active users
   - New registrations
   - Matches created
   - Messages sent
   - Premium subscriptions

4. **Security**:
   - Failed login attempts
   - SQL threat detection alerts
   - Key Vault access patterns

---

## State Management

### Terraform State Configuration

Terraform state is stored remotely in Azure Storage Account for collaboration and state locking.

#### State Storage Account

**Resource Group**: `rg-terraform-state-westus2`
**Storage Account**: `sttfstatedatingplatform`
**Container**: `tfstate`
**Location**: West US 2

#### State Files by Environment

- **Dev**: `dev.terraform.tfstate`
- **Test**: `test.terraform.tfstate`
- **Prod**: `prod.terraform.tfstate`

#### Backend Configuration

**Development**:
```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state-westus2"
    storage_account_name = "sttfstatedatingplatform"
    container_name       = "tfstate"
    key                  = "dev.terraform.tfstate"
  }
}
```

#### State Locking

- **Enabled**: Automatic via Azure Storage blob leases
- **Purpose**: Prevents concurrent state modifications
- **Lock Timeout**: 15 minutes (default)

#### State Security

1. **Access Control**:
   - Storage Account uses Azure AD authentication
   - RBAC roles assigned to service principals and DevOps pipelines

2. **Encryption**:
   - State files encrypted at rest (Azure Storage SSE)
   - HTTPS enforced for all operations

3. **Backup**:
   - Soft delete enabled (7-day retention)
   - Versioning enabled
   - Point-in-time restore available

#### State Management Commands

```bash
# Initialize backend
terraform init

# View current state
terraform state list

# Show specific resource
terraform state show azurerm_resource_group.this

# Pull state locally (for inspection)
terraform state pull > current.tfstate

# Import existing resource
terraform import azurerm_resource_group.example /subscriptions/.../resourceGroups/rg-name

# Remove resource from state (without destroying)
terraform state rm azurerm_resource_group.example
```

---

## Deployment Workflow

### Prerequisites

1. **Azure CLI**: Installed and authenticated
2. **Terraform**: Version >= 1.6.0
3. **Service Principal**: With Contributor role on subscription
4. **Environment Variables**: Set for authentication

#### Required Environment Variables

```bash
export ARM_CLIENT_ID="<service-principal-app-id>"
export ARM_CLIENT_SECRET="<service-principal-password>"
export ARM_SUBSCRIPTION_ID="ebd1613e-fea0-4b6d-8918-7e4de6a71c44"
export ARM_TENANT_ID="<tenant-id>"
```

### Deployment Steps

#### 1. Initialize Terraform

```bash
cd terraform/environments/dev
terraform init
```

**What it does**:
- Downloads provider plugins (azurerm, random)
- Configures backend for state storage
- Prepares working directory

#### 2. Validate Configuration

```bash
terraform validate
```

**What it does**:
- Checks syntax errors
- Validates resource configurations
- Ensures proper module references

#### 3. Plan Changes

```bash
terraform plan -out=tfplan
```

**What it does**:
- Compares desired state with current state
- Shows resources to be created, modified, or destroyed
- Generates execution plan
- Saves plan to file

#### 4. Review Plan

```bash
# View plan details
terraform show tfplan

# View plan in JSON format
terraform show -json tfplan | jq
```

#### 5. Apply Changes

```bash
terraform apply tfplan
```

**What it does**:
- Executes the plan
- Creates/modifies/destroys resources
- Updates state file
- Shows output values

#### 6. Verify Deployment

```bash
# View outputs
terraform output

# View specific output
terraform output app_service_url
```

---

### Environment-Specific Deployment

#### Development Environment

```bash
cd terraform/environments/dev

# Set environment-specific variables
export TF_VAR_sql_admin_password="<strong-password>"

# Initialize and deploy
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

#### Test Environment

```bash
cd terraform/environments/test

# Set environment-specific variables
export TF_VAR_sql_admin_password="<strong-password>"

# Initialize and deploy
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

#### Production Environment

```bash
cd terraform/environments/prod

# Set environment-specific variables
export TF_VAR_sql_admin_password="<strong-password>"

# Initialize and deploy
terraform init
terraform plan -out=tfplan

# Review plan carefully
terraform show tfplan

# Apply with approval
terraform apply tfplan
```

---

### CI/CD Pipeline Integration

#### Azure DevOps Pipeline

**Pipeline File**: `.azure-pipelines/terraform-deploy.yml`

**Stages**:
1. **Validate**: Terraform validate and format check
2. **Plan**: Generate and review plan
3. **Approve**: Manual approval gate (production only)
4. **Apply**: Execute Terraform apply
5. **Test**: Run smoke tests

**Environment Variables** (stored in Azure DevOps):
- `ARM_CLIENT_ID`: Service Principal ID
- `ARM_CLIENT_SECRET`: Service Principal Secret (secure)
- `ARM_SUBSCRIPTION_ID`: Azure Subscription ID
- `ARM_TENANT_ID`: Azure AD Tenant ID
- `TF_VAR_sql_admin_password`: SQL Admin Password (secure)

#### Pipeline Stages

```yaml
stages:
- stage: Validate
  jobs:
  - job: TerraformValidate
    steps:
    - task: TerraformInstaller@0
    - task: TerraformTaskV4@4
      inputs:
        command: 'init'
        backendServiceArm: 'Azure Subscription'
    - task: TerraformTaskV4@4
      inputs:
        command: 'validate'

- stage: Plan
  jobs:
  - job: TerraformPlan
    steps:
    - task: TerraformTaskV4@4
      inputs:
        command: 'plan'
        environmentServiceNameAzureRM: 'Azure Subscription'
        commandOptions: '-out=tfplan'

- stage: Approve
  condition: eq(variables['Build.SourceBranchName'], 'main')
  jobs:
  - job: ManualApproval
    pool: server
    steps:
    - task: ManualValidation@0
      inputs:
        instructions: 'Review Terraform plan before applying'

- stage: Apply
  jobs:
  - job: TerraformApply
    steps:
    - task: TerraformTaskV4@4
      inputs:
        command: 'apply'
        environmentServiceNameAzureRM: 'Azure Subscription'
        commandOptions: 'tfplan'
```

---

### Disaster Recovery

#### Backup Strategy

1. **State Files**:
   - Stored in geo-redundant storage
   - Versioning enabled
   - 7-day soft delete retention

2. **SQL Database**:
   - Automated backups (7-30 days retention)
   - Point-in-time restore available
   - Geo-redundant backup storage (production)

3. **Storage Account**:
   - Geo-redundant replication (GRS/RAGRS)
   - Soft delete enabled
   - Versioning for blob recovery

#### Recovery Procedures

**State File Recovery**:
```bash
# List state file versions
az storage blob list --account-name sttfstatedatingplatform \
  --container-name tfstate --prefix prod.terraform.tfstate

# Restore previous version
az storage blob download --account-name sttfstatedatingplatform \
  --container-name tfstate --name prod.terraform.tfstate \
  --file prod.terraform.tfstate.backup --version-id <version-id>
```

**SQL Database Recovery**:
```bash
# Point-in-time restore
az sql db restore --dest-name sqldb-datingplatform-prod-restored \
  --resource-group rg-datingplatform-prod-westus2 \
  --server sql-datingplatform-prod-abcd \
  --name sqldb-datingplatform-prod \
  --time "2025-12-08T10:00:00Z"
```

---

## Conclusion

This infrastructure design provides a robust, scalable, and secure foundation for the DatingPlatform (Flamoral) application. Key highlights:

- **Modular Architecture**: Reusable Terraform modules for consistency
- **Environment Separation**: Isolated dev, test, and production environments
- **Security-First**: Network isolation, Key Vault integration, threat detection
- **Cost-Optimized**: Environment-appropriate SKUs and replication strategies
- **Highly Available**: Geo-replication and zone redundancy in production
- **Observable**: Comprehensive monitoring and alerting
- **Compliant**: Audit logging, vulnerability assessment, and policy enforcement

### Next Steps

1. **Deploy Infrastructure**: Follow deployment workflow for each environment
2. **Configure Secrets**: Add application secrets to Key Vault
3. **Set Up Monitoring**: Configure custom alerts and dashboards
4. **Implement CI/CD**: Integrate Terraform with Azure DevOps
5. **Security Hardening**: Review and apply NSG rules, implement private endpoints
6. **Disaster Recovery Testing**: Validate backup and restore procedures

---

## Appendix

### Useful Commands

#### Terraform Commands
```bash
# Format code
terraform fmt -recursive

# List providers
terraform providers

# Refresh state
terraform refresh

# Destroy infrastructure
terraform destroy

# Target specific resource
terraform apply -target=module.networking
```

#### Azure CLI Commands
```bash
# List resources in resource group
az resource list --resource-group rg-datingplatform-prod-westus2 --output table

# Get Key Vault secret
az keyvault secret show --vault-name kv-datingplatform-prod-abcd --name prod-sql-connection-string

# View SQL Database metrics
az monitor metrics list --resource /subscriptions/.../databases/sqldb-datingplatform-prod \
  --metric cpu_percent --interval PT5M
```

### Terraform Module Inputs Reference

See individual module README files in `terraform/modules/{module-name}/README.md` for detailed input and output specifications.

### Contact Information

- **DevOps Team**: devops@datingplatform.com
- **Security Team**: security@datingplatform.com
- **Infrastructure Repository**: https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform

---

**Document End**
