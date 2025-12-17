# Emergency Contact List

## Purpose

This document contains contact information for all personnel involved in disaster recovery and incident response for the Flamoral platform.

**IMPORTANT**: This document contains sensitive contact information. Store securely and limit access to authorized personnel only.

---

## On-Call Rotation

### Current On-Call Schedule

| Week Of | Primary On-Call | Secondary On-Call | Manager On-Call |
|---------|----------------|-------------------|-----------------|
| 2024-12-16 | [Name] | [Name] | [Name] |
| 2024-12-23 | [Name] | [Name] | [Name] |
| 2024-12-30 | [Name] | [Name] | [Name] |

**On-Call Schedule Tool**: [PagerDuty/OpsGenie URL]

---

## Emergency Response Team

### Platform Team

#### Platform Lead
- **Name**: [Full Name]
- **Role**: Platform Lead / Technical Decision Maker
- **Phone**: +1-XXX-XXX-XXXX
- **Email**: [email]@company.com
- **Slack**: @username
- **Backup**: [Backup Name]
- **Escalation Level**: 1

#### DevOps Lead
- **Name**: [Full Name]
- **Role**: Infrastructure & DevOps Lead
- **Phone**: +1-XXX-XXX-XXXX
- **Email**: [email]@company.com
- **Slack**: @username
- **Backup**: [Backup Name]
- **Escalation Level**: 1
- **Expertise**: AKS, Azure, Terraform, CI/CD

#### Senior DevOps Engineer
- **Name**: [Full Name]
- **Role**: Senior DevOps Engineer
- **Phone**: +1-XXX-XXX-XXXX
- **Email**: [email]@company.com
- **Slack**: @username
- **Backup**: [Backup Name]
- **Escalation Level**: 2
- **Expertise**: Kubernetes, Monitoring, Automation

---

### Database Team

#### Database Administrator (Primary)
- **Name**: [Full Name]
- **Role**: Senior DBA
- **Phone**: +1-XXX-XXX-XXXX
- **Email**: [email]@company.com
- **Slack**: @username
- **Backup**: [Backup Name]
- **Escalation Level**: 1
- **Expertise**: PostgreSQL, Azure Database, Backup/Restore

#### Database Engineer
- **Name**: [Full Name]
- **Role**: Database Engineer
- **Phone**: +1-XXX-XXX-XXXX
- **Email**: [email]@company.com
- **Slack**: @username
- **Escalation Level**: 2
- **Expertise**: PostgreSQL, Query Optimization, Replication

---

### Security Team

#### Security Lead
- **Name**: [Full Name]
- **Role**: Information Security Lead
- **Phone**: +1-XXX-XXX-XXXX
- **Email**: [email]@company.com
- **Slack**: @username
- **Backup**: [Backup Name]
- **Escalation Level**: 1
- **Expertise**: Security Incidents, Compliance, Forensics

#### Security Engineer
- **Name**: [Full Name]
- **Role**: Security Engineer
- **Phone**: +1-XXX-XXX-XXXX
- **Email**: [email]@company.com
- **Slack**: @username
- **Escalation Level**: 2
- **Expertise**: Azure Security, Threat Detection, WAF

---

### Development Team

#### Backend Lead
- **Name**: [Full Name]
- **Role**: Backend Development Lead
- **Phone**: +1-XXX-XXX-XXXX
- **Email**: [email]@company.com
- **Slack**: @username
- **Backup**: [Backup Name]
- **Escalation Level**: 2
- **Expertise**: API, Microservices, Node.js

#### Frontend Lead
- **Name**: [Full Name]
- **Role**: Frontend Development Lead
- **Phone**: +1-XXX-XXX-XXXX
- **Email**: [email]@company.com
- **Slack**: @username
- **Backup**: [Backup Name]
- **Escalation Level**: 2
- **Expertise**: React, Web Performance, UI/UX

---

### Management

#### CTO
- **Name**: [Full Name]
- **Role**: Chief Technology Officer
- **Phone**: +1-XXX-XXX-XXXX
- **Email**: [email]@company.com
- **Slack**: @username
- **Escalation Level**: Executive
- **When to Contact**: Severity 1 incidents, security breaches, extended outages

#### VP of Engineering
- **Name**: [Full Name]
- **Role**: VP Engineering
- **Phone**: +1-XXX-XXX-XXXX
- **Email**: [email]@company.com
- **Slack**: @username
- **Escalation Level**: Executive
- **When to Contact**: Severity 1-2 incidents, major technical decisions

#### Engineering Manager
- **Name**: [Full Name]
- **Role**: Engineering Manager
- **Phone**: +1-XXX-XXX-XXXX
- **Email**: [email]@company.com
- **Slack**: @username
- **Escalation Level**: Management
- **When to Contact**: Severity 2-3 incidents, resource allocation

---

## External Contacts

### Azure Support

#### Premier Support
- **Support Portal**: https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade
- **Phone**: 1-800-642-7676 (US)
- **Support Level**: Premier
- **Contract ID**: [Contract Number]
- **When to Contact**: Azure infrastructure issues, service outages
- **SLA**: 15 minutes response for Severity A

#### Technical Account Manager
- **Name**: [Full Name]
- **Email**: [email]@microsoft.com
- **Phone**: +1-XXX-XXX-XXXX
- **When to Contact**: Escalations, architectural guidance

---

### Third-Party Services

#### CDN Provider (if applicable)
- **Company**: [Provider Name]
- **Support Email**: support@provider.com
- **Support Phone**: +1-XXX-XXX-XXXX
- **Account ID**: [Account ID]
- **24/7 Support**: Yes

#### Monitoring Service (DataDog/New Relic/etc)
- **Company**: [Provider Name]
- **Support Email**: support@provider.com
- **Support Phone**: +1-XXX-XXX-XXXX
- **Account ID**: [Account ID]
- **When to Contact**: Monitoring platform issues

#### DNS Provider (if not Azure DNS)
- **Company**: [Provider Name]
- **Support Email**: support@provider.com
- **Support Phone**: +1-XXX-XXX-XXXX
- **Account ID**: [Account ID]
- **When to Contact**: DNS resolution issues

---

## Communication Channels

### Primary Communication Channels

#### Slack
- **Workspace**: [company].slack.com
- **Emergency Channel**: #incident-response
- **DevOps Channel**: #devops-team
- **Security Channel**: #security-team
- **Status Updates**: #status-updates

#### Microsoft Teams
- **Team**: Engineering
- **Emergency Channel**: Incident Response
- **When to Use**: Video calls, screen sharing during incidents

#### PagerDuty/OpsGenie
- **URL**: [pagerduty-url]
- **Service**: Flamoral Production
- **Escalation Policy**: Production Support

---

### Conference Bridge

#### Primary Bridge
- **Provider**: [Zoom/Teams/etc]
- **URL**: [conference-url]
- **Phone**: +1-XXX-XXX-XXXX
- **Meeting ID**: [ID]
- **Password**: [Password]

#### Backup Bridge
- **Provider**: [Alternative]
- **URL**: [backup-conference-url]
- **Phone**: +1-XXX-XXX-XXXX

---

## Escalation Procedures

### Level 1 Escalation (0-15 minutes)
1. On-call engineer receives alert
2. Initial assessment and triage
3. If unable to resolve, escalate to Level 2

**Contacts**: Primary On-Call, Secondary On-Call

### Level 2 Escalation (15-30 minutes)
1. Team leads involved
2. Incident commander assigned
3. War room established
4. If unable to resolve, escalate to Level 3

**Contacts**: DevOps Lead, Database Lead, Platform Lead

### Level 3 Escalation (30-60 minutes)
1. Management notified
2. External support engaged (Azure, vendors)
3. Public communication prepared

**Contacts**: VP Engineering, CTO, Azure Support

### Executive Escalation (60+ minutes or Security Breach)
1. Executive team notified
2. Legal/PR involved if needed
3. Customer communication coordinated

**Contacts**: CTO, CEO, Legal Counsel

---

## Severity Levels and Required Notifications

### Severity 1 (Critical)
**Definition**: Complete service outage, security breach, data loss

**Immediate Notification**:
- Primary On-Call
- Secondary On-Call
- DevOps Lead
- Platform Lead
- Database Lead (if database issue)
- Security Lead (if security issue)

**Within 15 minutes**:
- VP Engineering
- CTO

**Within 30 minutes**:
- Azure Support (if infrastructure issue)
- Status page update

---

### Severity 2 (High)
**Definition**: Major functionality impaired, performance degradation

**Immediate Notification**:
- Primary On-Call
- Secondary On-Call
- Relevant Team Lead

**Within 30 minutes**:
- VP Engineering (if not resolved)

**Within 1 hour**:
- Status page update (if customer-facing)

---

### Severity 3 (Medium)
**Definition**: Minor functionality impaired, limited users affected

**Immediate Notification**:
- Primary On-Call

**As Needed**:
- Relevant Team Lead

---

### Severity 4 (Low)
**Definition**: Cosmetic issues, documentation, minor bugs

**Standard Process**:
- Create ticket
- Assign to appropriate team
- No emergency escalation needed

---

## After-Hours Contact Guidelines

### When to Contact After Hours

**DO contact for**:
- Severity 1 incidents
- Security breaches
- Complete service outages
- Data loss or corruption
- Escalated customer issues

**DON'T contact for**:
- Severity 4 issues
- Questions that can wait until business hours
- Non-urgent requests

### Preferred Contact Methods (in order)

1. **PagerDuty/OpsGenie** - Automatic notification
2. **Phone Call** - If urgent and no response
3. **Slack** - Tag @oncall in #incident-response
4. **Email** - Last resort, may not see immediately

---

## Vendor Contacts

### SSL Certificate Provider
- **Provider**: Let's Encrypt / Azure Certificate Service
- **Support**: [Contact Info]
- **Renewal Process**: Automated via cert-manager

### Email Service Provider
- **Provider**: [SendGrid/AWS SES/etc]
- **Support Email**: support@provider.com
- **Support Phone**: +1-XXX-XXX-XXXX
- **Account ID**: [Account ID]

### SMS Provider
- **Provider**: [Twilio/etc]
- **Support Email**: support@provider.com
- **Support Phone**: +1-XXX-XXX-XXXX
- **Account ID**: [Account ID]

---

## Document Maintenance

### Update Schedule
- **Frequency**: Monthly
- **Owner**: DevOps Lead
- **Review Date**: First Monday of each month

### Update Procedure
1. Verify all phone numbers and emails
2. Update on-call rotation
3. Add new team members
4. Remove departed team members
5. Test contact methods quarterly

### Distribution
This document should be:
- Stored in secure location (encrypted)
- Accessible to all engineering team members
- Printed copy in office
- Copy in runbook repository (with sensitive data redacted)

---

## Quick Reference Card

**Print and keep near your workstation**

```
╔══════════════════════════════════════════════════════════════╗
║          FLAMORAL EMERGENCY CONTACT QUICK REFERENCE          ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  PRIMARY ON-CALL: [Name] - [Phone]                          ║
║  SECONDARY ON-CALL: [Name] - [Phone]                        ║
║                                                              ║
║  PLATFORM LEAD: [Name] - [Phone]                            ║
║  DEVOPS LEAD: [Name] - [Phone]                              ║
║  DATABASE LEAD: [Name] - [Phone]                            ║
║  SECURITY LEAD: [Name] - [Phone]                            ║
║                                                              ║
║  SLACK: #incident-response                                  ║
║  CONFERENCE BRIDGE: [URL]                                   ║
║                                                              ║
║  AZURE SUPPORT: 1-800-642-7676                              ║
║  CONTRACT ID: [Contract Number]                             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

**Last Updated**: 2024-12-13
**Document Owner**: DevOps Team
**Classification**: Internal - Sensitive
**Next Review**: 2025-01-13
