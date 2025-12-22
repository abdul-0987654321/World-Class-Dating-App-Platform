# Flamoral Platform Documentation

**Version:** 4.0.0
**Last Updated:** 2025-12-22

---

## Quick Navigation

| Section | Description |
|---------|-------------|
| [00-overview](./00-overview/) | Platform summary, glossary, core principles |
| [01-architecture](./01-architecture/) | System design, data models, service boundaries |
| [02-api](./02-api/) | API inventory, OpenAPI specs, error handling |
| [03-security](./03-security/) | Authentication, authorization, threat model |
| [04-compliance](./04-compliance/) | GDPR, privacy, regulatory compliance |
| [05-reliability](./05-reliability/) | SLO/SLA, runbooks, incident response |
| [06-testing](./06-testing/) | Test inventory, testing strategy |
| [07-operations](./07-operations/) | Deployment, monitoring, operations |

---

## Authoritative Documents

> **CRITICAL**: These are the source of truth. If code differs, update the code or document changes.

| Document | Description |
|----------|-------------|
| [System Map](./01-architecture/SYSTEM_MAP.md) | Complete service architecture |
| [API Inventory](./02-api/API_INVENTORY.md) | All 150+ API endpoints |
| [OpenAPI Spec](./02-api/openapi-complete.yaml) | Machine-readable API contract |
| [Non-Negotiables](./00-overview/non-negotiables.md) | Critical rules and requirements |

---

## Documentation by Section

### 00-overview/
- **platform-summary.md** - Executive summary of Flamoral
- **non-negotiables.md** - Core requirements that must be maintained
- **glossary.md** - Platform terminology and definitions

### 01-architecture/
- **SYSTEM_MAP.md** - Complete service map with ports and dependencies
- **platform-architecture.md** - High-level architecture overview
- **service-boundaries.md** - Microservice boundaries and responsibilities
- **data-model.md** - Database entities and relationships
- **DATABASE_SCHEMA.md** - Detailed database schema
- **PRODUCT_SPECIFICATION.md** - Product requirements
- **adr/** - Architecture Decision Records

### 02-api/
- **API_INVENTORY.md** - Complete endpoint inventory (150+ endpoints)
- **openapi-complete.yaml** - Full OpenAPI 3.0 specification
- **WEBSOCKET_API.md** - Real-time messaging API
- **INTEGRATION_GUIDES.md** - Third-party integrations
- **errors/** - Error handling documentation
  - error-codes.md
  - api-contract.md
  - frontend-handling.md
  - backend-integration.md
- **dating-platform.postman_collection.json** - Postman collection

### 03-security/
- **authentication-architecture.md** - JWT, OAuth, session management
- **auth-rbac.md** - Role-based access control
- **threat-model.md** - Security threats and mitigations

### 04-compliance/
- **compliance-matrix.md** - Compliance requirements
- **privacy-and-consent.md** - GDPR, data protection

### 05-reliability/
- **slo-sla.md** - Service level objectives
- **runbooks.md** - Operational runbooks

### 06-testing/
- **test-inventory.md** - Test coverage and strategy

---

## Service Quick Reference

| Service | Port | Purpose |
|---------|------|---------|
| API Gateway | 4000 | Entry point, routing, auth verification |
| Auth Service | 3001 | Authentication, JWT, OAuth |
| User Service | 3002 | Profile management |
| Matching Service | 3003 | AI recommendations, swipes |
| Messaging Service | 5000 | Real-time messaging (Socket.io) |
| Payment Service | 3005 | Subscriptions, Stripe |
| Notification Service | 3008 | Push, email, SMS |
| Media Service | 3009 | Photo processing |
| Admin Service | 3010 | Admin dashboard |
| Analytics Service | 3007 | Event tracking |
| Moderation Service | 3012 | Content moderation |
| Advertising Service | 3011 | Ad management |
| Automation Service | 3013 | Workflow automation |

---

## Scripts & Tools

Located in `/scripts/`:

| Script | Purpose |
|--------|---------|
| `validate-traffic.sh` | Traffic flow validation |
| `test-harness.sh` | Automated test suite |
| `release-readiness-gate.sh` | Pre-deployment checks |
| `synthetic-monitoring.ts` | User journey validation |

---

## Quick Start by Role

### Developers
1. [System Map](./01-architecture/SYSTEM_MAP.md) - Understand architecture
2. [API Inventory](./02-api/API_INVENTORY.md) - All endpoints
3. [Error Codes](./02-api/errors/error-codes.md) - Error handling

### DevOps/SRE
1. [System Map](./01-architecture/SYSTEM_MAP.md) - Infrastructure
2. [Runbooks](./05-reliability/runbooks.md) - Incident response
3. [SLO/SLA](./05-reliability/slo-sla.md) - Service targets

### Security
1. [Authentication](./03-security/authentication-architecture.md) - Auth flow
2. [Threat Model](./03-security/threat-model.md) - Security threats
3. [Compliance](./04-compliance/compliance-matrix.md) - Regulatory

---

## Technology Stack

- **Frontend:** React 18, React Native, TypeScript
- **Backend:** Node.js 20, Express/NestJS, TypeScript
- **Databases:** PostgreSQL, Redis, MongoDB
- **Cloud:** Azure AKS, Azure PostgreSQL, Azure Redis
- **CI/CD:** GitHub Actions, Azure ACR

---

## Archive

Legacy documentation preserved in `archive/` for reference.

---

## Recent Changes

### v4.0.0 (2025-12-22)
- Reorganized documentation into clean numbered structure
- Added comprehensive [System Map](./01-architecture/SYSTEM_MAP.md)
- Added complete [API Inventory](./02-api/API_INVENTORY.md) with 150+ endpoints
- Archived legacy/duplicate documentation
- Created scripts for validation and monitoring

---

*Maintained by the Flamoral Platform Team*
