# Disaster Recovery Plan

## Overview
This document outlines the disaster recovery (DR) strategy for the Dating App Platform.

## Recovery Objectives

### RTO (Recovery Time Objective)
- **Critical Services**: 15 minutes
- **Core Application**: 30 minutes
- **Full Platform**: 1 hour

### RPO (Recovery Point Objective)
- **Database**: 5 minutes (continuous replication)
- **User Media**: 15 minutes (geo-redundant storage)
- **Application State**: 5 minutes (Redis persistence)

## Architecture

### Multi-Region Setup
- **Primary Region**: East US
- **Secondary Region**: West US 2
- **Backup Region**: Central US (cold standby)

### Data Replication
1. **PostgreSQL**: Async replication to read replica
2. **Redis**: AOF persistence with geo-replication
3. **Blob Storage**: GRS (Geo-Redundant Storage)
4. **Container Registry**: Geo-replication enabled

## Failover Procedures

### Automated Failover
Traffic Manager automatically routes traffic to healthy endpoints based on health probes.

### Manual Failover Process
See `failover-playbook.md` for detailed steps.

## Backup Strategy

### Database Backups
- **Frequency**: Every 4 hours
- **Retention**:
  - Daily: 90 days
  - Weekly: 12 weeks
  - Monthly: 12 months
  - Yearly: 5 years

### Application Backups
- Kubernetes manifests: Git repository
- Secrets: Azure Key Vault with soft-delete
- Container images: Azure Container Registry with geo-replication

## Testing

### DR Drills Schedule
- **Monthly**: Database restore test
- **Quarterly**: Partial failover test
- **Annually**: Full DR simulation

## Contacts

### On-Call Rotation
- Primary: oncall@datingapp.com
- Escalation: sre@datingapp.com
- Management: cto@datingapp.com
