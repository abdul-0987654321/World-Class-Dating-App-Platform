# DatingPlatform Infrastructure Architecture

## Overview

This document describes the Azure infrastructure architecture for DatingPlatform, deployed using Terraform across three isolated environments: Development, Test, and Production.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Azure Subscription                                 │
│                    (ebd1613e-fea0-4b6d-8918-7e4de6a71c44)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │  Development  │  │     Test      │  │  Production   │                   │
│  │   (10.0.x.x)  │  │  (10.1.x.x)   │  │  (10.2.x.x)   │                   │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘                   │
│          │                  │                  │                            │
│  ┌───────┴───────┐  ┌───────┴───────┐  ┌───────┴───────┐                   │
│  │ Resource Group│  │ Resource Group│  │ Resource Group│                   │
│  │  rg-*-dev-*   │  │  rg-*-test-*  │  │  rg-*-prod-*  │                   │
│  └───────────────┘  └───────────────┘  └───────────────┘                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Terraform State Storage                           │   │
│  │              rg-terraform-state-westus2                             │   │
│  │              sttfstatedatingplatform                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Environment Architecture

### Per-Environment Resources

Each environment (dev, test, prod) contains the following resources:

```
┌────────────────────────────────────────────────────────────┐
│                    Resource Group                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               Virtual Network                        │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │   │
│  │  │  App     │ │   DB     │ │  Cache   │ │  Mgmt  │  │   │
│  │  │ Subnet   │ │ Subnet   │ │ Subnet   │ │ Subnet │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ App Service  │  │  SQL Server  │  │   Storage    │      │
│  │    Plan      │  │  + Database  │  │   Account    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Key Vault   │  │     ACR      │  │  Monitoring  │      │
│  │              │  │              │  │  (Log + AI)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Network Architecture

### IP Address Allocation

| Environment | VNet CIDR     | App Subnet   | DB Subnet    | Cache Subnet | Mgmt Subnet  |
|-------------|---------------|--------------|--------------|--------------|--------------|
| Development | 10.0.0.0/16   | 10.0.1.0/24  | 10.0.2.0/24  | 10.0.3.0/24  | 10.0.4.0/24  |
| Test        | 10.1.0.0/16   | 10.1.1.0/24  | 10.1.2.0/24  | 10.1.3.0/24  | 10.1.4.0/24  |
| Production  | 10.2.0.0/16   | 10.2.1.0/24  | 10.2.2.0/24  | 10.2.3.0/24  | 10.2.4.0/24  |

### Network Security

- NSGs assigned to each subnet
- Service endpoints for Azure services
- Private endpoints for production (Key Vault, SQL, Storage)

## Resource Specifications by Environment

### Development

| Resource | SKU/Tier | Configuration |
|----------|----------|---------------|
| App Service | B1 | Basic tier, single instance |
| SQL Database | Basic | 2 GB max size |
| Storage | Standard LRS | Locally redundant |
| Key Vault | Standard | No purge protection |
| ACR | Basic | No geo-replication |
| Log Analytics | 30 days retention | |

### Test

| Resource | SKU/Tier | Configuration |
|----------|----------|---------------|
| App Service | S1 | Standard tier |
| SQL Database | S0 | 10 GB max size |
| Storage | Standard GRS | Geo-redundant |
| Key Vault | Standard | Soft delete enabled |
| ACR | Standard | |
| Log Analytics | 60 days retention | |

### Production

| Resource | SKU/Tier | Configuration |
|----------|----------|---------------|
| App Service | P1v3 | Premium tier, auto-scale |
| SQL Database | S3 | 100 GB, threat detection |
| Storage | Standard RAGRS | Read-access geo-redundant |
| Key Vault | Premium | Purge protection, HSM |
| ACR | Premium | Geo-replication, content trust |
| Log Analytics | 90 days retention | |

## Security Architecture

### Authentication & Authorization

- Service Principal: `applyplatform-terraform-sp`
- RBAC-based access control per environment
- Managed identities for app-to-service communication

### Encryption

- **At Rest**: Azure-managed encryption for all storage
- **In Transit**: TLS 1.2 minimum enforced
- **Key Management**: Azure Key Vault for secrets

### Compliance

- SOC2 aligned policies
- GDPR data protection measures
- Azure Policy enforcement

## CI/CD Pipeline

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Commit  │───▶│ Validate│───▶│  Dev    │───▶│  Test   │
│         │    │  Stage  │    │ Deploy  │    │ Deploy  │
└─────────┘    └─────────┘    └─────────┘    └────┬────┘
                                                  │
                                                  ▼
                                            ┌─────────┐
                                            │  Prod   │
                                            │ Deploy  │
                                            │(Manual) │
                                            └─────────┘
```

## Disaster Recovery

### Production DR Strategy

- **RTO**: 4 hours
- **RPO**: 1 hour
- **Primary Region**: West US 2
- **Secondary Region**: East US 2

### Backup Configuration

| Resource | Backup Method | Retention |
|----------|---------------|-----------|
| SQL Database | Geo-redundant backup | 35 days |
| Storage | RAGRS replication | Continuous |
| Key Vault | Soft delete | 90 days |

## Quick Links

| Resource | URL |
|----------|-----|
| Azure Portal | https://portal.azure.com |
| Azure DevOps | https://dev.azure.com/citadelcloudmanagement |
| Repository | https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform |
| Pipelines | https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build |
