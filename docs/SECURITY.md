# Security Documentation

## Table of Contents

1. [Security Architecture Overview](#security-architecture-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [Compliance](#compliance)
5. [Incident Response](#incident-response)
6. [Vulnerability Management](#vulnerability-management)
7. [Security Best Practices](#security-best-practices)
8. [Security Contacts](#security-contacts)

---

## Security Architecture Overview

### AWS Security Services

Our platform leverages multiple AWS security services to provide defense-in-depth protection across all infrastructure layers.

#### Amazon GuardDuty

GuardDuty provides intelligent threat detection and continuous monitoring for our AWS environment.

**Configuration:**
```yaml
# GuardDuty Configuration
guardduty:
  enabled: true
  finding_publishing_frequency: FIFTEEN_MINUTES
  datasources:
    s3_logs: true
    kubernetes_audit_logs: true
    malware_protection:
      ebs_volumes: true
    rds_login_events: true

  # Threat intelligence feeds
  threat_intel_sets:
    - name: "custom-threat-feed"
      format: TXT
      location: "s3://security-bucket/threat-intel/indicators.txt"
```

**Monitored Threat Types:**
- Unauthorized access attempts
- Cryptocurrency mining detection
- Data exfiltration patterns
- Malicious IP communication
- DNS-based attacks
- Credential compromise indicators

**Alert Severity Levels:**
| Severity | Response Time | Escalation Path |
|----------|---------------|-----------------|
| Critical (8.0-10.0) | Immediate | Security Lead + On-Call Engineer |
| High (7.0-7.9) | 15 minutes | Security Team |
| Medium (4.0-6.9) | 1 hour | Security Team |
| Low (1.0-3.9) | 24 hours | Security Review Queue |

#### AWS Security Hub

Security Hub aggregates security findings and provides a comprehensive view of our security posture.

**Enabled Standards:**
```json
{
  "security_standards": [
    {
      "name": "AWS Foundational Security Best Practices",
      "version": "1.0.0",
      "enabled": true
    },
    {
      "name": "CIS AWS Foundations Benchmark",
      "version": "1.4.0",
      "enabled": true
    },
    {
      "name": "PCI DSS",
      "version": "3.2.1",
      "enabled": true
    }
  ]
}
```

**Integration Points:**
- GuardDuty findings aggregation
- Inspector vulnerability reports
- IAM Access Analyzer alerts
- Firewall Manager compliance status
- Custom security findings from application layer

#### AWS WAF (Web Application Firewall)

WAF protects our API endpoints and web applications from common exploits.

**Rule Groups:**
```yaml
waf_configuration:
  web_acl:
    name: "flamoral-production-waf"
    default_action: ALLOW

    rules:
      # AWS Managed Rules
      - name: "AWSManagedRulesCommonRuleSet"
        priority: 1
        override_action: none

      - name: "AWSManagedRulesKnownBadInputsRuleSet"
        priority: 2
        override_action: none

      - name: "AWSManagedRulesSQLiRuleSet"
        priority: 3
        override_action: none

      - name: "AWSManagedRulesLinuxRuleSet"
        priority: 4
        override_action: none

      # Rate Limiting
      - name: "RateLimitRule"
        priority: 5
        action: BLOCK
        statement:
          rate_based_statement:
            limit: 2000
            aggregate_key_type: IP

      # Geo Restriction (if required)
      - name: "GeoRestriction"
        priority: 6
        action: BLOCK
        statement:
          geo_match_statement:
            country_codes:
              - "KP"  # North Korea
              - "IR"  # Iran
              - "CU"  # Cuba

      # Custom Rules
      - name: "BlockMaliciousUserAgents"
        priority: 7
        action: BLOCK
        statement:
          byte_match_statement:
            search_string: "sqlmap"
            field_to_match:
              single_header:
                name: "user-agent"
            text_transformations:
              - type: LOWERCASE
                priority: 0
```

**WAF Logging:**
```json
{
  "logging_configuration": {
    "log_destination_configs": [
      "arn:aws:s3:::flamoral-waf-logs"
    ],
    "redacted_fields": [
      {
        "single_header": {
          "name": "authorization"
        }
      }
    ]
  }
}
```

### Network Security

#### VPC Architecture

Our VPC design implements multiple layers of network isolation.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VPC (10.0.0.0/16)                           │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Public Subnets (DMZ)                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │
│  │  │ AZ-1        │  │ AZ-2        │  │ AZ-3        │         │   │
│  │  │ 10.0.1.0/24 │  │ 10.0.2.0/24 │  │ 10.0.3.0/24 │         │   │
│  │  │ NAT Gateway │  │ NAT Gateway │  │ NAT Gateway │         │   │
│  │  │ ALB         │  │ ALB         │  │ ALB         │         │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Private Subnets (Application)              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │
│  │  │ AZ-1        │  │ AZ-2        │  │ AZ-3        │         │   │
│  │  │ 10.0.11.0/24│  │ 10.0.12.0/24│  │ 10.0.13.0/24│         │   │
│  │  │ EKS Nodes   │  │ EKS Nodes   │  │ EKS Nodes   │         │   │
│  │  │ ECS Tasks   │  │ ECS Tasks   │  │ ECS Tasks   │         │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Private Subnets (Database)                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │
│  │  │ AZ-1        │  │ AZ-2        │  │ AZ-3        │         │   │
│  │  │ 10.0.21.0/24│  │ 10.0.22.0/24│  │ 10.0.23.0/24│         │   │
│  │  │ RDS Primary │  │ RDS Replica │  │ ElastiCache │         │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Security Groups

**Application Load Balancer Security Group:**
```hcl
resource "aws_security_group" "alb" {
  name        = "flamoral-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS from Internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP redirect"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description     = "To application layer"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.application.id]
  }

  tags = {
    Name = "flamoral-alb-sg"
  }
}
```

**Application Layer Security Group:**
```hcl
resource "aws_security_group" "application" {
  name        = "flamoral-app-sg"
  description = "Security group for application containers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "From ALB"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description     = "To database"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.database.id]
  }

  egress {
    description     = "To Redis"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.cache.id]
  }

  egress {
    description = "HTTPS to AWS services"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "flamoral-app-sg"
  }
}
```

**Database Security Group:**
```hcl
resource "aws_security_group" "database" {
  name        = "flamoral-db-sg"
  description = "Security group for RDS instances"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from application"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.application.id]
  }

  # No egress rules - database should not initiate connections

  tags = {
    Name = "flamoral-db-sg"
  }
}
```

#### Network Access Control Lists (NACLs)

**Public Subnet NACL:**
```hcl
resource "aws_network_acl" "public" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.public[*].id

  # Inbound Rules
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  # Outbound Rules
  egress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 65535
  }

  tags = {
    Name = "flamoral-public-nacl"
  }
}
```

---

## Authentication & Authorization

### JWT Token Flow

Our authentication system uses JWT (JSON Web Tokens) with RS256 asymmetric encryption.

#### Token Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │  Auth API   │     │  Services   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. Login Request  │                   │
       │ (email/password)  │                   │
       │──────────────────>│                   │
       │                   │                   │
       │ 2. Validate       │                   │
       │    Credentials    │                   │
       │                   │                   │
       │ 3. Generate Tokens│                   │
       │<──────────────────│                   │
       │ (access + refresh)│                   │
       │                   │                   │
       │ 4. API Request    │                   │
       │ (Bearer token)    │                   │
       │───────────────────│──────────────────>│
       │                   │                   │
       │                   │ 5. Validate Token │
       │                   │    (public key)   │
       │                   │                   │
       │ 6. Response       │                   │
       │<──────────────────│───────────────────│
       │                   │                   │
```

#### Token Structure

**Access Token (15-minute expiry):**
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key-2024-01"
  },
  "payload": {
    "sub": "user-uuid-here",
    "iat": 1704326400,
    "exp": 1704327300,
    "iss": "https://api.flamoral.com",
    "aud": "flamoral-services",
    "type": "access",
    "roles": ["user"],
    "permissions": ["read:profile", "write:profile", "read:matches"],
    "subscription_tier": "premium",
    "email_verified": true,
    "mfa_verified": true
  }
}
```

**Refresh Token (7-day expiry):**
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key-2024-01"
  },
  "payload": {
    "sub": "user-uuid-here",
    "iat": 1704326400,
    "exp": 1704931200,
    "iss": "https://api.flamoral.com",
    "type": "refresh",
    "jti": "unique-token-id",
    "family": "token-family-id"
  }
}
```

#### Token Validation Middleware

```typescript
// auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPublicKey } from '../services/key-management.service';

interface TokenPayload {
  sub: string;
  roles: string[];
  permissions: string[];
  subscription_tier: string;
  type: 'access' | 'refresh';
}

export const validateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded || typeof decoded === 'string') {
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

    // Fetch public key based on key ID
    const publicKey = await getPublicKey(decoded.header.kid);

    const payload = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://api.flamoral.com',
      audience: 'flamoral-services',
    }) as TokenPayload;

    if (payload.type !== 'access') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    req.user = {
      id: payload.sub,
      roles: payload.roles,
      permissions: payload.permissions,
      subscriptionTier: payload.subscription_tier,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};
```

### Role-Based Access Control (RBAC)

#### Role Hierarchy

```yaml
roles:
  super_admin:
    description: "Full system access"
    inherits: [admin]
    permissions:
      - "*"

  admin:
    description: "Administrative access"
    inherits: [moderator]
    permissions:
      - "admin:*"
      - "users:delete"
      - "users:ban"
      - "reports:resolve"
      - "analytics:view"

  moderator:
    description: "Content moderation"
    inherits: [support]
    permissions:
      - "content:moderate"
      - "reports:view"
      - "users:warn"
      - "messages:review"

  support:
    description: "Customer support"
    inherits: [user]
    permissions:
      - "tickets:manage"
      - "users:view"
      - "subscriptions:view"

  premium_user:
    description: "Premium subscription user"
    inherits: [user]
    permissions:
      - "matches:unlimited"
      - "messages:unlimited"
      - "profile:boost"
      - "profile:see_likes"

  user:
    description: "Standard authenticated user"
    permissions:
      - "profile:read"
      - "profile:write"
      - "matches:read"
      - "matches:swipe"
      - "messages:send"
      - "messages:read"
      - "reports:create"
```

#### Permission Check Middleware

```typescript
// rbac.middleware.ts
import { Request, Response, NextFunction } from 'express';

export const requirePermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userPermissions = req.user?.permissions || [];

    // Check for wildcard permission
    if (userPermissions.includes('*')) {
      next();
      return;
    }

    // Check for specific permission or wildcard in category
    const [category, action] = requiredPermission.split(':');
    const hasPermission = userPermissions.some(permission => {
      if (permission === requiredPermission) return true;
      if (permission === `${category}:*`) return true;
      return false;
    });

    if (!hasPermission) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Missing required permission: ${requiredPermission}`,
      });
      return;
    }

    next();
  };
};

export const requireRole = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRoles = req.user?.roles || [];

    const hasRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Required role: ${requiredRoles.join(' or ')}`,
      });
      return;
    }

    next();
  };
};
```

### API Key Management

#### API Key Structure

```typescript
interface ApiKey {
  id: string;
  key_hash: string;          // SHA-256 hash of the actual key
  key_prefix: string;        // First 8 characters for identification
  name: string;
  description: string;
  scopes: string[];          // Allowed API scopes
  rate_limit: number;        // Requests per minute
  created_at: Date;
  expires_at: Date | null;
  last_used_at: Date | null;
  created_by: string;        // User ID who created the key
  is_active: boolean;
  ip_whitelist: string[];    // Optional IP restrictions
}
```

#### API Key Generation

```typescript
// api-key.service.ts
import crypto from 'crypto';
import { ApiKey } from '../types';
import { ApiKeyRepository } from '../repositories/api-key.repository';

export class ApiKeyService {
  private readonly KEY_PREFIX = 'flm_';
  private readonly KEY_LENGTH = 32;

  async generateApiKey(
    userId: string,
    name: string,
    scopes: string[],
    options?: {
      expiresIn?: number;
      ipWhitelist?: string[];
      rateLimit?: number;
    }
  ): Promise<{ apiKey: string; keyRecord: ApiKey }> {
    // Generate cryptographically secure random key
    const randomBytes = crypto.randomBytes(this.KEY_LENGTH);
    const keyBody = randomBytes.toString('base64url');
    const apiKey = `${this.KEY_PREFIX}${keyBody}`;

    // Hash the key for storage
    const keyHash = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');

    const keyRecord: ApiKey = {
      id: crypto.randomUUID(),
      key_hash: keyHash,
      key_prefix: apiKey.substring(0, 12),
      name,
      description: '',
      scopes,
      rate_limit: options?.rateLimit || 100,
      created_at: new Date(),
      expires_at: options?.expiresIn
        ? new Date(Date.now() + options.expiresIn * 1000)
        : null,
      last_used_at: null,
      created_by: userId,
      is_active: true,
      ip_whitelist: options?.ipWhitelist || [],
    };

    await ApiKeyRepository.save(keyRecord);

    // Return the plain key only once - it cannot be retrieved again
    return { apiKey, keyRecord };
  }

  async validateApiKey(apiKey: string): Promise<ApiKey | null> {
    if (!apiKey.startsWith(this.KEY_PREFIX)) {
      return null;
    }

    const keyHash = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');

    const keyRecord = await ApiKeyRepository.findByHash(keyHash);

    if (!keyRecord || !keyRecord.is_active) {
      return null;
    }

    if (keyRecord.expires_at && keyRecord.expires_at < new Date()) {
      return null;
    }

    // Update last used timestamp
    await ApiKeyRepository.updateLastUsed(keyRecord.id);

    return keyRecord;
  }

  async revokeApiKey(keyId: string, userId: string): Promise<void> {
    const keyRecord = await ApiKeyRepository.findById(keyId);

    if (!keyRecord) {
      throw new Error('API key not found');
    }

    if (keyRecord.created_by !== userId) {
      throw new Error('Unauthorized to revoke this key');
    }

    await ApiKeyRepository.deactivate(keyId);
  }
}
```

---

## Data Protection

### Encryption at Rest

#### AWS Key Management Service (KMS)

**Key Hierarchy:**
```
┌────────────────────────────────────────────────────────┐
│                    AWS KMS                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Customer Master Key (CMK)              │   │
│  │  - Automatic yearly rotation                     │   │
│  │  - Multi-region replication                      │   │
│  └─────────────────┬───────────────────────────────┘   │
│                    │                                    │
│    ┌───────────────┼───────────────┐                   │
│    ▼               ▼               ▼                   │
│  ┌─────┐       ┌─────┐       ┌─────┐                  │
│  │ DEK │       │ DEK │       │ DEK │                  │
│  │ RDS │       │ S3  │       │ EBS │                  │
│  └─────┘       └─────┘       └─────┘                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**KMS Key Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Enable IAM User Permissions",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:root"
      },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "Allow RDS to use the key",
      "Effect": "Allow",
      "Principal": {
        "Service": "rds.amazonaws.com"
      },
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:GenerateDataKey*"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "kms:CallerAccount": "ACCOUNT_ID",
          "kms:ViaService": "rds.us-east-1.amazonaws.com"
        }
      }
    },
    {
      "Sid": "Allow S3 to use the key",
      "Effect": "Allow",
      "Principal": {
        "Service": "s3.amazonaws.com"
      },
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:GenerateDataKey*"
      ],
      "Resource": "*"
    }
  ]
}
```

#### S3 Bucket Encryption

```hcl
resource "aws_s3_bucket" "user_uploads" {
  bucket = "flamoral-user-uploads"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3_key.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

#### RDS Encryption

```hcl
resource "aws_db_instance" "main" {
  identifier = "flamoral-production"

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"

  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds_key.arn

  # Additional security settings
  deletion_protection     = true
  backup_retention_period = 30

  enabled_cloudwatch_logs_exports = [
    "postgresql",
    "upgrade"
  ]

  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.rds_key.arn
}
```

### Encryption in Transit

#### TLS 1.3 Configuration

**Application Load Balancer:**
```hcl
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

**Supported TLS Cipher Suites:**
```
TLS_AES_128_GCM_SHA256
TLS_AES_256_GCM_SHA384
TLS_CHACHA20_POLY1305_SHA256
```

**Internal Service Communication:**
```yaml
# Service mesh TLS configuration (Istio)
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: flamoral
spec:
  mtls:
    mode: STRICT

---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: default
  namespace: flamoral
spec:
  host: "*.flamoral.svc.cluster.local"
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

### PII Handling

#### Data Classification

| Classification | Examples | Handling Requirements |
|---------------|----------|----------------------|
| **Highly Sensitive** | SSN, Government ID, Financial data | Encrypted at rest and transit, access logging, strict access control |
| **Sensitive** | Email, Phone, Address, DOB | Encrypted at rest, masked in logs, role-based access |
| **Internal** | User preferences, App settings | Standard encryption, internal access only |
| **Public** | Username, Profile photo (public) | No special handling required |

#### PII Encryption Service

```typescript
// pii-encryption.service.ts
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';

export class PiiEncryptionService {
  private kmsClient: KMSClient;
  private keyId: string;

  constructor() {
    this.kmsClient = new KMSClient({ region: process.env.AWS_REGION });
    this.keyId = process.env.KMS_PII_KEY_ID!;
  }

  async encryptPii(plaintext: string): Promise<string> {
    const command = new EncryptCommand({
      KeyId: this.keyId,
      Plaintext: Buffer.from(plaintext),
      EncryptionContext: {
        purpose: 'pii-encryption',
        service: 'user-service',
      },
    });

    const response = await this.kmsClient.send(command);
    return Buffer.from(response.CiphertextBlob!).toString('base64');
  }

  async decryptPii(ciphertext: string): Promise<string> {
    const command = new DecryptCommand({
      CiphertextBlob: Buffer.from(ciphertext, 'base64'),
      EncryptionContext: {
        purpose: 'pii-encryption',
        service: 'user-service',
      },
    });

    const response = await this.kmsClient.send(command);
    return Buffer.from(response.Plaintext!).toString('utf8');
  }
}
```

#### Data Masking for Logs

```typescript
// log-masking.util.ts
const PII_PATTERNS = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]' },
  { pattern: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, replacement: '[SSN]' },
  { pattern: /\b\d{16}\b/g, replacement: '[CARD]' },
  { pattern: /"password"\s*:\s*"[^"]*"/gi, replacement: '"password":"[REDACTED]"' },
  { pattern: /"token"\s*:\s*"[^"]*"/gi, replacement: '"token":"[REDACTED]"' },
];

export function maskPii(input: string): string {
  let masked = input;
  for (const { pattern, replacement } of PII_PATTERNS) {
    masked = masked.replace(pattern, replacement);
  }
  return masked;
}
```

---

## Compliance

### GDPR Compliance Measures

#### Data Subject Rights Implementation

**Right to Access (Article 15):**
```typescript
// gdpr.service.ts
export class GdprService {
  async handleAccessRequest(userId: string): Promise<UserDataExport> {
    const userData = await this.collectAllUserData(userId);

    return {
      profile: userData.profile,
      preferences: userData.preferences,
      matches: userData.matches,
      messages: this.anonymizeOtherUsers(userData.messages),
      photos: userData.photos,
      activity_log: userData.activityLog,
      consent_records: userData.consentRecords,
      export_date: new Date().toISOString(),
      format_version: '1.0',
    };
  }

  private async collectAllUserData(userId: string): Promise<RawUserData> {
    const [profile, preferences, matches, messages, photos, activityLog, consents] =
      await Promise.all([
        this.userRepository.findById(userId),
        this.preferencesRepository.findByUserId(userId),
        this.matchRepository.findByUserId(userId),
        this.messageRepository.findByUserId(userId),
        this.photoRepository.findByUserId(userId),
        this.activityLogRepository.findByUserId(userId),
        this.consentRepository.findByUserId(userId),
      ]);

    return { profile, preferences, matches, messages, photos, activityLog, consents };
  }
}
```

**Right to Erasure (Article 17):**
```typescript
async handleErasureRequest(userId: string): Promise<ErasureResult> {
  const erasureId = crypto.randomUUID();

  // Log the erasure request
  await this.auditLog.record({
    action: 'GDPR_ERASURE_REQUEST',
    userId,
    erasureId,
    timestamp: new Date(),
  });

  // Delete data from all systems
  const results = await Promise.allSettled([
    this.userRepository.delete(userId),
    this.preferencesRepository.deleteByUserId(userId),
    this.matchRepository.deleteByUserId(userId),
    this.messageRepository.anonymizeByUserId(userId), // Anonymize, don't delete (other party's data)
    this.photoRepository.deleteByUserId(userId),
    this.activityLogRepository.deleteByUserId(userId),
    this.analyticsService.anonymizeUserData(userId),
    this.searchIndex.removeUser(userId),
    this.cacheService.invalidateUserCache(userId),
  ]);

  // Notify third-party processors
  await this.notifyDataProcessors(userId, erasureId);

  return {
    erasureId,
    status: 'completed',
    timestamp: new Date(),
    systems_processed: results.map((r, i) => ({
      system: this.systemNames[i],
      status: r.status,
    })),
  };
}
```

#### Consent Management

```typescript
interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  grantedAt: Date | null;
  revokedAt: Date | null;
  version: string;
  ipAddress: string;
  userAgent: string;
}

enum ConsentType {
  TERMS_OF_SERVICE = 'terms_of_service',
  PRIVACY_POLICY = 'privacy_policy',
  MARKETING_EMAIL = 'marketing_email',
  MARKETING_PUSH = 'marketing_push',
  ANALYTICS = 'analytics',
  LOCATION_TRACKING = 'location_tracking',
  PROFILE_VISIBILITY = 'profile_visibility',
}
```

### PCI-DSS for Payments

#### Scope Reduction

Our payment integration uses Stripe as a PCI-compliant payment processor, minimizing our PCI-DSS scope.

**Cardholder Data Flow:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Stripe    │     │  Our API    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. Card details   │                   │
       │   entered in      │                   │
       │   Stripe Elements │                   │
       │──────────────────>│                   │
       │                   │                   │
       │ 2. Payment Method │                   │
       │    ID returned    │                   │
       │<──────────────────│                   │
       │                   │                   │
       │ 3. PM ID sent to  │                   │
       │    our backend    │                   │
       │───────────────────│──────────────────>│
       │                   │                   │
       │                   │ 4. Create charge  │
       │                   │<──────────────────│
       │                   │                   │
       │                   │ 5. Charge result  │
       │                   │──────────────────>│
       │                   │                   │
       │ 6. Payment        │                   │
       │    confirmation   │                   │
       │<──────────────────│───────────────────│
       │                   │                   │
```

**What We Store:**
- Stripe Customer ID
- Payment Method ID (tokenized reference)
- Last 4 digits of card (for display)
- Card brand and expiry
- Transaction history

**What We NEVER Store:**
- Full card numbers (PAN)
- CVV/CVC codes
- Full magnetic stripe data
- PIN numbers

### SOC 2 Considerations

#### Trust Service Criteria Coverage

| Criteria | Implementation |
|----------|---------------|
| **Security** | WAF, encryption, access controls, vulnerability management |
| **Availability** | Multi-AZ deployment, auto-scaling, disaster recovery |
| **Processing Integrity** | Input validation, transaction logging, reconciliation |
| **Confidentiality** | Data classification, encryption, access controls |
| **Privacy** | GDPR compliance, consent management, data minimization |

#### Evidence Collection

```yaml
# Automated compliance evidence collection
compliance_automation:
  security_controls:
    - name: "Access Review"
      frequency: quarterly
      automation: aws_iam_access_analyzer

    - name: "Encryption Verification"
      frequency: continuous
      automation: aws_config_rules

    - name: "Vulnerability Scanning"
      frequency: weekly
      automation: aws_inspector

    - name: "Log Retention"
      frequency: continuous
      automation: cloudwatch_retention_policy

  audit_trails:
    - cloudtrail_logs
    - application_audit_logs
    - database_audit_logs
    - access_logs
```

---

## Incident Response

### Security Alert Handling

#### Severity Classification

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P1 - Critical** | Active breach, data exposure | Immediate (< 15 min) | Unauthorized data access, active intrusion |
| **P2 - High** | Potential breach, significant vulnerability | < 1 hour | Critical vulnerability discovered, suspicious activity |
| **P3 - Medium** | Security concern, non-critical issue | < 4 hours | Failed authentication spike, policy violation |
| **P4 - Low** | Minor security issue | < 24 hours | Configuration drift, minor vulnerability |

#### Incident Response Workflow

```
┌────────────────────────────────────────────────────────────────┐
│                    INCIDENT RESPONSE FLOW                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐                                               │
│  │  Detection  │  GuardDuty, Security Hub, WAF, Custom Alerts  │
│  └──────┬──────┘                                               │
│         ▼                                                       │
│  ┌─────────────┐                                               │
│  │   Triage    │  Classify severity, assign responder          │
│  └──────┬──────┘                                               │
│         ▼                                                       │
│  ┌─────────────┐                                               │
│  │ Containment │  Isolate affected systems, block threats      │
│  └──────┬──────┘                                               │
│         ▼                                                       │
│  ┌─────────────┐                                               │
│  │ Eradication │  Remove threat, patch vulnerabilities         │
│  └──────┬──────┘                                               │
│         ▼                                                       │
│  ┌─────────────┐                                               │
│  │  Recovery   │  Restore services, verify integrity           │
│  └──────┬──────┘                                               │
│         ▼                                                       │
│  ┌─────────────┐                                               │
│  │   Review    │  Post-incident analysis, documentation        │
│  └─────────────┘                                               │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

#### Automated Response Actions

```typescript
// incident-response.service.ts
export class IncidentResponseService {
  async handleGuardDutyFinding(finding: GuardDutyFinding): Promise<void> {
    const severity = finding.severity;

    // Log the finding
    await this.incidentLog.record({
      source: 'GuardDuty',
      findingId: finding.id,
      type: finding.type,
      severity,
      timestamp: new Date(),
    });

    // Automated responses based on finding type
    switch (finding.type) {
      case 'UnauthorizedAccess:IAMUser/MaliciousIPCaller':
        await this.blockIpAddress(finding.service.action.remoteIpDetails.ipAddressV4);
        await this.notifySecurityTeam(finding, 'P1');
        break;

      case 'Recon:EC2/PortProbeUnprotectedPort':
        await this.updateSecurityGroup(finding.resource.instanceDetails.instanceId);
        await this.notifySecurityTeam(finding, 'P3');
        break;

      case 'CryptoCurrency:EC2/BitcoinTool.B':
        await this.isolateInstance(finding.resource.instanceDetails.instanceId);
        await this.notifySecurityTeam(finding, 'P1');
        break;

      default:
        await this.notifySecurityTeam(finding, this.classifySeverity(severity));
    }
  }

  private async blockIpAddress(ip: string): Promise<void> {
    await this.wafService.addIpToBlockList(ip);
    await this.auditLog.record({
      action: 'AUTOMATED_IP_BLOCK',
      ip,
      timestamp: new Date(),
    });
  }

  private async isolateInstance(instanceId: string): Promise<void> {
    // Move instance to isolated security group
    await this.ec2Service.modifyInstanceAttribute({
      InstanceId: instanceId,
      Groups: [this.isolatedSecurityGroupId],
    });
  }
}
```

### Breach Notification Procedures

#### Notification Timeline

| Stakeholder | Timeline | Method |
|-------------|----------|--------|
| Internal Security Team | Immediate | PagerDuty, Slack |
| Executive Leadership | < 1 hour | Phone, Email |
| Legal Counsel | < 2 hours | Phone, Email |
| Affected Users (GDPR) | < 72 hours | Email, In-app notification |
| Supervisory Authority (GDPR) | < 72 hours | Official notification |
| Public Disclosure | As required | Press release, Blog post |

#### Breach Notification Template

```typescript
interface BreachNotification {
  incidentId: string;
  discoveredAt: Date;
  containedAt: Date | null;
  affectedUsers: number;
  dataTypesAffected: string[];
  description: string;
  mitigationSteps: string[];
  userRecommendations: string[];
  contactInformation: {
    email: string;
    phone: string;
    supportUrl: string;
  };
}
```

---

## Vulnerability Management

### Dependency Scanning

#### Automated Scanning Pipeline

```yaml
# .github/workflows/security-scan.yml
name: Security Scanning

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run npm audit
        run: |
          npm audit --audit-level=moderate

      - name: Run Snyk vulnerability scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'flamoral'
          path: '.'
          format: 'HTML'

      - name: Upload dependency check report
        uses: actions/upload-artifact@v3
        with:
          name: dependency-check-report
          path: reports/

  sast-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        with:
          languages: javascript, typescript

      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/secrets
            p/typescript
```

#### Vulnerability SLAs

| Severity | CVSS Score | Remediation SLA |
|----------|------------|-----------------|
| Critical | 9.0 - 10.0 | 24 hours |
| High | 7.0 - 8.9 | 7 days |
| Medium | 4.0 - 6.9 | 30 days |
| Low | 0.1 - 3.9 | 90 days |

### Container Image Scanning

#### ECR Image Scanning Configuration

```hcl
resource "aws_ecr_repository" "app" {
  name                 = "flamoral/app"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.ecr.arn
  }
}
```

#### Trivy Scanning in CI/CD

```yaml
container-scan:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Build Docker image
      run: docker build -t flamoral/app:${{ github.sha }} .

    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: 'flamoral/app:${{ github.sha }}'
        format: 'sarif'
        output: 'trivy-results.sarif'
        severity: 'CRITICAL,HIGH'

    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

    - name: Fail on critical vulnerabilities
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: 'flamoral/app:${{ github.sha }}'
        exit-code: '1'
        severity: 'CRITICAL'
```

### Penetration Testing Schedule

#### Annual Testing Calendar

| Quarter | Testing Type | Scope | Provider |
|---------|-------------|-------|----------|
| Q1 | External Penetration Test | Public-facing APIs, Web app | Third-party vendor |
| Q2 | Internal Penetration Test | Internal services, Network | Third-party vendor |
| Q3 | Mobile App Security Assessment | iOS, Android apps | Third-party vendor |
| Q4 | Red Team Exercise | Full scope | Third-party vendor |

#### Continuous Security Testing

```yaml
# Bug bounty program scope
bug_bounty:
  platform: HackerOne

  in_scope:
    - "*.flamoral.com"
    - "api.flamoral.com"
    - "Flamoral iOS App"
    - "Flamoral Android App"

  out_of_scope:
    - "Third-party services"
    - "Physical attacks"
    - "Social engineering"
    - "DDoS attacks"

  rewards:
    critical: "$5,000 - $15,000"
    high: "$1,500 - $5,000"
    medium: "$500 - $1,500"
    low: "$100 - $500"
```

---

## Security Best Practices

### Secure Development Guidelines

1. **Input Validation**: All user input must be validated and sanitized
2. **Output Encoding**: Encode output to prevent XSS attacks
3. **Parameterized Queries**: Use prepared statements for all database queries
4. **Least Privilege**: Services run with minimum required permissions
5. **Secure Defaults**: All configurations default to the most secure option
6. **Defense in Depth**: Multiple layers of security controls
7. **Fail Securely**: Errors should not expose sensitive information

### Secret Management

```typescript
// Secrets are never stored in code or configuration files
// Use AWS Secrets Manager or Parameter Store

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export async function getSecret(secretName: string): Promise<string> {
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);
  return response.SecretString!;
}
```

### Security Headers

```typescript
// security-headers.middleware.ts
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'strict-dynamic'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.flamoral.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' },
});
```

---

## Security Contacts

### Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

- **Email**: security@flamoral.com
- **Bug Bounty**: https://hackerone.com/flamoral
- **PGP Key**: Available at https://flamoral.com/.well-known/security.txt

### Security Team

| Role | Contact | On-Call |
|------|---------|---------|
| Security Lead | security-lead@flamoral.com | PagerDuty |
| Security Engineer | security-eng@flamoral.com | PagerDuty |
| Incident Commander | incident@flamoral.com | PagerDuty |

### External Resources

- AWS Security Documentation: https://docs.aws.amazon.com/security/
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- CIS Benchmarks: https://www.cisecurity.org/cis-benchmarks

---

*Last Updated: January 2026*
*Document Version: 1.0.0*
*Next Review: April 2026*
