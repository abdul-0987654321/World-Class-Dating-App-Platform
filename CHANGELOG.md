# Changelog

All notable changes to the Flamoral platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- Fixed CSP headers to remove unsafe-inline from script-src
- Added HSTS header for HTTPS enforcement
- Added pre-commit hooks for secret detection
- Fixed API gateway proxy to default to HTTPS
- Removed unsafe empty-string fallbacks for API keys
- Added env var validation for payment service

### Fixed
- Fixed silent error handling in message delivery, notification scheduling
- Added proper logging to empty catch blocks across services
- Fixed pagination limit from 100 to 50 to prevent DoS
- Fixed rate limits for profile photos and updates
- Fixed Nginx health check in docker-compose
- Standardized CI/CD to use npm instead of yarn

### Added
- Test infrastructure for 8+ previously untested services
- Security scanning in CI/CD pipeline
- CONTRIBUTING.md, DEVELOPMENT.md documentation
- Database migration directories for services missing them
- Keyboard navigation for swipe cards (accessibility)

### Changed
- Standardized React version to 18.3.1 across all packages
- Reduced profile photo upload rate limit to 9/hour

---

## [4.0.0] - 2025-12-30 (Production Release)

### Major Milestone: Production Ready

**Revenue Readiness Score: 100/100**
**Decision: GO - Production Ready**

### Infrastructure Migration: Azure to AWS

#### AWS Services Deployed
- **EKS (Elastic Kubernetes Service)** - Container orchestration
- **Aurora PostgreSQL** - Primary database with Serverless v2
- **ElastiCache Redis** - Caching and session management
- **S3** - Media storage with lifecycle policies
- **CloudFront + WAF** - CDN with security rules
- **Cognito** - User authentication and authorization
- **ECR** - Container registry for 22 microservices
- **Secrets Manager** - Centralized secrets with rotation
- **Route53** - DNS management with health checks
- **SQS/SNS** - Async messaging with dead-letter queues
- **CloudWatch + X-Ray** - Monitoring and distributed tracing
- **ACM** - SSL/TLS certificate management

#### Terraform Modules Created
- 14 AWS-native Terraform modules
- 3 environments (dev, staging, prod)
- 48+ Terraform configuration files
- State management with S3 + DynamoDB locking

### Security Fixes (9 Blockers Resolved)

1. **JWT Subscription Enforcement** - Tokens now include subscriptionTier
2. **Payment Route Authentication** - All payment endpoints secured
3. **CORS Hardening** - Removed wildcard fallback in production
4. **Usage Limit Enforcement** - Server-side tier-based limits
5. **Secret Rotation** - Rotation script and pre-commit hooks
6. **K8s Manifest Updates** - Migrated from Azure ACR to AWS ECR
7. **Email Verification** - Production template with verification enabled
8. **Production Configuration** - Complete .env.template created
9. **Security Guidance** - All .env.example files updated

### Added

#### Production Readiness
- `REVENUE_READINESS_REPORT.md` - Comprehensive assessment
- `GO_LIVE_SIGNOFF.md` - Deployment authorization document
- `scripts/rotate-secrets.sh` - Secret rotation automation
- `scripts/install-pre-commit-hook.sh` - Git security hooks
- `config/production/.env.template` - Production configuration

#### CI/CD Pipelines
- `aws-unified-pipeline.yml` - Complete AWS deployment workflow
- `terraform-guard.yml` - Infrastructure drift detection
- Docker multi-stage builds with SHA256 pinning
- Blue-green deployment strategies

#### Subscription System (6 Tiers)
- FREE - Basic features, limited likes (50/day)
- BASIC - 75 likes/day, 3 super likes
- PLUS - 100 likes/day, 5 super likes
- PREMIUM - Unlimited likes, 10 super likes, video calls
- PREMIUM_PLUS - All Premium + 15 super likes, priority matching
- ELITE - All features unlimited

#### Authentication & Security
- Two-Factor Authentication (TOTP, SMS, Email)
- Encrypted backup codes (bcrypt hashed)
- OAuth providers (Google, Apple, Facebook)
- Account lockout (5 attempts, 15-minute lockout)
- JWT RS256 with short expiry and refresh tokens

### Changed

- **Database**: Migrated from Azure PostgreSQL to Aurora PostgreSQL
- **Cache**: Migrated from Azure Redis to ElastiCache Redis
- **Storage**: Migrated from Azure Blob to AWS S3
- **CDN**: Migrated from Azure Front Door to CloudFront
- **DNS**: Migrated from Azure DNS to Route53
- **Secrets**: Migrated from Azure Key Vault to AWS Secrets Manager
- **Registry**: Migrated from Azure ACR to AWS ECR
- **Auth**: Migrated from Azure AD B2C to AWS Cognito

### Removed

- All Azure SDK dependencies
- Azure-specific configuration files
- Azure Terraform modules (archived)
- Azure Kubernetes manifests (archived)

---

## [3.0.0] - 2025-12-22

### Added
- Complete microservices architecture (20+ services)
- Winston logging across all services
- DTO validation with class-validator
- Comprehensive test coverage (200+ tests)

### Changed
- Replaced console.log with Winston logger
- Enhanced database integration across services
- Improved error handling patterns

---

## [2.0.0] - 2025-12-15

### Added
- AI/ML services (NLP, recommendation, fraud detection)
- Real-time features with WebSocket
- Admin dashboard
- Analytics service

---

## [1.0.0] - 2025-11-18

### Added - Phase 1: Monetization Features

#### Subscription System
- Four initial subscription tiers
- Stripe payment integration
- Webhook handlers for subscription events

#### Virtual Currency System
- Coin balance tracking
- Six coin packages with bonuses
- Transaction history

#### Profile Boost System
- Four boost products with visibility multipliers
- Real-time countdown display

#### Daily Limits System
- Redis-based limit enforcement
- Automatic daily reset

### Technical Infrastructure

#### Backend
- Microservices architecture
- Express.js REST APIs
- PostgreSQL with Knex.js migrations
- Redis for caching
- WebSocket support
- TypeScript throughout

#### Frontend
- React 18 with TypeScript
- Vite for fast development
- Redux Toolkit for state management
- React Router for navigation

---

## Migration Guides

### From v3.x to v4.0.0 (Azure to AWS)

1. **Update Terraform**
   ```bash
   cd infrastructure/terraform
   terraform init -reconfigure
   terraform plan -var-file=environments/prod/terraform.tfvars
   terraform apply
   ```

2. **Update Container Registry**
   - Change image references from `flamoralprodacr.azurecr.io` to `992382449461.dkr.ecr.us-east-1.amazonaws.com/dating-app`

3. **Rotate Secrets**
   ```bash
   ./scripts/rotate-secrets.sh
   ```

4. **Update DNS**
   - Point flamoral.com to CloudFront distribution

5. **Configure Stripe Webhooks**
   - Update webhook endpoint to new API Gateway URL

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 4.0.0 | 2025-12-30 | Production release, AWS migration complete |
| 3.0.0 | 2025-12-22 | Microservices architecture |
| 2.0.0 | 2025-12-15 | AI/ML services added |
| 1.0.0 | 2025-11-18 | Initial release |

---

## Contributors

- **Development Team:** Flamoral Engineering
- **AI Assistant:** Claude Code (Anthropic)
- **Infrastructure:** AWS Cloud

---

## Links

- **Repository:** https://github.com/oks-citadel/World-Class-Dating-App-Platform
- **Production:** https://flamoral.com
- **API:** https://api.flamoral.com
- **Documentation:** /docs

---

**For detailed implementation guides, see:**
- [Revenue Readiness Report](REVENUE_READINESS_REPORT.md)
- [Go-Live Signoff](GO_LIVE_SIGNOFF.md)
- [Terraform README](infrastructure/terraform/README.md)
