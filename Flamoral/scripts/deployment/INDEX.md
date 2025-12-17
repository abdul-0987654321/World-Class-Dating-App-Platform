# Deployment Scripts - Complete Index

## 📋 Table of Contents

1. [Scripts Overview](#scripts-overview)
2. [Quick Start](#quick-start)
3. [File Structure](#file-structure)
4. [Common Use Cases](#common-use-cases)
5. [Script Reference](#script-reference)

---

## Scripts Overview

**Total Files:** 16 (12 scripts + 4 documentation files)
**Total Lines:** ~5,000 lines of code and documentation
**Status:** ✅ Production Ready

### Script Categories

- **Core Deployment** (2): Main orchestration and service deployment
- **Advanced Strategies** (2): Blue-green and canary deployments
- **Database Management** (1): Migrations with rollback
- **Operations** (3): Rollback, health checks, scaling
- **Security** (2): Secret rotation, SSL management
- **Backup & Recovery** (2): Backup verification, disaster recovery

---

## Quick Start

### First Time Setup

```bash
# 1. Navigate to deployment directory
cd DatingPlatform/scripts/deployment

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your configuration

# 3. Ensure scripts are executable
chmod +x *.sh

# 4. Verify prerequisites
./deploy-all.sh --help
```

### Your First Deployment

```bash
# Test with dry run
./deploy-all.sh --env production --dry-run

# Deploy for real
./deploy-all.sh --env production --notification your@email.com
```

---

## File Structure

```
deployment/
├── Core Scripts
│   ├── deploy-all.sh              # Master deployment orchestration
│   └── deploy-service.sh          # Individual service deployment
│
├── Advanced Deployment Strategies
│   ├── blue-green-deploy.sh       # Zero-downtime blue-green
│   └── canary-deploy.sh           # Gradual canary rollout
│
├── Database Management
│   └── migrate-databases.sh       # Migrations with rollback
│
├── Operations
│   ├── rollback.sh                # Deployment rollback
│   ├── health-check.sh            # Health verification
│   └── scale-services.sh          # Service scaling
│
├── Security & Maintenance
│   ├── rotate-secrets.sh          # Credential rotation
│   └── ssl-renewal.sh             # SSL certificate management
│
├── Backup & Recovery
│   ├── backup-verify.sh           # Backup verification
│   └── disaster-recovery.sh       # DR procedures
│
└── Documentation
    ├── README.md                  # Complete documentation (70KB)
    ├── QUICK_REFERENCE.md         # Quick command reference
    ├── DEPLOYMENT_SUMMARY.md      # High-level overview
    ├── INDEX.md                   # This file
    └── .env.example               # Configuration template
```

---

## Common Use Cases

### 🚀 Standard Deployment
```bash
./deploy-all.sh --env production
```
→ See: [README.md - Standard Deployment](README.md#standard-production-deployment)

### 🔄 Zero-Downtime Update
```bash
./blue-green-deploy.sh --service api-gateway --image-tag v2.0.0
```
→ See: [README.md - Blue-Green Deployment](README.md#blue-green-deploysh)

### 🐛 Emergency Rollback
```bash
./rollback.sh --service api-gateway
```
→ See: [QUICK_REFERENCE.md - Emergency](QUICK_REFERENCE.md#emergency-procedures)

### 📊 Health Check
```bash
./health-check.sh --env production
```
→ See: [README.md - Health Checks](README.md#health-checksh)

### 💾 Database Migration
```bash
./migrate-databases.sh --env production
```
→ See: [README.md - Migrations](README.md#migrate-databasessh)

### 🔐 Rotate Secrets
```bash
./rotate-secrets.sh --key-vault flamoral-prod-kv
```
→ See: [README.md - Secret Rotation](README.md#rotate-secretssh)

### 📈 Scale for Traffic
```bash
./scale-services.sh --profile peak
```
→ See: [README.md - Scaling](README.md#scale-servicessh)

### 🆘 Disaster Recovery
```bash
./disaster-recovery.sh --verify-only
```
→ See: [README.md - DR](README.md#disaster-recoverysh)

---

## Script Reference

### deploy-all.sh
**Purpose:** Complete deployment orchestration
**Size:** 19KB | **Lines:** ~600
**Time:** 15-20 minutes
**Risk:** Low (with dry-run)

**Quick Commands:**
```bash
# Dry run
./deploy-all.sh --env production --dry-run

# Full deployment
./deploy-all.sh --env production

# Specific services
./deploy-all.sh --services user-service,api-gateway

# With notifications
./deploy-all.sh --notification ops@flamoral.com --slack-webhook URL
```

**Key Features:**
- ✅ Pre-deployment validation
- ✅ Infrastructure provisioning
- ✅ Database migrations
- ✅ Service deployments
- ✅ Post-deployment verification
- ✅ Email/Slack notifications

**Learn More:** [README.md - deploy-all.sh](README.md#1-deploy-allsh)

---

### deploy-service.sh
**Purpose:** Deploy single microservice
**Size:** 8.3KB | **Lines:** ~280
**Time:** 3-5 minutes
**Risk:** Low

**Quick Commands:**
```bash
# Basic deployment
./deploy-service.sh --service user-service

# With custom tag
./deploy-service.sh --service api-gateway --image-tag v1.2.3

# With custom replicas
./deploy-service.sh --service matching-service --replicas 10
```

**Key Features:**
- ✅ Docker build and push
- ✅ Kubernetes deployment
- ✅ Health verification
- ✅ Automatic backup

**Learn More:** [README.md - deploy-service.sh](README.md#2-deploy-servicesh)

---

### blue-green-deploy.sh
**Purpose:** Zero-downtime blue-green deployment
**Size:** 16KB | **Lines:** ~550
**Time:** 5-7 minutes
**Risk:** Very Low (instant rollback)

**Quick Commands:**
```bash
# Standard blue-green
./blue-green-deploy.sh --service api-gateway --image-tag v2.0.0

# Keep old version
./blue-green-deploy.sh --service user-service --image-tag v1.5.0 --no-cleanup
```

**Key Features:**
- ✅ Parallel deployment
- ✅ Smoke testing
- ✅ Traffic switching
- ✅ Instant rollback
- ✅ Zero downtime

**Learn More:** [README.md - blue-green-deploy.sh](README.md#3-blue-green-deploysh)

---

### canary-deploy.sh
**Purpose:** Gradual rollout with monitoring
**Size:** 7.3KB | **Lines:** ~250
**Time:** 10-15 minutes
**Risk:** Very Low (gradual)

**Quick Commands:**
```bash
# Start canary
./canary-deploy.sh --service api-gateway --image-tag v2.0.0

# Auto-promote
./canary-deploy.sh --service user-service --image-tag v1.5.0 --auto-promote
```

**Key Features:**
- ✅ Progressive rollout (10%→100%)
- ✅ Continuous monitoring
- ✅ Automatic rollback
- ✅ Manual gates

**Learn More:** [README.md - canary-deploy.sh](README.md#4-canary-deploysh)

---

### migrate-databases.sh
**Purpose:** Database migrations with safety
**Size:** 14KB | **Lines:** ~480
**Time:** 5-10 minutes
**Risk:** Low (auto-rollback)

**Quick Commands:**
```bash
# All migrations
./migrate-databases.sh --env production

# Specific service
./migrate-databases.sh --service user-service

# Dry run
./migrate-databases.sh --dry-run
```

**Key Features:**
- ✅ Automatic backups
- ✅ Transaction wrapping
- ✅ Auto-rollback
- ✅ Verification

**Learn More:** [README.md - migrate-databases.sh](README.md#5-migrate-databasessh)

---

### rollback.sh
**Purpose:** Quick deployment rollback
**Size:** 2.3KB | **Lines:** ~90
**Time:** 2-3 minutes
**Risk:** Low

**Quick Commands:**
```bash
# Rollback service
./rollback.sh --service api-gateway

# To specific revision
./rollback.sh --service user-service --revision 5

# All services
./rollback.sh --all
```

**Key Features:**
- ✅ Fast rollback
- ✅ Revision control
- ✅ Bulk operations
- ✅ Health verification

**Learn More:** [README.md - rollback.sh](README.md#6-rollbacksh)

---

### health-check.sh
**Purpose:** Comprehensive health verification
**Size:** 4.0KB | **Lines:** ~150
**Time:** 1-2 minutes
**Risk:** None (read-only)

**Quick Commands:**
```bash
# Check all services
./health-check.sh --env production

# Verbose mode
./health-check.sh --verbose

# Watch continuously
watch -n 30 './health-check.sh'
```

**Key Features:**
- ✅ Pod health
- ✅ Endpoint checks
- ✅ Metrics verification
- ✅ Clear reporting

**Learn More:** [README.md - health-check.sh](README.md#8-health-checksh)

---

### ssl-renewal.sh
**Purpose:** SSL certificate management
**Size:** 3.3KB | **Lines:** ~130
**Time:** 2-5 minutes
**Risk:** Low

**Quick Commands:**
```bash
# Check status
./ssl-renewal.sh --check-only

# Renew certificates
./ssl-renewal.sh
```

**Key Features:**
- ✅ Let's Encrypt integration
- ✅ Multi-domain support
- ✅ Auto-renewal
- ✅ Status monitoring

**Learn More:** [README.md - ssl-renewal.sh](README.md#10-ssl-renewalsh)

---

### rotate-secrets.sh
**Purpose:** Zero-downtime secret rotation
**Size:** 5.8KB | **Lines:** ~220
**Time:** 10-15 minutes
**Risk:** Medium (test first)

**Quick Commands:**
```bash
# Rotate all secrets
./rotate-secrets.sh --key-vault flamoral-prod-kv

# Dry run
./rotate-secrets.sh --key-vault flamoral-prod-kv --dry-run

# No restart
./rotate-secrets.sh --key-vault flamoral-prod-kv --no-restart
```

**Key Features:**
- ✅ Database passwords
- ✅ JWT secrets
- ✅ API keys
- ✅ Key Vault integration
- ✅ Automatic restart

**Learn More:** [README.md - rotate-secrets.sh](README.md#9-rotate-secretssh)

---

### backup-verify.sh
**Purpose:** Backup integrity verification
**Size:** 7.5KB | **Lines:** ~280
**Time:** 5-10 minutes
**Risk:** None (read-only)

**Quick Commands:**
```bash
# Verify recent backups
./backup-verify.sh --storage-account flamoralprodsa

# Check last 14 days
./backup-verify.sh --storage-account flamoralprodsa --days 14
```

**Key Features:**
- ✅ Existence checks
- ✅ Integrity validation
- ✅ Restore testing
- ✅ HTML reports

**Learn More:** [README.md - backup-verify.sh](README.md#11-backup-verifysh)

---

### disaster-recovery.sh
**Purpose:** Complete DR procedures
**Size:** 8.0KB | **Lines:** ~300
**Time:** 2-4 hours
**Risk:** High (DR event)

**Quick Commands:**
```bash
# Verify readiness
./disaster-recovery.sh --verify-only

# Execute DR
./disaster-recovery.sh --recovery-point 2025-12-10-14-30 --environment production
```

**Key Features:**
- ✅ DR readiness checks
- ✅ Regional failover
- ✅ Database restoration
- ✅ Service redeployment
- ✅ Verification

**Learn More:** [README.md - disaster-recovery.sh](README.md#7-disaster-recoverysh)

---

### scale-services.sh
**Purpose:** Dynamic service scaling
**Size:** 7.0KB | **Lines:** ~260
**Time:** 3-5 minutes
**Risk:** Low

**Quick Commands:**
```bash
# Peak traffic
./scale-services.sh --profile peak

# Maintenance mode
./scale-services.sh --profile maintenance

# Specific service
./scale-services.sh --service api-gateway --replicas 20
```

**Key Features:**
- ✅ Predefined profiles
- ✅ HPA adjustment
- ✅ Graceful scaling
- ✅ Resource monitoring

**Learn More:** [README.md - scale-services.sh](README.md#12-scale-servicessh)

---

## Documentation Files

### 📘 README.md (70KB)
**Complete comprehensive documentation**
- Full script reference with examples
- Deployment workflows and patterns
- Best practices and guidelines
- Troubleshooting guide
- Security considerations

→ [Open README.md](README.md)

---

### ⚡ QUICK_REFERENCE.md (5KB)
**Fast command reference**
- One-line commands for common tasks
- Emergency procedures
- Scheduled maintenance tasks
- Support contacts

→ [Open QUICK_REFERENCE.md](QUICK_REFERENCE.md)

---

### 📊 DEPLOYMENT_SUMMARY.md (20KB)
**High-level overview**
- Architecture decisions
- Integration points
- Performance characteristics
- Security measures

→ [Open DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)

---

### ⚙️ .env.example (10KB)
**Configuration template**
- All configurable options
- Azure settings
- Service configuration
- Security settings

→ [Open .env.example](.env.example)

---

## Getting Help

### Documentation
- Start with [README.md](README.md) for comprehensive documentation
- Use [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for quick commands
- Check [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) for architecture

### Script Help
All scripts have built-in help:
```bash
./script-name.sh --help
```

### Support Channels
- **Email:** ops@flamoral.com
- **Slack:** #ops-deployments
- **Emergency:** +1-555-0100

---

## Version History

**Version 1.0** (2025-12-11)
- ✅ Initial release
- ✅ 12 production-ready scripts
- ✅ Comprehensive documentation
- ✅ All deployment strategies implemented

---

## License

Copyright 2025 Flamoral Dating Platform. All rights reserved.

---

**Last Updated:** 2025-12-11
**Maintained By:** DevOps Team
**Status:** ✅ Production Ready
