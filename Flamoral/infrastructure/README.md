# Dating App - Azure Infrastructure

Production-ready Azure infrastructure for the World-Class Dating App platform, built with Terraform.

## Quick Start

```bash
# Prerequisites
terraform >= 1.6.0
azure-cli >= 2.50.0
kubectl >= 1.28.0
helm >= 3.13.0

# Deploy development environment
cd infrastructure
terraform init
terraform plan -var-file=envs/dev.tfvars
terraform apply -var-file=envs/dev.tfvars

# Get AKS credentials
az aks get-credentials --resource-group datingapp-dev-rg --name datingapp-dev-aks

# Deploy application
helm install dating-api ./helm/dating-api \
  --namespace datingapp \
  --create-namespace \
  --values ./helm/dating-api/values-dev.yaml
```

## Repository Structure

```
infrastructure/
├── backend.tf                 # Terraform backend configuration
├── main.tf                    # Root module
├── variables.tf               # Global variables
├── outputs.tf                 # Infrastructure outputs
├── envs/                      # Environment configurations
│   ├── dev.tfvars
│   ├── staging.tfvars
│   └── prod.tfvars
├── modules/                   # Terraform modules
│   ├── network/              # VNet, subnets, NSGs
│   ├── aks/                  # Kubernetes cluster
│   ├── postgres/             # PostgreSQL database
│   ├── redis/                # Redis cache
│   ├── storage_blob/         # Storage + CDN
│   ├── keyvault/             # Key Vault
│   ├── signalr/              # SignalR service
│   ├── frontdoor/            # Front Door + WAF
│   ├── cosmosdb/             # CosmosDB
│   └── monitor/              # Monitoring + alerts
├── helm/                      # Helm charts
│   ├── dating-api/
│   ├── media-processor/
│   └── chat-worker/
├── runbooks/                  # Operational procedures
│   ├── environment-promotion.md
│   ├── rollback-procedure.md
│   ├── security-incident-response.md
│   └── health-monitoring.md
└── docs/                      # Documentation
    ├── ARCHITECTURE.md
    └── DEPLOYMENT.md
```

## Infrastructure Components

### Networking
- Azure Virtual Network with isolated subnets
- Network Security Groups for traffic control
- Private Endpoints for secure PaaS connectivity

### Compute
- AKS cluster (3-20 nodes autoscale)
- Multiple node pools with different VM sizes
- Horizontal Pod Autoscaler + Cluster Autoscaler

### Data Services
- PostgreSQL Flexible Server (primary database)
- Redis Premium Cache (sessions, caching)
- CosmosDB (user activities, feeds)
- Storage Account + CDN (media files)

### Application Services
- SignalR (real-time messaging)
- Key Vault (secrets management)
- Front Door + WAF (global CDN, security)
- Application Insights (APM, logging)

## Environments

| Environment | Purpose | Cost/month | URL |
|------------|---------|-----------|-----|
| **Dev** | Development & testing | ~$150 | api-dev.flamoral.com |
| **Staging** | Pre-production QA | ~$445 | api-staging.flamoral.com |
| **Production** | Live traffic | $2,425-3,025 | api.flamoral.com |

## Deployment

### Via Terraform (Manual)
```bash
terraform init
terraform plan -var-file=envs/prod.tfvars
terraform apply -var-file=envs/prod.tfvars
```

### Via GitHub Actions (Recommended)
```bash
gh workflow run terraform-apply.yml \
  -f environment=prod \
  -f auto_approve=false
```

## Monitoring

### Key Metrics
- Request Rate (req/sec)
- Error Rate (target: <1%)
- Response Time (P50, P95, P99)
- Resource Utilization (CPU, memory, disk)

### Alerts
- High CPU (>85%)
- High Memory (>85%)
- High Error Rate (>5%)
- Slow Response Time (>2000ms)

### Dashboards
- Application Insights: Performance, failures
- Log Analytics: Custom queries
- Grafana: Real-time metrics

## Security

- **Identity**: Azure AD, RBAC, managed identities
- **Network**: WAF, TLS 1.2+, private endpoints
- **Secrets**: Key Vault with CSI driver
- **Compliance**: Encryption at rest & in transit, audit logging

## Documentation

- **[Architecture](./docs/ARCHITECTURE.md)**: Infrastructure design
- **[Deployment Guide](./docs/DEPLOYMENT.md)**: Step-by-step deployment
- **[Runbooks](./runbooks/)**: Operational procedures

## Support

- Email: ops-team@flamoral.com
- Slack: #dating-app-ops
- On-call: oncall@flamoral.com
