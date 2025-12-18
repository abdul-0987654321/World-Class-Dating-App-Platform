# Flamoral Platform Documentation

Welcome to the Flamoral dating platform documentation. This guide provides comprehensive information about architecture, development, deployment, and operations.

## Quick Links

- [Product Requirements Document](./prd/PRD.md)
- [Architecture Overview](./architecture/ARCHITECTURE.md)
- [API Inventory](./api/api-inventory.md)
- [Development Inventory](./development/development-inventory.md)
- [Testing Inventory](./testing/test-inventory.md)
- [Security & Compliance](./security-compliance/)
- [Operations & Runbooks](./operations/)
- [Deployment Guide](./deployment/)

## Documentation Structure

### Product & Planning
- **[PRD](./prd/PRD.md)** - Product Requirements Document
- **[Platform Requirements](./Platform-Requirements.md)** - Complete feature requirements
- **[Roadmap](./ROADMAP_MVP_TO_PRODUCTION.md)** - MVP to Production roadmap
- **[Executive Summary](./Executive-Summary.md)** - High-level project overview
- **[Platform Operational Structure](./Platform-Operational-Structure.md)** - Business strategy
- **[Discovery & Research Phase](./Discovery-Research-Phase.md)** - Market research

### Architecture & Design
- **[Architecture](./architecture/)** - System architecture documentation
  - [Architecture Overview](./architecture/ARCHITECTURE.md)
  - [Database Schema](./architecture/DATABASE_SCHEMA.md)
  - [Product Specification](./architecture/PRODUCT_SPECIFICATION.md)
  - [Architectural Diagrams](./architecture/Architectural-Diagram.md)
- **[Tech Stack](./Tech-Stack.md)** - Technology choices and rationale
- **[Project Structure](./Project-Structure.md)** - Code organization
- **[Infrastructure Design](./INFRASTRUCTURE_DESIGN.md)** - Infrastructure architecture
- **[ADRs](./adr/)** - Architecture Decision Records
  - [0001 - Record Architecture Decisions](./adr/0001-record-architecture-decisions.md)
  - [0002 - Microservices Architecture](./adr/0002-microservices-architecture.md)
  - [0003 - Azure Infrastructure](./adr/0003-azure-infrastructure.md)
  - [0004 - Testing Strategy](./adr/0004-testing-strategy.md)
  - [0005 - Database Technology Selection](./adr/0005-database-technology-selection.md)

### API Documentation
- **[API Inventory](./api/api-inventory.md)** - Complete API endpoint inventory with implementation status
- **[API Reference](./api/API_REFERENCE_COMPLETE.md)** - Detailed API reference
- **[WebSocket API](./api/WEBSOCKET_API.md)** - Real-time communication API
- **[Integration Guides](./api/INTEGRATION_GUIDES.md)** - Third-party integration guides
- **[SDK Documentation](./api/SDK_DOCUMENTATION.md)** - Client SDK guides

### Development
- **[Development Inventory](./development/development-inventory.md)** - Complete service component inventory
- **[Development Guide](./deployment/DEV_GUIDE.md)** - Getting started with development
- **[Quick Start](./deployment/QUICK_START.md)** - Quick setup guide
- **[Docker Setup](./DOCKER-SETUP-INSTRUCTIONS.md)** - Docker environment setup

### Testing
- **[Test Inventory](./testing/test-inventory.md)** - Complete test coverage inventory
- **[Testing Guide](./TESTING_GUIDE.md)** - Testing strategy and guidelines
- **[Comprehensive Testing Guide](./COMPREHENSIVE_TESTING_GUIDE.md)** - Detailed testing procedures
- **[Quick Start Testing](./QUICK-START-TESTING.md)** - Test in 3 steps
- **[Test Accounts](./TEST-ACCOUNTS.md)** - Pre-created test user credentials
- **[End-to-End Verification](./END_TO_END_VERIFICATION_CHECKLIST.md)** - E2E verification checklist

### Security & Compliance
- **[Security Compliance](./security-compliance/)** - Security documentation
  - [Security Compliance Overview](./security-compliance/SECURITY_COMPLIANCE.md)
  - [OWASP Top 10 Checklist](./security-compliance/OWASP_TOP_10_CHECKLIST.md)
  - [Security Testing Tools](./security-compliance/SECURITY_TESTING_TOOLS.md)
  - [Security Test Cases](./security-compliance/SECURITY_TEST_CASES.md)
  - [Penetration Testing Plan](./security-compliance/PENETRATION_TESTING_PLAN.md)
  - [Vulnerability Disclosure Policy](./security-compliance/VULNERABILITY_DISCLOSURE_POLICY.md)
  - [Security Incident Response Plan](./security-compliance/SECURITY_INCIDENT_RESPONSE_PLAN.md)
  - [Security Hardening Guide](./security-compliance/SECURITY_HARDENING.md)
  - [GDPR Privacy Audit](./security-compliance/GDPR_PRIVACY_AUDIT.md)

### Operations & Runbooks
- **[Operations](./operations/)** - Operational documentation
  - [Launch Runbook](./operations/LAUNCH_RUNBOOK.md)
  - [Launch Day Checklist](./operations/LAUNCH_DAY_CHECKLIST.md)
  - [Incident Response Runbook](./operations/INCIDENT_RESPONSE_RUNBOOK.md)
  - [Database Failover Runbook](./operations/DATABASE_FAILOVER_RUNBOOK.md)
  - [Emergency Scaling Runbook](./operations/EMERGENCY_SCALING_RUNBOOK.md)
  - [Service Restart Procedures](./operations/SERVICE_RESTART_PROCEDURES.md)
  - [Network Troubleshooting Runbook](./operations/NETWORK_TROUBLESHOOTING_RUNBOOK.md)
  - [Data Recovery Runbook](./operations/DATA_RECOVERY_RUNBOOK.md)
  - [Deployment Guide](./operations/DEPLOYMENT_GUIDE.md)
  - [Infrastructure Guide](./operations/INFRASTRUCTURE_GUIDE.md)
  - [Migrations Guide](./operations/MIGRATIONS_GUIDE.md)
  - [Performance Optimization Guide](./operations/PERFORMANCE_OPTIMIZATION_GUIDE.md)

### Deployment
- **[Deployment](./deployment/)** - Deployment documentation
  - [Deployment Checklist](./deployment/DEPLOYMENT_CHECKLIST.md)
  - [Quick Reference](./deployment/QUICK_REFERENCE.md)
  - [Rollback Plan](./deployment/ROLLBACK_PLAN.md)
  - [Startup Guide](./deployment/STARTUP_GUIDE.md)
- **[Kubernetes Deployment](./KUBERNETES_DEPLOYMENT.md)** - K8s deployment guide
- **[Azure DevOps Setup](./azure-devops-setup.md)** - Azure DevOps configuration
- **[DNS Setup](./DNS_AND_DOMAIN_SETUP.md)** - Domain and DNS configuration

### CI/CD & Infrastructure
- **[CI/CD Implementation](./CI_CD_IMPLEMENTATION_SUMMARY.md)** - CI/CD pipeline overview
- **[CI/CD Pipelines](./CICD_PIPELINES.md)** - Detailed pipeline documentation
- **[CD Pipeline Guide](./CD_PIPELINE_GUIDE.md)** - Continuous deployment
- **[Service Principal Setup](./SERVICE_PRINCIPAL_SETUP.md)** - Azure service principals

### Services Documentation
- **[Services](./services/)** - Individual service documentation
  - [AI Services](./services/AI_SERVICES_README.md)
  - [ML Recommendations](./services/ML_RECOMMENDATION_README.md)
  - [Service-to-Service Auth](./services/SERVICE_TO_SERVICE_AUTH.md)
  - [WebSocket Integration](./services/WEBSOCKET_INTEGRATION.md)
  - [Rate Limiting](./services/RATE_LIMITING.md)
  - [Push Notifications](./services/PUSH_NOTIFICATIONS.md)
  - [Video Processing](./services/VIDEO_PROCESSING.md)
  - [Payment Webhooks](./services/WEBHOOK_INTEGRATION.md)
  - [Moderation Service](./services/MODERATION_SERVICE_DOCUMENTATION.md)

### User & Admin Guides
- **[Admin Training Guide](./ADMIN_TRAINING_GUIDE.md)** - Guide for administrators
- **[User Features Guide](./USER-FEATURES-GUIDE.md)** - End-user feature documentation
- **[User Guides](./user-guides/)** - Additional user documentation

### Specialized Features
- **[Advertising & Tracking](./advertising-tracking/)** - Ad platform documentation
  - [Quick Start Guide](./advertising-tracking/QUICK_START_GUIDE.md)
  - [Implementation Roadmap](./advertising-tracking/IMPLEMENTATION_ROADMAP.md)
  - [Cost Analysis](./advertising-tracking/COST_ANALYSIS.md)
- **[Messaging](./messaging-architecture.md)** - Messaging architecture
- **[Video Calling](./VIDEO_CALLING_IMPLEMENTATION.md)** - Video calling implementation

### Legal & Compliance
- **[Legal Documentation](./legal/)** - Legal and compliance documents

### Audit Reports & Status
- **[Audits](./audits/)** - Security and compliance audit reports
- **[Gap Analysis](./GAP_ANALYSIS_REPORT.md)** - Current implementation gaps
- **[Project Status](./PROJECT-STATUS.md)** - Overall project status
- **[Completion Summary](./COMPLETION-SUMMARY.md)** - Feature completion status
- **[Final Completion Report](./FINAL-COMPLETION-REPORT.md)** - Production readiness report

### Archive
- **[Archive](./archive/)** - Deprecated and historical documentation

## Getting Started

### For Developers
1. Read the [Architecture Overview](./architecture/ARCHITECTURE.md)
2. Follow the [Quick Start Guide](./deployment/QUICK_START.md)
3. Review the [Development Inventory](./development/development-inventory.md)
4. Check the [API Inventory](./api/api-inventory.md)
5. Set up your [Docker Environment](./DOCKER-SETUP-INSTRUCTIONS.md)

### For Testers
1. **[Quick Start Testing](./QUICK-START-TESTING.md)** - Test in 3 steps
2. **[Test Accounts](./TEST-ACCOUNTS.md)** - Login credentials
3. Review [Test Inventory](./testing/test-inventory.md)
4. Follow [Comprehensive Testing Guide](./COMPREHENSIVE_TESTING_GUIDE.md)
5. Run through [E2E Verification Checklist](./END_TO_END_VERIFICATION_CHECKLIST.md)

### For DevOps Engineers
1. Review [Infrastructure Design](./INFRASTRUCTURE_DESIGN.md)
2. Follow [Deployment Checklist](./deployment/DEPLOYMENT_CHECKLIST.md)
3. Familiarize with [Operations Runbooks](./operations/)
4. Study [CI/CD Implementation](./CI_CD_IMPLEMENTATION_SUMMARY.md)
5. Review [Kubernetes Deployment](./KUBERNETES_DEPLOYMENT.md)

### For Security Teams
1. Review [Security Compliance](./security-compliance/SECURITY_COMPLIANCE.md)
2. Check [OWASP Top 10 Checklist](./security-compliance/OWASP_TOP_10_CHECKLIST.md)
3. Review [Security Incident Response Plan](./security-compliance/SECURITY_INCIDENT_RESPONSE_PLAN.md)
4. Study [Penetration Testing Plan](./security-compliance/PENETRATION_TESTING_PLAN.md)
5. Review [Security Test Cases](./security-compliance/SECURITY_TEST_CASES.md)

### For Administrators
1. Read the [Admin Training Guide](./ADMIN_TRAINING_GUIDE.md)
2. Review [Launch Day Checklist](./operations/LAUNCH_DAY_CHECKLIST.md)
3. Familiarize with [Incident Response Runbook](./operations/INCIDENT_RESPONSE_RUNBOOK.md)
4. Study [Launch Runbook](./operations/LAUNCH_RUNBOOK.md)

### For Product Team
1. Read [Executive Summary](./Executive-Summary.md)
2. Review [Platform Requirements](./Platform-Requirements.md)
3. Check [Discovery & Research](./Discovery-Research-Phase.md)
4. Review [Final Completion Report](./FINAL-COMPLETION-REPORT.md)
5. Study [Roadmap](./ROADMAP_MVP_TO_PRODUCTION.md)

## Backend Services

The Flamoral platform consists of the following microservices:

- **Admin Service** - Administrative dashboard and management
- **Advertising Service** - Ad platform and tracking
- **AI Services** - AI-powered features
  - Dating Coach Service - AI dating advice
  - Fraud Detection - Fraud and fake profile detection
  - NLP Service - Natural language processing
  - Photo Analysis - Photo verification and analysis
  - Recommendation Service - ML-powered recommendations
- **Analytics Service** - User analytics and insights
- **API Gateway** - Central API gateway with rate limiting and routing
- **Auth Service** - Authentication and authorization
- **Automation Service** - Message automation and smart replies
- **Matching Service** - Matching algorithm and recommendations
- **Media Service** - Photo/video upload and processing
- **Messaging Service** - Real-time messaging with encryption
- **Moderation Service** - Content moderation and safety
- **Notification Service** - Push notifications and alerts
- **Payment Service** - Payments and subscriptions (Stripe integration)
- **Policy Service** - Platform policies and compliance
- **Realtime Service** - WebSocket connections and real-time events
- **User Service** - User profiles and preferences
- **Workflow Engine** - Business process automation

## Key Inventories

### API Endpoints
See [API Inventory](./api/api-inventory.md) for:
- Complete list of all API endpoints
- Implementation status (Implemented/Partial/Missing)
- Controller locations
- Test coverage status

### Development Components
See [Development Inventory](./development/development-inventory.md) for:
- Controllers, DTOs, Services, Repositories per service
- File paths and locations
- Component relationships

### Test Coverage
See [Test Inventory](./testing/test-inventory.md) for:
- All test files and coverage
- Unit, Integration, E2E, Load test locations
- Coverage status per service

## Support & Contact

For questions or issues:
- Check the relevant documentation section
- Review [Architecture Decision Records](./adr/)
- Consult [Operations Runbooks](./operations/)
- See [Quick Reference](./deployment/QUICK_REFERENCE.md)

## Contributing

When contributing to documentation:
1. Follow the existing structure
2. Use clear, concise language
3. Include code examples where appropriate
4. Keep documentation up-to-date with code changes
5. Add new ADRs for significant architectural decisions
6. Update inventories when adding new components

## Changelog

See [changelog.md](./changelog.md) for version history and updates.

---

**Last Updated:** 2025-12-17
**Version:** 2.0.0 - Documentation reorganization
