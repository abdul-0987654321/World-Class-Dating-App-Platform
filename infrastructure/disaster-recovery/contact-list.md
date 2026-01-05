# Emergency Contact List

## Purpose

This document contains contact information for all personnel involved in disaster recovery and incident response for the Flamoral platform.

**IMPORTANT**: This document contains sensitive contact information. Store securely and limit access to authorized personnel only.

---

## PRE-PRODUCTION VALIDATION CHECKLIST

> **ACTION REQUIRED**: Before going to production, verify ALL items below are completed.

| Item | Status | Owner | Completed Date |
|------|--------|-------|----------------|
| All [REQUIRED] fields populated with real data | [ ] | DevOps Lead | |
| Phone numbers verified and tested | [ ] | DevOps Lead | |
| PagerDuty/OpsGenie integration configured | [ ] | DevOps Lead | |
| Conference bridge tested | [ ] | Platform Lead | |
| AWS Support contract activated | [ ] | VP Engineering | |
| Slack channels created and members added | [ ] | Platform Lead | |
| All team members have access to this document | [ ] | DevOps Lead | |
| Quarterly review calendar invite sent | [ ] | DevOps Lead | |

**Validation Sign-off**: _________________________ Date: _____________

---

## On-Call Rotation

### Current On-Call Schedule

| Week Of | Primary On-Call | Secondary On-Call | Manager On-Call |
|---------|----------------|-------------------|-----------------|
| 2026-01-06 | [REQUIRED: Primary Engineer Name] | [REQUIRED: Secondary Engineer Name] | [REQUIRED: Manager Name] |
| 2026-01-13 | [REQUIRED: Primary Engineer Name] | [REQUIRED: Secondary Engineer Name] | [REQUIRED: Manager Name] |
| 2026-01-20 | [REQUIRED: Primary Engineer Name] | [REQUIRED: Secondary Engineer Name] | [REQUIRED: Manager Name] |

**On-Call Schedule Tool**: [REQUIRED: PagerDuty/OpsGenie URL - e.g., https://flamoral.pagerduty.com]

> **Note**: Update this schedule weekly. Consider automating via PagerDuty/OpsGenie API integration.

---

## Emergency Response Team

### Platform Team

#### Platform Lead
- **Name**: [REQUIRED: Full Name]
- **Role**: Platform Lead / Technical Decision Maker
- **Phone**: [REQUIRED: +1-XXX-XXX-XXXX with area code]
- **Email**: [REQUIRED: name@flamoral.com]
- **Slack**: [REQUIRED: @slack-handle]
- **Backup**: [REQUIRED: Backup Person Name]
- **Escalation Level**: 1

#### DevOps Lead
- **Name**: [REQUIRED: Full Name]
- **Role**: Infrastructure & DevOps Lead
- **Phone**: [REQUIRED: +1-XXX-XXX-XXXX with area code]
- **Email**: [REQUIRED: name@flamoral.com]
- **Slack**: [REQUIRED: @slack-handle]
- **Backup**: [REQUIRED: Backup Person Name]
- **Escalation Level**: 1
- **Expertise**: AWS EKS, Terraform, CI/CD, Kubernetes

#### Senior DevOps Engineer
- **Name**: [REQUIRED: Full Name]
- **Role**: Senior DevOps Engineer
- **Phone**: [REQUIRED: +1-XXX-XXX-XXXX with area code]
- **Email**: [REQUIRED: name@flamoral.com]
- **Slack**: [REQUIRED: @slack-handle]
- **Backup**: [REQUIRED: Backup Person Name]
- **Escalation Level**: 2
- **Expertise**: Kubernetes, Monitoring, Automation

---

### Database Team

#### Database Administrator (Primary)
- **Name**: [REQUIRED: Full Name]
- **Role**: Senior DBA
- **Phone**: [REQUIRED: +1-XXX-XXX-XXXX with area code]
- **Email**: [REQUIRED: name@flamoral.com]
- **Slack**: [REQUIRED: @slack-handle]
- **Backup**: [REQUIRED: Backup Person Name]
- **Escalation Level**: 1
- **Expertise**: PostgreSQL, Aurora, Backup/Restore, PITR

#### Database Engineer
- **Name**: [REQUIRED: Full Name]
- **Role**: Database Engineer
- **Phone**: [REQUIRED: +1-XXX-XXX-XXXX with area code]
- **Email**: [REQUIRED: name@flamoral.com]
- **Slack**: [REQUIRED: @slack-handle]
- **Escalation Level**: 2
- **Expertise**: PostgreSQL, Query Optimization, Replication

---

### Security Team

#### Security Lead
- **Name**: [REQUIRED: Full Name]
- **Role**: Information Security Lead
- **Phone**: [REQUIRED: +1-XXX-XXX-XXXX with area code]
- **Email**: [REQUIRED: name@flamoral.com]
- **Slack**: [REQUIRED: @slack-handle]
- **Backup**: [REQUIRED: Backup Person Name]
- **Escalation Level**: 1
- **Expertise**: Security Incidents, Compliance, Forensics

#### Security Engineer
- **Name**: [REQUIRED: Full Name]
- **Role**: Security Engineer
- **Phone**: [REQUIRED: +1-XXX-XXX-XXXX with area code]
- **Email**: [REQUIRED: name@flamoral.com]
- **Slack**: [REQUIRED: @slack-handle]
- **Escalation Level**: 2
- **Expertise**: AWS Security, GuardDuty, WAF, Threat Detection

---

### Development Team

#### Backend Lead
- **Name**: [REQUIRED: Full Name]
- **Role**: Backend Development Lead
- **Phone**: [REQUIRED: +1-XXX-XXX-XXXX with area code]
- **Email**: [REQUIRED: name@flamoral.com]
- **Slack**: [REQUIRED: @slack-handle]
- **Backup**: [REQUIRED: Backup Person Name]
- **Escalation Level**: 2
- **Expertise**: API, Microservices, Node.js, NestJS

#### Frontend Lead
- **Name**: [REQUIRED: Full Name]
- **Role**: Frontend Development Lead
- **Phone**: [REQUIRED: +1-XXX-XXX-XXXX with area code]
- **Email**: [REQUIRED: name@flamoral.com]
- **Slack**: [REQUIRED: @slack-handle]
- **Backup**: [REQUIRED: Backup Person Name]
- **Escalation Level**: 2
- **Expertise**: React, React Native, Web Performance

---

### Management

#### CTO
- **Name**: [REQUIRED: Full Name]
- **Role**: Chief Technology Officer
- **Phone**: [REQUIRED: +1-XXX-XXX-XXXX with area code]
- **Email**: [REQUIRED: name@flamoral.com]
- **Slack**: [REQUIRED: @slack-handle]
- **Escalation Level**: Executive
- **When to Contact**: Severity 1 incidents, security breaches, extended outages (>1 hour)

#### VP of Engineering
- **Name**: [REQUIRED: Full Name]
- **Role**: VP Engineering
- **Phone**: [REQUIRED: +1-XXX-XXX-XXXX with area code]
- **Email**: [REQUIRED: name@flamoral.com]
- **Slack**: [REQUIRED: @slack-handle]
- **Escalation Level**: Executive
- **When to Contact**: Severity 1-2 incidents, major technical decisions

#### Engineering Manager
- **Name**: [REQUIRED: Full Name]
- **Role**: Engineering Manager
- **Phone**: [REQUIRED: +1-XXX-XXX-XXXX with area code]
- **Email**: [REQUIRED: name@flamoral.com]
- **Slack**: [REQUIRED: @slack-handle]
- **Escalation Level**: Management
- **When to Contact**: Severity 2-3 incidents, resource allocation

---

## External Contacts

### AWS Support

#### AWS Enterprise Support
- **Support Portal**: https://console.aws.amazon.com/support/home
- **Phone**: 1-800-555-2345 (US Enterprise Support)
- **Support Level**: [REQUIRED: Business/Enterprise]
- **Account ID**: [REQUIRED: AWS Account ID - 12 digits]
- **When to Contact**: AWS infrastructure issues, service outages
- **SLA**: 15 minutes response for Critical (Enterprise)

#### AWS Technical Account Manager (TAM)
- **Name**: [REQUIRED if Enterprise: TAM Full Name]
- **Email**: [REQUIRED if Enterprise: tam-name@amazon.com]
- **Phone**: [REQUIRED if Enterprise: +1-XXX-XXX-XXXX]
- **When to Contact**: Escalations, architectural guidance, proactive reviews

---

### Third-Party Services

#### Payment Provider (Stripe)
- **Company**: Stripe
- **Support Portal**: https://support.stripe.com
- **Support Email**: support@stripe.com
- **Account ID**: [REQUIRED: Stripe Account ID]
- **24/7 Support**: Yes (for high-priority issues)
- **Escalation Contact**: [OPTIONAL: Account Manager email if assigned]

#### Email Service (AWS SES)
- **Company**: AWS SES
- **Support**: Via AWS Support Console
- **Region**: us-east-1
- **Account ID**: Same as AWS Account
- **When to Contact**: Email deliverability issues

#### Push Notifications (Firebase)
- **Company**: Google Firebase
- **Support Portal**: https://firebase.google.com/support
- **Project ID**: [REQUIRED: Firebase Project ID]
- **When to Contact**: Push notification delivery issues

#### SMS Provider (Twilio)
- **Company**: Twilio
- **Support Portal**: https://www.twilio.com/console/support
- **Support Email**: support@twilio.com
- **Account SID**: [REQUIRED: Twilio Account SID]
- **When to Contact**: SMS delivery issues

---

## Communication Channels

### Primary Communication Channels

#### Slack
- **Workspace**: [REQUIRED: flamoral.slack.com or custom URL]
- **Emergency Channel**: #incident-response
- **DevOps Channel**: #devops-team
- **Security Channel**: #security-team
- **Status Updates**: #status-updates (public channel for updates)

#### PagerDuty
- **URL**: [REQUIRED: https://flamoral.pagerduty.com]
- **Service**: Flamoral Production
- **Escalation Policy**: Production Support
- **Phone Number**: [REQUIRED: PagerDuty phone callback number]

---

### Conference Bridge

#### Primary Bridge (Zoom)
- **URL**: [REQUIRED: https://zoom.us/j/XXXXXXXXX]
- **Phone**: [REQUIRED: +1-XXX-XXX-XXXX]
- **Meeting ID**: [REQUIRED: Meeting ID]
- **Password**: [REQUIRED: Meeting Password]

#### Backup Bridge (Google Meet)
- **URL**: [REQUIRED: https://meet.google.com/xxx-xxxx-xxx]
- **Phone**: [REQUIRED: +1-XXX-XXX-XXXX]

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
2. External support engaged (AWS, vendors)
3. Public communication prepared

**Contacts**: VP Engineering, CTO, AWS Support

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
- AWS Support (if infrastructure issue)
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

## Quick Reference Card

**Print and keep near your workstation**

```
+==============================================================+
|          FLAMORAL EMERGENCY CONTACT QUICK REFERENCE          |
+==============================================================+
|                                                              |
|  PRIMARY ON-CALL: [REQUIRED] - [REQUIRED]                   |
|  SECONDARY ON-CALL: [REQUIRED] - [REQUIRED]                 |
|                                                              |
|  PLATFORM LEAD: [REQUIRED] - [REQUIRED]                     |
|  DEVOPS LEAD: [REQUIRED] - [REQUIRED]                       |
|  DATABASE LEAD: [REQUIRED] - [REQUIRED]                     |
|  SECURITY LEAD: [REQUIRED] - [REQUIRED]                     |
|                                                              |
|  SLACK: #incident-response                                  |
|  CONFERENCE BRIDGE: [REQUIRED]                              |
|  PAGERDUTY: [REQUIRED]                                      |
|                                                              |
|  AWS SUPPORT: 1-800-555-2345                                |
|  ACCOUNT ID: [REQUIRED]                                     |
|                                                              |
+==============================================================+
```

---

## Document Maintenance

### Update Schedule
- **Frequency**: Monthly (minimum), after any personnel change
- **Owner**: DevOps Lead
- **Review Date**: First Monday of each month
- **Quarterly Verification**: Test all phone numbers and escalation paths

### Update Procedure
1. Verify all phone numbers and emails are current
2. Update on-call rotation
3. Add new team members within 1 business day of joining
4. Remove departed team members within 1 business day of leaving
5. Test contact methods quarterly (actual phone calls to verify)

### Distribution
This document should be:
- Stored in secure location (encrypted at rest)
- Accessible to all engineering team members
- Printed copy in office (if applicable)
- Copy in password manager for offline access

---

**Last Updated**: 2026-01-05
**Document Owner**: DevOps Team
**Classification**: Internal - Sensitive
**Next Review**: 2026-02-01
**Production Validation**: [REQUIRED: Date validated for production]
