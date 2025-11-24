# Dating App - Infrastructure Architecture

## Overview
This document describes the production-ready Azure infrastructure for the Dating App platform.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Azure Front Door + WAF                      │
│                  (Global Load Balancing & Security)              │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
┌────────▼────────┐            ┌────────▼────────┐
│   AKS Cluster   │            │   Static CDN    │
│   (Workloads)   │            │   (Media Files) │
└────────┬────────┘            └─────────────────┘
         │
    ┌────┴────┬──────────┬──────────┬────────┐
    │         │          │          │        │
┌───▼───┐ ┌──▼──┐  ┌────▼────┐ ┌───▼───┐ ┌─▼──┐
│  API  │ │Media│  │  Chat   │ │SignalR│ │etc │
│Service│ │Proc │  │ Worker  │ │Service│ │... │
└───┬───┘ └──┬──┘  └────┬────┘ └───┬───┘ └────┘
    │        │          │          │
    └────────┴──────────┴──────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
    ┌────▼─────┐      ┌─────▼────┐
    │PostgreSQL│      │  Redis   │
    │ Database │      │  Cache   │
    └──────────┘      └──────────┘
         │                   │
         └─────────┬─────────┘
                   │
           ┌───────▼────────┐
           │   Key Vault    │
           │   (Secrets)    │
           └────────────────┘
```

## Components

### 1. Azure Front Door
- **Purpose**: Global load balancing, SSL termination, WAF protection
- **Features**:
  - OWASP Top 10 protection
  - Rate limiting (100 req/min default)
  - Geo-filtering (optional)
  - Custom domain support
  - Automatic failover
- **SKU**: Standard (prod), Standard (staging/dev)
- **Cost**: ~$35/month base + $0.02/GB egress

### 2. Azure Kubernetes Service (AKS)
- **Purpose**: Container orchestration for microservices
- **Configuration**:
  - **Dev**: 1 node, D2s_v3 (2 vCPU, 8GB RAM)
  - **Staging**: 2 nodes, D4s_v3 (4 vCPU, 16GB RAM)
  - **Prod**: 3-20 nodes (autoscale), D8s_v3 (8 vCPU, 32GB RAM)
- **Features**:
  - Azure CNI networking
  - Azure RBAC integration
  - Key Vault secrets provider
  - Azure Monitor integration
  - Autoscaling (HPA + Cluster Autoscaler)
- **Cost**:
  - Dev: ~$70/month
  - Prod: ~$800-2400/month (depends on load)

### 3. PostgreSQL Flexible Server
- **Purpose**: Primary relational database
- **Configuration**:
  - **Dev**: B_Standard_B1ms (1 vCPU, 2GB RAM, 32GB storage)
  - **Staging**: GP_Standard_D2s_v3 (2 vCPU, 8GB RAM, 64GB storage)
  - **Prod**: GP_Standard_D8s_v3 (8 vCPU, 32GB RAM, 256GB storage)
- **Features**:
  - VNet integration
  - Automated backups (7 days retention)
  - Geo-redundant backup (prod only)
  - Private endpoint support
- **Cost**:
  - Dev: ~$25/month
  - Prod: ~$600/month

### 4. Redis Cache
- **Purpose**: Session storage, caching, real-time features
- **Configuration**:
  - **Dev**: Basic C0 (250MB)
  - **Staging**: Standard C1 (1GB)
  - **Prod**: Premium P2 (6GB) with persistence
- **Features**:
  - VNet integration (Premium)
  - RDB persistence (prod)
  - TLS 1.2 encryption
  - Maxmemory policy: allkeys-lru
- **Cost**:
  - Dev: ~$15/month
  - Prod: ~$300/month

### 5. Storage Account + CDN
- **Purpose**: User photos, videos, static assets
- **Configuration**:
  - Account type: StorageV2
  - Replication: LRS (dev), GRS (staging), GZRS (prod)
  - CDN: Standard_Microsoft (staging/prod)
- **Containers**:
  - `photos`: User profile photos
  - `videos`: Video content
  - `avatars`: Processed avatars
  - `thumbnails`: Image thumbnails
  - `verification`: Identity verification media
- **Features**:
  - Lifecycle management (auto-tier to cool/archive)
  - Soft delete (30 days)
  - Versioning enabled
  - CDN caching (7 days for images)
- **Cost**:
  - Storage: ~$50/month (1TB)
  - CDN: ~$20/month + $0.08/GB

### 6. Key Vault
- **Purpose**: Centralized secrets management
- **Stored Secrets**:
  - Database connection strings
  - Redis connection strings
  - Storage account keys
  - JWT signing keys
  - Third-party API keys
- **Features**:
  - Azure RBAC authorization
  - Network ACLs (VNet only)
  - Soft delete (90 days)
  - Purge protection (prod)
  - AKS integration via CSI driver
- **Cost**: ~$5/month

### 7. SignalR Service
- **Purpose**: Real-time messaging and notifications
- **Configuration**:
  - **Dev**: Free_F1 (20 concurrent connections)
  - **Staging**: Standard_S1 (1000 connections)
  - **Prod**: Standard_S1 with 5 units (5000 connections)
- **Features**:
  - WebSocket support
  - Serverless mode
  - Private endpoint support
- **Cost**:
  - Dev: Free
  - Prod: ~$250/month

### 8. CosmosDB
- **Purpose**: User activity feeds, real-time events, match data
- **Configuration**:
  - API: SQL (Core)
  - Consistency: Session
  - Mode: Serverless (dev/staging), Provisioned (prod)
  - Replication: Single region (dev), Multi-region (prod)
- **Containers**:
  - `user_events`: User activity logs (30 day TTL)
  - `matches`: Match data (no expiration)
  - `feed`: Real-time user feed (7 day TTL)
- **Features**:
  - Automatic indexing
  - Point-in-time restore
  - VNet integration
- **Cost**:
  - Dev: ~$1/month (serverless)
  - Prod: ~$150/month (400 RU/s)

### 9. Log Analytics + Application Insights
- **Purpose**: Monitoring, logging, telemetry
- **Configuration**:
  - Retention: 30 days (dev), 90 days (staging/prod)
  - Daily cap: 5GB (dev), 50GB (prod)
  - Sampling: 50% (dev), 100% (prod)
- **Features**:
  - Distributed tracing
  - Custom metrics
  - Alerting (CPU, memory, errors)
  - Performance analytics
- **Cost**:
  - Dev: ~$10/month
  - Prod: ~$200/month

## Network Architecture

### Virtual Network
```
VNet: 10.0.0.0/16 (prod), 10.1.0.0/16 (dev), 10.2.0.0/16 (staging)

Subnets:
├── aks-subnet: 10.x.1.0/24 (for AKS nodes)
├── db-subnet: 10.x.2.0/24 (for PostgreSQL)
└── redis-subnet: 10.x.3.0/24 (for Redis Premium)
```

### Network Security
- **NSG Rules**: Configured per subnet
- **Service Endpoints**: Enabled for Storage, KeyVault, SQL
- **Private Endpoints**: Enabled for prod resources
- **Network Policies**: Azure CNI Network Policy enabled in AKS

## Security Architecture

### Identity & Access
- **Azure AD Integration**: AKS uses managed identity
- **RBAC**: Role-based access control for all resources
- **Service Accounts**: Dedicated per microservice
- **Key Rotation**: Automated 90-day rotation

### Secrets Management
- **Key Vault**: Centralized secret storage
- **CSI Driver**: Secrets mounted as volumes in pods
- **Environment Variables**: Loaded from ConfigMaps/Secrets
- **No Hardcoded Secrets**: Enforced via pre-commit hooks

### Network Security
- **WAF**: OWASP rule set + custom rules
- **TLS**: Enforced everywhere (TLS 1.2+)
- **Private Endpoints**: Prod resources not publicly accessible
- **Network Policies**: Pod-to-pod communication restricted

## High Availability

### Application Layer
- **Multi-replica**: All services run 2+ replicas
- **Anti-affinity**: Pods spread across nodes
- **Health checks**: Liveness + readiness probes
- **Graceful shutdown**: 30s termination grace period

### Data Layer
- **PostgreSQL**:
  - Zone-redundant in prod
  - Automated backups (7 days)
  - Geo-redundant backups in prod
- **Redis**:
  - Premium tier with persistence
  - RDB snapshots every hour
- **Storage**:
  - GRS/GZRS replication
  - Soft delete enabled

### Infrastructure Layer
- **AKS**:
  - Multi-zone node pools
  - Cluster autoscaler
  - System node pool separated from user workloads
- **Front Door**:
  - Global anycast network
  - Automatic failover
  - Health probe monitoring

## Disaster Recovery

### RPO/RTO Targets
- **Production**: RPO < 1 hour, RTO < 4 hours
- **Staging**: RPO < 24 hours, RTO < 8 hours
- **Dev**: Best effort

### Backup Strategy
1. **Database**: Point-in-time restore (7 days)
2. **Storage**: Versioning + soft delete (30 days)
3. **Infrastructure**: Terraform state in Azure Storage
4. **Secrets**: Key Vault soft delete (90 days)

### Recovery Procedures
See [runbooks/rollback-procedure.md](../runbooks/rollback-procedure.md)

## Cost Breakdown (Monthly)

### Production Environment
| Service | Cost (USD) |
|---------|-----------|
| AKS (3-20 nodes) | $800-2400 |
| PostgreSQL | $600 |
| Redis Premium | $300 |
| Storage + CDN | $70 |
| CosmosDB | $150 |
| SignalR | $250 |
| Front Door | $50 |
| Key Vault | $5 |
| Monitoring | $200 |
| **Total** | **$2,425-3,025/month** |

### Staging Environment
| Service | Cost (USD) |
|---------|-----------|
| AKS (2 nodes) | $140 |
| PostgreSQL | $100 |
| Redis Standard | $75 |
| Storage + CDN | $30 |
| Other services | $100 |
| **Total** | **~$445/month** |

### Development Environment
| Service | Cost (USD) |
|---------|-----------|
| AKS (1 node) | $70 |
| PostgreSQL | $25 |
| Redis Basic | $15 |
| Storage | $10 |
| Other services | $30 |
| **Total** | **~$150/month** |

## Scaling Considerations

### Horizontal Scaling
- **AKS**: Cluster autoscaler (3-20 nodes)
- **Application**: HPA targets CPU 70%, Memory 80%
- **Database**: Read replicas (future enhancement)

### Vertical Scaling
- **Database**: Scale up SKU during maintenance window
- **Redis**: Scale up tier (requires brief downtime)
- **Storage**: Automatically scales with usage

## Compliance & Governance

### Data Residency
- All resources in East US region
- Data not replicated outside region (except backups)

### Encryption
- **At Rest**: All data encrypted (Azure managed keys)
- **In Transit**: TLS 1.2+ enforced everywhere
- **Secrets**: Stored in Key Vault, never in code

### Audit Logging
- All resource changes logged to Activity Log
- 90-day retention in Log Analytics
- Alerts for suspicious activities

## Future Enhancements
1. Multi-region deployment for global users
2. PostgreSQL read replicas for read scaling
3. Kafka for event streaming
4. Service mesh (Istio/Linkerd)
5. GitOps with Flux/ArgoCD
6. Blue-green deployments
