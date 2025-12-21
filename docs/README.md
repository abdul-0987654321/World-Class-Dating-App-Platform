# Flamoral Platform Documentation

Welcome to the Flamoral dating platform documentation.

**Last Updated:** 2025-12-21
**Version:** 3.1.0

---

## Authoritative Contract Documents

> **CRITICAL**: These documents are the source of truth. If code differs, either implement to match or update the contract with justification.

| Document | Description |
|----------|-------------|
| [API Inventory](./02-api/api-inventory.md) | Canonical endpoint and database contract |
| [OpenAPI Spec](./02-api/openapi.yaml) | Machine-readable API contract |
| [Non-Negotiables](./00-overview/non-negotiables.md) | Critical rules and SEV-1 definitions |
| [Runbooks](./05-reliability/runbooks.md) | SEV-1 incident response procedures |

---

## New Structured Documentation

### Overview (`docs/00-overview/`)
- [Platform Summary](./00-overview/platform-summary.md) - What is Flamoral
- [Glossary](./00-overview/glossary.md) - Standard terminology
- [Non-Negotiables](./00-overview/non-negotiables.md) - Critical rules
- [Claude Fix Everything Prompt](./00-overview/CLAUDE_FIX_EVERYTHING_PROMPT.md) - Enforcement prompt

### Architecture (`docs/01-architecture/`)
- [Platform Architecture](./01-architecture/platform-architecture.md) - System architecture
- [Service Boundaries](./01-architecture/service-boundaries.md) - Service ownership
- [Data Model](./01-architecture/data-model.md) - Database schema

### API (`docs/02-api/`)
- [API Inventory](./02-api/api-inventory.md) - All endpoints + database tables
- [OpenAPI Spec](./02-api/openapi.yaml) - OpenAPI 3.0 specification

### Security (`docs/03-security/`)
- [Threat Model](./03-security/threat-model.md) - Security threats and mitigations
- [Auth & RBAC](./03-security/auth-rbac.md) - Authentication and authorization

### Compliance (`docs/04-compliance/`)
- [Compliance Matrix](./04-compliance/compliance-matrix.md) - Regulatory requirements
- [Privacy & Consent](./04-compliance/privacy-and-consent.md) - Privacy controls

### Reliability (`docs/05-reliability/`)
- [Runbooks](./05-reliability/runbooks.md) - Incident response
- [SLO/SLA](./05-reliability/slo-sla.md) - Service level objectives

### Testing (`docs/06-testing/`)
- [Test Inventory](./06-testing/test-inventory.md) - Test coverage strategy

---

## Quick Start by Role

- **Developers** → [Development Setup](./development/setup.md)
- **DevOps** → [Azure Deployment](./deployment/azure-deployment.md)
- **Security** → [Security Overview](./security/security-overview.md)
- **Product** → [Product Requirements](./prd/PRD.md)
- **Testing** → [Testing Guide](./testing/README.md)

---

## Core Documentation

### Architecture
- **[Architecture Overview](./architecture/overview.md)** - System architecture (NEW)
- [Database Schema](./architecture/DATABASE_SCHEMA.md)

### Development
- **[Development Setup](./development/setup.md)** - Local environment setup (NEW)
- **[Contributing Guidelines](./development/contributing.md)** - How to contribute (NEW)
- [Development Inventory](./development/development-inventory.md)

### API Documentation  
- [API Inventory](./api/api-inventory.md) - All API endpoints
- [OpenAPI Specification](./api/openapi.yaml)

### Deployment
- **[Azure Deployment Guide](./deployment/azure-deployment.md)** - Deploy to Azure (NEW)
- [Deployment Checklist](./deployment/DEPLOYMENT_CHECKLIST.md)
- [Rollback Plan](./deployment/ROLLBACK_PLAN.md)

### Security
- **[Security Overview](./security/security-overview.md)** - Security practices (NEW)
- [OWASP Top 10 Checklist](./security-compliance/OWASP_TOP_10_CHECKLIST.md)
- [Penetration Testing Plan](./security-compliance/PENETRATION_TESTING_PLAN.md)
- [GDPR Privacy Audit](./security-compliance/GDPR_PRIVACY_AUDIT.md)

### Testing
- [Testing Guide](./testing/README.md)
- [Test Inventory](./testing/test-inventory.md)
- [Test Accounts](./TEST-ACCOUNTS.md)

### Operations
- [Operations Runbooks](./operations/)
- [Incident Response](./operations/INCIDENT_RESPONSE_RUNBOOK.md)
- [Launch Runbook](./operations/LAUNCH_RUNBOOK.md)

### Product
- [Product Requirements Document](./prd/PRD.md)
- [Platform Requirements](./Platform-Requirements.md)
- [Roadmap](./ROADMAP_MVP_TO_PRODUCTION.md)

---

## Platform Overview

### Microservices (18 Services)

**Core:**
- API Gateway, Auth Service, User Service
- Matching Service, Messaging Service, Media Service
- Notification Service, Payment Service, Analytics Service
- Moderation Service, Admin Service, Automation Service
- Realtime Service, Policy Service, Workflow Engine

**AI Services:**
- Dating Coach, Photo Analysis, Fraud Detection
- NLP Service, Recommendation Service (ML)

### Technology Stack

- **Frontend:** React 18, TypeScript, Redux Toolkit
- **Backend:** Node.js 20, NestJS, TypeScript
- **Databases:** PostgreSQL 16, MongoDB 7, Redis 7
- **Cloud:** Azure (Container Apps, Front Door, Key Vault)
- **CI/CD:** GitHub Actions, Docker

---

## Getting Started

### Developers

```bash
# Clone and install
git clone https://github.com/your-org/flamoral.git
cd flamoral && npm install

# Start local development
cd infrastructure/local-dev
docker-compose up -d
npm run dev:all
```

See [Development Setup](./development/setup.md) for details.

### DevOps

1. [Azure Deployment Guide](./deployment/azure-deployment.md)
2. [Deployment Checklist](./deployment/DEPLOYMENT_CHECKLIST.md)  
3. [Operations Runbooks](./operations/)

### Security Teams

1. [Security Overview](./security/security-overview.md)
2. [OWASP Top 10 Checklist](./security-compliance/OWASP_TOP_10_CHECKLIST.md)
3. [Incident Response Plan](./security-compliance/SECURITY_INCIDENT_RESPONSE_PLAN.md)

---

## Support

- **Team Chat:** Slack #flamoral-dev
- **Documentation:** This site
- **Issues:** GitHub Issues

---

## Recent Changes (v3.0.0 - 2025-12-18)

- Created consolidated [Architecture Overview](./architecture/overview.md)
- Created consolidated [Security Overview](./security/security-overview.md)
- Created [Development Setup Guide](./development/setup.md)
- Created [Contributing Guidelines](./development/contributing.md)
- Created [Azure Deployment Guide](./deployment/azure-deployment.md)
- Improved navigation and organization

---

**Version:** 3.0.0 | **Last Updated:** 2025-12-18
