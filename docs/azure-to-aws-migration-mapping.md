# Azure to AWS Service Mapping - Flamoral Dating Platform Migration

**Document Version:** 1.0
**Last Updated:** 2024-12-29
**Platform:** Flamoral Dating Application
**Scope:** 200+ Azure Resources, 22 Microservices

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Compute & Containers](#compute--containers)
3. [Databases](#databases)
4. [Storage](#storage)
5. [Identity & Security](#identity--security)
6. [Networking](#networking)
7. [Messaging & Real-Time](#messaging--real-time)
8. [Monitoring & Observability](#monitoring--observability)
9. [CI/CD](#cicd)
10. [AI/ML Services](#aiml-services)
11. [Migration Risk Assessment](#migration-risk-assessment)
12. [Cost Comparison Summary](#cost-comparison-summary)

---

## Executive Summary

This document provides a comprehensive service-by-service mapping for migrating the Flamoral dating platform from Azure to AWS. The platform currently runs:

- **22 Microservices** (auth, user, matching, messaging, media, payment, notification, analytics, moderation, admin, advertising, automation, workflow-engine, realtime, api-gateway, AI recommendation, dating coach, AI moderation, fraud detection, NLP, photo analysis, content generator)
- **AKS Cluster** with 3+ node pools (system, application, ML/GPU)
- **Azure PostgreSQL Flexible Server** (primary database)
- **Azure Cosmos DB** (MongoDB API for messages/real-time)
- **Azure Redis Cache** (sessions, caching, pub/sub)
- **Azure Blob Storage** (media files, photos, videos)
- **Azure Front Door + WAF** (CDN, security)
- **Azure Key Vault** (secrets management)
- **Azure Container Registry** (container images)
- **Azure Service Bus** (event-driven messaging)
- **Application Insights + Log Analytics** (monitoring)

---

## Compute & Containers

### AKS to EKS

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Azure Kubernetes Service (AKS) | Amazon Elastic Kubernetes Service (EKS) | |
| **Cluster Name** | `flamoral-prod-aks` | `flamoral-prod-eks` | |
| **Resource Group** | `flamoral-prod-rg` | N/A (use tags) | |
| **Node Pools** | System, App, ML (GPU) | Managed Node Groups | |
| **GPU Support** | NVIDIA nodes for AI services | `p3.2xlarge` or `g4dn.xlarge` | |

#### Feature Parity Assessment

| Feature | Azure AKS | AWS EKS | Parity |
|---------|-----------|---------|--------|
| Managed Control Plane | Yes | Yes | Full |
| Auto-scaling (Cluster) | Cluster Autoscaler | Karpenter / Cluster Autoscaler | Full |
| Pod Identity | Azure AD Pod Identity | IRSA (IAM Roles for Service Accounts) | Full |
| VNet Integration | VNet-integrated | VPC CNI | Full |
| Private Cluster | Private AKS | Private EKS | Full |
| GPU Node Pools | NCv3, NCasT4_v3 | p3, p4d, g4dn, g5 | Full |
| Spot/Preemptible | Spot VMs | Spot Instances | Full |
| Windows Nodes | Supported | Supported | Full |
| Service Mesh | Azure Service Mesh (Istio) | AWS App Mesh / Istio | Full |

#### Migration Complexity: **MEDIUM**

**Migration Strategy:**
1. Export Kubernetes manifests from AKS (already in YAML format in `/infrastructure/kubernetes/`)
2. Adapt Azure-specific annotations to AWS equivalents
3. Replace Azure CSI drivers with EBS/EFS CSI drivers
4. Update Pod Identity from Azure AD to IRSA
5. Migrate Ingress from Azure Application Gateway to AWS ALB Ingress Controller

**Rollback Considerations:**
- Keep AKS cluster running during migration (blue-green)
- DNS cutover can be reverted within TTL window
- Container images are portable - no code changes needed

**Data Migration Strategy:**
- StatefulSets (Redis, PostgreSQL in-cluster): Use velero for backup/restore
- ConfigMaps/Secrets: Export and re-apply with External Secrets Operator

---

### ACR to ECR

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Azure Container Registry | Amazon Elastic Container Registry | |
| **Registry Name** | `flamoralprodacr.azurecr.io` | `<account>.dkr.ecr.<region>.amazonaws.com` | |
| **SKU/Tier** | Premium | Private Registry | |
| **Image Count** | 22+ service images | Same | |

#### Feature Parity Assessment

| Feature | Azure ACR | AWS ECR | Parity |
|---------|-----------|---------|--------|
| Private Registry | Yes | Yes | Full |
| Geo-Replication | Premium SKU | Cross-region replication | Full |
| Image Scanning | Qualys/Trivy | Amazon Inspector | Full |
| Content Trust | Yes | Cosign/Sigstore | Full |
| Lifecycle Policies | Yes | Yes | Full |
| Helm Chart Repository | Yes (OCI) | Yes (OCI) | Full |
| Image Signing | Notation | Cosign (OIDC) | Full |

#### Migration Complexity: **LOW**

**Migration Strategy:**
```bash
# For each image in ACR:
az acr login --name flamoralprodacr
docker pull flamoralprodacr.azurecr.io/<service>:<tag>
docker tag flamoralprodacr.azurecr.io/<service>:<tag> <account>.dkr.ecr.<region>.amazonaws.com/<service>:<tag>
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker push <account>.dkr.ecr.<region>.amazonaws.com/<service>:<tag>
```

**Cost Comparison:**
- Azure ACR Premium: ~$1.667/day + storage
- AWS ECR: ~$0.10/GB/month storage + $0.09/GB transfer
- ECR generally 20-30% cheaper for similar workloads

---

### Azure Container Instances to ECS Fargate

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Azure Container Instances | ECS Fargate | Serverless containers |
| **Use Case** | Background jobs, one-off tasks | Same | |

#### Feature Parity Assessment

| Feature | Azure ACI | AWS Fargate | Parity |
|---------|-----------|-------------|--------|
| Serverless Containers | Yes | Yes | Full |
| GPU Support | Limited | Yes (ECS) | Better on AWS |
| VNet Integration | Yes | Yes | Full |
| Spot Pricing | N/A | Fargate Spot | Better on AWS |
| Max vCPU | 4 | 16 | Better on AWS |

#### Migration Complexity: **LOW**

---

## Databases

### PostgreSQL Flexible Server to RDS/Aurora

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Azure Database for PostgreSQL Flexible Server | Amazon RDS PostgreSQL / Aurora PostgreSQL | |
| **Version** | PostgreSQL 16 | PostgreSQL 16 | |
| **Size** | Standard_D4s_v3 (4 vCPU, 16GB) | db.r6g.xlarge (4 vCPU, 32GB) | |
| **Storage** | 100GB Premium SSD | gp3 or io2 | |
| **High Availability** | Zone-redundant | Multi-AZ | |

#### Feature Parity Assessment

| Feature | Azure PostgreSQL | AWS RDS/Aurora | Parity |
|---------|------------------|----------------|--------|
| Managed Service | Yes | Yes | Full |
| Auto Failover | Zone-redundant HA | Multi-AZ | Full |
| Read Replicas | Up to 10 | Up to 15 (Aurora) | Better on AWS |
| Point-in-time Recovery | Yes | Yes | Full |
| Auto Storage Scaling | Yes | Yes | Full |
| Major Version Upgrade | Yes | Yes | Full |
| PgBouncer | Built-in | Requires RDS Proxy | Azure has edge |
| Serverless | Burstable tier | Aurora Serverless v2 | Full |
| Global Database | Geo-replication | Aurora Global Database | Better on AWS |

#### Migration Complexity: **HIGH**

**Data Migration Strategy:**

**Option 1: AWS DMS (Recommended for Zero-Downtime)**
```
Source: Azure PostgreSQL Flexible Server (SSL enabled)
Target: RDS PostgreSQL or Aurora
Migration Type: Full load + CDC (Change Data Capture)
```

**Option 2: pg_dump/pg_restore (Downtime Required)**
```bash
# Export from Azure
pg_dump -h <azure-host>.postgres.database.azure.com -U datingappadmin -d dating_app_production -Fc > backup.dump

# Import to AWS
pg_restore -h <rds-endpoint>.rds.amazonaws.com -U admin -d dating_app_production backup.dump
```

**Recommended: Aurora PostgreSQL**
- Better read replica scaling (up to 15)
- Faster failover (30 seconds vs 60+ seconds)
- Global Database for disaster recovery
- Aurora Serverless v2 for variable workloads

**Rollback Considerations:**
- Keep Azure PostgreSQL as read replica during transition
- Use AWS DMS for reverse replication if needed
- Application connection strings are the only code change

**Security Considerations:**
- Enable encryption at rest (AWS KMS)
- Enable encryption in transit (SSL/TLS required)
- Use IAM database authentication where possible
- VPC security groups (no public access)
- Enable audit logging to CloudWatch

**Cost Comparison:**
- Azure PostgreSQL Flexible (Standard_D4s_v3): ~$400/month
- AWS RDS PostgreSQL (db.r6g.xlarge): ~$350/month
- Aurora PostgreSQL (db.r6g.xlarge): ~$400/month (but better performance)

---

### Cosmos DB (MongoDB API) to DocumentDB/DynamoDB

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Azure Cosmos DB (MongoDB API) | Amazon DocumentDB or DynamoDB | |
| **API** | MongoDB 4.2 compatible | MongoDB 4.0 compatible (DocDB) | |
| **Use Cases** | Messages, real-time data, user activity | Same | |
| **RU/s** | Provisioned throughput | Provisioned capacity | |

#### Feature Parity Assessment

| Feature | Azure Cosmos DB | AWS DocumentDB | AWS DynamoDB | Notes |
|---------|-----------------|----------------|--------------|-------|
| MongoDB API | 4.2 compatible | 4.0 compatible | N/A | DocDB slightly behind |
| Global Distribution | Multi-region writes | Cross-region replication | Global Tables | Cosmos has edge |
| Consistency Levels | 5 levels | Session/eventual | Strong/eventual | Cosmos more flexible |
| Serverless | Yes | No | Yes | |
| Auto-scaling | Yes | Yes | On-demand | Full |
| Transactions | Yes | Yes | Yes | Full |
| Change Streams | Yes | Yes | DynamoDB Streams | Full |

#### Migration Complexity: **HIGH**

**Recommended Target: Amazon DocumentDB**
- Maintains MongoDB API compatibility
- Simpler migration path from Cosmos DB MongoDB API
- Less code changes required

**Alternative: DynamoDB**
- Better for high-scale read/write workloads
- Requires data model redesign
- Consider for specific use cases (sessions, activity logs)

**Data Migration Strategy:**

**For DocumentDB:**
```bash
# Export from Cosmos DB
mongodump --uri "mongodb://<cosmos-account>:<key>@<cosmos-account>.mongo.cosmos.azure.com:10255/<db>?ssl=true&replicaSet=globaldb" --out cosmos_backup

# Import to DocumentDB
mongorestore --uri "mongodb://<docdb-user>:<pass>@<docdb-cluster>.docdb.amazonaws.com:27017/?ssl=true&ssl_ca_certs=rds-combined-ca-bundle.pem&replicaSet=rs0" cosmos_backup
```

**Security Considerations:**
- TLS 1.2 required for DocumentDB
- VPC-only access (no public endpoints)
- IAM authentication supported
- Encryption at rest with KMS

**Cost Comparison:**
- Cosmos DB (400 RU/s, 10GB): ~$24/month base
- DocumentDB (db.r6g.large): ~$180/month (instance-based)
- DynamoDB (on-demand): Pay per request

---

### Redis Cache to ElastiCache Redis

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Azure Cache for Redis | Amazon ElastiCache Redis | |
| **Tier** | Premium P1 | cache.r6g.large | |
| **Size** | 6GB | 6.38GB | |
| **Cluster Mode** | Enabled | Enabled | |
| **Use Cases** | Sessions, caching, pub/sub, rate limiting | Same | |

#### Feature Parity Assessment

| Feature | Azure Redis | ElastiCache Redis | Parity |
|---------|-------------|-------------------|--------|
| Managed Service | Yes | Yes | Full |
| Cluster Mode | Yes | Yes | Full |
| Data Persistence | RDB + AOF | RDB + AOF | Full |
| Encryption at Rest | Yes | Yes | Full |
| Encryption in Transit | Yes | Yes | Full |
| Redis 7.x Support | Yes | Yes | Full |
| Auto-failover | Yes | Yes | Full |
| Global Datastore | Geo-replication | Global Datastore | Full |

#### Migration Complexity: **MEDIUM**

**Data Migration Strategy:**

**Option 1: RIOT (Redis Input/Output Tools)**
```bash
riot-redis -u redis://:password@azure-redis.redis.cache.windows.net:6380 \
  --tls \
  replicate \
  -u redis://:password@elasticache-cluster.cache.amazonaws.com:6379 \
  --tls
```

**Option 2: AWS DMS (Limited)**
- DMS supports Redis as target but not source
- Use for replication from RDS to ElastiCache

**Option 3: Application-Level Migration**
- For session data: Let sessions expire naturally
- For cache data: Cache warming on AWS side
- For pub/sub: No migration needed (ephemeral)

**Security Considerations:**
- Enable encryption in transit (TLS 1.2+)
- Enable encryption at rest
- Use AUTH token (password)
- VPC security groups only
- Enable Redis AUTH

**Cost Comparison:**
- Azure Redis Premium P1: ~$420/month
- ElastiCache cache.r6g.large: ~$200/month
- **40-50% cost savings on AWS**

---

## Storage

### Blob Storage to S3

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Azure Blob Storage | Amazon S3 | |
| **Account** | `flamoralprodstore` | `flamoral-prod-media` | |
| **Containers** | photos, videos, documents | S3 buckets | |
| **Tier** | Hot, Cool, Archive | Standard, IA, Glacier | |
| **CDN** | Azure CDN + Front Door | CloudFront | |

#### Feature Parity Assessment

| Feature | Azure Blob | Amazon S3 | Parity |
|---------|------------|-----------|--------|
| Object Storage | Yes | Yes | Full |
| Tiered Storage | Hot/Cool/Archive | Standard/IA/Glacier | Full |
| Lifecycle Policies | Yes | Yes | Full |
| Versioning | Yes | Yes | Full |
| Cross-Region Replication | Yes | Yes | Full |
| Server-Side Encryption | AES-256, CMK | SSE-S3, SSE-KMS | Full |
| Signed URLs | SAS Tokens | Pre-signed URLs | Full |
| Event Notifications | Event Grid | S3 Event Notifications | Full |
| Static Website Hosting | Yes | Yes | Full |
| Object Lock (WORM) | Immutable blobs | S3 Object Lock | Full |

#### Migration Complexity: **MEDIUM-HIGH** (due to volume)

**Data Migration Strategy:**

**Option 1: AWS DataSync (Recommended)**
```bash
# Create DataSync agent in Azure
# Configure Azure Blob as source location
# Configure S3 as destination
# Run sync task with verification
```

**Option 2: AzCopy + AWS CLI**
```bash
# Export from Azure
azcopy copy "https://flamoralprodstore.blob.core.windows.net/photos/*" "./local_backup" --recursive

# Import to S3
aws s3 sync ./local_backup s3://flamoral-prod-media/photos/
```

**Option 3: Rclone (Cross-cloud)**
```bash
rclone sync azure:photos s3:flamoral-prod-media/photos --progress
```

**Estimated Data Volume:**
- Photos: ~500GB (estimated)
- Videos: ~1TB (estimated)
- Documents: ~50GB (estimated)
- **Total: ~1.5TB**

**Security Considerations:**
- Enable S3 bucket policies (no public access by default)
- Enable server-side encryption (SSE-KMS recommended)
- Enable bucket versioning
- Enable access logging
- Use CloudFront for CDN (origin access control)
- Enable S3 Object Lock for compliance

**Cost Comparison:**
- Azure Blob Hot (1.5TB): ~$31.50/month
- S3 Standard (1.5TB): ~$34.50/month
- Similar pricing, S3 slightly more with requests

---

### Azure File Storage to EFS

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Azure Files Premium | Amazon EFS | |
| **Protocol** | SMB 3.0, NFS 4.1 | NFS 4.1 | |
| **Use Case** | Shared volumes for pods | Same | |
| **Storage Class** | `azure-file-premium` | `efs-sc` | |

#### Feature Parity Assessment

| Feature | Azure Files | Amazon EFS | Parity |
|---------|-------------|------------|--------|
| NFS Support | Yes | Yes | Full |
| SMB Support | Yes | FSx for Windows | Partial |
| Kubernetes CSI | Yes | Yes | Full |
| Elastic Capacity | Premium only | Always | Better on AWS |
| Throughput Modes | Provisioned | Bursting/Provisioned | Full |
| Lifecycle Management | Limited | EFS Intelligent-Tiering | Better on AWS |

#### Migration Complexity: **LOW**

**Migration Strategy:**
1. Deploy EFS CSI driver to EKS
2. Create EFS file system in same VPC
3. Create new StorageClass for EFS
4. Mount EFS in pods (ReadWriteMany)
5. Copy data using rsync or AWS DataSync

---

## Identity & Security

### Azure AD B2C to Cognito User Pools

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Azure AD B2C | Amazon Cognito User Pools | |
| **Users** | End users (dating app) | Same | |
| **Auth Flows** | OAuth 2.0, OIDC, Social | OAuth 2.0, OIDC, Social | |
| **MFA** | SMS, Authenticator | SMS, TOTP, Push | |

#### Feature Parity Assessment

| Feature | Azure AD B2C | Cognito | Parity |
|---------|--------------|---------|--------|
| User Registration | Yes | Yes | Full |
| Social Login | Google, Facebook, Apple | Google, Facebook, Apple, Amazon | Full |
| MFA | Yes | Yes | Full |
| Custom UI | Yes (HTML/CSS) | Hosted UI / Custom | Full |
| Custom Policies | Yes (IEF) | Lambda Triggers | Different approach |
| User Migration | Bulk import | Bulk import + migration triggers | Full |
| Password Policies | Yes | Yes | Full |
| Email/SMS Verification | Yes | Yes | Full |
| JWT Tokens | Yes | Yes | Full |

#### Migration Complexity: **HIGH**

**User Migration Strategy:**

**Option 1: Bulk Export/Import**
```bash
# Export from Azure AD B2C (Graph API)
# Note: Passwords cannot be exported

# Import to Cognito (AdminCreateUser API)
# Users must reset passwords or use migration trigger
```

**Option 2: Seamless Migration with Lambda Trigger**
```javascript
// Cognito User Migration Lambda
exports.handler = async (event) => {
  if (event.triggerSource === "UserMigration_Authentication") {
    // Authenticate against Azure AD B2C
    const azureUser = await authenticateWithAzure(event.userName, event.request.password);
    if (azureUser) {
      event.response.userAttributes = {
        email: azureUser.email,
        email_verified: "true",
        // ... other attributes
      };
      event.response.finalUserStatus = "CONFIRMED";
      event.response.messageAction = "SUPPRESS";
    }
  }
  return event;
};
```

**Security Considerations:**
- Enable MFA (recommend TOTP for all users)
- Configure password policies (min 8 chars, complexity)
- Enable advanced security features (compromised credentials)
- Use Cognito Identity Pools for AWS resource access
- Implement rate limiting

**Cost Comparison:**
- Azure AD B2C: $0.00325/MAU after 50K free
- Cognito: $0.0055/MAU after 50K free
- Cognito ~70% more expensive per MAU

---

### Key Vault to Secrets Manager + KMS

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Azure Key Vault | AWS Secrets Manager + KMS | |
| **Vault Name** | `production-dating-kv` | `flamoral-prod-secrets` | |
| **Secrets Count** | 40+ secrets | Same | |
| **Key Types** | RSA, EC | RSA, ECC, Symmetric | |

#### Feature Parity Assessment

| Feature | Azure Key Vault | AWS Secrets Manager | AWS KMS | Notes |
|---------|-----------------|---------------------|---------|-------|
| Secret Storage | Yes | Yes | N/A | Use Secrets Manager |
| Key Management | Yes | N/A | Yes | Use KMS |
| Auto Rotation | Yes | Yes (Lambda) | Yes (auto) | Full |
| Versioning | Yes | Yes | Yes | Full |
| Access Policies | RBAC + Vault policies | IAM | IAM | Full |
| HSM-backed | Premium SKU | KMS (AWS-managed HSM) | Full |
| Kubernetes Integration | CSI Driver | External Secrets Operator | Full |

#### Migration Complexity: **MEDIUM**

**Migration Strategy:**

Current secrets from `azure-keyvault-secretprovider.yaml`:
- Database credentials (DB_PASSWORD, DATABASE_URL, MONGODB_URI)
- Redis credentials (REDIS_PASSWORD, REDIS_URL)
- Auth secrets (JWT_SECRET, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET)
- Azure service secrets (need replacement)
- Payment secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
- Communication secrets (SENDGRID_API_KEY, TWILIO_AUTH_TOKEN)
- OAuth secrets (GOOGLE_CLIENT_SECRET, FACEBOOK_APP_SECRET, APPLE_PRIVATE_KEY)
- AI secrets (OPENAI_API_KEY)
- Monitoring secrets (SENTRY_DSN)

**Step-by-step:**
1. Create AWS Secrets Manager secrets via Terraform
2. Deploy External Secrets Operator to EKS
3. Configure SecretStore for AWS Secrets Manager
4. Update ExternalSecret resources to reference AWS
5. Remove Azure-specific secrets (storage keys, service bus)

**Terraform Example:**
```hcl
resource "aws_secretsmanager_secret" "database" {
  name = "flamoral/prod/database"
  kms_key_id = aws_kms_key.secrets.arn
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    host     = aws_rds_cluster.main.endpoint
    port     = 5432
    username = "admin"
    password = random_password.db.result
  })
}
```

**Security Considerations:**
- Use KMS customer managed keys (CMK)
- Enable automatic rotation where possible
- Use IAM roles (not access keys)
- Enable CloudTrail logging
- Use resource policies for cross-account access

**Cost Comparison:**
- Azure Key Vault: $0.03/10K operations + $1/key/month
- AWS Secrets Manager: $0.40/secret/month + $0.05/10K API calls
- AWS KMS: $1/key/month + $0.03/10K requests
- Slightly more expensive on AWS but better integration

---

### Azure AD to IAM Identity Center

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Azure AD (Entra ID) | IAM Identity Center (SSO) | |
| **Use Case** | Admin/developer access | Same | |
| **Federation** | SAML 2.0, OIDC | SAML 2.0, OIDC | |

#### Feature Parity Assessment

| Feature | Azure AD | IAM Identity Center | Parity |
|---------|----------|---------------------|--------|
| SSO to Cloud Console | Yes | Yes | Full |
| SAML Federation | Yes | Yes | Full |
| OIDC Federation | Yes | Yes | Full |
| MFA | Yes | Yes | Full |
| Conditional Access | Yes | Permission Sets + SCP | Different approach |
| Group-based Access | Yes | Yes | Full |
| CLI Access | Azure CLI | AWS CLI v2 SSO | Full |

#### Migration Complexity: **MEDIUM**

**Migration Strategy:**
1. Set up IAM Identity Center in AWS Organizations
2. Configure SAML federation with existing Azure AD (transitional)
3. Create permission sets matching Azure AD roles
4. Gradually migrate users to AWS SSO
5. Optional: Keep Azure AD as identity provider (SAML)

---

## Networking

### Front Door + WAF to CloudFront + WAF

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Azure Front Door Premium | Amazon CloudFront + WAF | |
| **Profile** | `flamoral-cdn` | `flamoral-distribution` | |
| **Domains** | flamoral.com, api.flamoral.com | Same | |
| **WAF Rules** | Custom + Managed (OWASP) | Custom + AWS Managed Rules | |

#### Feature Parity Assessment

| Feature | Azure Front Door | CloudFront + WAF | Parity |
|---------|------------------|------------------|--------|
| Global CDN | Yes | Yes | Full |
| Custom Domains | Yes | Yes | Full |
| Managed TLS | Yes | ACM | Full |
| WAF | Yes (Premium) | AWS WAF | Full |
| Bot Protection | Bot Manager Rule Set | AWS Bot Control | Full |
| DDoS Protection | Azure DDoS | AWS Shield | Full |
| Origin Failover | Yes | Yes | Full |
| Caching | Yes | Yes | Full |
| Real-time Metrics | Yes | CloudWatch | Full |
| Geo-blocking | Yes | Yes | Full |
| Rate Limiting | Custom Rules | Rate-based rules | Full |

#### Migration Complexity: **MEDIUM**

**WAF Rules Migration:**

Current Azure WAF rules from `waf-policy.bicep`:
1. **RateLimitAuth** - 100 req/min on /api/auth/login, /api/auth/register
2. **RateLimitAPI** - 1000 req/min on /api/*
3. **GeoBlocking** - Optional CN, RU, KP blocking
4. **BlockSuspiciousUserAgents** - sqlmap, nikto, nmap, etc.
5. **RequireUserAgent** - Block empty user-agent
6. **BlockSQLInjection** - union select, drop table, etc.
7. **BlockXSS** - script, javascript:, onerror, onload
8. **BlockPathTraversal** - ../, /etc/passwd, etc.
9. **BlockSensitiveFiles** - .env, .config, .git
10. **ProtectAdminEndpoints** - /admin requires Authorization
11. **BlockLargePayloads** - >10MB blocked
12. **Managed Rules** - Microsoft_DefaultRuleSet, BotManagerRuleSet

**AWS WAF Equivalent Rules:**
```hcl
resource "aws_wafv2_web_acl" "main" {
  name  = "flamoral-waf"
  scope = "CLOUDFRONT"

  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 1
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config { ... }
  }

  rule {
    name     = "AWS-AWSManagedRulesSQLiRuleSet"
    priority = 2
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config { ... }
  }

  rule {
    name     = "RateLimitAuth"
    priority = 10
    action { block {} }
    statement {
      rate_based_statement {
        limit              = 100
        aggregate_key_type = "IP"
        scope_down_statement {
          byte_match_statement {
            positional_constraint = "STARTS_WITH"
            search_string         = "/api/auth/"
            field_to_match { uri_path {} }
            text_transformation { priority = 0; type = "LOWERCASE" }
          }
        }
      }
    }
    visibility_config { ... }
  }
}
```

**Security Considerations:**
- Enable AWS Shield Standard (included)
- Consider AWS Shield Advanced for DDoS protection
- Enable WAF logging to S3/CloudWatch
- Use Origin Access Control (OAC) for S3 origins
- Enable TLS 1.2+ only
- HTTPS redirect at CloudFront level

**Cost Comparison:**
- Azure Front Door Premium: ~$35/month base + $0.01/GB
- CloudFront: $0.085/GB first 10TB + WAF $5/ACL/month
- Similar for moderate traffic, CloudFront cheaper at scale

---

### VNet to VPC

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Azure Virtual Network | Amazon VPC | |
| **CIDR** | 10.0.0.0/16 (assumed) | 10.0.0.0/16 | Match existing |
| **Subnets** | AKS, Database, Services | EKS, RDS, Application | |

#### Feature Parity Assessment

| Feature | Azure VNet | AWS VPC | Parity |
|---------|------------|---------|--------|
| Private Networking | Yes | Yes | Full |
| Subnets | Yes | Yes | Full |
| NAT Gateway | Yes | Yes | Full |
| Internet Gateway | Yes | Yes | Full |
| Peering | Yes | Yes | Full |
| Service Endpoints | Yes | VPC Endpoints | Full |
| Private Link | Yes | PrivateLink | Full |
| Network Security Groups | NSGs | Security Groups + NACLs | Full |
| DDoS Protection | Azure DDoS | AWS Shield | Full |
| DNS | Azure DNS Private Zones | Route 53 Private Hosted Zones | Full |

#### Migration Complexity: **LOW-MEDIUM**

**VPC Design:**
```
VPC: 10.0.0.0/16

Public Subnets (for ALB, NAT Gateway):
  - 10.0.1.0/24 (AZ-a)
  - 10.0.2.0/24 (AZ-b)
  - 10.0.3.0/24 (AZ-c)

Private Subnets (for EKS nodes):
  - 10.0.10.0/24 (AZ-a)
  - 10.0.11.0/24 (AZ-b)
  - 10.0.12.0/24 (AZ-c)

Database Subnets (for RDS):
  - 10.0.20.0/24 (AZ-a)
  - 10.0.21.0/24 (AZ-b)
  - 10.0.22.0/24 (AZ-c)
```

**Security Considerations:**
- Use NACLs for subnet-level stateless filtering
- Use Security Groups for instance-level stateful filtering
- Enable VPC Flow Logs
- Use VPC Endpoints for AWS services (S3, ECR, etc.)
- No public IPs on EKS nodes

---

### Private Link to PrivateLink

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Azure Private Link | AWS PrivateLink | |
| **Endpoints** | PostgreSQL, Redis, Storage, Key Vault | RDS, ElastiCache, S3, Secrets Manager | |

#### Migration Complexity: **LOW**

**VPC Endpoints to Create:**
- ECR (docker pulls)
- S3 (gateway endpoint - free)
- Secrets Manager
- CloudWatch Logs
- STS (for IRSA)

---

### Azure DNS to Route 53

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Azure DNS | Amazon Route 53 | |
| **Domain** | flamoral.com | flamoral.com | |
| **Zones** | Public + Private | Public + Private Hosted Zones | |

#### Feature Parity Assessment

| Feature | Azure DNS | Route 53 | Parity |
|---------|-----------|----------|--------|
| Public DNS | Yes | Yes | Full |
| Private DNS | Private Zones | Private Hosted Zones | Full |
| DNSSEC | Yes | Yes | Full |
| Health Checks | Traffic Manager | Route 53 Health Checks | Full |
| Geo Routing | Traffic Manager | Geolocation/Latency routing | Full |
| Failover | Yes | Yes | Full |
| Alias Records | Yes | Yes | Full |

#### Migration Complexity: **LOW**

**DNS Cutover Plan:**
1. Create Route 53 hosted zone for flamoral.com
2. Export Azure DNS records
3. Import records to Route 53
4. Lower TTLs to 60 seconds (24h before cutover)
5. Update domain registrar to Route 53 nameservers
6. Monitor DNS propagation
7. Restore TTLs after verification

**Security Considerations:**
- Enable DNSSEC
- Use Route 53 Resolver DNS Firewall
- Enable query logging

---

## Messaging & Real-Time

### SignalR to API Gateway WebSocket / AppSync

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Azure SignalR Service | API Gateway WebSocket / AppSync | |
| **Use Case** | Real-time messaging, presence | Same | |
| **Connections** | ~10K concurrent (est.) | Same | |

#### Feature Parity Assessment

| Feature | Azure SignalR | API GW WebSocket | AppSync | Notes |
|---------|---------------|------------------|---------|-------|
| WebSocket | Yes | Yes | Yes | Full |
| Pub/Sub | Yes | Via Lambda | Built-in | Full |
| Scaling | Auto | Auto | Auto | Full |
| Connection Management | Built-in | DIY (DynamoDB) | Built-in | AppSync easier |
| Message Ordering | Yes | Best effort | Yes | |
| Offline Support | No | No | Yes | AppSync has edge |

#### Migration Complexity: **HIGH**

**Recommended: API Gateway WebSocket + Lambda**
- More flexible than AppSync for custom protocols
- Better cost at high scale
- Requires connection management implementation

**Alternative: AWS AppSync**
- GraphQL-based
- Built-in subscriptions
- Better for new development

**Architecture Change:**
```
Current: Service -> SignalR -> Client
Target:  Service -> API GW WebSocket -> Lambda -> DynamoDB (connections) -> Client
```

**Code Changes Required:**
- Replace SignalR client SDK with native WebSocket
- Implement connection management
- Update real-time service (`realtime-service`)

---

### Service Bus to SQS/SNS/EventBridge

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Azure Service Bus | SQS + SNS + EventBridge | |
| **Queues** | matching, notifications, analytics, moderation, media_processing, email, sms | Same | |
| **Topics** | Event broadcasting | SNS Topics | |

#### Feature Parity Assessment

| Feature | Azure Service Bus | AWS SQS/SNS | EventBridge | Notes |
|---------|-------------------|-------------|-------------|-------|
| Queues | Yes | SQS | N/A | Full |
| Topics/Subscriptions | Yes | SNS | Yes | Full |
| Dead Letter Queue | Yes | Yes | Yes | Full |
| FIFO | Yes (Sessions) | SQS FIFO | N/A | Full |
| Message Scheduling | Yes | SQS Delay | Scheduler | Full |
| Large Messages | 100MB | 256KB (extended: 2GB) | 256KB | Azure has edge |
| Transactions | Yes | No | No | Azure has edge |
| Event Filtering | SQL filters | SNS filters | Pattern matching | Full |

#### Migration Complexity: **MEDIUM**

**Queue Mapping:**
| Azure Service Bus Queue | AWS Equivalent | Notes |
|-------------------------|----------------|-------|
| matching_queue | SQS Standard | High throughput |
| notification_queue | SQS Standard | |
| analytics_queue | SQS Standard | |
| moderation_queue | SQS Standard | |
| media_processing_queue | SQS Standard + S3 | Large payloads via S3 |
| email_queue | SQS Standard | |
| sms_queue | SQS Standard | |

**Architecture:**
```
Current: Services -> Service Bus -> Workers
Target:  Services -> SQS/SNS -> Lambda/Workers
```

**Code Changes:**
- Replace Azure Service Bus SDK with AWS SDK
- Update queue URLs and authentication
- Consider EventBridge for event-driven patterns

**Security Considerations:**
- Use SQS encryption (SSE-KMS)
- Use IAM roles for queue access
- Enable dead letter queues
- Set up CloudWatch alarms for queue depth

---

## Monitoring & Observability

### Application Insights to CloudWatch + X-Ray

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Application Insights | CloudWatch + X-Ray + CloudWatch RUM | |
| **APM** | Yes | X-Ray | |
| **Logs** | Log Analytics | CloudWatch Logs | |
| **Metrics** | Azure Monitor | CloudWatch Metrics | |
| **Dashboards** | Azure Dashboards | CloudWatch Dashboards | |

#### Feature Parity Assessment

| Feature | Application Insights | AWS Equivalent | Parity |
|---------|---------------------|----------------|--------|
| APM/Tracing | Yes | X-Ray | Full |
| Custom Metrics | Yes | CloudWatch Custom Metrics | Full |
| Log Analytics | Kusto (KQL) | CloudWatch Insights | Different query language |
| Live Metrics | Yes | CloudWatch Real-time | Full |
| Availability Tests | Yes | CloudWatch Synthetics | Full |
| Smart Detection | Yes | CloudWatch Anomaly Detection | Full |
| User Analytics | Yes | CloudWatch RUM | Full |
| Application Map | Yes | X-Ray Service Map | Full |
| Profiler | Yes | CodeGuru Profiler | Full |

#### Migration Complexity: **MEDIUM**

**Monitoring Stack Migration:**

Current stack (from K8s manifests):
- Prometheus (self-hosted) -> Keep on EKS or use Amazon Managed Prometheus
- Grafana (self-hosted) -> Keep on EKS or use Amazon Managed Grafana
- Jaeger (tracing) -> X-Ray or keep Jaeger
- Loki (logs) -> CloudWatch Logs or keep Loki
- Alertmanager -> CloudWatch Alarms + SNS

**Recommended Approach:**
1. **Metrics**: Amazon Managed Prometheus (AMP)
2. **Visualization**: Amazon Managed Grafana (AMG)
3. **Tracing**: AWS X-Ray (or keep Jaeger)
4. **Logs**: CloudWatch Logs (or Loki on EKS)
5. **Alerts**: CloudWatch Alarms -> SNS -> Slack/PagerDuty

**Instrumentation Changes:**
- Replace Application Insights SDK with:
  - AWS X-Ray SDK for tracing
  - CloudWatch agent for metrics
  - Fluent Bit for logs

**Cost Comparison:**
- Application Insights: $2.30/GB ingestion
- CloudWatch Logs: $0.50/GB ingestion
- CloudWatch Metrics: $0.30/metric/month
- X-Ray: $5/million traces
- **Potentially 50%+ savings on AWS**

---

### Log Analytics to CloudWatch Logs

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Log Analytics Workspace | CloudWatch Logs | |
| **Query Language** | KQL (Kusto) | CloudWatch Logs Insights | |
| **Retention** | 30 days | Configurable | |

#### Migration Complexity: **LOW**

**Log Shipping Options:**
1. **Fluent Bit** (recommended for EKS)
2. CloudWatch Agent
3. AWS Distro for OpenTelemetry (ADOT)

**Log Group Structure:**
```
/aws/eks/flamoral-prod/cluster
/flamoral/services/api-gateway
/flamoral/services/auth-service
/flamoral/services/user-service
...
```

---

### Azure Monitor Alerts to CloudWatch Alarms

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Service** | Azure Monitor Alerts | CloudWatch Alarms | |
| **Notifications** | Action Groups | SNS Topics | |

#### Migration Complexity: **LOW**

**Alert Examples:**
```hcl
resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  alarm_name          = "flamoral-api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5XXError"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_actions       = [aws_sns_topic.alerts.arn]
}
```

---

## CI/CD

### GitHub Actions (Azure-aware) to GitHub Actions (AWS-aware)

| Attribute | Azure (Current) | AWS (Target) | Notes |
|-----------|-----------------|--------------|-------|
| **Platform** | GitHub Actions | GitHub Actions | No change |
| **Registry** | ACR | ECR | Update login action |
| **Kubernetes** | AKS | EKS | Update kubeconfig |
| **Authentication** | Azure SP | OIDC Federation | More secure |

#### Migration Complexity: **LOW**

**Current Pipeline Features** (from `unified-pipeline.yml`):
- Build & Test
- Docker image builds (22 services)
- Container signing (cosign)
- SBOM generation (anchore)
- Helm deployment
- Rollback capability
- Infrastructure (Terraform)
- Mobile builds (Expo EAS)

**Changes Required:**

1. **Authentication:**
```yaml
# Current (Azure)
- name: Azure Login
  uses: azure/login@v2
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}

# Target (AWS with OIDC)
- name: Configure AWS Credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/github-actions-role
    aws-region: us-west-2
```

2. **Container Registry:**
```yaml
# Current (ACR)
- name: Login to ACR
  uses: azure/docker-login@v2
  with:
    login-server: flamoralprodacr.azurecr.io
    username: ${{ secrets.ACR_USERNAME }}
    password: ${{ secrets.ACR_PASSWORD }}

# Target (ECR)
- name: Login to ECR
  uses: aws-actions/amazon-ecr-login@v2
```

3. **Kubernetes:**
```yaml
# Current (AKS)
- name: Get AKS credentials
  run: az aks get-credentials --resource-group flamoral-prod-rg --name flamoral-prod-aks

# Target (EKS)
- name: Get EKS credentials
  run: aws eks update-kubeconfig --name flamoral-prod-eks --region us-west-2
```

**Security Considerations:**
- Use OIDC federation (no long-lived credentials)
- Restrict IAM role permissions (least privilege)
- Enable CloudTrail for API auditing
- Use Secrets Manager for sensitive values

---

## AI/ML Services

### Azure Cognitive Services to AWS AI Services

| Azure Service | AWS Equivalent | Current Use | Migration Notes |
|---------------|----------------|-------------|-----------------|
| Azure Face API | Amazon Rekognition | Photo verification | API change |
| Azure Content Moderator | Amazon Rekognition + Comprehend | Photo/text moderation | API change |
| Azure OpenAI Service | Amazon Bedrock | Dating coach, content gen | API change, model selection |
| Custom ML Models (GPU) | SageMaker Inference | Recommendation engine | Deploy to SageMaker |

#### Feature Parity Assessment

| Feature | Azure AI | AWS AI | Parity |
|---------|----------|--------|--------|
| Face Detection | Face API | Rekognition | Full |
| Face Verification | Face API | Rekognition | Full |
| Image Moderation | Content Moderator | Rekognition | Full |
| Text Moderation | Content Moderator | Comprehend | Full |
| LLMs (GPT-4) | Azure OpenAI | Bedrock (Claude, etc.) | Different models |
| Custom Models | Azure ML | SageMaker | Full |

#### Migration Complexity: **HIGH**

**AI Services Code Changes:**
1. Replace Azure Face API SDK with Rekognition SDK
2. Replace Content Moderator with Rekognition + Comprehend
3. Update AI service endpoints in ConfigMaps
4. Test model accuracy after migration

**GPU Workloads (from `ai-services.yaml`):**
- `ai-recommendation-service`: Uses NVIDIA GPU
- `ai-moderation-service`: Uses NVIDIA GPU

**EKS GPU Node Group:**
```hcl
resource "aws_eks_node_group" "gpu" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "gpu-workers"
  instance_types  = ["g4dn.xlarge"]  # NVIDIA T4

  labels = {
    "workload-type" = "ml"
    "nvidia.com/gpu" = "true"
  }

  taint {
    key    = "nvidia.com/gpu"
    value  = "true"
    effect = "NO_SCHEDULE"
  }
}
```

---

## Migration Risk Assessment

| Service Category | Complexity | Risk Level | Downtime Required | Estimated Duration |
|------------------|------------|------------|-------------------|-------------------|
| **Compute (AKS -> EKS)** | Medium | Medium | Minimal (blue-green) | 2-3 weeks |
| **Container Registry** | Low | Low | None | 1-2 days |
| **PostgreSQL** | High | High | 1-4 hours (DMS) | 1-2 weeks |
| **Cosmos DB -> DocumentDB** | High | High | 2-4 hours | 1-2 weeks |
| **Redis Cache** | Medium | Medium | 30 min - 2 hours | 1 week |
| **Blob Storage -> S3** | Medium | Low | None (sync) | 1-2 weeks |
| **Key Vault -> Secrets Manager** | Medium | Medium | None (parallel) | 1 week |
| **Azure AD B2C -> Cognito** | High | High | Migration period | 3-4 weeks |
| **Front Door -> CloudFront** | Medium | Medium | DNS cutover (minutes) | 1 week |
| **DNS** | Low | Medium | Propagation (24h) | 1 day |
| **SignalR -> WebSocket** | High | High | Code changes required | 2-3 weeks |
| **Service Bus -> SQS/SNS** | Medium | Medium | Code changes required | 1-2 weeks |
| **Monitoring** | Medium | Low | None (parallel) | 1-2 weeks |
| **CI/CD** | Low | Low | None (parallel) | 1 week |

**Total Estimated Duration: 8-12 weeks**

---

## Cost Comparison Summary

| Category | Azure Monthly | AWS Monthly | Difference |
|----------|---------------|-------------|------------|
| **AKS/EKS** (3 nodes) | ~$600 | ~$500 | -17% |
| **PostgreSQL** (Standard) | ~$400 | ~$350 | -12% |
| **Cosmos DB / DocumentDB** | ~$200 | ~$180 | -10% |
| **Redis Cache** | ~$420 | ~$200 | -52% |
| **Blob Storage / S3** | ~$50 | ~$55 | +10% |
| **Key Vault / Secrets Manager** | ~$20 | ~$30 | +50% |
| **Front Door / CloudFront** | ~$100 | ~$80 | -20% |
| **App Insights / CloudWatch** | ~$150 | ~$100 | -33% |
| **Service Bus / SQS+SNS** | ~$50 | ~$30 | -40% |
| **Azure AD B2C / Cognito** | ~$100 | ~$150 | +50% |
| **Total Estimate** | **~$2,090** | **~$1,675** | **-20%** |

**Note:** Actual costs depend on usage patterns, reserved instances, and specific configurations.

---

## Next Steps

1. **Phase 1 - Foundation (Weeks 1-2)**
   - Set up AWS accounts and IAM
   - Create VPC and networking
   - Deploy EKS cluster
   - Set up ECR and push images

2. **Phase 2 - Data (Weeks 3-4)**
   - Migrate PostgreSQL via DMS
   - Migrate Redis data
   - Sync S3 data
   - Set up Secrets Manager

3. **Phase 3 - Application (Weeks 5-6)**
   - Deploy services to EKS
   - Update configurations
   - Test functionality

4. **Phase 4 - Cutover (Weeks 7-8)**
   - DNS cutover
   - Monitor and stabilize
   - Decommission Azure resources

---

**Document Prepared For:** Terraform Module Generation (Phase 4)
**Target Terraform Modules:**
- `aws-eks-cluster`
- `aws-rds-aurora`
- `aws-documentdb`
- `aws-elasticache`
- `aws-s3-media`
- `aws-secrets-manager`
- `aws-cloudfront-waf`
- `aws-vpc-networking`
- `aws-route53`
- `aws-cognito`
- `aws-sqs-sns`
- `aws-cloudwatch-monitoring`
